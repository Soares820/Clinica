-- ─────────────────────────────────────────────────────────────
-- Studio Aura — 0002: funções, triggers de negócio e RPCs públicas
-- ─────────────────────────────────────────────────────────────

-- Mesma fórmula de calcularComissaoAtendimento() em clinica-sistema.jsx
create or replace function calcular_comissao(valor numeric, percentual numeric)
returns numeric
language sql
immutable
as $$
  select round(coalesce(valor, 0) * (coalesce(percentual, 0) / 100.0), 2);
$$;

-- ─────────────────────────────────────────────────────────────
-- Recalcula valor_cobrado / comissao_calculada / sessao_numero no
-- servidor, na criação do agendamento — nunca confia no que vier do
-- cliente. Roda só em INSERT (não em UPDATE) para não reescrever o
-- valor histórico de um atendimento se o preço do serviço mudar depois.
-- ─────────────────────────────────────────────────────────────
create or replace function agendamentos_calcular_valores()
returns trigger
language plpgsql
as $$
declare
  v_servico servicos%rowtype;
  v_profissional profissionais%rowtype;
  v_pacote clientes_pacotes%rowtype;
begin
  select * into v_servico from servicos where id = new.servico_id;
  if not found then
    raise exception 'Serviço % não encontrado', new.servico_id;
  end if;

  select * into v_profissional from profissionais where id = new.profissional_id;
  if not found then
    raise exception 'Profissional % não encontrado', new.profissional_id;
  end if;

  if new.tipo_pagamento = 'pacote_sessao' then
    if new.pacote_utilizado_id is null then
      raise exception 'pacote_utilizado_id é obrigatório quando tipo_pagamento = pacote_sessao';
    end if;

    -- lock na linha do pacote para evitar duas sessões concorrentes
    -- lendo o mesmo sessoes_usadas e gerando o mesmo sessao_numero
    select * into v_pacote from clientes_pacotes where id = new.pacote_utilizado_id for update;
    if not found then
      raise exception 'Pacote % não encontrado', new.pacote_utilizado_id;
    end if;
    if v_pacote.status <> 'ativo' or v_pacote.sessoes_usadas >= v_pacote.total_sessoes then
      raise exception 'Pacote % não tem sessões disponíveis', new.pacote_utilizado_id;
    end if;

    new.valor_cobrado := round(v_pacote.valor_pago / v_pacote.total_sessoes, 2);
    new.sessao_numero := v_pacote.sessoes_usadas + 1;
  else
    new.valor_cobrado := v_servico.preco_base;
    new.sessao_numero := null;
  end if;

  new.comissao_calculada := calcular_comissao(new.valor_cobrado, v_profissional.comissao_percentual);

  return new;
end;
$$;

drop trigger if exists trg_agendamentos_before_insert_calc on agendamentos;
create trigger trg_agendamentos_before_insert_calc
  before insert on agendamentos
  for each row execute function agendamentos_calcular_valores();

-- ─────────────────────────────────────────────────────────────
-- Deduz a sessão do pacote quando o agendamento é criado (porta
-- deduzirSessaoPacote de clinica-sistema.jsx).
-- ─────────────────────────────────────────────────────────────
create or replace function agendamentos_deduzir_sessao()
returns trigger
language plpgsql
as $$
begin
  if new.tipo_pagamento = 'pacote_sessao' and new.pacote_utilizado_id is not null and new.status <> 'cancelado' then
    update clientes_pacotes
      set sessoes_usadas = sessoes_usadas + 1,
          status = case when sessoes_usadas + 1 >= total_sessoes then 'concluido' else 'ativo' end
      where id = new.pacote_utilizado_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agendamentos_after_insert_deduzir on agendamentos;
create trigger trg_agendamentos_after_insert_deduzir
  after insert on agendamentos
  for each row execute function agendamentos_deduzir_sessao();

-- ─────────────────────────────────────────────────────────────
-- Hoje, cancelar um agendamento pago com pacote NÃO devolve a sessão
-- consumida (a função restaurarSessaoPacote existe no front-end mas
-- nunca é chamada) — bug real de integridade. Este trigger corrige:
-- restaura a sessão ao cancelar, e re-deduz se o agendamento for
-- reaberto depois de cancelado.
-- ─────────────────────────────────────────────────────────────
create or replace function agendamentos_status_pacote_sync()
returns trigger
language plpgsql
as $$
begin
  if new.tipo_pagamento = 'pacote_sessao' and new.pacote_utilizado_id is not null
     and new.status is distinct from old.status then
    if old.status <> 'cancelado' and new.status = 'cancelado' then
      update clientes_pacotes
        set sessoes_usadas = greatest(0, sessoes_usadas - 1),
            status = 'ativo'
        where id = new.pacote_utilizado_id;
    elsif old.status = 'cancelado' and new.status <> 'cancelado' then
      update clientes_pacotes
        set sessoes_usadas = sessoes_usadas + 1,
            status = case when sessoes_usadas + 1 >= total_sessoes then 'concluido' else 'ativo' end
        where id = new.pacote_utilizado_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agendamentos_status_pacote_sync on agendamentos;
create trigger trg_agendamentos_status_pacote_sync
  after update of status on agendamentos
  for each row execute function agendamentos_status_pacote_sync();

-- ─────────────────────────────────────────────────────────────
-- RPC pública: autoagendamento (ClienteView). Roda com privilégios do
-- dono da função (SECURITY DEFINER) para poder achar/criar a cliente e
-- inserir o agendamento sem dar ao papel anon acesso direto de escrita
-- nas tabelas clientes/agendamentos. Preço e comissão são sempre
-- recalculados pelo trigger acima — o que vier do cliente é ignorado.
-- ─────────────────────────────────────────────────────────────
create or replace function criar_agendamento_publico(
  p_cliente_nome text,
  p_cliente_telefone text,
  p_servico_id uuid,
  p_profissional_id uuid,
  p_data date,
  p_horario time,
  p_tipo_pagamento text
)
returns agendamentos
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_agendamento agendamentos%rowtype;
begin
  if p_tipo_pagamento not in ('pago_pix', 'pago_cartao') then
    raise exception 'tipo_pagamento inválido para agendamento público: %', p_tipo_pagamento;
  end if;
  if coalesce(trim(p_cliente_nome), '') = '' then
    raise exception 'Nome da cliente é obrigatório';
  end if;
  if coalesce(trim(p_cliente_telefone), '') = '' then
    raise exception 'Telefone da cliente é obrigatório';
  end if;

  select id into v_cliente_id
    from clientes
    where telefone = p_cliente_telefone
    order by created_at
    limit 1;

  if v_cliente_id is null then
    insert into clientes (nome, telefone)
    values (trim(p_cliente_nome), trim(p_cliente_telefone))
    returning id into v_cliente_id;
  end if;

  insert into agendamentos (
    data, horario, cliente_id, servico_id, profissional_id,
    status, tipo_pagamento, pacote_utilizado_id
  ) values (
    p_data, p_horario, v_cliente_id, p_servico_id, p_profissional_id,
    'confirmado', p_tipo_pagamento, null
  )
  returning * into v_agendamento;

  return v_agendamento;
exception
  when unique_violation then
    raise exception 'Esse profissional já tem um agendamento nesse horário.';
end;
$$;

revoke all on function criar_agendamento_publico from public;
grant execute on function criar_agendamento_publico to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC pública: checkout da loja (ClienteView, aba "loja"). Decrementa
-- estoque de forma atômica (com lock de linha), nunca deixa estoque
-- negativo, e grava o preço do servidor (produtos.preco), não o que o
-- carrinho do navegador mandar.
-- p_itens: jsonb no formato [{"produto_id":"...","quantidade":2}, ...]
-- ─────────────────────────────────────────────────────────────
create or replace function registrar_venda_publica(
  p_cliente_nome text,
  p_cliente_telefone text,
  p_forma_pagamento text,
  p_itens jsonb
)
returns vendas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_venda vendas%rowtype;
  v_item jsonb;
  v_produto produtos%rowtype;
  v_quantidade integer;
  v_total numeric(10,2) := 0;
begin
  if p_itens is null or jsonb_array_length(p_itens) = 0 then
    raise exception 'O carrinho está vazio';
  end if;

  if coalesce(trim(p_cliente_nome), '') <> '' and coalesce(trim(p_cliente_telefone), '') <> '' then
    select id into v_cliente_id from clientes where telefone = p_cliente_telefone order by created_at limit 1;
    if v_cliente_id is null then
      insert into clientes (nome, telefone) values (trim(p_cliente_nome), trim(p_cliente_telefone))
      returning id into v_cliente_id;
    end if;
  end if;

  insert into vendas (cliente_id, forma_pagamento, valor_total)
  values (v_cliente_id, p_forma_pagamento, 0)
  returning * into v_venda;

  for v_item in select * from jsonb_array_elements(p_itens)
  loop
    v_quantidade := (v_item->>'quantidade')::integer;
    if v_quantidade is null or v_quantidade <= 0 then
      raise exception 'Quantidade inválida no carrinho';
    end if;

    select * into v_produto from produtos
      where id = (v_item->>'produto_id')::uuid
      for update;

    if not found then
      raise exception 'Produto % não encontrado', v_item->>'produto_id';
    end if;

    if v_produto.estoque < v_quantidade then
      raise exception 'Estoque insuficiente para %', v_produto.nome;
    end if;

    update produtos set estoque = estoque - v_quantidade where id = v_produto.id;

    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario)
    values (v_venda.id, v_produto.id, v_quantidade, v_produto.preco);

    v_total := v_total + (v_produto.preco * v_quantidade);
  end loop;

  update vendas set valor_total = v_total where id = v_venda.id
    returning * into v_venda;

  return v_venda;
end;
$$;

revoke all on function registrar_venda_publica from public;
grant execute on function registrar_venda_publica to anon, authenticated;
