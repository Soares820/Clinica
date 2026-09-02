-- ─────────────────────────────────────────────────────────────
-- Pharus — 0005: menu real, novas categorias e promoções
-- ─────────────────────────────────────────────────────────────
-- Idempotente: seguro rodar mais de uma vez.
--
-- 1) Duas categorias novas (depilacao, pacotes_spa) para cobrir o menu
--    real enviado pela cliente — não cabiam bem nas 4 categorias
--    originais (massoterapia/cilios_sobrancelhas/estetica_facial/corporal).
-- 2) em_promocao/preco_promocional em servicos, usados pela "Promoção
--    da Semana" na Área da Cliente e respeitados de verdade no valor
--    cobrado do agendamento (não é só cosmético).
-- 3) Desativa os 6 serviços fictícios de demonstração (o menu antigo,
--    inventado antes de termos o menu real) e insere os ~40 itens reais
--    do menu Pharus. Preços vêm do menu enviado; DURAÇÃO e o
--    profissional padrão de cada item são estimativas — ajuste em
--    Gestão → Serviços conforme necessário.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 1. Categorias novas
-- ─────────────────────────────────────────────────────────────
alter table servicos drop constraint if exists servicos_categoria_check;
alter table servicos add constraint servicos_categoria_check
  check (categoria in ('massoterapia','cilios_sobrancelhas','estetica_facial','corporal','depilacao','pacotes_spa'));

-- ─────────────────────────────────────────────────────────────
-- 2. Promoções
-- ─────────────────────────────────────────────────────────────
alter table servicos add column if not exists em_promocao boolean not null default false;
alter table servicos add column if not exists preco_promocional numeric(10,2);

alter table servicos drop constraint if exists chk_servicos_preco_promocional;
alter table servicos add constraint chk_servicos_preco_promocional
  check (preco_promocional is null or preco_promocional < preco_base);

-- valor_cobrado do agendamento passa a usar o preço promocional quando
-- o serviço está em promoção (mesma lógica de 0002_functions.sql, só
-- adicionando o branch de promoção antes de decidir o preço).
create or replace function agendamentos_calcular_valores()
returns trigger
language plpgsql
as $$
declare
  v_servico servicos%rowtype;
  v_profissional profissionais%rowtype;
  v_pacote clientes_pacotes%rowtype;
  v_preco numeric(10,2);
begin
  select * into v_servico from servicos where id = new.servico_id;
  if not found then
    raise exception 'Serviço % não encontrado', new.servico_id;
  end if;

  select * into v_profissional from profissionais where id = new.profissional_id;
  if not found then
    raise exception 'Profissional % não encontrado', new.profissional_id;
  end if;

  if v_servico.em_promocao and v_servico.preco_promocional is not null then
    v_preco := v_servico.preco_promocional;
  else
    v_preco := v_servico.preco_base;
  end if;

  if new.tipo_pagamento = 'pacote_sessao' then
    if new.pacote_utilizado_id is null then
      raise exception 'pacote_utilizado_id é obrigatório quando tipo_pagamento = pacote_sessao';
    end if;

    select * into v_pacote from clientes_pacotes where id = new.pacote_utilizado_id for update;
    if not found then
      raise exception 'Pacote % não encontrado', new.pacote_utilizado_id;
    end if;
    if v_pacote.status <> 'ativo' or v_pacote.sessoes_usadas >= v_pacote.total_sessoes then
      raise exception 'Pacote % não tem sessões disponíveis', new.pacote_utilizado_id;
    end if;

    new.valor_cobrado := round(v_pacote.valor_pago / v_pacote.total_sessoes, 2);
    new.sessao_numero := v_pacote.sessoes_usadas + 1;
  else
    new.valor_cobrado := v_preco;
    new.sessao_numero := null;
  end if;

  new.comissao_calculada := calcular_comissao(new.valor_cobrado, v_profissional.comissao_percentual);

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. Desativa o menu fictício de demonstração
-- ─────────────────────────────────────────────────────────────
update servicos set ativo = false where nome in (
  'Massagem Relaxante com Aromaterapia',
  'Massagem Modeladora & Drenagem',
  'Extensão de Cílios Volume Russo',
  'Lash Lifting & Nutrição de Queratina',
  'Limpeza de Pele Profunda com Peeling de Diamante',
  'Revitalização Facial com Ácido Hialurônico'
);

-- ─────────────────────────────────────────────────────────────
-- 4. Menu real Pharus (idempotente: só insere o que ainda não existe
--    por nome)
-- ─────────────────────────────────────────────────────────────
insert into servicos (nome, duracao_minutos, preco_base, categoria, pro_padrao_id, ativo)
select v.nome, v.duracao_minutos, v.preco_base, v.categoria, v.pro_padrao_id, true
from (values
  -- Massagens & Recuperação Muscular (Marina Duarte)
  ('Massagem Relaxante', 60, 169.00, 'massoterapia', 'a0000000-0000-0000-0000-000000000001'::uuid),
  ('Massagem com Aromaterapia', 60, 200.00, 'massoterapia', 'a0000000-0000-0000-0000-000000000001'::uuid),
  ('Massagem Terapêutica', 60, 179.00, 'massoterapia', 'a0000000-0000-0000-0000-000000000001'::uuid),
  ('Massagem com Pedras Quentes', 75, 200.00, 'massoterapia', 'a0000000-0000-0000-0000-000000000001'::uuid),
  ('Drenagem Linfática', 60, 149.00, 'massoterapia', 'a0000000-0000-0000-0000-000000000001'::uuid),
  ('Massagem Dreno-Modeladora', 60, 149.00, 'massoterapia', 'a0000000-0000-0000-0000-000000000001'::uuid),
  ('Liberação Miofascial', 50, 149.00, 'massoterapia', 'a0000000-0000-0000-0000-000000000001'::uuid),
  ('Ventosaterapia', 40, 100.00, 'massoterapia', 'a0000000-0000-0000-0000-000000000001'::uuid),
  -- Facial (Camila Siqueira)
  ('Limpeza de Pele Tradicional', 60, 149.00, 'estetica_facial', 'a0000000-0000-0000-0000-000000000003'::uuid),
  ('Limpeza de Pele Coreana', 75, 179.00, 'estetica_facial', 'a0000000-0000-0000-0000-000000000003'::uuid),
  ('Esfoliação e Hidratação Facial', 45, 129.00, 'estetica_facial', 'a0000000-0000-0000-0000-000000000003'::uuid),
  ('Massagem Facial', 30, 100.00, 'estetica_facial', 'a0000000-0000-0000-0000-000000000003'::uuid),
  -- Lash Designer (Rafael Viana)
  ('Lash Fio a Fio (Colocação)', 120, 185.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Lash Volume Brasileiro (Colocação)', 130, 195.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Lash Volume Egípcio (Colocação)', 140, 210.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Lash Efeito Fox Eyes (Colocação)', 140, 220.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Lash Fio a Fio (Manutenção)', 60, 145.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Lash Volume Brasileiro (Manutenção)', 70, 155.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Lash Volume Egípcio (Manutenção)', 80, 170.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Lash Efeito Fox Eyes (Manutenção)', 80, 180.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Remoção de Cílios', 20, 40.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Lash Lifting', 60, 180.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  ('Brow Lamination', 45, 180.00, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002'::uuid),
  -- Depilação (sem profissional padrão fixo)
  ('Virilha Completa', 30, 80.00, 'depilacao', null),
  ('Perna Completa (Roll-on)', 45, 90.00, 'depilacao', null),
  ('Meia Perna (Roll-on)', 30, 50.00, 'depilacao', null),
  ('Axilas', 15, 35.00, 'depilacao', null),
  ('Buço com Cera Quente', 10, 30.00, 'depilacao', null),
  ('Buço Fio a Fio', 10, 45.00, 'depilacao', null),
  ('Rosto Completo Fio a Fio', 30, 120.00, 'depilacao', null),
  ('Design de Sobrancelha (Feminino)', 20, 60.00, 'depilacao', null),
  ('Design de Sobrancelha (Masculino)', 20, 65.00, 'depilacao', null),
  ('Orelhas', 10, 35.00, 'depilacao', null),
  ('Nariz', 10, 35.00, 'depilacao', null),
  -- Pacotes & Experiências (sem profissional padrão fixo — combinam serviços)
  ('SPA Relax Pharus', 90, 229.00, 'pacotes_spa', null),
  ('SPA em Dupla', 120, 569.00, 'pacotes_spa', null),
  ('SPA Amigas', 120, 569.00, 'pacotes_spa', null),
  ('Day Glow — Especial Aniversário', 120, 589.00, 'pacotes_spa', null),
  ('SPA Kids', 60, 249.00, 'pacotes_spa', null),
  ('SPA Gestantes', 90, 269.00, 'pacotes_spa', null)
) as v(nome, duracao_minutos, preco_base, categoria, pro_padrao_id)
where not exists (select 1 from servicos s where s.nome = v.nome);
