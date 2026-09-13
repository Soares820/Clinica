// Camada de acesso a dados do Studio Aura.
//
// Cada `listarX()` busca e mapeia snake_case (banco) → camelCase (o
// formato que clinica-sistema.jsx já espera, para não precisar tocar
// nos componentes de UI). Cada mutação (criar/atualizar) só grava; quem
// chama é responsável por rebuscar a lista afetada e atualizar o
// useState local — ver os handlers em GestaoView/ClienteView.
import { supabase } from "./supabaseClient.js";

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// O PostgREST do Supabase aplica um limite implícito de 1000 linhas por
// requisição — sem paginação, listagens que passam disso voltam
// truncadas SEM erro (DRE/comissões silenciosamente errados a partir
// desse volume). Busca em páginas de 1000 até a página vir incompleta.
const PAGE_SIZE = 1000;

async function fetchAllRows(buildQuery) {
  let linhas = [];
  let offset = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    linhas = linhas.concat(data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return linhas;
}

const trimHorario = (t) => (typeof t === "string" ? t.slice(0, 5) : t);

const formatPeriodo = (inicio, fim) => {
  const br = (iso) => {
    if (!iso) return "";
    const [y, m, d] = String(iso).split("-");
    return `${d}/${m}/${y}`;
  };
  return `${br(inicio)} a ${br(fim)}`;
};

// ─────────────────────────────────────────────────────────────
// Mapeadores banco → formato da UI
// ─────────────────────────────────────────────────────────────
const mapProfissional = (r) => ({
  id: r.id,
  nome: r.nome,
  cargo: r.cargo,
  comissaoPercentual: Number(r.comissao_percentual),
  corIdentificacao: r.cor_identificacao,
  ativo: r.ativo,
});

const mapServico = (r) => ({
  id: r.id,
  nome: r.nome,
  duracao: r.duracao_minutos,
  precoBase: Number(r.preco_base),
  categoria: r.categoria,
  proPadraoId: r.pro_padrao_id,
  ativo: r.ativo,
  emPromocao: r.em_promocao,
  precoPromocional: r.preco_promocional == null ? null : Number(r.preco_promocional),
});

const mapModeloPacote = (r) => ({
  id: r.id,
  nome: r.nome,
  servicoId: r.servico_id,
  totalSessoes: r.total_sessoes,
  precoTotal: Number(r.preco_total),
  validadeDias: r.validade_dias,
});

const mapCliente = (r) => ({
  id: r.id,
  nome: r.nome,
  nascimento: r.nascimento,
  telefone: r.telefone,
});

const mapClientePacote = (r) => ({
  id: r.id,
  clienteId: r.cliente_id,
  clienteNome: r.cliente?.nome || "",
  servicoId: r.servico_id,
  servicoNome: r.servico?.nome || "",
  totalSessoes: r.total_sessoes,
  sessoesUsadas: r.sessoes_usadas,
  valorPago: Number(r.valor_pago),
  dataCompra: r.data_compra,
  status: r.status,
});

const mapAgendamento = (r) => ({
  id: r.id,
  data: r.data,
  horario: trimHorario(r.horario),
  clienteId: r.cliente?.id || r.cliente_id,
  clienteNome: r.cliente?.nome || "",
  servicoId: r.servico?.id || r.servico_id,
  servicoNome: r.servico?.nome || "",
  profissionalId: r.profissional?.id || r.profissional_id,
  profissionalNome: r.profissional?.nome || "",
  status: r.status,
  tipoPagamento: r.tipo_pagamento,
  pacoteUtilizadoId: r.pacote_utilizado_id,
  sessaoNumero: r.sessao_numero,
  valorCobrado: Number(r.valor_cobrado),
  comissaoCalculada: Number(r.comissao_calculada),
  comissaoPaga: r.comissao_paga,
  dataBaixaComissao: r.data_baixa_comissao,
});

const mapDespesa = (r) => ({
  id: r.id,
  descricao: r.descricao,
  categoria: r.categoria,
  valor: Number(r.valor),
  data: r.data,
  comprovanteRef: r.comprovante_ref,
});

const mapRepasse = (r) => ({
  id: r.id,
  profissionalId: r.profissional_id,
  profissionalNome: r.profissional?.nome || "",
  periodo: formatPeriodo(r.periodo_inicio, r.periodo_fim),
  valorTotal: Number(r.valor_total),
  dataPagamento: r.data_pagamento,
  status: r.status,
});

// ─────────────────────────────────────────────────────────────
// Listagens
// ─────────────────────────────────────────────────────────────
export async function listarProfissionais() {
  const data = unwrap(
    await supabase.from("profissionais").select("*").order("nome")
  );
  return data.map(mapProfissional);
}

export async function listarServicos() {
  const data = unwrap(
    await supabase.from("servicos").select("*").order("nome")
  );
  return data.map(mapServico);
}

export async function listarModelosPacote() {
  const data = unwrap(
    await supabase.from("modelos_pacote").select("*").order("nome")
  );
  return data.map(mapModeloPacote);
}

export async function listarClientes() {
  const data = await fetchAllRows(() => supabase.from("clientes").select("*").order("nome"));
  return data.map(mapCliente);
}

export async function listarClientesPacotes() {
  const data = await fetchAllRows(() =>
    supabase
      .from("clientes_pacotes")
      .select("*, cliente:clientes(nome), servico:servicos(nome)")
      .order("data_compra", { ascending: false })
  );
  return data.map(mapClientePacote);
}

export async function listarAgendamentos() {
  const data = await fetchAllRows(() =>
    supabase
      .from("agendamentos")
      .select(
        "*, cliente:clientes(id,nome), servico:servicos(id,nome), profissional:profissionais(id,nome)"
      )
      .order("data")
      .order("horario")
  );
  return data.map(mapAgendamento);
}

export async function listarDespesas() {
  const data = await fetchAllRows(() =>
    supabase.from("despesas").select("*").order("data", { ascending: false })
  );
  return data.map(mapDespesa);
}

export async function listarRepassesComissao() {
  const data = await fetchAllRows(() =>
    supabase
      .from("repasses_comissao")
      .select("*, profissional:profissionais(nome)")
      .order("periodo_inicio", { ascending: false })
  );
  return data.map(mapRepasse);
}

// Itens de venda no formato que calcularDRE() já espera para
// produtosVendidos ({ preco, q }) — substitui o array hardcoded que
// existia antes de a loja persistir vendas de verdade.
export async function listarItensVendidos() {
  const data = await fetchAllRows(() =>
    supabase.from("venda_itens").select("quantidade, preco_unitario")
  );
  return data.map((r) => ({ preco: Number(r.preco_unitario), q: r.quantidade }));
}

// Horários já ocupados (não cancelados) de um profissional num dia —
// usado pela Área da Cliente (público, sem login) só para dar a dica
// visual de "esse horário já está pego" ANTES de tentar confirmar.
// Passa por uma RPC (0010_prevenir_sobreposicao_agendamentos.sql) em
// vez de listarAgendamentos(): aquela função devolve nome de cliente,
// serviço etc. de TODA a agenda, que exigiria acesso de staff — esta
// RPC devolve só os horários de um profissional/dia, sem nenhum dado
// de cliente, então pode ser pública com segurança.
export async function listarHorariosOcupados(data, profissionalId) {
  const rows = unwrap(
    await supabase.rpc("horarios_ocupados_publico", {
      p_data: data,
      p_profissional_id: profissionalId,
    })
  );
  return rows.map((r) => trimHorario(r.horario));
}

// Dados públicos (catálogo): necessários tanto para a Área da Cliente
// quanto para a tela de Login/Painel de Gestão renderizar. Não inclui
// nada sensível — RLS já permite leitura anônima destas três tabelas
// (ver 0003_rls_policies.sql: "ativo = true or is_staff()").
export async function carregarDadosPublicos() {
  const [profissionais, servicos, modelosPacote] = await Promise.all([
    listarProfissionais(),
    listarServicos(),
    listarModelosPacote(),
  ]);
  return { profissionais, servicos, modelosPacote };
}

// Dados só de Gestão (staff autenticado): clientes, agendamentos
// completos (com nome de cliente), financeiro e comissões. Só deve ser
// chamada depois de confirmar uma sessão válida — ver App() em
// clinica-sistema.jsx. Antes da correção de A5, isto era buscado no
// mount do app inteiro, incondicionalmente, e entregue de graça para
// qualquer visitante anônimo da Área da Cliente.
export async function carregarDadosGestao() {
  const [clientes, clientesPacotes, agendamentos, despesas, repassesComissao, produtosVendidos] =
    await Promise.all([
      listarClientes(),
      listarClientesPacotes(),
      listarAgendamentos(),
      listarDespesas(),
      listarRepassesComissao(),
      listarItensVendidos(),
    ]);
  return { clientes, clientesPacotes, agendamentos, despesas, repassesComissao, produtosVendidos };
}

// ─────────────────────────────────────────────────────────────
// Mutações — área de Gestão (staff)
// valor_cobrado/comissao_calculada/sessao_numero nunca são enviados:
// o trigger agendamentos_calcular_valores() (0002_functions.sql)
// sempre recalcula no servidor a partir de servico/profissional/pacote.
// ─────────────────────────────────────────────────────────────
export async function criarAgendamentoGestao(novo) {
  let clienteId = novo.clienteId;
  // NovoAgendamentoModal gera `cli-${Date.now()}` para cliente novo
  // digitado na hora (não existe ainda no banco).
  if (!clienteId || String(clienteId).startsWith("cli-")) {
    const cliente = unwrap(
      await supabase
        .from("clientes")
        .insert({ nome: novo.clienteNome, telefone: novo.clienteTelefone || null })
        .select()
        .single()
    );
    clienteId = cliente.id;
  }

  const { error } = await supabase.from("agendamentos").insert({
    data: novo.data,
    horario: novo.horario,
    cliente_id: clienteId,
    servico_id: novo.servicoId,
    profissional_id: novo.profissionalId,
    status: novo.status || "confirmado",
    tipo_pagamento: novo.tipoPagamento,
    pacote_utilizado_id: novo.pacoteUtilizadoId || null,
  });
  if (error) {
    // 23505 = unique_violation (conflito exato de horário, pré-0010);
    // 23P01 = exclusion_violation (agendamentos_sem_sobreposicao,
    // 0010_prevenir_sobreposicao_agendamentos.sql — cobre também
    // sobreposição de serviços mais longos que o espaçamento dos
    // slots). Mesmo conflito que criar_agendamento_publico() já
    // traduz para o público; aqui era exposto cru — nome de
    // constraint do Postgres — para quem usa a Gestão.
    if (error.code === "23505" || error.code === "23P01") {
      throw new Error("Esse profissional já tem um agendamento nesse horário.");
    }
    throw error;
  }
}

export async function atualizarStatusAgendamento(agendamentoId, novoStatus) {
  unwrap(
    await supabase.from("agendamentos").update({ status: novoStatus }).eq("id", agendamentoId)
  );
}

export async function darBaixaComissaoAgendamento(agendamentoId) {
  const hoje = new Date().toISOString().split("T")[0];
  unwrap(
    await supabase
      .from("agendamentos")
      .update({ comissao_paga: true, data_baixa_comissao: hoje })
      .eq("id", agendamentoId)
  );
}

export async function liquidarRepasse(repasseId) {
  const hoje = new Date().toISOString().split("T")[0];
  unwrap(
    await supabase
      .from("repasses_comissao")
      .update({ status: "pago", data_pagamento: hoje })
      .eq("id", repasseId)
  );
}

export async function criarDespesa(desp) {
  unwrap(
    await supabase.from("despesas").insert({
      descricao: desp.descricao,
      categoria: desp.categoria,
      valor: desp.valor,
      data: desp.data,
      comprovante_ref: desp.comprovanteRef,
    })
  );
}

export async function criarPacoteCliente(novoPac) {
  // .select().single() para devolver o id real gerado pelo banco —
  // quem chama precisa dele para já vincular um agendamento a este
  // pacote na mesma operação (ver NovoPacoteModal).
  const row = unwrap(
    await supabase
      .from("clientes_pacotes")
      .insert({
        cliente_id: novoPac.clienteId,
        servico_id: novoPac.servicoId,
        total_sessoes: novoPac.totalSessoes,
        sessoes_usadas: novoPac.sessoesUsadas || 0,
        valor_pago: novoPac.valorPago,
        data_compra: novoPac.dataCompra,
        status: novoPac.status || "ativo",
      })
      .select()
      .single()
  );
  return row;
}

export async function criarServico(servico) {
  const row = unwrap(
    await supabase
      .from("servicos")
      .insert({
        nome: servico.nome,
        duracao_minutos: servico.duracao,
        preco_base: servico.precoBase,
        categoria: servico.categoria,
        pro_padrao_id: servico.proPadraoId || null,
        ativo: true,
      })
      .select()
      .single()
  );
  return mapServico(row);
}

export async function atualizarServico(id, patch) {
  const payload = {};
  if (patch.nome !== undefined) payload.nome = patch.nome;
  if (patch.duracao !== undefined) payload.duracao_minutos = patch.duracao;
  if (patch.precoBase !== undefined) payload.preco_base = patch.precoBase;
  if (patch.categoria !== undefined) payload.categoria = patch.categoria;
  if (patch.proPadraoId !== undefined) payload.pro_padrao_id = patch.proPadraoId || null;
  if (patch.ativo !== undefined) payload.ativo = patch.ativo;
  if (patch.emPromocao !== undefined) payload.em_promocao = patch.emPromocao;
  if (patch.precoPromocional !== undefined) payload.preco_promocional = patch.precoPromocional;

  const row = unwrap(
    await supabase.from("servicos").update(payload).eq("id", id).select().single()
  );
  return mapServico(row);
}

export async function criarModeloPacote(modelo) {
  const row = unwrap(
    await supabase
      .from("modelos_pacote")
      .insert({
        nome: modelo.nome,
        servico_id: modelo.servicoId,
        total_sessoes: modelo.totalSessoes,
        preco_total: modelo.precoTotal,
        validade_dias: modelo.validadeDias,
        ativo: true,
      })
      .select()
      .single()
  );
  return mapModeloPacote(row);
}

// ─────────────────────────────────────────────────────────────
// Mutações — área da Cliente (público, sem login)
// Passam pelas RPCs SECURITY DEFINER (0002_functions.sql): validam
// conflito de horário e estoque, e calculam preço/comissão no
// servidor — nunca confiam no que o navegador mandar.
// ─────────────────────────────────────────────────────────────
// O agendamento público não coleta mais forma de pagamento (decisão de
// negócio: a cliente paga pessoalmente na clínica) — sempre envia
// 'pendente_pos_atendimento', o único valor que
// criar_agendamento_publico() aceita a partir da migration 0009.
export async function criarAgendamentoPublico({
  clienteNome,
  clienteTelefone,
  servicoId,
  profissionalId,
  data,
  horario,
}) {
  const row = unwrap(
    await supabase.rpc("criar_agendamento_publico", {
      p_cliente_nome: clienteNome,
      p_cliente_telefone: clienteTelefone,
      p_servico_id: servicoId,
      p_profissional_id: profissionalId,
      p_data: data,
      p_horario: horario,
      p_tipo_pagamento: "pendente_pos_atendimento",
    })
  );
  return mapAgendamento(row);
}
