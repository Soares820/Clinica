-- ─────────────────────────────────────────────────────────────
-- Pharus — 0010: impedir sobreposição de horário (não só igualdade
-- exata) + RPC pública de horários ocupados sem dado de cliente
-- ─────────────────────────────────────────────────────────────
-- Fecha o item A4 da auditoria: uq_agendamentos_sem_conflito (0001)
-- só barra reserva EXATA (mesmo profissional+data+horario) — não
-- detecta sobreposição quando um serviço mais longo (ex: 120 min)
-- invade o horário do slot seguinte (SLOTS em clinica-sistema.jsx são
-- espaçados 90 min). Esta migration troca o índice único por uma
-- constraint de exclusão que compara o INTERVALO real ocupado por
-- cada agendamento (horário até horário + duração do serviço).
--
-- Também fecha parte do A5: cria horarios_ocupados_publico(), uma RPC
-- que devolve só os horários já ocupados de um profissional num dia
-- (sem nome de cliente/serviço) — a Área da Cliente (pública, sem
-- login) passa a usar isso para a dica visual de "horário indisponível"
-- em vez de precisar ler a tabela agendamentos inteira (que exige
-- is_staff(), ver 0003_rls_policies.sql).
--
-- ⚠️ IMPORTANTE — ANTES DE APLICAR EM PRODUÇÃO:
-- Uma constraint de exclusão falha ao ser criada se já existir
-- sobreposição na tabela (ela não tem um modo "NOT VALID" como
-- CHECK/FOREIGN KEY). Rode a query abaixo primeiro; se ela retornar
-- alguma linha, resolva manualmente (cancele ou reagende um dos dois
-- agendamentos) antes de continuar:
--
--   select a1.id as agendamento_1, a2.id as agendamento_2, a1.data,
--          a1.horario as horario_1, a2.horario as horario_2,
--          a1.profissional_id
--   from agendamentos a1
--   join agendamentos a2
--     on a1.profissional_id = a2.profissional_id
--    and a1.data = a2.data
--    and a1.id < a2.id
--   join servicos s1 on s1.id = a1.servico_id
--   join servicos s2 on s2.id = a2.servico_id
--   where a1.status <> 'cancelado' and a2.status <> 'cancelado'
--     and tsrange(
--           (a1.data + a1.horario)::timestamp,
--           (a1.data + a1.horario)::timestamp + make_interval(mins => s1.duracao_minutos)
--         ) && tsrange(
--           (a2.data + a2.horario)::timestamp,
--           (a2.data + a2.horario)::timestamp + make_interval(mins => s2.duracao_minutos)
--         );
--
-- Idempotente: seguro rodar mais de uma vez.
-- ─────────────────────────────────────────────────────────────

-- Necessária para usar "=" (igualdade de uuid) dentro de uma
-- constraint de exclusão baseada em GiST.
create extension if not exists btree_gist;

-- Intervalo de tempo ocupado por um agendamento. Mantido por trigger
-- (não "generated always as", porque depende de outra tabela —
-- servicos.duracao_minutos).
alter table agendamentos add column if not exists periodo tsrange;

create or replace function agendamentos_calcular_periodo()
returns trigger
language plpgsql
as $$
declare
  v_duracao integer;
begin
  select duracao_minutos into v_duracao from servicos where id = new.servico_id;
  if v_duracao is null then
    raise exception 'Serviço % não encontrado para calcular o período do agendamento', new.servico_id;
  end if;
  new.periodo := tsrange(
    (new.data + new.horario)::timestamp,
    (new.data + new.horario)::timestamp + make_interval(mins => v_duracao),
    '[)'
  );
  return new;
end;
$$;

drop trigger if exists trg_agendamentos_calcular_periodo on agendamentos;
create trigger trg_agendamentos_calcular_periodo
  before insert or update of data, horario, servico_id on agendamentos
  for each row execute function agendamentos_calcular_periodo();

-- Backfill das linhas já existentes (necessário antes de tornar a
-- coluna NOT NULL e criar a constraint de exclusão abaixo).
update agendamentos a
  set periodo = tsrange(
    (a.data + a.horario)::timestamp,
    (a.data + a.horario)::timestamp + make_interval(mins => s.duracao_minutos),
    '[)'
  )
  from servicos s
  where s.id = a.servico_id
    and a.periodo is null;

alter table agendamentos alter column periodo set not null;

drop index if exists uq_agendamentos_sem_conflito;

alter table agendamentos drop constraint if exists agendamentos_sem_sobreposicao;
alter table agendamentos
  add constraint agendamentos_sem_sobreposicao
  exclude using gist (
    profissional_id with =,
    periodo with &&
  )
  where (status <> 'cancelado');

comment on constraint agendamentos_sem_sobreposicao on agendamentos is
  'Substitui uq_agendamentos_sem_conflito (0001): bloqueia qualquer sobreposição de intervalo [horario, horario+duração) do mesmo profissional, não só igualdade exata de horário. Ver A4 em GO_LIVE_AUDIT_REPORT.md.';

-- criar_agendamento_publico precisa traduzir também o novo tipo de
-- erro (exclusion_violation, SQLSTATE 23P01) — antes só existia
-- unique_violation (23505). Corpo idêntico ao de 0009, só adiciona a
-- cláusula "or exclusion_violation".
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
  when unique_violation or exclusion_violation then
    raise exception 'Esse profissional já tem um agendamento nesse horário.';
end;
$$;

comment on function criar_agendamento_publico(text, text, uuid, uuid, date, time, text) is
  'Agendamento público (Área da Cliente). A partir de 0009, só aceita tipo_pagamento = ''pendente_pos_atendimento''. A partir de 0010, o conflito de horário considera sobreposição de intervalo, não só igualdade exata (agendamentos_sem_sobreposicao).';

revoke all on function criar_agendamento_publico(text, text, uuid, uuid, date, time, text) from public;
grant execute on function criar_agendamento_publico(text, text, uuid, uuid, date, time, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- RPC pública: horários ocupados de um profissional num dia, sem
-- nenhum dado de cliente/serviço — a Área da Cliente usa isto só como
-- dica visual antes de tentar confirmar (a validação real continua
-- sendo a constraint de exclusão acima, na hora do INSERT).
-- ─────────────────────────────────────────────────────────────
create or replace function horarios_ocupados_publico(p_data date, p_profissional_id uuid)
returns table (horario time)
language sql
stable
security definer
set search_path = public
as $$
  select a.horario
  from agendamentos a
  where a.data = p_data
    and a.profissional_id = p_profissional_id
    and a.status <> 'cancelado';
$$;

comment on function horarios_ocupados_publico(date, uuid) is
  'Só devolve horário — nunca cliente/serviço/valores. Existe para a Área da Cliente (sem login) poder mostrar horários já ocupados sem precisar de acesso de staff a agendamentos. Ver A5 em GO_LIVE_AUDIT_REPORT.md.';

revoke all on function horarios_ocupados_publico(date, uuid) from public;
grant execute on function horarios_ocupados_publico(date, uuid) to anon, authenticated;
