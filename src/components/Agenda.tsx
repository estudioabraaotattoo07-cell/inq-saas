import { useState, useMemo } from "react";
import { dbUpsert, dbInsert, dbDelete } from "../lib/supabase";
import { CAL_COLORS, CAL_LABELS, HOURS, WEEKDAYS, MONTHS, fmtDate, getWeekDates, getMonthDates } from "../lib/helpers";
import type { Evento } from "../lib/types";

interface AgendaProps {
  agEvents: Evento[];
  setAgEvents: React.Dispatch<React.SetStateAction<Evento[]>>;
}

const EMPTY_FORM = {
  title: "",
  tipo: "cons_abraao",
  date: new Date().toISOString().split("T")[0],
  start: 9,
  end: 11,
  desc: ""
};

export default function Agenda({ agEvents, setAgEvents }: AgendaProps) {
  const [agView, setAgView] = useState("week");
  const [agDate, setAgDate] = useState(new Date());
  const [showAgForm, setShowAgForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
  const [agForm, setAgForm] = useState(EMPTY_FORM);

  const today = fmtDate(new Date());
  const wDates = useMemo(() => getWeekDates(agDate), [agDate]);
  const mDates = useMemo(() => getMonthDates(agDate), [agDate]);
  const evOn = (d: string) => agEvents.filter(e => e.date === d);

  const agNav = (dir: number) => {
    const d = new Date(agDate);
    if (agView === "day") d.setDate(d.getDate() + dir);
    else if (agView === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setAgDate(d);
  };

  const agTitle = () => {
    if (agView === "day") return agDate.getDate() + " de " + MONTHS[agDate.getMonth()] + " " + agDate.getFullYear();
    if (agView === "week") {
      const wd = getWeekDates(agDate);
      return wd[0].getDate() + " a " + wd[6].getDate() + " de " + MONTHS[agDate.getMonth()] + " " + agDate.getFullYear();
    }
    return MONTHS[agDate.getMonth()] + " " + agDate.getFullYear();
  };

  const openNew = (date: string, start: number) => {
    setEditingEvent(null);
    setAgForm({ ...EMPTY_FORM, date, start, end: start + 2 });
    setShowAgForm(true);
  };

  const openEdit = (e: Evento) => {
    setEditingEvent(e);
    setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.desc || "" });
    setShowAgForm(true);
  };

  const closeForm = () => {
    setShowAgForm(false);
    setEditingEvent(null);
    setAgForm(EMPTY_FORM);
  };

  const saveAgEvent = async () => {
    if (!agForm.title.trim()) return;

    if (editingEvent) {
      // EDITAR evento existente
      const updated: Evento = {
        ...editingEvent,
        title: agForm.title,
        tipo: agForm.tipo,
        date: agForm.date,
        start: Number(agForm.start),
        end: Number(agForm.end),
        desc: agForm.desc
      };
      setAgEvents(p => p.map(e => e.id === editingEvent.id ? updated : e));
      await dbUpsert("agenda", {
        id: editingEvent.id,
        titulo: agForm.title,
        artista: agForm.tipo.includes("camilla") ? "camilla" : "abraao",
        data: agForm.date,
        hora: String(agForm.start).padStart(2, "0") + ":00",
        tipo: agForm.tipo,
        obs: agForm.desc || ""
      });
    } else {
      // NOVO evento
      const row = {
        titulo: agForm.title,
        artista: agForm.tipo.includes("camilla") ? "camilla" : "abraao",
        data: agForm.date,
        hora: String(agForm.start).padStart(2, "0") + ":00",
        tipo: agForm.tipo,
        obs: agForm.desc || ""
      };
      const saved = await dbInsert("agenda", row);
      const newEvento: Evento = {
        id: saved?.id || Date.now(),
        title: agForm.title,
        tipo: agForm.tipo,
        date: agForm.date,
        start: Number(agForm.start),
        end: Number(agForm.end),
        desc: agForm.desc
      };
      setAgEvents(p => [...p, newEvento]);
    }
    closeForm();
  };

  const deleteEvent = async (id: any) => {
    if (!window.confirm("Tem certeza que deseja excluir este evento?")) return;
    setAgEvents(p => p.filter(x => x.id !== id));
    await dbDelete("agenda", id);
    closeForm();
  };

  return (
    <div className="agw">
      {/* ── CONTROLES ── */}
      <div className="ag-ctrl">
        <div className="ag-nav">
          <button className="ag-nb" onClick={() => agNav(-1)}>&lt;</button>
          <div className="ag-title">{agTitle()}</div>
          <button className="ag-nb" onClick={() => agNav(1)}>&gt;</button>
          <button className="ag-nb" style={{ fontSize: 11 }} onClick={() => setAgDate(new Date())}>Hoje</button>
        </div>
        <div className="ag-vg">
          {["day", "week", "month"].map(v => (
            <button key={v} className={"ag-vb" + (agView === v ? " on" : "")} onClick={() => setAgView(v)}>
              {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
        <button className="btn-new" style={{ marginLeft: "auto" }}
          onClick={() => openNew(fmtDate(agDate), 9)}>
          + Evento
        </button>
      </div>

      {/* ── LEGENDA ── */}
      <div className="ag-leg">
        {Object.entries(CAL_COLORS).map(([k, v]) => (
          <div className="ag-li" key={k}>
            <div className="ag-ld" style={{ background: v }} />
            {CAL_LABELS[k]}
          </div>
        ))}
      </div>

      {/* ── VIEW MÊS ── */}
      {agView === "month" && (
        <div className="ag-month">
          <div className="mg">
            {WEEKDAYS.map(d => <div className="mdh" key={d}>{d}</div>)}
            {mDates.map((item, i) => {
              const ds = fmtDate(item.date);
              const evs = evOn(ds);
              return (
                <div key={i} className={"mday" + (item.cur ? "" : " om") + (ds === today ? " today" : "")}
                  onClick={() => { setAgDate(item.date); setAgView("day"); }}>
                  <div className="mdn">{item.date.getDate()}</div>
                  {evs.slice(0, 3).map(e => (
                    <div key={e.id} className="mev" style={{ background: CAL_COLORS[e.tipo] || "#888" }}
                      onClick={ev => { ev.stopPropagation(); openEdit(e); }}>
                      {e.start}h {e.title}
                    </div>
                  ))}
                  {evs.length > 3 && <div style={{ fontSize: 10, color: "var(--tx2)" }}>+{evs.length - 3}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW SEMANA ── */}
      {agView === "week" && (
        <div className="ag-week">
          <div className="wg">
            <div className="wh" />
            {wDates.map((d, i) => (
              <div key={i} className="wh" style={{ color: fmtDate(d) === today ? "var(--gold)" : "var(--tx2)" }}>
                {WEEKDAYS[d.getDay()]} {d.getDate()}
              </div>
            ))}
            {HOURS.map(h => [
              <div key={"t" + h} className="wt">{h}:00</div>,
              ...wDates.map((d, di) => {
                const ds = fmtDate(d);
                const evs = agEvents.filter(e => e.date === ds && e.start === h);
                return (
                  <div key={h + "-" + di} className="wc" style={{ position: "relative", overflow: "visible" }}
                    onClick={() => openNew(ds, h)}>
                    {evs.map(e => {
                      const duration = Math.max(e.end - e.start, 1);
                      return (
                        <div key={e.id} className="we"
                          style={{
                            background: CAL_COLORS[e.tipo] || "#888",
                            position: "absolute", left: 2, right: 2, top: 2,
                            height: (duration * 46) - 4 + "px",
                            zIndex: 10, borderRadius: 4, padding: "3px 5px",
                            overflow: "hidden", fontSize: 10, fontWeight: 600, color: "#fff",
                            cursor: "pointer"
                          }}
                          onClick={ev => { ev.stopPropagation(); openEdit(e); }}>
                          {e.title}<br />
                          <span style={{ opacity: .8 }}>{e.start}h–{e.end}h</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ])}
          </div>
        </div>
      )}

      {/* ── VIEW DIA ── */}
      {agView === "day" && (
        <div className="ag-day">
          <div className="dg">
            {HOURS.map(h => {
              const ds = fmtDate(agDate);
              const evs = agEvents.filter(e => e.date === ds && e.start <= h && e.end > h);
              return (
                <div key={h} className="dr">
                  <div className="dtime">{h}:00</div>
                  <div className="dslot" onClick={() => openNew(ds, h)}>
                    {evs.map(e => (
                      <div key={e.id} className="dev"
                        style={{ background: CAL_COLORS[e.tipo] || "#888", cursor: "pointer" }}
                        onClick={ev => { ev.stopPropagation(); openEdit(e); }}>
                        {e.title} — {e.start}h às {e.end}h
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL EVENTO ── */}
      {showAgForm && (
        <div className="fov" onClick={e => { if (e.target === e.currentTarget) closeForm(); }}>
          <div className="fmod" style={{ maxWidth: 400 }}>
            <div className="fmh">
              <div className="fmt">{editingEvent ? "Editar Evento" : "Novo Evento"}</div>
              <button className="mc" onClick={closeForm}>✕</button>
            </div>
            <div className="fmb">
              <div className="ff">
                <label className="fl">Título / Cliente *</label>
                <input className="fi" placeholder="Nome do cliente" value={agForm.title}
                  onChange={e => setAgForm({ ...agForm, title: e.target.value })} />
              </div>
              <div className="ff">
                <label className="fl">Tipo</label>
                <select className="fs" value={agForm.tipo} onChange={e => setAgForm({ ...agForm, tipo: e.target.value })}>
                  {Object.entries(CAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="ff">
                <label className="fl">Data</label>
                <input className="fi" type="date" value={agForm.date}
                  onChange={e => setAgForm({ ...agForm, date: e.target.value })} />
              </div>
              <div className="fr">
                <div className="ff">
                  <label className="fl">Início (h)</label>
                  <input className="fi" type="number" min={8} max={20} value={agForm.start}
                    onChange={e => setAgForm({ ...agForm, start: Number(e.target.value) })} />
                </div>
                <div className="ff">
                  <label className="fl">Fim (h)</label>
                  <input className="fi" type="number" min={9} max={22} value={agForm.end}
                    onChange={e => setAgForm({ ...agForm, end: Number(e.target.value) })} />
                </div>
              </div>
              <div className="ff">
                <label className="fl">Observações</label>
                <textarea className="fta" placeholder="Anotações sobre este agendamento..."
                  value={agForm.desc} onChange={e => setAgForm({ ...agForm, desc: e.target.value })}
                  style={{ minHeight: 70 }} />
              </div>
            </div>
            <div className="fmf" style={{ justifyContent: "space-between" }}>
              <div>
                {editingEvent && (
                  <button className="btn-c"
                    style={{ color: "var(--q1)", borderColor: "rgba(192,57,43,.3)" }}
                    onClick={() => deleteEvent(editingEvent.id)}>
                    🗑 Excluir
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn-c" onClick={closeForm}>Cancelar</button>
                <button className="btn-s" onClick={saveAgEvent} disabled={!agForm.title.trim()}>Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
