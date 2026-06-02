import type { Cliente } from "../lib/types";

interface PosVendaProps {
  clients: Cliente[];
  onVerCliente: (c: Cliente) => void;
  aName: (id: string) => string;
  aStyle: (id: string) => React.CSSProperties;
  aClass: (id: string) => string;
}

export default function PosVenda({ clients, onVerCliente, aName, aStyle, aClass }: PosVendaProps) {
  const pvC = clients.filter(c => c.etapa === "tatuado" || c.etapa === "pos_venda");

  const statusConfig = {
    done: { cor: "var(--q3)", label: "✓ Enviado", classe: "pvd" },
    pending: { cor: "var(--q2)", label: "⏳ Pendente", classe: "pvp" },
    future: { cor: "var(--tx3)", label: "🔮 Aguardando", classe: "pvf" },
  };

  const progressoPv = (pv: any[]) => {
    if (!pv || pv.length === 0) return 0;
    const done = pv.filter(p => p.s === "done").length;
    return Math.round(done / pv.length * 100);
  };

  if (pvC.length === 0) {
    return (
      <div className="pvw">
        <div className="empty">Nenhum cliente em pós-venda.</div>
      </div>
    );
  }

  return (
    <div className="pvw">
      {pvC.map(c => {
        const prog = progressoPv(c.pv);
        return (
          <div className="pvc" key={c.id}>
            <div className="pvh">
              <div>
                <div className="pvn">{c.nome}</div>
                <div className="pvm">
                  <span
                    className={("at " + aClass(c.artista)) || ""}
                    style={{ ...aStyle(c.artista), marginRight: 7 }}>
                    {aName(c.artista).split(" ")[0]}
                  </span>
                  {c.estilo}
                  {c.nps != null && (
                    <span style={{ marginLeft: 9, color: "var(--gold)", fontWeight: 600 }}>
                      NPS: {c.nps}/10
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Barra de progresso do pós-venda */}
                {c.pv && c.pv.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 80, height: 5, background: "var(--dk4)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        background: prog === 100 ? "var(--q3)" : "var(--gold)",
                        width: prog + "%", transition: "width .4s"
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--tx3)" }}>{prog}%</span>
                  </div>
                )}
                <button
                  className="mc"
                  style={{ width: "auto", padding: "0 9px", fontSize: 11 }}
                  onClick={() => onVerCliente(c)}>
                  Ver ficha
                </button>
              </div>
            </div>

            {/* Fluxo de etapas */}
            <div className="pvt">
              {(c.pv || []).map((p: any, i: number) => {
                const cfg = statusConfig[p.s as keyof typeof statusConfig] || statusConfig.future;
                return (
                  <div className="pvs" key={i}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: cfg.cor
                      }} />
                      <span className="pvsl">{p.l}</span>
                    </div>
                    <span className={"pvss " + cfg.classe}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Sem followups cadastrados */}
            {(!c.pv || c.pv.length === 0) && (
              <div style={{ padding: "10px 14px", fontSize: 11, color: "var(--tx3)", fontStyle: "italic" }}>
                Fluxo de pós-venda será iniciado automaticamente após mover para "Tatuado".
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
