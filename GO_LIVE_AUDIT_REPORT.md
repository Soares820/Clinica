# GO-LIVE AUDIT REPORT
**Sistema:** Studio Aura / Pharus Estética & Spa
**Data da auditoria:** 2026-09-10
**Auditor:** Claude Code — Release Engineer (auditoria estática, sem alteração de código)
**Repositório:** github.com/Soares820/Clinica (branch `main`)

---

## 🔄 ATUALIZAÇÃO — 2026-09-13 (correções aplicadas ao código)

Esta seção documenta o que mudou desde a auditoria original de 2026-09-10.
O corpo do relatório abaixo **não foi reescrito** — continua sendo o
retrato de 10/09, preservado como histórico. Onde um item foi corrigido,
foi anotado com "STATUS: RESOLVIDO EM 2026-09-13" logo abaixo do
cabeçalho daquele achado.

**O que foi corrigido no código (working tree, ainda não commitado nem
aplicado ao Supabase real):**

- **A1 (paginação)** — `db/queries.js` agora pagina em blocos de 1000
  linhas (`fetchAllRows`) em todas as listagens de Gestão. Não trunca
  mais silenciosamente acima de 1000 registros.
- **A2 (duplo submit)** — `NovoAgendamentoModal`, `NovaDespesaModal`,
  `NovoPacoteModal` (Gestão) e o botão de confirmar da Área da Cliente
  agora têm estado "salvando"/"enviando" com o botão desabilitado
  durante a chamada, no mesmo padrão já usado pelo Login.
- **A4 (sobreposição de horário)** — nova migration
  `supabase/migrations/0010_prevenir_sobreposicao_agendamentos.sql`
  troca o índice único (só igualdade exata) por uma constraint de
  exclusão que considera a duração real do serviço. **Ainda não
  aplicada ao banco real — leia o aviso dentro do arquivo antes de
  aplicar** (uma constraint de exclusão falha ao ser criada se já
  existir sobreposição real na tabela).
- **A5 (vazamento de dados para o público)** — mais grave do que o
  relatório original registrou: além de despesas/repasses/comissões, a
  Área da Cliente (pública, sem login) recebia a tabela `agendamentos`
  completa (com nome de cliente de TODOS os agendamentos, de todas as
  clientes) e `clientes_pacotes` inteira, incondicionalmente, no mount
  do app — hoje isso só não é pior porque `is_staff()` ainda está
  permissiva (C2). A correção: `db/queries.js` agora separa
  `carregarDadosPublicos()` (catálogo: profissionais/serviços/pacotes,
  sempre público) de `carregarDadosGestao()` (clientes, pacotes,
  agendamentos completos, financeiro — só buscado depois de sessão
  válida). A Área da Cliente passou a usar uma RPC nova e mínima
  (`horarios_ocupados_publico`, também em `0010_...sql`) só para saber
  quais horários já estão ocupados, sem nenhum dado de cliente.
  `clientesPacotes`/`agendamentos` eram props mortas em `ClienteView`
  (não usadas em lugar nenhum do componente) — removidas.
- **M3 (documentação)** — `README.md` raiz atualizado: não menciona
  mais credencial fixa, referencia Supabase Auth real e aponta pro
  checklist de `db/README.md`.
- **M10 (HSTS)** — `vercel.json` agora envia
  `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.

**O que CONTINUA exatamente como descrito no relatório original — não
é código, é processo/infra que só o dono do projeto pode fazer:**

- **C1-C4** (login publicado, RLS real, aplicar migrations no Supabase
  de verdade, auditar `funcionarios`) — checklist completo em
  `db/README.md` seção 3 e no item 18 abaixo.
- **A6** (rate limiting/CAPTCHA/MFA) — configuração no painel do
  Supabase Auth, não no código.
- **M1, M2, M4-M9, L1-L7** — sem mudança; continuam como backlog pós-go-live.

**Ainda é NO-GO** enquanto os passos manuais (aplicar `0006`, `0008`,
`0009`, `0010` no Supabase real; criar o primeiro usuário de staff;
girar a anon key) não forem feitos — ver checklist consolidado no
final deste documento.

---

## ⚠️ Nota metodológica crítica — leia antes do resto

Esta auditoria distingue três estados diferentes do sistema, porque eles **não são iguais** neste momento:

| Estado | O que é | Situação da autenticação |
|---|---|---|
| **HEAD do git / `main`** | O que está de fato commitado, é a base do que o Vercel publica | **Sem login algum** no Painel de Gestão |
| **`docs/bundle.js` publicado** | O build estático servido em produção (gerado a partir do HEAD) | Mesmo estado do HEAD — sem login |
| **Working tree local (não commitado)** | Arquivos modificados/novos nesta sessão de trabalho (`db/auth.js`, migrations `0006`-`0008`, `clinica-sistema.jsx` modificado) | Login real via Supabase Auth, **pronto mas não publicado** |

Ou seja: existe uma correção completa e bem implementada para o maior problema de segurança do sistema — mas ela só existe no disco local, não commitada, não buildada, não aplicada ao banco Supabase real. Enquanto isso não acontecer, **o que está em produção é a versão mais aberta possível do sistema.**

---

## STATUS: 🔴 NO-GO

```
CRITICAL: 4
HIGH:     6
MEDIUM:   10
LOW:      7
```

**BLOCKERS:**
- C1 — Painel de Gestão publicado em produção não tem NENHUM controle de acesso (nem falso, nem real)
- C2 — RLS do banco (`is_staff()`) commitada permite leitura/escrita total via API a qualquer pessoa com a anon key (pública por design)
- C3 — A correção já escrita (auth real + migrations 0006/0008) está 100% fora do ar: não commitada, não buildada, não aplicada ao Supabase real
- C4 — Janela de auto-elevação: enquanto `is_staff()` for permissiva, qualquer cadastro anônimo pode plantar acesso de staff permanente em `funcionarios`, que sobrevive à correção se não for auditado manualmente

**RECOMMENDATION:** Não anunciar/manter go-live com dados reais de clientes até que os 4 itens críticos sejam resolvidos **no ambiente real** (não só no working tree) e verificados com as queries de confirmação descritas abaixo. O trabalho de correção já existe e é tecnicamente sólido — falta publicá-lo e verificar o banco real, não escrevê-lo.

---

## 1. Reconhecimento do projeto

- **Frontend:** React 18 (`clinica-sistema.jsx`, ~5.370 linhas, componente único, sem router — estado controla `mode: "cliente" | "gestao"`), `entry.jsx` como ponto de montagem, lucide-react para ícones.
- **Build:** esbuild (`entry.jsx` → `docs/bundle.js`, IIFE, minificado). Sem bundler dev-server, sem HMR configurado para produção.
- **Backend:** nenhum servidor próprio — **Supabase** (Postgres + PostgREST + Auth/GoTrue) como BaaS. Toda regra de negócio crítica vive em RLS policies, triggers e RPCs `SECURITY DEFINER` no próprio Postgres (`supabase/migrations/`).
- **Camada de acesso a dados:** `db/queries.js` (JS puro, usa `@supabase/supabase-js` — sem SQL cru, sem ORM).
- **Autenticação:** Supabase Auth (`supabase.auth.signInWithPassword`) via `db/auth.js` — **mas isso só existe no working tree, ver nota acima**.
- **Deploy:** Vercel, `vercel.json` com `buildCommand: ""` e `outputDirectory: "docs"` — ou seja, **o Vercel não builda nada**, apenas serve o conteúdo já commitado em `docs/`. O build (`npm run build`) é manual, feito pelo desenvolvedor antes de commitar.
- **CI/CD:** inexistente. Não há `.github/workflows`, nenhuma pipeline automatizada, nenhum gate de PR.
- **Variáveis de ambiente:** `.env.local` contém só `VERCEL_OIDC_TOKEN` (gerado automaticamente pela Vercel CLI, não é segredo de aplicação); segredos reais do Supabase ficam em `db/config.js`, corretamente listado em `.gitignore` e **nunca commitado** (confirmado via `git log --all -- db/config.js`).
- **Migrations:** 8 arquivos SQL sequenciais em `supabase/migrations/`, aplicados manualmente via SQL Editor do Supabase ou `supabase db push` — sem tabela de controle de versão, sem CI de schema.
- **Testes:** Vitest + Testing Library. 2 arquivos, 27 testes, **100% focados em login/autenticação** — nenhuma outra funcionalidade (agenda, pagamento, estoque, comissão) tem teste automatizado.
- **Dependências:** `@supabase/supabase-js`, `react`, `react-dom`, `lucide-react` (runtime); `vitest`, `esbuild`, `jsdom`, `@testing-library/*` (dev).

## 2. Mapa da aplicação

```
Cliente (público, sem login)              Gestão (deveria exigir login)
        │                                         │
        ▼                                         ▼
  ClienteView                               GestaoView
  ├─ Agendar (catálogo, promoções,           ├─ Agenda do dia
  │  data/horário fixo)                      ├─ DRE & Financeiro
  └─ Loja Home Care (carrinho + checkout)    ├─ Pacotes & Sessões
        │                                    ├─ Repasses de Comissão
        │                                    ├─ Clientes Cadastrados
        │                                    └─ Serviços & Menu
        ▼                                         ▼
  db/queries.js  ────────────────────────────────►│
        │                                          │
        ▼                                          ▼
  Supabase (PostgREST) ◄── RLS (is_staff()) ── Supabase Auth
        │
        ▼
  Postgres: profissionais, servicos, modelos_pacote, clientes,
  clientes_pacotes, agendamentos, despesas, repasses_comissao,
  produtos, vendas, venda_itens, funcionarios
        │
        ▼
  Vercel (deploy estático de docs/, sem build automatizado)
```

Fluxos de negócio principais: agendamento público → confirmação → atendimento (Gestão) → cálculo de comissão → repasse; venda de produto (Loja) → baixa de estoque → receita no DRE; venda de pacote → sessões consumidas ao longo do tempo; cadastro/edição de serviços e promoções.

---

## 3. PROBLEMAS CRÍTICOS

### C1 — Painel de Gestão publicado (HEAD/produção) não tem controle de acesso algum
```
ID: C1
SEVERIDADE: CRÍTICA
ÁREA: Autenticação
ARQUIVO: clinica-sistema.jsx (estado do HEAD, commit 6fdf22f — o que está de fato em docs/bundle.js)
LINHA: roteamento mode === "cliente" ? <ClienteView/> : <GestaoView/>
PROBLEMA: O commit dff2bad removeu a tela de login antiga (admin/1234 fixo) e nada a substituiu no histórico commitado.
Confirmado via `git show HEAD:clinica-sistema.jsx`: zero ocorrências da palavra "login"; GestaoView abre direto, sem
verificação de sessão.
IMPACTO: Qualquer visitante do site publicado acessa clientes, despesas, comissões, agendamentos e vendas completos,
sem digitar credencial nenhuma.
COMO REPRODUZIR: Abrir o site publicado atual → clicar em "Painel de Gestão" → o painel abre direto, sem tela de login.
CORREÇÃO RECOMENDADA: A correção já existe no working tree local (componente Login, db/auth.js, Supabase Auth) —
falta commitar, rodar `npm run build` e publicar. Ver C3 para o processo completo e correto de publicação.
```

### C2 — RLS commitada (`is_staff()`) permite acesso total via API, independente do front-end
```
ID: C2
SEVERIDADE: CRÍTICA
ÁREA: Autorização / Banco de dados
ARQUIVO: supabase/migrations/0003_rls_policies.sql, linhas 26-32
PROBLEMA: is_staff() está definida como `select true` — sempre verdadeiro. Como as policies de clientes,
clientes_pacotes, agendamentos, despesas, repasses_comissao e funcionarios usam is_staff() em USING/WITH CHECK,
qualquer requisição REST do Supabase com a anon key (pública por design, embutida em docs/bundle.js desde 23/08)
lê e escreve todos esses dados sem autenticação nenhuma — mesmo que o front-end um dia exija login, a tela é
"só uma porta na frente da casa" (citação do próprio db/README.md).
IMPACTO: Vazamento total de PII de clientes (nome, telefone, nascimento) e de dados financeiros do negócio
(despesas, comissões, vendas), mais escrita arbitrária (marcar comissão como paga, criar despesa falsa, etc.).
COMO REPRODUZIR: `git show 8b33304:docs/bundle.js | grep -o "https://[a-z0-9]*\.supabase\.co"` mostra a URL do
projeto; combinada com a anon key (mesmo arquivo) e qualquer cliente REST (curl/Postman), dá acesso total às
tabelas listadas, sem login.
CORREÇÃO RECOMENDADA: Aplicar as migrations 0006 e 0008 no projeto Supabase REAL (não só ter os arquivos no
repositório) e confirmar com:
  select prosrc from pg_proc where proname = 'is_staff';
O corpo deve checar `exists (select 1 from funcionarios where user_id = auth.uid() and ativo = true)` — se
retornar `select true`, o problema continua ativo em produção independente do que exista no working tree local.
```

### C3 — A correção existe apenas localmente; publicá-la exige 4 passos manuais, sem automação, sem CI
```
ID: C3
SEVERIDADE: CRÍTICA
ÁREA: Processo de deploy / Autorização
ARQUIVO: db/README.md (seção 3), supabase/migrations/0006-0008, git status (working tree)
PROBLEMA: git status confirma: clinica-sistema.jsx modificado, db/auth.js e as 3 migrations não rastreadas
(nunca commitadas). A correção do C1/C2 não tem efeito nenhum em produção até que TODOS estes passos aconteçam,
na ordem certa, sem nenhuma ferramenta que force isso:
  1. Aplicar 0006 e 0008 no projeto Supabase real (SQL Editor ou `supabase db push` — manual)
  2. Criar o primeiro usuário em Authentication → Users no Supabase e vinculá-lo em `funcionarios` (manual)
  3. Commitar clinica-sistema.jsx/db/auth.js/migrations, rodar `npm run build`, publicar docs/ (manual)
  4. Girar a anon key publicada (Project Settings → API → Roll) — necessário porque ela já circulou
     publicamente durante todo o período sem RLS efetiva
IMPACTO: Ordens erradas geram sintomas opostos e igualmente ruins:
  - Front-end novo publicado, banco ainda em is_staff()=true: tela de login "decorativa", API continua aberta.
  - 0008 aplicada sem o passo 2 (criar funcionário): Gestão fica INACESSÍVEL PARA TODO MUNDO, inclusive o dono —
    sintoma silencioso (login aceita, mas todo dado de Gestão volta vazio/bloqueado), fácil de confundir com bug.
COMO REPRODUZIR: N/A — risco de processo, não de código.
CORREÇÃO RECOMENDADA: Seguir o checklist da seção 3 de db/README.md manualmente e na ordem, confirmando cada
passo com a query de verificação que o próprio arquivo já documenta:
  select f.nome, f.ativo, u.email from funcionarios f join auth.users u on u.id = f.user_id;
Só publicar o front-end depois de confirmar login ponta a ponta contra o Supabase real.
```

### C4 — Janela de auto-elevação: cadastro anônimo pode plantar acesso de staff permanente
```
ID: C4
SEVERIDADE: CRÍTICA
ÁREA: Autorização / Banco de dados
ARQUIVO: supabase/migrations/0006_auth_seguranca.sql linhas 53-55 (policy de funcionarios) combinado com o
estado permissivo de is_staff() (0003 hoje, ou 0007 se aplicada isoladamente no futuro)
PROBLEMA: A policy `"staff funcionarios" for all using (is_staff())` também fica permissiva enquanto is_staff()
= sempre true. Nessa janela, qualquer pessoa (inclusive anônima, se o cadastro público do Supabase Auth estiver
habilitado, que é o padrão) pode se cadastrar e inserir uma linha em funcionarios vinculando o próprio
auth.users.id com ativo=true. Quando is_staff() for corrigida (0008), essa linha plantada passa a conceder
acesso de staff PERMANENTE — 0008 não audita nem limpa linhas inesperadas em funcionarios.
IMPACTO: Backdoor persistente e silenciosa, indetectável sem inspeção manual da tabela.
COMO REPRODUZIR: Com is_staff() permissiva, criar conta via signup público do Supabase Auth (endpoint público,
anon key já exposta) → INSERT direto em funcionarios (user_id, ativo) values (auth.uid(), true) via REST → acesso
de staff garantido para sempre, mesmo depois do fix.
CORREÇÃO RECOMENDADA: Antes E depois de aplicar 0008, rodar a query de verificação de C3 e validar manualmente
cada linha de funcionarios contra a lista real de funcionários. Se cadastro público não for necessário, desabilitar
sign-up no painel do Supabase Auth. Girar a anon key (já recomendado em C2/C3) também ajuda a fechar essa janela
para quem só tinha a key antiga.
```

---

## 4. PROBLEMAS DE ALTA SEVERIDADE

```
ID: A1
SEVERIDADE: ALTA
STATUS: RESOLVIDO EM 2026-09-13 — db/queries.js agora pagina (fetchAllRows, blocos de 1000) em todas as
listagens de Gestão. Ver seção "ATUALIZAÇÃO — 2026-09-13" no topo do documento.
ÁREA: Banco de dados / Integridade de dados
ARQUIVO: db/queries.js — listarClientes, listarClientesPacotes, listarAgendamentos, listarDespesas,
listarRepassesComissao, listarItensVendidos, carregarTudo (linhas ~150-251)
PROBLEMA: Nenhuma função usa .range()/.limit(). O PostgREST do Supabase aplica um limite padrão de 1000 linhas
por requisição.
IMPACTO: Assim que agendamentos, despesas ou vendas ultrapassarem 1000 linhas, as listagens retornam uma fatia
parcial SEM erro nem aviso — números do DRE, comissões e relatórios ficam silenciosamente errados.
CORREÇÃO RECOMENDADA: Adicionar paginação (.range()) ou filtro por período em todas as listagens antes do go-live.
```

```
ID: A2
SEVERIDADE: ALTA
STATUS: RESOLVIDO EM 2026-09-13 — o checkout da Loja foi removido (ver histórico de "RESOLVIDO POR REMOÇÃO"
abaixo) e os demais fluxos (NovoPacoteModal, NovoAgendamentoModal, NovaDespesaModal, confirmação de
agendamento do cliente) agora têm estado salvando/enviando + botão desabilitado durante o envio, no mesmo
padrão do Login. Histórico original preservado abaixo.
STATUS (histórico, 2026-09-10): PARCIALMENTE RESOLVIDO POR REMOÇÃO — a Loja Home Care (checkout) foi retirada
do app do cliente depois desta auditoria (decisão de negócio: cliente paga na clínica, sem loja). O ponto do
checkout da Loja não existe mais. Os demais pontos (NovoPacoteModal, NovoAgendamentoModal, NovaDespesaModal,
confirmação de agendamento do cliente) CONTINUAM válidos e sem correção — permanece ALTA para esses fluxos.
ÁREA: Frontend / Integridade de dados
ARQUIVO: clinica-sistema.jsx — NovoPacoteModal, confirmação de agendamento do cliente, NovoAgendamentoModal,
NovaDespesaModal (único sem nem "disabled") — números de linha mudaram após a remoção da Loja, reconferir
PROBLEMA: Nenhum desses fluxos de criação tem proteção contra duplo clique/duplo submit (sem estado
"enviando" desabilitando o botão), ao contrário do Login e do ServicoRow, que fazem isso corretamente.
IMPACTO: Duplo clique gera agendamento duplicado, despesa duplicada ou pacote vendido duas vezes.
COMO REPRODUZIR: Em qualquer um desses formulários, preencher dados válidos e clicar duas vezes rápido no botão
de confirmar.
CORREÇÃO RECOMENDADA: Replicar o padrão já usado em Login/ServicoRow (estado salvando/enviando + disabled).
```

```
ID: A3
SEVERIDADE: ALTA
STATUS: RESOLVIDO POR REMOÇÃO — a Loja Home Care (catálogo, carrinho, checkout) foi removida por completo
do app do cliente depois desta auditoria (decisão de negócio: sem venda de produtos pelo site). A tela que
causava este problema não existe mais.
ÁREA: Frontend / Validação (histórico)
PROBLEMA (histórico, já corrigido pela remoção): Se a cliente fosse direto para a aba "Loja Home Care" sem
passar pela aba "Agendar", o checkout enviava nome/telefone vazios — não existia validação equivalente à do
agendamento.
```

```
ID: A4
SEVERIDADE: ALTA
STATUS: RESOLVIDO EM 2026-09-13 (pendente de aplicação no banco real) — nova migration
supabase/migrations/0010_prevenir_sobreposicao_agendamentos.sql troca o índice único por uma constraint de
exclusão (GiST) que considera a duração do serviço. Corrige tanto o caminho público (criar_agendamento_publico)
quanto o da Gestão (mesma tabela/trigger). Só protege de verdade depois de aplicada no Supabase real — leia o
aviso dentro da migration antes de aplicar (pode falhar se já existir sobreposição real nos dados).
ÁREA: Frontend / Regra de negócio
ARQUIVO: clinica-sistema.jsx linhas 3111-3122 (Cliente) e 3663-3674 (Gestão); SLOTS definidos na linha 337
PROBLEMA: O conflito de horário é calculado só por igualdade exata de data+horário+profissional. Os slots fixos
(09:00, 10:30, 13:00, 14:30, 16:00, 17:30) estão espaçados por 90 min, mas existem serviços de 120 min — não há
checagem de sobreposição de intervalo.
IMPACTO: Em uso normal (sem nenhum clique duplicado), é possível agendar dois atendimentos sobrepostos para o
mesmo profissional.
COMO REPRODUZIR: Agendar serviço de 120 min às 09:00 com profissional X; agendar outro serviço às 10:30 com o
mesmo profissional X — sistema não acusa conflito.
CORREÇÃO RECOMENDADA: Comparar sobreposição de intervalos [horário, horário+duração], não só igualdade de horário.
```

```
ID: A5
SEVERIDADE: ALTA
STATUS: RESOLVIDO EM 2026-09-13 (era pior do que descrito abaixo — ver seção "ATUALIZAÇÃO — 2026-09-13" no
topo do documento: agendamentos completo com nome de cliente e clientes_pacotes inteira também eram entregues
ao público, não só despesas/repasses). db/queries.js separa carregarDadosPublicos() (catálogo) de
carregarDadosGestao() (sensível, só pós-login); a Área da Cliente passou a usar uma RPC mínima
(horarios_ocupados_publico) para a dica de horário ocupado, sem nenhum dado de cliente.
ÁREA: Frontend / Exposição de dados
ARQUIVO: clinica-sistema.jsx linhas 1096-1107 (estados) e 1137-1162 (useEffect de carregarTudo)
PROBLEMA: O useEffect que chama db.carregarTudo() roda incondicionalmente no mount do App, independente de mode
ou sessão — traz despesas, repassesComissao e clientesPacotes mesmo com o visitante na Área da Cliente pública,
deslogado.
IMPACTO: Combinado com C2 (RLS aberta hoje), isso é hoje um vazamento ativo e automático de dados financeiros
para qualquer visitante, sem nem precisar tentar acessar a Gestão — a chamada acontece sozinha ao abrir o site.
Mesmo depois de C2 corrigido, é exposição desnecessária de superfície/estrutura de dados.
COMO REPRODUZIR: Abrir o site sem logar, inspecionar aba Network — chamadas de despesas/repasses acontecem mesmo assim.
CORREÇÃO RECOMENDADA: Buscar dados exclusivos de Gestão somente após confirmar sessão válida.
```

```
ID: A6
SEVERIDADE: ALTA
ÁREA: Autenticação
ARQUIVO: db/auth.js linhas 53-55, 62-68
PROBLEMA: Nenhum rate limiting/CAPTCHA/MFA a nível de aplicação — depende inteiramente da configuração padrão do
GoTrue no dashboard do Supabase, que o código não define nem verifica.
IMPACTO: Como a URL e a anon key já são públicas, um atacante pode atacar o endpoint de auth diretamente,
tentando senhas contra e-mails de staff previsíveis.
CORREÇÃO RECOMENDADA: Habilitar rate limiting/CAPTCHA (hCaptcha/Turnstile, suportado nativamente pelo GoTrue)
nas configurações de Auth do projeto; considerar MFA para contas de Gestão.
```

---

## 5. PROBLEMAS DE MÉDIA SEVERIDADE

```
ID: M1 | ÁREA: Deploy | ARQUIVO: vercel.json
PROBLEMA: buildCommand vazio — Vercel apenas serve docs/ já commitado, sem rebuildar/validar. Confirmado
empiricamente: rebuildar localmente a partir do source atual produz um bundle.js com hash diferente do commitado.
IMPACTO: Risco de publicar código desatualizado silenciosamente se o dev esquecer `npm run build` antes de commitar.
CORREÇÃO: Adicionar um passo de CI que rode `npm run build` e falhe se docs/bundle.js divergir do source, ou
mover o build para o próprio Vercel (buildCommand: "npm run build").
```

```
ID: M2 | ÁREA: Testes | ARQUIVO: test/
PROBLEMA: 27 testes, 100% sobre login/autenticação. Nenhuma cobertura automatizada para agendamento, checkout
da loja, comissão, estoque ou DRE — só existe um checklist manual (db/README.md seção 4).
IMPACTO: Regressão em qualquer uma dessas áreas só é pega manualmente, se alguém lembrar de testar.
CORREÇÃO: Priorizar testes para os fluxos financeiros (checkout, comissão, estoque) dado o impacto de A2/A4.
```

```
ID: M3 | ÁREA: Documentação | ARQUIVO: README.md (raiz)
STATUS: RESOLVIDO EM 2026-09-13 — README.md atualizado, referencia Supabase Auth real e o checklist de
db/README.md.
PROBLEMA (histórico): Ainda afirma "o login da área de Gestão usa uma credencial fixa no front-end (não há
back-end/autenticação real)" — desatualizado frente à implementação real de Supabase Auth (mesmo que ainda não
publicada).
IMPACTO: Pode confundir futuros mantenedores/auditores sobre o real estado de segurança do sistema.
CORREÇÃO: Atualizar junto com o commit da correção de autenticação.
```

```
ID: M4 | ÁREA: Backup | ARQUIVO: N/A (config externa ao repo)
PROBLEMA: Nenhuma estratégia de backup/disaster recovery documentada no repositório para o Postgres do Supabase,
que guarda PII de clientes e todo o financeiro do negócio.
IMPACTO: Não verificável estaticamente — precisa confirmação direta no dashboard do Supabase (plano, PITR, retenção).
CORREÇÃO: Confirmar plano do Supabase e política de backup/retention antes do go-live; se for o plano gratuito
(sem PITR), considerar upgrade antes de operar com dados reais de clientes.
```

```
ID: M5 | ÁREA: Rollback | ARQUIVO: N/A
PROBLEMA: Sem git tags, sem release versionado, sem runbook de rollback documentado. Mitigado parcialmente pelo
histórico de deployments da Vercel (permite reverter a build anterior), mas rollback de migrations 0006-0008
não é automatizado nem documentado além dos comentários inline no SQL.
IMPACTO: Se um deploy quebrar, reverter o front-end é possível via Vercel; reverter o banco depende de
conhecimento manual do schema.
CORREÇÃO: Documentar um runbook mínimo de rollback (front-end via Vercel + queixa reversa das migrations).
```

```
ID: M6 | ÁREA: Dependências | ARQUIVO: package.json (devDependencies)
PROBLEMA: npm audit reporta 5 vulnerabilidades (1 crítica, 1 alta, 3 moderadas), todas em vitest/vite/esbuild
(toolchain de dev/build, não runtime do navegador).
IMPACTO: Baixo risco real de produção (não vai no bundle final), mas deveria ser corrigido.
CORREÇÃO: `npm audit fix --force` implica upgrade de vitest 2→5 (breaking change) — planejar e testar
separadamente, não como parte do go-live imediato.
```

```
ID: M7 | ÁREA: Frontend / UX de erro | ARQUIVO: clinica-sistema.jsx (várias linhas: 1773, 1797, 1806, 1815,
2991, 3055, 3162, 3599, 4969, 5114) e 1115-1135
PROBLEMA: err.message cru exposto via window.alert ou texto na tela em vários handlers (inclusive no fluxo
público, não autenticado); Promise de checagem de sessão (1115-1135) sem .catch(); falta validação de formato
de telefone (quebra link de WhatsApp gerado depois); várias listas sem estado vazio tratado (parecem "quebradas"
em vez de mostrar "nenhum registro"); botões de ação de linha (marcar concluído, baixar comissão, liquidar
repasse) sem trava contra múltiplos cliques.
IMPACTO: Experiência inconsistente e possível exposição de mensagens técnicas de erro a usuários anônimos.
CORREÇÃO: Padronizar todos os handlers com o mesmo tratamento já usado em auth.mensagemAmigavelDeErroDeLogin.
```

```
ID: M8 | ÁREA: Autorização | ARQUIVO: supabase/migrations/0006_auth_seguranca.sql linhas 53-55
PROBLEMA: Qualquer funcionário ativo pode promover/despromover qualquer outro (sem papel "admin" separado).
IMPACTO: Aceitável para o porte atual da equipe, mas é uma decisão que deveria ser consciente, não implícita.
CORREÇÃO: Se a equipe crescer, criar papel admin separado com policy própria para a tabela funcionarios.
```

```
ID: M9 | ÁREA: Banco de dados / LGPD | ARQUIVO: supabase/migrations/0001_schema.sql linhas 109, 138
PROBLEMA: agendamentos.cliente_id é ON DELETE RESTRICT — na prática impossibilita excluir qualquer cliente que
já tenha agendamento (a esmagadora maioria).
IMPACTO: Não há caminho hoje para atender a um pedido de "direito ao esquecimento" (LGPD) sem intervenção manual.
CORREÇÃO: Definir conscientemente uma estratégia de anonimização (zerar PII preservando o histórico financeiro)
antes de precisar responder a esse tipo de solicitação.
```

```
ID: M10 | ÁREA: Infraestrutura / Headers | ARQUIVO: vercel.json
STATUS: RESOLVIDO EM 2026-09-13 — header adicionado em vercel.json.
PROBLEMA (histórico): Sem header Strict-Transport-Security explícito (headers atuais já incluem X-Content-Type-Options,
X-Frame-Options, Permissions-Policy e um CSP bem restrito — boa base).
IMPACTO: Baixo — a Vercel já força HTTPS por padrão — mas declarar HSTS explicitamente é boa prática.
CORREÇÃO: Adicionar `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`.
```

---

## 6. PROBLEMAS DE BAIXA SEVERIDADE

```
ID: L1 | Projeções SELECT * amplas em db/queries.js (protegido por RLS, só excesso de dado em trânsito).
ID: L2 | RPCs públicas (criar_agendamento_publico, registrar_venda_publica) sem rate limiting — risco de
        spam/DoS em dados de catálogo (preço/estoque continuam protegidos).
ID: L3 | Seed (0004) usa UUIDs fixos de baixa entropia, sem marcador is_demo — risco cosmético se rodado em prod.
ID: L4 | Guardas de nulo ausentes no frontend: cli.telefone.replace sem fallback (linha 2866); selPro pode ficar
        undefined se profissionais vazio (linha 3091) — podem quebrar o render de um card isolado.
ID: L5 | 0005_menu_real_promocoes.sql casa itens antigos por nome literal, não por ID — frágil a reexecução
        após customização manual do catálogo.
ID: L6 | Interação morta entre ON DELETE SET NULL (0001, pacote_utilizado_id) e o trigger anti-alteração
        financeira (0006) — funcionaria mal se uma feature futura de "excluir pacote" for implementada.
ID: L7 | criarAgendamentoGestao (db/queries.js 259-294) não é transacional como a RPC pública equivalente —
        pode deixar uma cliente órfã sem agendamento se a segunda escrita falhar (impacto baixo, fácil limpeza).
```

---

## 7. Segurança — resultado da auditoria

**Confirmado sólido:**
- Senhas nunca manipuladas/armazenadas pela aplicação — 100% delegado ao Supabase Auth (hash interno do GoTrue).
- Anti-enumeração de usuários: senha errada e e-mail inexistente retornam a mesma mensagem genérica (testado).
- Nenhum detalhe técnico (status HTTP, stack trace) vaza ao usuário — filtrado e testado em `mensagemAmigavelDeErroDeLogin`.
- Timeout de 15s evita loading infinito; duplo submit do login é bloqueado e testado.
- RPCs públicas usam `SECURITY DEFINER` + `SET search_path = public` corretamente (evita hijacking de search_path).
- Trigger de integridade financeira bloqueia alteração pós-criação de valores de agendamento, independente de autenticação.
- RLS habilitada com políticas explícitas em todas as 12 tabelas — nenhuma tabela com RLS ligada e zero policies.
- Nenhum `dangerouslySetInnerHTML`, `innerHTML`, `eval()` ou `new Function()` — sem vetor de XSS clássico.
- Nenhum segredo real (service_role key, senha de banco, JWT secret) encontrado em código-fonte próprio; `db/config.js`
  corretamente gitignored e nunca commitado em todo o histórico.
- Zero `console.log`/`console.error` no código da aplicação (sem vazamento de dado sensível em log de navegador).
- IDOR clássico não encontrado — o modelo de negócio é de acesso compartilhado entre toda a equipe (by design), gate
  é feito por `is_staff()`, não por posse de linha.

**Não sólido (ver críticos e altos acima):** C1, C2, C3, C4, A5, A6.

## 8. QA — resultado dos testes manuais/exploratórios (via agentes de auditoria)

Ver seções de Frontend (A2-A5, M7) e o checklist manual do go-live (seção 12 abaixo). Nenhum teste em navegador
real (Playwright/Cypress) existe no repositório — toda validação de UI hoje é manual (checklist do db/README.md)
ou via Testing Library (jsdom), que não substitui teste real de navegador/mobile.

## 9. Backend (Supabase RPCs + camada de dados)

RPCs (`criar_agendamento_publico`, `registrar_venda_publica`) e triggers estão bem implementados: cálculo de
preço/comissão sempre no servidor, `FOR UPDATE` para evitar condição de corrida em estoque/sessões de pacote,
sem estoque negativo. Ponto fraco: falta de paginação em listagens (A1) e falta de rate limiting nas RPCs
públicas (L2).

## 10. Banco de dados

Ver inventário completo e achados C2, C4, A1, M8, M9, L1, L3, L5, L6, L7. Nenhuma operação destrutiva
(`DROP`, `TRUNCATE`, `DELETE`/`UPDATE` sem `WHERE`) encontrada em nenhuma das 8 migrations — todas idempotentes
e usam padrões seguros (`if not exists`, `on conflict do nothing`, `create or replace function`).

## 11. Infraestrutura

Vercel + Supabase (BaaS), sem Docker, sem servidor próprio. CSP e headers de segurança já bem configurados em
`vercel.json` (nosniff, X-Frame-Options DENY, Permissions-Policy restritiva, CSP com script-src 'self'). Falta
apenas HSTS explícito (M10). Deploy é manual e não verificado por CI (M1).

## 12. Performance

Sem gargalos identificados no código atual, mas A1 (falta de paginação) é uma bomba-relógio de performance E
correção de dados assim que o volume de agendamentos/vendas crescer. Bundle de ~470KB minificado é razoável
para o escopo do app.

## 13. Backup

**CRÍTICO/NÃO VERIFICADO** — nenhuma documentação de backup encontrada no repositório (M4). Precisa confirmação
manual direta no dashboard do Supabase antes do go-live.

## 14. Rollback

Parcialmente coberto pelo histórico de deployments da Vercel; sem runbook formal, sem tags de release (M5).

## 15. Dependências

5 vulnerabilidades via `npm audit` (1 crítica, 1 alta, 3 moderadas), todas em devDependencies de build/teste
(vitest/vite/esbuild) — não afetam o bundle de produção, mas devem ser corrigidas com um upgrade planejado (M6).
Dependências de runtime (react, react-dom, @supabase/supabase-js, lucide-react) sem vulnerabilidades conhecidas.

## 16. Testes automatizados

`npx vitest run` → **2 arquivos, 27 testes, 27 passando, 0 falhas.** Cobrem bem o fluxo de login (sessão ausente,
credenciais válidas/inválidas, timeout, erro 5xx, duplo submit, expiração de sessão, mostrar/ocultar senha).
Não cobrem: rate limiting, recuperação de senha (não existe), conta desativada, nenhum fluxo de agendamento/
pagamento/estoque/comissão (M2).

---

## 17. Checklist de regressão (fluxos de negócio)

```
[x] Login/Logout — testado automaticamente (27 testes), mas só existe no working tree não publicado (C1/C3)
[ ] Cliente — cadastro/edição sem teste automatizado
[ ] Agenda/Agendamento — conflito de horário tem bug real de sobreposição (A4); sem proteção duplo-submit (A2)
[ ] Atendimento (marcar concluído / baixar comissão) — sem trava de múltiplos cliques (M7)
[ ] Pagamento/Checkout da Loja — sem proteção duplo-submit (A2), sem validação de nome/telefone (A3)
[ ] Comissão/Repasse — cálculo correto no servidor (confirmado), mas listagem sujeita a truncamento (A1)
[ ] Relatórios (DRE) — depende de listagens sem paginação (A1) — risco de números errados em escala
[ ] Administração (Gestão) — HOJE SEM CONTROLE DE ACESSO NENHUM EM PRODUÇÃO (C1, C2)
```

## 18. Recomendação final

O trabalho técnico de correção do maior risco do sistema (autenticação real via Supabase Auth, RLS restritiva,
travas de integridade financeira) **já foi feito e está bem implementado e testado**. O problema não é a
qualidade do código novo — é que ele não está em produção, e o estado atualmente publicado é o mais aberto
possível: painel de Gestão sem login e banco de dados com leitura/escrita públicas via API.

**Antes de qualquer anúncio de go-live ou uso com dados reais de clientes:**
1. Aplicar `0006` e `0008` no projeto Supabase real e confirmar com a query de verificação de `is_staff()`.
2. Criar o primeiro usuário de staff e vinculá-lo em `funcionarios`; confirmar login ponta a ponta.
3. Auditar manualmente todas as linhas de `funcionarios` (risco C4) antes e depois de aplicar `0008`.
4. Commitar as mudanças, rodar `npm run build`, publicar `docs/`.
5. Girar a anon key do Supabase.
6. Confirmar plano de backup do Supabase (M4).
7. Só então tratar os itens ALTOS (A1-A6) como próxima prioridade antes de escalar o uso.

---

## GO-LIVE GATE

```
[ ] QA APROVADO           — pendente (sem testes de agenda/pagamento/estoque; bug de sobreposição A4)
[ ] BACKEND APROVADO      — pendente (paginação ausente, A1)
[ ] DATABASE APROVADO     — pendente (C2, C4 — is_staff() e funcionarios precisam verificação no banco real)
[ ] SECURITY APROVADO     — REPROVADO (C1, C2, C3, C4)
[ ] FRONTEND APROVADO     — pendente (A2, A3, A4, A5)
[ ] INFRA APROVADA        — parcial (headers OK, deploy manual sem CI, M1)
[ ] BACKUP VALIDADO       — não verificado (M4)
[ ] ROLLBACK VALIDADO     — não verificado (M5)
[ ] PERFORMANCE VALIDADA  — pendente (A1)
[ ] PRODUÇÃO VALIDADA     — REPROVADO — estado publicado hoje é o mais aberto possível do sistema
```

# 🔴 NO-GO

Não recomendar produção com dados reais de clientes até que os 4 itens críticos sejam resolvidos **no ambiente
real** (Supabase + deploy publicado), não apenas no working tree local, e verificados com as queries de
confirmação descritas em cada item.
