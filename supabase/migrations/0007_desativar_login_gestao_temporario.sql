-- ─────────────────────────────────────────────────────────────
-- Pharus — 0007: desativa a exigência de login da Gestão (temporário)
-- ─────────────────────────────────────────────────────────────
-- Decisão do dono do sistema: por enquanto, a Gestão não vai exigir
-- login (criar manualmente o primeiro usuário de staff pelo painel do
-- Supabase foi considerado fricção demais nesta fase).
--
-- Isso REVERTE is_staff() para "sempre true" — ou seja, volta o
-- comportamento original documentado em 0003_rls_policies.sql: quem
-- tiver a anon key do projeto (que já esteve pública no bundle
-- publicado) consegue ler/escrever todos os dados de Gestão
-- (clientes, despesas, comissões, agendamentos, vendas), sem
-- autenticação nenhuma. Ver auditoria de banco (DBA-001/DBA-002) para
-- o detalhe do risco — ele volta a existir a partir desta migration.
--
-- A tabela `funcionarios` e a função is_staff() criadas em
-- 0006_auth_seguranca.sql NÃO foram removidas, só o corpo da função
-- foi revertido — ficam prontas para reativar o login real depois:
-- basta rodar de novo o corpo de is_staff() mostrado no comentário de
-- 0006 e restaurar a tela de login no front-end (ver histórico do
-- clinica-sistema.jsx antes desta migration).
--
-- As outras correções de 0006 continuam valendo (não dependem de
-- login): o trigger que bloqueia alterar valor_cobrado/
-- comissao_calculada/servico_id/etc via UPDATE em agendamentos, e
-- vendas/venda_itens só graváveis pela RPC registrar_venda_publica().
-- ─────────────────────────────────────────────────────────────
create or replace function is_staff()
returns boolean
language sql
stable
as $$
  select true;
$$;

comment on function is_staff() is
  'TEMPORÁRIO (revertido em 0007 por decisão do dono do sistema): sempre true, sem exigir login. A tabela funcionarios e a versão real desta função ficam documentadas em 0006_auth_seguranca.sql para reativar quando quiser.';
