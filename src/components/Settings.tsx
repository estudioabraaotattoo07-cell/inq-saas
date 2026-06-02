import { dbUpsert } from "../lib/supabase";
import type { Horario } from "../lib/types";

interface SettingsProps {
  show: boolean;
  onClose: () => void;
  studioName: string; setStudioName: (v: string) => void;
  studioTel: string; setStudioTel: (v: string) => void;
  studioOwner: string; setStudioOwner: (v: string) => void;
  studioEmail: string; setStudioEmail: (v: string) => void;
  studioCity: string; setStudioCity: (v: string) => void;
  studioInsta: string; setStudioInsta: (v: string) => void;
  auraName: string; setAuraName: (v: string) => void;
  googleLink: string; setGoogleLink: (v: string) => void;
  cnpj: string; setCnpj: (v: string) => void;
  metaMensal: number; setMetaMensal: (v: number) => void;
  horarios: Horario[]; setHorarios: React.Dispatch<React.SetStateAction<Horario[]>>;
  dark: boolean;
}

export default function Settings({
  show, onClose,
  studioName, setStudioName,
  studioTel, setStudioTel,
  studioOwner, setStudioOwner,
  studioEmail, setStudioEmail,
  studioCity, setStudioCity,
  studioInsta, setStudioInsta,
  auraName, setAuraName,
  googleLink, setGoogleLink,
  cnpj, setCnpj,
  metaMensal, setMetaMensal,
  horarios, setHorarios,
  dark
}: SettingsProps) {
  if (!show) return null;

  const salvar = async () => {
    const result = await dbUpsert("configuracoes", {
      id: 1,
      studio_name: studioName,
      studio_tel: studioTel,
      studio_owner: studioOwner,
      studio_email: studioEmail,
      studio_city: studioCity,
      studio_insta: studioInsta,
      aura_name: auraName,
      google_link: googleLink,
      cnpj,
      meta_mensal: metaMensal,
      horarios,
      dark_mode: dark,
      updated_at: new Date().toISOString()
    });
    if (result) {
      onClose();
    } else {
      alert("Erro ao salvar configurações. Verifique a conexão com o banco.");
    }
  };

  return (
    <div className="ov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-modal">
        <div className="mh">
          <div>
            <div className="mn">Configurações do Estúdio</div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>
              Edite as informações do seu estúdio
            </div>
          </div>
          <button className="mc" onClick={onClose}>✕</button>
        </div>

        <div className="mb">
          {/* ── PERFIL ── */}
          <div>
            <div className="stit">Perfil do Estúdio</div>
            <div className="fg2">
              <div className="fi2">
                <div className="fil">Nome do Estúdio</div>
                <input className="ef" value={studioName} onChange={e => setStudioName(e.target.value)} />
              </div>
              <div className="fi2">
                <div className="fil">Cidade</div>
                <input className="ef" value={studioCity} onChange={e => setStudioCity(e.target.value)} />
              </div>
              <div className="fi2">
                <div className="fil">WhatsApp</div>
                <input className="ef" value={studioTel} onChange={e => setStudioTel(e.target.value)} />
              </div>
              <div className="fi2">
                <div className="fil">Instagram</div>
                <input className="ef" value={studioInsta}
                  onChange={e => { const v = e.target.value; setStudioInsta(v && !v.startsWith("@") ? "@" + v : v); }} />
              </div>
              <div className="fi2">
                <div className="fil">Nome do Dono</div>
                <input className="ef" value={studioOwner} onChange={e => setStudioOwner(e.target.value)} />
              </div>
              <div className="fi2">
                <div className="fil">Email</div>
                <input className="ef" value={studioEmail} onChange={e => setStudioEmail(e.target.value)} />
              </div>
              <div className="fi2">
                <div className="fil">CNPJ</div>
                <input className="ef" placeholder="00.000.000/0001-00" value={cnpj} onChange={e => setCnpj(e.target.value)} />
              </div>
              <div className="fi2">
                <div className="fil">Meta Mensal (R$)</div>
                <input className="ef" type="number" value={metaMensal} onChange={e => setMetaMensal(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* ── AURA ── */}
          <div>
            <div className="stit">Configurações da Aura</div>
            <div className="fg2">
              <div className="fi2">
                <div className="fil">Nome da Assistente</div>
                <input className="ef" value={auraName} onChange={e => setAuraName(e.target.value)} />
              </div>
              <div className="fi2">
                <div className="fil">Link Google Avaliações</div>
                <input className="ef" placeholder="https://g.page/r/..." value={googleLink} onChange={e => setGoogleLink(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ── HORÁRIOS ── */}
          <div>
            <div className="stit">Horários de Funcionamento</div>
            <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8 }}>
              A Aura atende 24h. Estes horários são para a agenda interna.
            </div>
            {horarios.map((h, i) => (
              <div key={h.dia} className="hr-row">
                <div className="hr-dia">{h.dia}</div>
                <div className="hr-toggle"
                  style={{ background: h.aberto ? "var(--q3)" : "var(--dk5)" }}
                  onClick={() => setHorarios(p => p.map((x, j) => j === i ? { ...x, aberto: !x.aberto } : x))}>
                  <div className="hr-toggle-dot" style={{ left: h.aberto ? "18px" : "2px" }} />
                </div>
                {h.aberto ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    <input className="fi" type="time" value={h.ini}
                      onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, ini: e.target.value } : x))}
                      style={{ width: 90, padding: "4px 7px" }} />
                    <span style={{ fontSize: 12, color: "var(--tx2)" }}>às</span>
                    <input className="fi" type="time" value={h.fim}
                      onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, fim: e.target.value } : x))}
                      style={{ width: 90, padding: "4px 7px" }} />
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--tx3)", fontStyle: "italic", flex: 1 }}>Fechado</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="fmf">
          <button className="btn-c" onClick={onClose}>Fechar</button>
          <button className="btn-s" onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}
