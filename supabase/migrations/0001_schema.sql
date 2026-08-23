-- ─────────────────────────────────────────────────────────────
-- Studio Aura — 0001: schema (tabelas, relacionamentos, índices)
-- ─────────────────────────────────────────────────────────────
-- Idempotente: seguro rodar mais de uma vez (create if not exists /
-- drop+create trigger). Não apaga nem altera dados existentes.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- profissionais
-- ─────────────────────────────────────────────────────────────
create table if not exists profissionais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cargo text,
  comissao_percentual numeric(5,2) not null default 50 check (comissao_percentual between 0 and 100),
  cor_identificacao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profissionais_updated_at on profissionais;
create trigger trg_profissionais_updated_at
  before update on profissionais
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- servicos
-- ─────────────────────────────────────────────────────────────
create table if not exists servicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  duracao_minutos integer not null check (duracao_minutos > 0),
  preco_base numeric(10,2) not null check (preco_base >= 0),
  categoria text not null check (categoria in ('massoterapia','cilios_sobrancelhas','estetica_facial','corporal')),
  pro_padrao_id uuid references profissionais(id) on delete set null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_servicos_updated_at on servicos;
create trigger trg_servicos_updated_at
  before update on servicos
  for each row execute function set_updated_at();

create index if not exists idx_servicos_pro_padrao on servicos(pro_padrao_id);

-- ─────────────────────────────────────────────────────────────
-- modelos_pacote
-- ─────────────────────────────────────────────────────────────
create table if not exists modelos_pacote (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  servico_id uuid not null references servicos(id) on delete restrict,
  total_sessoes integer not null check (total_sessoes > 0),
  preco_total numeric(10,2) not null check (preco_total >= 0),
  validade_dias integer not null check (validade_dias > 0),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_modelos_pacote_updated_at on modelos_pacote;
create trigger trg_modelos_pacote_updated_at
  before update on modelos_pacote
  for each row execute function set_updated_at();

create index if not exists idx_modelos_pacote_servico on modelos_pacote(servico_id);

-- ─────────────────────────────────────────────────────────────
-- clientes
-- ─────────────────────────────────────────────────────────────
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  nascimento date,
  telefone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_clientes_updated_at on clientes;
create trigger trg_clientes_updated_at
  before update on clientes
  for each row execute function set_updated_at();

-- Não é UNIQUE: telefone pode ser compartilhado (ex: família). A
-- deduplicação de cliente no autoagendamento é feita pela RPC
-- criar_agendamento_publico, que busca por este índice antes de criar.
create index if not exists idx_clientes_telefone on clientes(telefone);

-- ─────────────────────────────────────────────────────────────
-- clientes_pacotes (pacotes comprados por uma cliente)
-- ─────────────────────────────────────────────────────────────
create table if not exists clientes_pacotes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  servico_id uuid references servicos(id) on delete set null,
  modelo_pacote_id uuid references modelos_pacote(id) on delete set null,
  total_sessoes integer not null check (total_sessoes > 0),
  sessoes_usadas integer not null default 0 check (sessoes_usadas >= 0),
  valor_pago numeric(10,2) not null check (valor_pago >= 0),
  data_compra date not null default current_date,
  validade date,
  status text not null default 'ativo' check (status in ('ativo','concluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_sessoes_usadas_within_total check (sessoes_usadas <= total_sessoes)
);

drop trigger if exists trg_clientes_pacotes_updated_at on clientes_pacotes;
create trigger trg_clientes_pacotes_updated_at
  before update on clientes_pacotes
  for each row execute function set_updated_at();

create index if not exists idx_clientes_pacotes_cliente on clientes_pacotes(cliente_id);
create index if not exists idx_clientes_pacotes_status on clientes_pacotes(status);

-- ─────────────────────────────────────────────────────────────
-- agendamentos
-- ─────────────────────────────────────────────────────────────
create table if not exists agendamentos (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  horario time not null,
  cliente_id uuid not null references clientes(id) on delete restrict,
  servico_id uuid not null references servicos(id) on delete restrict,
  profissional_id uuid not null references profissionais(id) on delete restrict,
  status text not null default 'pendente' check (status in ('pendente','confirmado','em_atendimento','concluido','cancelado')),
  tipo_pagamento text not null check (tipo_pagamento in ('pendente_pos_atendimento','pago_pix','pago_cartao','pago_dinheiro','pacote_sessao')),
  pacote_utilizado_id uuid references clientes_pacotes(id) on delete set null,
  sessao_numero integer,
  valor_cobrado numeric(10,2) not null default 0 check (valor_cobrado >= 0),
  comissao_calculada numeric(10,2) not null default 0 check (comissao_calculada >= 0),
  comissao_paga boolean not null default false,
  data_baixa_comissao date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_pacote_sessao_requer_pacote
    check (tipo_pagamento <> 'pacote_sessao' or pacote_utilizado_id is not null)
);

drop trigger if exists trg_agendamentos_updated_at on agendamentos;
create trigger trg_agendamentos_updated_at
  before update on agendamentos
  for each row execute function set_updated_at();

create index if not exists idx_agendamentos_data on agendamentos(data);
create index if not exists idx_agendamentos_cliente on agendamentos(cliente_id);
create index if not exists idx_agendamentos_profissional on agendamentos(profissional_id);
create index if not exists idx_agendamentos_status on agendamentos(status);

-- Garantia real (não só em JS, que hoje checa isso em 2 lugares
-- diferentes) de que um profissional não fica com dois agendamentos
-- não cancelados no mesmo dia/horário.
create unique index if not exists uq_agendamentos_sem_conflito
  on agendamentos(profissional_id, data, horario)
  where status <> 'cancelado';

-- ─────────────────────────────────────────────────────────────
-- despesas
-- ─────────────────────────────────────────────────────────────
create table if not exists despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text not null check (categoria in ('insumos_materiais','aluguel_fixo','comissao','marketing','outros')),
  valor numeric(10,2) not null check (valor >= 0),
  data date not null default current_date,
  comprovante_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_despesas_updated_at on despesas;
create trigger trg_despesas_updated_at
  before update on despesas
  for each row execute function set_updated_at();

create index if not exists idx_despesas_data on despesas(data);
create index if not exists idx_despesas_categoria on despesas(categoria);

-- ─────────────────────────────────────────────────────────────
-- repasses_comissao
-- ─────────────────────────────────────────────────────────────
create table if not exists repasses_comissao (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais(id) on delete cascade,
  periodo_inicio date not null,
  periodo_fim date not null,
  valor_total numeric(10,2) not null check (valor_total >= 0),
  data_pagamento date,
  status text not null default 'pendente' check (status in ('pendente','pago')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_periodo_valido check (periodo_fim >= periodo_inicio)
);

drop trigger if exists trg_repasses_comissao_updated_at on repasses_comissao;
create trigger trg_repasses_comissao_updated_at
  before update on repasses_comissao
  for each row execute function set_updated_at();

create index if not exists idx_repasses_profissional on repasses_comissao(profissional_id);
create index if not exists idx_repasses_status on repasses_comissao(status);

-- ─────────────────────────────────────────────────────────────
-- produtos
-- ─────────────────────────────────────────────────────────────
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric(10,2) not null check (preco >= 0),
  estoque integer not null default 0 check (estoque >= 0),
  categoria text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_produtos_updated_at on produtos;
create trigger trg_produtos_updated_at
  before update on produtos
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- vendas / venda_itens
-- Hoje a loja (carrinho em ClienteView) não persiste nada: não
-- decrementa estoque, não registra a venda, e o DRE usa um array
-- hardcoded de produtos vendidos. Estas tabelas corrigem isso.
-- ─────────────────────────────────────────────────────────────
create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  data timestamptz not null default now(),
  forma_pagamento text,
  valor_total numeric(10,2) not null default 0 check (valor_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_vendas_cliente on vendas(cliente_id);
create index if not exists idx_vendas_data on vendas(data);

create table if not exists venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  -- Preço "congelado" no momento da venda: se o preço do produto mudar
  -- depois, o histórico de vendas/DRE não é reescrito retroativamente.
  preco_unitario numeric(10,2) not null check (preco_unitario >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_venda_itens_venda on venda_itens(venda_id);
create index if not exists idx_venda_itens_produto on venda_itens(produto_id);
