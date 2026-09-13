-- ─────────────────────────────────────────────────────────────
-- Pharus — limpeza de dados de demonstração/teste
-- ─────────────────────────────────────────────────────────────
-- NÃO é uma migration de schema — não faz parte da sequência
-- supabase/migrations/0001...0010 e não deve ser renumerada para
-- entrar nela. É uma operação de DADOS, para rodar manualmente, uma
-- vez, no SQL Editor, quando você decidir começar a operar com dados
-- reais de clientes.
--
-- O que faz: apaga TODAS as linhas de agendamentos, clientes,
-- clientes_pacotes, despesas, repasses_comissao, produtos, vendas,
-- venda_itens e profissionais — incluindo os dados de exemplo que
-- vieram em 0004_seed.sql (Marina Duarte, Ana Beatriz Souza etc.) E
-- qualquer teste real que você já tenha feito (ex: o agendamento de
-- teste "Cleber Soares" criado pela Área da Cliente publicada).
--
-- O que NÃO apaga: `servicos` e `modelos_pacote` ("Serviços & Menu")
-- continuam intactos — é o catálogo que você já configurou.
--
-- Depois de rodar isto, cadastre as profissionais reais na aba
-- Gestão → Colaboradores (feature nova) antes de usar o sistema pra
-- valer, senão a agenda fica sem ninguém pra vincular atendimento.
--
-- ⚠️ IRREVERSÍVEL. Não há como desfazer via SQL depois de rodado
-- (a não ser restaurando um backup do banco). Rode só quando tiver
-- certeza.
-- ─────────────────────────────────────────────────────────────

-- Ordem respeita as foreign keys (filhos antes dos pais).
delete from venda_itens;
delete from vendas;
delete from agendamentos;
delete from clientes_pacotes;
delete from repasses_comissao;
delete from despesas;
delete from clientes;
delete from profissionais;
delete from produtos;

-- Confirmação: deve mostrar 0 em tudo, exceto "servicos" e
-- "modelos_pacote (mantido)".
select 'agendamentos' as tabela, count(*) as linhas from agendamentos
union all select 'clientes', count(*) from clientes
union all select 'clientes_pacotes', count(*) from clientes_pacotes
union all select 'despesas', count(*) from despesas
union all select 'repasses_comissao', count(*) from repasses_comissao
union all select 'produtos', count(*) from produtos
union all select 'vendas', count(*) from vendas
union all select 'venda_itens', count(*) from venda_itens
union all select 'profissionais', count(*) from profissionais
union all select 'servicos (mantido)', count(*) from servicos
union all select 'modelos_pacote (mantido)', count(*) from modelos_pacote;
