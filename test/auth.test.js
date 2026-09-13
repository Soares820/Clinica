import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const signInWithPassword = vi.fn();
const signOut = vi.fn();
const getSession = vi.fn();
const onAuthStateChange = vi.fn();

vi.mock("../db/supabaseClient.js", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args) => signInWithPassword(...args),
      signOut: (...args) => signOut(...args),
      getSession: (...args) => getSession(...args),
      onAuthStateChange: (...args) => onAuthStateChange(...args),
    },
  },
}));

const auth = await import("../db/auth.js");

beforeEach(() => {
  signInWithPassword.mockReset();
  signOut.mockReset();
  getSession.mockReset();
  onAuthStateChange.mockReset();
});

describe("mensagemAmigavelDeErroDeLogin", () => {
  it("nunca expõe a mensagem crua do servidor para erros genéricos", () => {
    const msg = auth.mensagemAmigavelDeErroDeLogin({ message: "Internal Server Error", status: 500 });
    expect(msg).not.toMatch(/internal server error/i);
    expect(msg).toBe("Não foi possível realizar o login. Tente novamente.");
  });

  it("trata credenciais inválidas (senha errada OU usuário inexistente) com a MESMA mensagem genérica", () => {
    // Propositalmente ambíguo: distinguir as duas coisas permitiria
    // descobrir quais e-mails têm conta (enumeração de usuários).
    const msgSenhaErrada = auth.mensagemAmigavelDeErroDeLogin({ message: "Invalid login credentials" });
    const msgUsuarioInexistente = auth.mensagemAmigavelDeErroDeLogin({ message: "Invalid login credentials" });
    expect(msgSenhaErrada).toBe("E-mail ou senha incorretos.");
    expect(msgSenhaErrada).toBe(msgUsuarioInexistente);
  });

  it("trata timeout com mensagem específica de conexão", () => {
    const msg = auth.mensagemAmigavelDeErroDeLogin({ code: "timeout", message: "timeout" });
    expect(msg).toMatch(/demorou/i);
  });

  it("trata falha de rede/servidor fora do ar", () => {
    expect(auth.mensagemAmigavelDeErroDeLogin({ name: "AuthRetryableFetchError" })).toMatch(/conectar ao servidor/i);
    expect(auth.mensagemAmigavelDeErroDeLogin({ message: "Failed to fetch" })).toMatch(/conectar ao servidor/i);
  });

  it("trata rate limit/brute force com mensagem de tentativas", () => {
    expect(auth.mensagemAmigavelDeErroDeLogin({ status: 429, message: "rate limit exceeded" })).toMatch(/tentativas/i);
  });

  it("nunca quebra com erro nulo/indefinido", () => {
    expect(() => auth.mensagemAmigavelDeErroDeLogin(null)).not.toThrow();
    expect(() => auth.mensagemAmigavelDeErroDeLogin(undefined)).not.toThrow();
  });
});

describe("entrar", () => {
  it("retorna a sessão em caso de sucesso", async () => {
    const sessaoFake = { user: { email: "staff@pharus.com" } };
    signInWithPassword.mockResolvedValue({ data: { session: sessaoFake }, error: null });
    const sessao = await auth.entrar("staff@pharus.com", "senha-correta");
    expect(sessao).toBe(sessaoFake);
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "staff@pharus.com", password: "senha-correta" });
  });

  it("propaga o erro do Supabase quando as credenciais são inválidas", async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    await expect(auth.entrar("staff@pharus.com", "errada")).rejects.toMatchObject({
      message: "Invalid login credentials",
    });
  });

  it("rejeita com código 'timeout' se o servidor não responder a tempo", async () => {
    vi.useFakeTimers();
    signInWithPassword.mockReturnValue(new Promise(() => {})); // nunca resolve
    const promise = auth.entrar("staff@pharus.com", "senha").catch((e) => e);
    await vi.advanceTimersByTimeAsync(15000);
    const err = await promise;
    expect(err.code).toBe("timeout");
    vi.useRealTimers();
  });
});

describe("sair", () => {
  it("chama supabase.auth.signOut", async () => {
    signOut.mockResolvedValue({ error: null });
    await auth.sair();
    expect(signOut).toHaveBeenCalled();
  });

  it("lança erro se o signOut falhar", async () => {
    signOut.mockResolvedValue({ error: { message: "falha" } });
    await expect(auth.sair()).rejects.toBeTruthy();
  });
});

describe("obterSessaoAtual / aoMudarAutenticacao", () => {
  it("retorna a sessão persistida (ou null)", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    expect(await auth.obterSessaoAtual()).toBeNull();
  });

  it("expõe uma função de cancelamento da inscrição", () => {
    const unsubscribe = vi.fn();
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } });
    const cancelar = auth.aoMudarAutenticacao(() => {});
    cancelar();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
