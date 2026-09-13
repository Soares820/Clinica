-- ─────────────────────────────────────────────────────────────
-- Pharus — 0006: autenticação real da Gestão, trava de alteração
-- financeira em UPDATE e escrita de vendas só via RPC
-- ─────────────────────────────────────────────────────────────
-- Fecha os itens 1, 3 e 4 da auditoria de banco (is_staff() sempre
-- true, trigger de cálculo que só rodava em INSERT, e escrita direta
-- em vendas/venda_itens que bypassava a baixa atômica de estoque).
--
-- IMPORTANTE — leia antes de aplicar:
-- Depois desta migration, a área de Gestão só funciona para quem
-- tiver um usuário de Supabase Auth E uma linha em `funcionarios`
-- apontando pra esse usuário. Não existe auto-cadastro de staff (de
-- propósito — ver checklist no fim deste arquivo). Sem isso, a
-- Gestão fica inacessível para todo mundo, inclusive você, até o
-- primeiro funcionário ser criado manualmente.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 1. Tabela funcionarios + is_staff() real (fecha DBA-001/DBA-002)
-- ─────────────────────────────────────────────────────────────
create table if not exists funcionarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table funcionarios enable row level security;

-- security definer + search_path fixo: a checagem interna
-- ("select ... from funcionarios") precisa rodar sem RLS, senão a
-- policy de funcionarios (que chama is_staff()) entra em recursão
-- infinita ao tentar ler a própria tabela que a protege.
create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from funcionarios where user_id = auth.uid() and ativo = true
  );
$$;

comment on function is_staff() is
  'True se o usuário autenticado (auth.uid()) tiver uma linha ativa em funcionarios. Ver checklist de setup no fim de 0006_auth_seguranca.sql.';

revoke all on function is_staff() from public;
grant execute on function is_staff() to anon, authenticated;

drop policy if exists "staff funcionarios" on funcionarios;
create policy "staff funcionarios" on funcionarios
  for all using (is_staff()) with check (is_staff());

-- ─────────────────────────────────────────────────────────────
-- 2. Trava alteração de campos financeiros de agendamentos em UPDATE
--    (fecha DBA-003). O trigger de cálculo em 0002/0005 só protegia
--    o INSERT; um UPDATE direto conseguia reescrever valor_cobrado,
--    comissao_calculada etc. livremente. status, comissao_paga e
--    data_baixa_comissao continuam editáveis normalmente — é o que
--    o app já usa (atualizarStatusAgendamento, darBaixaComissaoAgendamento).
-- ─────────────────────────────────────────────────────────────
create or replace function agendamentos_bloquear_alteracao_financeira()
returns trigger
language plpgsql
as $$
begin
  if new.servico_id is distinct from old.servico_id
     or new.profissional_id is distinct from old.profissional_id
     or new.tipo_pagamento is distinct from old.tipo_pagamento
     or new.pacote_utilizado_id is distinct from old.pacote_utilizado_id
     or new.valor_cobrado is distinct from old.valor_cobrado
     or new.comissao_calculada is distinct from old.comissao_calculada
     or new.sessao_numero is distinct from old.sessao_numero
  then
    raise exception 'Não é permitido alterar serviço, profissional, forma de pagamento, pacote ou valores de um agendamento já criado. Cancele e crie um novo agendamento.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agendamentos_bloquear_alteracao_financeira on agendamentos;
create trigger trg_agendamentos_bloquear_alteracao_financeira
  before update on agendamentos
  for each row execute function agendamentos_bloquear_alteracao_financeira();

-- ─────────────────────────────────────────────────────────────
-- 3. vendas/venda_itens deixam de aceitar escrita direta (fecha
--    DBA-004). Toda venda — Gestão ou Área da Cliente — passa a ser
--    criada só pela RPC registrar_venda_publica() (0002_functions.sql),
--    que já faz a baixa atômica de estoque com lock de linha e nunca
--    deixa estoque negativo. Um INSERT direto em venda_itens
--    contornava essa checagem por completo.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "staff vendas" on vendas;
create policy "staff select vendas" on vendas
  for select using (is_staff());

drop policy if exists "staff venda_itens" on venda_itens;
create policy "staff select venda_itens" on venda_itens
  for select using (is_staff());

-- ─────────────────────────────────────────────────────────────
-- CHECKLIST — rode depois de aplicar esta migration
-- ─────────────────────────────────────────────────────────────
-- 1. No painel do Supabase → Authentication → Users → "Add user",
--    crie o primeiro usuário de staff (e-mail + senha).
--
-- 2. No SQL Editor, rode (troque o e-mail pelo que você criou):
--
--    insert into funcionarios (user_id, nome)
--    select id, 'Nome da pessoa'
--    from auth.users
--    where email = 'email-da-pessoa@exemplo.com';
--
-- 3. Confirme com:
--
--    select f.nome, f.ativo, u.email
--    from funcionarios f join auth.users u on u.id = f.user_id;
--
-- Sem os passos 1 e 2, a Gestão fica inacessível para todo mundo —
-- inclusive para quem só tem a anon key (o que é o objetivo).
-- ─────────────────────────────────────────────────────────────
