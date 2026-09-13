-- ─────────────────────────────────────────────────────────────
-- Pharus — 0008: reativa a exigência de login real da Gestão
-- ─────────────────────────────────────────────────────────────
-- Reverte a decisão temporária de 0007 (is_staff() sempre true).
-- Agora que o front-end (clinica-sistema.jsx) já tem uma tela de
-- Login/Logout real usando Supabase Auth (ver db/auth.js), voltar a
-- exigir isso no banco é obrigatório — sem esta migration, a tela de
-- Login é só decorativa: qualquer pessoa com a anon key do projeto
-- (pública por design, e que já circulou no bundle publicado) continua
-- lendo/escrevendo todos os dados de Gestão direto pela API do
-- Supabase, sem nunca passar pelo Login.
--
-- Corpo idêntico ao criado em 0006_auth_seguranca.sql — só reaplicado
-- aqui porque 0007 tinha sobrescrito com "select true".
--
-- IMPORTANTE — leia antes de aplicar:
-- Depois desta migration, a Gestão só funciona para quem tiver um
-- usuário de Supabase Auth E uma linha ativa em `funcionarios`
-- apontando pra esse usuário. Não existe auto-cadastro de staff (de
-- propósito). Sem isso, a Gestão fica inacessível para todo mundo,
-- inclusive para você, até o primeiro funcionário ser criado
-- manualmente — siga o checklist no fim deste arquivo antes de tentar
-- logar.
-- ─────────────────────────────────────────────────────────────

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
  'True se o usuário autenticado (auth.uid()) tiver uma linha ativa em funcionarios. Reativado em 0008 depois de ter sido desligado temporariamente em 0007. Ver checklist de setup no fim deste arquivo.';

revoke all on function is_staff() from public;
grant execute on function is_staff() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- CHECKLIST — rode antes/depois de aplicar esta migration
-- ─────────────────────────────────────────────────────────────
-- 1. No painel do Supabase → Authentication → Users → "Add user",
--    crie o(s) usuário(s) de staff (e-mail + senha) que vão logar na
--    tela de Login do app.
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
-- 4. Considere também girar a anon key publicada (Project Settings →
--    API → anon public key → Roll) — ela já circulou sem RLS de
--    verdade por trás e pode ter sido copiada por alguém nesse meio
--    tempo. Depois de girar, atualize db/config.js e rode `npm run
--    build` de novo.
--
-- Sem os passos 1 e 2, a Gestão fica inacessível para todo mundo,
-- inclusive para quem só tem a anon key — o que é o objetivo.
-- ─────────────────────────────────────────────────────────────
