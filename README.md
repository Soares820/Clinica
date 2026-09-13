# Studio Aura

Sistema de agendamento e gestão para o estúdio de beleza e bem-estar Studio Aura.

## Funcionalidades

- **Área da cliente**: escolha de serviço e agendamento por data e horário (pagamento é feito pessoalmente na clínica).
- **Gestão**: acesso restrito por login, painel do dia (agenda, caixa, estoque baixo), criação manual de agendamentos e registro de recebimentos.

Layout responsivo, adaptado para uso em celular.

## Rodando localmente

```bash
npm install
npm run build   # gera docs/bundle.js
```

Depois abra `docs/index.html` num servidor estático local (por exemplo `npx serve docs`).

## Estrutura

- `clinica-sistema.jsx` — componente principal (React).
- `entry.jsx` — ponto de entrada que monta o app.
- `docs/` — build estático publicado no GitHub Pages.

## Aviso

O login da área de Gestão usa Supabase Auth de verdade (`db/auth.js`, `supabase.auth.signInWithPassword`) — não é mais credencial fixa no front-end. A proteção real dos dados é feita pelas RLS policies do banco (`is_staff()`, ver `supabase/migrations/`), não pela tela.

Antes de publicar isto em produção com dados reais de clientes, siga o checklist de `db/README.md` (seção 3) e o `GO_LIVE_AUDIT_REPORT.md` na raiz do repositório — a correção só tem efeito depois que as migrations forem aplicadas no projeto Supabase real e o primeiro usuário de staff for criado; até lá, ter os arquivos no repositório não protege nada.
