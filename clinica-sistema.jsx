import React, { useState, useMemo } from "react";
import { Calendar, ShoppingBag, Wallet, Clock, Check, Plus, Minus, X, TrendingUp, Users, Flower2, Eye, Hand, Lock, LogOut, CreditCard, QrCode } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Design tokens — estúdio de beleza & bem-estar
// Palette: warm plaster, deep aubergine, muted sage, soft blush, gold accent
// ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F3EE",
  ink: "#2A2320",
  aubergine: "#3D2B3B",
  sage: "#8A9A7B",
  blush: "#E8C5C0",
  gold: "#C08A4E",
  card: "#FFFFFF",
  line: "#E7DFD5",
  muted: "#8A7F76",
};

const SERVICES = [
  { id: 1, pro: "Marina", role: "Massoterapia", name: "Massagem Relaxante", dur: 60, price: 140, tag: "sage" },
  { id: 2, pro: "Marina", role: "Massoterapia", name: "Massagem Modeladora", dur: 90, price: 190, tag: "sage" },
  { id: 3, pro: "Rafael", role: "Cílios", name: "Extensão Volume Russo", dur: 120, price: 220, tag: "blush" },
  { id: 4, pro: "Rafael", role: "Cílios", name: "Lash Lifting", dur: 60, price: 130, tag: "blush" },
];

const PRODUCTS = [
  { id: 1, name: "Óleo de Massagem Lavanda", price: 68, stock: 12 },
  { id: 2, name: "Sérum Fortalecedor de Cílios", price: 95, stock: 8 },
  { id: 3, name: "Kit Escova + Rímel Nutritivo", price: 54, stock: 20 },
  { id: 4, name: "Vela Aromática Relax", price: 42, stock: 15 },
];

const SLOTS = ["09:00", "10:30", "13:00", "14:30", "16:00", "17:30"];

function buildDates(n) {
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
const DATES = buildDates(7);

const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─────────────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("cliente"); // cliente | gestao
  const [gestaoAuthed, setGestaoAuthed] = useState(false);
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        html, body { max-width: 100%; overflow-x: hidden; }
        .display { font-family: 'Fraunces', serif; }
        button { font-family: inherit; cursor: pointer; border: none; }
        .lift { transition: transform .18s ease, box-shadow .18s ease; }
        .lift:hover { transform: translateY(-2px); }
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

      {/* Top bar */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "14px clamp(16px,4vw,24px)", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.bg, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: C.aubergine, display: "grid", placeItems: "center" }}>
            <Flower2 size={18} color={C.gold} />
          </div>
          <span className="display" style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>Studio Aura</span>
        </div>
        <div style={{ display: "flex", gap: 4, background: C.card, padding: 4, borderRadius: 12, border: `1px solid ${C.line}` }}>
          {["cliente", "gestao"].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "8px 16px", borderRadius: 9, fontSize: 14, fontWeight: 500,
              background: mode === m ? C.aubergine : "transparent",
              color: mode === m ? "#fff" : C.muted,
            }}>{m === "cliente" ? "Área da Cliente" : "Gestão"}</button>
          ))}
        </div>
      </header>

      {mode === "cliente" ? <Cliente /> : (
        <Gestao
          authed={gestaoAuthed}
          onLogin={() => setGestaoAuthed(true)}
          onLogout={() => { setGestaoAuthed(false); setMode("cliente"); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ÁREA DA CLIENTE — agendamento + loja
// ─────────────────────────────────────────────────────────────
function Cliente() {
  const [tab, setTab] = useState("agendar");
  const [selService, setSelService] = useState(null);
  const [paid, setPaid] = useState(false);
  const [payMethod, setPayMethod] = useState("pix");
  const [selDate, setSelDate] = useState(null);
  const [selSlot, setSelSlot] = useState(null);
  const [cart, setCart] = useState([]);
  const [confirmed, setConfirmed] = useState(null);

  const addCart = (p) => setCart((c) => {
    const f = c.find((x) => x.id === p.id);
    return f ? c.map((x) => x.id === p.id ? { ...x, q: x.q + 1 } : x) : [...c, { ...p, q: 1 }];
  });
  const decCart = (id) => setCart((c) => c.map((x) => x.id === id ? { ...x, q: x.q - 1 } : x).filter((x) => x.q > 0));
  const cartTotal = cart.reduce((s, x) => s + x.price * x.q, 0);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px clamp(16px,4vw,24px) 80px" }}>
      {/* Hero */}
      <div style={{ marginBottom: 36 }}>
        <p style={{ color: C.gold, fontWeight: 600, fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 8px" }}>Cuidar de você é o ritual</p>
        <h1 className="display" style={{ fontSize: "clamp(28px,7vw,44px)", fontWeight: 600, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1, maxWidth: 560 }}>
          Reserve seu momento e leve o cuidado pra casa.
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        <TabBtn active={tab === "agendar"} onClick={() => setTab("agendar")} icon={<Calendar size={16} />} label="Agendar" />
        <TabBtn active={tab === "loja"} onClick={() => setTab("loja")} icon={<ShoppingBag size={16} />} label="Loja" count={cart.reduce((s, x) => s + x.q, 0)} />
      </div>

      {tab === "agendar" && (
        <div className="two-col" style={{ display: "grid", gap: 24, alignItems: "start" }}>
          <div style={{ display: "grid", gap: 14 }}>
            {SERVICES.map((s) => (
              <button key={s.id} className="lift" onClick={() => { setSelService(s); setPaid(false); setSelDate(null); setSelSlot(null); }} style={{
                textAlign: "left", background: C.card, borderRadius: 16, padding: 20,
                border: `1.5px solid ${selService?.id === s.id ? C.aubergine : C.line}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                boxShadow: selService?.id === s.id ? "0 8px 24px rgba(61,43,59,.12)" : "none",
              }}>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: s.tag === "sage" ? "#EEF1E9" : "#FBEEEC" }}>
                    {s.tag === "sage" ? <Hand size={20} color={C.sage} /> : <Eye size={20} color="#C88B84" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{s.name}</div>
                    <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{s.pro} · {s.role} · {s.dur}min</div>
                  </div>
                </div>
                <div className="display" style={{ fontSize: 20, fontWeight: 600 }}>{brl(s.price)}</div>
              </button>
            ))}
          </div>

          {/* Sidebar agendamento */}
          <div className="sidebar-card" style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}>
            {!selService && (
              <div style={{ fontWeight: 600, fontSize: 15 }}>Selecione um serviço</div>
            )}

            {selService && !paid && (
              <>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Pagamento</div>
                <p style={{ color: C.muted, fontSize: 13, margin: "0 0 16px" }}>{selService.name} · {brl(selService.price)}</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                  {["pix", "cartao"].map((m) => (
                    <button key={m} onClick={() => setPayMethod(m)} style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "10px 0", borderRadius: 10, fontSize: 14, fontWeight: 500,
                      background: payMethod === m ? C.aubergine : "#F7F3EE",
                      color: payMethod === m ? "#fff" : C.ink,
                      border: `1px solid ${payMethod === m ? C.aubergine : C.line}`,
                    }}>{m === "pix" ? <QrCode size={15} /> : <CreditCard size={15} />}{m === "pix" ? "Pix" : "Cartão"}</button>
                  ))}
                </div>
                <button onClick={() => setPaid(true)} style={{ width: "100%", padding: 14, borderRadius: 12, fontWeight: 600, fontSize: 15, background: C.gold, color: "#fff" }}>
                  Confirmar pagamento
                </button>
              </>
            )}

            {selService && paid && (
              <>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Escolha o dia e horário</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
                  {DATES.map((d) => (
                    <button key={d.key} onClick={() => setSelDate(d.key)} style={{
                      flex: "0 0 auto", minWidth: 52, padding: "8px 4px", borderRadius: 10, textAlign: "center",
                      background: selDate === d.key ? C.aubergine : "#F7F3EE",
                      color: selDate === d.key ? "#fff" : C.ink,
                      border: `1px solid ${selDate === d.key ? C.aubergine : C.line}`,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>{d.top}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{d.num}</div>
                    </button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                  {SLOTS.map((t) => (
                    <button key={t} onClick={() => setSelSlot(t)} style={{
                      padding: "10px 0", borderRadius: 10, fontSize: 14, fontWeight: 500,
                      background: selSlot === t ? C.aubergine : "#F7F3EE",
                      color: selSlot === t ? "#fff" : C.ink,
                      border: `1px solid ${selSlot === t ? C.aubergine : C.line}`,
                    }}>{t}</button>
                  ))}
                </div>
                <button disabled={!selDate || !selSlot} onClick={() => setConfirmed({ type: "agenda", service: selService, date: selDate, slot: selSlot, method: payMethod })} style={{
                  width: "100%", padding: 14, borderRadius: 12, fontWeight: 600, fontSize: 15,
                  background: (selDate && selSlot) ? C.gold : C.line, color: (selDate && selSlot) ? "#fff" : C.muted,
                }}>Confirmar agendamento</button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "loja" && (
        <div className="two-col" style={{ display: "grid", gap: 24, alignItems: "start" }}>
          <div className="produtos-grid" style={{ display: "grid", gap: 14 }}>
            {PRODUCTS.map((p) => (
              <div key={p.id} className="lift" style={{ background: C.card, borderRadius: 16, padding: 18, border: `1px solid ${C.line}` }}>
                <div style={{ height: 90, borderRadius: 12, background: "linear-gradient(135deg,#F0E6DA,#E8D9CC)", marginBottom: 14, display: "grid", placeItems: "center" }}>
                  <ShoppingBag size={26} color={C.gold} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.25 }}>{p.name}</div>
                <div style={{ color: C.muted, fontSize: 12, margin: "4px 0 12px" }}>{p.stock} em estoque</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>{brl(p.price)}</span>
                  <button onClick={() => addCart(p)} style={{ width: 34, height: 34, borderRadius: 10, background: C.aubergine, color: "#fff", display: "grid", placeItems: "center" }}>
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Carrinho */}
          <div className="sidebar-card" style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Seu carrinho</div>
            {cart.length === 0 ? (
              <p style={{ color: C.muted, fontSize: 14 }}>Adicione produtos pra continuar.</p>
            ) : (
              <>
                {cart.map((x) => (
                  <div key={x.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, maxWidth: 150 }}>{x.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => decCart(x.id)} style={{ width: 24, height: 24, borderRadius: 7, background: "#F7F3EE", display: "grid", placeItems: "center" }}><Minus size={13} /></button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 16, textAlign: "center" }}>{x.q}</span>
                      <button onClick={() => addCart(x)} style={{ width: 24, height: 24, borderRadius: 7, background: "#F7F3EE", display: "grid", placeItems: "center" }}><Plus size={13} /></button>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${C.line}`, margin: "14px 0", paddingTop: 14, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                  <span>Total</span><span className="display" style={{ fontSize: 18 }}>{brl(cartTotal)}</span>
                </div>
                <button onClick={() => setConfirmed({ type: "compra", total: cartTotal })} style={{ width: "100%", padding: 14, borderRadius: 12, fontWeight: 600, background: C.gold, color: "#fff" }}>
                  Pagar com Pix / Cartão
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {confirmed && <Confirm data={confirmed} onClose={() => { setConfirmed(null); setSelService(null); setSelDate(null); setSelSlot(null); setPaid(false); setCart([]); }} />}
    </div>
  );
}

function Confirm({ data, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(42,35,32,.5)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: 32, maxWidth: 380, textAlign: "center", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", color: C.muted }}><X size={20} /></button>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#EEF1E9", display: "grid", placeItems: "center", margin: "0 auto 18px" }}>
          <Check size={30} color={C.sage} />
        </div>
        {data.type === "agenda" ? (
          <>
            <h3 className="display" style={{ fontSize: 24, margin: "0 0 8px" }}>Agendado!</h3>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Pagamento via {data.method === "pix" ? "Pix" : "Cartão"} confirmado. {data.service.name} com {data.service.pro} em {DATES.find((d) => d.key === data.date)?.display} às {data.slot}. Você recebe a confirmação no WhatsApp.</p>
          </>
        ) : (
          <>
            <h3 className="display" style={{ fontSize: 24, margin: "0 0 8px" }}>Pedido pago!</h3>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Total de {brl(data.total)}. Retire na clínica ou combine a entrega.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LOGIN — acesso à gestão
// ─────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, outline: "none", background: "#fff", color: C.ink };

  const submit = (e) => {
    e.preventDefault();
    if (user === "admin" && pass === "1234") { setError(""); onLogin(); }
    else setError("Usuário ou senha inválidos.");
  };

  return (
    <div style={{ maxWidth: 380, margin: "10vh auto 0", padding: "0 clamp(16px,4vw,24px) 60px" }}>
      <div style={{ background: C.card, borderRadius: 18, padding: 28, border: `1px solid ${C.line}` }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: C.aubergine, display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
          <Lock size={20} color={C.gold} />
        </div>
        <h2 className="display" style={{ fontSize: 22, fontWeight: 600, textAlign: "center", margin: "0 0 4px" }}>Acesso restrito</h2>
        <p style={{ color: C.muted, fontSize: 13, textAlign: "center", margin: "0 0 22px" }}>Entre com seu usuário e senha para gerenciar o estúdio.</p>
        <form onSubmit={submit}>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Usuário" style={inputStyle} />
          <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" placeholder="Senha" style={{ ...inputStyle, marginTop: 10 }} />
          {error && <p style={{ color: "#C0524E", fontSize: 12, margin: "10px 0 0" }}>{error}</p>}
          <button type="submit" style={{ width: "100%", padding: 13, borderRadius: 12, fontWeight: 600, fontSize: 15, background: C.gold, color: "#fff", marginTop: 16 }}>Entrar</button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PAINEL DE GESTÃO
// ─────────────────────────────────────────────────────────────
function Gestao({ authed, onLogin, onLogout }) {
  const [agenda, setAgenda] = useState([
    { time: "09:00", cliente: "Ana Beatriz", serv: "Massagem Relaxante", pro: "Marina", status: "confirmado" },
    { time: "10:30", cliente: "Júlia Menezes", serv: "Volume Russo", pro: "Rafael", status: "confirmado" },
    { time: "13:00", cliente: "Carla Dias", serv: "Lash Lifting", pro: "Rafael", status: "pendente" },
    { time: "14:30", cliente: "—", serv: "Livre", pro: "—", status: "livre" },
    { time: "16:00", cliente: "Paula Reis", serv: "Modeladora", pro: "Marina", status: "confirmado" },
  ]);
  const [transactions, setTransactions] = useState([
    { id: 1, desc: "Serviços do dia", value: 1240, type: "servico" },
    { id: 2, desc: "Produtos vendidos", value: 217, type: "produto" },
    { id: 3, desc: "Despesas do dia", value: 380, type: "despesa" },
  ]);
  const [showNovoAgendamento, setShowNovoAgendamento] = useState(false);
  const [showNovoRecebimento, setShowNovoRecebimento] = useState(false);

  if (!authed) return <Login onLogin={onLogin} />;

  const receita = transactions.filter((t) => t.type === "servico").reduce((s, t) => s + t.value, 0);
  const produtos = transactions.filter((t) => t.type === "produto").reduce((s, t) => s + t.value, 0);
  const despesa = transactions.filter((t) => t.type === "despesa").reduce((s, t) => s + t.value, 0);
  const atendimentos = agenda.filter((a) => a.status !== "livre").length;

  const addAgendamento = (novo) => {
    setAgenda((prev) => {
      const idx = prev.findIndex((a) => a.time === novo.time);
      const next = idx >= 0 ? prev.map((a, i) => (i === idx ? novo : a)) : [...prev, novo];
      return [...next].sort((a, b) => a.time.localeCompare(b.time));
    });
    setShowNovoAgendamento(false);
  };

  const addRecebimento = (novo) => {
    setTransactions((prev) => [...prev, { id: Date.now(), ...novo }]);
    setShowNovoRecebimento(false);
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "36px clamp(16px,4vw,24px) 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
        <div>
          <h1 className="display" style={{ fontSize: "clamp(24px,5vw,32px)", fontWeight: 600, margin: "0 0 4px" }}>Painel de hoje</h1>
          <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>Sábado, 9 de agosto</p>
        </div>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, background: C.card, border: `1px solid ${C.line}`, color: C.muted, fontSize: 13, fontWeight: 500 }}>
          <LogOut size={15} /> Sair
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ display: "grid", gap: 14, marginBottom: 30 }}>
        <Kpi icon={<Wallet size={18} />} label="Receita do dia" value={brl(receita + produtos)} accent={C.sage} />
        <Kpi icon={<TrendingUp size={18} />} label="Serviços" value={brl(receita)} accent={C.aubergine} />
        <Kpi icon={<ShoppingBag size={18} />} label="Produtos" value={brl(produtos)} accent={C.gold} />
        <Kpi icon={<Users size={18} />} label="Atendimentos" value={String(atendimentos)} accent="#C88B84" />
      </div>

      <div className="gestao-grid" style={{ display: "grid", gap: 22, alignItems: "start" }}>
        {/* Agenda */}
        <div style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Agenda</div>
            <button onClick={() => setShowNovoAgendamento(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, background: "#F7F3EE", border: `1px solid ${C.line}`, color: C.aubergine, fontSize: 12, fontWeight: 600 }}>
              <Plus size={13} /> Agendamento
            </button>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {agenda.map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderRadius: 12,
                background: a.status === "livre" ? "#FBF8F3" : "#fff",
                border: `1px solid ${C.line}`,
                opacity: a.status === "livre" ? 0.6 : 1,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 62, color: C.muted, fontSize: 13, fontWeight: 500 }}>
                  <Clock size={13} /> {a.time}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.cliente}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{a.serv} {a.pro !== "—" && `· ${a.pro}`}</div>
                </div>
                <StatusPill s={a.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Caixa + estoque */}
        <div style={{ display: "grid", gap: 22 }}>
          <div style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Caixa</div>
              <button onClick={() => setShowNovoRecebimento(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 8, background: "#F7F3EE", border: `1px solid ${C.line}`, color: C.aubergine, fontSize: 12, fontWeight: 600 }}>
                <Plus size={13} /> Recebimento
              </button>
            </div>
            <Row label="Entradas" value={brl(receita + produtos)} color={C.sage} />
            <Row label="Saídas" value={"- " + brl(despesa)} color="#C88B84" />
            <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 12 }}>
              <Row label="Saldo" value={brl(receita + produtos - despesa)} bold />
            </div>
          </div>

          <div style={{ background: C.card, borderRadius: 18, padding: 22, border: `1px solid ${C.line}` }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 14 }}>Estoque baixo</div>
            {PRODUCTS.filter((p) => p.stock <= 12).map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}>
                <span>{p.name}</span>
                <span style={{ fontWeight: 600, color: p.stock <= 8 ? "#C88B84" : C.muted }}>{p.stock} un</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showNovoAgendamento && <NovoAgendamentoModal onClose={() => setShowNovoAgendamento(false)} onSave={addAgendamento} />}
      {showNovoRecebimento && <NovoRecebimentoModal onClose={() => setShowNovoRecebimento(false)} onSave={addRecebimento} />}
    </div>
  );
}

function NovoAgendamentoModal({ onClose, onSave }) {
  const [cliente, setCliente] = useState("");
  const [servicoId, setServicoId] = useState(SERVICES[0].id);
  const [time, setTime] = useState(SLOTS[0]);

  const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, outline: "none", background: "#fff", color: C.ink };

  const submit = (e) => {
    e.preventDefault();
    if (!cliente.trim()) return;
    const s = SERVICES.find((x) => x.id === Number(servicoId));
    onSave({ time, cliente: cliente.trim(), serv: s.name, pro: s.pro, status: "confirmado" });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(42,35,32,.5)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: 28, maxWidth: 360, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", color: C.muted }}><X size={20} /></button>
        <h3 className="display" style={{ fontSize: 20, margin: "0 0 18px" }}>Novo agendamento</h3>
        <form onSubmit={submit}>
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome da cliente" style={inputStyle} autoFocus />
          <select value={servicoId} onChange={(e) => setServicoId(e.target.value)} style={{ ...inputStyle, marginTop: 10 }}>
            {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.pro}</option>)}
          </select>
          <select value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputStyle, marginTop: 10 }}>
            {SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="submit" style={{ width: "100%", padding: 13, borderRadius: 12, fontWeight: 600, fontSize: 15, background: C.gold, color: "#fff", marginTop: 16 }}>Adicionar à agenda</button>
        </form>
      </div>
    </div>
  );
}

function NovoRecebimentoModal({ onClose, onSave }) {
  const [desc, setDesc] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("servico");

  const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 14, outline: "none", background: "#fff", color: C.ink };

  const submit = (e) => {
    e.preventDefault();
    const v = Number(String(value).replace(",", "."));
    if (!desc.trim() || !v || v <= 0) return;
    onSave({ desc: desc.trim(), value: v, type });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(42,35,32,.5)", display: "grid", placeItems: "center", zIndex: 50, padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 22, padding: 28, maxWidth: 360, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", color: C.muted }}><X size={20} /></button>
        <h3 className="display" style={{ fontSize: 20, margin: "0 0 18px" }}>Registrar recebimento</h3>
        <form onSubmit={submit}>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descrição (ex: Sinal Ana Beatriz)" style={inputStyle} autoFocus />
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor (R$)" inputMode="decimal" style={{ ...inputStyle, marginTop: 10 }} />
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...inputStyle, marginTop: 10 }}>
            <option value="servico">Entrada · Serviço</option>
            <option value="produto">Entrada · Produto</option>
            <option value="despesa">Saída · Despesa</option>
          </select>
          <button type="submit" style={{ width: "100%", padding: 13, borderRadius: 12, fontWeight: 600, fontSize: 15, background: C.gold, color: "#fff", marginTop: 16 }}>Registrar</button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Componentes auxiliares
// ─────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, icon, label, count }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, fontSize: 14, fontWeight: 500,
      background: active ? C.aubergine : C.card, color: active ? "#fff" : C.ink, border: `1px solid ${active ? C.aubergine : C.line}`,
    }}>
      {icon}{label}
      {count > 0 && <span style={{ background: C.gold, color: "#fff", borderRadius: 20, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>{count}</span>}
    </button>
  );
}

function Kpi({ icon, label, value, accent }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, padding: 18, border: `1px solid ${C.line}` }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: accent + "22", color: accent, display: "grid", placeItems: "center", marginBottom: 12 }}>{icon}</div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 3 }}>{label}</div>
      <div className="display" style={{ fontSize: 21, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function StatusPill({ s }) {
  const map = { confirmado: ["#EEF1E9", C.sage, "Confirmado"], pendente: ["#FBF1E4", C.gold, "Pendente"], livre: ["#F0EDE8", C.muted, "Livre"] };
  const [bg, col, txt] = map[s];
  return <span style={{ background: bg, color: col, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20 }}>{txt}</span>;
}

function Row({ label, value, color, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, fontWeight: bold ? 600 : 400 }}>
      <span style={{ color: bold ? C.ink : C.muted }}>{label}</span>
      <span style={{ color: color || C.ink, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
