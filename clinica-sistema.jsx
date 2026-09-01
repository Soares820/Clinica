import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  ShoppingBag,
  Wallet,
  Clock,
  Check,
  Plus,
  Minus,
  X,
  TrendingUp,
  Users,
  Flower2,
  Eye,
  Hand,
  CreditCard,
  QrCode,
  DollarSign,
  Percent,
  Package,
  Sparkles,
  Scissors,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  Receipt,
  UserCheck,
  ChevronRight
} from "lucide-react";
import * as db from "./db/queries.js";

// ─────────────────────────────────────────────────────────────
// 1. MODELOS DE DADOS & TIPAGENS (JSDoc)
// ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Cliente
 * @property {string} id - Identificador único da cliente (ex: 'cli-1')
 * @property {string} nome - Nome completo da cliente
 * @property {string} nascimento - Data de nascimento no formato YYYY-MM-DD
 * @property {string} telefone - Telefone com DDD e WhatsApp formatado
 * @property {string[]} historicoAtendimentos - Lista de IDs dos agendamentos
 * @property {string[]} pacotesAtivos - Lista de IDs dos pacotes ativos contratados
 */

/**
 * @typedef {Object} Profissional
 * @property {string} id - Identificador único do profissional (ex: 'pro-1')
 * @property {string} nome - Nome completo ou social do profissional
 * @property {string} cargo - Especialidade/cargo na clínica
 * @property {number} comissaoPercentual - Percentual de comissão (ex: 60 para 60%, 40 para 40%)
 * @property {string} corIdentificacao - Código de cor HEX para identificação visual na agenda
 * @property {boolean} ativo - Indica se o profissional está ativo para novos agendamentos
 */

/**
 * @typedef {Object} Servico
 * @property {string} id - Identificador único do serviço (ex: 'srv-1')
 * @property {string} nome - Nome do procedimento/serviço
 * @property {number} duracao - Duração do procedimento em minutos
 * @property {number} precoBase - Preço avulso do serviço em R$
 * @property {'massoterapia' | 'cilios_sobrancelhas' | 'estetica_facial' | 'corporal'} categoria - Categoria do serviço
 * @property {string} [proPadraoId] - ID do profissional de referência
 */

/**
 * @typedef {Object} ModeloPacote
 * @property {string} id - Identificador único do modelo de pacote (ex: 'mod-pac-1')
 * @property {string} nome - Nome comercial do pacote
 * @property {string} servicoId - ID do serviço correspondente
 * @property {number} totalSessoes - Número total de sessões do pacote
 * @property {number} precoTotal - Valor total cobrado pelo pacote em R$
 * @property {number} validadeDias - Validade em dias para fruição de todas as sessões
 */

/**
 * @typedef {'pendente' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado'} StatusAgendamento
 * @typedef {'pendente_pos_atendimento' | 'pago_pix' | 'pago_cartao' | 'pago_dinheiro' | 'pacote_sessao'} TipoPagamento
 *
 * @typedef {Object} Agendamento
 * @property {string} id - Identificador único do agendamento (ex: 'age-1')
 * @property {string} data - Data do atendimento no formato YYYY-MM-DD
 * @property {string} horario - Horário de início no formato HH:mm
 * @property {string} clienteId - ID da cliente
 * @property {string} clienteNome - Nome da cliente
 * @property {string} [clienteTelefone] - Telefone/WhatsApp de contato informado no agendamento
 * @property {string} servicoId - ID do serviço
 * @property {string} servicoNome - Nome do serviço agendado
 * @property {string} profissionalId - ID do profissional
 * @property {string} profissionalNome - Nome do profissional
 * @property {StatusAgendamento} status - Status operacional do agendamento
 * @property {TipoPagamento} tipoPagamento - Forma de liquidação financeira
 * @property {string | null} pacoteUtilizadoId - ID do pacote do cliente utilizado (se tipoPagamento === 'pacote_sessao')
 * @property {number | null} sessaoNumero - Número ordinal da sessão no pacote (ex: 1, 2, 3)
 * @property {number} valorCobrado - Valor financeiro apropriado pelo atendimento em R$
 * @property {number} comissaoCalculada - Valor da comissão do profissional calculado para este atendimento em R$
 * @property {boolean} comissaoPaga - Indica se a comissão já foi repassada ao profissional
 * @property {string | null} dataBaixaComissao - Data em que a comissão foi paga (YYYY-MM-DD) ou null
 */

/**
 * @typedef {'ativo' | 'concluido'} StatusPacoteCliente
 *
 * @typedef {Object} ClientePacote
 * @property {string} id - Identificador único do pacote do cliente (ex: 'cpac-1')
 * @property {string} clienteId - ID da cliente titular
 * @property {string} clienteNome - Nome da cliente
 * @property {string} servicoNome - Nome do serviço contratado no pacote
 * @property {string} [servicoId] - ID do serviço contratado
 * @property {number} totalSessoes - Quantidade total de sessões adquiridas
 * @property {number} sessoesUsadas - Quantidade de sessões já consumidas
 * @property {number} valorPago - Valor total pago na aquisição do pacote em R$
 * @property {string} dataCompra - Data da compra do pacote no formato YYYY-MM-DD
 * @property {StatusPacoteCliente} status - 'ativo' se restam sessões ou 'concluido' se finalizado
 */

/**
 * @typedef {'insumos_materiais' | 'aluguel_fixo' | 'comissao' | 'marketing' | 'outros'} CategoriaDespesa
 *
 * @typedef {Object} Despesa
 * @property {string} id - Identificador único da despesa (ex: 'desp-1')
 * @property {string} descricao - Descrição da despesa
 * @property {CategoriaDespesa} categoria - Categoria para apuração gerencial
 * @property {number} valor - Valor da despesa em R$
 * @property {string} data - Data do lançamento no formato YYYY-MM-DD
 * @property {string} comprovanteRef - Referência do comprovante (ex: 'NF-8921', 'COMP-4892')
 */

/**
 * @typedef {'pendente' | 'pago'} StatusRepasse
 *
 * @typedef {Object} RepasseComissao
 * @property {string} id - Identificador único do repasse (ex: 'rep-1')
 * @property {string} profissionalId - ID do profissional
 * @property {string} profissionalNome - Nome do profissional
 * @property {string} periodo - Período de apuração (ex: '01/08/2026 a 15/08/2026')
 * @property {number} valorTotal - Valor total a ser repassado em R$
 * @property {string | null} dataPagamento - Data do pagamento (YYYY-MM-DD) ou null se pendente
 * @property {StatusRepasse} status - Status do repasse
 */

/**
 * @typedef {Object} Produto
 * @property {string | number} id - Identificador do produto
 * @property {string} nome - Nome do produto home care
 * @property {number} preco - Preço de venda unitário
 * @property {number} estoque - Quantidade em estoque
 * @property {string} [categoria] - Categoria do produto
 */

// ─────────────────────────────────────────────────────────────
// 2. DESIGN TOKENS & HELPERS VISUAIS
// ─────────────────────────────────────────────────────────────
const AURORA_STARS = Array.from({ length: 60 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  size: Math.random() * 1.6 + 0.6,
  delay: Math.random() * 6,
  duration: Math.random() * 3 + 2.5,
}));

function AuroraBackdrop() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, zIndex: -1, overflow: "hidden", background: C.bg, pointerEvents: "none" }}
    >
      {/* Luz ambiente vindo "de cima da água" */}
      <div
        className="aurora-field"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.9,
          backgroundImage:
            "radial-gradient(ellipse 90% 55% at 50% -8%, rgba(63,169,138,.35) 0%, transparent 60%), linear-gradient(180deg, rgba(15,61,52,.25) 0%, transparent 35%, rgba(3,10,9,.5) 100%)",
          animation: "auroraFieldPulse 9s ease-in-out infinite",
        }}
      />

      {/* Raio de luz diagonal, tipo sol penetrando a água */}
      <div
        className="ocean-ray"
        style={{
          position: "absolute", top: "-20%", left: "38%", width: 260, height: "150%",
          background: `linear-gradient(180deg, ${C.gold}33 0%, transparent 70%)`,
          transform: "rotate(12deg)", filter: "blur(30px)", transformOrigin: "top center",
          animation: "oceanRaySway 14s ease-in-out infinite",
        }}
      />

      {/* Correntezas — faixas largas de luz se movendo devagar, como água em profundidade */}
      <div
        className="aurora-blob"
        style={{
          position: "absolute", width: "115%", height: 340, left: "-10%", top: "-8%", borderRadius: "50%",
          filter: "blur(70px)", background: C.aubergine, opacity: 0.7,
          animation: "oceanCurrent1 24s ease-in-out infinite",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          position: "absolute", width: "120%", height: 300, left: "-15%", top: "38%", borderRadius: "50%",
          filter: "blur(70px)", background: "#1F6E5C", opacity: 0.5,
          animation: "oceanCurrent2 30s ease-in-out infinite",
        }}
      />
      <div
        className="aurora-blob"
        style={{
          position: "absolute", width: "110%", height: 320, left: "-8%", bottom: "-14%", borderRadius: "50%",
          filter: "blur(70px)", background: C.sage, opacity: 0.4,
          animation: "oceanCurrent1 26s ease-in-out infinite reverse",
        }}
      />

      {/* Bolhas / brilho na água subindo */}
      {AURORA_STARS.map((s, i) => (
        <div
          key={i}
          className="aurora-star"
          style={{
            position: "absolute", left: s.left, top: s.top, width: s.size, height: s.size,
            borderRadius: "50%", background: "#fff",
            animation: `oceanBubble ${s.duration + 4}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

const C = {
  bg: "#081714",
  ink: "#F2F5F3",
  aubergine: "#0F3D34",
  sage: "#3FA98A",
  blush: "#E8A26B",
  gold: "#E0A860",
  card: "#0F2420",
  line: "rgba(255,255,255,.10)",
  muted: "#9DB3AC",
  danger: "#F87171",
  success: "#4ADE80",
};

export const brl = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatDataBR = (isoDate) => {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
};

export function buildDates(n = 7) {
  const wd = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const today = new Date();
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    out.push({
      key: `${d.getFullYear()}-${mm}-${dd}`,
      top: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : wd[d.getDay()],
      num: dd,
      display: `${wd[d.getDay()]}, ${dd}/${mm}`,
    });
  }
  return out;
}
export const DATES = buildDates(7);
export const SLOTS = ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"];

// ─────────────────────────────────────────────────────────────
// 3. CONSTANTES DE MOCK INICIAIS REALISTAS
// ─────────────────────────────────────────────────────────────

export const MOCK_PROFISSIONAIS = [
  {
    id: "pro-1",
    nome: "Marina Duarte",
    cargo: "Massoterapeuta & Terapeuta Corporal",
    comissaoPercentual: 50,
    corIdentificacao: "#8A9A7B", // Sage
    ativo: true,
  },
  {
    id: "pro-2",
    nome: "Rafael Viana",
    cargo: "Lash Designer & Micropigmentador",
    comissaoPercentual: 40,
    corIdentificacao: "#C88B84", // Blush Terracotta
    ativo: true,
  },
  {
    id: "pro-3",
    nome: "Camila Siqueira",
    cargo: "Esteticista Facial & Cosmetóloga",
    comissaoPercentual: 60,
    corIdentificacao: "#C08A4E", // Gold
    ativo: true,
  },
];

export const MOCK_SERVICOS = [
  {
    id: "srv-1",
    nome: "Massagem Relaxante com Aromaterapia",
    duracao: 60,
    precoBase: 140,
    categoria: "massoterapia",
    proPadraoId: "pro-1",
  },
  {
    id: "srv-2",
    nome: "Massagem Modeladora & Drenagem",
    duracao: 90,
    precoBase: 190,
    categoria: "massoterapia",
    proPadraoId: "pro-1",
  },
  {
    id: "srv-3",
    nome: "Extensão de Cílios Volume Russo",
    duracao: 120,
    precoBase: 220,
    categoria: "cilios_sobrancelhas",
    proPadraoId: "pro-2",
  },
  {
    id: "srv-4",
    nome: "Lash Lifting & Nutrição de Queratina",
    duracao: 60,
    precoBase: 130,
    categoria: "cilios_sobrancelhas",
    proPadraoId: "pro-2",
  },
  {
    id: "srv-5",
    nome: "Limpeza de Pele Profunda com Peeling de Diamante",
    duracao: 75,
    precoBase: 180,
    categoria: "estetica_facial",
    proPadraoId: "pro-3",
  },
  {
    id: "srv-6",
    nome: "Revitalização Facial com Ácido Hialurônico",
    duracao: 60,
    precoBase: 160,
    categoria: "estetica_facial",
    proPadraoId: "pro-3",
  },
];

export const MOCK_MODELOS_PACOTE = [
  {
    id: "mod-pac-1",
    nome: "Plano 5x Massagem Relaxante",
    servicoId: "srv-1",
    totalSessoes: 5,
    precoTotal: 600, // R$ 120/sessão (economia de R$ 100)
    validadeDias: 90,
  },
  {
    id: "mod-pac-2",
    nome: "Combo 4x Lash Lifting",
    servicoId: "srv-4",
    totalSessoes: 4,
    precoTotal: 440, // R$ 110/sessão (economia de R$ 80)
    validadeDias: 120,
  },
  {
    id: "mod-pac-3",
    nome: "Protocolo 4x Drenagem Linfática",
    servicoId: "srv-2",
    totalSessoes: 4,
    precoTotal: 680, // R$ 170/sessão (economia de R$ 80)
    validadeDias: 60,
  },
  {
    id: "mod-pac-4",
    nome: "Combo 3x Limpeza de Pele Profunda",
    servicoId: "srv-5",
    totalSessoes: 3,
    precoTotal: 480, // R$ 160/sessão (economia de R$ 60)
    validadeDias: 90,
  },
];

export const MOCK_CLIENTES = [
  {
    id: "cli-1",
    nome: "Ana Beatriz Souza",
    nascimento: "1994-05-18",
    telefone: "(11) 98765-4321",
    historicoAtendimentos: ["age-1", "age-6", "age-8"],
    pacotesAtivos: ["cpac-1"],
  },
  {
    id: "cli-2",
    nome: "Júlia Menezes Castro",
    nascimento: "1991-11-03",
    telefone: "(11) 99123-8877",
    historicoAtendimentos: ["age-2"],
    pacotesAtivos: [],
  },
  {
    id: "cli-3",
    nome: "Carla Dias Ferreira",
    nascimento: "1998-02-14",
    telefone: "(11) 97456-1122",
    historicoAtendimentos: ["age-3", "age-7"],
    pacotesAtivos: [],
  },
  {
    id: "cli-4",
    nome: "Paula Reis Albuquerque",
    nascimento: "1987-09-29",
    telefone: "(11) 98844-5566",
    historicoAtendimentos: ["age-4"],
    pacotesAtivos: ["cpac-3"],
  },
  {
    id: "cli-5",
    nome: "Fernanda Lima Rocha",
    nascimento: "1995-07-12",
    telefone: "(11) 99332-4411",
    historicoAtendimentos: ["age-5"],
    pacotesAtivos: [],
  },
];

export const MOCK_CLIENTES_PACOTES = [
  {
    id: "cpac-1",
    clienteId: "cli-1",
    clienteNome: "Ana Beatriz Souza",
    servicoId: "srv-1",
    servicoNome: "Massagem Relaxante com Aromaterapia",
    totalSessoes: 5,
    sessoesUsadas: 2,
    valorPago: 600,
    dataCompra: "2026-08-01",
    status: "ativo",
  },
  {
    id: "cpac-2",
    clienteId: "cli-2",
    clienteNome: "Júlia Menezes Castro",
    servicoId: "srv-4",
    servicoNome: "Lash Lifting & Nutrição de Queratina",
    totalSessoes: 4,
    sessoesUsadas: 4,
    valorPago: 440,
    dataCompra: "2026-07-15",
    status: "concluido",
  },
  {
    id: "cpac-3",
    clienteId: "cli-4",
    clienteNome: "Paula Reis Albuquerque",
    servicoId: "srv-5",
    servicoNome: "Limpeza de Pele Profunda com Peeling de Diamante",
    totalSessoes: 3,
    sessoesUsadas: 1,
    valorPago: 480,
    dataCompra: "2026-08-10",
    status: "ativo",
  },
];

export const MOCK_AGENDAMENTOS = [
  {
    id: "age-1",
    data: DATES[0].key,
    horario: "09:00",
    clienteId: "cli-1",
    clienteNome: "Ana Beatriz Souza",
    servicoId: "srv-1",
    servicoNome: "Massagem Relaxante com Aromaterapia",
    profissionalId: "pro-1",
    profissionalNome: "Marina Duarte",
    status: "concluido",
    tipoPagamento: "pacote_sessao",
    pacoteUtilizadoId: "cpac-1",
    sessaoNumero: 2,
    valorCobrado: 120, // Proporcional da sessão do pacote (600 / 5)
    comissaoCalculada: 60, // 50% de 120
    comissaoPaga: false,
    dataBaixaComissao: null,
  },
  {
    id: "age-2",
    data: DATES[0].key,
    horario: "10:30",
    clienteId: "cli-2",
    clienteNome: "Júlia Menezes Castro",
    servicoId: "srv-3",
    servicoNome: "Extensão de Cílios Volume Russo",
    profissionalId: "pro-2",
    profissionalNome: "Rafael Viana",
    status: "em_atendimento",
    tipoPagamento: "pago_cartao",
    pacoteUtilizadoId: null,
    sessaoNumero: null,
    valorCobrado: 220,
    comissaoCalculada: 88, // 40% de 220
    comissaoPaga: false,
    dataBaixaComissao: null,
  },
  {
    id: "age-3",
    data: DATES[0].key,
    horario: "13:00",
    clienteId: "cli-3",
    clienteNome: "Carla Dias Ferreira",
    servicoId: "srv-4",
    servicoNome: "Lash Lifting & Nutrição de Queratina",
    profissionalId: "pro-2",
    profissionalNome: "Rafael Viana",
    status: "confirmado",
    tipoPagamento: "pago_pix",
    pacoteUtilizadoId: null,
    sessaoNumero: null,
    valorCobrado: 130,
    comissaoCalculada: 52, // 40% de 130
    comissaoPaga: false,
    dataBaixaComissao: null,
  },
  {
    id: "age-4",
    data: DATES[0].key,
    horario: "14:30",
    clienteId: "cli-4",
    clienteNome: "Paula Reis Albuquerque",
    servicoId: "srv-5",
    servicoNome: "Limpeza de Pele Profunda com Peeling de Diamante",
    profissionalId: "pro-3",
    profissionalNome: "Camila Siqueira",
    status: "confirmado",
    tipoPagamento: "pacote_sessao",
    pacoteUtilizadoId: "cpac-3",
    sessaoNumero: 1,
    valorCobrado: 160, // Proporcional do pacote (480 / 3)
    comissaoCalculada: 96, // 60% de 160
    comissaoPaga: false,
    dataBaixaComissao: null,
  },
  {
    id: "age-5",
    data: DATES[0].key,
    horario: "16:00",
    clienteId: "cli-5",
    clienteNome: "Fernanda Lima Rocha",
    servicoId: "srv-6",
    servicoNome: "Revitalização Facial com Ácido Hialurônico",
    profissionalId: "pro-3",
    profissionalNome: "Camila Siqueira",
    status: "pendente",
    tipoPagamento: "pendente_pos_atendimento",
    pacoteUtilizadoId: null,
    sessaoNumero: null,
    valorCobrado: 160,
    comissaoCalculada: 96, // 60% de 160
    comissaoPaga: false,
    dataBaixaComissao: null,
  },
  {
    id: "age-6",
    data: DATES[1].key,
    horario: "09:30",
    clienteId: "cli-1",
    clienteNome: "Ana Beatriz Souza",
    servicoId: "srv-2",
    servicoNome: "Massagem Modeladora & Drenagem",
    profissionalId: "pro-1",
    profissionalNome: "Marina Duarte",
    status: "confirmado",
    tipoPagamento: "pago_pix",
    pacoteUtilizadoId: null,
    sessaoNumero: null,
    valorCobrado: 190,
    comissaoCalculada: 95, // 50% de 190
    comissaoPaga: false,
    dataBaixaComissao: null,
  },
  {
    id: "age-7",
    data: DATES[1].key,
    horario: "11:00",
    clienteId: "cli-3",
    clienteNome: "Carla Dias Ferreira",
    servicoId: "srv-3",
    servicoNome: "Extensão de Cílios Volume Russo",
    profissionalId: "pro-2",
    profissionalNome: "Rafael Viana",
    status: "confirmado",
    tipoPagamento: "pago_cartao",
    pacoteUtilizadoId: null,
    sessaoNumero: null,
    valorCobrado: 220,
    comissaoCalculada: 88, // 40% de 220
    comissaoPaga: false,
    dataBaixaComissao: null,
  },
  {
    id: "age-8",
    data: "2026-08-14",
    horario: "15:00",
    clienteId: "cli-1",
    clienteNome: "Ana Beatriz Souza",
    servicoId: "srv-1",
    servicoNome: "Massagem Relaxante com Aromaterapia",
    profissionalId: "pro-1",
    profissionalNome: "Marina Duarte",
    status: "concluido",
    tipoPagamento: "pacote_sessao",
    pacoteUtilizadoId: "cpac-1",
    sessaoNumero: 1,
    valorCobrado: 120,
    comissaoCalculada: 60,
    comissaoPaga: true,
    dataBaixaComissao: "2026-08-16",
  },
];

export const MOCK_DESPESAS = [
  {
    id: "desp-1",
    descricao: "Óleos essenciais, toalhas descartáveis e lençóis de maca",
    categoria: "insumos_materiais",
    valor: 280.0,
    data: "2026-08-18",
    comprovanteRef: "NF-8921-INS",
  },
  {
    id: "desp-2",
    descricao: "Aluguel do espaço comercial + taxa de condomínio",
    categoria: "aluguel_fixo",
    valor: 2200.0,
    data: "2026-08-05",
    comprovanteRef: "REC-ALUG-0826",
  },
  {
    id: "desp-3",
    descricao: "Campanha de Tráfego Pago Instagram / Meta Ads",
    categoria: "marketing",
    valor: 450.0,
    data: "2026-08-12",
    comprovanteRef: "INV-META-4491",
  },
  {
    id: "desp-4",
    descricao: "Repasse de comissão Quinzena 1 - Marina Duarte",
    categoria: "comissao",
    valor: 850.0,
    data: "2026-08-16",
    comprovanteRef: "PIX-REP-9011",
  },
  {
    id: "desp-5",
    descricao: "Software de agendamento & Sistema em Nuvem Pharus",
    categoria: "outros",
    valor: 129.9,
    data: "2026-08-10",
    comprovanteRef: "SUB-AURA-882",
  },
  {
    id: "desp-6",
    descricao: "Kit adesivos de alta retenção e fios de cílios curvatura D/C",
    categoria: "insumos_materiais",
    valor: 195.0,
    data: "2026-08-19",
    comprovanteRef: "NF-3310-LASH",
  },
];

export const MOCK_REPASSES_COMISSAO = [
  {
    id: "rep-1",
    profissionalId: "pro-1",
    profissionalNome: "Marina Duarte",
    periodo: "01/08/2026 a 15/08/2026",
    valorTotal: 850.0,
    dataPagamento: "2026-08-16",
    status: "pago",
  },
  {
    id: "rep-2",
    profissionalId: "pro-2",
    profissionalNome: "Rafael Viana",
    periodo: "01/08/2026 a 15/08/2026",
    valorTotal: 620.0,
    dataPagamento: "2026-08-16",
    status: "pago",
  },
  {
    id: "rep-3",
    profissionalId: "pro-1",
    profissionalNome: "Marina Duarte",
    periodo: "16/08/2026 a 31/08/2026",
    valorTotal: 215.0,
    dataPagamento: null,
    status: "pendente",
  },
  {
    id: "rep-4",
    profissionalId: "pro-2",
    profissionalNome: "Rafael Viana",
    periodo: "16/08/2026 a 31/08/2026",
    valorTotal: 228.0,
    dataPagamento: null,
    status: "pendente",
  },
  {
    id: "rep-5",
    profissionalId: "pro-3",
    profissionalNome: "Camila Siqueira",
    periodo: "16/08/2026 a 31/08/2026",
    valorTotal: 192.0,
    dataPagamento: null,
    status: "pendente",
  },
];

export const MOCK_PRODUTOS = [
  { id: 1, nome: "Óleo de Massagem Lavanda & Alecrim", preco: 68, estoque: 12, categoria: "Corpo" },
  { id: 2, nome: "Sérum Fortalecedor & Nutritivo de Cílios", preco: 95, estoque: 8, categoria: "Cílios" },
  { id: 3, nome: "Kit Home Care Escova + Espuma Micelar", preco: 54, estoque: 20, categoria: "Home Care" },
  { id: 4, nome: "Vela Aromática Calmante Baunilha & Bergamota", preco: 42, estoque: 15, categoria: "Aromaterapia" },
  { id: 5, nome: "Sérum Facial Antioxidante Vitamina C 15%", preco: 110, estoque: 6, categoria: "Facial" },
];

// ─────────────────────────────────────────────────────────────
// 4. FUNÇÕES UTILITÁRIAS DE CÁLCULO
// ─────────────────────────────────────────────────────────────

/**
 * Calcula a comissão justa de um atendimento com base no valor cobrado,
 * no percentual do profissional e no eventual rateio de pacote.
 *
 * @param {Object} params
 * @param {number} [params.valorCobrado=0] - Valor do serviço ou sessão
 * @param {number} [params.comissaoPercentual=50] - Percentual da profissional (ex: 50 para 50%)
 * @param {TipoPagamento} [params.tipoPagamento='pago_pix'] - Tipo de pagamento
 * @param {ClientePacote | null} [params.pacoteUtilizado=null] - Pacote utilizado caso aplicável
 * @returns {number} Valor da comissão em R$ arredondado para 2 casas
 */
export function calcularComissaoAtendimento({
  valorCobrado = 0,
  comissaoPercentual = 50,
  tipoPagamento = "pago_pix",
  pacoteUtilizado = null,
}) {
  let baseCalculo = Number(valorCobrado) || 0;

  // Rateio correto de sessão de pacote
  if (tipoPagamento === "pacote_sessao" && pacoteUtilizado && pacoteUtilizado.totalSessoes > 0) {
    baseCalculo = Number(pacoteUtilizado.valorPago) / Number(pacoteUtilizado.totalSessoes);
  }

  const perc = Number(comissaoPercentual) || 0;
  const comissao = baseCalculo * (perc / 100);
  return Math.round(comissao * 100) / 100;
}

/**
 * Calcula o saldo, progresso e valor monetário restante de um pacote adquirido por um cliente.
 *
 * @param {ClientePacote} clientePacote - Pacote do cliente
 * @returns {Object | null} Dados consolidados do saldo do pacote
 */
export function calcularSaldoPacote(clientePacote) {
  if (!clientePacote) return null;
  const totalSessoes = Number(clientePacote.totalSessoes) || 0;
  const sessoesUsadas = Number(clientePacote.sessoesUsadas) || 0;
  const sessoesRestantes = Math.max(0, totalSessoes - sessoesUsadas);
  const valorPago = Number(clientePacote.valorPago) || 0;
  const valorUnitarioSessao = totalSessoes > 0 ? valorPago / totalSessoes : 0;
  const valorConsumido = sessoesUsadas * valorUnitarioSessao;
  const valorRestante = sessoesRestantes * valorUnitarioSessao;
  const percentualConcluido =
    totalSessoes > 0 ? Math.min(100, Math.round((sessoesUsadas / totalSessoes) * 100)) : 0;
  const isDisponivel = sessoesRestantes > 0 && clientePacote.status === "ativo";

  return {
    totalSessoes,
    sessoesUsadas,
    sessoesRestantes,
    percentualConcluido,
    valorPago,
    valorUnitarioSessao: Math.round(valorUnitarioSessao * 100) / 100,
    valorConsumido: Math.round(valorConsumido * 100) / 100,
    valorRestante: Math.round(valorRestante * 100) / 100,
    isDisponivel,
    status: clientePacote.status,
  };
}

/**
 * Abate uma sessão de um pacote ativo, atualizando seu status caso esgote.
 *
 * @param {ClientePacote} clientePacote
 * @returns {ClientePacote} Pacote com sessão deduzida
 */
export function deduzirSessaoPacote(clientePacote) {
  if (!clientePacote) return null;
  const sessoesUsadas = (Number(clientePacote.sessoesUsadas) || 0) + 1;
  const totalSessoes = Number(clientePacote.totalSessoes) || 0;
  const status = sessoesUsadas >= totalSessoes ? "concluido" : "ativo";
  return {
    ...clientePacote,
    sessoesUsadas,
    status,
  };
}

/**
 * Devolve uma sessão a um pacote (ex: quando o agendamento que a consumiu é cancelado),
 * reabrindo o pacote caso ele já estivesse marcado como concluído.
 *
 * @param {ClientePacote} clientePacote
 * @returns {ClientePacote} Pacote com sessão restaurada
 */
export function restaurarSessaoPacote(clientePacote) {
  if (!clientePacote) return null;
  const sessoesUsadas = Math.max(0, (Number(clientePacote.sessoesUsadas) || 0) - 1);
  return {
    ...clientePacote,
    sessoesUsadas,
    status: "ativo",
  };
}

/**
 * Calcula a Demonstração do Resultado do Exercício (DRE) gerencial e fluxo financeiro da clínica.
 *
 * @param {Object} params
 * @param {Agendamento[]} [params.agendamentos=[]]
 * @param {Despesa[]} [params.despesas=[]]
 * @param {RepasseComissao[]} [params.repassesComissao=[]]
 * @param {Array<{ preco?: number, valor?: number, q?: number, quantidade?: number }>} [params.produtosVendidos=[]]
 * @param {ClientePacote[]} [params.clientesPacotes=[]]
 * @param {string | null} [params.dataInicio=null]
 * @param {string | null} [params.dataFim=null]
 * @returns {Object} DRE detalhado com receitas, custos variáveis, margem de contribuição, despesas fixas e lucro líquido
 */
export function calcularDRE({
  agendamentos = [],
  despesas = [],
  repassesComissao = [],
  produtosVendidos = [],
  clientesPacotes = [],
  dataInicio = null,
  dataFim = null,
}) {
  const matchData = (dataStr) => {
    if (!dataStr) return true;
    if (dataInicio && dataStr < dataInicio) return false;
    if (dataFim && dataStr > dataFim) return false;
    return true;
  };

  const agendamentosFiltrados = agendamentos.filter((a) => a.status !== "cancelado" && matchData(a.data));
  const despesasFiltradas = despesas.filter((d) => matchData(d.data));
  const pacotesFiltrados = clientesPacotes.filter((p) => matchData(p.dataCompra));

  // 1. RECEITAS
  // 1.1 Receita de Serviços Avulsos (atendimentos realizados/confirmados com pagamento em dinheiro/pix/cartão)
  const atendimentosAvulsos = agendamentosFiltrados.filter(
    (a) => a.tipoPagamento !== "pacote_sessao" && ["concluido", "confirmado", "em_atendimento"].includes(a.status)
  );
  const receitaServicosAvulsos = atendimentosAvulsos.reduce((s, a) => s + (Number(a.valorCobrado) || 0), 0);

  // 1.2 Receita de Pacotes Realizados (Competência: sessões consumidas)
  const atendimentosPacote = agendamentosFiltrados.filter(
    (a) => a.tipoPagamento === "pacote_sessao" && ["concluido", "confirmado", "em_atendimento"].includes(a.status)
  );
  const receitaPacotesCompetencia = atendimentosPacote.reduce((s, a) => s + (Number(a.valorCobrado) || 0), 0);

  // 1.3 Receita de Novos Pacotes Vendidos no Período (Regime de Caixa)
  const receitaVendaNovosPacotes = pacotesFiltrados.reduce((s, p) => s + (Number(p.valorPago) || 0), 0);

  // 1.4 Receita de Produtos Home Care
  const receitaProdutos = produtosVendidos.reduce(
    (s, p) => s + ((Number(p.preco) || Number(p.price) || Number(p.valor) || 0) * (p.q || p.quantidade || 1)),
    0
  );

  // Total da Receita Bruta (Regime de competência gerencial)
  const receitaBrutaTotal = receitaServicosAvulsos + receitaPacotesCompetencia + receitaProdutos;

  // Total de Entradas em Caixa (Regime de Caixa)
  const receitaCaixaTotal = receitaServicosAvulsos + receitaVendaNovosPacotes + receitaProdutos;

  // 2. CUSTOS OPERACIONAIS VARIÁVEIS (CPV / Custos dos Serviços Prestados)
  // 2.1 Comissões apuradas nos atendimentos
  const comissoesApuradas = agendamentosFiltrados
    .filter((a) => ["concluido", "confirmado", "em_atendimento"].includes(a.status))
    .reduce((s, a) => s + (Number(a.comissaoCalculada) || 0), 0);

  // 2.2 Insumos e Materiais de Procedimento
  const custosInsumos = despesasFiltradas
    .filter((d) => d.categoria === "insumos_materiais")
    .reduce((s, d) => s + (Number(d.valor) || 0), 0);

  const totalCustosVariaveis = comissoesApuradas + custosInsumos;

  // 3. MARGEM DE CONTRIBUIÇÃO (LUCRO BRUTO)
  const margemContribuicao = receitaBrutaTotal - totalCustosVariaveis;
  const margemContribuicaoPerc = receitaBrutaTotal > 0 ? (margemContribuicao / receitaBrutaTotal) * 100 : 0;

  // 4. DESPESAS OPERACIONAIS FIXAS
  const despesasAluguelFixo = despesasFiltradas
    .filter((d) => d.categoria === "aluguel_fixo")
    .reduce((s, d) => s + (Number(d.valor) || 0), 0);

  const despesasMarketing = despesasFiltradas
    .filter((d) => d.categoria === "marketing")
    .reduce((s, d) => s + (Number(d.valor) || 0), 0);

  const despesasOutros = despesasFiltradas
    .filter((d) => d.categoria === "outros")
    .reduce((s, d) => s + (Number(d.valor) || 0), 0);

  const totalDespesasFixas = despesasAluguelFixo + despesasMarketing + despesasOutros;

  // 5. RESULTADO LÍQUIDO DO EXERCÍCIO (EBITDA / Lucro Líquido Gerencial)
  const resultadoLiquido = margemContribuicao - totalDespesasFixas;
  const margemLiquidaPerc = receitaBrutaTotal > 0 ? (resultadoLiquido / receitaBrutaTotal) * 100 : 0;

  // 6. FLUXO DE CAIXA REAL (Regime de Caixa)
  const repassesComissaoPagos = repassesComissao
    .filter((r) => r.status === "pago" && matchData(r.dataPagamento))
    .reduce((s, r) => s + (Number(r.valorTotal) || 0), 0);

  const totalSaidasCaixa =
    despesasAluguelFixo + custosInsumos + despesasMarketing + despesasOutros + repassesComissaoPagos;
  const saldoCaixaOperacional = receitaCaixaTotal - totalSaidasCaixa;

  return {
    periodo: {
      dataInicio: dataInicio || "Início do Mês",
      dataFim: dataFim || "Hoje",
    },
    receitas: {
      servicosAvulsos: receitaServicosAvulsos,
      pacotesCompetencia: receitaPacotesCompetencia,
      pacotesNovosVendidos: receitaVendaNovosPacotes,
      produtos: receitaProdutos,
      receitaBrutaTotal,
      receitaCaixaTotal,
    },
    custosVariaveis: {
      comissoesApuradas,
      insumosMateriais: custosInsumos,
      totalCustosVariaveis,
      percentualSobreReceita: receitaBrutaTotal > 0 ? (totalCustosVariaveis / receitaBrutaTotal) * 100 : 0,
    },
    margemContribuicao: {
      valor: margemContribuicao,
      percentual: Math.round(margemContribuicaoPerc * 10) / 10,
    },
    despesasFixas: {
      aluguelFixo: despesasAluguelFixo,
      marketing: despesasMarketing,
      outros: despesasOutros,
      totalDespesasFixas,
      percentualSobreReceita: receitaBrutaTotal > 0 ? (totalDespesasFixas / receitaBrutaTotal) * 100 : 0,
    },
    resultadoLiquido: {
      valor: resultadoLiquido,
      percentual: Math.round(margemLiquidaPerc * 10) / 10,
      isPositivo: resultadoLiquido >= 0,
    },
    fluxoCaixa: {
      entradasTotais: receitaCaixaTotal,
      saidasTotais: totalSaidasCaixa,
      repassesPagos: repassesComissaoPagos,
      saldoFinal: saldoCaixaOperacional,
    },
    indicadores: {
      totalAtendimentos: agendamentosFiltrados.length,
      ticketMedio:
        agendamentosFiltrados.length > 0
          ? Math.round((receitaBrutaTotal / agendamentosFiltrados.length) * 100) / 100
          : 0,
    },
  };
}

/**
 * Agrupa o extrato de comissões por profissional, detalhando faturamento, comissões apuradas, pagas e pendentes.
 *
 * @param {Object} params
 * @param {Agendamento[]} params.agendamentos
 * @param {Profissional[]} params.profissionais
 * @param {RepasseComissao[]} params.repassesComissao
 * @returns {Array} Relatório consolidado por profissional
 */
export function calcularExtratoComissoes({ agendamentos = [], profissionais = [], repassesComissao = [] }) {
  return profissionais.map((pro) => {
    const atendimentosDoPro = agendamentos.filter((a) => a.profissionalId === pro.id && a.status !== "cancelado");
    const totalFaturado = atendimentosDoPro.reduce((s, a) => s + (Number(a.valorCobrado) || 0), 0);
    const comissaoTotalApurada = atendimentosDoPro.reduce((s, a) => s + (Number(a.comissaoCalculada) || 0), 0);

    const comissaoBaixada = atendimentosDoPro
      .filter((a) => a.comissaoPaga)
      .reduce((s, a) => s + (Number(a.comissaoCalculada) || 0), 0);

    const comissaoPendente = comissaoTotalApurada - comissaoBaixada;
    const repassesDoPro = repassesComissao.filter((r) => r.profissionalId === pro.id);

    return {
      profissional: pro,
      totalFaturado,
      comissaoTotalApurada,
      comissaoBaixada,
      comissaoPendente,
      repasses: repassesDoPro,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("cliente");
  const [clientes, setClientes] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [modelosPacote, setModelosPacote] = useState([]);
  const [clientesPacotes, setClientesPacotes] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [repassesComissao, setRepassesComissao] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [produtosVendidos, setProdutosVendidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");

  useEffect(() => {
    let cancelado = false;
    db.carregarTudo()
      .then((dados) => {
        if (cancelado) return;
        setClientes(dados.clientes);
        setProfissionais(dados.profissionais);
        setServicos(dados.servicos);
        setModelosPacote(dados.modelosPacote);
        setClientesPacotes(dados.clientesPacotes);
        setAgendamentos(dados.agendamentos);
        setDespesas(dados.despesas);
        setRepassesComissao(dados.repassesComissao);
        setProdutos(dados.produtos);
        setProdutosVendidos(dados.produtosVendidos);
      })
      .catch((err) => {
        if (!cancelado) setErroCarregamento(err.message || "Não foi possível carregar os dados.");
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (carregando) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", position: "relative", overflow: "hidden", display: "grid", placeItems: "center", color: C.ink, fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`
          @keyframes loaderPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 26px -4px ${C.aubergine}; } 50% { transform: scale(1.07); box-shadow: 0 0 42px 0px ${C.aubergine}; } }
          @keyframes loaderSpin { to { transform: rotate(360deg); } }
          @keyframes loaderDot { 0%, 80%, 100% { transform: scale(0.55); opacity: .35; } 40% { transform: scale(1); opacity: 1; } }
          @media (prefers-reduced-motion: reduce) {
            .loader-spin, .loader-pulse, .loader-dot { animation: none !important; }
          }
        `}</style>
        <AuroraBackdrop />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div style={{ position: "relative", width: 76, height: 76, display: "grid", placeItems: "center" }}>
            <div
              className="loader-spin"
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: `2.5px solid rgba(255,255,255,.12)`, borderTopColor: C.aubergine,
                animation: "loaderSpin 0.9s linear infinite",
              }}
            />
            <div
              className="loader-pulse"
              style={{
                width: 54, height: 54, borderRadius: "50%",
                background: `radial-gradient(circle at 35% 30%, ${C.sage}, ${C.aubergine} 70%)`,
                display: "grid", placeItems: "center", animation: "loaderPulse 2.2s ease-in-out infinite",
              }}
            >
              <Sparkles size={22} color={C.gold} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div className="display" style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, letterSpacing: "0.02em" }}>
              PHARUS
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.22em", color: C.muted, marginBottom: 10 }}>
              ESTÉTICA &amp; SPA
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "center" }}>
              <span style={{ color: C.muted, fontSize: 13 }}>Carregando seus dados</span>
              <span style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="loader-dot"
                    style={{
                      width: 4, height: 4, borderRadius: "50%", background: C.gold,
                      animation: `loaderDot 1.4s ease-in-out ${i * 0.16}s infinite`,
                    }}
                  />
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", position: "relative", overflow: "hidden", display: "grid", placeItems: "center", padding: 24, color: C.ink, fontFamily: "'DM Sans', sans-serif" }}>
        <AuroraBackdrop />
        <div
          className="card"
          style={{
            position: "relative", zIndex: 1, background: C.card, border: `1px solid ${C.line}`,
            borderRadius: 20, padding: 32, maxWidth: 420, width: "100%", textAlign: "center",
          }}
        >
          <div
            style={{
              width: 52, height: 52, borderRadius: "50%", background: "rgba(248,113,113,.16)",
              display: "grid", placeItems: "center", margin: "0 auto 16px",
            }}
          >
            <AlertCircle size={24} color={C.danger} />
          </div>
          <h2 className="display" style={{ fontSize: 19, margin: "0 0 8px" }}>Não foi possível carregar</h2>
          <p style={{ color: C.muted, fontSize: 14, margin: "0 0 22px", lineHeight: 1.5 }}>{erroCarregamento}</p>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
            style={{ padding: "11px 22px", borderRadius: 10, fontWeight: 600, fontSize: 14 }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        html, body { max-width: 100%; overflow-x: hidden; background: ${C.bg}; }
        ::selection { background: ${C.aubergine}; color: #fff; }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: #2E2A45; border-radius: 6px; border: 2px solid ${C.bg}; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.aubergine}; }
        * { scrollbar-color: #2E2A45 ${C.bg}; }
        .display { font-family: 'Fraunces', serif; }
        button { font-family: inherit; color: inherit; background: none; cursor: pointer; border: none; -webkit-tap-highlight-color: transparent; }
        button, .lift, input, select {
          transition: transform .16s cubic-bezier(.22,1,.36,1), box-shadow .18s ease, filter .16s ease,
            background .18s ease, background-color .18s ease, border-color .16s ease, color .16s ease;
        }
        button:disabled { cursor: not-allowed; }
        button:focus-visible, input:focus-visible, select:focus-visible {
          outline: 2px solid ${C.gold}; outline-offset: 2px;
        }
        input, select { color: ${C.ink}; }
        input::placeholder { color: ${C.muted}; opacity: 1; }
        select option { background: ${C.card}; color: ${C.ink}; }
        input:focus, select:focus { border-color: ${C.gold} !important; box-shadow: 0 0 0 4px rgba(224,168,96,.16); }

        .card { box-shadow: 0 1px 2px rgba(0,0,0,.25), 0 12px 28px -14px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04); }

        .lift:hover { transform: translateY(-3px); box-shadow: 0 18px 34px -16px rgba(0,0,0,.5), 0 0 24px -4px rgba(15,61,52,.35); border-color: ${C.sage} !important; }
        .lift:active { transform: translateY(-1px); }

        .chip { position: relative; overflow: hidden; }
        .chip:hover:not(:disabled) { border-color: ${C.aubergine}; filter: brightness(0.97); box-shadow: 0 3px 10px rgba(15,61,52,.14); }
        .chip:active:not(:disabled) { transform: scale(0.96); filter: brightness(0.94); }

        .icon-btn:hover:not(:disabled) { background: rgba(15,61,52,.16) !important; color: ${C.ink} !important; }
        .icon-btn:active:not(:disabled) { transform: scale(0.90); }

        .icon-btn-dark:hover:not(:disabled) { filter: brightness(1.22) saturate(1.1); transform: translateY(-1px); }
        .icon-btn-dark:active:not(:disabled) { transform: translateY(0) scale(0.90); }

        .btn-primary {
          background: linear-gradient(135deg, #D6A874 0%, ${C.gold} 55%, #A97840 100%) !important;
          color: #fff !important;
          box-shadow: 0 3px 10px rgba(224,168,96,.32), inset 0 1px 0 rgba(255,255,255,.25);
        }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 28px -6px rgba(224,168,96,.45), inset 0 1px 0 rgba(255,255,255,.3); filter: brightness(1.08) saturate(1.05); }
        .btn-primary:active:not(:disabled) { transform: translateY(0) scale(0.98); box-shadow: 0 3px 10px rgba(224,168,96,.32); }
        .btn-primary:disabled { background: ${C.line} !important; color: ${C.muted} !important; box-shadow: none; }

        .btn-dark { background: ${C.aubergine} !important; color: #fff !important; box-shadow: 0 3px 10px rgba(15,61,52,.28); }
        .btn-dark:hover:not(:disabled) { filter: brightness(1.18); transform: translateY(-2px); box-shadow: 0 12px 24px -6px rgba(15,61,52,.4); }
        .btn-dark:active:not(:disabled) { transform: translateY(0) scale(0.98); }

        .btn-ghost { background: ${C.card}; border: 1px solid ${C.line}; color: ${C.muted}; }
        .btn-ghost:hover:not(:disabled) { border-color: ${C.aubergine}; color: ${C.ink}; background: rgba(15,61,52,.12); box-shadow: 0 3px 10px rgba(15,61,52,.18); }
        .btn-ghost:active:not(:disabled) { transform: scale(0.97); }

        a, .link-hover { transition: color .16s ease; }
        .link-hover:hover { color: ${C.gold} !important; }

        .aurora-blob { position: absolute; border-radius: 50%; filter: blur(70px); will-change: transform, opacity; }
        .aurora-blob-a {
          width: 340px; height: 340px; left: -70px; top: -90px;
          background: ${C.aubergine}; opacity: .4;
          animation: auroraDrift1 22s ease-in-out infinite;
        }
        .aurora-blob-b {
          width: 280px; height: 280px; right: 6%; top: -50px;
          background: ${C.gold}; opacity: .28;
          animation: auroraDrift2 26s ease-in-out infinite;
        }
        .aurora-blob-c {
          width: 240px; height: 240px; left: 32%; bottom: -110px;
          background: ${C.sage}; opacity: .32;
          animation: auroraPulse 15s ease-in-out infinite;
        }
        @keyframes oceanCurrent1 {
          0% { transform: translate(-4%, 0) scaleX(1); }
          50% { transform: translate(4%, 18px) scaleX(1.08); }
          100% { transform: translate(-4%, 0) scaleX(1); }
        }
        @keyframes oceanCurrent2 {
          0% { transform: translate(3%, 0) scaleX(1.05); }
          50% { transform: translate(-5%, -16px) scaleX(0.96); }
          100% { transform: translate(3%, 0) scaleX(1.05); }
        }
        @keyframes oceanRaySway {
          0%, 100% { transform: rotate(12deg) translateX(0); opacity: .7; }
          50% { transform: rotate(6deg) translateX(30px); opacity: 1; }
        }
        @keyframes auroraFieldPulse {
          0%, 100% { opacity: .5; }
          50% { opacity: .75; }
        }
        @keyframes oceanBubble {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: .9; }
          85% { opacity: .5; }
          100% { transform: translateY(-140px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .aurora-blob, .aurora-field, .aurora-star, .ocean-ray { animation: none !important; opacity: .4 !important; }
        }

        .two-col { grid-template-columns: 1fr; }
        .produtos-grid { grid-template-columns: 1fr; }
        .kpi-grid { grid-template-columns: repeat(2,1fr); }
        .gestao-grid { grid-template-columns: 1fr; }
        .sidebar-card { position: static; }
        @media (min-width: 480px) {
          .produtos-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (min-width: 760px) {
          .kpi-grid { grid-template-columns: repeat(4,1fr); }
        }
        @media (min-width: 900px) {
          .two-col { grid-template-columns: 1fr 340px; }
          .gestao-grid { grid-template-columns: 1.4fr 1fr; }
          .sidebar-card { position: sticky; top: 90px; }
        }
      `}</style>
      <AuroraBackdrop />
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: `1px solid ${C.line}`, background: "rgba(11,10,20,0.72)", backdropFilter: "blur(10px)", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: `radial-gradient(circle at 35% 30%, ${C.sage}, ${C.aubergine} 70%)`,
              display: "grid", placeItems: "center", boxShadow: `0 0 14px -2px ${C.aubergine}`,
            }}
          >
            <Sparkles size={16} color={C.gold} />
          </div>
          <span className="display" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.01em" }}>
            PHARUS <span style={{ fontWeight: 400, opacity: 0.75 }}>Estética &amp; Spa</span>
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            background: C.card,
            padding: 4,
            borderRadius: 12,
            border: `1px solid ${C.line}`,
          }}
        >
          {["gestao", "cliente"].map((m) => (
            <button
              key={m}
              className="chip"
              onClick={() => setMode(m)}
              style={{
                padding: "8px 16px",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 600,
                background: mode === m ? C.aubergine : "transparent",
                color: mode === m ? "#fff" : C.muted,
                boxShadow: mode === m ? "0 3px 10px rgba(15,61,52,.28)" : "none",
                border: "1px solid transparent",
              }}
            >
              {m === "cliente" ? "Área da Cliente" : "Painel de Gestão"}
            </button>
          ))}
        </div>
      </header>

      {/* Main View Router */}
      {mode === "cliente" ? (
        <ClienteView
          servicos={servicos}
          profissionais={profissionais}
          agendamentos={agendamentos}
          setAgendamentos={setAgendamentos}
          produtos={produtos}
          setProdutos={setProdutos}
          setProdutosVendidos={setProdutosVendidos}
          clientesPacotes={clientesPacotes}
          setClientesPacotes={setClientesPacotes}
        />
      ) : (
        <GestaoView
          clientes={clientes}
          setClientes={setClientes}
          profissionais={profissionais}
          setProfissionais={setProfissionais}
          servicos={servicos}
          setServicos={setServicos}
          modelosPacote={modelosPacote}
          setModelosPacote={setModelosPacote}
          clientesPacotes={clientesPacotes}
          setClientesPacotes={setClientesPacotes}
          agendamentos={agendamentos}
          setAgendamentos={setAgendamentos}
          despesas={despesas}
          setDespesas={setDespesas}
          repassesComissao={repassesComissao}
          setRepassesComissao={setRepassesComissao}
          produtos={produtos}
          setProdutos={setProdutos}
          produtosVendidos={produtosVendidos}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. PAINEL DE GESTÃO (GESTÃO VIEW)
// ─────────────────────────────────────────────────────────────

function GestaoView({
  clientes,
  setClientes,
  profissionais,
  setProfissionais,
  servicos,
  setServicos,
  modelosPacote,
  setModelosPacote,
  clientesPacotes,
  setClientesPacotes,
  agendamentos,
  setAgendamentos,
  despesas,
  setDespesas,
  repassesComissao,
  setRepassesComissao,
  produtos,
  setProdutos,
  produtosVendidos,
}) {
  const [activeTab, setActiveTab] = useState("agenda"); // agenda | dre | pacotes | repasses | clientes
  const [selectedDate, setSelectedDate] = useState(DATES[0].key);

  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false);
  const [showNovaDespesa, setShowNovaDespesa] = useState(false);
  const [showNovoPacoteModal, setShowNovoPacoteModal] = useState(false);

  // DRE CALCULADO EM TEMPO REAL (produtosVendidos vem de vendas reais
  // registradas pela loja — ver db/queries.js#listarItensVendidos)
  const dre = useMemo(() => {
    return calcularDRE({
      agendamentos,
      despesas,
      repassesComissao,
      produtosVendidos,
      clientesPacotes,
    });
  }, [agendamentos, despesas, repassesComissao, clientesPacotes, produtosVendidos]);

  // EXTRATO DE COMISSÕES CONSOLIDADO
  const extratoComissoes = useMemo(() => {
    return calcularExtratoComissoes({ agendamentos, profissionais, repassesComissao });
  }, [agendamentos, profissionais, repassesComissao]);

  // Agendamentos do dia selecionado
  const agendamentosDoDia = useMemo(() => {
    return agendamentos.filter((a) => a.data === selectedDate);
  }, [agendamentos, selectedDate]);

  // Handlers — gravam no banco e então rebuscam a lista afetada.
  // valor_cobrado/comissao_calculada/sessao_numero e a dedução da
  // sessão do pacote são calculados no servidor (ver
  // supabase/migrations/0002_functions.sql), não aqui.
  const handleAddAgendamento = async (novo) => {
    try {
      await db.criarAgendamentoGestao(novo);
      const [novosAgendamentos, novosClientes, novosPacotes] = await Promise.all([
        db.listarAgendamentos(),
        db.listarClientes(),
        db.listarClientesPacotes(),
      ]);
      setAgendamentos(novosAgendamentos);
      setClientes(novosClientes);
      setClientesPacotes(novosPacotes);
    } catch (err) {
      window.alert(err.message || "Não foi possível criar o agendamento.");
    }
  };

  const handleUpdateStatusAgendamento = async (agendamentoId, novoStatus) => {
    try {
      await db.atualizarStatusAgendamento(agendamentoId, novoStatus);
      const [novosAgendamentos, novosPacotes] = await Promise.all([
        db.listarAgendamentos(),
        db.listarClientesPacotes(),
      ]);
      setAgendamentos(novosAgendamentos);
      setClientesPacotes(novosPacotes);
    } catch (err) {
      window.alert(err.message || "Não foi possível atualizar o status do agendamento.");
    }
  };

  const handleDarBaixaComissaoAgendamento = async (agendamentoId) => {
    try {
      await db.darBaixaComissaoAgendamento(agendamentoId);
      setAgendamentos(await db.listarAgendamentos());
    } catch (err) {
      window.alert(err.message || "Não foi possível dar baixa na comissão.");
    }
  };

  const handleLiquidarRepasse = async (repasseId) => {
    try {
      await db.liquidarRepasse(repasseId);
      setRepassesComissao(await db.listarRepassesComissao());
    } catch (err) {
      window.alert(err.message || "Não foi possível liquidar o repasse.");
    }
  };

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px clamp(16px,4vw,24px) 80px" }}>
      {/* Top Banner do Painel */}
      <div style={{ position: "relative", marginBottom: 24 }}>
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: "-60px -20px -30px", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}
        >
          <div className="aurora-blob aurora-blob-a" />
          <div className="aurora-blob aurora-blob-b" />
          <div className="aurora-blob aurora-blob-c" />
        </div>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <p
            style={{
              color: C.gold,
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 4px",
            }}
          >
            Painel Executivo & Financeiro
          </p>
          <h1
            className="display"
            style={{ fontSize: "clamp(26px,5vw,36px)", fontWeight: 600, margin: 0, color: C.sage }}
          >
            Gestão Pharus
          </h1>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn-primary"
            onClick={() => setShowNovoAgendamento(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Plus size={16} /> Novo Agendamento
          </button>
          <button
            className="btn-ghost"
            onClick={() => setShowNovaDespesa(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Receipt size={16} /> Lançar Despesa
          </button>
          <button
            className="btn-ghost"
            onClick={() => setShowNovoPacoteModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Package size={16} /> Vender Pacote
          </button>
        </div>
      </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="kpi-grid" style={{ display: "grid", gap: 14, marginBottom: 26 }}>
        <Kpi
          icon={<DollarSign size={20} />}
          label="Receita Bruta (DRE)"
          value={brl(dre.receitas.receitaBrutaTotal)}
          sub={`Margem Bruta: ${dre.margemContribuicao.percentual}%`}
          accent={C.sage}
        />
        <Kpi
          icon={<TrendingUp size={20} />}
          label="Resultado Líquido"
          value={brl(dre.resultadoLiquido.valor)}
          sub={`Margem Líquida: ${dre.resultadoLiquido.percentual}%`}
          accent={dre.resultadoLiquido.isPositivo ? C.sage : C.danger}
        />
        <Kpi
          icon={<Percent size={20} />}
          label="Comissões Apuradas"
          value={brl(dre.custosVariaveis.comissoesApuradas)}
          sub={`${profissionais.length} profissionais`}
          accent={C.gold}
        />
        <Kpi
          icon={<Wallet size={20} />}
          label="Saldo em Caixa Real"
          value={brl(dre.fluxoCaixa.saldoFinal)}
          sub={`Entradas: ${brl(dre.fluxoCaixa.entradasTotais)}`}
          accent={C.sage}
        />
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          borderBottom: `1px solid ${C.line}`,
          marginBottom: 24,
          overflowX: "auto",
          paddingBottom: 2,
        }}
      >
        <NavTabButton
          active={activeTab === "agenda"}
          onClick={() => setActiveTab("agenda")}
          icon={<Calendar size={16} />}
          label="Agenda de Atendimentos"
          count={agendamentos.filter((a) => a.status !== "cancelado").length}
        />
        <NavTabButton
          active={activeTab === "dre"}
          onClick={() => setActiveTab("dre")}
          icon={<FileText size={16} />}
          label="DRE & Financeiro"
        />
        <NavTabButton
          active={activeTab === "pacotes"}
          onClick={() => setActiveTab("pacotes")}
          icon={<Package size={16} />}
          label="Pacotes & Sessões"
          count={clientesPacotes.filter((p) => p.status === "ativo").length}
        />
        <NavTabButton
          active={activeTab === "repasses"}
          onClick={() => setActiveTab("repasses")}
          icon={<Percent size={16} />}
          label="Repasses de Comissão"
        />
        <NavTabButton
          active={activeTab === "clientes"}
          onClick={() => setActiveTab("clientes")}
          icon={<Users size={16} />}
          label="Clientes Cadastrados"
          count={clientes.length}
        />
      </div>

      {/* TAB CONTENT: AGENDA */}
      {activeTab === "agenda" && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* Seletor de Dias */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 6,
            }}
          >
            {DATES.map((d) => {
              const qtd = agendamentos.filter((a) => a.data === d.key && a.status !== "cancelado").length;
              const isSelected = selectedDate === d.key;
              return (
                <button
                  key={d.key}
                  className="chip"
                  onClick={() => setSelectedDate(d.key)}
                  style={{
                    flex: "0 0 auto",
                    minWidth: 84,
                    padding: "10px 14px",
                    borderRadius: 12,
                    textAlign: "center",
                    background: isSelected ? C.aubergine : C.card,
                    color: isSelected ? "#fff" : C.ink,
                    border: `1.5px solid ${isSelected ? C.aubergine : C.line}`,
                    boxShadow: isSelected ? "0 4px 14px rgba(15,61,52,.22)" : "none",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 500, opacity: isSelected ? 0.9 : 0.7 }}>
                    {d.top}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, margin: "2px 0" }}>{d.num}</div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isSelected ? C.gold : C.muted,
                    }}
                  >
                    {qtd} agendamento{qtd !== 1 ? "s" : ""}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Lista de Atendimentos */}
          <div
            className="card"
            style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <div>
                <h3 className="display" style={{ fontSize: 19, margin: "0 0 2px" }}>
                  Atendimentos em {DATES.find((d) => d.key === selectedDate)?.display || selectedDate}
                </h3>
                <span style={{ color: C.muted, fontSize: 13 }}>
                  {agendamentosDoDia.length} horário(s) registrado(s)
                </span>
              </div>
            </div>

            {agendamentosDoDia.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
                <Calendar size={36} color={C.line} style={{ marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Nenhum atendimento agendado para esta data.</p>
                <button
                  className="btn-primary"
                  onClick={() => setShowNovoAgendamento(true)}
                  style={{
                    marginTop: 14,
                    padding: "8px 16px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Adicionar agendamento
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {agendamentosDoDia.map((a) => {
                  const pro = profissionais.find((p) => p.id === a.profissionalId);
                  return (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 14,
                        padding: "14px 18px",
                        borderRadius: 14,
                        background: a.status === "cancelado" ? C.bg : C.card,
                        border: `1px solid ${C.line}`,
                        borderLeft: `5px solid ${pro?.corIdentificacao || C.aubergine}`,
                        opacity: a.status === "cancelado" ? 0.6 : 1,
                      }}
                    >
                      {/* Horário & Pro */}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 160 }}>
                        <div style={{ textAlign: "center", minWidth: 54 }}>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 15,
                              fontWeight: 700,
                              color: C.sage,
                            }}
                          >
                            <Clock size={15} color={C.gold} /> {a.horario}
                          </span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{a.clienteNome}</div>
                          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                            {a.servicoNome}
                          </div>
                        </div>
                      </div>

                      {/* Profissional Badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: pro?.corIdentificacao || C.aubergine,
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{a.profissionalNome}</span>
                      </div>

                      {/* Pagamento & Tipo */}
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>
                          {brl(a.valorCobrado)}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                          <TipoPagamentoBadge tipo={a.tipoPagamento} sessaoNum={a.sessaoNumero} />
                        </div>
                      </div>

                      {/* Comissão info */}
                      <div style={{ textAlign: "right", minWidth: 110 }}>
                        <div style={{ fontSize: 11, color: C.muted }}>Comissão ({pro?.comissaoPercentual}%)</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.sage }}>
                          {brl(a.comissaoCalculada)}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: a.comissaoPaga ? C.success : C.gold }}>
                          {a.comissaoPaga ? "Comissão Paga" : "A Repassar"}
                        </div>
                      </div>

                      {/* Status & Ações */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusBadge status={a.status} />

                        {a.status !== "concluido" && a.status !== "cancelado" && (
                          <button
                            title="Marcar como Concluído"
                            onClick={() => handleUpdateStatusAgendamento(a.id, "concluido")}
                            className="icon-btn"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: "rgba(127,163,150,.16)",
                              color: C.sage,
                              display: "grid",
                              placeItems: "center",
                            }}
                          >
                            <Check size={16} />
                          </button>
                        )}

                        {!a.comissaoPaga && a.status === "concluido" && (
                          <button
                            title="Dar Baixa na Comissão"
                            onClick={() => handleDarBaixaComissaoAgendamento(a.id)}
                            className="chip"
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: "rgba(255,255,255,.07)",
                              border: `1px solid ${C.line}`,
                              color: C.sage,
                            }}
                          >
                            Baixar Comissão
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: DRE & FINANCEIRO */}
      {activeTab === "dre" && (
        <div className="gestao-grid" style={{ display: "grid", gap: 24, alignItems: "start" }}>
          {/* Demonstração do Resultado do Exercício (DRE) */}
          <div
            className="card"
            style={{ background: C.card, borderRadius: 18, padding: 26, border: `1px solid ${C.line}` }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                borderBottom: `1px solid ${C.line}`,
                paddingBottom: 14,
              }}
            >
              <div>
                <h3 className="display" style={{ fontSize: 20, margin: "0 0 2px" }}>
                  Demonstração do Resultado (DRE)
                </h3>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                  Competência: {dre.periodo.dataInicio} até {dre.periodo.dataFim}
                </p>
              </div>
              <span
                style={{
                  background: dre.resultadoLiquido.isPositivo ? "rgba(127,163,150,.16)" : "rgba(248,113,113,.14)",
                  color: dre.resultadoLiquido.isPositivo ? C.success : C.danger,
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {dre.resultadoLiquido.isPositivo ? "Operação Lucrativa" : "Prejuízo Operacional"}
              </span>
            </div>

            {/* Linhas do DRE estruturado */}
            <div style={{ display: "grid", gap: 14 }}>
              {/* 1. RECEITA BRUTA */}
              <div>
                <DREHeaderRow
                  label="1. RECEITA OPERACIONAL BRUTA"
                  value={brl(dre.receitas.receitaBrutaTotal)}
                  color={C.sage}
                />
                <div style={{ paddingLeft: 16, marginTop: 6, display: "grid", gap: 4 }}>
                  <DRESubRow
                    label="(+) Serviços Avulsos Realizados"
                    value={brl(dre.receitas.servicosAvulsos)}
                  />
                  <DRESubRow
                    label="(+) Sessões de Pacotes Realizadas (Competência)"
                    value={brl(dre.receitas.pacotesCompetencia)}
                  />
                  <DRESubRow
                    label="(+) Venda de Produtos Home Care"
                    value={brl(dre.receitas.produtos)}
                  />
                </div>
              </div>

              {/* 2. CUSTOS VARIÁVEIS */}
              <div>
                <DREHeaderRow
                  label="2. (-) CUSTOS OPERACIONAIS VARIÁVEIS"
                  value={"- " + brl(dre.custosVariaveis.totalCustosVariaveis)}
                  color={C.danger}
                />
                <div style={{ paddingLeft: 16, marginTop: 6, display: "grid", gap: 4 }}>
                  <DRESubRow
                    label="(-) Comissões dos Profissionais (Apuradas)"
                    value={"- " + brl(dre.custosVariaveis.comissoesApuradas)}
                  />
                  <DRESubRow
                    label="(-) Insumos e Materiais Descartáveis"
                    value={"- " + brl(dre.custosVariaveis.insumosMateriais)}
                  />
                </div>
              </div>

              {/* 3. MARGEM DE CONTRIBUIÇÃO */}
              <div
                style={{
                  background: "rgba(255,255,255,.06)",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: `1px solid ${C.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.sage,
                  }}
                >
                  <span>3. (=) MARGEM DE CONTRIBUIÇÃO (LUCRO BRUTO)</span>
                  <span className="display">{brl(dre.margemContribuicao.valor)}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                  Margem sobre faturamento: <strong>{dre.margemContribuicao.percentual}%</strong>
                </div>
              </div>

              {/* 4. DESPESAS FIXAS */}
              <div>
                <DREHeaderRow
                  label="4. (-) DESPESAS OPERACIONAIS FIXAS"
                  value={"- " + brl(dre.despesasFixas.totalDespesasFixas)}
                  color={C.danger}
                />
                <div style={{ paddingLeft: 16, marginTop: 6, display: "grid", gap: 4 }}>
                  <DRESubRow
                    label="(-) Aluguel & Condomínio Espaço"
                    value={"- " + brl(dre.despesasFixas.aluguelFixo)}
                  />
                  <DRESubRow
                    label="(-) Marketing & Anúncios Online"
                    value={"- " + brl(dre.despesasFixas.marketing)}
                  />
                  <DRESubRow
                    label="(-) Software, SaaS & Outros"
                    value={"- " + brl(dre.despesasFixas.outros)}
                  />
                </div>
              </div>

              {/* 5. RESULTADO LÍQUIDO */}
              <div
                style={{
                  background: dre.resultadoLiquido.isPositivo
                    ? "linear-gradient(135deg, #EEF1E9 0%, #E3EAD9 100%)"
                    : "rgba(248,113,113,.14)",
                  padding: "16px 18px",
                  borderRadius: 14,
                  border: `1.5px solid ${dre.resultadoLiquido.isPositivo ? C.sage : C.danger}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.sage }}>
                      5. (=) RESULTADO LÍQUIDO DO EXERCÍCIO
                    </span>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      Margem Líquida Gerencial: <strong>{dre.resultadoLiquido.percentual}%</strong>
                    </div>
                  </div>
                  <span
                    className="display"
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: dre.resultadoLiquido.isPositivo ? C.success : C.danger,
                    }}
                  >
                    {brl(dre.resultadoLiquido.valor)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Caixa Real & Lançamento de Despesas */}
          <div style={{ display: "grid", gap: 20 }}>
            {/* Fluxo de Caixa (Regime de Caixa) */}
            <div
              className="card"
              style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <h3 className="display" style={{ fontSize: 18, margin: 0 }}>
                  Balanço de Caixa Real
                </h3>
                <span style={{ fontSize: 12, color: C.muted }}>Regime de Caixa</span>
              </div>
              <Row label="Entradas em Caixa" value={brl(dre.fluxoCaixa.entradasTotais)} color={C.success} />
              <Row label="Saídas Pagas" value={"- " + brl(dre.fluxoCaixa.saidasTotais)} color={C.danger} />
              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 10, paddingTop: 10 }}>
                <Row
                  label="Saldo Financeiro em Caixa"
                  value={brl(dre.fluxoCaixa.saldoFinal)}
                  color={C.sage}
                  bold
                />
              </div>
            </div>

            {/* Extrato de Despesas Lançadas */}
            <div
              className="card"
              style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <h3 className="display" style={{ fontSize: 18, margin: 0 }}>
                  Despesas Recentes
                </h3>
                <button
                  className="chip"
                  onClick={() => setShowNovaDespesa(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 8px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,.07)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <Plus size={13} /> Lançar
                </button>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {despesas.slice(0, 5).map((d) => (
                  <div
                    key={d.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,.05)",
                      border: `1px solid ${C.line}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{d.descricao}</div>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                        {formatDataBR(d.data)} · Ref: {d.comprovanteRef}
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: C.danger }}>- {brl(d.valor)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PACOTES & SESSÕES */}
      {activeTab === "pacotes" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h3 className="display" style={{ fontSize: 20, margin: "0 0 2px" }}>
                Gestão de Pacotes de Clientes
              </h3>
              <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                Acompanhamento de sessões contratadas, consumidas e saldos disponíveis
              </p>
            </div>
            <button
              className="btn-primary"
              onClick={() => setShowNovoPacoteModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              <Plus size={16} /> Vender Novo Pacote
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {clientesPacotes.map((pac) => {
              const saldo = calcularSaldoPacote(pac);
              const cliente = clientes.find((c) => c.id === pac.clienteId);
              return (
                <div
                  key={pac.id}
                  className="card"
                  style={{
                    background: C.card,
                    borderRadius: 18,
                    padding: 22,
                    border: `1px solid ${C.line}`,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.gold,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Pacote #{pac.id}
                      </span>
                      <h4 style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color: C.sage }}>
                        {pac.clienteNome}
                      </h4>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: C.muted }}>
                        {pac.servicoNome}
                      </p>
                    </div>
                    <span
                      style={{
                        background: pac.status === "ativo" ? "rgba(127,163,150,.16)" : "rgba(255,255,255,.07)",
                        color: pac.status === "ativo" ? C.sage : C.muted,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        borderRadius: 20,
                      }}
                    >
                      {pac.status === "ativo" ? "Ativo" : "Concluído"}
                    </span>
                  </div>

                  {/* Barra de Progresso de Sessões */}
                  <div style={{ margin: "16px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      <span>
                        Sessões: {pac.sessoesUsadas} de {pac.totalSessoes}
                      </span>
                      <span>{saldo?.percentualConcluido}% concluído</span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: 8,
                        borderRadius: 6,
                        background: "rgba(255,255,255,.06)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${saldo?.percentualConcluido}%`,
                          height: "100%",
                          background: `linear-gradient(90deg, ${C.gold}, ${C.aubergine})`,
                          borderRadius: 6,
                        }}
                      />
                    </div>
                  </div>

                  {/* Detalhes Financeiros */}
                  <div
                    style={{
                      background: "rgba(255,255,255,.06)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      display: "grid",
                      gap: 6,
                      fontSize: 13,
                      border: `1px solid ${C.line}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: C.muted }}>Valor Total Pago</span>
                      <strong>{brl(pac.valorPago)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: C.muted }}>Valor por Sessão</span>
                      <span>{brl(saldo?.valorUnitarioSessao)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: C.muted }}>Saldo Restante</span>
                      <strong style={{ color: C.sage }}>{brl(saldo?.valorRestante)}</strong>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, fontSize: 11, color: C.muted }}>
                    Adquirido em: {formatDataBR(pac.dataCompra)} {cliente?.telefone && `· WhatsApp: ${cliente.telefone}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB CONTENT: REPASSES DE COMISSÃO */}
      {activeTab === "repasses" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <h3 className="display" style={{ fontSize: 20, margin: "0 0 2px" }}>
              Extrato & Repasses de Comissão
            </h3>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
              Apuração por profissional, percentuais acordados e liquidações financeiras
            </p>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            {extratoComissoes.map((item) => (
              <div
                key={item.profissional.id}
                className="card"
                style={{
                  background: C.card,
                  borderRadius: 18,
                  padding: 22,
                  border: `1px solid ${C.line}`,
                  borderLeft: `6px solid ${item.profissional.corIdentificacao}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                        {item.profissional.nome}
                      </h4>
                      <span
                        style={{
                          background: item.profissional.corIdentificacao + "22",
                          color: item.profissional.corIdentificacao,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {item.profissional.comissaoPercentual}% Comissão
                      </span>
                    </div>
                    <p style={{ margin: "2px 0 0", color: C.muted, fontSize: 13 }}>
                      {item.profissional.cargo}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 18 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: C.muted }}>Total Faturado em Serviços</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{brl(item.totalFaturado)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: C.muted }}>Comissão Total Apurada</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.sage }}>
                        {brl(item.comissaoTotalApurada)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: C.muted }}>Pendente de Repasse</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.gold }}>
                        {brl(item.comissaoPendente)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Repasses do Histórico */}
                <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
                    Histórico de Repasses:
                  </div>
                  {item.repasses.length === 0 ? (
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Nenhum lote de repasse fechado.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {item.repasses.map((r) => (
                        <div
                          key={r.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "rgba(255,255,255,.06)",
                            fontSize: 13,
                            border: `1px solid ${C.line}`,
                          }}
                        >
                          <div>
                            <strong>{r.periodo}</strong>
                            <span style={{ color: C.muted, fontSize: 11, marginLeft: 8 }}>
                              {r.status === "pago"
                                ? `Pago em ${formatDataBR(r.dataPagamento)}`
                                : "Aguardando Pagamento"}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 700 }}>{brl(r.valorTotal)}</span>
                            {r.status === "pendente" ? (
                              <button
                                className="btn-primary"
                                onClick={() => handleLiquidarRepasse(r.id)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                Liquidar Repasse
                              </button>
                            ) : (
                              <span
                                style={{
                                  background: "rgba(127,163,150,.16)",
                                  color: C.sage,
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 600,
                                }}
                              >
                                Liquidado
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CLIENTES */}
      {activeTab === "clientes" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h3 className="display" style={{ fontSize: 20, margin: "0 0 2px" }}>
              Prontuário & Lista de Clientes
            </h3>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
              Cadastro, histórico de atendimentos e pacotes vinculados
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {clientes.map((cli) => {
              const pacs = clientesPacotes.filter((p) => p.clienteId === cli.id);
              const atends = agendamentos.filter((a) => a.clienteId === cli.id);
              return (
                <div
                  key={cli.id}
                  className="card"
                  style={{
                    background: C.card,
                    borderRadius: 18,
                    padding: 22,
                    border: `1px solid ${C.line}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.sage }}>
                        {cli.nome}
                      </h4>
                      <p style={{ margin: "3px 0 0", color: C.muted, fontSize: 13 }}>
                        Nasc: {formatDataBR(cli.nascimento)}
                      </p>
                    </div>
                    <a
                      href={`https://wa.me/55${cli.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: C.success,
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        background: "rgba(127,163,150,.16)",
                        padding: "4px 8px",
                        borderRadius: 8,
                      }}
                    >
                      <Phone size={13} /> {cli.telefone}
                    </a>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10, marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>
                      Pacotes Ativos: <strong>{pacs.filter((p) => p.status === "ativo").length}</strong> ·
                      Atendimentos: <strong>{atends.length}</strong>
                    </div>
                    {pacs.length > 0 && (
                      <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
                        {pacs.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              fontSize: 11,
                              background: "rgba(255,255,255,.06)",
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: `1px solid ${C.line}`,
                            }}
                          >
                            {p.servicoNome} ({p.sessoesUsadas}/{p.totalSessoes} sessões)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modais de Ação */}
      {showNovoAgendamento && (
        <NovoAgendamentoModal
          clientes={clientes}
          profissionais={profissionais}
          servicos={servicos}
          clientesPacotes={clientesPacotes}
          agendamentos={agendamentos}
          onClose={() => setShowNovoAgendamento(false)}
          onSave={async (novo) => {
            await handleAddAgendamento(novo);
            setShowNovoAgendamento(false);
          }}
        />
      )}

      {showNovaDespesa && (
        <NovaDespesaModal
          onClose={() => setShowNovaDespesa(false)}
          onSave={async (desp) => {
            try {
              await db.criarDespesa(desp);
              setDespesas(await db.listarDespesas());
              setShowNovaDespesa(false);
            } catch (err) {
              window.alert(err.message || "Não foi possível lançar a despesa.");
            }
          }}
        />
      )}

      {showNovoPacoteModal && (
        <NovoPacoteModal
          clientes={clientes}
          modelosPacote={modelosPacote}
          servicos={servicos}
          profissionais={profissionais}
          agendamentos={agendamentos}
          onClose={() => setShowNovoPacoteModal(false)}
          onSave={async (payload) => {
            try {
              let modelo = payload.modeloExistente;

              if (payload.novoModelo) {
                let servicoIdParaModelo = payload.novoModelo.servicoId;

                if (payload.novoServico) {
                  const novoServico = await db.criarServico(payload.novoServico);
                  setServicos(await db.listarServicos());
                  servicoIdParaModelo = novoServico.id;
                }

                modelo = await db.criarModeloPacote({ ...payload.novoModelo, servicoId: servicoIdParaModelo });
                setModelosPacote(await db.listarModelosPacote());
              }

              const pacoteRow = await db.criarPacoteCliente({
                clienteId: payload.cliente.id,
                servicoId: modelo.servicoId,
                totalSessoes: modelo.totalSessoes,
                sessoesUsadas: 0,
                valorPago: modelo.precoTotal,
                dataCompra: new Date().toISOString().split("T")[0],
                status: "ativo",
              });
              setClientesPacotes(await db.listarClientesPacotes());

              if (payload.agendamento) {
                await db.criarAgendamentoGestao({
                  data: payload.agendamento.date,
                  horario: payload.agendamento.time,
                  clienteId: payload.cliente.id,
                  clienteNome: payload.cliente.nome,
                  servicoId: modelo.servicoId,
                  profissionalId: payload.agendamento.profissionalId,
                  status: "confirmado",
                  tipoPagamento: "pacote_sessao",
                  pacoteUtilizadoId: pacoteRow.id,
                });
                const [novosAgendamentos, novosPacotes] = await Promise.all([
                  db.listarAgendamentos(),
                  db.listarClientesPacotes(),
                ]);
                setAgendamentos(novosAgendamentos);
                setClientesPacotes(novosPacotes);
              }

              setShowNovoPacoteModal(false);
            } catch (err) {
              window.alert(err.message || "Não foi possível concluir a venda do pacote.");
            }
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 7. ÁREA DA CLIENTE (CLIENTE VIEW)
// ─────────────────────────────────────────────────────────────

function ClienteView({
  servicos,
  profissionais,
  agendamentos,
  setAgendamentos,
  produtos,
  setProdutos,
  setProdutosVendidos,
  clientesPacotes,
  setClientesPacotes,
}) {
  const [tab, setTab] = useState("agendar"); // 'agendar' | 'loja'
  const [selService, setSelService] = useState(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [payMethod, setPayMethod] = useState("pix");
  const [selDate, setSelDate] = useState(null);
  const [selSlot, setSelSlot] = useState(null);
  const [cart, setCart] = useState([]);
  const [confirmed, setConfirmed] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  const selPro = profissionais.find((p) => p.id === selService?.proPadraoId) || profissionais[0];

  const conflict = !!(
    selService &&
    selDate &&
    selSlot &&
    agendamentos.some(
      (a) =>
        a.status !== "cancelado" &&
        a.data === selDate &&
        a.horario === selSlot &&
        a.profissionalId === selPro?.id
    )
  );

  const addCart = (p) =>
    setCart((c) => {
      const f = c.find((x) => x.id === p.id);
      return f ? c.map((x) => (x.id === p.id ? { ...x, q: x.q + 1 } : x)) : [...c, { ...p, q: 1 }];
    });

  const decCart = (id) =>
    setCart((c) =>
      c.map((x) => (x.id === id ? { ...x, q: x.q - 1 } : x)).filter((x) => x.q > 0)
    );

  const cartTotal = cart.reduce((s, x) => s + x.preco * x.q, 0);

  const handleConfirmarAgendamentoCliente = async () => {
    if (!selService || !selDate || !selSlot || !clientName.trim() || !clientPhone.trim() || conflict) return;

    setBookingError("");
    try {
      await db.criarAgendamentoPublico({
        clienteNome: clientName.trim(),
        clienteTelefone: clientPhone.trim(),
        servicoId: selService.id,
        profissionalId: selPro.id,
        data: selDate,
        horario: selSlot,
        tipoPagamento: payMethod === "pix" ? "pago_pix" : "pago_cartao",
      });
      setAgendamentos(await db.listarAgendamentos());
      setConfirmed({
        type: "agenda",
        service: selService,
        date: selDate,
        slot: selSlot,
        method: payMethod,
        clientName: clientName.trim(),
        proName: selPro.nome,
      });
    } catch (err) {
      setBookingError(err.message || "Não foi possível confirmar o agendamento. Tente novamente.");
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px clamp(16px,4vw,24px) 80px" }}>
      {/* Hero */}
      <div style={{ position: "relative", marginBottom: 36 }}>
        <div
          aria-hidden="true"
          style={{ position: "absolute", inset: "-70px -20px -40px", overflow: "hidden", pointerEvents: "none", zIndex: 0 }}
        >
          <div className="aurora-blob aurora-blob-a" />
          <div className="aurora-blob aurora-blob-b" />
          <div className="aurora-blob aurora-blob-c" />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <p
            style={{
              color: C.gold,
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: "0 0 8px",
            }}
          >
            Cuidar de você é o ritual
          </p>
          <h1
            className="display"
            style={{
              fontSize: "clamp(28px,7vw,44px)",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              margin: 0,
              lineHeight: 1.1,
              maxWidth: 560,
            }}
          >
            Reserve seu momento e leve o cuidado pra casa.
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        <TabBtn
          active={tab === "agendar"}
          onClick={() => setTab("agendar")}
          icon={<Calendar size={16} />}
          label="Agendar Procedimento"
        />
        <TabBtn
          active={tab === "loja"}
          onClick={() => setTab("loja")}
          icon={<ShoppingBag size={16} />}
          label="Loja Home Care"
          count={cart.reduce((s, x) => s + x.q, 0)}
        />
      </div>

      {tab === "agendar" && (
        <div className="two-col" style={{ display: "grid", gap: 24, alignItems: "start" }}>
          {/* Lista de Serviços */}
          <div style={{ display: "grid", gap: 14 }}>
            {servicos.map((s) => {
              const isSelected = selService?.id === s.id;
              const pro = profissionais.find((p) => p.id === s.proPadraoId) || profissionais[0];
              return (
                <button
                  key={s.id}
                  className="lift card"
                  onClick={() => {
                    setSelService(s);
                    setSelDate(null);
                    setSelSlot(null);
                  }}
                  style={{
                    textAlign: "left",
                    background: C.card,
                    borderRadius: 16,
                    padding: 20,
                    border: `1.5px solid ${isSelected ? C.aubergine : C.line}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: isSelected ? "0 10px 26px -8px rgba(15,61,52,.35)" : undefined,
                  }}
                >
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        display: "grid",
                        placeItems: "center",
                        background: pro?.corIdentificacao + "22",
                      }}
                    >
                      {s.categoria === "massoterapia" ? (
                        <Hand size={20} color={pro?.corIdentificacao} />
                      ) : s.categoria === "cilios_sobrancelhas" ? (
                        <Eye size={20} color={pro?.corIdentificacao} />
                      ) : (
                        <Sparkles size={20} color={pro?.corIdentificacao} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16, color: C.ink }}>{s.nome}</div>
                      <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>
                        {pro?.nome} · {s.duracao} min
                      </div>
                    </div>
                  </div>
                  <div className="display" style={{ fontSize: 20, fontWeight: 600 }}>
                    {brl(s.precoBase)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sidebar Agendamento */}
          <div
            className="sidebar-card card"
            style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}
          >
            {!selService ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: C.muted }}>
                <Flower2 size={32} color={C.gold} style={{ marginBottom: 8 }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: C.ink }}>
                  Selecione um serviço
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Escolha o procedimento desejado ao lado para definir o horário.
                </p>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, color: C.sage }}>
                  {selService.nome}
                </div>
                <p style={{ color: C.muted, fontSize: 13, margin: "0 0 16px" }}>
                  {selPro.nome} · {brl(selService.precoBase)}
                </p>

                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  <input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Seu nome completo"
                    style={{
                      width: "100%",
                      padding: "11px 13px",
                      borderRadius: 10,
                      border: `1px solid ${C.line}`,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="WhatsApp (ex: 11 98765-4321)"
                    style={{
                      width: "100%",
                      padding: "11px 13px",
                      borderRadius: 10,
                      border: `1px solid ${C.line}`,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Escolha a data:</div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    marginBottom: 14,
                    overflowX: "auto",
                    paddingBottom: 4,
                  }}
                >
                  {DATES.map((d) => (
                    <button
                      key={d.key}
                      className="chip"
                      onClick={() => setSelDate(d.key)}
                      style={{
                        flex: "0 0 auto",
                        minWidth: 52,
                        padding: "8px 4px",
                        borderRadius: 10,
                        textAlign: "center",
                        background: selDate === d.key ? C.aubergine : "rgba(255,255,255,.07)",
                        color: selDate === d.key ? "#fff" : C.ink,
                        border: `1px solid ${selDate === d.key ? C.aubergine : C.line}`,
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.85 }}>{d.top}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{d.num}</div>
                    </button>
                  ))}
                </div>

                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Escolha o horário:</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                  {SLOTS.map((t) => (
                    <button
                      key={t}
                      className="chip"
                      onClick={() => setSelSlot(t)}
                      style={{
                        padding: "10px 0",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        background: selSlot === t ? C.aubergine : "rgba(255,255,255,.07)",
                        color: selSlot === t ? "#fff" : C.ink,
                        border: `1px solid ${selSlot === t ? C.aubergine : C.line}`,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {conflict && (
                  <p style={{ color: C.danger, fontSize: 12, margin: "0 0 12px" }}>
                    Horário indisponível para {selPro.nome}. Por favor, selecione outro horário.
                  </p>
                )}
                {bookingError && (
                  <p style={{ color: C.danger, fontSize: 12, margin: "0 0 12px" }}>{bookingError}</p>
                )}

                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Forma de pagamento:</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                  {["pix", "cartao"].map((m) => (
                    <button
                      key={m}
                      className="chip"
                      onClick={() => setPayMethod(m)}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        padding: "10px 0",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        background: payMethod === m ? C.aubergine : "rgba(255,255,255,.07)",
                        color: payMethod === m ? "#fff" : C.ink,
                        border: `1px solid ${payMethod === m ? C.aubergine : C.line}`,
                      }}
                    >
                      {m === "pix" ? <QrCode size={15} /> : <CreditCard size={15} />}
                      {m === "pix" ? "Pix" : "Cartão"}
                    </button>
                  ))}
                </div>

                <button
                  className="btn-primary"
                  disabled={!clientName.trim() || !clientPhone.trim() || !selDate || !selSlot || conflict}
                  onClick={handleConfirmarAgendamentoCliente}
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  Confirmar Agendamento ({brl(selService.precoBase)})
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "loja" && (
        <div className="two-col" style={{ display: "grid", gap: 24, alignItems: "start" }}>
          <div className="produtos-grid" style={{ display: "grid", gap: 14 }}>
            {produtos.map((p) => (
              <div
                key={p.id}
                className="lift card"
                style={{
                  background: C.card,
                  borderRadius: 16,
                  padding: 18,
                  border: `1px solid ${C.line}`,
                }}
              >
                <div
                  style={{
                    height: 90,
                    borderRadius: 12,
                    background: "linear-gradient(135deg,#F0E6DA,#E8D9CC)",
                    marginBottom: 14,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <ShoppingBag size={26} color={C.gold} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.25 }}>{p.nome}</div>
                <div style={{ color: C.muted, fontSize: 12, margin: "4px 0 12px" }}>
                  {p.estoque} em estoque · {p.categoria}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>
                    {brl(p.preco)}
                  </span>
                  <button
                    className="icon-btn"
                    onClick={() => addCart(p)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: C.aubergine,
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 3px 8px rgba(15,61,52,.28)",
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Carrinho */}
          <div
            className="sidebar-card card"
            style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}
          >
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Seu carrinho</div>
            {cart.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 14 }}>Adicione produtos para continuar.</p>
            ) : (
              <>
                {cart.map((x) => (
                  <div
                    key={x.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <div style={{ fontSize: 13, maxWidth: 150 }}>{x.nome}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        className="icon-btn"
                        onClick={() => decCart(x.id)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          background: "rgba(255,255,255,.07)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Minus size={13} />
                      </button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: "center" }}>
                        {x.q}
                      </span>
                      <button
                        className="icon-btn"
                        onClick={() => addCart(x)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          background: "rgba(255,255,255,.07)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    borderTop: `1px solid ${C.line}`,
                    margin: "14px 0",
                    paddingTop: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 600,
                  }}
                >
                  <span>Total</span>
                  <span className="display" style={{ fontSize: 18 }}>
                    {brl(cartTotal)}
                  </span>
                </div>
                {checkoutError && (
                  <p style={{ color: C.danger, fontSize: 12, margin: "0 0 12px" }}>{checkoutError}</p>
                )}
                <button
                  className="btn-primary"
                  onClick={async () => {
                    setCheckoutError("");
                    try {
                      await db.registrarVendaPublica({
                        clienteNome: clientName,
                        clienteTelefone: clientPhone,
                        formaPagamento: payMethod,
                        itens: cart.map((x) => ({ produtoId: x.id, quantidade: x.q })),
                      });
                      const [novosProdutos, novosItensVendidos] = await Promise.all([
                        db.listarProdutos(),
                        db.listarItensVendidos(),
                      ]);
                      setProdutos(novosProdutos);
                      setProdutosVendidos(novosItensVendidos);
                      setConfirmed({ type: "compra", total: cartTotal });
                    } catch (err) {
                      setCheckoutError(err.message || "Não foi possível concluir a compra. Tente novamente.");
                    }
                  }}
                  style={{ width: "100%", padding: 14, borderRadius: 12, fontWeight: 600 }}
                >
                  Pagar com Pix / Cartão
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {confirmed && (
        <ConfirmModal
          data={confirmed}
          onClose={() => {
            setConfirmed(null);
            setSelService(null);
            setSelDate(null);
            setSelSlot(null);
            setCart([]);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. MODAIS DE CRIAÇÃO & CONFIRMAÇÃO
// ─────────────────────────────────────────────────────────────

function NovoAgendamentoModal({
  clientes,
  profissionais,
  servicos,
  clientesPacotes,
  agendamentos,
  onClose,
  onSave,
}) {
  const [clienteTipo, setClienteTipo] = useState("existente"); // 'existente' | 'novo'
  const [clienteId, setClienteId] = useState(clientes[0]?.id || "");
  const [novoClienteNome, setNovoClienteNome] = useState("");
  const [novoClienteTelefone, setNovoClienteTelefone] = useState("");

  const [servicoId, setServicoId] = useState(servicos[0]?.id || "");
  const [profissionalId, setProfissionalId] = useState(profissionais[0]?.id || "");
  const [date, setDate] = useState(DATES[0].key);
  const [time, setTime] = useState(SLOTS[0]);
  const [tipoPagamento, setTipoPagamento] = useState("pago_pix");
  const [pacoteUtilizadoId, setPacoteUtilizadoId] = useState("");

  // Pacotes ativos da cliente selecionada
  const pacotesDisponiveis = useMemo(() => {
    if (clienteTipo !== "existente" || !clienteId) return [];
    return clientesPacotes.filter((p) => p.clienteId === clienteId && p.status === "ativo");
  }, [clientesPacotes, clienteId, clienteTipo]);

  const servicoSel = servicos.find((s) => s.id === servicoId);
  const proSel = profissionais.find((p) => p.id === profissionalId);
  const pacSel = clientesPacotes.find((p) => p.id === pacoteUtilizadoId);

  const conflict = !!(
    profissionalId &&
    date &&
    time &&
    agendamentos.some(
      (a) =>
        a.status !== "cancelado" &&
        a.data === date &&
        a.horario === time &&
        a.profissionalId === profissionalId
    )
  );

  const submit = (e) => {
    e.preventDefault();
    if (conflict) return;
    if (tipoPagamento === "pacote_sessao" && !pacSel) return;

    const clienteNomeFinal =
      clienteTipo === "existente"
        ? clientes.find((c) => c.id === clienteId)?.nome || "Cliente"
        : novoClienteNome.trim();

    if (!clienteNomeFinal) return;
    if (clienteTipo === "novo" && !novoClienteTelefone.trim()) return;

    let valorCobrado = servicoSel?.precoBase || 140;
    let sessaoNumero = null;

    if (tipoPagamento === "pacote_sessao" && pacSel) {
      valorCobrado = pacSel.valorPago / pacSel.totalSessoes;
      sessaoNumero = pacSel.sessoesUsadas + 1;
    }

    const comissao = calcularComissaoAtendimento({
      valorCobrado,
      comissaoPercentual: proSel?.comissaoPercentual || 50,
      tipoPagamento,
      pacoteUtilizado: pacSel,
    });

    onSave({
      id: `age-${Date.now()}`,
      data: date,
      horario: time,
      clienteId: clienteTipo === "existente" ? clienteId : `cli-${Date.now()}`,
      clienteNome: clienteNomeFinal,
      clienteTelefone: clienteTipo === "novo" ? novoClienteTelefone.trim() : undefined,
      servicoId: servicoSel.id,
      servicoNome: servicoSel.nome,
      profissionalId: proSel.id,
      profissionalNome: proSel.nome,
      status: "confirmado",
      tipoPagamento,
      pacoteUtilizadoId: tipoPagamento === "pacote_sessao" ? pacSel?.id : null,
      sessaoNumero,
      valorCobrado,
      comissaoCalculada: comissao,
      comissaoPaga: false,
      dataBaixaComissao: null,
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    fontSize: 14,
    outline: "none",
    background: C.card,
    color: C.ink,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,4,10,.72)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          background: C.card,
          borderRadius: 22,
          padding: 26,
          maxWidth: 440,
          width: "100%",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button
          className="icon-btn"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            color: C.muted,
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
          }}
        >
          <X size={20} />
        </button>

        <h3 className="display" style={{ fontSize: 20, margin: "0 0 16px" }}>
          Novo Agendamento
        </h3>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          {/* Tipo de cliente */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="chip"
              onClick={() => setClienteTipo("existente")}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                background: clienteTipo === "existente" ? C.aubergine : "rgba(255,255,255,.07)",
                color: clienteTipo === "existente" ? "#fff" : C.ink,
              }}
            >
              Cliente Cadastrada
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => setClienteTipo("novo")}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                background: clienteTipo === "novo" ? C.aubergine : "rgba(255,255,255,.07)",
                color: clienteTipo === "novo" ? "#fff" : C.ink,
              }}
            >
              Nova Cliente
            </button>
          </div>

          {clienteTipo === "existente" ? (
            <select
              value={clienteId}
              onChange={(e) => {
                setClienteId(e.target.value);
                setPacoteUtilizadoId("");
              }}
              style={inputStyle}
            >
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} · {c.telefone}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8 }}>
              <input
                value={novoClienteNome}
                onChange={(e) => setNovoClienteNome(e.target.value)}
                placeholder="Nome completo da cliente"
                style={inputStyle}
                required
              />
              <input
                value={novoClienteTelefone}
                onChange={(e) => setNovoClienteTelefone(e.target.value)}
                placeholder="WhatsApp"
                style={inputStyle}
                required
              />
            </div>
          )}

          {/* Serviço e Profissional */}
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Serviço:</label>
            <select
              value={servicoId}
              onChange={(e) => setServicoId(e.target.value)}
              style={inputStyle}
            >
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} · {brl(s.precoBase)} ({s.duracao} min)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Profissional:</label>
            <select
              value={profissionalId}
              onChange={(e) => setProfissionalId(e.target.value)}
              style={inputStyle}
            >
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} · {p.cargo} ({p.comissaoPercentual}% comissão)
                </option>
              ))}
            </select>
          </div>

          {/* Data e Horário */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Data:</label>
              <select value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle}>
                {DATES.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.display}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Horário:</label>
              <select value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle}>
                {SLOTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de Pagamento */}
          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Forma de Liquidação:</label>
            <select
              value={tipoPagamento}
              onChange={(e) => setTipoPagamento(e.target.value)}
              style={inputStyle}
            >
              <option value="pago_pix">Pago via PIX</option>
              <option value="pago_cartao">Pago via Cartão de Crédito/Débito</option>
              <option value="pago_dinheiro">Pago em Dinheiro</option>
              <option value="pacote_sessao">Abater Sessão de Pacote Ativo</option>
              <option value="pendente_pos_atendimento">Pendente (Pagar após procedimento)</option>
            </select>
          </div>

          {tipoPagamento === "pacote_sessao" && (
            <div style={{ display: "grid", gap: 6, background: "rgba(255,255,255,.06)", padding: 10, borderRadius: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>
                Selecione o Pacote da Cliente:
              </label>
              {pacotesDisponiveis.length === 0 ? (
                <p style={{ color: C.danger, fontSize: 12, margin: 0 }}>
                  Esta cliente não possui pacotes ativos disponíveis.
                </p>
              ) : (
                <select
                  value={pacoteUtilizadoId}
                  onChange={(e) => setPacoteUtilizadoId(e.target.value)}
                  style={inputStyle}
                  required
                >
                  <option value="">Selecione o pacote...</option>
                  {pacotesDisponiveis.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.servicoNome} ({p.sessoesUsadas}/{p.totalSessoes} usadas)
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {conflict && (
            <p style={{ color: C.danger, fontSize: 12, margin: 0 }}>
              Horário indisponível para {proSel?.nome}. Por favor, selecione outro horário ou profissional.
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={
              conflict ||
              (tipoPagamento === "pacote_sessao" && !pacSel) ||
              (clienteTipo === "novo" && !novoClienteTelefone.trim())
            }
            style={{
              width: "100%",
              padding: 13,
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              marginTop: 10,
            }}
          >
            Agendar Atendimento
          </button>
        </form>
      </div>
    </div>
  );
}

const CATEGORIAS_DESPESA = [
  { value: "insumos_materiais", label: "Insumos & Materiais de Atendimento", icon: Package, color: "#3FA98A" },
  { value: "aluguel_fixo", label: "Aluguel & Custos Fixos", icon: Receipt, color: "#E0A860" },
  { value: "marketing", label: "Marketing & Anúncios", icon: ArrowUpRight, color: "#E8A26B" },
  { value: "comissao", label: "Repasse de Comissão", icon: Percent, color: "#1F6E5C" },
  { value: "outros", label: "Outras Despesas Operacionais", icon: FileText, color: "#9DB3AC" },
];

function NovaDespesaModal({ onClose, onSave }) {
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("insumos_materiais");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [comprovanteRef, setComprovanteRef] = useState("");
  const [error, setError] = useState("");

  const catSel = CATEGORIAS_DESPESA.find((c) => c.value === categoria);
  const CatIcon = catSel?.icon || FileText;

  const submit = (e) => {
    e.preventDefault();
    const v = Number(String(valor).replace(",", "."));
    if (!descricao.trim()) return setError("Preencha a descrição da despesa.");
    if (!v || v <= 0) return setError("Informe um valor válido, maior que zero.");
    if (!data) return setError("Informe a data da despesa.");

    setError("");
    onSave({
      id: `desp-${Date.now()}`,
      descricao: descricao.trim(),
      categoria,
      valor: v,
      data,
      comprovanteRef: comprovanteRef.trim() || `COMP-${Date.now().toString().slice(-4)}`,
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    fontSize: 14,
    outline: "none",
    background: C.card,
    color: C.ink,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,4,10,.72)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          background: C.card,
          borderRadius: 22,
          padding: 26,
          maxWidth: 380,
          width: "100%",
          position: "relative",
        }}
      >
        <button
          className="icon-btn"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            color: C.muted,
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
          }}
        >
          <X size={20} />
        </button>

        <h3 className="display" style={{ fontSize: 20, margin: "0 0 16px" }}>
          Lançar Despesa / Saída
        </h3>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição (ex: Insumos de cílios)"
            style={inputStyle}
            required
            autoFocus
          />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div
              style={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 10,
                background: catSel.color + "22",
                color: catSel.color,
                display: "grid",
                placeItems: "center",
              }}
            >
              <CatIcon size={18} />
            </div>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={inputStyle}
            >
              {CATEGORIAS_DESPESA.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  color: C.muted, fontSize: 14, pointerEvents: "none",
                }}
              >
                R$
              </span>
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                style={{ ...inputStyle, paddingLeft: 34 }}
                required
              />
            </div>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <input
            value={comprovanteRef}
            onChange={(e) => setComprovanteRef(e.target.value)}
            placeholder="Comprovante / NF (ex: NF-9921)"
            style={inputStyle}
          />

          {error && (
            <p style={{ color: C.danger, fontSize: 12, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: "100%",
              padding: 13,
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              marginTop: 8,
            }}
          >
            Registrar Saída Financeira
          </button>
        </form>
      </div>
    </div>
  );
}

function NovoPacoteModal({ clientes, modelosPacote, servicos, profissionais, agendamentos, onClose, onSave }) {
  const [modeloTipo, setModeloTipo] = useState(modelosPacote.length ? "existente" : "novo"); // 'existente' | 'novo'
  const [clienteId, setClienteId] = useState(clientes[0]?.id || "");
  const [modeloId, setModeloId] = useState(modelosPacote[0]?.id || "");

  const [novoNome, setNovoNome] = useState("");
  const [servicoTipo, setServicoTipo] = useState(servicos.length ? "existente" : "novo"); // 'existente' | 'novo'
  const [novoServicoId, setNovoServicoId] = useState(servicos[0]?.id || "");
  const [novoServicoNome, setNovoServicoNome] = useState("");
  const [novoServicoCategoria, setNovoServicoCategoria] = useState("massoterapia");
  const [novoServicoDuracao, setNovoServicoDuracao] = useState(60);
  const [novoServicoPreco, setNovoServicoPreco] = useState("");
  const [novoServicoProId, setNovoServicoProId] = useState(profissionais[0]?.id || "");
  const [novoTotalSessoes, setNovoTotalSessoes] = useState(4);
  const [novoPrecoTotal, setNovoPrecoTotal] = useState("");
  const [novoValidadeDias, setNovoValidadeDias] = useState(90);

  const [agendarAgora, setAgendarAgora] = useState(false);
  const [profissionalId, setProfissionalId] = useState(profissionais[0]?.id || "");
  const [date, setDate] = useState(DATES[0].key);
  const [time, setTime] = useState(SLOTS[0]);

  const modSel = modelosPacote.find((m) => m.id === modeloId);
  const cliSel = clientes.find((c) => c.id === clienteId);

  // Resumo mostrado (do modelo existente ou do novo modelo sendo criado)
  const resumo = modeloTipo === "existente"
    ? modSel && { totalSessoes: modSel.totalSessoes, precoTotal: modSel.precoTotal, validadeDias: modSel.validadeDias }
    : novoPrecoTotal && novoTotalSessoes
      ? { totalSessoes: Number(novoTotalSessoes), precoTotal: Number(novoPrecoTotal), validadeDias: Number(novoValidadeDias) }
      : null;

  const conflict = !!(
    agendarAgora &&
    profissionalId &&
    date &&
    time &&
    agendamentos.some(
      (a) => a.status !== "cancelado" && a.data === date && a.horario === time && a.profissionalId === profissionalId
    )
  );

  const novoServicoValido =
    servicoTipo === "existente"
      ? !!novoServicoId
      : novoServicoNome.trim() && Number(novoServicoDuracao) > 0 && Number(novoServicoPreco) >= 0;

  const novoModeloValido =
    novoNome.trim() && novoServicoValido && Number(novoTotalSessoes) > 0 && Number(novoPrecoTotal) > 0;

  const podeSubmeter =
    !!cliSel &&
    (modeloTipo === "existente" ? !!modSel : novoModeloValido) &&
    (!agendarAgora || (!!profissionalId && !conflict));

  const motivoBloqueio = !cliSel
    ? "Selecione a cliente."
    : modeloTipo === "existente" && !modSel
      ? "Selecione um modelo de pacote."
      : modeloTipo === "novo" && servicoTipo === "novo" && !novoServicoValido
        ? "Preencha nome, duração e preço do novo serviço."
        : modeloTipo === "novo" && !novoModeloValido
          ? "Preencha nome, sessões e preço do novo modelo de pacote."
          : agendarAgora && !profissionalId
            ? "Selecione o profissional para agendar a sessão."
            : agendarAgora && conflict
              ? "Escolha outro horário — o profissional já tem atendimento nesse dia e horário."
              : "";

  const submit = (e) => {
    e.preventDefault();
    if (!podeSubmeter) return;

    onSave({
      cliente: cliSel,
      modeloExistente: modeloTipo === "existente" ? modSel : null,
      novoServico:
        modeloTipo === "novo" && servicoTipo === "novo"
          ? {
              nome: novoServicoNome.trim(),
              categoria: novoServicoCategoria,
              duracao: Number(novoServicoDuracao),
              precoBase: Number(novoServicoPreco),
              proPadraoId: novoServicoProId || null,
            }
          : null,
      novoModelo:
        modeloTipo === "novo"
          ? {
              nome: novoNome.trim(),
              servicoId: servicoTipo === "existente" ? novoServicoId : null,
              totalSessoes: Number(novoTotalSessoes),
              precoTotal: Number(novoPrecoTotal),
              validadeDias: Number(novoValidadeDias),
            }
          : null,
      agendamento: agendarAgora ? { profissionalId, date, time } : null,
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    fontSize: 14,
    outline: "none",
    background: C.card,
    color: C.ink,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,4,10,.72)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          background: C.card,
          borderRadius: 22,
          padding: 26,
          maxWidth: 440,
          width: "100%",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <button
          className="icon-btn"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            color: C.muted,
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 38, height: 38, borderRadius: 10, background: C.gold + "22", color: C.gold,
              display: "grid", placeItems: "center", flexShrink: 0,
            }}
          >
            <Package size={18} />
          </div>
          <h3 className="display" style={{ fontSize: 20, margin: 0 }}>
            Vender Pacote Promocional
          </h3>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          {clientes.length ? (
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Cliente:</label>
              <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={inputStyle}>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} · {c.telefone}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              Nenhuma cliente cadastrada ainda — cadastre uma pelo "Novo Agendamento" primeiro.
            </p>
          )}

          {/* Tipo de modelo */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="chip"
              onClick={() => setModeloTipo("existente")}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                background: modeloTipo === "existente" ? C.aubergine : "rgba(255,255,255,.07)",
                color: modeloTipo === "existente" ? "#fff" : C.ink,
              }}
            >
              Modelo Existente
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => setModeloTipo("novo")}
              style={{
                flex: 1,
                padding: "8px 0",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                background: modeloTipo === "novo" ? C.aubergine : "rgba(255,255,255,.07)",
                color: modeloTipo === "novo" ? "#fff" : C.ink,
              }}
            >
              Cadastrar Novo Modelo
            </button>
          </div>

          {modeloTipo === "existente" ? (
            modelosPacote.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Modelo de Pacote:</label>
                <select value={modeloId} onChange={(e) => setModeloId(e.target.value)} style={inputStyle}>
                  {modelosPacote.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome} · {m.totalSessoes}x por {brl(m.precoTotal)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                Nenhum modelo cadastrado ainda — use "Cadastrar Novo Modelo" acima.
              </p>
            )
          ) : (
            <>
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome do pacote (ex: Combo 4x Massagem)"
                style={inputStyle}
                required
              />
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Serviço vinculado:</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => setServicoTipo("existente")}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 8,
                      background: servicoTipo === "existente" ? C.sage : "rgba(255,255,255,.07)",
                      color: servicoTipo === "existente" ? "#081714" : C.ink,
                    }}
                  >
                    Serviço Existente
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => setServicoTipo("novo")}
                    style={{
                      flex: 1,
                      padding: "7px 0",
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 8,
                      background: servicoTipo === "novo" ? C.sage : "rgba(255,255,255,.07)",
                      color: servicoTipo === "novo" ? "#081714" : C.ink,
                    }}
                  >
                    Cadastrar Novo Serviço
                  </button>
                </div>
              </div>

              {servicoTipo === "existente" ? (
                servicos.length ? (
                  <select value={novoServicoId} onChange={(e) => setNovoServicoId(e.target.value)} style={inputStyle}>
                    {servicos.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
                    Nenhum serviço cadastrado ainda — use "Cadastrar Novo Serviço" acima.
                  </p>
                )
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${C.line}`,
                    background: "rgba(255,255,255,.04)",
                  }}
                >
                  <input
                    value={novoServicoNome}
                    onChange={(e) => setNovoServicoNome(e.target.value)}
                    placeholder="Nome do serviço (ex: Drenagem Linfática)"
                    style={inputStyle}
                    required
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select
                      value={novoServicoCategoria}
                      onChange={(e) => setNovoServicoCategoria(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="massoterapia">Massoterapia</option>
                      <option value="cilios_sobrancelhas">Cílios & Sobrancelhas</option>
                      <option value="estetica_facial">Estética Facial</option>
                      <option value="corporal">Corporal</option>
                    </select>
                    <select
                      value={novoServicoProId}
                      onChange={(e) => setNovoServicoProId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Sem profissional padrão</option>
                      {profissionais.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Duração (min):</label>
                      <input
                        type="number"
                        min="1"
                        value={novoServicoDuracao}
                        onChange={(e) => setNovoServicoDuracao(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Preço avulso:</label>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                            color: C.muted, fontSize: 13, pointerEvents: "none",
                          }}
                        >
                          R$
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={novoServicoPreco}
                          onChange={(e) => setNovoServicoPreco(e.target.value)}
                          placeholder="0,00"
                          style={{ ...inputStyle, paddingLeft: 30 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Sessões:</label>
                  <input
                    type="number"
                    min="1"
                    value={novoTotalSessoes}
                    onChange={(e) => setNovoTotalSessoes(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Preço total:</label>
                  <div style={{ position: "relative" }}>
                    <span
                      style={{
                        position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                        color: C.muted, fontSize: 13, pointerEvents: "none",
                      }}
                    >
                      R$
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={novoPrecoTotal}
                      onChange={(e) => setNovoPrecoTotal(e.target.value)}
                      placeholder="0,00"
                      style={{ ...inputStyle, paddingLeft: 30 }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Validade (dias):</label>
                  <input
                    type="number"
                    min="1"
                    value={novoValidadeDias}
                    onChange={(e) => setNovoValidadeDias(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </>
          )}

          {resumo && (
            <div
              style={{
                background: "rgba(224,168,96,.08)",
                padding: 14,
                borderRadius: 12,
                fontSize: 13,
                border: `1px solid ${C.line}`,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8, color: C.ink }}>
                {modeloTipo === "existente" ? modSel?.nome : novoNome.trim() || "Novo pacote"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: C.muted }}>Total do pacote ({resumo.totalSessoes}x)</span>
                <strong>{brl(resumo.precoTotal)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.muted }}>Valor por sessão</span>
                <strong>{brl(resumo.precoTotal / resumo.totalSessoes)}</strong>
              </div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 8 }}>
                Validade: {resumo.validadeDias} dias a partir da data de compra
              </div>
            </div>
          )}

          {/* Agendar a 1ª sessão agora — pra quando a cliente compra na hora e não vai agendar sozinha */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: C.ink,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            <input
              type="checkbox"
              checked={agendarAgora}
              onChange={(e) => setAgendarAgora(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: C.aubergine }}
            />
            Agendar a 1ª sessão agora (cliente não vai agendar sozinha)
          </label>

          {agendarAgora && (
            <div style={{ display: "grid", gap: 10, padding: 12, borderRadius: 10, border: `1px solid ${C.line}`, background: "rgba(255,255,255,.04)" }}>
              <div style={{ display: "grid", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Profissional:</label>
                <select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} style={inputStyle}>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} · {p.cargo}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Data:</label>
                  <select value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle}>
                    {DATES.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.display}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.muted }}>Horário:</label>
                  <select value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle}>
                    {SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {conflict && (
                <p style={{ color: C.danger, fontSize: 12, margin: 0 }}>
                  {profissionais.find((p) => p.id === profissionalId)?.nome} já tem um atendimento nesse dia e horário.
                </p>
              )}
            </div>
          )}

          {!podeSubmeter && motivoBloqueio && (
            <p style={{ color: C.muted, fontSize: 12, margin: 0, textAlign: "center" }}>{motivoBloqueio}</p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={!podeSubmeter}
            style={{
              width: "100%",
              padding: 13,
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 15,
              marginTop: 8,
            }}
          >
            Confirmar Venda do Pacote
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ data, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,4,10,.72)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          background: C.card,
          borderRadius: 22,
          padding: 32,
          maxWidth: 380,
          textAlign: "center",
          position: "relative",
        }}
      >
        <button
          className="icon-btn"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            color: C.muted,
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
          }}
        >
          <X size={20} />
        </button>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "rgba(127,163,150,.16)",
            display: "grid",
            placeItems: "center",
            margin: "0 auto 18px",
          }}
        >
          <Check size={30} color={C.sage} />
        </div>
        {data.type === "agenda" ? (
          <>
            <h3 className="display" style={{ fontSize: 24, margin: "0 0 8px" }}>
              Agendado!
            </h3>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
              Olá, <strong>{data.clientName}</strong>! Seu horário para{" "}
              <strong>{data.service?.nome || data.service?.name}</strong> com{" "}
              <strong>{data.proName}</strong> foi confirmado para{" "}
              <strong>
                {DATES.find((d) => d.key === data.date)?.display || data.date} às {data.slot}
              </strong>
              .
            </p>
          </>
        ) : (
          <>
            <h3 className="display" style={{ fontSize: 24, margin: "0 0 8px" }}>
              Pedido Confirmado!
            </h3>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
              Total de <strong>{brl(data.total)}</strong>. Retire na clínica ou combine a entrega com nossa
              equipe via WhatsApp.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 9. COMPONENTES AUXILIARES
// ─────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label, count }) {
  return (
    <button
      className="chip"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 18px",
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 600,
        background: active ? C.aubergine : C.card,
        color: active ? "#fff" : C.ink,
        border: `1px solid ${active ? C.aubergine : C.line}`,
        boxShadow: active ? "0 4px 12px rgba(15,61,52,.25)" : undefined,
      }}
    >
      {icon}
      {label}
      {count > 0 && (
        <span
          style={{
            background: C.gold,
            color: "#fff",
            borderRadius: 20,
            padding: "1px 7px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function NavTabButton({ active, onClick, icon, label, count }) {
  return (
    <button
      className="chip"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: active ? C.aubergine : "transparent",
        color: active ? "#fff" : C.muted,
        border: `1px solid ${active ? C.aubergine : "transparent"}`,
      }}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span
          style={{
            background: active ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.06)",
            color: active ? "#fff" : C.ink,
            borderRadius: 12,
            padding: "1px 6px",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Kpi({ icon, label, value, sub, accent }) {
  return (
    <div
      className="card lift"
      style={{
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(160deg, ${accent}14 0%, ${C.card} 45%)`,
        borderRadius: 16,
        padding: 18,
        border: `1px solid ${C.line}`,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, opacity: 0.85 }} />
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: accent + "26",
          color: accent,
          display: "grid",
          placeItems: "center",
          marginBottom: 10,
          boxShadow: `0 0 16px -2px ${accent}66`,
        }}
      >
        {icon}
      </div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 2 }}>{label}</div>
      <div className="display" style={{ fontSize: 21, fontWeight: 700, color: C.ink }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    confirmado: ["rgba(127,163,150,.16)", C.sage, "Confirmado"],
    em_atendimento: ["rgba(224,168,96,.18)", C.gold, "Em Atendimento"],
    concluido: ["rgba(74,222,128,.16)", C.success, "Concluído"],
    pendente: ["rgba(224,168,96,.18)", C.gold, "Pendente"],
    cancelado: ["rgba(248,113,113,.16)", C.danger, "Cancelado"],
  };
  const [bg, col, txt] = map[status] || ["rgba(255,255,255,.08)", C.muted, status];
  return (
    <span
      style={{
        background: bg,
        color: col,
        fontSize: 11,
        fontWeight: 700,
        padding: "4px 10px",
        borderRadius: 20,
      }}
    >
      {txt}
    </span>
  );
}

function TipoPagamentoBadge({ tipo, sessaoNum }) {
  const map = {
    pago_pix: ["rgba(127,163,150,.16)", C.sage, "PIX"],
    pago_cartao: ["rgba(15,61,52,.18)", C.aubergine, "Cartão"],
    pago_dinheiro: ["rgba(74,222,128,.16)", C.success, "Dinheiro"],
    pacote_sessao: ["rgba(224,168,96,.18)", C.gold, sessaoNum ? `Pacote (${sessaoNum}ª sessão)` : "Pacote"],
    pendente_pos_atendimento: ["rgba(248,113,113,.16)", C.danger, "Pendente Pós"],
  };
  const [bg, col, txt] = map[tipo] || ["rgba(255,255,255,.08)", C.muted, tipo];
  return (
    <span
      style={{
        background: bg,
        color: col,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 6,
      }}
    >
      {txt}
    </span>
  );
}

function DREHeaderRow({ label, value, color }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 14,
        fontWeight: 700,
        color: color || C.ink,
      }}
    >
      <span>{label}</span>
      <span className="display" style={{ fontSize: 16 }}>
        {value}
      </span>
    </div>
  );
}

function DRESubRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: 13,
        color: C.muted,
      }}
    >
      <span>{label}</span>
      <span style={{ fontWeight: 500, color: C.ink }}>{value}</span>
    </div>
  );
}

function Row({ label, value, color, bold }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: 8,
        fontSize: 14,
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span style={{ color: bold ? C.ink : C.muted }}>{label}</span>
      <span style={{ color: color || C.ink, fontWeight: bold ? 700 : 600 }}>{value}</span>
    </div>
  );
}
