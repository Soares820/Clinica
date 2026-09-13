// Camada de autenticação do Studio Aura (área de Gestão).
//
// Usa o Supabase Auth já configurado em ./supabaseClient.js (mesmo
// projeto/anon key do resto do app — nenhuma segunda arquitetura de
// autenticação foi criada). A sessão é persistida pelo próprio
// supabase-js (localStorage, refresh automático de token) — não há
// storage manual aqui.
//
// A proteção de dados de verdade acontece nas RLS policies do banco
// (is_staff() checando auth.uid(), ver supabase/migrations/0006_auth_seguranca.sql).
// Este módulo só cuida de autenticar e expor o estado da sessão para a
// UI decidir o que mostrar — não substitui a checagem do servidor.
import { supabase } from "./supabaseClient.js";

const TIMEOUT_MS = 15000;

function withTimeout(promise, ms = TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

/**
 * Traduz erros do Supabase Auth (ou de rede) em mensagens amigáveis,
 * sem expor detalhes técnicos (status HTTP, stack, nome de classes etc.)
 * nem distinguir "senha errada" de "usuário não existe" — o próprio
 * Supabase já responde as duas coisas com a mesma mensagem genérica
 * de propósito, para não permitir enumerar e-mails cadastrados.
 */
export function mensagemAmigavelDeErroDeLogin(err) {
  if (!err) return "Não foi possível realizar o login. Tente novamente.";

  if (err.code === "timeout") {
    return "A conexão demorou demais. Verifique sua internet e tente novamente.";
  }

  // Falha de rede (offline, DNS, CORS, servidor fora do ar) — supabase-js
  // costuma propagar como TypeError "Failed to fetch" ou AuthRetryableFetchError.
  if (err.name === "AuthRetryableFetchError" || /failed to fetch|network/i.test(err.message || "")) {
    return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
  }

  const msg = (err.message || "").toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("email not confirmed")) {
    return "Sua conta ainda não foi confirmada. Verifique seu e-mail.";
  }
  if (msg.includes("rate limit") || err.status === 429) {
    return "Muitas tentativas seguidas. Aguarde um instante antes de tentar novamente.";
  }

  // Qualquer outro erro (5xx, erro inesperado do servidor etc.) — nunca
  // repassar err.message cru pro usuário final.
  return "Não foi possível realizar o login. Tente novamente.";
}

export async function entrar(email, senha) {
  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({ email, password: senha })
  );
  if (error) throw error;
  return data.session;
}

export async function sair() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function obterSessaoAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * @param {(session: import('@supabase/supabase-js').Session | null) => void} callback
 * @returns {() => void} função para cancelar a inscrição
 */
export function aoMudarAutenticacao(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}
