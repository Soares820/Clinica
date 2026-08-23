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

## 3. Aviso de segurança (leia antes de usar com dados reais)

A área de Gestão ainda usa uma credencial fixa no front-end
(`admin`/`1234`, ver `Login` em `clinica-sistema.jsx`), não Supabase
Auth. Por isso, a função `is_staff()` (em `0003_rls_policies.sql`) hoje
**sempre retorna `true`** — ou seja, qualquer pessoa com a `anon key` do
projeto consegue ler/escrever dados de Gestão (clientes, despesas,
comissões, agendamentos completos), não só o catálogo público.

Isso foi uma decisão consciente para não travar o app enquanto a
autenticação real não existe. Antes de colocar dados reais de clientes
em produção, troque a Gestão para Supabase Auth e atualize `is_staff()`
— o comentário no topo de `0003_rls_policies.sql` mostra exatamente a
troca (nenhuma policy precisa mudar, só o corpo dessa função).

## 4. Checklist manual de teste

Depois de aplicar as migrations e configurar `db/config.js`:

1. **Sem duplicar cliente**: agende duas vezes pela Área da Cliente
   usando o mesmo telefone — as duas devem aparecer no histórico da
   *mesma* cliente na Gestão (aba Clientes), não de duas clientes
   diferentes.
2. **Conflito de horário**: tente agendar o mesmo profissional na
   mesma data/horário duas vezes (uma pela Área da Cliente, outra pela
   Gestão) — a segunda deve ser recusada com uma mensagem de erro.
3. **Loja**: compre um produto na aba Loja — o estoque deve diminuir
   (recarregue a página para confirmar que persistiu), e o valor deve
   aparecer somado na Receita de Produtos do DRE (antes disso era um
   número fixo, sem relação com compras reais).
4. **Persistência**: marque uma comissão como paga ou liquide um
   repasse na Gestão, recarregue a página — o estado deve continuar lá
   (antes, tudo se perdia no reload porque era só memória).
5. **Estoque insuficiente**: tente comprar mais unidades de um produto
   do que o estoque disponível — a compra deve ser recusada.
