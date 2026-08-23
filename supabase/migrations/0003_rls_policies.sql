-- ─────────────────────────────────────────────────────────────
-- Studio Aura — 0003: RLS e policies
-- ─────────────────────────────────────────────────────────────
-- IMPORTANTE (leia antes de aplicar em produção com dados reais):
-- A área de Gestão hoje autentica com uma credencial FIXA no
-- front-end (admin/1234, ver Login em clinica-sistema.jsx), não com
-- Supabase Auth. Sem uma sessão autenticada de verdade, não existe
-- como o banco diferenciar "cliente anônimo" de "funcionária da
-- Gestão" — as duas chamadas chegam com a mesma anon key.
--
-- is_staff() abaixo é um placeholder que hoje retorna TRUE sempre,
-- ou seja: enquanto o login continuar fixo, qualquer pessoa com a
-- anon key do projeto consegue ler/escrever dados de Gestão
-- (clientes, despesas, comissões, agendamentos completos). Isso é
-- uma decisão consciente e temporária, para não bloquear o app
-- enquanto a autenticação real não é implementada.
--
-- Quando Supabase Auth for adicionado para a Gestão, troque só o
-- corpo desta função — nenhuma policy precisa mudar:
--   create or replace function is_staff() returns boolean
--   language sql stable as $$
--     select exists (select 1 from funcionarios where user_id = auth.uid());
--   $$;
-- ─────────────────────────────────────────────────────────────

create or replace function is_staff()
returns boolean
language sql
stable
as $$
  select true;
$$;

comment on function is_staff() is
  'TEMPORÁRIO: sempre true porque a Gestão ainda usa login fixo no front-end (não Supabase Auth). Ver comentário no topo de 0003_rls_policies.sql antes de usar em produção com dados reais.';

alter table profissionais enable row level security;
alter table servicos enable row level security;
alter table modelos_pacote enable row level security;
alter table clientes enable row level security;
alter table clientes_pacotes enable row level security;
alter table agendamentos enable row level security;
alter table despesas enable row level security;
alter table repasses_comissao enable row level security;
alter table produtos enable row level security;
alter table vendas enable row level security;
alter table venda_itens enable row level security;

-- ─────────────────────────────────────────────────────────────
-- Catálogo público (necessário para a tela de autoagendamento/loja
-- sem login): qualquer visitante lê os itens ativos; só staff
-- gerencia (criar/editar/desativar).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "select profissionais" on profissionais;
create policy "select profissionais" on profissionais
  for select using (ativo = true or is_staff());
drop policy if exists "staff insert profissionais" on profissionais;
create policy "staff insert profissionais" on profissionais
  for insert with check (is_staff());
drop policy if exists "staff update profissionais" on profissionais;
create policy "staff update profissionais" on profissionais
  for update using (is_staff());
drop policy if exists "staff delete profissionais" on profissionais;
create policy "staff delete profissionais" on profissionais
  for delete using (is_staff());

drop policy if exists "select servicos" on servicos;
create policy "select servicos" on servicos
  for select using (ativo = true or is_staff());
drop policy if exists "staff insert servicos" on servicos;
create policy "staff insert servicos" on servicos
  for insert with check (is_staff());
drop policy if exists "staff update servicos" on servicos;
create policy "staff update servicos" on servicos
  for update using (is_staff());
drop policy if exists "staff delete servicos" on servicos;
create policy "staff delete servicos" on servicos
  for delete using (is_staff());

drop policy if exists "select modelos_pacote" on modelos_pacote;
create policy "select modelos_pacote" on modelos_pacote
  for select using (ativo = true or is_staff());
drop policy if exists "staff insert modelos_pacote" on modelos_pacote;
create policy "staff insert modelos_pacote" on modelos_pacote
  for insert with check (is_staff());
drop policy if exists "staff update modelos_pacote" on modelos_pacote;
create policy "staff update modelos_pacote" on modelos_pacote
  for update using (is_staff());
drop policy if exists "staff delete modelos_pacote" on modelos_pacote;
create policy "staff delete modelos_pacote" on modelos_pacote
  for delete using (is_staff());

drop policy if exists "select produtos" on produtos;
create policy "select produtos" on produtos
  for select using (ativo = true or is_staff());
drop policy if exists "staff insert produtos" on produtos;
create policy "staff insert produtos" on produtos
  for insert with check (is_staff());
drop policy if exists "staff update produtos" on produtos;
create policy "staff update produtos" on produtos
  for update using (is_staff());
drop policy if exists "staff delete produtos" on produtos;
create policy "staff delete produtos" on produtos
  for delete using (is_staff());

-- ─────────────────────────────────────────────────────────────
-- Dados sensíveis (financeiro, clientes, comissões, agendamentos
-- completos, vendas): só staff. Ver aviso no topo do arquivo sobre
-- is_staff() ser temporariamente permissivo.
--
-- O autoagendamento e o checkout da loja NÃO usam estas policies —
-- passam pelas RPCs SECURITY DEFINER criar_agendamento_publico() e
-- registrar_venda_publica() (migration 0002), que validam e calculam
-- tudo no servidor antes de gravar.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "staff clientes" on clientes;
create policy "staff clientes" on clientes
  for all using (is_staff()) with check (is_staff());

drop policy if exists "staff clientes_pacotes" on clientes_pacotes;
create policy "staff clientes_pacotes" on clientes_pacotes
  for all using (is_staff()) with check (is_staff());

drop policy if exists "staff agendamentos" on agendamentos;
create policy "staff agendamentos" on agendamentos
  for all using (is_staff()) with check (is_staff());

drop policy if exists "staff despesas" on despesas;
create policy "staff despesas" on despesas
  for all using (is_staff()) with check (is_staff());

drop policy if exists "staff repasses_comissao" on repasses_comissao;
create policy "staff repasses_comissao" on repasses_comissao
  for all using (is_staff()) with check (is_staff());

drop policy if exists "staff vendas" on vendas;
create policy "staff vendas" on vendas
  for all using (is_staff()) with check (is_staff());

drop policy if exists "staff venda_itens" on venda_itens;
create policy "staff venda_itens" on venda_itens
  for all using (is_staff()) with check (is_staff());
