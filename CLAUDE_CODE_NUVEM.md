# Usando Claude Code na nuvem neste projeto

Guia para pedir ajustes neste repositório (`Soares820/Clinica`) direto
do celular, sem precisar do PC ligado — usando **Claude Code na nuvem**
(diferente do app comum do Claude, que não tem acesso a este projeto).

## Pré-requisito

Conta claude.ai no plano **Pro, Max ou Team**. No plano Free essa
função não aparece.

## 1. Entrar e conectar o GitHub

1. Abra **claude.ai/code** (navegador do celular ou computador).
2. Entre com sua conta claude.ai normal.
3. Clique em **"Sign in with GitHub"**.
4. Como o repositório é privado, instale o **Claude GitHub App**
   quando for solicitado, e dê acesso especificamente ao repositório
   `Soares820/Clinica` (não precisa dar acesso a todos os seus
   repositórios).

## 2. Configurar a credencial do Supabase (uma vez só)

O arquivo `db/config.js` (URL + chave do Supabase) nunca vai pro
GitHub por segurança — então uma sessão na nuvem, ao clonar o
repositório, não tem essa credencial por padrão. O projeto já está
preparado pra isso: `npm run build` roda `scripts/gerar-config.js`
antes, que gera `db/config.js` sozinho a partir de variáveis de
ambiente, se o arquivo ainda não existir.

Na tela de configuração do ambiente (ao escolher o repositório em
claude.ai/code), adicione duas **Environment variables**:

| Nome | Valor |
|---|---|
| `SUPABASE_URL` | a URL do seu projeto (ex: `https://lncbnaofavtqhapgfaen.supabase.co`) |
| `SUPABASE_ANON_KEY` | a anon key do projeto |

Essas duas informações estão no seu `db/config.js` local, ou no painel
do Supabase em **Project Settings → API**. Configure uma vez — o
ambiente guarda pras próximas sessões.

## 3. Pedir uma tarefa

1. Escolha o repositório **Clinica** na lista.
2. Descreva o que você precisa (ex: "mudar a cor do botão de
   confirmar agendamento", "o campo de telefone não valida o
   formato").
3. Acompanhe o progresso — o Claude clona, ajusta, roda os testes
   (`npm test`) e o build (`npm run build`), e te mostra o que mudou
   antes de publicar.
4. Aprove (ou peça ajustes) antes de ele dar `git push`.

## O que NÃO muda: banco de dados

Uma sessão na nuvem edita **código** (o que vira `docs/bundle.js` e as
migrations em `supabase/migrations/`). Ela **não aplica migrations no
Supabase real** sozinha — isso continua sendo um passo manual seu no
SQL Editor do Supabase (mesmo processo que já usamos pra 0006-0010).
Se uma tarefa envolver uma migration nova, o Claude vai te avisar que
precisa aplicá-la manualmente, do mesmo jeito que fizemos até agora.

## Resumo rápido pra usar de novo

1. claude.ai/code → repositório Clinica.
2. Descreve o pedido.
3. Revisa o diff, aprova.
4. Se a tarefa mexeu no banco, aplica a migration nova no SQL Editor
   do Supabase antes de considerar concluído.
