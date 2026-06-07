import { useState, useMemo, useEffect } from "react";
import { sb, dbGet } from "./lib/supabase";
import { applyTheme, ARTISTS_INIT, HORARIOS_INIT } from "./lib/helpers";
import type { Cliente, Artista, Financeiro, Saida, Evento, Horario } from "./lib/types";

// ── COMPONENTES ───────────────────────────────────────────────────────────────
import Agenda from "./components/Agenda";
import Artistas from "./components/Artistas";
import Clientes from "./components/Clientes";
import ContratosPage, { ContratoModal } from "./components/Contratos";
import type { ContratoOpts } from "./components/Contratos";
import Dashboard from "./components/Dashboard";
import Disparos from "./components/Disparos";
import FinanceiroComp from "./components/Financeiro";
import Pipeline from "./components/Pipeline";
import PosVenda from "./components/PosVenda";
import Settings from "./components/Settings";

// ── CSS ───────────────────────────────────────────────────────────────────────
// O CSS continua sendo importado do arquivo original via index.css ou inline
// Se o projeto usa CSS-in-JS, mantenha o import do S original aqui

// ── HELPERS LOCAIS ─────────────────────────────────────────────────────────────
function miss(c: Cliente) {
  const m: string[] = [];
  if (!c.email) m.push("Email");
  if (!c.insta) m.push("Instagram");
  return m;
}

function churn(c: Cliente) {
  if (c.etapa !== "tatuado" && c.etapa !== "pos_venda") return null;
  if (c.dias >= 365) return "red";
  if (c.dias >= 180) return "orange";
  return null;
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function CRM() {
  // ── CONFIG DO ESTÚDIO ──────────────────────────────────────────────────
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [onbStep, setOnbStep] = useState(0);
  const [dark, setDark] = useState(true);
  const [studioName, setStudioName] = useState("A Casa dos Carvalho");
  const [studioTel, setStudioTel] = useState("(27) 99999-0000");
  const [studioOwner, setStudioOwner] = useState("Abraão Carvalho");
  const [studioEmail, setStudioEmail] = useState("");
  const [studioCity, setStudioCity] = useState("Vitória — ES");
  const [studioInsta, setStudioInsta] = useState("@acasadoscarvalho");
  const [auraName, setAuraName] = useState("Aura");
  const [googleLink, setGoogleLink] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [metaMensal, setMetaMensal] = useState(15000);
  const [horarios, setHorarios] = useState<Horario[]>(HORARIOS_INIT);

  // ── DADOS ──────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<Cliente[]>([]);
  const [artists, setArtists] = useState<Artista[]>(ARTISTS_INIT as Artista[]);
  const [fin, setFin] = useState<Financeiro[]>([]);
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [agEvents, setAgEvents] = useState<Evento[]>([]);

  // ── UI ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("kanban");
  const [sel, setSel] = useState<Cliente | null>(null);
  const [fa, setFa] = useState("todos");
  const [srch, setSrch] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCtr, setShowCtr] = useState<ContratoOpts | null>(null);
  const [dbReady, setDbReady] = useState(false);

  // ── TEMA ────────────────────────────────────────────────────────────────
  useMemo(() => applyTheme(dark), [dark]);

  // ── CSS GLOBAL ──────────────────────────────────────────────────────────
  useEffect(() => {
    // O CSS inline (S) é importado do arquivo original
    // Se já está em index.css, remova este bloco
  }, []);

  // ── CARREGAR SUPABASE ───────────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      if (!sb) { setDbReady(true); return; }
      try {
        const [cls, arts, fins, sds, ags, cfgs] = await Promise.all([
          dbGet("clientes"), dbGet("artistas"), dbGet("financeiro"),
          dbGet("saidas"), dbGet("agenda"), dbGet("configuracoes")
        ]);
        if (cls && cls.length > 0) setClients(cls.map((c: any) => ({
          ...c,
          hist: c.hist || [], pv: c.followups || [],
          faltas: c.faltas || 0, indicacoes: c.indicacoes || 0,
          credito: c.credito || 0, desc: c.descricao || "",
        })));
        if (arts && arts.length > 0) setArtists(arts);
        if (fins && fins.length > 0) setFin(fins.map((f: any) => ({ ...f, cliente: f.cliente_nome })));
        if (sds && sds.length > 0) setSaidas(sds.map((s: any) => ({ ...s, desc: s.descricao })));
        if (ags && ags.length > 0) setAgEvents(ags.map((a: any) => {
          const startH = parseInt(a.hora?.split(":")[0] || "9");
          const endH = a.hora_fim ? parseInt(a.hora_fim.split(":")[0]) : startH + 2;
          return { ...a, title: a.titulo || a.cliente_nome || "Sem título", start: startH, end: endH };
        }));
        if (cfgs && cfgs.length > 0) {
          const cfg = cfgs[0];
          if (cfg.studio_name) setStudioName(cfg.studio_name);
          if (cfg.studio_tel) setStudioTel(cfg.studio_tel);
          if (cfg.studio_owner) setStudioOwner(cfg.studio_owner);
          if (cfg.studio_email) setStudioEmail(cfg.studio_email);
          if (cfg.studio_city) setStudioCity(cfg.studio_city);
          if (cfg.studio_insta) setStudioInsta(cfg.studio_insta);
          if (cfg.aura_name) setAuraName(cfg.aura_name);
          if (cfg.google_link) setGoogleLink(cfg.google_link);
          if (cfg.cnpj) setCnpj(cfg.cnpj);
          if (cfg.meta_mensal) setMetaMensal(cfg.meta_mensal);
          if (cfg.horarios) setHorarios(cfg.horarios);
          setDark(cfg.dark_mode !== false);
          setOnboardingDone(true);
        }
      } catch (e) { console.error("Erro ao carregar dados:", e); }
      setDbReady(true);
    }
    loadAll();
  }, []);

  // ── HELPERS DE ARTISTA ──────────────────────────────────────────────────
  const aName = (id: string) => artists.find(a => a.id === id)?.nome || (id === "abraao" ? "Abraão" : "Camilla");
  const aColor = (id: string) => artists.find(a => a.id === id)?.cor || "#C9A84C";
  const aClass = (id: string) => id === "abraao" ? "at-abraao" : id === "camilla" ? "at-camilla" : "";
  const aStyle = (id: string): React.CSSProperties => {
    const a = artists.find(x => x.id === id);
    if (!a || id === "abraao" || id === "camilla") return {};
    const hex = a.cor || "#C9A84C";
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return { background: `rgba(${r},${g},${b},.15)`, color: a.cor, border: `1px solid rgba(${r},${g},${b},.25)` };
  };

  // ── STATS ───────────────────────────────────────────────────────────────
  const stats = {
    total: clients.length,
    ativos: clients.filter(c => !["hibernacao", "blacklist"].includes(c.etapa)).length,
    tatuados: clients.filter(c => c.etapa === "tatuado" || c.etapa === "pos_venda").length,
    hoje: clients.filter(c => c.data === new Date().toLocaleDateString("pt-BR")).length
  };
  const totalFat = fin.reduce((s, f) => s + f.val_a, 0);
  const alertas = useMemo(() => clients.filter(c => miss(c).length > 0 || churn(c) || c.orcamento), [clients]);

  // ── ONBOARDING ──────────────────────────────────────────────────────────
  if (!onboardingDone) {
    const onbSteps = ["Estúdio", "Horários", "Artistas", "Concluído"];
    return (
      <div style={{ minHeight: "100vh", background: "#0E0E0E", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ background: "#161616", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 14, width: "100%", maxWidth: 540, overflow: "hidden" }}>
          <div style={{ padding: "26px 30px 18px", background: "#1E1E1E", borderBottom: "1px solid rgba(201,168,76,0.12)", textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, fontWeight: 700, color: "#C9A84C", letterSpacing: ".1em" }}>IN-QUADRA</div>
            <div style={{ fontSize: 11, color: "#8A8070", marginTop: 5, letterSpacing: ".1em", textTransform: "uppercase" }}>Ink System</div>
          </div>
          <div style={{ display: "flex", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
            {onbSteps.map((s, i) => (
              <div key={s} style={{ flex: 1, padding: "9px 5px", textAlign: "center", fontSize: 10, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: i === onbStep ? "#C9A84C" : i < onbStep ? "#27AE60" : "#555045", borderBottom: i === onbStep ? "2px solid #C9A84C" : "2px solid transparent" }}>
                {i < onbStep ? "✓ " : ""}{s}
              </div>
            ))}
          </div>

          {/* Passo 0 — Estúdio */}
          {onbStep === 0 && (
            <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 14, color: "#E8E2D9", fontWeight: 600, marginBottom: 4 }}>Bem-vindo! Vamos configurar seu estúdio.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { l: "Nome do Estúdio *", v: studioName, s: setStudioName, p: "A Casa dos Carvalho" },
                  { l: "Nome do Responsável *", v: studioOwner, s: setStudioOwner, p: "Seu nome" },
                  { l: `WhatsApp da ${auraName} *`, v: studioTel, s: setStudioTel, p: "(27) 99999-0000" },
                  { l: "Email do Estúdio", v: studioEmail, s: setStudioEmail, p: "contato@estudio.com" },
                  { l: "Cidade e Estado", v: studioCity, s: setStudioCity, p: "Vitória — ES" },
                  { l: "Instagram do Estúdio", v: studioInsta, s: setStudioInsta, p: "@acasadoscarvalho" },
                  { l: "Nome da IA de Atendimento", v: auraName, s: setAuraName, p: "Aura" },
                  { l: "Link Google Meu Negócio", v: googleLink, s: setGoogleLink, p: "https://g.page/..." },
                  { l: "CNPJ", v: cnpj, s: setCnpj, p: "00.000.000/0001-00" },
                ].map(({ l, v, s, p }) => (
                  <div key={l} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>{l}</label>
                    <input className="fi" value={v} onChange={e => s(e.target.value)} placeholder={p} />
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#555045", marginTop: 2 }}>
                O WhatsApp será vinculado à {auraName} para atendimento automatizado.
              </div>
            </div>
          )}

          {/* Passo 1 — Horários */}
          {onbStep === 1 && (
            <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 14, color: "#E8E2D9", fontWeight: 600, marginBottom: 4 }}>Horários de funcionamento</div>
              <div style={{ fontSize: 11, color: "#555045", marginBottom: 6 }}>A Aura atende 24h. Estes horários são para a agenda interna.</div>
              {horarios.map((h, i) => (
                <div key={h.dia} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#E8E2D9", width: 70, flexShrink: 0 }}>{h.dia}</div>
                  <div style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", position: "relative", flexShrink: 0, transition: "background .2s", background: h.aberto ? "#27AE60" : "#303030" }}
                    onClick={() => setHorarios(p => p.map((x, j) => j === i ? { ...x, aberto: !x.aberto } : x))}>
                    <div style={{ width: 16, height: 16, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, transition: "left .2s", left: h.aberto ? "18px" : "2px" }} />
                  </div>
                  {h.aberto ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <input className="fi" type="time" value={h.ini} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, ini: e.target.value } : x))} style={{ width: 90, padding: "4px 7px" }} />
                      <span style={{ fontSize: 12, color: "#8A8070" }}>às</span>
                      <input className="fi" type="time" value={h.fim} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, fim: e.target.value } : x))} style={{ width: 90, padding: "4px 7px" }} />
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "#555045", fontStyle: "italic", flex: 1 }}>Fechado</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Passo 2 — Artistas */}
          {onbStep === 2 && (
            <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 14, color: "#E8E2D9", fontWeight: 600, marginBottom: 4 }}>Artistas do estúdio</div>
              {artists.map(a => (
                <div key={a.id} style={{ background: "#1E1E1E", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, color: a.cor }}>{a.nome}</div>
                    <div style={{ fontSize: 11, color: "#8A8070", marginTop: 2 }}>{a.role === "residente" ? "Residente" : "Guest"} · {a.com}% comissão</div>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27AE60" }} />
                </div>
              ))}
              <button className="btn-new" style={{ marginTop: 4, alignSelf: "flex-start" }}
                onClick={() => setTab("artistas")}>
                + Adicionar Artista
              </button>
            </div>
          )}

          {/* Passo 3 — Concluído */}
          {onbStep === 3 && (
            <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>🖤</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 600, color: "#C9A84C" }}>Tudo pronto!</div>
              <div style={{ fontSize: 13, color: "#8A8070", lineHeight: 1.7 }}>
                <strong style={{ color: "#E8E2D9" }}>{studioName}</strong> está configurado.<br />Bem-vindo ao In-Quadra Ink System.
              </div>
            </div>
          )}

          <div style={{ padding: "14px 28px", borderTop: "1px solid rgba(201,168,76,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#555045" }}>{onbStep + 1} de {onbSteps.length}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {onbStep > 0 && <button className="btn-c" onClick={() => setOnbStep(s => s - 1)}>Voltar</button>}
              {onbStep < 3 && (
                <button className="btn-s" disabled={onbStep === 0 && (!studioName || !studioOwner || !studioTel)} onClick={() => setOnbStep(s => s + 1)}>
                  {onbStep === 2 ? "Concluir" : "Continuar"}
                </button>
              )}
              {onbStep === 3 && <button className="btn-s" onClick={() => setOnboardingDone(true)}>Entrar no Sistema →</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING ─────────────────────────────────────────────────────────────
  if (!dbReady) {
    return (
      <div style={{ minHeight: "100vh", background: "#0E0E0E", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: "#C9A84C", letterSpacing: ".1em" }}>IN-QUADRA</div>
        <div style={{ fontSize: 12, color: "#8A8070" }}>Carregando...</div>
      </div>
    );
  }

  // ── RENDER PRINCIPAL ────────────────────────────────────────────────────
  return (
    <div className="root">
      {/* ── TOPBAR ── */}
      <div className="topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="bmark">C</div>
          <div style={{ cursor: "pointer" }} onClick={() => setShowSettings(true)}>
            <div className="bname">{studioName}</div>
            <div className="bsub">In-Quadra Ink System</div>
            {cnpj && <div style={{ fontSize: 9, color: "var(--tx3)", letterSpacing: ".08em" }}>CNPJ: {cnpj}</div>}
          </div>
        </div>
        <div className="tbr">
          {alertas.length > 0 && (
            <div style={{ position: "relative" }}>
              <div className="alert-btn" onClick={() => setShowAlerts(v => !v)}>
                ⚠️ {alertas.length} alerta{alertas.length > 1 ? "s" : ""}
              </div>
            </div>
          )}
          <button className="theme-btn" onClick={() => setDark(d => !d)}>{dark ? "☀️" : "🌙"}</button>
          <button className="btn-new" onClick={() => document.getElementById("__openNovoCliente")?.click()}>
            + Novo Cliente
          </button>
        </div>
      </div>

      {/* ── DROPDOWN ALERTAS ── */}
      {showAlerts && alertas.length > 0 && (
        <div style={{ position: "fixed", top: 64, right: 16, width: "min(360px, calc(100vw - 32px))", background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,.5)", zIndex: 9999 }}>
          <div className="ad-hdr">Alertas — por prioridade</div>
          <div className="ad-body">
            {alertas.map(c => {
              const m = miss(c); const ch = churn(c);
              return (
                <div key={c.id} className="ad-item" onClick={() => { setSel(c); setShowAlerts(false); }}>
                  <div className="ad-name">{c.nome}</div>
                  <div className="ad-tags">
                    {ch === "red" && <span className="co co-r">🔴 1 ano sem retorno</span>}
                    {ch === "orange" && <span className="co co-o">🟠 6 meses sem retorno</span>}
                    {c.orcamento && <span className="atag">💰 Orçamento</span>}
                    {m.map(x => <span key={x} className="atag">⚠ Sem {x}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="tabs">
        {[
          { id: "kanban", l: "Pipeline", i: "📋" },
          { id: "clientes", l: "Clientes", i: "👥" },
          { id: "agenda", l: "Agenda", i: "📅" },
          { id: "financeiro", l: "Financeiro", i: "💰" },
          { id: "artistas", l: "Artistas", i: "🎨" },
          { id: "contratos", l: "Contratos", i: "📄" },
          { id: "dashboard", l: "Dashboard", i: "📊" },
          { id: "posvenda", l: "Pós-venda", i: "💬" },
          { id: "disparos", l: "Disparos", i: "📣" },
        ].map(t => (
          <button key={t.id} className={"tab" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
            {t.i} {t.l}
          </button>
        ))}
      </div>

      {/* ── STATS ── */}
      <div className="stats">
        {[
          { i: "👥", v: stats.total, l: "Total", bg: "rgba(201,168,76,.1)" },
          { i: "✅", v: stats.ativos, l: "Ativos", bg: "rgba(91,141,239,.1)" },
          { i: "🖤", v: stats.tatuados, l: "Tatuados", bg: "rgba(39,174,96,.1)" },
          { i: "📅", v: stats.hoje, l: "Hoje", bg: "rgba(155,107,181,.1)" },
        ].map((s, i) => (
          <div className="si" key={i}>
            <div className="sico" style={{ background: s.bg }}>{s.i}</div>
            <div><div className="sv">{s.v}</div><div className="sl">{s.l}</div></div>
          </div>
        ))}
      </div>

      {/* ── FILTROS ── */}
      {(tab === "kanban" || tab === "clientes") && (
        <div className="ctrl">
          <input className="srch" placeholder="Buscar por nome, telefone, estilo, região..."
            value={srch} onChange={e => setSrch(e.target.value)} />
          {["todos", ...artists.filter(a => a.ativo).map(a => a.id)].map(f => (
            <button key={f} className={"fb" + (fa === f ? " on" : "")} onClick={() => setFa(f)}>
              {f === "todos" ? "Todos" : aName(f).split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* ── CONTEÚDO POR ABA ── */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

        {tab === "kanban" && (
          <Pipeline
            clients={clients.filter(c => {
              const mA = fa === "todos" || c.artista === fa;
              const mS = !srch || c.nome.toLowerCase().includes(srch.toLowerCase());
              return mA && mS;
            })}
            onVerCliente={setSel}
            aName={aName} aStyle={aStyle} aClass={aClass}
          />
        )}

        {(tab === "clientes" || sel) && (
          <Clientes
            clients={clients} setClients={setClients}
            artists={artists}
            agEvents={agEvents} setAgEvents={setAgEvents}
            tab={tab} srch={srch} fa={fa}
            sel={sel} setSel={setSel}
            onContrato={opts => setShowCtr(opts)}
            aName={aName} aStyle={aStyle} aClass={aClass}
            studioName={studioName}
          />
        )}

        {tab === "agenda" && (
          <Agenda agEvents={agEvents} setAgEvents={setAgEvents} />
        )}

        {tab === "financeiro" && (
          <FinanceiroComp
            fin={fin} setFin={setFin}
            saidas={saidas} setSaidas={setSaidas}
            artists={artists} clients={clients}
            metaMensal={metaMensal} setMetaMensal={setMetaMensal}
            onVerCliente={setSel}
            aName={aName} aStyle={aStyle} aClass={aClass}
          />
        )}

        {tab === "artistas" && (
          <Artistas
            artists={artists} setArtists={setArtists}
            clients={clients}
            onContrato={a => setShowCtr({ type: "artist", a })}
          />
        )}

        {tab === "contratos" && (
          <ContratosPage
            artists={artists}
            studioName={studioName}
            onVerContrato={opts => setShowCtr(opts)}
          />
        )}

        {tab === "dashboard" && (
          <Dashboard
            clients={clients} artists={artists}
            fin={fin} totalFat={fin.reduce((s, f) => s + f.val_a, 0)}
            onVerCliente={setSel}
            aName={aName} aStyle={aStyle} aClass={aClass}
          />
        )}

        {tab === "posvenda" && (
          <PosVenda
            clients={clients}
            onVerCliente={setSel}
            aName={aName} aStyle={aStyle} aClass={aClass}
          />
        )}

        {tab === "disparos" && (
          <Disparos clients={clients} />
        )}
      </div>

      {/* ── MODAL CONTRATO ── */}
      {showCtr && (
        <ContratoModal
          opts={showCtr}
          studioName={studioName}
          onClose={() => setShowCtr(null)}
        />
      )}

      {/* ── CONFIGURAÇÕES ── */}
      <Settings
        show={showSettings} onClose={() => setShowSettings(false)}
        studioName={studioName} setStudioName={setStudioName}
        studioTel={studioTel} setStudioTel={setStudioTel}
        studioOwner={studioOwner} setStudioOwner={setStudioOwner}
        studioEmail={studioEmail} setStudioEmail={setStudioEmail}
        studioCity={studioCity} setStudioCity={setStudioCity}
        studioInsta={studioInsta} setStudioInsta={setStudioInsta}
        auraName={auraName} setAuraName={setAuraName}
        googleLink={googleLink} setGoogleLink={setGoogleLink}
        cnpj={cnpj} setCnpj={setCnpj}
        metaMensal={metaMensal} setMetaMensal={setMetaMensal}
        horarios={horarios} setHorarios={setHorarios}
        dark={dark}
      />
    </div>
  );
}
