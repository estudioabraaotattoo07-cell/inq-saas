import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const sb = createClient(SUPA_URL, SUPA_KEY);
const OWNER_EMAIL = "estudioabraaotattoo07@gmail.com";
// Variável global para manter tool pendente da Aura sem stale closure
let _auraToolPendenteCache: { tool: string; params: any; descricao: string } | null = null;

// Notificação nativa do browser para alertar sobre ações pendentes da Aura
function notificarAura(titulo: string, corpo: string) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    const n = new Notification(titulo, { body: corpo, icon: "/favicon.ico", tag: "aura-pendente" });
    n.onclick = () => { window.focus(); n.close(); };
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(p => {
      if (p === "granted") {
        const n = new Notification(titulo, { body: corpo, icon: "/favicon.ico", tag: "aura-pendente" });
        n.onclick = () => { window.focus(); n.close(); };
      }
    });
  }
}

async function dbGet(table: string) {
  const { data, error } = await sb.from(table).select("*");
  if (error) { console.error(table, error); return null; }
  return data;
}
async function dbUpsert(table: string, row: any, onError?: (msg: string) => void) {
  const { data, error } = await sb.from(table).upsert(row).select().single();
  if (error) { console.error("upsert", table, error.message, row); onError?.(error.message); return null; }
  return data;
}
async function dbInsert(table: string, row: any, onError?: (msg: string) => void) {
  const { data, error } = await sb.from(table).insert(row).select().single();
  if (error) { console.error("insert", table, error.message, row); onError?.(error.message); return null; }
  return data;
}
async function dbDelete(table: string, id: any, onError?: (msg: string) => void) {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) { console.error("delete", table, id, error.message); onError?.(error.message); }
}

// ─── THEMES ──────────────────────────────────────────────────────────────────
type ThemeId = "carvalho" | "sangue" | "cobalto" | "mono";
const THEMES: Record<ThemeId, { nome: string; emoji: string; dark: Record<string,string>; light: Record<string,string>; }> = {
  carvalho: {
    nome: "Original", emoji: "⚜️",
    dark: { "--dk":"#0E0E0E","--dk2":"#161616","--dk3":"#1E1E1E","--dk4":"#272727","--dk5":"#303030","--tx":"#E8E2D9","--tx2":"#A09585","--tx3":"#706860","--br":"rgba(201,168,76,0.18)","--brh":"rgba(201,168,76,0.45)","--gold":"#C9A84C","--gold-l":"#E8C97A","--gold-d":"rgba(201,168,76,0.13)" },
    light: { "--dk":"#F2EDE6","--dk2":"#EAE3DA","--dk3":"#E0D8CE","--dk4":"#D4C9BC","--dk5":"#C8BAA9","--tx":"#141210","--tx2":"#3A302A","--tx3":"#6B5E54","--br":"rgba(80,55,30,0.22)","--brh":"rgba(80,55,30,0.5)","--gold":"#9A7428","--gold-l":"#C49A30","--gold-d":"rgba(154,116,40,0.13)" },
  },
  sangue: {
    nome: "Sangue & Cinza", emoji: "🩸",
    dark: { "--dk":"#0A0A0A","--dk2":"#141414","--dk3":"#1C1C1C","--dk4":"#252525","--dk5":"#2E2E2E","--tx":"#EDE0DE","--tx2":"#A08880","--tx3":"#706058","--br":"rgba(192,57,43,0.18)","--brh":"rgba(192,57,43,0.45)","--gold":"#C0392B","--gold-l":"#E04030","--gold-d":"rgba(192,57,43,0.13)" },
    light: { "--dk":"#F5EFEE","--dk2":"#EDE3E1","--dk3":"#E3D5D3","--dk4":"#D7C5C2","--dk5":"#CBB3B0","--tx":"#1A0B0A","--tx2":"#3D2420","--tx3":"#6B3B36","--br":"rgba(120,30,20,0.2)","--brh":"rgba(120,30,20,0.45)","--gold":"#A0200F","--gold-l":"#C0392B","--gold-d":"rgba(160,32,15,0.13)" },
  },
  cobalto: {
    nome: "Noir Cobalto", emoji: "💠",
    dark: { "--dk":"#080C12","--dk2":"#101520","--dk3":"#181F2E","--dk4":"#20283A","--dk5":"#283246","--tx":"#D6E8F5","--tx2":"#7AA5C0","--tx3":"#4A7090","--br":"rgba(74,158,191,0.18)","--brh":"rgba(74,158,191,0.45)","--gold":"#4A9EBF","--gold-l":"#6BBAD8","--gold-d":"rgba(74,158,191,0.13)" },
    light: { "--dk":"#EAF2F8","--dk2":"#DDE9F2","--dk3":"#D0E0EC","--dk4":"#C1D3E3","--dk5":"#B0C6D8","--tx":"#060D14","--tx2":"#1A3A52","--tx3":"#3A6882","--br":"rgba(30,80,120,0.2)","--brh":"rgba(30,80,120,0.45)","--gold":"#1A6F8F","--gold-l":"#2A90B8","--gold-d":"rgba(26,111,143,0.13)" },
  },
  mono: {
    nome: "Monocromático", emoji: "◻️",
    dark: { "--dk":"#080808","--dk2":"#111111","--dk3":"#1A1A1A","--dk4":"#242424","--dk5":"#2E2E2E","--tx":"#F0F0F0","--tx2":"#A0A0A0","--tx3":"#686868","--br":"rgba(200,200,200,0.12)","--brh":"rgba(200,200,200,0.3)","--gold":"#C8C8C8","--gold-l":"#E0E0E0","--gold-d":"rgba(200,200,200,0.1)" },
    light: { "--dk":"#F8F8F8","--dk2":"#EEEEEE","--dk3":"#E4E4E4","--dk4":"#D8D8D8","--dk5":"#CCCCCC","--tx":"#0A0A0A","--tx2":"#404040","--tx3":"#707070","--br":"rgba(80,80,80,0.18)","--brh":"rgba(80,80,80,0.4)","--gold":"#444444","--gold-l":"#666666","--gold-d":"rgba(68,68,68,0.13)" },
  },
};

function applyTheme(dark: boolean, tema: ThemeId = "carvalho") {
  const t = THEMES[tema] || THEMES.carvalho;
  const v = dark ? t.dark : t.light;
  Object.entries(v).forEach(([k, val]) =>
    document.documentElement.style.setProperty(k, val)
  );
  if (!dark) {
    document.documentElement.style.setProperty("--ab", "#1A6F8F");
    document.documentElement.style.setProperty("--ca", "#6B3A8F");
    document.documentElement.style.setProperty("--q0", "#6B2F99");
    document.documentElement.style.setProperty("--q1", "#A01E14");
    document.documentElement.style.setProperty("--q2", "#9B5500");
    document.documentElement.style.setProperty("--q3", "#1A7A40");
  } else {
    document.documentElement.style.setProperty("--ab", "#4A9EBF");
    document.documentElement.style.setProperty("--ca", "#9B6BB5");
    document.documentElement.style.setProperty("--q0", "#8E44AD");
    document.documentElement.style.setProperty("--q1", "#C0392B");
    document.documentElement.style.setProperty("--q2", "#D4820A");
    document.documentElement.style.setProperty("--q3", "#27AE60");
  }
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
@keyframes fadeSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scalePulse{0%{transform:scale(1)}50%{transform:scale(1.04)}100%{transform:scale(1)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes countUp{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
@keyframes goldPulse{0%{box-shadow:0 0 0 0 rgba(201,168,76,.4)}70%{box-shadow:0 0 0 8px rgba(201,168,76,0)}100%{box-shadow:0 0 0 0 rgba(201,168,76,0)}}
:root{
  --gold:#C9A84C;--gold-l:#E8C97A;--gold-d:rgba(201,168,76,0.13);
  --q0:#8E44AD;--q1:#C0392B;--q2:#D4820A;--q3:#27AE60;
  --ab:#4A9EBF;--ca:#9B6BB5;
}
body{background:var(--dk);color:var(--tx);font-family:'DM Sans',sans-serif;}
.root{min-height:100vh;background:var(--dk);display:flex;flex-direction:column;}
@media(max-width:768px){
  body,html{overflow-x:hidden;max-width:100vw;}
  .kc{min-width:42vw!important;max-width:42vw!important;}
  .fmod{max-width:96vw!important;}
  .fr{grid-template-columns:1fr!important;}
  .fi,.fs{font-size:16px;padding:9px 11px;}
  .fta{font-size:16px;}
  /* Overlay e modal ficha do cliente */
  .ov{align-items:flex-start!important;padding:max(env(safe-area-inset-top),52px) 8px max(env(safe-area-inset-bottom),12px)!important;overflow-y:auto!important;}
  .fov{align-items:flex-start!important;padding:max(env(safe-area-inset-top),52px) 8px max(env(safe-area-inset-bottom),12px)!important;overflow-y:auto!important;}
  .modal{max-width:100vw!important;border-radius:10px;max-height:calc(100dvh - max(env(safe-area-inset-top),52px) - max(env(safe-area-inset-bottom),12px))!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;}
  .fmod{max-width:100vw!important;max-height:calc(100dvh - max(env(safe-area-inset-top),52px) - max(env(safe-area-inset-bottom),12px))!important;}
  .mh{padding:12px 14px!important;flex-shrink:0!important;}
  .modal>div[style*="flex-shrink"]{flex-shrink:0!important;}
  .mb{padding:12px 14px!important;gap:12px!important;overflow-y:auto!important;flex:1!important;-webkit-overflow-scrolling:touch!important;}
  .mn{font-size:20px!important;}
  .ms{font-size:10px!important;}
  .fg2{grid-template-columns:1fr!important;}
  .fg3{grid-template-columns:1fr 1fr!important;}
  /* Barra de stats */
  .stats{overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:nowrap!important;}
  .si{min-width:90px;padding:9px 10px!important;}
  .sv{font-size:16px!important;}
  .sl{font-size:9px!important;}
  /* Barra de busca */
  .ctrl{flex-direction:column!important;align-items:stretch!important;gap:6px!important;}
  .srch{width:100%!important;}
  /* Pipeline buttons */
  .pm{gap:5px!important;}
  .sb{font-size:12px!important;padding:7px 11px!important;}
  /* Artistas grid */
  .abody{grid-template-columns:1fr 1fr!important;}
  /* Dashboard */
  .fsum{grid-template-columns:1fr 1fr!important;}
  .dgrid{grid-template-columns:1fr!important;}
  /* Agenda */
  .ag-ctrl{flex-direction:column!important;align-items:stretch!important;}
  .ag-nav{justify-content:center!important;}
  .ag-title{min-width:auto!important;font-size:15px!important;}
  .ag-vg{margin-left:0!important;justify-content:center!important;}
  /* Disparos */
  .disw{flex-direction:column!important;}
  .disr{width:100%!important;}
  /* Topbar */
  .bsub{display:none!important;}
  .btn-new{font-size:11px!important;padding:6px 10px!important;}
  /* Tabs */
  .tab{padding:10px 9px!important;font-size:11px!important;}
  /* Formulário modal */
  .fmh{padding:12px 14px!important;}
  .fmb{padding:12px 14px!important;gap:9px!important;}
  .fmf{padding:10px 14px!important;}
}
@media(max-width:480px){
  .kc{min-width:42vw!important;max-width:42vw!important;}
  .fg3{grid-template-columns:1fr!important;}
  .fsum{grid-template-columns:1fr!important;}
  .abody{grid-template-columns:1fr 1fr!important;}
  .mn{font-size:18px!important;}
  .tab{padding:9px 7px!important;font-size:10px!important;}
  .topbar{padding:0 12px!important;}
}
.topbar{background:var(--dk2);border-bottom:1px solid var(--br);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.bmark{width:30px;height:30px;background:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:700;color:#000;}
.bname{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;letter-spacing:.08em;color:var(--tx);}
.bsub{font-size:10px;letter-spacing:.15em;color:var(--gold);text-transform:uppercase;}
.tbr{display:flex;align-items:center;gap:8px;}
.theme-btn{background:var(--dk3);border:1px solid var(--br);border-radius:20px;padding:5px 11px;cursor:pointer;font-size:12px;color:var(--tx2);}
.btn-new{background:var(--gold);color:#000;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;}
.btn-new:hover{background:var(--gold-l);}
.alert-btn{background:rgba(212,130,10,.15);border:1px solid rgba(212,130,10,.3);border-radius:6px;padding:4px 10px;font-size:11px;color:#D4820A;font-weight:600;cursor:pointer;}
.alert-drop{position:fixed;top:64px;right:16px;width:min(360px,calc(100vw - 16px));background:var(--dk2);border:1px solid var(--br);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:9999;}
.ad-hdr{padding:10px 14px;background:var(--dk3);border-bottom:1px solid var(--br);border-radius:10px 10px 0 0;font-size:12px;font-weight:600;color:var(--tx);}
.ad-body{max-height:320px;overflow-y:auto;padding:8px;}
.ad-item{padding:8px 10px;background:var(--dk3);border:1px solid var(--br);border-radius:7px;margin-bottom:5px;cursor:pointer;}
.ad-item:hover{border-color:var(--brh);}
.ad-name{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:var(--tx);margin-bottom:3px;}
.ad-tags{display:flex;gap:3px;flex-wrap:wrap;}
.tabs{background:var(--dk2);border-bottom:1px solid var(--br);display:flex;padding:0 20px;overflow-x:auto;position:sticky;top:56px;z-index:99;}
.tab{padding:12px 13px;font-size:12px;font-weight:500;color:var(--tx2);cursor:pointer;border:none;background:none;font-family:'DM Sans',sans-serif;border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:5px;}
.tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.stats{display:flex;gap:1px;background:var(--br);border-bottom:1px solid var(--br);}
.si{flex:1;background:var(--dk2);padding:11px 14px;display:flex;align-items:center;gap:9px;}
.sico{width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;}
.sv{font-size:19px;font-weight:600;color:var(--tx);font-family:'Cormorant Garamond',serif;line-height:1;animation:countUp .35s ease;}
.sl{font-size:10px;color:var(--tx2);text-transform:uppercase;letter-spacing:.08em;margin-top:2px;}
.ctrl{padding:11px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--dk2);border-bottom:1px solid var(--br);}
.srch{background:var(--dk3);border:1px solid var(--br);border-radius:6px;color:var(--tx);padding:7px 11px;font-size:12px;font-family:'DM Sans',sans-serif;width:190px;outline:none;}
.srch:focus{border-color:var(--gold);}
.srch::placeholder{color:var(--tx3);}
.fb{background:var(--dk3);border:1px solid var(--br);border-radius:6px;color:var(--tx2);padding:6px 11px;font-size:11px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;}
.fb.on{background:var(--gold-d);border-color:var(--gold);color:var(--gold);}
.kw{flex:1;overflow-x:auto;padding:12px;display:flex;gap:9px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}.kw::-webkit-scrollbar{display:none;}.kw-scroll-mirror::-webkit-scrollbar{height:4px;}.kw-scroll-mirror::-webkit-scrollbar-track{background:var(--dk3);}.kw-scroll-mirror::-webkit-scrollbar-thumb{background:var(--gold);border-radius:2px;}.kc{min-width:175px;max-width:175px;display:flex;flex-direction:column;gap:5px;}@media(max-width:600px){.kc{min-width:130px;max-width:130px;}.kw{padding:8px 6px;gap:6px;}.cname{font-size:11px;}.card{padding:5px 6px;}}

.kh{padding:8px 11px;border-radius:7px 7px 0 0;background:var(--dk3);border:1px solid var(--br);border-bottom:2px solid;display:flex;align-items:center;justify-content:space-between;}
.kt{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;}
.kn{font-size:11px;font-weight:700;background:var(--dk4);border-radius:9px;padding:2px 6px;color:var(--tx2);}
.kb{background:var(--dk3);border:1px solid var(--br);border-top:none;border-radius:0 0 7px 7px;padding:7px;display:flex;flex-direction:column;gap:6px;min-height:70px;flex:1;}
.ke{text-align:center;color:var(--tx3);font-size:11px;padding:14px 6px;font-style:italic;}
.card{background:var(--dk4);border:1px solid var(--br);border-radius:7px;padding:7px 8px;cursor:pointer;transition:all .18s;position:relative;overflow:hidden;}
.card:hover{border-color:var(--brh);transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.4);}
.ctop{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:5px;}
.cname{font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:600;color:var(--tx);line-height:1.2;}
.qb{font-size:9px;font-weight:700;letter-spacing:.05em;border-radius:4px;padding:2px 5px;text-transform:uppercase;flex-shrink:0;}
.q0c{background:rgba(142,68,173,.2);color:var(--q0);border:1px solid rgba(142,68,173,.3);}
.q1c{background:rgba(192,57,43,.2);color:var(--q1);border:1px solid rgba(192,57,43,.3);}
.q2c{background:rgba(212,130,10,.2);color:var(--q2);border:1px solid rgba(212,130,10,.3);}
.q3c{background:rgba(39,174,96,.2);color:var(--q3);border:1px solid rgba(39,174,96,.3);}
.cst{font-size:11px;color:var(--tx2);margin-bottom:5px;}
.cft{display:flex;align-items:center;justify-content:space-between;margin-top:4px;padding-top:4px;border-top:1px solid var(--br);}
.at{font-size:10px;font-weight:600;letter-spacing:.04em;padding:2px 6px;border-radius:9px;text-transform:uppercase;}
.at-abraao{background:rgba(74,158,191,.15);color:var(--ab);border:1px solid rgba(74,158,191,.25);}
.at-camilla{background:rgba(155,107,181,.15);color:var(--ca);border:1px solid rgba(155,107,181,.25);}
.cd{font-size:10px;color:var(--tx3);}
.cor{font-size:9px;color:var(--tx3);margin-top:2px;}
.ar{display:flex;gap:3px;margin-top:3px;flex-wrap:wrap;}
.atag{font-size:9px;font-weight:600;padding:2px 4px;border-radius:3px;background:rgba(212,130,10,.2);color:var(--q2);border:1px solid rgba(212,130,10,.3);}
.co{font-size:9px;font-weight:600;padding:2px 4px;border-radius:3px;}
.co-o{background:rgba(230,126,34,.2);color:#E67E22;border:1px solid rgba(230,126,34,.3);}
.co-r{background:rgba(192,57,43,.2);color:var(--q1);border:1px solid rgba(192,57,43,.3);}
.cw{flex:1;padding:14px;overflow-y:auto;}
.ctbl{width:100%;border-collapse:collapse;}
.ctbl th{background:var(--dk3);border:1px solid var(--br);padding:8px 11px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);font-weight:600;text-align:left;}
.ctbl td{background:var(--dk2);border:1px solid var(--br);padding:9px 11px;font-size:12px;color:var(--tx);vertical-align:middle;}
.ctbl tr:hover td{background:var(--dk3);cursor:pointer;}
.tdn{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;}
.tdd{color:var(--tx2);font-size:11px;}
.eb{font-size:10px;font-weight:600;padding:2px 7px;border-radius:9px;text-transform:uppercase;}
.pvw{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:11px;}
.pvc{background:var(--dk2);border:1px solid var(--br);border-radius:9px;overflow:hidden;}
.pvh{padding:11px 15px;background:var(--dk3);border-bottom:1px solid var(--br);display:flex;align-items:center;justify-content:space-between;}
.pvn{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;}
.pvm{font-size:11px;color:var(--tx2);margin-top:2px;}
.pvt{padding:11px 15px;display:flex;gap:6px;flex-wrap:wrap;}
.pvs{flex:1;min-width:90px;background:var(--dk3);border:1px solid var(--br);border-radius:7px;padding:8px 9px;display:flex;flex-direction:column;gap:3px;}
.pvsl{font-size:11px;color:var(--tx2);}
.pvss{font-size:10px;font-weight:700;padding:2px 6px;border-radius:9px;align-self:flex-start;}
.pvd{background:rgba(39,174,96,.15);color:var(--q3);border:1px solid rgba(39,174,96,.25);}
.pvp{background:rgba(212,130,10,.15);color:var(--q2);border:1px solid rgba(212,130,10,.25);}
.pvf{background:var(--dk4);color:var(--tx3);border:1px solid var(--br);}
.fw{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:13px;}
.fsum{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;}
.fsc{background:var(--dk2);border:1px solid var(--br);border-radius:9px;padding:13px;}
.fsl{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx2);margin-bottom:4px;}
.fsv{font-size:24px;font-weight:600;font-family:'Cormorant Garamond',serif;}
.fss{font-size:11px;color:var(--tx3);margin-top:2px;}
.ftable{background:var(--dk2);border:1px solid var(--br);border-radius:9px;overflow:hidden;}
.fth{padding:11px 15px;background:var(--dk3);border-bottom:1px solid var(--br);font-size:13px;font-weight:600;color:var(--tx);}
table.ft{width:100%;border-collapse:collapse;}
table.ft th{background:var(--dk3);border:1px solid var(--br);padding:8px 11px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);font-weight:600;text-align:left;}
table.ft td{background:var(--dk2);border:1px solid var(--br);padding:8px 11px;font-size:12px;color:var(--tx);vertical-align:middle;}
table.ft tr:nth-child(even) td{background:var(--dk3);}
.da{background:rgba(192,57,43,.12);color:var(--q1);border:1px solid rgba(192,57,43,.25);font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;}
.dok{background:rgba(39,174,96,.12);color:var(--q3);border:1px solid rgba(39,174,96,.25);font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;}
.ci{background:var(--dk4);border:1px solid var(--gold);border-radius:4px;color:var(--tx);padding:3px 7px;font-size:12px;font-family:'DM Sans',sans-serif;font-weight:600;outline:none;width:65px;}
.aw{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:11px;}
.aabar{display:flex;justify-content:flex-end;margin-bottom:3px;}
.btn-aa{background:var(--gold);color:#000;border:none;border-radius:7px;padding:9px 18px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;}
.acard{background:var(--dk2);border:1px solid var(--br);border-radius:9px;overflow:hidden;}
.acardh{padding:12px 15px;background:var(--dk3);border-bottom:1px solid var(--br);display:flex;align-items:center;justify-content:space-between;}
.aname{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;}
.arole{font-size:11px;color:var(--tx2);margin-top:2px;}
.abody{padding:13px 15px;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.af{background:var(--dk3);border:1px solid var(--br);border-radius:5px;padding:8px 10px;}
.afl{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);margin-bottom:2px;}
.afv{font-size:13px;font-weight:600;color:var(--tx);}
.btn-sm{background:var(--dk3);border:1px solid var(--br);border-radius:5px;color:var(--tx2);padding:4px 9px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;}
.btn-sm:hover{border-color:var(--brh);color:var(--tx);}
.btn-sm.gold{border-color:var(--gold);color:var(--gold);}
.btn-sm.red:hover{border-color:var(--q1);color:var(--q1);}
.dw{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:13px;}
.dgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.dcard{background:var(--dk2);border:1px solid var(--br);border-radius:9px;overflow:hidden;}
.dch{padding:11px 15px;background:var(--dk3);border-bottom:1px solid var(--br);font-size:12px;font-weight:600;color:var(--tx);}
.dcb{padding:13px 15px;}
.br-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
.br-lbl{font-size:11px;color:var(--tx2);width:120px;flex-shrink:0;}
.br-trk{flex:1;background:var(--dk4);border-radius:3px;height:7px;overflow:hidden;}
.br-fil{height:100%;border-radius:3px;}
.br-val{font-size:11px;color:var(--tx);width:24px;text-align:right;flex-shrink:0;}
.mt-trk{width:100%;background:var(--dk4);border-radius:4px;height:8px;margin-top:4px;overflow:hidden;}
.mt-fil{height:100%;border-radius:4px;background:var(--gold);}
.agw{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.ag-ctrl{padding:11px 16px;background:var(--dk2);border-bottom:1px solid var(--br);display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.ag-nav{display:flex;align-items:center;gap:7px;}
.ag-nb{background:var(--dk3);border:1px solid var(--br);border-radius:5px;color:var(--tx);padding:5px 11px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;}
.ag-title{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:var(--tx);min-width:190px;text-align:center;}
.ag-vg{display:flex;gap:3px;margin-left:auto;}
.ag-vb{background:var(--dk3);border:1px solid var(--br);border-radius:5px;color:var(--tx2);padding:5px 12px;font-size:11px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;}
.ag-vb.on{background:var(--gold-d);border-color:var(--gold);color:var(--gold);}
.ag-leg{display:flex;gap:9px;flex-wrap:wrap;padding:8px 16px;background:var(--dk2);border-bottom:1px solid var(--br);}
.ag-li{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--tx2);}
.ag-ld{width:9px;height:9px;border-radius:2px;}
.ag-month{flex:1;overflow-y:auto;padding:12px;}
.mg{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;}
.mdh{background:var(--dk3);padding:6px;text-align:center;font-size:10px;font-weight:600;color:var(--tx2);text-transform:uppercase;}
.mday{background:var(--dk2);border:1px solid var(--br);min-height:80px;padding:5px;cursor:pointer;}
.mday:hover{background:var(--dk3);}
.mday.today{border-color:var(--gold);}
.mday.om{opacity:.4;}
.mdn{font-size:12px;font-weight:600;color:var(--tx);margin-bottom:3px;}
.mday.today .mdn{color:var(--gold);}
.mev{font-size:10px;font-weight:600;padding:2px 4px;border-radius:2px;margin-bottom:2px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ag-week{flex:1;overflow:auto;padding:12px;}
.wg{display:grid;grid-template-columns:48px repeat(7,1fr);border:1px solid var(--br);border-radius:7px;overflow:hidden;}
.wh{background:var(--dk3);padding:7px 5px;text-align:center;font-size:11px;font-weight:600;color:var(--tx2);border-bottom:1px solid var(--br);border-right:1px solid var(--br);position:sticky;top:0;z-index:5;}
.wt{background:var(--dk3);padding:3px 5px;text-align:right;font-size:10px;color:var(--tx3);border-bottom:1px solid var(--br);border-right:1px solid var(--br);height:46px;display:flex;align-items:center;justify-content:flex-end;}
.wc{background:var(--dk2);border-bottom:1px solid var(--br);border-right:1px solid var(--br);height:46px;cursor:pointer;position:relative;padding:2px;}
.wc:hover{background:var(--dk3);}
.we{font-size:10px;font-weight:600;padding:2px 4px;border-radius:2px;color:#fff;position:absolute;left:2px;right:2px;top:2px;overflow:hidden;}
.ag-day{flex:1;overflow-y:auto;padding:12px;}
.dg{max-width:680px;}
.dr{display:flex;border-bottom:1px solid var(--br);}
.dtime{width:55px;flex-shrink:0;padding:9px 7px;font-size:10px;color:var(--tx3);text-align:right;background:var(--dk3);}
.dslot{flex:1;min-height:50px;padding:3px 7px;cursor:pointer;}
.dslot:hover{background:var(--dk3);}
.dev{font-size:12px;font-weight:600;padding:4px 9px;border-radius:4px;color:#fff;margin-bottom:2px;}
.disw{flex:1;padding:14px;overflow-y:auto;display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start;}
.disl{flex:1;min-width:260px;display:flex;flex-direction:column;gap:10px;}
.disr{width:310px;display:flex;flex-direction:column;gap:10px;}
.dsec{background:var(--dk2);border:1px solid var(--br);border-radius:9px;overflow:hidden;}
.dsh{padding:11px 15px;background:var(--dk3);border-bottom:1px solid var(--br);}
.dst{font-size:13px;font-weight:600;color:var(--tx);}
.dss{font-size:11px;color:var(--tx2);margin-top:2px;}
.dsb{padding:11px 15px;display:flex;flex-direction:column;gap:6px;}
.seg{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;background:var(--dk3);border:1px solid var(--br);border-radius:7px;cursor:pointer;}
.seg:hover{border-color:var(--brh);}
.seg.on{border-color:var(--gold);background:var(--gold-d);}
.sn{font-size:12px;font-weight:500;color:var(--tx);}
.sd{font-size:11px;color:var(--tx2);margin-top:1px;}
.sc2{font-size:18px;font-weight:700;color:var(--gold);font-family:'Cormorant Garamond',serif;}
.di{display:flex;align-items:center;justify-content:space-between;padding:8px 11px;background:var(--dk3);border:1px solid var(--br);border-radius:7px;cursor:pointer;}
.di:hover{border-color:var(--brh);}
.di.on{border-color:var(--gold);background:var(--gold-d);}
.prev{background:var(--dk3);border:1px solid var(--br);border-radius:7px;padding:12px;}
.prevl{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-bottom:7px;}
.prevm{font-size:12px;color:var(--tx);line-height:1.7;white-space:pre-line;background:var(--dk4);border-radius:7px;padding:11px;border:1px solid var(--br);}
.prevc{font-size:11px;color:var(--tx2);margin-top:6px;}
.btn-dis{background:var(--gold);color:#000;border:none;border-radius:7px;padding:10px 16px;font-size:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;width:100%;}
.btn-dis:disabled{opacity:.4;cursor:not-allowed;}
.dis-ok{background:rgba(39,174,96,.12);border:1px solid rgba(39,174,96,.3);border-radius:7px;padding:11px 13px;text-align:center;}
.contratos-w{flex:1;padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:13px;}
.ov{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:14px;}
.modal{background:var(--dk2);border:1px solid var(--br);border-radius:11px;width:100%;max-width:720px;max-height:88vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.8);}
.mh{padding:17px 21px;border-bottom:1px solid var(--br);background:var(--dk3);border-radius:11px 11px 0 0;display:flex;align-items:flex-start;justify-content:space-between;}
.mn{font-family:'Cormorant Garamond',serif;font-size:25px;font-weight:600;color:var(--tx);}
.ms{font-size:11px;color:var(--tx2);margin-top:4px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.mc{background:var(--dk4);border:1px solid var(--br);border-radius:5px;color:var(--tx2);width:29px;height:29px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.mc:hover{border-color:var(--gold);color:var(--gold);}
.mb{padding:17px 21px;display:flex;flex-direction:column;gap:16px;}
.stit{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:9px;display:flex;align-items:center;gap:7px;}
.stit::after{content:'';flex:1;height:1px;background:var(--br);}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;}
.fi2{background:var(--dk3);border:1px solid var(--br);border-radius:5px;padding:8px 10px;}
.fil{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx3);margin-bottom:2px;}
.fiv{font-size:12px;color:var(--tx);font-weight:500;}
.fiv.em{color:var(--tx3);font-style:italic;font-size:11px;}
.fiv.warn{color:var(--q2);}
.ef{background:var(--dk4);border:1px solid var(--br);border-radius:5px;color:var(--tx);padding:4px 8px;font-size:12px;font-family:'DM Sans',sans-serif;outline:none;width:100%;}
.ef:focus{border-color:var(--gold);}
.pm{display:flex;gap:4px;flex-wrap:wrap;}
.sb{background:var(--dk3);border:1px solid var(--br);border-radius:5px;color:var(--tx2);padding:4px 9px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;}
.sb.cur{border-color:var(--gold);color:var(--gold);background:var(--gold-d);}
.hi{display:flex;gap:9px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--br);}
.hi:last-child{border-bottom:none;}
.hd{width:6px;height:6px;border-radius:50%;background:var(--gold);margin-top:5px;flex-shrink:0;}
.ht{font-size:11px;color:var(--tx2);line-height:1.5;}
.hdt{font-size:10px;color:var(--tx3);margin-top:1px;}
.stars{display:flex;gap:3px;}
.star{font-size:18px;cursor:pointer;}
.nps-bar{display:flex;gap:2px;margin-top:5px;}
.nps-btn{flex:1;padding:4px 1px;background:var(--dk4);border:1px solid var(--br);border-radius:3px;cursor:pointer;font-size:10px;font-weight:600;color:var(--tx2);font-family:'DM Sans',sans-serif;text-align:center;}
.nps-btn.sel{border-color:var(--gold);color:var(--gold);background:var(--gold-d);}
.cb{background:var(--dk3);border:1px solid var(--br);border-radius:5px;padding:5px 11px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;color:var(--tx2);}
.cb.yes{border-color:var(--q3);color:var(--q3);background:rgba(39,174,96,.1);}
.cb.no{border-color:var(--q1);color:var(--q1);background:rgba(192,57,43,.1);}
.ba{background:rgba(212,130,10,.12);border:1px solid rgba(212,130,10,.3);border-radius:7px;padding:10px 13px;display:flex;align-items:center;gap:9px;margin-bottom:6px;}
.fov{position:fixed;inset:0;background:rgba(0,0,0,.82);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:14px;}
.fmod{background:var(--dk2);border:1px solid var(--br);border-radius:11px;width:100%;max-width:510px;max-height:88vh;overflow-y:auto;}
.fmh{padding:17px 21px;border-bottom:1px solid var(--br);background:var(--dk3);border-radius:11px 11px 0 0;display:flex;align-items:center;justify-content:space-between;}
.fmt{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:var(--tx);}
.fmb{padding:17px 21px;display:flex;flex-direction:column;gap:11px;}
.fr{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.ff{display:flex;flex-direction:column;gap:4px;}
.fl{font-size:10px;letter-spacing:.07em;text-transform:uppercase;color:var(--tx2);}
.fi,.fs,.fta{background:var(--dk3);border:1px solid var(--br);border-radius:5px;color:var(--tx);padding:7px 10px;font-size:12px;font-family:'DM Sans',sans-serif;outline:none;}
.fi:focus,.fs:focus,.fta:focus{border-color:var(--gold);}
.fi::placeholder{color:var(--tx3);}
.fs option{background:var(--dk3);}
.fta{resize:vertical;min-height:65px;}
.fmf{padding:13px 21px;border-top:1px solid var(--br);display:flex;gap:7px;justify-content:flex-end;}
.btn-c{background:var(--dk3);border:1px solid var(--br);border-radius:5px;color:var(--tx2);padding:7px 15px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;}
.btn-s{background:var(--gold);color:#000;border:none;border-radius:5px;padding:7px 17px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;}
.settings-modal{background:var(--dk2);border:1px solid var(--br);border-radius:11px;width:100%;max-width:560px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;}
.settings-tabs-bar{position:sticky;top:0;z-index:10;background:var(--dk2);}
.settings-content{overflow-y:auto;flex:1;}
.hr-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--br);}
.hr-dia{font-size:12px;font-weight:600;color:var(--tx);width:70px;flex-shrink:0;}
.hr-toggle{width:36px;height:20px;border-radius:10px;cursor:pointer;position:relative;flex-shrink:0;transition:background .2s;}
.hr-toggle-dot{width:16px;height:16px;background:#fff;border-radius:50%;position:absolute;top:2px;transition:left .2s;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:var(--dk2);}
::-webkit-scrollbar-thumb{background:var(--dk5);border-radius:3px;}
.empty{text-align:center;padding:48px 14px;color:var(--tx3);font-size:13px;}
.tag-bl{background:rgba(192,57,43,.15);color:var(--q1);border:1px solid rgba(192,57,43,.25);font-size:9px;font-weight:700;padding:2px 4px;border-radius:3px;}
.tag-wl{background:rgba(74,158,191,.15);color:var(--ab);border:1px solid rgba(74,158,191,.25);font-size:9px;font-weight:700;padding:2px 4px;border-radius:3px;}
@keyframes resetBar{from{width:100%}to{width:0%}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
`;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEFAULT_STAGES = [
  { id: "lead", label: "Lead", color: "#5B8DEF", emoji: "🎯" },
  { id: "lead_morno", label: "Solicitação de Consulta", color: "#E8A838", emoji: "🗓️" },
  { id: "aura_agend", label: "Solicitação de Sessão", color: "#8B5CF6", emoji: "✦" },
  { id: "cons_agendada", label: "Consulta Marcada", color: "#9B6BB5", emoji: "📅" },
  { id: "sessao_agend", label: "Sessão Marcada", color: "#4A9EBF", emoji: "✏️" },
  { id: "tatuado", label: "Sessão Realizada", color: "#27AE60", emoji: "✅" },
  { id: "aguard_agend", label: "Aguardando Agendamento", color: "#F39C12", emoji: "⏰" },
  { id: "pos_venda", label: "Pós-venda", color: "#E67E22", emoji: "💬" },
  { id: "lista_espera", label: "Lista de Espera", color: "#3498DB", emoji: "⏳" },
  { id: "hibernacao", label: "Hibernação", color: "#666", emoji: "💤" },
  { id: "blacklist", label: "Blacklist", color: "#C0392B", emoji: "🚫" },
];

const STAGE_INFO: Record<string, string> = {
  lead: "Primeiros contatos captados pelo site, redes sociais, indicação ou qualquer outro canal de entrada. O cliente demonstrou algum interesse mas ainda não foi qualificado. Seu papel aqui é iniciar o relacionamento: entender a ideia, o projeto e o nível de intenção. Quanto antes entrar em contato, maior a chance de conversão.",
  lead_morno: "Clientes que solicitaram consulta via chat. Aguardam contato da equipe para agendar a conversa presencial.",
  aura_agend: "Clientes que solicitaram sessão de tatuagem diretamente pelo chat do site. Aguardam contato para confirmar data e horário. Prioridade de retorno — esse cliente tomou a iniciativa.",
  cons_agendada: "Consulta presencial já confirmada. O cliente virá ao estúdio para uma conversa sobre o projeto: entender a proposta, alinhar expectativas, ver referências e definir o caminho antes de tatuar. Prepare o ambiente e o artista responsável.",
  sessao_agend: "Sessão de tatuagem agendada e confirmada. O projeto já foi discutido, o valor alinhado e o horário marcado. Tudo certo para tatuar na data combinada. Confirme com antecedência e certifique-se de que o cliente está preparado.",
  tatuado: "Sessão concluída com sucesso. Agora é hora do pós-atendimento: acompanhe a cicatrização, peça feedback, solicite avaliação e mantenha o vínculo para futuras sessões ou indicações. Um cliente satisfeito é o melhor canal de aquisição.",
  aguard_agend: "Cliente que confirmou interesse em agendar mas ainda não tem data definida — seja por indisponibilidade de agenda, aguardo de orçamento ou outro motivo. Monitore e entre em contato assim que houver abertura. Não deixe esfriar.",
  pos_venda: "Clientes que passaram pela régua de pós-venda após a sessão. Foco em satisfação, cicatrização saudável e fidelização. Mantenha o relacionamento ativo: eles têm grande potencial para retornar e indicar novas pessoas.",
  lista_espera: "Clientes que querem ser atendidos mas a agenda está sem disponibilidade no momento. Estão aguardando a vez. Contate assim que surgir uma abertura — eles já demonstraram comprometimento ao aceitar esperar.",
  hibernacao: "Clientes inativos temporariamente: sem resposta, sem interesse imediato ou que pediram para ser contatados futuramente. A IA recontata automaticamente na data programada. Não descarte — muitos retornam quando o momento é certo.",
  blacklist: "Clientes com ocorrências graves: faltas repetidas sem aviso, comportamento inadequado, inadimplência ou outros motivos que justifiquem a suspensão do atendimento. Registro para controle interno. Visível apenas pela equipe.",
};

const QC: Record<string, string> = {
  Q0: "q0c", Q1: "q1c", Q2: "q2c", Q3: "q3c"
};

const STAR_REASONS = [
  "",
  "Muito dificil",
  "Comunicacao dificil",
  "Normal",
  "Boa experiencia",
  "Excelente"
];

const getEventColor = (tipo: string, artists: any[], artistaId?: string): string => {
  if (!tipo) return "#888";
  if (tipo === "bloq_geral") return "#555";
  if (tipo === "piercing") return "#E91E8C";
  const parts = tipo.split("_");
  const prefix = parts[0];
  if (prefix === "bloq") return "#C0392B";
  const id = artistaId || parts.slice(1).join("_");
  const artist = artists.find(a => a.id === id);
  return artist?.cor || "#888";
};

const getBloqLabel = (tipo: string, artistsList: any[]) => {
  if (tipo === "bloq_geral") return "TODOS";
  if (tipo.startsWith("bloq_")) {
    const artId = tipo.replace("bloq_","");
    const art = artistsList.find(a => a.id === artId);
    return art ? "Bloqueio " + art.nome.split(" ")[0] : "Bloqueio";
  }
  return getEventLabel(tipo, artistsList);
};
const getBloqColor = (tipo: string, artistsList: any[]) => {
  return getEventColor(tipo, artistsList);
};
const buildEventTitle = (e: any, allEvents: any[]) => {
  if (!e) return "";
  if (e.tipo === "piercing") return "Piercing";
  if (e.tipo?.startsWith("bloq_")) return e.title || "";
  const title = e.title || "";
  if (e.tipo?.startsWith("cons_")) return title + " — Consulta";
  if (e.tipo?.startsWith("sess_")) {
    const sessoesBefore = allEvents.filter(ev =>
      ev.cliente_id === e.cliente_id &&
      ev.tipo?.startsWith("sess_") &&
      ev.date < e.date
    ).length;
    if (sessoesBefore === 0) return title + " — Sessão";
    const ordinal = sessoesBefore + 1;
    const ord = ordinal === 2 ? "2ª" : ordinal === 3 ? "3ª" : ordinal === 4 ? "4ª" : ordinal + "ª";
    return title + " — " + ord + " Sessão";
  }
  return title;
};

const getEventLabel = (tipo: string, artistsList?: any[]) => {
  if (!tipo) return "Evento";
  if (tipo === "bloq_geral") return "Bloq. Geral";
  if (tipo === "piercing") return "Piercing";
  const parts = tipo.split("_");
  const prefix = parts[0];
  const artistId = parts.slice(1).join("_");
  const artist = artistsList ? artistsList.find(a => a.id === artistId) : null;
  const nome = artist ? (artist.nome.split(" ")[0] || "") : "";
  if (prefix === "cons") return "Consulta" + (nome ? " " + nome : "");
  if (prefix === "sess") return "Sessão" + (nome ? " " + nome : "");
  if (prefix === "bloq") return "Bloq." + (nome ? " " + nome : "");
  return tipo;
};

const SEGS = [
  { id: "todos", label: "Todos", desc: "Toda a base", icon: "👥", f: () => true },
  { id: "q0", label: "Q0 - Presencial", desc: "Estiveram no atelier", icon: "🟣", f: (c: any) => c.qual === "Q0" },
  { id: "q1", label: "Q1 - Frios", desc: "Nutricao e educacao", icon: "🔴", f: (c: any) => c.qual === "Q1" },
  { id: "q2", label: "Q2 - Quentes", desc: "Prontos para avancar", icon: "🟡", f: (c: any) => c.qual === "Q2" },
  { id: "tatuados", label: "Tatuados", desc: "Ja fizeram sessao", icon: "🖤", f: (c: any) => c.etapa === "tatuado" || c.etapa === "aguard_agend" || c.etapa === "pos_venda" },
  { id: "primeira", label: "Primeira Tattoo", desc: "Primeira vez", icon: "✨", f: (c: any) => c.primeira },
  { id: "google", label: "Avaliacao Google", desc: "Tatuados sem avaliacao", icon: "⭐", f: (c: any) => (c.etapa === "tatuado" || c.etapa === "aguard_agend" || c.etapa === "pos_venda") && !c.googleReview },
  { id: "retorno", label: "Retorno Sazonal", desc: "Tatuados ha mais de 6 meses", icon: "🔄", f: (c: any) => (c.etapa === "tatuado" || c.etapa === "aguard_agend" || c.etapa === "pos_venda") && c.dias >= 180 },
];

const DATAS = [
  { id: "maes", label: "Dia das Maes", data: "11 Mai", icon: "🌸" },
  { id: "namorados", label: "Namorados", data: "12 Jun", icon: "💝" },
  { id: "pais", label: "Dia dos Pais", data: "10 Ago", icon: "👨‍👦" },
  { id: "natal", label: "Natal", data: "25 Dez", icon: "🎄" },
  { id: "anoNovo", label: "Ano Novo", data: "01 Jan", icon: "🎆" },
  { id: "aniversario", label: "Aniversarios", data: "Mensal", icon: "🎂" },
  { id: "aniAbraao", label: "Aniv. do Responsável", data: "—", icon: "🎉" },
  { id: "aniCamilla", label: "Aniv. Camilla (26/Jun)", data: "26 Jun", icon: "🎉" },
  { id: "diaTatuador", label: "Dia do Tatuador", data: "10 Dez", icon: "🖋️" },
];

const MSGS: Record<string, string> = {
  todos: "Olá, [Nome]\n\nO [ESTUDIO] tem algo especial esperando por voce.\n\nSe a sua ideia ainda esta guardada, talvez seja hora de tira-la do papel.",
  q0: "Olá, [Nome]\n\nQue bom ter te recebido aqui.\n\nA arte que voce viu sendo criada foi feita com muito cuidado. Se algum dia quiser criar a sua, será uma honra.",
  q1: "Olá, [Nome]\n\nO [ESTUDIO] não tem pressa - tem comprometimento com projetos que fazem sentido para quem os carrega na pele.",
  q2: "Olá, [Nome]\n\nVoce chegou com uma ideia linda - e ela ficou guardada com a gente.\n\nSeria um prazer evoluir essa conversa juntos.",
  tatuados: "Olá, [Nome]\n\nEspero que sua arte esteja linda e bem cuidada. Se a proxima ideia ja esta nascendo, você sabe onde nos encontrar.",
  homenagem: "Olá, [Nome]\n\nNessa época especial, lembramos de voce e da arte que escolheu eternizar na sua pele.",
  primeira: "Olá, [Nome]\n\nTodo começo é especial - e o seu ficou guardado com muito carinho.\n\nSe a segunda ideia está surgindo, será uma honra.",
  abraao: "Olá, [Nome]\n\nO Abraão tem novidades no atelier e pensou em voce.\n\nQuando quiser conversar, e so chamar.",
  camilla: "Olá, [Nome]\n\nA Camilla tem algo especial se formando e pensou em voce.",
  maes: "Olá, [Nome]\n\nFeliz Dia das Mães.\n\nAlgumas memorias merecem ser eternas. O [ESTUDIO] esta aqui para transformar esse sentimento em arte.",
  namorados: "Olá, [Nome]\n\nFeliz Dia dos Namorados.\n\nO [ESTUDIO] transforma amor em arte.",
  pais: "Olá, [Nome]\n\nFeliz Dia dos Pais.\n\nSe existe uma homenagem guardada no coracao - talvez esse seja o momento certo.",
  natal: "Olá, [Nome]\n\nQue esse Natal seja cheio de momentos que voce vai querer guardar para sempre.",
  anoNovo: "Olá, [Nome]\n\nUm novo ano carrega novas histórias. O [ESTUDIO] esta pronto para fazer acontecer.",
  aniAbraao: "Olá, [Nome]\n\nHoje é um dia muito especial para o [ESTUDIO].\n\nPreparamos uma condicao exclusiva para celebrar esse dia juntos. Quando quiser saber mais, e so me chamar.",
  aniCamilla: "Olá, [Nome]\n\nHoje o [ESTUDIO] celebra um aniversário especial.\n\nE a melhor forma de comemorar e presentear quem faz parte da nossa historia.\n\nTemos algo especial reservado para voce. Quando quiser saber mais, e so me chamar.",
  aniversario: "Olá, [Nome]\n\nHoje é um dia muito especial - e o [ESTUDIO] quer fazer parte dele.\n\nComo presente: 50% de desconto na sua próxima tatuagem, válido por 15 dias.\n\nQuando quiser saber mais, e so chamar.",
  google: "Olá, [Nome]\n\nEspero que sua tatuagem esteja linda e bem cuidada.\n\nSe sua experiencia no [ESTUDIO] foi especial, sua avaliação no Google faz toda a diferença para nós crescermos juntos.\n\nLeva só 1 minutinho: [LINK_GOOGLE]\n\nObrigado de coração.",
  diaTatuador: "Olá, [Nome]\n\nHoje é o Dia do Tatuador - e o [ESTUDIO] tem muito a celebrar.\n\nObrigado por fazer parte dessa historia. Cada arte que criamos juntos e uma memoria que voce carrega para sempre.",
  retorno: "Olá, [Nome]\n\nFaz um tempo que não nos vemos por aqui.\n\nO [ESTUDIO] esta com novidades e seria uma honra continuar a sua historia com a gente. Quando quiser conversar, e so chamar.",
};

// ─── POS-VENDA FLOW ───────────────────────────────────────────────────────────
const PV_FLOW = [
  { id: "d0", label: "Dia da sessao", dias: 0, msg: "Olá, [Nome]! Obrigado por confiar no [ESTUDIO]. Como foi sua experiencia hoje? Estamos aqui se precisar de qualquer coisa." },
  { id: "d1", label: "D+1 Cicatrizacao", dias: 1, msg: "Olá, [Nome]! Como esta sua tatuagem hoje? Lembre-se: mantenha hidratada, evite sol direto e não fure as bolhas se aparecerem. Qualquer dúvida, e so chamar." },
  { id: "d7", label: "D+7 Saude", dias: 7, msg: "Olá, [Nome]! Uma semana ja! Como está cicatrizando? Se notar vermelhidão, inchaço ou secrecao, nos avise imediatamente." },
  { id: "d7g", label: "D+7 Avaliacao Google", dias: 7, msg: "Olá, [Nome]! Se sua experiencia no [ESTUDIO] foi especial, sua avaliação no Google faz toda a diferenca para nos. Leva só 1 minutinho: [LINK_GOOGLE]" },
  { id: "d30", label: "D+30 Garantia", dias: 30, msg: "Olá, [Nome]! Seu retoque gratuito vence em 7 dias. Se quiser agendar, e so nos chamar. Apos o dia 37, o retoque será cobrado normalmente." },
  { id: "d37", label: "D+37 Ultimo dia", dias: 37, msg: "Olá, [Nome]! Hoje é o último dia da sua garantia de retoque gratuito. Se precisar, nos chame agora. Depois disso, o retoque será cobrado a combinar." },
];

const PRE_SESSAO_FLOW = [
  { id: "ps_d1", label: "Confirmação — véspera", dias: 1, msg: "Olá, {nome}! Sua sessão está agendada para amanhã, {data} às {hora}h com {artista}. Confirme sua presença respondendo este e-mail. Qualquer dúvida, é só chamar!" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtDate(d: Date): string {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function getWeekDates(d: Date): Date[] {
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return x;
  });
}

function getMonthDates(d: Date): { date: Date; cur: boolean }[] {
  const y = d.getFullYear(), m = d.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const sd = first.getDay();
  const days: { date: Date; cur: boolean }[] = [];
  for (let i = 0; i < sd; i++) days.push({ date: new Date(y, m, 1 - sd + i), cur: false });
  for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(y, m, i), cur: true });
  while (days.length % 7 !== 0) days.push({ date: new Date(y, m + 1, days.length - last.getDate() - sd + 1), cur: false });
  return days;
}

// ─── CONTRACT GENERATORS ─────────────────────────────────────────────────────
function makeContractArtist(sName: string): string {
  return `CONTRATO DE PRESTACAO DE SERVICOS ARTISTICOS
INK SYSTEM - ${sName}

CONTRATANTE: ${sName}
CONTRATADO(A): [NOME COMPLETO] | CPF: [CPF] | Email: [EMAIL] | Instagram: [INSTAGRAM]
Tipo de vínculo: [RESIDENTE / GUEST] | Periodo: [DATA INICIO] a [DATA FIM]

CLAUSULA 1 - OBJETO
Prestacao de servicos de tatuagem artistica nas dependencias do estudio contratante, pelo periodo acima definido.

CLAUSULA 2 - REMUNERACAO E COMISSAO
O(A) contratado(a) recebera comissao de [X]% sobre o valor liquido de cada sessao realizada. Os repasses serao efetuados mensalmente ate o dia [X] do mes subsequente. A taxa de R$100,00 cobrada por falta do cliente sem aviso e o valor de 30% cobrado em caso de segunda falta tambem serao divididos conforme o percentual acordado nesta clausula.

CLAUSULA 3 - HORARIO E CONDUTA
O(A) contratado(a) respeitara integralmente o horario de funcionamento do estudio. Bloqueios de agenda devem ser comunicados com antecedencia minima de [X] dias. As mesmas regras de atendimento, incluindo politica de faltas e blacklist, aplicam-se igualmente a artistas residentes e guests.

CLAUSULA 4 - CONFIDENCIALIDADE E LGPD
Os dados pessoais dos clientes sao propriedade exclusiva do contratante. E expressamente proibido ao(a) contratado(a): copiar, reproduzir ou utilizar dados de clientes para fins pessoais ou comerciais; entrar em contato com clientes do estudio por canais externos ao sistema; divulgar informacoes sobre clientes a terceiros.

CLAUSULA 5 - NAO CAPTACAO DE CLIENTES
Pelo periodo de 12 (doze) meses apos o encerramento deste contrato, o(a) contratado(a) fica proibido(a) de contatar ativamente clientes da base do estudio com o objetivo de atrai-los para outro estabelecimento. Esta clausula nao impede o cliente de buscar o(a) artista por iniciativa propria.

CLAUSULA 6 - DIREITOS AUTORAIS
As artes desenvolvidas nas dependencias do estudio e com clientes do estudio sao de co-autoria do(a) artista e do contratante, podendo ambas as partes utiliza-las para portfolio com credito mutuo.

CLAUSULA 7 - RESCISAO
Qualquer das partes podera rescindir este contrato com aviso previo de [X] dias.

________________________ ________________________
Contratante                    Contratado(a)

* Revisar com advogado especializado antes de assinar.`;
}

function makeContractClient(sName: string, nome: string, artista: string, proj: string, valor: string): string {
  return `CONFIRMACAO DE PROJETO ARTISTICO
${sName}

Cliente: ${nome} | Profissional: ${artista}
Data: ${new Date().toLocaleDateString("pt-BR")}
Projeto: ${proj}
Valor acordado: ${valor}

TERMOS E CONDICOES

1. EXCLUSIVIDADE DO PROJETO
Este projeto foi desenvolvido de forma personalizada e exclusiva para o cliente.

2. VALOR E PAGAMENTO
Em caso de nao comparecimento sem aviso com 24h de antecedencia, sera cobrada uma taxa de R$100,00, abatida no valor final. Em caso de segunda falta, sera cobrado 30% do valor orcado.

3. DIREITO AO DESENHO
O desenho desenvolvido na consultoria pertence ao estudio. O cliente nao tem direito de leva-lo sem autorizacao expressa do artista.

4. GARANTIA DE RETOQUE
O retoque gratuito e garantido por 30 dias apos a sessao, com tolerancia de ate 37 dias. Em caso comprovado de dano intencional, o valor do retoque sera o dobro do valor original da sessao.

5. USO DE IMAGEM
O cliente autoriza o uso de fotos da tatuagem para portfolio e redes sociais do estudio, salvo solicitacao contraria registrada formalmente.

6. REAGENDAMENTO
O cliente pode reagendar sem cobranca desde que avise com minimo de 24 horas de antecedencia.

Ao responder CONFIRMO, o cliente declara estar de acordo com todos os termos acima.

INK SYSTEM`;
}

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const ARTISTS_INIT: any[] = [];

const CLIENTS_INIT: any[] = [];

const FIN_INIT: any[] = [];


// ─── TIME SCROLLER ────────────────────────────────────────────────────────────
function TimeScroller({ value, onChange, label }: { value: number; onChange: (h: number, m: number) => void; label: string }) {
  const safeVal = (isNaN(value) || value == null) ? 9 : value;
  const hour = Math.floor(safeVal);
  const [open, setOpen] = useState(false);
  const [selH, setSelH] = useState(hour);
  const [selM, setSelM] = useState(0);
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINS = [0, 15, 30, 45];
  useEffect(() => {
    const sv = (isNaN(value) || value == null) ? 9 : value;
    setSelH(Math.floor(sv));
  }, [value]);
  const confirm = (h: number, m: number) => { onChange(h, m); setOpen(false); };
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <label className="fl">{label}</label>
      <div onClick={() => setOpen(v => !v)} className="fi"
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
        <span>{String(selH).padStart(2,"0")}:{String(selM).padStart(2,"0")}</span>
        <span style={{ fontSize: 10, color: "var(--tx3)" }}>▾</span>
      </div>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 0, zIndex: 9999, background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,.6)", marginTop: 4, padding: "8px 4px", width: 140 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "var(--tx3)", textAlign: "center", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>Hora</div>
              <div style={{ height: 160, overflowY: "auto", scrollbarWidth: "thin" }}>
                {HOURS.map(h => (
                  <div key={h} onClick={() => setSelH(h)}
                    style={{ padding: "6px 4px", textAlign: "center", fontSize: 13, borderRadius: 4, cursor: "pointer", fontWeight: h === selH ? 700 : 400, color: h === selH ? "var(--gold)" : "var(--tx)", background: h === selH ? "rgba(201,168,76,.1)" : "" }}>
                    {String(h).padStart(2,"0")}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: 1, background: "var(--br)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "var(--tx3)", textAlign: "center", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>Min</div>
              <div style={{ height: 160, overflowY: "auto" }}>
                {MINS.map(m => (
                  <div key={m} onClick={() => setSelM(m)}
                    style={{ padding: "6px 4px", textAlign: "center", fontSize: 13, borderRadius: 4, cursor: "pointer", fontWeight: m === selM ? 700 : 400, color: m === selM ? "var(--gold)" : "var(--tx)", background: m === selM ? "rgba(201,168,76,.1)" : "" }}>
                    {String(m).padStart(2,"0")}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => confirm(selH, selM)}
            style={{ width: "100%", marginTop: 8, background: "var(--gold)", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 12, fontWeight: 700, color: "#1a1a1a", cursor: "pointer" }}>
            OK
          </button>
        </div>
      )}
    </div>
  );
}

// ─── DATE SCROLLER ────────────────────────────────────────────────────────────
function DateScroller({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const curYear = new Date().getFullYear();
  const parseVal = (v: string) => {
    if (!v) return { d: 1, m: 1, y: curYear };
    const parts = v.split("-");
    if (parts.length === 3) return { y: parseInt(parts[0]) || curYear, m: parseInt(parts[1]) || 1, d: parseInt(parts[2]) || 1 };
    return { d: 1, m: 1, y: curYear };
  };
  const pv = parseVal(value);
  const [open, setOpen] = useState(false);
  const [selD, setSelD] = useState(pv.d);
  const [selM, setSelM] = useState(pv.m);
  const [selY, setSelY] = useState(pv.y);
  useEffect(() => {
    const pv2 = parseVal(value);
    setSelD(pv2.d); setSelM(pv2.m); setSelY(pv2.y);
  }, [value]);
  const daysInMonth = (m: number, y: number) => new Date(y, m, 0).getDate();
  const maxD = daysInMonth(selM, selY);
  const DAYS = Array.from({ length: maxD }, (_, i) => i + 1);
  const MNAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const YEARS = [curYear, curYear+1, curYear+2, curYear+3, curYear+4];
  const safeD = Math.min(selD, maxD);
  const confirm = (d: number, m: number, y: number) => {
    const safe = Math.min(d, daysInMonth(m, y));
    const str = y + "-" + String(m).padStart(2,"0") + "-" + String(safe).padStart(2,"0");
    onChange(str);
    setOpen(false);
  };
  const display = value ? (value.split("-").reverse().join("/")) : "DD/MM/AAAA";
  return (
    <div style={{ position: "relative", flex: 1 }}>
      {label && <label className="fl">{label}</label>}
      <div onClick={() => setOpen(v => !v)} className="fi"
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
        <span style={{ color: value ? "var(--tx)" : "var(--tx3)" }}>{display}</span>
        <span style={{ fontSize: 10, color: "var(--tx3)" }}>▾</span>
      </div>
      {open && (
        <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 0, zIndex: 9999, background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,.6)", marginTop: 4, padding: "8px 4px", width: 210 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "var(--tx3)", textAlign: "center", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>Dia</div>
              <div style={{ height: 160, overflowY: "auto", scrollbarWidth: "thin" }}>
                {DAYS.map(d => (
                  <div key={d} onClick={() => setSelD(d)}
                    style={{ padding: "6px 4px", textAlign: "center", fontSize: 13, borderRadius: 4, cursor: "pointer", fontWeight: d === safeD ? 700 : 400, color: d === safeD ? "var(--gold)" : "var(--tx)", background: d === safeD ? "rgba(201,168,76,.1)" : "" }}>
                    {String(d).padStart(2,"0")}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: 1, background: "var(--br)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "var(--tx3)", textAlign: "center", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>Mês</div>
              <div style={{ height: 160, overflowY: "auto", scrollbarWidth: "thin" }}>
                {MNAMES.map((mn, i) => (
                  <div key={i} onClick={() => setSelM(i + 1)}
                    style={{ padding: "6px 4px", textAlign: "center", fontSize: 12, borderRadius: 4, cursor: "pointer", fontWeight: (i + 1) === selM ? 700 : 400, color: (i + 1) === selM ? "var(--gold)" : "var(--tx)", background: (i + 1) === selM ? "rgba(201,168,76,.1)" : "" }}>
                    {mn}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: 1, background: "var(--br)" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "var(--tx3)", textAlign: "center", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 4 }}>Ano</div>
              <div style={{ height: 160, overflowY: "auto", scrollbarWidth: "thin" }}>
                {YEARS.map(y => (
                  <div key={y} onClick={() => setSelY(y)}
                    style={{ padding: "6px 4px", textAlign: "center", fontSize: 13, borderRadius: 4, cursor: "pointer", fontWeight: y === selY ? 700 : 400, color: y === selY ? "var(--gold)" : "var(--tx)", background: y === selY ? "rgba(201,168,76,.1)" : "" }}>
                    {y}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => confirm(safeD, selM, selY)}
            style={{ width: "100%", marginTop: 8, background: "var(--gold)", border: "none", borderRadius: 6, padding: "6px 0", fontSize: 12, fontWeight: 700, color: "#1a1a1a", cursor: "pointer" }}>
            OK
          </button>
        </div>
      )}
    </div>
  );
}

// ─── COLOR PICKER ─────────────────────────────────────────────────────────────
function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  let h = 0;
  if (d) { if (max===r) h=(g-b)/d%6; else if (max===g) h=(b-r)/d+2; else h=(r-g)/d+4; h=Math.round(h*60); if(h<0)h+=360; }
  return [h, max ? Math.round(d/max*100) : 0, Math.round(max*100)];
}
function hsvToHex(h: number, s: number, v: number): string {
  s/=100; v/=100;
  const f=(n:number)=>{const k=(n+h/60)%6; return v-v*s*Math.max(0,Math.min(k,4-k,1));};
  const toH=(n:number)=>Math.round(f(n)*255).toString(16).padStart(2,"0");
  return "#"+toH(5)+toH(3)+toH(1);
}
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [hsv, setHsv] = useState<[number,number,number]>(() => hexToHsv(value || "#C9A84C"));
  const sqRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"sq"|"hue"|null>(null);
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  useEffect(() => { setHsv(hexToHsv(value || "#C9A84C")); }, [value]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const calcSq = useCallback((e: MouseEvent) => {
    if (!sqRef.current) return;
    const r = sqRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const ns: [number,number,number] = [hsvRef.current[0], Math.round(x*100), Math.round((1-y)*100)];
    setHsv(ns); onChangeRef.current(hsvToHex(...ns));
  }, []);
  const calcHue = useCallback((e: MouseEvent) => {
    if (!hueRef.current) return;
    const r = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const ns: [number,number,number] = [Math.round(x*360), hsvRef.current[1], hsvRef.current[2]];
    setHsv(ns); onChangeRef.current(hsvToHex(...ns));
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => { if (dragRef.current === "sq") calcSq(e); else if (dragRef.current === "hue") calcHue(e); };
    const up = () => { dragRef.current = null; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [calcSq, calcHue]);

  const bgSq = `hsl(${hsv[0]},100%,50%)`;
  const curX = hsv[1]; const curY = 100 - hsv[2];
  const sqBg = `linear-gradient(to right,#fff,transparent),linear-gradient(to top,#000,transparent),linear-gradient(${bgSq},${bgSq})`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, userSelect: "none" }}>
      <div ref={sqRef}
        onMouseDown={e => { dragRef.current = "sq"; calcSq(e); }}
        style={{ width: "100%", height: 140, borderRadius: 6, position: "relative", cursor: "crosshair",
          backgroundImage: sqBg }}>
        <div style={{ position: "absolute", left: `calc(${curX}% - 6px)`, top: `calc(${curY}% - 6px)`,
          width: 12, height: 12, borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 2px rgba(0,0,0,.5)", pointerEvents: "none" }} />
      </div>
      <div ref={hueRef}
        onMouseDown={e => { dragRef.current = "hue"; calcHue(e); }}
        style={{ width: "100%", height: 14, borderRadius: 7, cursor: "pointer", position: "relative",
          background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)" }}>
        <div style={{ position: "absolute", left: `calc(${hsv[0]/360*100}% - 7px)`, top: 0,
          width: 14, height: 14, borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 2px rgba(0,0,0,.5)", background: `hsl(${hsv[0]},100%,50%)`, pointerEvents: "none" }} />
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: hsvToHex(...hsv), border: "1px solid var(--br)", flexShrink: 0 }} />
        <input value={hsvToHex(...hsv)} onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{6}$/.test(v)) { onChange(v); setHsv(hexToHsv(v)); } }}
          style={{ flex: 1, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "var(--tx)", fontFamily: "monospace" }} />
      </div>
    </div>
  );
}

// ─── MÁSCARA TELEFONE ────────────────────────────────────────────────────────
function maskCNPJ(v: string) {
  v = v.replace(/\D/g,"").slice(0,14);
  if (v.length <= 2) return v;
  if (v.length <= 5) return v.slice(0,2)+"."+v.slice(2);
  if (v.length <= 8) return v.slice(0,2)+"."+v.slice(2,5)+"."+v.slice(5);
  if (v.length <= 12) return v.slice(0,2)+"."+v.slice(2,5)+"."+v.slice(5,8)+"/"+v.slice(8);
  return v.slice(0,2)+"."+v.slice(2,5)+"."+v.slice(5,8)+"/"+v.slice(8,12)+"-"+v.slice(12);
}
function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function maskTel(v: string) {
  if (!v) return "";
  v = String(v).replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v.length ? "(" + v : v;
  if (v.length <= 7) return "(" + v.slice(0,2) + ") " + v.slice(2);
  if (v.length <= 11) return "(" + v.slice(0,2) + ") " + v.slice(2,7) + "-" + v.slice(7);
  return v;
}
function validarEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function parseNascimento(nasc: string): Date | null {
  if (!nasc) return null;
  if (nasc.includes("/")) {
    const p = nasc.split("/");
    if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  }
  if (nasc.includes("-")) {
    const p = nasc.split("-");
    if (p.length === 3) return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  const d = new Date(nasc);
  return isNaN(d.getTime()) ? null : d;
}
function isAniversHoje(nasc: string): boolean {
  if (!nasc) return false;
  const d = parseNascimento(nasc);
  if (!d) return false;
  const hoje = new Date();
  return d.getMonth() === hoje.getMonth() && d.getDate() === hoje.getDate();
}
function isAniversMes(nasc: string): boolean {
  if (!nasc) return false;
  const d = parseNascimento(nasc);
  if (!d) return false;
  return d.getMonth() === new Date().getMonth();
}
function isMenor(nasc: string): boolean {
  if (!nasc) return false;
  const d = parseNascimento(nasc);
  if (!d) return false;
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  if (hoje.getMonth() < d.getMonth() || (hoje.getMonth() === d.getMonth() && hoje.getDate() < d.getDate())) idade--;
  return idade < 18;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function CRM() {
  const hojeLocal = () => {
    const agora = new Date();
    const offset = -3 * 60; // Brasília UTC-3
    return new Date(agora.getTime() + (offset - agora.getTimezoneOffset()) * 60000);
  };

  // ── LOGIN ──
  const [logado, setLogado] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  // ── LICENÇA ──
  const [licencaOk, setLicencaOk] = useState(true);
  const [licencaMsg, setLicencaMsg] = useState("");
  const [licencas, setLicencas] = useState<any[]>([]);
  // ── PERFIL DE ACESSO ──
  const [userRole, setUserRole] = useState<"admin"|"profissional">("admin");
  const [userArtistId, setUserArtistId] = useState<string>("");

  // ── TOUR ──
  const [tourAtivo, setTourAtivo] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const TOUR_STEPS = [
    { sel: ".topbar", title: "Topbar", desc: "Aqui ficam o logo do seu estúdio, o botão de alertas e o acesso às configurações." },
    { sel: ".tabs", title: "Abas de Navegação", desc: "Pipeline, Clientes, Agenda, Financeiro, Profissionais e mais. Clique para navegar entre as seções." },
    { sel: ".kw", title: "Pipeline Kanban", desc: "Cada coluna representa uma etapa do cliente. Arraste ou clique nos botões da ficha para mover." },
    { sel: ".btn-new", title: "Novo Cliente", desc: "Cadastre um novo cliente aqui. Preencha os dados básicos e ele entra automaticamente no Pipeline." },
    { sel: ".alert-btn", title: "Alertas", desc: "Notificações de clientes sem contato, orçamentos pendentes e garantias vencendo." },
    { sel: ".srch", title: "Busca Global", desc: "Busque clientes por nome, telefone, Instagram, estilo ou qualquer campo." },
  ];

  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem("inq_onb"));
  const [showSplash, setShowSplash] = useState(() => !!localStorage.getItem("inq_onb"));
  const [userId, setUserId] = useState<string>("");
  const [onbStep, setOnbStep] = useState(0);
  const [dark, setDark] = useState(true);
  const [tema, setTema] = useState<ThemeId>("carvalho");
  const [studioName, setStudioName] = useState("");
  const [studioLogo, setStudioLogo] = useState<string>(() => localStorage.getItem("inq_logo") || "");
  const [studioTel, setStudioTel] = useState("");
  const [studioOwner, setStudioOwner] = useState("");
  const [studioEmail, setStudioEmail] = useState("");
  const [studioCity, setStudioCity] = useState("");
  const [studioInsta, setStudioInsta] = useState("");
  const [studioRua, setStudioRua] = useState("");
  const [studioNumero, setStudioNumero] = useState("");
  const [studioComplemento, setStudioComplemento] = useState("");
  const [studioBairro, setStudioBairro] = useState("");
  const [studioCep, setStudioCep] = useState("");
  const [studioEstado, setStudioEstado] = useState("");
  const [studioPais, setStudioPais] = useState("Brasil");
  const [studioRedes, setStudioRedes] = useState<{plataforma: string; usuario: string}[]>([]);
  const [donoNome, setDonoNome] = useState("");
  const [donoWhats, setDonoWhats] = useState("");
  const [donoEmail, setDonoEmail] = useState("");
  const [auraName, setAuraName] = useState("");
  const [auraInstrucoes, setAuraInstrucoes] = useState("Sou profissional da área de (ex: tatuagem / odontologia / estética / barbearia / nutrição / fotografia / fisioterapia / advocacia / educação / moda...).\nMinha especialidade principal é (ex: blackwork e realismo / clareamento dental e implantes / depilação a laser e skincare / cortes masculinos e barba / emagrecimento e reeducação alimentar / retratos e ensaios / pilates e reabilitação...).\nMeu negócio se chama (nome do negócio) e fica em (cidade e bairro ou endereço completo).\nAtendo (ex: somente presencialmente / online e presencialmente / apenas por videochamada / em domicílio).\n\nMe chamo (seu nome) e sou (ex: tatuador há 10 anos especializado em arte autoral / dentista com foco em estética do sorriso / esteticista com 8 anos de experiência em tratamentos faciais / nutricionista clínico e esportivo...).\nTrabalho (ex: sozinho em estúdio próprio / com uma equipe de 3 profissionais / com assistentes e recepcionista).\n\nMeu tom de comunicação é (ex: descontraído, próximo e sem formalidade — como um amigo especialista / profissional e preciso, sempre claro e objetivo / empático e acolhedor, especialmente com clientes ansiosos ou com dúvidas / artístico e criativo, refletindo a identidade do negócio / direto e eficiente, sem rodeios).\nUso de emojis nas respostas: (ex: nenhum — mantenho comunicação limpa e profissional / use com moderação apenas para reforçar pontos importantes / use livremente para deixar a conversa mais leve e expressiva).\nTrato os clientes por: (ex: 'você' com tom próximo / 'você' formalmente / 'tu' de forma informal / sempre pelo primeiro nome).\n\nMeus serviços e valores são: (ex: tatuagem pequena a partir de R$200, sessão de 3h por R$500, projetos grandes sob orçamento / consulta de avaliação gratuita, limpeza de pele R$150, botox a partir de R$800 / plano mensal de acompanhamento R$350, consulta avulsa R$180...).\nQuando um cliente perguntar sobre preço: (ex: explique que o valor depende do tamanho e complexidade do projeto e convide para uma consulta gratuita / informe a tabela de preços e ofereça condições de parcelamento / diga que enviará um orçamento personalizado após entender a necessidade).\nFormas de pagamento aceitas: (ex: Pix, cartão de crédito em até 3x sem juros e dinheiro / somente Pix e transferência / todos os meios, inclusive parcelamento em até 12x).\n\nPara confirmar um agendamento: (ex: cobramos sinal de 30% antecipado via Pix — sem sinal não há confirmação / exigimos apenas o preenchimento do cadastro / a consulta inicial é gratuita e sem compromisso, sem necessidade de sinal).\nCancelamentos e remarcações: (ex: aceitamos com até 48h de antecedência sem custo / cobramos taxa de R$50 para remarcar com menos de 24h / o sinal é descontado do valor final mas não é reembolsável em caso de desistência).\nClientes que faltaram sem avisar: (ex: cobramos taxa de R$100 para reagendar — é nossa política de respeito ao tempo de trabalho / damos uma segunda chance sem custo mas registramos no histórico / não reagendamos sem justificativa plausível).\n\nMeu horário de funcionamento: (ex: terça a sábado das 10h às 19h / segunda a sexta das 9h às 18h, sábados das 9h às 14h / atendo por agendamento sem horário fixo, conforme disponibilidade).\nNão atendo: (ex: às segundas-feiras / aos domingos e feriados / em horários fora do comercial, exceto em casos especiais).\n\nO processo de atendimento começa com: (ex: uma consulta presencial gratuita para entender o projeto e apresentar referências / um formulário de pré-avaliação que envio pelo WhatsApp / o envio de fotos de referência pelo cliente para eu avaliar a viabilidade).\nApós a consulta ou primeiro contato: (ex: enviamos o orçamento em até 48h por WhatsApp / já agendamos a sessão na hora se o cliente aprovar / o cliente tem 7 dias para confirmar com o sinal).\nNão realizamos: (ex: coberturas sem avaliação presencial prévia / procedimentos sem laudo médico quando necessário / trabalhos copiados de outros artistas — cada projeto é único / atendimentos de urgência sem agendamento).\n\nInformações importantes que a agente deve sempre ter em mente:\n- (ex: temos lista de espera — novos clientes podem aguardar até 2 meses para o primeiro atendimento)\n- (ex: não trabalhamos com convênio ou plano de saúde)\n- (ex: o valor da consulta inicial é descontado no serviço aprovado)\n- (ex: atendemos clientes a partir de 18 anos — menores somente com presença e autorização dos responsáveis)\n- (ex: disponibilizamos estacionamento gratuito no local)\n- (ex: o cliente deve evitar sol e bebida alcoólica 48h antes do procedimento)\n- (ex: emitimos nota fiscal para todos os serviços)\n\nComo a agente deve se comportar no atendimento:\n- Quando um cliente entrar em contato pela primeira vez: (ex: cumprimente com entusiasmo, pergunte o que está procurando e convide para uma consulta sem pressão)\n- Quando perguntarem sobre disponibilidade: (ex: informe que verificará a agenda e retornará em breve com opções de horário)\n- Quando o cliente estiver indeciso: (ex: seja paciente, apresente exemplos do portfólio, tire dúvidas e ofereça uma consulta sem compromisso)\n- Quando houver reclamação: (ex: ouça com atenção, peça desculpas pelo inconveniente e encaminhe para contato direto comigo)\n- Sempre finalize com: (ex: um convite para agendamento / uma pergunta aberta para manter a conversa ativa / o link do portfólio ou redes sociais)\n- Nunca: (ex: prometa datas sem confirmar comigo na agenda / informe preços exatos sem antes entender o projeto / tome decisões que dependam da minha aprovação)");
  const [metaSessoes, setMetaSessoes] = useState(0);
  const [metaLeads, setMetaLeads] = useState(0);
  const [metaNPS, setMetaNPS] = useState(0);
  const [settingsTab, setSettingsTab] = useState<"estudio"|"dono"|"metas"|"ia"|"sistema">("estudio");
  const [googleLink, setGoogleLink] = useState("");
  const [studioSite, setStudioSite] = useState("");
  // ── ORIGENS ──
  const [origens, setOrigens] = useState<{id: string; user_id: string; nome: string; slug: string; pago?: boolean; criado_em: string}[]>([]);
  const [origenEditIdx, setOrigenEditIdx] = useState<number | null>(null);
  const [origenEditNome, setOrigenEditNome] = useState("");
  const [origenEditPago, setOrigenEditPago] = useState(false);
  const [eventosTrafego, setEventosTrafego] = useState<{id: string; tipo_evento: string; origem: string; cliente_id: string | null; criado_em: string}[]>([]);
  const [origenConfirmDel, setOrigenConfirmDel] = useState<number | null>(null);
  // ── CAMPANHAS ──
  const [campanhas, setCampanhas] = useState<{id: string; user_id: string; nome: string; palavra_chave: string; data_inicio: string; data_fim: string; criado_em: string}[]>([]);
  const [campEditIdx, setCampEditIdx] = useState<number | null>(null);
  const [campEditForm, setCampEditForm] = useState<{nome: string; palavra_chave: string; data_inicio: string; data_fim: string}>({ nome: "", palavra_chave: "", data_inicio: "", data_fim: "" });
  const [campConfirmDel, setCampConfirmDel] = useState<number | null>(null);
  // ── FILTRO EXTRA (campanha | origem) — mutuamente exclusivo com filtro de artista ──
  const [filtroExtra, setFiltroExtra] = useState<{tipo: "campanha"|"orig"; valor: string} | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState<"campanhas"|"orig"|null>(null);
  // ── SELEÇÃO MÚLTIPLA + DISPARO EM MASSA ──
  const [selMode, setSelMode] = useState(false);
  const [selIds, setSelIds] = useState<Set<string>>(new Set());
  const [disparoMassa, setDisparoMassa] = useState<{canal: "email"|"sms"; texto: string; fase: "compose"|"confirm"|"enviando"|"done"; ok: number; total: number} | null>(null);
  const [cnpj, setCnpj] = useState("");
  const [metaMensal, setMetaMensal] = useState(0);
  const [descontoAniversario, setDescontoAniversario] = useState(5);
  const [saidas, setSaidas] = useState<any[]>([]);
  const [showSaidaForm, setShowSaidaForm] = useState(false);
  const [saidaForm, setSaidaForm] = useState({ desc: "", categoria: "Material", valor: 0, data: new Date().toLocaleDateString("pt-BR") });
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [equipForm, setEquipForm] = useState({ nome: "", valor_aquisicao: "", data_compra: "", vida_util_meses: 48, categoria: "maquina", artista_id: "" });
  const [showEntradaForm, setShowEntradaForm] = useState(false);
  const [entradaForm, setEntradaForm] = useState({ descricao: "", categoria: "sessao", cliente_nome: "", artista_id: "", valor: "", forma_pgto: "Pix", parcelas: "1", data: new Date().toISOString().split("T")[0], competencia: new Date().toISOString().slice(0,7), val_aplicador: 0, val_studio: 0 });
  const [finFiltroMes, setFinFiltroMes] = useState(new Date().toISOString().slice(0,7));
  const [finFiltroArtista, setFinFiltroArtista] = useState("todos");
  const [finFiltroTipo, setFinFiltroTipo] = useState("todos");
  const [finAbaAtiva, setFinAbaAtiva] = useState<"livrocaixa"|"dre"|"equipamentos">("livrocaixa");
  const [clients, setClients] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [newLeadsBadge, setNewLeadsBadge] = useState(0);
  const [leadToast, setLeadToast] = useState<string|null>(null);
  const lastLeadCheckRef = useRef<string>(new Date().toISOString());
  const [fin, setFin] = useState(FIN_INIT);
  const [agEvents, setAgEvents] = useState<any[]>([]);
  const [tab, setTab] = useState(() => localStorage.getItem("inq_tab") || "kanban");
  const changeTab = (id: string) => { setTab(id); localStorage.setItem("inq_tab", id); };
  const [sel, setSel] = useState<any>(null);
  const [selCtx, setSelCtx] = useState<"clientes"|"agenda">("clientes");
  const [fa, setFa] = useState("todos");
  const [srch, setSrch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showArtForm, setShowArtForm] = useState(false);
  const [showAgForm, setShowAgForm] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const alertBtnRef = useRef<HTMLDivElement>(null);
  const auraChatEndRef = useRef<HTMLDivElement>(null);
  const [alertPos, setAlertPos] = useState({ top: 64, right: 16 });
  const [showCtr, setShowCtr] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [ctrEdit, setCtrEdit] = useState<Record<string, string>>({});
  const [editingArtist, setEditingArtist] = useState<any>(null);
  const [segSel, setSegSel] = useState<string | null>(null);
  const [dateSel, setDateSel] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [editing, setEditing] = useState(false);
  const [msgEdit, setMsgEdit] = useState("");
  const [agView, setAgView] = useState("week");
  const [agDate, setAgDate] = useState(new Date());
  const [horarios, setHorarios] = useState([
    { dia: "Segunda", aberto: true, ini: "09:00", fim: "19:00", almoco: false, almoco_ini: "12:00", almoco_fim: "13:00" },
    { dia: "Terca", aberto: true, ini: "09:00", fim: "19:00", almoco: false, almoco_ini: "12:00", almoco_fim: "13:00" },
    { dia: "Quarta", aberto: true, ini: "09:00", fim: "19:00", almoco: false, almoco_ini: "12:00", almoco_fim: "13:00" },
    { dia: "Quinta", aberto: true, ini: "09:00", fim: "19:00", almoco: false, almoco_ini: "12:00", almoco_fim: "13:00" },
    { dia: "Sexta", aberto: true, ini: "09:00", fim: "19:00", almoco: false, almoco_ini: "12:00", almoco_fim: "13:00" },
    { dia: "Sabado", aberto: true, ini: "10:00", fim: "17:00", almoco: false, almoco_ini: "12:00", almoco_fim: "13:00" },
    { dia: "Domingo", aberto: false, ini: "", fim: "", almoco: false, almoco_ini: "", almoco_fim: "" },
  ]);
  const [form, setForm] = useState({
    nome: "", tel: "", email: "", insta: "", artista: artists.find(a => a.ativo)?.id || "",
    tam: "Medio", desc: "", orig: "Instagram Organico",
    qual: "Q2", primeira: false, cob: false, intencao: "", nascimento: ""
  });
  const [formAg, setFormAg] = useState({ agendar: false, data: "", hora: "09:00", tipo: "cons" });
  const [artForm, setArtForm] = useState({
    nome: "", role: "guest", com: 50, cor: "#C9A84C", insta: "", email: "", tel: ""
  });
  const [agForm, setAgForm] = useState({
    title: "", tipo: "cons_" + (artists[0]?.id || ""), date: new Date().toISOString().split("T")[0], start: 9, end: 11, desc: "", servico: ""
  });
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [agClientSearch, setAgClientSearch] = useState("");
  const [agClientVinc, setAgClientVinc] = useState<any>(null);
  const [agClientDropdown, setAgClientDropdown] = useState(false);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientForm, setQuickClientForm] = useState({ nome: "", tel: "", artista: artists[0]?.id || "" });
  const [showPostAg, setShowPostAg] = useState(false);
  const [postAgNome, setPostAgNome] = useState("");
  const [showHistorico, setShowHistorico] = useState(false);
  const [historico, setHistorico] = useState<{id?:any; data:string; hora:string; acao:string}[]>([]);
  const [confirmExcluir, setConfirmExcluir] = useState<any>(null);
  const [confirmRemoverArtista, setConfirmRemoverArtista] = useState<any>(null);
  const [confirmExcluirCliente, setConfirmExcluirCliente] = useState<any>(null);
  const [lixeiraTab, setLixeiraTab] = useState<"clientes"|"orfaos">("clientes");
  const [lixeiraClientes, setLixeiraClientes] = useState<any[]>([]);
  const [lixeiraOrfaos, setLixeiraOrfaos] = useState<any[]>([]);
  const [lixeiraLoading, setLixeiraLoading] = useState(false);
  const [showLixeiraModal, setShowLixeiraModal] = useState(false);
  const [lixeiraExcluindoId, setLixeiraExcluindoId] = useState<string|null>(null);
  const [lixeiraExcluindoTimer, setLixeiraExcluindoTimer] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetUndo, setResetUndo] = useState(false);
  const [resetTimer, setResetTimer] = useState<any>(null);
  const [formStep, setFormStep] = useState(1);
  const [emailError, setEmailError] = useState("");
  const [confirmMover, setConfirmMover] = useState<{cid: any; stage: any; agEvents: any[]} | null>(null);
  const [confirmPagamento, setConfirmPagamento] = useState<{cid: any; agEvent: any} | null>(null);
  const [projParaConcluir, setProjParaConcluir] = useState<{clienteId: any; projetoId: any} | null>(null);
  const [pipelineMotivo, setPipelineMotivo] = useState<{cid: any; stage: any; motivo: string; dias?: string} | null>(null);
  const [confirmCancelarEvento, setConfirmCancelarEvento] = useState<{event: any; motivo: string} | null>(null);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [showSaidaCatsModal, setShowSaidaCatsModal] = useState(false);
  const [showAvisoPastDate, setShowAvisoPastDate] = useState(false);
  const [stages, setStages] = useState<any[]>(DEFAULT_STAGES);
  const [editingStage, setEditingStage] = useState<any | null>(null);
  const [editStageLabel, setEditStageLabel] = useState("");
  const [editStageEmoji, setEditStageEmoji] = useState("");
  const [editStageCor, setEditStageCor] = useState("");
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageLabel, setNewStageLabel] = useState("");
  const [newStageEmoji, setNewStageEmoji] = useState("●");
  const [newStageCor, setNewStageCor] = useState("#888888");
  const [confirmDeleteStage, setConfirmDeleteStage] = useState<any | null>(null);
  const [stageInfoOpen, setStageInfoOpen] = useState<string | null>(null);
  const [proximaSessaoModal, setProximaSessaoModal] = useState<{cid: any; agEvent: any} | null>(null);
  const [editandoProjConc, setEditandoProjConc] = useState<{clienteId: any; projetoId: any} | null>(null);
  const [pgAvulso, setPgAvulso] = useState<{clienteId: any; clienteNome: string; artistaId: string; fase: "form"|"confirm"; valor: string; forma: string; obs: string} | null>(null);
  const [agendarProximaModal, setAgendarProximaModal] = useState<{cid: any} | null>(null);
  const [instrucaoDisparo, setInstrucaoDisparo] = useState<Record<string, string>>({});
  const [gerandoDisparo, setGerandoDisparo] = useState<string | null>(null);
  const [confirmDisparo, setConfirmDisparo] = useState<{clientes: any[]; mensagem: string; segmento: string} | null>(null);
  const [cancelProjetoModal, setCancelProjetoModal] = useState<{clienteId: any; projetoId: any; motivo: string} | null>(null);
  const [cancelMotivos, setCancelMotivos] = useState<string[]>(["Cliente desistiu", "Questão financeira", "Mudança de projeto", "Sem resposta do cliente", "Outro"]);
  const [pvRegua, setPvRegua] = useState<{id: string; label: string; dias: number; msg: string; canal: string}[]>([]);
  const [enviandoRelatorio, setEnviandoRelatorio] = useState(false);
  const [novoProjetoAberto, setNovoProjetoAberto] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [novoProjetoForm, setNovoProjetoForm] = useState({ estilo: "", tam: "Medio", primeira: false, desc: "", valorTotal: "", servico: "" });
  const [showRecorrenteModal, setShowRecorrenteModal] = useState<{cid: any} | null>(null);
  const [recorrenteForm, setRecorrenteForm] = useState({ dataInicio: new Date().toISOString().split("T")[0], intervalo: 7, total: 4, hora: 9, duracao: 2, artista: "" });
  const [fichaRevelada, setFichaRevelada] = useState<Set<any>>(new Set());
  const [showLogoCrop, setShowLogoCrop] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState("");
  const [logoCropPos, setLogoCropPos] = useState({ x: 0, y: 0 });
  const [logoCropScale, setLogoCropScale] = useState(1);
  const logoCropRef = useRef<any>(null);
  const [pagFormas, setPagFormas] = useState<{forma: string; valor: string; parcelas: string}[]>([{ forma: "Pix", valor: "", parcelas: "1" }]);
  const [sinalPgtoModal, setSinalPgtoModal] = useState<{forma: string; parcelas: string} | null>(null);
  const [selSessaoModal, setSelSessaoModal] = useState<{cid: any; sessoes: any[]} | null>(null);
  const [sessaoEscolhida, setSessaoEscolhida] = useState<any>(null);
  const [entradaClientSearch, setEntradaClientSearch] = useState("");
  const [showEntradaClientDD, setShowEntradaClientDD] = useState(false);
  const [showAviso, setShowAviso] = useState<string | null>(null);
  const [orcamentoModal, setOrcamentoModal] = useState<{cid: any; valor: string} | null>(null);
  const [undoEvento, setUndoEvento] = useState<any>(null);
  const [undoTimer, setUndoTimer] = useState<any>(null);
  const [undoSessao, setUndoSessao] = useState<{cid: any; etapaAnterior: string; finIds: any[]} | null>(null);
  const [undoSessaoTimer, setUndoSessaoTimer] = useState<any>(null);
  const [confirmAgForm, setConfirmAgForm] = useState(false);
  const [confirmPresenca, setConfirmPresenca] = useState<{event: any} | null>(null);
  const [presencaMotivo, setPresencaMotivo] = useState("");
  const [confirmTrocarProfissional, setConfirmTrocarProfissional] = useState<{clienteId: any; novoArtista: string; antigoArtista: string} | null>(null);
  const [nascDraft, setNascDraft] = useState<{dia: string; mes: string; ano: string}>({ dia: "", mes: "", ano: "" });
  const [fichaTab, setFichaTab] = useState<"dados"|"jornada"|"docs"|"historico">("dados");
  const [fichaEditada, setFichaEditada] = useState(false);
  const [fichaSaveStep, setFichaSaveStep] = useState(0);
  const [fichaTabPendente, setFichaTabPendente] = useState<string|null>(null);
  const [fichaWarnSair, setFichaWarnSair] = useState(false);
  const [jornadaEtapas, setJornadaEtapas] = useState<{id:number;nome:string;ordem:number;tipo:string}[]>([]);
  const [jornadaDragIdx, setJornadaDragIdx] = useState<number|null>(null);
  const [jornadaEditandoId, setJornadaEditandoId] = useState<number|null>(null);
  const [jornadaEditNome, setJornadaEditNome] = useState("");
  const [jornadaNovaEtapa, setJornadaNovaEtapa] = useState(false);
  const [jornadaNovoNome, setJornadaNovoNome] = useState("");
  const [jornadaUndoDelete, setJornadaUndoDelete] = useState<{etapa: any; timer: any}|null>(null);
  const [docsAberto, setDocsAberto] = useState<string|null>(null);
  const [docsAssinando, setDocsAssinando] = useState<string|null>(null);
  const [docsCanvasRef, setDocsCanvasRef] = useState<HTMLCanvasElement|null>(null);
  const [docsCanvasDesenhando, setDocsCanvasDesenhando] = useState(false);
  const [docsCanvasPaiRef, setDocsCanvasPaiRef] = useState<HTMLCanvasElement|null>(null);
  const [docsCanvasMaeRef, setDocsCanvasMaeRef] = useState<HTMLCanvasElement|null>(null);
  const [docsDesenhandoPai, setDocsDesenhandoPai] = useState(false);
  const [docsDesenhandoMae, setDocsDesenhandoMae] = useState(false);
  const [docsGerandoPdf, setDocsGerandoPdf] = useState(false);
  const [docsEnviandoLink, setDocsEnviandoLink] = useState<string|null>(null);
  const [menorSalvarConfirm, setMenorSalvarConfirm] = useState(false);
  const [nascDraftForm, setNascDraftForm] = useState<{dia: string; mes: string; ano: string}>({ dia: "", mes: "", ano: "" });
  const [editandoListas, setEditandoListas] = useState(false);
  const [agPipelineOpen, setAgPipelineOpen] = useState(false);
  const [pvEditando, setPvEditando] = useState<number | null>(null);
  const [pvEditLocal, setPvEditLocal] = useState<any | null>(null);
  const [pvConfirmDelete, setPvConfirmDelete] = useState<number | null>(null);
  // ── PRÉ-VENDA RÉGUAS ──
  const [preVendaRegua, setPreVendaRegua] = useState<{lead: {id:string;label:string;dias:number;msg:string;canal:string}[]; qualificacao: {id:string;label:string;dias:number;msg:string;canal:string}[]; hibernacao: {id:string;label:string;dias:number;msg:string;canal:string}[]; aguard_agend: {id:string;label:string;dias:number;msg:string;canal:string}[]}>({ lead: [], qualificacao: [], hibernacao: [], aguard_agend: [] });
  const [pvPreEditando, setPvPreEditando] = useState<{campo: string; idx: number} | null>(null);
  const [pvPreEditLocal, setPvPreEditLocal] = useState<any | null>(null);
  const [pvPreConfirmDelete, setPvPreConfirmDelete] = useState<{campo: string; idx: number} | null>(null);
  const [canaisHabilitados, setCanaisHabilitados] = useState<{email: boolean; whatsapp: boolean; sms: boolean}>({ email: true, whatsapp: false, sms: false });
  // ── RÉGUA: toggles de ativação (nível régua) ──
  const [pvReguaAtiva, setPvReguaAtiva] = useState(true);
  const [preReguaAtiva, setPreReguaAtiva] = useState<{lead: boolean; qualificacao: boolean; hibernacao: boolean; aguard_agend: boolean}>({ lead: true, qualificacao: true, hibernacao: true, aguard_agend: true });
  // ── RÉGUA PRÉ-SESSÃO ──
  const [preSessaoRegua, setPreSessaoRegua] = useState<{id: string; label: string; dias: number; msg: string; canal: string; ativa?: boolean}[]>([]);
  const [preSessaoReguaAtiva, setPreSessaoReguaAtiva] = useState(true);
  const [pvPreSessaoEditando, setPvPreSessaoEditando] = useState<number | null>(null);
  const [pvPreSessaoEditLocal, setPvPreSessaoEditLocal] = useState<any | null>(null);
  const [pvPreSessaoConfirmDelete, setPvPreSessaoConfirmDelete] = useState<number | null>(null);
  const [disparoPreSessaoPendente, setDisparoPreSessaoPendente] = useState<{etapa: any} | null>(null);
  // ── ACORDEÃO DAS RÉGUAS ──
  const [pvAccordion, setPvAccordion] = useState<{preVenda: boolean; preSessao: boolean; posVenda: boolean}>({ preVenda: false, preSessao: false, posVenda: false });
  // ── AGENDAMENTOS PENDENTES (vindos da Aura do site) ──
  const [agendamentosPendentes, setAgendamentosPendentes] = useState<any[]>([]);
  const [decisaoPendente, setDecisaoPendente] = useState<{id: string; acao: "aprovar" | "recusar"; nome: string} | null>(null);
  const [processandoDecisao, setProcessandoDecisao] = useState(false);
  // ── DISPARO MANUAL: estado de confirmação ──
  const [disparoManualPendente, setDisparoManualPendente] = useState<{etapa: any; tipoRegua: string; campo?: string} | null>(null);
  const [disparosHist, setDisparosHist] = useState<any[]>([]);
  const [resendApiKey, setResendApiKey] = useState("");
  const [emailRemetente, setEmailRemetente] = useState("");
  const [nomeRemetente, setNomeRemetente] = useState("");
  const [zenviaApiKey, setZenviaApiKey] = useState("");
  const [zenviaNumero, setZenviaNumero] = useState("");
  // ── TESTE DE CANAIS (confirmação manual de recebimento) ──
  const [testeCanalEnviado, setTesteCanalEnviado] = useState<{canal: "email" | "sms" | "whatsapp"; destino: string} | null>(null);
  const [testandoCanal, setTestandoCanal] = useState<string | null>(null);
  const [auraApiKey, setAuraApiKey] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [infraStats, setInfraStats] = useState<any>(null);
  const [infraLoading, setInfraLoading] = useState(false);
  const [licencasSubTab, setLicencasSubTab] = useState<"monitoramento"|"chaves"|"licencas">("monitoramento");
  const [anthropicSaldo, setAnthropicSaldo] = useState("");
  const [anthropicGasto, setAnthropicGasto] = useState("");
  const [anthropicLimite, setAnthropicLimite] = useState("");
  const [resendLimite, setResendLimite] = useState("3000");
  const [resendBounce, setResendBounce] = useState("");
  const [zenviaGasto, setZenviaGasto] = useState("");
  const [zenviaLimite, setZenviaLimite] = useState("");
  const [zenviaInteractions, setZenviaInteractions] = useState("");
  const [zenviaInteractionsLimite, setZenviaInteractionsLimite] = useState("");
  const [showAuraChat, setShowAuraChat] = useState(false);
  const [auraBtnPos, setAuraBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [auraDragging, setAuraDragging] = useState(false);
  const auraDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);
  const [auraChatMessages, setAuraChatMessages] = useState<{role: string; content: string}[]>([]);
  const [auraChatInput, setAuraChatInput] = useState("");
  const [auraChatLoading, setAuraChatLoading] = useState(false);
  const [auraToolPendente, setAuraToolPendente] = useState<{ tool: string; params: any; descricao: string } | null>(null);
  const [auraChatImagem, setAuraChatImagem] = useState<{ base64: string; mediaType: string } | null>(null);
  const [auraChatPdf, setAuraChatPdf] = useState<{nome: string; base64: string} | null>(null);
  const [alertaConfig, setAlertaConfig] = useState({ alerta_nova_mensagem: true, alerta_sessao_proxima: true, alerta_sessao_antecedencia: "2h", alerta_falta: true, alerta_aniversario: true, alerta_sem_retorno: true, alerta_sem_retorno_dias: "30", alerta_sinal_pendente: true, alerta_projeto_sem_valor: true, alerta_novo_cliente_aura: true });
  const [sessoesExtras, setSessoesExtras] = useState<{date: string; start: number; end: number}[]>([]);
  const [entradaCats, setEntradaCats] = useState<string[]>(["sessao","sinal","prolabore","outro"]);
  const [saidaCats, setSaidaCats] = useState<string[]>(["Material","Energia","Internet","Manutenção","Marketing","Pró-labore","Aluguel","Outro"]);
  const [showEditCats, setShowEditCats] = useState(false);
  const [showEditSaidaCats, setShowEditSaidaCats] = useState(false);
  const [novaCatInput, setNovaCatInput] = useState("");
  const [novaSaidaCatInput, setNovaSaidaCatInput] = useState("");
  const [servicoOpts, setServicoOpts] = useState<{id: string; nome: string; cor: string}[]>([{id:"svc1",nome:"Tatuagem",cor:"#a78bfa"},{id:"svc2",nome:"Piercing",cor:"#34d399"},{id:"svc3",nome:"Consulta",cor:"#60a5fa"}]);
  const [addingServico, setAddingServico] = useState(false);
  const [novoServico, setNovoServico] = useState("");
  const [novoServicoCor, setNovoServicoCor] = useState("#a78bfa");

  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (auraChatEndRef.current) {
      auraChatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [auraChatMessages, auraChatLoading]);

  // Quando auraName muda, atualiza os labels dinâmicos de consulta e sessão
  useEffect(() => {
    if (!auraName) return;
    setStages(p => p.map((s: any) => {
      if (s.id === "aura_agend") return { ...s, label: "Solicitação de Sessão via " + auraName };
      if (s.id === "lead_morno") return { ...s, label: "Solicitação de Consulta via " + auraName };
      return s;
    }));
  }, [auraName]);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = S;
    document.head.appendChild(el);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    return () => document.head.removeChild(el);
  }, []);

  useEffect(() => {
    if (!dropdownAberto) return;
    const handler = () => setDropdownAberto(null);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownAberto]);

  // ─── SUPABASE AUTH ────────────────────────────────────────────────────────
  const verificarAcessoPos = async (uid: string, email: string) => {
    setAuthEmail(email);
    // Dono do sistema: acesso irrestrito
    if (email === OWNER_EMAIL) {
      setUserRole("admin");
      setLicencaOk(true);
      // Carrega licencas para painel de gestão
      const { data: lics } = await sb.from("licencas").select("*").order("created_at", { ascending: false });
      if (lics) setLicencas(lics);
      return;
    }
    // Verificar licença
    const hoje = new Date().toISOString().split("T")[0];
    const { data: lic } = await sb.from("licencas").select("*").eq("user_id", uid).limit(1).single();
    if (!lic || lic.status !== "ativo" || lic.data_vencimento < hoje) {
      const msg = !lic ? "Licença não encontrada para esta conta." : lic.status === "bloqueado" ? "Conta bloqueada. Entre em contato com o suporte." : "Licença expirada em " + (lic?.data_vencimento || "—") + ". Renove para continuar.";
      setLicencaOk(false);
      setLicencaMsg(msg);
      return;
    }
    setLicencaOk(true);
    // Verificar perfil: artista residente com email cadastrado?
    const { data: artEncontrado } = await sb.from("artistas").select("id,email").eq("email", email).limit(1).single();
    if (artEncontrado) {
      setUserRole("profissional");
      setUserArtistId(artEncontrado.id);
    } else {
      setUserRole("admin");
    }
  };

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setLogado(true);
        setUserId(session.user?.id || "");
        verificarAcessoPos(session.user?.id || "", session.user?.email || "");
      }
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setLogado(!!session);
      setUserId(session?.user?.id || "");
      if (session) verificarAcessoPos(session.user?.id || "", session.user?.email || "");
    });
    return () => subscription.unsubscribe();
  }, []);

  // ─── CARREGAR DADOS DO SUPABASE ──────────────────────────────────────────
  useEffect(() => {
    if (!logado) return;
    async function loadAll() {
      if (!sb) { setDbReady(true); return; }
      try {
        const { data: { user } } = await sb.auth.getUser();
        const uid = user?.id || "";
        if (uid) setUserId(uid);
        const loadWithUser = async (table: string) => {
          if (!uid) return await sb.from(table).select("*").then(r => r.data);
          return await sb.from(table).select("*").or(`user_id.eq.${uid},user_id.is.null`).then(r => r.data);
        };
        const loadCfg = async () => {
          if (!uid) return await sb.from("configuracoes").select("*").limit(1).single().then(r => r.data ? [r.data] : null);
          return await sb.from("configuracoes").select("*").eq("user_id", uid).limit(1).single().then(r => r.data ? [r.data] : null);
        };
        const loadClientes = async () => {
          if (!uid) return await sb.from("clientes").select("*").is("excluido_em", null).then(r => r.data);
          return await sb.from("clientes").select("*").or(`user_id.eq.${uid},user_id.is.null`).is("excluido_em", null).then(r => r.data);
        };
        const [cls, arts, fins, sds, ags, cfgs, eqs, orgs, camps, evts] = await Promise.all([
          loadClientes(), loadWithUser("artistas"), loadWithUser("financeiro"),
          loadWithUser("saidas"), loadWithUser("agenda"), loadCfg(), loadWithUser("equipamentos"),
          uid ? sb.from("origens").select("*").eq("user_id", uid).order("criado_em", { ascending: true }).then(r => r.data) : Promise.resolve([]),
          uid ? sb.from("campanhas").select("*").eq("user_id", uid).order("criado_em", { ascending: true }).then(r => r.data) : Promise.resolve([]),
          uid ? sb.from("eventos_trafego").select("*").eq("user_id", uid).order("criado_em", { ascending: false }).then(r => r.data) : Promise.resolve([])
        ]);
        if (orgs && orgs.length > 0) setOrigens(orgs);
        if (camps && camps.length > 0) setCampanhas(camps);
        if (evts && evts.length >= 0) setEventosTrafego(evts || []);
        if (eqs && eqs.length > 0) setEquipamentos(eqs);
        // Carregar etapas da jornada do cliente
        const { data: jornadaDB } = await sb.from("jornada_etapas").select("*").order("ordem", { ascending: true });
        if (jornadaDB) setJornadaEtapas(jornadaDB);
        // Carregar etapas do pipeline
        const { data: etapasDB } = await sb.from("pipeline_etapas").select("*").eq("user_id", uid).order("ordem", { ascending: true });
        if (etapasDB && etapasDB.length > 0) {
          setStages(etapasDB.map((e: any) => ({ id: e.slug, label: e.label, color: e.cor, emoji: e.emoji, fixo: e.fixo, dbId: e.id, ordem: e.ordem })));
        }
        if (cls && cls.length > 0) {
          const clientesMapeados = cls.map((c: any) => ({
            ...c,
            etapa: c.etapa === "qualificacao" ? "lead" : c.etapa,
            hist: c.hist || [],
            pv: c.followups || [],
            faltas: c.faltas || 0,
            indicacoes: c.indicacoes || 0,
            credito: c.credito || 0,
            desc: c.descricao || "",
            projetos: c.projetos || [],
            referencias: c.referencias || [],
            orig: c.orig || c.origem || "",
            campanha_id: c.campanha_id || null,
          }));
          setClients(clientesMapeados);
          // Migração: clientes antigos na etapa "qualificacao" (removida) vão para "lead"
          const clientesParaMigrar = cls.filter((c: any) => c.etapa === "qualificacao");
          if (clientesParaMigrar.length > 0) {
            clientesParaMigrar.forEach((c: any) => {
              sb.from("clientes").update({ etapa: "lead" }).eq("id", c.id).then(() => {});
            });
          }
          // Sincronização: cliente com evento de agenda válido não pode ficar em "lead"
          if (ags && ags.length > 0) {
            const clientesParaSincronizar: { id: any; novaEtapa: string }[] = [];
            ags.forEach((a: any) => {
              if (!a.cliente_id || !a.tipo || a.tipo.startsWith("bloq")) return;
              const tipoKey = a.tipo.split("_")[0];
              if (tipoKey !== "sess" && tipoKey !== "cons" && tipoKey !== "piercing") return;
              const cliente = clientesMapeados.find((c: any) => c.id === a.cliente_id);
              if (!cliente || cliente.etapa !== "lead") return;
              const novaEtapa = tipoKey === "cons" ? "cons_agendada" : "sessao_agend";
              if (!clientesParaSincronizar.find(x => x.id === cliente.id)) {
                clientesParaSincronizar.push({ id: cliente.id, novaEtapa });
              }
            });
            if (clientesParaSincronizar.length > 0) {
              clientesParaSincronizar.forEach(({ id, novaEtapa }) => {
                sb.from("clientes").update({ etapa: novaEtapa }).eq("id", id).then(() => {});
              });
              const idsSync = clientesParaSincronizar.map(x => x.id);
              const etapaMap: Record<string, string> = {};
              clientesParaSincronizar.forEach(x => { etapaMap[x.id] = x.novaEtapa; });
              setClients(prev => prev.map((c: any) => idsSync.includes(c.id) ? { ...c, etapa: etapaMap[c.id] } : c));
            }
          }
        }
        if (arts && arts.length > 0) {
          setArtists(arts);
        } else {
          setArtists([]);
        }
        if (fins && fins.length > 0) setFin(fins.map((f: any) => ({
          ...f, cliente: f.cliente_nome
        })));
        if (sds && sds.length > 0) setSaidas(sds.map((s: any) => ({
          ...s, desc: s.descricao
        })));
        if (ags && ags.length > 0) setAgEvents(ags.map((a: any) => {
          const startH = parseInt(a.hora?.split(":")[0] || "9");
          const endH = a.hora_fim ? parseInt(a.hora_fim.split(":")[0]) : startH + 2;
          return {
            ...a,
            title: a.titulo || a.title || "Sem título",
            date: (a.data || a.date || "").substring(0, 10),
            start: isNaN(startH) ? 9 : startH,
            end: isNaN(endH) ? startH + 2 : endH
          };
        }));
        if (cfgs && cfgs.length > 0) {
          const cfg = cfgs[0];
          if (cfg.studio_name) setStudioName(cfg.studio_name);
          if (cfg.studio_tel) setStudioTel(cfg.studio_tel);
          if (cfg.studio_owner) setStudioOwner(cfg.studio_owner);
          if (cfg.studio_email) setStudioEmail(cfg.studio_email);
          if (cfg.studio_city) setStudioCity(cfg.studio_city);
          if (cfg.studio_insta) setStudioInsta(cfg.studio_insta);
          if (cfg.studio_rua) setStudioRua(cfg.studio_rua);
          if (cfg.studio_numero) setStudioNumero(cfg.studio_numero);
          if (cfg.studio_complemento) setStudioComplemento(cfg.studio_complemento);
          if (cfg.studio_bairro) setStudioBairro(cfg.studio_bairro);
          if (cfg.studio_cep) setStudioCep(cfg.studio_cep);
          if (cfg.studio_estado) setStudioEstado(cfg.studio_estado);
          if (cfg.studio_pais) setStudioPais(cfg.studio_pais);
          if (cfg.studio_redes) setStudioRedes(cfg.studio_redes);
          if (cfg.dono_nome) setDonoNome(cfg.dono_nome);
          if (cfg.dono_whats) setDonoWhats(cfg.dono_whats);
          if (cfg.dono_email) setDonoEmail(cfg.dono_email);
          if (cfg.aura_name) setAuraName(cfg.aura_name);
          if (cfg.google_link) setGoogleLink(cfg.google_link);
          if (cfg.cnpj) setCnpj(cfg.cnpj);
          if (cfg.meta_mensal) setMetaMensal(cfg.meta_mensal);
          if (cfg.meta_sessoes) setMetaSessoes(cfg.meta_sessoes);
          if (cfg.meta_leads) setMetaLeads(cfg.meta_leads);
          if (cfg.meta_nps) setMetaNPS(cfg.meta_nps);
          if (cfg.desconto_aniversario !== undefined) setDescontoAniversario(cfg.desconto_aniversario);
          if (cfg.horarios) setHorarios(cfg.horarios);
          if (cfg.alerta_config) setAlertaConfig(prev => ({ ...prev, ...cfg.alerta_config }));
          if (cfg.entrada_cats && Array.isArray(cfg.entrada_cats) && cfg.entrada_cats.length) setEntradaCats(cfg.entrada_cats);
          if (cfg.saida_cats && Array.isArray(cfg.saida_cats) && cfg.saida_cats.length) setSaidaCats(cfg.saida_cats);
          if (cfg.servico_opts && Array.isArray(cfg.servico_opts) && cfg.servico_opts.length) setServicoOpts(cfg.servico_opts);
          if (cfg.studio_site) setStudioSite(cfg.studio_site);
          if (cfg.resend_api_key) setResendApiKey(cfg.resend_api_key);
          if (cfg.email_remetente) setEmailRemetente(cfg.email_remetente);
          if (cfg.nome_remetente) setNomeRemetente(cfg.nome_remetente);
          if (cfg.zenvia_api_key) setZenviaApiKey(cfg.zenvia_api_key);
          if (cfg.zenvia_numero) setZenviaNumero(cfg.zenvia_numero);
          if (cfg.aura_api_key) setAuraApiKey(cfg.aura_api_key);
          if (cfg.aura_instrucoes) setAuraInstrucoes(cfg.aura_instrucoes);
          if (cfg.vercel_token) setVercelToken(cfg.vercel_token);
          if (cfg.github_token) setGithubToken(cfg.github_token);
          if (cfg.github_repo) setGithubRepo(cfg.github_repo);
          if (cfg.anthropic_saldo) setAnthropicSaldo(cfg.anthropic_saldo);
          if (cfg.anthropic_gasto) setAnthropicGasto(cfg.anthropic_gasto);
          if (cfg.anthropic_limite) setAnthropicLimite(cfg.anthropic_limite);
          if (cfg.resend_limite) setResendLimite(cfg.resend_limite);
          if (cfg.resend_bounce) setResendBounce(cfg.resend_bounce);
          if (cfg.zenvia_gasto) setZenviaGasto(cfg.zenvia_gasto);
          if (cfg.zenvia_limite) setZenviaLimite(cfg.zenvia_limite);
          if (cfg.zenvia_interactions) setZenviaInteractions(cfg.zenvia_interactions);
          if (cfg.zenvia_interactions_limite) setZenviaInteractionsLimite(cfg.zenvia_interactions_limite);
          // ── CANAIS HABILITADOS ──
          if (cfg.canais_habilitados) {
            try {
              const parsedCH = typeof cfg.canais_habilitados === "string" ? JSON.parse(cfg.canais_habilitados) : cfg.canais_habilitados;
              setCanaisHabilitados(prev => ({ ...prev, ...parsedCH }));
            } catch {}
          }
          // ── RÉGUA ATIVA: pós-venda ──
          if (cfg.pv_regua_ativa !== undefined) setPvReguaAtiva(cfg.pv_regua_ativa !== false);
          // ── RÉGUA ATIVA: pré-venda ──
          if (cfg.pre_regua_ativa) {
            try {
              const parsedPRA = typeof cfg.pre_regua_ativa === "string" ? JSON.parse(cfg.pre_regua_ativa) : cfg.pre_regua_ativa;
              setPreReguaAtiva(prev => ({ ...prev, ...parsedPRA }));
            } catch {}
          }
          const pvReguaRaw = cfg.pv_regua;
          if (pvReguaRaw) {
            try {
              const parsed = typeof pvReguaRaw === "string" ? JSON.parse(pvReguaRaw) : pvReguaRaw;
              if (Array.isArray(parsed) && parsed.length > 0) setPvRegua(parsed);
              else setPvRegua(PV_FLOW.map(p => ({ id: p.id, label: p.label, dias: p.dias, msg: p.msg, canal: "email" })));
            } catch { setPvRegua(PV_FLOW.map(p => ({ id: p.id, label: p.label, dias: p.dias, msg: p.msg, canal: "email" }))); }
          } else {
            setPvRegua(PV_FLOW.map(p => ({ id: p.id, label: p.label, dias: p.dias, msg: p.msg, canal: "email" })));
          }
          const pvPreRaw = cfg.pre_venda_regua;
          if (pvPreRaw) {
            try {
              const parsedPre = typeof pvPreRaw === "string" ? JSON.parse(pvPreRaw) : pvPreRaw;
              if (parsedPre && typeof parsedPre === "object") {
                setPreVendaRegua({
                  lead: Array.isArray(parsedPre.lead) ? parsedPre.lead : [],
                  qualificacao: Array.isArray(parsedPre.qualificacao) ? parsedPre.qualificacao : [],
                  hibernacao: Array.isArray(parsedPre.hibernacao) ? parsedPre.hibernacao : [],
                  aguard_agend: Array.isArray(parsedPre.aguard_agend) ? parsedPre.aguard_agend : [],
                });
              }
            } catch {}
          }
          // ── RÉGUA PRÉ-SESSÃO ──
          if (cfg.pre_sessao_regua_ativa !== undefined) setPreSessaoReguaAtiva(cfg.pre_sessao_regua_ativa !== false);
          const pvPSRaw = cfg.pre_sessao_regua;
          if (pvPSRaw) {
            try {
              const parsedPS = typeof pvPSRaw === "string" ? JSON.parse(pvPSRaw) : pvPSRaw;
              if (Array.isArray(parsedPS) && parsedPS.length > 0) setPreSessaoRegua(parsedPS);
              else setPreSessaoRegua(PRE_SESSAO_FLOW.map(p => ({ id: p.id, label: p.label, dias: p.dias, msg: p.msg, canal: "email" })));
            } catch { setPreSessaoRegua(PRE_SESSAO_FLOW.map(p => ({ id: p.id, label: p.label, dias: p.dias, msg: p.msg, canal: "email" }))); }
          } else {
            setPreSessaoRegua(PRE_SESSAO_FLOW.map(p => ({ id: p.id, label: p.label, dias: p.dias, msg: p.msg, canal: "email" })));
          }
          setDark(cfg.dark_mode !== false);
          if (cfg.tema) setTema(cfg.tema as ThemeId);
          // [X2] onboarding_done from Supabase (source of truth); localStorage as cache
          if (cfg.onboarding_done) {
            setOnboardingDone(true);
            setShowSplash(true);
            localStorage.setItem("inq_onb", "1");
          }
          // [X3] studio_logo from Supabase
          if (cfg.studio_logo) {
            setStudioLogo(cfg.studio_logo);
            localStorage.setItem("inq_logo", cfg.studio_logo);
          }
        }
      } catch(e) { console.error("Load error", e); }
      setDbReady(true);
    }
    loadAll();
  }, [logado]);

  // ─── POLLING NOVOS LEADS ─────────────────────────────────────────────────
  useEffect(() => {
    if (!logado || !sb) return;
    const poll = async () => {
      try {
        const since = lastLeadCheckRef.current;
        lastLeadCheckRef.current = new Date().toISOString();
        const { data } = await sb.from("clientes")
          .select("id,nome,artista,orig,created_at")
          .eq("orig", "Site - Aura Chat")
          .gt("created_at", since);
        if (data && data.length > 0) {
          setClients(prev => {
            const existingIds = new Set(prev.map((c: any) => c.id));
            const novo = data.filter((c: any) => !existingIds.has(c.id)).map((c: any) => ({
              ...c, hist: [], pv: [], faltas: 0, indicacoes: 0, credito: 0, desc: c.descricao || "", projetos: [],
            }));
            if (novo.length === 0) return prev;
            setNewLeadsBadge(b => b + novo.length);
            setLeadToast(novo.length === 1 ? `🎯 Novo lead: ${novo[0].nome}` : `🎯 ${novo.length} novos leads chegaram!`);
            return [...novo, ...prev];
          });
        }
      } catch {}
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [logado]);

  // ─── POLLING AGENDAMENTOS PENDENTES (vindos da Aura do site) ────────────
  const carregarAgendamentosPendentes = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await sb.from("agendamentos_pendentes")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pendente")
        .order("created_at", { ascending: false });
      if (data) setAgendamentosPendentes(data);
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (!logado || !userId) return;
    carregarAgendamentosPendentes();
    const interval = setInterval(carregarAgendamentosPendentes, 30000);
    return () => clearInterval(interval);
  }, [logado, userId, carregarAgendamentosPendentes]);

  // ─── POLLING EVENTOS DE TRÁFEGO (aba Origens) ────────────────────────────
  useEffect(() => {
    if (!logado || !userId || tab !== "origens") return;
    const recarregar = async () => {
      try {
        const { data } = await sb.from("eventos_trafego").select("*").eq("user_id", userId).order("criado_em", { ascending: false });
        if (data) setEventosTrafego(data);
      } catch {}
    };
    recarregar();
    const interval = setInterval(recarregar, 60000);
    return () => clearInterval(interval);
  }, [logado, userId, tab]);

  // ─── RÉGUA PÓS-VENDA ─────────────────────────────────────────────────────
  const decidirAgendamentoPendente = async (id: string, acao: "aprovar" | "recusar") => {
    setProcessandoDecisao(true);
    try {
      const pendente = agendamentosPendentes.find((p: any) => p.id === id);
      if (!pendente) { setProcessandoDecisao(false); setDecisaoPendente(null); return; }
      const novoStatus = acao === "aprovar" ? "aprovado" : "recusado";
      await sb.from("agendamentos_pendentes").update({ status: novoStatus, decidido_em: new Date().toISOString() }).eq("id", id);
      if (pendente.cliente_email && resendApiKey && emailRemetente) {
        const dataFmt = pendente.data_solicitada ? String(pendente.data_solicitada).split("-").reverse().join("/") : "";
        const msg = acao === "aprovar"
          ? "Olá, " + pendente.cliente_nome + "! Seu agendamento com " + (pendente.profissional_nome || "nosso time") + " foi confirmado para " + dataFmt + (pendente.hora_solicitada ? " às " + pendente.hora_solicitada : "") + ". Te esperamos no estúdio!"
          : "Olá, " + pendente.cliente_nome + "! Recebemos seu pedido de agendamento, mas o horário solicitado não pôde ser confirmado. Vamos te ligar em breve para combinar uma nova data.";
        const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" + msg + "</div>";
        try {
          await fetch("/api/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: resendApiKey, from: (nomeRemetente || studioName || "INK SYSTEM") + " <" + emailRemetente + ">", to: pendente.cliente_email, subject: acao === "aprovar" ? "Agendamento confirmado — " + (studioName || "INK SYSTEM") : "Sobre seu agendamento — " + (studioName || "INK SYSTEM"), html })
          });
        } catch {}
      }
      await addLog((acao === "aprovar" ? "✅ Agendamento aprovado" : "❌ Agendamento recusado") + " — " + pendente.cliente_nome + (pendente.profissional_nome ? " com " + pendente.profissional_nome : ""));
      setAgendamentosPendentes(prev => prev.filter((p: any) => p.id !== id));
    } catch {}
    setProcessandoDecisao(false);
    setDecisaoPendente(null);
  };

  const salvarPvRegua = async (novaRegua: typeof pvRegua) => {
    setPvRegua(novaRegua);
    try {
      await sb.from("configuracoes").upsert({ user_id: userId, pv_regua: JSON.stringify(novaRegua) }, { onConflict: "user_id" });
    } catch {}
  };

  const salvarPreVendaRegua = async (novo: typeof preVendaRegua) => {
    setPreVendaRegua(novo);
    try {
      await sb.from("configuracoes").upsert({ user_id: userId, pre_venda_regua: JSON.stringify(novo) }, { onConflict: "user_id" });
    } catch {}
  };

  const salvarCanaisHabilitados = async (novos: typeof canaisHabilitados) => {
    setCanaisHabilitados(novos);
    try {
      await sb.from("configuracoes").upsert({ user_id: userId, canais_habilitados: JSON.stringify(novos) }, { onConflict: "user_id" });
    } catch {}
  };

  const testarCanal = async (canal: "email" | "sms" | "whatsapp") => {
    if (canal === "email") {
      if (!resendApiKey || !emailRemetente) { setShowAviso("Preencha a Resend API Key e o Email Remetente antes de testar."); return; }
      if (!studioEmail) { setShowAviso("Preencha o Email do Estúdio em Configurações → Estúdio para receber o teste."); return; }
      setTestandoCanal("email");
      try {
        const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>Esta é uma mensagem de teste do INK SYSTEM.<br>Se você recebeu este e-mail, o canal está funcionando corretamente.</div>";
        await fetch("/api/resend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: resendApiKey, from: (nomeRemetente || studioName || "INK SYSTEM") + " <" + emailRemetente + ">", to: studioEmail, subject: "Teste de canal — INK SYSTEM", html })
        });
        setTesteCanalEnviado({ canal: "email", destino: studioEmail });
      } catch { setShowAviso("Erro ao enviar o teste. Revise a Resend API Key."); }
      setTestandoCanal(null);
    } else {
      if (!zenviaApiKey || !zenviaNumero) { setShowAviso("Preencha a Zenvia API Key e o Número de Envio antes de testar."); return; }
      if (!studioTel) { setShowAviso("Preencha o WhatsApp do Estúdio em Configurações → Estúdio para receber o teste."); return; }
      setTestandoCanal(canal);
      try {
        const tel = (studioTel || "").replace(/[^0-9]/g, "");
        const endpoint = canal === "sms" ? "/api/zenvia-sms" : "/api/zenvia";
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: zenviaApiKey, from: zenviaNumero, to: tel, text: "Mensagem de teste do INK SYSTEM. Se você recebeu isso, o canal está funcionando!" })
        });
        setTesteCanalEnviado({ canal, destino: studioTel });
      } catch { setShowAviso("Erro ao enviar o teste. Revise a Zenvia API Key."); }
      setTestandoCanal(null);
    }
  };

  const confirmarRecebimentoTeste = async (recebeu: boolean) => {
    if (!testeCanalEnviado) return;
    const canal = testeCanalEnviado.canal;
    await salvarCanaisHabilitados({ ...canaisHabilitados, [canal]: recebeu });
    setShowAviso(recebeu ? "✅ Canal confirmado e marcado como testado." : "Canal não confirmado. Revise as credenciais e tente novamente.");
    setTesteCanalEnviado(null);
  };

  const salvarPvReguaAtiva = async (ativa: boolean) => {
    setPvReguaAtiva(ativa);
    try {
      await sb.from("configuracoes").upsert({ user_id: userId, pv_regua_ativa: ativa }, { onConflict: "user_id" });
    } catch {}
  };

  const salvarPreReguaAtiva = async (novo: typeof preReguaAtiva) => {
    setPreReguaAtiva(novo);
    try {
      await sb.from("configuracoes").upsert({ user_id: userId, pre_regua_ativa: JSON.stringify(novo) }, { onConflict: "user_id" });
    } catch {}
  };

  const salvarPreSessaoRegua = async (novaRegua: typeof preSessaoRegua) => {
    setPreSessaoRegua(novaRegua);
    try {
      await sb.from("configuracoes").upsert({ user_id: userId, pre_sessao_regua: JSON.stringify(novaRegua) }, { onConflict: "user_id" });
    } catch {}
  };

  const salvarPreSessaoReguaAtiva = async (ativa: boolean) => {
    setPreSessaoReguaAtiva(ativa);
    try {
      await sb.from("configuracoes").upsert({ user_id: userId, pre_sessao_regua_ativa: ativa }, { onConflict: "user_id" });
    } catch {}
  };

  const executarDisparoPreSessao = async (etapa: any) => {
    const canal = etapa.canal || "email";
    const canalOk = canaisHabilitados[canal as keyof typeof canaisHabilitados] !== false;
    if (!canalOk) { setShowAviso("Canal " + canal + " não está habilitado nas configurações."); return; }
    const hoje = new Date();
    const alvoDate = new Date(hoje);
    alvoDate.setDate(hoje.getDate() + etapa.dias);
    const alvoStr = alvoDate.getFullYear() + "-" +
      String(alvoDate.getMonth() + 1).padStart(2, "0") + "-" +
      String(alvoDate.getDate()).padStart(2, "0");
    const eventosAlvo = agEvents.filter((e: any) => e.date === alvoStr && (e.tipo || "").startsWith("sess") && e.status !== "cancelado" && e.status !== "concluido");
    let enviados = 0;
    for (const evento of eventosAlvo) {
      const cliente = clients.find((c: any) => c.id === evento.cliente_id);
      if (!cliente) continue;
      const dataFmt = alvoStr.split("-").reverse().join("/");
      const horaFmt = String(evento.start).padStart(2, "0") + ":00";
      const artistaNome = artists.find((a: any) => (evento.tipo || "").includes(a.id))?.nome || "";
      const servicoNome = evento.servico || "Sessão";
      const msg = (etapa.msg || "")
        .replace(/\{nome\}/gi, cliente.nome || "")
        .replace(/\{data\}/gi, dataFmt)
        .replace(/\{hora\}/gi, horaFmt)
        .replace(/\{artista\}/gi, artistaNome)
        .replace(/\{servico\}/gi, servicoNome)
        .replace(/\{estudio\}/gi, studioName || "INK SYSTEM");
      try {
        if (canal === "email" && resendApiKey && cliente.email) {
          const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" + msg.replace(/\n/g, "<br>") + "</div>";
          await fetch("/api/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: resendApiKey, from: emailRemetente || "noreply@acasadoscarvalhotattoo.com.br", to: cliente.email, subject: etapa.label + " — " + (studioName || "INK SYSTEM"), html })
          });
          enviados++;
        } else if ((canal === "sms") && zenviaApiKey && zenviaNumero && cliente.tel) {
          const tel = (cliente.tel || "").replace(/[^0-9]/g, "");
          await fetch("/api/zenvia-sms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: zenviaApiKey, from: zenviaNumero, to: tel, text: msg })
          });
          enviados++;
        }
      } catch {}
    }
    try {
      const now = new Date();
      const data = now.toLocaleDateString("pt-BR");
      const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      await sb.from("historico").insert({ data, hora, acao: "Disparo pré-sessão manual — " + etapa.label + " — " + enviados + " destinatário(s)", user_id: userId });
    } catch {}
    setShowAviso("Disparo pré-sessão enviado para " + enviados + " cliente(s) com sessão em " + etapa.dias + " dia(s).");
    setDisparoPreSessaoPendente(null);
  };

  // ── DISPARO MANUAL: executa envio de uma etapa sob demanda ────────────────
  const executarDisparoManual = async (etapa: any, tipoRegua: string) => {
    const canal = etapa.canal || "email";
    const canalOk = canaisHabilitados[canal as keyof typeof canaisHabilitados] !== false;
    if (!canalOk) { setShowAviso("Canal " + canal + " não está habilitado nas configurações."); return; }
    const clientes = tipoRegua.startsWith("pré-venda")
      ? clients.filter(c => {
          const campo = tipoRegua.split("/")[1] || "";
          return c.etapa === campo;
        })
      : clients.filter(c => c.etapa === "tatuado" || c.etapa === "pos_venda");
    let enviados = 0;
    for (const cliente of clientes) {
      const msg = (etapa.msg || "")
        .replace(/\{nome\}/gi, cliente.nome || "")
        .replace(/\[Nome\]/gi, cliente.nome || "")
        .replace(/\{estudio\}/gi, studioName || "INK SYSTEM")
        .replace(/\[ESTUDIO\]/gi, studioName || "INK SYSTEM");
      try {
        if (canal === "email" && resendApiKey && cliente.email) {
          const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" + msg.replace(/\n/g, "<br>") + "</div>";
          await fetch("/api/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: resendApiKey, from: emailRemetente || "noreply@acasadoscarvalhotattoo.com.br", to: cliente.email, subject: etapa.label + " — " + (studioName || "INK SYSTEM"), html })
          });
          enviados++;
        } else if ((canal === "whatsapp" || canal === "sms") && zenviaApiKey && zenviaNumero && cliente.tel) {
          const tel = (cliente.tel || "").replace(/[^0-9]/g, "");
          const endpoint = canal === "sms" ? "/api/zenvia-sms" : "/api/zenvia";
          await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ apiKey: zenviaApiKey, from: zenviaNumero, to: tel, text: msg })
          });
          enviados++;
        }
      } catch {}
    }
    try {
      const now = new Date();
      const data = now.toLocaleDateString("pt-BR");
      const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      await sb.from("historico").insert({ data, hora, acao: "Disparo manual [" + tipoRegua + "] — " + etapa.label + " — " + enviados + " destinatário(s)", user_id: userId });
    } catch {}
    setShowAviso("Disparo manual enviado para " + enviados + " cliente(s).");
    setDisparoManualPendente(null);
  };

  // ─── RELATÓRIO FINANCEIRO ────────────────────────────────────────────────
  const enviarRelatorioContador = async () => {
    if (!studioEmail) { setShowAviso("Configure o e-mail do estúdio nas Configurações antes de enviar."); return; }
    if (!resendApiKey) { setShowAviso("Configure a Resend API Key nas Configurações → IA."); return; }
    setEnviandoRelatorio(true);
    try {
      const mes = finFiltroMes || new Date().toISOString().slice(0, 7);
      const [ano, mesNum] = mes.split("-");
      const nomeMes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][Number(mesNum) - 1];
      const entradas = fin.filter((f: any) => (!f.tipo || f.tipo === "entrada") && !f.is_permuta && (f.data || "").startsWith(mes));
      const permutas = fin.filter((f: any) => f.is_permuta && (f.data || "").startsWith(mes));
      const saidasMes = saidas.filter((s: any) => (s.data || "").startsWith(mes));
      const totalEnt = entradas.reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
      const totalSai = saidasMes.reduce((s: number, x: any) => s + (Number(x.valor) || 0), 0);
      const totalRep = entradas.reduce((s: number, f: any) => s + ((Number(f.val_a) || 0) * (Number(f.com_sess) || 0) / 100), 0);
      const totalPerm = permutas.reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
      const saldo = totalEnt - totalSai - totalRep;
      const linhasEntradas = entradas.map((f: any) =>
        "<tr><td>" + (f.data || "—") + "</td><td>" + (f.cliente_nome || "—") + "</td><td>" + (f.pgto || f.forma_pgto || "—") + "</td><td style='text-align:right'>R$ " + Number(f.val_a).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "</td></tr>"
      ).join("");
      const linhasSaidas = saidasMes.map((s: any) =>
        "<tr><td>" + (s.data || "—") + "</td><td>" + (s.descricao || "—") + "</td><td>" + (s.categoria || "—") + "</td><td style='text-align:right'>R$ " + Number(s.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "</td></tr>"
      ).join("");
      const linhasPermutas = permutas.map((f: any) =>
        "<tr><td>" + (f.data || "—") + "</td><td>" + (f.cliente_nome || "—") + "</td><td>Permuta</td><td style='text-align:right'>R$ " + Number(f.val_a).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "</td></tr>"
      ).join("");
      const html = "<div style='font-family:Arial,sans-serif;max-width:700px;margin:0 auto;color:#222'>" +
        "<h2 style='color:#1a1a1a;border-bottom:2px solid #C9A84C;padding-bottom:8px'>📊 Relatório Financeiro — " + nomeMes + "/" + ano + "</h2>" +
        "<p style='color:#555'>Estúdio: <strong>" + (studioName || "—") + "</strong>" + (cnpj ? " · CNPJ " + cnpj : "") + "</p>" +
        "<table style='width:100%;border-collapse:collapse;margin:16px 0'>" +
        "<tr><td style='padding:8px;background:#f9f9f9;border:1px solid #eee'>💰 Faturamento (caixa real)</td><td style='padding:8px;background:#f9f9f9;border:1px solid #eee;text-align:right;font-weight:700;color:#27AE60'>R$ " + totalEnt.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "</td></tr>" +
        "<tr><td style='padding:8px;border:1px solid #eee'>📤 Saídas</td><td style='padding:8px;border:1px solid #eee;text-align:right;color:#E74C3C'>R$ " + totalSai.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "</td></tr>" +
        "<tr><td style='padding:8px;background:#f9f9f9;border:1px solid #eee'>👤 Repasses profissionais</td><td style='padding:8px;background:#f9f9f9;border:1px solid #eee;text-align:right;color:#E67E22'>R$ " + totalRep.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "</td></tr>" +
        (totalPerm > 0 ? "<tr><td style='padding:8px;border:1px solid #eee'>🔄 Permutas (não contabilizado)</td><td style='padding:8px;border:1px solid #eee;text-align:right;color:#9B59B6'>R$ " + totalPerm.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "</td></tr>" : "") +
        "<tr style='background:#C9A84C20'><td style='padding:8px;border:1px solid #C9A84C;font-weight:700'>💵 Saldo Líquido</td><td style='padding:8px;border:1px solid #C9A84C;text-align:right;font-weight:700;font-size:16px'>R$ " + saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "</td></tr>" +
        "</table>" +
        (linhasEntradas ? "<h3 style='margin-top:24px;color:#1a1a1a'>Entradas</h3><table style='width:100%;border-collapse:collapse;font-size:13px'><thead><tr style='background:#f0f0f0'><th style='padding:6px;text-align:left;border:1px solid #ddd'>Data</th><th style='padding:6px;text-align:left;border:1px solid #ddd'>Cliente</th><th style='padding:6px;text-align:left;border:1px solid #ddd'>Forma</th><th style='padding:6px;text-align:right;border:1px solid #ddd'>Valor</th></tr></thead><tbody>" + linhasEntradas + "</tbody></table>" : "") +
        (linhasSaidas ? "<h3 style='margin-top:24px;color:#1a1a1a'>Saídas</h3><table style='width:100%;border-collapse:collapse;font-size:13px'><thead><tr style='background:#f0f0f0'><th style='padding:6px;text-align:left;border:1px solid #ddd'>Data</th><th style='padding:6px;text-align:left;border:1px solid #ddd'>Descrição</th><th style='padding:6px;text-align:left;border:1px solid #ddd'>Categoria</th><th style='padding:6px;text-align:right;border:1px solid #ddd'>Valor</th></tr></thead><tbody>" + linhasSaidas + "</tbody></table>" : "") +
        (linhasPermutas ? "<h3 style='margin-top:24px;color:#9B59B6'>Permutas (informativo)</h3><table style='width:100%;border-collapse:collapse;font-size:13px'><thead><tr style='background:#f5f0ff'><th style='padding:6px;text-align:left;border:1px solid #ddd'>Data</th><th style='padding:6px;text-align:left;border:1px solid #ddd'>Cliente</th><th style='padding:6px;text-align:left;border:1px solid #ddd'>Tipo</th><th style='padding:6px;text-align:right;border:1px solid #ddd'>Valor</th></tr></thead><tbody>" + linhasPermutas + "</tbody></table>" : "") +
        "<p style='margin-top:24px;font-size:12px;color:#999'>Gerado pelo INK SYSTEM · " + new Date().toLocaleString("pt-BR") + "</p></div>";
      await fetch("/api/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: resendApiKey,
          from: "aura@acasadoscarvalhotattoo.com.br",
          to: studioEmail,
          subject: "📊 Relatório Financeiro — " + nomeMes + "/" + ano + " · " + (studioName || "INK SYSTEM"),
          html
        })
      });
      setShowAviso("✅ Relatório de " + nomeMes + "/" + ano + " enviado para " + studioEmail + ". Encaminhe para seu contador.");
    } catch { setShowAviso("❌ Erro ao enviar relatório. Verifique as configurações de e-mail."); }
    setEnviandoRelatorio(false);
  };

  // ─── SALVAR CLIENTE NO SUPABASE ──────────────────────────────────────────
  const saveClientDb = useCallback(async (c: any) => {
    await dbUpsert("clientes", {
      id: typeof c.id === "number" ? undefined : c.id,
      nome: c.nome, insta: c.insta || "", tel: c.tel || "",
      qual: c.qual, artista: c.artista, etapa: c.etapa,
      orig: c.orig || "", email: c.email || "",
      tam: c.tam || "Medio", intencao: c.intencao || "", primeira: c.primeira || false,
      cob: c.cob || false, descricao: c.desc || "",
      stars: c.stars || 0, star_reason: c.starReason || "",
      consent: c.consent, nps: c.nps, obs: c.obs || "",
      val_a: c.val_a || 0, val_c: c.val_c || 0, pgto: c.pgto || "",
      parcelas: c.parcelas || "1",
      orcamento: c.orcamento || false, contrato: c.contrato || false,
      faltas: c.faltas || 0, indicacoes: c.indicacoes || 0,
      credito: c.credito || 0, cri: c.cri || "",
      google_review: c.googleReview || false,
      hist: c.hist || [], followups: c.pv || [], dias: c.dias || 0,
      nascimento: c.nascimento || "",
      documento: (c as any).documento || "",
      projetos: c.projetos || [],
      referencias: (c as any).referencias || [],
      user_id: userId,
      updated_at: new Date().toISOString()
    }, (msg) => setShowAviso("Erro ao salvar dados do cliente: " + msg));
  }, [userId]);

  const addLog = useCallback(async (acao: string) => {
    const now = new Date();
    const data = now.toLocaleDateString("pt-BR");
    const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const row = { data, hora, acao, user_id: userId };
    setHistorico(p => [{ ...row, id: Date.now() }, ...p]);
    try { await sb.from("historico").insert(row); } catch(e) { console.warn("log error", e); }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    sb.from("historico").select("*").eq("user_id", userId).order("id", { ascending: false }).limit(500)
      .then(({ data }) => { if (data) setHistorico(data); });
  }, [userId]);

  useEffect(() => {
    if (tab === "agenda") {
      const horaAtual = new Date().getHours();
      const el = document.querySelector(".wt[data-hora='" + horaAtual + "']");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [tab]);

  useMemo(() => applyTheme(dark, tema), [dark, tema]);
  useMemo(() => {
    if (artists.length > 0) {
      const root = document.documentElement;
      artists.forEach(a => {
        if (a.cor) root.style.setProperty("--artist-" + a.id, a.cor);
      });
      const ab = artists[0]?.cor || "#4A9EBF";
      const ca = artists[1]?.cor || "#9B6BB5";
      root.style.setProperty("--ab", ab);
      root.style.setProperty("--ca", ca);
    }
  }, [artists]);

  const clientesVisiveis = useMemo(() => userRole === "profissional" ? clients.filter(c => c.artista === userArtistId) : clients, [clients, userRole, userArtistId]);

  const filtered = useMemo(() => clientesVisiveis.filter(c => {
    const mA = fa === "todos" || c.artista === fa;
    const q = srch.toLowerCase();
    const mS = !srch ||
      c.nome.toLowerCase().includes(q) ||
      (c.tel || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.insta || "").toLowerCase().includes(q) ||
      (c.orig || "").toLowerCase().includes(q) ||
      (c.desc || "").toLowerCase().includes(q) ||
      (c.etapa || "").toLowerCase().includes(q);
    const mE = !filtroExtra
      ? true
      : filtroExtra.tipo === "campanha"
        ? c.campanha_id === filtroExtra.valor
        : (() => {
            const cOrig = (c.orig || "").toLowerCase();
            const o = origens.find(or => or.nome === filtroExtra.valor);
            if (o) return cOrig === o.nome.toLowerCase() || cOrig === o.slug;
            return cOrig === filtroExtra.valor.toLowerCase();
          })();
    return mA && mS && mE;
  }), [clients, fa, srch, filtroExtra, origens]);

  const getSC = (id: string) => filtered.filter(c => c.etapa === id);
  const calcScore = (c: any): { score: number; label: string; cor: string } => {
    let pts = 0;
    // Pontualidade — sem faltas = máximo
    const faltas = c.faltas || 0;
    pts += faltas === 0 ? 25 : faltas === 1 ? 15 : faltas === 2 ? 5 : 0;
    // Ticket médio real — soma do financeiro do cliente
    const finCli = fin.filter((f: any) => f.cliente_id === c.id && (!f.tipo || f.tipo === "entrada"));
    const totalReal = finCli.reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
    const sessoes = finCli.length || 1;
    const ticketMedio = totalReal / sessoes;
    pts += ticketMedio >= 2000 ? 25 : ticketMedio >= 1000 ? 20 : ticketMedio >= 500 ? 15 : ticketMedio >= 200 ? 10 : totalReal > 0 ? 5 : 0;
    // Indicações
    const ind = c.indicacoes || 0;
    pts += ind >= 5 ? 25 : ind >= 3 ? 20 : ind >= 1 ? 12 : 0;
    // Recência — dias desde cadastro (quanto mais recente/ativo, melhor)
    const dias = c.dias || 0;
    pts += dias <= 90 ? 25 : dias <= 180 ? 20 : dias <= 365 ? 10 : 5;
    const score = Math.min(pts, 100);
    const label = score >= 80 ? "VIP" : score >= 60 ? "Fiel" : score >= 40 ? "Regular" : score >= 20 ? "Novo" : "Frio";
    const cor = score >= 80 ? "#C9A84C" : score >= 60 ? "#27AE60" : score >= 40 ? "#3498DB" : score >= 20 ? "var(--tx2)" : "var(--tx3)";
    return { score, label, cor };
  };
  const miss = (c: any) => {
    const m: string[] = [];
    if (!c.email) m.push("Email");
    if (!c.insta) m.push("Instagram");
    // Valor do projeto vazio
    const proj = c.projetos?.[0];
    const valorTotalNum = proj ? Number(String(proj.valorTotal || "0").replace(/\./g,"").replace(",",".")) : 0;
    if (proj && valorTotalNum <= 0 && c.etapa !== "lead") m.push("Valor do projeto");
    // Forma de pagamento não definida em cliente com sessão agendada
    const pgtoValido = (c.pgto && c.pgto !== "A definir") ||
      (c.etapa === "tatuado") ||
      (c.etapa === "aguard_agend") ||
      (c.etapa === "pos_venda") ||
      fin.some((f: any) => String(f.cliente_id) === String(c.id));
    if (!pgtoValido && ["sessao_agend"].includes(c.etapa)) m.push("Forma de pagamento");
    // [X7] Sinal pendente — só alertar se projeto ainda não foi quitado
    const totalPagoCliente = fin.filter((f: any) => String(f.cliente_id) === String(c.id) && !f.is_permuta).reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
    const valorProjetoCliente = Number(c.val_a) || 0;
    const projetoQuitado = valorProjetoCliente > 0 && totalPagoCliente >= valorProjetoCliente;
    const temSinalPendente = !projetoQuitado && agEvents.some(e =>
      e.cliente_id === c.id &&
      e.sinal > 0 &&
      !e.sinal_pago
    );
    if (temSinalPendente) m.push("Sinal pendente");
    return m;
  };
  const churn = (c: any) => {
    if (c.etapa !== "tatuado" && c.etapa !== "aguard_agend" && c.etapa !== "pos_venda") return null;
    if (c.dias >= 365) return "red";
    if (c.dias >= 180) return "orange";
    return null;
  };

  const alertas = useMemo(() => {
    const hoje = new Date();
    return clients.filter(c => {
      const projSemValor = (c.projetos || []).some((p: any) => { const vt = Number(String(p.valorTotal || "0").replace(/\./g,"").replace(",",".")); return p.status !== "concluido" && p.status !== "cancelado" && vt <= 0; }) && c.etapa !== "lead";
      let aniversario = false;
      if ((c as any).nascimento) {
        const nasc = new Date((c as any).nascimento);
        for (let i = 0; i <= 7; i++) {
          const d = new Date(hoje); d.setDate(d.getDate() + i);
          if (nasc.getMonth() === d.getMonth() && nasc.getDate() === d.getDate()) { aniversario = true; break; }
        }
      }
      const garantia = c.etapa === "tatuado" && c.dias >= 30 && c.dias <= 37;
      const inativo = !["blacklist","tatuado","aguard_agend","pos_venda","hibernacao"].includes(c.etapa) && c.dias >= 40;
      return miss(c).length > 0 || churn(c) || projSemValor || aniversario || garantia || inativo;
    });
  }, [clients]);
  const reativacao = useMemo(() =>
    clients.filter(c => !["blacklist", "tatuado", "aguard_agend", "pos_venda"].includes(c.etapa) && c.dias >= 30)
      .sort((a, b) => b.dias - a.dias).slice(0, 5),
    [clients]
  );
  const paraExcluir = useMemo(() =>
    clients.filter(c => c.dias >= 40 && c.etapa === "lead" && !["blacklist"].includes(c.etapa)),
    [clients]
  );

  const move = (cid: number, ns: string) => {
    const cli = clients.find(c => c.id === cid);
    const evs = agEvents.filter(e => e.cliente_id === cid);

    // Cumpriu Evento — modal de pagamento
    if (ns === "tatuado") {
      const hoje0 = hojeLocal(); hoje0.setHours(23,59,59,0);
      const sessoesCliente = evs.filter(e => !e.tipo?.startsWith("bloq") && !e.tipo?.startsWith("cons"));
      const todasFuturas = sessoesCliente.length > 0 && sessoesCliente.every(e => {
        const d = e.date ? new Date(e.date + "T12:00:00") : null;
        return d && d > hoje0;
      });
      if (todasFuturas) {
        setShowAviso("Esta sessão ainda não ocorreu. Só é possível confirmar sessões do dia atual ou passadas.");
        return;
      }
      const sessoesDisponiveis = agEvents.filter(e =>
        e.cliente_id === cid &&
        e.tipo?.startsWith("sess") &&
        e.status !== "concluido" &&
        e.status !== "cancelado"
      );
      if (sessoesDisponiveis.length > 1) {
        setSelSessaoModal({ cid, sessoes: sessoesDisponiveis });
        return;
      }
      const ev = evs.length > 0 ? evs[evs.length - 1] : null;
      const valorPrev = ev?.valor_previsto ? (Number(ev.valor_previsto)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
      setPagFormas([{ forma: "Pix", valor: valorPrev, parcelas: "1" }]);
      setConfirmPagamento({ cid, agEvent: ev });
      return;
    }

    // Consulta Marcada — abre agendamento tipo Consulta
    if (ns === "cons_agendada") {
      executarMove(cid, ns);
      if (evs.length === 0) {
        setTimeout(() => {
          setEditingEvent(null);
          setAgClientVinc(cli || null);
          setAgClientSearch("");
          setSessoesExtras([]);
          setAgForm({ title: cli?.nome || "", desc: "", tipo: "cons_" + (cli?.artista || artists[0]?.id || ""), date: new Date().toISOString().split("T")[0], start: 9, end: 11, sinal: "", sinalPago: false } as any);
          setShowAgForm(true);
        }, 200);
      }
      return;
    }

    // Sessão Marcada — abre agendamento tipo Sessão
    if (ns === "sessao_agend") {
      executarMove(cid, ns);
      if (evs.length === 0) {
        setTimeout(() => {
          setEditingEvent(null);
          setAgClientVinc(cli || null);
          setAgClientSearch("");
          setSessoesExtras([]);
          setAgForm({ title: cli?.nome || "", desc: "", tipo: "sess_" + (cli?.artista || artists[0]?.id || ""), date: new Date().toISOString().split("T")[0], start: 9, end: 11, sinal: "", sinalPago: false } as any);
          setShowAgForm(true);
        }, 200);
      }
      return;
    }

    // Pós-venda — observação opcional
    if (ns === "pos_venda") {
      setPipelineMotivo({ cid, stage: stages.find(s => s.id === ns), motivo: "", dias: "" });
      return;
    }

    // Lista de Espera — motivo livre
    if (ns === "lista_espera") {
      setPipelineMotivo({ cid, stage: stages.find(s => s.id === ns), motivo: "", dias: "" });
      return;
    }

    // Hibernação — motivo + sugestão de dias para Aura
    if (ns === "hibernacao") {
      setPipelineMotivo({ cid, stage: stages.find(s => s.id === ns), motivo: "", dias: "30" });
      return;
    }

    // Blacklist — motivo obrigatório
    if (ns === "blacklist") {
      setPipelineMotivo({ cid, stage: stages.find(s => s.id === ns), motivo: "", dias: "" });
      return;
    }

    executarMove(cid, ns);
  };

  const executarMove = (cid: number, ns: string) => {
    const lbl = stages.find(s => s.id === ns)?.label || ns;
    const orq = ns === "sessao_agend";
    const tatuado = ns === "tatuado";
    const regraAtiva = pvRegua.length > 0 ? pvRegua : PV_FLOW.map(p => ({ id: p.id, label: p.label, dias: p.dias, msg: p.msg, canal: "email" }));
    const pvFlow = tatuado ? regraAtiva.map(p => ({ l: p.label, s: "pending", dias: p.dias, msg: p.msg, canal: p.canal || "email" })) : undefined;
    setClients(p => {
      const updated = p.map(c => c.id !== cid ? c : {
        ...c, etapa: ns, orcamento: orq,
        pv: tatuado ? (pvFlow || []) : c.pv,
        hist: [
          ...c.hist,
          { t: "Movido para: " + lbl, d: new Date().toLocaleDateString("pt-BR") },
          ...(orq ? [{ t: "Orcamento pendente de registro", d: new Date().toLocaleDateString("pt-BR") }] : []),
          ...(tatuado ? [{ t: "Fluxo de pos-venda iniciado automaticamente", d: new Date().toLocaleString("pt-BR") }] : []),
        ]
      });
      const c = updated.find(c => c.id === cid);
      if (c) {
        setTimeout(() => saveClientDb(c), 100);
        // Atualiza o sel se a ficha do cliente estiver aberta
        setSel((prev: any) => prev?.id === cid ? c : prev);
      }
      const nome = updated.find(c => c.id === cid)?.nome || "cliente";
      addLog(`Pipeline: "${nome}" movido para ${lbl}`);
      return updated;
    });
  };

  const confirmarPagamento = async () => {
    if (!confirmPagamento) return;
    const { cid } = confirmPagamento;
    const totalPago = pagFormas.reduce((s, f) => s + (parseFloat(f.valor.replace(/\./g, "").replace(",", ".")) || 0), 0);
    const dataHoje = new Date().toLocaleDateString("pt-BR");
    // Lançar cada forma no financeiro
    const cliente = clients.find(c => c.id === cid);
    const artistaId = confirmPagamento.agEvent?.artista || cliente?.artista || "";
    const artistaObj = artists.find(a => a.id === artistaId);
    const comSess = artistaObj?.com || 0;
    const dataHojeISO = new Date().toISOString().split("T")[0];
    const pgtoTexto = pagFormas.filter(f => parseFloat(f.valor) > 0)
      .map(f => f.forma === "Cartão" ? `Cartão ${f.parcelas}x` : f.forma).join(" + ");
    for (const f of pagFormas) {
      const val = parseFloat(f.valor.replace(/\./g, "").replace(",", ".")) || 0;
      if (val <= 0) continue;
      const taxaPct = f.forma === "Cartão" ? (parseFloat(((f as any).taxa || "0").replace(",", ".")) || 0) : 0;
      const valLiquido = taxaPct > 0 ? val * (1 - taxaPct / 100) : val;
      const nParcelas = f.forma === "Cartão" ? (parseInt(f.parcelas) || 1) : 1;
      const finRowPag = {
        cliente_id: cid,
        cliente_nome: cliente?.nome || "",
        artista: artistaId,
        data: dataHojeISO,
        val_a: val,
        val_c: valLiquido,
        pgto: f.forma === "Cartão" ? "Cartão " + f.parcelas + "x" : f.forma,
        taxa_maquina: taxaPct,
        parcelas: nParcelas,
        com_base: f.forma === "Permuta" ? 0 : comSess,
        com_sess: f.forma === "Permuta" ? 0 : comSess,
        categoria: "sessao",
        tipo: "entrada",
        is_permuta: f.forma === "Permuta" ? true : false,
        user_id: userId,
      };
      const { data: fdPag, error } = await sb.from("financeiro").insert(finRowPag).select().single();
      if (error) console.error("financeiro insert (sessão):", error);
      if (fdPag) setFin(p => [...p, { ...finRowPag, id: fdPag.id, cliente: cliente?.nome || "" }]);
    }
    // Registrar no histórico do cliente
    const formasTexto = pagFormas.filter(f => parseFloat(f.valor) > 0).map(f => `${f.forma} R$${parseFloat(f.valor).toFixed(2)}${f.forma === "Cartão" ? ` ${f.parcelas}x` : ""}`).join(" + ");
    setClients(p => {
      const updated = p.map(c => c.id !== cid ? c : {
        ...c,
        pgto: pgtoTexto,
        hist: [...(c.hist || []), { t: "💰 Pagamento: R$" + totalPago.toFixed(2) + " — " + formasTexto + (pgtoTexto.includes("Cartão") ? " (taxa máquina pendente)" : ""), d: new Date().toLocaleString("pt-BR") }]
      });
      const c = updated.find(c => c.id === cid);
      if (c) setTimeout(() => saveClientDb(c), 100);
      return updated;
    });
    // Marcar evento como concluído na agenda
    if (confirmPagamento.agEvent?.id) {
      await sb.from("agenda").update({ status: "concluido" }).eq("id", confirmPagamento.agEvent.id);
      setAgEvents(p => p.map(e => e.id === confirmPagamento.agEvent.id ? { ...e, status: "concluido" } : e));
    }
    // Se veio de "Solicitação Concluída" na ficha, marca o projeto e move pipeline
    if (projParaConcluir && projParaConcluir.clienteId === cid) {
      setClients(p => p.map(c => {
        if (c.id !== cid) return c;
        const projs = (c.projetos || []).map((p: any) =>
          p.id === projParaConcluir.projetoId
            ? { ...p, status: "concluido", concluidoEm: new Date().toLocaleDateString("pt-BR") }
            : p
        );
        setTimeout(() => saveClientDb({ ...c, projetos: projs }), 100);
        return { ...c, projetos: projs, hist: [...(c.hist||[]), { t: `Projeto concluído`, d: new Date().toLocaleString("pt-BR") }] };
      }));
      setProjParaConcluir(null);
    }
    setConfirmPagamento(null);
    setAgendarProximaModal({ cid });
  };

  const upC = (cid: number, f: string, v: any) => {
    setClients(p => {
      const updated = p.map(c => c.id !== cid ? c : { ...c, [f]: v });
      const c = updated.find(c => c.id === cid);
      if (c) setTimeout(() => saveClientDb(c), 100);
      return updated;
    });
  };

  // Atualiza estado local sem salvar no banco — usar no onChange de campos de texto
  // O save acontece no onBlur via upC
  const upCLocal = (cid: number, f: string, v: any) => {
    setClients(p => p.map(c => c.id !== cid ? c : { ...c, [f]: v }));
  };
  const upCFicha = (cid: number, f: string, v: any) => {
    setClients(p => p.map(c => c.id !== cid ? c : { ...c, [f]: v }));
    setFichaEditada(true);
  };

  const registrarFalta = (cid: number, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novasFaltas = (c.faltas || 0) + 1;
      const novoEtapa = novasFaltas >= 3 ? "blacklist" : c.etapa;
      const msg = novasFaltas === 1
        ? "Falta registrada - taxa de R$100 notificada ao cliente"
        : novasFaltas === 2
          ? "2a falta - cobranca de 30% notificada"
          : "3a falta - cliente movido para Blacklist automaticamente";
      const audit = msg + " — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      return { ...c, faltas: novasFaltas, etapa: novoEtapa, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
    }));
  };

  const removerFalta = (cid: number, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novasFaltas = Math.max((c.faltas || 0) - 1, 0);
      const novoEtapa = c.etapa === "blacklist" && (c.faltas || 0) <= 3 ? "lead" : c.etapa;
      const audit = "Falta removida (correcao) — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      return { ...c, faltas: novasFaltas, etapa: novoEtapa, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
    }));
  };

  const removerBlacklist = (cid: number, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const audit = "Removido da Blacklist — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      return { ...c, etapa: "lead", hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
    }));
  };

  const deleteClient = async (cid: any) => {
    const nome = clients.find(c => c.id === cid)?.nome || "cliente";
    setClients(p => p.filter(c => c.id !== cid));
    setSel(null);
    await sb.from("clientes").update({ excluido_em: new Date().toISOString() }).eq("id", cid);
    addLog(`Cliente "${nome}" movido para a Lixeira`);
    setConfirmExcluirCliente(null);
  };

  const deleteClientDefinitivo = async (cid: string) => {
    await sb.from("agendamentos_pendentes").delete().eq("cliente_id", cid);
    await sb.from("eventos_trafego").delete().eq("cliente_id", cid);
    await sb.from("financeiro").delete().eq("cliente_id", cid);
    await sb.from("agenda").delete().eq("cliente_id", cid);
    await sb.from("clientes").delete().eq("id", cid);
  };

  const carregarLixeira = async () => {
    if (!userId) return;
    setLixeiraLoading(true);
    try {
      const { data: excluidos } = await sb.from("clientes")
        .select("id, nome, tel, email, excluido_em")
        .eq("user_id", userId)
        .not("excluido_em", "is", null)
        .order("excluido_em", { ascending: false });
      setLixeiraClientes(excluidos || []);

      const { data: todos } = await sb.from("agendamentos_pendentes")
        .select("id, created_at, cliente_id, cliente_nome, cliente_email, cliente_tel, tipo, data_solicitada, status")
        .eq("user_id", userId)
        .not("cliente_id", "is", null);
      const clienteIds = [...new Set((todos || []).map((r: any) => r.cliente_id))];
      let idsValidos = new Set<string>();
      if (clienteIds.length > 0) {
        const { data: validos } = await sb.from("clientes").select("id").in("id", clienteIds);
        idsValidos = new Set((validos || []).map((c: any) => String(c.id)));
      }
      setLixeiraOrfaos((todos || []).filter((r: any) => !idsValidos.has(String(r.cliente_id))));
    } finally {
      setLixeiraLoading(false);
    }
  };

  const registrarIndicação = (cid: number, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novas = (c.indicacoes || 0) + 1;
      const audit = "Indicação registrada " + novas + "/8 — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      return { ...c, indicacoes: novas, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
    }));
  };

  const removerIndicação = (cid: number, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novas = Math.max((c.indicacoes || 0) - 1, 0);
      const audit = "Indicação removida (correcao) " + novas + "/8 — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      return { ...c, indicacoes: novas, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
    }));
  };

  const setStars = (cid: number, n: number) => {
    const r = STAR_REASONS[n] || "";
    setClients(p => p.map(c => c.id !== cid ? c : {
      ...c, stars: n, starReason: r,
      hist: [...c.hist, { t: "⭐".repeat(n) + " - " + r, d: new Date().toLocaleString("pt-BR") }]
    }));
  };

  const saveClient = async () => {
    const nc: any = {
      ...form, data: new Date().toLocaleDateString("pt-BR"),
      dias: 0, stars: 0, starReason: "", consent: null, nps: null, obs: "",
      val_a: 0, val_c: 0, pgto: "", cri: "", orcamento: false,
      hist: [{ t: "Cadastro manual criado", d: new Date().toLocaleString("pt-BR") }], pv: [],
      projetos: [{
        id: 1, status: "andamento",
        estilo: (form as any).estilo || "",
        tam: (form as any).tam || "Medio",
        regiao: (form as any).regiao || "",
        desc: (form as any).desc || "",
        valorTotal: (form as any).valorProjeto ? Number(String((form as any).valorProjeto).replace(/\./g,"").replace(",",".")) : 0,
        pagamentos: [], criadoEm: new Date().toLocaleDateString("pt-BR")
      }]
    };
    // Salva no banco primeiro para obter o UUID real
    if (sb) {
      const { data, error } = await sb.from("clientes").insert({
        nome: nc.nome, insta: nc.insta || "", tel: nc.tel || "",
        qual: nc.qual, artista: nc.artista || null,
        etapa: "lead",
        orig: nc.orig || "Instagram Organico",
        email: nc.email || "",
        estilo: nc.estilo || "", regiao: nc.regiao || "",
        tam: nc.tam || "Medio",
        intencao: nc.intencao || "",
        servico_interesse: (form as any).servicoInteresse || "",
        cob: nc.cob || false, descricao: nc.desc || "",
        stars: 0, consent: null, nps: null, obs: "",
        val_a: (form as any).valorProjeto ? Number(String((form as any).valorProjeto).replace(/\./g,"").replace(",",".")) : 0,
        val_c: 0, pgto: "", orcamento: false, contrato: false,
        faltas: 0, indicacoes: 0, credito: 0, cri: "",
        hist: nc.hist, followups: [], dias: 0,
        projetos: nc.projetos || [],
        nascimento: (form as any).nascimento || "",
        documento: (form as any).documento || "",
        user_id: userId,
        updated_at: new Date().toISOString()
      }).select().single();
      if (error) {
        setShowAviso(traduzirErro(error.message || "Tente novamente."));
        return;
      }
      if (data) {
        // Definir etapa inicial baseada na qualificação
        const etapaInicial = "lead";
        setClients(p => [{ ...nc, id: data.id, etapa: etapaInicial }, ...p]);
        // Salvar agendamento se marcado
        if (formAg.agendar && formAg.data) {
          await dbUpsert("agenda", {
            titulo: nc.nome,
            cliente_id: data.id,
            cliente_nome: nc.nome,
            artista: nc.artista,
            data: formAg.data,
            hora: formAg.hora,
            tipo: formAg.tipo === "cons" ? "cons_" + nc.artista : "sess_" + nc.artista,
            user_id: userId
          });
          setAgEvents(p => [...p, {
            id: Date.now(), title: nc.nome,
            tipo: formAg.tipo === "cons" ? "cons_" + nc.artista : "sess_" + nc.artista,
            date: formAg.data, start: parseInt((formAg.hora || "09:00").split(":")[0]), end: parseInt((formAg.hora || "09:00").split(":")[0]) + 2
          }]);
        }
      }
    } else {
      setClients(p => [{ ...nc, id: Date.now(), etapa: "lead" }, ...p]);
    }
    setShowForm(false);
    setFormAg({ agendar: false, data: "", hora: "09:00", tipo: "cons" });
    setForm({ nome: "", tel: "", email: "", insta: "", artista: "", estilo: "", regiao: "", tam: "Medio", desc: "", orig: "Instagram Organico", qual: "Q2", primeira: false, cob: false, intencao: "", nascimento: "" });
    addLog(`Cliente "${nc.nome}" cadastrado`);
  };

  const saveArtist = async () => {
    if (!artForm.nome.trim()) return;
    const row = {
      nome: artForm.nome,
      role: artForm.role,
      com: artForm.com,
      cor: artForm.cor,
      insta: artForm.insta || "",
      email: artForm.email || "",
      user_id: userId
    };
    const { data: artData, error: artError } = await sb.from("artistas").insert(row).select().single();
    if (artError) {
      setShowAviso(`Erro ao salvar artista: ${artError.message}`);
      return;
    }
    setArtists(p => [...p, { ...row, id: artData.id }]);
    setShowArtForm(false);
    setArtForm({ nome: "", role: "guest", com: 50, cor: "#C9A84C", insta: "@", email: "", tel: "" });
    addLog(`Profissional "${artForm.nome}" cadastrado`);
    if (!onboardingDone) { setOnbStep(s => s + 1); }
  };

  const traduzirErro = (msg: string): string => {
    if (msg.includes("invalid input syntax for type date")) return "Informe a data do agendamento antes de salvar.";
    if (msg.includes("null value in column")) return "Preencha todos os campos obrigatórios.";
    if (msg.includes("duplicate key")) return "Este registro já existe no sistema.";
    if (msg.includes("violates not-null")) return "Preencha todos os campos obrigatórios.";
    if (msg.includes("violates foreign key")) return "Referência inválida. Verifique os dados e tente novamente.";
    if (msg.includes("JWT")) return "Sessão expirada. Recarregue a página.";
    return "Algo deu errado. Tente novamente.";
  };

  const saveAgEvent = async (forceRetroativo = false) => {
    if (!agForm.date && !(agForm.tipo || "").startsWith("bloq")) {
      setShowAviso("Informe a data do agendamento antes de salvar.");
      return;
    }
    if (agForm.date) {
      const ano = parseInt(agForm.date.split("-")[0]);
      if (isNaN(ano) || ano < 2020 || ano > 2099) {
        setShowAviso("Data inválida. Verifique o ano informado.");
        return;
      }
    }
    if (!(agForm.tipo || "").startsWith("bloq")) {
      const servicoSelecionado = (agForm as any).servico || "";
      if (!servicoSelecionado) {
        setShowAviso("Selecione o tipo de serviço antes de confirmar o agendamento.");
        return;
      }
    }
    if ((agForm.tipo || "").startsWith("bloq")) {
      const tituloBloqueio = ((agForm as any).bloqTitulo || "").trim();
      if (!tituloBloqueio) {
        setShowAviso("Informe um título para o bloqueio antes de salvar.");
        return;
      }
    }
    if (!forceRetroativo && !(agForm.tipo || "").startsWith("bloq") && agForm.date) {
      const agDateStr = agForm.date + "T" + String(agForm.start).padStart(2,"0") + ":00:00";
      const agDateTime = new Date(agDateStr);
      const agora = hojeLocal();
      agora.setMinutes(agora.getMinutes() - 30);
      if (agDateTime < agora) {
        setShowAvisoPastDate(true);
        return;
      }
    }
    const row: any = {
      titulo: agForm.title,
      titulo_bloqueio: (agForm as any).bloqTitulo || "",
      artista: agForm.tipo === "piercing" ? ((agForm as any).artista_exec || "") : (agForm.tipo.replace("cons_","").replace("sess_","").replace("bloq_","") || artists[0]?.id || ""),
      data: agForm.date,
      hora: String(agForm.start).padStart(2, "0") + ":00",
      hora_fim: String(agForm.end).padStart(2, "0") + ":00",
      tipo: agForm.tipo,
      servico: (agForm as any).servico || "",
      obs: (agForm as any).desc || "",
      valor_previsto: parseFloat(String((agForm as any).valorPrevisto || "0").replace(/\./g, "").replace(",", ".")) || 0,
      sinal: parseFloat(String((agForm as any).sinal || "0").replace(/\./g, "").replace(",", ".")) || 0,
      sinal_pago: !!(agForm as any).sinalPago,
      user_id: userId,
      ...(agClientVinc ? { cliente_id: agClientVinc.id, cliente_nome: agClientVinc.nome } : {})
    };

    if (editingEvent) {
      const { data, error } = await sb.from("agenda").update(row).eq("id", editingEvent.id).select().single();
      if (error) { setShowAviso(traduzirErro(error.message)); return; }
      setAgEvents(p => p.map(e => e.id === editingEvent.id ? {
        ...data, title: data.titulo, date: data.data,
        start: parseInt(data.hora?.split(":")[0] || "9"),
        end: parseInt(data.hora_fim?.split(":")[0] || "11"),
        cliente_id: data.cliente_id, cliente_nome: data.cliente_nome
      } : e));
      setEditingEvent(null);
      setShowAgForm(false);
      setAgClientVinc(null);
      setAgClientSearch("");
      const servicoEdit = (agForm as any).servico || (agForm.tipo || "").split("_")[0];
      addLog("✏️ Agendamento editado: " + agForm.title + " — " + servicoEdit + " em " + agForm.date + " às " + agForm.start + "h");
      // Mover pipeline ao editar agendamento vinculado a cliente
      if (agClientVinc) {
        const tipoKey = (agForm.tipo || "").split("_")[0];
        const cli = clients.find((c: any) => c.id === agClientVinc.id);
        if (tipoKey === "cons" && cli && ["lead"].includes(cli.etapa)) {
          executarMove(agClientVinc.id, "cons_agendada");
        } else if ((tipoKey === "sess" || tipoKey === "piercing") && cli && ["lead", "cons_agendada", "hibernacao", "sessao_agend", "tatuado", "aguard_agend", "pos_venda"].includes(cli.etapa)) {
          executarMove(agClientVinc.id, "sessao_agend");
        }
      }
      // Lançar sinal no financeiro se foi marcado como pago agora e não havia antes
      const sinalValEdit = parseFloat(String((agForm as any).sinal || "0").replace(/\./g, "").replace(",", ".")) || 0;
      const sinalPagoEdit = !!(agForm as any).sinalPago;
      const sinalJaLancado = !!(editingEvent as any).sinal_pago;
      if (sinalValEdit > 0 && sinalPagoEdit && !sinalJaLancado && agClientVinc) {
        const artistaSinalEdit = (agForm.tipo || "").replace("cons_","").replace("sess_","").replace("bloq_","") || artists[0]?.id || "";
        const artistaObjEdit = artists.find(a => a.id === artistaSinalEdit);
        const comSinalEdit = artistaObjEdit?.com || 0;
        const { data: fdSinalEdit, error: errSinalEdit } = await sb.from("financeiro").insert({
          cliente_id: agClientVinc.id,
          cliente_nome: agClientVinc.nome,
          artista: artistaSinalEdit,
          data: new Date().toISOString().split("T")[0],
          val_a: sinalValEdit,
          val_c: sinalValEdit,
          pgto: "Sinal",
          com_base: 0,
          com_sess: 0,
          categoria: "sinal",
          user_id: userId,
        }).select().single();
        if (errSinalEdit) console.error("financeiro insert (sinal edição):", errSinalEdit);
        if (fdSinalEdit) setFin(p => [...p, { ...fdSinalEdit, cliente: agClientVinc.nome }]);
      }
      return;
    }

    // Verificar sinal pendente antes de salvar (novo evento)
    const sinalValCheck = parseFloat(String((agForm as any).sinal || "").replace(/\./g,"").replace(",",".")) || 0;
    const sinalPagoCheck = !!(agForm as any).sinalPago;
    if (sinalValCheck > 0 && sinalPagoCheck) {
      setSinalPgtoModal({ forma: "Pix", parcelas: "1" });
      return;
    }
    const { data, error } = await sb.from("agenda").insert(row).select().single();
    if (error) { setShowAviso(traduzirErro(error.message)); return; }
    setAgEvents(p => [...p, {
      ...data, title: data.titulo || agForm.title, date: data.data || agForm.date,
      start: parseInt(data.hora?.split(":")[0] || String(agForm.start)),
      end: parseInt(data.hora_fim?.split(":")[0] || String(agForm.end || (agForm.start + 2))),
      cliente_id: data.cliente_id, cliente_nome: data.cliente_nome
    }]);
    setShowAgForm(false);
    setEditingEvent(null);
    setAgClientVinc(null);
    setAgClientSearch("");
    const _servicoLog = (agForm as any).servico || "";
    const _dataLog = agForm.date || "";
    const _artistaLog = artists.find((a: any) => (agForm.tipo || "").includes(a.id))?.nome || "";
    addLog("📅 Agendado: " + agForm.title + " — " + _servicoLog + " em " + _dataLog + " às " + agForm.start + "h" + (_artistaLog ? " com " + _artistaLog : ""));
    // Registrar no histórico e mover pipeline automaticamente
    if (agClientVinc) {
      const dataFmt = agForm.date ? agForm.date.split("-").reverse().join("/") : agForm.date;
      const tipoLabel: Record<string,string> = { cons: "Consulta", sess: "Sessão", piercing: "Piercing", bloq: "Bloqueio" };
      const tipoKey = (agForm.tipo || "").split("_")[0];
      const tipoNome = tipoLabel[tipoKey] || agForm.tipo;
      const sinalVal = parseFloat(String((agForm as any).sinal || "0").replace(/\./g, "").replace(",", ".")) || 0;
      const sinalPago = !!(agForm as any).sinalPago;
      const artistaId = (agForm.tipo || "").split("_").slice(1).join("_") || agClientVinc?.artista || "";
        const artistaNome = artists.find(a => a.id === artistaId)?.nome || artists.find(a => (agForm.tipo || "").includes(a.id))?.nome || "";
        const servicoNome = (agForm as any).servico || tipoNome;
        const histEntries = [
        { t: `📅 Agendamento: ${servicoNome} em ${dataFmt} às ${agForm.start}h${artistaNome ? " com " + artistaNome : ""}`, d: new Date().toLocaleString("pt-BR") },
        ...(sinalVal > 0 ? [{ t: `Sinal de R$${sinalVal.toFixed(2)} ${sinalPago ? "recebido" : "pendente"}`, d: new Date().toLocaleString("pt-BR") }] : [])
      ];
      setClients(p => {
        const updated = p.map(c => c.id !== agClientVinc.id ? c : {
          ...c, hist: [...(c.hist || []), ...histEntries]
        });
        const c = updated.find(c => c.id === agClientVinc.id);
        if (c) setTimeout(() => saveClientDb(c), 100);
        return updated;
      });
      // Movimento automático de pipeline — único bloco, sem duplicação
      if (tipoKey === "cons") {
        const cli = clients.find((c: any) => c.id === agClientVinc.id);
        if (cli && ["lead"].includes(cli.etapa)) {
          executarMove(agClientVinc.id, "cons_agendada");
        }
      } else if (tipoKey === "sess" || tipoKey === "piercing") {
        const cli = clients.find((c: any) => c.id === agClientVinc.id);
        if (cli && ["lead", "cons_agendada", "hibernacao", "sessao_agend", "tatuado", "aguard_agend", "pos_venda"].includes(cli.etapa)) {
          if (cli.etapa === "hibernacao" && (cli.faltas || 0) > 0) {
            setTimeout(() => setShowAviso(`⚠️ ${cli.nome} estava em hibernação por desmarcação. Lembre de cobrar R$100,00 de taxa — conforme política do estúdio.`), 500);
          }
          executarMove(agClientVinc.id, "sessao_agend");
        }
      }
      // Lançar sinal no financeiro se já pago
      if (sinalVal > 0 && sinalPago) {
        const artistaSinal = (agForm.tipo || "").replace("cons_","").replace("sess_","").replace("bloq_","") || artists[0]?.id || "";
        const artistaObjSinal = artists.find(a => a.id === artistaSinal);
        const comSinal = artistaObjSinal?.com || 0;
        const { data: fdSinal, error: errSinal } = await sb.from("financeiro").insert({
          cliente_id: agClientVinc.id,
          cliente_nome: agClientVinc.nome,
          artista: artistaSinal,
          data: new Date().toISOString().split("T")[0],
          val_a: sinalVal,
          val_c: sinalVal,
          pgto: "Sinal",
          com_base: 0,
          com_sess: 0,
          categoria: "sinal",
          user_id: userId,
        }).select().single();
        if (errSinal) console.error("financeiro insert (sinal):", errSinal);
        if (fdSinal) setFin(p => [...p, { ...fdSinal, cliente: agClientVinc.nome }]);
      }
      // Piercing — mover pipeline para sessao_agend automaticamente
      if (agForm.tipo === "piercing" && agClientVinc) {
        executarMove(agClientVinc.id, "sessao_agend");
      }
      // Salvar sessões extras (2ª, 3ª...)
      if (sessoesExtras.length > 0) {
        const artId = (agForm.tipo || "").replace("cons_","").replace("sess_","") || artists[0]?.id || "";
        for (let i = 0; i < sessoesExtras.length; i++) {
          const sx = sessoesExtras[i];
          if (!sx.date) continue;
          const numSessao = i + 2;
          const titulo = agClientVinc.nome + " — " + numSessao + "ª Sessão";
          const rowSx: any = {
            titulo, cliente_id: agClientVinc.id, cliente_nome: agClientVinc.nome,
            artista: artId, data: sx.date,
            hora: String(sx.start).padStart(2,"0") + ":00",
            hora_fim: String(sx.end).padStart(2,"0") + ":00",
            tipo: "sess_" + artId, obs: numSessao + "ª sessão do projeto",
            user_id: userId
          };
          const { data: dSx } = await sb.from("agenda").insert(rowSx).select().single();
          if (dSx) setAgEvents(p => [...p, { ...dSx, title: titulo, date: dSx.data, start: sx.start, end: sx.end, tipo: "sess_" + artId }]);
        }
        setSessoesExtras([]);
        addLog(`Agenda: ${sessoesExtras.length} sessão(ões) extra(s) criadas para ${agClientVinc.nome}`);
      }
    }
  };

  const disparo = () => { setSent(true); setTimeout(() => setSent(false), 4000); };

  const disparar = async (clientesAlvo: any[], mensagem: string, segmentoLabel: string) => {
    setSent(true);
    setTimeout(() => setSent(false), 4000);
    const agora = new Date();
    const dataHora = agora.toLocaleDateString("pt-BR");
    const horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    let emailOk = 0;
    let smsOk = 0;
    for (const cliente of clientesAlvo) {
      if (cliente.email && resendApiKey && emailRemetente) {
        try {
          await fetch("/api/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: resendApiKey,
              from: (nomeRemetente || studioName) + " <" + emailRemetente + ">",
              to: [cliente.email],
              subject: "Mensagem de " + (studioName || "seu estúdio"),
              html: "<p>" + mensagem.replace(/\n/g, "<br/>") + "</p><br/><p style='font-size:11px;color:#888'>— " + (studioName || "") + "</p>"
            })
          });
          emailOk++;
        } catch {}
      }
      if (cliente.tel && zenviaApiKey && zenviaNumero) {
        try {
          const smsBody = mensagem.slice(0, 160);
          const telLimpo = cliente.tel.replace(/[^0-9]/g, "");
          await fetch("/api/zenvia", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: zenviaApiKey,
              from: zenviaNumero,
              to: "+55" + telLimpo,
              text: smsBody
            })
          });
          smsOk++;
        } catch {}
      }
    }
    const novoItem = { data: dataHora, hora: horaStr, segmento: segmentoLabel, destinatarios: clientesAlvo.length, preview: mensagem.slice(0, 60) };
    setDisparosHist(p => [novoItem, ...p.slice(0, 19)]);
    const emailCount = clientesAlvo.filter(c => c.email).length;
    const smsCount = clientesAlvo.filter(c => c.tel).length;
    if (emailCount > 0) {
      try { await sb.from("historico").insert({ data: dataHora, hora: horaStr, acao: "Disparo Email — " + segmentoLabel + " — " + emailCount + " destinatários", user_id: userId }); } catch {}
    }
    if (smsCount > 0) {
      try { await sb.from("historico").insert({ data: dataHora, hora: horaStr, acao: "Disparo SMS — " + segmentoLabel + " — " + smsCount + " destinatários", user_id: userId }); } catch {}
    }
  };

  const AURA_TOOLS = [
    {
      name: "mover_pipeline",
      description: "Move um cliente para uma nova etapa do pipeline. Sempre perguntar ao usuário antes de executar.",
      input_schema: {
        type: "object",
        properties: {
          cliente_id: { type: "string", description: "ID do cliente" },
          cliente_nome: { type: "string", description: "Nome do cliente para confirmação" },
          nova_etapa: { type: "string", description: "Nova etapa do pipeline: consulta, negociacao, sessao_agendada, sessao_realizada, hibernacao, blacklist" }
        },
        required: ["cliente_id", "cliente_nome", "nova_etapa"]
      }
    },
    {
      name: "registrar_pagamento",
      description: "Registra um pagamento de cliente no financeiro. Sempre perguntar ao usuário antes de executar.",
      input_schema: {
        type: "object",
        properties: {
          cliente_id: { type: "string", description: "ID do cliente" },
          cliente_nome: { type: "string", description: "Nome do cliente" },
          valor: { type: "number", description: "Valor do pagamento em reais" },
          forma: { type: "string", description: "Forma de pagamento: pix, dinheiro, cartao_credito, cartao_debito" }
        },
        required: ["cliente_id", "cliente_nome", "valor", "forma"]
      }
    },
    {
      name: "criar_agendamento",
      description: "Cria um novo agendamento na agenda. Sempre perguntar ao usuário antes de executar.",
      input_schema: {
        type: "object",
        properties: {
          cliente_id: { type: "string", description: "ID do cliente" },
          cliente_nome: { type: "string", description: "Nome do cliente" },
          data: { type: "string", description: "Data no formato YYYY-MM-DD" },
          hora: { type: "string", description: "Hora no formato HH:MM" },
          tipo: { type: "string", description: "Tipo: consulta ou sessao" },
          artista: { type: "string", description: "Nome do artista responsável" }
        },
        required: ["cliente_id", "cliente_nome", "data", "hora", "tipo"]
      }
    },
    {
      name: "cadastrar_cliente",
      description: "Cadastra um novo cliente no sistema. Usado quando o usuário envia foto de ficha ou informa dados de um cliente novo. Sempre confirmar os dados antes de executar.",
      input_schema: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome completo do cliente" },
          tel: { type: "string", description: "Telefone com DDD, apenas números" },
          email: { type: "string", description: "Email do cliente" },
          estilo: { type: "string", description: "Estilo de tatuagem preferido" },
          obs: { type: "string", description: "Observações adicionais" }
        },
        required: ["nome"]
      }
    },
    {
      name: "disparar_email",
      description: "Envia um email para um cliente específico. Sempre mostrar o conteúdo e pedir confirmação antes de enviar.",
      input_schema: {
        type: "object",
        properties: {
          cliente_email: { type: "string", description: "Email do destinatário" },
          cliente_nome: { type: "string", description: "Nome do cliente" },
          assunto: { type: "string", description: "Assunto do email" },
          mensagem: { type: "string", description: "Conteúdo do email" }
        },
        required: ["cliente_email", "cliente_nome", "assunto", "mensagem"]
      }
    },
    {
      name: "encaminhar_pdf",
      description: "Encaminha um PDF recebido no chat para um destinatário por e-mail. Sempre mostrar para quem vai enviar e pedir confirmação antes.",
      input_schema: {
        type: "object",
        properties: {
          destinatario_email: { type: "string", description: "E-mail do destinatário" },
          destinatario_nome: { type: "string", description: "Nome do destinatário para confirmação" },
          assunto: { type: "string", description: "Assunto do e-mail" },
          mensagem: { type: "string", description: "Texto que acompanha o PDF no e-mail" }
        },
        required: ["destinatario_email", "destinatario_nome", "assunto", "mensagem"]
      }
    },
    {
      name: "criar_projeto",
      description: "Cria um novo projeto dentro da ficha de um cliente. Usado quando o cliente tem uma nova solicitação de tatuagem ou serviço. Sempre confirmar os dados antes de executar.",
      input_schema: {
        type: "object",
        properties: {
          cliente_id: { type: "string", description: "ID do cliente" },
          cliente_nome: { type: "string", description: "Nome do cliente para confirmação" },
          estilo: { type: "string", description: "Estilo da tatuagem (ex: Blackwork, Realismo, Aquarela)" },
          descricao: { type: "string", description: "Descrição do projeto ou tatuagem desejada" },
          servico: { type: "string", description: "Tipo de serviço: tatuagem, piercing, implante, consulta" },
          tamanho: { type: "string", description: "Tamanho: Discreto, Medio, Grande, Fechamento" },
          valor_total: { type: "number", description: "Valor total do projeto em reais (0 se não definido)" }
        },
        required: ["cliente_id", "cliente_nome", "estilo"]
      }
    },
    {
      name: "editar_cliente",
      description: "Atualiza dados cadastrais de um cliente existente. Sempre confirmar o que vai alterar antes de executar.",
      input_schema: {
        type: "object",
        properties: {
          cliente_id: { type: "string", description: "ID do cliente" },
          cliente_nome: { type: "string", description: "Nome do cliente para confirmação" },
          tel: { type: "string", description: "Novo telefone (apenas se alterando)" },
          email: { type: "string", description: "Novo email (apenas se alterando)" },
          insta: { type: "string", description: "Novo Instagram (apenas se alterando)" },
          nascimento: { type: "string", description: "Data de nascimento no formato YYYY-MM-DD (apenas se alterando)" },
          obs: { type: "string", description: "Observações (apenas se alterando)" },
          artista: { type: "string", description: "ID do profissional responsável pelo cliente (apenas se alterando)" }
        },
        required: ["cliente_id", "cliente_nome"]
      }
    },
    {
      name: "acao_em_massa",
      description: "Executa uma alteração em múltiplos clientes de uma vez. A Aura filtra os clientes pelo critério informado, lista os encontrados e pede confirmação do usuário antes de executar qualquer coisa. Só executar após confirmação explícita.",
      input_schema: {
        type: "object",
        properties: {
          filtro: { type: "string", description: "Critério de filtragem em texto livre (ex: 'etapa=hibernacao', 'artista=Camilla', 'sem sessão há 60 dias')" },
          campo: { type: "string", description: "Campo a ser alterado em todos os clientes encontrados (ex: etapa, artista, obs)" },
          valor: { type: "string", description: "Novo valor a ser aplicado no campo informado" },
          ids: { type: "array", items: { type: "string" }, description: "Lista de IDs dos clientes que serão alterados. A Aura monta essa lista após filtrar." }
        },
        required: ["filtro", "campo", "valor", "ids"]
      }
    },
    {
      name: "cancelar_agendamento",
      description: "Remove um agendamento da agenda do estúdio. Sempre mostrar qual evento será cancelado e pedir confirmação antes de executar.",
      input_schema: {
        type: "object",
        properties: {
          evento_id: { type: "string", description: "ID do evento na agenda" },
          cliente_nome: { type: "string", description: "Nome do cliente para confirmação" },
          data: { type: "string", description: "Data do evento no formato YYYY-MM-DD" },
          hora: { type: "string", description: "Hora do evento para confirmação" }
        },
        required: ["evento_id", "cliente_nome", "data", "hora"]
      }
    },
    {
      name: "registrar_falta",
      description: "Registra a ausência de um cliente em um agendamento. Sempre confirmar os dados antes de executar.",
      input_schema: {
        type: "object",
        properties: {
          cliente_id: { type: "string", description: "ID do cliente" },
          cliente_nome: { type: "string", description: "Nome do cliente" },
          data: { type: "string", description: "Data da falta no formato YYYY-MM-DD" },
          motivo: { type: "string", description: "Motivo da ausência: sem_aviso, cancelou_cima_hora, remarcou, problema_pessoal, outro" }
        },
        required: ["cliente_id", "cliente_nome", "data", "motivo"]
      }
    },
    {
      name: "disparar_sms",
      description: "Envia um SMS para um cliente via Zenvia. Só funciona se as credenciais Zenvia estiverem configuradas em Configurações. Sempre mostrar o conteúdo da mensagem e pedir confirmação antes de enviar.",
      input_schema: {
        type: "object",
        properties: {
          cliente_tel: { type: "string", description: "Telefone do destinatário, apenas números com DDD (ex: 27999999999)" },
          cliente_nome: { type: "string", description: "Nome do cliente para confirmação" },
          mensagem: { type: "string", description: "Texto do SMS. Máximo recomendado: 160 caracteres." }
        },
        required: ["cliente_tel", "cliente_nome", "mensagem"]
      }
    },
    {
      name: "salvar_memoria",
      description: "Salva uma informação nova e permanente sobre o estúdio nas instruções da IA. Usar quando o usuário revelar algo importante sobre como o estúdio funciona, suas regras, preferências ou política — e que deve ser lembrado em todas as conversas futuras. SEMPRE pedir confirmação antes de salvar.",
      input_schema: {
        type: "object",
        properties: {
          instrucao: { type: "string", description: "A instrução exata a ser adicionada às memórias permanentes. Deve ser uma frase clara e objetiva." }
        },
        required: ["instrucao"]
      }
    },
    {
      name: "migrar_origens",
      description: "Escaneia todos os clientes e mapeia valores antigos de origem (campo 'orig') para as origens cadastradas no sistema (por nome ou slug). Gera um relatório do que será alterado e SEMPRE pede confirmação explícita do usuário antes de aplicar qualquer mudança.",
      input_schema: {
        type: "object",
        properties: {
          confirmar: { type: "boolean", description: "true = aplicar a migração, false = apenas gerar o relatório sem alterar nada" }
        },
        required: ["confirmar"]
      }
    }
  ];

  const executarToolAura = async (tool: string, params: any) => {
    const hoje = new Date();
    const dataStr = hoje.toLocaleDateString("pt-BR");
    const horaStr = hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    try {
      if (tool === "mover_pipeline") {
        const clienteAtualizado = clients.find(c => String(c.id) === String(params.cliente_id));
        if (clienteAtualizado) {
          const updated = { ...clienteAtualizado, etapa: params.nova_etapa };
          setClients(p => p.map(c => String(c.id) === String(params.cliente_id) ? updated : c));
          await dbUpsert("clientes", { id: params.cliente_id, etapa: params.nova_etapa, user_id: userId });
          try { await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: (auraName || "IA") + " moveu " + params.cliente_nome + " para " + params.nova_etapa, user_id: userId }); } catch {}
          return "✅ " + params.cliente_nome + " movido para **" + params.nova_etapa + "** com sucesso.";
        }
        return "❌ Cliente não encontrado.";
      }
      if (tool === "registrar_pagamento") {
        const { data: fdPag } = await sb.from("financeiro").insert({
          data: new Date().toISOString().split("T")[0],
          cliente_id: params.cliente_id,
          cliente_nome: params.cliente_nome,
          val_a: params.valor,
          val_c: params.valor,
          pgto: params.forma,
          categoria: "sessao",
          tipo: "entrada",
          user_id: userId
        }).select().single();
        if (fdPag) setFin((p: any[]) => [...p, { ...fdPag, cliente: params.cliente_nome }]);
        try { await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: (auraName || "IA") + " registrou pagamento de R$ " + params.valor + " de " + params.cliente_nome, user_id: userId }); } catch {}
        return "✅ Pagamento de R$ " + params.valor + " de " + params.cliente_nome + " registrado com sucesso.";
      }
      if (tool === "criar_agendamento") {
        const artistaId = artists.find((a: any) => (params.artista || "").toLowerCase().includes(a.nome.toLowerCase().split(" ")[0]))?.id || artists[0]?.id || "";
        const tipo = params.tipo === "consulta" ? "cons_" + artistaId : "sess_" + artistaId;
        const { data: novoEv } = await sb.from("agenda").insert({
          titulo: (params.tipo === "consulta" ? "Consulta" : "Sessão") + " — " + params.cliente_nome,
          cliente_id: params.cliente_id,
          cliente_nome: params.cliente_nome,
          artista: artistaId,
          data: params.data,
          hora: params.hora,
          hora_fim: (parseInt((params.hora || "09").split(":")[0]) + 2) + ":00",
          tipo,
          user_id: userId
        }).select().single();
        if (novoEv) {
          setAgEvents(p => [...p, { ...novoEv, title: novoEv.titulo, date: novoEv.data, start: parseInt(novoEv.hora?.split(":")[0] || "9"), end: parseInt(novoEv.hora?.split(":")[0] || "9") + 2 }]);
        }
        try { await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: (auraName || "IA") + " criou agendamento para " + params.cliente_nome + " em " + params.data, user_id: userId }); } catch {}
        return "✅ Agendamento criado para " + params.cliente_nome + " em " + params.data + " às " + params.hora + ".";
      }
      if (tool === "cadastrar_cliente") {
        const { data: novoC } = await sb.from("clientes").insert({
          nome: params.nome,
          tel: params.tel || "",
          email: params.email || "",
          estilo: params.estilo || "",
          obs: params.obs || "",
          etapa: "lead",
          qual: "Q2",
          orig: auraName || "IA",
          hist: [],
          followups: [],
          dias: 0,
          user_id: userId,
          updated_at: new Date().toISOString()
        }).select().single();
        if (novoC) setClients(p => [novoC, ...p]);
        try { await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: (auraName || "IA") + " cadastrou cliente " + params.nome, user_id: userId }); } catch {}
        return "✅ Cliente **" + params.nome + "** cadastrado com sucesso no pipeline!";
      }
      if (tool === "disparar_email") {
        await fetch("/api/resend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: resendApiKey,
            from: (nomeRemetente || studioName) + " <" + emailRemetente + ">",
            to: [params.cliente_email],
            subject: params.assunto,
            html: "<p>" + params.mensagem.replace(/\n/g, "<br/>") + "</p>"
          })
        });
        try { await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: (auraName || "IA") + " enviou email para " + params.cliente_nome, user_id: userId }); } catch {}
        return "✅ Email enviado para " + params.cliente_nome + " (" + params.cliente_email + ").";
      }
      if (tool === "criar_projeto") {
        try {
          const cliente = clients.find((c: any) => c.id === params.cliente_id);
          if (!cliente) return "❌ Cliente não encontrado.";
          const novoProjeto = {
            id: Date.now().toString(),
            estilo: params.estilo || "",
            desc: params.descricao || "",
            servico: params.servico || "tatuagem",
            tam: params.tamanho || "Medio",
            valorTotal: params.valor_total || 0,
            status: "ativo",
            primeira: false,
            sessoes: []
          };
          const projetosAtualizados = [...(cliente.projetos || []), novoProjeto];
          const updated = { ...cliente, projetos: projetosAtualizados };
          setClients((p: any[]) => p.map((c: any) => c.id === params.cliente_id ? updated : c));
          await dbUpsert("clientes", { id: params.cliente_id, projetos: projetosAtualizados, studio_id: userId });
          try { await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: (auraName || "IA") + " criou projeto '" + params.estilo + "' para " + params.cliente_nome, user_id: userId }); } catch {}
          return "✅ Projeto **" + params.estilo + "** criado para **" + params.cliente_nome + "** com sucesso!";
        } catch { return "❌ Erro ao criar projeto."; }
      }
      if (tool === "editar_cliente") {
        try {
          const cliente = clients.find((c: any) => c.id === params.cliente_id);
          if (!cliente) return "❌ Cliente não encontrado.";
          const campos: any = {};
          if (params.tel) campos.tel = params.tel;
          if (params.email) campos.email = params.email;
          if (params.insta) campos.insta = params.insta;
          if (params.nascimento) campos.nascimento = params.nascimento;
          if (params.obs) campos.obs = params.obs;
          if (params.artista) campos.artista = params.artista;
          if (Object.keys(campos).length === 0) return "❌ Nenhum campo para atualizar foi informado.";
          const updated = { ...cliente, ...campos };
          setClients((p: any[]) => p.map((c: any) => c.id === params.cliente_id ? updated : c));
          await dbUpsert("clientes", { id: params.cliente_id, ...campos, studio_id: userId });
          const camposStr = Object.keys(campos).join(", ");
          try { await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: (auraName || "IA") + " atualizou " + camposStr + " de " + params.cliente_nome, user_id: userId }); } catch {}
          return "✅ Dados de **" + params.cliente_nome + "** atualizados com sucesso! Campos alterados: " + camposStr + ".";
        } catch { return "❌ Erro ao editar cliente."; }
      }
      if (tool === "acao_em_massa") {
        try {
          const ids: string[] = params.ids || [];
          if (ids.length === 0) return "❌ Nenhum cliente informado para a ação em massa.";
          let atualizados = 0;
          for (const cid of ids) {
            const cliente = clients.find((c: any) => String(c.id) === String(cid));
            if (!cliente) continue;
            const campoAlvo: any = {};
            campoAlvo[params.campo] = params.valor;
            const updated = { ...cliente, ...campoAlvo };
            setClients((p: any[]) => p.map((c: any) => String(c.id) === String(cid) ? updated : c));
            await dbUpsert("clientes", { id: cid, ...campoAlvo, user_id: userId });
            atualizados++;
          }
          try {
            await sb.from("historico").insert({
              data: dataStr,
              hora: horaStr,
              acao: (auraName || "IA") + " — ação em massa: " + params.campo + "=" + params.valor + " em " + atualizados + " clientes (filtro: " + params.filtro + ")",
              user_id: userId
            });
          } catch {}
          return "✅ Ação concluída! **" + atualizados + " clientes** atualizados: **" + params.campo + "** → **" + params.valor + "**.";
        } catch {
          return "❌ Erro ao executar ação em massa.";
        }
      }
      if (tool === "cancelar_agendamento") {
        try {
          setAgEvents((p: any[]) => p.filter((e: any) => String(e.id) !== String(params.evento_id)));
          await dbDelete("agenda", params.evento_id);
          try {
            await sb.from("historico").insert({
              data: dataStr,
              hora: horaStr,
              acao: (auraName || "IA") + " cancelou agendamento de " + params.cliente_nome + " em " + params.data + " às " + params.hora,
              user_id: userId
            });
          } catch {}
          return "✅ Agendamento de **" + params.cliente_nome + "** em " + params.data + " às " + params.hora + " cancelado com sucesso.";
        } catch {
          return "❌ Erro ao cancelar agendamento.";
        }
      }
      if (tool === "registrar_falta") {
        try {
          const cliente = clients.find((c: any) => String(c.id) === String(params.cliente_id));
          if (!cliente) return "❌ Cliente não encontrado.";
          const novasFaltas = (cliente.faltas || 0) + 1;
          const updated = { ...cliente, faltas: novasFaltas };
          setClients((p: any[]) => p.map((c: any) => String(c.id) === String(params.cliente_id) ? updated : c));
          await dbUpsert("clientes", { id: params.cliente_id, faltas: novasFaltas, user_id: userId });
          try {
            await sb.from("historico").insert({
              data: dataStr,
              hora: horaStr,
              acao: (auraName || "IA") + " registrou falta de " + params.cliente_nome + " em " + params.data + " — motivo: " + params.motivo,
              user_id: userId
            });
          } catch {}
          return "✅ Falta registrada para **" + params.cliente_nome + "** em " + params.data + ". Motivo: " + params.motivo + ". Total de faltas: **" + novasFaltas + "**.";
        } catch {
          return "❌ Erro ao registrar falta.";
        }
      }
      if (tool === "disparar_sms") {
        try {
          if (!zenviaApiKey) {
            return "❌ Credenciais Zenvia não configuradas. Acesse **Configurações → IA → SMS** para configurar.";
          }
          const telFormatado = params.cliente_tel.replace(/\D/g, "").replace(/^0/, "");
          const telZenvia = telFormatado.startsWith("55") ? telFormatado : "55" + telFormatado;
          const smsResp = await fetch("/api/zenvia", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: zenviaApiKey,
              from: zenviaNumero,
              to: telZenvia,
              text: params.mensagem
            })
          });
          if (!smsResp.ok) {
            const errData = await smsResp.json().catch(() => ({}));
            return "❌ Zenvia retornou erro " + smsResp.status + ": " + (errData.message || errData.error || JSON.stringify(errData));
          }
          try {
            await sb.from("historico").insert({
              data: dataStr,
              hora: horaStr,
              acao: (auraName || "IA") + " enviou SMS para " + params.cliente_nome + " (" + telZenvia + ")",
              user_id: userId
            });
          } catch {}
          return "✅ SMS enviado para **" + params.cliente_nome + "** (" + telZenvia + ").";
        } catch (err: any) {
          return "❌ Erro ao enviar SMS: " + (err?.message || "erro desconhecido") + ". Verifique as credenciais Zenvia em Configurações.";
        }
      }
      if (tool === "encaminhar_pdf") {
        try {
          if (!resendApiKey) return "❌ Resend não configurado. Acesse Configurações → IA para configurar.";
          await fetch("/api/resend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiKey: resendApiKey,
              from: emailRemetente || "aura@acasadoscarvalhotattoo.com.br",
              to: params.destinatario_email,
              subject: params.assunto,
              html: "<p>" + params.mensagem.replace(/\n/g, "<br>") + "</p><p style='font-size:12px;color:#999'>Enviado via INK SYSTEM</p>"
            })
          });
          try {
            await sb.from("historico").insert({
              data: dataStr, hora: horaStr,
              acao: (auraName || "IA") + " encaminhou PDF para " + params.destinatario_nome + " (" + params.destinatario_email + ")",
              user_id: userId
            });
          } catch {}
          return "✅ PDF encaminhado para **" + params.destinatario_nome + "** (" + params.destinatario_email + ").";
        } catch { return "❌ Erro ao encaminhar PDF. Verifique as configurações de e-mail."; }
      }
      if (tool === "salvar_memoria") {
        try {
          const novaInstrucao = params.instrucao;
          const novasInstrucoes = (auraInstrucoes ? auraInstrucoes + "\n" : "") + novaInstrucao;
          setAuraInstrucoes(novasInstrucoes);
          await dbUpsert("configuracoes", { studio_id: userId, aura_instrucoes: novasInstrucoes });
          return "✅ Memória salva! Agora sei que: **" + novaInstrucao + "**\n\nEssa informação ficará comigo em todas as conversas futuras.";
        } catch {
          return "❌ Erro ao salvar memória. Tente novamente.";
        }
      }
      if (tool === "migrar_origens") {
        try {
          const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
          const mapa: { cliente: any; origAntiga: string; origemNova: { id: string; nome: string; slug: string } }[] = [];
          const semMatch: { cliente: any; orig: string }[] = [];
          for (const c of clients) {
            const orig = (c.orig || "").trim();
            if (!orig) continue;
            const o = origens.find(or =>
              normalize(or.nome) === normalize(orig) ||
              or.slug === orig ||
              normalize(orig).includes(normalize(or.nome)) ||
              normalize(or.nome).includes(normalize(orig))
            );
            if (o && normalize(o.nome) !== normalize(orig)) {
              mapa.push({ cliente: c, origAntiga: orig, origemNova: o });
            } else if (!o) {
              semMatch.push({ cliente: c, orig });
            }
          }
          if (!params.confirmar) {
            let rel = "**Relatório de migração de origens**\n\n";
            if (mapa.length === 0) {
              rel += "Nenhum cliente precisa de migração — todos os valores de origem já estão normalizados.\n";
            } else {
              rel += `${mapa.length} cliente(s) serão atualizados:\n`;
              mapa.forEach(m => { rel += `- **${m.cliente.nome}**: "${m.origAntiga}" → "${m.origemNova.nome}"\n`; });
            }
            if (semMatch.length > 0) {
              rel += `\n${semMatch.length} cliente(s) com origem não reconhecida (não serão alterados):\n`;
              semMatch.forEach(m => { rel += `- **${m.cliente.nome}**: "${m.orig}"\n`; });
            }
            rel += "\nDeseja confirmar a migração?";
            return rel;
          }
          if (mapa.length === 0) return "Nenhuma migração necessária.";
          let ok = 0;
          for (const m of mapa) {
            const { error } = await sb.from("clientes").update({ orig: m.origemNova.nome }).eq("id", m.cliente.id);
            if (!error) {
              setClients(p => p.map(c => String(c.id) === String(m.cliente.id) ? { ...c, orig: m.origemNova.nome } : c));
              ok++;
            }
          }
          try { await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: (auraName || "IA") + " migrou origens de " + ok + " cliente(s)", user_id: userId }); } catch {}
          return `✅ Migração concluída! ${ok} de ${mapa.length} cliente(s) atualizados.`;
        } catch {
          return "❌ Erro ao executar migração de origens.";
        }
      }
      return "❌ Ferramenta não reconhecida.";
    } catch {
      return "❌ Erro ao executar ação.";
    }
  };

  const handleAuraDragStart = (clientX: number, clientY: number) => {
    const btn = document.getElementById("aura-fab-btn");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    auraDragRef.current = { startX: clientX, startY: clientY, origX: rect.left, origY: rect.top, moved: false };
    setAuraDragging(true);
  };

  const handleAuraDragMove = (clientX: number, clientY: number) => {
    if (!auraDragRef.current) return;
    const dx = clientX - auraDragRef.current.startX;
    const dy = clientY - auraDragRef.current.startY;
    if (!auraDragRef.current.moved && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
    auraDragRef.current.moved = true;
    const btn = document.getElementById("aura-fab-btn");
    const w = btn ? btn.offsetWidth : 120;
    const h = btn ? btn.offsetHeight : 48;
    const newX = Math.min(Math.max(0, auraDragRef.current.origX + dx), window.innerWidth - w);
    const newY = Math.min(Math.max(0, auraDragRef.current.origY + dy), window.innerHeight - h);
    setAuraBtnPos({ x: newX, y: newY });
  };

  const handleAuraDragEnd = () => {
    auraDragRef.current = null;
    setAuraDragging(false);
  };

  useEffect(() => {
    if (!auraDragging) return;
    const onMouseMove = (e: MouseEvent) => handleAuraDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleAuraDragEnd();
    const onTouchMove = (e: TouchEvent) => { if (e.touches[0]) handleAuraDragMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchEnd = () => handleAuraDragEnd();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [auraDragging]);

  const enviarMensagemAura = async (msgOverride?: string, imagemBase64?: string, imagemMediaType?: string) => {
    const userMsg = msgOverride !== undefined ? msgOverride : auraChatInput.trim();
    if (!userMsg && !imagemBase64) return;
    if (!auraApiKey) {
      setAuraChatMessages(p => [...p, { role: "assistant", content: "Configure a chave API em Configurações → IA para ativar o chat." }]);
      return;
    }
    setAuraChatInput("");
    setAuraChatImagem(null);
    setAuraChatPdf(null);

    // ── INTERCEPTAR CONFIRMAÇÃO ANTES DA API ──
    if (_auraToolPendenteCache && !imagemBase64) {
      const confirmacoes = ["sim", "pode", "confirmo", "ok", "vai", "faz", "execute", "confirmar", "positivo"];
      const isConfirmacao = confirmacoes.some(c => userMsg.toLowerCase().includes(c));
      if (isConfirmacao) {
        setAuraChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setAuraChatMessages(prev => [...prev, { role: "assistant", content: "⏳ Executando..." }]);
        setAuraChatLoading(true);
        const cache = _auraToolPendenteCache;
        _auraToolPendenteCache = null;
        setAuraToolPendente(null);
        const resultado = await executarToolAura(cache.tool, cache.params);
        setAuraChatMessages(prev => {
          const sem = prev.filter(m => m.content !== "⏳ Executando...");
          return [...sem, { role: "assistant", content: resultado }];
        });
        setAuraChatLoading(false);
        return;
      }
    }

    const hoje = new Date().toISOString().split("T")[0];
    let userContent: any;
    if (imagemBase64) {
      userContent = [
        { type: "image", source: { type: "base64", media_type: imagemMediaType || "image/jpeg", data: imagemBase64 } },
        { type: "text", text: userMsg || "Analise esta imagem e extraia os dados do cliente para cadastro." }
      ];
    } else {
      userContent = userMsg;
    }
    // Incluir PDF se houver
    if (auraChatPdf) {
      if (!Array.isArray(userContent)) {
        userContent = [{ type: "text", text: userContent || "Analise este PDF." }];
      }
      userContent.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: auraChatPdf.base64 }
      });
      setAuraChatPdf(null);
    }
    const clientesContexto = clients.slice(0, 80).map((c: any) => "ID:" + c.id + " | " + c.nome + " | etapa:" + c.etapa + " | tel:" + (c.tel || "-") + " | email:" + (c.email || "-")).join("\n");
    const displayMsg = imagemBase64 ? "📷 " + (userMsg || "Imagem enviada") : userMsg;
    const newHistory = [...auraChatMessages, { role: "user", content: userContent }];
    setAuraChatMessages(p => [...p, { role: "user", content: displayMsg }]);
    setAuraChatLoading(true);
    const nomeIA = auraName || "Assistente";
    const tipoNegocio = studioName || "estúdio";

    const blocoInstrucoes = auraInstrucoes ? "\nINSTRUÇÕES ESPECÍFICAS DO ESTÚDIO:\n" + auraInstrucoes : "";

    const hoje2 = new Date().toLocaleDateString("pt-BR");

    const contexto = "Você é " + nomeIA + ", assistente inteligente do INK SYSTEM CRM.\n" +
      "Estúdio: " + tipoNegocio + ".\n\n" +
      "DADOS DO ESTÚDIO:\n" +
      "- Data de hoje: " + hoje2 + "\n" +
      "- Total de clientes: " + clients.length + "\n" +
      "- Clientes ativos: " + clients.filter((c: any) => c.etapa !== "hibernacao" && c.etapa !== "blacklist").length + "\n" +
      "- Em negociação: " + clients.filter((c: any) => c.etapa === "negociacao").length + "\n" +
      "- Sessões agendadas: " + clients.filter((c: any) => c.etapa === "sessao_agend").length + "\n" +
      "- Agendamentos hoje: " + agEvents.filter((e: any) => e.date === hoje).length + "\n" +
      "- Profissionais: " + artists.map((a: any) => a.nome).join(", ") + "\n\n" +
      "CLIENTES (até 80 mais recentes):\n" + clientesContexto + "\n\n" +
      blocoInstrucoes + "\n\n" +
      "REGRAS IMPORTANTES:\n" +
      "1. Antes de executar qualquer ação, SEMPRE peça confirmação descrevendo exatamente o que vai fazer.\n" +
      "2. Quando o usuário confirmar com sim/pode/confirmo/ok ou similar, use a ferramenta correspondente.\n" +
      "3. Se receber imagem, analise e extraia dados de clientes. Apresente os dados e pergunte se deve cadastrar.\n" +
      "4. Responda sempre em português, de forma direta e calorosa.\n" +
      "5. Use **negrito** para destacar nomes e valores importantes.\n" +
      "6. Você conhece o histórico desta conversa — use-o para dar continuidade.\n" +
      "7. Quando não souber algo sobre um cliente específico, diga que precisa verificar e peça o nome.\n" +
      "8. Quando o usuário revelar algo importante sobre como o estúdio funciona (regras, preferências, política, horários), sugira salvar isso nas suas memórias permanentes usando a ferramenta salvar_memoria.\n" +
      "9. Nunca invente informações sobre o estúdio — se não souber, pergunte.\n" +
      "10. Se as instruções do estúdio já existirem, use-as como base principal do seu comportamento.";
    try {
      const apiMessages = newHistory.map((m: any) => {
        if (typeof m.content === "string" && m.content.startsWith("📷")) return null;
        return m;
      }).filter(Boolean);
      const resp = await fetch("/api/aura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: auraApiKey, system: contexto, messages: apiMessages, tools: AURA_TOOLS })
      });
      const json = await resp.json();
      if (json.stop_reason === "tool_use") {
        const toolUseBlock = json.content?.find((b: any) => b.type === "tool_use");
        const textBlock = json.content?.find((b: any) => b.type === "text");
        if (toolUseBlock) {
          const p2 = toolUseBlock.input;
          let descricao = "";
          if (toolUseBlock.name === "mover_pipeline") descricao = "Mover **" + p2.cliente_nome + "** para a etapa **" + p2.nova_etapa + "**";
          else if (toolUseBlock.name === "registrar_pagamento") descricao = "Registrar pagamento de **R$ " + p2.valor + "** (" + p2.forma + ") de **" + p2.cliente_nome + "**";
          else if (toolUseBlock.name === "criar_agendamento") descricao = "Criar agendamento de " + p2.tipo + " para **" + p2.cliente_nome + "** em " + p2.data + " às " + p2.hora;
          else if (toolUseBlock.name === "cadastrar_cliente") descricao = "Cadastrar cliente **" + p2.nome + "**" + (p2.tel ? " | Tel: " + p2.tel : "") + (p2.email ? " | Email: " + p2.email : "") + (p2.estilo ? " | Estilo: " + p2.estilo : "");
          else if (toolUseBlock.name === "disparar_email") descricao = "Enviar email para **" + p2.cliente_nome + "**\nAssunto: " + p2.assunto + "\n\n" + p2.mensagem;
          else if (toolUseBlock.name === "criar_projeto") {
            const p3 = toolUseBlock.input;
            descricao = "Criar projeto **" + p3.estilo + "**" + (p3.descricao ? " — " + p3.descricao : "") + " para **" + p3.cliente_nome + "**" + (p3.valor_total ? " · R$ " + p3.valor_total : "");
          }
          else if (toolUseBlock.name === "editar_cliente") {
            const p4 = toolUseBlock.input;
            const campos4 = Object.entries(p4).filter(([k]) => !["cliente_id","cliente_nome"].includes(k)).map(([k,v]) => k + ": " + v).join(", ");
            descricao = "Atualizar dados de **" + p4.cliente_nome + "**: " + campos4;
          }
          else if (toolUseBlock.name === "acao_em_massa") {
            const p2 = toolUseBlock.input;
            descricao = "Alterar **" + p2.campo + "** para **" + p2.valor + "** em **" + (p2.ids?.length || 0) + " clientes** (filtro: " + p2.filtro + ")";
          }
          else if (toolUseBlock.name === "cancelar_agendamento") {
            const p2 = toolUseBlock.input;
            descricao = "Cancelar agendamento de **" + p2.cliente_nome + "** em " + p2.data + " às " + p2.hora;
          }
          else if (toolUseBlock.name === "registrar_falta") {
            const p2 = toolUseBlock.input;
            descricao = "Registrar falta de **" + p2.cliente_nome + "** em " + p2.data + " · motivo: " + p2.motivo;
          }
          else if (toolUseBlock.name === "disparar_sms") {
            const p2 = toolUseBlock.input;
            descricao = "Enviar SMS para **" + p2.cliente_nome + "** (" + p2.cliente_tel + "):\n" + p2.mensagem;
          }
          else if (toolUseBlock.name === "encaminhar_pdf") {
            descricao = "Encaminhar PDF para **" + p2.destinatario_nome + "** (" + p2.destinatario_email + ")\nAssunto: " + p2.assunto;
          }
          else if (toolUseBlock.name === "salvar_memoria") {
            descricao = "Salvar permanentemente nas minhas memórias: **" + toolUseBlock.input.instrucao + "**";
          }
          const msgAura = (textBlock?.text ? textBlock.text + "\n\n" : "") + "⚡ **Ação identificada:** " + descricao + "\n\n✅ Posso executar isso agora. Confirma?";
          setAuraChatMessages(prev => [...prev, { role: "assistant", content: msgAura }]);
          const pendente = { tool: toolUseBlock.name, params: toolUseBlock.input, descricao };
          _auraToolPendenteCache = pendente;
          setAuraToolPendente(pendente);
          notificarAura("✨ " + (auraName || "Agente") + " — Ação Pendente", descricao.replace(/[*][*](.+?)[*][*]/g, "$1"));
        }
      } else {
        const reply = json.content?.find((b: any) => b.type === "text")?.text || "Não consegui processar sua mensagem.";
        if (auraToolPendente) {
          const confirmacoes = ["sim", "pode", "confirmo", "ok", "vai", "faz", "execute", "confirmar", "positivo"];
          const isConfirmacao = confirmacoes.some(c => userMsg.toLowerCase().includes(c));
          if (isConfirmacao) {
            setAuraChatMessages(prev => [...prev, { role: "assistant", content: "⏳ Executando..." }]);
            const resultado = await executarToolAura(auraToolPendente.tool, auraToolPendente.params);
            setAuraToolPendente(null);
            setAuraChatMessages(prev => {
              const sem = prev.filter(m => m.content !== "⏳ Executando...");
              return [...sem, { role: "assistant", content: resultado }];
            });
          } else {
            setAuraToolPendente(null);
            setAuraChatMessages(prev => [...prev, { role: "assistant", content: reply }]);
          }
        } else {
          setAuraChatMessages(prev => [...prev, { role: "assistant", content: reply }]);
        }
      }
    } catch {
      setAuraChatMessages(prev => [...prev, { role: "assistant", content: "Erro ao conectar com a API. Verifique sua chave em Configurações → IA." }]);
    }
    setAuraChatLoading(false);
  };

  const excluirEvento = (e: any, fecharModal = false) => {
    setAgEvents(p => p.filter(x => x.id !== e.id));
    if (fecharModal) { setShowAgForm(false); setEditingEvent(null); }
    setConfirmExcluir(null);
    // Deleta imediatamente no banco
    dbDelete("agenda", e.id);
    addLog(`Agenda: evento "${e.title}" excluído`);
    // Guarda para desfazer por 8s
    setUndoEvento(e);
    if (undoTimer) clearTimeout(undoTimer);
    const t = setTimeout(() => { setUndoEvento(null); setUndoTimer(null); }, 8000);
    setUndoTimer(t);
  };

  const desfazerExclusao = async () => {
    if (undoTimer) clearTimeout(undoTimer);
    if (undoEvento) {
      // Reinsere no banco
      const row = {
        titulo: undoEvento.title,
        artista: undoEvento.artista || undoEvento.tipo?.replace("cons_","").replace("sess_","").replace("bloq_","") || artists[0]?.id || "",
        data: undoEvento.date,
        hora: String(undoEvento.start || 9).padStart(2,"0") + ":00",
        tipo: undoEvento.tipo,
        obs: undoEvento.desc || "",
        cliente_id: undoEvento.cliente_id || null,
        cliente_nome: undoEvento.cliente_nome || null
      };
      try {
        const { data } = await sb.from("agenda").insert(row).select().single();
        setAgEvents(p => [...p, { ...undoEvento, id: data?.id || undoEvento.id }]);
        addLog(`Agenda: evento "${undoEvento.title}" restaurado`);
      } catch(err) {
        setAgEvents(p => [...p, undoEvento]);
      }
    }
    setUndoEvento(null);
    setUndoTimer(null);
  };

  const pk = dateSel || segSel;
  const pmsg = pk ? MSGS[pk] : null;
  const artistSegs = useMemo(() =>
    artists.map((a: any) => ({ id: a.id, label: "Clientes de " + a.nome, desc: "Direcionados a " + a.nome.split(" ")[0], icon: "🎨", f: (c: any) => c.artista === a.id })),
    [artists]
  );
  const segsAll = useMemo(() => [...SEGS, ...artistSegs], [artistSegs]);
  const dest = useMemo(() => {
    if (!segSel && !dateSel) return [];
    if (dateSel) return clients;
    const sg = segsAll.find((x: any) => x.id === segSel);
    return sg ? clients.filter(sg.f) : [];
  }, [segSel, dateSel, clients, segsAll]);

  const sc = sel ? clients.find((c: any) => c.id === sel.id) : null;
  const stats = {
    total: clients.length,
    ativos: clients.filter(c => !["hibernacao", "blacklist"].includes(c.etapa)).length,
    tatuados: clients.filter(c => c.etapa === "tatuado" || c.etapa === "pos_venda").length,
    hoje: clients.filter(c => c.data === new Date().toLocaleDateString("pt-BR")).length
  };
  const pvC = clients.filter(c => c.etapa === "tatuado" || c.etapa === "pos_venda");
  const totalFat = fin.reduce((s, f) => s + f.val_a, 0);
  const origC = useMemo(() => {
    const m: Record<string, number> = {};
    clients.forEach(c => { const k = c.orig || "Não informado"; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [clients]);
  const estilos = useMemo(() => {
    const m: Record<string, number> = {};
    clients.forEach(c => {
      const projs = (c.projetos || []).filter((p: any) => p && p.status !== "cancelado" && p.estilo);
      if (projs.length > 0) {
        projs.forEach((p: any) => { m[p.estilo] = (m[p.estilo] || 0) + 1; });
      } else if (c.estilo) {
        m[c.estilo] = (m[c.estilo] || 0) + 1;
      }
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [clients]);
  const maxO = origC[0]?.[1] || 1;
  const maxE = estilos[0]?.[1] || 1;
  const wDates = useMemo(() => getWeekDates(agDate), [agDate]);
  const mDates = useMemo(() => getMonthDates(agDate), [agDate]);
  const todayStr = fmtDate(new Date());
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
  const aName = (id: string) => artists.find(a => a.id === id)?.nome || id || "";
  const aColor = (id: string) => artists.find(a => a.id === id)?.cor || "#C9A84C";
  const aClass = (id: string) => "";
  const aStyle = (id: string) => {
    const a = artists.find(x => x.id === id);
    const hex = a?.cor || "#C9A84C";
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return { background: "rgba("+r+","+g+","+b+",.15)", color: hex, border: "1px solid rgba("+r+","+g+","+b+",.3)", borderRadius: 9, padding: "2px 6px", fontSize: 10, fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" as const };
  };

  const EBS: Record<string, any> = {
    lead: { bg: "rgba(91,141,239,.15)", color: "#5B8DEF", b: "rgba(91,141,239,.3)" },
    qualificacao: { bg: "rgba(201,168,76,.15)", color: "#C9A84C", b: "rgba(201,168,76,.3)" },
    cons_agendada: { bg: "rgba(155,107,181,.15)", color: "#9B6BB5", b: "rgba(155,107,181,.3)" },
    sessao_agend: { bg: "rgba(74,158,191,.15)", color: "#4A9EBF", b: "rgba(74,158,191,.3)" },
    tatuado: { bg: "rgba(39,174,96,.15)", color: "#27AE60", b: "rgba(39,174,96,.3)" },
    aguard_agend: { bg: "rgba(243,156,18,.15)", color: "#F39C12", b: "rgba(243,156,18,.3)" },
    pos_venda: { bg: "rgba(230,126,34,.15)", color: "#E67E22", b: "rgba(230,126,34,.3)" },
    lista_espera: { bg: "rgba(52,152,219,.15)", color: "#3498DB", b: "rgba(52,152,219,.3)" },
    hibernacao: { bg: "rgba(102,102,102,.15)", color: "#888", b: "rgba(102,102,102,.3)" },
    blacklist: { bg: "rgba(192,57,43,.15)", color: "#C0392B", b: "rgba(192,57,43,.3)" }
  };

  // ── LOGIN ──
  if (!logado) {
    const handleAuth = async () => {
      setAuthError("");
      setAuthLoading(true);
      try {
        const { error } = await sb.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) setAuthError("E-mail ou senha incorretos.");
      } catch (e: any) {
        setAuthError(e.message || "Erro inesperado.");
      }
      setAuthLoading(false);
    };
    const handleForgot = async () => {
      if (!forgotEmail.trim()) return;
      setAuthLoading(true);
      await sb.auth.resetPasswordForEmail(forgotEmail.trim());
      setForgotSent(true);
      setAuthLoading(false);
    };
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0A0A0A 0%, #111008 50%, #0A0A0A 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'DM Sans',sans-serif" }}>
        <style>{S}</style>
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
          {/* Logo/Avatar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {studioLogo
              ? <img src={studioLogo} alt="logo" style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(201,168,76,0.4)", boxShadow: "0 0 32px rgba(201,168,76,0.15)" }} />
              : <div style={{ width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg, #C9A84C, #a07830)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#1a1a1a", boxShadow: "0 0 32px rgba(201,168,76,0.2)", fontFamily: "'Cormorant Garamond',serif" }}>
                  {studioName ? studioName[0].toUpperCase() : "S"}
                </div>
            }
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: "#C9A84C", letterSpacing: ".04em" }}>{studioName || "INK SYSTEM"}</div>
              <div style={{ fontSize: 10, color: "#4a4235", letterSpacing: ".18em", textTransform: "uppercase", marginTop: 3 }}>Sistema de Gestão</div>
            </div>
          </div>

          {/* Card de login */}
          <div style={{ width: "100%", background: "rgba(22,22,22,0.95)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 16, padding: "32px 28px", backdropFilter: "blur(10px)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            {!showForgotPwd ? (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#8A7A60", textAlign: "center", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 24 }}>Acesso Restrito</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "#6A6050" }}>E-mail</label>
                    <input className="fi" type="email" placeholder="seu@email.com" value={authEmail}
                      onChange={e => { setAuthEmail(e.target.value); setAuthError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") handleAuth(); }}
                      autoFocus style={{ fontSize: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 8, padding: "12px 14px", color: "#E8E2D9" }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "#6A6050" }}>Senha</label>
                    <input className="fi" type="password" placeholder="••••••••" value={authPassword}
                      onChange={e => { setAuthPassword(e.target.value); setAuthError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") handleAuth(); }}
                      style={{ fontSize: 16, letterSpacing: ".1em", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 8, padding: "12px 14px", color: "#E8E2D9" }} />
                  </div>
                  {authError && (
                    <div style={{ fontSize: 11, color: "#C0392B", background: "rgba(192,57,43,0.08)", padding: "8px 12px", borderRadius: 6, lineHeight: 1.5 }}>
                      {authError}
                    </div>
                  )}
                  <button onClick={handleAuth} disabled={authLoading}
                    style={{ background: authLoading ? "rgba(201,168,76,0.3)" : "linear-gradient(135deg, #C9A84C, #a07830)", color: authLoading ? "#888" : "#0A0A0A", border: "none", borderRadius: 8, padding: "13px 0", fontSize: 13, fontWeight: 700, cursor: authLoading ? "not-allowed" : "pointer", letterSpacing: ".06em", textTransform: "uppercase", marginTop: 4, transition: "all .2s", fontFamily: "inherit" }}>
                    {authLoading ? "Aguarde..." : "Entrar →"}
                  </button>
                  <div style={{ textAlign: "center", marginTop: 4 }}>
                    <button onClick={() => { setShowForgotPwd(true); setForgotEmail(authEmail); setForgotSent(false); setAuthError(""); }}
                      style={{ background: "none", border: "none", fontSize: 11, color: "#4a4235", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                      Esqueci minha senha
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#8A7A60", textAlign: "center", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 24 }}>Recuperar Senha</div>
                {!forgotSent ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ fontSize: 12, color: "#6A6050", lineHeight: 1.6 }}>Informe seu e-mail para receber o link de redefinição de senha.</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "#6A6050" }}>E-mail</label>
                      <input className="fi" type="email" placeholder="seu@email.com" value={forgotEmail} autoFocus
                        onChange={e => setForgotEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleForgot(); }}
                        style={{ fontSize: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 8, padding: "12px 14px", color: "#E8E2D9" }} />
                    </div>
                    <button onClick={handleForgot} disabled={authLoading}
                      style={{ background: "linear-gradient(135deg, #C9A84C, #a07830)", color: "#0A0A0A", border: "none", borderRadius: 8, padding: "13px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: ".06em", textTransform: "uppercase", fontFamily: "inherit" }}>
                      {authLoading ? "Aguarde..." : "Enviar link →"}
                    </button>
                    <div style={{ textAlign: "center" }}>
                      <button onClick={() => setShowForgotPwd(false)} style={{ background: "none", border: "none", fontSize: 11, color: "#4a4235", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                        Voltar ao login
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
                    <div style={{ fontSize: 32 }}>✉️</div>
                    <div style={{ fontSize: 13, color: "#6A9955", textAlign: "center", lineHeight: 1.6, background: "rgba(39,174,96,0.08)", padding: "12px 16px", borderRadius: 8 }}>
                      Se este e-mail estiver cadastrado, você receberá um link em instantes.
                    </div>
                    <button onClick={() => { setShowForgotPwd(false); setForgotSent(false); }} style={{ background: "none", border: "none", fontSize: 11, color: "#4a4235", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
                      Voltar ao login
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div style={{ fontSize: 10, color: "#1e1e1e", letterSpacing: ".1em", textTransform: "uppercase" }}>© {new Date().getFullYear()} INK SYSTEM</div>
        </div>
      </div>
    );
  }

  // ── LICENÇA INVÁLIDA ──
  if (!licencaOk) {
    return (
      <div style={{ minHeight: "100vh", background: "#0A0A0A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans',sans-serif" }}>
        <style>{S}</style>
        <div style={{ maxWidth: 400, textAlign: "center", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: "#C9A84C" }}>Acesso Bloqueado</div>
          <div style={{ fontSize: 13, color: "#8A8070", lineHeight: 1.7, background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 10, padding: "16px 20px" }}>{licencaMsg}</div>
          <div style={{ fontSize: 11, color: "#4a4235" }}>Entre em contato com o suporte para renovar sua licença.</div>
          <button onClick={() => sb.auth.signOut()} style={{ background: "none", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, padding: "10px 20px", color: "#8A7A60", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Sair da conta</button>
        </div>
      </div>
    );
  }

  // ── SPLASH (já cadastrado, aguarda clique para entrar) ──
  if (onboardingDone && showSplash) {
    return (
      <div style={{ minHeight: "100vh", background: "#0E0E0E", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, fontFamily: "'DM Sans',sans-serif" }}>
        <style>{S}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          {studioLogo
            ? <img src={studioLogo} alt="logo" style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "3px solid #C9A84C", boxShadow: "0 0 40px rgba(201,168,76,.25)" }} />
            : <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#C9A84C", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: 44, fontWeight: 700, color: "#000", boxShadow: "0 0 40px rgba(201,168,76,.25)" }}>
                {studioName ? studioName[0].toUpperCase() : "S"}
              </div>
          }
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: "#C9A84C", letterSpacing: ".08em" }}>{studioName}</div>
            <div style={{ fontSize: 10, color: "#555045", letterSpacing: ".18em", textTransform: "uppercase", marginTop: 5 }}>INK SYSTEM</div>
          </div>
        </div>
        <button onClick={() => setShowSplash(false)}
          style={{ background: "#C9A84C", color: "#000", border: "none", borderRadius: 8, padding: "13px 40px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", letterSpacing: ".04em", boxShadow: "0 4px 20px rgba(201,168,76,.3)" }}>
          Entrar →
        </button>
        <div style={{ fontSize: 10, color: "#303030", letterSpacing: ".1em", textTransform: "uppercase" }}>© {new Date().getFullYear()} {studioName}</div>
      </div>
    );
  }

  // ── ONBOARDING ──
  if (!onboardingDone) {
    const onbSteps = ["Estúdio", "Horários", "Profissionais", "IA", "Concluído"];
    return (
      <div style={{ minHeight: "100vh", background: "#0E0E0E", display: "flex", alignItems: "center", justifyContent: "center", padding: 18, fontFamily: "'DM Sans',sans-serif" }}>
        <style>{S}</style>
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
          {onbStep === 0 && (
            <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 14, color: "#E8E2D9", fontWeight: 600, marginBottom: 4 }}>Bem-vindo! Vamos configurar seu estúdio.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Nome do Estúdio *</label>
                  <input className="fi" value={studioName} onChange={e => setStudioName(e.target.value)} placeholder="Nome do seu estúdio" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Nome do Responsável *</label>
                  <input className="fi" value={studioOwner} onChange={e => setStudioOwner(e.target.value)} placeholder="Seu nome" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>WhatsApp da {auraName} *</label>
                  <input className="fi" value={studioTel} onChange={e => setStudioTel(maskTel(e.target.value))} placeholder="(99) 99999-9999" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Email do Estudio</label>
                  <input className="fi" value={studioEmail} onChange={e => setStudioEmail(e.target.value)} placeholder="contato@estudio.com" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Cidade e Estado</label>
                  <input className="fi" value={studioCity} onChange={e => setStudioCity(e.target.value)} placeholder="Cidade - UF" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Instagram do Estudio</label>
                  <input className="fi" value={studioInsta} placeholder="@estudio"
                    onFocus={() => { if (!studioInsta) setStudioInsta("@"); }}
                    onChange={e => { const v = e.target.value; setStudioInsta(v && !v.startsWith("@") ? "@" + v : v); }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Nome da IA de Atendimento</label>
                  <input className="fi" value={auraName} onChange={e => setAuraName(e.target.value)} placeholder="Escolha o nome da sua agente" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Link Google Meu Negócio</label>
                  <input className="fi" value={googleLink} onChange={e => setGoogleLink(e.target.value)} placeholder="https://g.page/..." />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>CNPJ</label>
                  <input className="fi" value={cnpj} onChange={e => setCnpj(maskCNPJ(e.target.value))} placeholder="00.000.000/0001-00" />
                </div>
              </div>
              {/* Logo upload */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0 4px", borderTop: "1px solid rgba(201,168,76,0.12)", marginTop: 4 }}>
                <div style={{ flexShrink: 0 }}>
                  {studioLogo
                    ? <img src={studioLogo} alt="logo" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "3px solid #C9A84C" }} />
                    : <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#C9A84C", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 700, color: "#000" }}>
                        {studioName ? studioName[0].toUpperCase() : "S"}
                      </div>
                  }
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Logo do Estúdio (opcional)</label>
                  <label style={{ background: "#1E1E1E", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 6, padding: "6px 14px", fontSize: 12, color: "#8A8070", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, display: "inline-block", width: "fit-content" }}>
                    📁 Escolher imagem
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        setLogoCropSrc(ev.target?.result as string);
                        setLogoCropPos({ x: 0, y: 0 });
                        setLogoCropScale(1);
                        setShowLogoCrop(true);
                      };
                      reader.readAsDataURL(file);
                    }} />
                  </label>
                  {studioLogo && (
                    <button onClick={() => { setStudioLogo(""); localStorage.removeItem("inq_logo"); }}
                      style={{ background: "none", border: "none", fontSize: 11, color: "#C0392B", cursor: "pointer", textAlign: "left", padding: 0 }}>
                      ✕ Remover logo
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#555045", marginTop: 2 }}>
                O WhatsApp sera vinculado a {auraName} para atendimento automatizado.
              </div>
            </div>
          )}
          {onbStep === 1 && (
            <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 14, color: "#E8E2D9", fontWeight: 600, marginBottom: 4 }}>Horarios de funcionamento</div>
              <div style={{ fontSize: 11, color: "#555045", marginBottom: 6 }}>A agente de IA trabalha 24 horas. Selecione os horários em que a agente pode marcar seus clientes.</div>
              {horarios.map((h, i) => (
                <div key={h.dia} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#E8E2D9", width: 70, flexShrink: 0 }}>{h.dia}</div>
                  <div style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", position: "relative", flexShrink: 0, transition: "background .2s", background: h.aberto ? "#27AE60" : "#303030" }}
                    onClick={() => setHorarios(p => p.map((x, j) => j === i ? { ...x, aberto: !x.aberto } : x))}>
                    <div style={{ width: 16, height: 16, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, transition: "left .2s", left: h.aberto ? "18px" : "2px" }} />
                  </div>
                  {h.aberto ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <TimeScroller label="Abertura" value={h.ini ? parseInt(h.ini.split(":")[0]) : 8} onChange={v => setHorarios(p => p.map((x, j) => j === i ? { ...x, ini: String(v).padStart(2,"0") + ":00" } : x))} />
                        <span style={{ fontSize: 12, color: "#8A8070" }}>às</span>
                        <TimeScroller label="Fechamento" value={h.fim ? parseInt(h.fim.split(":")[0]) : 18} onChange={v => setHorarios(p => p.map((x, j) => j === i ? { ...x, fim: String(v).padStart(2,"0") + ":00" } : x))} />
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 8 }}>
                          <div style={{ width: 30, height: 16, borderRadius: 8, cursor: "pointer", position: "relative", flexShrink: 0, transition: "background .2s", background: h.almoco ? "#C9A84C" : "#303030" }}
                            onClick={() => setHorarios(p => p.map((x, j) => j === i ? { ...x, almoco: !x.almoco } : x))}>
                            <div style={{ width: 12, height: 12, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, transition: "left .2s", left: h.almoco ? "16px" : "2px" }} />
                          </div>
                          <span style={{ fontSize: 10, color: "#8A8070" }}>Almoço</span>
                        </div>
                      </div>
                      {h.almoco && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 4 }}>
                          <span style={{ fontSize: 11, color: "#8A8070", width: 50 }}>Início:</span>
                          <input className="fi" type="time" value={h.almoco_ini} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, almoco_ini: e.target.value } : x))} style={{ width: 90, padding: "4px 7px" }} />
                          <span style={{ fontSize: 11, color: "#8A8070" }}>Fim:</span>
                          <input className="fi" type="time" value={h.almoco_fim} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, almoco_fim: e.target.value } : x))} style={{ width: 90, padding: "4px 7px" }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: "#555045", fontStyle: "italic", flex: 1 }}>Fechado</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {onbStep === 2 && (
            <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 14, color: "#E8E2D9", fontWeight: 600, marginBottom: 4 }}>Profissionais do estúdio</div>
              {artists.map(a => (
                <div key={a.id} style={{ background: "#1E1E1E", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, color: a.cor }}>{a.nome}</div>
                    <div style={{ fontSize: 11, color: "#8A8070", marginTop: 2 }}>{a.role === "residente" ? "Residente" : "Temporário"} · {a.com}% comissao</div>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27AE60" }} />
                </div>
              ))}
              <button className="btn-new" style={{ marginTop: 4, alignSelf: "flex-start" }} onClick={() => setShowArtForm(true)}>+ Adicionar Profissional</button>
            </div>
          )}
          {onbStep === 3 && (
            <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 14, color: "#E8E2D9", fontWeight: 600, marginBottom: 4 }}>Configure sua agente de atendimento</div>
              <div style={{ fontSize: 11, color: "#555045", marginBottom: 4, lineHeight: 1.6 }}>Escolha um nome para a sua agente. Você poderá configurar a personalidade completa em Configurações → IA após concluir.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Nome da agente</label>
                <input className="fi" value={auraName} placeholder="Ex: Luna, Sofia, Iris..."
                  onChange={e => setAuraName(e.target.value.replace(/(^|\s)(\S)/g, (_: string, sp: string, ch: string) => sp + ch.toUpperCase()))} />
                <div style={{ fontSize: 10, color: "#555045", marginTop: 4, lineHeight: 1.5 }}>
                  Este nome aparece em todo o sistema e nas comunicações com seus clientes. Escolha algo que combine com a identidade da sua agente.
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Primeiras instruções (opcional)</label>
                <textarea className="fi" rows={3}
                  placeholder={"Descreva brevemente seu estúdio e como " + (auraName || "a agente") + " deve se comunicar. Ex: Somos um estúdio de blackwork em SP. Tom descontraído e artístico."}
                  value={auraInstrucoes}
                  onChange={e => setAuraInstrucoes(e.target.value)}
                  style={{ resize: "none", fontFamily: "'DM Sans',sans-serif", fontSize: 12, lineHeight: 1.6 }} />
                <div style={{ fontSize: 10, color: "#555045", marginTop: 2, lineHeight: 1.5 }}>
                  Você pode detalhar mais em Configurações → IA depois.
                </div>
              </div>
            </div>
          )}
          {onbStep === 4 && (
            <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 600, color: "#C9A84C" }}>Tudo pronto!</div>
              <div style={{ fontSize: 13, color: "#8A8070", lineHeight: 1.7 }}>
                O <strong style={{ color: "#E8E2D9" }}>{studioName}</strong> esta configurado.<br />Bem-vindo ao INK SYSTEM.
              </div>
            </div>
          )}
          <div style={{ padding: "14px 28px", borderTop: "1px solid rgba(201,168,76,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#555045" }}>{onbStep + 1} de {onbSteps.length}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {onbStep > 0 && <button className="btn-c" onClick={() => setOnbStep(s => s - 1)}>Voltar</button>}
              {onbStep < 4 && (
                <button className="btn-s" disabled={onbStep === 0 && (!studioName || !studioOwner || !studioTel)} onClick={() => setOnbStep(s => s + 1)}>
                  {onbStep === 3 ? "Concluir" : "Continuar"}
                </button>
              )}
              {onbStep === 4 && <button className="btn-s" onClick={async () => { setOnboardingDone(true); setShowSplash(false); localStorage.setItem("inq_onb", "1"); try { const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single(); if (cfgEx?.id) { await sb.from("configuracoes").update({ onboarding_done: true }).eq("id", cfgEx.id); } else { await sb.from("configuracoes").insert({ onboarding_done: true, user_id: userId }); } } catch(e) { console.warn("onboarding save", e); } if (!localStorage.getItem("inq_tour")) { setTimeout(() => { if (!showLogoCrop) { setTourStep(0); setTourAtivo(true); } }, 800); } }}>Entrar no Sistema →</button>}
            </div>
          </div>
        </div>
        {showArtForm && (
          <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowArtForm(false); }}>
            <div className="fmod" style={{ maxWidth: 420 }}>
              <div className="fmh"><div className="fmt">Adicionar Profissional</div><button className="mc" onClick={() => setShowArtForm(false)}>✕</button></div>
              <div className="fmb">
                <div className="ff"><label className="fl">Nome Completo *</label><input className="fi" placeholder="Nome do artista" value={artForm.nome} onChange={e => setArtForm({ ...artForm, nome: e.target.value.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase()) })} /></div>
                <div className="fr">
                  <div className="ff"><label className="fl">Tipo</label><select className="fs" value={artForm.role} onChange={e => setArtForm({ ...artForm, role: e.target.value })}><option value="residente">Residente</option><option value="guest">Temporário</option></select></div>
                  <div className="ff">
                    <label className="fl">Comissão (%)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input className="fi" type="number" min={0} max={100} value={artForm.com} onChange={e => setArtForm({ ...artForm, com: Number(e.target.value) })} style={{ width: 80 }} />
                      <span style={{ fontSize: 11, color: "var(--tx3)", display: "flex", gap: 10 }}>
                        <span>Profissional: <strong style={{ color: "var(--gold)" }}>{artForm.com}%</strong></span>
                        <span style={{ color: "var(--br)" }}>|</span>
                        <span>Estúdio: <strong style={{ color: "#27AE60" }}>{100 - artForm.com}%</strong></span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ff"><label className="fl">E-mail de acesso ao sistema</label><input className="fi" type="email" placeholder="email@exemplo.com" value={artForm.email} onChange={e => setArtForm({ ...artForm, email: e.target.value.toLowerCase() })} /></div>
                <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={artForm.insta} onChange={e => { const v = e.target.value; setArtForm({ ...artForm, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
                <div className="ff"><label className="fl">Cor</label><ColorPicker value={artForm.cor} onChange={cor => setArtForm({ ...artForm, cor })} /></div>
              </div>
              <div className="fmf"><button className="btn-c" onClick={() => setShowArtForm(false)}>Cancelar</button><button className="btn-s" onClick={saveArtist} disabled={!artForm.nome}>Salvar</button></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const isMobileView = typeof window !== "undefined" && window.innerWidth < 600;

  return (
    <>
      <div className="root">
        {/* TOPBAR */}
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {studioLogo
              ? <img src={studioLogo} alt="logo" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--gold)" }} />
              : <div className="bmark">C</div>
            }
            <div style={{ cursor: userRole === "admin" ? "pointer" : "default" }} onClick={() => { if (userRole === "admin") setShowSettings(true); }}>
              <div className="bname">{studioName}</div>
              <div className="bsub">{userRole === "profissional" ? "Acesso Profissional" : "INK SYSTEM"}</div>
              {(() => { const cnpjDigits = (cnpj || "").replace(/[^0-9]/g,""); return cnpjDigits.length === 14 ? <div style={{ fontSize: 9, color: "var(--tx3)", letterSpacing: ".08em" }}>CNPJ: {cnpj}</div> : null; })()}
            </div>
          </div>
          <div className="tbr">
            {alertas.length > 0 && (
              <div style={{ position: "relative" }}>
                <div ref={alertBtnRef} className="alert-btn" onClick={() => {
                  const rect = alertBtnRef.current?.getBoundingClientRect();
                  if (rect) {
                    const mob = window.innerWidth < 600;
                    if (mob) {
                      setAlertPos({ top: rect.bottom + 8, right: 8 });
                    } else {
                      setAlertPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                    }
                  }
                  setShowAlerts(v => !v);
                }}>
                  ⚠️ {alertas.length} alerta{alertas.length > 1 ? "s" : ""}
                </div>
              </div>
            )}
            <button className="theme-btn" title="Sair" onClick={async () => { await sb.auth.signOut(); setLogado(false); }} style={{ fontSize: 13 }}>🚪</button>
            <button className="btn-new" onClick={() => setShowForm(true)}>+ Novo Cliente</button>
          </div>
        </div>
        {/* ALERT DROPDOWN - createPortal para evitar overflow */}
        {showAlerts && alertas.length > 0 && createPortal(
          <div onClick={() => setShowAlerts(false)} style={{ position: "fixed", inset: 0, zIndex: 2147483646 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: alertPos.top, right: isMobileView ? undefined : Math.max(alertPos.right, 8), left: isMobileView ? 8 : "auto", zIndex: 2147483647, width: isMobileView ? "calc(100vw - 16px)" : "min(380px, calc(100vw - 16px))", maxWidth: "calc(100vw - 16px)", background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,.5)", maxHeight: "min(80vh, calc(100dvh - 80px))", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="ad-hdr" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Alertas — {alertas.length} clientes</span>
              <button onClick={() => setShowAlerts(false)} style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            {/* Seções de alertas por categoria */}
            <div className="ad-body" style={{ overflowY: "auto" }}>
              {/* 🎂 Aniversários */}
              {(() => {
                const hoje = new Date();
                const parseNasc = (nasc: string) => {
                  if (!nasc) return null;
                  // Aceita DD/MM/YYYY ou YYYY-MM-DD
                  if (nasc.includes("/")) {
                    const p = nasc.split("/");
                    if (p.length === 3) return new Date(Number(p[2]), Number(p[1])-1, Number(p[0]));
                  }
                  const d = new Date(nasc);
                  return isNaN(d.getTime()) ? null : d;
                };
                const aniversariantes = alertas.map(c => {
                  const nasc = parseNasc((c as any).nascimento);
                  if (!nasc) return null;
                  for (let i = 0; i <= 7; i++) {
                    const d = new Date(hoje); d.setDate(d.getDate() + i);
                    if (nasc.getMonth() === d.getMonth() && nasc.getDate() === d.getDate()) {
                      return { ...c, diasAteAniv: i };
                    }
                  }
                  return null;
                }).filter(Boolean) as any[];
                if (aniversariantes.length === 0) return null;
                return (
                  <div style={{ borderBottom: "1px solid var(--br)", paddingBottom: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 14px 4px" }}>🎂 Aniversários nos próximos 7 dias</div>
                    {aniversariantes.map((c: any) => (
                      <div key={c.id} className="ad-item" onClick={() => { setSel(c); setSelCtx("clientes"); setShowAlerts(false); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); }}>
                        <div className="ad-name">{c.nome}</div>
                        <div className="ad-tags">
                          <span className="atag" style={{ color: "var(--gold)" }}>
                            🎂 {c.diasAteAniv === 0 ? "Hoje!" : c.diasAteAniv === 1 ? "Amanhã!" : "Em " + c.diasAteAniv + " dias"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* 🛡 Garantias */}
              {(() => {
                const garantias = alertas.filter(c => c.etapa === "tatuado" && c.dias >= 30 && c.dias <= 37);
                if (garantias.length === 0) return null;
                return (
                  <div style={{ borderBottom: "1px solid var(--br)", paddingBottom: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#E67E22", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 14px 4px" }}>🛡 Garantias vencendo (D+30 a D+37)</div>
                    {garantias.map(c => (
                      <div key={c.id} className="ad-item" onClick={() => { setSel(c); setSelCtx("clientes"); setShowAlerts(false); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); }}>
                        <div className="ad-name">{c.nome}</div>
                        <div className="ad-tags"><span className="atag" style={{ color: "#E67E22" }}>D+{c.dias} — {37 - c.dias} dias restantes</span></div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* 💤 Inativos */}
              {(() => {
                const inativos = alertas.filter(c => !["blacklist","tatuado","pos_venda","hibernacao"].includes(c.etapa) && c.dias >= 40);
                if (inativos.length === 0) return null;
                return (
                  <div style={{ borderBottom: "1px solid var(--br)", paddingBottom: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 14px 4px" }}>💤 Inativos há 40+ dias</div>
                    {inativos.map(c => (
                      <div key={c.id} className="ad-item" onClick={() => { setSel(c); setSelCtx("clientes"); setShowAlerts(false); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); }}>
                        <div className="ad-name">{c.nome}</div>
                        <div className="ad-tags"><span className="atag" style={{ color: "#888" }}>Inativo há {c.dias}d</span></div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {/* ⚠ Demais alertas */}
              {alertas.filter(c => {
                const m = miss(c); const ch = churn(c);
                const projSemValor = (c.projetos || []).some((p: any) => { const vt = Number(String(p.valorTotal || "0").replace(/\./g,"").replace(",",".")); return p.status !== "concluido" && p.status !== "cancelado" && vt <= 0; }) && c.etapa !== "lead";
                return ch || projSemValor || m.length > 0;
              }).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--q1)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 14px 4px" }}>⚠ Outros alertas</div>
                  {alertas.filter(c => {
                    const m = miss(c); const ch = churn(c);
                    const projSemValor = (c.projetos || []).some((p: any) => { const vt = Number(String(p.valorTotal || "0").replace(/\./g,"").replace(",",".")); return p.status !== "concluido" && p.status !== "cancelado" && vt <= 0; }) && c.etapa !== "lead";
                    return ch || projSemValor || m.length > 0;
                  }).map(c => {
                    const m = miss(c); const ch = churn(c);
                    const projSemValor = (c.projetos || []).some((p: any) => { const vt = Number(String(p.valorTotal || "0").replace(/\./g,"").replace(",",".")); return p.status !== "concluido" && p.status !== "cancelado" && vt <= 0; }) && c.etapa !== "lead";
                    return (
                      <div key={c.id} className="ad-item" onClick={() => { setSel(c); setSelCtx("clientes"); setShowAlerts(false); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); }}>
                        <div className="ad-name">{c.nome}</div>
                        <div className="ad-tags">
                          {ch === "red" && <span className="co co-r">🔴 1a sem retorno</span>}
                          {ch === "orange" && <span className="co co-o">🟠 6m sem retorno</span>}
                          {projSemValor && <span className="atag">💰 Sem valor</span>}
                          {m.map(x => <span key={x} className="atag">⚠ Sem {x}</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          </div>,
          document.body
        )}

        {/* TABS */}
        <div className="tabs">
          {([
            { id: "kanban", l: "Pipeline", i: "📋", roles: ["admin","profissional"] },
            { id: "clientes", l: "Clientes", i: "👥", roles: ["admin","profissional"] },
            { id: "agenda", l: "Agenda", i: "📅", roles: ["admin","profissional"] },
            { id: "financeiro", l: "Financeiro", i: "💰", roles: ["admin"] },
            { id: "artistas", l: "Profissionais", i: "💼", roles: ["admin"] },
            { id: "dashboard", l: "Visão Geral", i: "📊", roles: ["admin","profissional"] },
            { id: "posvenda", l: "Pré/Pós-Venda", i: "💬", roles: ["admin","profissional"] },
            { id: "disparos", l: "Disparos", i: "📣", roles: ["admin"] },
            { id: "origens", l: "Origens", i: "🔗", roles: ["admin"] },
            { id: "campanhas", l: "Campanhas", i: "🎯", roles: ["admin"] },
            { id: "licencas", l: "Licenças", i: "🔑", roles: ["owner"] },
          ] as {id:string;l:string;i:string;roles:string[]}[]).filter(t => {
            if (t.id === "licencas") return authEmail === OWNER_EMAIL;
            return t.roles.includes(userRole);
          }).map(t => (
            <button key={t.id} className={"tab" + (tab === t.id ? " on" : "")} onClick={() => changeTab(t.id)}>
              {t.i} {t.l}
            </button>
          ))}
        </div>

        {/* STATS */}
        <div className="stats" style={{ position: "relative" }}>
          {[
            { i: "👥", v: stats.total, l: "Total", bg: "rgba(201,168,76,.1)" },
            { i: "✅", v: stats.ativos, l: "Ativos", bg: "rgba(91,141,239,.1)" },
            { i: "🖤", v: stats.tatuados, l: "Tatuados", bg: "rgba(39,174,96,.1)" },
            { i: "📅", v: stats.hoje, l: "Hoje", bg: "rgba(155,107,181,.1)" },
          ].map((s, i) => (
            <div className="si" key={i}>
              <div className="sico" style={{ background: s.bg }}>{s.i}</div>
              <div>
                <div className="sv">{showStats ? s.v : "••"}</div>
                <div className="sl">{s.l}</div>
              </div>
            </div>
          ))}
          <button onClick={() => setShowStats(p => !p)}
            style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: showStats ? "var(--gold)" : "var(--tx3)", padding: "4px 6px" }}
            title={showStats ? "Ocultar dados" : "Ver dados"}>
            {showStats ? "👁" : "👁"}
          </button>
        </div>

        {/* FILTER BAR */}
        {(tab === "kanban" || tab === "clientes") && (
          <div className="ctrl" style={{ flexWrap: "wrap", rowGap: 4 }}>
            <input className="srch" placeholder="Buscar..." value={srch} onChange={e => setSrch(e.target.value)} />
            <button className={"fb" + (fa === "todos" && !filtroExtra ? " on" : "")} onClick={() => { setFa("todos"); setFiltroExtra(null); setSelIds(new Set()); setDropdownAberto(null); }}>Todos</button>
            {artists.filter(a => a.ativo).map(a => (
              <button key={a.id} className={"fb" + (fa === a.id && !filtroExtra ? " on" : "")} onClick={() => { setFa(a.id); setFiltroExtra(null); setSelIds(new Set()); setDropdownAberto(null); }}>
                {a.nome.split(" ")[0]}
              </button>
            ))}
            {tab === "kanban" && (
              <button onClick={() => setShowAddStage(true)}
                style={{ padding: "4px 12px", fontSize: 11, fontWeight: 600, borderRadius: 20, border: "1px dashed var(--gold)", background: "transparent", color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                + Nova Etapa de Pipeline
              </button>
            )}
            {tab === "clientes" && campanhas.length > 0 && (() => {
              const hoje = new Date().toISOString().split("T")[0];
              const campAtiva = filtroExtra?.tipo === "campanha";
              const campSel = campAtiva ? campanhas.find(c => c.id === filtroExtra!.valor) : null;
              return (
                <div style={{ position: "relative" }}>
                  <button
                    className={"fb" + (campAtiva ? " on" : "")}
                    onClick={() => setDropdownAberto(p => p === "campanhas" ? null : "campanhas")}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    🎯 {campSel ? campSel.nome : "Campanhas"} <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
                  </button>
                  {dropdownAberto === "campanhas" && (
                    <div
                      style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200, background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 8, minWidth: 180, boxShadow: "0 4px 16px rgba(0,0,0,.4)", padding: "4px 0" }}
                      onMouseDown={e => e.stopPropagation()}>
                      {campAtiva && (
                        <button
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: "none", border: "none", color: "var(--tx3)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                          onClick={() => { setFiltroExtra(null); setSelIds(new Set()); setDropdownAberto(null); }}>
                          ✕ Limpar filtro
                        </button>
                      )}
                      {campanhas.map(camp => {
                        const ativa = camp.data_inicio && camp.data_fim && hoje >= camp.data_inicio && hoje <= camp.data_fim;
                        const sel = filtroExtra?.tipo === "campanha" && filtroExtra.valor === camp.id;
                        return (
                          <button key={camp.id}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", textAlign: "left", padding: "7px 14px", background: sel ? "var(--dk3)" : "none", border: "none", color: sel ? "var(--gold)" : "var(--tx1)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                            onClick={() => { setFa("todos"); setSelIds(new Set()); setFiltroExtra(sel ? null : { tipo: "campanha", valor: camp.id }); setDropdownAberto(null); }}>
                            <span>🎯 {camp.nome}</span>
                            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: ativa ? "rgba(34,197,94,.15)" : "rgba(239,68,68,.1)", color: ativa ? "#22c55e" : "#ef4444", fontWeight: 600, whiteSpace: "nowrap" }}>
                              {ativa ? "ativa" : "encerrada"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            {tab === "clientes" && origens.length > 0 && (() => {
              const origAtiva = filtroExtra?.tipo === "orig";
              const origSel = origAtiva ? origens.find(o => o.nome === filtroExtra!.valor) : null;
              return (
                <div style={{ position: "relative" }}>
                  <button
                    className={"fb" + (origAtiva ? " on" : "")}
                    onClick={() => setDropdownAberto(p => p === "orig" ? null : "orig")}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    🔗 {origSel ? origSel.nome : "Origens"} <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
                  </button>
                  {dropdownAberto === "orig" && (
                    <div
                      style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 200, background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 8, minWidth: 160, boxShadow: "0 4px 16px rgba(0,0,0,.4)", padding: "4px 0" }}
                      onMouseDown={e => e.stopPropagation()}>
                      {origAtiva && (
                        <button
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: "none", border: "none", color: "var(--tx3)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                          onClick={() => { setFiltroExtra(null); setSelIds(new Set()); setDropdownAberto(null); }}>
                          ✕ Limpar filtro
                        </button>
                      )}
                      {origens.map(o => {
                        const sel = filtroExtra?.tipo === "orig" && filtroExtra.valor === o.nome;
                        return (
                          <button key={o.id}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 14px", background: sel ? "var(--dk3)" : "none", border: "none", color: sel ? "var(--gold)" : "var(--tx1)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                            onClick={() => { setFa("todos"); setSelIds(new Set()); setFiltroExtra(sel ? null : { tipo: "orig", valor: o.nome }); setDropdownAberto(null); }}>
                            🔗 {o.nome}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── KANBAN ── */}
        {tab === "kanban" && (
          <>
          {/* Barra de rolagem nativa dourada — acima das colunas */}
          <div style={{ background: "var(--dk2)", borderBottom: "1px solid var(--br)", animation: "fadeIn .15s ease" }}>
            <div className="kw-scroll-mirror" id="kanban-scroll" style={{ overflowX: "auto", overflowY: "hidden", height: 10, scrollbarWidth: "thin", scrollbarColor: "var(--gold) var(--dk3)" }}
              onScroll={e => { const body = document.getElementById("kanban-body"); if (body) body.scrollLeft = e.currentTarget.scrollLeft; }}>
              <div id="kanban-scroll-spacer" style={{ height: 1 }} />
            </div>
          </div>
          <div className="kw" id="kanban-body" onScroll={e => {
            const mirror = document.getElementById("kanban-scroll");
            if (mirror) mirror.scrollLeft = e.currentTarget.scrollLeft;
          }} ref={el => {
            if (el) {
              const spacer = document.getElementById("kanban-scroll-spacer");
              if (spacer) spacer.style.width = el.scrollWidth + "px";
              setTimeout(() => {
                const spacer2 = document.getElementById("kanban-scroll-spacer");
                if (spacer2) spacer2.style.width = el.scrollWidth + "px";
              }, 600);
            }
          }}>
            {stages.map(stage => {
              const sc2 = getSC(stage.id);
              const stageDesc = STAGE_INFO[stage.id] || "Etapa personalizada. Defina o critério e arraste os clientes conforme o seu fluxo de atendimento.";
              const infoAberto = stageInfoOpen === stage.id;
              return (
                <div className="kc" key={stage.id} id={"kcol-" + stage.id} onClick={() => { if (infoAberto) setStageInfoOpen(null); }}>
                  <div className="kh" style={{ borderBottomColor: stage.color, position: "relative" }}>
                    <span className="kt" style={{ color: stage.color }}>{stage.emoji} {stage.label}
                      {stage.id === "lead" && newLeadsBadge > 0 && (
                        <span onClick={() => setNewLeadsBadge(0)} title="Novos leads — clique para dispensar" style={{ marginLeft: 6, background: "#E74C3C", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", cursor: "pointer", verticalAlign: "middle", animation: "pulse 1.5s infinite" }}>{newLeadsBadge}</span>
                      )}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span className="kn">{sc2.length}</span>
                      <span onClick={e => { e.stopPropagation(); setStageInfoOpen(infoAberto ? null : stage.id); }}
                        style={{ cursor: "pointer", fontSize: 11, opacity: infoAberto ? 0.9 : 0.45, lineHeight: 1, userSelect: "none", color: infoAberto ? stage.color : undefined }}>ℹ️</span>
                      <span title="Editar etapa" onClick={e => { e.stopPropagation(); setEditingStage(stage); setEditStageLabel(stage.label); setEditStageEmoji(stage.emoji || ""); setEditStageCor(stage.color || "#888"); }}
                        style={{ cursor: "pointer", fontSize: 10, opacity: 0.45, lineHeight: 1, userSelect: "none" }}>✏️</span>
                      {stage.fixo === false && (
                        <span title="Excluir etapa" onClick={e => { e.stopPropagation(); setConfirmDeleteStage(stage); }}
                          style={{ cursor: "pointer", fontSize: 10, opacity: 0.45, lineHeight: 1, userSelect: "none" }}>🗑</span>
                      )}
                    </div>
                    {infoAberto && (
                      <div onClick={e => e.stopPropagation()}
                        style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300, background: "var(--dk2)", border: "1px solid " + stage.color + "66", borderRadius: 10, padding: "12px 14px", boxShadow: "0 6px 24px rgba(0,0,0,.55)", animation: "fadeIn .15s ease" }}>
                        <div style={{ fontSize: 11, color: stage.color, fontWeight: 700, marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>{stage.emoji} {stage.label}</div>
                        <div style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.6, fontFamily: "'DM Sans',sans-serif" }}>{stageDesc}</div>
                      </div>
                    )}
                  </div>
                  <div className="kb">
                    {sc2.length === 0 && (
                      <div style={{ padding: "24px 16px", textAlign: "center" }}>
                        <div style={{ fontSize: 22, marginBottom: 10, opacity: 0.3 }}>{stage.emoji}</div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", lineHeight: 1.6, fontFamily: "'DM Sans',sans-serif" }}>{stageDesc}</div>
                      </div>
                    )}
                    {sc2.map(c => {
                      const m = miss(c); const ch = churn(c);
                      const anivMes = isAniversMes((c as any).nascimento || "");
                      const anivHoje = isAniversHoje((c as any).nascimento || "");
                      const eMenorCard = isMenor((c as any).nascimento || "");
                      return (
                        <div key={c.id} className="card" onClick={() => { setSel(c); setSelCtx("clientes"); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); }} style={{ animation: "fadeSlideIn .22s ease both" }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: aColor(c.artista), borderRadius: "7px 0 0 7px" }} />
                          <div className="ctop">
                            <div className="cname">{eMenorCard ? "👼 " : ""}{anivHoje ? "🎂 " : ""}{c.nome}</div>
                            <span className={"qb " + QC[c.qual]}>{c.qual}</span>
                          </div>
                          {(() => {
                            const s = calcScore(c);
                            return (
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                                background: s.cor + "22", border: "1px solid " + s.cor + "55", color: s.cor,
                                marginTop: 2, display: "inline-block" }}>
                                {s.label}
                              </span>
                            );
                          })()}
                          {(c as any).servicoInteresse && <div className="cst">{(c as any).servicoInteresse}</div>}
                          {(() => {
                            const sessCli = agEvents.filter(e => e.cliente_id === c.id && !e.tipo?.startsWith("bloq") && !e.tipo?.startsWith("cons"));
                            const total = sessCli.length;
                            if (total < 2) return null;
                            const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
                            const concluidas = sessCli.filter(e => e.status === "concluido").length;
                            const exibir = total > 5 ? sessCli.slice(0, 4) : sessCli;
                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 10, color: "var(--tx2)" }}>
                                {exibir.map((e, i) => {
                                  const conc = e.status === "concluido";
                                  const dEv = e.date ? new Date(e.date + "T12:00:00") : null;
                                  const prox = !conc && dEv && dEv >= hoje0;
                                  return (
                                    <div key={e.id || i} style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: conc ? "#27AE60" : prox ? "var(--gold)" : "var(--dk5)", border: conc || prox ? "none" : "1px solid var(--br)" }} />
                                  );
                                })}
                                {total > 5 && <span style={{ fontSize: 9 }}>…</span>}
                                <span>{concluidas} de {total}</span>
                              </div>
                            );
                          })()}
                          {agEvents.some(e => e.cliente_id === c.id && e.status === "cancelado") && (
                            <div style={{ fontSize: 10, color: "#E67E22", background: "rgba(230,126,34,.12)", border: "1px solid rgba(230,126,34,.25)", borderRadius: 4, padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: 3, marginBottom: 2 }}>⊘ Evento cancelado</div>
                          )}
                          <div className="cft">
                            <span className={("at " + aClass(c.artista)) || ""} style={aStyle(c.artista)}>{aName(c.artista).split(" ")[0]}</span>
                            <span className="cd">{c.data}</span>
                          </div>
                          <div className="cor">📍 {c.orig}</div>
                          {(m.length > 0 || ch || c.orcamento || c.etapa === "blacklist" || c.etapa === "lista_espera" || anivMes) && (
                            <div className="ar">
                              {anivMes && <span className="atag" style={{ background: "rgba(201,168,76,.2)", color: "var(--gold)", border: "1px solid rgba(201,168,76,.4)" }}>🎂 Aniversário</span>}
                              {m.map(x => <span key={x} className="atag">⚠ {x}</span>)}
                              {ch === "orange" && <span className="co co-o">🟠</span>}
                              {ch === "red" && <span className="co co-r">🔴</span>}
                              {c.orcamento && <span className="atag">💰</span>}
                              {c.etapa === "blacklist" && <span className="tag-bl">🚫</span>}
                              {c.etapa === "lista_espera" && <span className="tag-wl">⏳</span>}
                              {c.etapa === "cons_agendada" && agEvents.some(e => e.cliente_id === c.id && e.tipo?.startsWith("cons") && e.status === "concluido") && (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 3, background: "rgba(39,174,96,.15)", color: "#27AE60", border: "1px solid rgba(39,174,96,.3)" }}>✓ Consulta Realizada</span>
                              )}
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
          </>
        )}

        {/* ── CLIENTES ── */}
        {tab === "clientes" && (() => {
          const sorted = [...filtered].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
          const todosVisivelIds = sorted.map(c => c.id);
          const todosSelecionados = todosVisivelIds.length > 0 && todosVisivelIds.every(id => selIds.has(id));

          const iniciarDisparoMassa = async () => {
            if (!disparoMassa || disparoMassa.fase !== "confirm") return;
            const selecionados = sorted.filter(c => selIds.has(c.id));
            setDisparoMassa(d => d ? { ...d, fase: "enviando", ok: 0, total: selecionados.length } : d);
            let ok = 0;
            const now = new Date();
            const dataStr = now.toLocaleDateString("pt-BR");
            const horaStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            for (const c of selecionados) {
              const msg = (disparoMassa!.texto || "").replace(/\{nome\}/gi, c.nome.split(" ")[0]);
              try {
                if (disparoMassa!.canal === "email" && c.email && resendApiKey) {
                  const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" + msg.replace(/\n/g, "<br>") + "</div>";
                  const r = await fetch("/api/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: resendApiKey, from: (nomeRemetente || studioName || "INK SYSTEM") + " <" + emailRemetente + ">", to: c.email, subject: "Mensagem de " + (studioName || "INK SYSTEM"), html }) });
                  if (r.ok) ok++;
                } else if (disparoMassa!.canal === "sms" && c.tel && zenviaApiKey && zenviaNumero) {
                  const tel = "55" + c.tel.replace(/[^0-9]/g, "").replace(/^55/, "");
                  const r = await fetch("/api/zenvia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: zenviaApiKey, from: zenviaNumero, to: tel, text: msg }) });
                  if (r.ok) ok++;
                }
              } catch {}
            }
            try {
              await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: "Disparo em massa [" + disparoMassa!.canal.toUpperCase() + "] — " + ok + " de " + selecionados.length + " cliente(s)", user_id: userId });
            } catch {}
            setDisparoMassa(d => d ? { ...d, fase: "done", ok } : d);
            setSelIds(new Set());
            setSelMode(false);
          };

          return (
          <div style={{ display: "flex", flex: 1, overflow: "hidden", animation: "fadeIn .15s ease", flexDirection: "column" }}>

            {/* Modal disparo em massa */}
            {disparoMassa && (
              <div className="ov" style={{ zIndex: 9999 }} onClick={() => { if (disparoMassa.fase !== "enviando") setDisparoMassa(null); }}>
                <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 14, width: "min(480px, 94vw)", padding: "24px", display: "flex", flexDirection: "column", gap: 16, animation: "slideInRight .25s ease" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: "var(--gold)" }}>✉ Disparo em Massa</div>

                  {disparoMassa.fase === "done" ? (
                    <>
                      <div style={{ fontSize: 14, color: "var(--tx)", lineHeight: 1.6 }}>
                        Disparo concluído: <strong style={{ color: "var(--q3)" }}>{disparoMassa.ok}</strong> de <strong>{disparoMassa.total}</strong> clientes receberam a mensagem.
                        {disparoMassa.ok < disparoMassa.total && (
                          <span style={{ color: "var(--tx3)", fontSize: 12 }}> ({disparoMassa.total - disparoMassa.ok} sem dado de contato válido para o canal selecionado.)</span>
                        )}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button className="btn-s" onClick={() => setDisparoMassa(null)}>Fechar</button>
                      </div>
                    </>
                  ) : disparoMassa.fase === "enviando" ? (
                    <div style={{ fontSize: 13, color: "var(--tx3)", textAlign: "center", padding: "20px 0" }}>Enviando mensagens… aguarde.</div>
                  ) : disparoMassa.fase === "confirm" ? (
                    <>
                      <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>
                        Tem certeza que deseja enviar <strong>{disparoMassa.canal === "email" ? "e-mail" : "SMS"}</strong> para <strong>{selIds.size} cliente(s)</strong>? Esta ação não pode ser desfeita.
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn-c" onClick={() => setDisparoMassa(d => d ? { ...d, fase: "compose" } : d)}>Voltar</button>
                        <button className="btn-s" onClick={iniciarDisparoMassa}>Confirmar disparo</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: "var(--tx3)" }}>
                        {selIds.size} cliente(s) selecionado(s). Use <code style={{ background: "var(--dk3)", padding: "1px 4px", borderRadius: 3 }}>{"{nome}"}</code> para personalizar.
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 6 }}>Canal</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className={"fb" + (disparoMassa.canal === "email" ? " on" : "")} onClick={() => setDisparoMassa(d => d ? { ...d, canal: "email" } : d)}>✉ E-mail</button>
                          <button className={"fb" + (disparoMassa.canal === "sms" ? " on" : "")} style={{ opacity: (zenviaApiKey && canaisHabilitados.sms) ? 1 : 0.4, cursor: (zenviaApiKey && canaisHabilitados.sms) ? "pointer" : "not-allowed" }}
                            onClick={() => { if (zenviaApiKey && canaisHabilitados.sms) setDisparoMassa(d => d ? { ...d, canal: "sms" } : d); }}>
                            💬 SMS{!(zenviaApiKey && canaisHabilitados.sms) ? " (não configurado)" : ""}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 6 }}>Mensagem</div>
                        <textarea rows={5} style={{ width: "100%", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--tx)", resize: "vertical", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }}
                          placeholder={"Olá {nome}, temos uma novidade especial para você…"}
                          value={disparoMassa.texto}
                          onChange={e => setDisparoMassa(d => d ? { ...d, texto: e.target.value } : d)} />
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn-c" onClick={() => setDisparoMassa(null)}>Cancelar</button>
                        <button className="btn-s" style={{ opacity: disparoMassa.texto.trim() ? 1 : 0.4, cursor: disparoMassa.texto.trim() ? "pointer" : "not-allowed" }}
                          onClick={() => { if (disparoMassa.texto.trim()) setDisparoMassa(d => d ? { ...d, fase: "confirm" } : d); }}>
                          Continuar →
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Linha: tabela + índice alfabético */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div className="cw" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0 }}>
            {filtroExtra && (() => {
              const label = filtroExtra.tipo === "campanha"
                ? "🎯 " + (campanhas.find(c => c.id === filtroExtra.valor)?.nome || filtroExtra.valor)
                : "🔗 " + filtroExtra.valor;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", background: "rgba(201,168,76,.10)", borderBottom: "1px solid rgba(201,168,76,.2)", fontSize: 12, color: "var(--gold)" }}>
                  <span>Filtrando: <strong>{label}</strong></span>
                  <button onClick={() => setFiltroExtra(null)} style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
                </div>
              );
            })()}
            {/* Barra de ação seleção múltipla */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", background: "var(--dk2)", borderBottom: "1px solid var(--br)", flexShrink: 0 }}>
              {selMode ? (
                <>
                  <input type="checkbox" checked={todosSelecionados} onChange={() => {
                    if (todosSelecionados) { setSelIds(new Set()); }
                    else { setSelIds(new Set(todosVisivelIds)); }
                  }} style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: 12, color: "var(--tx3)" }}>Selecionar todos ({sorted.length})</span>
                  <div style={{ flex: 1 }} />
                  <button className="btn-s" style={{ opacity: selIds.size > 0 ? 1 : 0.45, cursor: selIds.size > 0 ? "pointer" : "not-allowed" }}
                    onClick={() => { if (selIds.size > 0) setDisparoMassa({ canal: "email", texto: "", fase: "compose", ok: 0, total: 0 }); }}>
                    ✉ Disparar ({selIds.size})
                  </button>
                  <button className="btn-c" onClick={() => { setSelMode(false); setSelIds(new Set()); }}>Cancelar</button>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }} />
                  <button className="btn-c" style={{ fontSize: 11, padding: "4px 12px" }} onClick={() => setSelMode(true)}>✉ Disparar</button>
                </>
              )}
            </div>

            {sorted.length === 0
              ? <div className="empty">Nenhum cliente encontrado.</div>
              : (
                <table className="ctbl" id="client-table">
                  <thead>
                    <tr>
                      {selMode && <th style={{ width: 32 }}></th>}
                      <th>Cliente</th><th>Contato</th><th>Projeto</th>
                      <th>Profissional</th><th>Q</th><th>Etapa</th>
                      <th>Alertas</th><th>Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(c => {
                      const es = EBS[c.etapa] || EBS.lead;
                      const m = miss(c); const ch = churn(c);
                      const selecionado = selIds.has(c.id);
                      return (
                        <tr key={c.id} data-letter={c.nome[0]?.toUpperCase()}
                          style={{ background: selecionado ? "rgba(201,168,76,.08)" : undefined }}
                          onClick={() => {
                            if (selMode) {
                              setSelIds(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; });
                            } else {
                              setSel(c); setSelCtx("clientes");
                            }
                          }}>
                          {selMode && (
                            <td style={{ width: 32, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={selecionado} onChange={() => {
                                setSelIds(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; });
                              }} style={{ cursor: "pointer" }} />
                            </td>
                          )}
                          <td>
                            <div className="tdn">{isMenor((c as any).nascimento || "") ? "👼 " : ""}{isAniversMes((c as any).nascimento || "") ? "🎂 " : ""}{c.nome}</div>
                            <div className="tdd">{c.insta || <span style={{ color: "var(--q2)" }}>⚠ Instagram</span>}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12 }}>{c.tel}</div>
                            <div className="tdd">{c.email || <span style={{ color: "var(--q2)" }}>⚠ Email</span>}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12 }}>{c.estilo || " - "}</div>
                            <div className="tdd">{c.regiao ? c.regiao + (c.tam ? " " + c.tam : "") : ""}</div>
                          </td>
                          <td><span className={("at " + aClass(c.artista)) || ""} style={aStyle(c.artista)}>{aName(c.artista).split(" ")[0]}</span></td>
                          <td><span className={"qb " + QC[c.qual]}>{c.qual}</span></td>
                          <td>
                            <span className="eb" style={{ background: es.bg, color: es.color, border: "1px solid " + es.b }}>
                              {stages.find(s => s.id === c.etapa)?.emoji} {stages.find(s => s.id === c.etapa)?.label}
                            </span>
                          </td>
                          <td>
                            {m.length === 0 && !ch && !c.orcamento
                              ? <span style={{ color: "var(--q3)", fontSize: 11 }}>OK</span>
                              : <div style={{ display: "flex", gap: 3 }}>
                                {m.map(x => <span key={x} className="atag">⚠</span>)}
                                {ch === "orange" && <span className="co co-o">🟠</span>}
                                {ch === "red" && <span className="co co-r">🔴</span>}
                                {c.orcamento && <span className="atag">💰</span>}
                              </div>
                            }
                          </td>
                          <td><div className="tdd">{c.orig}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {/* Índice alfabético lateral */}
            <div style={{ width: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 0", background: "var(--dk2)", borderLeft: "1px solid var(--br)", gap: 1 }}>
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(l => {
                const usedL = new Set(sorted.map((c: any) => c.nome[0]?.toUpperCase()));
                return (
                  <button key={l} onClick={() => {
                    const rows = document.querySelectorAll("[data-letter]");
                    rows.forEach((r: any) => { if (r.dataset.letter === l) r.scrollIntoView({ behavior: "smooth", block: "start" }); });
                  }} style={{ fontSize: 9, fontWeight: 600, color: usedL.has(l) ? "var(--gold)" : "var(--tx3)", background: "none", border: "none", cursor: usedL.has(l) ? "pointer" : "default", padding: "1px 0", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>
                    {l}
                  </button>
                );
              })}
            </div>
            </div>{/* end linha tabela+índice */}
          </div>
          );
        })()}

        {/* ── AGENDA ── */}
        {tab === "agenda" && (
          <div className="agw" style={{ animation: "fadeIn .15s ease" }}>
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
              <button className="btn-new" style={{ marginLeft: "auto" }} onClick={() => { setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); setSessoesExtras([]); setAgForm({ title: "", desc: "", tipo: "cons_" + (artists[0]?.id || ""), date: new Date().toISOString().split("T")[0], start: 9, end: 11, sinal: "", sinalPago: false } as any); setShowAgForm(true); }}>+ Evento</button>
            </div>
            <div className="ag-leg">
              {artists.filter(a => a.ativo).map(a => (
                <div className="ag-li" key={a.id}>
                  <div className="ag-ld" style={{ background: a.cor }} />
                  {a.nome.split(" ")[0]}
                </div>
              ))}
              <div className="ag-li">
                <div className="ag-ld" style={{ background: "#C0392B" }} />
                Bloqueio
              </div>
              <div className="ag-li">
                <div className="ag-ld" style={{ background: "#E91E8C" }} />
                Piercing
              </div>
            </div>

            {agView === "month" && (
              <div className="ag-month">
                <div className="mg">
                  {WEEKDAYS.map(d => <div className="mdh" key={d}>{d}</div>)}
                  {mDates.map((item, i) => {
                    const ds = fmtDate(item.date); const evs = evOn(ds);
                    return (
                      <div key={i} className={"mday" + (item.cur ? "" : " om") + (ds === todayStr ? " today" : "")}
                        onClick={() => { setAgDate(item.date); setAgView("day"); }}>
                        <div className="mdn">{item.date.getDate()}</div>
                        {evs.slice(0, 3).map(e => {
                          const cliEv = e.cliente_id ? clients.find((c:any) => c.id === e.cliente_id) : null;
                          const anivHoje = cliEv ? isAniversHoje((cliEv as any).nascimento || "") : false;
                          return (
                            <div key={e.id} className="mev" style={{ background: getEventColor(e.tipo, artists, e.artista), cursor: "pointer", opacity: e.status === "concluido" ? 0.45 : 1 }}
                              onClick={ev => { ev.stopPropagation(); const eDate2 = e.date; const hoje2 = new Date(); hoje2.setHours(0,0,0,0); const evData2 = eDate2 ? new Date(eDate2 + "T12:00:00") : null; const isPast2 = evData2 && evData2 < hoje2; const semStatus2 = !e.status || e.status === ""; if (isPast2 && semStatus2 && !e.tipo?.startsWith("bloq")) { setConfirmPresenca({ event: e }); setPresencaMotivo(""); } else { setEditingEvent(e); setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.obs || "", servico: e.servico || "", bloqTitulo: e.titulo_bloqueio || "", valorPrevisto: e.valor_previsto ? Number(e.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinal: e.sinal_pago ? "" : (e.sinal ? Number(e.sinal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""), sinalPago: false } as any); const cv = e.cliente_id ? clients.find(c => c.id === e.cliente_id) || null : null; setAgClientVinc(cv); setAgClientSearch(""); setShowAgForm(true); } }}>
                              {e.status === "concluido" && "✅ "}{anivHoje && "🎂 "}{e.start}h {buildEventTitle(e, agEvents)}
                            </div>
                          );
                        })}
                        {evs.length > 3 && <div style={{ fontSize: 10, color: "var(--tx2)" }}>+{evs.length - 3}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {agView === "week" && (
              <div className="ag-week">
                <div className="wg">
                  <div className="wh" />
                  {wDates.map((d, i) => (
                    <div key={i} className="wh" style={{ color: fmtDate(d) === todayStr ? "var(--gold)" : "var(--tx2)" }}>
                      {WEEKDAYS[d.getDay()]} {d.getDate()}
                    </div>
                  ))}
                  {HOURS.map(h => [
                    <div key={"t" + h} className="wt" data-hora={h}>{h}:00</div>,
                    ...wDates.map((d, di) => {
                      const ds = fmtDate(d);
                      const evs = agEvents.filter(e => e.date === ds && e.start === h);
                      const occupied = agEvents.some(e => e.date === ds && e.start < h && e.end > h);
                      return (
                        <div key={h + "-" + di} className="wc" style={{ position: "relative", overflow: "visible" }}
                          onClick={() => { setAgDate(d); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); setSessoesExtras([]); setAgForm({ title: "", desc: "", tipo: "cons_" + (artists[0]?.id || ""), date: ds, start: h, end: h + 2, sinal: "", sinalPago: false } as any); setShowAgForm(true); }}>
                          {evs.map((e, ei) => {
                            const eStart = isNaN(e.start) || e.start == null ? 9 : Number(e.start);
                            const eEnd = isNaN(e.end) || e.end == null ? eStart + 2 : Number(e.end);
                            const duration = Math.max(eEnd - eStart, 1);
                            const total = evs.length;
                            const w = total > 1 ? `calc(${100/total}% - 3px)` : "calc(100% - 4px)";
                            const left = total > 1 ? `calc(${(ei * 100/total)}% + 1px)` : "2px";
                            return (
                              <div key={e.id} className="we" style={{
                                background: e.status === "cancelado" ? "#444" : e.tipo?.startsWith("bloq") ? "#2a2a2a" : getEventColor(e.tipo, artists, e.artista),
                                position: "absolute", left, width: w, top: 2,
                                height: (duration * 46) - 4 + "px",
                                zIndex: 10, borderRadius: 4, padding: "3px 5px",
                                overflow: "hidden", fontSize: 10, fontWeight: 600, color: e.status === "cancelado" ? "#aaa" : "#fff",
                                textShadow: e.status === "cancelado" ? "none" : "0 1px 2px rgba(0,0,0,.8), 0 0 4px rgba(0,0,0,.6)",
                                cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                opacity: e.status === "concluido" ? 0.45 : e.status === "cancelado" ? 0.55 : 1,
                                filter: e.status === "concluido" ? "saturate(0.4)" : "none",
                                textDecoration: e.status === "cancelado" ? "line-through" : "none"
                              }}
                              onClick={ev => { ev.stopPropagation(); const eDate2 = e.date; const hoje2 = new Date(); hoje2.setHours(0,0,0,0); const evData2 = eDate2 ? new Date(eDate2 + "T12:00:00") : null; const isPast2 = evData2 && evData2 < hoje2; const semStatus2 = !e.status || e.status === ""; if (isPast2 && semStatus2 && !e.tipo?.startsWith("bloq")) { setConfirmPresenca({ event: e }); setPresencaMotivo(""); } else { setEditingEvent(e); setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.obs || "", servico: e.servico || "", bloqTitulo: e.titulo_bloqueio || "", valorPrevisto: e.valor_previsto ? Number(e.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinal: e.sinal_pago ? "" : (e.sinal ? Number(e.sinal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""), sinalPago: false } as any); const cv = e.cliente_id ? clients.find(c => c.id === e.cliente_id) || null : null; setAgClientVinc(cv); setAgClientSearch(""); setShowAgForm(true); } }}>
                                <span style={{overflow:"hidden",flex:1,minWidth:0}}>
                                  {e.status === "concluido" && <span style={{ fontSize: 10, marginRight: 3 }}>✅</span>}
                                  {(() => {
                                    const cliEv = e.cliente_id ? clients.find((c:any) => c.id === e.cliente_id) : null;
                                    const anivHoje = cliEv ? isAniversHoje((cliEv as any).nascimento || "") : false;
                                    return anivHoje ? <span style={{ marginRight: 3 }}>🎂</span> : null;
                                  })()}
                                  {e.tipo?.startsWith("bloq")
                                    ? <span style={{ color: e.tipo === "bloq_geral" ? "#C0392B" : (artists.find((a:any) => a.id === e.tipo?.replace("bloq_",""))?.cor || "#888"), fontWeight: 700 }}>
                                        🔒 {e.tipo === "bloq_geral" ? "TODOS" : (artists.find((a:any) => a.id === e.tipo?.replace("bloq_",""))?.nome?.split(" ")[0] || "Bloqueio")}
                                        {e.titulo_bloqueio ? <><br/><span style={{ fontWeight: 600, fontSize: "0.95em" }}>{e.titulo_bloqueio}</span></> : null}
                                      </span>
                                    : buildEventTitle(e, agEvents)
                                  }<br/><span style={{opacity:.8}}>{e.start}h–{e.end}h</span>
                                </span>
                                <span onClick={ev => { ev.stopPropagation(); setConfirmExcluir(e); }} style={{ opacity: .8, cursor: "pointer", fontSize: 12, flexShrink: 0 }}>🗑</span>
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

            {agView === "day" && (
              <div className="ag-day">
                <div className="dg">
                  {HOURS.map(h => {
                    const ds = fmtDate(agDate);
                    const evs = agEvents.filter(e => e.date === ds && e.start === h);
                    const occupied = agEvents.some(e => e.date === ds && e.start < h && e.end > h);
                    return (
                      <div key={h} className="dr" data-hora={h}>
                        <div className="dtime">{h}:00</div>
                        <div className="dslot" style={{ position: "relative", minHeight: 46 }}
                          onClick={() => { if (!evs.length && !occupied) { setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); setSessoesExtras([]); setAgForm({ title: "", desc: "", tipo: "cons_" + (artists[0]?.id || ""), date: ds, start: h, end: h + 2, sinal: "", sinalPago: false } as any); setShowAgForm(true); } }}>
                          {evs.map(e => {
                            const eStart = isNaN(e.start) || e.start == null ? 9 : Number(e.start);
                            const eEnd = isNaN(e.end) || e.end == null ? eStart + 2 : Number(e.end);
                            const duration = Math.max(eEnd - eStart, 1);
                            return (
                              <div key={e.id} className="dev"
                                style={{
                                  background: e.status === "cancelado" ? "#444" : e.tipo?.startsWith("bloq") ? "#2a2a2a" : getEventColor(e.tipo, artists, e.artista),
                                  position: "absolute", left: 0, right: 0, top: 0,
                                  height: (duration * 46) - 4 + "px",
                                  zIndex: 5, borderRadius: 5, padding: "5px 10px",
                                  display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                  cursor: "pointer", color: "#fff",
                                  textShadow: e.status === "cancelado" ? "none" : "0 1px 2px rgba(0,0,0,.8), 0 0 4px rgba(0,0,0,.6)",
                                  opacity: e.status === "concluido" ? 0.45 : e.status === "cancelado" ? 0.55 : 1,
                                  filter: e.status === "concluido" ? "saturate(0.4)" : "none"
                                }}
                                onClick={ev => { ev.stopPropagation(); setEditingEvent(e); setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.obs || "", servico: e.servico || "", bloqTitulo: e.titulo_bloqueio || "", valorPrevisto: e.valor_previsto ? Number(e.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinal: e.sinal_pago ? "" : (e.sinal ? Number(e.sinal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""), sinalPago: false } as any); const cv = e.cliente_id ? clients.find(c => c.id === e.cliente_id) || null : null; setAgClientVinc(cv); setAgClientSearch(""); setShowAgForm(true); }}>
                                <span style={{ fontWeight: 600 }}>
                                  {e.status === "concluido" && "✅ "}
                                  {(() => {
                                    const cliEv = e.cliente_id ? clients.find((c:any) => c.id === e.cliente_id) : null;
                                    return cliEv && isAniversHoje((cliEv as any).nascimento || "") ? "🎂 " : "";
                                  })()}
                                  {e.tipo?.startsWith("bloq")
                                    ? <span style={{ color: e.tipo === "bloq_geral" ? "#C0392B" : (artists.find((a:any) => a.id === e.tipo?.replace("bloq_",""))?.cor || "#888") }}>
                                        🔒 {e.tipo === "bloq_geral" ? "TODOS" : (artists.find((a:any) => a.id === e.tipo?.replace("bloq_",""))?.nome?.split(" ")[0] || "Bloqueio")}
                                        {e.titulo_bloqueio ? <><br/><span style={{ fontWeight: 600, fontSize: "0.95em" }}>{e.titulo_bloqueio}</span></> : null}
                                      </span>
                                    : buildEventTitle(e, agEvents)
                                  } · {e.start}h–{e.end}h
                                </span>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <span style={{ opacity: .8, cursor: "pointer", fontSize: 13 }}
                                    onClick={ev => { ev.stopPropagation(); setEditingEvent(e); setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.obs || "", servico: e.servico || "", bloqTitulo: e.titulo_bloqueio || "", valorPrevisto: e.valor_previsto ? Number(e.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinal: e.sinal_pago ? "" : (e.sinal ? Number(e.sinal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""), sinalPago: false } as any); const cv = e.cliente_id ? clients.find(c => c.id === e.cliente_id) || null : null; setAgClientVinc(cv); setAgClientSearch(""); setShowAgForm(true); }}>✏️</span>
                                  <span style={{ opacity: .8, cursor: "pointer", fontSize: 13 }}
                                    onClick={ev => { ev.stopPropagation(); setConfirmExcluir(e); }}>🗑</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FINANCEIRO ── */}
        {tab === "financeiro" && (() => {
          // ── helpers ──
          const fmtR = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const parseDateISO = (d: string) => { if (!d) return ""; if (d.includes("-")) return d.slice(0,7); const p = d.split("/"); return p.length === 3 ? p[2]+"-"+p[1].padStart(2,"0") : ""; };
          const categorias = saidaCats;
          const catEntrada = ["sessao","sinal","prolabore","outro"];

          // ── entradas do financeiro (tudo de val_a) ──
          const entradas = fin.map(f => ({ ...f, tipo: f.tipo || "entrada", categoria: f.categoria || "sessao", descricao: f.descricao || f.cliente_nome || "", forma_pgto: f.forma_pgto || f.pgto || "", competencia: f.competencia || parseDateISO(f.data) || finFiltroMes }));

          // ── filtros ──
          const finFiltrado = entradas.filter(f => {
            const mes = parseDateISO(f.data) || f.competencia || "";
            const mOk = !finFiltroMes || mes.startsWith(finFiltroMes);
            const aOk = finFiltroArtista === "todos" || f.artista === finFiltroArtista || f.artista_id === finFiltroArtista;
            const tOk = finFiltroTipo === "todos" || f.tipo === finFiltroTipo || (finFiltroTipo === "entrada" && (!f.tipo || f.tipo === "entrada")) || (finFiltroTipo === "saida" && f.tipo === "saida");
            return mOk && aOk && tOk;
          });
          const saidasFiltradas = saidas.filter(s => {
            const mes = parseDateISO(s.data);
            return !finFiltroMes || mes.startsWith(finFiltroMes);
          });

          // ── totais ──
          const totalEntradas = finFiltrado.filter(f => (!f.tipo || f.tipo === "entrada") && !f.is_permuta).reduce((s, f) => s + (Number(f.val_a) || 0), 0);
          const totalPermuta = finFiltrado.filter(f => f.is_permuta).reduce((s, f) => s + (Number(f.val_a) || 0), 0);
          const totalSaidas = saidasFiltradas.reduce((s, x) => s + (Number(x.valor) || 0), 0);
          const totalRepasses = finFiltrado.filter(f => (!f.tipo || f.tipo === "entrada") && !f.is_permuta).reduce((s, f) => s + ((Number(f.val_a) || 0) * (Number(f.com_sess) || 0) / 100), 0);
          const saldoLiquido = totalEntradas - totalSaidas - totalRepasses;
          const progressoMeta = Math.min(totalEntradas / metaMensal * 100, 100);
          const diaAtual = new Date().getDate();
          const projecao = diaAtual > 0 ? Math.round((totalEntradas / diaAtual) * 30) : 0;

          // ── depreciação mensal total ──
          const deprMensal = equipamentos.filter(e => e.ativo !== false).reduce((s, e) => s + (Number(e.valor_aquisicao) || 0) / (Number(e.vida_util_meses) || 48), 0);

          // ── DRE ──
          const receitaBruta = totalEntradas;
          const custoVariavel = totalSaidas * 0.4;
          const custoFixo = totalSaidas * 0.6;
          const lucroAntesProlabore = receitaBruta - totalRepasses - totalSaidas - deprMensal;
          const prolabore = finFiltrado.filter(f => f.categoria === "prolabore").reduce((s, f) => s + (Number(f.val_a) || 0), 0);
          const lucroLiquido = lucroAntesProlabore - prolabore;

          return (
          <div className="fw" style={{ animation: "fadeIn .15s ease" }}>

            {/* ── SUB-ABAS ── */}
            <div style={{ display: "flex", gap: 3, padding: "0 0 2px", borderBottom: "1px solid var(--br)", marginBottom: 4 }}>
              {([["livrocaixa","📒 Livro-Caixa"],["dre","📊 DRE"],["equipamentos","🔧 Equipamentos"]] as [any,string][]).map(([id, lbl]) => (
                <button key={id} onClick={() => setFinAbaAtiva(id)}
                  style={{ padding: "7px 16px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", borderRadius: "6px 6px 0 0", fontFamily: "'DM Sans',sans-serif",
                    background: finAbaAtiva === id ? "var(--gold-d)" : "var(--dk3)",
                    color: finAbaAtiva === id ? "var(--gold)" : "var(--tx2)",
                    borderBottom: finAbaAtiva === id ? "2px solid var(--gold)" : "2px solid transparent" }}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* ── FILTROS ── */}
            {finAbaAtiva !== "equipamentos" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", padding: "10px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--tx3)" }}>Mês</span>
                  <input type="month" value={finFiltroMes} onChange={e => setFinFiltroMes(e.target.value)}
                    style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 9px", fontSize: 12, color: "var(--tx)", outline: "none" }} />
                </div>
                <button
                  onClick={enviarRelatorioContador}
                  disabled={enviandoRelatorio}
                  style={{ background: enviandoRelatorio ? "var(--dk3)" : "rgba(201,168,76,.12)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {enviandoRelatorio ? "⏳ Enviando..." : "📊 Enviar ao Contador"}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--tx3)" }}>Profissional</span>
                  <select value={finFiltroArtista} onChange={e => setFinFiltroArtista(e.target.value)}
                    style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 9px", fontSize: 12, color: "var(--tx)", outline: "none" }}>
                    <option value="todos">Todos</option>
                    {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome.split(" ")[0]}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--tx3)" }}>Tipo</span>
                  <select value={finFiltroTipo} onChange={e => setFinFiltroTipo(e.target.value)}
                    style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 9px", fontSize: 12, color: "var(--tx)", outline: "none" }}>
                    <option value="todos">Todos</option>
                    <option value="entrada">Entradas</option>
                    <option value="saida">Saídas</option>
                  </select>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--tx3)" }}>Meta R$</span>
                    <input type="text" value={metaMensal ? Number(metaMensal).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ""}
                      placeholder="0"
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, "");
                        const num = raw ? Number(raw) : 0;
                        setMetaMensal(num);
                      }}
                      style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 9px", fontSize: 12, color: "var(--tx)", outline: "none", width: 110 }} />
                  </div>
                </div>
              </div>
            )}

            {/* ════ LIVRO-CAIXA ════ */}
            {finAbaAtiva === "livrocaixa" && (<>

              {/* cards resumo */}
              <div className="fsum" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
                {(() => {
                  const totalAReceber = clients.reduce((acc: number, c: any) => {
                    const projs = (c.projetos || []).filter((p: any) => p.status !== "concluido" && p.status !== "cancelado");
                    const totalProj = projs.reduce((s: number, p: any) => s + (Number(p.valorTotal) || 0), 0);
                    const totalPago = fin.filter((f: any) => f.cliente_id === c.id && (!f.tipo || f.tipo === "entrada") && !f.is_permuta).reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
                    return acc + Math.max(totalProj - totalPago, 0);
                  }, 0);
                  return [
                    { l: "Entradas", v: fmtR(totalEntradas), s: "no período filtrado", c: "var(--q3)" },
                    { l: "Saídas", v: fmtR(totalSaidas), s: "despesas do estúdio", c: "var(--q1)" },
                    { l: "Comissões", v: fmtR(totalRepasses), s: "a pagar aos artistas", c: "var(--ab)" },
                    { l: "Saldo Líquido", v: fmtR(saldoLiquido), s: "entradas − saídas − repasses", c: saldoLiquido >= 0 ? "var(--q3)" : "var(--q1)" },
                    { l: "A Receber", v: fmtR(totalAReceber), s: "saldos em aberto dos clientes", c: "var(--gold)" },
                    { l: "Projeção Total", v: fmtR(saldoLiquido + totalAReceber), s: "líquido + a receber", c: (saldoLiquido + totalAReceber) >= 0 ? "var(--q3)" : "var(--q1)" },
                  ];
                })().map((s, i) => (
                  <div className="fsc" key={i}>
                    <div className="fsl">{s.l}</div>
                    <div className="fsv" style={{ color: s.c }}>{s.v}</div>
                    <div className="fss">{s.s}</div>
                  </div>
                ))}
              </div>

              {/* card permutas */}
              {totalPermuta > 0 && (
                <div style={{ background: "rgba(155,89,182,.08)", border: "1px solid rgba(155,89,182,.25)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, color: "#9B59B6", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>Permutas</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#9B59B6", marginTop: 4 }}>{"R$ " + totalPermuta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 11, color: "rgba(155,89,182,.7)", marginTop: 3 }}>Não contabilizado no caixa</div>
                </div>
              )}

              {/* meta mensal */}
              <div className="ftable">
                <div className="fth">Meta Mensal</div>
                <div style={{ padding: "13px 15px" }}>
                  {metaMensal === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--tx3)", fontStyle: "italic", padding: "8px 0" }}>Meta não definida — configure em Configurações →</div>
                  ) : (<>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--tx2)" }}>{fmtR(totalEntradas)} de {fmtR(metaMensal)}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: progressoMeta >= 100 ? "var(--q3)" : "var(--gold)" }}>{Math.round(progressoMeta)}%</span>
                  </div>
                  <div style={{ width: "100%", background: "var(--dk4)", borderRadius: 4, height: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 4, background: progressoMeta >= 100 ? "var(--q3)" : "var(--gold)", width: progressoMeta + "%", transition: "width .4s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--tx3)" }}>Projeção: <strong style={{ color: "var(--tx)" }}>{fmtR(projecao)}</strong></span>
                    <span style={{ fontSize: 11, color: "var(--tx3)" }}>Faltam: <strong style={{ color: "var(--gold)" }}>{fmtR(Math.max(metaMensal - totalEntradas, 0))}</strong></span>
                  </div></>)}
                </div>
              </div>

              {/* desempenho artistas */}
              <div className="ftable">
                <div className="fth">Desempenho por Profissional</div>
                <div style={{ padding: "13px 15px", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
                  {artists.filter(a => a.ativo).map(a => {
                    const ss = finFiltrado.filter(f => {
                      const fArt = (f.artista || f.artista_id || "").toLowerCase();
                      return (fArt === a.id || fArt === a.id?.toLowerCase() || a.nome?.toLowerCase().startsWith(fArt) || fArt === a.nome?.split(" ")[0]?.toLowerCase()) && (!f.tipo || f.tipo === "entrada");
                    });
                    const fat = ss.reduce((s, f) => s + (Number(f.val_a) || 0), 0);
                    const repasse = ss.reduce((s, f) => s + ((Number(f.val_a) || 0) * (Number(f.com_sess) || 0) / 100), 0);
                    const ticket = ss.length > 0 ? Math.round(fat / ss.length) : 0;
                    return (
                      <div key={a.id} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "11px 13px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ ...aStyle(a.id), fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, padding: "2px 8px", borderRadius: 5 }}>{a.nome.split(" ")[0]}</span>
                          <span style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase" }}>{a.role}</span>
                        </div>
                        {[
                          { l: "Sessões", v: ss.length },
                          { l: "Faturamento", v: fmtR(fat) },
                          { l: "Ticket Médio", v: ticket > 0 ? fmtR(ticket) : "—" },
                          { l: "Repasse", v: fmtR(repasse) },
                          { l: "Comissão", v: a.com + "%" },
                        ].map((f, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--br)", fontSize: 11 }}>
                            <span style={{ color: "var(--tx2)" }}>{f.l}</span>
                            <span style={{ color: "var(--tx)", fontWeight: 600 }}>{f.v}</span>
                          </div>
                        ))}
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Meta mensal</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 10, color: "var(--tx3)" }}>R$</span>
                              <input type="number" value={a.meta || 0}
                                onChange={async e => {
                                  const v = Number(e.target.value);
                                  setArtists(p => p.map(x => x.id === a.id ? { ...x, meta: v } : x));
                                  await sb.from("artistas").update({ meta: v }).eq("id", a.id);
                                }}
                                style={{ width: 70, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 4, padding: "2px 6px", fontSize: 11, color: "var(--tx)", outline: "none" }} />
                            </div>
                          </div>
                          {(a.meta || 0) > 0 && (
                            <div style={{ height: 4, background: "var(--dk4)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: 4, borderRadius: 2, background: fat >= (a.meta || 0) ? "#27AE60" : "var(--gold)", width: Math.min(fat / (a.meta || 1) * 100, 100) + "%" }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* entradas */}
              <div className="ftable">
                <div className="fth" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Entradas</span>
                  <button className="btn-new" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setShowEntradaForm(true)}>+ Lançar Manual</button>
                </div>
                <table className="ft">
                  <thead><tr><th>Descrição</th><th>Profissional</th><th>Data</th><th>Valor</th><th>Saldo Dev.</th><th>Forma</th><th>Taxa</th><th>Categoria</th><th>Com %</th><th>Repasse</th><th>Status</th></tr></thead>
                  <tbody>
                    {finFiltrado.filter(f => !f.tipo || f.tipo === "entrada").length === 0 && (
                      <tr><td colSpan={10} style={{ textAlign: "center", color: "var(--tx3)", fontSize: 12, padding: 16, fontStyle: "italic" }}>Nenhuma entrada no período.</td></tr>
                    )}
                    {finFiltrado.filter(f => !f.tipo || f.tipo === "entrada").map((f, fi) => {
                      const rec = (Number(f.val_a) || 0) * (Number(f.com_sess) || 0) / 100;
                      const dataFmt = f.data ? (f.data.includes("-") ? f.data.split("-").reverse().join("/") : f.data) : "—";
                      const cli = clients.find(c => c.id === f.cliente_id);
                      const proj = (cli?.projetos || []).find((p: any) => p.status !== "cancelado");
                      const valorTotal = Number(proj?.valorTotal) || 0;
                      const entradasCliente = fin.filter((x: any) => x.cliente_id === f.cliente_id && (!x.tipo || x.tipo === "entrada"));
                      const idxNoBanco = entradasCliente.findIndex((x: any) => x.id === f.id);
                      const totalPagoAte = entradasCliente.slice(0, idxNoBanco + 1).reduce((s: number, x: any) => s + (Number(x.val_a) || 0), 0);
                      const saldoDev = Math.max(valorTotal - totalPagoAte, 0);
                      return (
                        <tr key={f.id}>
                          <td style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13 }}>{f.descricao || f.cliente_nome || "—"}</td>
                          <td><span style={aStyle(f.artista || f.artista_id)}>{aName(f.artista || f.artista_id).split(" ")[0]}</span></td>
                          <td style={{ fontSize: 11, color: "var(--tx2)" }}>{dataFmt}</td>
                          <td style={{ fontWeight: 600, color: "var(--q3)" }}>{fmtR(Number(f.val_a) || 0)}</td>
                          <td style={{ fontSize: 11, fontWeight: 600, color: saldoDev > 0 ? "var(--gold)" : "#27AE60" }}>
                            {valorTotal > 0 ? (saldoDev > 0 ? fmtR(saldoDev) : "✅") : "—"}
                          </td>
                          <td style={{ fontSize: 11 }}><span style={{ background: f.is_permuta ? "rgba(155,89,182,.15)" : "rgba(201,168,76,.1)", color: f.is_permuta ? "#9B59B6" : "var(--gold)", border: "1px solid " + (f.is_permuta ? "rgba(155,89,182,.3)" : "rgba(201,168,76,.2)"), borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>{f.forma_pgto || f.pgto || "—"}</span></td>
                          <td style={{ fontSize: 11 }}>
                            {(f.taxa_maquina > 0) ? (
                              <span style={{ color: "#E74C3C" }}>
                                {f.taxa_maquina}%
                                <span style={{ display: "block", fontSize: 10, color: "var(--tx3)" }}>
                                  {"−" + fmtR((Number(f.val_a) || 0) - (Number(f.val_c) || Number(f.val_a) || 0))}
                                </span>
                              </span>
                            ) : "—"}
                          </td>
                          <td><span style={{ fontSize: 10, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 3, padding: "2px 6px", color: "var(--tx2)" }}>{f.categoria || "sessao"}</span></td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <input className="ci" type="number" min={0} max={100} value={f.com_sess || 0}
                                onChange={async e => {
                                  const novo = Number(e.target.value);
                                  setFin(p => p.map((x: any) => x.id === f.id ? { ...x, com_sess: novo } : x));
                                  await sb.from("financeiro").update({ com_sess: novo }).eq("id", f.id);
                                }} />
                              <span style={{ fontSize: 11, color: "var(--tx2)" }}>%</span>
                            </div>
                          </td>
                          <td style={{ color: "var(--q3)", fontWeight: 700, fontFamily: "'Cormorant Garamond',serif", fontSize: 13 }}>
                            {f.categoria === "piercing" ? (
                              <span style={{ fontSize: 11 }}>
                                {f.val_aplicador > 0 ? "Aplic: " + fmtR(f.val_aplicador) : "—"}
                                {f.val_studio > 0 ? " | Est: " + fmtR(f.val_studio) : ""}
                              </span>
                            ) : f.categoria === "sinal" ? "—" : (rec > 0 ? fmtR(rec) : "—")}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                              <span className="dok">OK</span>
                              <button onClick={async () => {
                                setFin(p => p.filter((x: any) => x.id !== f.id));
                                await dbDelete("financeiro", f.id);
                              }} style={{ background: "none", border: "none", color: "var(--q1)", cursor: "pointer", fontSize: 13, padding: "0 2px" }} title="Excluir">✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* saídas */}
              <div className="ftable">
                <div className="fth" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Saídas e Despesas</span>
                  <button className="btn-new" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setShowSaidaForm(true)}>+ Lançar</button>
                <button onClick={() => setShowSaidaCatsModal(true)} style={{ background: "none", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "var(--tx3)", cursor: "pointer" }}>⚙️ Categorias</button>
                </div>
                <table className="ft">
                  <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Valor</th><th></th></tr></thead>
                  <tbody>
                    {saidasFiltradas.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--tx3)", fontSize: 12, padding: 16, fontStyle: "italic" }}>Nenhuma saída no período.</td></tr>}
                    {saidasFiltradas.map(s => (
                      <tr key={s.id}>
                        <td>{s.desc || s.descricao}</td>
                        <td><span style={{ fontSize: 10, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 3, padding: "2px 6px", color: "var(--tx2)" }}>{s.categoria}</span></td>
                        <td style={{ fontSize: 11, color: "var(--tx2)" }}>{s.data}</td>
                        <td style={{ fontWeight: 600, color: "var(--q1)" }}>{fmtR(Number(s.valor) || 0)}</td>
                        <td>
                          <button className="btn-sm" style={{ fontSize: 10, color: "var(--q1)" }} onClick={async () => {
                            setSaidas(p => p.filter(x => x.id !== s.id));
                            await dbDelete("saidas", s.id);
                          }}>Remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: "10px 15px", background: "var(--dk3)", display: "flex", justifyContent: "flex-end", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--tx2)" }}>Total saídas:</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--q1)", fontFamily: "'Cormorant Garamond',serif" }}>{fmtR(totalSaidas)}</span>
                </div>
              </div>

              {/* origem faturamento e dias rentáveis */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="ftable">
                  <div className="fth">Origem do Faturamento</div>
                  <div style={{ padding: "13px 15px" }}>
                    {(() => {
                      const m: Record<string,number> = {};
                      finFiltrado.filter(f => !f.tipo || f.tipo === "entrada").forEach(f => {
                        const c = clients.find(x => x.nome === (f.cliente_nome || f.cliente));
                        const orig = c?.orig || "Não informado";
                        m[orig] = (m[orig] || 0) + (Number(f.val_a) || 0);
                      });
                      const max = Math.max(...Object.values(m), 1);
                      return Object.entries(m).sort((a: any, b: any) => b[1] - a[1]).map(([o, v]: any) => (
                        <div className="br-row" key={o}>
                          <div className="br-lbl" style={{ fontSize: 10 }}>{o}</div>
                          <div className="br-trk"><div className="br-fil" style={{ width: (v / max * 100) + "%", background: "var(--gold)" }} /></div>
                          <div style={{ fontSize: 11, color: "var(--tx)", width: 70, textAlign: "right", flexShrink: 0 }}>{fmtR(v)}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                <div className="ftable">
                  <div className="fth">Dias Mais Rentáveis</div>
                  <div style={{ padding: "13px 15px" }}>
                    {(() => {
                      const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];
                      const m: Record<string,number> = {};
                      finFiltrado.filter(f => !f.tipo || f.tipo === "entrada").forEach(f => {
                        if (!f.data) return;
                        const d = f.data.includes("-") ? new Date(f.data + "T12:00:00") : (() => { const p = f.data.split("/"); return new Date(Number(p[2]), Number(p[1])-1, Number(p[0])); })();
                        const dia = dias[d.getDay()];
                        m[dia] = (m[dia] || 0) + (Number(f.val_a) || 0);
                      });
                      const max = Math.max(...Object.values(m), 1);
                      return dias.map(dia => (
                        <div className="br-row" key={dia}>
                          <div className="br-lbl" style={{ fontSize: 11 }}>{dia}</div>
                          <div className="br-trk"><div className="br-fil" style={{ width: ((m[dia] || 0) / max * 100) + "%", background: "var(--ab)" }} /></div>
                          <div style={{ fontSize: 11, color: "var(--tx)", width: 70, textAlign: "right", flexShrink: 0 }}>{m[dia] ? fmtR(m[dia]) : "—"}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.2)", borderRadius: 8, padding: "11px 15px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>🧾</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>Nota Fiscal</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>Integração com emissão de notas em breve. A Aura vinculará o número da NF a cada sessão automaticamente.</div>
                </div>
              </div>

            </>)}

            {/* ════ DRE ════ */}
            {finAbaAtiva === "dre" && (<>
              <div className="ftable">
                <div className="fth" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Demonstrativo de Resultado — {finFiltroMes}</span>
                  <button onClick={() => {
                    const greenClass = lucroAntesProlabore >= 0 ? "green" : "red";
                    const lucroClass = lucroLiquido >= 0 ? "green" : "red";
                    const conteudo = [
                      '<html><head><title>DRE ' + finFiltroMes + '</title>',
                      '<style>body{font-family:sans-serif;padding:32px;color:#111;}h1{font-size:20px;margin-bottom:4px;}h2{font-size:13px;color:#666;margin-bottom:24px;font-weight:400;}table{width:100%;border-collapse:collapse;}tr{border-bottom:1px solid #eee;}td{padding:8px 4px;font-size:13px;}td:last-child{text-align:right;font-weight:600;}.bold{font-weight:700;font-size:15px;}.sep{border-bottom:2px solid #ccc;}.green{color:#27AE60;}.red{color:#C0392B;}.footer{margin-top:32px;font-size:11px;color:#aaa;}</style></head>',
                      '<body>',
                      '<h1>' + studioName + ' — DRE</h1>',
                      '<h2>Competência: ' + finFiltroMes + ' · Gerado em ' + new Date().toLocaleDateString("pt-BR") + '</h2>',
                      '<table>',
                      '<tr><td>Receita Bruta</td><td class="green bold">' + fmtR(receitaBruta) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Repasses Profissionais</td><td class="red">' + fmtR(totalRepasses) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Depreciacao Equipamentos</td><td class="red">' + fmtR(deprMensal) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Despesas Operacionais</td><td class="red">' + fmtR(totalSaidas) + '</td></tr>',
                      '<tr class="sep"><td class="bold">Resultado Antes do Pro-Labore</td><td class="' + greenClass + ' bold">' + fmtR(lucroAntesProlabore) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Pro-Labore</td><td class="red">' + fmtR(prolabore) + '</td></tr>',
                      '<tr class="sep"><td class="bold">Lucro Liquido</td><td class="' + lucroClass + ' bold">' + fmtR(lucroLiquido) + '</td></tr>',
                      '</table>',
                      '<div class="footer">INK SYSTEM · ' + studioName + (cnpj ? ' · CNPJ ' + cnpj : '') + '</div>',
                      '</body></html>'
                    ].join('\n');
                    const w = window.open("", "_blank");
                    if (w) { w.document.write(conteudo); w.document.close(); setTimeout(() => w.print(), 400); }
                  }} style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    📄 Exportar PDF
                  </button>
                </div>
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { l: "Receita Bruta", v: receitaBruta, bold: true, color: "var(--q3)" },
                    { l: "  (−) Repasses Profissionais", v: -totalRepasses, color: "var(--q1)" },
                    { l: "  (−) Depreciação Equipamentos", v: -deprMensal, color: "var(--q1)" },
                    { l: "  (−) Despesas Operacionais", v: -totalSaidas, color: "var(--q1)" },
                    { l: "Resultado Antes do Pró-Labore", v: lucroAntesProlabore, bold: true, color: lucroAntesProlabore >= 0 ? "var(--q3)" : "var(--q1)", sep: true },
                    { l: "  (−) Pró-Labore", v: -prolabore, color: "var(--q1)" },
                    { l: "Lucro Líquido", v: lucroLiquido, bold: true, color: lucroLiquido >= 0 ? "var(--q3)" : "var(--q1)", sep: true },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: row.sep ? "2px solid var(--br)" : "1px solid rgba(255,255,255,.04)" }}>
                      <span style={{ fontSize: 13, color: row.bold ? "var(--tx)" : "var(--tx2)", fontWeight: row.bold ? 700 : 400, fontFamily: row.bold ? "'Cormorant Garamond',serif" : "inherit" }}>{row.l}</span>
                      <span style={{ fontSize: row.bold ? 17 : 13, fontWeight: row.bold ? 700 : 600, color: row.color, fontFamily: row.bold ? "'Cormorant Garamond',serif" : "inherit" }}>{fmtR(Math.abs(row.v))}{row.v < 0 ? " (−)" : ""}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Repasses por Profissional</div>
                    {artists.map(a => {
                      const lancArtista = finFiltrado.filter((f: any) => (f.artista === a.id || f.artista_id === a.id) && (!f.tipo || f.tipo === "entrada"));
                      const totalBruto = lancArtista.reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
                      const repasse = lancArtista.reduce((s: number, f: any) => s + ((Number(f.val_a) || 0) * ((Number(f.com_sess) || 0) / 100)), 0);
                      if (totalBruto <= 0) return null;
                      return (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--dk3)", borderRadius: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, ...aStyle(a.id) }}>{a.nome}</span>
                          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                            <span style={{ color: "var(--tx3)" }}>Gerou: <strong style={{ color: "var(--tx)" }}>{fmtR(totalBruto)}</strong></span>
                            <span style={{ color: "var(--tx3)" }}>Repasse: <strong style={{ color: "var(--q1)" }}>{fmtR(repasse)}</strong></span>
                            <span style={{ color: "var(--tx3)" }}>Comissão: <strong style={{ color: "var(--tx2)" }}>{a.com || 0}%</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="ftable">
                  <div className="fth">Saídas por Categoria</div>
                  <div style={{ padding: "13px 15px" }}>
                    {(() => {
                      const m: Record<string,number> = {};
                      saidasFiltradas.forEach(s => { m[s.categoria] = (m[s.categoria] || 0) + (Number(s.valor) || 0); });
                      const max = Math.max(...Object.values(m), 1);
                      return Object.entries(m).sort((a: any,b: any) => b[1]-a[1]).map(([cat, val]: any) => (
                        <div className="br-row" key={cat}>
                          <div className="br-lbl">{cat}</div>
                          <div className="br-trk"><div className="br-fil" style={{ width: (val/max*100)+"%", background: "var(--q1)" }} /></div>
                          <div style={{ fontSize: 11, color: "var(--tx)", width: 80, textAlign: "right", flexShrink: 0 }}>{fmtR(val)}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                <div className="ftable">
                  <div className="fth">Margem por Profissional</div>
                  <div style={{ padding: "13px 15px" }}>
                    {artists.filter(a => a.ativo).map(a => {
                      const fat = finFiltrado.filter(f => (f.artista === a.id || f.artista_id === a.id) && (!f.tipo || f.tipo === "entrada")).reduce((s, f) => s + (Number(f.val_a)||0), 0);
                      const rep = finFiltrado.filter(f => (f.artista === a.id || f.artista_id === a.id) && (!f.tipo || f.tipo === "entrada")).reduce((s, f) => s + ((Number(f.val_a)||0) * (Number(f.com_sess)||0) / 100), 0);
                      const margem = fat > 0 ? Math.round(((fat - rep) / fat) * 100) : 0;
                      return (
                        <div key={a.id} className="br-row">
                          <div className="br-lbl"><span style={aStyle(a.id)}>{a.nome.split(" ")[0]}</span></div>
                          <div className="br-trk"><div className="br-fil" style={{ width: margem+"%", background: a.cor || "var(--gold)" }} /></div>
                          <div style={{ fontSize: 11, color: "var(--tx)", width: 50, textAlign: "right", flexShrink: 0 }}>{margem}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(74,158,191,.08)", border: "1px solid rgba(74,158,191,.2)", borderRadius: 8, padding: "13px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ab)", marginBottom: 6 }}>💡 Para seu contador</div>
                <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.7 }}>
                  Este DRE é gerado automaticamente com base nos lançamentos do mês. Exporte os dados mensalmente e entregue ao seu contador junto com as notas fiscais emitidas.
                </div>
              </div>


            </>)}

            {/* ════ DRE ════ */}
            {finAbaAtiva === "dre" && (<>
              <div className="ftable">
                <div className="fth" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Demonstrativo de Resultado — {finFiltroMes}</span>
                  <button onClick={() => {
                    const greenClass = lucroAntesProlabore >= 0 ? "green" : "red";
                    const lucroClass = lucroLiquido >= 0 ? "green" : "red";
                    const conteudo = [
                      '<html><head><title>DRE ' + finFiltroMes + '</title>',
                      '<style>body{font-family:sans-serif;padding:32px;color:#111;}h1{font-size:20px;margin-bottom:4px;}h2{font-size:13px;color:#666;margin-bottom:24px;font-weight:400;}table{width:100%;border-collapse:collapse;}tr{border-bottom:1px solid #eee;}td{padding:8px 4px;font-size:13px;}td:last-child{text-align:right;font-weight:600;}.bold{font-weight:700;font-size:15px;}.sep{border-bottom:2px solid #ccc;}.green{color:#27AE60;}.red{color:#C0392B;}.footer{margin-top:32px;font-size:11px;color:#aaa;}</style></head>',
                      '<body>',
                      '<h1>' + studioName + ' — DRE</h1>',
                      '<h2>Competência: ' + finFiltroMes + ' · Gerado em ' + new Date().toLocaleDateString("pt-BR") + '</h2>',
                      '<table>',
                      '<tr><td>Receita Bruta</td><td class="green bold">' + fmtR(receitaBruta) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Repasses Profissionais</td><td class="red">' + fmtR(totalRepasses) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Depreciacao Equipamentos</td><td class="red">' + fmtR(deprMensal) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Despesas Operacionais</td><td class="red">' + fmtR(totalSaidas) + '</td></tr>',
                      '<tr class="sep"><td class="bold">Resultado Antes do Pro-Labore</td><td class="' + greenClass + ' bold">' + fmtR(lucroAntesProlabore) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Pro-Labore</td><td class="red">' + fmtR(prolabore) + '</td></tr>',
                      '<tr class="sep"><td class="bold">Lucro Liquido</td><td class="' + lucroClass + ' bold">' + fmtR(lucroLiquido) + '</td></tr>',
                      '</table>',
                      '<div class="footer">INK SYSTEM · ' + studioName + (cnpj ? ' · CNPJ ' + cnpj : '') + '</div>',
                      '</body></html>'
                    ].join('\n');
                    const w = window.open("", "_blank");
                    if (w) { w.document.write(conteudo); w.document.close(); setTimeout(() => w.print(), 400); }
                  }} style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    📄 Exportar PDF
                  </button>
                </div>
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { l: "Receita Bruta", v: receitaBruta, bold: true, color: "var(--q3)" },
                    { l: "  (−) Repasses Profissionais", v: -totalRepasses, color: "var(--q1)" },
                    { l: "  (−) Depreciação Equipamentos", v: -deprMensal, color: "var(--q1)" },
                    { l: "  (−) Despesas Operacionais", v: -totalSaidas, color: "var(--q1)" },
                    { l: "Resultado Antes do Pró-Labore", v: lucroAntesProlabore, bold: true, color: lucroAntesProlabore >= 0 ? "var(--q3)" : "var(--q1)", sep: true },
                    { l: "  (−) Pró-Labore", v: -prolabore, color: "var(--q1)" },
                    { l: "Lucro Líquido", v: lucroLiquido, bold: true, color: lucroLiquido >= 0 ? "var(--q3)" : "var(--q1)", sep: true },
                  ].map((row, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: row.sep ? "2px solid var(--br)" : "1px solid rgba(255,255,255,.04)" }}>
                      <span style={{ fontSize: 13, color: row.bold ? "var(--tx)" : "var(--tx2)", fontWeight: row.bold ? 700 : 400, fontFamily: row.bold ? "'Cormorant Garamond',serif" : "inherit" }}>{row.l}</span>
                      <span style={{ fontSize: row.bold ? 17 : 13, fontWeight: row.bold ? 700 : 600, color: row.color, fontFamily: row.bold ? "'Cormorant Garamond',serif" : "inherit" }}>{fmtR(Math.abs(row.v))}{row.v < 0 ? " (−)" : ""}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Repasses por Profissional</div>
                    {artists.map(a => {
                      const lancArtista = finFiltrado.filter((f: any) => (f.artista === a.id || f.artista_id === a.id) && (!f.tipo || f.tipo === "entrada"));
                      const totalBruto = lancArtista.reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
                      const repasse = lancArtista.reduce((s: number, f: any) => s + ((Number(f.val_a) || 0) * ((Number(f.com_sess) || 0) / 100)), 0);
                      if (totalBruto <= 0) return null;
                      return (
                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--dk3)", borderRadius: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, ...aStyle(a.id) }}>{a.nome}</span>
                          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                            <span style={{ color: "var(--tx3)" }}>Gerou: <strong style={{ color: "var(--tx)" }}>{fmtR(totalBruto)}</strong></span>
                            <span style={{ color: "var(--tx3)" }}>Repasse: <strong style={{ color: "var(--q1)" }}>{fmtR(repasse)}</strong></span>
                            <span style={{ color: "var(--tx3)" }}>Comissão: <strong style={{ color: "var(--tx2)" }}>{a.com || 0}%</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="ftable">
                  <div className="fth">Saídas por Categoria</div>
                  <div style={{ padding: "13px 15px" }}>
                    {(() => {
                      const m: Record<string,number> = {};
                      saidasFiltradas.forEach(s => { m[s.categoria] = (m[s.categoria] || 0) + (Number(s.valor) || 0); });
                      const max = Math.max(...Object.values(m), 1);
                      return Object.entries(m).sort((a: any,b: any) => b[1]-a[1]).map(([cat, val]: any) => (
                        <div className="br-row" key={cat}>
                          <div className="br-lbl">{cat}</div>
                          <div className="br-trk"><div className="br-fil" style={{ width: (val/max*100)+"%", background: "var(--q1)" }} /></div>
                          <div style={{ fontSize: 11, color: "var(--tx)", width: 80, textAlign: "right", flexShrink: 0 }}>{fmtR(val)}</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                <div className="ftable">
                  <div className="fth">Margem por Profissional</div>
                  <div style={{ padding: "13px 15px" }}>
                    {artists.filter(a => a.ativo).map(a => {
                      const fat = finFiltrado.filter(f => (f.artista === a.id || f.artista_id === a.id) && (!f.tipo || f.tipo === "entrada")).reduce((s, f) => s + (Number(f.val_a)||0), 0);
                      const rep = finFiltrado.filter(f => (f.artista === a.id || f.artista_id === a.id) && (!f.tipo || f.tipo === "entrada")).reduce((s, f) => s + ((Number(f.val_a)||0) * (Number(f.com_sess)||0) / 100), 0);
                      const margem = fat > 0 ? Math.round(((fat - rep) / fat) * 100) : 0;
                      return (
                        <div key={a.id} className="br-row">
                          <div className="br-lbl"><span style={aStyle(a.id)}>{a.nome.split(" ")[0]}</span></div>
                          <div className="br-trk"><div className="br-fil" style={{ width: margem+"%", background: a.cor || "var(--gold)" }} /></div>
                          <div style={{ fontSize: 11, color: "var(--tx)", width: 50, textAlign: "right", flexShrink: 0 }}>{margem}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ background: "rgba(74,158,191,.08)", border: "1px solid rgba(74,158,191,.2)", borderRadius: 8, padding: "13px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ab)", marginBottom: 6 }}>💡 Para seu contador</div>
                <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.7 }}>
                  Este DRE é gerado automaticamente com base nos lançamentos do mês. Exporte os dados mensalmente e entregue ao seu contador junto com as notas fiscais emitidas.
                </div>
              </div>

              {/* Projeção de caixa */}
              {(() => {
                const hojeMs = new Date().getTime();
                const msDay = 1000 * 60 * 60 * 24;
                const contarAg = (de: number, ate: number) => agEvents.filter(e => {
                  if (!e.date || e.status === "cancelado") return false;
                  const dMs = new Date(e.date + "T12:00:00").getTime();
                  const diff = Math.floor((dMs - hojeMs) / msDay);
                  return diff >= de && diff <= ate;
                }).length;
                const n30 = contarAg(0, 30);
                const n60 = contarAg(31, 60);
                const n90 = contarAg(61, 90);
                const entradasCount = fin.filter((f: any) => !f.tipo || f.tipo === "entrada").length;
                const ticket = entradasCount > 0 ? Math.round(totalEntradas / entradasCount) : 0;
                const saldosAbertos = clients.reduce((s, c) => {
                  const projs = (c.projetos || []).filter((p: any) => p.status === "ativo" && p.valorTotal > 0);
                  const pago = fin.filter((f: any) => f.cliente_id === c.id && (!f.tipo || f.tipo === "entrada")).reduce((ss: number, f: any) => ss + (Number(f.val_a) || 0), 0);
                  const total = projs.reduce((ss: number, p: any) => ss + (Number(p.valorTotal) || 0), 0);
                  return s + Math.max(total - pago, 0);
                }, 0);
                return (
                  <div className="ftable" style={{ marginTop: 12 }}>
                    <div className="fth">📈 Projeção de Caixa</div>
                    <div style={{ padding: "13px 15px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[{l: "Próximos 30 dias", n: n30}, {l: "31 a 60 dias", n: n60}, {l: "61 a 90 dias", n: n90}].map(({ l, n }) => (
                          <div key={l} style={{ flex: 1, minWidth: 140, background: "var(--dk3)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--br)" }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{l}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--q3)", fontFamily: "'Cormorant Garamond',serif" }}>{fmtR(n * ticket)}</div>
                            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{n} sessão{n !== 1 ? "ões" : ""} agendada{n !== 1 ? "s" : ""}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: "rgba(74,158,191,.08)", border: "1px solid rgba(74,158,191,.2)", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "var(--tx2)" }}>
                        💰 Saldo devedor em aberto: <strong style={{ color: saldosAbertos > 0 ? "var(--q2)" : "var(--tx)" }}>{fmtR(saldosAbertos)}</strong>
                        {ticket > 0 && <span style={{ marginLeft: 12 }}>· Ticket médio: <strong style={{ color: "var(--tx)" }}>{fmtR(ticket)}</strong></span>}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>)}

            {/* ════ EQUIPAMENTOS ════ */}
            {finAbaAtiva === "equipamentos" && (<>
              <div className="ftable">
                <div className="fth" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Equipamentos e Depreciação</span>
                  <button className="btn-new" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setShowEquipForm(true)}>+ Cadastrar</button>
                </div>
                {equipamentos.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--tx3)", fontSize: 12, fontStyle: "italic" }}>Nenhum equipamento cadastrado. Cadastre suas máquinas, fontes e equipamentos para calcular a depreciação mensal.</div>
                ) : (
                  <table className="ft">
                    <thead><tr><th>Equipamento</th><th>Categoria</th><th>Profissional</th><th>Valor Aquisição</th><th>Data Compra</th><th>Vida Útil</th><th>Depr. Mensal</th><th>Depr. Acumulada</th><th></th></tr></thead>
                    <tbody>
                      {equipamentos.map(e => {
                        const deprMes = (Number(e.valor_aquisicao)||0) / (Number(e.vida_util_meses)||48);
                        const mesesUso = (() => { if (!e.data_compra) return 0; const compra = new Date(e.data_compra); const hoje = new Date(); return Math.max(0, (hoje.getFullYear() - compra.getFullYear())*12 + hoje.getMonth() - compra.getMonth()); })();
                        const deprAcum = Math.min(deprMes * mesesUso, Number(e.valor_aquisicao)||0);
                        const valorResidual = Math.max((Number(e.valor_aquisicao)||0) - deprAcum, 0);
                        return (
                          <tr key={e.id} style={{ opacity: e.ativo ? 1 : 0.5 }}>
                            <td style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600 }}>{e.nome}</td>
                            <td><span style={{ fontSize: 10, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 3, padding: "2px 6px", color: "var(--tx2)" }}>{e.categoria}</span></td>
                            <td>{e.artista_id ? <span style={aStyle(e.artista_id)}>{aName(e.artista_id).split(" ")[0]}</span> : <span style={{ color: "var(--tx3)", fontSize: 11 }}>Geral</span>}</td>
                            <td style={{ fontWeight: 600, color: "var(--tx)" }}>{fmtR(Number(e.valor_aquisicao)||0)}</td>
                            <td style={{ fontSize: 11, color: "var(--tx2)" }}>{e.data_compra ? new Date(e.data_compra+"T12:00:00").toLocaleDateString("pt-BR") : "—"}</td>
                            <td style={{ fontSize: 11, color: "var(--tx2)" }}>{e.vida_util_meses} meses</td>
                            <td style={{ color: "var(--q2)", fontWeight: 600 }}>{fmtR(deprMes)}</td>
                            <td>
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--q1)" }}>{fmtR(deprAcum)}</div>
                                <div style={{ fontSize: 10, color: "var(--tx3)" }}>Residual: {fmtR(valorResidual)}</div>
                                <div style={{ width: "100%", background: "var(--dk4)", borderRadius: 2, height: 4, marginTop: 3, overflow: "hidden" }}>
                                  <div style={{ height: "100%", background: deprAcum >= Number(e.valor_aquisicao) ? "var(--q1)" : "var(--q2)", width: Math.min(deprAcum / Math.max(Number(e.valor_aquisicao),1) * 100, 100) + "%" }} />
                                </div>
                              </div>
                            </td>
                            <td>
                              <button className="btn-sm" style={{ fontSize: 10, color: "var(--q1)" }} onClick={async () => {
                                setEquipamentos(p => p.filter(x => x.id !== e.id));
                                await dbDelete("equipamentos", e.id);
                              }}>Remover</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {equipamentos.length > 0 && (
                  <div style={{ padding: "10px 15px", background: "var(--dk3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--tx2)" }}>Depreciação mensal total do estúdio:</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--q2)", fontFamily: "'Cormorant Garamond',serif" }}>{fmtR(deprMensal)}</span>
                  </div>
                )}
              </div>

              <div style={{ background: "rgba(212,130,10,.06)", border: "1px solid rgba(212,130,10,.2)", borderRadius: 8, padding: "13px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--q2)", marginBottom: 6 }}>📋 Como usar para o Imposto de Renda</div>
                <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.8 }}>
                  Cadastre cada equipamento com valor e data de compra. A depreciação mensal é calculada automaticamente pela Receita Federal (vida útil padrão: 48 meses para máquinas). O valor acumulado pode ser declarado como despesa dedutível. Guarde as notas fiscais de compra de cada equipamento.
                </div>
              </div>
            </>)}

            {/* ── MODAL CATEGORIAS DESPESA ── */}
        {showSaidaCatsModal && (
          <div className="ov" style={{ zIndex: 9999 }} onClick={() => setShowSaidaCatsModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(420px, 90vw)", padding: "24px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>⚙️ Categorias de Despesa</div>
                <button className="mc" onClick={() => setShowSaidaCatsModal(false)}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: "var(--tx2)" }}>Categorias usadas no registro de saídas e despesas do estúdio.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {saidaCats.map(cat => (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--dk3)", borderRadius: 6, padding: "7px 10px" }}>
                    <span style={{ flex: 1, fontSize: 13, color: "var(--tx)" }}>{cat}</span>
                    <button onClick={async () => {
                      const updated = saidaCats.filter(c => c !== cat);
                      setSaidaCats(updated);
                      const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                      if (cfgEx?.id) await sb.from("configuracoes").update({ saida_cats: updated }).eq("id", cfgEx.id);
                    }} style={{ background: "none", border: "none", color: "var(--q1)", cursor: "pointer", fontSize: 14 }}>🗑</button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="ef" style={{ flex: 1 }} placeholder="Nova categoria..." value={novaSaidaCatInput}
                  onChange={e => setNovaSaidaCatInput(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === "Enter" && novaSaidaCatInput.trim() && !saidaCats.includes(novaSaidaCatInput.trim())) {
                      const updated = [...saidaCats, novaSaidaCatInput.trim()];
                      setSaidaCats(updated); setNovaSaidaCatInput("");
                      const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                      if (cfgEx?.id) await sb.from("configuracoes").update({ saida_cats: updated }).eq("id", cfgEx.id);
                    }
                  }} />
                <button className="btn-s" onClick={async () => {
                  if (novaSaidaCatInput.trim() && !saidaCats.includes(novaSaidaCatInput.trim())) {
                    const updated = [...saidaCats, novaSaidaCatInput.trim()];
                    setSaidaCats(updated); setNovaSaidaCatInput("");
                    const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                    if (cfgEx?.id) await sb.from("configuracoes").update({ saida_cats: updated }).eq("id", cfgEx.id);
                  }
                }}>+</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL ENTRADA MANUAL ── */}
            {showEntradaForm && (
              <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowEntradaForm(false); }}>
                <div className="fmod" style={{ maxWidth: 460 }}>
                  <div className="fmh"><div className="fmt">Lançar Entrada Manual</div><button className="mc" onClick={() => setShowEntradaForm(false)}>✕</button></div>
                  <div className="fmb">
                    <div className="ff"><label className="fl">Descrição *</label><input className="fi" placeholder="Ex: Sessão avulsa, Piercing..." value={entradaForm.descricao} onChange={e => { const v = e.target.value; setEntradaForm({ ...entradaForm, descricao: v.charAt(0).toUpperCase() + v.slice(1) }); }} /></div>
                    <div className="fr">
                      <div className="ff">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <label className="fl">Categoria</label>
                          <button type="button" title="Gerenciar categorias" onClick={() => setShowEditCats(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--tx3)", padding: "0 2px" }}>✏️</button>
                        </div>
                        <select className="fs" value={entradaForm.categoria} onChange={e => setEntradaForm({ ...entradaForm, categoria: e.target.value })}>
                          {entradaCats.map(cat => (
                            <option key={cat} value={cat}>
                              {cat === "sessao" ? "Sessão" : cat === "sinal" ? "Sinal" : cat === "prolabore" ? "Pró-labore" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="ff"><label className="fl">Profissional</label>
                        <select className="fs" value={entradaForm.artista_id} onChange={e => setEntradaForm({ ...entradaForm, artista_id: e.target.value })}>
                          <option value="">Sem artista</option>
                          {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome.split(" ")[0]}</option>)}
                        </select>
                      </div>
                    </div>
                    {entradaForm.categoria !== "prolabore" && (
                      <div className="ff" style={{ position: "relative" }}>
                        <label className="fl">Cliente {entradaForm.categoria === "sessao" || entradaForm.categoria === "sinal" ? "*" : "(opcional)"}</label>
                        <input className="fi" placeholder="Buscar cliente..." value={entradaClientSearch}
                          onChange={e => { setEntradaClientSearch(e.target.value); setShowEntradaClientDD(true); }}
                          onFocus={() => setShowEntradaClientDD(true)}
                          onBlur={() => setTimeout(() => setShowEntradaClientDD(false), 200)} />
                        {showEntradaClientDD && entradaClientSearch.length > 0 && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999, background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 7, boxShadow: "0 4px 16px rgba(0,0,0,.4)", maxHeight: 200, overflowY: "auto" }}>
                            {clients.filter(c => c.nome.toLowerCase().includes(entradaClientSearch.toLowerCase())).slice(0,10).map(c => (
                              <div key={c.id} onMouseDown={() => { setEntradaForm({ ...entradaForm, cliente_nome: c.nome, cliente_id: c.id } as any); setEntradaClientSearch(c.nome); setShowEntradaClientDD(false); }}
                                style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--br)" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--dk3)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "")}>
                                {c.nome}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="fr">
                      <div className="ff"><label className="fl">Valor (R$) *</label>
                        <input className="fi" type="text" placeholder="0,00" value={entradaForm.valor}
                          onChange={e => { const raw = e.target.value.replace(/[^0-9]/g,""); const num = raw ? (Number(raw)/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : ""; setEntradaForm({ ...entradaForm, valor: num }); }} />
                      </div>
                      <div className="ff"><label className="fl">Forma</label>
                        <select className="fs" value={entradaForm.forma_pgto} onChange={e => setEntradaForm({ ...entradaForm, forma_pgto: e.target.value })}>
                          {["Pix","Dinheiro","Cartão","Transferência","Sinal","Permuta"].map(f => <option key={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>
                    {entradaForm.forma_pgto === "Cartão" && (
                      <div className="ff"><label className="fl">Parcelas</label>
                        <select className="fs" value={entradaForm.parcelas} onChange={e => setEntradaForm({ ...entradaForm, parcelas: e.target.value })}>
                          {["1","2","3","4","5","6","7","8","9","10","11","12"].map(n => <option key={n}>{n}x</option>)}
                        </select>
                      </div>
                    )}
                    {entradaForm.categoria === "piercing" && (
                      <div className="fr">
                        <div className="ff"><label className="fl">Val. Aplicador (R$)</label>
                          <input className="fi" type="number" min={0} step={0.01} placeholder="0.00" value={entradaForm.val_aplicador || ""}
                            onChange={e => setEntradaForm({ ...entradaForm, val_aplicador: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div className="ff"><label className="fl">Val. Studio (R$)</label>
                          <input className="fi" type="number" min={0} step={0.01} placeholder="0.00" value={entradaForm.val_studio || ""}
                            onChange={e => setEntradaForm({ ...entradaForm, val_studio: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                    )}
                    <div className="ff"><DateScroller label="Data" value={entradaForm.data} onChange={val => setEntradaForm({ ...entradaForm, data: val })} /></div>
                  </div>
                  <div className="fmf">
                    <button className="btn-c" onClick={() => setShowEntradaForm(false)}>Cancelar</button>
                    <button className="btn-s" disabled={!entradaForm.descricao || !entradaForm.valor} onClick={async () => {
                      const val = parseFloat(entradaForm.valor.replace(/\./g,"").replace(",",".")) || 0;
                      if (val <= 0) return;
                      const artistaObj = artists.find(a => a.id === entradaForm.artista_id);
                      const com = artistaObj?.com || 0;
                      const compEntrada = entradaForm.data.slice(0, 7);
                      const isSinalCat = entradaForm.categoria === "sinal";
                      const isPiercingCat = entradaForm.categoria === "piercing";
                      const row = {
                        tipo: "entrada", categoria: entradaForm.categoria,
                        descricao: entradaForm.descricao, cliente_nome: entradaForm.cliente_nome || "",
                        cliente_id: (entradaForm as any).cliente_id || null,
                        artista: entradaForm.artista_id, artista_id: entradaForm.artista_id,
                        val_a: val, val_c: val, pgto: entradaForm.forma_pgto,
                        forma_pgto: entradaForm.forma_pgto,
                        parcelas: entradaForm.forma_pgto === "Cartão" ? parseInt(entradaForm.parcelas) || 1 : 1,
                        data: entradaForm.data, competencia: compEntrada,
                        com_base: (isSinalCat || isPiercingCat) ? 0 : com, com_sess: (isSinalCat || isPiercingCat) ? 0 : com,
                        val_aplicador: isPiercingCat ? (entradaForm.val_aplicador || 0) : 0,
                        val_studio: isPiercingCat ? (entradaForm.val_studio || 0) : 0,
                        user_id: userId
                      };
                      const mesLancamento = entradaForm.data.slice(0, 7);
                      const saved = await dbInsert("financeiro", row);
                      if (saved) setFin(p => [...p, { ...saved, cliente: saved.cliente_nome }]);
                      setFinFiltroMes(mesLancamento);
                      setShowEntradaForm(false);
                      setEntradaClientSearch("");
                      setShowEntradaClientDD(false);
                      setEntradaForm({ descricao: "", categoria: "sessao", cliente_nome: "", cliente_id: "", artista_id: "", valor: "", forma_pgto: "Pix", parcelas: "1", data: new Date().toISOString().split("T")[0], competencia: new Date().toISOString().slice(0,7), val_aplicador: 0, val_studio: 0 } as any);
                      setShowAviso("Lançamento registrado com sucesso.");
                    }}>Salvar</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODAL EQUIPAMENTO ── */}
            {showEquipForm && (
              <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowEquipForm(false); }}>
                <div className="fmod" style={{ maxWidth: 460 }}>
                  <div className="fmh"><div className="fmt">Cadastrar Equipamento</div><button className="mc" onClick={() => setShowEquipForm(false)}>✕</button></div>
                  <div className="fmb">
                    <div className="ff"><label className="fl">Nome do Equipamento *</label><input className="fi" placeholder="Ex: Máquina Bishop Rotary" value={equipForm.nome} onChange={e => setEquipForm({ ...equipForm, nome: e.target.value })} /></div>
                    <div className="fr">
                      <div className="ff"><label className="fl">Categoria</label>
                        <select className="fs" value={equipForm.categoria} onChange={e => setEquipForm({ ...equipForm, categoria: e.target.value })}>
                          {["maquina","fonte","autoclave","mobiliario","computador","iluminacao","outro"].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="ff"><label className="fl">Profissional</label>
                        <select className="fs" value={equipForm.artista_id} onChange={e => setEquipForm({ ...equipForm, artista_id: e.target.value })}>
                          <option value="">Geral (estúdio)</option>
                          {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome.split(" ")[0]}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="fr">
                      <div className="ff"><label className="fl">Valor de Aquisição (R$) *</label>
                        <input className="fi" type="text" placeholder="0,00" value={equipForm.valor_aquisicao}
                          onChange={e => { const raw = e.target.value.replace(/[^0-9]/g,""); const num = raw ? (Number(raw)/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : ""; setEquipForm({ ...equipForm, valor_aquisicao: num }); }} />
                      </div>
                      <div className="ff"><DateScroller label="Data de Compra" value={equipForm.data_compra} onChange={val => setEquipForm({ ...equipForm, data_compra: val })} /></div>
                    </div>
                    <div className="ff"><label className="fl">Vida Útil (meses) — padrão 48</label>
                      <input className="fi" type="number" min={1} value={equipForm.vida_util_meses} onChange={e => setEquipForm({ ...equipForm, vida_util_meses: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="fmf">
                    <button className="btn-c" onClick={() => setShowEquipForm(false)}>Cancelar</button>
                    <button className="btn-s" disabled={!equipForm.nome || !equipForm.valor_aquisicao || !equipForm.data_compra} onClick={async () => {
                      const val = parseFloat(String(equipForm.valor_aquisicao).replace(/\./g,"").replace(",",".")) || 0;
                      const row = { nome: equipForm.nome, valor_aquisicao: val, data_compra: equipForm.data_compra, vida_util_meses: equipForm.vida_util_meses, categoria: equipForm.categoria, artista_id: equipForm.artista_id, ativo: true, user_id: userId };
                      const saved = await dbInsert("equipamentos", row);
                      if (saved) setEquipamentos(p => [...p, saved]);
                      setShowEquipForm(false);
                      setEquipForm({ nome: "", valor_aquisicao: "", data_compra: "", vida_util_meses: 48, categoria: "maquina", artista_id: "" });
                    }}>Salvar</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── MODAL SAÍDA ── */}
            {showSaidaForm && (
              <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowSaidaForm(false); }}>
                <div className="fmod" style={{ maxWidth: 420 }}>
                  <div className="fmh"><div className="fmt">Lançar Saída</div><button className="mc" onClick={() => setShowSaidaForm(false)}>✕</button></div>
                  <div className="fmb">
                    <div className="ff"><label className="fl">Descrição *</label><input className="fi" placeholder="Ex: Agulhas e tintas" value={saidaForm.desc} onChange={e => setSaidaForm({ ...saidaForm, desc: e.target.value })} /></div>
                    <div className="fr">
                      <div className="ff"><label className="fl">Categoria</label><select className="fs" value={saidaForm.categoria} onChange={e => setSaidaForm({ ...saidaForm, categoria: e.target.value })}>{categorias.map(c => <option key={c}>{c}</option>)}</select></div>
                      <div className="ff"><label className="fl">Valor (R$)</label><input className="fi" type="number" min={0} value={saidaForm.valor} onChange={e => setSaidaForm({ ...saidaForm, valor: Number(e.target.value) })} /></div>
                    </div>
                    <div className="ff"><DateScroller label="Data" value={saidaForm.data ? saidaForm.data.split("/").reverse().join("-") : ""} onChange={val => { const p = val.split("-"); setSaidaForm({ ...saidaForm, data: p[2]+"/"+p[1]+"/"+p[0] }); }} /></div>
                  </div>
                  <div className="fmf">
                    <button className="btn-c" onClick={() => setShowSaidaForm(false)}>Cancelar</button>
                    <button className="btn-s" disabled={!saidaForm.desc || saidaForm.valor <= 0} onClick={async () => {
                      const row = { descricao: saidaForm.desc, categoria: saidaForm.categoria, valor: saidaForm.valor, data: saidaForm.data, user_id: userId };
                      const saved = await dbInsert("saidas", row);
                      if (saved) setSaidas(p => [...p, { ...saved, desc: saved.descricao }]);
                      else setSaidas(p => [...p, { id: Date.now(), ...saidaForm }]);
                      setShowSaidaForm(false);
                      setSaidaForm({ desc: "", categoria: "Material", valor: 0, data: new Date().toLocaleDateString("pt-BR") });
                    }}>Salvar</button>
                  </div>
                </div>
              </div>
            )}

          </div>
          );
        })()}

        {/* ── ARTISTAS ── */}
        {tab === "artistas" && (
          <div className="aw">
            <div className="aabar">
              <button className="btn-aa" onClick={() => setShowArtForm(true)}>💼 Adicionar Profissional</button>
            </div>
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
                        marginRight: 7, textTransform: "uppercase"
                      }}>
                        {a.role === "residente" ? "RESIDENTE" : "GUEST"}
                      </span>
                      {a.ativo ? "Ativo" : "Inativo"} {a.insta || "Sem Instagram"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn-sm gold" onClick={() => setEditingArtist({ ...a })}>✏️ Editar</button>
                    <button className="btn-sm gold" onClick={() => setShowCtr({ type: "artist", a })}>📄 Contrato</button>
                    <button className="btn-sm" onClick={() => setArtists(p => p.map(x => x.id === a.id ? { ...x, ativo: !x.ativo } : x))}>
                      {a.ativo ? "Desativar" : "Reativar"}
                    </button>
                    <button className="btn-sm red" onClick={() => setConfirmRemoverArtista(a)}>Remover</button>
                  </div>
                </div>
                <div className="abody">
                  {[
                    { l: "Clientes", v: clients.filter(c => c.artista === a.id).length },
                    { l: "Tatuados", v: clients.filter(c => c.artista === a.id && (c.etapa === "tatuado" || c.etapa === "pos_venda")).length },
                    {
                      l: "Conversao", v: Math.round(
                        clients.filter(c => c.artista === a.id && (c.etapa === "tatuado" || c.etapa === "pos_venda")).length /
                        Math.max(clients.filter(c => c.artista === a.id).length, 1) * 100
                      ) + "%"
                    },
                  ].map((f, i) => (
                    <div className="af" key={i}><div className="afl">{f.l}</div><div className="afv">{f.v}</div></div>
                  ))}
                  <div className="af">
                    <div className="afl">Comissão Base (%)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                      <input className="ci" type="number" min={0} max={100} value={a.com}
                        onChange={e => setArtists(p => p.map(x => x.id === a.id ? { ...x, com: Number(e.target.value) } : x))} />
                      <span style={{ fontSize: 11, color: "var(--tx2)" }}>%</span>
                      <span style={{ fontSize: 10, color: "var(--tx3)" }}>· Est: <strong style={{ color: "var(--gold)" }}>{100 - (a.com || 0)}%</strong></span>
                    </div>
                  </div>
                  {/* Metas por artista */}
                  <div className="af" style={{ flexDirection: "column", gap: 6 }}>
                    <div className="afl">Metas do Mês</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 10, color: "var(--tx3)" }}>Sessões</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input className="ci" type="number" min={0} value={a.meta_sessoes || 0}
                            onChange={e => {
                              const updated = { ...a, meta_sessoes: Number(e.target.value) };
                              setArtists(p => p.map(x => x.id === a.id ? updated : x));
                              setTimeout(() => dbUpsert("artistas", { id: a.id, meta_sessoes: Number(e.target.value) }), 500);
                            }} style={{ width: 56 }} />
                          {(() => {
                            const sessoesMes = fin.filter((f: any) => f.artista === a.id && f.competencia === new Date().toISOString().slice(0,7)).length;
                            const meta = a.meta_sessoes || 0;
                            const pct = meta > 0 ? Math.min(Math.round(sessoesMes / meta * 100), 100) : 0;
                            return <span style={{ fontSize: 10, color: pct >= 100 ? "#27AE60" : "var(--tx3)" }}>{sessoesMes}/{meta} ({pct}%)</span>;
                          })()}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 10, color: "var(--tx3)" }}>Faturamento (R$)</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <input className="ci" type="text" value={a.meta_faturamento ? Number(a.meta_faturamento).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : ""}
                            placeholder="0"
                            onChange={e => {
                              const raw = e.target.value.replace(/\D/g, "");
                              const num = raw ? Number(raw) : 0;
                              const updated = { ...a, meta_faturamento: num };
                              setArtists(p => p.map(x => x.id === a.id ? updated : x));
                              setTimeout(() => dbUpsert("artistas", { id: a.id, meta_faturamento: num }), 500);
                            }} style={{ width: 90 }} />
                          {(() => {
                            const fatMes = fin.filter((f: any) => f.artista === a.id && f.competencia === new Date().toISOString().slice(0,7)).reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
                            const meta = a.meta_faturamento || 0;
                            const pct = meta > 0 ? Math.min(Math.round(fatMes / meta * 100), 100) : 0;
                            return <span style={{ fontSize: 10, color: pct >= 100 ? "#27AE60" : "var(--tx3)" }}>R${fatMes.toLocaleString("pt-BR",{minimumFractionDigits:0})} ({pct}%)</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Modal editar artista */}
            {editingArtist && (
              <div className="fov" onClick={e => { if (e.target === e.currentTarget) setEditingArtist(null); }}>
                <div className="fmod" style={{ maxWidth: 460 }}>
                  <div className="fmh">
                    <div className="fmt">Editar Profissional</div>
                    <button className="mc" onClick={() => setEditingArtist(null)}>✕</button>
                  </div>
                  <div className="fmb">
                    <div className="ff"><label className="fl">Nome Completo</label><input className="fi" value={editingArtist.nome} onChange={e => setEditingArtist({ ...editingArtist, nome: e.target.value.replace(/(^|\s)(\S)/g, (_: string, sp: string, c: string) => sp + c.toUpperCase()) })} /></div>
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Tipo</label>
                        <select className="fs" value={editingArtist.role} onChange={e => setEditingArtist({ ...editingArtist, role: e.target.value })}>
                          <option value="residente">Residente</option>
                          <option value="guest">Temporário</option>
                        </select>
                      </div>
                      <div className="ff">
                  <label className="fl">Comissão (%)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input className="fi" type="number" min={0} max={100} value={editingArtist.com} onChange={e => setEditingArtist({ ...editingArtist, com: Number(e.target.value) })} style={{ width: 80 }} />
                    <span style={{ fontSize: 11, color: "var(--tx3)", display: "flex", gap: 10 }}>
                        <span>Profissional: <strong style={{ color: "var(--gold)" }}>{editingArtist.com}%</strong></span>
                        <span style={{ color: "var(--br)" }}>|</span>
                        <span>Estúdio: <strong style={{ color: "#27AE60" }}>{100 - editingArtist.com}%</strong></span>
                    </span>
                  </div>
                </div>
                    </div>
                    <div className="fr">
                      <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={editingArtist.insta || ""} onChange={e => { const v = e.target.value; setEditingArtist({ ...editingArtist, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
                      <div className="ff"><label className="fl">Email</label><input className="fi" placeholder="email" value={editingArtist.email || ""} onChange={e => setEditingArtist({ ...editingArtist, email: e.target.value.toLowerCase() })} /></div>
                    </div>
                    <div className="ff">
                      <label className="fl">Telefone (visivel apenas para o dono)</label>
                      <input className="fi" placeholder="(99) 99999-9999" value={editingArtist.tel || ""} onChange={e => setEditingArtist({ ...editingArtist, tel: e.target.value })} />
                    </div>
                    <div className="ff">
                      <label className="fl">Cor</label>
                      <ColorPicker value={editingArtist.cor} onChange={cor => setEditingArtist({ ...editingArtist, cor })} />
                    </div>
                  </div>
                  <div className="fmf">
                    <button className="btn-c" onClick={() => setEditingArtist(null)}>Cancelar</button>
                    <button className="btn-s" onClick={async () => {
                      setArtists(p => p.map(x => x.id === editingArtist.id ? { ...editingArtist } : x));
                      const { error } = await sb.from("artistas").update({
                        nome: editingArtist.nome,
                        role: editingArtist.role,
                        com: editingArtist.com,
                        cor: editingArtist.cor,
                        insta: editingArtist.insta,
                        email: editingArtist.email,
                        tel: editingArtist.tel,
                        ativo: editingArtist.ativo
                      }).eq("id", editingArtist.id);
                      if (error) { console.error("Erro ao salvar artista:", error); alert("Erro ao salvar artista."); return; }
                      setEditingArtist(null);
                    }}>Salvar</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CONTRATOS ── */}
        {tab === "contratos" && (
          <div className="contratos-w">
            <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 9, overflow: "hidden" }}>
              <div style={{ padding: "13px 17px", background: "var(--dk3)", borderBottom: "1px solid var(--br)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 600, color: "var(--tx)" }}>📄 Contrato de Profissional</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>Revisar com advogado antes de usar</div>
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  {artists.map(a => (
                    <button key={a.id} className="btn-sm gold" onClick={() => setShowCtr({ type: "artist", a })}>
                      Ver - {a.nome.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: "14px 18px", fontSize: 12, color: "var(--tx2)", lineHeight: 1.9 }}>
                ✓ Identificacao das partes<br />
                ✓ Tipo de vínculo (Residente / Guest)<br />
                ✓ Comissão e forma de repasse<br />
                ✓ Horario e periodo de trabalho<br />
                ✓ Clausula LGPD<br />
                ✓ Nao captacao de clientes (12 meses)<br />
                ✓ Direitos autorais das obras<br />
                ✓ Rescisao e penalidades
              </div>
            </div>
            <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 9, overflow: "hidden" }}>
              <div style={{ padding: "13px 17px", background: "var(--dk3)", borderBottom: "1px solid var(--br)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 600, color: "var(--tx)" }}>✍️ Confirmação de Projeto - Cliente</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>Enviada por WhatsApp apos aprovacao do projeto</div>
                </div>
                <button className="btn-sm gold" onClick={() => setShowCtr({ type: "client", nome: "[CLIENTE]", artista: "[ARTISTA]", proj: "[PROJETO]", valor: "[VALOR]" })}>
                  Ver Modelo
                </button>
              </div>
              <div style={{ padding: "14px 18px", fontSize: 12, color: "var(--tx2)", lineHeight: 1.9 }}>
                ✓ Cliente, artista e data<br />
                ✓ Descricao do projeto aprovado<br />
                ✓ Valor acordado<br />
                ✓ Autorizacao de uso de imagem<br />
                ✓ Garantia de retoque - 30 dias<br />
                ✓ Confirmacao: cliente responde "CONFIRMO"
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <div className="dw">
            <div className="dgrid">
              <div className="dcard">
                <div className="dch">📍 Origem dos Leads</div>
                <div className="dcb">
                  {origC.map(([o, c]) => {
                    const total = clients.filter(x => (x.orig || x.origem) === o).length;
                    const convertidos = clients.filter(x => (x.orig || x.origem) === o && ["tatuado","pos_venda"].includes(x.etapa)).length;
                    const taxa = total > 0 ? Math.round(convertidos / total * 100) : 0;
                    return (
                      <div className="br-row" key={o} style={{ flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                          <div className="br-lbl">{o}</div>
                          <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
                            <span style={{ color: "var(--tx3)" }}>{c} leads</span>
                            <span style={{ color: taxa >= 30 ? "#27AE60" : taxa >= 10 ? "var(--gold)" : "var(--tx3)", fontWeight: 600 }}>{taxa}% conv.</span>
                          </div>
                        </div>
                        <div className="br-trk" style={{ width: "100%" }}><div className="br-fil" style={{ width: (c / maxO * 100) + "%", background: "var(--gold)" }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="dcard">
                <div className="dch">🎨 Estilos Demandados</div>
                <div className="dcb">
                  {estilos.map(([e, c]) => (
                    <div className="br-row" key={e}>
                      <div className="br-lbl">{e}</div>
                      <div className="br-trk"><div className="br-fil" style={{ width: (c / maxE * 100) + "%", background: "var(--ab)" }} /></div>
                      <div className="br-val">{c}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dcard">
                <div className="dch">📊 Pipeline</div>
                <div className="dcb">
                  {stages.map(s => {
                    const c = clients.filter(x => x.etapa === s.id).length;
                    return c > 0 ? (
                      <div className="br-row" key={s.id}>
                        <div className="br-lbl">{s.emoji} {s.label}</div>
                        <div className="br-trk"><div className="br-fil" style={{ width: (c / clients.length * 100) + "%", background: s.color }} /></div>
                        <div className="br-val">{c}</div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
              <div className="dcard">
                <div className="dch">⚠️ Alertas Ativos</div>
                <div className="dcb">
                  {alertas.length === 0
                    ? <div style={{ color: "var(--tx3)", fontSize: 12 }}>✓ Nenhum alerta</div>
                    : alertas.map(c => {
                      const m = miss(c); const ch = churn(c);
                      return (
                        <div key={c.id} onClick={() => { setSel(c); setSelCtx("clientes"); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); }} style={{ padding: "8px 10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, marginBottom: 5, cursor: "pointer" }}>
                          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 13, marginBottom: 3 }}>{c.nome}</div>
                          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                            {m.map(x => <span key={x} className="atag">⚠ Sem {x}</span>)}
                            {ch === "orange" && <span className="co co-o">🟠 6m</span>}
                            {ch === "red" && <span className="co co-r">🔴 1a</span>}
                            {c.orcamento && <span className="atag">💰 Orcamento</span>}
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
              <div className="dcard">
                <div className="dch">👥 Desempenho por Profissional</div>
                <div className="dcb">
                  {artists.filter(a => a.ativo).map(a => {
                    const clts = clients.filter(c => c.artista === a.id);
                    const fat = fin.filter(f => f.artista === a.id).reduce((s, f) => s + f.val_a, 0);
                    const npsA = clts.filter(c => c.nps).length
                      ? Math.round(clts.filter(c => c.nps).reduce((s, c) => s + (c.nps || 0), 0) / clts.filter(c => c.nps).length * 10) / 10
                      : " - ";
                    return (
                      <div key={a.id} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span className={("at " + aClass(a.id)) || ""} style={aStyle(a.id)}>{a.nome.split(" ")[0]}</span>
                          <span style={{ fontSize: 11, color: "var(--tx2)" }}>{clts.length} clientes R$ {fat.toLocaleString("pt-BR")}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 4 }}>
                          NPS Medio: <strong style={{ color: "var(--gold)" }}>{npsA}</strong>
                        </div>
                        <div className="br-row">
                          <div className="br-lbl" style={{ fontSize: 11 }}>Tatuados</div>
                          <div className="br-trk">
                            <div className="br-fil" style={{
                              width: (clts.filter(c => c.etapa === "tatuado" || c.etapa === "pos_venda").length / Math.max(clts.length, 1) * 100) + "%",
                              background: a.cor
                            }} />
                          </div>
                          <div className="br-val">{clts.filter(c => c.etapa === "tatuado" || c.etapa === "pos_venda").length}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="dcard">
                <div className="dch">🎯 Metas - Junho 2026</div>
                <div className="dcb">
                  {[
                    { l: "Sessões", v: fin.filter(f => f.val_a > 0).length, m: metaSessoes },
                    { l: "Fat. R$k", v: Math.round(totalFat / 1000), m: Math.round(metaMensal / 1000) },
                    { l: "Leads", v: clients.length, m: metaLeads },
                    { l: "NPS 9+", v: clients.filter(c => (c.nps || 0) >= 9).length, m: metaNPS },
                  ].map((mt, i) => (
                    <div key={i} style={{ marginBottom: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: "var(--tx)" }}>{mt.l}</span>
                        <span style={{ fontSize: 11, color: "var(--tx2)" }}>{mt.v}/{mt.m}</span>
                      </div>
                      <div className="mt-trk">
                        <div className="mt-fil" style={{ width: Math.min(mt.v / mt.m * 100, 100) + "%" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="dcard" style={{ gridColumn: "1 / -1" }}>
                <div className="dch">🔄 Fila de Reativação</div>
                <div className="dcb">
                  {reativacao.length === 0
                    ? <div style={{ color: "var(--tx3)", fontSize: 12 }}>Nenhum cliente para reativar.</div>
                    : reativacao.map(c => (
                      <div key={c.id} onClick={() => { setSel(c); setSelCtx("clientes"); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); }} style={{ padding: "8px 10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, marginBottom: 5, cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>{c.nome}</div>
                          <div style={{ fontSize: 11, color: "var(--tx2)" }}>{c.dias} dias sem movimento {c.qual}</div>
                        </div>
                        <div style={{ fontSize: 11, color: c.qual === "Q1" ? "var(--q1)" : c.qual === "Q2" ? "var(--q2)" : "var(--q3)", fontWeight: 600 }}>
                          {c.qual === "Q1" ? "Enviar conteúdo educativo" : c.qual === "Q2" ? "Convite direto" : "Oferta especial"}
                        </div>
                      </div>
                    ))
                  }
                  {paraExcluir.length > 0 && (
                    <div style={{ marginTop: 8, padding: "8px 11px", background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 6, fontSize: 11, color: "var(--q1)" }}>
                      ⚠ {paraExcluir.length} lead{paraExcluir.length > 1 ? "s" : ""} com +40 dias sem resposta - prontos para exclusão.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ORIGENS ── */}
        {tab === "origens" && (() => {
          const siteBase = (studioSite || "https://seusite.com.br").replace(/\/$/, "");
          const salvarOrigem = async (nome: string, idx: number | null, pago?: boolean) => {
            const sl = slugify(nome);
            if (!sl) return;
            const pg = pago ?? false;
            try {
              if (idx === null) {
                const { data: nova } = await sb.from("origens").insert({ nome, slug: sl, pago: pg, user_id: userId, criado_em: new Date().toISOString() }).select("*").single();
                if (nova) setOrigens(prev => [...prev, nova]);
              } else {
                await sb.from("origens").update({ nome, slug: sl, pago: pg }).eq("id", origens[idx].id);
                setOrigens(prev => prev.map((o, i) => i === idx ? { ...o, nome, slug: sl, pago: pg } : o));
              }
            } catch {}
            setOrigenEditIdx(null);
            setOrigenEditNome("");
            setOrigenEditPago(false);
          };
          const excluirOrigem = async (idx: number) => {
            try {
              await sb.from("origens").delete().eq("id", origens[idx].id);
              setOrigens(prev => prev.filter((_, i) => i !== idx));
            } catch {}
            setOrigenConfirmDel(null);
          };
          const totalFrio = eventosTrafego.filter(e => e.tipo_evento === "LeadFrio").length;
          const totalQuente = eventosTrafego.filter(e => e.tipo_evento === "LeadQuente").length;
          const convGeral = totalFrio > 0 ? Math.round((totalQuente / totalFrio) * 100) : 0;
          const tempoRelativo = (iso: string) => {
            const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
            if (diff < 60) return "agora";
            if (diff < 3600) return "há " + Math.floor(diff / 60) + "min";
            if (diff < 86400) return "há " + Math.floor(diff / 3600) + "h";
            return "há " + Math.floor(diff / 86400) + "d";
          };
          const origensComMetrica = origens.map(o => {
            const frio = eventosTrafego.filter(e => e.tipo_evento === "LeadFrio" && e.origem === o.slug).length;
            const quente = eventosTrafego.filter(e => e.tipo_evento === "LeadQuente" && e.origem === o.slug).length;
            const conv = frio > 0 ? Math.round((quente / frio) * 100) : 0;
            const ultimo = eventosTrafego.find(e => e.origem === o.slug);
            return { ...o, frio, quente, conv, ultimo };
          }).sort((a, b) => b.conv - a.conv);
          return (
              <div style={{ padding: "24px 16px", maxWidth: 740, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700, color: "var(--gold)" }}>🔗 Gerenciador de Origens</div>
                  <button className="btn-s" onClick={() => { setOrigenEditIdx(-1); setOrigenEditNome(""); setOrigenEditPago(false); }}>+ Nova origem</button>
                </div>

                {/* Cards de resumo geral */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 20 }}>
                  {[
                    { label: "Origens", val: origens.length, icon: "🔗", color: "var(--tx2)" },
                    { label: "Lead Frio", val: totalFrio, icon: "🧊", color: "#4A9EBF" },
                    { label: "Lead Quente", val: totalQuente, icon: "🔥", color: "#C0392B" },
                    { label: "Conversão", val: convGeral + "%", icon: "📈", color: "var(--gold)" },
                  ].map((c, i) => (
                    <div key={i} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 9, padding: "12px 14px" }}>
                      <div style={{ fontSize: 16 }}>{c.icon}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: c.color, fontFamily: "'Cormorant Garamond',serif", marginTop: 4 }}>{c.val}</div>
                      <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 2 }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Funil consolidado */}
                {(totalFrio > 0 || totalQuente > 0) && (
                  <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12 }}>Funil consolidado</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                      {[
                        { label: "Lead Frio", val: totalFrio, icon: "🧊", color: "#4A9EBF", w: 100 },
                        { label: "Lead Quente", val: totalQuente, icon: "🔥", color: "#C0392B", w: totalFrio > 0 ? Math.max(20, Math.round((totalQuente / totalFrio) * 100)) : 0 },
                      ].map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                          {i > 0 && <div style={{ color: "var(--tx3)", fontSize: 14, flexShrink: 0 }}>→</div>}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: "var(--tx2)" }}>{f.icon} {f.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: f.color }}>{f.val}</span>
                            </div>
                            <div style={{ height: 6, background: "var(--dk4)", borderRadius: 3, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: f.w + "%", background: f.color, borderRadius: 3, transition: "width .4s" }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!studioSite && (
                  <div style={{ background: "rgba(212,130,10,.12)", border: "1px solid rgba(212,130,10,.3)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--gold)", marginBottom: 16 }}>
                    ⚠ Configure o URL do site em <strong>Configurações → Estúdio → Site</strong> para gerar os links corretamente.
                  </div>
                )}

                {/* Modal confirmação exclusão */}
                {origenConfirmDel !== null && (
                  <div className="ov" style={{ zIndex: 9999 }} onClick={() => setOrigenConfirmDel(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(360px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "slideInRight .25s ease" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>Remover origem?</div>
                      <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>Esta ação não pode ser desfeita. Deseja remover esta origem?</div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn-c" onClick={() => setOrigenConfirmDel(null)}>Cancelar</button>
                        <button className="btn-s" style={{ background: "rgba(192,57,43,.18)", color: "#C0392B", border: "1px solid rgba(192,57,43,.4)" }} onClick={() => excluirOrigem(origenConfirmDel!)}>Remover</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form nova origem */}
                {origenEditIdx === -1 && (
                  <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, padding: "16px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "var(--tx3)", fontWeight: 600 }}>Nova origem</div>
                    <input className="ef" placeholder="Ex: Instagram Abraão, Google Maps, Campanha de Verão..." value={origenEditNome} autoFocus onChange={e => setOrigenEditNome(e.target.value)} onKeyDown={e => { if (e.key === "Enter") salvarOrigem(origenEditNome.trim(), null, origenEditPago); if (e.key === "Escape") { setOrigenEditIdx(null); setOrigenEditNome(""); setOrigenEditPago(false); } }} />
                    {origenEditNome.trim() && (
                      <div style={{ fontSize: 11, color: "var(--tx3)" }}>Link: <span style={{ color: "var(--gold)", fontFamily: "monospace" }}>{siteBase + "?origem=" + slugify(origenEditNome.trim())}</span></div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => setOrigenEditPago(p => !p)} style={{ background: origenEditPago ? "rgba(201,168,76,.15)" : "var(--dk3)", border: "1px solid " + (origenEditPago ? "var(--gold)" : "var(--br)"), borderRadius: 6, padding: "5px 12px", fontSize: 11, color: origenEditPago ? "var(--gold)" : "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: origenEditPago ? 600 : 400 }}>
                        {origenEditPago ? "💰 Pago" : "🌱 Orgânico"}
                      </button>
                      <div style={{ flex: 1 }} />
                      <button className="btn-c" onClick={() => { setOrigenEditIdx(null); setOrigenEditNome(""); setOrigenEditPago(false); }}>Cancelar</button>
                      <button className="btn-s" onClick={() => salvarOrigem(origenEditNome.trim(), null, origenEditPago)}>Salvar</button>
                    </div>
                  </div>
                )}

                {/* Lista de origens com métricas */}
                {origensComMetrica.length === 0 && origenEditIdx !== -1 && (
                  <div style={{ textAlign: "center", color: "var(--tx3)", fontSize: 13, padding: "40px 0" }}>Nenhuma origem cadastrada ainda. Clique em "+ Nova origem" para começar.</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {origensComMetrica.map((o, idx) => {
                    const link = siteBase + "?origem=" + o.slug;
                    const realIdx = origens.findIndex(x => x.id === o.id);
                    const isEditing = origenEditIdx === realIdx;
                    return (
                      <div key={o.id} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, padding: "14px 16px" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <input className="ef" value={origenEditNome} autoFocus onChange={e => setOrigenEditNome(e.target.value)} onKeyDown={e => { if (e.key === "Enter") salvarOrigem(origenEditNome.trim(), realIdx, origenEditPago); if (e.key === "Escape") { setOrigenEditIdx(null); setOrigenEditNome(""); setOrigenEditPago(false); } }} />
                            {origenEditNome.trim() && (
                              <div style={{ fontSize: 11, color: "var(--tx3)" }}>Link: <span style={{ color: "var(--gold)", fontFamily: "monospace" }}>{siteBase + "?origem=" + slugify(origenEditNome.trim())}</span></div>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <button onClick={() => setOrigenEditPago(p => !p)} style={{ background: origenEditPago ? "rgba(201,168,76,.15)" : "var(--dk3)", border: "1px solid " + (origenEditPago ? "var(--gold)" : "var(--br)"), borderRadius: 6, padding: "5px 12px", fontSize: 11, color: origenEditPago ? "var(--gold)" : "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: origenEditPago ? 600 : 400 }}>
                                {origenEditPago ? "💰 Pago" : "🌱 Orgânico"}
                              </button>
                              <div style={{ flex: 1 }} />
                              <button className="btn-c" onClick={() => { setOrigenEditIdx(null); setOrigenEditNome(""); setOrigenEditPago(false); }}>Cancelar</button>
                              <button className="btn-s" onClick={() => salvarOrigem(origenEditNome.trim(), realIdx, origenEditPago)}>Salvar</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                  <span style={{ fontWeight: 600, fontSize: 14, color: "var(--tx)" }}>{o.nome}</span>
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 10, background: o.pago ? "rgba(192,57,43,.15)" : "rgba(39,174,96,.15)", color: o.pago ? "#C0392B" : "#27AE60", border: "1px solid " + (o.pago ? "rgba(192,57,43,.3)" : "rgba(39,174,96,.3)") }}>
                                    {o.pago ? "💰 Pago" : "🌱 Orgânico"}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: "var(--tx3)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link}</div>
                              </div>
                              <button title="Copiar link" onClick={() => { try { navigator.clipboard.writeText(link); } catch {} }} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 10px", fontSize: 14, cursor: "pointer", color: "var(--tx2)", flexShrink: 0 }}>📋</button>
                              <button title="Editar" onClick={() => { setOrigenEditIdx(realIdx); setOrigenEditNome(o.nome); setOrigenEditPago(o.pago || false); }} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 10px", fontSize: 14, cursor: "pointer", color: "var(--tx2)", flexShrink: 0 }}>✏️</button>
                              <button title="Remover" onClick={() => setOrigenConfirmDel(realIdx)} style={{ background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "6px 10px", fontSize: 14, cursor: "pointer", color: "#C0392B", flexShrink: 0 }}>✕</button>
                            </div>
                            {/* Métricas da origem */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                              {[
                                { label: "Lead Frio", val: o.frio, color: "#4A9EBF", icon: "🧊" },
                                { label: "Lead Quente", val: o.quente, color: "#C0392B", icon: "🔥" },
                                { label: "Conversão", val: o.conv + "%", color: "var(--gold)", icon: "📈" },
                                { label: "Último evento", val: o.ultimo ? tempoRelativo(o.ultimo.criado_em) : "—", color: "var(--tx3)", icon: "⏱" },
                              ].map((m, mi) => (
                                <div key={mi} style={{ background: "var(--dk3)", borderRadius: 7, padding: "7px 9px" }}>
                                  <div style={{ fontSize: 10, color: "var(--tx3)", marginBottom: 3 }}>{m.icon} {m.label}</div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: "'Cormorant Garamond',serif" }}>{m.val}</div>
                                </div>
                              ))}
                            </div>
                            {/* Barra de conversão */}
                            {o.frio > 0 && (
                              <div style={{ marginTop: 8, height: 4, background: "var(--dk4)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: Math.min(o.conv, 100) + "%", background: "linear-gradient(to right, #4A9EBF, #C0392B)", borderRadius: 2, transition: "width .4s" }} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        {/* ── CAMPANHAS ── */}
        {tab === "campanhas" && (() => {
          const hoje = new Date().toISOString().split("T")[0];
          const statusCamp = (c: any) => {
            if (!c.data_inicio || !c.data_fim) return "sem data";
            if (hoje < c.data_inicio) return "agendada";
            if (hoje > c.data_fim) return "encerrada";
            return "ativa";
          };
          const statusStyle = (s: string) => {
            if (s === "ativa") return { background: "rgba(39,174,96,.15)", color: "#27AE60", border: "1px solid rgba(39,174,96,.3)" };
            if (s === "agendada") return { background: "rgba(52,152,219,.15)", color: "#3498DB", border: "1px solid rgba(52,152,219,.3)" };
            return { background: "rgba(127,140,141,.15)", color: "var(--tx3)", border: "1px solid var(--br)" };
          };
          const slugPalavra = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").trim();
          const salvarCamp = async (form: {nome: string; palavra_chave: string; data_inicio: string; data_fim: string}, idx: number | null) => {
            if (!form.nome.trim() || !form.palavra_chave.trim()) return;
            const row = { ...form, palavra_chave: slugPalavra(form.palavra_chave), user_id: userId, criado_em: idx === null ? new Date().toISOString() : undefined };
            try {
              if (idx === null) {
                const { data: nova } = await sb.from("campanhas").insert(row).select("*").single();
                if (nova) setCampanhas(prev => [...prev, nova]);
              } else {
                const { data: atualizada } = await sb.from("campanhas").update({ nome: row.nome, palavra_chave: row.palavra_chave, data_inicio: row.data_inicio, data_fim: row.data_fim }).eq("id", campanhas[idx].id).select("*").single();
                if (atualizada) setCampanhas(prev => prev.map((c, i) => i === idx ? atualizada : c));
              }
            } catch {}
            setCampEditIdx(null);
            setCampEditForm({ nome: "", palavra_chave: "", data_inicio: "", data_fim: "" });
          };
          const excluirCamp = async (idx: number) => {
            try {
              await sb.from("campanhas").delete().eq("id", campanhas[idx].id);
              setCampanhas(prev => prev.filter((_, i) => i !== idx));
            } catch {}
            setCampConfirmDel(null);
          };
          const campForm = (idx: number | null) => {
            const hojeStr = new Date().toISOString().split("T")[0];
            const erroInicio = campEditForm.data_inicio && campEditForm.data_inicio < hojeStr
              ? "A data de início não pode ser anterior a hoje."
              : "";
            const erroFim = campEditForm.data_fim && campEditForm.data_inicio && campEditForm.data_fim <= campEditForm.data_inicio
              ? "A data de fim deve ser posterior à data de início."
              : "";
            const podeSalvar = !erroInicio && !erroFim && !!campEditForm.data_inicio && !!campEditForm.data_fim;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 4 }}>Nome da campanha</div>
                    <input className="ef" placeholder="Ex: Black Friday 2025" value={campEditForm.nome} onChange={e => setCampEditForm(f => ({ ...f, nome: e.target.value }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 4 }}>Palavra-chave</div>
                    <input className="ef" placeholder="Ex: blackfriday2025" value={campEditForm.palavra_chave} onChange={e => setCampEditForm(f => ({ ...f, palavra_chave: e.target.value }))} />
                  </div>
                  <div>
                    <DateScroller label="Início" value={campEditForm.data_inicio} onChange={v => setCampEditForm(f => ({ ...f, data_inicio: v }))} />
                    {erroInicio && <div style={{ fontSize: 10, color: "var(--q1)", marginTop: 3 }}>{erroInicio}</div>}
                  </div>
                  <div>
                    <DateScroller label="Fim" value={campEditForm.data_fim} onChange={v => setCampEditForm(f => ({ ...f, data_fim: v }))} />
                    {erroFim && <div style={{ fontSize: 10, color: "var(--q1)", marginTop: 3 }}>{erroFim}</div>}
                  </div>
                </div>
                {campEditForm.palavra_chave.trim() && (
                  <div style={{ fontSize: 11, color: "var(--tx3)" }}>
                    Palavra salva como: <span style={{ color: "var(--gold)", fontFamily: "monospace" }}>{slugPalavra(campEditForm.palavra_chave)}</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-c" onClick={() => { setCampEditIdx(null); setCampEditForm({ nome: "", palavra_chave: "", data_inicio: "", data_fim: "" }); }}>Cancelar</button>
                  <button className="btn-s" style={{ opacity: podeSalvar ? 1 : 0.45, cursor: podeSalvar ? "pointer" : "not-allowed" }} onClick={() => { if (podeSalvar) salvarCamp(campEditForm, idx); }}>Salvar</button>
                </div>
              </div>
            );
          };
          return (
            <div style={{ padding: "24px 16px", maxWidth: 700, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700, color: "var(--gold)" }}>🎯 Campanhas</div>
                <button className="btn-s" onClick={() => { setCampEditIdx(-1); setCampEditForm({ nome: "", palavra_chave: "", data_inicio: "", data_fim: "" }); }}>+ Nova campanha</button>
              </div>
              <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 20, lineHeight: 1.6 }}>
                Crie campanhas com uma palavra-chave secreta. Quando um lead mencionar a palavra na conversa com a Aura do site, ela é vinculada automaticamente à campanha.
              </div>
              {/* Modal confirmação exclusão */}
              {campConfirmDel !== null && (
                <div className="ov" style={{ zIndex: 9999 }} onClick={() => setCampConfirmDel(null)}>
                  <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(360px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "slideInRight .25s ease" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>Remover campanha?</div>
                    <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>Esta ação não pode ser desfeita. Leads já vinculados à campanha perdem o vínculo.</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="btn-c" onClick={() => setCampConfirmDel(null)}>Cancelar</button>
                      <button className="btn-s" style={{ background: "rgba(192,57,43,.18)", color: "#C0392B", border: "1px solid rgba(192,57,43,.4)" }} onClick={() => excluirCamp(campConfirmDel!)}>Remover</button>
                    </div>
                  </div>
                </div>
              )}
              {/* Form nova campanha */}
              {campEditIdx === -1 && (
                <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--tx3)", fontWeight: 600, marginBottom: 10 }}>Nova campanha</div>
                  {campForm(null)}
                </div>
              )}
              {/* Lista */}
              {campanhas.length === 0 && campEditIdx !== -1 && (
                <div style={{ textAlign: "center", color: "var(--tx3)", fontSize: 13, padding: "40px 0" }}>
                  Nenhuma campanha cadastrada ainda. Clique em "+ Nova campanha" para começar.
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {campanhas.map((camp, idx) => {
                  const st = statusCamp(camp);
                  const leadsCount = clients.filter(c => c.campanha_id === camp.id).length;
                  const isEditing = campEditIdx === idx;
                  return (
                    <div key={camp.id} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, padding: "14px 16px" }}>
                      {isEditing ? campForm(idx) : (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--tx)" }}>{camp.nome}</div>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, ...statusStyle(st) }}>{st.toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 4 }}>
                              Palavra-chave: <span style={{ color: "var(--gold)", fontFamily: "monospace", fontWeight: 600 }}>{camp.palavra_chave}</span>
                            </div>
                            {(camp.data_inicio || camp.data_fim) && (
                              <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 6 }}>
                                {camp.data_inicio && camp.data_fim ? camp.data_inicio + " → " + camp.data_fim : camp.data_inicio || camp.data_fim}
                              </div>
                            )}
                            <button
                              onClick={() => { setFiltroExtra({ tipo: "campanha", valor: camp.id }); setFa("todos"); changeTab("clientes"); }}
                              style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: leadsCount > 0 ? "var(--q3)" : "var(--tx3)", cursor: leadsCount > 0 ? "pointer" : "default", textDecoration: leadsCount > 0 ? "underline" : "none", fontFamily: "inherit" }}>
                              {leadsCount} lead{leadsCount !== 1 ? "s" : ""} capturado{leadsCount !== 1 ? "s" : ""}
                            </button>
                          </div>
                          <button title="Editar" onClick={() => { setCampEditIdx(idx); setCampEditForm({ nome: camp.nome, palavra_chave: camp.palavra_chave, data_inicio: camp.data_inicio || "", data_fim: camp.data_fim || "" }); }}
                            style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 10px", fontSize: 14, cursor: "pointer", color: "var(--tx2)", flexShrink: 0 }}>✏️</button>
                          <button title="Remover" onClick={() => setCampConfirmDel(idx)}
                            style={{ background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "6px 10px", fontSize: 14, cursor: "pointer", color: "#C0392B", flexShrink: 0 }}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── PRÉ/PÓS-VENDA ── */}
        {tab === "posvenda" && (() => {
          // ── Componente interno reutilizável de régua ──────────────────────────
          // Parâmetros:
          //   title: string — título da seção
          //   desc: string — descrição
          //   etapas: array — lista de etapas atual
          //   onSalvar: (novas: array) => void — persiste novas etapas
          //   editandoKey: string — chave para identificar qual régua está em edição
          //     (usa pvPreEditando.campo === editandoKey para pré-venda, ou "pv" para pós-venda)
          //   isPosVendaRegua: boolean — true = usa pvEditando/pvEditLocal/pvConfirmDelete, false = usa pvPreEditando
          //   campo: string — nome do campo em preVendaRegua (para réguas de pré-venda)
          // ── TOGGLE HELPER ──────────────────────────────────────────────────────
          const ReguaToggle = ({ ativa, onToggle }: { ativa: boolean; onToggle: () => void }) => (
            <div onClick={onToggle} title={ativa ? "Régua ativa — clique para desativar" : "Régua inativa — clique para ativar"}
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
              <div style={{ width: 34, height: 19, borderRadius: 10, background: ativa ? "var(--q3)" : "var(--dk5)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
                <div style={{ width: 15, height: 15, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: ativa ? 17 : 2, transition: "left .2s" }} />
              </div>
              <span style={{ fontSize: 11, color: ativa ? "var(--q3)" : "var(--tx3)", fontWeight: 600 }}>{ativa ? "Ativa" : "Inativa"}</span>
            </div>
          );

          const AccordionHeader = ({ titulo, aberto, onToggle }: { titulo: string; aberto: boolean; onToggle: () => void }) => (
            <div onClick={onToggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 8px", marginTop: 8, borderTop: "1px solid var(--br)", cursor: "pointer", userSelect: "none" }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: "var(--tx)" }}>{titulo}</div>
              <div style={{ fontSize: 14, color: "var(--gold)", transition: "transform .2s ease", transform: aberto ? "rotate(180deg)" : "rotate(0deg)" }}>▼</div>
            </div>
          );

          const renderRegua = (
            title: string,
            desc: string,
            etapas: {id:string;label:string;dias:number;msg:string;canal:string;ativa?:boolean}[],
            onSalvar: (novas: {id:string;label:string;dias:number;msg:string;canal:string;ativa?:boolean}[]) => void,
            isPosVendaRegua: boolean,
            campo: string,
            reguaAtiva: boolean,
            onToggleRegua: () => void,
            tipoReguaLabel: string
          ) => {
            const getEditando = () => isPosVendaRegua ? pvEditando : (pvPreEditando?.campo === campo ? pvPreEditando.idx : null);
            const getEditLocal = () => isPosVendaRegua ? pvEditLocal : (pvPreEditando?.campo === campo ? pvPreEditLocal : null);
            const getConfirmDelete = () => isPosVendaRegua ? pvConfirmDelete : (pvPreConfirmDelete?.campo === campo ? pvPreConfirmDelete.idx : null);
            const setEditando = (idx: number | null) => {
              if (isPosVendaRegua) setPvEditando(idx);
              else setPvPreEditando(idx !== null ? { campo, idx } : null);
            };
            const setEditLocal = (val: any) => {
              if (isPosVendaRegua) setPvEditLocal(val);
              else setPvPreEditLocal(val);
            };
            const setConfirmDelete = (idx: number | null) => {
              if (isPosVendaRegua) setPvConfirmDelete(idx);
              else setPvPreConfirmDelete(idx !== null ? { campo, idx } : null);
            };
            const editandoIdx = getEditando();
            const editLocal = getEditLocal();
            const confirmDeleteIdx = getConfirmDelete();
            return (
              <div style={{ padding: "16px", borderTop: "1px solid var(--br)", marginTop: 8, opacity: reguaAtiva ? 1 : 0.65 }} key={title}>
                {/* Cabeçalho com toggle de régua */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--tx)" }}>{title}</div>
                  <ReguaToggle ativa={reguaAtiva} onToggle={onToggleRegua} />
                </div>
                <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 12 }}>{desc}</div>
                {/* Modal confirmação exclusão */}
                {confirmDeleteIdx !== null && (
                  <div className="ov" style={{ zIndex: 9999 }} onClick={() => setConfirmDelete(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(360px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "slideInRight .25s ease" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>Remover etapa?</div>
                      <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>Esta ação não pode ser desfeita. Deseja remover esta etapa da régua?</div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn-c" onClick={() => setConfirmDelete(null)}>Cancelar</button>
                        <button className="btn-s" style={{ background: "rgba(192,57,43,.18)", color: "#C0392B", border: "1px solid rgba(192,57,43,.4)" }} onClick={() => {
                          const nova = etapas.filter((_: any, i: number) => i !== confirmDeleteIdx);
                          onSalvar(nova);
                          if (editandoIdx === confirmDeleteIdx) { setEditando(null); setEditLocal(null); }
                          setConfirmDelete(null);
                        }}>Remover</button>
                      </div>
                    </div>
                  </div>
                )}
                {/* Modal confirmação disparo manual */}
                {disparoManualPendente && disparoManualPendente.campo === campo && (
                  <div className="ov" style={{ zIndex: 9999 }} onClick={() => setDisparoManualPendente(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(360px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "slideInRight .25s ease" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>Tem certeza disto?</div>
                      <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>
                        Você está prestes a enviar <strong>{disparoManualPendente.etapa?.label}</strong> agora para todos os clientes elegíveis. Esta ação não pode ser desfeita.
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button className="btn-c" onClick={() => setDisparoManualPendente(null)}>Cancelar</button>
                        <button className="btn-s" onClick={() => executarDisparoManual(disparoManualPendente.etapa, tipoReguaLabel)}>Confirmar</button>
                      </div>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 700 }}>
                  {etapas.map((etapa, idx) => {
                    const emEdicao = editandoIdx === idx;
                    const draft = emEdicao ? editLocal : etapa;
                    const canalEtapa = draft.canal || "email";
                    const canalLabel = canalEtapa === "email" ? "E-mail" : canalEtapa === "whatsapp" ? "WhatsApp" : "SMS";
                    const canalBloqueado = canaisHabilitados[canalEtapa as keyof typeof canaisHabilitados] === false;
                    const etapaAtiva = etapa.ativa !== false;
                    return (
                      <div key={etapa.id} style={{ background: "var(--dk3)", border: "1px solid " + (emEdicao ? "rgba(201,168,76,.4)" : "var(--br)"), borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, opacity: etapaAtiva ? 1 : 0.5 }}>
                        {emEdicao ? (
                          <>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input value={draft.label} onChange={e => setEditLocal((d: any) => ({ ...d, label: e.target.value }))} style={{ flex: 1, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif" }} placeholder="Label da etapa" />
                              <input type="number" value={draft.dias} min={0} onChange={e => setEditLocal((d: any) => ({ ...d, dias: Number(e.target.value) }))} style={{ width: 60, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", textAlign: "center" }} title="Dias na etapa" />
                              <span style={{ fontSize: 11, color: "var(--tx3)" }}>dias</span>
                              <select value={draft.canal || "email"} onChange={e => setEditLocal((d: any) => ({ ...d, canal: e.target.value }))} style={{ background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif" }}>
                                <option value="email" disabled={canaisHabilitados.email === false}>E-mail{canaisHabilitados.email === false ? " (desabilitado)" : ""}</option>
                                <option value="whatsapp" disabled={canaisHabilitados.whatsapp === false} style={{ opacity: canaisHabilitados.whatsapp === false ? 0.4 : 1 }}>WhatsApp{canaisHabilitados.whatsapp === false ? " (desabilitado)" : ""}</option>
                                <option value="sms" disabled={canaisHabilitados.sms === false} style={{ opacity: canaisHabilitados.sms === false ? 0.4 : 1 }}>SMS{canaisHabilitados.sms === false ? " (desabilitado)" : ""}</option>
                              </select>
                              <button onClick={() => setConfirmDelete(idx)} style={{ background: "rgba(192,57,43,.12)", border: "none", borderRadius: 5, padding: "4px 8px", fontSize: 12, color: "#C0392B", cursor: "pointer" }} title="Remover etapa">✕</button>
                            </div>
                            <textarea value={draft.msg} rows={2} onChange={e => setEditLocal((d: any) => ({ ...d, msg: e.target.value }))} style={{ width: "100%", background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 8px", fontSize: 11, color: "var(--tx2)", fontFamily: "'DM Sans',sans-serif", resize: "vertical", boxSizing: "border-box" }} placeholder="Mensagem da etapa (use {nome}, {estudio})" />
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <button className="btn-c" onClick={() => { setEditando(null); setEditLocal(null); }} style={{ fontSize: 11, padding: "4px 12px" }}>Cancelar</button>
                              <button className="btn-s" onClick={() => {
                                const base = [...etapas];
                                base[idx] = { ...base[idx], ...editLocal };
                                onSalvar(base);
                                setEditando(null);
                                setEditLocal(null);
                              }} style={{ fontSize: 11, padding: "4px 12px" }}>Salvar</button>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            {/* Toggle de etapa individual */}
                            <div onClick={() => {
                              const base = [...etapas];
                              base[idx] = { ...base[idx], ativa: !etapaAtiva };
                              onSalvar(base);
                            }} title={etapaAtiva ? "Etapa ativa" : "Etapa inativa"} style={{ marginTop: 2, width: 28, height: 16, borderRadius: 8, background: etapaAtiva ? "var(--q3)" : "var(--dk5)", position: "relative", transition: "background .2s", cursor: "pointer", flexShrink: 0 }}>
                              <div style={{ width: 12, height: 12, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: etapaAtiva ? 14 : 2, transition: "left .2s" }} />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--tx)" }}>{etapa.label || "Etapa sem título"}</span>
                                <span style={{ fontSize: 10, color: "var(--tx3)", background: "var(--dk4)", borderRadius: 4, padding: "1px 6px" }}>{etapa.dias} dias</span>
                                <span style={{ fontSize: 10, color: canalBloqueado ? "var(--q1)" : "var(--tx3)", background: canalBloqueado ? "rgba(192,57,43,.12)" : "var(--dk4)", borderRadius: 4, padding: "1px 6px", border: canalBloqueado ? "1px solid rgba(192,57,43,.3)" : "none" }} title={canalBloqueado ? "Canal não habilitado" : ""}>{canalLabel}{canalBloqueado ? " ⚠" : ""}</span>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{etapa.msg || <span style={{ fontStyle: "italic", opacity: 0.5 }}>Sem mensagem definida</span>}</div>
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <button onClick={() => setDisparoManualPendente({ etapa, tipoRegua: tipoReguaLabel, campo })} style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.35)", borderRadius: 5, padding: "4px 8px", fontSize: 11, color: "var(--gold)", cursor: "pointer" }} title="Enviar agora para clientes elegíveis">Enviar agora</button>
                              <button onClick={() => { setEditando(idx); setEditLocal({ ...etapa }); }} style={{ background: "none", border: "1px solid var(--br)", borderRadius: 5, padding: "4px 8px", fontSize: 13, color: "var(--tx3)", cursor: "pointer" }} title="Editar etapa">✏️</button>
                              <button onClick={() => setConfirmDelete(idx)} style={{ background: "rgba(192,57,43,.08)", border: "none", borderRadius: 5, padding: "4px 8px", fontSize: 12, color: "#C0392B", cursor: "pointer" }} title="Remover etapa">✕</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={() => {
                    const novaEtapa = { id: "etapa_" + Date.now(), label: "Nova etapa", dias: 7, msg: "", canal: "email", ativa: true };
                    const nova = [...etapas, novaEtapa];
                    onSalvar(nova);
                    setEditando(nova.length - 1);
                    setEditLocal({ ...novaEtapa });
                  }} style={{ background: "rgba(52,152,219,.1)", border: "1px dashed rgba(52,152,219,.4)", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: "#3498DB", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    ＋ Nova etapa
                  </button>
                </div>
              </div>
            );
          };

          const pvReguaEtapas = pvRegua.length > 0 ? pvRegua : PV_FLOW.map(p => ({ id: p.id, label: p.label, dias: p.dias, msg: p.msg, canal: "email", ativa: true }));

          return (
            <div className="pvw">
              {/* ── AGENDAMENTOS PENDENTES (vindos da Aura do site) ── */}
              {agendamentosPendentes.length > 0 && (
                <div style={{ padding: "14px 16px", background: "rgba(212,130,10,.07)", border: "1px solid rgba(212,130,10,.3)", borderRadius: 9, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--q2)" }}>🕒 Aguardando Aprovação</div>
                    <div style={{ fontSize: 11, background: "var(--q2)", color: "#fff", borderRadius: 10, padding: "1px 8px", fontWeight: 700 }}>{agendamentosPendentes.length}</div>
                  </div>
                  {agendamentosPendentes.map((p: any) => {
                    const dataFmt = p.data_solicitada ? String(p.data_solicitada).split("-").reverse().join("/") : "—";
                    return (
                      <div key={p.id} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>{p.cliente_nome}</div>
                            <div style={{ fontSize: 11, color: "var(--tx2)" }}>{p.cliente_telefone || "sem telefone"}{p.profissional_nome ? " — com " + p.profissional_nome : ""}</div>
                            <div style={{ fontSize: 11, color: "var(--tx2)" }}>{"Pedido: " + dataFmt + (p.hora_solicitada ? " às " + p.hora_solicitada : "") + (p.servico ? " — " + p.servico : "")}</div>
                            {p.observacoes && <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2, fontStyle: "italic" }}>{p.observacoes}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button onClick={() => setDecisaoPendente({ id: p.id, acao: "aprovar", nome: p.cliente_nome })} style={{ background: "rgba(39,174,96,.12)", border: "1px solid rgba(39,174,96,.35)", borderRadius: 5, padding: "5px 10px", fontSize: 11, color: "var(--q3)", cursor: "pointer", fontWeight: 600 }}>✅ Aprovar</button>
                            <button onClick={() => setDecisaoPendente({ id: p.id, acao: "recusar", nome: p.cliente_nome })} style={{ background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 5, padding: "5px 10px", fontSize: 11, color: "#C0392B", cursor: "pointer", fontWeight: 600 }}>❌ Recusar</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── MODAL: confirmação de aprovar/recusar agendamento pendente ── */}
              {decisaoPendente && (
                <div className="ov" style={{ zIndex: 9999 }} onClick={() => { if (!processandoDecisao) setDecisaoPendente(null); }}>
                  <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(380px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "slideInRight .25s ease" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>
                      {decisaoPendente.acao === "aprovar" ? "Confirmar este agendamento?" : "Recusar este agendamento?"}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>
                      {decisaoPendente.acao === "aprovar"
                        ? <>O cliente <strong>{decisaoPendente.nome}</strong> receberá um e-mail confirmando o agendamento.</>
                        : <>O cliente <strong>{decisaoPendente.nome}</strong> receberá um e-mail avisando que você vai ligar para combinar outra data.</>}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="btn-c" disabled={processandoDecisao} onClick={() => setDecisaoPendente(null)}>Cancelar</button>
                      <button className="btn-s" disabled={processandoDecisao} onClick={() => decidirAgendamentoPendente(decisaoPendente.id, decisaoPendente.acao)}>
                        {processandoDecisao ? "Processando..." : "Confirmar"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CANAIS HABILITADOS (status somente leitura, baseado em teste confirmado) ── */}
              <div style={{ padding: "14px 16px", background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 9, margin: "8px 0 0" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)", marginBottom: 4 }}>Canais habilitados</div>
                <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 10 }}>Status definido por teste real, em Configurações → IA. O canal usado em cada mensagem é escolhido na própria régua.</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {([["email", "E-mail"], ["whatsapp", "WhatsApp"], ["sms", "SMS"]] as const).map(([ch, label]) => {
                    const testado = canaisHabilitados[ch] === true;
                    return (
                      <div key={ch}
                        title={testado ? "Testado e aprovado" : "Ainda não testado — vá em Configurações → IA para testar"}
                        style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", background: testado ? "rgba(39,174,96,.08)" : "var(--dk3)", border: "1px solid " + (testado ? "rgba(39,174,96,.3)" : "var(--br)"), borderRadius: 7, opacity: testado ? 1 : 0.55 }}>
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: testado ? "var(--q3)" : "var(--tx3)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: testado ? "var(--q3)" : "var(--tx3)", fontWeight: 500 }}>{label}</span>
                        <span style={{ fontSize: 10, color: "var(--tx3)" }}>{testado ? "— testado e aprovado" : "— não testado"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── MODAL: confirmação de recebimento do teste de canal ── */}
              {testeCanalEnviado && (
                <div className="ov" style={{ zIndex: 9999 }} onClick={() => setTesteCanalEnviado(null)}>
                  <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(380px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "slideInRight .25s ease" }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>Você recebeu a mensagem de teste?</div>
                    <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>
                      Enviamos uma mensagem de teste via <strong>{testeCanalEnviado.canal === "email" ? "E-mail" : testeCanalEnviado.canal === "sms" ? "SMS" : "WhatsApp"}</strong> para <strong>{testeCanalEnviado.destino}</strong>. Confirme se ela chegou antes de marcar o canal como aprovado.
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button className="btn-c" onClick={() => confirmarRecebimentoTeste(false)}>Não recebi</button>
                      <button className="btn-s" onClick={() => confirmarRecebimentoTeste(true)}>Sim, recebi</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PRÉ-VENDA: clientes em follow-up de pós-venda ── */}
              {pvC.length === 0
                ? <div className="empty">Nenhum cliente em pós-venda.</div>
                : pvC.map(c => (
                  <div className="pvc" key={c.id}>
                    <div className="pvh">
                      <div>
                        <div className="pvn">{c.nome}</div>
                        <div className="pvm">
                          <span className={("at " + aClass(c.artista)) || ""} style={{ ...aStyle(c.artista), marginRight: 7 }}>{aName(c.artista).split(" ")[0]}</span>
                          {c.estilo}
                          {c.nps && <span style={{ marginLeft: 9, color: "var(--gold)", fontWeight: 600 }}>NPS: {c.nps}/10</span>}
                        </div>
                      </div>
                      <button className="mc" style={{ width: "auto", padding: "0 9px", fontSize: 11 }} onClick={() => { setSel(c); setSelCtx("clientes"); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); }}>Ver ficha</button>
                    </div>
                    <div className="pvt">
                      {c.pv.map((p: any, i: number) => (
                        <div className="pvs" key={i}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.s === "done" ? "var(--q3)" : p.s === "pending" ? "var(--q2)" : "var(--tx3)" }} />
                            <span className="pvsl">{p.l}</span>
                          </div>
                          <span className={"pvss " + (p.s === "done" ? "pvd" : p.s === "pending" ? "pvp" : "pvf")}>
                            {p.s === "done" ? "✓ Enviado" : p.s === "pending" ? "⏳ Pendente" : "🔮 Aguardando"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              }

              {/* ── RÉGUAS DE PRÉ-VENDA ── */}
              <AccordionHeader titulo="Réguas de Pré-Venda" aberto={pvAccordion.preVenda} onToggle={() => setPvAccordion(p => ({ ...p, preVenda: !p.preVenda }))} />
              {pvAccordion.preVenda && (<>
                <div style={{ padding: "0 16px 4px" }}>
                  <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 4 }}>Gatilho: dias desde que o cliente entrou na etapa atual. Antes de disparar, o sistema verifica se o cliente ainda está na etapa — se mudou, o disparo é cancelado e a contagem reinicia para a nova régua.</div>
                </div>
              {renderRegua(
                "Régua Lead",
                "Clientes na etapa Lead. Dispara conforme os dias na etapa atual.",
                preVendaRegua.lead,
                (novas) => salvarPreVendaRegua({ ...preVendaRegua, lead: novas }),
                false,
                "lead",
                preReguaAtiva.lead !== false,
                () => salvarPreReguaAtiva({ ...preReguaAtiva, lead: !preReguaAtiva.lead }),
                "pré-venda/lead"
              )}
              {renderRegua(
                "Régua Qualificação",
                "Clientes na etapa Qualificação. Dispara conforme os dias na etapa atual.",
                preVendaRegua.qualificacao,
                (novas) => salvarPreVendaRegua({ ...preVendaRegua, qualificacao: novas }),
                false,
                "qualificacao",
                preReguaAtiva.qualificacao !== false,
                () => salvarPreReguaAtiva({ ...preReguaAtiva, qualificacao: !preReguaAtiva.qualificacao }),
                "pré-venda/qualificacao"
              )}
              {renderRegua(
                "Régua Hibernação",
                "Clientes na etapa Hibernação. Dispara conforme os dias na etapa atual.",
                preVendaRegua.hibernacao,
                (novas) => salvarPreVendaRegua({ ...preVendaRegua, hibernacao: novas }),
                false,
                "hibernacao",
                preReguaAtiva.hibernacao !== false,
                () => salvarPreReguaAtiva({ ...preReguaAtiva, hibernacao: !preReguaAtiva.hibernacao }),
                "pré-venda/hibernacao"
              )}
              {renderRegua(
                "Régua Aguardando Agendamento",
                "Clientes com projeto em andamento que aguardam agendamento da próxima sessão. Diferente da Hibernação — aqui o cliente tem intenção confirmada e só precisa de um estímulo para agendar.",
                preVendaRegua.aguard_agend,
                (novas) => salvarPreVendaRegua({ ...preVendaRegua, aguard_agend: novas }),
                false,
                "aguard_agend",
                preReguaAtiva.aguard_agend !== false,
                () => salvarPreReguaAtiva({ ...preReguaAtiva, aguard_agend: !preReguaAtiva.aguard_agend }),
                "pré-venda/aguard_agend"
              )}
              </>)}

              {/* ── RÉGUA DE PRÉ-SESSÃO ── */}
              <AccordionHeader titulo="Régua de Pré-Sessão" aberto={pvAccordion.preSessao} onToggle={() => setPvAccordion(p => ({ ...p, preSessao: !p.preSessao }))} />
              {pvAccordion.preSessao && (() => {
                const etapasPS = preSessaoRegua.length > 0 ? preSessaoRegua : PRE_SESSAO_FLOW.map(p => ({ id: p.id, label: p.label, dias: p.dias, msg: p.msg, canal: "email" }));
                return (
                  <div style={{ padding: "16px", borderTop: "1px solid var(--br)", marginTop: 8, opacity: preSessaoReguaAtiva ? 1 : 0.65 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--tx)" }}>Confirmação e Lembretes</div>
                      <ReguaToggle ativa={preSessaoReguaAtiva} onToggle={() => salvarPreSessaoReguaAtiva(!preSessaoReguaAtiva)} />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 12 }}>Disparado para clientes com sessão agendada no período configurado abaixo.</div>
                    {/* Modal confirmação exclusão */}
                    {pvPreSessaoConfirmDelete !== null && (
                      <div className="ov" style={{ zIndex: 9999 }} onClick={() => setPvPreSessaoConfirmDelete(null)}>
                        <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(360px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "slideInRight .25s ease" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>Remover etapa?</div>
                          <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>Esta ação não pode ser desfeita. Deseja remover esta etapa da régua?</div>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="btn-c" onClick={() => setPvPreSessaoConfirmDelete(null)}>Cancelar</button>
                            <button className="btn-s" style={{ background: "rgba(192,57,43,.18)", color: "#C0392B", border: "1px solid rgba(192,57,43,.4)" }} onClick={() => {
                              const nova = etapasPS.filter((_: any, i: number) => i !== pvPreSessaoConfirmDelete);
                              salvarPreSessaoRegua(nova);
                              if (pvPreSessaoEditando === pvPreSessaoConfirmDelete) { setPvPreSessaoEditando(null); setPvPreSessaoEditLocal(null); }
                              setPvPreSessaoConfirmDelete(null);
                            }}>Remover</button>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Modal confirmação disparo manual */}
                    {disparoPreSessaoPendente && (
                      <div className="ov" style={{ zIndex: 9999 }} onClick={() => setDisparoPreSessaoPendente(null)}>
                        <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(360px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "slideInRight .25s ease" }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>Tem certeza disto?</div>
                          <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>
                            Você está prestes a enviar <strong>{disparoPreSessaoPendente.etapa?.label}</strong> agora para todos os clientes com sessão em <strong>{disparoPreSessaoPendente.etapa?.dias} dia(s)</strong>. Esta ação não pode ser desfeita.
                          </div>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="btn-c" onClick={() => setDisparoPreSessaoPendente(null)}>Cancelar</button>
                            <button className="btn-s" onClick={() => executarDisparoPreSessao(disparoPreSessaoPendente.etapa)}>Confirmar</button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 700 }}>
                      {etapasPS.map((etapa, idx) => {
                        const emEdicao = pvPreSessaoEditando === idx;
                        const draft = emEdicao ? pvPreSessaoEditLocal : etapa;
                        const canalEtapa = draft.canal || "email";
                        const canalLabel = canalEtapa === "email" ? "E-mail" : "SMS";
                        const canalBloqueado = canaisHabilitados[canalEtapa as keyof typeof canaisHabilitados] === false;
                        const etapaAtiva = etapa.ativa !== false;
                        return (
                          <div key={etapa.id} style={{ background: "var(--dk3)", border: "1px solid " + (emEdicao ? "rgba(201,168,76,.4)" : "var(--br)"), borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, opacity: etapaAtiva ? 1 : 0.5 }}>
                            {emEdicao ? (
                              <>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                  <input value={draft.label} onChange={e => setPvPreSessaoEditLocal((d: any) => ({ ...d, label: e.target.value }))} style={{ flex: 1, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif" }} placeholder="Nome da etapa" />
                                  <input type="number" value={draft.dias} min={1} onChange={e => setPvPreSessaoEditLocal((d: any) => ({ ...d, dias: Number(e.target.value) }))} style={{ width: 60, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", textAlign: "center" }} title="Dias antes da sessão" />
                                  <span style={{ fontSize: 11, color: "var(--tx3)", whiteSpace: "nowrap" }}>dias antes</span>
                                  <select value={draft.canal || "email"} onChange={e => setPvPreSessaoEditLocal((d: any) => ({ ...d, canal: e.target.value }))} style={{ background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 8px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif" }}>
                                    <option value="email" disabled={canaisHabilitados.email === false}>E-mail{canaisHabilitados.email === false ? " (desabilitado)" : ""}</option>
                                    <option value="sms" disabled={canaisHabilitados.sms === false}>SMS{canaisHabilitados.sms === false ? " (desabilitado)" : ""}</option>
                                  </select>
                                </div>
                                <textarea value={draft.msg} onChange={e => setPvPreSessaoEditLocal((d: any) => ({ ...d, msg: e.target.value }))} rows={4} style={{ width: "100%", background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 8px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", resize: "vertical" }} placeholder="Mensagem — use {nome}, {data}, {hora}, {artista}, {servico}, {estudio}" />
                                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                  <button className="btn-c" onClick={() => { setPvPreSessaoEditando(null); setPvPreSessaoEditLocal(null); }}>Cancelar</button>
                                  <button className="btn-s" onClick={() => {
                                    const nova = etapasPS.map((e, i) => i === idx ? { ...e, ...pvPreSessaoEditLocal } : e);
                                    salvarPreSessaoRegua(nova);
                                    setPvPreSessaoEditando(null);
                                    setPvPreSessaoEditLocal(null);
                                  }}>Salvar</button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                                    <div onClick={() => { const nova = etapasPS.map((e, i) => i === idx ? { ...e, ativa: !etapaAtiva } : e); salvarPreSessaoRegua(nova); }} style={{ width: 28, height: 16, borderRadius: 8, background: etapaAtiva ? "var(--q3)" : "var(--dk5)", position: "relative", transition: "background .2s", flexShrink: 0, cursor: "pointer" }}>
                                      <div style={{ width: 12, height: 12, background: "#fff", borderRadius: "50%", position: "absolute", top: 2, left: etapaAtiva ? 14 : 2, transition: "left .2s" }} />
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{etapa.label}</span>
                                    <span style={{ fontSize: 11, color: "var(--tx3)", whiteSpace: "nowrap" }}>— {etapa.dias} dia{etapa.dias !== 1 ? "s" : ""} antes</span>
                                    <span style={{ fontSize: 10, background: canalBloqueado ? "rgba(192,57,43,.15)" : "rgba(201,168,76,.12)", color: canalBloqueado ? "#C0392B" : "var(--gold)", border: "1px solid " + (canalBloqueado ? "rgba(192,57,43,.3)" : "rgba(201,168,76,.3)"), borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap" }}>{canalLabel}{canalBloqueado ? " ⚠️" : ""}</span>
                                  </div>
                                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                    <button onClick={() => setDisparoPreSessaoPendente({ etapa })} style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.35)", borderRadius: 5, padding: "4px 8px", fontSize: 11, color: "var(--gold)", cursor: "pointer" }} title={"Enviar agora para clientes com sessão em " + etapa.dias + " dia(s)"}>Enviar agora</button>
                                    <button onClick={() => { setPvPreSessaoEditando(idx); setPvPreSessaoEditLocal({ ...etapa }); }} style={{ background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 5, padding: "4px 8px", fontSize: 11, color: "var(--tx2)", cursor: "pointer" }}>Editar</button>
                                    <button onClick={() => setPvPreSessaoConfirmDelete(idx)} style={{ background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 5, padding: "4px 8px", fontSize: 11, color: "#C0392B", cursor: "pointer" }}>✕</button>
                                  </div>
                                </div>
                                <div style={{ fontSize: 11, color: "var(--tx3)", lineHeight: 1.6, paddingLeft: 36, fontStyle: "italic", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{etapa.msg}</div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={() => {
                        const nova = [...etapasPS, { id: "ps_" + Date.now(), label: "Nova etapa", dias: 2, msg: "Olá, {nome}! Sua sessão é em {data} às {hora}h com {artista}. Qualquer dúvida, é só chamar!", canal: "email", ativa: true }];
                        salvarPreSessaoRegua(nova);
                      }} style={{ background: "rgba(201,168,76,.08)", border: "1px dashed rgba(201,168,76,.35)", borderRadius: 8, padding: "8px", fontSize: 12, color: "var(--gold)", cursor: "pointer", textAlign: "center" }}>+ Adicionar etapa</button>
                    </div>
                  </div>
                );
              })()}

              {/* ── RÉGUA DE PÓS-VENDA ── */}
              <AccordionHeader titulo="Régua de Pós-Venda" aberto={pvAccordion.posVenda} onToggle={() => setPvAccordion(p => ({ ...p, posVenda: !p.posVenda }))} />
              {pvAccordion.posVenda && renderRegua(
                "Régua de Pós-Venda",
                "Configure as etapas de comunicação após cada sessão concluída. Cada profissional monta sua própria régua.",
                pvReguaEtapas,
                salvarPvRegua,
                true,
                "pv",
                pvReguaAtiva,
                () => salvarPvReguaAtiva(!pvReguaAtiva),
                "pós-venda"
              )}
            </div>
          );
        })()}

        {/* ── DISPAROS ── */}
        {tab === "disparos" && (
          <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, maxWidth: 780, width: "100%", animation: "fadeIn .15s ease" }}>

            {/* Cabeçalho */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: "var(--tx)" }}>Central de Comunicação</div>
              <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 3 }}>{"A " + (auraName || "IA") + " envia cada mensagem personalizada com os dados reais do cliente. Nenhuma mensagem é genérica."}</div>
            </div>

            {/* Alerta de data comemorativa próxima */}
            {(() => {
              const hoje = new Date();
              const hojeMs = hoje.getTime();
              const meses: Record<string,number> = {Jan:0,Fev:1,Mar:2,Abr:3,Mai:4,Jun:5,Jul:6,Ago:7,Set:8,Out:9,Nov:10,Dez:11};
              const msDay = 1000 * 60 * 60 * 24;
              let proximaData: any = null; let menorDiff = 999;
              DATAS.forEach(d => {
                const partes = d.data.split(" "); if (partes.length !== 2) return;
                const m = meses[partes[1]]; if (m === undefined) return;
                const dia = parseInt(partes[0]);
                let data = new Date(hoje.getFullYear(), m, dia);
                if (data.getTime() < hojeMs) data = new Date(hoje.getFullYear() + 1, m, dia);
                const diff = Math.floor((data.getTime() - hojeMs) / msDay);
                if (diff < menorDiff) { menorDiff = diff; proximaData = { ...d, diff }; }
              });
              if (!proximaData || proximaData.diff > 30) return null;
              const qtd = clients.filter(c => c.etapa === "lead").length;
              return (
                <div style={{ background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.25)", borderRadius: 8, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 22 }}>{proximaData.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>📅 {proximaData.label} em {proximaData.diff} dias</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>Você tem <strong style={{ color: "var(--tx)" }}>{qtd} clientes</strong> em nutrição que podem ser ativados agora.</div>
                  </div>
                </div>
              );
            })()}

            {/* BLOCO: Segmentos por perfil */}
            {(() => {
              const grupos = [
                {
                  titulo: "🔥 Reativação", subtitulo: "Clientes que sumiram mas podem voltar",
                  itens: [
                    { id: "q2", icon: "🟡", label: "Q2 — Prontos para avançar", desc: "Manifestaram interesse mas ainda não agendaram", f: (c: any) => c.qual === "Q2" },
                    { id: "retorno", icon: "🔄", label: "Retorno Sazonal", desc: "Tatuados há mais de 6 meses sem movimento", f: (c: any) => (c.etapa === "tatuado" || c.etapa === "pos_venda") && c.dias >= 180 },
                    { id: "q1", icon: "🔴", label: "Q1 — Em nutrição", desc: "Ainda não estão prontos — mensagem de valor", f: (c: any) => c.qual === "Q1" },
                  ]
                },
                {
                  titulo: "🖤 Relacionamento", subtitulo: "Para quem já faz parte da história",
                  itens: [
                    { id: "tatuados", icon: "🖤", label: "Tatuados", desc: "Já fizeram sessão — maior chance de retorno", f: (c: any) => c.etapa === "tatuado" || c.etapa === "pos_venda" },
                    { id: "primeira", icon: "✨", label: "Primeira Tattoo", desc: "Primeira vez — experiência especial", f: (c: any) => c.primeira },
                    { id: "google", icon: "⭐", label: "Avaliação Google", desc: "Tatuados que ainda não deixaram avaliação", f: (c: any) => (c.etapa === "tatuado" || c.etapa === "pos_venda") && !c.googleReview },
                  ]
                },
                {
                  titulo: "🎨 Por Profissional", subtitulo: "Comunicação personalizada de cada profissional",
                  itens: artists.map((a: any) => ({ id: a.id, icon: "🎨", label: "Clientes de " + a.nome, desc: "Mensagem com a voz de " + a.nome.split(" ")[0], f: (c: any) => c.artista === a.id }))
                },
                {
                  titulo: "👥 Base completa", subtitulo: "Para toda a base cadastrada",
                  itens: [
                    { id: "todos", icon: "👥", label: "Todos os clientes", desc: "Mensagem institucional para toda a base", f: () => true },
                    { id: "q0", icon: "🟣", label: "Q0 — Presenciais", desc: "Estiveram no atelier pessoalmente", f: (c: any) => c.qual === "Q0" },
                  ]
                },
              ];
              return grupos.map(grupo => (
                <div key={grupo.titulo} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", background: "var(--dk3)", borderBottom: "1px solid var(--br)" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>{grupo.titulo}</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>{grupo.subtitulo}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {grupo.itens.map((item, idx) => {
                      const cnt = clients.filter(item.f).length;
                      const isOpen = segSel === item.id;
                      const msg = MSGS[item.id] || "";
                      return (
                        <div key={item.id} style={{ borderBottom: idx < grupo.itens.length - 1 ? "1px solid var(--br)" : "none" }}>
                          <div onClick={() => { setSegSel(isOpen ? null : item.id); setDateSel(null); setSent(false); setEditing(false); setMsgEdit(""); }}
                            style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: isOpen ? "rgba(201,168,76,.06)" : "transparent" }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: isOpen ? "var(--gold)" : "var(--tx)" }}>{item.label}</div>
                              <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 1 }}>{item.desc}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: cnt > 0 ? "var(--gold)" : "var(--tx3)", background: cnt > 0 ? "rgba(201,168,76,.1)" : "var(--dk4)", border: "1px solid " + (cnt > 0 ? "rgba(201,168,76,.2)" : "var(--br)"), borderRadius: 20, padding: "2px 10px" }}>{cnt}</span>
                              <span style={{ fontSize: 12, color: "var(--tx3)" }}>{isOpen ? "▲" : "▼"}</span>
                            </div>
                          </div>
                          {isOpen && (
                            <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--br)", paddingTop: 14 }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{"Instrução para " + (auraName || "a IA")}</div>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button
                                      disabled={gerandoDisparo === item.id || !(instrucaoDisparo[item.id] || "").trim()}
                                      onClick={async () => {
                                        const instrucao = (instrucaoDisparo[item.id] || "").trim();
                                        if (!instrucao || !auraApiKey) return;
                                        setGerandoDisparo(item.id);
                                        try {
                                          const resp = await fetch("/api/aura", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                              apiKey: auraApiKey,
                                              system: "Você é " + (auraName || "a IA") + " do sistema INK SYSTEM. Gere uma mensagem de comunicação para o segmento indicado com base na instrução do usuário. Responda APENAS com o texto da mensagem, sem explicações, sem aspas, sem prefácio.",
                                              messages: [{ role: "user", content: "Segmento: " + item.label + "\nDestinatários: " + cnt + " clientes\nInstrução: " + instrucao }],
                                              tools: []
                                            })
                                          });
                                          const json = await resp.json();
                                          const texto = json.content?.find((b: any) => b.type === "text")?.text || "";
                                          if (texto) setMsgEdit(texto);
                                        } catch {}
                                        setGerandoDisparo(null);
                                      }}
                                      style={{ background: gerandoDisparo === item.id ? "var(--dk3)" : "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", opacity: !(instrucaoDisparo[item.id] || "").trim() ? 0.4 : 1 }}>
                                      {gerandoDisparo === item.id ? "⏳ Gerando..." : "✨ Gerar"}
                                    </button>
                                    {segSel === item.id && !editing && (
                                      <button onClick={() => { setEditing(true); setMsgEdit(msgEdit || msg); }}
                                        style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>✏️ Editar</button>
                                    )}
                                    {editing && segSel === item.id && (
                                      <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => { setEditing(false); setMsgEdit(""); }}
                                          style={{ background: "none", border: "1px solid var(--br)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: "var(--tx3)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancelar</button>
                                        <button onClick={() => setEditing(false)}
                                          style={{ background: "var(--gold)", border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Salvar</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <input
                                  className="fi"
                                  placeholder={"Ex: mensagem de fim de ano, tom descontraído..."}
                                  value={instrucaoDisparo[item.id] || ""}
                                  onChange={e => setInstrucaoDisparo(p => ({ ...p, [item.id]: e.target.value }))}
                                  style={{ fontSize: 12 }}
                                />
                              </div>
                              {editing && segSel === item.id
                                ? <textarea value={msgEdit || msg} onChange={e => setMsgEdit(e.target.value)}
                                    style={{ width: "100%", minHeight: 120, background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 7, padding: "10px 12px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, outline: "none", resize: "vertical" }} />
                                : <div style={{ background: "var(--dk3)", borderRadius: 7, padding: "10px 12px", fontSize: 12, color: "var(--tx2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{msgEdit || msg}</div>
                              }
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                                <span style={{ fontSize: 11, color: "var(--tx3)" }}>
                                  📩 {cnt} destinatário{cnt !== 1 ? "s" : ""}{cnt > 0 ? " — " + clients.filter(item.f).map((c: any) => c.nome.split(" ")[0]).slice(0, 3).join(", ") + (cnt > 3 ? " +" + (cnt - 3) : "") : ""}
                                </span>
                                {sent && segSel === item.id
                                  ? <div style={{ fontSize: 12, color: "var(--q3)", fontWeight: 600 }}>✓ Disparo programado!</div>
                                  : <button onClick={() => {
                                        const mensagemFinal = msgEdit || msg;
                                        if (!mensagemFinal.trim()) { setShowAviso("Escreva ou gere uma mensagem antes de disparar."); return; }
                                        setConfirmDisparo({ clientes: clients.filter(item.f), mensagem: mensagemFinal, segmento: item.label });
                                      }}
                                      disabled={cnt === 0}
                                      style={{ background: cnt === 0 ? "var(--dk4)" : "var(--gold)", color: cnt === 0 ? "var(--tx3)" : "#000", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: cnt === 0 ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                      📣 Disparar
                                    </button>
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}

            {/* BLOCO: Datas comemorativas */}
            <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: "var(--dk3)", borderBottom: "1px solid var(--br)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>📅 Datas Comemorativas</div>
                <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Mensagens emocionais para toda a base — cada uma com a assinatura do estúdio</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {DATAS.filter(d => d.id !== "aniversario").map((d, idx) => {
                  const isOpen = dateSel === d.id;
                  const msg = MSGS[d.id] || "";
                  const cnt = clients.length;
                  return (
                    <div key={d.id} style={{ borderBottom: idx < DATAS.filter(x => x.id !== "aniversario").length - 1 ? "1px solid var(--br)" : "none" }}>
                      <div onClick={() => { setDateSel(isOpen ? null : d.id); setSegSel(null); setSent(false); setEditing(false); setMsgEdit(""); }}
                        style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: isOpen ? "rgba(201,168,76,.06)" : "transparent" }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{d.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: isOpen ? "var(--gold)" : "var(--tx)" }}>{d.label}</div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 1 }}>{d.data}</div>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--tx3)" }}>{isOpen ? "▲" : "▼"}</span>
                      </div>
                      {isOpen && (
                        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--br)", paddingTop: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>{"Mensagem via " + (auraName || "IA")}</div>
                            {dateSel === d.id && !editing && (
                              <button onClick={() => { setEditing(true); setMsgEdit(msgEdit || msg); }}
                                style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>✏️ Editar</button>
                            )}
                            {editing && dateSel === d.id && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => { setEditing(false); setMsgEdit(""); }}
                                  style={{ background: "none", border: "1px solid var(--br)", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: "var(--tx3)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Cancelar</button>
                                <button onClick={() => setEditing(false)}
                                  style={{ background: "var(--gold)", border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Salvar</button>
                              </div>
                            )}
                          </div>
                          {editing && dateSel === d.id
                            ? <textarea value={msgEdit || msg} onChange={e => setMsgEdit(e.target.value)}
                                style={{ width: "100%", minHeight: 140, background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 7, padding: "10px 12px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, outline: "none", resize: "vertical" }} />
                            : <div style={{ background: "var(--dk3)", borderRadius: 7, padding: "10px 12px", fontSize: 12, color: "var(--tx2)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{msgEdit || msg}</div>
                          }
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "var(--tx3)" }}>📩 {cnt} destinatário{cnt !== 1 ? "s" : ""}</span>
                            {sent && dateSel === d.id
                              ? <div style={{ fontSize: 12, color: "var(--q3)", fontWeight: 600 }}>✓ Disparo programado!</div>
                              : <button onClick={() => {
                                    const mensagemFinal = msgEdit || msg;
                                    setConfirmDisparo({ clientes: clients, mensagem: mensagemFinal, segmento: d.label });
                                  }}
                                  style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                  📣 Disparar
                                </button>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BLOCO: Programa Aniversariante */}
            <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: "var(--dk3)", borderBottom: "1px solid var(--br)" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>🎂 Programa Aniversariante</div>
                <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Disparo automático às 9h do dia do aniversário — cada mensagem personalizada com nome e estilo do cliente</div>
              </div>
              {(() => {
                const isOpen = dateSel === "aniversario";
                const anivMes = clients.filter(c => isAniversMes((c as any).nascimento || ""));
                const anivHoje = clients.filter(c => isAniversHoje((c as any).nascimento || ""));
                return (
                  <div>
                    <div onClick={() => { setDateSel(isOpen ? null : "aniversario"); setSegSel(null); setSent(false); setEditing(false); setMsgEdit(""); }}
                      style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: isOpen ? "rgba(201,168,76,.06)" : "transparent" }}>
                      <span style={{ fontSize: 18 }}>🎂</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isOpen ? "var(--gold)" : "var(--tx)" }}>Configurar programa</div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 1 }}>
                          {anivMes.length > 0 ? anivMes.length + " aniversariante" + (anivMes.length > 1 ? "s" : "") + " este mês" : "Nenhum aniversariante este mês"}
                          {anivHoje.length > 0 && " · 🎉 Hoje: " + anivHoje.map(c => c.nome.split(" ")[0]).join(", ")}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.2)", borderRadius: 20, padding: "2px 10px" }}>{descontoAniversario}% desc.</span>
                      <span style={{ fontSize: 12, color: "var(--tx3)" }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid var(--br)", paddingTop: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <label style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Desconto (%)</label>
                            <input type="number" min={0} max={50} value={descontoAniversario} onChange={e => setDescontoAniversario(Number(e.target.value))}
                              style={{ background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 6, padding: "7px 11px", fontSize: 16, fontWeight: 700, color: "var(--gold)", outline: "none", width: 80, fontFamily: "'DM Sans',sans-serif", textAlign: "center" }} />
                          </div>
                          <div style={{ flex: 1, background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.15)", borderRadius: 7, padding: "10px 12px", fontSize: 11, color: "var(--tx2)", lineHeight: 1.6 }}>
                            🎂 <strong style={{ color: "var(--gold)" }}>{anivMes.length}</strong> cliente{anivMes.length !== 1 ? "s" : ""} fazem aniversário este mês
                            {anivHoje.length > 0 && <><br/>🎉 <strong style={{ color: "var(--gold)" }}>Hoje:</strong> {anivHoje.map(c => c.nome.split(" ")[0]).join(", ")}</>}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Instrução para a {auraName || "IA"}</label>
                          <textarea defaultValue={"Enviar no dia do aniversário do cliente. Usar o nome do cliente. Parabenizar pelo aniversário de forma calorosa e personalizada. Mencionar o estilo de tatuagem favorito do cliente se disponível. Oferecer " + descontoAniversario + "% de desconto em qualquer sessão realizada durante o mês do aniversário. Tom: caloroso e pessoal, não promocional. Finalizar com convite para agendar."}
                            style={{ width: "100%", minHeight: 110, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "10px 12px", fontSize: 11, color: "var(--tx2)", fontFamily: "'DM Sans',sans-serif", resize: "vertical", outline: "none", lineHeight: 1.6 }} />
                          <div style={{ fontSize: 10, color: "var(--tx3)" }}>{"A " + (auraName || "IA") + " usa estas instruções para compor cada mensagem — personalizada com nome, estilo e artista do cliente."}</div>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", fontStyle: "italic" }}>💡 O disparo acontece automaticamente às 9h do dia do aniversário — sem precisar lembrar.</div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Histórico de disparos */}
            {disparosHist.length > 0 && (
              <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", background: "var(--dk3)", borderBottom: "1px solid var(--br)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>📋 Histórico desta sessão</div>
                </div>
                <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {disparosHist.map((d: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < disparosHist.length - 1 ? "1px solid var(--br)" : "none" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>{d.segmento}</div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2, fontStyle: "italic" }}>{d.preview}...</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <div style={{ fontSize: 10, color: "var(--q3)", fontWeight: 700 }}>✓ {d.destinatarios} env.</div>
                        <div style={{ fontSize: 10, color: "var(--tx3)" }}>{d.hora}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── AVISO ALTERAÇÕES NÃO SALVAS ── */}
        {(fichaWarnSair || fichaTabPendente) && (
          <div className="ov" style={{ zIndex: 350 }}>
            <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 11, padding: "24px 28px", maxWidth: 380, width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)" }}>Alterações não salvas</div>
              <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.6 }}>Você fez alterações que ainda não foram salvas. O que deseja fazer?</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button onClick={() => { setFichaWarnSair(false); setFichaTabPendente(null); }}
                  style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "7px 14px", fontSize: 12, color: "var(--tx2)", cursor: "pointer" }}>
                  Continuar editando
                </button>
                <button onClick={() => {
                  if (fichaTabPendente) {
                    setFichaTab(fichaTabPendente as any);
                    setFichaTabPendente(null);
                    setFichaEditada(false);
                    setFichaSaveStep(0);
                  } else {
                    setSel(null);
                    setFichaWarnSair(false);
                    setFichaEditada(false);
                    setFichaSaveStep(0);
                    setFichaTab("dados");
                  }
                }} style={{ background: "rgba(192,57,43,.15)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "7px 14px", fontSize: 12, color: "var(--q1)", cursor: "pointer", fontWeight: 600 }}>
                  Descartar alterações
                </button>
                <button onClick={() => { setFichaWarnSair(false); setFichaTabPendente(null); setFichaSaveStep(1); }}
                  style={{ background: "var(--gold)", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>
                  Salvar antes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CLIENTE ── */}
        {sc && (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) { if (fichaEditada) { setFichaWarnSair(true); } else { setSel(null); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); } } }}>
            <div className="modal">
              <div className="mh" style={{ position: "relative" }}>
                <div style={{ flex: 1 }}>
                  <div className="mn">{isMenor((sc as any).nascimento || "") ? "👼 " : ""}{isAniversMes((sc as any).nascimento || "") ? "🎂 " : ""}{sc.nome}</div>
                  <div className="ms">
                    <span className={"qb " + QC[sc.qual]}>{sc.qual}{sc.qual === "Q0" ? " - Presencial" : ""}</span>
                    <span className={("at " + aClass(sc.artista)) || ""} style={aStyle(sc.artista)}>{aName(sc.artista).split(" ")[0]}</span>
                    {sc.etapa === "blacklist" && <span className="tag-bl">🚫</span>}
                    {sc.etapa === "lista_espera" && <span className="tag-wl">⏳</span>}
                    {isMenor((sc as any).nascimento || "") && <span style={{ fontSize: 10, fontWeight: 700, color: "#9B59B6", background: "rgba(155,89,182,.12)", border: "1px solid rgba(155,89,182,.3)", borderRadius: 4, padding: "1px 6px" }}>👼 Menor de idade</span>}
                    {isAniversHoje((sc as any).nascimento || "") && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", background: "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 4, padding: "1px 6px" }}>🎂 Aniversário hoje!</span>}
                    <span style={{ color: "var(--tx3)", fontSize: 11 }}>Entrou em {sc.data}</span>
                    {(() => { const s = calcScore(sc); return <span style={{ fontSize: 10, fontWeight: 700, color: s.cor, background: s.cor + "22", border: "1px solid " + s.cor + "44", borderRadius: 4, padding: "1px 6px", letterSpacing: ".04em" }}>⭐ {s.label} {s.score}</span>; })()}
                    {(() => {
                      const projs = (sc.projetos || []).filter((p: any) => p.status !== "concluido" && p.status !== "cancelado" && p.valorTotal > 0);
                      const totalProj = projs.reduce((acc: number, p: any) => acc + (Number(p.valorTotal) || 0), 0);
                      const totalPago = fin.filter((f: any) => f.cliente_id === sc.id && f.tipo !== "saida" && !f.is_permuta).reduce((acc: number, f: any) => acc + (Number(f.val_a) || 0), 0);
                      const saldo = totalProj - totalPago;
                      if (totalProj <= 0) return null;
                      return saldo > 0
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#E74C3C", background: "rgba(231,76,60,0.12)", padding: "2px 8px", borderRadius: 6 }}>Saldo: R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, color: "#27AE60", background: "rgba(39,174,96,0.12)", padding: "2px 8px", borderRadius: 6 }}>✓ Quitado</span>;
                    })()}
                    {miss(sc).map((m: string) => <span key={m} className="atag">⚠ Sem {m}</span>)}
                  </div>
                </div>
                <button className="mc" onClick={() => { if (fichaEditada) { setFichaWarnSair(true); } else { setSel(null); setFichaTab("dados"); setFichaEditada(false); setFichaSaveStep(0); } }}>✕</button>
              </div>
              {/* ── TABS DA FICHA ── */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--br)", background: "var(--dk2)", overflowX: "auto", flexShrink: 0, WebkitOverflowScrolling: "touch" as any }}>
                {(["dados","jornada","docs","historico"] as const).map(tab => {
                  const labels: Record<string,string> = { dados: "Dados", jornada: "Jornada", docs: "Documentos", historico: "Histórico" };
                  return (
                    <button key={tab} onClick={() => {
                      if (tab === fichaTab) return;
                      if (fichaEditada) { setFichaTabPendente(tab); } else { setFichaTab(tab); }
                    }} style={{ padding: "9px 14px", fontSize: 12, fontWeight: 500, color: fichaTab === tab ? "var(--gold)" : "var(--tx2)", background: "none", border: "none", borderBottom: fichaTab === tab ? "2px solid var(--gold)" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'DM Sans',sans-serif" }}>
                      {labels[tab]}{fichaEditada && tab === fichaTab ? " •" : ""}
                    </button>
                  );
                })}
              </div>
              <div className="mb">
                {(() => {
                  const projSemValor = (sc.projetos || []).find((p: any) => { const vt = Number(String(p.valorTotal || "0").replace(/\./g,"").replace(",",".")); return p.status !== "concluido" && p.status !== "cancelado" && vt <= 0; });
                  return projSemValor && sc.etapa !== "lead" ? (
                    <div className="ba">
                      <span style={{ fontSize: 18 }}>💰</span>
                      <div style={{ flex: 1, fontSize: 12, color: "var(--q2)", fontWeight: 600 }}>Valor do projeto não registrado — informe o valor combinado.</div>
                      <button className="btn-sm gold" onClick={() => setOrcamentoModal({ cid: sc.id, valor: "" })}>Registrar</button>
                    </div>
                  ) : null;
                })()}

                {fichaTab === "dados" && <div>
                  <div className="stit">Dados Básicos</div>
                  <div className="fg2">
                    {[
                      { l: "Nome", f: "nome" }, { l: "Telefone", f: "tel" },
                      { l: "Email", f: "email", w: !sc.email }, { l: "Instagram", f: "insta", w: !sc.insta }
                    ].map((fd, i) => (
                      <div className="fi2" key={i}>
                        <div className="fil">{fd.l}{(fd as any).w ? " ⚠" : ""}</div>
                        <input className="ef" value={(sc as any)[fd.f] || ""} placeholder={(fd as any).w ? "Clique para adicionar" : ""}
                          onChange={e => upCFicha(sc.id, fd.f, e.target.value)}
                          style={{ borderColor: fd.f === "email" && (sc as any).email && !validarEmail((sc as any).email) ? "var(--q1)" : (fd as any).w && !(sc as any)[fd.f] ? "var(--q2)" : "var(--br)" }} />
                        {fd.f === "email" && (sc as any).email && !validarEmail((sc as any).email) && (
                          <span style={{ fontSize: 10, color: "var(--q1)", marginTop: 3, display: "block" }}>Email inválido</span>
                        )}
                      </div>
                    ))}
                    <div className="fi2">
                      <div className="fil">Profissional Responsável</div>
                      <select className="ef" value={sc.artista || ""} onChange={e => {
                        const novoArtista = e.target.value;
                        const antigoArtista = sc.artista || "";
                        if (novoArtista !== antigoArtista) {
                          const hoje = new Date().toISOString().split("T")[0];
                          const eventosFuturos = agEvents.filter(ev => ev.cliente_id === sc.id && ev.date >= hoje && ev.status !== "concluido" && ev.status !== "cancelado" && ev.tipo?.includes(antigoArtista));
                          upC(sc.id, "artista", novoArtista);
                          if (eventosFuturos.length > 0) {
                            setConfirmTrocarProfissional({ clienteId: sc.id, novoArtista, antigoArtista });
                          }
                        }
                      }}>
                        {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                      </select>
                    </div>
                    {[{ l: "Origem", v: sc.orig }, { l: "Observações", v: sc.cri }].map((fd, i) => (
                      <div className="fi2" key={i}><div className="fil">{fd.l}</div><div className="fiv">{fd.v || "—"}</div></div>
                    ))}

                    <div className="fi2">
                      <div className="fil">Data de Nascimento</div>
                      {(() => {
                        const nasc = (sc as any).nascimento || "";
                        const partes = nasc.includes("/") ? nasc.split("/") : nasc.includes("-") ? [nasc.split("-")[2], nasc.split("-")[1], nasc.split("-")[0]] : ["","",""];
                        const diaDB = partes[0] || "";
                        const mesDB = partes[1] || "";
                        const anoDBv = partes[2] || "";
                        const diaV = nascDraft.dia || diaDB;
                        const mesV = nascDraft.mes || mesDB;
                        const anoV = nascDraft.ano || anoDBv;
                        const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
                        const anoAtual = new Date().getFullYear();
                        const anos = Array.from({ length: anoAtual - 1919 }, (_, i) => anoAtual - i);
                        const atualizar = (campo: string, valor: string) => {
                          const novo = { ...nascDraft, [campo]: valor };
                          setNascDraft(novo);
                          const d = campo === "dia" ? valor : diaV;
                          const m = campo === "mes" ? valor : mesV;
                          const a = campo === "ano" ? valor : anoV;
                          if (d && m && a) {
                            upC(sc.id, "nascimento", d.padStart(2,"0") + "/" + m.padStart(2,"0") + "/" + a);
                            setNascDraft({ dia: "", mes: "", ano: "" });
                          }
                        };
                        return (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr", gap: 6 }}>
                            <select className="ef" value={diaV} onChange={e => atualizar("dia", e.target.value)} style={{ fontFamily: "'DM Sans',sans-serif" }}>
                              <option value="">Dia</option>
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                <option key={d} value={String(d).padStart(2,"0")}>{d}</option>
                              ))}
                            </select>
                            <select className="ef" value={mesV} onChange={e => atualizar("mes", e.target.value)} style={{ fontFamily: "'DM Sans',sans-serif" }}>
                              <option value="">Mês</option>
                              {meses.map((m, i) => (
                                <option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>
                              ))}
                            </select>
                            <select className="ef" value={anoV} onChange={e => atualizar("ano", e.target.value)} style={{ fontFamily: "'DM Sans',sans-serif" }}>
                              <option value="">Ano</option>
                              {anos.map(a => (
                                <option key={a} value={String(a)}>{a}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="fi2">
                      <div className="fil">Documento <span style={{ fontSize: 9, color: "var(--tx3)" }}>CPF — opcional</span></div>
                      <input className="ef" placeholder="000.000.000-00" value={(sc as any).documento || ""}
                        maxLength={14}
                        onChange={e => {
                          const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                          const fmt = raw.length <= 3 ? raw
                            : raw.length <= 6 ? raw.slice(0,3) + "." + raw.slice(3)
                            : raw.length <= 9 ? raw.slice(0,3) + "." + raw.slice(3,6) + "." + raw.slice(6)
                            : raw.slice(0,3) + "." + raw.slice(3,6) + "." + raw.slice(6,9) + "-" + raw.slice(9);
                          upCFicha(sc.id, "documento", fmt);
                        }} />
                    </div>
                  </div>
                </div>}

                {fichaTab === "jornada" && (() => {
                  const jStatus: Record<number,string> = (sc as any).jornada_status || {};
                  const salvarStatus = async (etapaId: number, status: string) => {
                    const novoStatus = { ...jStatus, [etapaId]: status };
                    upCFicha(sc.id, "jornada_status", novoStatus);
                    await sb.from("clientes").update({ jornada_status: novoStatus }).eq("id", sc.id);
                    setFichaEditada(false);
                  };
                  const salvarOrdemEtapas = async (lista: typeof jornadaEtapas) => {
                    for (const e of lista) {
                      await sb.from("jornada_etapas").update({ ordem: e.ordem }).eq("id", e.id);
                    }
                  };
                  const statusCor: Record<string,string> = { concluido: "#27ae60", ativo: "var(--gold)", pendente: "var(--tx3)", pulado: "var(--q1)" };
                  const statusLabel: Record<string,string> = { concluido: "Concluido", ativo: "Ativo", pendente: "Pendente", pulado: "Pulado" };
                  const proximoStatus = (s: string) => ({ pendente: "ativo", ativo: "concluido", concluido: "pulado", pulado: "pendente" })[s] || "pendente";
                  return (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div className="stit" style={{ marginBottom: 0 }}>Jornada do Cliente</div>
                        <button onClick={() => { setJornadaNovaEtapa(true); setJornadaNovoNome(""); }}
                          style={{ fontSize: 11, fontWeight: 600, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "4px 10px", color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                          + Etapa
                        </button>
                      </div>

                      {/* nova etapa inline */}
                      {jornadaNovaEtapa && (
                        <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
                          <input autoFocus className="ef" placeholder="Nome da etapa..." value={jornadaNovoNome}
                            onChange={e => setJornadaNovoNome(e.target.value)}
                            onKeyDown={async e => {
                              if (e.key === "Enter" && jornadaNovoNome.trim()) {
                                const maxOrdem = jornadaEtapas.length > 0 ? Math.max(...jornadaEtapas.map(x => x.ordem)) + 1 : 1;
                                const { data: nova } = await sb.from("jornada_etapas").insert({ nome: jornadaNovoNome.trim(), ordem: maxOrdem, tipo: "manual" }).select().single();
                                if (nova) setJornadaEtapas(p => [...p, nova]);
                                setJornadaNovaEtapa(false); setJornadaNovoNome("");
                              } else if (e.key === "Escape") { setJornadaNovaEtapa(false); }
                            }}
                            style={{ flex: 1 }} />
                          <button onClick={async () => {
                            if (!jornadaNovoNome.trim()) return;
                            const maxOrdem = jornadaEtapas.length > 0 ? Math.max(...jornadaEtapas.map(x => x.ordem)) + 1 : 1;
                            const { data: nova } = await sb.from("jornada_etapas").insert({ nome: jornadaNovoNome.trim(), ordem: maxOrdem, tipo: "manual" }).select().single();
                            if (nova) setJornadaEtapas(p => [...p, nova]);
                            setJornadaNovaEtapa(false); setJornadaNovoNome("");
                          }} style={{ background: "var(--gold)", border: "none", borderRadius: 5, padding: "5px 12px", fontSize: 11, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>OK</button>
                          <button onClick={() => setJornadaNovaEtapa(false)} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 5, padding: "5px 10px", fontSize: 11, color: "var(--tx2)", cursor: "pointer" }}>✕</button>
                        </div>
                      )}

                      {/* lista de etapas */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {jornadaEtapas.map((etapa, idx) => {
                          const st = jStatus[etapa.id] || "pendente";
                          const cor = statusCor[st];
                          const isEditando = jornadaEditandoId === etapa.id;
                          const isUndo = jornadaUndoDelete?.etapa?.id === etapa.id;
                          if (isUndo) return null;
                          const moverEtapa = async (de: number, para: number) => {
                            if (para < 0 || para >= jornadaEtapas.length) return;
                            const nova = [...jornadaEtapas];
                            const [mov] = nova.splice(de, 1);
                            nova.splice(para, 0, mov);
                            const reordenada = nova.map((e, i) => ({ ...e, ordem: i + 1 }));
                            setJornadaEtapas(reordenada);
                            await salvarOrdemEtapas(reordenada);
                          };
                          return (
                            <div key={etapa.id}
                              draggable
                              onDragStart={() => setJornadaDragIdx(idx)}
                              onDragOver={e => e.preventDefault()}
                              onDrop={async () => {
                                if (jornadaDragIdx === null || jornadaDragIdx === idx) return;
                                await moverEtapa(jornadaDragIdx, idx);
                                setJornadaDragIdx(null);
                              }}
                              onDragEnd={() => setJornadaDragIdx(null)}
                              style={{ display: "flex", alignItems: "center", gap: 8, background: jornadaDragIdx === idx ? "var(--dk4)" : "var(--dk3)", border: `1px solid ${jornadaDragIdx === idx ? "var(--gold)" : "var(--br)"}`, borderRadius: 8, padding: "9px 10px", cursor: "default", opacity: jornadaDragIdx === idx ? 0.5 : 1 }}>
                              {/* status dot */}
                              <button title={`Status: ${statusLabel[st]} — clique para alternar`}
                                onClick={() => salvarStatus(etapa.id, proximoStatus(st))}
                                style={{ width: 12, height: 12, borderRadius: "50%", background: cor, border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }} />
                              {/* nome editável */}
                              {isEditando ? (
                                <input autoFocus className="ef" value={jornadaEditNome}
                                  onChange={e => setJornadaEditNome(e.target.value)}
                                  onKeyDown={async e => {
                                    if (e.key === "Enter") {
                                      await sb.from("jornada_etapas").update({ nome: jornadaEditNome }).eq("id", etapa.id);
                                      setJornadaEtapas(p => p.map(x => x.id === etapa.id ? { ...x, nome: jornadaEditNome } : x));
                                      setJornadaEditandoId(null);
                                    } else if (e.key === "Escape") { setJornadaEditandoId(null); }
                                  }}
                                  onBlur={async () => {
                                    await sb.from("jornada_etapas").update({ nome: jornadaEditNome }).eq("id", etapa.id);
                                    setJornadaEtapas(p => p.map(x => x.id === etapa.id ? { ...x, nome: jornadaEditNome } : x));
                                    setJornadaEditandoId(null);
                                  }}
                                  style={{ flex: 1, fontSize: 12 }} />
                              ) : (
                                <span onDoubleClick={() => { setJornadaEditandoId(etapa.id); setJornadaEditNome(etapa.nome); }}
                                  style={{ flex: 1, fontSize: 12, color: "var(--tx)", cursor: "text", userSelect: "none" }} title="Duplo clique para editar">
                                  {etapa.nome}
                                </span>
                              )}
                              {/* status label */}
                              <span style={{ fontSize: 10, color: cor, fontWeight: 600, whiteSpace: "nowrap" }}>{statusLabel[st]}</span>
                              {/* setas reordenar */}
                              <button onClick={() => moverEtapa(idx, idx - 1)} disabled={idx === 0}
                                style={{ background: "none", border: "none", color: idx === 0 ? "var(--dk4)" : "var(--tx3)", cursor: idx === 0 ? "default" : "pointer", fontSize: 13, padding: "0 1px", lineHeight: 1 }} title="Mover para cima">&#8593;</button>
                              <button onClick={() => moverEtapa(idx, idx + 1)} disabled={idx === jornadaEtapas.length - 1}
                                style={{ background: "none", border: "none", color: idx === jornadaEtapas.length - 1 ? "var(--dk4)" : "var(--tx3)", cursor: idx === jornadaEtapas.length - 1 ? "default" : "pointer", fontSize: 13, padding: "0 1px", lineHeight: 1 }} title="Mover para baixo">&#8595;</button>
                              {/* toggle auto/manual */}
                              <button title={etapa.tipo === "auto" ? "Automatico — clique para manual" : "Manual — clique para automatico"}
                                onClick={async () => {
                                  const novoTipo = etapa.tipo === "auto" ? "manual" : "auto";
                                  await sb.from("jornada_etapas").update({ tipo: novoTipo }).eq("id", etapa.id);
                                  setJornadaEtapas(p => p.map(x => x.id === etapa.id ? { ...x, tipo: novoTipo } : x));
                                }}
                                style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--br)", background: etapa.tipo === "auto" ? "rgba(201,168,76,.15)" : "var(--dk4)", color: etapa.tipo === "auto" ? "var(--gold)" : "var(--tx3)", cursor: "pointer", whiteSpace: "nowrap" }}>
                                {etapa.tipo === "auto" ? "AUTO" : "MANUAL"}
                              </button>
                              {/* excluir */}
                              <button onClick={() => {
                                if (jornadaUndoDelete?.timer) clearTimeout(jornadaUndoDelete.timer);
                                const timer = setTimeout(async () => {
                                  await sb.from("jornada_etapas").delete().eq("id", etapa.id);
                                  setJornadaEtapas(p => p.filter(x => x.id !== etapa.id));
                                  setJornadaUndoDelete(null);
                                }, 8000);
                                setJornadaUndoDelete({ etapa, timer });
                              }} style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 13, padding: "0 2px" }} title="Excluir etapa">&#10005;</button>
                            </div>
                          );
                        })}
                      </div>

                      {/* undo delete */}
                      {jornadaUndoDelete && (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 7, padding: "8px 12px" }}>
                          <span style={{ fontSize: 12, color: "var(--tx2)", flex: 1 }}>Etapa "{jornadaUndoDelete.etapa.nome}" sera excluida em 8s...</span>
                          <button onClick={() => { clearTimeout(jornadaUndoDelete.timer); setJornadaUndoDelete(null); }}
                            style={{ background: "var(--gold)", border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 11, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>Desfazer</button>
                        </div>
                      )}

                      <div style={{ marginTop: 14, fontSize: 10, color: "var(--tx3)", lineHeight: 1.6 }}>
                        Clique no ponto colorido para alternar o status. Duplo clique no nome para editar. Arraste para reordenar. Alteracoes de ordem e status sao salvas imediatamente.
                      </div>
                    </div>
                  );
                })()}

                {fichaTab === "docs" && (() => {
                  const docsStatus: Record<string,string> = (sc as any).docs_status || {};
                  const anamnese: Record<string,any> = (sc as any).anamnese || {};
                  const stCorDoc = (s: string) => s === "assinado" ? "#27ae60" : s === "enviado" ? "var(--gold)" : "var(--tx3)";
                  const stLblDoc = (s: string) => s === "assinado" ? "Assinado" : s === "enviado" ? "Enviado" : "Pendente";

                  const salvarAnamnese = async (campos: any) => {
                    await sb.from("clientes").update({ anamnese: campos }).eq("id", sc.id);
                    upCFicha(sc.id, "anamnese", campos);
                    setFichaEditada(false);
                  };
                  const salvarDocsStatus = async (doc: string, status: string) => {
                    const novo = { ...docsStatus, [doc]: status };
                    await sb.from("clientes").update({ docs_status: novo }).eq("id", sc.id);
                    upCFicha(sc.id, "docs_status", novo);
                    setFichaEditada(false);
                  };
                  const salvarAssinatura = async (campo: string, base64: string) => {
                    await sb.from("clientes").update({ [campo]: base64 }).eq("id", sc.id);
                    upCFicha(sc.id, campo, base64);
                    setFichaEditada(false);
                  };

                  const capturarAssinatura = () => {
                    if (!docsCanvasRef) return null;
                    return docsCanvasRef.toDataURL("image/png");
                  };
                  const limparCanvas = () => {
                    if (!docsCanvasRef) return;
                    const ctx = docsCanvasRef.getContext("2d");
                    if (ctx) ctx.clearRect(0, 0, docsCanvasRef.width, docsCanvasRef.height);
                  };

                  const calcIdade = () => {
                    const nasc = (sc as any).nascimento;
                    if (!nasc) return null;
                    const [d, m, a] = nasc.split("/").map(Number);
                    if (!a) return null;
                    const hoje = new Date();
                    let idade = hoje.getFullYear() - a;
                    if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) idade--;
                    return idade;
                  };
                  const idade = calcIdade();
                  const eMenor = idade !== null && idade < 18;

                  const pergAnamnese = [
                    { id: "alergia", label: "Tem alguma alergia?", detalhe: true },
                    { id: "diabetes", label: "Tem diabetes?" },
                    { id: "coagulacao", label: "Tem problemas de coagulacao ou hemofilia?" },
                    { id: "autoimune", label: "Tem doenca autoimune?", detalhe: true },
                    { id: "epilepsia", label: "Tem epilepsia?" },
                    { id: "gravida", label: "Esta gravida ou amamentando?" },
                    { id: "anticoagulante", label: "Faz uso de anticoagulantes?", detalhe: true },
                    { id: "pressao", label: "Tem pressao alta ou problemas cardiacos?" },
                    { id: "queloides", label: "Tem tendencia a queloides?" },
                    { id: "alcool", label: "Ingeriu alcool nas ultimas 24h?" },
                    { id: "aspirina", label: "Tomou aspirina nos ultimos 7 dias?" },
                    { id: "cicatrizacao", label: "Tem historico de cicatrizacao lenta ou problemas de pele?" },
                  ];

                  const gerarEsalvarPdf = async (docId: string) => {
                    setDocsGerandoPdf(true);
                    try {
                      // Converte URL pública ou base64 em base64 para uso no addImage do jsPDF
                      const normImagem = async (valor: string | undefined): Promise<string | null> => {
                        if (!valor) return null;
                        if (valor.startsWith("data:")) return valor;
                        if (valor.startsWith("http")) {
                          try {
                            const r = await fetch(valor);
                            const bl = await r.blob();
                            return await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(bl); });
                          } catch(e) { console.error("normImagem falhou:", valor, e); return null; }
                        }
                        return null;
                      };

                      const doc = new jsPDF({ unit: "mm", format: "a4" });
                      const W = 210; let y = 20;
                      const ln = (texto: string, size=11, bold=false, cor: [number,number,number]=[30,30,30]) => {
                        doc.setFontSize(size); doc.setFont("helvetica", bold?"bold":"normal"); doc.setTextColor(...cor);
                        const linhas = doc.splitTextToSize(texto, W-40);
                        linhas.forEach((l: string) => { if(y>270){doc.addPage();y=20;} doc.text(l,20,y); y+=size*0.45; });
                        y+=2;
                      };
                      const titulos: Record<string,string> = { anamnese:"FICHA DE ANAMNESE",contrato:"CONTRATO DE EXECUCAO DE PROJETO ARTISTICO",menor:"AUTORIZACAO DE RESPONSAVEL LEGAL" };
                      ln(titulos[docId]||"DOCUMENTO",16,true,[180,140,50]);
                      y+=3;
                      ln(`Cliente: ${sc.nome}  |  Data: ${new Date().toLocaleDateString("pt-BR")}`,10,false,[100,100,100]);
                      y+=4;
                      if(docId==="anamnese"){
                        ln("QUESTIONARIO DE SAUDE",13,true);
                        pergAnamnese.forEach(p => {
                          const r = anamnese[p.id]?.resp;
                          const det = anamnese[p.id]?.detalhe;
                          ln(`${p.label}  →  ${r==="sim"?"SIM":r==="nao"?"NAO":"Nao respondido"}${det?` (${det})`:""}`);
                        });
                        if(anamnese.obs){y+=2;ln("Observacoes:",11,true);ln(anamnese.obs);}
                      }
                      if(docId==="contrato"){
                        ln("TERMOS E CONDICOES",13,true);
                        ["1. DO PROJETO: O projeto artistico (tatuagem) a ser realizado foi previamente acordado entre as partes, incluindo design, tamanho, local do corpo e valor.",
                         "2. DO PAGAMENTO: O valor total acordado deve ser pago conforme combinado. Sinais e reservas de agenda nao sao reembolsaveis em caso de cancelamento com menos de 48h ou falta sem aviso.",
                         "3. DA CICATRIZACAO: O resultado final depende dos cuidados pos-tatuagem do cliente. O estudio nao se responsabiliza por resultados decorrentes de negligencia ou condicoes de saude nao informadas.",
                         "4. DOS RETOQUES: Retoques gratuitos em ate 60 dias, desde que o cliente siga os cuidados indicados.",
                         "5. DA SAUDE: O cliente declara ter respondido com veracidade a ficha de anamnese.",
                         "6. DOS DIREITOS DE IMAGEM: O estudio pode utilizar fotos do trabalho para divulgacao, salvo manifestacao contraria do cliente.",
                         "7. DA CONCORDANCIA: Ao assinar, o cliente declara ter lido e concordado com todos os termos."
                        ].forEach(t => { y+=2; ln(t); });
                      }
                      // Para menor: gera dois PDFs independentes (um por responsável)
                      if(docId==="menor"){
                        const nomeMin = sc.nome.replace(/ /g,"-");
                        const data = new Date().toLocaleDateString("pt-BR").replace(/\//g,"-");
                        const resps: Array<{label:string, dados: Record<string,string>, campoAssin: string, sufixo: string}> = [
                          { label:"RESPONSAVEL 1", dados:(sc as any).menor_responsavel||{}, campoAssin:"menor_assinatura",     sufixo:"RESPONSAVEL-1" },
                          { label:"RESPONSAVEL 2", dados:(sc as any).menor_responsavel_mae||{}, campoAssin:"menor_assinatura_mae", sufixo:"RESPONSAVEL-2" },
                        ];
                        let arquivosAtuais: any[] = (sc as any).docs_arquivos || [];
                        let gerados = 0;
                        for(const resp of resps){
                          const assinVal = await normImagem((sc as any)[resp.campoAssin]);
                          if(!assinVal){ continue; }
                          const d2 = new jsPDF({ unit:"mm", format:"a4" });
                          const W2=210; let y2=20;
                          const ln2=(texto:string,size=11,bold=false,cor:[number,number,number]=[30,30,30])=>{
                            d2.setFontSize(size);d2.setFont("helvetica",bold?"bold":"normal");d2.setTextColor(...cor);
                            const ls=d2.splitTextToSize(texto,W2-40);
                            ls.forEach((l:string)=>{if(y2>270){d2.addPage();y2=20;}d2.text(l,20,y2);y2+=size*0.45;});
                            y2+=2;
                          };
                          ln2("AUTORIZACAO DE RESPONSAVEL LEGAL",16,true,[180,140,50]);
                          y2+=3;
                          ln2(`Menor: ${sc.nome} (${idade} anos)  |  Data: ${new Date().toLocaleDateString("pt-BR")}`,10,false,[100,100,100]);
                          y2+=4;
                          ln2(resp.label,12,true,[180,140,50]);
                          ln2(`Nome: ${resp.dados.resp_nome||"—"}  |  CPF: ${resp.dados.resp_cpf||"—"}  |  RG: ${resp.dados.resp_rg||"—"}  |  Tel: ${resp.dados.resp_tel||"—"}  |  Parentesco: ${resp.dados.resp_parentesco||"—"}`);
                          if(resp.dados.descricao){y2+=2;ln2("Autorizacao: "+resp.dados.descricao);}
                          y2+=6;
                          ln2("Assinatura — Lei 14.063/2020",10,false,[120,120,120]);
                          try{d2.addImage(assinVal,"PNG",20,y2,60,25);y2+=28;}catch(e){console.error("addImage menor:",e);}
                          const blob2=d2.output("blob");
                          const pdfNome2=`AUTORIZACAO-${nomeMin}-${resp.sufixo}-${data}.pdf`;
                          const fname2=`pdf-${sc.id}-menor-${resp.sufixo.toLowerCase()}-${Date.now()}.pdf`;
                          await sb.storage.from("referencias").upload(fname2,blob2,{contentType:"application/pdf",upsert:true});
                          const {data:pub2}=sb.storage.from("referencias").getPublicUrl(fname2);
                          arquivosAtuais=[...arquivosAtuais,{nome:pdfNome2,url:pub2.publicUrl,tipo:"pdf",criado_em:new Date().toISOString()}];
                          gerados++;
                        }
                        if(gerados>0){
                          await sb.from("clientes").update({docs_arquivos:arquivosAtuais}).eq("id",sc.id);
                          upCFicha(sc.id,"docs_arquivos",arquivosAtuais);
                          setFichaEditada(false);
                          alert(`${gerados} PDF(s) gerado(s) e salvo(s) em Documentos Salvos!`);
                        } else {
                          alert("Nenhum responsavel assinou ainda. Nao ha PDF para gerar.");
                        }
                      } else {
                      // anamnese e contrato — PDF único
                      const campoA = docId==="anamnese"?"anamnese_assinatura":"contrato_assinatura";
                      const assinA = await normImagem((sc as any)[campoA]);
                      if(assinA){y+=6;ln("Assinatura — Lei 14.063/2020",10,false,[120,120,120]);try{doc.addImage(assinA,"PNG",20,y,60,25);y+=28;}catch(e){console.error("addImage assinA:",e);}}
                      const pdfBlob = doc.output("blob");
                      const pdfNome = `${titulos[docId]||"doc"}-${sc.nome}-${new Date().toLocaleDateString("pt-BR").replace(/\//g,"-")}.pdf`;
                      const fname = `pdf-${sc.id}-${docId}-${Date.now()}.pdf`;
                      await sb.storage.from("referencias").upload(fname, pdfBlob, { contentType: "application/pdf", upsert: true });
                      const { data: pub } = sb.storage.from("referencias").getPublicUrl(fname);
                      const arquivosAtuais: any[] = (sc as any).docs_arquivos || [];
                      const novos = [...arquivosAtuais, { nome: pdfNome, url: pub.publicUrl, tipo: "pdf", criado_em: new Date().toISOString() }];
                      await sb.from("clientes").update({ docs_arquivos: novos }).eq("id", sc.id);
                      upCFicha(sc.id, "docs_arquivos", novos);
                      setFichaEditada(false);
                      alert("PDF gerado e salvo em Documentos Salvos!");
                      }
                    } catch(e) { alert("Erro ao gerar PDF."); }
                    setDocsGerandoPdf(false);
                  };

                  const imprimirDoc = (docId: string) => {
                    const el = document.getElementById(`doc-print-${docId}`);
                    if (!el) return;
                    const w = window.open("", "_blank");
                    if (!w) return;
                    w.document.write(`<html><head><title>Documento</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:30px;color:#111;}h2{font-size:16px;}h3{font-size:14px;margin-top:20px;}p,li{line-height:1.8;}img{max-width:300px;border:1px solid #ccc;margin-top:8px;}.assinatura{margin-top:30px;border-top:1px solid #ccc;padding-top:10px;}</style></head><body>`);
                    w.document.write(el.innerHTML);
                    w.document.write(`</body></html>`);
                    w.document.close();
                    w.print();
                  };

                  const enviarEmail = async (docId: string) => {
                    if (!resendApiKey || !emailRemetente) {
                      alert("Configure a Resend API Key e o Email Remetente nas Configuracoes do estudio.");
                      return;
                    }
                    if (!sc.email) {
                      alert("Este cliente nao tem email cadastrado.");
                      return;
                    }
                    const titulos: Record<string,string> = {
                      anamnese: "Ficha de Anamnese",
                      contrato: "Contrato de Execucao de Projeto Artistico",
                      menor: "Autorizacao de Responsavel Legal",
                    };
                    const titulo = titulos[docId] || "Documento";
                    const studioNomeFormatado = (studioName || "A Casa dos Carvalho").replace(/_/g, " ");
                    const campoAssin = docId === "anamnese" ? "anamnese_assinatura" : docId === "contrato" ? "contrato_assinatura" : "menor_assinatura";
                    const assinBase64 = (sc as any)[campoAssin] || "";

                    // upload para Storage — URL publica funciona no Gmail mobile (base64 e bloqueado)
                    let assinImg = "";
                    if (assinBase64.startsWith("data:")) {
                      try {
                        const b64 = assinBase64.split(",")[1];
                        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
                        const fname = `assin-${sc.id}-${docId}.png`;
                        await sb.storage.from("referencias").upload(fname, bytes, { contentType: "image/png", upsert: true });
                        const { data: pub } = sb.storage.from("referencias").getPublicUrl(fname);
                        assinImg = pub.publicUrl;
                      } catch { assinImg = ""; }
                    }

                    const projetos = (sc as any).projetos || [];
                    const ultimoProjeto = projetos[projetos.length - 1];
                    const descProjeto = ultimoProjeto ? `<p><strong>Projeto:</strong> ${ultimoProjeto.estilo || ""} — ${ultimoProjeto.tam || ""} — ${ultimoProjeto.servico || ""}</p>` : "";

                    const htmlEmail = `
                      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">
                        <div style="background:#1a1a1a;padding:24px 32px;text-align:center;">
                          <span style="color:#c9a84c;font-size:22px;font-weight:700;letter-spacing:.05em;">${studioNomeFormatado}</span>
                        </div>
                        <div style="padding:32px;">
                          <p style="font-size:15px;">Ola, <strong>${sc.nome}</strong>! Tudo bem?</p>
                          <p>Segue o seu <strong>${titulo}</strong>. Por favor leia com atencao antes da sua sessao.</p>
                          <p style="font-size:12px;color:#888;">Todas as informacoes e sua assinatura estao registradas digitalmente em nosso sistema. Guarde este email como comprovante.</p>
                          ${descProjeto}
                          <hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/>
                          ${docId === "anamnese" ? `
                            <h3 style="font-size:14px;margin-bottom:12px;">Suas respostas da Anamnese</h3>
                            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                              ${pergAnamnese.map(p => `<tr style="border-bottom:1px solid #f0f0f0;">
                                <td style="padding:7px 4px;">${p.label}</td>
                                <td style="padding:7px 4px;font-weight:600;color:${anamnese[p.id]?.resp === "sim" ? "#c0392b" : "#27ae60"};">${anamnese[p.id]?.resp === "sim" ? "Sim" : anamnese[p.id]?.resp === "nao" ? "Nao" : "—"}${anamnese[p.id]?.detalhe ? ` (${anamnese[p.id].detalhe})` : ""}</td>
                              </tr>`).join("")}
                            </table>
                          ` : ""}
                          ${docId === "contrato" ? `<p style="font-size:12px;color:#555;line-height:1.8;">Contrato de execucao de projeto artistico conforme termos apresentados e aceitos no estudio.</p>` : ""}
                          ${assinImg ? `
                            <div style="margin-top:20px;">
                              <p style="font-size:12px;color:#888;">Assinatura eletronica coletada — Lei 14.063/2020</p>
                              <img src="${assinImg}" alt="Assinatura" style="max-width:240px;border:1px solid #ddd;border-radius:4px;padding:6px;background:#fff;"/>
                            </div>
                          ` : `<p style="color:#e67e22;font-size:12px;">Documento ainda nao assinado.</p>`}
                          <hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/>
                          <p style="font-size:13px;color:#555;">Qualquer duvida estamos a disposicao. Com carinho,</p>
                          <p style="font-size:14px;font-weight:700;color:#1a1a1a;">${studioNomeFormatado}</p>
                        </div>
                        <div style="background:#f7f7f7;padding:12px 32px;font-size:11px;color:#aaa;text-align:center;">
                          Este e um documento oficial do estudio. Guarde para seus registros.
                        </div>
                      </div>`;

                    try {
                      const r = await fetch("/api/resend", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          apiKey: resendApiKey,
                          from: `${nomeRemetente || studioNomeFormatado} <${emailRemetente}>`,
                          to: sc.email,
                          subject: `${titulo} — ${studioNomeFormatado}`,
                          html: htmlEmail,
                        }),
                      });
                      if (r.ok) {
                        await salvarDocsStatus(docId, "enviado");
                        alert(`Email enviado para ${sc.email}`);
                      } else {
                        alert("Erro ao enviar email. Verifique as configuracoes do Resend.");
                      }
                    } catch {
                      alert("Erro de conexao ao enviar email.");
                    }
                  };

                  const enviarParaAssinar = async (docId: string) => {
                    if (!resendApiKey || !emailRemetente) {
                      alert("Configure a Resend API Key e o Email Remetente nas Configuracoes do estudio.");
                      return;
                    }
                    const respDadosPai: Record<string,string> = (sc as any).menor_responsavel || {};
                    const respDadosMae: Record<string,string> = (sc as any).menor_responsavel_mae || {};
                    const emailDestino = docId === "menor_resp1" ? (respDadosPai.resp_email || sc.email)
                      : docId === "menor_resp2" ? (respDadosMae.resp_email || sc.email)
                      : sc.email;
                    if (!emailDestino) {
                      alert(docId === "menor_resp1" ? "Cadastre o email do Responsavel 1 antes de enviar."
                        : docId === "menor_resp2" ? "Cadastre o email do Responsavel 2 antes de enviar."
                        : "Este cliente nao tem email cadastrado.");
                      return;
                    }
                    setDocsEnviandoLink(docId);
                    try {
                      const token = crypto.randomUUID();
                      const exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                      const enviado_em = new Date().toISOString();
                      const linksAtuais: Record<string,any> = (sc as any).assinar_link || {};
                      const novosLinks = { ...linksAtuais, [docId]: { token, exp, enviado_em } };
                      const { error: erroLink } = await sb.from("clientes").update({ assinar_link: novosLinks }).eq("id", sc.id);
                      if (erroLink) { console.error("Erro update assinar_link:", erroLink); return; }
                      setClients(p => p.map(c => c.id !== sc.id ? c : { ...c, assinar_link: novosLinks }));

                      const studioNomeFormatado = (studioName || "A Casa dos Carvalho").replace(/_/g, " ");
                      const titulos: Record<string,string> = {
                        anamnese: "Ficha de Anamnese",
                        contrato: "Contrato de Execucao de Projeto Artistico",
                        menor: "Autorizacao de Responsavel Legal",
                        menor_resp1: "Autorizacao de Responsavel Legal — Responsavel 1",
                        menor_resp2: "Autorizacao de Responsavel Legal — Responsavel 2",
                      };
                      const titulo = titulos[docId] || "Documento";
                      const link = `https://inq-saas.vercel.app/assinar.html?token=${token}`;
                      const nomeResp = docId === "menor_resp1" ? respDadosPai.resp_nome : docId === "menor_resp2" ? respDadosMae.resp_nome : "";
                      const fn = (nomeResp || sc.nome || "").split(" ")[0];

                      const htmlEmail = `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;">
                          <div style="background:#1a1a1a;padding:24px 32px;text-align:center;">
                            <span style="color:#c9a84c;font-size:22px;font-weight:700;letter-spacing:.05em;">${studioNomeFormatado}</span>
                          </div>
                          <div style="padding:32px;">
                            <p style="font-size:15px;">Ola, <strong>${fn}</strong>!</p>
                            <p style="line-height:1.8;margin-top:10px;">Preparamos o seu <strong>${titulo}</strong> para assinatura digital. Por favor, acesse o link abaixo, leia o documento com atencao e assine.</p>
                            <p style="line-height:1.8;color:#888;font-size:12px;margin-top:8px;">O link e valido por 7 dias.</p>
                            <div style="text-align:center;margin:28px 0;">
                              <a href="${link}" style="display:inline-block;background:#c9a84c;color:#111;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:bold;">Assinar documento</a>
                            </div>
                            <p style="font-size:12px;color:#999;line-height:1.8;">Caso o botao nao funcione, copie e cole este link no seu navegador:<br><span style="color:#c9a84c;">${link}</span></p>
                            <hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/>
                            <p style="font-size:13px;color:#555;">Qualquer duvida estamos a disposicao.</p>
                            <p style="font-size:14px;font-weight:700;color:#1a1a1a;">${studioNomeFormatado}</p>
                          </div>
                          <div style="background:#f7f7f7;padding:12px 32px;font-size:11px;color:#aaa;text-align:center;">
                            Assinatura eletronica com validade legal — Lei 14.063/2020
                          </div>
                        </div>`;

                      const r = await fetch("/api/resend", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          apiKey: resendApiKey,
                          from: `${nomeRemetente || studioNomeFormatado} <${emailRemetente}>`,
                          to: emailDestino,
                          subject: `Assine seu ${titulo} — ${studioNomeFormatado}`,
                          html: htmlEmail,
                        }),
                      });
                      if (r.ok) {
                        alert(`Link de assinatura enviado para ${emailDestino}. Valido por 7 dias.`);
                      } else {
                        alert("Erro ao enviar email. Verifique as configuracoes do Resend.");
                      }
                    } catch {
                      alert("Erro ao gerar link de assinatura.");
                    }
                    setDocsEnviandoLink(null);
                  };

                  const docs = [
                    { id: "anamnese", titulo: "Ficha de Anamnese", subtitulo: "Questionario de saude pre-tatuagem" },
                    { id: "contrato", titulo: "Contrato de Execucao", subtitulo: "Termos e condicoes do projeto artistico" },
                    ...(eMenor ? [{ id: "menor", titulo: "Autorizacao de Menor", subtitulo: "Responsavel legal — cliente menor de 18 anos" }] : []),
                  ];

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="stit">Documentos do Cliente</div>

                      {docs.map(doc => {
                        const aberto = docsAberto === doc.id;
                        const st = doc.id === "menor"
                          ? (docsStatus["menor_resp1"] === "assinado" && docsStatus["menor_resp2"] === "assinado" ? "assinado"
                            : docsStatus["menor_resp1"] === "assinado" || docsStatus["menor_resp2"] === "assinado" ? "enviado"
                            : docsStatus[doc.id] || "pendente")
                          : docsStatus[doc.id] || "pendente";
                        return (
                          <div key={doc.id} style={{ border: `1px solid ${aberto ? "var(--gold)" : "var(--br)"}`, borderRadius: 9, overflow: "hidden" }}>
                            {/* header do card */}
                            <div onClick={() => setDocsAberto(aberto ? null : doc.id)}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: "var(--dk3)", cursor: "pointer" }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: stCorDoc(st), flexShrink: 0, display: "inline-block" }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{doc.titulo}</div>
                                <div style={{ fontSize: 11, color: "var(--tx2)" }}>{doc.subtitulo}</div>
                              </div>
                              <span style={{ fontSize: 10, color: stCorDoc(st), fontWeight: 600 }}>{stLblDoc(st)}</span>
                              <span style={{ fontSize: 12, color: "var(--tx3)" }}>{aberto ? "▲" : "▼"}</span>
                            </div>

                            {/* conteudo expandido */}
                            {aberto && (
                              <div style={{ padding: "14px", background: "var(--dk2)", display: "flex", flexDirection: "column", gap: 12 }}>

                                {/* ── ANAMNESE ── */}
                                {doc.id === "anamnese" && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {pergAnamnese.map(p => (
                                      <div key={p.id} style={{ background: "var(--dk3)", borderRadius: 7, padding: "8px 10px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <span style={{ flex: 1, fontSize: 12, color: "var(--tx)" }}>{p.label}</span>
                                          <div style={{ display: "flex", gap: 4 }}>
                                            {["sim", "nao"].map(op => (
                                              <button key={op} onClick={async () => {
                                                const novo = { ...anamnese, [p.id]: { ...anamnese[p.id], resp: op } };
                                                await salvarAnamnese(novo);
                                              }} style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid var(--br)", background: anamnese[p.id]?.resp === op ? (op === "sim" ? "rgba(192,57,43,.25)" : "rgba(39,174,96,.2)") : "var(--dk4)", color: anamnese[p.id]?.resp === op ? (op === "sim" ? "var(--q1)" : "#27ae60") : "var(--tx3)" }}>
                                                {op === "sim" ? "Sim" : "Nao"}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                        {(p as any).detalhe && anamnese[p.id]?.resp === "sim" && (
                                          <input className="ef" placeholder="Qual?" value={anamnese[p.id]?.detalhe || ""}
                                            onChange={async e => {
                                              const novo = { ...anamnese, [p.id]: { ...anamnese[p.id], detalhe: e.target.value } };
                                              await salvarAnamnese(novo);
                                            }}
                                            style={{ marginTop: 6, fontSize: 11, width: "100%" }} />
                                        )}
                                      </div>
                                    ))}
                                    <div style={{ background: "var(--dk3)", borderRadius: 7, padding: "8px 10px" }}>
                                      <div style={{ fontSize: 12, color: "var(--tx)", marginBottom: 5 }}>Observacoes adicionais</div>
                                      <textarea value={anamnese.obs || ""} onChange={async e => {
                                        const novo = { ...anamnese, obs: e.target.value };
                                        await salvarAnamnese(novo);
                                      }} style={{ width: "100%", minHeight: 50, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 5, padding: "6px 8px", fontSize: 11, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical" }} />
                                    </div>
                                  </div>
                                )}

                                {/* ── CONTRATO ── */}
                                {doc.id === "contrato" && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.8, background: "var(--dk3)", borderRadius: 7, padding: "12px 14px" }}>
                                      <strong>CONTRATO DE EXECUCAO DE PROJETO ARTISTICO</strong><br/><br/>
                                      Pelo presente instrumento, o(a) cliente <strong>{sc.nome}</strong>, declara estar ciente e de acordo com os seguintes termos:<br/><br/>
                                      <strong>1. DO PROJETO:</strong> O projeto artistico (tatuagem) a ser realizado foi previamente acordado entre as partes, incluindo design, tamanho, local do corpo e valor.<br/><br/>
                                      <strong>2. DO PAGAMENTO:</strong> O valor total acordado deve ser pago conforme combinado. Sinais e reservas de agenda nao sao reembolsaveis em caso de cancelamento com menos de 48h de antecedencia ou falta sem aviso.<br/><br/>
                                      <strong>3. DA CICATRIZACAO:</strong> O cliente declara estar ciente de que o resultado final depende tambem dos cuidados pos-tatuagem seguidos por ele. O estudio nao se responsabiliza por resultados insatisfatorios decorrentes de negligencia nos cuidados ou condicoes de saude nao informadas.<br/><br/>
                                      <strong>4. DOS RETOQUES:</strong> Retoques gratuitos estao disponiveis em ate 60 dias apos a sessao, desde que o cliente siga corretamente os cuidados indicados. Apos esse prazo ou em caso de negligencia, retoques serao cobrados.<br/><br/>
                                      <strong>5. DA SAUDE:</strong> O cliente declara ter respondido com veracidade a ficha de anamnese e nao ter condicoes de saude que contraindiquem o procedimento. Em caso de omissao, o estudio se exime de qualquer responsabilidade.<br/><br/>
                                      <strong>6. DOS DIREITOS DE IMAGEM:</strong> O estudio pode utilizar fotos do trabalho realizado para fins de divulgacao em redes sociais e portfolio, salvo manifestacao contraria expressa do cliente.<br/><br/>
                                      <strong>7. DA CONCORDANCIA:</strong> Ao assinar este contrato, o cliente declara ter lido, compreendido e concordado com todos os termos acima.
                                    </div>
                                  </div>
                                )}

                                {/* ── MENOR ── */}
                                {doc.id === "menor" && (() => {
                                  const pai: Record<string,string> = (sc as any).menor_responsavel || {};
                                  const mae: Record<string,string> = (sc as any).menor_responsavel_mae || {};
                                  const maskCpf = (v: string) => { const r = v.replace(/\D/g,"").slice(0,11); return r.length<=3?r:r.length<=6?r.slice(0,3)+"."+r.slice(3):r.length<=9?r.slice(0,3)+"."+r.slice(3,6)+"."+r.slice(6):r.slice(0,3)+"."+r.slice(3,6)+"."+r.slice(6,9)+"-"+r.slice(9); };
                                  const maskTel = (v: string) => { const r = v.replace(/\D/g,"").slice(0,11); if(r.length<=2) return "("+r; if(r.length<=7) return "("+r.slice(0,2)+") "+r.slice(2); return "("+r.slice(0,2)+") "+r.slice(2,7)+"-"+r.slice(7); };
                                  const salvarPai = (campo: string, valor: string) => { const novo = {...pai,[campo]:valor}; upCFicha(sc.id,"menor_responsavel",novo); };
                                  const salvarMae = (campo: string, valor: string) => { const novo = {...mae,[campo]:valor}; upCFicha(sc.id,"menor_responsavel_mae",novo); };
                                  const confirmarSalvarResp = async () => {
                                    const paiAtual: Record<string,string> = (sc as any).menor_responsavel || {};
                                    const maeAtual: Record<string,string> = (sc as any).menor_responsavel_mae || {};
                                    await sb.from("clientes").update({ menor_responsavel: paiAtual, menor_responsavel_mae: maeAtual }).eq("id", sc.id);
                                    setFichaEditada(false);
                                    setMenorSalvarConfirm(false);
                                  };
                                  const uploadFotoDoc = async (pessoa: "pai"|"mae", file: File) => {
                                    const fname = `doc-${sc.id}-${pessoa}-${Date.now()}.${file.name.split(".").pop()}`;
                                    await sb.storage.from("referencias").upload(fname, file, { contentType: file.type, upsert: true });
                                    const { data: pub } = sb.storage.from("referencias").getPublicUrl(fname);
                                    salvarPai("foto_doc", pub.publicUrl);
                                  };
                                  const uploadFotoDocMae = async (file: File) => {
                                    const fname = `doc-${sc.id}-mae-${Date.now()}.${file.name.split(".").pop()}`;
                                    await sb.storage.from("referencias").upload(fname, file, { contentType: file.type, upsert: true });
                                    const { data: pub } = sb.storage.from("referencias").getPublicUrl(fname);
                                    salvarMae("foto_doc", pub.publicUrl);
                                  };
                                  const campoAssinPai = "menor_assinatura";
                                  const campoAssinMae = "menor_assinatura_mae";
                                  const renderCanvas = (
                                    quem: "pai"|"mae",
                                    canvasRef: HTMLCanvasElement|null,
                                    setRef: (c: HTMLCanvasElement) => void,
                                    desenhando: boolean,
                                    setDesenhando: (v: boolean) => void,
                                    campoAssin: string
                                  ) => (
                                    <div>
                                      <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 5, fontWeight: 600 }}>Assinatura do {quem === "pai" ? "Pai/Responsavel 1" : "Mae/Responsavel 2"}</div>
                                      {(sc as any)[campoAssin] ? (
                                        <div>
                                          <img src={(sc as any)[campoAssin]} alt="Assinatura" style={{ maxWidth: "100%", height: 70, border: "1px solid var(--br)", borderRadius: 5, background: "#fff", display: "block" }} />
                                          <button onClick={async () => { await salvarAssinatura(campoAssin, ""); }} style={{ marginTop: 4, background: "none", border: "none", fontSize: 10, color: "var(--tx3)", cursor: "pointer" }}>Remover</button>
                                        </div>
                                      ) : (
                                        <div>
                                          <canvas ref={el => { if(el) setRef(el); }}
                                            width={340} height={100}
                                            style={{ width: "100%", height: 100, background: "#fff", borderRadius: 6, border: "1px solid var(--br)", touchAction: "none", display: "block" }}
                                            onMouseDown={e => { setDesenhando(true); const r=(e.target as HTMLCanvasElement).getBoundingClientRect(); const ctx=(e.target as HTMLCanvasElement).getContext("2d")!; ctx.beginPath(); ctx.moveTo(e.clientX-r.left,e.clientY-r.top); }}
                                            onMouseMove={e => { if(!desenhando) return; const r=(e.target as HTMLCanvasElement).getBoundingClientRect(); const ctx=(e.target as HTMLCanvasElement).getContext("2d")!; ctx.lineWidth=2; ctx.strokeStyle="#111"; ctx.lineCap="round"; ctx.lineTo(e.clientX-r.left,e.clientY-r.top); ctx.stroke(); }}
                                            onMouseUp={() => setDesenhando(false)} onMouseLeave={() => setDesenhando(false)}
                                            onTouchStart={e => { e.preventDefault(); const r=(e.target as HTMLCanvasElement).getBoundingClientRect(); const ctx=(e.target as HTMLCanvasElement).getContext("2d")!; ctx.beginPath(); ctx.moveTo(e.touches[0].clientX-r.left,e.touches[0].clientY-r.top); setDesenhando(true); }}
                                            onTouchMove={e => { e.preventDefault(); if(!desenhando) return; const r=(e.target as HTMLCanvasElement).getBoundingClientRect(); const ctx=(e.target as HTMLCanvasElement).getContext("2d")!; ctx.lineWidth=2; ctx.strokeStyle="#111"; ctx.lineCap="round"; ctx.lineTo(e.touches[0].clientX-r.left,e.touches[0].clientY-r.top); ctx.stroke(); }}
                                            onTouchEnd={() => setDesenhando(false)} />
                                          <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                                            <button onClick={() => { const ctx=canvasRef?.getContext("2d"); if(ctx&&canvasRef) ctx.clearRect(0,0,canvasRef.width,canvasRef.height); }} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 5, padding: "4px 10px", fontSize: 11, color: "var(--tx2)", cursor: "pointer" }}>Limpar</button>
                                            <button onClick={async () => { if(!canvasRef) return; await salvarAssinatura(campoAssin, canvasRef.toDataURL("image/png")); await salvarDocsStatus("menor","assinado"); }} style={{ background: "var(--gold)", border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 11, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>Confirmar</button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                  return (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                      <div style={{ fontSize: 11, color: "var(--tx2)", lineHeight: 1.8, background: "var(--dk3)", borderRadius: 7, padding: "12px 14px" }}>
                                        <strong>AUTORIZACAO DE RESPONSAVEL LEGAL</strong><br/>
                                        Eu(s), responsavel(is) legal(is) pelo(a) menor <strong>{sc.nome}</strong> ({idade} anos), autorizo a realizacao do procedimento abaixo, declarando estar ciente de todos os termos do contrato de execucao e das informacoes prestadas na ficha de anamnese.
                                      </div>
                                      {/* servico e area */}
                                      <div className="fg2">
                                        <div className="fi2">
                                          <div className="fil">Servico</div>
                                          <select className="ef" value={pai.servico||""} onChange={e => salvarPai("servico", e.target.value)}>
                                            <option value="">Selecione...</option>
                                            <option value="Tatuagem">Tatuagem</option>
                                            <option value="Piercing">Piercing</option>
                                          </select>
                                        </div>
                                        <div className="fi2">
                                          <div className="fil">Area de aplicacao</div>
                                          <input className="ef" placeholder="Ex: braco direito, lobulo..." value={pai.area||""} onChange={e => salvarPai("area", e.target.value)} />
                                        </div>
                                      </div>
                                      {/* Status por responsavel */}
                                      <div style={{ display: "flex", gap: 8 }}>
                                        {(["menor_resp1","menor_resp2"] as const).map((k,i) => (
                                          <span key={k} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: docsStatus[k]==="assinado"?"rgba(39,174,96,.15)":"var(--dk3)", color: docsStatus[k]==="assinado"?"#27ae60":"var(--tx3)", border: `1px solid ${docsStatus[k]==="assinado"?"rgba(39,174,96,.4)":"var(--br)"}` }}>
                                            Resp. {i+1}: {docsStatus[k]==="assinado"?"Assinado":"Pendente"}
                                          </span>
                                        ))}
                                      </div>
                                      {/* PAI */}
                                      <div style={{ background: "var(--dk3)", borderRadius: 8, padding: "10px 12px" }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Responsavel 1 (Pai / Mae / Tutor)</div>
                                        <div className="fg2" style={{ gap: 8 }}>
                                          <div className="fi2"><div className="fil">Nome completo</div><input className="ef" value={pai.resp_nome||""} onChange={e => salvarPai("resp_nome", e.target.value)} /></div>
                                          <div className="fi2"><div className="fil">Email</div><input className="ef" type="email" placeholder="email@exemplo.com" value={pai.resp_email||""} onChange={e => salvarPai("resp_email", e.target.value)} /></div>
                                          <div className="fi2"><div className="fil">CPF</div><input className="ef" placeholder="000.000.000-00" maxLength={14} value={pai.resp_cpf||""} onChange={e => salvarPai("resp_cpf", maskCpf(e.target.value))} /></div>
                                          <div className="fi2"><div className="fil">RG</div><input className="ef" placeholder="00.000.000-0" maxLength={12} value={pai.resp_rg||""} onChange={e => salvarPai("resp_rg", e.target.value)} /></div>
                                          <div className="fi2"><div className="fil">Telefone</div><input className="ef" placeholder="(00) 00000-0000" maxLength={15} value={pai.resp_tel||""} onChange={e => salvarPai("resp_tel", maskTel(e.target.value))} /></div>
                                          <div className="fi2">
                                            <div className="fil">Parentesco</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 3 }}>
                                              {["Pai","Mae","Responsavel Legal","Avo / Avo","Outro"].map(p => (
                                                <span key={p} onClick={() => salvarPai("resp_parentesco", p)}
                                                  style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${pai.resp_parentesco===p?"var(--gold)":"var(--br)"}`, background: pai.resp_parentesco===p?"rgba(201,168,76,.2)":"var(--dk4)", color: pai.resp_parentesco===p?"var(--gold)":"var(--tx3)", fontSize: 11, cursor: "pointer" }}>
                                                  {p}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                          <div className="fil">Descricao — o que esta autorizando?</div>
                                          <textarea className="ef" rows={3} placeholder="Ex: Autorizo meu filho(a) a realizar tatuagem na regiao do braco direito..." value={pai.descricao||""} onChange={e => salvarPai("descricao", e.target.value)} style={{ resize: "vertical", minHeight: 62 }} />
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                          <div className="fil">Foto do Documento (RG/CNH)</div>
                                          {pai.foto_doc ? (
                                            <div style={{ marginTop: 4 }}>
                                              <img src={pai.foto_doc} alt="Doc" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 5, border: "1px solid var(--br)" }} />
                                              <button onClick={() => salvarPai("foto_doc","")} style={{ display: "block", marginTop: 4, background: "none", border: "none", fontSize: 10, color: "var(--tx3)", cursor: "pointer" }}>Remover foto</button>
                                            </div>
                                          ) : (
                                            <label style={{ display: "block", marginTop: 4, background: "var(--dk4)", border: "1px dashed var(--br)", borderRadius: 6, padding: "10px", textAlign: "center", fontSize: 11, color: "var(--tx3)", cursor: "pointer" }}>
                                              + Anexar foto do documento
                                              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadFotoDoc("pai",f); }} />
                                            </label>
                                          )}
                                        </div>
                                      </div>
                                      {/* MAE */}
                                      <div style={{ background: "var(--dk3)", borderRadius: 8, padding: "10px 12px" }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".04em" }}>Responsavel 2 (Mae / Pai / Tutor)</div>
                                        <div className="fg2" style={{ gap: 8 }}>
                                          <div className="fi2"><div className="fil">Nome completo</div><input className="ef" value={mae.resp_nome||""} onChange={e => salvarMae("resp_nome", e.target.value)} /></div>
                                          <div className="fi2"><div className="fil">Email</div><input className="ef" type="email" placeholder="email@exemplo.com" value={mae.resp_email||""} onChange={e => salvarMae("resp_email", e.target.value)} /></div>
                                          <div className="fi2"><div className="fil">CPF</div><input className="ef" placeholder="000.000.000-00" maxLength={14} value={mae.resp_cpf||""} onChange={e => salvarMae("resp_cpf", maskCpf(e.target.value))} /></div>
                                          <div className="fi2"><div className="fil">RG</div><input className="ef" placeholder="00.000.000-0" maxLength={12} value={mae.resp_rg||""} onChange={e => salvarMae("resp_rg", e.target.value)} /></div>
                                          <div className="fi2"><div className="fil">Telefone</div><input className="ef" placeholder="(00) 00000-0000" maxLength={15} value={mae.resp_tel||""} onChange={e => salvarMae("resp_tel", maskTel(e.target.value))} /></div>
                                          <div className="fi2">
                                            <div className="fil">Parentesco</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 3 }}>
                                              {["Pai","Mae","Responsavel Legal","Avo / Avo","Outro"].map(p => (
                                                <span key={p} onClick={() => salvarMae("resp_parentesco", p)}
                                                  style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${mae.resp_parentesco===p?"var(--gold)":"var(--br)"}`, background: mae.resp_parentesco===p?"rgba(201,168,76,.2)":"var(--dk4)", color: mae.resp_parentesco===p?"var(--gold)":"var(--tx3)", fontSize: 11, cursor: "pointer" }}>
                                                  {p}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                          <div className="fil">Descricao — o que esta autorizando?</div>
                                          <textarea className="ef" rows={3} placeholder="Ex: Autorizo meu filho(a) a realizar tatuagem na regiao do braco direito..." value={mae.descricao||""} onChange={e => salvarMae("descricao", e.target.value)} style={{ resize: "vertical", minHeight: 62 }} />
                                        </div>
                                        <div style={{ marginTop: 8 }}>
                                          <div className="fil">Foto do Documento (RG/CNH)</div>
                                          {mae.foto_doc ? (
                                            <div style={{ marginTop: 4 }}>
                                              <img src={mae.foto_doc} alt="Doc" style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 5, border: "1px solid var(--br)" }} />
                                              <button onClick={() => salvarMae("foto_doc","")} style={{ display: "block", marginTop: 4, background: "none", border: "none", fontSize: 10, color: "var(--tx3)", cursor: "pointer" }}>Remover foto</button>
                                            </div>
                                          ) : (
                                            <label style={{ display: "block", marginTop: 4, background: "var(--dk4)", border: "1px dashed var(--br)", borderRadius: 6, padding: "10px", textAlign: "center", fontSize: 11, color: "var(--tx3)", cursor: "pointer" }}>
                                              + Anexar foto do documento
                                              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f=e.target.files?.[0]; if(f) uploadFotoDocMae(f); }} />
                                            </label>
                                          )}
                                        </div>
                                      </div>
                                      {/* botao salvar responsaveis */}
                                      {fichaEditada && !menorSalvarConfirm && (
                                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                          <button onClick={() => setMenorSalvarConfirm(true)}
                                            style={{ background: "var(--gold)", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>
                                            Salvar dados dos responsaveis
                                          </button>
                                        </div>
                                      )}
                                      {menorSalvarConfirm && (
                                        <div style={{ background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                                          <div style={{ fontSize: 12, color: "var(--tx)", fontWeight: 600 }}>Confirmar salvamento dos dados?</div>
                                          <div style={{ fontSize: 11, color: "var(--tx3)" }}>Os dados preenchidos acima serao salvos permanentemente na ficha.</div>
                                          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                                            <button onClick={() => setMenorSalvarConfirm(false)}
                                              style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 14px", fontSize: 11, color: "var(--tx2)", cursor: "pointer" }}>
                                              Cancelar
                                            </button>
                                            <button onClick={confirmarSalvarResp}
                                              style={{ background: "var(--gold)", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 11, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>
                                              Salvar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                      {/* assinaturas */}
                                      <div style={{ borderTop: "1px solid var(--br)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                                        <div style={{ fontSize: 11, color: "var(--tx2)", fontWeight: 600 }}>Assinaturas — Lei 14.063/2020</div>
                                        {renderCanvas("pai", docsCanvasPaiRef, setDocsCanvasPaiRef, docsDesenhandoPai, setDocsDesenhandoPai, campoAssinPai)}
                                        {renderCanvas("mae", docsCanvasMaeRef, setDocsCanvasMaeRef, docsDesenhandoMae, setDocsDesenhandoMae, campoAssinMae)}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* ── AREA DE ASSINATURA ── */}
                                <div style={{ borderTop: "1px solid var(--br)", paddingTop: 10 }}>
                                  <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 6, fontWeight: 600 }}>Assinatura eletronica — Lei 14.063/2020</div>
                                  {docsAssinando === doc.id ? (
                                    <div>
                                      <canvas ref={el => { if (el) setDocsCanvasRef(el); }}
                                        width={340} height={120}
                                        style={{ width: "100%", height: 120, background: "#fff", borderRadius: 6, border: "1px solid var(--br)", touchAction: "none", display: "block" }}
                                        onMouseDown={e => {
                                          setDocsCanvasDesenhando(true);
                                          const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
                                          const ctx = (e.target as HTMLCanvasElement).getContext("2d")!;
                                          ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
                                        }}
                                        onMouseMove={e => {
                                          if (!docsCanvasDesenhando) return;
                                          const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
                                          const ctx = (e.target as HTMLCanvasElement).getContext("2d")!;
                                          ctx.lineWidth = 2; ctx.strokeStyle = "#111"; ctx.lineCap = "round";
                                          ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke();
                                        }}
                                        onMouseUp={() => setDocsCanvasDesenhando(false)}
                                        onMouseLeave={() => setDocsCanvasDesenhando(false)}
                                        onTouchStart={e => {
                                          e.preventDefault();
                                          const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
                                          const ctx = (e.target as HTMLCanvasElement).getContext("2d")!;
                                          ctx.beginPath(); ctx.moveTo(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top);
                                          setDocsCanvasDesenhando(true);
                                        }}
                                        onTouchMove={e => {
                                          e.preventDefault();
                                          if (!docsCanvasDesenhando) return;
                                          const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
                                          const ctx = (e.target as HTMLCanvasElement).getContext("2d")!;
                                          ctx.lineWidth = 2; ctx.strokeStyle = "#111"; ctx.lineCap = "round";
                                          ctx.lineTo(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top); ctx.stroke();
                                        }}
                                        onTouchEnd={() => setDocsCanvasDesenhando(false)}
                                      />
                                      <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                                        <button onClick={limparCanvas} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 5, padding: "5px 12px", fontSize: 11, color: "var(--tx2)", cursor: "pointer" }}>Limpar</button>
                                        <button onClick={async () => {
                                          const b64 = capturarAssinatura();
                                          if (!b64) return;
                                          const campo = doc.id === "anamnese" ? "anamnese_assinatura" : doc.id === "contrato" ? "contrato_assinatura" : "menor_assinatura";
                                          await salvarAssinatura(campo, b64);
                                          await salvarDocsStatus(doc.id, "assinado");
                                          setDocsAssinando(null);
                                        }} style={{ background: "var(--gold)", border: "none", borderRadius: 5, padding: "5px 14px", fontSize: 11, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>Confirmar assinatura</button>
                                        <button onClick={() => setDocsAssinando(null)} style={{ background: "none", border: "1px solid var(--br)", borderRadius: 5, padding: "5px 10px", fontSize: 11, color: "var(--tx3)", cursor: "pointer" }}>Cancelar</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      {(() => {
                                        const campoAssin = doc.id === "anamnese" ? "anamnese_assinatura" : doc.id === "contrato" ? "contrato_assinatura" : "menor_assinatura";
                                        const assin = (sc as any)[campoAssin];
                                        return assin ? (
                                          <div>
                                            <img src={assin} alt="Assinatura" style={{ maxWidth: "100%", height: 80, border: "1px solid var(--br)", borderRadius: 5, background: "#fff", display: "block" }} />
                                            <button onClick={async () => {
                                              if (window.confirm("Remover assinatura?")) {
                                                await salvarAssinatura(campoAssin, "");
                                                await salvarDocsStatus(doc.id, "pendente");
                                              }
                                            }} style={{ marginTop: 5, background: "none", border: "none", fontSize: 10, color: "var(--tx3)", cursor: "pointer" }}>Remover assinatura</button>
                                          </div>
                                        ) : (
                                          <button onClick={() => setDocsAssinando(doc.id)}
                                            style={{ background: "var(--dk3)", border: "1px dashed var(--br)", borderRadius: 6, padding: "10px 18px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", width: "100%", textAlign: "center" }}>
                                            + Coletar assinatura
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>

                                {/* ── ACOES ── */}
                                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", borderTop: "1px solid var(--br)", paddingTop: 10 }}>
                                  <button onClick={() => gerarEsalvarPdf(doc.id)} disabled={docsGerandoPdf}
                                    style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "var(--tx2)", cursor: "pointer", opacity: docsGerandoPdf ? 0.6 : 1 }}>
                                    {docsGerandoPdf ? "Gerando..." : "Gerar e Salvar PDF"}
                                  </button>
                                  <button onClick={() => imprimirDoc(doc.id)}
                                    style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "var(--tx2)", cursor: "pointer" }}>
                                    Imprimir
                                  </button>
                                  <button onClick={() => enviarEmail(doc.id)}
                                    style={{ background: "rgba(201,168,76,.12)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "var(--gold)", cursor: "pointer", fontWeight: 600 }}>
                                    Enviar por Email
                                  </button>
                                  {doc.id === "menor" ? (<>
                                    <button onClick={() => enviarParaAssinar("menor_resp1")} disabled={docsEnviandoLink === "menor_resp1"}
                                      style={{ background: "rgba(100,149,237,.12)", border: "1px solid rgba(100,149,237,.35)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#6495ed", cursor: "pointer", fontWeight: 600, opacity: docsEnviandoLink === "menor_resp1" ? 0.6 : 1 }}>
                                      {docsEnviandoLink === "menor_resp1" ? "Enviando..." : "Assinar Remoto — Resp. 1"}
                                    </button>
                                    <button onClick={() => enviarParaAssinar("menor_resp2")} disabled={docsEnviandoLink === "menor_resp2"}
                                      style={{ background: "rgba(100,149,237,.12)", border: "1px solid rgba(100,149,237,.35)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#6495ed", cursor: "pointer", fontWeight: 600, opacity: docsEnviandoLink === "menor_resp2" ? 0.6 : 1 }}>
                                      {docsEnviandoLink === "menor_resp2" ? "Enviando..." : "Assinar Remoto — Resp. 2"}
                                    </button>
                                  </>) : (
                                    <button onClick={() => enviarParaAssinar(doc.id)} disabled={docsEnviandoLink === doc.id}
                                      style={{ background: "rgba(100,149,237,.12)", border: "1px solid rgba(100,149,237,.35)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#6495ed", cursor: "pointer", fontWeight: 600, opacity: docsEnviandoLink === doc.id ? 0.6 : 1 }}>
                                      {docsEnviandoLink === doc.id ? "Enviando..." : "Enviar para Assinar (Remoto)"}
                                    </button>
                                  )}
                                  <button disabled title="WhatsApp sera habilitado nas Configuracoes do estudio"
                                    style={{ background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "var(--tx3)", cursor: "not-allowed", opacity: 0.45 }}>
                                    Enviar WhatsApp
                                  </button>
                                  {st !== "assinado" && (
                                    <button onClick={() => salvarDocsStatus(doc.id, "assinado")}
                                      style={{ background: "rgba(39,174,96,.12)", border: "1px solid rgba(39,174,96,.3)", borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#27ae60", cursor: "pointer" }}>
                                      Marcar como assinado
                                    </button>
                                  )}
                                </div>

                                {/* div oculta para impressao */}
                                <div id={`doc-print-${doc.id}`} style={{ display: "none" }}>
                                  <h2>{doc.titulo}</h2>
                                  <p><strong>Cliente:</strong> {sc.nome} | <strong>Tel:</strong> {sc.tel} | <strong>Data:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
                                  {doc.id === "anamnese" && (
                                    <div>
                                      <h3>Questionario de Saude</h3>
                                      <ul>{pergAnamnese.map(p => <li key={p.id}>{p.label} <strong>{anamnese[p.id]?.resp === "sim" ? "Sim" : anamnese[p.id]?.resp === "nao" ? "Nao" : "Nao respondido"}</strong>{anamnese[p.id]?.detalhe ? ` — ${anamnese[p.id].detalhe}` : ""}</li>)}</ul>
                                      {anamnese.obs && <p><strong>Obs:</strong> {anamnese.obs}</p>}
                                    </div>
                                  )}
                                  {doc.id === "contrato" && <div><h3>Termos do Contrato</h3><p>Contrato de execucao de projeto artistico conforme termos exibidos e aceitos digitalmente.</p></div>}
                                  {doc.id === "menor" && <div><h3>Dados do Responsavel</h3>{Object.entries((sc as any).menor_responsavel || {}).map(([k,v]) => <p key={k}><strong>{k}:</strong> {String(v)}</p>)}</div>}
                                  {(() => {
                                    const campoA = doc.id === "anamnese" ? "anamnese_assinatura" : doc.id === "contrato" ? "contrato_assinatura" : "menor_assinatura";
                                    const assin = (sc as any)[campoA];
                                    return assin ? <div className="assinatura"><p><strong>Assinatura:</strong></p><img src={assin} alt="Assinatura" style={{ maxWidth: 300 }} /></div> : <div className="assinatura"><p>Assinatura: ___________________________________</p></div>;
                                  })()}
                                </div>

                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {fichaTab === "historico" && (() => {
                  const hist: any[] = [...(sc.hist || [])];
                  // enriquecer com eventos de documentos
                  const docsArqs: any[] = (sc as any).docs_arquivos || [];
                  docsArqs.forEach(arq => {
                    if (arq.criado_em) hist.push({ t: `Documento gerado: ${arq.nome}`, d: new Date(arq.criado_em).toLocaleString("pt-BR") });
                  });
                  const docsStatus: Record<string,string> = (sc as any).docs_status || {};
                  const docsNomes: Record<string,string> = { anamnese: "Ficha de Anamnese", contrato: "Contrato de Execucao", menor: "Autorizacao de Menor" };
                  Object.entries(docsStatus).forEach(([doc, st]) => {
                    if (st === "assinado" || st === "enviado") hist.push({ t: `${docsNomes[doc] || doc}: ${st}`, d: "" });
                  });
                  // ordenar por data decrescente (os que tem data)
                  const comData = hist.filter(h => h.d).sort((a,b) => new Date(b.d).getTime() - new Date(a.d).getTime());
                  const semData = hist.filter(h => !h.d);
                  const todos = [...semData, ...comData];
                  const icone = (t: string) => {
                    if (t.toLowerCase().includes("documento") || t.toLowerCase().includes("contrato") || t.toLowerCase().includes("anamnese") || t.toLowerCase().includes("autorizacao")) return "📄";
                    if (t.toLowerCase().includes("agend")) return "📅";
                    if (t.toLowerCase().includes("email") || t.toLowerCase().includes("enviado")) return "✉";
                    if (t.toLowerCase().includes("pagamento") || t.toLowerCase().includes("pago")) return "💰";
                    if (t.toLowerCase().includes("sessao") || t.toLowerCase().includes("sessão")) return "🎨";
                    if (t.toLowerCase().includes("lead") || t.toLowerCase().includes("cadastro")) return "👤";
                    return "•";
                  };
                  return (
                    <div>
                      <div className="stit">Historico do Cliente</div>
                      {todos.length === 0 && (
                        <div style={{ textAlign: "center", color: "var(--tx3)", fontSize: 12, padding: "20px 0" }}>Nenhum evento registrado ainda.</div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                        {todos.map((h: any, i: number) => (
                          <div key={i} style={{ display: "flex", gap: 10, paddingBottom: 12, position: "relative" }}>
                            {/* linha vertical */}
                            {i < todos.length - 1 && <div style={{ position: "absolute", left: 14, top: 22, bottom: 0, width: 1, background: "var(--br)" }} />}
                            {/* icone */}
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--dk3)", border: "1px solid var(--br)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, zIndex: 1 }}>
                              {icone(h.t)}
                            </div>
                            <div style={{ paddingTop: 4, flex: 1 }}>
                              <div style={{ fontSize: 12, color: "var(--tx)", lineHeight: 1.5 }}>{h.t}</div>
                              {h.d && <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 2 }}>{h.d}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {fichaTab === "dados" && <>
                <div>
                  <div className="stit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Solicitações</span>
                    {novoProjetoAberto !== sc.id && (
                      <button title="Cada projeto representa uma tatuagem ou trabalho artístico do cliente. Você pode ter múltiplos projetos por cliente." onClick={() => {
                        setNovoProjetoAberto(sc.id);
                        setNovoProjetoForm({ estilo: "", tam: "Medio", primeira: false, desc: "", valorTotal: "", servico: "" });
                      }} style={{ fontSize: 11, fontWeight: 600, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "4px 10px", color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        + Nova Solicitação
                      </button>
                    )}
                  </div>
                  {/* Formulário inline de novo projeto */}
                  {novoProjetoAberto === sc.id && (
                    <div style={{ background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 8, padding: "14px", marginBottom: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Nova Solicitação</div>
                      <div className="fi2">
                        <div className="fil">Nome / Identificação do Projeto *</div>
                        <input className="ef" placeholder="Ex: Tatuagem no braço, Limpeza de pele, Implante..." value={novoProjetoForm.estilo}
                          onChange={e => setNovoProjetoForm(p => ({ ...p, estilo: e.target.value }))} />
                      </div>
                      <div className="fi2">
                        <div className="fil">Serviço</div>
                        <select className="ef" value={novoProjetoForm.servico || ""} onChange={e => setNovoProjetoForm({ ...novoProjetoForm, servico: e.target.value })}>
                          <option value="">Selecione o serviço...</option>
                          {servicoOpts.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                        </select>
                      </div>
                      <div className="fi2">
                        <div className="fil">Valor Total do Projeto (R$)</div>
                        <input className="ef" type="text" placeholder="0,00" value={novoProjetoForm.valorTotal}
                          onChange={e => { const raw = e.target.value.replace(/[^0-9]/g,""); const num = raw ? (Number(raw)/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : ""; setNovoProjetoForm(p => ({ ...p, valorTotal: num })); }} />
                      </div>
                      <div className="fi2">
                        <div className="fil">Descrição do Projeto</div>
                        <textarea className="ef" placeholder="Descreva o projeto..." value={novoProjetoForm.desc} onChange={e => setNovoProjetoForm(p => ({ ...p, desc: e.target.value }))}
                          style={{ resize: "vertical", minHeight: 55, width: "100%", fontFamily: "inherit" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => { setNovoProjetoAberto(null); setNovoProjetoForm({ estilo: "", tam: "Medio", primeira: false, desc: "", valorTotal: "", servico: "" }); }} style={{ background: "none", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 14px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Descartar</button>
                        <button onClick={() => {
                          if (!novoProjetoForm.estilo.trim()) { setShowAviso("Preencha o nome/identificação do projeto."); return; }
                          const val = parseFloat(novoProjetoForm.valorTotal.replace(/\./g,"").replace(",",".")) || 0;
                          const proj = { id: Date.now(), estilo: novoProjetoForm.estilo, tam: novoProjetoForm.tam, primeira: novoProjetoForm.primeira, desc: novoProjetoForm.desc, servico: (novoProjetoForm as any).servico || "", valorTotal: val, status: "ativo", criadoEm: new Date().toLocaleDateString("pt-BR"), pagamentos: [] };
                          const projs = [...(sc.projetos || [])];
                          if (projs.length === 0 && (sc.estilo || sc.desc)) {
                            projs.push({ id: Date.now()-1, estilo: sc.estilo||"", tam: sc.tam||"Medio", primeira: sc.primeira||false, desc: sc.desc||"", valorTotal: 0, status: "ativo", criadoEm: "—", pagamentos: [] });
                          }
                          projs.push(proj);
                          upC(sc.id, "projetos", projs);
                          setNovoProjetoAberto(null);
                          setClients(p => p.map(c => c.id !== sc.id ? c : { ...c, hist: [...c.hist, { t: "Projeto criado: R$" + val.toLocaleString("pt-BR",{minimumFractionDigits:2}), d: new Date().toLocaleDateString("pt-BR") }] }));
                        }} style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Salvar Projeto</button>
                      </div>
                    </div>
                  )}
                  {(() => {
                    // Migrate legacy single project if projetos array is empty
                    const projetos: any[] = sc.projetos && sc.projetos.length > 0
                      ? sc.projetos
                      : (sc.estilo || sc.desc)
                        ? [{ id: "legacy", estilo: sc.estilo || "", tam: sc.tam || "Medio", primeira: sc.primeira || false, desc: sc.desc || "", status: "ativo", criadoEm: "—" }]
                        : [];
                    const ativos = projetos.filter((p: any) => p.status !== "concluido");
                    const concluidos = projetos.filter((p: any) => p.status === "concluido");
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                        {projetos.length === 0 && (
                          <div style={{ fontSize: 12, color: "var(--tx3)", fontStyle: "italic", padding: "8px 0" }}>Nenhuma solicitação cadastrada. Clique em + Nova Solicitação.</div>
                        )}
                        {ativos.map((proj: any, pi: number) => (
                          <div key={proj.id} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                              <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Solicitação {pi + 1} Em andamento</span>
                      {(proj as any).servico && <span style={{ fontSize: 10, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10, padding: "1px 8px", color: "var(--gold)", marginLeft: 6 }}>{(proj as any).servico}</span>}
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => setCancelProjetoModal({ clienteId: sc.id, projetoId: proj.id, motivo: "" })}
                                  style={{ fontSize: 10, fontWeight: 600, background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 5, padding: "3px 9px", color: "var(--q1)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                  ✕ Cancelar
                                </button>
                                <button onClick={() => {
                                  if (!window.confirm) {
                                    const projs = (sc.projetos && sc.projetos.length > 0) ? [...sc.projetos] : [{ ...proj }];
                                    const idx = projs.findIndex((p: any) => p.id === proj.id);
                                    if (idx >= 0) {
                                      projs[idx] = { ...projs[idx], status: "concluido", concluidoEm: new Date().toLocaleDateString("pt-BR") };
                                      upC(sc.id, "projetos", projs);
                                    }
                                    return;
                                  }
                                  // Abre modal de pagamento antes de concluir
                                  const evVinculado = agEvents.find(e => e.cliente_id === sc.id && e.status !== "concluido");
                                  setConfirmPagamento({ cid: sc.id, agEvent: evVinculado || null });
                                  // Após confirmar pagamento, marca projeto como concluído e move pipeline
                                  setProjParaConcluir({ clienteId: sc.id, projetoId: proj.id });
                                }} style={{ fontSize: 10, fontWeight: 600, background: "rgba(39,174,96,.1)", border: "1px solid rgba(39,174,96,.3)", borderRadius: 5, padding: "3px 9px", color: "#27AE60", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                  ✓ Solicitação Concluída
                                </button>
                              </div>
                            </div>
                            {/* Valor total do projeto + saldo devedor */}
                            {(() => {
                              const valorTotal = Number(proj.valorTotal) || 0;
                              const totalPagoReal = fin.filter((f: any) => f.cliente_id === sc.id && (!f.tipo || f.tipo === "entrada")).reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
                              const saldo = valorTotal - totalPagoReal;
                              return valorTotal > 0 ? (
                                <div style={{ display: "flex", gap: 12, padding: "6px 10px", background: "var(--dk4)", borderRadius: 6, fontSize: 12 }}>
                                  <span style={{ color: "var(--tx2)" }}>Total: <strong style={{ color: "var(--tx)" }}>R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
                                  <span style={{ color: "var(--tx2)" }}>Pago: <strong style={{ color: "#27AE60" }}>R$ {totalPagoReal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
                                  {saldo > 0 && <span style={{ color: "#E74C3C", fontWeight: 700, fontSize: 13, background: "rgba(231,76,60,0.1)", padding: "2px 8px", borderRadius: 6 }}>Saldo: <strong>R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>}
                                  {saldo <= 0 && totalPagoReal > 0 && <span style={{ color: "#27AE60", fontWeight: 700 }}>✓ Quitado</span>}
                                </div>
                              ) : null;
                            })()}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 2 }}>
                              <div className="fi2">
                                <div className="fil">Valor Total do Projeto (R$)</div>
                                <input className="ef" type="text" placeholder="0,00" value={proj.valorTotal ? Number(proj.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
                                  onChange={e => {
                                    const raw = e.target.value.replace(/\D/g,""); const num = raw ? Number(raw)/100 : 0;
                                    const projs = (sc.projetos && sc.projetos.length > 0) ? [...sc.projetos] : [{ ...proj }];
                                    const idx = projs.findIndex((p: any) => p.id === proj.id);
                                    if (idx >= 0) { projs[idx] = { ...projs[idx], valorTotal: num }; upCLocal(sc.id, "projetos", projs); }
                                    else upCLocal(sc.id, "projetos", [{ ...proj, valorTotal: num }]);
                                  }}
                                  onBlur={e => {
                                    const raw = e.target.value.replace(/\D/g,""); const num = raw ? Number(raw)/100 : 0;
                                    const projs = (sc.projetos && sc.projetos.length > 0) ? [...sc.projetos] : [{ ...proj }];
                                    const idx = projs.findIndex((p: any) => p.id === proj.id);
                                    if (idx >= 0) { projs[idx] = { ...projs[idx], valorTotal: num }; upC(sc.id, "projetos", projs); }
                                    else upC(sc.id, "projetos", [{ ...proj, valorTotal: num }]);
                                  }} />
                              </div>
                            </div>
                            <div className="fi2">
                              <div className="fil">Descrição do Projeto</div>
                              <textarea className="ef" value={proj.desc || ""} onChange={e => {
                                const projs = (sc.projetos && sc.projetos.length > 0) ? [...sc.projetos] : [{ ...proj }];
                                const idx = projs.findIndex((p: any) => p.id === proj.id);
                                if (idx >= 0) { projs[idx] = { ...projs[idx], desc: e.target.value }; upCLocal(sc.id, "projetos", projs); }
                                else upCLocal(sc.id, "projetos", [{ ...proj, desc: e.target.value }]);
                              }} onBlur={e => {
                                const projs = (sc.projetos && sc.projetos.length > 0) ? [...sc.projetos] : [{ ...proj }];
                                const idx = projs.findIndex((p: any) => p.id === proj.id);
                                if (idx >= 0) { projs[idx] = { ...projs[idx], desc: e.target.value }; upC(sc.id, "projetos", projs); }
                                else upC(sc.id, "projetos", [{ ...proj, desc: e.target.value }]);
                              }} style={{ resize: "vertical", minHeight: 55, width: "100%", fontFamily: "inherit" }} />
                            </div>
                          </div>
                        ))}
                        {projetos.filter((p: any) => p.status === "cancelado").length > 0 && (
                          <div style={{ borderTop: "1px solid var(--br)", paddingTop: 8, marginTop: 2 }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Cancelados</div>
                            {projetos.filter((p: any) => p.status === "cancelado").map((proj: any) => (
                              <div key={proj.id} style={{ background: "rgba(192,57,43,.05)", border: "1px solid rgba(192,57,43,.15)", borderRadius: 6, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx3)" }}>{proj.desc ? proj.desc.substring(0,30) : "Solicitação"}</div>
                                  <div style={{ fontSize: 11, color: "var(--tx3)" }}>Cancelado em {proj.canceladoEm || "—"}</div>
                                </div>
                                <span style={{ fontSize: 16 }}>🚫</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {concluidos.length > 0 && (
                          <div style={{ borderTop: "1px solid var(--br)", paddingTop: 8, marginTop: 2 }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Concluídos</div>
                            {concluidos.map((proj: any) => {
                              const estaEditando = editandoProjConc?.clienteId === sc.id && editandoProjConc?.projetoId === proj.id;
                              return (
                                <div key={proj.id} style={{ background: estaEditando ? "var(--dk3)" : "rgba(39,174,96,.05)", border: "1px solid " + (estaEditando ? "rgba(201,168,76,.3)" : "rgba(39,174,96,.15)"), borderRadius: 6, padding: "10px 12px", marginBottom: 6 }}>
                                  {estaEditando ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                      <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>✏️ Editando solicitação concluída</div>
                                      <div className="fi2">
                                        <div className="fil">Descrição</div>
                                        <textarea className="ef" value={proj.desc || ""} onChange={e => {
                                          const projs = [...(sc.projetos || [])];
                                          const idx = projs.findIndex((p: any) => p.id === proj.id);
                                          if (idx >= 0) { projs[idx] = { ...projs[idx], desc: e.target.value }; upCLocal(sc.id, "projetos", projs); }
                                        }} onBlur={e => {
                                          const projs = [...(sc.projetos || [])];
                                          const idx = projs.findIndex((p: any) => p.id === proj.id);
                                          if (idx >= 0) { projs[idx] = { ...projs[idx], desc: e.target.value }; upC(sc.id, "projetos", projs); }
                                        }} style={{ resize: "vertical", minHeight: 55, width: "100%", fontFamily: "inherit" }} />
                                      </div>
                                      <div className="fi2">
                                        <div className="fil">Valor Total (R$)</div>
                                        <input className="ef" type="text" placeholder="0,00"
                                          value={proj.valorTotal ? Number(proj.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
                                          onChange={e => {
                                            const raw = e.target.value.replace(/[^0-9]/g, "");
                                            const num = raw ? Number(raw) / 100 : 0;
                                            const projs = [...(sc.projetos || [])];
                                            const idx = projs.findIndex((p: any) => p.id === proj.id);
                                            if (idx >= 0) { projs[idx] = { ...projs[idx], valorTotal: num }; upCLocal(sc.id, "projetos", projs); }
                                          }}
                                          onBlur={e => {
                                            const raw = e.target.value.replace(/[^0-9]/g, "");
                                            const num = raw ? Number(raw) / 100 : 0;
                                            const projs = [...(sc.projetos || [])];
                                            const idx = projs.findIndex((p: any) => p.id === proj.id);
                                            if (idx >= 0) { projs[idx] = { ...projs[idx], valorTotal: num }; upC(sc.id, "projetos", projs); }
                                          }} />
                                      </div>
                                      <div style={{ display: "flex", gap: 8 }}>
                                        <button onClick={() => setEditandoProjConc(null)}
                                          style={{ flex: 1, background: "var(--gold)", border: "none", borderRadius: 6, padding: "8px", fontSize: 12, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                          ✓ Salvar edição
                                        </button>
                                        <button onClick={() => setEditandoProjConc(null)}
                                          style={{ background: "none", border: "1px solid var(--br)", borderRadius: 6, padding: "8px 14px", fontSize: 12, color: "var(--tx3)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx2)" }}>{proj.desc ? proj.desc.substring(0, 30) : "Solicitação"}</div>
                                        <div style={{ fontSize: 11, color: "var(--tx3)" }}>Concluído em {proj.concluidoEm || "—"}</div>
                                        {proj.desc && <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2, fontStyle: "italic" }}>{proj.desc.slice(0, 60)}{proj.desc.length > 60 ? "..." : ""}</div>}
                                        {proj.valorTotal > 0 && <div style={{ fontSize: 11, color: "#27AE60", marginTop: 2, fontWeight: 600 }}>{"R$ " + Number(proj.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>}
                                      </div>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 10, flexShrink: 0 }}>
                                        <button onClick={() => setEditandoProjConc({ clienteId: sc.id, projetoId: proj.id })}
                                          style={{ fontSize: 10, fontWeight: 600, background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 5, padding: "3px 9px", color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                          ✏️ Editar
                                        </button>
                                        <button onClick={() => {
                                          if (window.confirm("Reabrir esta solicitação? Ela voltará para Em andamento.")) {
                                            const projs = [...(sc.projetos || [])];
                                            const idx = projs.findIndex((p: any) => p.id === proj.id);
                                            if (idx >= 0) { projs[idx] = { ...projs[idx], status: "ativo", concluidoEm: undefined }; upC(sc.id, "projetos", projs); }
                                          }
                                        }} style={{ fontSize: 10, fontWeight: 600, background: "rgba(52,152,219,.1)", border: "1px solid rgba(52,152,219,.3)", borderRadius: 5, padding: "3px 9px", color: "#3498DB", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                                          ↩️ Reabrir
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* ── FINANCEIRO DO CLIENTE ── */}
                <div>
                  <div className="stit">Financeiro</div>
                  {(() => {
                    const pagCliente = fin.filter((f: any) =>
                      f.cliente_id === sc.id ||
                      f.cliente_id === String(sc.id) ||
                      f.cliente_nome === sc.nome ||
                      (sc.nome && f.cliente_nome?.toLowerCase().trim() === sc.nome.toLowerCase().trim())
                    );
                    const totalPago = pagCliente.reduce((s: number, f: any) => s + (Number(f.val_a)||0), 0);
                    const credito = sc.credito || 0;
                    const projs = (sc.projetos || []).filter((p: any) => p.status === "ativo");
                    const totalDevedor = projs.reduce((s: number, p: any) => {
                      const pago = (p.pagamentos || []).reduce((ss: number, pg: any) => ss + (Number(pg.valor)||0), 0);
                      return s + Math.max((Number(p.valorTotal)||0) - pago, 0);
                    }, 0);
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                          <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Total Pago</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#27AE60", fontFamily: "'Cormorant Garamond',serif" }}>R$ {totalPago.toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
                          </div>
                          <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Saldo Devedor</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: totalDevedor > 0 ? "var(--gold)" : "#27AE60", fontFamily: "'Cormorant Garamond',serif" }}>{totalDevedor > 0 ? "R$ " + totalDevedor.toLocaleString("pt-BR",{minimumFractionDigits:2}) : "Quitado"}</div>
                          </div>
                          <div style={{ background: "var(--dk3)", border: credito > 0 ? "1px solid rgba(201,168,76,.4)" : "1px solid var(--br)", borderRadius: 7, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Crédito</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: credito > 0 ? "var(--gold)" : "var(--tx3)", fontFamily: "'Cormorant Garamond',serif" }}>{credito > 0 ? "R$ " + credito.toLocaleString("pt-BR",{minimumFractionDigits:2}) : "—"}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => setPgAvulso({ clienteId: sc.id, clienteNome: sc.nome, artistaId: sc.artista || "", fase: "form", valor: "", forma: "Pix", obs: "" })}
                          style={{ alignSelf: "flex-start", background: "rgba(201,168,76,.12)", border: "1px solid rgba(201,168,76,.4)", borderRadius: 7, padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                          + Registrar pagamento
                        </button>
                        {pagCliente.length > 0 && (
                          <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "10px 13px" }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Histórico de Pagamentos</div>
                            {pagCliente.slice(-5).reverse().map((f: any, i: number) => (
                              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.04)", fontSize: 11 }}>
                                <span style={{ color: "var(--tx2)" }}>{f.data ? (f.data.includes("-") ? f.data.split("-").reverse().join("/") : f.data) : "—"} — {f.pgto || f.forma_pgto || "—"}</span>
                                <span style={{ color: "#27AE60", fontWeight: 600 }}>R$ {Number(f.val_a).toLocaleString("pt-BR",{minimumFractionDigits:2})}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <div className="stit">Fotos de Referência</div>
                  <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 10 }}>
                      {"Fotos enviadas pelo cliente via " + (auraName || "chat do site") + " ou adicionadas manualmente."}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {((sc as any).referencias || []).map((url: string, i: number) => (
                        <div key={i} style={{ position: "relative" }}>
                          <img src={url} alt={`ref-${i}`}
                            style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid var(--br)", cursor: "pointer" }}
                            onClick={() => window.open(url, "_blank")} />
                          <button
                            onClick={async () => {
                              const refs: string[] = ((sc as any).referencias || []).filter((_: string, j: number) => j !== i);
                              upC(sc.id, "referencias", refs);
                              await sb.from("clientes").update({ referencias: refs }).eq("id", sc.id);
                            }}
                            style={{ position: "absolute", top: -6, right: -6, background: "#c0392b", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 10, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                            title="Remover">✕</button>
                        </div>
                      ))}
                      <label style={{ width: 90, height: 90, border: "1px dashed var(--br)", borderRadius: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--tx3)", gap: 4, flexShrink: 0 }} title="Adicionar referência">
                        <span style={{ fontSize: 22 }}>+</span>
                        <span style={{ fontSize: 9 }}>Adicionar</span>
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const compress = (f: File, maxPx: number, q: number): Promise<{base64: string}> => new Promise((res) => {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const img = new Image();
                              img.onload = () => {
                                let w = img.width, h = img.height;
                                if (w > maxPx || h > maxPx) { if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; } else { w = Math.round(w * maxPx / h); h = maxPx; } }
                                const canvas = document.createElement("canvas");
                                canvas.width = w; canvas.height = h;
                                canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
                                res({ base64: canvas.toDataURL("image/jpeg", q).split(",")[1] });
                              };
                              img.src = ev.target?.result as string;
                            };
                            reader.readAsDataURL(f);
                          });
                          const { base64 } = await compress(file, 800, 0.75);
                          const resp = await fetch("https://inq-ink-system.vercel.app/api/upload", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ base64, mimeType: "image/jpeg", clienteId: sc.id })
                          });
                          const d = await resp.json();
                          if (d.url) {
                            const refs = [...((sc as any).referencias || []), d.url];
                            upC(sc.id, "referencias", refs);
                          }
                          e.target.value = "";
                        }} />
                      </label>
                    </div>
                    {(!(sc as any).referencias || (sc as any).referencias.length === 0) && (
                      <div style={{ fontSize: 11, color: "var(--tx3)", fontStyle: "italic", marginTop: 8 }}>Nenhuma referência ainda.</div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="stit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Documentos Salvos</span>
                    <label style={{ fontSize: 11, fontWeight: 600, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "3px 10px", color: "var(--gold)", cursor: "pointer" }}>
                      + Anexar
                      <input type="file" accept="image/*,application/pdf" multiple style={{ display: "none" }} onChange={async e => {
                        const files = Array.from(e.target.files || []);
                        for (const file of files) {
                          const fname = `doc-${sc.id}-${Date.now()}-${file.name.replace(/\s/g,"_")}`;
                          await sb.storage.from("referencias").upload(fname, file, { contentType: file.type, upsert: true });
                          const { data: pub } = sb.storage.from("referencias").getPublicUrl(fname);
                          const arquivosAtuais: any[] = (sc as any).docs_arquivos || [];
                          const novos = [...arquivosAtuais, { nome: file.name, url: pub.publicUrl, tipo: file.type.includes("pdf") ? "pdf" : "imagem", criado_em: new Date().toISOString() }];
                          await sb.from("clientes").update({ docs_arquivos: novos }).eq("id", sc.id);
                          upCFicha(sc.id, "docs_arquivos", novos);
                          setFichaEditada(false);
                        }
                        e.target.value = "";
                      }} />
                    </label>
                  </div>
                  {((sc as any).docs_arquivos || []).length === 0 ? (
                    <div style={{ background: "var(--dk3)", border: "1px dashed var(--br)", borderRadius: 7, padding: "16px", textAlign: "center", fontSize: 11, color: "var(--tx3)" }}>
                      Nenhum documento salvo ainda. PDFs gerados e anexos aparecem aqui.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                      {((sc as any).docs_arquivos || []).map((arq: any, i: number) => (
                        <div key={i} style={{ position: "relative", width: 90, flexShrink: 0 }}>
                          <div onClick={() => window.open(arq.url, "_blank")} style={{ width: 90, height: 90, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", transition: "border-color .15s" }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--gold)")}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--br)")}>
                            {arq.tipo === "imagem"
                              ? <img src={arq.url} alt={arq.nome} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 7 }} />
                              : <span style={{ fontSize: 32 }}>📄</span>
                            }
                          </div>
                          <div style={{ fontSize: 9, color: "var(--tx3)", marginTop: 3, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }} title={arq.nome}>{arq.nome}</div>
                          <div style={{ fontSize: 9, color: "var(--tx3)", textAlign: "center" }}>{arq.criado_em ? new Date(arq.criado_em).toLocaleDateString("pt-BR") : ""}</div>
                          <button onClick={async e => {
                            e.stopPropagation();
                            const novos = ((sc as any).docs_arquivos || []).filter((_: any, idx: number) => idx !== i);
                            await sb.from("clientes").update({ docs_arquivos: novos }).eq("id", sc.id);
                            upCFicha(sc.id, "docs_arquivos", novos);
                            setFichaEditada(false);
                          }} style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,.6)", border: "none", color: "#fff", cursor: "pointer", fontSize: 10, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {sc.val_a > 0 && (
                  <div>
                    <div className="stit">Financeiro da Sessão</div>
                    <div className="fg3">
                      <div className="fi2">
                        <div className="fil">{"Valor via " + (auraName || "IA") + " (não editável)"}</div>
                        <div className="fiv">{sc.val_c > 0 ? "R$ " + sc.val_c.toLocaleString("pt-BR") + " · " + (sc.pgto || "—") : "Não coletado"}</div>
                      </div>
                      <div className="fi2">
                        <div className="fil">Valor Registrado</div>
                        <input className="ef" type="number" defaultValue={sc.val_a} onBlur={e => upC(sc.id, "val_a", Number(e.target.value))} style={{ marginTop: 2 }} />
                      </div>
                      <div className="fi2">
                        <div className="fil">Forma de Pagamento</div>
                        <select className="ef" value={sc.pgto || ""} onChange={e => upC(sc.id, "pgto", e.target.value)} style={{ marginTop: 2 }}>
                          <option value="">Selecionar</option>
                          <option>Pix</option>
                          <option>Cartão</option>
                          <option>Dinheiro</option>
                          <option>Transferência</option>
                          <option>Permuta</option>
                        </select>
                      </div>
                    </div>
                    {sc.val_a !== sc.val_c && sc.val_c > 0 && (
                      <div style={{ background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.25)", borderRadius: 5, padding: "7px 10px", marginTop: 7, fontSize: 12, color: "var(--q1)", fontWeight: 600 }}>
                        ⚠ Divergência — verificar com o artista
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="stit">Confirmação de Projeto</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7 }}>
                    <div style={{ fontSize: 12, color: "var(--tx)", flex: 1 }}>
                      Contrato: <strong style={{ color: sc.contrato ? "var(--q3)" : "var(--q2)" }}>{sc.contrato ? "✓ Enviado" : "Nao enviado"}</strong>
                    </div>
                    <button className="btn-sm gold"
                      onClick={() => setShowCtr({ type: "client", nome: sc.nome, artista: aName(sc.artista), proj: sc.desc, valor: sc.val_a > 0 ? "R$ " + sc.val_a.toLocaleString("pt-BR") : "A definir" })}>
                      Ver / Enviar
                    </button>
                  </div>
                </div>



                {/* GARANTIA */}
                {["tatuado","pos_venda"].includes(sc.etapa) && (() => {
                  const proj = (sc.projetos || []).find((p: any) => p.status === "concluido");
                  if (!proj?.concluidoEm) return null;
                  const partes = (proj.concluidoEm as string).split("/");
                  if (partes.length !== 3) return null;
                  const dataObj = new Date(Number(partes[2]), Number(partes[1])-1, Number(partes[0]));
                  const hoje = new Date();
                  const msDay = 1000 * 60 * 60 * 24;
                  const diasPassados = Math.floor((hoje.getTime() - dataObj.getTime()) / msDay);
                  const diasRestantes = 37 - diasPassados;
                  const vencida = diasPassados > 37;
                  const urgente = !vencida && diasPassados >= 30;
                  const cor = vencida ? "var(--q1)" : urgente ? "#E67E22" : "#27AE60";
                  const bg = vencida ? "rgba(192,57,43,.08)" : urgente ? "rgba(230,126,34,.08)" : "rgba(39,174,96,.08)";
                  const brd = vencida ? "rgba(192,57,43,.3)" : urgente ? "rgba(230,126,34,.3)" : "rgba(39,174,96,.3)";
                  const txt = vencida ? "🚫 Garantia vencida" : urgente ? ("⚠️ Vence em " + diasRestantes + (diasRestantes === 1 ? " dia" : " dias")) : ("✅ " + diasRestantes + " dias restantes");
                  const wPct = Math.min(diasPassados, 37) * 100;
                  const wFull = 37 * 100;
                  return (
                    <div>
                      <div className="stit">🛡 Garantia de Retoque</div>
                      <div style={{ background: bg, border: "1px solid " + brd, borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: cor }}>{txt}</div>
                            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>Concluída em {proj.concluidoEm} · D+{diasPassados}/37</div>
                          </div>
                          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--dk4)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: cor, lineHeight: 1 }}>{Math.min(diasPassados, 37)}</span>
                            <span style={{ fontSize: 8, color: "var(--tx3)" }}>de 37</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 8, width: "100%", background: "var(--dk4)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 4, background: cor, width: (wPct / wFull * 100) + "%" }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* CHECKLIST DE SESSÃO */}
                {["sessao_agend","tatuado"].includes(sc.etapa) && (() => {
                  const temSinal = fin.some((f: any) => f.cliente_id === sc.id && f.pgto === "Sinal");
                  const temValor = (sc.projetos || []).some((p: any) => p.valorTotal > 0);
                  const checks = [
                    { l: "Contrato enviado e confirmado", ok: !!sc.contrato },
                    { l: "Sinal recebido", ok: temSinal },
                    { l: "Valor do projeto registrado", ok: temValor },
                  ];
                  const okCount = checks.filter(c => c.ok).length;
                  const allOk = okCount === checks.length;
                  return (
                    <div>
                      <div className="stit">✅ Checklist de Sessão</div>
                      <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ fontSize: 11, color: allOk ? "#27AE60" : "var(--tx2)", marginBottom: 8, fontWeight: 600 }}>{okCount}/{checks.length} itens concluídos{allOk ? " ✅" : ""}</div>
                        {checks.map((c, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, marginBottom: 6 }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{c.ok ? "✅" : "⬜"}</span>
                            <span style={{ color: c.ok ? "var(--tx2)" : "var(--tx)", textDecoration: c.ok ? "line-through" : "none" }}>{c.l}</span>
                          </div>
                        ))}
                        {!allOk && <div style={{ marginTop: 6, fontSize: 11, color: "var(--q2)", background: "rgba(212,130,10,.08)", borderRadius: 6, padding: "6px 10px" }}>⚠️ Faltam: {checks.filter(c => !c.ok).map(c => c.l).join(", ")}</div>}
                      </div>
                    </div>
                  );
                })()}

                {/* AGENDAMENTOS DO CLIENTE */}
                {(() => {
                  const evsCli = agEvents.filter(e => e.cliente_id === sc.id);
                  if (evsCli.length === 0) return null;
                  return (
                    <div>
                      <div className="stit">📅 Agendamentos</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[...evsCli].sort((a, b) => a.date > b.date ? -1 : 1).map(e => (
                          <div key={e.id} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>{(() => { try { const [y,m,d] = e.date.split("-"); return `${["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][new Date(e.date).getDay()]}, ${d} de ${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][parseInt(m)-1]}`; } catch { return e.date; } })()}</div>
                              <div style={{ fontSize: 11, color: "var(--tx2)" }}>{String(e.start).padStart(2,"0")}h — {getEventLabel(e.tipo, artists)}{e.artista && !e.tipo?.startsWith("bloq") ? " · " + aName(e.artista).split(" ")[0] : ""}</div>
                            </div>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: getEventColor(e.tipo, artists, e.artista), flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const hoje0m = new Date(); hoje0m.setHours(0,0,0,0);
                  const sessCli2 = agEvents.filter((e: any) => e.cliente_id === sc.id && !e.tipo?.startsWith("bloq") && !e.tipo?.startsWith("cons"));
                  const totalSess = sessCli2.length;
                  if (totalSess < 1) return null;
                  const concl = sessCli2.filter((e: any) => e.status === "concluido").length;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--tx2)", margin: "6px 0" }}>
                      {sessCli2.slice(0, 5).map((e: any, i: number) => {
                        const dEv2 = e.date ? new Date(e.date + "T12:00:00") : null;
                        const isConc = e.status === "concluido";
                        const isFut = dEv2 && dEv2 >= hoje0m;
                        return (
                          <div key={e.id || i} style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                            background: isConc ? "#27AE60" : isFut ? "var(--gold)" : "var(--dk5)",
                            border: isConc || isFut ? "none" : "1px solid var(--br)" }} />
                        );
                      })}
                      {totalSess > 5 && <span>...</span>}
                      <span>{concl} de {totalSess} sess{totalSess !== 1 ? "ões" : "ão"}</span>
                    </div>
                  );
                })()}

                <div>
                  <div className="stit">Mover no Pipeline</div>
                  <div className="pm">
                    {stages.map(s => {
                      const critica = ["cons_agendada","sessao_agend","tatuado"].includes(s.id);
                      return (
                        <button key={s.id} className={"sb" + (sc.etapa === s.id ? " cur" : "")}
                          style={sc.etapa === s.id ? { borderColor: s.color, color: s.color, background: s.color + "18" } : {}}
                          onClick={() => {
                            if (critica && sc.etapa !== s.id) {
                              const tipoFiltro = s.id === "cons_agendada" ? "cons" : s.id === "sessao_agend" ? "sess" : null;
                              const evs = agEvents.filter(e => e.cliente_id === sc.id && e.status !== "concluido" && e.status !== "cancelado" && (tipoFiltro ? e.tipo?.startsWith(tipoFiltro) : true));
                              setConfirmMover({ cid: sc.id, stage: s, agEvents: evs });
                            } else {
                              move(sc.id, s.id);
                            }
                          }}>
                          {s.emoji} {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {sc.pv.length > 0 && (
                  <div>
                    <div className="stit">Pós-venda</div>
                    {sc.pv.map((p: any, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 5, marginBottom: 5 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: p.s === "done" ? "var(--q3)" : p.s === "pending" ? "var(--q2)" : "var(--tx3)", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--tx)", flex: 1 }}>{p.l}</span>
                        <span className={"pvss " + (p.s === "done" ? "pvd" : p.s === "pending" ? "pvp" : "pvf")}>
                          {p.s === "done" ? "✓ Enviado" : p.s === "pending" ? "⏳ Pendente" : "🔮 Aguardando"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="stit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Avaliações Internas</span>
                    <button onClick={() => setFichaRevelada(p => { const n = new Set(p); n.has(sc.id) ? n.delete(sc.id) : n.add(sc.id); return n; })}
                      style={{ fontSize: 11, background: "none", border: "1px solid var(--br)", borderRadius: 6, padding: "3px 9px", color: fichaRevelada.has(sc.id) ? "var(--gold)" : "var(--tx3)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      {fichaRevelada.has(sc.id) ? "👁 Ocultar dados internos" : "👁 Ver dados internos"}
                    </button>
                  </div>
                  {!fichaRevelada.has(sc.id) ? (
                    <div style={{ padding: "14px 0", fontSize: 12, color: "var(--tx3)", fontStyle: "italic", textAlign: "center" }}>
                      Dados internos ocultos — clique em "Ver dados internos" para revelar
                    </div>
                  ) : (
                  <>
                  <div className="fg2">
                    <div className="fi2">
                      <div className="fil">Avaliação do Cliente pelo Profissional</div>
                      <div className="stars" style={{ marginTop: 4 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <span key={n} className="star" style={{ opacity: n <= (sc.stars || 0) ? 1 : .25 }} onClick={() => setStars(sc.id, n)}>⭐</span>
                        ))}
                      </div>
                      {sc.starReason && <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3, fontStyle: "italic" }}>{sc.starReason}</div>}
                    </div>
                    <div className="fi2">
                      <div className="fil">NPS do Cliente (0 - 10)</div>
                      {sc.nps != null
                        ? <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif", marginTop: 3 }}>{sc.nps}/10</div>
                        : <div className="nps-bar">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <button key={n} className={"nps-btn" + (sc.nps === n ? " sel" : "")} onClick={() => upC(sc.id, "nps", n)}>{n}</button>
                          ))}
                        </div>
                      }
                    </div>
                  </div>
                  <div className="fi2" style={{ marginTop: 7 }}>
                    <div className="fil">Consentimento de Uso de Imagem</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                      <button className={"cb" + (sc.consent === true ? " yes" : "")} onClick={() => upC(sc.id, "consent", true)}>✓ Autorizado</button>
                      <button className={"cb" + (sc.consent === false ? " no" : "")} onClick={() => upC(sc.id, "consent", false)}>✕ Nao autorizado</button>
                      {sc.consent === null && <span style={{ fontSize: 11, color: "var(--tx3)", alignSelf: "center" }}>Nao informado</span>}
                    </div>
                  </div>
                  <div className="fi2" style={{ marginTop: 7 }}>
                    <div className="fil">Observações Internas</div>
                    <textarea value={sc.obs} onChange={e => upCLocal(sc.id, "obs", e.target.value)}
                      onBlur={e => upC(sc.id, "obs", e.target.value)}
                      style={{ width: "100%", minHeight: 50, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 5, padding: "6px 8px", fontSize: 11, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical", marginTop: 3 }}
                      placeholder="Anotações privadas..." />
                  </div>
                  </>
                  )}
                </div>

                </>}

                {fichaTab === "dados" && selCtx === "clientes" && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--br)", marginTop: 8, gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setConfirmExcluirCliente(sc)} style={{ background: "rgba(192,57,43,.15)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "7px 16px", fontSize: 12, color: "var(--q1)", cursor: "pointer", fontWeight: 600 }}>🗑 Excluir cliente</button>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      {fichaSaveStep === 0 && (
                        <button onClick={() => { if (fichaEditada) setFichaSaveStep(1); }} disabled={!fichaEditada}
                          style={{ background: fichaEditada ? "var(--gold)" : "var(--dk3)", border: "none", borderRadius: 6, padding: "7px 20px", fontSize: 12, color: fichaEditada ? "#1a1a1a" : "var(--tx3)", cursor: fichaEditada ? "pointer" : "not-allowed", fontWeight: 700, opacity: fichaEditada ? 1 : 0.5 }}>
                          💾 Salvar{fichaEditada ? " *" : ""}
                        </button>
                      )}
                      {fichaSaveStep === 1 && (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 8, padding: "6px 12px" }}>
                          <span style={{ fontSize: 12, color: "var(--tx2)" }}>Confirmar alterações?</span>
                          <button onClick={() => setFichaSaveStep(0)} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 5, padding: "4px 10px", fontSize: 11, color: "var(--tx2)", cursor: "pointer" }}>Cancelar</button>
                          <button onClick={() => setFichaSaveStep(2)} style={{ background: "var(--gold)", border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 11, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>Confirmar</button>
                        </div>
                      )}
                      {fichaSaveStep === 2 && (
                        <div style={{ display: "flex", gap: 6, alignItems: "center", background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 8, padding: "6px 12px" }}>
                          <span style={{ fontSize: 12, color: "var(--q1)", fontWeight: 600 }}>Esta ação é definitiva. Prosseguir?</span>
                          <button onClick={() => setFichaSaveStep(1)} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 5, padding: "4px 10px", fontSize: 11, color: "var(--tx2)", cursor: "pointer" }}>Voltar</button>
                          <button onClick={async () => {
                            const updated = clients.find(c => c.id === sc.id);
                            if (updated) { await saveClientDb(updated); }
                            setFichaEditada(false);
                            setFichaSaveStep(0);
                          }} style={{ background: "var(--q1)", border: "none", borderRadius: 5, padding: "4px 12px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 700 }}>Salvar definitivamente</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CONTRATO ── */}
        {showCtr && (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) setShowCtr(null); }}>
            <div className="modal" style={{ maxWidth: 640 }}>
              <div className="mh">
                <div>
                  <div className="mn">{showCtr.type === "artist" ? "Contrato de Profissional" : "Confirmação de Projeto"}</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>Clique no texto para editar diretamente</div>
                </div>
                <button className="mc" onClick={() => setShowCtr(null)}>✕</button>
              </div>
              {(() => {
                const ctrKey = showCtr.type + (showCtr.a?.id || "");
                const originalText = showCtr.type === "artist"
                  ? makeContractArtist(studioName).replace("[NOME]", showCtr.a?.nome || " - ").replace("[EMAIL]", showCtr.a?.email || " - ").replace("[INSTAGRAM]", showCtr.a?.insta || " - ").replace("[RESIDENTE / GUEST]", showCtr.a?.role || " - ")
                  : makeContractClient(studioName, showCtr.nome, showCtr.artista, showCtr.proj, showCtr.valor);
                const currentText = ctrEdit[ctrKey] !== undefined ? ctrEdit[ctrKey] : originalText;
                const isEditing = showCtr.editing || false;
                return (
                  <div style={{ padding: "18px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginBottom: 10 }}>
                      {!isEditing && (
                        <button className="btn-c" onClick={() => setShowCtr({ ...showCtr, editing: true })}>✏️ Editar</button>
                      )}
                      {isEditing && <>
                        <button className="btn-c" onClick={() => { setCtrEdit(p => ({ ...p, [ctrKey]: originalText })); setShowCtr({ ...showCtr, editing: false }); }}>Cancelar</button>
                        <button className="btn-s" onClick={() => setShowCtr({ ...showCtr, editing: false })}>💾 Salvar</button>
                      </>}
                      <button className="btn-s" style={{ background: "rgba(39,174,96,.8)" }} onClick={() => {
                        navigator.clipboard?.writeText(currentText);
                        if (showCtr.type === "client" && sc) upC(sc.id, "contrato", true);
                        setShowCtr(null);
                        setShowAviso("Contrato copiado! " + (auraName || "A IA") + " enviará ao artista para assinar via Gov.br.");
                      }}>{"📤 Enviar via " + (auraName || "IA")}</button>
                    </div>
                    <textarea
                      value={currentText}
                      readOnly={!isEditing}
                      onChange={e => setCtrEdit(prev => ({ ...prev, [ctrKey]: e.target.value }))}
                      style={{ width: "100%", minHeight: 340, background: isEditing ? "var(--dk3)" : "var(--dk4)", border: `1px solid ${isEditing ? "var(--gold)" : "var(--br)"}`, borderRadius: 7, padding: 14, fontSize: 12, color: isEditing ? "var(--tx)" : "var(--tx2)", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.8, outline: "none", resize: "vertical", cursor: isEditing ? "text" : "default" }} />
                    <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 6 }}>
                      {isEditing ? "✏️ Editando — clique em Salvar para confirmar as alterações." : "🔒 Somente leitura — clique em Editar para modificar."}
                    </div>
                    <div style={{ display: "flex", gap: 7, marginTop: 11, justifyContent: "flex-end" }}>
                      <button className="btn-c" onClick={() => setShowCtr(null)}>Fechar</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── FORM NOVO CLIENTE ── */}
        {showForm && (
          <div className="fov" onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setFormStep(1); } }}>
            <div className="fmod">
              <div className="fmh">
                <div>
                  <div className="fmt">Novo Cliente</div>
                  <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Etapa {formStep} de 2 — {formStep === 1 ? "Dados Pessoais" : "Solicitação"}</div>
                </div>
                <button className="mc" onClick={() => { setShowForm(false); setFormStep(1); }}>✕</button>
              </div>
              {/* Barra de progresso */}
              <div style={{ height: 3, background: "var(--dk3)" }}>
                <div style={{ height: 3, background: "var(--gold)", width: formStep === 1 ? "50%" : "100%", transition: "width .3s" }} />
              </div>
              <div className="fmb">
                {formStep === 1 && (
                  <>
                    <div className="fr">
                      <div className="ff"><label className="fl">Nome *</label><input className="fi" placeholder="Nome completo" value={form.nome} autoFocus onChange={e => { const v = e.target.value; setForm({ ...form, nome: v.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase()) }); }} /></div>
                      <div className="ff"><label className="fl">Telefone *</label><input className="fi" placeholder="(99) 9 9999-9999" value={form.tel} onChange={e => setForm({ ...form, tel: maskTel(e.target.value) })} /></div>
                    </div>
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Email</label>
                        <input className="fi" placeholder="email@email.com" value={form.email}
                          onChange={e => { setForm({ ...form, email: e.target.value }); setEmailError(""); }}
                          style={{ borderColor: emailError ? "var(--q1)" : undefined }} />
                        {emailError && (
                          <span style={{ fontSize: 10, color: "var(--q1)", marginTop: 3, display: "block" }}>{emailError}</span>
                        )}
                      </div>
                      <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={form.insta} onChange={e => { const v = e.target.value; setForm({ ...form, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
                    </div>
                    <div className="fr">
                      <div className="ff" key={"artdiv-" + artists.length}>
                        <label className="fl">Profissional Responsável</label>
                        <select className="fs" value={form.artista} onChange={e => setForm({ ...form, artista: e.target.value })}>
                          <option value="">Selecione...</option>
                          {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                        </select>
                      </div>
                      <div className="ff">
                        <label className="fl">Qualificação</label>
                        <select className="fs" value={form.qual} onChange={e => setForm({ ...form, qual: e.target.value })}>
                          <option value="Q0">Q0 - Presencial</option>
                          <option value="Q1">Q1 - Frio</option>
                          <option value="Q2">Q2 - Quente</option>
                          <option value="Q3">Q3 - Pronto</option>
                        </select>
                      </div>
                    </div>
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Origem</label>
                        <select className="fs" value={form.orig} onChange={e => setForm({ ...form, orig: e.target.value })}>
                          <option value="">Selecionar origem...</option>
                          {origens.map(o => <option key={o.id} value={o.nome}>{o.nome}</option>)}
                          {form.orig && !origens.find(o => o.nome === form.orig) && (
                            <option value={form.orig}>{form.orig}</option>
                          )}
                          <option value="Outro">Outro</option>
                        </select>
                      </div>
                      {(sel as any)?.campanha_id && (() => {
                        const camp = campanhas.find(c => c.id === (sel as any).campanha_id);
                        return camp ? (
                          <div className="ff">
                            <label className="fl">Campanha</label>
                            <div className="fs" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "default" }}>
                              <span>🎯</span>
                              <span style={{ color: "var(--gold)", fontWeight: 600 }}>{camp.nome}</span>
                            </div>
                          </div>
                        ) : null;
                      })()}
                      <div className="ff">
                        <label className="fl">Data de Nascimento</label>
                        {(() => {
                          const nasc = (form as any).nascimento || "";
                          const partes = nasc.includes("/") ? nasc.split("/") : ["","",""];
                          const diaDB = partes[0] || "";
                          const mesDB = partes[1] || "";
                          const anoDB = partes[2] || "";
                          const diaV = nascDraftForm.dia || diaDB;
                          const mesV = nascDraftForm.mes || mesDB;
                          const anoV = nascDraftForm.ano || anoDB;
                          const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
                          const anoAtual = new Date().getFullYear();
                          const anos = Array.from({ length: anoAtual - 1919 }, (_, i) => anoAtual - i);
                          const atualizar = (campo: string, valor: string) => {
                            const novo = { ...nascDraftForm, [campo]: valor };
                            setNascDraftForm(novo);
                            const d = campo === "dia" ? valor : diaV;
                            const m = campo === "mes" ? valor : mesV;
                            const a = campo === "ano" ? valor : anoV;
                            if (d && m && a) {
                              setForm({ ...form, nascimento: d.padStart(2,"0") + "/" + m.padStart(2,"0") + "/" + a } as any);
                              setNascDraftForm({ dia: "", mes: "", ano: "" });
                            }
                          };
                          return (
                            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 6 }}>
                              <select className="fi" value={diaV} onChange={e => atualizar("dia", e.target.value)} style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                <option value="">Dia</option>
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                  <option key={d} value={String(d).padStart(2,"0")}>{d}</option>
                                ))}
                              </select>
                              <select className="fi" value={mesV} onChange={e => atualizar("mes", e.target.value)} style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                <option value="">Mês</option>
                                {meses.map((m, i) => (
                                  <option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>
                                ))}
                              </select>
                              <select className="fi" value={anoV} onChange={e => atualizar("ano", e.target.value)} style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                <option value="">Ano</option>
                                {anos.map(a => (
                                  <option key={a} value={String(a)}>{a}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                )}
                {formStep === 2 && (
                  <>
                    <div className="ff">
                      <label className="fl">Serviço de Interesse</label>
                      <select className="fs" value={(form as any).servicoInteresse || ""} onChange={e => setForm({ ...form, servicoInteresse: e.target.value } as any)}>
                        <option value="">Selecione...</option>
                        {servicoOpts.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                      </select>
                    </div>
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Valor Estimado do Projeto (R$)</label>
                        <input className="fi" placeholder="0,00" value={(form as any).valorProjeto || ""}
                          onChange={e => {
                            const raw = e.target.value.replace(/\D/g, "");
                            const num = raw ? (Number(raw) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
                            setForm({ ...form, valorProjeto: num } as any);
                          }} />
                      </div>
                      <div className="ff">
                        <label className="fl">Documento CPF — Opcional</label>
                        <input className="fi" placeholder="000.000.000-00" value={(form as any).documento || ""}
                          maxLength={14}
                          onChange={e => {
                            const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                            const fmt = raw.length <= 3 ? raw
                              : raw.length <= 6 ? raw.slice(0,3) + "." + raw.slice(3)
                              : raw.length <= 9 ? raw.slice(0,3) + "." + raw.slice(3,6) + "." + raw.slice(6)
                              : raw.slice(0,3) + "." + raw.slice(3,6) + "." + raw.slice(6,9) + "-" + raw.slice(9);
                            setForm({ ...form, documento: fmt } as any);
                          }} />
                      </div>
                    </div>
                    <div className="ff"><label className="fl">Descrição do Projeto</label><textarea className="fta" placeholder="Descreva a ideia..." value={form.desc}
                      onChange={e => { const v = e.target.value; setForm({ ...form, desc: v.charAt(0).toUpperCase() + v.slice(1) }); }} /></div>
                  </>
                )}
              </div>
              <div className="fmf">
                <button className="btn-c" onClick={() => { if (formStep === 1) { setShowForm(false); setFormStep(1); } else setFormStep(1); }}>
                  {formStep === 1 ? "Cancelar" : "← Voltar"}
                </button>
                {formStep === 1 && (
                  <button className="btn-s" disabled={!form.nome || !form.tel} onClick={() => { if (form.email && !validarEmail(form.email)) { setEmailError("Email inválido"); return; } setEmailError(""); setFormStep(2); }}>Próximo →</button>
                )}
                {formStep === 2 && (
                  <button className="btn-s" onClick={() => { saveClient(); setFormStep(1); }}>Salvar Cliente</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── FORM NOVO ARTISTA ── */}
        {showArtForm && (
          <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowArtForm(false); }}>
            <div className="fmod" style={{ maxWidth: 420 }}>
              <div className="fmh">
                <div className="fmt">Adicionar Profissional</div>
                <button className="mc" onClick={() => setShowArtForm(false)}>✕</button>
              </div>
              <div className="fmb">
                <div className="ff"><label className="fl">Nome Completo *</label><input className="fi" placeholder="Nome do artista" value={artForm.nome} onChange={e => setArtForm({ ...artForm, nome: e.target.value.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase()) })} /></div>
                <div className="fr">
                  <div className="ff">
                    <label className="fl">Tipo</label>
                    <select className="fs" value={artForm.role} onChange={e => setArtForm({ ...artForm, role: e.target.value })}>
                      <option value="residente">Residente</option><option value="guest">Temporário</option>
                    </select>
                  </div>
                  <div className="ff">
                  <label className="fl">Comissão (%)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input className="fi" type="number" min={0} max={100} value={artForm.com} onChange={e => setArtForm({ ...artForm, com: Number(e.target.value) })} style={{ width: 80 }} />
                    <span style={{ fontSize: 11, color: "var(--tx3)", display: "flex", gap: 10 }}>
                      <span>Profissional: <strong style={{ color: "var(--gold)" }}>{artForm.com}%</strong></span>
                      <span style={{ color: "var(--br)" }}>|</span>
                      <span>Estúdio: <strong style={{ color: "#27AE60" }}>{100 - artForm.com}%</strong></span>
                    </span>
                  </div>
                </div>
                </div>
                <div className="fr">
                  <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={artForm.insta} onChange={e => { const v = e.target.value; setArtForm({ ...artForm, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
                  <div className="ff"><label className="fl">Email</label><input className="fi" placeholder="email" value={artForm.email} onChange={e => setArtForm({ ...artForm, email: e.target.value.toLowerCase() })} /></div>
                </div>
                <div className="ff"><label className="fl">Telefone</label><input className="fi" placeholder="(99) 99999-9999" value={artForm.tel} onChange={e => setArtForm({ ...artForm, tel: maskTel(e.target.value) })} /></div>
                <div className="ff">
                  <label className="fl">Cor</label>
                  <ColorPicker value={artForm.cor} onChange={cor => setArtForm({ ...artForm, cor })} />
                </div>
              </div>
              <div className="fmf">
                <button className="btn-c" onClick={() => setShowArtForm(false)}>Cancelar</button>
                <button className="btn-s" onClick={saveArtist} disabled={!artForm.nome}>Salvar</button>
              </div>
            </div>
          </div>
        )}

        {/* ── FORM NOVO EVENTO ── */}
        {showAgForm && (
          <div className="fov" onClick={e => { if (e.target === e.currentTarget) { setShowAgForm(false); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); } }}>
            <div className="fmod" style={{ maxWidth: 460 }}>
              <div className="fmh">
                <div className="fmt">{editingEvent ? "Editar Evento" : "Novo Evento"}</div>
                <button className="mc" onClick={() => { setShowAgForm(false); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); }}>✕</button>
              </div>
              <div className="fmb">

                {/* 1. CLIENTE — oculto para bloqueio */}
                {!(agForm.tipo || "").startsWith("bloq") && (
                <div className="ff" style={{ position: "relative" }}>
                  <label className="fl">Cliente *</label>
                  {agClientVinc ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 5, padding: "7px 10px" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: aStyle(agClientVinc.artista).background || "var(--gold)", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: "var(--tx)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600 }}>{agClientVinc.nome}</span>
                      <button onClick={() => { setAgClientVinc(null); setAgClientSearch(""); setAgForm({ ...agForm, title: "" }); }}
                        style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14 }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <input className="fi" placeholder="Buscar cliente cadastrado..."
                        value={agClientSearch}
                        onChange={e => { setAgClientSearch(e.target.value); setAgClientDropdown(e.target.value.length >= 1); }}
                        onFocus={() => { if (agClientSearch.length >= 1) setAgClientDropdown(true); }}
                        onBlur={() => setTimeout(() => setAgClientDropdown(false), 200)}
                      />
                      {agClientDropdown && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 6, zIndex: 999, maxHeight: 220, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,.5)", marginTop: 2 }}>
                          {clients.filter(c => c.nome.toLowerCase().includes(agClientSearch.toLowerCase())).slice(0, 8).map(c => (
                            <div key={c.id}
                              style={{ padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--br)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                              onMouseDown={() => {
                                const tipoBase = (agForm.tipo || "").startsWith("sess") ? "sess_" : (agForm.tipo || "").startsWith("cons") ? "cons_" : "sess_";
                                const artId = c.artista || artists[0]?.id || "";
                                setAgClientVinc(c);
                                setAgForm({ ...agForm, title: c.nome, tipo: tipoBase + artId });
                                setAgClientSearch("");
                                setAgClientDropdown(false);
                              }}>
                              <div>
                                <div style={{ fontSize: 13, color: "var(--tx)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600 }}>{c.nome}</div>
                              </div>
                              <span style={aStyle(c.artista)}>{aName(c.artista).split(" ")[0]}</span>
                            </div>
                          ))}
                          {clients.filter(c => c.nome.toLowerCase().includes(agClientSearch.toLowerCase())).length === 0 && (
                            <div style={{ padding: "12px", fontSize: 12, color: "var(--tx3)", textAlign: "center", fontStyle: "italic" }}>
                              Nenhum cliente encontrado. Cadastre-o primeiro.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                )}
                {/* 2. DATA */}
                <div className="ff">
                  <DateScroller label="Data" value={agForm.date} onChange={val => { const ano = parseInt(val.split("-")[0]); if (!val || (ano >= 2020 && ano <= 2099)) setAgForm({ ...agForm, date: val }); }} />
                </div>

                {/* 3. HORÁRIO */}
                <div className="fr">
                  <TimeScroller label="Início" value={agForm.start || 9} onChange={(h, m) => setAgForm({ ...agForm, start: h })} />
                  <TimeScroller label="Fim" value={agForm.end || 11} onChange={(h, m) => setAgForm({ ...agForm, end: h })} />
                </div>

                {/* 4. DESCRIÇÃO */}
                <div className="ff">
                  <label className="fl">Descrição / Observação</label>
                  <textarea className="fi" placeholder="Detalhes da tatuagem ou observações..." value={(agForm as any).desc || ""}
                    onChange={e => setAgForm({ ...agForm, desc: e.target.value } as any)}
                    style={{ resize: "vertical", minHeight: 60, fontFamily: "inherit" }} />
                </div>

                {/* 5. PROFISSIONAL — oculto para bloqueio (sub-opções já mostram profissionais) */}
                {!(agForm.tipo || "").startsWith("bloq") && (
                <div className="ff">
                  <label className="fl">Profissional</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {artists.filter(a => a.ativo).map(a => {
                      const chipActive = agForm.tipo?.includes(a.id) || ((agForm as any).artista_exec === a.id);
                      return (
                        <div key={a.id} onMouseDown={() => {
                          if (agForm.tipo === "piercing" || agForm.tipo?.startsWith("bloq")) {
                            setAgForm({ ...agForm, artista_exec: a.id } as any);
                          } else {
                            setAgForm({ ...agForm, tipo: (agForm.tipo || "").includes("sess") ? "sess_" + a.id : "cons_" + a.id });
                          }
                        }}
                          style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
                            background: chipActive ? a.cor + "33" : "var(--dk3)",
                            border: "1px solid " + (chipActive ? a.cor : "var(--br)"),
                            color: chipActive ? a.cor : "var(--tx2)" }}>
                          {a.nome.split(" ")[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* 6. PROJETO VINCULADO — valor vem do projeto do cliente */}
                {agClientVinc && (() => {
                  try {
                    const projs = (agClientVinc.projetos || []).filter((p: any) => p && p.status === "ativo");
                    if (projs.length === 0) return null;
                    return (
                      <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "10px 13px" }}>
                        <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Projeto(s) ativo(s)</div>
                        {projs.map((p: any, idx: number) => {
                          const pago = (p.pagamentos || []).reduce((s: number, x: any) => s + (Number(x.valor)||0), 0);
                          const saldo = (Number(p.valorTotal)||0) - pago;
                          return (
                            <div key={p.id || idx} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", justifyContent: "space-between" }}>
                              {p.desc && <span style={{ color: "var(--tx)", fontSize: 11 }}>{p.desc.substring(0,35)}{p.desc.length > 35 ? "..." : ""}</span>}
                              <span>
                                {p.valorTotal > 0 && <span style={{ color: saldo > 0 ? "var(--gold)" : "#27AE60", fontWeight: 600 }}>R$ {saldo > 0 ? saldo.toLocaleString("pt-BR",{minimumFractionDigits:2}) + " a pagar" : "Quitado"}</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } catch { return null; }
                })()}

                {/* 6b. SINAL — oculto para bloqueio */}
                {!(agForm.tipo || "").startsWith("bloq") && <div className="fr" style={{ gap: 10 }}>
                  <div className="ff" style={{ flex: 1 }}>
                    <label className="fl">Sinal (R$)</label>
                    <input className="fi" type="text" placeholder="0,00"
                      value={(agForm as any).sinal || ""}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, "");
                        const num = raw ? (Number(raw) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
                        setAgForm({ ...agForm, sinal: num } as any);
                      }} />
                  </div>
                  <div className="ff" style={{ flex: 1, justifyContent: "flex-end" }}>
                    <label className="fl">Sinal pago?</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <input type="checkbox" id="sinalPago" checked={!!(agForm as any).sinalPago}
                        onChange={e => setAgForm({ ...agForm, sinalPago: e.target.checked } as any)}
                        style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--gold)" }} />
                      <label htmlFor="sinalPago" style={{ fontSize: 12, color: "var(--tx2)", cursor: "pointer" }}>Já recebido</label>
                    </div>
                  </div>
                </div>}

                {/* 7. SERVIÇO */}
                <div className="ff">
                  <label className="fl">Serviço</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    {servicoOpts.map(svc => {
                      const active = (agForm as any).servico === svc.nome;
                      return (
                        <div key={svc.id} onMouseDown={() => {
                          const artist = artists.find(a => (agForm.tipo || "").includes(a.id))?.id || (artists[0]?.id || "");
                          const nomeLower = svc.nome.toLowerCase();
                          const novoTipo = nomeLower.includes("piercing") ? "piercing" : nomeLower.includes("consulta") ? "cons_" + artist : (nomeLower.includes("sess") ? "sess_" + artist : "sess_" + artist);
                          const novaEtapa = nomeLower.includes("consulta") ? "cons_agendada" : (nomeLower.includes("sess") || nomeLower.includes("piercing")) ? "sessao_agend" : null;
                          setAgForm({ ...agForm, servico: svc.nome, tipo: novoTipo } as any);
                          if (novaEtapa && agClientVinc) {
                            const cli = clients.find(c => c.id === agClientVinc.id);
                            if (cli && cli.etapa !== novaEtapa) executarMove(agClientVinc.id, novaEtapa);
                          }
                        }} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
                          background: active ? svc.cor + "33" : "var(--dk3)",
                          border: "1px solid " + (active ? svc.cor : "var(--br)"),
                          color: active ? svc.cor : "var(--tx2)" }}>
                          {svc.nome}
                        </div>
                      );
                    })}
                    {/* Bloqueio */}
                    <div onMouseDown={() => {
                      const isBloq = (agForm.tipo || "").startsWith("bloq");
                      if (!isBloq) setAgForm({ ...agForm, tipo: "bloq_geral" });
                    }} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
                      background: (agForm.tipo || "").startsWith("bloq") ? "rgba(192,57,43,.15)" : "var(--dk3)",
                      border: "1px solid " + (agForm.tipo || "").startsWith("bloq") ? "var(--q1)" : "var(--br)",
                      color: (agForm.tipo || "").startsWith("bloq") ? "var(--q1)" : "var(--tx2)" }}>
                      🔒 Bloqueio
                    </div>
                  </div>
                  {/* Sub-opções de bloqueio */}
                  {(agForm.tipo || "").startsWith("bloq") && (
                    <>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                        <div onMouseDown={() => setAgForm({ ...agForm, tipo: "bloq_geral" })}
                          style={{ padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontWeight: 700,
                            background: agForm.tipo === "bloq_geral" ? "rgba(192,57,43,.2)" : "var(--dk3)",
                            border: `1px solid ${agForm.tipo === "bloq_geral" ? "var(--q1)" : "var(--br)"}`,
                            color: agForm.tipo === "bloq_geral" ? "var(--q1)" : "var(--tx2)" }}>
                          TODOS
                        </div>
                        {artists.filter(a => a.ativo).map(a => (
                          <div key={a.id} onMouseDown={() => setAgForm({ ...agForm, tipo: "bloq_" + a.id })}
                            style={{ padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontSize: 11, fontWeight: 600,
                              background: agForm.tipo === "bloq_" + a.id ? a.cor + "22" : "var(--dk3)",
                              border: `1px solid ${agForm.tipo === "bloq_" + a.id ? a.cor : "var(--br)"}`,
                              color: agForm.tipo === "bloq_" + a.id ? a.cor : "var(--tx2)" }}>
                            {a.nome.split(" ")[0]}
                          </div>
                        ))}
                      </div>
                      <div className="ff" style={{ marginTop: 8 }}>
                        <label className="fl">Título do Bloqueio *</label>
                        <input className="fi" placeholder="Ex: Viagem, Manutenção, Compromisso pessoal..."
                          value={(agForm as any).bloqTitulo || ""}
                          onChange={e => setAgForm({ ...agForm, bloqTitulo: e.target.value } as any)} />
                      </div>
                    </>
                  )}
                </div>

                {/* 8. PIPELINE DO CLIENTE — oculto para bloqueio */}
                {agClientVinc && !(agForm.tipo || "").startsWith("bloq") && (() => {
                  const cli = clients.find(c => c.id === agClientVinc.id);
                  if (!cli) return null;
                  const stage = stages.find(s => s.id === cli.etapa);
                  return (
                    <div className="ff">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                        onClick={() => setAgPipelineOpen(p => !p)}>
                        <label className="fl" style={{ cursor: "pointer", margin: 0 }}>Pipeline</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: stage?.color || "var(--tx2)", background: (stage?.color || "#888") + "22", border: "1px solid " + (stage?.color || "var(--br)"), borderRadius: 12, padding: "2px 8px", fontWeight: 600 }}>
                            {stage?.emoji} {stage?.label}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--tx3)" }}>{agPipelineOpen ? "▲ ocultar" : "▼ alterar"}</span>
                        </div>
                      </div>
                      {agPipelineOpen && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {stages.filter(s => !["blacklist"].includes(s.id)).map(s => (
                            <div key={s.id}
                              onMouseDown={() => {
                                if (s.id !== cli.etapa) {
                                  const tipoFiltro = s.id === "cons_agendada" ? "cons" : s.id === "sessao_agend" ? "sess" : null;
                                  const evs = agEvents.filter(e => e.cliente_id === cli.id && e.status !== "concluido" && e.status !== "cancelado" && (tipoFiltro ? e.tipo?.startsWith(tipoFiltro) : true));
                                  const needsConfirm = ["cons_agendada","sessao_agend","tatuado"].includes(s.id);
                                  if (needsConfirm) {
                                    setConfirmMover({ cid: cli.id, stage: s, agEvents: evs });
                                  } else {
                                    move(cli.id, s.id);
                                  }
                                }
                              }}
                              style={{ padding: "4px 10px", borderRadius: 20, cursor: s.id === cli.etapa ? "default" : "pointer", fontSize: 11, fontWeight: 600,
                                background: s.id === cli.etapa ? s.color + "33" : "var(--dk3)",
                                border: `1px solid ${s.id === cli.etapa ? s.color : "var(--br)"}`,
                                color: s.id === cli.etapa ? s.color : "var(--tx2)" }}>
                              {s.emoji} {s.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
              {/* Sessões extras */}
              {!editingEvent && agClientVinc && !(agForm.tipo || "").startsWith("bloq") && (
                <div style={{ borderTop: "1px solid var(--br)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {sessoesExtras.map((s, i) => (
                    <div key={i} style={{ background: "var(--dk3)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: ".05em" }}>{i + 2}ª Sessão</span>
                        <button onClick={() => setSessoesExtras(p => p.filter((_,j) => j !== i))}
                          style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
                      </div>
                      <div className="ff">
                        <DateScroller label="Data" value={s.date} onChange={val => setSessoesExtras(p => p.map((x,j) => j===i ? {...x, date: val} : x))} />
                      </div>
                      <div className="fr">
                        <TimeScroller label="Início" value={s.start ?? 9} onChange={(h) => setSessoesExtras(p => p.map((x,j) => j===i ? {...x, start: h} : x))} />
                        <TimeScroller label="Fim" value={s.end ?? 11} onChange={(h) => setSessoesExtras(p => p.map((x,j) => j===i ? {...x, end: h} : x))} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setSessoesExtras(p => [...p, { date: "", start: 9, end: 11 }])}
                    style={{ background: "none", border: "1px dashed var(--br)", borderRadius: 7, padding: "8px 14px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" }}>
                    + Nova Sessão
                  </button>
                </div>
              )}
              <div className="fmf" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {editingEvent && (
                    <button className="btn-c" style={{ color: "var(--q1)", borderColor: "rgba(192,57,43,.3)" }}
                      onClick={() => { setConfirmExcluir(editingEvent); }}>
                      🗑 Excluir
                    </button>
                  )}
                  {editingEvent && editingEvent.status !== "cancelado" && !editingEvent.tipo?.startsWith("bloq") && (
                    <>
                    {(editingEvent.tipo?.startsWith("sess") || editingEvent.tipo === "piercing") && editingEvent.status !== "concluido" && (() => {
                      const dataEv = editingEvent.date ? new Date(editingEvent.date + "T12:00:00") : null;
                      const hoje0 = new Date(); hoje0.setHours(23,59,59,0);
                      const isHojeOuPassado = !dataEv || dataEv <= hoje0;
                      return isHojeOuPassado ? (
                        <button className="btn-c" style={{ color: "#27AE60", borderColor: "rgba(39,174,96,.3)" }}
                          onClick={() => {
                            const ev = editingEvent;
                            const valorPrev = ev.valor_previsto ? Number(ev.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
                            setPagFormas([{ forma: "Pix", valor: valorPrev, parcelas: "1" }]);
                            setConfirmPagamento({ cid: ev.cliente_id, agEvent: ev });
                            setShowAgForm(false);
                            setEditingEvent(null);
                            setAgClientVinc(null);
                          }}>
                          ✅ Cumpriu a Sessão
                        </button>
                      ) : null;
                    })()}
                    <button className="btn-c" style={{ color: "#E67E22", borderColor: "rgba(230,126,34,.3)" }}
                      onClick={() => setConfirmCancelarEvento({ event: editingEvent, motivo: "" })}>
                      ⊘ Cliente Desmarcou
                    </button>
                    <button className="btn-c" style={{ color: "#9B59B6", borderColor: "rgba(155,89,182,.3)" }}
                      onClick={() => setConfirmCancelarEvento({ event: editingEvent, motivo: "", quem: "profissional" } as any)}>
                      ⊘ Profissional Desmarcou
                    </button>
                    </>
                  )}
                  {editingEvent && editingEvent.tipo?.startsWith("bloq") && (
                    <button className="btn-c" style={{ color: "var(--q1)", borderColor: "rgba(192,57,43,.3)" }}
                      onClick={async () => {
                        setAgEvents(p => p.filter(x => x.id !== editingEvent.id));
                        await dbDelete("agenda", editingEvent.id);
                        addLog(`Agenda: bloqueio excluído`);
                        setShowAgForm(false); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch("");
                      }}>
                      🗑 Remover Bloqueio
                    </button>
                  )}
                  {editingEvent && editingEvent.status === "cancelado" && (
                    <span style={{ fontSize: 11, color: "#E67E22", padding: "5px 8px", background: "rgba(230,126,34,.1)", borderRadius: 5, border: "1px solid rgba(230,126,34,.3)" }}>⊘ Cancelado</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 7 }}>
                  <button className="btn-c" onClick={() => { setShowAgForm(false); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); setSessoesExtras([]); }}>Cancelar</button>
                  <button className="btn-s" onClick={() => {
                    if (!agClientVinc && !(agForm.tipo || "").startsWith("bloq")) {
                      setShowAviso("Apenas clientes cadastrados podem ser agendados. Cadastre o cliente primeiro na aba Clientes.");
                      return;
                    }
                    setConfirmAgForm(true);
                  }}>Salvar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CONFIRMAR AGENDAMENTO ── */}
        {confirmAgForm && (
          <div className="ov" onClick={() => setConfirmAgForm(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(420px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                Confirmar Agendamento
              </div>
              <div style={{ background: "var(--dk3)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                {agClientVinc && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--tx3)" }}>Cliente</span>
                    <span style={{ color: "var(--tx)", fontWeight: 600 }}>{agClientVinc.nome}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--tx3)" }}>Data</span>
                  <span style={{ color: "var(--tx)", fontWeight: 600 }}>{agForm.date ? agForm.date.split("-").reverse().join("/") : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--tx3)" }}>Horário</span>
                  <span style={{ color: "var(--tx)", fontWeight: 600 }}>{String(agForm.start).padStart(2,"0")}h — {String(agForm.end).padStart(2,"0")}h</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--tx3)" }}>Tipo</span>
                  <span style={{ color: "var(--tx)", fontWeight: 600 }}>{getEventLabel(agForm.tipo, artists)}</span>
                </div>
                {(agForm as any).sinal && parseFloat(String((agForm as any).sinal).replace(/\./g,"").replace(",",".")) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--tx3)" }}>Sinal</span>
                    <span style={{ color: "#27AE60", fontWeight: 600 }}>R$ {(agForm as any).sinal} {(agForm as any).sinalPago ? "✅ Recebido" : "⏳ Pendente"}</span>
                  </div>
                )}
                {(agForm as any).desc && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "var(--tx3)", flexShrink: 0 }}>Obs.</span>
                    <span style={{ color: "var(--tx2)", textAlign: "right" }}>{(agForm as any).desc}</span>
                  </div>
                )}
                {sessoesExtras.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--br)", paddingTop: 8, marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Sessões extras</span>
                    {sessoesExtras.map((s, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--tx3)" }}>{i + 2}ª Sessão</span>
                        <span style={{ color: "var(--tx)", fontWeight: 600 }}>
                          {s.date ? s.date.split("-").reverse().join("/") : "—"} · {String(s.start).padStart(2,"0")}h — {String(s.end).padStart(2,"0")}h
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn-c" onClick={() => setConfirmAgForm(false)}>Cancelar</button>
                <button className="btn-s" onClick={() => { setConfirmAgForm(false); saveAgEvent(); }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL HISTÓRICO DE ATIVIDADES ── */}
        {showHistoricoModal && (
          <div className="ov" onClick={() => setShowHistoricoModal(false)} style={{ zIndex: 9999 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(560px, 95vw)", maxHeight: "80vh", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: "var(--gold)" }}>📋 Histórico de Atividades</div>
                <button className="mc" onClick={() => setShowHistoricoModal(false)}>✕</button>
              </div>
              <div style={{ fontSize: 11, color: "var(--tx3)" }}>{historico.length} ação{historico.length !== 1 ? "ões" : ""} registrada{historico.length !== 1 ? "s" : ""}</div>
              <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                {historico.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--tx3)", textAlign: "center", padding: "30px 0" }}>Nenhuma ação registrada ainda.</div>
                ) : historico.map((h: any) => (
                  <div key={h.id || h.hora} style={{ display: "flex", gap: 10, padding: "8px 12px", background: "var(--dk3)", borderRadius: 6, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 80 }}>
                      <span style={{ fontSize: 10, color: "var(--tx3)", whiteSpace: "nowrap" }}>{h.data}</span>
                      <span style={{ fontSize: 10, color: "var(--tx3)", whiteSpace: "nowrap" }}>{h.hora}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "var(--tx2)", flex: 1, lineHeight: 1.5 }}>{h.acao}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL LIXEIRA ── */}
        {showLixeiraModal && (
          <div className="ov" onClick={() => setShowLixeiraModal(false)} style={{ zIndex: 9999 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(600px, 95vw)", maxHeight: "80vh", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: "var(--gold)" }}>🗑 Lixeira</div>
                <button className="mc" onClick={() => setShowLixeiraModal(false)}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {(["clientes", "orfaos"] as const).map(tab => (
                  <button key={tab} onClick={() => setLixeiraTab(tab)}
                    style={{ background: lixeiraTab === tab ? "var(--gold-d)" : "var(--dk3)", border: `1px solid ${lixeiraTab === tab ? "var(--gold)" : "var(--br)"}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, color: lixeiraTab === tab ? "var(--gold)" : "var(--tx2)", cursor: "pointer", fontWeight: lixeiraTab === tab ? 600 : 400 }}>
                    {tab === "clientes" ? "Clientes Excluídos" : "Registros Órfãos"}
                  </button>
                ))}
                <button onClick={carregarLixeira} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "var(--tx3)", cursor: "pointer" }}>↻</button>
              </div>
              <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
                {lixeiraLoading && <div style={{ fontSize: 12, color: "var(--tx3)", padding: "20px 0" }}>Carregando...</div>}
                {!lixeiraLoading && lixeiraTab === "clientes" && (
                  lixeiraClientes.length === 0
                    ? <div style={{ fontSize: 12, color: "var(--tx3)", textAlign: "center", padding: "30px 0" }}>Nenhum cliente na lixeira.</div>
                    : lixeiraClientes.map((c: any) => {
                        const excl = new Date(c.excluido_em);
                        const expira = new Date(excl.getTime() + 30 * 24 * 60 * 60 * 1000);
                        const diasRestantes = Math.max(0, Math.ceil((expira.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                        return (
                          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--br)", fontSize: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: "var(--tx)" }}>{c.nome}</div>
                              <div style={{ color: "var(--tx3)" }}>{c.tel}{c.email ? ` · ${c.email}` : ""}</div>
                              <div style={{ color: diasRestantes <= 3 ? "#C0392B" : "var(--tx3)", marginTop: 2 }}>
                                Excluído em {excl.toLocaleDateString("pt-BR")} · restam {diasRestantes} dia{diasRestantes !== 1 ? "s" : ""}
                              </div>
                            </div>
                            <button onClick={async () => { await sb.from("clientes").update({ excluido_em: null }).eq("id", c.id); const { data: restaurado } = await sb.from("clientes").select("*").eq("id", c.id).single(); if (restaurado) setClients((p: any[]) => [restaurado, ...p.filter((x: any) => x.id !== c.id)]); carregarLixeira(); addLog(`Cliente "${c.nome}" restaurado da Lixeira`); }}
                              style={{ background: "rgba(39,174,96,.12)", border: "1px solid rgba(39,174,96,.3)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#27AE60", cursor: "pointer", whiteSpace: "nowrap" }}>
                              Restaurar
                            </button>
                            {lixeiraExcluindoId === c.id ? (
                              <button onClick={() => { setLixeiraExcluindoId(null); setLixeiraExcluindoTimer(0); }}
                                style={{ background: "rgba(192,57,43,.2)", border: "1px solid rgba(192,57,43,.5)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#C0392B", cursor: "pointer", whiteSpace: "nowrap", minWidth: 80 }}>
                                Desfazer ({lixeiraExcluindoTimer}s)
                              </button>
                            ) : (
                              <button onClick={() => {
                                setLixeiraExcluindoId(c.id);
                                let t = 8;
                                setLixeiraExcluindoTimer(t);
                                const iv = setInterval(() => {
                                  t--;
                                  setLixeiraExcluindoTimer(t);
                                  if (t <= 0) {
                                    clearInterval(iv);
                                    deleteClientDefinitivo(c.id).then(() => { carregarLixeira(); addLog(`Cliente "${c.nome}" excluído definitivamente`); });
                                    setLixeiraExcluindoId(null);
                                  }
                                }, 1000);
                              }}
                                style={{ background: "rgba(192,57,43,.12)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#C0392B", cursor: "pointer", whiteSpace: "nowrap" }}>
                                Excluir agora
                              </button>
                            )}
                          </div>
                        );
                      })
                )}
                {!lixeiraLoading && lixeiraTab === "orfaos" && (
                  lixeiraOrfaos.length === 0
                    ? <div style={{ fontSize: 12, color: "var(--tx3)", textAlign: "center", padding: "30px 0" }}>Nenhum registro órfão encontrado.</div>
                    : lixeiraOrfaos.map((r: any) => (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--br)", fontSize: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "var(--tx)" }}>{r.cliente_nome || "—"}</div>
                            <div style={{ color: "var(--tx3)" }}>{r.cliente_tel}{r.cliente_email ? ` · ${r.cliente_email}` : ""}</div>
                            <div style={{ color: "var(--tx3)", marginTop: 2 }}>{r.tipo} · {r.data_solicitada || "sem data"} · status: {r.status}</div>
                          </div>
                          <button onClick={async () => { await sb.from("agendamentos_pendentes").delete().eq("id", r.id); carregarLixeira(); }}
                            style={{ background: "rgba(192,57,43,.12)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "5px 10px", fontSize: 11, color: "#C0392B", cursor: "pointer", whiteSpace: "nowrap" }}>
                            Excluir
                          </button>
                        </div>
                      ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CONFIRMAR CANCELAR EVENTO ── */}
        {confirmCancelarEvento && (
          <div className="ov" onClick={() => setConfirmCancelarEvento(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid rgba(230,126,34,.4)", borderRadius: 12, width: "min(460px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: (confirmCancelarEvento as any).quem === "profissional" ? "#9B59B6" : "#E67E22" }}>{(confirmCancelarEvento as any).quem === "profissional" ? "⊘ Profissional Desmarcou" : "⊘ Cliente Desmarcou"}</div>
              <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.6 }}>
                {(confirmCancelarEvento as any).quem === "profissional" ? "O profissional desmarcou este evento." : "O cliente desmarcou este evento."} O cliente será movido para <strong style={{ color: "#888" }}>Hibernação</strong> e o motivo ficará registrado no histórico.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Motivo do cancelamento *</label>
                <textarea
                  placeholder={(confirmCancelarEvento as any).quem === "profissional" ? "Ex: conflito de agenda, emergência, indisposição..." : "Ex: problema de saúde, questão financeira, mudança de planos..."}
                  value={confirmCancelarEvento.motivo}
                  onChange={e => setConfirmCancelarEvento(p => p ? { ...p, motivo: e.target.value } : p)}
                  style={{ background: "var(--dk3)", border: `1px solid ${!confirmCancelarEvento.motivo ? "rgba(230,126,34,.4)" : "var(--br)"}`, borderRadius: 7, padding: "10px 12px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", resize: "vertical", minHeight: 70, outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setConfirmCancelarEvento(null)}>Voltar</button>
                <button disabled={!confirmCancelarEvento.motivo.trim()}
                  style={{ background: !confirmCancelarEvento.motivo.trim() ? "var(--dk4)" : "rgba(230,126,34,.85)", color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: confirmCancelarEvento.motivo.trim() ? "pointer" : "not-allowed", fontFamily: "'DM Sans',sans-serif" }}
                  onClick={async () => {
                    const { event, motivo } = confirmCancelarEvento;
                    const updated = { ...event, status: "cancelado" };
                    setAgEvents(p => p.map(x => x.id === event.id ? updated : x));
                    await sb.from("agenda").update({ status: "cancelado" }).eq("id", event.id);
                    if (agClientVinc) {
                      setClients(p => p.map(c => c.id !== agClientVinc.id ? c : {
                        ...c,
                        hist: [...c.hist,
                          { t: "⊘ " + ((confirmCancelarEvento as any).quem === "profissional" ? "Profissional desmarcou" : "Cliente desmarcou") + ": " + (event.date || "").split("-").reverse().join("/"), d: new Date().toLocaleDateString("pt-BR") },
                          { t: "Motivo: " + motivo, d: new Date().toLocaleDateString("pt-BR") },
                          { t: (auraName || "Agente") + ": recontato sugerido em 30 dias", d: new Date().toLocaleDateString("pt-BR") },
                        ]
                      }));
                      executarMove(agClientVinc.id, "hibernacao");
                    }
                    const quemDesmarcou = (confirmCancelarEvento as any).quem === "profissional" ? "Profissional desmarcou" : "Cliente desmarcou";
                    addLog(`Agenda: ${quemDesmarcou} — "${event.title}" — ${motivo}`);
                    setConfirmCancelarEvento(null);
                    setShowAgForm(false); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch("");
                  }}>
                  ⊘ Confirmar Cancelamento
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ── MODAL CONFIRMAÇÃO DE PRESENÇA ── */}
        {confirmPresenca && (
          <div className="ov" onClick={() => setConfirmPresenca(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(460px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                📋 {confirmPresenca.event.title}
              </div>
              <div style={{ fontSize: 12, color: "var(--tx2)", background: "var(--dk3)", borderRadius: 7, padding: "8px 12px" }}>
                {confirmPresenca.event.date?.split("-").reverse().join("/")} · {confirmPresenca.event.start}h — {getEventLabel(confirmPresenca.event.tipo, artists)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>Este agendamento foi cumprido?</div>
              {(() => {
                const isConsulta = confirmPresenca.event.tipo?.startsWith("cons");
                const isSessao = confirmPresenca.event.tipo?.startsWith("sess");
                const isPiercing = confirmPresenca.event.tipo === "piercing";
                const evStatus = confirmPresenca.event.status;
                const isHojeOuPassado = (() => {
                  const dataEv = confirmPresenca.event.date ? new Date(confirmPresenca.event.date + "T12:00:00") : null;
                  const hoje0 = new Date(); hoje0.setHours(0,0,0,0);
                  return !dataEv || dataEv <= hoje0;
                })();
                return (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {isConsulta && evStatus !== "concluido" && isHojeOuPassado ? (
                      <button onClick={async () => {
                        const ev = confirmPresenca.event;
                        await sb.from("agenda").update({ status: "concluido" }).eq("id", ev.id);
                        setAgEvents(p => p.map(x => x.id === ev.id ? { ...x, status: "concluido" } : x));
                        const arNomeC = artists.find(a => ev.tipo?.includes(a.id))?.nome || "";
        const histMsg = "✓ Consulta realizada em " + (ev.date||"").split("-").reverse().join("/") + (arNomeC ? " com " + arNomeC : "");
                        setClients(p => p.map(c => c.id !== ev.cliente_id ? c : {
                          ...c, hist: [...(c.hist||[]), { t: histMsg, d: new Date().toLocaleString("pt-BR") }]
                        }));
                        const cliAtual = clients.find(c => c.id === ev.cliente_id);
                        if (cliAtual) {
                          await sb.from("clientes").update({ hist: [...(cliAtual.hist||[]), { t: histMsg, d: new Date().toLocaleString("pt-BR") }] }).eq("id", ev.cliente_id);
                        }
                        const arNome = artists.find(a => ev.tipo?.includes(a.id))?.nome || "";
        addLog("✅ Consulta cumprida: " + ev.title + (ev.date ? " em " + ev.date.split("-").reverse().join("/") : "") + (arNome ? " — " + arNome : ""));
                        setConfirmPresenca(null);
                      }} style={{ flex: 1, background: "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.4)", borderRadius: 7, padding: "10px", fontSize: 13, fontWeight: 700, color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        ✓ Cumpriu Consulta
                      </button>
                    ) : isSessao && evStatus !== "concluido" ? (
                      <button onClick={() => {
                        const ev = confirmPresenca.event;
                        const valorPrev = ev.valor_previsto ? Number(ev.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
                        setPagFormas([{ forma: "Pix", valor: valorPrev, parcelas: "1" }]);
                        setConfirmPagamento({ cid: ev.cliente_id, agEvent: ev });
                        setConfirmPresenca(null); setPresencaMotivo("");
                      }} style={{ flex: 1, background: "rgba(39,174,96,.15)", border: "1px solid rgba(39,174,96,.35)", borderRadius: 7, padding: "10px", fontSize: 13, fontWeight: 700, color: "#27AE60", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        ✓ Cumpriu Sessão
                      </button>
                    ) : isPiercing && isHojeOuPassado && evStatus !== "concluido" ? (
                      <button onClick={() => {
                        const ev = confirmPresenca.event;
                        const valorPrev = ev.valor_previsto ? Number(ev.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
                        setPagFormas([{ forma: "Pix", valor: valorPrev, parcelas: "1" }]);
                        setConfirmPagamento({ cid: ev.cliente_id, agEvent: ev });
                        setConfirmPresenca(null); setPresencaMotivo("");
                      }} style={{ flex: 1, background: "rgba(233,30,140,.15)", border: "1px solid rgba(233,30,140,.35)", borderRadius: 7, padding: "10px", fontSize: 13, fontWeight: 700, color: "#E91E8C", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        ✓ Cumpriu Aplicação
                      </button>
                    ) : (
                      <button onClick={async () => {
                        const ev = confirmPresenca.event;
                        const dataEv = ev.date ? new Date(ev.date + "T12:00:00") : null;
                        const hoje0 = hojeLocal(); hoje0.setHours(23,59,59,0);
                        if (dataEv && dataEv > hoje0) {
                          setShowAviso("Esta sessão ainda não ocorreu. Só é possível confirmar sessões do dia atual ou passadas.");
                          return;
                        }
                        await sb.from("agenda").update({ status: "concluido" }).eq("id", ev.id);
                        setAgEvents(p => p.map(x => x.id === ev.id ? { ...x, status: "concluido" } : x));
                        const cliPres = ev.cliente_id ? clients.find(c => c.id === ev.cliente_id) : null;
                        if (cliPres) {
                          setClients(p => p.map(c => c.id !== cliPres.id ? c : {
                            ...c, hist: [...c.hist, { t: "Presenca confirmada: " + (ev.date || "").split("-").reverse().join("/") + " as " + ev.start + "h", d: new Date().toLocaleString("pt-BR") }]
                          }));
                        }
                        addLog("Agenda: presenca confirmada — " + ev.title);
                        setConfirmPresenca(null);
                      }} style={{ flex: 1, background: "rgba(39,174,96,.15)", border: "1px solid rgba(39,174,96,.3)", borderRadius: 7, padding: "10px", fontSize: 13, fontWeight: 700, color: "#27AE60", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        Sim, compareceu
                      </button>
                    )}
                    <button onClick={() => setPresencaMotivo("abrirMotivos")} style={{ flex: 1, background: "rgba(192,57,43,.12)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 7, padding: "10px", fontSize: 13, fontWeight: 700, color: "var(--q1)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      Nao compareceu
                    </button>
                  </div>
                );
              })()}
              {presencaMotivo === "abrirMotivos" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Motivo da falta</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["Faltou sem aviso", "Compromisso familiar", "Problema de saude", "Questao financeira", "Outro"].map(m => (
                      <button key={m} onClick={() => setPresencaMotivo(m)}
                        style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                          background: presencaMotivo === m ? "rgba(192,57,43,.2)" : "var(--dk3)",
                          border: presencaMotivo === m ? "1px solid var(--q1)" : "1px solid var(--br)",
                          color: presencaMotivo === m ? "var(--q1)" : "var(--tx2)" }}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <button disabled={presencaMotivo === "abrirMotivos"}
                    onClick={async () => {
                      const ev = confirmPresenca.event;
                      await sb.from("agenda").update({ status: "cancelado" }).eq("id", ev.id);
                      setAgEvents(p => p.map(x => x.id === ev.id ? { ...x, status: "cancelado" } : x));
                      const cliPres = ev.cliente_id ? clients.find(c => c.id === ev.cliente_id) : null;
                      if (cliPres) {
                        const novasFaltas = (cliPres.faltas || 0) + 1;
                        const novoEtapa = novasFaltas >= 3 ? "blacklist" : cliPres.etapa;
                        const updated = { ...cliPres, faltas: novasFaltas, etapa: novoEtapa,
                          hist: [...cliPres.hist,
                            { t: "Falta registrada: " + (ev.date || "").split("-").reverse().join("/") + " as " + ev.start + "h", d: new Date().toLocaleString("pt-BR") },
                            { t: "Motivo: " + presencaMotivo, d: new Date().toLocaleString("pt-BR") }
                          ]};
                        setClients(p => p.map(c => c.id !== cliPres.id ? c : updated));
                        setTimeout(() => saveClientDb(updated), 100);
                        const msg = novasFaltas === 1 ? "1a falta registrada — taxa R$100 notificada." : novasFaltas === 2 ? "2a falta — cobrar 30% do orcamento." : "3a falta — cliente movido para Blacklist.";
                        setTimeout(() => setShowAviso(msg), 300);
                      }
                      addLog("Agenda: falta registrada — " + ev.title + " — " + presencaMotivo);
                      setConfirmPresenca(null); setPresencaMotivo("");
                    }}
                    style={{ background: presencaMotivo === "abrirMotivos" ? "var(--dk4)" : "rgba(192,57,43,.8)", color: "#fff", border: "none", borderRadius: 7, padding: "9px", fontSize: 12, fontWeight: 700, cursor: presencaMotivo === "abrirMotivos" ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    Confirmar Falta
                  </button>
                </div>
              )}
              <button className="btn-c" style={{ alignSelf: "flex-start" }} onClick={() => { setConfirmPresenca(null); setPresencaMotivo(""); }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* ── MODAL SELEÇÃO DE SESSÃO ── */}
        {selSessaoModal && (() => {
          const hoje0sel = new Date(); hoje0sel.setHours(0,0,0,0);
          return (
            <div className="ov" onClick={() => { setSelSessaoModal(null); setSessaoEscolhida(null); }}>
              <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(460px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                  📅 Qual sessão foi realizada?
                </div>
                <div style={{ fontSize: 12, color: "var(--tx2)" }}>Selecione a sessão correspondente ao pagamento</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selSessaoModal.sessoes.map(sessao => {
                    const isFutura = new Date(sessao.date + "T12:00:00") > hoje0sel;
                    const isSelected = sessaoEscolhida?.id === sessao.id;
                    return (
                      <div key={sessao.id}
                        onClick={isFutura ? undefined : () => setSessaoEscolhida(sessao)}
                        style={{ background: isSelected ? "rgba(201,168,76,.12)" : "var(--dk3)", border: isSelected ? "1px solid var(--gold)" : "1px solid var(--br)", borderRadius: 8, padding: "12px 14px", cursor: isFutura ? "not-allowed" : "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: isFutura ? 0.4 : 1 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--tx)" }}>{sessao.title}</div>
                          <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
                            {(sessao.date||"").split("-").reverse().join("/")} · {sessao.start}h — {artists.find((a:any) => a.id === sessao.artista)?.nome?.split(" ")[0] || ""}
                          </div>
                        </div>
                        {sessao.valor_previsto > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--q3)" }}>R$ {Number(sessao.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                      </div>
                    );
                  })}
                </div>
                {sessaoEscolhida && (
                  <div style={{ background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--tx2)" }}>
                    <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 4 }}>Sessão selecionada:</div>
                    <div>{sessaoEscolhida.title} — {(sessaoEscolhida.date||"").split("-").reverse().join("/")} às {sessaoEscolhida.start}h</div>
                    {sessaoEscolhida.valor_previsto > 0 && <div style={{ marginTop: 2 }}>Valor previsto: R$ {Number(sessaoEscolhida.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-c" onClick={() => { setSelSessaoModal(null); setSessaoEscolhida(null); }}>Cancelar</button>
                  <button className="btn-s" disabled={sessaoEscolhida === null} style={{ opacity: sessaoEscolhida === null ? 0.4 : 1 }} onClick={() => {
                    if (!sessaoEscolhida) return;
                    const valorPrev = sessaoEscolhida.valor_previsto ? Number(sessaoEscolhida.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
                    setPagFormas([{ forma: "Pix", valor: valorPrev, parcelas: "1" }]);
                    setConfirmPagamento({ cid: selSessaoModal.cid, agEvent: sessaoEscolhida });
                    setSelSessaoModal(null);
                    setSessaoEscolhida(null);
                  }}>Confirmar pagamento</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MODAL FORMA DE PAGAMENTO DO SINAL ── */}
        {sinalPgtoModal && (
          <div className="ov" onClick={() => setSinalPgtoModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(400px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                💳 Forma de pagamento do sinal
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Pix","Dinheiro","Débito","Crédito"].map(f => (
                  <button key={f} onClick={() => setSinalPgtoModal({ ...sinalPgtoModal!, forma: f })}
                    style={{ flex: 1, background: sinalPgtoModal.forma === f ? "var(--gold)" : "var(--dk3)", border: sinalPgtoModal.forma === f ? "1px solid var(--gold)" : "1px solid var(--br)", borderRadius: 7, padding: "9px 12px", fontSize: 13, fontWeight: 600, color: sinalPgtoModal.forma === f ? "#000" : "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    {f}
                  </button>
                ))}
              </div>
              {sinalPgtoModal?.forma === "Crédito" && (
                <div className="ff" style={{ marginTop: 8 }}>
                  <label className="fl">Parcelas</label>
                  <select className="fs" value={sinalPgtoModal.parcelas}
                    onChange={e => setSinalPgtoModal({ ...sinalPgtoModal, parcelas: e.target.value })}>
                    {["1","2","3","4","5","6","7","8","9","10","11","12"].map(p => (
                      <option key={p} value={p}>{p}x</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setSinalPgtoModal(null)}>Cancelar</button>
                <button className="btn-s" onClick={async () => {
                  const formaSinal = sinalPgtoModal.forma;
                  const parcelasSinal = sinalPgtoModal.parcelas;
                  setSinalPgtoModal(null);
                  const row2: any = {
                    titulo: agForm.title,
                    artista: agForm.tipo === "piercing" ? ((agForm as any).artista_exec || "") : (agForm.tipo.replace("cons_","").replace("sess_","").replace("bloq_","") || artists[0]?.id || ""),
                    data: agForm.date,
                    hora: String(agForm.start).padStart(2, "0") + ":00",
                    hora_fim: String(agForm.end).padStart(2, "0") + ":00",
                    tipo: agForm.tipo,
                    obs: (agForm as any).desc || "",
                    valor_previsto: parseFloat(String((agForm as any).valorPrevisto || "0").replace(/\./g, "").replace(",", ".")) || 0,
                    sinal: parseFloat(String((agForm as any).sinal || "0").replace(/\./g, "").replace(",", ".")) || 0,
                    sinal_pago: true,
                    user_id: userId,
                    ...(agClientVinc ? { cliente_id: agClientVinc.id, cliente_nome: agClientVinc.nome } : {})
                  };
                  const { data: dSinal2, error: errSinal2 } = await sb.from("agenda").insert(row2).select().single();
                  if (errSinal2) { setShowAviso(traduzirErro(errSinal2.message)); return; }
                  setAgEvents(p => [...p, { ...dSinal2, title: dSinal2.titulo || agForm.title, date: dSinal2.data || agForm.date, start: parseInt(dSinal2.hora?.split(":")[0] || String(agForm.start)), end: parseInt(dSinal2.hora_fim?.split(":")[0] || String(agForm.end || (agForm.start + 2))), cliente_id: dSinal2.cliente_id, cliente_nome: dSinal2.cliente_nome }]);
                  setShowAgForm(false); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch("");
                  const sinalValNum2 = parseFloat(String((agForm as any).sinal || "").replace(/\./g,"").replace(",",".")) || 0;
                  if (sinalValNum2 > 0 && agClientVinc) {
                    const artSinal2 = agForm.tipo === "piercing" ? ((agForm as any).artista_exec || "") : ((agForm.tipo || "").split("_").slice(1).join("_") || agClientVinc?.artista || "");
                    const pgtoSinal2 = formaSinal === "Crédito" ? "Cartão " + parcelasSinal + "x" : formaSinal;
                    const finRowSinal2 = { cliente_id: agClientVinc.id, cliente_nome: agClientVinc.nome, artista: artSinal2, data: agForm.date, val_a: sinalValNum2, val_c: sinalValNum2, pgto: pgtoSinal2, com_base: 0, com_sess: 0, categoria: "sinal", tipo: "entrada", user_id: userId };
                  const { data: fdSinal2 } = await sb.from("financeiro").insert(finRowSinal2).select().single();
                  if (fdSinal2) setFin(p => [...p, { ...finRowSinal2, id: fdSinal2.id, cliente: agClientVinc.nome }]);
                  }
                  addLog("Agenda: evento com sinal criado — " + agForm.title);
                  // Registrar no histórico do cliente
                  if (agClientVinc) {
                    const histSinalNovo = { t: "Sinal de R$" + sinalValNum2.toLocaleString("pt-BR",{minimumFractionDigits:2}) + " registrado", d: new Date().toLocaleDateString("pt-BR") };
                    setClients(p => p.map(c => c.id === agClientVinc.id ? { ...c, hist: [...(c.hist||[]), histSinalNovo] } : c));
                    await sb.from("clientes").update({ hist: [...((clients.find(cl=>cl.id===agClientVinc.id) as any)?.hist||[]), histSinalNovo] }).eq("id", agClientVinc.id);
                  }
                }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL SESSÕES RECORRENTES ── */}
        {showRecorrenteModal && (
          <div className="ov" onClick={() => setShowRecorrenteModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(460px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>📅 Sessões Recorrentes</div>
              <div style={{ fontSize: 12, color: "var(--tx2)" }}>Configure as sessões e o sistema cria todos os agendamentos de uma vez.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="ff">
                  <DateScroller label="Data da 1ª Sessão" value={recorrenteForm.dataInicio} onChange={val => setRecorrenteForm(p => ({ ...p, dataInicio: val }))} />
                </div>
                <div className="ff"><label className="fl">Profissional</label>
                  <select className="fs" value={recorrenteForm.artista} onChange={e => setRecorrenteForm(p => ({ ...p, artista: e.target.value }))}>
                    {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome.split(" ")[0]}</option>)}
                  </select>
                </div>
                <div className="ff"><label className="fl">Intervalo (dias)</label>
                  <input className="fi" type="number" min={1} value={recorrenteForm.intervalo} onChange={e => setRecorrenteForm(p => ({ ...p, intervalo: Number(e.target.value) }))} />
                </div>
                <div className="ff"><label className="fl">Total de Sessões</label>
                  <input className="fi" type="number" min={1} max={52} value={recorrenteForm.total} onChange={e => setRecorrenteForm(p => ({ ...p, total: Number(e.target.value) }))} />
                </div>
                <div className="ff"><label className="fl">Horário de Início</label>
                  <input className="fi" type="number" min={7} max={22} value={recorrenteForm.hora} onChange={e => setRecorrenteForm(p => ({ ...p, hora: Number(e.target.value) }))} />
                </div>
                <div className="ff"><label className="fl">Duração (horas)</label>
                  <input className="fi" type="number" min={1} max={8} value={recorrenteForm.duracao} onChange={e => setRecorrenteForm(p => ({ ...p, duracao: Number(e.target.value) }))} />
                </div>
              </div>
              <div style={{ background: "var(--dk3)", borderRadius: 7, padding: "10px 13px", fontSize: 12, color: "var(--tx2)" }}>
                Serão criadas <strong style={{ color: "var(--gold)" }}>{recorrenteForm.total} sessões</strong>, a cada <strong style={{ color: "var(--gold)" }}>{recorrenteForm.intervalo} dias</strong>, com <strong style={{ color: "var(--gold)" }}>{recorrenteForm.hora}h–{recorrenteForm.hora + recorrenteForm.duracao}h</strong>.
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setShowRecorrenteModal(null)}>Cancelar</button>
                <button className="btn-s" onClick={async () => {
                  const cli = clients.find(c => c.id === showRecorrenteModal.cid);
                  if (!cli) return;
                  const tipo = "sess_" + recorrenteForm.artista;
                  let dataBase = new Date(recorrenteForm.dataInicio + "T12:00:00");
                  for (let i = 0; i < recorrenteForm.total; i++) {
                    const dateStr = dataBase.toISOString().split("T")[0];
                    const horaStr = String(recorrenteForm.hora).padStart(2,"0") + ":00";
                    const row: any = { titulo: cli.nome, cliente_id: cli.id, cliente_nome: cli.nome, artista: recorrenteForm.artista, data: dateStr, hora: horaStr, hora_fim: String(recorrenteForm.hora + recorrenteForm.duracao).padStart(2,"0") + ":00", tipo };
                    const { data } = await sb.from("agenda").insert(row).select().single();
                    if (data) setAgEvents(p => [...p, { ...data, id: data.id, title: cli.nome, start: recorrenteForm.hora, end: recorrenteForm.hora + recorrenteForm.duracao, date: dateStr, tipo }]);
                    dataBase = new Date(dataBase.getTime() + recorrenteForm.intervalo * 86400000);
                  }
                  executarMove(cli.id, "sessao_agend");
                  addLog(`Agenda: ${recorrenteForm.total} sessões recorrentes criadas para ${cli.nome}`);
                  setShowRecorrenteModal(null);
                }}>Criar {recorrenteForm.total} Sessões</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CANCELAR PROJETO ── */}
        {cancelProjetoModal && (() => {
          const cli = clients.find(c => c.id === cancelProjetoModal.clienteId);
          const proj = (cli?.projetos || []).find((p: any) => p.id === cancelProjetoModal.projetoId);
          const temDados = proj && (proj.estilo || proj.desc || proj.valorTotal > 0);
          const pago = proj ? (proj.pagamentos || []).reduce((s: number, p: any) => s + (Number(p.valor)||0), 0) : 0;
          return (
            <div className="ov" onClick={() => setCancelProjetoModal(null)}>
              <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid rgba(192,57,43,.4)", borderRadius: 12, width: "min(480px, 93vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--q1)" }}>🗑 Cancelar Projeto</div>
                {proj && (
                  <div style={{ background: "var(--dk3)", borderRadius: 7, padding: "10px 13px", fontSize: 12 }}>
                    <div style={{ color: "var(--tx)", fontWeight: 600 }}>{proj.desc || "Sem descrição"}</div>
                    {proj.valorTotal > 0 && <div style={{ color: "var(--tx2)", marginTop: 3 }}>Valor total: R$ {Number(proj.valorTotal).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>}
                    {pago > 0 && <div style={{ color: "#27AE60", marginTop: 2 }}>Valor já pago: R$ {pago.toLocaleString("pt-BR",{minimumFractionDigits:2})} → será registrado como crédito</div>}
                  </div>
                )}
                {temDados && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Motivo do cancelamento *</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {cancelMotivos.map(m => (
                        <button key={m} onClick={() => setCancelProjetoModal(p => p ? { ...p, motivo: m } : p)}
                          style={{ padding: "5px 12px", fontSize: 11, borderRadius: 20, border: `1px solid ${cancelProjetoModal.motivo === m ? "var(--gold)" : "var(--br)"}`, background: cancelProjetoModal.motivo === m ? "rgba(201,168,76,.15)" : "var(--dk3)", color: cancelProjetoModal.motivo === m ? "var(--gold)" : "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                          {m}
                        </button>
                      ))}
                    </div>
                    {cancelProjetoModal.motivo === "Outro" && (
                      <input className="fi" placeholder="Descreva o motivo..." value={cancelProjetoModal.motivo === "Outro" ? "" : cancelProjetoModal.motivo}
                        onChange={e => setCancelProjetoModal(p => p ? { ...p, motivo: e.target.value } : p)}
                        style={{ marginTop: 4 }} />
                    )}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-c" onClick={() => setCancelProjetoModal(null)}>Voltar</button>
                  <button disabled={temDados && !cancelProjetoModal.motivo.trim()}
                    style={{ background: temDados && !cancelProjetoModal.motivo.trim() ? "var(--dk4)" : "rgba(192,57,43,.8)", color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                    onClick={() => {
                      const { clienteId, projetoId, motivo } = cancelProjetoModal;
                      setClients(p => p.map(c => {
                        if (c.id !== clienteId) return c;
                        const projs = (c.projetos || []).filter((p: any) => p.id !== projetoId);
                        const hist = [...c.hist,
                          { t: `Projeto excluído: ${proj?.estilo || "sem estilo"}${motivo ? " — " + motivo : ""}`, d: new Date().toLocaleDateString("pt-BR") },
                          ...(pago > 0 ? [{ t: `Crédito disponível: R$ ${pago.toLocaleString("pt-BR",{minimumFractionDigits:2})} (projeto cancelado)`, d: new Date().toLocaleDateString("pt-BR") }] : [])
                        ];
                        const updated = { ...c, projetos: projs, hist, credito: (c.credito || 0) + pago };
                        setTimeout(() => saveClientDb(updated), 100);
                        return updated;
                      }));
                      setCancelProjetoModal(null);
                    }}>
                    🗑 Confirmar Exclusão
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── AVISO GENÉRICO ── */}
        {/* ── MODAL DATA PASSADA ── */}
        {confirmTrocarProfissional && (
          <div className="ov" style={{ zIndex: 9999 }} onClick={() => setConfirmTrocarProfissional(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(420px, 90vw)", padding: "24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>Trocar Profissional</div>
              <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>
                Existem agendamentos futuros com o profissional anterior.<br/>
                <span style={{ color: "var(--tx2)", fontSize: 12 }}>Deseja atualizar também os agendamentos futuros para o novo profissional?</span>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setConfirmTrocarProfissional(null)}>Não, manter agenda</button>
                <button className="btn-s" onClick={async () => {
                  const { clienteId, novoArtista, antigoArtista } = confirmTrocarProfissional;
                  const hoje = new Date().toISOString().split("T")[0];
                  const eventosFuturos = agEvents.filter(e => e.cliente_id === clienteId && e.date >= hoje && e.status !== "concluido" && e.tipo?.includes(antigoArtista));
                  for (const ev of eventosFuturos) {
                    const novoTipo = ev.tipo.replace(antigoArtista, novoArtista);
                    await sb.from("agenda").update({ tipo: novoTipo }).eq("id", ev.id);
                    setAgEvents(p => p.map(e => e.id === ev.id ? { ...e, tipo: novoTipo } : e));
                  }
                  addLog("Cliente: profissional atualizado em " + eventosFuturos.length + " agendamentos futuros");
                  setConfirmTrocarProfissional(null);
                  setShowAviso("Profissional atualizado em " + eventosFuturos.length + " agendamentos.");
                }}>Sim, atualizar agenda</button>
              </div>
            </div>
          </div>
        )}
        {showAvisoPastDate && (
          <div className="ov" style={{ zIndex: 9999 }} onClick={() => setShowAvisoPastDate(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(420px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>⚠ Atenção</div>
              <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>
                Não é possível agendar para datas ou horários passados.<br />
                <span style={{ fontSize: 12, color: "var(--tx3)", marginTop: 6, display: "block" }}>Se necessário, você pode registrar este agendamento retroativamente. Ele será marcado no histórico.</span>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setShowAvisoPastDate(false)}>Cancelar</button>
                <button className="btn-s" style={{ background: "rgba(201,168,76,.2)", color: "var(--gold)", border: "1px solid rgba(201,168,76,.4)" }}
                  onClick={() => {
                    setShowAvisoPastDate(false);
                    addLog("Agenda: agendamento retroativo registrado — " + agForm.title + " — " + agForm.date);
                    saveAgEvent(true);
                  }}>
                  Agendar mesmo assim
                </button>
              </div>
            </div>
          </div>
        )}

        {leadToast && (() => {
          setTimeout(() => setLeadToast(null), 5000);
          return (
            <div onClick={() => setLeadToast(null)} style={{ position: "fixed", bottom: 24, right: 24, zIndex: 99999, background: "#1a2a1a", border: "1.5px solid #27ae60", borderRadius: 12, padding: "14px 18px", color: "#fff", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 24px #0008", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, animation: "slideInRight .3s ease", maxWidth: 320 }}>
              <span style={{ fontSize: 22 }}>🎯</span>
              <div>
                <div style={{ color: "#2ecc71", fontWeight: 700, fontSize: 13 }}>Novo lead no site!</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{leadToast.replace("🎯 ", "")}</div>
              </div>
            </div>
          );
        })()}

        {showAviso && (
          <div className="ov" style={{ zIndex: 9999 }} onClick={() => setShowAviso(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(400px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14, animation: "slideInRight .25s ease" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: showAviso?.includes("sucesso") || showAviso?.includes("concluído") || showAviso?.includes("confirmada") || showAviso?.includes("registrado") ? "var(--q3)" : "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>
                {showAviso?.includes("sucesso") || showAviso?.includes("concluído") || showAviso?.includes("confirmada") || showAviso?.includes("registrado") ? "✅ Sucesso" : "⚠ Atenção"}
              </div>
              <div style={{ fontSize: 13, color: "var(--tx)", lineHeight: 1.6 }}>{showAviso}</div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn-s" onClick={() => setShowAviso(null)}>Entendido</button>
              </div>
            </div>
          </div>
        )}

        {/* ── SESSÃO REALIZADA — REGISTRAR PAGAMENTO ── */}
        {confirmPagamento && (
          <div className="ov" onClick={() => setConfirmPagamento(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(500px, 94vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                ✅ Sessão Realizada — {clients.find(c => c.id === confirmPagamento.cid)?.nome}
              </div>
              {(() => {
                const cli = clients.find(c => c.id === confirmPagamento.cid);
                const proj = (cli?.projetos || []).find((p: any) => p.status !== "concluido" && p.status !== "cancelado");
                if (!proj?.valorTotal) return null;
                const valorTotal = Number(proj.valorTotal) || 0;
                const pagoAntes = fin.filter((f: any) => f.cliente_id === confirmPagamento.cid && (!f.tipo || f.tipo === "entrada"))
                  .reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
                const pagandoAgora = pagFormas.reduce((s, f) => s + (parseFloat(f.valor.replace(/\./g,"").replace(",",".")) || 0), 0);
                const totalPago = pagoAntes + pagandoAgora;
                const saldo = Math.max(valorTotal - totalPago, 0);
                return (
                  <div style={{ display: "flex", gap: 12, background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, flexWrap: "wrap" }}>
                    <span>💰 Projeto: <strong style={{ color: "var(--tx)" }}>R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
                    <span>Já pago: <strong style={{ color: "#27AE60" }}>R$ {pagoAntes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
                    {pagandoAgora > 0 && <span>Esta sessão: <strong style={{ color: "var(--ab)" }}>R$ {pagandoAgora.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>}
                    {saldo > 0 && <span>Saldo restante: <strong style={{ color: "var(--gold)" }}>R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>}
                    {saldo <= 0 && totalPago > 0 && <span style={{ color: "#27AE60", fontWeight: 700 }}>✅ Quitado</span>}
                  </div>
                );
              })()}
              {confirmPagamento.agEvent && (
                <div style={{ fontSize: 12, color: "var(--tx3)", background: "var(--dk3)", borderRadius: 8, padding: "8px 12px" }}>
                  Sessão: {confirmPagamento.agEvent.date?.split("-").reverse().join("/") || confirmPagamento.agEvent.date} às {confirmPagamento.agEvent.start}h
                  {confirmPagamento.agEvent.valor_previsto > 0 && ` — Previsto: R$${parseFloat(confirmPagamento.agEvent.valor_previsto).toFixed(2)}`}
                </div>
              )}
              {(() => {
                const cliAniv = clients.find(c => c.id === confirmPagamento.cid);
                if (!cliAniv || !isAniversMes((cliAniv as any).nascimento || "")) return null;
                const proj = (cliAniv?.projetos || []).find((p: any) => p.status !== "concluido" && p.status !== "cancelado");
                const valorTotal = Number(proj?.valorTotal) || 0;
                if (valorTotal <= 0) return null;
                const descValor = Math.round(valorTotal * descontoAniversario / 100 * 100) / 100;
                const valorComDesc = valorTotal - descValor;
                return (
                  <div style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600 }}>
                      🎂 Aniversariante do mês — {descontoAniversario}% de desconto disponível
                      <div style={{ fontSize: 11, color: "var(--tx2)", fontWeight: 400, marginTop: 2 }}>
                        De R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} → R$ {valorComDesc.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (−R$ {descValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                      </div>
                    </div>
                    <button onClick={() => {
                      const descStr = valorComDesc.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      setPagFormas([{ forma: "Pix", valor: descStr, parcelas: "1" }]);
                    }} style={{ background: "rgba(201,168,76,.2)", border: "1px solid var(--gold)", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
                      Aplicar desconto
                    </button>
                  </div>
                );
              })()}
              {(() => {
                if (!confirmPagamento) return null;
                const cliPag = clients.find(c => c.id === confirmPagamento.cid);
                const projPag = (cliPag?.projetos || []).find((p: any) => p.status !== "concluido" && p.status !== "cancelado") || (cliPag?.projetos || [])[0];
                const valorTotalPag = Number(projPag?.valorTotal) || 0;
                const totalPagoAntes = fin.filter((f: any) => f.cliente_id === confirmPagamento.cid && (!f.tipo || f.tipo === "entrada")).reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
                const saldoDevPag = Math.max(valorTotalPag - totalPagoAntes, 0);
                if (saldoDevPag <= 0 || valorTotalPag <= 0) return null;
                return (
                  <div style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--gold)", fontWeight: 700 }}>
                    💰 Saldo em aberto: R$ {saldoDevPag.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                );
              })()}
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>Pagamento desta sessão</div>
              {pagFormas.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select value={f.forma} onChange={e => setPagFormas(p => p.map((x,j) => j===i ? {...x, forma: e.target.value} : x))}
                    style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 8px", fontSize: 12, color: "var(--tx)", flex: 1 }}>
                    {["Pix","Dinheiro","Cartão","Transferência","Permuta"].map(o => <option key={o}>{o}</option>)}
                  </select>
                  <input type="text" placeholder="R$ 0,00" value={f.valor}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, "");
                      const num = raw ? (Number(raw) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
                      setPagFormas(p => p.map((x,j) => j===i ? {...x, valor: num} : x));
                    }}
                    style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 8px", fontSize: 12, color: "var(--tx)", width: 90 }} />
                  {f.forma === "Cartão" && (
                    <>
                      <select value={f.parcelas} onChange={e => setPagFormas(p => p.map((x,j) => j===i ? {...x, parcelas: e.target.value} : x))}
                        style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 8px", fontSize: 12, color: "var(--tx)", width: 60 }}>
                        {["1","2","3","4","5","6","7","8","9","10","11","12"].map(n => <option key={n}>{n}x</option>)}
                      </select>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="text" placeholder="Taxa %" value={(f as any).taxa || ""}
                          onChange={e => {
                            const raw = e.target.value.replace(/[^0-9,.]/g, "");
                            setPagFormas(p => p.map((x,j) => j===i ? {...x, taxa: raw} : x));
                          }}
                          style={{ width: 64, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 8px", fontSize: 12, color: "var(--tx)", fontFamily: "inherit" }} />
                        <span style={{ fontSize: 11, color: "var(--tx3)" }}>%</span>
                      </div>
                    </>
                  )}
                  {pagFormas.length > 1 && (
                    <button onClick={() => setPagFormas(p => p.filter((_,j) => j!==i))}
                      style={{ background: "none", border: "none", color: "var(--q1)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>×</button>
                  )}
                </div>
              ))}
              <button onClick={() => setPagFormas(p => [...p, { forma: "Pix", valor: "", parcelas: "1" }])}
                style={{ background: "none", border: "1px dashed var(--br)", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", textAlign: "left" }}>
                + Adicionar forma de pagamento
              </button>
              {(() => {
                const total = pagFormas.reduce((s,f) => s + (parseFloat(f.valor.replace(/\./g,"").replace(",",".")) || 0), 0);
                const prev = confirmPagamento.agEvent?.valor_previsto || 0;
                const diff = total - prev;
                if (prev > 0 && Math.abs(diff) > 0.01) return (
                  <div style={{ fontSize: 12, color: diff < 0 ? "#E67E22" : "#27AE60", background: diff < 0 ? "rgba(230,126,34,.1)" : "rgba(39,174,96,.1)", borderRadius: 6, padding: "6px 10px" }}>
                    {diff < 0 ? `⚠️ Faltam R$${Math.abs(diff).toFixed(2)} para fechar o valor previsto` : `✅ R$${diff.toFixed(2)} acima do previsto`}
                  </div>
                );
                return null;
              })()}
              <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {(() => {
                  const cli = clients.find(c => c.id === confirmPagamento.cid);
                  const proj = (cli?.projetos || []).find((p: any) => p.status !== "concluido" && p.status !== "cancelado");
                  const valorTotal = Number(proj?.valorTotal) || 0;
                  const pagoAntes = fin.filter((f: any) => f.cliente_id === confirmPagamento.cid && (!f.tipo || f.tipo === "entrada")).reduce((s: number, f: any) => s + (Number(f.val_a) || 0), 0);
                  const pagandoAgora = pagFormas.reduce((s, f) => s + (parseFloat(f.valor.replace(/\./g,"").replace(",",".")) || 0), 0);
                  const saldoRestante = Math.max(valorTotal - pagoAntes - pagandoAgora, 0);
                  const temSaldo = valorTotal > 0 && saldoRestante > 0.01;
                  return temSaldo ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>Há saldo restante — o que fazer após esta sessão?</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button title="A tatuagem terá mais sessões. Abre o formulário para agendar a próxima." onClick={() => {
                          const cliLocal = clients.find(c => c.id === confirmPagamento?.cid);
                          const etapaAnterior = cliLocal?.etapa || "sessao_agend";
                          confirmarPagamento();
                          if (undoSessaoTimer) clearTimeout(undoSessaoTimer);
                          const t = setTimeout(() => { setUndoSessao(null); setUndoSessaoTimer(null); }, 8000);
                          setUndoSessaoTimer(t);
                          setUndoSessao({ cid: confirmPagamento?.cid, etapaAnterior, finIds: [] });
                          if (cliLocal) {
                            setTimeout(() => {
                              const artistaId = cliLocal.artista || (artists[0]?.id || "");
                              setEditingEvent(null);
                              setAgClientVinc(cliLocal);
                              setAgClientSearch("");
                              setAgForm({ title: cliLocal.nome, desc: "", tipo: "sess_" + artistaId, date: new Date().toISOString().split("T")[0], start: 9, end: 11, sinal: "", sinalPago: false } as any);
                              setSessoesExtras([]);
                              setShowAgForm(true);
                            }, 600);
                          }
                        }} style={{ flex: 1, background: "rgba(74,158,191,.15)", border: "1px solid rgba(74,158,191,.3)", borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 600, color: "var(--ab)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                          📅 Agendar Nova Sessão
                        </button>
                        <button title="Encerra o projeto mesmo com saldo pendente." onClick={() => {
                          const etapaAnterior = clients.find(c => c.id === confirmPagamento?.cid)?.etapa || "sessao_agend";
                          if (undoSessaoTimer) clearTimeout(undoSessaoTimer);
                          const t = setTimeout(() => { setUndoSessao(null); setUndoSessaoTimer(null); }, 8000);
                          setUndoSessaoTimer(t);
                          setUndoSessao({ cid: confirmPagamento?.cid, etapaAnterior, finIds: [] });
                          confirmarPagamento();
                        }} style={{ flex: 1, background: "rgba(39,174,96,.15)", border: "1px solid rgba(39,174,96,.3)", borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 600, color: "#27AE60", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                          ✅ Finalizar mesmo assim
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#27AE60" }}>✅ Pagamento registrado — pronto para finalizar!</div>
                      <button onClick={() => {
                        const etapaAnterior = clients.find(c => c.id === confirmPagamento?.cid)?.etapa || "sessao_agend";
                        if (undoSessaoTimer) clearTimeout(undoSessaoTimer);
                        const t = setTimeout(() => { setUndoSessao(null); setUndoSessaoTimer(null); }, 8000);
                        setUndoSessaoTimer(t);
                        setUndoSessao({ cid: confirmPagamento?.cid, etapaAnterior, finIds: [] });
                        confirmarPagamento();
                      }} style={{ background: "rgba(39,174,96,.15)", border: "1px solid rgba(39,174,96,.3)", borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 700, color: "#27AE60", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        ✅ Confirmar Pagamento
                      </button>
                    </>
                  );
                })()}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 2 }}>
                <button className="btn-c" onClick={() => setConfirmPagamento(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* ── BARRA UNDO SESSÃO REALIZADA ── */}
        {undoSessao && (
          <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "var(--dk2)", border: "1px solid var(--gold)", borderRadius: 10, padding: "12px 20px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 4px 24px rgba(0,0,0,.5)", minWidth: 320 }}>
            <span style={{ fontSize: 13, color: "var(--tx)", flex: 1 }}>✅ Sessão registrada</span>
            <button onClick={async () => {
              if (undoSessaoTimer) clearTimeout(undoSessaoTimer);
              // Reverter etapa do cliente
              setClients(p => p.map(c => {
                if (c.id !== undoSessao.cid) return c;
                const updated = { ...c, etapa: undoSessao.etapaAnterior };
                setTimeout(() => saveClientDb(updated), 100);
                return updated;
              }));
              // Reverter lançamentos financeiros desta sessão (últimos inseridos para este cliente)
              const ultimosLanc = fin.filter((f: any) => f.cliente_id === undoSessao.cid).slice(-pagFormas.length);
              for (const f of ultimosLanc) {
                await dbDelete("financeiro", f.id);
              }
              setFin(p => {
                const ids = ultimosLanc.map((f: any) => f.id);
                return p.filter((f: any) => !ids.includes(f.id));
              });
              setUndoSessao(null);
              setUndoSessaoTimer(null);
              setShowAviso("Ação desfeita. O cliente voltou para o estágio anterior.");
            }} style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
              Desfazer
            </button>
            <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, borderRadius: "0 0 10px 10px", background: "var(--gold)", animation: "resetBar 8s linear forwards" }} />
          </div>
        )}

        {/* ── CONFIRMAÇÃO MOVER PIPELINE ── */}
        {confirmMover && (
          <div className="ov" onClick={() => setConfirmMover(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(460px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                Mover para {confirmMover.stage.emoji} {confirmMover.stage.label}?
              </div>
              {confirmMover.agEvents.length > 0 ? (
                <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".06em" }}>Agendamentos vinculados</div>
                  {confirmMover.agEvents.map((e: any) => (
                    <div key={e.id} style={{ fontSize: 12, color: "var(--tx)", padding: "6px 0", borderBottom: "1px solid var(--br)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{e.date ? e.date.split("-").reverse().join("/") : "—"}</span>
                        <span style={{ color: "var(--tx2)", marginLeft: 8 }}>{String(e.start).padStart(2,"0")}h — {getEventLabel(e.tipo, artists)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: "rgba(212,130,10,.1)", border: "1px solid rgba(212,130,10,.3)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "#D4820A" }}>
                  ⚠️ Nenhum agendamento encontrado para este cliente.
                </div>
              )}
              {/* Aviso inline quando tenta confirmar sem agendamento correto */}
              {confirmMover._aviso && (
                <div style={{ background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "var(--q1)", fontWeight: 600 }}>
                  ⚠️ {confirmMover._aviso}
                </div>
              )}
              {/* Botão + Agendar */}
              {(confirmMover.agEvents.length === 0 || confirmMover.stage.id === "sessao_agend") && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => {
                    const cli = clients.find(c => c.id === confirmMover.cid);
                    const artId = cli?.artista || artists[0]?.id || "";
                    const tipoDefault = confirmMover.stage.id === "cons_agendada" ? "cons_" + artId : "sess_" + artId;
                    setConfirmMover(null);
                    setEditingEvent(null);
                    setAgClientVinc(cli || null);
                    setAgClientSearch("");
                    setAgForm({ title: cli?.nome || "", desc: "", tipo: tipoDefault, date: "", start: 9, end: 11, sinal: "", sinalPago: false } as any);
                    setShowAgForm(true);
                  }} style={{ flex: 1, background: confirmMover._aviso ? "rgba(201,168,76,.2)" : "var(--dk3)", border: "2px solid var(--gold)", borderRadius: 6, padding: "9px 10px", fontSize: 12, fontWeight: 700, color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", animation: confirmMover._aviso ? "pulse 1s ease-in-out 3" : "none" }}>
                    + Agendar sessões para este procedimento
                  </button>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setConfirmMover(null)}>Cancelar</button>
                <button className="btn-s" onClick={() => {
                  const cid = confirmMover.cid;
                  const stageId = confirmMover.stage.id;
                  const agEvs = confirmMover.agEvents;
                  setConfirmMover(null);
                  move(cid, stageId);
                  if (stageId === "sessao_agend" && agEvs.length === 0) {
                    const cli = clients.find((c: any) => c.id === cid);
                    setTimeout(() => {
                      setEditingEvent(null);
                      setAgClientVinc(cli || null);
                      setAgClientSearch("");
                      setSessoesExtras([]);
                      const artistaId = cli?.artista || artists[0]?.id || "";
                      setAgForm({ title: cli?.nome || "", desc: "", tipo: "sess_" + artistaId, date: new Date().toISOString().split("T")[0], start: 9, end: 11, sinal: "", sinalPago: false } as any);
                      setShowAgForm(true);
                    }, 300);
                  }
                }}>
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL PIPELINE MOTIVO ── */}
        {pipelineMotivo && (() => {
          const stage = pipelineMotivo.stage;
          const isBlacklist = stage?.id === "blacklist";
          const isHibernacao = stage?.id === "hibernacao";
          const isPosVenda = stage?.id === "pos_venda";
          const isListaEspera = stage?.id === "lista_espera";
          const cor = isBlacklist ? "var(--q1)" : isHibernacao ? "#888" : isListaEspera ? "#3498DB" : "var(--gold)";
          const titulo = isPosVenda ? "Observação do Evento" : isBlacklist ? "🚫 Mover para Blacklist" : isHibernacao ? "💤 Hibernar Cliente" : isListaEspera ? "⏳ Lista de Espera" : stage?.label || "";
          return (
            <div className="ov" onClick={() => setPipelineMotivo(null)}>
              <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: `1px solid ${isBlacklist ? "rgba(192,57,43,.4)" : "var(--br)"}`, borderRadius: 12, width: "min(460px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: cor }}>{titulo}</div>
                <div style={{ fontSize: 13, color: "var(--tx2)" }}>
                  {isPosVenda && "Deseja registrar uma observação sobre esta sessão? (opcional)"}
                  {isBlacklist && "Informe o motivo. Este registro ficará salvo no histórico do cliente."}
                  {isHibernacao && ("Informe o motivo e em quantos dias " + (auraName || "a IA") + " deve tentar recontato.")}
                  {isListaEspera && "Informe o motivo para colocar este cliente em espera."}
                </div>
                <textarea
                  placeholder={isPosVenda ? "Ex: cliente satisfeito, retocar daqui 30 dias..." : isBlacklist ? "Motivo obrigatório..." : "Motivo..."}
                  value={pipelineMotivo.motivo}
                  onChange={e => setPipelineMotivo(p => p ? { ...p, motivo: e.target.value } : p)}
                  style={{ background: "var(--dk3)", border: `1px solid ${isBlacklist && !pipelineMotivo.motivo ? "rgba(192,57,43,.5)" : "var(--br)"}`, borderRadius: 7, padding: "10px 12px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", resize: "vertical", minHeight: 80, outline: "none" }}
                />
                {isHibernacao && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--tx2)" }}>{auraName || "IA"} recontata em</span>
                    <input type="number" min={1} value={pipelineMotivo.dias || "30"}
                      onChange={e => setPipelineMotivo(p => p ? { ...p, dias: e.target.value } : p)}
                      style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 9px", fontSize: 12, color: "var(--tx)", width: 70, outline: "none" }} />
                    <span style={{ fontSize: 12, color: "var(--tx2)" }}>dias</span>
                    <span style={{ fontSize: 11, color: "var(--tx3)", fontStyle: "italic" }}>{"(sugestão para " + (auraName || "a IA") + ")"}</span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-c" onClick={() => setPipelineMotivo(null)}>Cancelar</button>
                  <button className="btn-s"
                    disabled={isBlacklist && !pipelineMotivo.motivo.trim()}
                    style={{ background: isBlacklist ? "rgba(192,57,43,.8)" : "var(--gold)", color: isBlacklist ? "#fff" : "#000" }}
                    onClick={() => {
                      const { cid, stage: st, motivo, dias } = pipelineMotivo;
                      const lbl = st?.label || "";
                      // Registrar no histórico
                      if (motivo.trim() || !isPosVenda) {
                        setClients(p => p.map(c => c.id !== cid ? c : {
                          ...c,
                          hist: [...c.hist,
                            ...(motivo.trim() ? [{ t: (isPosVenda ? "Obs. sessão: " : "Motivo: ") + motivo, d: new Date().toLocaleDateString("pt-BR") }] : []),
                            ...(isHibernacao && dias ? [{ t: (auraName || "Agente") + ": recontato em " + dias + " dias", d: new Date().toLocaleDateString("pt-BR") }] : []),
                          ]
                        }));
                      }
                      executarMove(cid, st?.id);
                      setPipelineMotivo(null);
                    }}>
                    {isPosVenda ? "Confirmar" : "Mover"}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MODAL CROP LOGO ── */}
        {showLogoCrop && (
          <div className="ov" onClick={() => setShowLogoCrop(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 14, width: "min(420px, 94vw)", padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>Ajustar Logo</div>
              <div style={{ fontSize: 12, color: "var(--tx2)" }}>Arraste a imagem para centralizar dentro do círculo.</div>
              <div style={{ position: "relative", width: 260, height: 260, margin: "0 auto", overflow: "hidden", borderRadius: 8, cursor: "grab", userSelect: "none", touchAction: "none" }}
                ref={logoCropRef}
                onMouseDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const startX = e.clientX - logoCropPos.x;
                  const startY = e.clientY - logoCropPos.y;
                  const onMove = (ev: MouseEvent) => { ev.preventDefault(); setLogoCropPos({ x: ev.clientX - startX, y: ev.clientY - startY }); };
                  const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
                  document.addEventListener("mousemove", onMove);
                  document.addEventListener("mouseup", onUp);
                }}
                onTouchStart={e => {
                  e.stopPropagation();
                  const t = e.touches[0];
                  const startX = t.clientX - logoCropPos.x;
                  const startY = t.clientY - logoCropPos.y;
                  const onMove = (ev: TouchEvent) => { ev.preventDefault(); const tt = ev.touches[0]; setLogoCropPos({ x: tt.clientX - startX, y: tt.clientY - startY }); };
                  const onUp = () => { document.removeEventListener("touchmove", onMove as any); document.removeEventListener("touchend", onUp); };
                  document.addEventListener("touchmove", onMove as any, { passive: false });
                  document.addEventListener("touchend", onUp);
                }}>
                {/* imagem arrastável */}
                <img src={logoCropSrc} alt="crop"
                  style={{ position: "absolute", top: logoCropPos.y, left: logoCropPos.x, width: 260 * logoCropScale, height: "auto", pointerEvents: "none", draggable: false } as any} />
                {/* overlay escuro fora do círculo */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <svg width="260" height="260" style={{ position: "absolute", inset: 0 }}>
                    <defs>
                      <mask id="circleMask">
                        <rect width="260" height="260" fill="white"/>
                        <circle cx="130" cy="130" r="120" fill="black"/>
                      </mask>
                    </defs>
                    <rect width="260" height="260" fill="rgba(0,0,0,0.72)" mask="url(#circleMask)"/>
                    <circle cx="130" cy="130" r="120" fill="none" stroke="#C9A84C" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              {/* zoom */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "var(--tx3)" }}>Zoom</span>
                <input type="range" min={0.5} max={3} step={0.05} value={logoCropScale}
                  onChange={e => setLogoCropScale(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--gold)" }} />
                <span style={{ fontSize: 11, color: "var(--tx2)", width: 36 }}>{Math.round(logoCropScale * 100)}%</span>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => { setShowLogoCrop(false); setLogoCropSrc(""); }}>Cancelar</button>
                <button className="btn-s" onClick={() => {
                  // Renderizar o recorte em canvas
                  const canvas = document.createElement("canvas");
                  canvas.width = 240; canvas.height = 240;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) return;
                  const img = new Image();
                  img.onload = () => {
                    ctx.beginPath();
                    ctx.arc(120, 120, 120, 0, Math.PI * 2);
                    ctx.clip();
                    const scale = logoCropScale;
                    const iw = 260 * scale;
                    const ih = img.naturalHeight * (iw / img.naturalWidth);
                    const sx = logoCropPos.x * (240 / 260);
                    const sy = logoCropPos.y * (240 / 260);
                    const sw = iw * (240 / 260);
                    const sh = ih * (240 / 260);
                    ctx.drawImage(img, sx, sy, sw, sh);
                    const base64 = canvas.toDataURL("image/png");
                    setStudioLogo(base64);
                    localStorage.setItem("inq_logo", base64);
                    setShowLogoCrop(false);
                    setLogoCropSrc("");
                    setLogoCropPos({ x: 0, y: 0 });
                    setLogoCropScale(1);
                  };
                  img.src = logoCropSrc;
                }}>✓ Confirmar Recorte</button>
              </div>
            </div>
          </div>
        )}

        {/* ── TOUR GUIADO ── */}
        {tourAtivo && (() => {
          const step = TOUR_STEPS[tourStep];
          const el = document.querySelector(step.sel);
          const rect = el?.getBoundingClientRect();
          const isLast = tourStep === TOUR_STEPS.length - 1;
          const top = rect ? rect.bottom + 12 : window.innerHeight / 2;
          const left = rect ? Math.min(Math.max(rect.left, 12), window.innerWidth - 312) : window.innerWidth / 2 - 150;
          return (
            <>
              <div onClick={() => setTourAtivo(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 8000, pointerEvents: "all" }} />
              {rect && (
                <div style={{ position: "fixed", top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8, border: "2px solid var(--gold)", borderRadius: 8, zIndex: 8001, pointerEvents: "none", boxShadow: "0 0 0 4px rgba(201,168,76,.15)" }} />
              )}
              <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top, left, width: 300, background: "var(--dk2)", border: "1px solid var(--gold)", borderRadius: 10, padding: "16px 18px", zIndex: 8002, boxShadow: "0 8px 32px rgba(0,0,0,.7)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>{step.title}</div>
                  <div style={{ fontSize: 10, color: "var(--tx3)" }}>{tourStep + 1}/{TOUR_STEPS.length}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.6, marginBottom: 14 }}>{step.desc}</div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setTourAtivo(false)} style={{ background: "none", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "var(--tx3)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Pular tour</button>
                  {tourStep > 0 && (
                    <button onClick={() => setTourStep(p => p - 1)} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>← Anterior</button>
                  )}
                  <button onClick={() => { if (isLast) { setTourAtivo(false); localStorage.setItem("inq_tour", "1"); } else setTourStep(p => p + 1); }}
                    style={{ background: "var(--gold)", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    {isLast ? "Concluir ✓" : "Próximo →"}
                  </button>
                </div>
              </div>
            </>
          );
        })()}

        {/* ── MODAL RESET DE FÁBRICA ── */}
        {confirmReset && (
          <div className="ov" style={{ zIndex: 99999 }} onClick={() => setConfirmReset(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid rgba(192,57,43,.4)", borderRadius: 12, width: "min(480px, 92vw)", padding: "28px 28px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(192,57,43,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>⚠️</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#C0392B", fontFamily: "'Cormorant Garamond',serif" }}>Apagar Dados Operacionais</div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginTop: 3 }}>Esta ação é irreversível</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.7, background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 8, padding: "14px 16px" }}>
                Serão apagados permanentemente:<br />
                <strong style={{ color: "var(--tx)" }}>• Todos os clientes</strong><br />
                <strong style={{ color: "var(--tx)" }}>• Todos os agendamentos</strong><br />
                <strong style={{ color: "var(--tx)" }}>• Todos os lançamentos financeiros e saídas</strong><br /><br />
                <span style={{ color: "var(--tx3)", fontSize: 12 }}>Profissionais e configurações do estúdio serão mantidos.</span>
              </div>
              {!resetUndo && (
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                  <button className="btn-c" onClick={() => setConfirmReset(false)}>Cancelar</button>
                  <button style={{ background: "#C0392B", border: "none", borderRadius: 7, padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                    onClick={() => {
                      setResetUndo(true);
                      let count = 8;
                      const t = setInterval(async () => {
                        count--;
                        if (count <= 0) {
                          clearInterval(t);
                          await sb.from("saidas").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                          await sb.from("financeiro").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                          await sb.from("agenda").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                          await sb.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                          await sb.from("artistas").delete().eq("user_id", userId);
                          await sb.from("historico").delete().neq("id", "00000000-0000-0000-0000-000000000000");
                          setClients([]); setAgEvents([]); setFin([]); setSaidas([]); setArtists([]); setHistorico([]);
                          setResetUndo(false); setConfirmReset(false); setShowSettings(false);
                          setShowAviso("Reset concluído. Sistema limpo e pronto para uso real. 🖤");
                        }
                      }, 1000);
                      setResetTimer(t);
                    }}>
                    Sim, estou ciente
                  </button>
                </div>
              )}
              {resetUndo && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontSize: 13, color: "var(--tx2)", textAlign: "center" }}>Apagando em <strong style={{ color: "#C0392B" }}>8 segundos</strong>...</div>
                  <div style={{ height: 6, background: "var(--dk3)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: 6, background: "#C0392B", borderRadius: 3, animation: "resetBar 8s linear forwards" }} />
                  </div>
                  <button onClick={() => { clearInterval(resetTimer); setResetUndo(false); setConfirmReset(false); }}
                    style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "10px 0", fontSize: 13, fontWeight: 700, color: "var(--tx)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    ↩ Cancelar — Desfazer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL ORÇAMENTO ── */}
        {/* ── MODAL GERENCIAR ESTILO / REGIÃO ── */}


        {orcamentoModal && (
          <div className="ov" onClick={() => setOrcamentoModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(400px, 92vw)", padding: "28px 28px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(201,168,76,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>💰</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)" }}>Registrar Orçamento</div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginTop: 3 }}>Informe o valor combinado com o cliente</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--tx3)" }}>Valor (R$)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--tx3)", fontWeight: 600 }}>R$</span>
                  <input className="fi" placeholder="0,00" value={orcamentoModal.valor}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, "");
                      const num = raw ? (Number(raw) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
                      setOrcamentoModal(p => p ? { ...p, valor: num } : null);
                    }}
                    autoFocus style={{ fontSize: 18, fontWeight: 600, textAlign: "right", letterSpacing: ".05em", paddingLeft: 36 }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setOrcamentoModal(null)}>Cancelar</button>
                <button className="btn-s" onClick={async () => {
                  const v = Number(orcamentoModal.valor.replace(/\./g,"").replace(",","."));
                  if (v > 0) {
                    const cliente = clients.find(c => c.id === orcamentoModal.cid);
                    const artista = cliente?.artista || artists[0]?.id || "";
                    const artObj = artists.find(a => a.id === artista);
                    const comPct = artObj?.com || 60;
                    // Atualiza val_a e valorTotal dentro do projeto ativo
                    setClients(p => {
                      const updated = p.map(c => {
                        if (c.id !== orcamentoModal.cid) return c;
                        const projetos = (c.projetos || []).map((proj: any) =>
                          (proj.status !== "concluido" && proj.status !== "cancelado" && Number(String(proj.valorTotal || "0").replace(/\./g,"").replace(",",".")) <= 0)
                            ? { ...proj, valorTotal: v }
                            : proj
                        );
                        const pgtoAtual = c.pgto && c.pgto !== "" ? c.pgto : "A definir";
                        return { ...c, val_a: v, orcamento: false, projetos, pgto: pgtoAtual,
                          hist: [...c.hist, { t: "Orçamento registrado: R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), d: new Date().toLocaleString("pt-BR") }]
                        };
                      });
                      const c = updated.find(c => c.id === orcamentoModal.cid);
                      if (c) setTimeout(() => saveClientDb(c), 100);
                      return updated;
                    });
                    // Lança no financeiro como orçamento registrado
                    const finRow = {
                      cliente_id: orcamentoModal.cid,
                      cliente_nome: cliente?.nome || "",
                      artista_id: artista,
                      artista: artista,
                      tipo: "entrada",
                      categoria: "sessao",
                      val_a: v,
                      val_c: v,
                      pgto: "A definir",
                      com_base: comPct,
                      com_sess: comPct,
                      data: new Date().toLocaleDateString("pt-BR"),
                      status: "pendente",
                      user_id: userId
                    };
                    const { data: fd } = await sb.from("financeiro").insert(finRow).select().single();
                    if (fd) setFin(p => [...p, { ...finRow, id: fd.id, cliente: cliente?.nome }]);
                    setOrcamentoModal(null);
                  }
                }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRMAÇÃO EXCLUSÃO CLIENTE ── */}
        {confirmExcluirCliente && (
          <div className="ov" onClick={() => setConfirmExcluirCliente(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid rgba(192,57,43,.4)", borderRadius: 12, width: "min(440px, 92vw)", padding: "28px 28px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(192,57,43,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🗑</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)" }}>Excluir cliente?</div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginTop: 3 }}>{confirmExcluirCliente.nome}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--tx3)", background: "var(--dk3)", borderRadius: 7, padding: "10px 14px", lineHeight: 1.6 }}>
                ⚠️ Todos os dados deste cliente serão removidos permanentemente.<br/>
                <strong style={{ color: "var(--q1)" }}>Esta ação não pode ser desfeita.</strong>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setConfirmExcluirCliente(null)}>Cancelar</button>
                <button style={{ background: "rgba(192,57,43,.8)", border: "1px solid rgba(192,57,43,.5)", borderRadius: 7, padding: "7px 20px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}
                  onClick={() => deleteClient(confirmExcluirCliente.id)}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRMAÇÃO REMOVER ARTISTA ── */}
        {confirmRemoverArtista && (
          <div className="ov" onClick={() => setConfirmRemoverArtista(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid rgba(192,57,43,.4)", borderRadius: 12, width: "min(440px, 92vw)", padding: "28px 28px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(192,57,43,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎨</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)" }}>Remover profissional?</div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginTop: 3 }}>{confirmRemoverArtista.nome}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--tx3)", background: "var(--dk3)", borderRadius: 7, padding: "10px 14px", lineHeight: 1.6 }}>
                ⚠️ Os clientes vinculados a este artista <strong style={{color:"var(--tx)"}}>não serão excluídos</strong>, mas ficarão sem artista atribuído.<br/>
                Esta ação <strong style={{color:"var(--q1)"}}>não pode ser desfeita</strong>.
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setConfirmRemoverArtista(null)}>Cancelar</button>
                <button style={{ background: "rgba(192,57,43,.8)", border: "1px solid rgba(192,57,43,.5)", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}
                  onClick={async () => {
                    setArtists(p => p.filter(x => x.id !== confirmRemoverArtista.id));
                    await dbDelete("artistas", confirmRemoverArtista.id);
                    addLog(`Profissional "${confirmRemoverArtista.nome}" removido`);
                    setConfirmRemoverArtista(null);
                  }}>
                  Remover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRMAÇÃO EXCLUSÃO EVENTO ── */}
        {confirmExcluir && (
          <div className="ov" onClick={() => setConfirmExcluir(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid rgba(192,57,43,.4)", borderRadius: 12, width: "min(420px, 92vw)", padding: "28px 28px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(192,57,43,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🗑</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)" }}>Excluir evento?</div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginTop: 3 }}>"{confirmExcluir.title}" — {confirmExcluir.date} às {confirmExcluir.start}h</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--tx3)", background: "var(--dk3)", borderRadius: 7, padding: "10px 14px" }}>
                Você poderá desfazer esta ação por <strong style={{color:"var(--gold)"}}>8 segundos</strong> após confirmar.
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setConfirmExcluir(null)}>Cancelar</button>
                <button style={{ background: "rgba(192,57,43,.8)", border: "1px solid rgba(192,57,43,.5)", borderRadius: 7, padding: "7px 18px", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}
                  onClick={() => excluirEvento(confirmExcluir, confirmExcluir.id === editingEvent?.id)}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BARRA DESFAZER ── */}
        {undoEvento && (
          <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 30, padding: "10px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 4px 24px rgba(0,0,0,.6)", fontSize: 13 }}>
            <span style={{ color: "var(--tx2)" }}>Evento "<strong style={{color:"var(--tx)"}}>{undoEvento.title}</strong>" excluído</span>
            <button onClick={desfazerExclusao} style={{ background: "var(--gold)", border: "none", borderRadius: 20, padding: "5px 16px", fontSize: 12, fontWeight: 700, color: "#1a1a1a", cursor: "pointer" }}>
              ↩ Desfazer
            </button>
          </div>
        )}

        {/* ── HISTÓRICO ── */}
        {showHistorico && (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) setShowHistorico(false); }}>
            <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(620px, 95vw)", maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--br)", background: "var(--dk3)" }}>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--tx)" }}>📋 Histórico de Ações</div>
                  <div style={{ fontSize: 10, color: "var(--tx3)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 2 }}>{historico.length} registros</div>
                </div>
                <button className="mc" onClick={() => setShowHistorico(false)}>✕</button>
              </div>
              <div style={{ overflowY: "auto", padding: "12px 16px", flex: 1 }}>
                {historico.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--tx3)", fontSize: 13, padding: "40px 0", fontStyle: "italic" }}>Nenhuma ação registrada ainda.</div>
                )}
                {(() => {
                  // Agrupa por data
                  const grupos: Record<string, typeof historico> = {};
                  historico.forEach(h => {
                    if (!grupos[h.data]) grupos[h.data] = [];
                    grupos[h.data].push(h);
                  });
                  return Object.entries(grupos).map(([data, itens]) => (
                    <div key={data} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid var(--br)" }}>
                        📅 {data}
                      </div>
                      {itens.map((h, i) => (
                        <div key={h.id || i} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                          <span style={{ fontSize: 11, color: "var(--tx3)", minWidth: 42, fontVariantNumeric: "tabular-nums" }}>{h.hora}</span>
                          <span style={{ fontSize: 12, color: "var(--tx)", lineHeight: 1.5 }}>{h.acao}</span>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── LICENÇAS (dono do sistema) ── */}
        {tab === "licencas" && authEmail === OWNER_EMAIL && (() => {
          const carregarInfra = async () => {
            setInfraLoading(true);
            const stats: any = {};
            // Supabase — contagem de linhas + disparos do mês por canal
            try {
              const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
              const { count: cClientes } = await sb.from("clientes").select("id", { count: "exact", head: true });
              const { count: cLicencas } = await sb.from("licencas").select("id", { count: "exact", head: true });
              const { count: cConfigs } = await sb.from("configuracoes").select("id", { count: "exact", head: true });
              const { count: cHistorico } = await sb.from("historico").select("id", { count: "exact", head: true });
              const { data: disparosMes } = await sb.from("historico").select("acao, created_at").gte("created_at", primeiroDiaMes).ilike("acao", "Disparo em massa%");
              const emailsMes = (disparosMes || []).filter((d: any) => d.acao?.includes("[EMAIL]")).length;
              const smsMes = (disparosMes || []).filter((d: any) => d.acao?.includes("[SMS]")).length;
              const waMes = (disparosMes || []).filter((d: any) => d.acao?.includes("[WHATSAPP]")).length;
              stats.supabase = { clientes: cClientes ?? 0, licencas: cLicencas ?? 0, configuracoes: cConfigs ?? 0, historico: cHistorico ?? 0, total: (cClientes ?? 0) + (cLicencas ?? 0) + (cConfigs ?? 0) + (cHistorico ?? 0), emailsMes, smsMes, waMes };
            } catch { stats.supabase = { erro: true }; }
            // Resend — CORS bloqueia chamada direta; mostrar chave configurada apenas
            stats.resend = resendApiKey ? { dashboard: true } : { semChave: true };
            // Vercel — deploys do mês com paginação (until = createdAt do último item)
            if (vercelToken) {
              try {
                const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
                let total = 0;
                let until: number | null = null;
                let continua = true;
                let paginas = 0;
                while (continua && paginas < 20) {
                  const url = `https://api.vercel.com/v6/deployments?limit=100${until ? "&until=" + until : ""}`;
                  const r = await fetch(url, { headers: { Authorization: "Bearer " + vercelToken } });
                  if (!r.ok) { continua = false; break; }
                  const d = await r.json();
                  const deploys: any[] = Array.isArray(d.deployments) ? d.deployments : [];
                  if (deploys.length === 0) break;
                  for (const dep of deploys) {
                    const ts = Number(dep.createdAt);
                    if (ts < primeiroDiaMes) { continua = false; break; }
                    total++;
                  }
                  if (continua) {
                    const ultimo = deploys[deploys.length - 1];
                    until = Number(ultimo.createdAt) - 1;
                    if (deploys.length < 100) continua = false;
                  }
                  paginas++;
                }
                stats.vercel = { mes: total, keyOk: true };
              } catch { stats.vercel = { keyOk: false }; }
            } else { stats.vercel = { semChave: true }; }
            // GitHub — Actions runs do mês
            if (githubToken && githubRepo) {
              try {
                const agora = new Date();
                const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split("T")[0];
                const r = await fetch(`https://api.github.com/repos/${githubRepo}/actions/runs?per_page=100&created=%3E%3D${primeiroDiaMes}`, { headers: { Authorization: "Bearer " + githubToken, Accept: "application/vnd.github+json" } });
                if (r.ok) {
                  const d = await r.json();
                  stats.github = { mes: d.total_count ?? 0, keyOk: true };
                } else { stats.github = { keyOk: false }; }
              } catch { stats.github = { keyOk: false }; }
            } else { stats.github = { semChave: true }; }
            setInfraStats(stats);
            setInfraLoading(false);
          };

          const C_CARD = { background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, padding: "16px 18px", minWidth: 200, flex: "1 1 200px" };
          const C_LABEL = { fontSize: 10, fontWeight: 700, color: "var(--tx3)", textTransform: "uppercase" as const, letterSpacing: ".07em", marginBottom: 4 };
          const C_VAL = { fontSize: 26, fontWeight: 700, color: "var(--tx)", fontFamily: "'Cormorant Garamond',serif" };
          const C_SUB = { fontSize: 11, color: "var(--tx3)", marginTop: 3 };
          const C_BADGE_OK = { fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(39,174,96,.15)", color: "#27AE60", border: "1px solid rgba(39,174,96,.3)", display: "inline-block" };
          const C_BADGE_ERR = { fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(192,57,43,.15)", color: "#C0392B", border: "1px solid rgba(192,57,43,.3)", display: "inline-block" };
          const C_BADGE_WARN = { fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(230,126,34,.15)", color: "#E67E22", border: "1px solid rgba(230,126,34,.3)", display: "inline-block" };

          return (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
            {/* cabeçalho */}
            <div style={{ padding: "20px 20px 0" }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: "var(--tx)", marginBottom: 4 }}>INK SYSTEM — Painel do Dono</div>
              <div style={{ fontSize: 12, color: "var(--tx3)", marginBottom: 16 }}>Infraestrutura, chaves de acesso e licenças dos estúdios.</div>
              {/* sub-abas */}
              <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--br)", marginBottom: 20 }}>
                {([["monitoramento","Monitoramento"],["chaves","Chaves de Acesso"],["licencas","Licenças"]] as const).map(([id, label]) => (
                  <div key={id} onClick={() => setLicencasSubTab(id)} style={{ padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: licencasSubTab === id ? "var(--gold)" : "var(--tx3)", borderBottom: licencasSubTab === id ? "2px solid var(--gold)" : "2px solid transparent", letterSpacing: ".03em" }}>{label}</div>
                ))}
              </div>
            </div>

            <div style={{ padding: "0 20px 20px", flex: 1 }}>

              {/* ── MONITORAMENTO ── */}
              {licencasSubTab === "monitoramento" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>Uso da Infraestrutura{infraStats ? " — atualizado às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                    <button onClick={carregarInfra} disabled={infraLoading} style={{ fontSize: 11, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 12px", color: "var(--tx2)", cursor: infraLoading ? "wait" : "pointer" }}>{infraLoading ? "Carregando..." : "Atualizar"}</button>
                  </div>
                  {!infraStats && !infraLoading && (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--tx3)", fontSize: 13 }}>
                      Clique em <strong>Atualizar</strong> para carregar os dados de uso.
                    </div>
                  )}
                  {infraStats && (() => {
                    const C_ROW = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid var(--br)" };
                    const C_RK = { fontSize: 11, color: "var(--tx3)" };
                    const C_RV = { fontSize: 12, fontWeight: 700, color: "var(--tx)" };
                    const Barra = ({ v, max, warn }: { v: number; max: number; warn?: number }) => {
                      const pct = Math.min((v / max) * 100, 100);
                      const cor = warn && v >= warn ? "#C0392B" : v >= max * 0.7 ? "#E67E22" : "#27AE60";
                      return (<div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: "var(--tx3)" }}>{v.toLocaleString("pt-BR")} / {max.toLocaleString("pt-BR")}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: cor }}>{pct.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 6, background: "var(--dk4)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: pct + "%", background: cor, borderRadius: 4, transition: "width .4s" }} />
                        </div>
                      </div>);
                    };
                    return (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                      {/* Supabase */}
                      <div style={{ ...C_CARD, minWidth: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <svg width="22" height="22" viewBox="0 0 109 113" fill="none" style={{ flexShrink: 0 }}><path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284z" fill="url(#supaA)"/><path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284z" fill="url(#supaB)" fillOpacity=".2"/><path d="M45.317 2.071c2.86-3.601 8.657-1.628 8.726 2.97l.442 67.251H9.83c-8.19 0-12.759-9.46-7.665-15.875L45.317 2.071z" fill="#3ECF8E"/><defs><linearGradient id="supaA" x1="53.974" y1="54.974" x2="94.163" y2="71.829" gradientUnits="userSpaceOnUse"><stop stopColor="#249361"/><stop offset="1" stopColor="#3ECF8E"/></linearGradient><linearGradient id="supaB" x1="36.156" y1="30.578" x2="54.484" y2="65.081" gradientUnits="userSpaceOnUse"><stop/><stop offset="1" stopOpacity="0"/></linearGradient></defs></svg>
                          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>Supabase</div><div style={{ fontSize: 10, color: "var(--tx3)" }}>Free Plan · 500 MB</div></div>
                          <span style={C_BADGE_OK}>LIVE</span>
                        </div>
                        <div style={C_ROW}><span style={C_RK}>Clientes</span><span style={C_RV}>{infraStats.supabase?.clientes ?? "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Licenças</span><span style={C_RV}>{infraStats.supabase?.licencas ?? "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Histórico de ações</span><span style={C_RV}>{infraStats.supabase?.historico ?? "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Total de linhas</span><span style={C_RV}>{infraStats.supabase?.total ?? "—"}</span></div>
                        <Barra v={infraStats.supabase?.total ?? 0} max={50000} />
                        <div style={{ ...C_SUB, marginTop: 6 }}>~{((infraStats.supabase?.total ?? 0) * 2).toFixed(0)} KB estimado / 500 MB</div>
                      </div>
                      {/* Vercel */}
                      <div style={{ ...C_CARD, minWidth: 240 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <svg width="22" height="22" viewBox="0 0 76 65" fill="currentColor" style={{ color: "var(--tx)", flexShrink: 0 }}><path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/></svg>
                          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>Vercel</div><div style={{ fontSize: 10, color: "var(--tx3)" }}>Hobby Plan</div></div>
                          {infraStats.vercel?.keyOk ? <span style={C_BADGE_OK}>LIVE</span> : infraStats.vercel?.semChave ? <span style={C_BADGE_WARN}>SEM CHAVE</span> : <span style={C_BADGE_ERR}>ERRO</span>}
                        </div>
                        {infraStats.vercel?.keyOk ? <>
                          <div style={C_ROW}><span style={C_RK}>Deploys este mês</span><span style={{ ...C_RV, color: "#27AE60" }}>{infraStats.vercel.mes}</span></div>
                          <div style={C_ROW}><span style={C_RK}>Limite de deploys</span><span style={{ ...C_RV, color: "#27AE60" }}>Sem limite</span></div>
                          <div style={C_ROW}><span style={C_RK}>Cobrança por deploy</span><span style={{ ...C_RV, color: "#27AE60" }}>Gratuito</span></div>
                          <div style={{ ...C_SUB, marginTop: 10 }}>Limites reais: 100 GB bandwidth · 12 serverless functions</div>
                        </> : <div style={C_SUB}>Configure o Vercel Token em Chaves de Acesso</div>}
                      </div>
                      {/* Resend */}
                      <div style={{ ...C_CARD, minWidth: 240 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <svg width="22" height="22" viewBox="0 0 60 60" fill="none" style={{ flexShrink: 0 }}><circle cx="30" cy="30" r="30" fill="#000"/><path d="M18 20h24l-12 12L18 20z" fill="#fff"/><path d="M18 20v20h24V20" stroke="#fff" strokeWidth="2" fill="none"/></svg>
                          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>Resend</div><div style={{ fontSize: 10, color: "var(--tx3)" }}>Free Plan · {Number(resendLimite || 3000).toLocaleString("pt-BR")}/mês</div></div>
                          {resendApiKey ? <span style={C_BADGE_OK}>CONFIG</span> : <span style={C_BADGE_WARN}>SEM CHAVE</span>}
                        </div>
                        <div style={C_ROW}><span style={C_RK}>Emails enviados (mês)</span><span style={C_RV}>{infraStats.supabase?.emailsMes ?? "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Limite mensal</span><span style={C_RV}>{Number(resendLimite || 3000).toLocaleString("pt-BR")}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Taxa de bounce</span><span style={{ ...C_RV, color: Number(resendBounce) > 5 ? "#C0392B" : "#27AE60" }}>{resendBounce ? resendBounce + "%" : "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Restam</span><span style={C_RV}>{resendLimite ? (Number(resendLimite) - (infraStats.supabase?.emailsMes ?? 0)).toLocaleString("pt-BR") : "—"}</span></div>
                        {resendLimite && <Barra v={infraStats.supabase?.emailsMes ?? 0} max={Number(resendLimite)} warn={Number(resendLimite) * 0.85} />}
                      </div>
                      {/* GitHub */}
                      <div style={{ ...C_CARD, minWidth: 240 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <svg width="22" height="22" viewBox="0 0 98 96" fill="currentColor" style={{ color: "var(--tx)", flexShrink: 0 }}><path fillRule="evenodd" clipRule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"/></svg>
                          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>GitHub</div><div style={{ fontSize: 10, color: "var(--tx3)" }}>Free Plan · 2.000 min/mês</div></div>
                          {infraStats.github?.keyOk ? <span style={C_BADGE_OK}>LIVE</span> : infraStats.github?.semChave ? <span style={C_BADGE_WARN}>SEM CHAVE</span> : <span style={C_BADGE_ERR}>ERRO</span>}
                        </div>
                        {infraStats.github?.keyOk ? <>
                          <div style={C_ROW}><span style={C_RK}>Runs este mês</span><span style={C_RV}>{infraStats.github.mes}</span></div>
                          <div style={C_ROW}><span style={C_RK}>Minutos estimados</span><span style={C_RV}>~{infraStats.github.mes * 2} min</span></div>
                          <div style={C_ROW}><span style={C_RK}>Limite mensal</span><span style={C_RV}>2.000 min</span></div>
                          <div style={C_ROW}><span style={C_RK}>Restam</span><span style={{ ...C_RV, color: (2000 - infraStats.github.mes * 2) < 400 ? "#C0392B" : "#27AE60" }}>~{2000 - infraStats.github.mes * 2} min</span></div>
                          <Barra v={infraStats.github.mes * 2} max={2000} warn={1600} />
                        </> : <div style={C_SUB}>Configure GitHub Token em Chaves de Acesso</div>}
                      </div>
                      {/* Anthropic */}
                      <div style={{ ...C_CARD, minWidth: 240 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#D97757", flexShrink: 0 }}><path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-3.654 0H6.57L0 20h3.603l1.498-3.818h6.366l1.498 3.818h3.603L10.173 3.52zm-3.27 9.796 2.096-5.338 2.096 5.338H6.903z"/></svg>
                          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>Anthropic</div><div style={{ fontSize: 10, color: "var(--tx3)" }}>Pay as you go</div></div>
                          {auraApiKey ? <span style={C_BADGE_OK}>CONFIG</span> : <span style={C_BADGE_WARN}>SEM CHAVE</span>}
                        </div>
                        <div style={C_ROW}><span style={C_RK}>Saldo restante</span><span style={{ ...C_RV, color: Number(anthropicSaldo) < 3 ? "#C0392B" : Number(anthropicSaldo) < 5 ? "#E67E22" : "#27AE60" }}>{anthropicSaldo ? "US$ " + anthropicSaldo : "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Gasto este mês</span><span style={C_RV}>{anthropicGasto ? "US$ " + anthropicGasto : "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Limite mensal</span><span style={C_RV}>{anthropicLimite ? "US$ " + anthropicLimite : "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Renovação</span><span style={C_RV}>1 jul 2026</span></div>
                        {anthropicSaldo && anthropicGasto && (() => { const g = Number(anthropicGasto.replace(",",".")); const s = Number(anthropicSaldo.replace(",",".")); return <Barra v={g} max={g + s} />; })()}
                        <div style={{ ...C_SUB, marginTop: 6 }}>Atualize manualmente em Chaves de Acesso após consultar console.anthropic.com/billing</div>
                      </div>
                      {/* Zenvia */}
                      <div style={{ ...C_CARD, minWidth: 240 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                          <svg width="22" height="22" viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}><rect width="40" height="40" rx="8" fill="#00B4D8"/><path d="M8 14h24M8 20h16M8 26h20" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg>
                          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx)" }}>Zenvia</div><div style={{ fontSize: 10, color: "var(--tx3)" }}>Plano Starter</div></div>
                          {zenviaApiKey ? <span style={C_BADGE_OK}>CONFIG</span> : <span style={C_BADGE_WARN}>SEM CHAVE</span>}
                        </div>
                        <div style={C_ROW}><span style={C_RK}>Gasto do período</span><span style={{ ...C_RV, color: "var(--tx)" }}>{zenviaGasto ? "R$ " + zenviaGasto : "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>Limite do plano</span><span style={C_RV}>{zenviaLimite ? "R$ " + zenviaLimite : "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>InteractionZ usadas</span><span style={C_RV}>{zenviaInteractions || "—"} / {zenviaInteractionsLimite || "—"}</span></div>
                        <div style={C_ROW}><span style={C_RK}>SMS/WA enviados (mês)</span><span style={C_RV}>{(infraStats.supabase?.smsMes ?? 0) + (infraStats.supabase?.waMes ?? 0)}</span></div>
                        {zenviaGasto && zenviaLimite && <Barra v={Number(zenviaGasto.replace(",", "."))} max={Number(zenviaLimite.replace(",", "."))} warn={Number(zenviaLimite.replace(",", ".")) * 0.85} />}
                        <div style={{ ...C_SUB, marginTop: 6 }}>Atualize manualmente em Chaves de Acesso após consultar app.zenvia.com</div>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              )}

              {/* ── CHAVES DE ACESSO ── */}
              {licencasSubTab === "chaves" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.15)", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, marginBottom: 4 }}>Credenciais centralizadas</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)", lineHeight: 1.6 }}>Estas chaves são salvas nas configurações do estúdio. Visíveis apenas para o dono do sistema.</div>
                  </div>
                  {/* Anthropic */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx2)", marginBottom: 10, borderBottom: "1px solid var(--br)", paddingBottom: 8 }}>Anthropic — IA (Aura)</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", width: 140, flexShrink: 0 }}>Chave API Anthropic</div>
                        <input className="ef" type="password" placeholder="sk-ant-..." value={auraApiKey} onChange={e => setAuraApiKey(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--tx3)" }}>Obtenha em console.anthropic.com/settings/api-keys</div>
                      <div style={{ marginTop: 8, background: "rgba(255,255,255,.03)", border: "1px solid var(--br)", borderRadius: 6, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8, fontWeight: 600 }}>Dados de consumo (atualize manualmente via console.anthropic.com/billing)</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", width: 110, flexShrink: 0 }}>Saldo restante (US$)</div>
                            <input className="ef" placeholder="11.30" value={anthropicSaldo} onChange={e => setAnthropicSaldo(e.target.value)} style={{ flex: 1 }} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", width: 110, flexShrink: 0 }}>Gasto no mês (US$)</div>
                            <input className="ef" placeholder="13.61" value={anthropicGasto} onChange={e => setAnthropicGasto(e.target.value)} style={{ flex: 1 }} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", width: 110, flexShrink: 0 }}>Limite (US$)</div>
                            <input className="ef" placeholder="200000" value={anthropicLimite} onChange={e => setAnthropicLimite(e.target.value)} style={{ flex: 1 }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Resend */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx2)", marginBottom: 10, borderBottom: "1px solid var(--br)", paddingBottom: 8 }}>Resend — Email</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", width: 140, flexShrink: 0 }}>Resend API Key</div>
                        <input className="ef" type="password" placeholder="re_..." value={resendApiKey} onChange={e => setResendApiKey(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", width: 140, flexShrink: 0 }}>Email Remetente</div>
                        <input className="ef" type="email" placeholder="aura@seuestudio.com.br" value={emailRemetente} onChange={e => setEmailRemetente(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", width: 140, flexShrink: 0 }}>Nome Remetente</div>
                        <input className="ef" placeholder="A Casa dos Carvalho" value={nomeRemetente} onChange={e => setNomeRemetente(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button type="button" disabled={testandoCanal === "email"} onClick={() => testarCanal("email")} style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.35)", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "var(--gold)", cursor: testandoCanal === "email" ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                          {testandoCanal === "email" ? "Enviando..." : "Testar canal email"}
                          {canaisHabilitados.email && <span style={{ color: "#27AE60" }}>✓ Testado</span>}
                        </button>
                      </div>
                      <div style={{ marginTop: 8, background: "rgba(255,255,255,.03)", border: "1px solid var(--br)", borderRadius: 6, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8, fontWeight: 600 }}>Dados do plano (atualize manualmente via resend.com/emails)</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", width: 110, flexShrink: 0 }}>Limite mensal</div>
                            <input className="ef" placeholder="3000" value={resendLimite} onChange={e => setResendLimite(e.target.value)} style={{ flex: 1 }} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", width: 110, flexShrink: 0 }}>Taxa de bounce (%)</div>
                            <input className="ef" placeholder="6.47" value={resendBounce} onChange={e => setResendBounce(e.target.value)} style={{ flex: 1 }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Zenvia */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx2)", marginBottom: 10, borderBottom: "1px solid var(--br)", paddingBottom: 8 }}>Zenvia — SMS / WhatsApp</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", width: 140, flexShrink: 0 }}>Zenvia API Key</div>
                        <input className="ef" type="password" placeholder="Sua chave Zenvia" value={zenviaApiKey} onChange={e => setZenviaApiKey(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", width: 140, flexShrink: 0 }}>Número de Envio</div>
                        <input className="ef" placeholder="+55DDD999999999" value={zenviaNumero} onChange={e => setZenviaNumero(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button type="button" disabled={testandoCanal === "sms"} onClick={() => testarCanal("sms")} style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.35)", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "var(--gold)", cursor: testandoCanal === "sms" ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                          {testandoCanal === "sms" ? "Enviando..." : "Testar SMS"}
                          {canaisHabilitados.sms && <span style={{ color: "#27AE60" }}>✓</span>}
                        </button>
                        <button type="button" disabled={testandoCanal === "whatsapp"} onClick={() => testarCanal("whatsapp")} style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.35)", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: "var(--gold)", cursor: testandoCanal === "whatsapp" ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                          {testandoCanal === "whatsapp" ? "Enviando..." : "Testar WhatsApp"}
                          {canaisHabilitados.whatsapp && <span style={{ color: "#27AE60" }}>✓</span>}
                        </button>
                      </div>
                      <div style={{ marginTop: 8, background: "rgba(255,255,255,.03)", border: "1px solid var(--br)", borderRadius: 6, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8, fontWeight: 600 }}>Dados do plano (atualize manualmente via app.zenvia.com)</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", width: 110, flexShrink: 0 }}>Gasto período (R$)</div>
                            <input className="ef" placeholder="19.40" value={zenviaGasto} onChange={e => setZenviaGasto(e.target.value)} style={{ flex: 1 }} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", width: 110, flexShrink: 0 }}>Limite do plano (R$)</div>
                            <input className="ef" placeholder="100.00" value={zenviaLimite} onChange={e => setZenviaLimite(e.target.value)} style={{ flex: 1 }} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", width: 110, flexShrink: 0 }}>InteractionZ usadas</div>
                            <input className="ef" placeholder="0" value={zenviaInteractions} onChange={e => setZenviaInteractions(e.target.value)} style={{ flex: 1 }} />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
                            <div style={{ fontSize: 11, color: "var(--tx3)", width: 110, flexShrink: 0 }}>InteractionZ limite</div>
                            <input className="ef" placeholder="100" value={zenviaInteractionsLimite} onChange={e => setZenviaInteractionsLimite(e.target.value)} style={{ flex: 1 }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Vercel */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx2)", marginBottom: 10, borderBottom: "1px solid var(--br)", paddingBottom: 8 }}>Vercel — Deploy</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", width: 140, flexShrink: 0 }}>Vercel Token</div>
                        <input className="ef" type="password" placeholder="Token gerado em vercel.com/account/tokens" value={vercelToken} onChange={e => setVercelToken(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--tx3)" }}>Gere em vercel.com → Account Settings → Tokens</div>
                    </div>
                  </div>
                  {/* GitHub */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--tx2)", marginBottom: 10, borderBottom: "1px solid var(--br)", paddingBottom: 8 }}>GitHub — Actions</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", width: 140, flexShrink: 0 }}>GitHub Token</div>
                        <input className="ef" type="password" placeholder="ghp_..." value={githubToken} onChange={e => setGithubToken(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", width: 140, flexShrink: 0 }}>Repositório</div>
                        <input className="ef" placeholder="usuario/nome-do-repo" value={githubRepo} onChange={e => setGithubRepo(e.target.value)} style={{ flex: 1 }} />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--tx3)" }}>Gere em github.com → Settings → Developer settings → Personal access tokens</div>
                    </div>
                  </div>
                  {/* Botão salvar */}
                  <div style={{ paddingTop: 8, borderTop: "1px solid var(--br)" }}>
                    <button onClick={async () => {
                      if (!userId) return;
                      const { data: existing } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                      const fields = { aura_api_key: auraApiKey, resend_api_key: resendApiKey, email_remetente: emailRemetente, nome_remetente: nomeRemetente, zenvia_api_key: zenviaApiKey, zenvia_numero: zenviaNumero, vercel_token: vercelToken, github_token: githubToken, github_repo: githubRepo, anthropic_saldo: anthropicSaldo, anthropic_gasto: anthropicGasto, anthropic_limite: anthropicLimite, resend_limite: resendLimite, resend_bounce: resendBounce, zenvia_gasto: zenviaGasto, zenvia_limite: zenviaLimite, zenvia_interactions: zenviaInteractions, zenvia_interactions_limite: zenviaInteractionsLimite, updated_at: new Date().toISOString() };
                      if (existing?.id) await sb.from("configuracoes").update(fields).eq("id", existing.id);
                      setShowAviso("Chaves salvas com sucesso.");
                    }} style={{ background: "var(--gold)", color: "#000", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      Salvar Chaves
                    </button>
                  </div>
                </div>
              )}

              {/* ── LICENÇAS ── */}
              {licencasSubTab === "licencas" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {licencas.length === 0 && <div style={{ fontSize: 13, color: "var(--tx3)" }}>Nenhuma licença cadastrada ainda.</div>}
                  {licencas.map(lic => {
                    const diasRestantes = lic.data_vencimento ? Math.ceil((new Date(lic.data_vencimento).getTime() - Date.now()) / 86400000) : -999;
                    const vencendo = diasRestantes >= 0 && diasRestantes <= 7;
                    const expirado = diasRestantes < 0 || lic.status !== "ativo";
                    const cor = expirado ? "#C0392B" : vencendo ? "#E67E22" : "#27AE60";
                    return (
                      <div key={lic.id} style={{ background: "var(--dk2)", border: "1px solid " + (expirado ? "rgba(192,57,43,.3)" : vencendo ? "rgba(230,126,34,.3)" : "var(--br)"), borderRadius: 10, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>{lic.email || lic.studio_id || lic.user_id}</div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 3 }}>
                            Plano: <strong style={{ color: "var(--gold)" }}>{lic.plano || "—"}</strong>
                            {" · "}Início: {lic.data_inicio || "—"}
                            {" · "}Vence: {lic.data_vencimento || "—"}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: cor + "22", color: cor, border: "1px solid " + cor + "55" }}>
                            {expirado ? "EXPIRADO" : vencendo ? ("VENCE EM " + diasRestantes + "d") : "ATIVO"}
                          </span>
                          <select style={{ fontSize: 11, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "4px 8px", color: "var(--tx)", cursor: "pointer" }}
                            value={lic.status}
                            onChange={async e => {
                              const novoStatus = e.target.value;
                              await sb.from("licencas").update({ status: novoStatus }).eq("id", lic.id);
                              setLicencas(p => p.map(l => l.id === lic.id ? { ...l, status: novoStatus } : l));
                            }}>
                            <option value="ativo">Ativo</option>
                            <option value="expirado">Expirado</option>
                            <option value="bloqueado">Bloqueado</option>
                          </select>
                          <input type="date" value={lic.data_vencimento || ""} style={{ fontSize: 11, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "4px 8px", color: "var(--tx)", cursor: "pointer" }}
                            onChange={async e => {
                              const novaData = e.target.value;
                              await sb.from("licencas").update({ data_vencimento: novaData, status: "ativo" }).eq("id", lic.id);
                              setLicencas(p => p.map(l => l.id === lic.id ? { ...l, data_vencimento: novaData, status: "ativo" } : l));
                            }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        );})()}

        {/* ── SETTINGS ── */}
        {showSettings && (() => {
          // Snapshot para cancelar
          return (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}>
            <div className="settings-modal">
              <div className="mh">
                <div>
                  <div className="mn">{studioName}</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>INK SYSTEM</div>
                </div>
                <button className="mc" onClick={() => setShowSettings(false)}>✕</button>
              </div>
              {/* ABAS */}
              <div className="settings-tabs-bar" style={{ display: "flex", borderBottom: "1px solid var(--br)" }}>
                {([["estudio","🏠 Estúdio"],["dono","👤 Dono"],["metas","🎯 Metas"],["ia","🤖 IA"],["sistema","⚙️ Sistema"]] as const).map(([id, label]) => (
                  <div key={id} onClick={() => setSettingsTab(id)}
                    style={{ flex: 1, padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: ".04em",
                      color: settingsTab === id ? "var(--gold)" : "var(--tx3)",
                      borderBottom: settingsTab === id ? "2px solid var(--gold)" : "2px solid transparent",
                      background: settingsTab === id ? "rgba(201,168,76,.05)" : "none" }}>
                    {label}
                  </div>
                ))}
              </div>

              <div className="settings-content"><div className="mb">

                {/* ── ABA ESTÚDIO ── */}
                {settingsTab === "estudio" && <>
                  <div>
                    <div className="stit">Logo do Estúdio</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 0" }}>
                      <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                        {studioLogo
                          ? <img src={studioLogo} alt="logo" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--gold)" }} />
                          : <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: "#000" }}>{studioName?.[0]?.toUpperCase() || "S"}</div>
                        }
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "7px 14px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, display: "inline-block" }}>
                          📁 Escolher imagem
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => { setLogoCropSrc(ev.target?.result as string); setLogoCropPos({ x: 0, y: 0 }); setLogoCropScale(1); setShowSettings(false); setShowLogoCrop(true); };
                            reader.readAsDataURL(file);
                          }} />
                        </label>
                        {studioLogo && (
                          <button onClick={() => { setStudioLogo(""); localStorage.removeItem("inq_logo"); }}
                            style={{ background: "none", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "5px 12px", fontSize: 11, color: "var(--q1)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                            🗑 Remover logo
                          </button>
                        )}
                        <div style={{ fontSize: 10, color: "var(--tx3)", lineHeight: 1.5 }}>JPG, PNG ou SVG. Aparece na topbar e nos contratos.</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Identidade</div>
                    <div className="fg2">
                      <div className="fi2"><div className="fil">Nome do Estúdio</div><input className="ef" value={studioName} onChange={e => { const v = e.target.value; setStudioName(v.charAt(0).toUpperCase() + v.slice(1)); }} /></div>
                      <div className="fi2"><div className="fil">Responsável</div><input className="ef" value={studioOwner} onChange={e => { const v = e.target.value; setStudioOwner(v.charAt(0).toUpperCase() + v.slice(1)); }} /></div>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Contato</div>
                    <div className="fg2">
                      <div className="fi2"><div className="fil">Email do Estúdio{!studioEmail && <span style={{ color: "var(--q2)", marginLeft: 4 }}>⚠</span>}</div><input className="ef" value={studioEmail} placeholder="contato@estudio.com" onChange={e => setStudioEmail(e.target.value)} style={{ borderColor: !studioEmail ? "rgba(212,130,10,.4)" : undefined }} /></div>
                      <div className="fi2"><div className="fil">WhatsApp do Estúdio</div><input className="ef" value={studioTel} placeholder="(99) 99999-9999" onChange={e => setStudioTel(maskTel(e.target.value))} /></div>
                      <div className="fi2"><div className="fil">CNPJ{!cnpj && <span style={{ color: "var(--q2)", marginLeft: 4 }}>⚠</span>}</div><input className="ef" value={cnpj} placeholder="00.000.000/0001-00" maxLength={18} onChange={e => {
                        const raw = e.target.value.replace(/\D/g,"").slice(0,14);
                        let fmt = raw;
                        if (raw.length > 2) fmt = raw.slice(0,2) + "." + raw.slice(2);
                        if (raw.length > 5) fmt = raw.slice(0,2) + "." + raw.slice(2,5) + "." + raw.slice(5);
                        if (raw.length > 8) fmt = raw.slice(0,2) + "." + raw.slice(2,5) + "." + raw.slice(5,8) + "/" + raw.slice(8);
                        if (raw.length > 12) fmt = raw.slice(0,2) + "." + raw.slice(2,5) + "." + raw.slice(5,8) + "/" + raw.slice(8,12) + "-" + raw.slice(12);
                        setCnpj(fmt);
                      }} style={{ borderColor: !cnpj ? "rgba(212,130,10,.4)" : undefined }} /></div>
                      <div className="fi2"><div className="fil">Link Google Meu Negócio{!googleLink && <span style={{ color: "var(--q2)", marginLeft: 4 }}>⚠</span>}</div><input className="ef" value={googleLink} placeholder="maps.app.goo.gl/..." onChange={e => setGoogleLink(e.target.value)} style={{ borderColor: !googleLink ? "rgba(212,130,10,.4)" : undefined }} /></div>
                      <div className="fi2"><div className="fil">Site do Estúdio</div><input className="ef" value={studioSite} placeholder="https://seusite.com.br" onChange={e => setStudioSite(e.target.value)} /></div>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Endereço</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div className="fg2">
                        <div className="fi2" style={{ gridColumn: "1 / -1" }}><div className="fil">Rua / Logradouro</div><input className="ef" value={studioRua} placeholder="Rua, Avenida..." onChange={e => { const v = e.target.value; setStudioRua(v.replace(/(^|\s)(\S)/g, (_: string, sp: string, ch: string) => sp + ch.toUpperCase())); }} /></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 8 }}>
                        <div className="fi2"><div className="fil">Número</div><input className="ef" value={studioNumero} placeholder="Nº" onChange={e => setStudioNumero(e.target.value)} /></div>
                        <div className="fi2"><div className="fil">CEP</div><input className="ef" value={studioCep} placeholder="00000-000" maxLength={9} onChange={async e => {
                          const raw = e.target.value.replace(/\D/g,"").slice(0,8);
                          const masked = raw.length > 5 ? raw.slice(0,5) + "-" + raw.slice(5) : raw;
                          setStudioCep(masked);
                          if (raw.length === 8) {
                            try {
                              const res = await fetch("https://viacep.com.br/ws/" + raw + "/json/");
                              const d = await res.json();
                              if (!d.erro) {
                                setStudioRua(d.logradouro || studioRua);
                                setStudioBairro(d.bairro || studioBairro);
                                setStudioCity(d.localidade || studioCity);
                                setStudioEstado(d.uf || studioEstado);
                              }
                            } catch {}
                          }
                        }} /></div>
                        <div className="fi2"><div className="fil">Bairro</div><input className="ef" value={studioBairro} placeholder="Bairro" onChange={e => { const v = e.target.value; setStudioBairro(v.charAt(0).toUpperCase() + v.slice(1)); }} /></div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 1fr", gap: 8 }}>
                        <div className="fi2"><div className="fil">Cidade</div><input className="ef" value={studioCity} onChange={e => { const v = e.target.value; setStudioCity(v.charAt(0).toUpperCase() + v.slice(1)); }} /></div>
                        <div className="fi2"><div className="fil">Estado</div>
                          <select className="ef" value={studioEstado} onChange={e => setStudioEstado(e.target.value)} style={{ fontFamily: "'DM Sans',sans-serif" }}>
                            <option value="">UF</option>
                            {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                          </select>
                        </div>
                        <div className="fi2"><div className="fil">País</div><input className="ef" value={studioPais} onChange={e => setStudioPais(e.target.value)} /></div>
                        <div className="fi2"><div className="fil">Complemento</div><input className="ef" value={studioComplemento} placeholder="Ex: Loja 2, Sala 3" onChange={e => { const v = e.target.value; setStudioComplemento(v.charAt(0).toUpperCase() + v.slice(1)); }} /></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Redes Sociais</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 10 }}>{"Aparecem nos contratos e comunicações da " + (auraName || "IA") + "."}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {studioRedes.map((rede, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select value={rede.plataforma} onChange={e => setStudioRedes(p => p.map((r, i) => i === idx ? { ...r, plataforma: e.target.value } : r))}
                            style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 8px", fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", outline: "none", width: 130, flexShrink: 0 }}>
                            {["Instagram","TikTok","YouTube","Facebook","Pinterest","Behance","LinkedIn","X/Twitter"].map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                          <input className="ef" value={rede.usuario} placeholder={["Instagram","TikTok","X/Twitter","Pinterest"].includes(rede.plataforma) ? "@usuario" : "URL ou usuário"}
                            onFocus={() => {
                              if (["Instagram","TikTok","X/Twitter","Pinterest"].includes(rede.plataforma) && !rede.usuario) {
                                setStudioRedes(p => p.map((r, i) => i === idx ? { ...r, usuario: "@" } : r));
                              }
                            }}
                            onChange={e => {
                              let val = e.target.value;
                              if (["Instagram","TikTok","X/Twitter","Pinterest"].includes(rede.plataforma)) {
                                if (val && !val.startsWith("@")) val = "@" + val;
                              }
                              setStudioRedes(p => p.map((r, i) => i === idx ? { ...r, usuario: val } : r));
                            }}
                            style={{ flex: 1 }} />
                          <button onClick={() => setStudioRedes(p => p.filter((_, i) => i !== idx))}
                            style={{ background: "none", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "5px 9px", fontSize: 12, color: "var(--q1)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>✕</button>
                        </div>
                      ))}
                      <button onClick={() => setStudioRedes(p => [...p, { plataforma: "Instagram", usuario: "" }])}
                        style={{ background: "var(--dk3)", border: "1px dashed var(--br)", borderRadius: 6, padding: "7px", fontSize: 11, color: "var(--tx3)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        + Adicionar rede social
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Horários de Funcionamento</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8 }}>A agente de IA trabalha 24h — selecione os horários em que ela pode agendar seus clientes.</div>
                    {horarios.map((h, i) => (
                      <div key={h.dia} style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
                        <div className="hr-row">
                          <div className="hr-dia">{h.dia}</div>
                          <div className="hr-toggle" style={{ background: h.aberto ? "var(--q3)" : "var(--dk5)" }}
                            onClick={() => setHorarios(p => p.map((x, j) => j === i ? { ...x, aberto: !x.aberto } : x))}>
                            <div className="hr-toggle-dot" style={{ left: h.aberto ? "18px" : "2px" }} />
                          </div>
                          {h.aberto ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                              <input className="fi" type="time" value={h.ini} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, ini: e.target.value } : x))} style={{ width: 90, padding: "4px 7px" }} />
                              <span style={{ fontSize: 12, color: "var(--tx2)" }}>às</span>
                              <input className="fi" type="time" value={h.fim} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, fim: e.target.value } : x))} style={{ width: 90, padding: "4px 7px" }} />
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--tx3)", fontStyle: "italic", flex: 1 }}>Fechado</span>
                          )}
                        </div>
                        {h.aberto && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 72 }}>
                            <div style={{ width: 32, height: 18, borderRadius: 9, background: h.almoco ? "var(--q3)" : "var(--dk5)", cursor: "pointer", position: "relative", flexShrink: 0 }}
                              onClick={() => setHorarios(p => p.map((x, j) => j === i ? { ...x, almoco: !x.almoco } : x))}>
                              <div style={{ position: "absolute", top: 2, left: h.almoco ? "16px" : "2px", width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
                            </div>
                            <span style={{ fontSize: 11, color: "var(--tx3)" }}>Pausa almoço</span>
                            {h.almoco && (
                              <>
                                <input className="fi" type="time" value={h.almoco_ini} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, almoco_ini: e.target.value } : x))} style={{ width: 82, padding: "3px 6px", fontSize: 11 }} />
                                <span style={{ fontSize: 11, color: "var(--tx3)" }}>às</span>
                                <input className="fi" type="time" value={h.almoco_fim} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, almoco_fim: e.target.value } : x))} style={{ width: 82, padding: "3px 6px", fontSize: 11 }} />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="stit">Serviços</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 10, lineHeight: 1.6 }}>
                      Serviços oferecidos pelo estúdio. Aparecem no agendamento.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                      {servicoOpts.map(svc => (
                        <div key={svc.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--dk3)", borderRadius: 7, padding: "8px 12px" }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: svc.cor, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13, color: "var(--tx)" }}>{svc.nome}</span>
                          <button onClick={async () => {
                            const updated = servicoOpts.filter(s => s.id !== svc.id);
                            setServicoOpts(updated);
                            const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                            if (cfgEx?.id) await sb.from("configuracoes").update({ servico_opts: updated }).eq("id", cfgEx.id);
                          }} style={{ background: "none", border: "none", color: "var(--q1)", cursor: "pointer", fontSize: 14 }}>🗑</button>
                        </div>
                      ))}
                    </div>
                    {addingServico ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", background: "var(--dk3)", borderRadius: 7, padding: "8px 12px", border: "1px solid var(--gold)" }}>
                        <input style={{ width: 14, height: 14, cursor: "pointer", accentColor: novoServicoCor }} type="color" value={novoServicoCor} onChange={e => setNovoServicoCor(e.target.value)} />
                        <input className="fi" style={{ flex: 1, padding: "4px 8px", fontSize: 12 }} placeholder="Nome do serviço..." value={novoServico}
                          onChange={e => setNovoServico(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === "Enter" && novoServico.trim()) {
                              const updated = [...servicoOpts, { id: "svc" + Date.now(), nome: novoServico.trim(), cor: novoServicoCor }];
                              setServicoOpts(updated); setNovoServico(""); setAddingServico(false);
                              const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                              if (cfgEx?.id) await sb.from("configuracoes").update({ servico_opts: updated }).eq("id", cfgEx.id);
                            } else if (e.key === "Escape") { setAddingServico(false); setNovoServico(""); }
                          }} />
                        <button className="btn-s" style={{ padding: "4px 10px", fontSize: 11 }} onClick={async () => {
                          if (novoServico.trim()) {
                            const updated = [...servicoOpts, { id: "svc" + Date.now(), nome: novoServico.trim(), cor: novoServicoCor }];
                            setServicoOpts(updated); setNovoServico(""); setAddingServico(false);
                            const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                            if (cfgEx?.id) await sb.from("configuracoes").update({ servico_opts: updated }).eq("id", cfgEx.id);
                          }
                        }}>OK</button>
                        <button className="btn-c" style={{ padding: "4px 8px", fontSize: 11 }} onClick={() => { setAddingServico(false); setNovoServico(""); }}>✕</button>
                      </div>
                    ) : (
                      <button className="btn-sm gold" onClick={() => { setAddingServico(true); setNovoServico(""); setNovoServicoCor("#a78bfa"); }}>+ Adicionar Serviço</button>
                    )}
                  </div>
                  <div>
                    <div className="stit">Categorias de Despesa</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 10, lineHeight: 1.6 }}>
                      Categorias usadas no registro de saídas do estúdio.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                      {saidaCats.map(cat => (
                        <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--dk3)", borderRadius: 7, padding: "8px 12px" }}>
                          <span style={{ flex: 1, fontSize: 13, color: "var(--tx)" }}>{cat}</span>
                          <button onClick={async () => {
                            const updated = saidaCats.filter(c => c !== cat);
                            setSaidaCats(updated);
                            const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                            if (cfgEx?.id) await sb.from("configuracoes").update({ saida_cats: updated }).eq("id", cfgEx.id);
                          }} style={{ background: "none", border: "none", color: "var(--q1)", cursor: "pointer", fontSize: 14 }}>🗑</button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input className="ef" style={{ flex: 1 }} placeholder="Nova categoria..." value={novaSaidaCatInput}
                        onChange={e => setNovaSaidaCatInput(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === "Enter" && novaSaidaCatInput.trim() && !saidaCats.includes(novaSaidaCatInput.trim())) {
                            const updated = [...saidaCats, novaSaidaCatInput.trim()];
                            setSaidaCats(updated); setNovaSaidaCatInput("");
                            const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                            if (cfgEx?.id) await sb.from("configuracoes").update({ saida_cats: updated }).eq("id", cfgEx.id);
                          }
                        }} />
                      <button className="btn-s" onClick={async () => {
                        if (novaSaidaCatInput.trim() && !saidaCats.includes(novaSaidaCatInput.trim())) {
                          const updated = [...saidaCats, novaSaidaCatInput.trim()];
                          setSaidaCats(updated); setNovaSaidaCatInput("");
                          const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                          if (cfgEx?.id) await sb.from("configuracoes").update({ saida_cats: updated }).eq("id", cfgEx.id);
                        }
                      }}>+</button>
                    </div>
                  </div>
                </>}

                {/* ── ABA DONO ── */}
                {settingsTab === "dono" && <>
                  <div>
                    <div className="stit">Dados do Responsável</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 12, lineHeight: 1.6 }}>
                      {"Estas informações são usadas pela " + (auraName || "IA") + " para alertas diretos e comunicação interna."}
                    </div>
                    <div className="fg2">
                      <div className="fi2"><div className="fil">Nome Completo</div><input className="ef" value={donoNome || studioOwner} placeholder="Seu nome completo" onChange={e => setDonoNome(e.target.value)} /></div>
                      <div className="fi2"><div className="fil">WhatsApp Pessoal{!donoWhats && <span style={{ color: "var(--q2)", marginLeft: 4 }}>⚠</span>}</div><input className="ef" value={donoWhats} placeholder="(99) 99999-9999" onChange={e => setDonoWhats(maskTel(e.target.value))} style={{ borderColor: !donoWhats ? "rgba(212,130,10,.4)" : undefined }} /></div>
                      <div className="fi2"><div className="fil">Email Pessoal{!donoEmail && <span style={{ color: "var(--q2)", marginLeft: 4 }}>⚠</span>}</div><input className="ef" value={donoEmail} placeholder="seu@email.com" onChange={e => setDonoEmail(e.target.value)} style={{ borderColor: !donoEmail ? "rgba(212,130,10,.4)" : undefined }} /></div>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Alertas Diretos</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginBottom: 12, lineHeight: 1.6 }}>
                      {"A " + (auraName || "IA") + " pode enviar notificações diretamente para você via WhatsApp pessoal."}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* 1 */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--dk3)", borderRadius: 8, border: "1px solid var(--br)" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>{"Nova mensagem recebida via " + (auraName || "IA")}</div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Quando um cliente enviar mensagem fora do horário comercial</div>
                        </div>
                        <div onClick={() => setAlertaConfig(p => ({ ...p, alerta_nova_mensagem: !p.alerta_nova_mensagem }))} style={{ width: 36, height: 20, borderRadius: 10, background: alertaConfig.alerta_nova_mensagem ? "var(--q3)" : "var(--dk5)", flexShrink: 0, position: "relative", cursor: "pointer", transition: "background .2s" }}>
                          <div style={{ position: "absolute", left: alertaConfig.alerta_nova_mensagem ? "calc(100% - 18px)" : 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                        </div>
                      </div>
                      {/* 2 — Sessão em X com selector */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--dk3)", borderRadius: 8, border: "1px solid var(--br)" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)", display: "flex", alignItems: "center", gap: 6 }}>
                            Sessão em{" "}
                            <select value={alertaConfig.alerta_sessao_antecedencia} onChange={e => setAlertaConfig(p => ({ ...p, alerta_sessao_antecedencia: e.target.value }))} style={{ background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 4, color: "var(--gold)", fontSize: 11, fontWeight: 700, padding: "1px 4px", cursor: "pointer" }}>
                              <option value="2h">2h</option>
                              <option value="4h">4h</option>
                              <option value="24h">24h</option>
                            </select>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Lembrete antes de cada sessão agendada</div>
                        </div>
                        <div onClick={() => setAlertaConfig(p => ({ ...p, alerta_sessao_proxima: !p.alerta_sessao_proxima }))} style={{ width: 36, height: 20, borderRadius: 10, background: alertaConfig.alerta_sessao_proxima ? "var(--q3)" : "var(--dk5)", flexShrink: 0, position: "relative", cursor: "pointer", transition: "background .2s" }}>
                          <div style={{ position: "absolute", left: alertaConfig.alerta_sessao_proxima ? "calc(100% - 18px)" : 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                        </div>
                      </div>
                      {/* 3 */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--dk3)", borderRadius: 8, border: "1px solid var(--br)" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>Falta registrada</div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Quando um cliente não comparecer</div>
                        </div>
                        <div onClick={() => setAlertaConfig(p => ({ ...p, alerta_falta: !p.alerta_falta }))} style={{ width: 36, height: 20, borderRadius: 10, background: alertaConfig.alerta_falta ? "var(--q3)" : "var(--dk5)", flexShrink: 0, position: "relative", cursor: "pointer", transition: "background .2s" }}>
                          <div style={{ position: "absolute", left: alertaConfig.alerta_falta ? "calc(100% - 18px)" : 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                        </div>
                      </div>
                      {/* 4 */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--dk3)", borderRadius: 8, border: "1px solid var(--br)" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>Aniversário de cliente hoje</div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Disparo automático no dia do aniversário</div>
                        </div>
                        <div onClick={() => setAlertaConfig(p => ({ ...p, alerta_aniversario: !p.alerta_aniversario }))} style={{ width: 36, height: 20, borderRadius: 10, background: alertaConfig.alerta_aniversario ? "var(--q3)" : "var(--dk5)", flexShrink: 0, position: "relative", cursor: "pointer", transition: "background .2s" }}>
                          <div style={{ position: "absolute", left: alertaConfig.alerta_aniversario ? "calc(100% - 18px)" : 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                        </div>
                      </div>
                      {/* 5 — Cliente sem retorno há X dias */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--dk3)", borderRadius: 8, border: "1px solid var(--br)" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)", display: "flex", alignItems: "center", gap: 6 }}>
                            Cliente sem retorno há{" "}
                            <select value={alertaConfig.alerta_sem_retorno_dias} onChange={e => setAlertaConfig(p => ({ ...p, alerta_sem_retorno_dias: e.target.value }))} style={{ background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 4, color: "var(--gold)", fontSize: 11, fontWeight: 700, padding: "1px 4px", cursor: "pointer" }}>
                              <option value="30">30 dias</option>
                              <option value="60">60 dias</option>
                              <option value="90">90 dias</option>
                            </select>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Clientes inativos que precisam de recontato</div>
                        </div>
                        <div onClick={() => setAlertaConfig(p => ({ ...p, alerta_sem_retorno: !p.alerta_sem_retorno }))} style={{ width: 36, height: 20, borderRadius: 10, background: alertaConfig.alerta_sem_retorno ? "var(--q3)" : "var(--dk5)", flexShrink: 0, position: "relative", cursor: "pointer", transition: "background .2s" }}>
                          <div style={{ position: "absolute", left: alertaConfig.alerta_sem_retorno ? "calc(100% - 18px)" : 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                        </div>
                      </div>
                      {/* 6 */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--dk3)", borderRadius: 8, border: "1px solid var(--br)" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>Sinal pendente confirmado</div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Quando o sinal de uma sessão ainda não foi recebido</div>
                        </div>
                        <div onClick={() => setAlertaConfig(p => ({ ...p, alerta_sinal_pendente: !p.alerta_sinal_pendente }))} style={{ width: 36, height: 20, borderRadius: 10, background: alertaConfig.alerta_sinal_pendente ? "var(--q3)" : "var(--dk5)", flexShrink: 0, position: "relative", cursor: "pointer", transition: "background .2s" }}>
                          <div style={{ position: "absolute", left: alertaConfig.alerta_sinal_pendente ? "calc(100% - 18px)" : 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                        </div>
                      </div>
                      {/* 7 */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--dk3)", borderRadius: 8, border: "1px solid var(--br)" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>Projeto sem valor definido</div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Sessão agendada sem orçamento registrado</div>
                        </div>
                        <div onClick={() => setAlertaConfig(p => ({ ...p, alerta_projeto_sem_valor: !p.alerta_projeto_sem_valor }))} style={{ width: 36, height: 20, borderRadius: 10, background: alertaConfig.alerta_projeto_sem_valor ? "var(--q3)" : "var(--dk5)", flexShrink: 0, position: "relative", cursor: "pointer", transition: "background .2s" }}>
                          <div style={{ position: "absolute", left: alertaConfig.alerta_projeto_sem_valor ? "calc(100% - 18px)" : 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                        </div>
                      </div>
                      {/* 8 */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "var(--dk3)", borderRadius: 8, border: "1px solid var(--br)" }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>{"Cliente novo cadastrado pela " + (auraName || "IA")}</div>
                          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>{"Quando um lead entrar pelo WhatsApp via " + (auraName || "IA")}</div>
                        </div>
                        <div onClick={() => setAlertaConfig(p => ({ ...p, alerta_novo_cliente_aura: !p.alerta_novo_cliente_aura }))} style={{ width: 36, height: 20, borderRadius: 10, background: alertaConfig.alerta_novo_cliente_aura ? "var(--q3)" : "var(--dk5)", flexShrink: 0, position: "relative", cursor: "pointer", transition: "background .2s" }}>
                          <div style={{ position: "absolute", left: alertaConfig.alerta_novo_cliente_aura ? "calc(100% - 18px)" : 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 10, fontStyle: "italic" }}>
                      💡 Os alertas para profissionais são configurados individualmente na aba Profissionais.
                    </div>
                  </div>
                </>}

                {/* ── ABA METAS ── */}
                {settingsTab === "metas" && <>
                  <div>
                    <div className="stit">Por que ter metas?</div>
                    <div style={{ background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.15)", borderRadius: 8, padding: "12px 14px", marginBottom: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.7 }}>
                        Metas não são cobranças — são <strong style={{ color: "var(--gold)" }}>bússolas</strong>. Elas te dizem se o estúdio está no caminho certo antes que o problema apareça na conta bancária. Você define os números, o sistema mostra o progresso em tempo real.
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Metas Mensais</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ background: "var(--dk3)", borderRadius: 8, padding: "14px", border: "1px solid var(--br)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>💰 Faturamento</div>
                            <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Quanto o estúdio precisa faturar para ser sustentável e crescer</div>
                          </div>
                        </div>
                        <input className="ef" type="text" placeholder="R$ 0,00" value={metaMensal ? "R$ " + Number(metaMensal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""} onChange={e => { const raw = e.target.value.replace(/[^0-9]/g, ""); setMetaMensal(raw ? Number(raw) / 100 : 0); }} style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }} />
                      </div>
                      <div style={{ background: "var(--dk3)", borderRadius: 8, padding: "14px", border: "1px solid var(--br)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>🖤 Sessões</div>
                            <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Quantas tatuagens precisam ser feitas por mês. Se o faturamento está baixo, você descobre se é preço ou volume.</div>
                          </div>
                        </div>
                        <input className="ef" type="number" min={0} value={metaSessoes} onChange={e => setMetaSessoes(Number(e.target.value))} style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)", width: 100 }} />
                      </div>
                      <div style={{ background: "var(--dk3)", borderRadius: 8, padding: "14px", border: "1px solid var(--br)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>📥 Novos Leads</div>
                            <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Quantos contatos novos precisam entrar no pipeline para alimentar as sessões do mês seguinte.</div>
                          </div>
                        </div>
                        <input className="ef" type="number" min={0} value={metaLeads} onChange={e => setMetaLeads(Number(e.target.value))} style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)", width: 100 }} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Calculado automaticamente</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { label: "Ticket Médio", desc: "Valor médio por sessão — calculado pelo financeiro", calc: true },
                        { label: "Taxa de Conversão", desc: "% de leads que viram sessão — calculado pelo pipeline", calc: true },
                        { label: "Receita por Profissional", desc: "Faturamento individual — calculado pelos profissionais", calc: true },
                      ].map(item => (
                        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--dk3)", borderRadius: 7, border: "1px solid var(--br)", opacity: 0.7 }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 1 }}>{item.desc}</div>
                          </div>
                          <span style={{ fontSize: 10, color: "var(--q3)", fontWeight: 700, background: "rgba(39,174,96,.1)", border: "1px solid rgba(39,174,96,.2)", borderRadius: 4, padding: "2px 7px" }}>AUTO</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>}


                {/* ── ABA IA ── */}
                {settingsTab === "ia" && <>
                  <div style={{ background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.15)", borderRadius: 8, padding: "12px 14px", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, marginBottom: 4 }}>🔒 Essência imutável</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)", lineHeight: 1.6 }}>A assistente sempre será transparente sobre ser uma IA, nunca se passará por humano e manterá o padrão premium do estúdio. Estas configurações ajustam comportamentos secundários.</div>
                  </div>
                  <div>
                    <div className="stit">Identidade</div>
                    <div className="fi2">
                      <div className="fil">Nome da IA</div>
                      <input className="ef" value={(auraName && !auraName.includes("@")) ? auraName : ""} placeholder="Ex: Aura, Luna, Sofia..."
                        onChange={e => setAuraName(e.target.value.replace(/(^|\s)(\S)/g, (_: string, sp: string, ch: string) => sp + ch.toUpperCase()))} />
                    </div>
                    <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 6, lineHeight: 1.5 }}>As chaves de API (Anthropic, Resend, Zenvia) estão centralizadas em <strong style={{ color: "var(--gold)" }}>Licenças → Chaves de Acesso</strong>.</div>
                  </div>
                  {/* ── SEÇÃO: INSTRUÇÕES DA AGENTE ── */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div className="stit">{"Instruções para " + (auraName || "sua agente")}</div>
                      <div style={{ fontSize: 11, color: "var(--tx3)", lineHeight: 1.7, marginTop: 4 }}>
                        {"Configure tudo que " + (auraName || "sua agente") + " precisa saber para atender com excelência. Preencha o campo abaixo substituindo os exemplos entre parênteses pelas informações do seu negócio. Quanto mais completo, melhor o atendimento."}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                          {"📝 O que " + (auraName || "a agente") + " deve saber"}
                        </div>
                        {auraInstrucoes && (
                          <button onClick={() => { if (window.confirm("Limpar e começar do zero?")) setAuraInstrucoes(""); }}
                            style={{ fontSize: 10, color: "var(--tx3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                            Limpar
                          </button>
                        )}
                      </div>
                                            <textarea
                        className="ef"
                        rows={12}
                        placeholder={"Preencha com as informações do seu negócio substituindo os exemplos entre parênteses..."}
                        value={auraInstrucoes}
                        onChange={e => setAuraInstrucoes(e.target.value)}
                        style={{ resize: "vertical", fontFamily: "'DM Sans',sans-serif", fontSize: 12, lineHeight: 1.8, minHeight: 220 }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontSize: 10, color: "var(--tx3)", lineHeight: 1.5, flex: 1 }}>
                          {"💡 " + (auraName || "A agente") + " também aprende durante as conversas — quando você revelar algo importante, ela perguntará se deve salvar nas instruções permanentes."}
                        </div>
                        {auraInstrucoes && (
                          <div style={{ fontSize: 10, color: "var(--tx3)", whiteSpace: "nowrap", flexShrink: 0 }}>
                            {auraInstrucoes.length} caracteres
                          </div>
                        )}
                      </div>
                      <div style={{ background: "rgba(201,168,76,.05)", border: "1px solid rgba(201,168,76,.1)", borderRadius: 7, padding: "10px 12px" }}>
                        <div style={{ fontSize: 10, color: "var(--tx3)", lineHeight: 1.6 }}>
                          🔒 <strong style={{ color: "var(--tx2)" }}>Suas instruções são privadas.</strong> Elas ficam armazenadas apenas no banco de dados do seu estúdio e nunca são compartilhadas com outros usuários do sistema.
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* ── FIM SEÇÃO INSTRUÇÕES ── */}
                </>}

                {/* ── ABA SISTEMA ── */}
                {settingsTab === "sistema" && <>
                  <div>
                    <div className="stit">Aparência</div>
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 12 }}>Escolha o tema visual e o modo de exibição do sistema.</div>
                    {/* Modo claro/escuro */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 12, color: "var(--tx2)" }}>Modo:</span>
                      <button onClick={async () => { setDark(false); if (userId) await sb.from("configuracoes").update({ dark_mode: false }).eq("user_id", userId); }} style={{ background: !dark ? "var(--gold-d)" : "var(--dk3)", border: `1px solid ${!dark ? "var(--gold)" : "var(--br)"}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, color: !dark ? "var(--gold)" : "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: !dark ? 600 : 400 }}>☀️ Claro</button>
                      <button onClick={async () => { setDark(true); if (userId) await sb.from("configuracoes").update({ dark_mode: true }).eq("user_id", userId); }} style={{ background: dark ? "var(--gold-d)" : "var(--dk3)", border: `1px solid ${dark ? "var(--gold)" : "var(--br)"}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, color: dark ? "var(--gold)" : "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: dark ? 600 : 400 }}>🌙 Escuro</button>
                    </div>
                    {/* Carrossel de temas */}
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                      {(Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][]).map(([id, t]) => {
                        const ativo = tema === id;
                        const bg = dark ? t.dark["--dk3"] : t.light["--dk3"];
                        const accent = dark ? t.dark["--gold"] : t.light["--gold"];
                        const txColor = dark ? t.dark["--tx2"] : t.light["--tx2"];
                        return (
                          <div key={id} onClick={async () => { setTema(id); if (userId) await sb.from("configuracoes").update({ tema: id }).eq("user_id", userId); }} style={{ minWidth: 100, borderRadius: 8, border: `1px solid ${ativo ? accent : "var(--br)"}`, background: bg, padding: "8px 10px", cursor: "pointer", position: "relative", transition: "all .15s", flexShrink: 0 }}>
                            {ativo && <div style={{ position: "absolute", top: 4, right: 6, fontSize: 10, color: accent, fontWeight: 700 }}>✓</div>}
                            <div style={{ fontSize: 14, marginBottom: 4 }}>{t.emoji}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: txColor, marginBottom: 6, whiteSpace: "nowrap" }}>{t.nome}</div>
                            <div style={{ display: "flex", gap: 3 }}>
                              <div style={{ width: 12, height: 12, borderRadius: 3, background: dark ? t.dark["--dk"] : t.light["--dk"], border: "1px solid rgba(128,128,128,0.2)" }} />
                              <div style={{ width: 12, height: 12, borderRadius: 3, background: accent }} />
                              <div style={{ width: 12, height: 12, borderRadius: 3, background: dark ? t.dark["--tx3"] : t.light["--tx3"] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="stit">Tour Guiado</div>
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 10 }}>Refaça o tour de apresentação do sistema a qualquer momento.</div>
                    <button style={{ background: "rgba(52,152,219,.12)", border: "1px solid rgba(52,152,219,.3)", borderRadius: 7, padding: "8px 16px", fontSize: 12, color: "#3498DB", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                      onClick={() => { setShowSettings(false); localStorage.removeItem("inq_tour"); setTourStep(0); setTimeout(() => setTourAtivo(true), 300); }}>
                      🧭 Refazer Tour
                    </button>
                  </div>
                  <div>
                    <div className="stit">Exportar Dados</div>
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 10 }}>Baixe os dados do sistema em CSV para backup ou análise externa.</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => {
                        const rows = [["Nome","Telefone","Email","Profissional","Etapa","Origem","Data"].join(","),
                          ...clients.map(c => [c.nome, c.tel, c.email, c.artista, c.etapa, c.orig, c.data].map(v => `"${v||""}"`).join(","))];
                        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
                        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "clientes.csv"; a.click();
                      }} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "8px 14px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        📥 Exportar Clientes
                      </button>
                      <button onClick={() => {
                        const rows = [["Descrição","Profissional","Data","Valor","Forma","Status"].join(","),
                          ...fin.map((f: any) => [f.cliente_nome, f.artista, f.data, f.val_a, f.pgto, f.status].map((v: any) => `"${v||""}"`).join(","))];
                        const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
                        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "financeiro.csv"; a.click();
                      }} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "8px 14px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        📥 Exportar Financeiro
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Histórico de Atividades</div>
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 10 }}>Registro cronológico de todas as ações realizadas no sistema.</div>
                    <button onClick={() => setShowHistoricoModal(true)} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "8px 16px", fontSize: 12, color: "var(--tx)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                      📋 Ver Histórico de Atividades {historico.length > 0 && <span style={{ background: "var(--gold)", color: "#1a1a1a", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{historico.length}</span>}
                    </button>
                  </div>
                  <div>
                    <div className="stit">🗑 Lixeira</div>
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 10 }}>Clientes excluídos ficam aqui por 30 dias antes da remoção definitiva.</div>
                    <button onClick={() => { setShowLixeiraModal(true); carregarLixeira(); }} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "8px 16px", fontSize: 12, color: "var(--tx)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                      🗑 Abrir Lixeira {lixeiraClientes.length > 0 && <span style={{ background: "var(--gold)", color: "#1a1a1a", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>{lixeiraClientes.length}</span>}
                    </button>
                  </div>
                  <div>
                    <div className="stit" style={{ color: "#C0392B" }}>Zona de Perigo</div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                      <div style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.6 }}>
                        Remove clientes, agendamentos e financeiro. Profissionais e configurações são preservados.
                      </div>
                      <div style={{ position: "relative", flexShrink: 0 }} title={"Remove permanentemente todos os clientes, agendamentos e lançamentos financeiros cadastrados. As configurações do estúdio, artistas, metas e preferências da " + (auraName || "agente") + " são preservadas. Use antes de iniciar o uso real do sistema após testes."}>
                        <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--dk4)", border: "1px solid var(--br)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--tx3)", cursor: "help", fontWeight: 700 }}>ℹ</span>
                      </div>
                    </div>
                    <button style={{ background: "rgba(192,57,43,.12)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 7, padding: "8px 16px", fontSize: 12, color: "#C0392B", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                      onClick={() => setConfirmReset(true)}>
                      🗑 Apagar Dados Operacionais
                    </button>
                  </div>
                </>}

              </div>

              <div className="fmf" style={{ position: "relative" }}>
                <button className="btn-c" onClick={() => setShowSettings(false)}>Cancelar</button>
                <div style={{ display: "flex", gap: 8 }}>
                  {settingsTab !== "sistema" && (
                    <button style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "8px 16px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                      onClick={() => {
                        const order = ["estudio","dono","metas","ia","sistema"];
                        const idx = order.indexOf(settingsTab);
                        if (idx < order.length - 1) setSettingsTab(order[idx + 1] as any);
                      }}>
                      Próximo →
                    </button>
                  )}
                  <button className="btn-s" onClick={async () => {
                  if (!studioName.trim()) {
                    setShowAviso("Preencha ao menos o Nome do Estúdio para salvar.");
                    return;
                  }
                  const cfg: any = {
                    studio_name: studioName, studio_tel: studioTel, studio_site: studioSite,
                    studio_owner: studioOwner, studio_email: studioEmail,
                    studio_city: studioCity, studio_insta: studioInsta,
                    studio_rua: studioRua, studio_numero: studioNumero,
                    studio_complemento: studioComplemento, studio_bairro: studioBairro,
                    studio_cep: studioCep, studio_estado: studioEstado,
                    studio_pais: studioPais,
                    studio_redes: studioRedes,
                    dono_nome: donoNome, dono_whats: donoWhats, dono_email: donoEmail,
                    aura_name: auraName,
                    google_link: googleLink,
                    cnpj, meta_mensal: metaMensal,
                    meta_sessoes: metaSessoes, meta_leads: metaLeads, meta_nps: metaNPS,
                    desconto_aniversario: descontoAniversario,
                    horarios, dark_mode: dark, tema,
                    studio_logo: studioLogo,
                    alerta_config: alertaConfig,
                    entrada_cats: entradaCats,
                    saida_cats: saidaCats,
                    servico_opts: servicoOpts,
                    resend_api_key: resendApiKey,
                    email_remetente: emailRemetente,
                    nome_remetente: nomeRemetente,
                    zenvia_api_key: zenviaApiKey,
                    zenvia_numero: zenviaNumero,
                    aura_api_key: auraApiKey,
                    aura_instrucoes: auraInstrucoes,
                    vercel_token: vercelToken,
                    github_token: githubToken,
                    github_repo: githubRepo,
                    anthropic_saldo: anthropicSaldo,
                    anthropic_gasto: anthropicGasto,
                    anthropic_limite: anthropicLimite,
                    resend_limite: resendLimite,
                    resend_bounce: resendBounce,
                    zenvia_gasto: zenviaGasto,
                    zenvia_limite: zenviaLimite,
                    zenvia_interactions: zenviaInteractions,
                    zenvia_interactions_limite: zenviaInteractionsLimite,
                    user_id: userId,
                    updated_at: new Date().toISOString()
                  };
                  const { data: existing } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                  if (existing?.id) {
                    await sb.from("configuracoes").update(cfg).eq("id", existing.id);
                  } else {
                    await sb.from("configuracoes").insert(cfg);
                  }
                  setShowSettings(false);
                  setShowAviso("Configurações salvas com sucesso.");
                }}>Salvar e Continuar</button>
                </div>
              </div>
              </div>{/* end settings-content */}
            </div>
          </div>
          );
        })()}
      </div>

        {/* ── MODAL CATEGORIAS DE LANÇAMENTO ── */}
        {showEditCats && (
          <div className="ov" onClick={() => setShowEditCats(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(380px, 92vw)", padding: "24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>Categorias de Lançamento</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {entradaCats.map(cat => (
                  <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--dk3)", borderRadius: 7, padding: "8px 12px" }}>
                    <span style={{ fontSize: 13, color: "var(--tx)" }}>
                      {cat === "sessao" ? "Sessão" : cat === "sinal" ? "Sinal" : cat === "prolabore" ? "Pró-labore" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </span>
                    {!["sessao","sinal","prolabore"].includes(cat) && (
                      <button onClick={() => setEntradaCats(p => p.filter(c => c !== cat))}
                        style={{ background: "none", border: "none", color: "var(--q1)", cursor: "pointer", fontSize: 14 }}>🗑</button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="fi" style={{ flex: 1 }} placeholder="Nova categoria..." value={novaCatInput}
                  onChange={e => setNovaCatInput(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  onKeyDown={e => { if (e.key === "Enter" && novaCatInput.trim() && !entradaCats.includes(novaCatInput.trim())) { setEntradaCats(p => [...p, novaCatInput.trim()]); setNovaCatInput(""); } }} />
                <button className="btn-s" onClick={() => { if (novaCatInput.trim() && !entradaCats.includes(novaCatInput.trim())) { setEntradaCats(p => [...p, novaCatInput.trim()]); setNovaCatInput(""); } }}>+</button>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setShowEditCats(false)}>Cancelar</button>
                <button className="btn-s" onClick={async () => {
                  const { data: cfgEx } = await sb.from("configuracoes").select("id").eq("user_id", userId).limit(1).single();
                  if (cfgEx?.id) await sb.from("configuracoes").update({ entrada_cats: entradaCats }).eq("id", cfgEx.id);
                  setShowEditCats(false);
                  setShowAviso("Categorias salvas.");
                }}>Salvar</button>
              </div>
            </div>
          </div>
        )}
        {/* ── AURA FLOATING CHAT ── painel independente do botão */}
        {showAuraChat && (() => {
          const chatW = Math.min(400, window.innerWidth * 0.92);
          const chatH = Math.min(500, window.innerHeight * 0.75);
          const margin = 12;
          const btnH = 52;
          const btnW = 180;
          let chatTop: number | undefined, chatBottom: number | undefined, chatLeft: number | undefined, chatRight: number | undefined;
          if (auraBtnPos) {
            // Tenta abrir acima; se não couber, abre abaixo
            if (auraBtnPos.y - chatH - margin >= 8) {
              chatTop = auraBtnPos.y - chatH - margin;
            } else {
              chatTop = auraBtnPos.y + btnH + margin;
            }
            chatTop = Math.min(chatTop, window.innerHeight - chatH - 8);
            chatTop = Math.max(chatTop, 8);
            // Alinha pela direita do botão
            let cl = auraBtnPos.x + btnW - chatW;
            if (cl < 8) cl = 8;
            if (cl + chatW > window.innerWidth - 8) cl = window.innerWidth - chatW - 8;
            chatLeft = cl;
          } else {
            chatBottom = 80;
            chatRight = 16;
          }
          return (
            <div style={{ position: "fixed", zIndex: 10000, width: chatW, height: chatH,
              ...(chatTop !== undefined ? { top: chatTop } : { bottom: chatBottom }),
              ...(chatLeft !== undefined ? { left: chatLeft } : { right: chatRight }),
              background: "var(--dk2)", border: "1px solid var(--gold)", borderRadius: 14, display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,.7)", overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", background: "var(--dk3)", borderBottom: "1px solid var(--br)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>✦ {(auraName && !auraName.includes("@")) ? auraName : "Assistente"} — INK SYSTEM</div>
                  <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 1 }}>Contexto real do estúdio · Tool Use ativo</div>
                </div>
                <button onClick={() => setShowAuraChat(false)} style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {auraChatMessages.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--tx3)", textAlign: "center", marginTop: 40, lineHeight: 1.8 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
                    <div>{"Olá! Sou " + ((auraName && !auraName.includes("@")) ? auraName : "sua agente") + "."}</div>
                    <div>Posso analisar dados, executar ações e interpretar imagens.</div>
                    <div style={{ marginTop: 8, fontSize: 11 }}>📷 Envie uma foto de ficha para cadastrar clientes automaticamente.</div>
                  </div>
                )}
                {auraChatMessages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeSlideIn .18s ease both", animationDelay: "0ms" }}>
                    <div style={{ maxWidth: "82%", background: m.role === "user" ? "rgba(201,168,76,.15)" : "var(--dk3)", border: "1px solid " + (m.role === "user" ? "rgba(201,168,76,.25)" : "var(--br)"), borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--tx)", lineHeight: 1.6 }}>
                      <span style={{ whiteSpace: "pre-wrap" }} dangerouslySetInnerHTML={{ __html: String(m.content).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                    </div>
                  </div>
                ))}
                {auraChatImagem && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--gold)", display: "flex", alignItems: "center", gap: 8 }}>
                      📷 Imagem pronta para enviar
                      <button onClick={() => setAuraChatImagem(null)} style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
                    </div>
                  </div>
                )}
                {auraChatPdf && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.3)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--gold)", display: "flex", alignItems: "center", gap: 8 }}>
                      📄 {auraChatPdf.nome}
                      <button onClick={() => setAuraChatPdf(null)} style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
                    </div>
                  </div>
                )}
                {auraChatLoading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 10, padding: "8px 14px", fontSize: 12, color: "var(--tx3)" }}>✦ digitando…</div>
                  </div>
                )}
                <div ref={auraChatEndRef} />
              </div>
              <div style={{ padding: "10px 12px", borderTop: "1px solid var(--br)", display: "flex", gap: 8, flexShrink: 0 }}>
                <label style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const result = ev.target?.result as string;
                      const base64 = result.split(",")[1];
                      const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
                      setAuraChatImagem({ base64, mediaType });
                    };
                    reader.readAsDataURL(file);
                  }} />
                  <div style={{ background: auraChatImagem ? "rgba(201,168,76,.3)" : "var(--dk4)", border: "1px solid " + (auraChatImagem ? "var(--gold)" : "var(--br)"), borderRadius: 8, padding: "8px 10px", fontSize: 14, cursor: "pointer", color: auraChatImagem ? "var(--gold)" : "var(--tx3)" }}>📷</div>
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  id="auraPdfInput"
                  style={{ display: "none" }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const base64 = (ev.target?.result as string).split(",")[1];
                      setAuraChatPdf({ nome: file.name, base64 });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                <div
                  onClick={() => document.getElementById("auraPdfInput")?.click()}
                  style={{ background: auraChatPdf ? "rgba(201,168,76,.3)" : "var(--dk4)", border: "1px solid " + (auraChatPdf ? "var(--gold)" : "var(--br)"), borderRadius: 8, padding: "8px 10px", fontSize: 14, cursor: "pointer", color: auraChatPdf ? "var(--gold)" : "var(--tx3)" }}>
                  📄
                </div>
                <input
                  className="fi"
                  style={{ flex: 1, fontSize: 12 }}
                  placeholder={(auraChatImagem || auraChatPdf) ? "Adicione uma instrução (opcional)..." : "Pergunte algo ou peça uma ação..."}
                  value={auraChatInput}
                  onChange={e => setAuraChatInput(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key !== "Enter" || auraChatLoading) return;
                    if (auraChatImagem) {
                      await enviarMensagemAura(auraChatInput.trim(), auraChatImagem.base64, auraChatImagem.mediaType);
                    } else if (auraChatInput.trim() || auraChatPdf) {
                      await enviarMensagemAura();
                    }
                  }}
                />
                <button
                  disabled={(!auraChatInput.trim() && !auraChatImagem && !auraChatPdf) || auraChatLoading}
                  onClick={async () => {
                    if (auraChatImagem) {
                      await enviarMensagemAura(auraChatInput.trim(), auraChatImagem.base64, auraChatImagem.mediaType);
                    } else if (auraChatInput.trim() || auraChatPdf) {
                      await enviarMensagemAura();
                    }
                  }}
                  style={{ background: (auraChatInput.trim() || auraChatImagem || auraChatPdf) && !auraChatLoading ? "var(--gold)" : "var(--dk4)", color: (auraChatInput.trim() || auraChatImagem || auraChatPdf) && !auraChatLoading ? "#000" : "var(--tx3)", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: (auraChatInput.trim() || auraChatImagem || auraChatPdf) && !auraChatLoading ? "pointer" : "not-allowed", fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>
                  ↑
                </button>
              </div>
            </div>
          );
        })()}
        {/* ── AURA FAB BUTTON ── */}
        <div
          id="aura-fab-btn"
          style={auraBtnPos
            ? { position: "fixed", top: auraBtnPos.y, left: auraBtnPos.x, zIndex: 9999, cursor: auraDragging ? "grabbing" : "grab" }
            : { position: "fixed", bottom: "max(16px, env(safe-area-inset-bottom, 16px))", right: 16, zIndex: 9999, cursor: "grab" }}
          onMouseDown={e => { handleAuraDragStart(e.clientX, e.clientY); }}
          onTouchStart={e => { if (e.touches[0]) handleAuraDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
        >
          <button
            id="aura-fab-toggle"
            onClick={() => { if (!auraDragRef.current?.moved) setShowAuraChat(p => !p); }}
            style={{ background: showAuraChat ? "var(--dk3)" : "var(--gold)", color: showAuraChat ? "var(--tx2)" : "#000", border: "1px solid var(--gold)", borderRadius: 50, padding: "12px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 20px rgba(201,168,76,.4)", display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", animation: showAuraChat ? "none" : "goldPulse 2.5s infinite" }}>
            ✦ {(auraName && !auraName.includes("@")) ? auraName : "Configura a sua agente de IA"}
          </button>
        </div>

        {/* ── MODAL: EDITAR ETAPA DO PIPELINE ── */}
        {editingStage && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setEditingStage(null)}>
            <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 14, padding: 28, minWidth: 340, maxWidth: 420 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: "var(--gold)", marginBottom: 20 }}>✏️ Editar etapa</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--tx2)", display: "block", marginBottom: 5 }}>Nome</label>
                <input value={editStageLabel} onChange={e => setEditStageLabel(e.target.value)}
                  style={{ width: "100%", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "8px 12px", color: "var(--tx)", fontSize: 14, fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--tx2)", display: "block", marginBottom: 5 }}>Emoji</label>
                <input value={editStageEmoji} onChange={e => setEditStageEmoji(e.target.value)}
                  style={{ width: "100%", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "8px 12px", color: "var(--tx)", fontSize: 14, fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "var(--tx2)", display: "block", marginBottom: 5 }}>Cor</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="color" value={editStageCor} onChange={e => setEditStageCor(e.target.value)}
                    style={{ width: 44, height: 36, border: "none", borderRadius: 8, cursor: "pointer", background: "none" }} />
                  <input value={editStageCor} onChange={e => setEditStageCor(e.target.value)}
                    style={{ flex: 1, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "8px 12px", color: "var(--tx)", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEditingStage(null)}
                  style={{ flex: 1, padding: "10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
                  Cancelar
                </button>
                <button onClick={async () => {
                  if (!editStageLabel.trim()) return;
                  if (editingStage.dbId) {
                    await sb.from("pipeline_etapas").update({ label: editStageLabel.trim(), emoji: editStageEmoji, cor: editStageCor }).eq("id", editingStage.dbId);
                  }
                  setStages((p: any[]) => p.map((s: any) => s.id === editingStage.id ? { ...s, label: editStageLabel.trim(), emoji: editStageEmoji, color: editStageCor } : s));
                  setEditingStage(null);
                }} style={{ flex: 1, padding: "10px", background: "var(--gold)", border: "none", borderRadius: 8, color: "#111", cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: NOVA ETAPA ── */}
        {showAddStage && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowAddStage(false)}>
            <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 14, padding: 28, minWidth: 340, maxWidth: 420 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: "var(--gold)", marginBottom: 20 }}>+ Nova Etapa</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--tx2)", display: "block", marginBottom: 5 }}>Nome</label>
                <input value={newStageLabel} onChange={e => setNewStageLabel(e.target.value)} placeholder="Ex: Em negociação"
                  style={{ width: "100%", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "8px 12px", color: "var(--tx)", fontSize: 14, fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "var(--tx2)", display: "block", marginBottom: 5 }}>Emoji</label>
                <input value={newStageEmoji} onChange={e => setNewStageEmoji(e.target.value)}
                  style={{ width: "100%", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "8px 12px", color: "var(--tx)", fontSize: 14, fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "var(--tx2)", display: "block", marginBottom: 5 }}>Cor</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="color" value={newStageCor} onChange={e => setNewStageCor(e.target.value)}
                    style={{ width: 44, height: 36, border: "none", borderRadius: 8, cursor: "pointer", background: "none" }} />
                  <input value={newStageCor} onChange={e => setNewStageCor(e.target.value)}
                    style={{ flex: 1, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "8px 12px", color: "var(--tx)", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowAddStage(false)}
                  style={{ flex: 1, padding: "10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
                  Cancelar
                </button>
                <button onClick={async () => {
                  if (!newStageLabel.trim()) return;
                  const slug = "custom_" + Date.now();
                  const { data: nova, error: errNova } = await sb.from("pipeline_etapas").insert({
                    user_id: userId, slug, label: newStageLabel.trim(), cor: newStageCor, emoji: newStageEmoji, ordem: stages.length, fixo: false
                  }).select().single();
                  if (errNova) console.error("pipeline_etapas insert error:", errNova);
                  if (nova) {
                    setStages((p: any[]) => [...p, { id: slug, label: nova.label, color: nova.cor, emoji: nova.emoji, fixo: false, dbId: nova.id, ordem: nova.ordem }]);
                  }
                  setNewStageLabel(""); setNewStageEmoji("●"); setNewStageCor("#888888");
                  setShowAddStage(false);
                }} style={{ flex: 1, padding: "10px", background: "var(--gold)", border: "none", borderRadius: 8, color: "#111", cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans',sans-serif", fontSize: 13 }}>
                  Criar etapa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: CONFIRMAR EXCLUSÃO DE ETAPA ── */}
        {confirmDeleteStage && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setConfirmDeleteStage(null)}>
            <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 14, padding: 28, minWidth: 320 }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, color: "#E74C3C", marginBottom: 12 }}>Excluir etapa?</div>
              <p style={{ fontSize: 13, color: "var(--tx2)", marginBottom: 20 }}>
                A etapa <strong style={{ color: "var(--tx)" }}>{confirmDeleteStage.emoji} {confirmDeleteStage.label}</strong> será removida. Mova os clientes nela antes de excluir.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setConfirmDeleteStage(null)}
                  style={{ flex: 1, padding: "10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  Cancelar
                </button>
                <button onClick={async () => {
                  if (confirmDeleteStage.dbId) {
                    await sb.from("pipeline_etapas").delete().eq("id", confirmDeleteStage.dbId);
                  }
                  setStages((p: any[]) => p.filter((s: any) => s.id !== confirmDeleteStage.id));
                  setConfirmDeleteStage(null);
                }} style={{ flex: 1, padding: "10px", background: "#E74C3C", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: SESSÃO CONCLUÍDA — PROJETO COMPLETO? ── */}
        {agendarProximaModal && (
          <div className="ov" onClick={() => setAgendarProximaModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(460px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                ✅ Sessão concluída
              </div>
              <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.6 }}>
                Este projeto está completo ou ainda há mais sessões a realizar?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button onClick={() => {
                  const cid = agendarProximaModal.cid;
                  setAgendarProximaModal(null);
                  executarMove(cid, "pos_venda");
                }} style={{ background: "rgba(39,174,96,.12)", border: "1px solid rgba(39,174,96,.4)", borderRadius: 8, padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#27AE60", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" }}>
                  ✅ Projeto completo → Pós-Venda
                  <div style={{ fontSize: 11, fontWeight: 400, color: "rgba(39,174,96,.8)", marginTop: 3 }}>Régua de pós-venda inicia automaticamente</div>
                </button>
                <button onClick={() => {
                  const cid = agendarProximaModal.cid;
                  setAgendarProximaModal(null);
                  executarMove(cid, "aguard_agend");
                }} style={{ background: "rgba(243,156,18,.12)", border: "1px solid rgba(243,156,18,.4)", borderRadius: 8, padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#F39C12", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textAlign: "left" }}>
                  ⏰ Mais sessões → Aguardando Agendamento
                  <div style={{ fontSize: 11, fontWeight: 400, color: "rgba(243,156,18,.8)", marginTop: 3 }}>Régua específica para projetos em andamento</div>
                </button>
                <button onClick={() => setAgendarProximaModal(null)} style={{ background: "none", border: "1px solid var(--br)", borderRadius: 8, padding: "10px 16px", fontSize: 12, color: "var(--tx3)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  Cancelar
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--tx3)", textAlign: "center" }}>
                Os e-mails de cuidados de cicatrização serão enviados independente da escolha.
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: PAGAMENTO AVULSO ── */}
        {pgAvulso && (() => {
          const valorNum = parseFloat(pgAvulso.valor.replace(/\./g, "").replace(",", ".")) || 0;
          const podeContinuar = valorNum > 0;
          if (pgAvulso.fase === "form") {
            return (
              <div className="ov" onClick={() => setPgAvulso(null)}>
                <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(420px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16, animation: "slideInRight .25s ease" }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                    + Registrar pagamento
                  </div>
                  <div style={{ fontSize: 12, color: "var(--tx2)" }}>Cliente: <strong>{pgAvulso.clienteNome}</strong></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 4 }}>Valor (R$) *</div>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        value={pgAvulso.valor}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          const num = raw ? Number(raw) / 100 : 0;
                          const fmt = num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          setPgAvulso(p => p ? { ...p, valor: fmt } : p);
                        }}
                        style={{ width: "100%", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "9px 12px", fontSize: 15, fontWeight: 700, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 4 }}>Forma de pagamento</div>
                      <select
                        value={pgAvulso.forma}
                        onChange={e => setPgAvulso(p => p ? { ...p, forma: e.target.value } : p)}
                        style={{ width: "100%", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }}>
                        {["Pix", "Dinheiro", "Cartão", "Transferência", "Outro"].map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 4 }}>Observação (opcional)</div>
                      <input
                        type="text"
                        placeholder="ex: entrada da sessão 1"
                        value={pgAvulso.obs}
                        onChange={e => setPgAvulso(p => p ? { ...p, obs: e.target.value } : p)}
                        style={{ width: "100%", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "9px 12px", fontSize: 13, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn-c" onClick={() => setPgAvulso(null)}>Cancelar</button>
                    <button
                      className="btn-s"
                      style={{ opacity: podeContinuar ? 1 : 0.45, cursor: podeContinuar ? "pointer" : "not-allowed" }}
                      onClick={() => { if (podeContinuar) setPgAvulso(p => p ? { ...p, fase: "confirm" } : p); }}>
                      Continuar →
                    </button>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div className="ov" onClick={() => setPgAvulso(null)}>
              <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(420px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16, animation: "slideInRight .25s ease" }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                  Confirmar pagamento
                </div>
                <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 13, color: "var(--tx)" }}>
                    Cliente: <strong>{pgAvulso.clienteNome}</strong>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#27AE60", fontFamily: "'Cormorant Garamond',serif" }}>
                    {"R$ " + valorNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--tx2)" }}>Forma: <strong>{pgAvulso.forma}</strong></div>
                  {pgAvulso.obs && <div style={{ fontSize: 12, color: "var(--tx2)", fontStyle: "italic" }}>{pgAvulso.obs}</div>}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-c" onClick={() => setPgAvulso(p => p ? { ...p, fase: "form" } : p)}>← Voltar</button>
                  <button className="btn-s" onClick={async () => {
                    const hoje = new Date();
                    const dataISO = hoje.toISOString().split("T")[0];
                    const competencia = dataISO.slice(0, 7);
                    const descricao = "Pagamento avulso" + (pgAvulso.obs ? " — " + pgAvulso.obs : "");
                    const novaEntrada = {
                      cliente_id: pgAvulso.clienteId,
                      cliente_nome: pgAvulso.clienteNome,
                      artista: pgAvulso.artistaId,
                      val_a: valorNum,
                      pgto: pgAvulso.forma,
                      data: dataISO,
                      competencia,
                      categoria: "sessao",
                      descricao,
                      tipo: "entrada",
                      is_permuta: false,
                      user_id: userId,
                    };
                    try {
                      const { data: inserted, error: insertErr } = await sb.from("financeiro").insert(novaEntrada).select().single();
                      if (insertErr) {
                        setShowAviso("❌ Erro ao registrar pagamento: " + (insertErr.message || "verifique sua conexão e tente novamente."));
                        return;
                      }
                      const row = { ...(inserted || novaEntrada), id: inserted?.id, cliente: pgAvulso.clienteNome };
                      setFin((p: any[]) => [...p, row]);
                      try {
                        const dataStr = hoje.toLocaleDateString("pt-BR");
                        const horaStr = hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                        await sb.from("historico").insert({ data: dataStr, hora: horaStr, acao: "Pagamento avulso registrado — R$ " + valorNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " (" + pgAvulso.forma + ") — " + pgAvulso.clienteNome, user_id: userId });
                      } catch {}
                      setPgAvulso(null);
                      setShowAviso("✅ Pagamento de R$ " + valorNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + " registrado com sucesso.");
                    } catch (e: any) {
                      setShowAviso("❌ Erro ao registrar pagamento: " + (e?.message || "verifique sua conexão e tente novamente."));
                    }
                  }}>
                    Confirmar registro
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MODAL: AGENDAR PRÓXIMA SESSÃO? ── */}
        {proximaSessaoModal && (
          <div className="ov" onClick={() => setProximaSessaoModal(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(440px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                📅 Próxima Sessão
              </div>
              <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.6 }}>
                Deseja agendar a próxima sessão agora?
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => {
                  const { cid } = proximaSessaoModal;
                  setProximaSessaoModal(null);
                  const cli = clients.find((c: any) => c.id === cid);
                  if (cli) {
                    setAgClientVinc(cli);
                    setEditingEvent(null);
                    setAgClientSearch("");
                    setSessoesExtras([]);
                    setAgForm({ title: cli.nome, desc: "", tipo: "sess_" + (cli.artista || artists[0]?.id || ""), date: "", start: 9, end: 11, sinal: "", sinalPago: false, servico: "" } as any);
                    setShowAgForm(true);
                  }
                }} style={{ flex: 1, background: "rgba(201,168,76,.15)", border: "1px solid rgba(201,168,76,.4)", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  Sim, agendar agora
                </button>
                <button onClick={() => {
                  setProximaSessaoModal(null);
                }} style={{ flex: 1, background: "rgba(100,100,100,.12)", border: "1px solid var(--br)", borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  Não agora
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--tx3)", textAlign: "center" }}>
                O cliente permanece na etapa atual até a próxima sessão ser realizada.
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: CONFIRMAR DISPARO ── */}
        {confirmDisparo && (
          <div className="ov" onClick={() => setConfirmDisparo(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(480px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>
                📣 Confirmar Disparo
              </div>
              <div style={{ background: "var(--dk3)", borderRadius: 8, padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em" }}>Segmento</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>{confirmDisparo.segmento}</div>
                <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 4 }}>
                  {confirmDisparo.clientes.length} destinatário{confirmDisparo.clientes.length !== 1 ? "s" : ""}: {confirmDisparo.clientes.map((c: any) => c.nome.split(" ")[0]).slice(0, 5).join(", ")}{confirmDisparo.clientes.length > 5 ? " +" + (confirmDisparo.clientes.length - 5) + " outros" : ""}
                </div>
              </div>
              <div style={{ background: "var(--dk3)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Mensagem</div>
                <div style={{ fontSize: 12, color: "var(--tx2)", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 150, overflowY: "auto" }}>{confirmDisparo.mensagem}</div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setConfirmDisparo(null)}
                  style={{ flex: 1, background: "none", border: "1px solid var(--br)", borderRadius: 8, padding: "11px", fontSize: 13, color: "var(--tx3)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  Cancelar
                </button>
                <button onClick={() => {
                  disparar(confirmDisparo.clientes, confirmDisparo.mensagem, confirmDisparo.segmento);
                  setConfirmDisparo(null);
                }}
                  style={{ flex: 2, background: "var(--gold)", border: "none", borderRadius: 8, padding: "11px", fontSize: 13, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                  📣 Confirmar e Disparar
                </button>
              </div>
            </div>
          </div>
        )}

    </>
  );
}