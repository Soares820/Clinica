-- ─────────────────────────────────────────────────────────────
-- Studio Aura — 0004: seed
-- ─────────────────────────────────────────────────────────────
-- Porta fielmente os dados MOCK_* de clinica-sistema.jsx para o
-- banco, com UUIDs fixos mapeados 1:1 dos ids antigos ('pro-1' etc,
-- em comentário ao lado de cada linha) para preservar todos os
-- relacionamentos. Idempotente (ON CONFLICT DO NOTHING): rodar de
-- novo não duplica nem apaga nada.
--
-- Os agendamentos são inseridos com os TRIGGERS de cálculo/dedução de
-- 0002_functions.sql temporariamente desligados: os valores aqui já
-- são o snapshot final conhecido (valor_cobrado, comissao_calculada,
-- sessao_numero, e o sessoes_usadas já refletido nos pacotes) — deixar
-- os triggers ligados re-deduziria sessão e recalcularia em cima de
-- dados que já representam o resultado dessas regras.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- profissionais
-- ─────────────────────────────────────────────────────────────
insert into profissionais (id, nome, cargo, comissao_percentual, cor_identificacao, ativo) values
  ('a0000000-0000-0000-0000-000000000001', 'Marina Duarte', 'Massoterapeuta & Terapeuta Corporal', 50, '#8A9A7B', true), -- pro-1
  ('a0000000-0000-0000-0000-000000000002', 'Rafael Viana', 'Lash Designer & Micropigmentador', 40, '#C88B84', true),    -- pro-2
  ('a0000000-0000-0000-0000-000000000003', 'Camila Siqueira', 'Esteticista Facial & Cosmetóloga', 60, '#C08A4E', true)  -- pro-3
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- servicos
-- ─────────────────────────────────────────────────────────────
insert into servicos (id, nome, duracao_minutos, preco_base, categoria, pro_padrao_id, ativo) values
  ('b0000000-0000-0000-0000-000000000001', 'Massagem Relaxante com Aromaterapia', 60, 140, 'massoterapia', 'a0000000-0000-0000-0000-000000000001', true),        -- srv-1
  ('b0000000-0000-0000-0000-000000000002', 'Massagem Modeladora & Drenagem', 90, 190, 'massoterapia', 'a0000000-0000-0000-0000-000000000001', true),             -- srv-2
  ('b0000000-0000-0000-0000-000000000003', 'Extensão de Cílios Volume Russo', 120, 220, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002', true),    -- srv-3
  ('b0000000-0000-0000-0000-000000000004', 'Lash Lifting & Nutrição de Queratina', 60, 130, 'cilios_sobrancelhas', 'a0000000-0000-0000-0000-000000000002', true),-- srv-4
  ('b0000000-0000-0000-0000-000000000005', 'Limpeza de Pele Profunda com Peeling de Diamante', 75, 180, 'estetica_facial', 'a0000000-0000-0000-0000-000000000003', true), -- srv-5
  ('b0000000-0000-0000-0000-000000000006', 'Revitalização Facial com Ácido Hialurônico', 60, 160, 'estetica_facial', 'a0000000-0000-0000-0000-000000000003', true)        -- srv-6
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- modelos_pacote
-- ─────────────────────────────────────────────────────────────
insert into modelos_pacote (id, nome, servico_id, total_sessoes, preco_total, validade_dias, ativo) values
  ('c0000000-0000-0000-0000-000000000001', 'Plano 5x Massagem Relaxante', 'b0000000-0000-0000-0000-000000000001', 5, 600, 90, true),    -- mod-pac-1
  ('c0000000-0000-0000-0000-000000000002', 'Combo 4x Lash Lifting', 'b0000000-0000-0000-0000-000000000004', 4, 440, 120, true),          -- mod-pac-2
  ('c0000000-0000-0000-0000-000000000003', 'Protocolo 4x Drenagem Linfática', 'b0000000-0000-0000-0000-000000000002', 4, 680, 60, true), -- mod-pac-3
  ('c0000000-0000-0000-0000-000000000004', 'Combo 3x Limpeza de Pele Profunda', 'b0000000-0000-0000-0000-000000000005', 3, 480, 90, true)-- mod-pac-4
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- clientes
-- (historicoAtendimentos/pacotesAtivos do mock não são persistidos:
-- são derivados por query em agendamentos/clientes_pacotes)
-- ─────────────────────────────────────────────────────────────
insert into clientes (id, nome, nascimento, telefone) values
  ('d0000000-0000-0000-0000-000000000001', 'Ana Beatriz Souza', '1994-05-18', '(11) 98765-4321'),      -- cli-1
  ('d0000000-0000-0000-0000-000000000002', 'Júlia Menezes Castro', '1991-11-03', '(11) 99123-8877'),   -- cli-2
  ('d0000000-0000-0000-0000-000000000003', 'Carla Dias Ferreira', '1998-02-14', '(11) 97456-1122'),    -- cli-3
  ('d0000000-0000-0000-0000-000000000004', 'Paula Reis Albuquerque', '1987-09-29', '(11) 98844-5566'), -- cli-4
  ('d0000000-0000-0000-0000-000000000005', 'Fernanda Lima Rocha', '1995-07-12', '(11) 99332-4411')     -- cli-5
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- clientes_pacotes
-- ─────────────────────────────────────────────────────────────
insert into clientes_pacotes (id, cliente_id, servico_id, total_sessoes, sessoes_usadas, valor_pago, data_compra, status) values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 5, 2, 600, '2026-08-01', 'ativo'),    -- cpac-1
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 4, 4, 440, '2026-07-15', 'concluido'),-- cpac-2
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005', 3, 1, 480, '2026-08-10', 'ativo')     -- cpac-3
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- agendamentos
-- ─────────────────────────────────────────────────────────────
alter table agendamentos disable trigger trg_agendamentos_before_insert_calc;
alter table agendamentos disable trigger trg_agendamentos_after_insert_deduzir;

insert into agendamentos (
  id, data, horario, cliente_id, servico_id, profissional_id, status, tipo_pagamento,
  pacote_utilizado_id, sessao_numero, valor_cobrado, comissao_calculada, comissao_paga, data_baixa_comissao
) values
  ('f0000000-0000-0000-0000-000000000001', current_date, '09:00', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'concluido', 'pacote_sessao', 'e0000000-0000-0000-0000-000000000001', 2, 120, 60, false, null), -- age-1
  ('f0000000-0000-0000-0000-000000000002', current_date, '10:30', 'd0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'em_atendimento', 'pago_cartao', null, null, 220, 88, false, null), -- age-2
  ('f0000000-0000-0000-0000-000000000003', current_date, '13:00', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'confirmado', 'pago_pix', null, null, 130, 52, false, null), -- age-3
  ('f0000000-0000-0000-0000-000000000004', current_date, '14:30', 'd0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'confirmado', 'pacote_sessao', 'e0000000-0000-0000-0000-000000000003', 1, 160, 96, false, null), -- age-4
  ('f0000000-0000-0000-0000-000000000005', current_date, '16:00', 'd0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'pendente', 'pendente_pos_atendimento', null, null, 160, 96, false, null), -- age-5
  ('f0000000-0000-0000-0000-000000000006', current_date + 1, '09:30', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'confirmado', 'pago_pix', null, null, 190, 95, false, null), -- age-6
  ('f0000000-0000-0000-0000-000000000007', current_date + 1, '11:00', 'd0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'confirmado', 'pago_cartao', null, null, 220, 88, false, null), -- age-7
  ('f0000000-0000-0000-0000-000000000008', '2026-08-14', '15:00', 'd0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'concluido', 'pacote_sessao', 'e0000000-0000-0000-0000-000000000001', 1, 120, 60, true, '2026-08-16') -- age-8
on conflict (id) do nothing;

alter table agendamentos enable trigger trg_agendamentos_before_insert_calc;
alter table agendamentos enable trigger trg_agendamentos_after_insert_deduzir;

-- ─────────────────────────────────────────────────────────────
-- despesas
-- ─────────────────────────────────────────────────────────────
insert into despesas (id, descricao, categoria, valor, data, comprovante_ref) values
  ('10000000-0000-0000-0000-000000000001', 'Óleos essenciais, toalhas descartáveis e lençóis de maca', 'insumos_materiais', 280.00, '2026-08-18', 'NF-8921-INS'),        -- desp-1
  ('10000000-0000-0000-0000-000000000002', 'Aluguel do espaço comercial + taxa de condomínio', 'aluguel_fixo', 2200.00, '2026-08-05', 'REC-ALUG-0826'),                  -- desp-2
  ('10000000-0000-0000-0000-000000000003', 'Campanha de Tráfego Pago Instagram / Meta Ads', 'marketing', 450.00, '2026-08-12', 'INV-META-4491'),                        -- desp-3
  ('10000000-0000-0000-0000-000000000004', 'Repasse de comissão Quinzena 1 - Marina Duarte', 'comissao', 850.00, '2026-08-16', 'PIX-REP-9011'),                         -- desp-4
  ('10000000-0000-0000-0000-000000000005', 'Software de agendamento & Sistema em Nuvem Studio Aura', 'outros', 129.90, '2026-08-10', 'SUB-AURA-882'),                   -- desp-5
  ('10000000-0000-0000-0000-000000000006', 'Kit adesivos de alta retenção e fios de cílios curvatura D/C', 'insumos_materiais', 195.00, '2026-08-19', 'NF-3310-LASH')   -- desp-6
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- repasses_comissao
-- (periodo "01/08/2026 a 15/08/2026" vira periodo_inicio/periodo_fim)
-- ─────────────────────────────────────────────────────────────
insert into repasses_comissao (id, profissional_id, periodo_inicio, periodo_fim, valor_total, data_pagamento, status) values
  ('20000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '2026-08-01', '2026-08-15', 850.00, '2026-08-16', 'pago'),    -- rep-1
  ('20000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '2026-08-01', '2026-08-15', 620.00, '2026-08-16', 'pago'),    -- rep-2
  ('20000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '2026-08-16', '2026-08-31', 215.00, null, 'pendente'),        -- rep-3
  ('20000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', '2026-08-16', '2026-08-31', 228.00, null, 'pendente'),        -- rep-4
  ('20000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', '2026-08-16', '2026-08-31', 192.00, null, 'pendente')         -- rep-5
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────
-- produtos
-- ─────────────────────────────────────────────────────────────
insert into produtos (id, nome, preco, estoque, categoria) values
  ('30000000-0000-0000-0000-000000000001', 'Óleo de Massagem Lavanda & Alecrim', 68, 12, 'Corpo'),               -- produto 1
  ('30000000-0000-0000-0000-000000000002', 'Sérum Fortalecedor & Nutritivo de Cílios', 95, 8, 'Cílios'),         -- produto 2
  ('30000000-0000-0000-0000-000000000003', 'Kit Home Care Escova + Espuma Micelar', 54, 20, 'Home Care'),        -- produto 3
  ('30000000-0000-0000-0000-000000000004', 'Vela Aromática Calmante Baunilha & Bergamota', 42, 15, 'Aromaterapia'), -- produto 4
  ('30000000-0000-0000-0000-000000000005', 'Sérum Facial Antioxidante Vitamina C 15%', 110, 6, 'Facial')         -- produto 5
on conflict (id) do nothing;
