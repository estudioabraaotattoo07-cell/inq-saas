import { useState } from "react";
import { dbInsert, dbDelete } from "../lib/supabase";
import type { Financeiro as FinanceiroType, Saida, Artista, Cliente } from "../lib/types";

interface FinanceiroProps {
  fin: FinanceiroType[];
  setFin: React.Dispatch<React.SetStateAction<FinanceiroType[]>>;
  saidas: Saida[];
  setSaidas: React.Dispatch<React.SetStateAction<Saida[]>>;
  artists: Artista[];
  clients: Cliente[];
  metaMensal: number;
  setMetaMensal: (v: number) => void;
  onVerCliente: (c: Cliente) => void;
  aName: (id: string) => string;
  aStyle: (id: string) => React.CSSProperties;
  aClass: (id: string) => string;
}

const CATEGORIAS = ["Material", "Energia", "Internet", "Manutenção", "Marketing", "Pró-labore", "Outros"];

export default function Financeiro({
  fin, setFin, saidas, setSaidas,
  artists, clients, metaMensal, setMetaMensal,
  onVerCliente, aName, aStyle, aClass
}: FinanceiroProps) {
  const [showSaidaForm, setShowSaidaForm] = useState(false);
  const [saidaForm, setSaidaForm] = useState({
    desc: "", categoria: "Material", valor: 0,
    data: new Date().toLocaleDateString("pt-BR")
  });

  // ── CÁLCULOS ──────────────────────────────────────────────────────────────
  const totalEntradas = fin.reduce((s, f) => s + f.val_a, 0);
  const totalSaidas = saidas.reduce((s, x) => s + x.valor, 0);
  const totalRepasses = fin.reduce((s, f) => s + (f.val_a * f.com_sess / 100), 0);
  const saldoLiquido = totalEntradas - totalSaidas - totalRepasses;
  const progressoMeta = Math.min(totalEntradas / metaMensal * 100, 100);
  const diaAtual = new Date().getDate();
  const projecao = diaAtual > 0 ? Math.round((totalEntradas / diaAtual) * 30) : 0;
  const inadimplentes = clients.filter(c =>
    (c.etapa === "tatuado" || c.etapa === "pos_venda") && c.val_a > 0 && !c.pgto
  );

  const ticketMedio = (id: string) => {
    const ss = fin.filter(f => f.artista === id && f.val_a > 0);
    return ss.length > 0 ? Math.round(ss.reduce((s, f) => s + f.val_a, 0) / ss.length) : 0;
  };

  // ── ORIGEM DO FATURAMENTO ────────────────────────────────────────────────
  const origemFat = (() => {
    const m: Record<string, number> = {};
    fin.forEach(f => {
      const c = clients.find(x => x.nome === f.cliente);
      if (c) m[c.orig] = (m[c.orig] || 0) + f.val_a;
    });
    const max = Math.max(...Object.values(m), 1);
    return { m, max };
  })();

  // ── DIAS RENTÁVEIS ────────────────────────────────────────────────────────
  const diasRentaveis = (() => {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const m: Record<string, number> = {};
    fin.forEach(f => {
      const p = f.data.split("/");
      if (p.length === 3) {
        const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
        const dia = dias[d.getDay()];
        m[dia] = (m[dia] || 0) + f.val_a;
      }
    });
    const max = Math.max(...Object.values(m), 1);
    return { m, max, dias };
  })();

  const salvarSaida = async () => {
    if (!saidaForm.desc || saidaForm.valor <= 0) return;
    const nova: Saida = { id: Date.now(), ...saidaForm };
    const saved = await dbInsert("saidas", {
      descricao: nova.desc, categoria: nova.categoria,
      valor: nova.valor, data: nova.data
    });
    setSaidas(p => [...p, { ...nova, id: saved?.id || nova.id }]);
    setShowSaidaForm(false);
    setSaidaForm({ desc: "", categoria: "Material", valor: 0, data: new Date().toLocaleDateString("pt-BR") });
  };

  const removerSaida = async (s: Saida) => {
    if (!window.confirm("Remover esta saída?")) return;
    setSaidas(p => p.filter(x => x.id !== s.id));
    await dbDelete("saidas", s.id);
  };

  return (
    <div className="fw">
      {/* ── RESUMO ── */}
      <div className="fsum" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {[
          { l: "Entradas", v: "R$ " + totalEntradas.toLocaleString("pt-BR"), s: "Sessões realizadas", c: "var(--q3)" },
          { l: "Saídas", v: "R$ " + totalSaidas.toLocaleString("pt-BR"), s: "Despesas do estúdio", c: "var(--q1)" },
          { l: "Repasses", v: "R$ " + totalRepasses.toLocaleString("pt-BR"), s: "A pagar aos artistas", c: "var(--ab)" },
          { l: "Saldo Líquido", v: "R$ " + saldoLiquido.toLocaleString("pt-BR"), s: "Entradas − saídas − repasses", c: saldoLiquido >= 0 ? "var(--q3)" : "var(--q1)" },
        ].map((s, i) => (
          <div className="fsc" key={i}>
            <div className="fsl">{s.l}</div>
            <div className="fsv" style={{ color: s.c }}>{s.v}</div>
            <div className="fss">{s.s}</div>
          </div>
        ))}
      </div>

      {/* ── META MENSAL ── */}
      <div className="ftable">
        <div className="fth" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Meta Mensal</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--tx2)" }}>Meta: R$</span>
            <input className="ci" type="number" value={metaMensal}
              onChange={e => setMetaMensal(Number(e.target.value))}
              style={{ width: 90 }} />
          </div>
        </div>
        <div style={{ padding: "13px 15px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--tx2)" }}>
              R$ {totalEntradas.toLocaleString("pt-BR")} de R$ {metaMensal.toLocaleString("pt-BR")}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: progressoMeta >= 100 ? "var(--q3)" : "var(--gold)" }}>
              {Math.round(progressoMeta)}%
            </span>
          </div>
          <div style={{ width: "100%", background: "var(--dk4)", borderRadius: 4, height: 10, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4,
              background: progressoMeta >= 100 ? "var(--q3)" : "var(--gold)",
              width: progressoMeta + "%", transition: "width .4s"
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "var(--tx3)" }}>
              Projeção do mês: <strong style={{ color: "var(--tx)" }}>R$ {projecao.toLocaleString("pt-BR")}</strong>
            </span>
            <span style={{ fontSize: 11, color: "var(--tx3)" }}>
              Faltam: <strong style={{ color: "var(--gold)" }}>R$ {Math.max(metaMensal - totalEntradas, 0).toLocaleString("pt-BR")}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── DESEMPENHO POR ARTISTA ── */}
      <div className="ftable">
        <div className="fth">Desempenho por Artista</div>
        <div style={{ padding: "13px 15px", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
          {artists.filter(a => a.ativo).map(a => {
            const ss = fin.filter(f => f.artista === a.id && f.val_a > 0);
            const fat = ss.reduce((s, f) => s + f.val_a, 0);
            const repasse = ss.reduce((s, f) => s + (f.val_a * f.com_sess / 100), 0);
            const ticket = ticketMedio(a.id);
            return (
              <div key={a.id} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "11px 13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ ...aStyle(a.id), fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, padding: "2px 8px", borderRadius: 5 }}>
                    {a.nome.split(" ")[0]}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase" }}>{a.role}</span>
                </div>
                {[
                  { l: "Sessões", v: ss.length },
                  { l: "Faturamento", v: "R$ " + fat.toLocaleString("pt-BR") },
                  { l: "Ticket médio", v: ticket > 0 ? "R$ " + ticket.toLocaleString("pt-BR") : "—" },
                  { l: "Repasse", v: "R$ " + repasse.toLocaleString("pt-BR") },
                  { l: "🎨 Artista / 🏠 Estúdio", v: a.com + "% / " + (100 - a.com) + "%" },
                ].map((f, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--br)", fontSize: 11 }}>
                    <span style={{ color: "var(--tx2)" }}>{f.l}</span>
                    <span style={{ color: "var(--tx)", fontWeight: 600 }}>{String(f.v)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── REGISTRO DE SESSÕES ── */}
      <div className="ftable">
        <div className="fth">Registro de Sessões</div>
        <table className="ft">
          <thead>
            <tr><th>Cliente</th><th>Artista</th><th>Data</th><th>Valor</th><th>Pagto</th><th>Com %</th><th>Repasse</th><th>Status</th></tr>
          </thead>
          <tbody>
            {fin.map((f, fi) => {
              const div = f.val_c > 0 && f.val_a !== f.val_c;
              const rec = f.val_a * f.com_sess / 100;
              return (
                <tr key={f.id}>
                  <td style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14 }}>{f.cliente}</td>
                  <td>
                    <span style={aStyle(f.artista)} className={aClass(f.artista) ? "at " + aClass(f.artista) : ""}>
                      {aName(f.artista).split(" ")[0]}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: "var(--tx2)" }}>{f.data}</td>
                  <td style={{ fontWeight: 600, color: "var(--gold)" }}>
                    {f.val_a > 0 ? "R$ " + f.val_a.toLocaleString("pt-BR") : "—"}
                  </td>
                  <td style={{ fontSize: 11 }}>{f.pgto || "—"}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input className="ci" type="number" min={0} max={100} value={f.com_sess}
                        onChange={e => setFin(p => p.map((x, i) => i === fi ? { ...x, com_sess: Number(e.target.value) } : x))} />
                      <span style={{ fontSize: 11, color: "var(--tx2)" }}>%</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--q3)", fontWeight: 700, fontFamily: "'Cormorant Garamond',serif", fontSize: 14 }}>
                    {rec > 0 ? "R$ " + rec.toLocaleString("pt-BR") : "—"}
                  </td>
                  <td>
                    {div ? <span className="da">Divergência</span>
                      : f.val_a > 0 ? <span className="dok">OK</span>
                        : <span style={{ fontSize: 11, color: "var(--tx3)" }}>Pendente</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── SAÍDAS E DESPESAS ── */}
      <div className="ftable">
        <div className="fth" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Saídas e Despesas</span>
          <button className="btn-new" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setShowSaidaForm(true)}>
            + Lançar
          </button>
        </div>
        <table className="ft">
          <thead>
            <tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th></th></tr>
          </thead>
          <tbody>
            {saidas.map(s => (
              <tr key={s.id}>
                <td>{s.desc}</td>
                <td>
                  <span style={{ fontSize: 10, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 3, padding: "2px 6px", color: "var(--tx2)" }}>
                    {s.categoria}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: "var(--tx2)" }}>{s.data}</td>
                <td style={{ fontWeight: 600, color: "var(--q1)" }}>R$ {s.valor.toLocaleString("pt-BR")}</td>
                <td>
                  <button className="btn-sm" style={{ fontSize: 10, color: "var(--q1)" }} onClick={() => removerSaida(s)}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
            {saidas.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--tx3)", fontSize: 12, padding: 16 }}>Nenhuma saída registrada.</td></tr>
            )}
          </tbody>
        </table>
        <div style={{ padding: "10px 15px", background: "var(--dk3)", display: "flex", justifyContent: "flex-end", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--tx2)" }}>Total saídas:</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--q1)", fontFamily: "'Cormorant Garamond',serif" }}>
            R$ {totalSaidas.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      {/* ── INADIMPLÊNCIA ── */}
      {inadimplentes.length > 0 && (
        <div className="ftable">
          <div className="fth">Inadimplência</div>
          <div style={{ padding: "11px 15px", display: "flex", flexDirection: "column", gap: 6 }}>
            {inadimplentes.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 11px", background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 7 }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)" }}>Sessão realizada — pagamento não registrado</div>
                </div>
                <button className="btn-sm gold" onClick={() => onVerCliente(c)}>Ver ficha</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GRÁFICOS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="ftable">
          <div className="fth">Origem do Faturamento</div>
          <div style={{ padding: "13px 15px" }}>
            {Object.entries(origemFat.m).sort((a, b) => b[1] - a[1]).map(([o, v]) => (
              <div className="br-row" key={o}>
                <div className="br-lbl" style={{ fontSize: 10 }}>{o}</div>
                <div className="br-trk">
                  <div className="br-fil" style={{ width: (v / origemFat.max * 100) + "%", background: "var(--gold)" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--tx)", width: 60, textAlign: "right", flexShrink: 0 }}>
                  R$ {v.toLocaleString("pt-BR")}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="ftable">
          <div className="fth">Dias Mais Rentáveis</div>
          <div style={{ padding: "13px 15px" }}>
            {diasRentaveis.dias.map(dia => (
              <div className="br-row" key={dia}>
                <div className="br-lbl" style={{ fontSize: 11 }}>{dia}</div>
                <div className="br-trk">
                  <div className="br-fil" style={{ width: ((diasRentaveis.m[dia] || 0) / diasRentaveis.max * 100) + "%", background: "var(--ab)" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--tx)", width: 60, textAlign: "right", flexShrink: 0 }}>
                  {diasRentaveis.m[dia] ? "R$ " + diasRentaveis.m[dia].toLocaleString("pt-BR") : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── NOTA FISCAL ── */}
      <div style={{ background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.2)", borderRadius: 8, padding: "11px 15px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🧾</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>Nota Fiscal</div>
          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
            Integração com emissão de notas em breve. O número da nota será vinculado a cada sessão e enviado automaticamente pela Aura.
          </div>
        </div>
      </div>

      {/* ── MODAL LANÇAR SAÍDA ── */}
      {showSaidaForm && (
        <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowSaidaForm(false); }}>
          <div className="fmod" style={{ maxWidth: 420 }}>
            <div className="fmh">
              <div className="fmt">Lançar Saída</div>
              <button className="mc" onClick={() => setShowSaidaForm(false)}>✕</button>
            </div>
            <div className="fmb">
              <div className="ff">
                <label className="fl">Descrição *</label>
                <input className="fi" placeholder="Ex: Agulhas e tintas" value={saidaForm.desc}
                  onChange={e => setSaidaForm({ ...saidaForm, desc: e.target.value })} />
              </div>
              <div className="fr">
                <div className="ff">
                  <label className="fl">Categoria</label>
                  <select className="fs" value={saidaForm.categoria}
                    onChange={e => setSaidaForm({ ...saidaForm, categoria: e.target.value })}>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ff">
                  <label className="fl">Valor (R$)</label>
                  <input className="fi" type="number" min={0} value={saidaForm.valor}
                    onChange={e => setSaidaForm({ ...saidaForm, valor: Number(e.target.value) })} />
                </div>
              </div>
              <div className="ff">
                <label className="fl">Data</label>
                <input className="fi" type="date"
                  onChange={e => {
                    const p = e.target.value.split("-");
                    setSaidaForm({ ...saidaForm, data: p[2] + "/" + p[1] + "/" + p[0] });
                  }} />
              </div>
            </div>
            <div className="fmf">
              <button className="btn-c" onClick={() => setShowSaidaForm(false)}>Cancelar</button>
              <button className="btn-s"
                disabled={!saidaForm.desc || saidaForm.valor <= 0}
                onClick={salvarSaida}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
