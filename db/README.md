# Banco de dados — Studio Aura

O app agora lê e grava dados de verdade num projeto Supabase (Postgres),
em vez de arrays mock em memória. Este documento explica como aplicar o
schema e configurar o front-end.

## 1. Aplicar as migrations

Os arquivos em `supabase/migrations/` devem ser rodados **nesta ordem**
(cada um depende do anterior):

1. `0001_schema.sql` — tabelas, relacionamentos, constraints, índices
2. `0002_functions.sql` — cálculo de comissão/preço no servidor, dedução
   de sessão de pacote, e as duas RPCs públicas (autoagendamento e
   checkout da loja)
3. `0003_rls_policies.sql` — Row Level Security e policies
4. `0004_seed.sql` — dados de exemplo (os mesmos que já existiam como
   mock no front-end)
5. `0005_menu_real_promocoes.sql` — menu real da Pharus e promoções
6. `0006_auth_seguranca.sql` — autenticação real da Gestão (Supabase
   Auth), trava de alteração financeira em `UPDATE` de agendamentos, e
   vendas/venda_itens só graváveis via RPC.
7. `0007_desativar_login_gestao_temporario.sql` — **reverte só a parte
   de login** de `0006` (decisão do dono do sistema: exigir criar
   usuário no painel do Supabase era fricção demais nesta fase). As
   outras duas correções de `0006` (trava de `UPDATE` e vendas só via
   RPC) continuam ativas. Ver aviso de segurança na seção 3.
8. `0008_reativar_login_gestao.sql` — reaplica o `is_staff()` real de
   `0006` (desfaz `0007`), agora que o front-end já tem a tela de
   Login/Logout pronta. **Depois de rodar esta migration, siga o
   checklist da seção 3 (criar usuário + vincular em `funcionarios`)
   antes de tentar logar** — sem isso a Gestão fica inacessível para
   todo mundo, de propósito.
9. `0009_remover_pagamento_publico_e_loja.sql` — o agendamento público
   deixa de aceitar Pix/Cartão (só `pendente_pos_atendimento` — a
   cliente paga na clínica) e a RPC de checkout da Loja
   (`registrar_venda_publica`) é desativada (`revoke execute`), porque
   a Loja Home Care saiu do app da cliente.
10. `0010_prevenir_sobreposicao_agendamentos.sql` — troca o índice
    único de conflito de horário (que só barrava reserva EXATA) por
    uma constraint de exclusão que considera a DURAÇÃO do serviço —
    fecha o item A4 da auditoria (dois atendimentos de 90 min de
    espaçamento entre slots, com um serviço de 120 min, podiam
    sobrepor sem erro). Também cria `horarios_ocupados_publico()`, uma
    RPC que a Área da Cliente usa para saber quais horários já estão
    ocupados sem precisar de acesso de staff à tabela `agendamentos`
    inteira (fecha parte do A5 — antes disso, qualquer visitante
    anônimo recebia a agenda completa, com nome de clientes, só por
    abrir o site). **Leia o comentário no topo do arquivo antes de
    aplicar**: uma constraint de exclusão falha ao ser criada se já
    existir sobreposição real na tabela — o arquivo traz a query para
    checar isso antes.

**Opção A — SQL Editor do Supabase (mais simples):**
Abra o projeto em https://supabase.com/dashboard → SQL Editor → cole o
conteúdo de cada arquivo, na ordem, e rode um de cada vez.

**Opção B — Supabase CLI:**
```bash
supabase link --project-ref SEU-PROJETO
supabase db push
```

Todas as migrations são idempotentes (`create table if not exists`,
`on conflict do nothing` etc.) — rodar de novo não duplica nem apaga
nada.

## 2. Configurar o front-end

1. Copie `db/config.example.js` para `db/config.js` (esse arquivo é
   ignorado pelo git — cada ambiente tem o seu).
2. Preencha com a URL e a `anon key` do seu projeto (Project Settings →
   API no painel do Supabase).
3. Rode `npm install && npm run build`.

Se for publicar (Vercel/GitHub Pages), edite `vercel.json` e troque
`https://SEU-PROJETO.supabase.co` no `Content-Security-Policy` pela URL
real do seu projeto — sem isso o navegador bloqueia as chamadas ao
Supabase.

## 3. Segurança da Gestão (ler antes de usar com dados reais)

**Estado atual (depois de `0008`): a Gestão exige login real, tela e
banco em sincronia.** A tela de login foi reconstruída em
`clinica-sistema.jsx` usando Supabase Auth de verdade (`db/auth.js`,
`supabase.auth.signInWithPassword`) — não é mais o `admin`/`1234` fixo
de antes. O "Painel de Gestão" só abre com uma sessão válida; sem
sessão, o front-end mostra a tela de login. E `0008_reativar_login_gestao.sql`
reaplicou o `is_staff()` real de `0006` (que checa `funcionarios` via
`auth.uid()`), desfazendo o `select true` de `0007` — então agora a
API do Supabase também exige a mesma sessão, não só a tela.

**Isso só funciona depois de você completar o checklist abaixo — sem
ele, a Gestão fica inacessível para todo mundo, inclusive pra você:**

1. ~~Rode de novo o `is_staff()` real~~ — já feito por
   `0008_reativar_login_gestao.sql`, é só aplicar essa migration.
2. Crie o primeiro usuário em Authentication → Users no painel do
   Supabase (e-mail + senha — é com isso que a pessoa vai logar no
   front-end).
3. Vincule esse usuário à tabela `funcionarios` com o `INSERT`
   documentado em `0006_auth_seguranca.sql`/`0008_reativar_login_gestao.sql`.

**Se você aplicar `0008` sem antes completar os passos 2–3, o login vai
parecer que "não funciona"** (a tela aceita a sessão, mas toda consulta
de Gestão volta vazia/bloqueada pela RLS) — o sintoma esperado é
exatamente esse até existir uma linha ativa em `funcionarios` para o
usuário logado.

Antes de `0008` ser aplicada no projeto Supabase real, o risco descrito
abaixo **continua valendo**: com `0007` ainda ativa no banco (mesmo já
com a tela de login pronta no front-end), a API do Supabase (REST, com
a `anon key`) aceita leitura/escrita de qualquer um em `clientes`,
`despesas`, `comissões`, `agendamentos`, `vendas`, independente de
estar logado — a tela de login sozinha é só uma porta na frente da
casa. Não é um bug do front-end, é a natureza de RLS: quem decide se um
dado é liberado é sempre o banco, nunca a tela.

O que **continua** protegido, independente de login (não dependem de
autenticação, são regras de integridade no banco):

- Trigger que bloqueia `UPDATE` tentando mudar `servico_id`,
  `profissional_id`, `tipo_pagamento`, `pacote_utilizado_id`,
  `valor_cobrado`, `comissao_calculada` ou `sessao_numero` de um
  agendamento já criado. `status`, `comissao_paga` e
  `data_baixa_comissao` continuam editáveis normalmente.
- `vendas`/`venda_itens` só são graváveis pela RPC
  `registrar_venda_publica()` (baixa atômica de estoque) — não aceitam
  `INSERT`/`UPDATE` direto.

### Girar a `anon key` publicada

Como a `anon key` atual já circulou publicamente sem proteção de RLS
por trás dela, considere girá-la mesmo depois de reativar `is_staff()`
— reduz a chance de alguém ter guardado essa key especificamente para
voltar depois:

1. Supabase → **Project Settings → API → anon public key → Roll**.
2. Copie a nova key para `db/config.js` (`SUPABASE_ANON_KEY`).
3. Rode `npm run build` de novo e republique.

## 4. Checklist manual de teste

Depois de aplicar as migrations e configurar `db/config.js`:

1. **Sem duplicar cliente**: agende duas vezes pela Área da Cliente
   usando o mesmo telefone — as duas devem aparecer no histórico da
   *mesma* cliente na Gestão (aba Clientes), não de duas clientes
   diferentes.
2. **Conflito de horário**: tente agendar o mesmo profissional na
   mesma data/horário duas vezes (uma pela Área da Cliente, outra pela
   Gestão) — a segunda deve ser recusada com uma mensagem de erro.
   Depois de aplicar `0010`, teste também a SOBREPOSIÇÃO: agende um
   serviço de 120 min às 09:00 com um profissional, depois tente
   agendar QUALQUER serviço às 10:30 com o mesmo profissional — deve
   ser recusado também (antes de 0010, isso passava sem erro).
3. **Persistência**: marque uma comissão como paga ou liquide um
   repasse na Gestão, recarregue a página — o estado deve continuar lá
   (antes, tudo se perdia no reload porque era só memória).
4. **UPDATE bloqueado**: no SQL Editor, tente `update agendamentos set
   valor_cobrado = 0 where id = '<algum id>'` — deve falhar com a
   mensagem do trigger, não silenciosamente aceitar.
5. **Login da Gestão**: com o usuário de staff criado (checklist da
   seção 3), abra "Painel de Gestão" deslogado — deve cair na tela de
   login, não no painel. Entre com e-mail/senha errados — mensagem
   genérica, sem detalhe técnico. Entre certo — deve cair no painel.
   Clique em "Sair" — deve voltar pra tela de login. Recarregue a
   página logado — a sessão deve continuar (não pede login de novo).
6. **Login independente do catálogo público**: com a internet
   desligada (ou bloqueando temporariamente o domínio do Supabase no
   DevTools), abra o app direto na aba "Painel de Gestão" — a tela de
   Login deve aparecer normalmente (ela não depende do catálogo
   público). Só ao entrar com sucesso é que o painel deve mostrar a
   tela de carregamento/erro relativa aos dados de Gestão.
7. **Agendamento sem pagamento**: agende pela Área da Cliente — não
   deve haver nenhuma etapa de escolha de forma de pagamento. Na
   Gestão, o agendamento deve aparecer com o badge "Pendente Pós".
8. **Dados de Gestão não vazam pro público**: com o DevTools aberto na
   aba Network, abra o site DESLOGADO direto na Área da Cliente — não
   deve haver nenhuma chamada trazendo `despesas`, `repasses_comissao`,
   `clientes_pacotes` ou `agendamentos` completo (com nome de cliente).
   A única chamada relacionada a horário deve ser a RPC
   `horarios_ocupados_publico` (só depois de escolher serviço e data),
   e ela só deve trazer o campo `horario` — nenhum nome. Depois de
   logar na Gestão, aí sim as chamadas completas devem aparecer.
