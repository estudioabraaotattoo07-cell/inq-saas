import { useMemo } from "react";
import { STAGES } from "../lib/helpers";
import type { Cliente, Artista, Financeiro } from "../lib/types";

interface DashboardProps {
  clients: Cliente[];
  artists: Artista[];
  fin: Financeiro[];
  totalFat: number;
  onVerCliente: (c: Cliente) => void;
  aName: (id: string) => string;
  aStyle: (id: string) => React.CSSProperties;
  aClass: (id: string) => string;
}

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

export default function Dashboard({
  clients, artists, fin, totalFat,
  onVerCliente, aName, aStyle, aClass
}: DashboardProps) {

  // ── DADOS ────────────────────────────────────────────────────────────────
  const origC = useMemo(() => {
    const m: Record<string, number> = {};
    clients.forEach(c => { m[c.orig] = (m[c.orig] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [clients]);

  const estilos = useMemo(() => {
    const m: Record<string, number> = {};
    clients.filter(c => c.estilo).forEach(c => { m[c.estilo] = (m[c.estilo] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [clients]);

  const alertas = useMemo(() =>
    clients.filter(c => miss(c).length > 0 || churn(c) || c.orcamento),
    [clients]
  );

  const reativacao = useMemo(() =>
    clients
      .filter(c => !["blacklist", "tatuado", "pos_venda"].includes(c.etapa) && c.dias >= 30)
      .sort((a, b) => b.dias - a.dias)
      .slice(0, 5),
    [clients]
  );

  const paraExcluir = useMemo(() =>
    clients.filter(c => c.dias >= 40 && c.etapa === "qualificacao"),
    [clients]
  );

  const maxO = origC[0]?.[1] || 1;
  const maxE = estilos[0]?.[1] || 1;

  const mesAtual = new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="dw">
      <div className="dgrid">

        {/* ── ORIGEM DOS LEADS ── */}
        <div className="dcard">
          <div className="dch">📍 Origem dos Leads</div>
          <div className="dcb">
            {origC.length === 0
              ? <div style={{ color: "var(--tx3)", fontSize: 12 }}>Nenhum dado ainda.</div>
              : origC.map(([o, c]) => (
                <div className="br-row" key={o}>
                  <div className="br-lbl">{o}</div>
                  <div className="br-trk">
                    <div className="br-fil" style={{ width: (c / maxO * 100) + "%", background: "var(--gold)" }} />
                  </div>
                  <div className="br-val">{c}</div>
                </div>
              ))}
          </div>
        </div>

        {/* ── ESTILOS DEMANDADOS ── */}
        <div className="dcard">
          <div className="dch">🎨 Estilos Demandados</div>
          <div className="dcb">
            {estilos.length === 0
              ? <div style={{ color: "var(--tx3)", fontSize: 12 }}>Nenhum dado ainda.</div>
              : estilos.map(([e, c]) => (
                <div className="br-row" key={e}>
                  <div className="br-lbl">{e}</div>
                  <div className="br-trk">
                    <div className="br-fil" style={{ width: (c / maxE * 100) + "%", background: "var(--ab)" }} />
                  </div>
                  <div className="br-val">{c}</div>
                </div>
              ))}
          </div>
        </div>

        {/* ── PIPELINE ── */}
        <div className="dcard">
          <div className="dch">📊 Pipeline</div>
          <div className="dcb">
            {STAGES.map(s => {
              const c = clients.filter(x => x.etapa === s.id).length;
              return c > 0 ? (
                <div className="br-row" key={s.id}>
                  <div className="br-lbl">{s.emoji} {s.label}</div>
                  <div className="br-trk">
                    <div className="br-fil" style={{ width: (c / Math.max(clients.length, 1) * 100) + "%", background: s.color }} />
                  </div>
                  <div className="br-val">{c}</div>
                </div>
              ) : null;
            })}
          </div>
        </div>

        {/* ── ALERTAS ── */}
        <div className="dcard">
          <div className="dch">⚠️ Alertas Ativos</div>
          <div className="dcb">
            {alertas.length === 0
              ? <div style={{ color: "var(--tx3)", fontSize: 12 }}>✓ Nenhum alerta</div>
              : alertas.map(c => {
                const m = miss(c);
                const ch = churn(c);
                return (
                  <div key={c.id} onClick={() => onVerCliente(c)}
                    style={{ padding: "8px 10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, marginBottom: 5, cursor: "pointer" }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, marginBottom: 3 }}>{c.nome}</div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {m.map(x => <span key={x} className="atag">⚠ Sem {x}</span>)}
                      {ch === "orange" && <span className="co co-o">🟠 6m</span>}
                      {ch === "red" && <span className="co co-r">🔴 1a</span>}
                      {c.orcamento && <span className="atag">💰 Orçamento</span>}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* ── DESEMPENHO POR ARTISTA ── */}
        <div className="dcard">
          <div className="dch">👥 Desempenho por Artista</div>
          <div className="dcb">
            {artists.filter(a => a.ativo).map(a => {
              const clts = clients.filter(c => c.artista === a.id);
              const fat = fin.filter(f => f.artista === a.id).reduce((s, f) => s + f.val_a, 0);
              const npsClts = clts.filter(c => c.nps != null);
              const npsA = npsClts.length
                ? Math.round(npsClts.reduce((s, c) => s + (c.nps || 0), 0) / npsClts.length * 10) / 10
                : "—";
              const tatuados = clts.filter(c => c.etapa === "tatuado" || c.etapa === "pos_venda").length;
              return (
                <div key={a.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span className={("at " + aClass(a.id)) || ""} style={aStyle(a.id)}>
                      {a.nome.split(" ")[0]}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--tx2)" }}>
                      {clts.length} clientes · R$ {fat.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 4 }}>
                    NPS Médio: <strong style={{ color: "var(--gold)" }}>{npsA}</strong>
                    <span style={{ marginLeft: 10 }}>
                      🎨 {a.com}% / 🏠 {100 - a.com}%
                    </span>
                  </div>
                  <div className="br-row">
                    <div className="br-lbl" style={{ fontSize: 11 }}>Tatuados</div>
                    <div className="br-trk">
                      <div className="br-fil" style={{
                        width: (tatuados / Math.max(clts.length, 1) * 100) + "%",
                        background: a.cor
                      }} />
                    </div>
                    <div className="br-val">{tatuados}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── METAS ── */}
        <div className="dcard">
          <div className="dch">🎯 Metas — {mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1)}</div>
          <div className="dcb">
            {[
              { l: "Sessões", v: fin.filter(f => f.val_a > 0).length, m: 10 },
              { l: "Fat. R$k", v: Math.round(totalFat / 1000), m: 15 },
              { l: "Leads", v: clients.length, m: 20 },
              { l: "NPS 9+", v: clients.filter(c => (c.nps || 0) >= 9).length, m: 5 },
            ].map((mt, i) => {
              const pct = Math.min(mt.v / mt.m * 100, 100);
              return (
                <div key={i} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "var(--tx)" }}>{mt.l}</span>
                    <span style={{ fontSize: 11, color: pct >= 100 ? "var(--q3)" : "var(--tx2)" }}>
                      {mt.v}/{mt.m} {pct >= 100 ? "✓" : ""}
                    </span>
                  </div>
                  <div className="mt-trk">
                    <div className="mt-fil" style={{
                      width: pct + "%",
                      background: pct >= 100 ? "var(--q3)" : "var(--gold)"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FILA DE REATIVAÇÃO ── */}
        <div className="dcard" style={{ gridColumn: "1 / -1" }}>
          <div className="dch">🔄 Fila de Reativação</div>
          <div className="dcb">
            {reativacao.length === 0
              ? <div style={{ color: "var(--tx3)", fontSize: 12 }}>Nenhum cliente para reativar.</div>
              : reativacao.map(c => (
                <div key={c.id} onClick={() => onVerCliente(c)}
                  style={{ padding: "8px 10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, marginBottom: 5, cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>{c.nome}</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)" }}>{c.dias} dias sem movimento · {c.qual}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: c.qual === "Q1" ? "var(--q1)" : c.qual === "Q2" ? "var(--q2)" : "var(--q3)" }}>
                    {c.qual === "Q1" ? "Enviar conteúdo educativo" : c.qual === "Q2" ? "Convite direto" : "Oferta especial"}
                  </div>
                </div>
              ))
            }
            {paraExcluir.length > 0 && (
              <div style={{ marginTop: 8, padding: "8px 11px", background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 6, fontSize: 11, color: "var(--q1)" }}>
                ⚠ {paraExcluir.length} lead{paraExcluir.length > 1 ? "s" : ""} com +40 dias sem resposta — prontos para exclusão.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
