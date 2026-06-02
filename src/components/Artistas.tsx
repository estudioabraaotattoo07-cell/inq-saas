import { useState } from "react";
import { dbUpsert, dbInsert, dbDelete } from "../lib/supabase";
import { maskTel, CORES_ARTISTA } from "../lib/helpers";
import type { Artista, Cliente } from "../lib/types";

interface ArtistasProps {
  artists: Artista[];
  setArtists: React.Dispatch<React.SetStateAction<Artista[]>>;
  clients: Cliente[];
  onContrato: (a: Artista) => void;
}

const EMPTY_FORM = {
  nome: "", role: "guest", com: 50, cor: "#C9A84C", insta: "@", email: "", tel: ""
};

export default function Artistas({ artists, setArtists, clients, onContrato }: ArtistasProps) {
  const [showForm, setShowForm] = useState(false);
  const [artForm, setArtForm] = useState(EMPTY_FORM);
  const [editingArtist, setEditingArtist] = useState<Artista | null>(null);

  const saveArtist = async () => {
    if (!artForm.nome.trim()) return;
    const id = Date.now().toString();
    const na: Artista = {
      id, nome: artForm.nome, role: artForm.role as "residente" | "guest",
      com: artForm.com, cor: artForm.cor, insta: artForm.insta,
      email: artForm.email, tel: artForm.tel, ativo: true
    };
    const saved = await dbInsert("artistas", na);
    setArtists(p => [...p, { ...na, id: saved?.id || id }]);
    setShowForm(false);
    setArtForm(EMPTY_FORM);
  };

  const saveEdit = async () => {
    if (!editingArtist) return;
    setArtists(p => p.map(x => x.id === editingArtist.id ? { ...editingArtist } : x));
    await dbUpsert("artistas", {
      id: editingArtist.id, nome: editingArtist.nome, role: editingArtist.role,
      com: editingArtist.com, cor: editingArtist.cor, insta: editingArtist.insta,
      email: editingArtist.email, tel: editingArtist.tel, ativo: editingArtist.ativo
    });
    setEditingArtist(null);
  };

  const toggleAtivo = async (a: Artista) => {
    const updated = { ...a, ativo: !a.ativo };
    setArtists(p => p.map(x => x.id === a.id ? updated : x));
    await dbUpsert("artistas", { id: a.id, ativo: !a.ativo });
  };

  const removeArtist = async (a: Artista) => {
    if (!window.confirm("Remover " + a.nome + "?")) return;
    setArtists(p => p.filter(x => x.id !== a.id));
    await dbDelete("artistas", a.id);
  };

  const clientesDoArtista = (id: string) => clients.filter(c => c.artista === id);
  const tatuadosPorArtista = (id: string) => clients.filter(c => c.artista === id && (c.etapa === "tatuado" || c.etapa === "pos_venda"));
  const conversao = (id: string) => {
    const total = clientesDoArtista(id).length;
    const tat = tatuadosPorArtista(id).length;
    return total > 0 ? Math.round(tat / total * 100) + "%" : "0%";
  };

  const ColorPicker = ({ cor, onChange }: { cor: string; onChange: (c: string) => void }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
      {CORES_ARTISTA.map(c => (
        <div key={c} onClick={() => onChange(c)}
          style={{
            width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
            border: cor === c ? "3px solid var(--gold)" : "2px solid transparent",
            boxShadow: cor === c ? "0 0 0 1px var(--gold)" : "none",
            transition: "all .15s"
          }} />
      ))}
    </div>
  );

  return (
    <div className="aw">
      {/* ── BOTÃO ADICIONAR ── */}
      <div className="aabar">
        <button className="btn-aa" onClick={() => setShowForm(true)}>🎨 Adicionar Artista</button>
      </div>

      {/* ── LISTA DE ARTISTAS ── */}
      {artists.map(a => (
        <div className="acard" key={a.id} style={{ opacity: a.ativo ? 1 : .55 }}>
          <div className="acardh">
            <div>
              <div className="aname" style={{ color: a.cor }}>{a.nome}</div>
              <div className="arole">
                <span style={{
                  background: a.role === "residente" ? "rgba(39,174,96,.15)" : "rgba(201,168,76,.15)",
                  color: a.role === "residente" ? "var(--q3)" : "var(--gold)",
                  border: "1px solid " + (a.role === "residente" ? "rgba(39,174,96,.3)" : "rgba(201,168,76,.3)"),
                  borderRadius: 3, padding: "2px 6px", fontSize: 10, fontWeight: 700,
                  marginRight: 7, textTransform: "uppercase" as const
                }}>
                  {a.role === "residente" ? "RESIDENTE" : "GUEST"}
                </span>
                {a.ativo ? "Ativo" : "Inativo"} {a.insta || ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-sm gold" onClick={() => setEditingArtist({ ...a })}>✏️ Editar</button>
              <button className="btn-sm gold" onClick={() => onContrato(a)}>📄 Contrato</button>
              <button className="btn-sm" onClick={() => toggleAtivo(a)}>
                {a.ativo ? "Desativar" : "Reativar"}
              </button>
              {a.role === "guest" && (
                <button className="btn-sm red" onClick={() => removeArtist(a)}>Remover</button>
              )}
            </div>
          </div>

          <div className="abody">
            {[
              { l: "Clientes", v: clientesDoArtista(a.id).length },
              { l: "Tatuados", v: tatuadosPorArtista(a.id).length },
              { l: "Conversão", v: conversao(a.id) },
            ].map((f, i) => (
              <div className="af" key={i}>
                <div className="afl">{f.l}</div>
                <div className="afv">{f.v}</div>
              </div>
            ))}
            <div className="af">
              <div className="afl">Comissão Base (%)</div>
              <div style={{ marginTop: 4 }}>
                <input className="ci" type="number" min={0} max={100} value={a.com}
                  onChange={e => setArtists(p => p.map(x => x.id === a.id ? { ...x, com: Number(e.target.value) } : x))}
                  onBlur={async () => await dbUpsert("artistas", { id: a.id, com: a.com })} />
                <span style={{ fontSize: 11, color: "var(--tx2)", marginLeft: 4 }}>%</span>
                <div style={{ marginTop: 6, fontSize: 11, color: "var(--tx2)" }}>
                  🎨 Artista: <strong style={{ color: "var(--gold)" }}>{a.com}%</strong>
                  &nbsp;&nbsp;
                  🏠 Estúdio: <strong style={{ color: "var(--gold)" }}>{100 - a.com}%</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* ── MODAL NOVO ARTISTA ── */}
      {showForm && (
        <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="fmod" style={{ maxWidth: 420 }}>
            <div className="fmh">
              <div className="fmt">Adicionar Artista</div>
              <button className="mc" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="fmb">
              <div className="ff">
                <label className="fl">Nome Completo *</label>
                <input className="fi" placeholder="Nome do artista" value={artForm.nome}
                  onChange={e => setArtForm({ ...artForm, nome: e.target.value })} />
              </div>
              <div className="fr">
                <div className="ff">
                  <label className="fl">Tipo</label>
                  <select className="fs" value={artForm.role}
                    onChange={e => setArtForm({ ...artForm, role: e.target.value })}>
                    <option value="residente">Residente</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div className="ff">
                  <label className="fl">Comissão (%)</label>
                  <input className="fi" type="number" min={0} max={100} value={artForm.com}
                    onChange={e => setArtForm({ ...artForm, com: Number(e.target.value) })} />
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 4 }}>
                    🎨 Artista: <strong>{artForm.com}%</strong>
                    &nbsp; 🏠 Estúdio: <strong>{100 - artForm.com}%</strong>
                  </div>
                </div>
              </div>
              <div className="fr">
                <div className="ff">
                  <label className="fl">Instagram</label>
                  <input className="fi" placeholder="@perfil" value={artForm.insta}
                    onChange={e => { const v = e.target.value; setArtForm({ ...artForm, insta: v && !v.startsWith("@") ? "@" + v : v }); }} />
                </div>
                <div className="ff">
                  <label className="fl">Email</label>
                  <input className="fi" placeholder="email" value={artForm.email}
                    onChange={e => setArtForm({ ...artForm, email: e.target.value })} />
                </div>
              </div>
              <div className="ff">
                <label className="fl">Telefone</label>
                <input className="fi" placeholder="(27) 9 9999-9999" value={artForm.tel}
                  onChange={e => setArtForm({ ...artForm, tel: maskTel(e.target.value) })} />
              </div>
              <div className="ff">
                <label className="fl">Cor</label>
                <ColorPicker cor={artForm.cor} onChange={cor => setArtForm({ ...artForm, cor })} />
              </div>
            </div>
            <div className="fmf">
              <button className="btn-c" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-s" onClick={saveArtist} disabled={!artForm.nome.trim()}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDITAR ARTISTA ── */}
      {editingArtist && (
        <div className="fov" onClick={e => { if (e.target === e.currentTarget) setEditingArtist(null); }}>
          <div className="fmod" style={{ maxWidth: 460 }}>
            <div className="fmh">
              <div className="fmt">Editar Artista</div>
              <button className="mc" onClick={() => setEditingArtist(null)}>✕</button>
            </div>
            <div className="fmb">
              <div className="ff">
                <label className="fl">Nome Completo</label>
                <input className="fi" value={editingArtist.nome}
                  onChange={e => setEditingArtist({ ...editingArtist, nome: e.target.value })} />
              </div>
              <div className="fr">
                <div className="ff">
                  <label className="fl">Tipo</label>
                  <select className="fs" value={editingArtist.role}
                    onChange={e => setEditingArtist({ ...editingArtist, role: e.target.value as "residente" | "guest" })}>
                    <option value="residente">Residente</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div className="ff">
                  <label className="fl">Comissão (%)</label>
                  <input className="fi" type="number" min={0} max={100} value={editingArtist.com}
                    onChange={e => setEditingArtist({ ...editingArtist, com: Number(e.target.value) })} />
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 4 }}>
                    🎨 Artista: <strong>{editingArtist.com}%</strong>
                    &nbsp; 🏠 Estúdio: <strong>{100 - editingArtist.com}%</strong>
                  </div>
                </div>
              </div>
              <div className="fr">
                <div className="ff">
                  <label className="fl">Instagram</label>
                  <input className="fi" placeholder="@perfil" value={editingArtist.insta || ""}
                    onChange={e => { const v = e.target.value; setEditingArtist({ ...editingArtist, insta: v && !v.startsWith("@") ? "@" + v : v }); }} />
                </div>
                <div className="ff">
                  <label className="fl">Email</label>
                  <input className="fi" placeholder="email" value={editingArtist.email || ""}
                    onChange={e => setEditingArtist({ ...editingArtist, email: e.target.value })} />
                </div>
              </div>
              <div className="ff">
                <label className="fl">Telefone (visível apenas para o dono)</label>
                <input className="fi" placeholder="(27) 9 9999-9999" value={editingArtist.tel || ""}
                  onChange={e => setEditingArtist({ ...editingArtist, tel: maskTel(e.target.value) })} />
              </div>
              <div className="ff">
                <label className="fl">Cor</label>
                <ColorPicker cor={editingArtist.cor}
                  onChange={cor => setEditingArtist({ ...editingArtist, cor })} />
              </div>
            </div>
            <div className="fmf">
              <button className="btn-c" onClick={() => setEditingArtist(null)}>Cancelar</button>
              <button className="btn-s" onClick={saveEdit}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
