# Studio Aura

Sistema de agendamento, loja e gestão para o estúdio de beleza e bem-estar Studio Aura.

## Funcionalidades

- **Área da cliente**: escolha de serviço, pagamento (Pix/Cartão) e agendamento por data e horário; loja de produtos com carrinho.
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

O login da área de Gestão usa uma credencial fixa no front-end (não há back-end/autenticação real). Antes de usar em produção com dados reais, substitua por um serviço de autenticação de verdade.
