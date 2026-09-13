import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockEntrar,
  mockSair,
  mockObterSessaoAtual,
  mockAoMudarAutenticacao,
  mockCarregarDadosPublicos,
  mockCarregarDadosGestao,
  mockMensagem,
} = vi.hoisted(() => ({
  mockEntrar: vi.fn(),
  mockSair: vi.fn(),
  mockObterSessaoAtual: vi.fn(),
  mockAoMudarAutenticacao: vi.fn(),
  mockCarregarDadosPublicos: vi.fn(),
  mockCarregarDadosGestao: vi.fn(),
  mockMensagem: vi.fn((err) => (err?.code === "timeout" ? "TIMEOUT_MSG" : "ERRO_GENERICO_MSG")),
}));

vi.mock("../db/auth.js", () => ({
  entrar: mockEntrar,
  sair: mockSair,
  obterSessaoAtual: mockObterSessaoAtual,
  aoMudarAutenticacao: mockAoMudarAutenticacao,
  mensagemAmigavelDeErroDeLogin: mockMensagem,
}));

vi.mock("../db/queries.js", () => ({
  carregarDadosPublicos: mockCarregarDadosPublicos,
  carregarDadosGestao: mockCarregarDadosGestao,
}));

const { default: App } = await import("../clinica-sistema.jsx");

const DADOS_PUBLICOS_VAZIOS = {
  profissionais: [],
  servicos: [],
  modelosPacote: [],
};

const DADOS_GESTAO_VAZIOS = {
  clientes: [],
  clientesPacotes: [],
  agendamentos: [],
  despesas: [],
  repassesComissao: [],
  produtosVendidos: [],
};

let authChangeCallback = null;

beforeEach(() => {
  mockEntrar.mockReset();
  mockSair.mockReset();
  mockObterSessaoAtual.mockReset().mockResolvedValue(null);
  mockCarregarDadosPublicos.mockReset().mockResolvedValue(DADOS_PUBLICOS_VAZIOS);
  mockCarregarDadosGestao.mockReset().mockResolvedValue(DADOS_GESTAO_VAZIOS);
  mockMensagem.mockClear();
  authChangeCallback = null;
  mockAoMudarAutenticacao.mockReset().mockImplementation((cb) => {
    authChangeCallback = cb;
    return () => {};
  });
});

async function abrirPainelDeGestao(user) {
  await user.click(screen.getByRole("button", { name: "Painel de Gestão" }));
}

describe("Área da Cliente (sem login)", () => {
  it("é a tela inicial e não exige autenticação", async () => {
    render(<App />);
    // O toggle de modo já aparece assim que a checagem de sessão/carregamento resolve.
    await waitFor(() => expect(screen.getByRole("button", { name: "Área da Cliente" })).toBeInTheDocument());
    expect(screen.queryByLabelText(/e-mail/i)).not.toBeInTheDocument();
  });
});

describe("Acesso à Gestão sem sessão (rota protegida)", () => {
  it("mostra a tela de login em vez do painel", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByRole("button", { name: "Painel de Gestão" }));
    await abrirPainelDeGestao(user);

    expect(await screen.findByText("Acesso à Gestão")).toBeInTheDocument();
    expect(screen.queryByText("Gestão Pharus")).not.toBeInTheDocument();
  });
});

describe("Validação de campos", () => {
  async function irParaLogin(user) {
    render(<App />);
    await waitFor(() => screen.getByRole("button", { name: "Painel de Gestão" }));
    await abrirPainelDeGestao(user);
    await screen.findByText("Acesso à Gestão");
  }

  it("campo vazio: bloqueia o envio e não chama o servidor", async () => {
    const user = userEvent.setup();
    await irParaLogin(user);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe seu e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha.")).toBeInTheDocument();
    expect(mockEntrar).not.toHaveBeenCalled();
  });

  it("e-mail inválido: mostra erro de validação e não chama o servidor", async () => {
    const user = userEvent.setup();
    await irParaLogin(user);

    await user.type(screen.getByPlaceholderText("seu@email.com"), "nao-e-um-email");
    await user.type(screen.getByPlaceholderText("Sua senha"), "qualquer-senha");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe um e-mail válido.")).toBeInTheDocument();
    expect(mockEntrar).not.toHaveBeenCalled();
  });

  it("senha vazia com e-mail válido: mostra erro e não chama o servidor", async () => {
    const user = userEvent.setup();
    await irParaLogin(user);

    await user.type(screen.getByPlaceholderText("seu@email.com"), "staff@pharus.com");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe sua senha.")).toBeInTheDocument();
    expect(mockEntrar).not.toHaveBeenCalled();
  });
});

describe("Envio do login", () => {
  async function irParaLoginEPreencher(user, { email = "staff@pharus.com", senha = "senha-correta" } = {}) {
    render(<App />);
    await waitFor(() => screen.getByRole("button", { name: "Painel de Gestão" }));
    await abrirPainelDeGestao(user);
    await screen.findByText("Acesso à Gestão");
    await user.type(screen.getByPlaceholderText("seu@email.com"), email);
    await user.type(screen.getByPlaceholderText("Sua senha"), senha);
  }

  it("login válido: autentica e redireciona para o Painel de Gestão", async () => {
    const user = userEvent.setup();
    mockEntrar.mockResolvedValue({ user: { email: "staff@pharus.com" } });
    await irParaLoginEPreencher(user);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Gestão Pharus")).toBeInTheDocument();
    expect(screen.queryByText("Acesso à Gestão")).not.toBeInTheDocument();
    expect(mockEntrar).toHaveBeenCalledWith("staff@pharus.com", "senha-correta");
  });

  it("credenciais inválidas: mostra mensagem amigável, nunca o erro técnico cru", async () => {
    const user = userEvent.setup();
    mockEntrar.mockRejectedValue(new Error("Invalid login credentials"));
    await irParaLoginEPreencher(user, { senha: "senha-errada" });

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ERRO_GENERICO_MSG");
    expect(screen.queryByText(/invalid login credentials/i)).not.toBeInTheDocument();
    // Continua na tela de login, não vaza pro painel.
    expect(screen.queryByText("Gestão Pharus")).not.toBeInTheDocument();
  });

  it("erro de servidor (5xx): mostra mensagem amigável, sem status/stack técnico", async () => {
    const user = userEvent.setup();
    mockEntrar.mockRejectedValue(Object.assign(new Error("Internal Server Error"), { status: 500 }));
    await irParaLoginEPreencher(user);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("ERRO_GENERICO_MSG");
    expect(screen.queryByText(/500/)).not.toBeInTheDocument();
    expect(screen.queryByText(/internal server error/i)).not.toBeInTheDocument();
  });

  it("timeout: mostra mensagem específica de conexão", async () => {
    const user = userEvent.setup();
    mockEntrar.mockRejectedValue(Object.assign(new Error("timeout"), { code: "timeout" }));
    await irParaLoginEPreencher(user);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("TIMEOUT_MSG");
  });

  it("duplo clique/duplo submit: chama o servidor uma única vez", async () => {
    const user = userEvent.setup();
    let resolver;
    mockEntrar.mockReturnValue(new Promise((r) => (resolver = r)));
    await irParaLoginEPreencher(user);

    const form = screen.getByRole("button", { name: "Entrar" }).closest("form");
    // Dispara dois submits em sequência, antes de qualquer re-render assíncrono
    // ter chance de desabilitar o botão — testa a trava por estado
    // (if (carregando) return), não só o atributo disabled do botão.
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(mockEntrar).toHaveBeenCalledTimes(1);
    resolver({ user: { email: "staff@pharus.com" } });
    await screen.findByText("Gestão Pharus");
  });
});

describe("Sessão já autenticada", () => {
  it("usuário autenticado não vê a tela de login ao abrir a Gestão", async () => {
    mockObterSessaoAtual.mockResolvedValue({ user: { email: "staff@pharus.com" } });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByRole("button", { name: "Painel de Gestão" }));
    await abrirPainelDeGestao(user);

    expect(await screen.findByText("Gestão Pharus")).toBeInTheDocument();
    expect(screen.queryByText("Acesso à Gestão")).not.toBeInTheDocument();
  });

  it("logout: encerra a sessão e volta para a tela de login", async () => {
    mockObterSessaoAtual.mockResolvedValue({ user: { email: "staff@pharus.com" } });
    mockSair.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByRole("button", { name: "Painel de Gestão" }));
    await abrirPainelDeGestao(user);
    await screen.findByText("Gestão Pharus");

    await user.click(screen.getByRole("button", { name: /sair/i }));

    expect(mockSair).toHaveBeenCalled();
    expect(await screen.findByText("Acesso à Gestão")).toBeInTheDocument();
  });

  it("sessão expirada (refresh token falha): volta para a tela de login sozinho", async () => {
    mockObterSessaoAtual.mockResolvedValue({ user: { email: "staff@pharus.com" } });
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByRole("button", { name: "Painel de Gestão" }));
    await abrirPainelDeGestao(user);
    await screen.findByText("Gestão Pharus");

    // Simula o supabase-js disparando SIGNED_OUT porque o refresh token expirou.
    act(() => {
      authChangeCallback(null);
    });

    expect(await screen.findByText("Acesso à Gestão")).toBeInTheDocument();
  });
});

describe("Mostrar/ocultar senha", () => {
  it("alterna o tipo do campo entre password e text", async () => {
    const user = userEvent.setup();
    render(<App />);
    await waitFor(() => screen.getByRole("button", { name: "Painel de Gestão" }));
    await abrirPainelDeGestao(user);
    await screen.findByText("Acesso à Gestão");

    const campoSenha = screen.getByPlaceholderText("Sua senha");
    expect(campoSenha).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /mostrar senha/i }));
    expect(campoSenha).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: /ocultar senha/i }));
    expect(campoSenha).toHaveAttribute("type", "password");
  });
});
