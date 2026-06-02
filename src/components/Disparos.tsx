import { useState, useMemo } from "react";
import { SEGS, DATAS, MSGS } from "../lib/helpers";
import type { Cliente } from "../lib/types";

interface DisparosProps {
  clients: Cliente[];
}

export default function Disparos({ clients }: DisparosProps) {
  const [segSel, setSegSel] = useState<string | null>(null);
  const [dateSel, setDateSel] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [msgEdit, setMsgEdit] = useState("");
  const [sent, setSent] = useState(false);

  const pk = dateSel || segSel;
  const pmsg = pk ? MSGS[pk] : null;

  const dest = useMemo(() => {
    if (!segSel && !dateSel) return [];
    if (dateSel) return clients;
    const sg = SEGS.find(x => x.id === segSel);
    return sg ? clients.filter(sg.f) : [];
  }, [segSel, dateSel, clients]);

  const selSeg = (id: string) => {
    setSegSel(segSel === id ? null : id);
    setDateSel(null);
    setSent(false);
    setEditing(false);
    setMsgEdit("");
  };

  const selData = (id: string) => {
    setDateSel(dateSel === id ? null : id);
    setSegSel(null);
    setSent(false);
    setEditing(false);
    setMsgEdit("");
  };

  const disparo = () => {
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  const msgAtual = msgEdit || pmsg || "";
  const nomesDestino = dest.map((c: Cliente) => c.nome.split(" ")[0]).slice(0, 3).join(", ")
    + (dest.length > 3 ? " +" + (dest.length - 3) : "");

  return (
    <div className="disw">
      {/* ── COLUNA ESQUERDA ── */}
      <div className="disl">
        {/* Segmentos */}
        <div className="dsec">
          <div className="dsh">
            <div className="dst">📣 Disparar por Perfil</div>
            <div className="dss">Mensagens personalizadas por segmento</div>
          </div>
          <div className="dsb">
            {SEGS.map(sg => {
              const cnt = clients.filter(sg.f).length;
              return (
                <div key={sg.id}
                  className={"seg" + (segSel === sg.id ? " on" : "")}
                  onClick={() => selSeg(sg.id)}>
                  <div>
                    <div className="sn">{sg.icon} {sg.label}</div>
                    <div className="sd">{sg.desc}</div>
                  </div>
                  <div className="sc2">{cnt}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Datas comemorativas */}
        <div className="dsec">
          <div className="dsh">
            <div className="dst">📅 Datas Comemorativas</div>
            <div className="dss">Mensagens emocionais para toda a base</div>
          </div>
          <div className="dsb">
            {DATAS.map(d => (
              <div key={d.id}
                className={"di" + (dateSel === d.id ? " on" : "")}
                onClick={() => selData(d.id)}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--tx)", display: "flex", alignItems: "center", gap: 6 }}>
                  {d.icon} {d.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--tx2)" }}>{d.data}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COLUNA DIREITA ── */}
      <div className="disr">
        <div className="dsec">
          <div className="dsh">
            <div className="dst">📱 Preview da Mensagem</div>
            <div className="dss">A palavra final é sempre sua</div>
          </div>
          <div className="dsb">
            {!pmsg ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--tx3)", fontSize: 12 }}>
                Selecione um segmento ou data comemorativa
              </div>
            ) : (
              <>
                <div className="prev">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                    <div className="prevl" style={{ margin: 0 }}>Mensagem via Aura</div>
                    <button
                      onClick={() => {
                        if (!editing) setMsgEdit(pmsg);
                        setEditing(!editing);
                      }}
                      style={{
                        background: editing ? "var(--gold-d)" : "var(--dk4)",
                        border: "1px solid " + (editing ? "var(--gold)" : "var(--br)"),
                        borderRadius: 4,
                        color: editing ? "var(--gold)" : "var(--tx2)",
                        padding: "3px 8px", fontSize: 11, cursor: "pointer",
                        fontFamily: "'DM Sans',sans-serif", fontWeight: 600
                      }}>
                      {editing ? "✓ Ok" : "✏ Editar"}
                    </button>
                  </div>

                  {editing ? (
                    <textarea
                      value={msgEdit}
                      onChange={e => setMsgEdit(e.target.value)}
                      style={{
                        width: "100%", minHeight: 170,
                        background: "var(--dk4)", border: "1px solid var(--gold)",
                        borderRadius: 7, padding: 11, fontSize: 12,
                        color: "var(--tx)", fontFamily: "'DM Sans',sans-serif",
                        lineHeight: 1.7, outline: "none", resize: "vertical"
                      }} />
                  ) : (
                    <div className="prevm">{msgAtual}</div>
                  )}

                  <div className="prevc">
                    📩 {dest.length} destinatário{dest.length !== 1 ? "s" : ""}
                    {dest.length > 0 && " — " + nomesDestino}
                  </div>
                </div>

                {sent ? (
                  <div className="dis-ok">
                    <div style={{ fontSize: 12, color: "var(--q3)", fontWeight: 600 }}>✓ Disparo programado!</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>
                      Aura envia para {dest.length} cliente{dest.length !== 1 ? "s" : ""} com elegância.
                    </div>
                  </div>
                ) : (
                  <button className="btn-dis" onClick={disparo} disabled={dest.length === 0}>
                    📣 Programar — {dest.length} cliente{dest.length !== 1 ? "s" : ""}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
