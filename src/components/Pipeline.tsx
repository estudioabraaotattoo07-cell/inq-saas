import { STAGES, QC } from "../lib/helpers";
import type { Cliente } from "../lib/types";

interface PipelineProps {
  clients: Cliente[];
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

export default function Pipeline({ clients, onVerCliente, aName, aStyle, aClass }: PipelineProps) {
  const getSC = (etapa: string) => clients.filter(c => c.etapa === etapa);

  return (
    <div className="kw">
      {STAGES.map(stage => {
        const cols = getSC(stage.id);
        return (
          <div className="kc" key={stage.id}>
            <div className="kh" style={{ borderBottomColor: stage.color }}>
              <span className="kt" style={{ color: stage.color }}>
                {stage.emoji} {stage.label}
              </span>
              <span className="kn">{cols.length}</span>
            </div>
            <div className="kb">
              {cols.length === 0 && <div className="ke">Nenhum cliente</div>}
              {cols.map(c => {
                const m = miss(c);
                const ch = churn(c);
                return (
                  <div key={c.id} className="card" onClick={() => onVerCliente(c)}>
                    {/* Barra lateral colorida por artista */}
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                      background: c.artista === "abraao" ? "var(--ab)" : "var(--ca)",
                      borderRadius: "7px 0 0 7px"
                    }} />
                    <div className="ctop">
                      <div className="cname">{c.nome}</div>
                      <span className={"qb " + QC[c.qual]}>{c.qual}</span>
                    </div>
                    <div className="cst">
                      {c.estilo || "Sem estilo"} {c.regiao ? "· " + c.regiao : ""}
                    </div>
                    <div className="cft">
                      <span className={("at " + aClass(c.artista)) || ""} style={aStyle(c.artista)}>
                        {aName(c.artista).split(" ")[0]}
                      </span>
                      <span className="cd">{c.data}</span>
                    </div>
                    <div className="cor">📍 {c.orig}</div>
                    {(m.length > 0 || ch || c.orcamento || c.etapa === "blacklist" || c.etapa === "lista_espera") && (
                      <div className="ar">
                        {m.map(x => <span key={x} className="atag">⚠ {x}</span>)}
                        {ch === "orange" && <span className="co co-o">🟠</span>}
                        {ch === "red" && <span className="co co-r">🔴</span>}
                        {c.orcamento && <span className="atag">💰</span>}
                        {c.etapa === "blacklist" && <span className="tag-bl">🚫</span>}
                        {c.etapa === "lista_espera" && <span className="tag-wl">⏳</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
