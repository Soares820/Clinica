-- ─────────────────────────────────────────────────────────────
-- Pharus — 0009: agendamento público sem pagamento + fim da Loja
-- ─────────────────────────────────────────────────────────────
-- Decisão de negócio: o agendamento feito pela Área da Cliente deixa de
-- coletar forma de pagamento (Pix/Cartão) — a cliente paga pessoalmente
-- na clínica — e a Loja Home Care (catálogo + carrinho + checkout) sai
-- do app da cliente por completo. O front-end (clinica-sistema.jsx) já
-- não manda mais o carrinho/forma de pagamento; esta migration aperta a
-- validação no banco também, porque quem decide o que é permitido é
-- sempre o banco, nunca a tela (mesmo princípio de 0006/0008).
--
-- Não apaga as tabelas vendas/venda_itens/produtos nem dados
-- existentes — é retirada de funcionalidade, não limpeza de dados.
-- ─────────────────────────────────────────────────────────────

-- criar_agendamento_publico agora só aceita 'pendente_pos_atendimento'
-- (valor que já existia no check constraint de agendamentos.tipo_pagamento
-- desde 0001_schema.sql, pensado exatamente para "paga depois/na hora").
-- Corpo idêntico ao de 0002_functions.sql, só troca a validação.
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
  if p_tipo_pagamento <> 'pendente_pos_atendimento' then
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

comment on function criar_agendamento_publico(text, text, uuid, uuid, date, time, text) is
  'Agendamento público (Área da Cliente). A partir de 0009, só aceita tipo_pagamento = ''pendente_pos_atendimento'' — a Loja e a escolha de Pix/Cartão foram removidas do app da cliente.';

revoke all on function criar_agendamento_publico(text, text, uuid, uuid, date, time, text) from public;
grant execute on function criar_agendamento_publico(text, text, uuid, uuid, date, time, text) to anon, authenticated;

-- Loja Home Care removida do app da cliente — revoga o único caminho de
-- escrita público que restava para vendas/venda_itens. A função continua
-- definida (não é destrutivo, é reversível), só deixa de ser chamável.
-- Não existe nenhuma tela de Gestão que também dependa dela (confirmado:
-- não há CRUD de produtos/estoque em GestaoView).
revoke execute on function registrar_venda_publica(text, text, text, jsonb) from anon, authenticated;

comment on function registrar_venda_publica(text, text, text, jsonb) is
  'Desativada em 0009 (revoke execute) — a Loja Home Care saiu do app da cliente. Função mantida, não removida, para não perder o histórico de como as vendas antigas foram gravadas.';
