import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPA_URL = "https://rajophuwwxynkdpxjzey.supabase.co";
const SUPA_KEY = "sb_publishable_YxW3K62M-aYXetcPxBqwtA_JUFMSaG4";
const sb = createClient(SUPA_URL, SUPA_KEY);

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

// ─── THEME ───────────────────────────────────────────────────────────────────
const DARK = {
  "--dk": "#0E0E0E", "--dk2": "#161616", "--dk3": "#1E1E1E",
  "--dk4": "#272727", "--dk5": "#303030", "--tx": "#E8E2D9",
  "--tx2": "#8A8070", "--tx3": "#555045",
  "--br": "rgba(201,168,76,0.12)", "--brh": "rgba(201,168,76,0.35)"
};
const LIGHT = {
  "--dk": "#E8E0D5", "--dk2": "#DDD4C7", "--dk3": "#D3C9BA",
  "--dk4": "#C8BCAB", "--dk5": "#BBAD9A", "--tx": "#1A1714",
  "--tx2": "#4A3F35", "--tx3": "#7A6E63",
  "--br": "rgba(100,70,30,0.18)", "--brh": "rgba(100,70,30,0.45)"
};

function applyTheme(dark: boolean) {
  const v = dark ? DARK : LIGHT;
  Object.entries(v).forEach(([k, val]) =>
    document.documentElement.style.setProperty(k, val)
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --gold:#C9A84C;--gold-l:#E8C97A;--gold-d:rgba(201,168,76,0.13);
  --q0:#8E44AD;--q1:#C0392B;--q2:#D4820A;--q3:#27AE60;
  --ab:#4A9EBF;--ca:#9B6BB5;
}
body{background:var(--dk);color:var(--tx);font-family:'DM Sans',sans-serif;}
.root{min-height:100vh;background:var(--dk);display:flex;flex-direction:column;}@media(max-width:768px){.kc{min-width:80vw!important;max-width:80vw!important;}.fmod{max-width:96vw!important;}.fr{flex-direction:column;}.fi,.fs{font-size:14px;padding:9px 11px;}}@media(max-width:480px){.kc{min-width:90vw!important;max-width:90vw!important;}}
.topbar{background:var(--dk2);border-bottom:1px solid var(--br);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.bmark{width:30px;height:30px;background:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:700;color:#000;}
.bname{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;letter-spacing:.08em;color:var(--tx);}
.bsub{font-size:10px;letter-spacing:.15em;color:var(--gold);text-transform:uppercase;}
.tbr{display:flex;align-items:center;gap:8px;}
.theme-btn{background:var(--dk3);border:1px solid var(--br);border-radius:20px;padding:5px 11px;cursor:pointer;font-size:12px;color:var(--tx2);}
.btn-new{background:var(--gold);color:#000;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;}
.btn-new:hover{background:var(--gold-l);}
.alert-btn{background:rgba(212,130,10,.15);border:1px solid rgba(212,130,10,.3);border-radius:6px;padding:4px 10px;font-size:11px;color:#D4820A;font-weight:600;cursor:pointer;}
.alert-drop{position:absolute;top:calc(100% + 8px);right:0;width:min(360px,calc(100vw - 16px));background:var(--dk2);border:1px solid var(--br);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:9999;}
.ad-hdr{padding:10px 14px;background:var(--dk3);border-bottom:1px solid var(--br);border-radius:10px 10px 0 0;font-size:12px;font-weight:600;color:var(--tx);}
.ad-body{max-height:320px;overflow-y:auto;padding:8px;}
.ad-item{padding:8px 10px;background:var(--dk3);border:1px solid var(--br);border-radius:7px;margin-bottom:5px;cursor:pointer;}
.ad-item:hover{border-color:var(--brh);}
.ad-name{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:var(--tx);margin-bottom:3px;}
.ad-tags{display:flex;gap:3px;flex-wrap:wrap;}
.tabs{background:var(--dk2);border-bottom:1px solid var(--br);display:flex;padding:0 20px;overflow-x:auto;}
.tab{padding:12px 13px;font-size:12px;font-weight:500;color:var(--tx2);cursor:pointer;border:none;background:none;font-family:'DM Sans',sans-serif;border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:5px;}
.tab.on{color:var(--gold);border-bottom-color:var(--gold);}
.stats{display:flex;gap:1px;background:var(--br);border-bottom:1px solid var(--br);}
.si{flex:1;background:var(--dk2);padding:11px 14px;display:flex;align-items:center;gap:9px;}
.sico{width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;}
.sv{font-size:19px;font-weight:600;color:var(--tx);font-family:'Cormorant Garamond',serif;line-height:1;}
.sl{font-size:10px;color:var(--tx2);text-transform:uppercase;letter-spacing:.08em;margin-top:2px;}
.ctrl{padding:11px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:var(--dk2);border-bottom:1px solid var(--br);}
.srch{background:var(--dk3);border:1px solid var(--br);border-radius:6px;color:var(--tx);padding:7px 11px;font-size:12px;font-family:'DM Sans',sans-serif;width:190px;outline:none;}
.srch:focus{border-color:var(--gold);}
.srch::placeholder{color:var(--tx3);}
.fb{background:var(--dk3);border:1px solid var(--br);border-radius:6px;color:var(--tx2);padding:6px 11px;font-size:11px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;}
.fb.on{background:var(--gold-d);border-color:var(--gold);color:var(--gold);}
.kw{flex:1;overflow-x:auto;padding:14px;display:flex;gap:11px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}.kw::-webkit-scrollbar{display:none;}.kw-scroll-mirror::-webkit-scrollbar{height:4px;}.kw-scroll-mirror::-webkit-scrollbar-track{background:var(--dk3);}.kw-scroll-mirror::-webkit-scrollbar-thumb{background:var(--gold);border-radius:2px;}.kc{min-width:215px;max-width:215px;display:flex;flex-direction:column;gap:6px;}

.kh{padding:8px 11px;border-radius:7px 7px 0 0;background:var(--dk3);border:1px solid var(--br);border-bottom:2px solid;display:flex;align-items:center;justify-content:space-between;}
.kt{font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;}
.kn{font-size:11px;font-weight:700;background:var(--dk4);border-radius:9px;padding:2px 6px;color:var(--tx2);}
.kb{background:var(--dk3);border:1px solid var(--br);border-top:none;border-radius:0 0 7px 7px;padding:7px;display:flex;flex-direction:column;gap:6px;min-height:70px;flex:1;}
.ke{text-align:center;color:var(--tx3);font-size:11px;padding:14px 6px;font-style:italic;}
.card{background:var(--dk4);border:1px solid var(--br);border-radius:7px;padding:9px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
.card:hover{border-color:var(--brh);transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,.4);}
.ctop{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:5px;}
.cname{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:var(--tx);line-height:1.2;}
.qb{font-size:9px;font-weight:700;letter-spacing:.05em;border-radius:4px;padding:2px 5px;text-transform:uppercase;flex-shrink:0;}
.q0c{background:rgba(142,68,173,.2);color:var(--q0);border:1px solid rgba(142,68,173,.3);}
.q1c{background:rgba(192,57,43,.2);color:var(--q1);border:1px solid rgba(192,57,43,.3);}
.q2c{background:rgba(212,130,10,.2);color:var(--q2);border:1px solid rgba(212,130,10,.3);}
.q3c{background:rgba(39,174,96,.2);color:var(--q3);border:1px solid rgba(39,174,96,.3);}
.cst{font-size:11px;color:var(--tx2);margin-bottom:5px;}
.cft{display:flex;align-items:center;justify-content:space-between;margin-top:5px;padding-top:5px;border-top:1px solid var(--br);}
.at{font-size:10px;font-weight:600;letter-spacing:.04em;padding:2px 6px;border-radius:9px;text-transform:uppercase;}
.at-abraao{background:rgba(74,158,191,.15);color:var(--ab);border:1px solid rgba(74,158,191,.25);}
.at-camilla{background:rgba(155,107,181,.15);color:var(--ca);border:1px solid rgba(155,107,181,.25);}
.cd{font-size:10px;color:var(--tx3);}
.cor{font-size:10px;color:var(--tx3);margin-top:3px;}
.ar{display:flex;gap:3px;margin-top:4px;flex-wrap:wrap;}
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
.fsum{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
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
.wh{background:var(--dk3);padding:7px 5px;text-align:center;font-size:11px;font-weight:600;color:var(--tx2);border-bottom:1px solid var(--br);border-right:1px solid var(--br);}
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
.settings-modal{background:var(--dk2);border:1px solid var(--br);border-radius:11px;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;}
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
`;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "lead", label: "Lead", color: "#5B8DEF", emoji: "🎯" },
  { id: "qualificacao", label: "Qualificação", color: "#C9A84C", emoji: "🔍" },
  { id: "cons_agendada", label: "Consulta Marcada", color: "#9B6BB5", emoji: "📅" },
  { id: "sessao_agend", label: "Sessão Agendada", color: "#4A9EBF", emoji: "✏️" },
  { id: "tatuado", label: "Sessão Realizada", color: "#27AE60", emoji: "✅" },
  { id: "pos_venda", label: "Pós-venda", color: "#E67E22", emoji: "💬" },
  { id: "lista_espera", label: "Lista de Espera", color: "#3498DB", emoji: "⏳" },
  { id: "hibernacao", label: "Hibernação", color: "#666", emoji: "💤" },
  { id: "blacklist", label: "Blacklist", color: "#C0392B", emoji: "🚫" },
];

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

const CAL_COLORS: Record<string, string> = {
  cons_abraao: "#4A9EBF",
  sess_abraao: "#4A9EBF",
  cons_camilla: "#9B6BB5",
  sess_camilla: "#9B6BB5",
  // Dynamic colors override below via getEventColor
  bloq_abraao: "#C0392B",
  bloq_camilla: "#C0392B",
  bloq_geral: "#555",
  piercing: "#E91E8C"
};

function getEventColor(tipo: string, artists: any[], artistaId?: string): string {
  if (!tipo) return "#888";
  if (tipo === "bloq_geral") return "#555";
  if (tipo === "piercing") return "#E91E8C";
  // Usa o campo artista do evento se disponível, senão extrai do tipo
  const id = artistaId || tipo.replace("cons_", "").replace("sess_", "").replace("bloq_", "");
  const artist = artists.find(a => a.id === id);
  if (artist?.cor) return artist.cor;
  return CAL_COLORS[tipo] || "#888";
}

const CAL_LABELS: Record<string, string> = {
  cons_abraao: "Consulta Abraão",
  sess_abraao: "Sessão Abraão",
  cons_camilla: "Consulta Camilla",
  sess_camilla: "Sessão Camilla",
  bloq_abraao: "Bloq. Abraão",
  bloq_camilla: "Bloq. Camilla",
  bloq_geral: "Bloq. Geral",
  piercing: "Piercing"
};
const getBloqLabel = (tipo: string, artistsList: any[]) => {
  if (tipo === "bloq_geral") return "TODOS";
  if (tipo.startsWith("bloq_")) {
    const artId = tipo.replace("bloq_","");
    const art = artistsList.find(a => a.id === artId);
    return art ? "Bloqueio " + art.nome.split(" ")[0] : "Bloqueio";
  }
  return CAL_LABELS[tipo] || tipo;
};
const getBloqColor = (tipo: string, artistsList: any[]) => {
  if (tipo === "bloq_geral") return "#C0392B";
  if (tipo.startsWith("bloq_")) {
    const artId = tipo.replace("bloq_","");
    const art = artistsList.find(a => a.id === artId);
    return art?.cor || "#888";
  }
  return "#888";
};
const getEventLabel = (tipo: string, artistsList?: any[]) => {
  if (CAL_LABELS[tipo]) return CAL_LABELS[tipo];
  if (artistsList) {
    const prefix = tipo.startsWith("cons_") ? "Consulta" : tipo.startsWith("sess_") ? "Sessão" : null;
    const artId = tipo.replace("cons_","").replace("sess_","");
    const art = artistsList.find(a => a.id === artId);
    if (prefix && art) return `${prefix} ${art.nome.split(" ")[0]}`;
  }
  return tipo;
};

const SEGS = [
  { id: "todos", label: "Todos", desc: "Toda a base", icon: "👥", f: () => true },
  { id: "q0", label: "Q0 - Presencial", desc: "Estiveram no atelier", icon: "🟣", f: (c: any) => c.qual === "Q0" },
  { id: "q1", label: "Q1 - Frios", desc: "Nutricao e educacao", icon: "🔴", f: (c: any) => c.qual === "Q1" },
  { id: "q2", label: "Q2 - Quentes", desc: "Prontos para avancar", icon: "🟡", f: (c: any) => c.qual === "Q2" },
  { id: "tatuados", label: "Tatuados", desc: "Ja fizeram sessao", icon: "🖤", f: (c: any) => c.etapa === "tatuado" || c.etapa === "pos_venda" },
  { id: "primeira", label: "Primeira Tattoo", desc: "Primeira vez", icon: "✨", f: (c: any) => c.primeira },
  { id: "abraao", label: "Clientes Abraão", desc: "Direcionados ao Abraão", icon: "🔵", f: (c: any) => c.artista === "abraao" },
  { id: "camilla", label: "Clientes Camilla", desc: "Direcionados a Camilla", icon: "🟣", f: (c: any) => c.artista === "camilla" },
  { id: "google", label: "Avaliacao Google", desc: "Tatuados sem avaliacao", icon: "⭐", f: (c: any) => (c.etapa === "tatuado" || c.etapa === "pos_venda") && !c.googleReview },
  { id: "retorno", label: "Retorno Sazonal", desc: "Tatuados ha mais de 6 meses", icon: "🔄", f: (c: any) => (c.etapa === "tatuado" || c.etapa === "pos_venda") && c.dias >= 180 },
];

const DATAS = [
  { id: "maes", label: "Dia das Maes", data: "11 Mai", icon: "🌸" },
  { id: "namorados", label: "Namorados", data: "12 Jun", icon: "💝" },
  { id: "pais", label: "Dia dos Pais", data: "10 Ago", icon: "👨‍👦" },
  { id: "natal", label: "Natal", data: "25 Dez", icon: "🎄" },
  { id: "anoNovo", label: "Ano Novo", data: "01 Jan", icon: "🎆" },
  { id: "aniversario", label: "Aniversarios", data: "Mensal", icon: "🎂" },
  { id: "aniAbraao", label: "Aniv. Abraao (30/Nov)", data: "30 Nov", icon: "🎉" },
  { id: "aniCamilla", label: "Aniv. Camilla (26/Jun)", data: "26 Jun", icon: "🎉" },
  { id: "diaTatuador", label: "Dia do Tatuador", data: "10 Dez", icon: "🖋️" },
];

const MSGS: Record<string, string> = {
  todos: "Olá, [Nome]\n\nA Casa dos Carvalho tem algo especial esperando por voce.\n\nSe a sua ideia ainda esta guardada, talvez seja hora de tira-la do papel.",
  q0: "Olá, [Nome]\n\nQue bom ter te recebido aqui.\n\nA arte que voce viu sendo criada foi feita com muito cuidado. Se algum dia quiser criar a sua, será uma honra.",
  q1: "Olá, [Nome]\n\nA Casa dos Carvalho não tem pressa - tem comprometimento com projetos que fazem sentido para quem os carrega na pele.",
  q2: "Olá, [Nome]\n\nVoce chegou com uma ideia linda - e ela ficou guardada com a gente.\n\nSeria um prazer evoluir essa conversa juntos.",
  tatuados: "Olá, [Nome]\n\nEspero que sua arte esteja linda e bem cuidada. Se a proxima ideia ja esta nascendo, você sabe onde nos encontrar.",
  homenagem: "Olá, [Nome]\n\nNessa época especial, lembramos de voce e da arte que escolheu eternizar na sua pele.",
  primeira: "Olá, [Nome]\n\nTodo começo é especial - e o seu ficou guardado com muito carinho.\n\nSe a segunda ideia está surgindo, será uma honra.",
  abraao: "Olá, [Nome]\n\nO Abraão tem novidades no atelier e pensou em voce.\n\nQuando quiser conversar, e so chamar.",
  camilla: "Olá, [Nome]\n\nA Camilla tem algo especial se formando e pensou em voce.",
  maes: "Olá, [Nome]\n\nFeliz Dia das Mães.\n\nAlgumas memorias merecem ser eternas. A Casa dos Carvalho esta aqui para transformar esse sentimento em arte.",
  namorados: "Olá, [Nome]\n\nFeliz Dia dos Namorados.\n\nA Casa dos Carvalho transforma amor em arte.",
  pais: "Olá, [Nome]\n\nFeliz Dia dos Pais.\n\nSe existe uma homenagem guardada no coracao - talvez esse seja o momento certo.",
  natal: "Olá, [Nome]\n\nQue esse Natal seja cheio de momentos que voce vai querer guardar para sempre.",
  anoNovo: "Olá, [Nome]\n\nUm novo ano carrega novas histórias. A Casa dos Carvalho esta pronta para fazer acontecer.",
  aniAbraao: "Olá, [Nome]\n\nHoje é um dia muito especial para a Casa dos Carvalho - é o aniversário do Abraão.\n\nE como todo bom aniversario, quem ganha presente e voce.\n\nPreparamos uma condicao exclusiva para celebrar esse dia juntos. Quando quiser saber mais, e so me chamar.",
  aniCamilla: "Olá, [Nome]\n\nHoje a Casa dos Carvalho celebra o aniversário da Camilla.\n\nE a melhor forma de comemorar e presentear quem faz parte da nossa historia.\n\nTemos algo especial reservado para voce. Quando quiser saber mais, e so me chamar.",
  aniversario: "Olá, [Nome]\n\nHoje é um dia muito especial - e a Casa dos Carvalho quer fazer parte dele.\n\nComo presente: 50% de desconto na sua próxima tatuagem, válido por 15 dias.\n\nQuando quiser saber mais, e so chamar.",
  google: "Olá, [Nome]\n\nEspero que sua tatuagem esteja linda e bem cuidada.\n\nSe sua experiencia na Casa dos Carvalho foi especial, sua avaliação no Google faz toda a diferença para nós crescermos juntos.\n\nLeva só 1 minutinho: [LINK_GOOGLE]\n\nObrigado de coração.",
  diaTatuador: "Olá, [Nome]\n\nHoje é o Dia do Tatuador - e a Casa dos Carvalho tem muito a celebrar.\n\nObrigado por fazer parte dessa historia. Cada arte que criamos juntos e uma memoria que voce carrega para sempre.",
  retorno: "Olá, [Nome]\n\nFaz um tempo que não nos vemos por aqui.\n\nA Casa dos Carvalho esta com novidades e seria uma honra continuar a sua historia com a gente. Quando quiser conversar, e so chamar.",
};

// ─── POS-VENDA FLOW ───────────────────────────────────────────────────────────
const PV_FLOW = [
  { id: "d0", label: "Dia da sessao", dias: 0, msg: "Olá, [Nome]! Obrigado por confiar na Casa dos Carvalho. Como foi sua experiencia hoje? Estamos aqui se precisar de qualquer coisa." },
  { id: "d1", label: "D+1 Cicatrizacao", dias: 1, msg: "Olá, [Nome]! Como esta sua tatuagem hoje? Lembre-se: mantenha hidratada, evite sol direto e não fure as bolhas se aparecerem. Qualquer dúvida, e so chamar." },
  { id: "d7", label: "D+7 Saude", dias: 7, msg: "Olá, [Nome]! Uma semana ja! Como está cicatrizando? Se notar vermelhidão, inchaço ou secrecao, nos avise imediatamente." },
  { id: "d7g", label: "D+7 Avaliacao Google", dias: 7, msg: "Olá, [Nome]! Se sua experiencia na Casa dos Carvalho foi especial, sua avaliação no Google faz toda a diferenca para nos. Leva só 1 minutinho: [LINK_GOOGLE]" },
  { id: "d30", label: "D+30 Garantia", dias: 30, msg: "Olá, [Nome]! Seu retoque gratuito vence em 7 dias. Se quiser agendar, e so nos chamar. Apos o dia 37, o retoque será cobrado normalmente." },
  { id: "d37", label: "D+37 Ultimo dia", dias: 37, msg: "Olá, [Nome]! Hoje é o último dia da sua garantia de retoque gratuito. Se precisar, nos chame agora. Depois disso, o retoque será cobrado a combinar." },
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
In-Quadra Ink System - ${sName}

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

Cliente: ${nome} | Artista: ${artista}
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
O cliente autoriza o uso de fotos da tatuagem para portfolio e redes sociais da Casa dos Carvalho, salvo solicitacao contraria registrada formalmente.

6. REAGENDAMENTO
O cliente pode reagendar sem cobranca desde que avise com minimo de 24 horas de antecedencia.

Ao responder CONFIRMO, o cliente declara estar de acordo com todos os termos acima.

Casa dos Carvalho - In-Quadra Ink System`;
}

// ─── INITIAL DATA ─────────────────────────────────────────────────────────────
const ARTISTS_INIT = [
  {
    id: "abraao", nome: "Abraão Carvalho", role: "residente", com: 60,
    cor: "#4A9EBF", ativo: true, insta: "@abraaotattoo",
    email: "abraao@casadoscarvalho.com", tel: "(27) 99999-0001"
  },
  {
    id: "camilla", nome: "Camilla Carvalho", role: "residente", com: 60,
    cor: "#9B6BB5", ativo: true, insta: "@camillatattoo",
    email: "camilla@casadoscarvalho.com", tel: "(27) 99999-0002"
  },
];

const CLIENTS_INIT = [
  {
    id: 1, nome: "Marina Alves", tel: "(27) 99812-3456", email: "marina@email.com",
    insta: "@marina.ink", qual: "Q3", artista: "abraao", etapa: "cons_agendada",
    estilo: "Fine Line Floral", regiao: "Antebr", tam: "Medio", orig: "Instagram Organico",
    cri: "Post Portfolio", data: "28/05/2026", dias: 2, intencao: "Homenagem a mae",
    primeira: false, cob: false, desc: "Rosa delicada com nomes em caligrafia",
    stars: 0, starReason: "", consent: null, nps: null, obs: "", val_a: 0, val_c: 0,
    pgto: "", orcamento: false, contrato: false, faltas: 0, indicacoes: 0, credito: 0,
    hist: [
      { t: "Aura iniciou atendimento", d: "28/05 14h" },
      { t: "Q3 definido", d: "28/05 14h22" },
      { t: "Consultoria agendada 04/06 as 14h", d: "28/05 14h35" }
    ],
    pv: []
  },
  {
    id: 2, nome: "Carlos Mendes", tel: "(27) 99723-9900", email: "", insta: "@c.mendes",
    qual: "Q2", artista: "camilla", etapa: "qualificacao", estilo: "Black Work",
    regiao: "Costela", tam: "Grande", orig: "Trafego Pago", cri: "Stories",
    data: "27/05/2026", dias: 3, intencao: "Estetica pura", primeira: true, cob: false,
    desc: "Mandala geometrica fechando costela", stars: 0, starReason: "", consent: null,
    nps: null, obs: "", val_a: 0, val_c: 0, pgto: "", orcamento: false, contrato: false,
    faltas: 0, indicacoes: 0, credito: 0,
    hist: [
      { t: "Aura iniciou atendimento", d: "27/05 10h" },
      { t: "Q2 definido", d: "27/05 10h40" }
    ],
    pv: []
  },
  {
    id: 3, nome: "Fernanda Costa", tel: "(27) 99600-4411", email: "fer@email.com",
    insta: "", qual: "Q1", artista: "abraao", etapa: "qualificacao", estilo: "Realismo",
    regiao: "Panturrilha", tam: "Grande", orig: "Indicação", cri: "",
    data: "25/05/2026", dias: 5, intencao: "Estetica pura", primeira: false, cob: false,
    desc: "Retrato realista de cachorro", stars: 0, starReason: "", consent: null,
    nps: null, obs: "", val_a: 0, val_c: 0, pgto: "", orcamento: false, contrato: false,
    faltas: 0, indicacoes: 0, credito: 0,
    hist: [
      { t: "Aura iniciou atendimento", d: "25/05 09h" },
      { t: "Q1 nutricao iniciada", d: "25/05 09h30" }
    ],
    pv: []
  },
  {
    id: 4, nome: "Rafael Sousa", tel: "(27) 99501-7788", email: "rafa@email.com",
    insta: "@rafa.s", qual: "Q3", artista: "abraao", etapa: "sessao_agend",
    estilo: "Surrealismo", regiao: "Braco inteiro", tam: "Fechamento", orig: "Trafego Pago",
    cri: "Reels", data: "20/05/2026", dias: 10, intencao: "Autoral", primeira: false,
    cob: false, desc: "Manga surrealista com relogio derretido", stars: 0, starReason: "",
    consent: null, nps: null, obs: "", val_a: 0, val_c: 0, pgto: "", orcamento: true,
    contrato: false, faltas: 0, indicacoes: 0, credito: 0,
    hist: [
      { t: "Aura iniciou atendimento", d: "20/05 16h" },
      { t: "Q3 definido", d: "20/05 16h45" },
      { t: "Consultoria realizada", d: "23/05 15h" },
      { t: "Sessão 1 agendada: 10/06 as 09h", d: "23/05 15h30" }
    ],
    pv: []
  },
  {
    id: 5, nome: "Juliana Ferreira", tel: "(27) 99388-2255", email: "ju@email.com",
    insta: "@ju.ferro", qual: "Q3", artista: "camilla", etapa: "tatuado",
    estilo: "Fine Line Botanico", regiao: "Clavicula", tam: "Medio", orig: "Instagram Organico",
    cri: "Post", data: "10/05/2026", dias: 20, intencao: "Autoestima", primeira: true,
    cob: false, desc: "Ramo de lavanda com traco fino", stars: 5, starReason: "Excelente",
    consent: true, nps: 10, obs: "Cliente incrivel", val_a: 800, val_c: 800, pgto: "Pix",
    orcamento: false, contrato: true, faltas: 0, indicacoes: 0, credito: 0,
    hist: [
      { t: "Aura iniciou atendimento", d: "10/05 11h" },
      { t: "Q3", d: "10/05 11h30" },
      { t: "Consultoria realizada", d: "14/05 10h" },
      { t: "Sessão realizada", d: "22/05 09h" },
      { t: "NPS: 10", d: "23/05" }
    ],
    pv: [
      { l: "Dia da sessao", s: "done" },
      { l: "D+1 Cicatrizacao", s: "done" },
      { l: "D+7 Saude", s: "pending" },
      { l: "D+30 Garantia", s: "future" },
      { l: "1 Ano", s: "future" }
    ]
  },
  {
    id: 6, nome: "Pedro Araujo", tel: "(27) 99200-6644", email: "pedro@email.com",
    insta: "@pedro.a", qual: "Q2", artista: "abraao", etapa: "lead", estilo: "Tribal",
    regiao: "Ombro", tam: "Medio", orig: "Google", cri: "", data: "29/05/2026", dias: 1,
    intencao: "Identidade", primeira: false, cob: true, desc: "Tribal cobrindo tattoo antiga",
    stars: 0, starReason: "", consent: null, nps: null, obs: "", val_a: 0, val_c: 0,
    pgto: "", orcamento: false, contrato: false, faltas: 0, indicacoes: 0, credito: 0,
    hist: [{ t: "Aura iniciou atendimento - cobertura", d: "29/05 08h" }],
    pv: []
  },
  {
    id: 7, nome: "Amanda Oliveira", tel: "(27) 99111-3377", email: "amanda@email.com",
    insta: "@amanda.o", qual: "Q3", artista: "camilla", etapa: "pos_venda",
    estilo: "Aquarela", regiao: "Costas", tam: "Grande", orig: "Trafego Pago",
    cri: "Feed", data: "01/05/2026", dias: 29, intencao: "Transformacao", primeira: false,
    cob: false, desc: "Borboleta em aquarela nas costas", stars: 4, starReason: "Boa experiencia",
    consent: true, nps: 9, obs: "", val_a: 2200, val_c: 2200, pgto: "Cartao",
    orcamento: false, contrato: true, faltas: 0, indicacoes: 0, credito: 0,
    hist: [
      { t: "Aura iniciou atendimento", d: "01/05 13h" },
      { t: "Sessão realizada", d: "15/05 10h" }
    ],
    pv: [
      { l: "Dia da sessao", s: "done" },
      { l: "D+1 Cicatrizacao", s: "done" },
      { l: "D+7 Saude", s: "done" },
      { l: "D+30 Garantia", s: "pending" },
      { l: "1 Ano", s: "future" }
    ]
  },
  {
    id: 8, nome: "Lucas Barros", tel: "(27) 99044-8811", email: "lucas@email.com",
    insta: "@lucasb", qual: "Q1", artista: "abraao", etapa: "hibernacao",
    estilo: "Geometrico", regiao: "Pescoco", tam: "Pequeno", orig: "Instagram Organico",
    cri: "", data: "15/04/2026", dias: 45, intencao: "Estetica", primeira: false, cob: false,
    desc: "Figura geometrica no pescoco", stars: 0, starReason: "", consent: null,
    nps: null, obs: "", val_a: 0, val_c: 0, pgto: "", orcamento: false, contrato: false,
    faltas: 0, indicacoes: 0, credito: 0,
    hist: [
      { t: "Aura iniciou atendimento", d: "15/04 17h" },
      { t: "Q1", d: "15/04 17h20" },
      { t: "Hibernação", d: "14/05" }
    ],
    pv: []
  },
  {
    id: 9, nome: "Beatriz Souza", tel: "(27) 99777-5544", email: "bia@email.com",
    insta: "@bia.souza", qual: "Q3", artista: "camilla", etapa: "lista_espera",
    estilo: "Fine Line", regiao: "Costela", tam: "Medio", orig: "Indicação", cri: "",
    data: "28/05/2026", dias: 2, intencao: "Autoestima", primeira: true, cob: false,
    desc: "Frase minimalista em fine line", stars: 0, starReason: "", consent: null,
    nps: null, obs: "Agenda lotada", val_a: 0, val_c: 0, pgto: "", orcamento: false,
    contrato: false, faltas: 0, indicacoes: 0, credito: 0,
    hist: [
      { t: "Aura iniciou atendimento", d: "28/05 15h" },
      { t: "Q3 - lista de espera", d: "28/05 15h40" }
    ],
    pv: []
  },
  {
    id: 10, nome: "Sofia Martins", tel: "(27) 99888-1122", email: "", insta: "",
    qual: "Q0", artista: "camilla", etapa: "qualificacao", estilo: "", regiao: "",
    tam: "", orig: "Presencial", cri: "", data: "29/05/2026", dias: 1, intencao: "",
    primeira: true, cob: false, desc: "Veio acompanhar a amiga.", stars: 0, starReason: "",
    consent: null, nps: null, obs: "Acompanhou sessao da Juliana", val_a: 0, val_c: 0,
    pgto: "", orcamento: false, contrato: false, faltas: 0, indicacoes: 0, credito: 0,
    hist: [{ t: "Cadastro manual - acompanhante", d: "29/05 11h" }],
    pv: []
  },
];

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
function maskTel(v: string) {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v.length ? "(" + v : v;
  if (v.length <= 7) return "(" + v.slice(0,2) + ") " + v.slice(2);
  if (v.length <= 11) return "(" + v.slice(0,2) + ") " + v.slice(2,7) + "-" + v.slice(7);
  return v;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function CRM() {
  // ── LOGIN ──
  const [logado, setLogado] = useState(() => {
    const t = localStorage.getItem("inq_auth");
    if (!t) return false;
    return (Date.now() - Number(t)) < 8 * 60 * 60 * 1000;
  });
  const [loginSenha, setLoginSenha] = useState("");
  const [loginErro, setLoginErro] = useState(false);

  // ── TOUR ──
  const [tourAtivo, setTourAtivo] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const TOUR_STEPS = [
    { sel: ".topbar", title: "Topbar", desc: "Aqui ficam o logo do seu estúdio, o botão de alertas e o acesso às configurações." },
    { sel: ".tabs", title: "Abas de Navegação", desc: "Pipeline, Clientes, Agenda, Financeiro, Artistas e mais. Clique para navegar entre as seções." },
    { sel: ".kw", title: "Pipeline Kanban", desc: "Cada coluna representa uma etapa do cliente. Arraste ou clique nos botões da ficha para mover." },
    { sel: ".btn-new", title: "Novo Cliente", desc: "Cadastre um novo cliente aqui. Preencha os dados básicos e ele entra automaticamente no Pipeline." },
    { sel: ".alert-btn", title: "Alertas", desc: "Notificações de clientes sem contato, orçamentos pendentes e garantias vencendo." },
    { sel: ".srch", title: "Busca Global", desc: "Busque clientes por nome, telefone, Instagram, estilo ou qualquer campo." },
  ];

  const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem("inq_onb"));
  const [showSplash, setShowSplash] = useState(() => !!localStorage.getItem("inq_onb"));
  const [onbStep, setOnbStep] = useState(0);
  const [dark, setDark] = useState(true);
  const [studioName, setStudioName] = useState("Casa dos Carvalho");
  const [studioLogo, setStudioLogo] = useState<string>(() => localStorage.getItem("inq_logo") || "");
  const [studioTel, setStudioTel] = useState("(27) 99999-0000");
  const [studioOwner, setStudioOwner] = useState("Abraao Carvalho");
  const [studioEmail, setStudioEmail] = useState("");
  const [studioCity, setStudioCity] = useState("Vitoria - ES");
  const [studioInsta, setStudioInsta] = useState("@casadoscarvalho");
  const [auraName, setAuraName] = useState("Aura");
  const [auraFormalidade, setAuraFormalidade] = useState("Equilibrado");
  const [auraIdioma, setAuraIdioma] = useState("Português");
  const [metaSessoes, setMetaSessoes] = useState(10);
  const [metaLeads, setMetaLeads] = useState(20);
  const [metaNPS, setMetaNPS] = useState(5);
  const [settingsTab, setSettingsTab] = useState<"estudio"|"ia"|"sistema">("estudio");
  const [googleLink, setGoogleLink] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [metaMensal, setMetaMensal] = useState(15000);
  const [saidas, setSaidas] = useState<any[]>([]);
  const [showSaidaForm, setShowSaidaForm] = useState(false);
  const [saidaForm, setSaidaForm] = useState({ desc: "", categoria: "Material", valor: 0, data: new Date().toLocaleDateString("pt-BR") });
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [equipForm, setEquipForm] = useState({ nome: "", valor_aquisicao: "", data_compra: "", vida_util_meses: 48, categoria: "maquina", artista_id: "" });
  const [showEntradaForm, setShowEntradaForm] = useState(false);
  const [entradaForm, setEntradaForm] = useState({ descricao: "", categoria: "sessao", cliente_nome: "", artista_id: "", valor: "", forma_pgto: "Pix", parcelas: "1", data: new Date().toISOString().split("T")[0], competencia: new Date().toISOString().slice(0,7) });
  const [finFiltroMes, setFinFiltroMes] = useState(new Date().toISOString().slice(0,7));
  const [finFiltroArtista, setFinFiltroArtista] = useState("todos");
  const [finFiltroTipo, setFinFiltroTipo] = useState("todos");
  const [finAbaAtiva, setFinAbaAtiva] = useState<"livrocaixa"|"dre"|"equipamentos">("livrocaixa");
  const [clients, setClients] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
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
    { dia: "Segunda", aberto: true, ini: "09:00", fim: "19:00" },
    { dia: "Terca", aberto: true, ini: "09:00", fim: "19:00" },
    { dia: "Quarta", aberto: true, ini: "09:00", fim: "19:00" },
    { dia: "Quinta", aberto: true, ini: "09:00", fim: "19:00" },
    { dia: "Sexta", aberto: true, ini: "09:00", fim: "19:00" },
    { dia: "Sabado", aberto: true, ini: "10:00", fim: "17:00" },
    { dia: "Domingo", aberto: false, ini: "", fim: "" },
  ]);
  const [form, setForm] = useState({
    nome: "", tel: "", email: "", insta: "", artista: artists.find(a => a.ativo)?.id || "abraao",
    estilo: "", regiao: "", tam: "Medio", desc: "", orig: "Instagram Organico",
    qual: "Q2", primeira: false, cob: false, intencao: "", nascimento: ""
  });
  const [formAg, setFormAg] = useState({ agendar: false, data: "", hora: "09:00", tipo: "cons" });
  const [artForm, setArtForm] = useState({
    nome: "", role: "guest", com: 50, cor: "#C9A84C", insta: "", email: "", tel: ""
  });
  const [agForm, setAgForm] = useState({
    title: "", tipo: "cons_abraao", date: new Date().toISOString().split("T")[0], start: 9, end: 11, desc: ""
  });
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [agClientSearch, setAgClientSearch] = useState("");
  const [agClientVinc, setAgClientVinc] = useState<any>(null);
  const [agClientDropdown, setAgClientDropdown] = useState(false);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [quickClientForm, setQuickClientForm] = useState({ nome: "", tel: "", artista: "abraao", estilo: "", regiao: "" });
  const [showPostAg, setShowPostAg] = useState(false);
  const [postAgNome, setPostAgNome] = useState("");
  const [showEstiloDD, setShowEstiloDD] = useState(false);
  const [showRegiaoDD, setShowRegiaoDD] = useState(false);
  const [estiloOpts, setEstiloOpts] = useState<string[]>(["Fine Line", "Realismo", "Black Work", "Old School", "Aquarela", "Geometrico", "Surrealismo", "Tribal", "Fine Line Floral", "Fine Line Botanico"]);
  const [regiaoOpts, setRegiaoOpts] = useState<string[]>(["Antebraço", "Braço Inteiro", "Costela", "Costas", "Ombro", "Panturrilha", "Clavícula", "Pescoço", "Mão", "Pé"]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [historico, setHistorico] = useState<{id?:any; data:string; hora:string; acao:string}[]>([]);
  const [confirmExcluir, setConfirmExcluir] = useState<any>(null);
  const [confirmRemoverArtista, setConfirmRemoverArtista] = useState<any>(null);
  const [confirmExcluirCliente, setConfirmExcluirCliente] = useState<any>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetUndo, setResetUndo] = useState(false);
  const [resetTimer, setResetTimer] = useState<any>(null);
  const [formStep, setFormStep] = useState(1);
  const [confirmMover, setConfirmMover] = useState<{cid: any; stage: any; agEvents: any[]} | null>(null);
  const [confirmPagamento, setConfirmPagamento] = useState<{cid: any; agEvent: any} | null>(null);
  const [projParaConcluir, setProjParaConcluir] = useState<{clienteId: any; projetoId: any} | null>(null);
  const [pipelineMotivo, setPipelineMotivo] = useState<{cid: any; stage: any; motivo: string; dias?: string} | null>(null);
  const [confirmCancelarEvento, setConfirmCancelarEvento] = useState<{event: any; motivo: string} | null>(null);
  const [proximaSessaoModal, setProximaSessaoModal] = useState<{cid: any} | null>(null);
  const [cancelProjetoModal, setCancelProjetoModal] = useState<{clienteId: any; projetoId: any; motivo: string} | null>(null);
  const [cancelMotivos, setCancelMotivos] = useState<string[]>(["Cliente desistiu", "Questão financeira", "Mudança de projeto", "Sem resposta do cliente", "Outro"]);
  const [novoProjetoAberto, setNovoProjetoAberto] = useState<any>(null);
  const [showStats, setShowStats] = useState(false);
  const [novoProjetoForm, setNovoProjetoForm] = useState({ estilo: "", tam: "Medio", primeira: false, desc: "", valorTotal: "" });
  const [showRecorrenteModal, setShowRecorrenteModal] = useState<{cid: any} | null>(null);
  const [recorrenteForm, setRecorrenteForm] = useState({ dataInicio: new Date().toISOString().split("T")[0], intervalo: 7, total: 4, hora: 9, duracao: 2, artista: "" });
  const [fichaRevelada, setFichaRevelada] = useState<Set<any>>(new Set());
  const [showLogoCrop, setShowLogoCrop] = useState(false);
  const [logoCropSrc, setLogoCropSrc] = useState("");
  const [logoCropPos, setLogoCropPos] = useState({ x: 0, y: 0 });
  const [logoCropScale, setLogoCropScale] = useState(1);
  const logoCropRef = useRef<any>(null);
  const [pagFormas, setPagFormas] = useState<{forma: string; valor: string; parcelas: string}[]>([{ forma: "Pix", valor: "", parcelas: "1" }]);
  const [showAviso, setShowAviso] = useState<string | null>(null);
  const [orcamentoModal, setOrcamentoModal] = useState<{cid: any; valor: string} | null>(null);
  const [undoEvento, setUndoEvento] = useState<any>(null);
  const [undoTimer, setUndoTimer] = useState<any>(null);
  const [undoSessao, setUndoSessao] = useState<{cid: any; etapaAnterior: string; finIds: any[]} | null>(null);
  const [undoSessaoTimer, setUndoSessaoTimer] = useState<any>(null);
  const [confirmAgForm, setConfirmAgForm] = useState(false);
  const [disparosHist, setDisparosHist] = useState<any[]>([]);

  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = S;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  // ─── CARREGAR DADOS DO SUPABASE ──────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      if (!sb) { setDbReady(true); return; }
      try {
        const [cls, arts, fins, sds, ags, cfgs, eqs] = await Promise.all([
          dbGet("clientes"), dbGet("artistas"), dbGet("financeiro"),
          dbGet("saidas"), dbGet("agenda"), dbGet("configuracoes"), dbGet("equipamentos")
        ]);
        if (eqs && eqs.length > 0) setEquipamentos(eqs);
        if (cls && cls.length > 0) setClients(cls.map((c: any) => ({
          ...c,
          hist: c.hist || [],
          pv: c.followups || [],
          faltas: c.faltas || 0,
          indicacoes: c.indicacoes || 0,
          credito: c.credito || 0,
          desc: c.descricao || "",
          projetos: c.projetos || [],
          orig: c.orig || c.origem || "",
        })));
        if (arts && arts.length > 0) {
          setArtists(arts);
        } else {
          // Banco vazio — seed com artistas padrão e salva no Supabase
          for (const a of ARTISTS_INIT) {
            await sb.from("artistas").upsert({ ...a }, { onConflict: "id" });
          }
          setArtists(ARTISTS_INIT);
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
            date: a.data || a.date,
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
          if (cfg.aura_name) setAuraName(cfg.aura_name);
          if (cfg.google_link) setGoogleLink(cfg.google_link);
          if (cfg.cnpj) setCnpj(cfg.cnpj);
          if (cfg.meta_mensal) setMetaMensal(cfg.meta_mensal);
          if (cfg.meta_sessoes) setMetaSessoes(cfg.meta_sessoes);
          if (cfg.meta_leads) setMetaLeads(cfg.meta_leads);
          if (cfg.meta_nps) setMetaNPS(cfg.meta_nps);
          if (cfg.horarios) setHorarios(cfg.horarios);
          if (cfg.estilo_opts?.length) setEstiloOpts(cfg.estilo_opts);
          if (cfg.regiao_opts?.length) setRegiaoOpts(cfg.regiao_opts);
          if (cfg.aura_formalidade) setAuraFormalidade(cfg.aura_formalidade);
          if (cfg.aura_idioma) setAuraIdioma(cfg.aura_idioma);
          setDark(cfg.dark_mode !== false);
          setOnboardingDone(true);
          localStorage.setItem("inq_onb", "1");
        }
      } catch(e) { console.error("Load error", e); }
      setDbReady(true);
    }
    loadAll();
  }, []);

  // ─── SALVAR CLIENTE NO SUPABASE ──────────────────────────────────────────
  const saveClientDb = useCallback(async (c: any) => {
    await dbUpsert("clientes", {
      id: typeof c.id === "number" ? undefined : c.id,
      nome: c.nome, insta: c.insta || "", tel: c.tel || "",
      qual: c.qual, artista: c.artista, etapa: c.etapa,
      orig: c.orig || "", email: c.email || "",
      estilo: c.estilo || "", regiao: c.regiao || "",
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
      updated_at: new Date().toISOString()
    }, (msg) => setShowAviso("Erro ao salvar dados do cliente: " + msg));
  }, []);

  const addLog = useCallback(async (acao: string) => {
    const now = new Date();
    const data = now.toLocaleDateString("pt-BR");
    const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const row = { data, hora, acao };
    setHistorico(p => [{ ...row, id: Date.now() }, ...p]);
    try { await sb.from("historico").insert(row); } catch(e) { console.warn("log error", e); }
  }, []);

  useEffect(() => {
    sb.from("historico").select("*").order("id", { ascending: false }).limit(500)
      .then(({ data }) => { if (data) setHistorico(data); });
  }, []);

  useMemo(() => applyTheme(dark), [dark]);
  useMemo(() => {
    if (artists.length > 0) {
      const root = document.documentElement;
      artists.forEach(a => {
        if (a.cor) root.style.setProperty("--artist-" + a.id, a.cor);
      });
      const ab = artists.find(a => a.id === "abraao")?.cor || "#4A9EBF";
      const ca = artists.find(a => a.id === "camilla")?.cor || "#9B6BB5";
      root.style.setProperty("--ab", ab);
      root.style.setProperty("--ca", ca);
    }
  }, [artists]);

  const filtered = useMemo(() => clients.filter(c => {
    const mA = fa === "todos" || c.artista === fa;
    const q = srch.toLowerCase();
    const mS = !srch ||
      c.nome.toLowerCase().includes(q) ||
      c.estilo.toLowerCase().includes(q) ||
      (c.tel || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.insta || "").toLowerCase().includes(q) ||
      (c.orig || "").toLowerCase().includes(q) ||
      (c.desc || "").toLowerCase().includes(q) ||
      (c.etapa || "").toLowerCase().includes(q);
    return mA && mS;
  }), [clients, fa, srch]);

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
    if (proj && (!proj.valorTotal || proj.valorTotal === 0) && c.etapa !== "lead") m.push("Valor do projeto");
    // Forma de pagamento não definida em cliente com sessão agendada
    if (!c.pgto && ["sessao_agendada","tatuado","pos_venda"].includes(c.etapa)) m.push("Forma de pagamento");
    return m;
  };
  const churn = (c: any) => {
    if (c.etapa !== "tatuado" && c.etapa !== "pos_venda") return null;
    if (c.dias >= 365) return "red";
    if (c.dias >= 180) return "orange";
    return null;
  };

  const alertas = useMemo(() => {
    const hoje = new Date();
    return clients.filter(c => {
      const projSemValor = (c.projetos || []).some((p: any) => p.status !== "concluido" && p.status !== "cancelado" && (!p.valorTotal || p.valorTotal === 0)) && c.etapa !== "lead";
      let aniversario = false;
      if ((c as any).nascimento) {
        const nasc = new Date((c as any).nascimento);
        for (let i = 0; i <= 7; i++) {
          const d = new Date(hoje); d.setDate(d.getDate() + i);
          if (nasc.getMonth() === d.getMonth() && nasc.getDate() === d.getDate()) { aniversario = true; break; }
        }
      }
      const garantia = c.etapa === "tatuado" && c.dias >= 30 && c.dias <= 37;
      const inativo = !["blacklist","tatuado","pos_venda","hibernacao"].includes(c.etapa) && c.dias >= 40;
      return miss(c).length > 0 || churn(c) || projSemValor || aniversario || garantia || inativo;
    });
  }, [clients]);
  const reativacao = useMemo(() =>
    clients.filter(c => !["blacklist", "tatuado", "pos_venda"].includes(c.etapa) && c.dias >= 30)
      .sort((a, b) => b.dias - a.dias).slice(0, 5),
    [clients]
  );
  const paraExcluir = useMemo(() =>
    clients.filter(c => c.dias >= 40 && c.etapa === "qualificacao" && !["blacklist"].includes(c.etapa)),
    [clients]
  );

  const move = (cid: number, ns: string) => {
    const cli = clients.find(c => c.id === cid);
    const evs = agEvents.filter(e => e.cliente_id === cid);

    // Cumpriu Evento — modal de pagamento
    if (ns === "tatuado") {
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
          setAgForm({ title: cli?.nome || "", desc: "", tipo: "cons_" + (cli?.artista || "abraao"), date: new Date().toISOString().split("T")[0], start: 9, end: 11 } as any);
          setShowAgForm(true);
        }, 200);
      }
      return;
    }

    // Sessão Agendada — abre agendamento tipo Sessão
    if (ns === "sessao_agend") {
      executarMove(cid, ns);
      if (evs.length === 0) {
        setTimeout(() => {
          setEditingEvent(null);
          setAgClientVinc(cli || null);
          setAgClientSearch("");
          setAgForm({ title: cli?.nome || "", desc: "", tipo: "sess_" + (cli?.artista || "abraao"), date: new Date().toISOString().split("T")[0], start: 9, end: 11 } as any);
          setShowAgForm(true);
        }, 200);
      }
      return;
    }

    // Pós-venda — observação opcional
    if (ns === "pos_venda") {
      setPipelineMotivo({ cid, stage: STAGES.find(s => s.id === ns), motivo: "", dias: "" });
      return;
    }

    // Lista de Espera — motivo livre
    if (ns === "lista_espera") {
      setPipelineMotivo({ cid, stage: STAGES.find(s => s.id === ns), motivo: "", dias: "" });
      return;
    }

    // Hibernação — motivo + sugestão de dias para Aura
    if (ns === "hibernacao") {
      setPipelineMotivo({ cid, stage: STAGES.find(s => s.id === ns), motivo: "", dias: "30" });
      return;
    }

    // Blacklist — motivo obrigatório
    if (ns === "blacklist") {
      setPipelineMotivo({ cid, stage: STAGES.find(s => s.id === ns), motivo: "", dias: "" });
      return;
    }

    executarMove(cid, ns);
  };

  const executarMove = (cid: number, ns: string) => {
    const lbl = STAGES.find(s => s.id === ns)?.label || ns;
    const orq = ns === "sessao_agend";
    const tatuado = ns === "tatuado";
    const pvFlow = tatuado ? PV_FLOW.map(p => ({ l: p.label, s: "pending", dias: p.dias, msg: p.msg })) : undefined;
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
      if (c) setTimeout(() => saveClientDb(c), 100);
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
      const { error } = await sb.from("financeiro").insert({
        cliente_id: cid,
        cliente_nome: cliente?.nome || "",
        artista: artistaId,
        data: dataHojeISO,
        val_a: val,
        val_c: val,
        pgto: f.forma === "Cartão" ? `Cartão ${f.parcelas}x` : f.forma,
        com_base: comSess,
        com_sess: comSess,
      });
      if (error) console.error("financeiro insert (sessão):", error);
    }
    // Registrar no histórico do cliente
    const formasTexto = pagFormas.filter(f => parseFloat(f.valor) > 0).map(f => `${f.forma} R$${parseFloat(f.valor).toFixed(2)}${f.forma === "Cartão" ? ` ${f.parcelas}x` : ""}`).join(" + ");
    setClients(p => {
      const updated = p.map(c => c.id !== cid ? c : {
        ...c,
        hist: [...(c.hist || []), { t: `Pagamento confirmado: R$${totalPago.toFixed(2)} — ${formasTexto}`, d: new Date().toLocaleString("pt-BR") }]
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
    // Se veio de "Projeto Concluído" na ficha, marca o projeto e move pipeline
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
    executarMove(cid, "tatuado");
  };

  const upC = (cid: number, f: string, v: any) => {
    setClients(p => {
      const updated = p.map(c => c.id !== cid ? c : { ...c, [f]: v });
      const c = updated.find(c => c.id === cid);
      if (c) setTimeout(() => saveClientDb(c), 100);
      return updated;
    });
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
      const novoEtapa = c.etapa === "blacklist" && (c.faltas || 0) <= 3 ? "qualificacao" : c.etapa;
      const audit = "Falta removida (correcao) — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      return { ...c, faltas: novasFaltas, etapa: novoEtapa, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
    }));
  };

  const removerBlacklist = (cid: number, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const audit = "Removido da Blacklist — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      return { ...c, etapa: "qualificacao", hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
    }));
  };

  const deleteClient = async (cid: any) => {
    const nome = clients.find(c => c.id === cid)?.nome || "cliente";
    setClients(p => p.filter(c => c.id !== cid));
    setSel(null);
    // Apaga em cascata: financeiro e agenda vinculados
    await sb.from("financeiro").delete().eq("cliente_id", cid);
    await sb.from("agenda").delete().eq("cliente_id", cid);
    await dbDelete("clientes", cid);
    setFin(p => p.filter((f: any) => f.cliente_id !== cid));
    setAgEvents(p => p.filter(e => e.cliente_id !== cid));
    addLog(`Cliente "${nome}" excluído`);
    setConfirmExcluirCliente(null);
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
        qual: nc.qual, artista: nc.artista,
        etapa: nc.qual === "Q1" ? "lead" : "qualificacao",
        orig: nc.orig || "Instagram Organico",
        email: nc.email || "",
        estilo: nc.estilo || "", regiao: nc.regiao || "",
        tam: nc.tam || "Medio",
        intencao: nc.intencao || "", primeira: nc.primeira || false,
        cob: nc.cob || false, descricao: nc.desc || "",
        stars: 0, consent: null, nps: null, obs: "",
        val_a: (form as any).valorProjeto ? Number(String((form as any).valorProjeto).replace(/\./g,"").replace(",",".")) : 0,
        val_c: 0, pgto: "", orcamento: false, contrato: false,
        faltas: 0, indicacoes: 0, credito: 0, cri: "",
        hist: nc.hist, followups: [], dias: 0,
        projetos: nc.projetos || [],
        nascimento: (form as any).nascimento || "",
        documento: (form as any).documento || "",
        updated_at: new Date().toISOString()
      }).select().single();
      if (error) {
        setShowAviso("Erro ao salvar cliente: " + (error.message || "Tente novamente."));
        return;
      }
      if (data) {
        // Definir etapa inicial baseada na qualificação
        const etapaInicial = nc.qual === "Q1" ? "lead" : "qualificacao";
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
            tipo: formAg.tipo === "cons" ? "cons_" + nc.artista : "sess_" + nc.artista
          });
          setAgEvents(p => [...p, {
            id: Date.now(), title: nc.nome,
            tipo: formAg.tipo === "cons" ? "cons_" + nc.artista : "sess_" + nc.artista,
            date: formAg.data, start: parseInt(formAg.hora.split(":")[0]), end: parseInt(formAg.hora.split(":")[0]) + 2
          }]);
        }
      }
    } else {
      setClients(p => [{ ...nc, id: Date.now(), etapa: "lead" }, ...p]);
    }
    setShowForm(false);
    setFormAg({ agendar: false, data: "", hora: "09:00", tipo: "cons" });
    setForm({ nome: "", tel: "", email: "", insta: "", artista: "abraao", estilo: "", regiao: "", tam: "Medio", desc: "", orig: "Instagram Organico", qual: "Q2", primeira: false, cob: false, intencao: "", nascimento: "" });
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
      ativo: true
    };
    const { data: artData, error: artError } = await sb.from("artistas").insert(row).select().single();
    if (artError) {
      setShowAviso(`Erro ao salvar artista: ${artError.message}`);
      return;
    }
    setArtists(p => [...p, { ...row, id: artData.id }]);
    setShowArtForm(false);
    setArtForm({ nome: "", role: "guest", com: 50, cor: "#C9A84C", insta: "@", email: "", tel: "" });
    addLog(`Artista "${artForm.nome}" cadastrado`);
  };

  const saveAgEvent = async () => {
    const row: any = {
      titulo: agForm.title,
      artista: agForm.tipo.replace("cons_","").replace("sess_","").replace("bloq_","") || "abraao",
      data: agForm.date,
      hora: String(agForm.start).padStart(2, "0") + ":00",
      hora_fim: String(agForm.end).padStart(2, "0") + ":00",
      tipo: agForm.tipo,
      obs: (agForm as any).desc || "",
      valor_previsto: parseFloat(String((agForm as any).valorPrevisto || "0").replace(/\./g, "").replace(",", ".")) || 0,
      sinal: parseFloat(String((agForm as any).sinal || "0").replace(/\./g, "").replace(",", ".")) || 0,
      sinal_pago: !!(agForm as any).sinalPago,
      ...(agClientVinc ? { cliente_id: agClientVinc.id, cliente_nome: agClientVinc.nome } : {})
    };

    if (editingEvent) {
      const { data, error } = await sb.from("agenda").update(row).eq("id", editingEvent.id).select().single();
      if (error) { setShowAviso("Erro ao atualizar agendamento: " + error.message); return; }
      setAgEvents(p => p.map(e => e.id === editingEvent.id ? {
        ...data, title: data.titulo, date: data.data,
        start: parseInt(data.hora?.split(":")[0] || "9"),
        end: parseInt(data.hora?.split(":")[0] || "9") + 2,
        cliente_id: data.cliente_id, cliente_nome: data.cliente_nome
      } : e));
      setEditingEvent(null);
      setShowAgForm(false);
      setAgClientVinc(null);
      setAgClientSearch("");
      addLog(`Agenda: evento "${agForm.title}" editado (${agForm.date} ${agForm.start}h)`);
      // Mover pipeline ao editar agendamento vinculado a cliente
      if (agClientVinc) {
        const tipoKey = agForm.tipo.split("_")[0];
        const cli = clients.find((c: any) => c.id === agClientVinc.id);
        if (tipoKey === "cons" && cli && ["lead", "qualificacao"].includes(cli.etapa)) {
          executarMove(agClientVinc.id, "cons_agendada");
        } else if ((tipoKey === "sess" || tipoKey === "piercing") && cli && ["lead", "qualificacao", "cons_agendada", "hibernacao"].includes(cli.etapa)) {
          executarMove(agClientVinc.id, "sessao_agend");
        }
      }
      // Lançar sinal no financeiro se foi marcado como pago agora e não havia antes
      const sinalValEdit = parseFloat(String((agForm as any).sinal || "0").replace(/\./g, "").replace(",", ".")) || 0;
      const sinalPagoEdit = !!(agForm as any).sinalPago;
      const sinalJaLancado = !!(editingEvent as any).sinal_pago;
      if (sinalValEdit > 0 && sinalPagoEdit && !sinalJaLancado && agClientVinc) {
        const artistaSinalEdit = agForm.tipo.replace("cons_","").replace("sess_","").replace("bloq_","") || "abraao";
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
          com_base: comSinalEdit,
          com_sess: comSinalEdit,
        }).select().single();
        if (errSinalEdit) console.error("financeiro insert (sinal edição):", errSinalEdit);
        if (fdSinalEdit) setFin(p => [...p, { ...fdSinalEdit, cliente: agClientVinc.nome }]);
      }
      return;
    }

    const { data, error } = await sb.from("agenda").insert(row).select().single();
    if (error) { setShowAviso("Erro ao salvar agendamento: " + error.message); return; }
    setAgEvents(p => [...p, {
      ...data, title: data.titulo || agForm.title, date: data.data || agForm.date,
      start: parseInt(data.hora?.split(":")[0] || String(agForm.start)),
      end: parseInt(data.hora?.split(":")[0] || String(agForm.start)) + 2,
      cliente_id: data.cliente_id, cliente_nome: data.cliente_nome
    }]);
    setShowAgForm(false);
    setEditingEvent(null);
    setAgClientVinc(null);
    setAgClientSearch("");
    addLog(`Agenda: evento "${agForm.title}" criado para ${agForm.date} às ${agForm.start}h`);
    // Registrar no histórico e mover pipeline automaticamente
    if (agClientVinc) {
      const dataFmt = agForm.date ? agForm.date.split("-").reverse().join("/") : agForm.date;
      const tipoLabel: Record<string,string> = { cons: "Consulta", sess: "Sessão", piercing: "Piercing", bloq: "Bloqueio" };
      const tipoKey = agForm.tipo.split("_")[0];
      const tipoNome = tipoLabel[tipoKey] || agForm.tipo;
      const sinalVal = parseFloat(String((agForm as any).sinal || "0").replace(/\./g, "").replace(",", ".")) || 0;
      const sinalPago = !!(agForm as any).sinalPago;
      const histEntries = [
        { t: `Agendamento criado: ${tipoNome} em ${dataFmt} às ${agForm.start}h`, d: new Date().toLocaleString("pt-BR") },
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
        if (cli && ["lead", "qualificacao"].includes(cli.etapa)) {
          executarMove(agClientVinc.id, "cons_agendada");
        }
      } else if (tipoKey === "sess" || tipoKey === "piercing") {
        const cli = clients.find((c: any) => c.id === agClientVinc.id);
        if (cli && ["lead", "qualificacao", "cons_agendada", "hibernacao"].includes(cli.etapa)) {
          if (cli.etapa === "hibernacao" && (cli.faltas || 0) > 0) {
            setTimeout(() => setShowAviso(`⚠️ ${cli.nome} estava em hibernação por desmarcação. Lembre de cobrar R$100,00 de taxa — conforme política do estúdio.`), 500);
          }
          executarMove(agClientVinc.id, "sessao_agend");
        }
      }
      // Lançar sinal no financeiro se já pago
      if (sinalVal > 0 && sinalPago) {
        const artistaSinal = agForm.tipo.replace("cons_","").replace("sess_","").replace("bloq_","") || "abraao";
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
          com_base: comSinal,
          com_sess: comSinal,
        }).select().single();
        if (errSinal) console.error("financeiro insert (sinal):", errSinal);
        if (fdSinal) setFin(p => [...p, { ...fdSinal, cliente: agClientVinc.nome }]);
      }
    }
  };

  const disparo = () => { setSent(true); setTimeout(() => setSent(false), 4000); };

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
        artista: undoEvento.artista || undoEvento.tipo?.replace("cons_","").replace("sess_","").replace("bloq_","") || "abraao",
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
  const dest = useMemo(() => {
    if (!segSel && !dateSel) return [];
    if (dateSel) return clients;
    const sg = SEGS.find(x => x.id === segSel);
    return sg ? clients.filter(sg.f) : [];
  }, [segSel, dateSel, clients]);

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
    clients.filter(c => c.estilo).forEach(c => { m[c.estilo] = (m[c.estilo] || 0) + 1; });
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
  const aName = (id: string) => artists.find(a => a.id === id)?.nome || (id === "abraao" ? "Abraão" : "Camilla");
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
    pos_venda: { bg: "rgba(230,126,34,.15)", color: "#E67E22", b: "rgba(230,126,34,.3)" },
    lista_espera: { bg: "rgba(52,152,219,.15)", color: "#3498DB", b: "rgba(52,152,219,.3)" },
    hibernacao: { bg: "rgba(102,102,102,.15)", color: "#888", b: "rgba(102,102,102,.3)" },
    blacklist: { bg: "rgba(192,57,43,.15)", color: "#C0392B", b: "rgba(192,57,43,.3)" }
  };

  // ── LOGIN ──
  if (!logado) {
    const senha = import.meta.env.VITE_APP_PASSWORD || "casa2026";
    return (
      <div style={{ minHeight: "100vh", background: "#0E0E0E", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, fontFamily: "'DM Sans',sans-serif" }}>
        <style>{S}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#C9A84C", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 700, color: "#000", boxShadow: "0 0 40px rgba(201,168,76,.25)" }}>
            {studioName ? studioName[0].toUpperCase() : "C"}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 700, color: "#C9A84C", letterSpacing: ".08em" }}>{studioName}</div>
            <div style={{ fontSize: 10, color: "#555045", letterSpacing: ".18em", textTransform: "uppercase", marginTop: 4 }}>In-Quadra Ink System</div>
          </div>
        </div>
        <div style={{ background: "#161616", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 12, padding: "28px 32px", width: "min(360px, 90vw)", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#E8E2D9", textAlign: "center" }}>Acesso Restrito</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Senha</label>
            <input
              className="fi"
              type="password"
              placeholder="••••••••"
              value={loginSenha}
              onChange={e => { setLoginSenha(e.target.value); setLoginErro(false); }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (loginSenha === senha) {
                    localStorage.setItem("inq_auth", String(Date.now()));
                    setLogado(true);
                  } else {
                    setLoginErro(true);
                  }
                }
              }}
              autoFocus
              style={{ fontSize: 16, letterSpacing: ".1em" }}
            />
            {loginErro && <div style={{ fontSize: 11, color: "#C0392B", marginTop: 2 }}>Senha incorreta. Tente novamente.</div>}
          </div>
          <button
            onClick={() => {
              if (loginSenha === senha) {
                localStorage.setItem("inq_auth", String(Date.now()));
                setLogado(true);
              } else {
                setLoginErro(true);
              }
            }}
            style={{ background: "#C9A84C", color: "#000", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", letterSpacing: ".04em" }}>
            Entrar →
          </button>
        </div>
        <div style={{ fontSize: 10, color: "#303030", letterSpacing: ".1em", textTransform: "uppercase" }}>© {new Date().getFullYear()} {studioName}</div>
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
            <div style={{ fontSize: 10, color: "#555045", letterSpacing: ".18em", textTransform: "uppercase", marginTop: 5 }}>In-Quadra Ink System</div>
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
    const onbSteps = ["Estúdio", "Horários", "Artistas", "IA", "Concluído"];
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
                  <input className="fi" value={studioName} onChange={e => setStudioName(e.target.value)} placeholder="Casa dos Carvalho" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Nome do Responsável *</label>
                  <input className="fi" value={studioOwner} onChange={e => setStudioOwner(e.target.value)} placeholder="Seu nome" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>WhatsApp da {auraName} *</label>
                  <input className="fi" value={studioTel} onChange={e => setStudioTel(e.target.value)} placeholder="(27) 99999-0000" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Email do Estudio</label>
                  <input className="fi" value={studioEmail} onChange={e => setStudioEmail(e.target.value)} placeholder="contato@estudio.com" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Cidade e Estado</label>
                  <input className="fi" value={studioCity} onChange={e => setStudioCity(e.target.value)} placeholder="Vitoria - ES" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Instagram do Estudio</label>
                  <input className="fi" value={studioInsta} onChange={e => setStudioInsta(e.target.value)} placeholder="@estudio" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Nome da IA de Atendimento</label>
                  <input className="fi" value={auraName} onChange={e => setAuraName(e.target.value)} placeholder="Aura" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Link Google Meu Negócio</label>
                  <input className="fi" value={googleLink} onChange={e => setGoogleLink(e.target.value)} placeholder="https://g.page/..." />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>CNPJ</label>
                  <input className="fi" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
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
                      <span style={{ fontSize: 12, color: "#8A8070" }}>as</span>
                      <input className="fi" type="time" value={h.fim} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, fim: e.target.value } : x))} style={{ width: 90, padding: "4px 7px" }} />
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
              <div style={{ fontSize: 14, color: "#E8E2D9", fontWeight: 600, marginBottom: 4 }}>Artistas do estúdio</div>
              {artists.map(a => (
                <div key={a.id} style={{ background: "#1E1E1E", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, color: a.cor }}>{a.nome}</div>
                    <div style={{ fontSize: 11, color: "#8A8070", marginTop: 2 }}>{a.role === "residente" ? "Residente" : "Guest"} · {a.com}% comissao</div>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#27AE60" }} />
                </div>
              ))}
              <button className="btn-new" style={{ marginTop: 4, alignSelf: "flex-start" }} onClick={() => setShowArtForm(true)}>+ Adicionar Artista</button>
            </div>
          )}
          {onbStep === 3 && (
            <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 14, color: "#E8E2D9", fontWeight: 600, marginBottom: 4 }}>Configure sua IA de atendimento</div>
              <div style={{ fontSize: 11, color: "#555045", marginBottom: 4 }}>Ela atende 24h e nunca se passa por humano. Ajuste o comportamento abaixo.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Nome da IA</label>
                <input className="fi" value={auraName} placeholder="Aura"
                  onChange={e => setAuraName(e.target.value.replace(/(^|\s)(\S)/g, (_: string, sp: string, ch: string) => sp + ch.toUpperCase()))} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Formalidade</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Formal","Equilibrado","Descontraído"].map(op => (
                    <button key={op} onClick={() => setAuraFormalidade(op)}
                      style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: auraFormalidade === op ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,.15)", background: auraFormalidade === op ? "rgba(201,168,76,.15)" : "#1E1E1E", color: auraFormalidade === op ? "#C9A84C" : "#8A8070", fontSize: 12, fontWeight: auraFormalidade === op ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "#8A8070" }}>Idioma Principal</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Português","Inglês","Espanhol"].map(op => (
                    <button key={op} onClick={() => setAuraIdioma(op)}
                      style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: auraIdioma === op ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,.15)", background: auraIdioma === op ? "rgba(201,168,76,.15)" : "#1E1E1E", color: auraIdioma === op ? "#C9A84C" : "#8A8070", fontSize: 12, fontWeight: auraIdioma === op ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {onbStep === 4 && (
            <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>🖤</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 600, color: "#C9A84C" }}>Tudo pronto!</div>
              <div style={{ fontSize: 13, color: "#8A8070", lineHeight: 1.7 }}>
                O <strong style={{ color: "#E8E2D9" }}>{studioName}</strong> esta configurado.<br />Bem-vindo ao In-Quadra Ink System.
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
              {onbStep === 4 && <button className="btn-s" onClick={() => { setOnboardingDone(true); setShowSplash(false); localStorage.setItem("inq_onb", "1"); if (!localStorage.getItem("inq_tour")) { setTimeout(() => { setTourStep(0); setTourAtivo(true); }, 800); } }}>Entrar no Sistema →</button>}
            </div>
          </div>
        </div>
        {showArtForm && (
          <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowArtForm(false); }}>
            <div className="fmod" style={{ maxWidth: 420 }}>
              <div className="fmh"><div className="fmt">Adicionar Artista</div><button className="mc" onClick={() => setShowArtForm(false)}>✕</button></div>
              <div className="fmb">
                <div className="ff"><label className="fl">Nome Completo *</label><input className="fi" placeholder="Nome do artista" value={artForm.nome} onChange={e => setArtForm({ ...artForm, nome: e.target.value.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase()) })} /></div>
                <div className="fr">
                  <div className="ff"><label className="fl">Tipo</label><select className="fs" value={artForm.role} onChange={e => setArtForm({ ...artForm, role: e.target.value })}><option value="residente">Residente</option><option value="guest">Guest</option></select></div>
                  <div className="ff">
                    <label className="fl">Comissão (%)</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input className="fi" type="number" min={0} max={100} value={artForm.com} onChange={e => setArtForm({ ...artForm, com: Number(e.target.value) })} style={{ width: 80 }} />
                      <span style={{ fontSize: 11, color: "var(--tx3)", display: "flex", gap: 10 }}>
                        <span>Artista: <strong style={{ color: "var(--gold)" }}>{artForm.com}%</strong></span>
                        <span style={{ color: "var(--br)" }}>|</span>
                        <span>Estúdio: <strong style={{ color: "#27AE60" }}>{100 - artForm.com}%</strong></span>
                      </span>
                    </div>
                  </div>
                </div>
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
            <button className="theme-btn" onClick={() => setShowHistorico(true)} title="Histórico de ações">📋</button>
            <button className="btn-new" onClick={() => setShowForm(true)}>+ Novo Cliente</button>
          </div>
        </div>
        {/* ALERT DROPDOWN - fora do topbar para evitar overflow */}
        {showAlerts && alertas.length > 0 && (
          <div style={{ position: "fixed", top: 64, right: 16, width: "min(380px, calc(100vw - 32px))", background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,.5)", zIndex: 9999, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="ad-hdr" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Alertas — {alertas.length} clientes</span>
              <button onClick={() => setShowAlerts(false)} style={{ background: "none", border: "none", color: "var(--tx3)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            {/* Seções de alertas por categoria */}
            <div className="ad-body" style={{ overflowY: "auto" }}>
              {/* 🎂 Aniversários */}
              {(() => {
                const hoje = new Date();
                const aniversariantes = alertas.filter(c => {
                  if (!(c as any).nascimento) return false;
                  const nasc = new Date((c as any).nascimento);
                  for (let i = 0; i <= 7; i++) {
                    const d = new Date(hoje); d.setDate(d.getDate() + i);
                    if (nasc.getMonth() === d.getMonth() && nasc.getDate() === d.getDate()) return true;
                  }
                  return false;
                });
                if (aniversariantes.length === 0) return null;
                return (
                  <div style={{ borderBottom: "1px solid var(--br)", paddingBottom: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 14px 4px" }}>🎂 Aniversários nos próximos 7 dias</div>
                    {aniversariantes.map(c => (
                      <div key={c.id} className="ad-item" onClick={() => { setSel(c); setSelCtx("clientes"); setShowAlerts(false); }}>
                        <div className="ad-name">{c.nome}</div>
                        <div className="ad-tags"><span className="atag" style={{ color: "var(--gold)" }}>🎂 {new Date((c as any).nascimento).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span></div>
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
                      <div key={c.id} className="ad-item" onClick={() => { setSel(c); setSelCtx("clientes"); setShowAlerts(false); }}>
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
                      <div key={c.id} className="ad-item" onClick={() => { setSel(c); setSelCtx("clientes"); setShowAlerts(false); }}>
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
                const projSemValor = (c.projetos || []).some((p: any) => p.status !== "concluido" && p.status !== "cancelado" && (!p.valorTotal || p.valorTotal === 0)) && c.etapa !== "lead";
                return ch || projSemValor || m.length > 0;
              }).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--q1)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", padding: "6px 14px 4px" }}>⚠ Outros alertas</div>
                  {alertas.filter(c => {
                    const m = miss(c); const ch = churn(c);
                    const projSemValor = (c.projetos || []).some((p: any) => p.status !== "concluido" && p.status !== "cancelado" && (!p.valorTotal || p.valorTotal === 0)) && c.etapa !== "lead";
                    return ch || projSemValor || m.length > 0;
                  }).map(c => {
                    const m = miss(c); const ch = churn(c);
                    const projSemValor = (c.projetos || []).some((p: any) => p.status !== "concluido" && p.status !== "cancelado" && (!p.valorTotal || p.valorTotal === 0)) && c.etapa !== "lead";
                    return (
                      <div key={c.id} className="ad-item" onClick={() => { setSel(c); setSelCtx("clientes"); setShowAlerts(false); }}>
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
        )}

        {/* TABS */}
        <div className="tabs">
          {[
            { id: "kanban", l: "Pipeline", i: "📋" },
            { id: "clientes", l: "Clientes", i: "👥" },
            { id: "agenda", l: "Agenda", i: "📅" },
            { id: "financeiro", l: "Financeiro", i: "💰" },
            { id: "artistas", l: "Artistas", i: "🎨" },

            { id: "dashboard", l: "Visão Geral", i: "📊" },
            { id: "posvenda", l: "Pós-venda", i: "💬" },
            { id: "disparos", l: "Disparos", i: "📣" },
          ].map(t => (
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
          <div className="ctrl">
            <input className="srch" placeholder="Buscar..." value={srch} onChange={e => setSrch(e.target.value)} />
            <button className={"fb" + (fa === "todos" ? " on" : "")} onClick={() => setFa("todos")}>Todos</button>
            {artists.filter(a => a.ativo).map(a => (
              <button key={a.id} className={"fb" + (fa === a.id ? " on" : "")} onClick={() => setFa(a.id)}>
                {a.nome.split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        {/* ── KANBAN ── */}
        {tab === "kanban" && (
          <>
          {/* Barra de rolagem nativa dourada — acima das colunas */}
          <div style={{ background: "var(--dk2)", borderBottom: "1px solid var(--br)" }}>
            <div className="kw-scroll-mirror" id="kanban-scroll" style={{ overflowX: "auto", overflowY: "hidden", height: 10, scrollbarWidth: "thin", scrollbarColor: "var(--gold) var(--dk3)" }}
              onScroll={e => { const body = document.getElementById("kanban-body"); if (body) body.scrollLeft = e.currentTarget.scrollLeft; }}>
              <div id="kanban-scroll-spacer" style={{ height: 1 }} />
            </div>
          </div>
          {/* Seletor de coluna */}
          <div style={{ display: "flex", overflowX: "auto", gap: 6, padding: "8px 14px 6px", background: "var(--dk2)", borderBottom: "1px solid var(--br)", scrollbarWidth: "none" }}>
            {STAGES.map(stage => (
              <button key={stage.id} onClick={() => {
                const kw = document.getElementById("kanban-body");
                const el = document.getElementById("kcol-" + stage.id);
                if (kw && el) kw.scrollTo({ left: el.offsetLeft - 14, behavior: "smooth" });
              }} style={{ flexShrink: 0, padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 20, border: "1px solid var(--br)", background: "var(--dk3)", color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap" }}>
                {stage.emoji} {stage.label}
              </button>
            ))}
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
            {STAGES.map(stage => {
              const sc2 = getSC(stage.id);
              return (
                <div className="kc" key={stage.id} id={"kcol-" + stage.id}>
                  <div className="kh" style={{ borderBottomColor: stage.color }}>
                    <span className="kt" style={{ color: stage.color }}>{stage.emoji} {stage.label}</span>
                    <span className="kn">{sc2.length}</span>
                  </div>
                  <div className="kb">
                    {sc2.length === 0 && <div className="ke">Nenhum cliente</div>}
                    {sc2.map(c => {
                      const m = miss(c); const ch = churn(c);
                      return (
                        <div key={c.id} className="card" onClick={() => { setSel(c); setSelCtx("clientes"); }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: aColor(c.artista), borderRadius: "7px 0 0 7px" }} />
                          <div className="ctop">
                            <div className="cname">{c.nome}</div>
                            <span className={"qb " + QC[c.qual]}>{c.qual}</span>
                          </div>
                          <div className="cst">{c.estilo || "Sem estilo"} {c.regiao || " - "}</div>
                          {agEvents.some(e => e.cliente_id === c.id && e.status === "cancelado") && (
                            <div style={{ fontSize: 10, color: "#E67E22", background: "rgba(230,126,34,.12)", border: "1px solid rgba(230,126,34,.25)", borderRadius: 4, padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: 3, marginBottom: 2 }}>⊘ Evento cancelado</div>
                          )}
                          <div className="cft">
                            <span className={("at " + aClass(c.artista)) || ""} style={aStyle(c.artista)}>{aName(c.artista).split(" ")[0]}</span>
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
          </>
        )}

        {/* ── CLIENTES ── */}
        {tab === "clientes" && (() => {
          const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
          const sorted = [...filtered].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
          const usedLetters = new Set(sorted.map(c => c.nome[0].toUpperCase()));
          return (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div className="cw" style={{ flex: 1 }}>
            {sorted.length === 0
              ? <div className="empty">Nenhum cliente encontrado.</div>
              : (
                <table className="ctbl" id="client-table">
                  <thead>
                    <tr>
                      <th>Cliente</th><th>Contato</th><th>Projeto</th>
                      <th>Artista</th><th>Q</th><th>Etapa</th>
                      <th>Alertas</th><th>Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(c => {
                      const es = EBS[c.etapa] || EBS.lead;
                      const m = miss(c); const ch = churn(c);
                      return (
                        <tr key={c.id} data-letter={c.nome[0]?.toUpperCase()} onClick={() => { setSel(c); setSelCtx("clientes"); }}>
                          <td>
                            <div className="tdn">{c.nome}</div>
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
                              {STAGES.find(s => s.id === c.etapa)?.emoji} {STAGES.find(s => s.id === c.etapa)?.label}
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
              {letters.map(l => (
                <button key={l} onClick={() => {
                  const rows = document.querySelectorAll("[data-letter]");
                  rows.forEach((r: any) => { if (r.dataset.letter === l) r.scrollIntoView({ behavior: "smooth", block: "start" }); });
                }} style={{ fontSize: 9, fontWeight: 600, color: usedLetters.has(l) ? "var(--gold)" : "var(--tx3)", background: "none", border: "none", cursor: usedLetters.has(l) ? "pointer" : "default", padding: "1px 0", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          );
        })()}

        {/* ── AGENDA ── */}
        {tab === "agenda" && (
          <div className="agw">
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
              <button className="btn-new" style={{ marginLeft: "auto" }} onClick={() => { setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); setAgForm(f => ({ ...f, title: "", desc: "", tipo: "cons_abraao" })); setShowAgForm(true); }}>+ Evento</button>
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
                        {evs.slice(0, 3).map(e => (
                          <div key={e.id} className="mev" style={{ background: getEventColor(e.tipo, artists, e.artista), cursor: "pointer" }}
                            onClick={ev => { ev.stopPropagation(); setEditingEvent(e); setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.desc || "", valorPrevisto: e.valor_previsto ? Number(e.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinal: e.sinal ? Number(e.sinal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinalPago: !!e.sinal_pago } as any); const cv = e.cliente_id ? clients.find(c => c.id === e.cliente_id) || null : null; setAgClientVinc(cv); setAgClientSearch(""); setShowAgForm(true); }}>
                            {e.status === "concluido" && "✅ "}{e.start}h {e.title}
                          </div>
                        ))}
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
                    <div key={"t" + h} className="wt">{h}:00</div>,
                    ...wDates.map((d, di) => {
                      const ds = fmtDate(d);
                      const evs = agEvents.filter(e => e.date === ds && e.start === h);
                      const occupied = agEvents.some(e => e.date === ds && e.start < h && e.end > h);
                      return (
                        <div key={h + "-" + di} className="wc" style={{ position: "relative", overflow: "visible" }}
                          onClick={() => { setAgDate(d); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); setAgForm(f => ({ ...f, date: ds, start: h, end: h + 2, title: "", desc: "", tipo: "cons_abraao" })); setShowAgForm(true); }}>
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
                                cursor: "pointer", display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                                opacity: e.status === "cancelado" ? 0.55 : 1,
                                textDecoration: e.status === "cancelado" ? "line-through" : "none"
                              }}
                              onClick={ev => { ev.stopPropagation(); setEditingEvent(e); setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.desc || "", valorPrevisto: e.valor_previsto ? Number(e.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinal: e.sinal ? Number(e.sinal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinalPago: !!e.sinal_pago } as any); const cv = e.cliente_id ? clients.find(c => c.id === e.cliente_id) || null : null; setAgClientVinc(cv); setAgClientSearch(""); setShowAgForm(true); }}>
                                <span style={{overflow:"hidden",flex:1,minWidth:0}}>
                                  {e.status === "concluido" && <span style={{ fontSize: 10, marginRight: 3 }}>✅</span>}
                                  {e.tipo?.startsWith("bloq")
                                    ? <span style={{ color: e.tipo === "bloq_geral" ? "#C0392B" : (artists.find((a:any) => a.id === e.tipo?.replace("bloq_",""))?.cor || "#888"), fontWeight: 700 }}>
                                        🔒 {e.tipo === "bloq_geral" ? "TODOS" : (artists.find((a:any) => a.id === e.tipo?.replace("bloq_",""))?.nome?.split(" ")[0] || "Bloqueio")}
                                      </span>
                                    : e.title
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
                      <div key={h} className="dr">
                        <div className="dtime">{h}:00</div>
                        <div className="dslot" style={{ position: "relative", minHeight: 46 }}
                          onClick={() => { if (!evs.length && !occupied) { setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); setAgForm(f => ({ ...f, date: ds, start: h, end: h + 2, title: "", desc: "", tipo: "cons_abraao" })); setShowAgForm(true); } }}>
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
                                  cursor: "pointer",
                                  opacity: e.status === "cancelado" ? 0.55 : 1
                                }}
                                onClick={ev => { ev.stopPropagation(); setEditingEvent(e); setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.desc || "", valorPrevisto: e.valor_previsto ? Number(e.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinal: e.sinal ? Number(e.sinal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinalPago: !!e.sinal_pago } as any); const cv = e.cliente_id ? clients.find(c => c.id === e.cliente_id) || null : null; setAgClientVinc(cv); setAgClientSearch(""); setShowAgForm(true); }}>
                                <span style={{ fontWeight: 600 }}>
                                  {e.status === "concluido" && "✅ "}
                                  {e.tipo?.startsWith("bloq")
                                    ? <span style={{ color: e.tipo === "bloq_geral" ? "#C0392B" : (artists.find((a:any) => a.id === e.tipo?.replace("bloq_",""))?.cor || "#888") }}>
                                        🔒 {e.tipo === "bloq_geral" ? "TODOS" : (artists.find((a:any) => a.id === e.tipo?.replace("bloq_",""))?.nome?.split(" ")[0] || "Bloqueio")}
                                      </span>
                                    : e.title
                                  } · {e.start}h–{e.end}h
                                </span>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <span style={{ opacity: .8, cursor: "pointer", fontSize: 13 }}
                                    onClick={ev => { ev.stopPropagation(); setEditingEvent(e); setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.desc || "", valorPrevisto: e.valor_previsto ? Number(e.valor_previsto).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinal: e.sinal ? Number(e.sinal).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "", sinalPago: !!e.sinal_pago } as any); const cv = e.cliente_id ? clients.find(c => c.id === e.cliente_id) || null : null; setAgClientVinc(cv); setAgClientSearch(""); setShowAgForm(true); }}>✏️</span>
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
          const categorias = ["Material","Energia","Internet","Manutencao","Marketing","Pro-labore","Aluguel","Saude","Impostos","Outros"];
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
          const totalEntradas = finFiltrado.filter(f => !f.tipo || f.tipo === "entrada").reduce((s, f) => s + (Number(f.val_a) || 0), 0);
          const totalSaidas = saidasFiltradas.reduce((s, x) => s + (Number(x.valor) || 0), 0);
          const totalRepasses = finFiltrado.filter(f => !f.tipo || f.tipo === "entrada").reduce((s, f) => s + ((Number(f.val_a) || 0) * (Number(f.com_sess) || 0) / 100), 0);
          const saldoLiquido = totalEntradas - totalSaidas - totalRepasses;
          const progressoMeta = Math.min(totalEntradas / metaMensal * 100, 100);
          const diaAtual = new Date().getDate();
          const projecao = diaAtual > 0 ? Math.round((totalEntradas / diaAtual) * 30) : 0;

          // ── depreciação mensal total ──
          const deprMensal = equipamentos.filter(e => e.ativo).reduce((s, e) => s + (Number(e.valor_aquisicao) || 0) / (Number(e.vida_util_meses) || 48), 0);

          // ── DRE ──
          const receitaBruta = totalEntradas;
          const custoVariavel = totalSaidas * 0.4;
          const custoFixo = totalSaidas * 0.6;
          const lucroAntesProlabore = receitaBruta - totalRepasses - totalSaidas - deprMensal;
          const prolabore = finFiltrado.filter(f => f.categoria === "prolabore").reduce((s, f) => s + (Number(f.val_a) || 0), 0);
          const lucroLiquido = lucroAntesProlabore - prolabore;

          return (
          <div className="fw">

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
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--tx3)" }}>Artista</span>
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
                    <input type="number" value={metaMensal} onChange={e => setMetaMensal(Number(e.target.value))}
                      style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 9px", fontSize: 12, color: "var(--tx)", outline: "none", width: 100 }} />
                  </div>
                </div>
              </div>
            )}

            {/* ════ LIVRO-CAIXA ════ */}
            {finAbaAtiva === "livrocaixa" && (<>

              {/* cards resumo */}
              <div className="fsum" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
                {[
                  { l: "Entradas", v: fmtR(totalEntradas), s: "no período filtrado", c: "var(--q3)" },
                  { l: "Saídas", v: fmtR(totalSaidas), s: "despesas do estúdio", c: "var(--q1)" },
                  { l: "Repasses", v: fmtR(totalRepasses), s: "a pagar aos artistas", c: "var(--ab)" },
                  { l: "Saldo Líquido", v: fmtR(saldoLiquido), s: "entradas − saídas − repasses", c: saldoLiquido >= 0 ? "var(--q3)" : "var(--q1)" },
                ].map((s, i) => (
                  <div className="fsc" key={i}>
                    <div className="fsl">{s.l}</div>
                    <div className="fsv" style={{ color: s.c }}>{s.v}</div>
                    <div className="fss">{s.s}</div>
                  </div>
                ))}
              </div>

              {/* meta mensal */}
              <div className="ftable">
                <div className="fth">Meta Mensal</div>
                <div style={{ padding: "13px 15px" }}>
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
                  </div>
                </div>
              </div>

              {/* desempenho artistas */}
              <div className="ftable">
                <div className="fth">Desempenho por Artista</div>
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
                  <thead><tr><th>Descrição</th><th>Artista</th><th>Data</th><th>Valor</th><th>Saldo</th><th>Forma</th><th>Categoria</th><th>Com %</th><th>Repasse</th><th>Status</th></tr></thead>
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
                          <td style={{ fontSize: 11, fontWeight: 600, color: saldoDev > 0 ? "var(--q1)" : "#27AE60" }}>
                            {valorTotal > 0 ? (saldoDev > 0 ? fmtR(saldoDev) : "✅") : "—"}
                          </td>
                          <td style={{ fontSize: 11 }}>{f.forma_pgto || f.pgto || "—"}</td>
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
                          <td style={{ color: "var(--q3)", fontWeight: 700, fontFamily: "'Cormorant Garamond',serif", fontSize: 13 }}>{rec > 0 ? fmtR(rec) : "—"}</td>
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
                      '<tr><td>&nbsp;&nbsp;(-) Repasses Artistas</td><td class="red">' + fmtR(totalRepasses) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Depreciacao Equipamentos</td><td class="red">' + fmtR(deprMensal) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Despesas Operacionais</td><td class="red">' + fmtR(totalSaidas) + '</td></tr>',
                      '<tr class="sep"><td class="bold">Resultado Antes do Pro-Labore</td><td class="' + greenClass + ' bold">' + fmtR(lucroAntesProlabore) + '</td></tr>',
                      '<tr><td>&nbsp;&nbsp;(-) Pro-Labore</td><td class="red">' + fmtR(prolabore) + '</td></tr>',
                      '<tr class="sep"><td class="bold">Lucro Liquido</td><td class="' + lucroClass + ' bold">' + fmtR(lucroLiquido) + '</td></tr>',
                      '</table>',
                      '<div class="footer">In-Quadra Ink System · ' + studioName + (cnpj ? ' · CNPJ ' + cnpj : '') + '</div>',
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
                    { l: "  (−) Repasses Artistas", v: -totalRepasses, color: "var(--q1)" },
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
                  <div className="fth">Margem por Artista</div>
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
                const hoje = new Date();
                // Sessões agendadas nos próximos 90 dias
                const ag30 = agEvents.filter(e => {
                  if (!e.date) return false;
                  const d = new Date(e.date + "T12:00:00");
                  const diff = Math.floor((d.getTime() - hoje.getTime()) / 86400000);
                  return diff >= 0 && diff <= 30 && e.status !== "cancelado";
                });
                const ag60 = agEvents.filter(e => {
                  if (!e.date) return false;
                  const d = new Date(e.date + "T12:00:00");
                  const diff = Math.floor((d.getTime() - hoje.getTime()) / 86400000);
                  return diff > 30 && diff <= 60 && e.status !== "cancelado";
                });
                const ag90 = agEvents.filter(e => {
                  if (!e.date) return false;
                  const d = new Date(e.date + "T12:00:00");
                  const diff = Math.floor((d.getTime() - hoje.getTime()) / 86400000);
                  return diff > 60 && diff <= 90 && e.status !== "cancelado";
                });
                // Saldos devedores em aberto
                const saldosAbertos = clients.reduce((s, c) => {
                  const projs = (c.projetos || []).filter((p: any) => p.status === "ativo" && p.valorTotal > 0);
                  const pago = fin.filter((f: any) => f.cliente_id === c.id && (!f.tipo || f.tipo === "entrada")).reduce((ss: number, f: any) => ss + (Number(f.val_a) || 0), 0);
                  const total = projs.reduce((ss: number, p: any) => ss + (Number(p.valorTotal) || 0), 0);
                  return s + Math.max(total - pago, 0);
                }, 0);
                const ticketAtual = totalEntradas > 0 && fin.filter(f => !f.tipo || f.tipo === "entrada").length > 0
                  ? totalEntradas / fin.filter(f => !f.tipo || f.tipo === "entrada").length
                  : 0;
                return (
                  <div className="ftable" style={{ marginTop: 12 }}>
                    <div className="fth">📈 Projeção de Caixa</div>
                    <div style={{ padding: "13px 15px", display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {[
                          { l: "Próximos 30 dias", ag: ag30, extra: "" },
                          { l: "31 a 60 dias", ag: ag60, extra: "" },
                          { l: "61 a 90 dias", ag: ag90, extra: "" },
                        ].map(({ l, ag }) => (
                          <div key={l} style={{ flex: 1, minWidth: 140, background: "var(--dk3)", borderRadius: 8, padding: "10px 12px", border: "1px solid var(--br)" }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>{l}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--q3)", fontFamily: "'Cormorant Garamond',serif" }}>{fmtR(ag.length * ticketAtual)}</div>
                            <div style={{ fontSize: 10, color: "var(--tx2)", marginTop: 2 }}>{ag.length} sessão{ag.length !== 1 ? "ões" : ""} agendada{ag.length !== 1 ? "s" : ""}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: "rgba(74,158,191,.08)", border: "1px solid rgba(74,158,191,.2)", borderRadius: 6, padding: "8px 12px", fontSize: 11, color: "var(--tx2)" }}>
                        💰 Saldo devedor em aberto: <strong style={{ color: saldosAbertos > 0 ? "var(--q2)" : "var(--tx)" }}>{fmtR(saldosAbertos)}</strong>
                        {ticketAtual > 0 && <span style={{ marginLeft: 12 }}>· Ticket médio atual: <strong style={{ color: "var(--tx)" }}>{fmtR(ticketAtual)}</strong></span>}
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
                    <thead><tr><th>Equipamento</th><th>Categoria</th><th>Artista</th><th>Valor Aquisição</th><th>Data Compra</th><th>Vida Útil</th><th>Depr. Mensal</th><th>Depr. Acumulada</th><th></th></tr></thead>
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

            {/* ── MODAL ENTRADA MANUAL ── */}
            {showEntradaForm && (
              <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowEntradaForm(false); }}>
                <div className="fmod" style={{ maxWidth: 460 }}>
                  <div className="fmh"><div className="fmt">Lançar Entrada Manual</div><button className="mc" onClick={() => setShowEntradaForm(false)}>✕</button></div>
                  <div className="fmb">
                    <div className="ff"><label className="fl">Descrição *</label><input className="fi" placeholder="Ex: Sessão avulsa, Piercing..." value={entradaForm.descricao} onChange={e => setEntradaForm({ ...entradaForm, descricao: e.target.value })} /></div>
                    <div className="fr">
                      <div className="ff"><label className="fl">Categoria</label>
                        <select className="fs" value={entradaForm.categoria} onChange={e => setEntradaForm({ ...entradaForm, categoria: e.target.value })}>
                          {catEntrada.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="ff"><label className="fl">Artista</label>
                        <select className="fs" value={entradaForm.artista_id} onChange={e => setEntradaForm({ ...entradaForm, artista_id: e.target.value })}>
                          <option value="">Sem artista</option>
                          {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome.split(" ")[0]}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="fr">
                      <div className="ff"><label className="fl">Valor (R$) *</label>
                        <input className="fi" type="text" placeholder="0,00" value={entradaForm.valor}
                          onChange={e => { const raw = e.target.value.replace(/\D/g,""); const num = raw ? (Number(raw)/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : ""; setEntradaForm({ ...entradaForm, valor: num }); }} />
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
                    <div className="fr">
                      <div className="ff"><label className="fl">Data</label><input className="fi" type="date" value={entradaForm.data} onChange={e => setEntradaForm({ ...entradaForm, data: e.target.value })} /></div>
                      <div className="ff"><label className="fl">Competência</label><input className="fi" type="month" value={entradaForm.competencia} onChange={e => setEntradaForm({ ...entradaForm, competencia: e.target.value })} /></div>
                    </div>
                    <div className="ff"><label className="fl">Cliente (opcional)</label><input className="fi" placeholder="Nome do cliente" value={entradaForm.cliente_nome} onChange={e => setEntradaForm({ ...entradaForm, cliente_nome: e.target.value })} /></div>
                  </div>
                  <div className="fmf">
                    <button className="btn-c" onClick={() => setShowEntradaForm(false)}>Cancelar</button>
                    <button className="btn-s" disabled={!entradaForm.descricao || !entradaForm.valor} onClick={async () => {
                      const val = parseFloat(entradaForm.valor.replace(/\./g,"").replace(",",".")) || 0;
                      if (val <= 0) return;
                      const artistaObj = artists.find(a => a.id === entradaForm.artista_id);
                      const com = artistaObj?.com || 0;
                      const row = {
                        tipo: "entrada", categoria: entradaForm.categoria,
                        descricao: entradaForm.descricao, cliente_nome: entradaForm.cliente_nome || "",
                        artista: entradaForm.artista_id, artista_id: entradaForm.artista_id,
                        val_a: val, val_c: val, pgto: entradaForm.forma_pgto,
                        forma_pgto: entradaForm.forma_pgto,
                        parcelas: entradaForm.forma_pgto === "Cartão" ? parseInt(entradaForm.parcelas) || 1 : 1,
                        data: entradaForm.data, competencia: entradaForm.competencia,
                        com_base: com, com_sess: com
                      };
                      const saved = await dbInsert("financeiro", row);
                      if (saved) setFin(p => [...p, { ...saved, cliente: saved.cliente_nome }]);
                      setShowEntradaForm(false);
                      setEntradaForm({ descricao: "", categoria: "sessao", cliente_nome: "", artista_id: "", valor: "", forma_pgto: "Pix", parcelas: "1", data: new Date().toISOString().split("T")[0], competencia: new Date().toISOString().slice(0,7) });
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
                      <div className="ff"><label className="fl">Artista</label>
                        <select className="fs" value={equipForm.artista_id} onChange={e => setEquipForm({ ...equipForm, artista_id: e.target.value })}>
                          <option value="">Geral (estúdio)</option>
                          {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome.split(" ")[0]}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="fr">
                      <div className="ff"><label className="fl">Valor de Aquisição (R$) *</label>
                        <input className="fi" type="text" placeholder="0,00" value={equipForm.valor_aquisicao}
                          onChange={e => { const raw = e.target.value.replace(/\D/g,""); const num = raw ? (Number(raw)/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : ""; setEquipForm({ ...equipForm, valor_aquisicao: num }); }} />
                      </div>
                      <div className="ff"><label className="fl">Data de Compra *</label><input className="fi" type="date" value={equipForm.data_compra} onChange={e => setEquipForm({ ...equipForm, data_compra: e.target.value })} /></div>
                    </div>
                    <div className="ff"><label className="fl">Vida Útil (meses) — padrão 48</label>
                      <input className="fi" type="number" min={1} value={equipForm.vida_util_meses} onChange={e => setEquipForm({ ...equipForm, vida_util_meses: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="fmf">
                    <button className="btn-c" onClick={() => setShowEquipForm(false)}>Cancelar</button>
                    <button className="btn-s" disabled={!equipForm.nome || !equipForm.valor_aquisicao || !equipForm.data_compra} onClick={async () => {
                      const val = parseFloat(String(equipForm.valor_aquisicao).replace(/\./g,"").replace(",",".")) || 0;
                      const row = { nome: equipForm.nome, valor_aquisicao: val, data_compra: equipForm.data_compra, vida_util_meses: equipForm.vida_util_meses, categoria: equipForm.categoria, artista_id: equipForm.artista_id, ativo: true };
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
                    <div className="ff"><label className="fl">Data</label><input className="fi" type="date" onChange={e => { const p = e.target.value.split("-"); setSaidaForm({ ...saidaForm, data: p[2]+"/"+p[1]+"/"+p[0] }); }} /></div>
                  </div>
                  <div className="fmf">
                    <button className="btn-c" onClick={() => setShowSaidaForm(false)}>Cancelar</button>
                    <button className="btn-s" disabled={!saidaForm.desc || saidaForm.valor <= 0} onClick={async () => {
                      const row = { descricao: saidaForm.desc, categoria: saidaForm.categoria, valor: saidaForm.valor, data: saidaForm.data };
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
              <button className="btn-aa" onClick={() => setShowArtForm(true)}>🎨 Adicionar Artista</button>
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
                          <input className="ci" type="number" min={0} value={a.meta_faturamento || 0}
                            onChange={e => {
                              const updated = { ...a, meta_faturamento: Number(e.target.value) };
                              setArtists(p => p.map(x => x.id === a.id ? updated : x));
                              setTimeout(() => dbUpsert("artistas", { id: a.id, meta_faturamento: Number(e.target.value) }), 500);
                            }} style={{ width: 72 }} />
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
                    <div className="fmt">Editar Artista</div>
                    <button className="mc" onClick={() => setEditingArtist(null)}>✕</button>
                  </div>
                  <div className="fmb">
                    <div className="ff"><label className="fl">Nome Completo</label><input className="fi" value={editingArtist.nome} onChange={e => setEditingArtist({ ...editingArtist, nome: e.target.value.replace(/(^|\s)(\S)/g, (_: string, sp: string, c: string) => sp + c.toUpperCase()) })} /></div>
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Tipo</label>
                        <select className="fs" value={editingArtist.role} onChange={e => setEditingArtist({ ...editingArtist, role: e.target.value })}>
                          <option value="residente">Residente</option>
                          <option value="guest">Guest</option>
                        </select>
                      </div>
                      <div className="ff">
                  <label className="fl">Comissão (%)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input className="fi" type="number" min={0} max={100} value={editingArtist.com} onChange={e => setEditingArtist({ ...editingArtist, com: Number(e.target.value) })} style={{ width: 80 }} />
                    <span style={{ fontSize: 11, color: "var(--tx3)", display: "flex", gap: 10 }}>
                        <span>Artista: <strong style={{ color: "var(--gold)" }}>{editingArtist.com}%</strong></span>
                        <span style={{ color: "var(--br)" }}>|</span>
                        <span>Estúdio: <strong style={{ color: "#27AE60" }}>{100 - editingArtist.com}%</strong></span>
                    </span>
                  </div>
                </div>
                    </div>
                    <div className="fr">
                      <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={editingArtist.insta || ""} onChange={e => setEditingArtist({ ...editingArtist, insta: e.target.value })} /></div>
                      <div className="ff"><label className="fl">Email</label><input className="fi" placeholder="email" value={editingArtist.email || ""} onChange={e => setEditingArtist({ ...editingArtist, email: e.target.value })} /></div>
                    </div>
                    <div className="ff">
                      <label className="fl">Telefone (visivel apenas para o dono)</label>
                      <input className="fi" placeholder="(27) 99999-9999" value={editingArtist.tel || ""} onChange={e => setEditingArtist({ ...editingArtist, tel: e.target.value })} />
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
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 600, color: "var(--tx)" }}>📄 Contrato de Artista</div>
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
                  {STAGES.map(s => {
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
                        <div key={c.id} onClick={() => { setSel(c); setSelCtx("clientes"); }} style={{ padding: "8px 10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, marginBottom: 5, cursor: "pointer" }}>
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
                <div className="dch">👥 Desempenho por Artista</div>
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
                      <div key={c.id} onClick={() => { setSel(c); setSelCtx("clientes"); }} style={{ padding: "8px 10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, marginBottom: 5, cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}>
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

        {/* ── POS-VENDA ── */}
        {tab === "posvenda" && (
          <div className="pvw">
            {pvC.length === 0
              ? <div className="empty">Nenhum cliente em pós-venda.</div>
              : pvC.map(c => (
                <div className="pvc" key={c.id}>
                  <div className="pvh">
                    <div>
                      <div className="pvn">{c.nome}</div>
                      <div className="pvm">
                        <span className={("at " + aClass(c.artista)) || ""} style={aStyle(c.artista)} style={{ marginRight: 7 }}>{aName(c.artista).split(" ")[0]}</span>
                        {c.estilo}
                        {c.nps && <span style={{ marginLeft: 9, color: "var(--gold)", fontWeight: 600 }}>NPS: {c.nps}/10</span>}
                      </div>
                    </div>
                    <button className="mc" style={{ width: "auto", padding: "0 9px", fontSize: 11 }} onClick={() => { setSel(c); setSelCtx("clientes"); }}>Ver ficha</button>
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
          </div>
        )}

        {/* ── DISPAROS ── */}
        {tab === "disparos" && (
          <div className="disw">
            <div className="disl">
              <div className="dsec">
                <div className="dsh">
                  <div className="dst">📣 Disparar por Perfil</div>
                  <div className="dss">Mensagens personalizadas por segmento</div>
                </div>
                <div className="dsb">
                  {SEGS.map(sg => {
                    const cnt = clients.filter(sg.f).length;
                    return (
                      <div key={sg.id} className={"seg" + (segSel === sg.id ? " on" : "")}
                        onClick={() => { setSegSel(segSel === sg.id ? null : sg.id); setDateSel(null); setSent(false); setEditing(false); setMsgEdit(""); }}>
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
              <div className="dsec">
                <div className="dsh">
                  <div className="dst">📅 Datas Comemorativas</div>
                  <div className="dss">Mensagens emocionais para toda a base</div>
                </div>
                <div className="dsb">
                  {DATAS.map(d => (
                    <div key={d.id} className={"di" + (dateSel === d.id ? " on" : "")}
                      onClick={() => { setDateSel(dateSel === d.id ? null : d.id); setSegSel(null); setSent(false); setEditing(false); setMsgEdit(""); }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--tx)", display: "flex", alignItems: "center", gap: 6 }}>{d.icon} {d.label}</div>
                      <div style={{ fontSize: 11, color: "var(--tx2)" }}>{d.data}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="disr">
              {/* Alerta de sazonalidade */}
              {(() => {
                const hoje = new Date();
                const proximaData = DATAS.map(d => {
                  const partes = d.data.split(" ");
                  if (partes.length !== 2) return null;
                  const meses: Record<string,number> = { Jan:0,Fev:1,Mar:2,Abr:3,Mai:4,Jun:5,Jul:6,Ago:7,Set:8,Out:9,Nov:10,Dez:11 };
                  const m = meses[partes[1]];
                  if (m === undefined) return null;
                  const dia = parseInt(partes[0]);
                  let ano = hoje.getFullYear();
                  const data = new Date(ano, m, dia);
                  if (data < hoje) data.setFullYear(ano + 1);
                  const diff = Math.floor((data.getTime() - hoje.getTime()) / 86400000);
                  return { ...d, diff };
                }).filter(Boolean).sort((a: any, b: any) => a.diff - b.diff)[0] as any;
                if (!proximaData || proximaData.diff > 30) return null;
                const qtdNutricao = clients.filter(c => ["lead","qualificacao"].includes(c.etapa)).length;
                return (
                  <div style={{ background: "rgba(201,168,76,.08)", border: "1px solid rgba(201,168,76,.25)", borderRadius: 8, padding: "12px 14px", marginBottom: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{proximaData.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>📅 {proximaData.label} em {proximaData.diff} dia{proximaData.diff !== 1 ? "s" : ""}</div>
                      <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3, lineHeight: 1.6 }}>
                        Você tem <strong style={{ color: "var(--tx)" }}>{qtdNutricao} clientes</strong> em nutrição que podem ser ativados. Selecione um segmento e programe um disparo temático.
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="dsec">
                <div className="dsh">
                  <div className="dst">📱 Preview da Mensagem</div>
                  <div className="dss">A palavra final é sempre sua</div>
                </div>
                <div className="dsb">
                  {!pmsg
                    ? <div style={{ textAlign: "center", padding: "24px 0", color: "var(--tx3)", fontSize: 12 }}>Selecione um segmento ou data</div>
                    : (
                      <>
                        <div className="prev">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                            <div className="prevl" style={{ margin: 0 }}>Mensagem via Aura</div>
                            <button onClick={() => { if (!editing) setMsgEdit(pmsg); setEditing(!editing); }}
                              style={{ background: editing ? "var(--gold-d)" : "var(--dk4)", border: "1px solid " + (editing ? "var(--gold)" : "var(--br)"), borderRadius: 4, color: editing ? "var(--gold)" : "var(--tx2)", padding: "3px 8px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>
                              {editing ? "✓ Ok" : "✏ Editar"}
                            </button>
                          </div>
                          {editing
                            ? <textarea value={msgEdit} onChange={e => setMsgEdit(e.target.value)}
                              style={{ width: "100%", minHeight: 170, background: "var(--dk4)", border: "1px solid var(--gold)", borderRadius: 7, padding: 11, fontSize: 12, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, outline: "none", resize: "vertical" }} />
                            : <div className="prevm">{msgEdit || pmsg}</div>
                          }
                          <div className="prevc">
                            📩 {dest.length} destinatário{dest.length !== 1 ? "s" : ""}
                            {dest.length > 0 && " " + dest.map((c: any) => c.nome.split(" ")[0]).slice(0, 3).join(", ") + (dest.length > 3 ? " +" + (dest.length - 3) : "")}
                          </div>
                        </div>
                        {sent
                          ? <div className="dis-ok">
                            <div style={{ fontSize: 12, color: "var(--q3)", fontWeight: 600 }}>✓ Disparo programado!</div>
                            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>Aura envia para {dest.length} cliente{dest.length !== 1 ? "s" : ""} com elegancia.</div>
                          </div>
                          : <button className="btn-dis" onClick={() => {
                            disparo();
                            // Registrar no histórico de disparos
                            const entrada = {
                              data: new Date().toLocaleDateString("pt-BR"),
                              hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                              segmento: segSel ? (SEGS.find(s => s.id === segSel)?.label || segSel) : (DATAS.find(d => d.id === dateSel)?.label || dateSel),
                              destinatarios: dest.length,
                              preview: (msgEdit || pmsg || "").slice(0, 60)
                            };
                            setDisparosHist(p => [entrada, ...p.slice(0, 19)]);
                          }} disabled={dest.length === 0}>
                            📣 Programar - {dest.length} cliente{dest.length !== 1 ? "s" : ""}
                          </button>
                        }
                      </>
                    )
                  }
                </div>
              </div>
              {/* Histórico de disparos */}
              {disparosHist.length > 0 && (
                <div className="dsec" style={{ marginTop: 0 }}>
                  <div className="dsh">
                    <div className="dst">📋 Histórico de Disparos</div>
                    <div className="dss">Últimos programados nesta sessão</div>
                  </div>
                  <div className="dsb">
                    {disparosHist.map((d, i) => (
                      <div key={i} style={{ padding: "8px 10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, marginBottom: 5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--tx)" }}>{d.segmento}</span>
                          <span style={{ fontSize: 10, color: "var(--tx3)" }}>{d.data} {d.hora}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: "var(--tx2)", fontStyle: "italic" }}>{d.preview}...</span>
                          <span style={{ fontSize: 10, color: "var(--q3)", fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>✓ {d.destinatarios} env.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL CLIENTE ── */}
        {sc && (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
            <div className="modal">
              <div className="mh" style={{ position: "relative" }}>
                <div style={{ flex: 1 }}>
                  <div className="mn">{sc.nome}</div>
                  <div className="ms">
                    <span className={"qb " + QC[sc.qual]}>{sc.qual}{sc.qual === "Q0" ? " - Presencial" : ""}</span>
                    <span className={("at " + aClass(sc.artista)) || ""} style={aStyle(sc.artista)}>{aName(sc.artista).split(" ")[0]}</span>
                    {sc.etapa === "blacklist" && <span className="tag-bl">🚫</span>}
                    {sc.etapa === "lista_espera" && <span className="tag-wl">⏳</span>}
                    <span style={{ color: "var(--tx3)", fontSize: 11 }}>Entrou em {sc.data}</span>
                    {(() => { const s = calcScore(sc); return <span style={{ fontSize: 10, fontWeight: 700, color: s.cor, background: s.cor + "22", border: `1px solid ${s.cor}44`, borderRadius: 4, padding: "1px 6px", letterSpacing: ".04em" }}>⭐ {s.label} {s.score}</span>; })()}
                    {miss(sc).map((m: string) => <span key={m} className="atag">⚠ Sem {m}</span>)}
                  </div>
                </div>
                <button className="mc" onClick={() => setSel(null)}>✕</button>
              </div>
              <div className="mb">
                {(() => {
                  const projSemValor = (sc.projetos || []).find((p: any) => p.status !== "concluido" && p.status !== "cancelado" && (!p.valorTotal || p.valorTotal === 0));
                  return projSemValor && sc.etapa !== "lead" ? (
                    <div className="ba">
                      <span style={{ fontSize: 18 }}>💰</span>
                      <div style={{ flex: 1, fontSize: 12, color: "var(--q2)", fontWeight: 600 }}>Valor do projeto não registrado — informe o valor combinado.</div>
                      <button className="btn-sm gold" onClick={() => setOrcamentoModal({ cid: sc.id, valor: "" })}>Registrar</button>
                    </div>
                  ) : null;
                })()}

                <div>
                  <div className="stit">Dados Básicos</div>
                  <div className="fg2">
                    {[
                      { l: "Nome", f: "nome" }, { l: "Telefone", f: "tel" },
                      { l: "Email", f: "email", w: !sc.email }, { l: "Instagram", f: "insta", w: !sc.insta }
                    ].map((fd, i) => (
                      <div className="fi2" key={i}>
                        <div className="fil">{fd.l}{(fd as any).w ? " ⚠" : ""}</div>
                        <input className="ef" value={(sc as any)[fd.f] || ""} placeholder={(fd as any).w ? "Clique para adicionar" : ""}
                          onChange={e => upC(sc.id, fd.f, e.target.value)}
                          style={{ borderColor: (fd as any).w && !(sc as any)[fd.f] ? "var(--q2)" : "var(--br)" }} />
                      </div>
                    ))}
                    <div className="fi2">
                      <div className="fil">Artista Responsável</div>
                      <select className="ef" value={sc.artista || ""} onChange={e => upC(sc.id, "artista", e.target.value)}>
                        {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                      </select>
                    </div>
                    {[{ l: "Origem", v: sc.orig }, { l: "Criativo", v: sc.cri }, { l: "Data de Nascimento", v: (sc as any).nascimento ? (() => { const p = ((sc as any).nascimento as string).split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : (sc as any).nascimento; })() : "—" }].map((fd, i) => (
                      <div className="fi2" key={i}><div className="fil">{fd.l}</div><div className="fiv">{fd.v || " - "}</div></div>
                    ))}
                    <div className="fi2">
                      <div className="fil">Documento <span style={{ fontSize: 9, color: "var(--tx3)" }}>RG/CPF — opcional</span></div>
                      <input className="ef" placeholder="000.000.000-00" value={(sc as any).documento || ""}
                        onChange={e => upC(sc.id, "documento", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="stit" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Projetos Artísticos</span>
                    {novoProjetoAberto !== sc.id && (
                      <button onClick={() => {
                        setNovoProjetoAberto(sc.id);
                        setNovoProjetoForm({ estilo: "", tam: "Medio", primeira: false, desc: "", valorTotal: "" });
                      }} style={{ fontSize: 11, fontWeight: 600, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "4px 10px", color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                        + Novo Projeto
                      </button>
                    )}
                  </div>
                  {/* Formulário inline de novo projeto */}
                  {novoProjetoAberto === sc.id && (
                    <div style={{ background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 8, padding: "14px", marginBottom: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Novo Projeto</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <div className="fi2">
                          <div className="fil">Valor Total do Projeto (R$)</div>
                          <input className="ef" type="text" placeholder="0,00" value={novoProjetoForm.valorTotal}
                            onChange={e => { const raw = e.target.value.replace(/\D/g,""); const num = raw ? (Number(raw)/100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : ""; setNovoProjetoForm(p => ({ ...p, valorTotal: num })); }} />
                        </div>
                        <div className="fi2">
                          <div className="fil">Estilo</div>
                          <select className="ef" value={novoProjetoForm.estilo} onChange={e => setNovoProjetoForm(p => ({ ...p, estilo: e.target.value }))}>
                            <option value="">Selecionar...</option>
                            {estiloOpts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div className="fi2">
                          <div className="fil">Tamanho</div>
                          <select className="ef" value={novoProjetoForm.tam} onChange={e => setNovoProjetoForm(p => ({ ...p, tam: e.target.value }))}>
                            <option>Discreto</option><option>Medio</option><option>Grande</option><option>Fechamento</option>
                          </select>
                        </div>
                        <div className="fi2">
                          <div className="fil">1ª Tattoo</div>
                          <select className="ef" value={novoProjetoForm.primeira ? "Sim" : "Nao"} onChange={e => setNovoProjetoForm(p => ({ ...p, primeira: e.target.value === "Sim" }))}>
                            <option value="Sim">Sim</option><option value="Nao">Não</option>
                          </select>
                        </div>
                      </div>
                      <div className="fi2">
                        <div className="fil">Descrição do Projeto</div>
                        <textarea className="ef" placeholder="Descreva o projeto..." value={novoProjetoForm.desc} onChange={e => setNovoProjetoForm(p => ({ ...p, desc: e.target.value }))}
                          style={{ resize: "vertical", minHeight: 55, width: "100%", fontFamily: "inherit" }} />
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => { setNovoProjetoAberto(null); }} style={{ background: "none", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 14px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Descartar</button>
                        <button onClick={() => {
                          const val = parseFloat(novoProjetoForm.valorTotal.replace(/\./g,"").replace(",",".")) || 0;
                          const proj = { id: Date.now(), estilo: novoProjetoForm.estilo, tam: novoProjetoForm.tam, primeira: novoProjetoForm.primeira, desc: novoProjetoForm.desc, valorTotal: val, status: "ativo", criadoEm: new Date().toLocaleDateString("pt-BR"), pagamentos: [] };
                          const projs = [...(sc.projetos || [])];
                          if (projs.length === 0 && (sc.estilo || sc.desc)) {
                            projs.push({ id: Date.now()-1, estilo: sc.estilo||"", tam: sc.tam||"Medio", primeira: sc.primeira||false, desc: sc.desc||"", valorTotal: 0, status: "ativo", criadoEm: "—", pagamentos: [] });
                          }
                          projs.push(proj);
                          upC(sc.id, "projetos", projs);
                          setNovoProjetoAberto(null);
                          setClients(p => p.map(c => c.id !== sc.id ? c : { ...c, hist: [...c.hist, { t: `Projeto criado: ${proj.estilo || "sem estilo"} — R$${val.toLocaleString("pt-BR",{minimumFractionDigits:2})}`, d: new Date().toLocaleDateString("pt-BR") }] }));
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
                          <div style={{ fontSize: 12, color: "var(--tx3)", fontStyle: "italic", padding: "8px 0" }}>Nenhum projeto cadastrado. Clique em + Novo Projeto.</div>
                        )}
                        {ativos.map((proj: any, pi: number) => (
                          <div key={proj.id} style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                              <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Projeto {pi + 1} — Em andamento</span>
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
                                  ✓ Projeto Concluído
                                </button>
                              </div>
                            </div>
                            {/* Valor total do projeto + saldo devedor */}
                            {(() => {
                              const valorTotal = Number(proj.valorTotal) || 0;
                              const pago = (proj.pagamentos || []).reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
                              const saldo = valorTotal - pago;
                              return valorTotal > 0 ? (
                                <div style={{ display: "flex", gap: 12, padding: "6px 10px", background: "var(--dk4)", borderRadius: 6, fontSize: 12 }}>
                                  <span style={{ color: "var(--tx2)" }}>Total: <strong style={{ color: "var(--tx)" }}>R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
                                  <span style={{ color: "var(--tx2)" }}>Pago: <strong style={{ color: "#27AE60" }}>R$ {pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
                                  {saldo > 0 && <span style={{ color: "var(--tx2)" }}>Saldo: <strong style={{ color: "var(--q1)" }}>R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>}
                                  {saldo <= 0 && pago > 0 && <span style={{ color: "#27AE60", fontWeight: 700 }}>✅ Quitado</span>}
                                </div>
                              ) : null;
                            })()}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 2 }}>
                              <div className="fi2">
                                <div className="fil">Valor Total do Projeto (R$)</div>
                                <input className="ef" type="text" placeholder="0,00" value={proj.valorTotal ? Number(proj.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
                                  onChange={e => {
                                    const raw = e.target.value.replace(/\D/g,""); const num = raw ? Number(raw)/100 : 0;
                                    const projs = (sc.projetos && sc.projetos.length > 0) ? [...sc.projetos] : [{ ...proj }];
                                    const idx = projs.findIndex((p: any) => p.id === proj.id);
                                    if (idx >= 0) { projs[idx] = { ...projs[idx], valorTotal: num }; upC(sc.id, "projetos", projs); }
                                    else upC(sc.id, "projetos", [{ ...proj, valorTotal: num }]);
                                  }} />
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                              <div className="fi2">
                                <div className="fil">Estilo</div>
                                <select className="ef" value={proj.estilo || ""} onChange={e => {
                                  const projs = (sc.projetos && sc.projetos.length > 0) ? [...sc.projetos] : [{ ...proj }];
                                  const idx = projs.findIndex((p: any) => p.id === proj.id);
                                  if (idx >= 0) { projs[idx] = { ...projs[idx], estilo: e.target.value }; upC(sc.id, "projetos", projs); }
                                  else upC(sc.id, "projetos", [{ ...proj, estilo: e.target.value }]);
                                }}>
                                  <option value="">Selecionar...</option>
                                  {estiloOpts.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </div>
                              <div className="fi2">
                                <div className="fil">Tamanho</div>
                                <select className="ef" value={proj.tam || ""} onChange={e => {
                                  const projs = (sc.projetos && sc.projetos.length > 0) ? [...sc.projetos] : [{ ...proj }];
                                  const idx = projs.findIndex((p: any) => p.id === proj.id);
                                  if (idx >= 0) { projs[idx] = { ...projs[idx], tam: e.target.value }; upC(sc.id, "projetos", projs); }
                                  else upC(sc.id, "projetos", [{ ...proj, tam: e.target.value }]);
                                }}>
                                  <option value="">Não informado</option>
                                  <option>Discreto</option><option>Medio</option><option>Grande</option><option>Fechamento</option>
                                </select>
                              </div>
                              <div className="fi2">
                                <div className="fil">1ª Tattoo</div>
                                <select className="ef" value={proj.primeira ? "Sim" : "Nao"} onChange={e => {
                                  const projs = (sc.projetos && sc.projetos.length > 0) ? [...sc.projetos] : [{ ...proj }];
                                  const idx = projs.findIndex((p: any) => p.id === proj.id);
                                  if (idx >= 0) { projs[idx] = { ...projs[idx], primeira: e.target.value === "Sim" }; upC(sc.id, "projetos", projs); }
                                  else upC(sc.id, "projetos", [{ ...proj, primeira: e.target.value === "Sim" }]);
                                }}>
                                  <option value="Sim">Sim</option><option value="Nao">Não</option>
                                </select>
                              </div>
                            </div>
                            <div className="fi2">
                              <div className="fil">Descrição do Projeto</div>
                              <textarea className="ef" value={proj.desc || ""} onChange={e => {
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
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Projetos Cancelados</div>
                            {projetos.filter((p: any) => p.status === "cancelado").map((proj: any) => (
                              <div key={proj.id} style={{ background: "rgba(192,57,43,.05)", border: "1px solid rgba(192,57,43,.15)", borderRadius: 6, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx3)" }}>{proj.estilo || "Sem título"}</div>
                                  <div style={{ fontSize: 11, color: "var(--tx3)" }}>Cancelado em {proj.canceladoEm || "—"}</div>
                                </div>
                                <span style={{ fontSize: 16 }}>🚫</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {concluidos.length > 0 && (
                          <div style={{ borderTop: "1px solid var(--br)", paddingTop: 8, marginTop: 2 }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Projetos Concluídos</div>
                            {concluidos.map((proj: any) => (
                              <div key={proj.id} style={{ background: "rgba(39,174,96,.05)", border: "1px solid rgba(39,174,96,.15)", borderRadius: 6, padding: "8px 12px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx2)" }}>{proj.estilo || "Sem título"} — {proj.tam}</div>
                                  <div style={{ fontSize: 11, color: "var(--tx3)" }}>Concluído em {proj.concluidoEm || "—"}</div>
                                  {proj.desc && <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2, fontStyle: "italic" }}>{proj.desc.slice(0,60)}{proj.desc.length > 60 ? "..." : ""}</div>}
                                </div>
                                <span style={{ fontSize: 16 }}>✅</span>
                              </div>
                            ))}
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
                            <div style={{ fontSize: 16, fontWeight: 700, color: totalDevedor > 0 ? "var(--q1)" : "#27AE60", fontFamily: "'Cormorant Garamond',serif" }}>{totalDevedor > 0 ? "R$ " + totalDevedor.toLocaleString("pt-BR",{minimumFractionDigits:2}) : "Quitado"}</div>
                          </div>
                          <div style={{ background: "var(--dk3)", border: credito > 0 ? "1px solid rgba(201,168,76,.4)" : "1px solid var(--br)", borderRadius: 7, padding: "10px 12px", textAlign: "center" }}>
                            <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Crédito</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: credito > 0 ? "var(--gold)" : "var(--tx3)", fontFamily: "'Cormorant Garamond',serif" }}>{credito > 0 ? "R$ " + credito.toLocaleString("pt-BR",{minimumFractionDigits:2}) : "—"}</div>
                          </div>
                        </div>
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
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 6 }}>
                      Fotos enviadas pelo cliente via Aura.
                    </div>
                    <div style={{ background: "var(--dk4)", border: "1px dashed var(--br)", borderRadius: 6, padding: "18px", textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>📷</div>
                      <div style={{ fontSize: 11, color: "var(--tx3)" }}>Integração com armazenamento em breve.</div>
                      <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 4, fontStyle: "italic" }}>A Aura aceita somente fotos. Vídeos não são aceitos.</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="stit">Comprovante de Pagamento</div>
                  <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 6 }}>
                      Comprovante coletado pela Aura após a sessão.
                    </div>
                    <div style={{ background: "var(--dk4)", border: "1px dashed var(--br)", borderRadius: 6, padding: "18px", textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>🧾</div>
                      <div style={{ fontSize: 11, color: "var(--tx3)" }}>Integração com armazenamento em breve.</div>
                    </div>
                  </div>
                </div>

                {sc.val_a > 0 && (
                  <div>
                    <div className="stit">Financeiro da Sessão</div>
                    <div className="fg3">
                      <div className="fi2">
                        <div className="fil">Valor via Aura (não editável)</div>
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
                  const dataConclusao = proj?.concluidoEm;
                  if (!dataConclusao) return null;
                  const partes = dataConclusao.split("/");
                  const dataObj = partes.length === 3 ? new Date(Number(partes[2]), Number(partes[1])-1, Number(partes[0])) : null;
                  if (!dataObj) return null;
                  const hoje = new Date();
                  const diasPassados = Math.floor((hoje.getTime() - dataObj.getTime()) / 86400000);
                  const diasRestantes = 37 - diasPassados;
                  const vencida = diasPassados > 37;
                  const urgente = !vencida && diasPassados >= 30;
                  return (
                    <div>
                      <div className="stit">🛡 Garantia de Retoque</div>
                      <div style={{ background: vencida ? "rgba(192,57,43,.08)" : urgente ? "rgba(230,126,34,.08)" : "rgba(39,174,96,.08)", border: "1px solid " + (vencida ? "rgba(192,57,43,.3)" : urgente ? "rgba(230,126,34,.3)" : "rgba(39,174,96,.3)"), borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: vencida ? "var(--q1)" : urgente ? "#E67E22" : "#27AE60" }}>
                              {vencida ? "🚫 Garantia vencida" : urgente ? ("⚠️ Vence em " + diasRestantes + " dia" + (diasRestantes !== 1 ? "s" : "")) : ("✅ " + diasRestantes + " dias restantes")}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>Sessão concluída em {dataConclusao} · D+{diasPassados}/37</div>
                          </div>
                          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--dk4)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: vencida ? "var(--q1)" : urgente ? "#E67E22" : "#27AE60", lineHeight: 1 }}>{Math.min(diasPassados, 37)}</span>
                            <span style={{ fontSize: 8, color: "var(--tx3)" }}>de 37</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 8, width: "100%", background: "var(--dk4)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 4, background: vencida ? "var(--q1)" : urgente ? "#E67E22" : "#27AE60", width: Math.min(diasPassados / 37 * 100, 100) + "%" }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <div className="stit">Faltas e Ocorrências</div>
                      <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
                        {(sc.faltas || 0) === 0 ? "Nenhuma falta registrada"
                          : (sc.faltas || 0) === 1 ? "1ª falta — cobrança de R$100,00"
                          : (sc.faltas || 0) === 2 ? "2ª falta — cobrança de 30% do valor"
                          : "3ª falta — encaminhar para Blacklist"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(sc.faltas || 0) > 0 && (
                        <button className="btn-sm" onClick={() => removerFalta(sc.id, aName(sc.artista))}>− Remover</button>
                      )}
                      {(sc.faltas || 0) < 3 && (
                        <button className="btn-sm red" onClick={() => {
                          const novasFaltas = (sc.faltas || 0) + 1;
                          // Registrar falta
                          registrarFalta(sc.id, aName(sc.artista));
                          // Aviso educado conforme política
                          setTimeout(() => {
                            if (novasFaltas === 1) {
                              setShowAviso(`⚠️ No-show registrado para ${sc.nome}.\n\nPolítica do estúdio: 1ª falta gera cobrança de R$100,00, a ser abatida no valor final da tatuagem. Comunique o cliente com respeito.`);
                            } else if (novasFaltas === 2) {
                              setShowAviso(`⚠️ 2ª falta registrada para ${sc.nome}.\n\nPolítica do estúdio: 2ª falta gera cobrança de 30% do valor orçado. O cliente pode levar o desenho mediante pagamento.`);
                            } else if (novasFaltas >= 3) {
                              setShowAviso(`🚫 3ª falta registrada para ${sc.nome}.\n\nConforme política do estúdio, este cliente deve ser encaminhado para Blacklist.`);
                            }
                          }, 300);
                        }}>+ Falta</button>
                      )}
                    </div>
                  </div>
                  {(sc.faltas || 0) > 0 && (
                    <div style={{ marginTop: 6, padding: "8px 12px", background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 6, fontSize: 11, color: "var(--q1)" }}>
                      {(sc.faltas || 0) === 1 ? "Taxa de R$100,00 será abatida no valor final da tatuagem."
                        : (sc.faltas || 0) === 2 ? "30% do valor orçado cobrado. Cliente pode levar o desenho se pagar."
                          : "3 faltas registradas. Encaminhe para Blacklist conforme política do estúdio."}
                    </div>
                  )}
                  {sc.etapa === "blacklist" && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 6 }}>
                      <span className="tag-bl">🚫 BLACKLIST</span>
                      <button className="btn-sm" onClick={() => removerBlacklist(sc.id, aName(sc.artista))}>Remover da Blacklist</button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="stit">Programa de Fidelidade</div>
                  <div style={{ padding: "12px 14px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ fontSize: 13, color: "var(--tx)", fontWeight: 600 }}>Indicações: {sc.indicacoes || 0}/8</div>
                      {(sc.credito || 0) > 0 && <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700 }}>Crédito: R$ {(sc.credito || 0).toLocaleString("pt-BR")}</div>}
                    </div>
                    <div style={{ width: "100%", background: "var(--dk4)", borderRadius: 4, height: 8, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: "100%", borderRadius: 4, background: "var(--gold)", width: Math.min((sc.indicacoes || 0) / 8 * 100, 100) + "%", transition: "width .4s" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--tx2)" }}>
                        {(sc.indicacoes || 0) >= 8 ? "Meta atingida! Crédito disponível." : "Faltam " + (8 - (sc.indicacoes || 0)) + " indicações para o crédito"}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {(sc.indicacoes || 0) > 0 && (
                          <button className="btn-sm" onClick={() => removerIndicação(sc.id, aName(sc.artista))}>− Remover</button>
                        )}
                        {(sc.indicacoes || 0) < 8 && (
                          <button className="btn-sm gold" onClick={() => registrarIndicação(sc.id, aName(sc.artista))}>+ Indicação</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CHECKLIST DE SESSÃO */}
                {["sessao_agend","tatuado"].includes(sc.etapa) && (() => {
                  const checks = [
                    { id: "contrato", l: "Contrato enviado e confirmado", ok: sc.contrato },
                    { id: "sinal", l: "Sinal recebido", ok: fin.some((f: any) => f.cliente_id === sc.id && f.pgto === "Sinal") },
                    { id: "referencia", l: "Fotos de referência recebidas", ok: !!(sc as any).refsRecebidas },
                    { id: "valor", l: "Valor do projeto registrado", ok: (sc.projetos || []).some((p: any) => p.valorTotal > 0) },
                  ];
                  const ok = checks.filter(c => c.ok).length;
                  return (
                    <div>
                      <div className="stit">✅ Checklist de Sessão</div>
                      <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: "var(--tx2)" }}>{ok}/{checks.length} itens concluídos</span>
                          <div style={{ display: "flex", gap: 3 }}>
                            {checks.map((c, i) => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: c.ok ? "#27AE60" : "var(--dk5)" }} />)}
                          </div>
                        </div>
                        {checks.map(c => (
                          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                            <span style={{ fontSize: 16, flexShrink: 0 }}>{c.ok ? "✅" : "⬜"}</span>
                            <span style={{ color: c.ok ? "var(--tx2)" : "var(--tx)", textDecoration: c.ok ? "line-through" : "none" }}>{c.l}</span>
                          </div>
                        ))}
                        {ok < checks.length && (
                          <div style={{ marginTop: 4, fontSize: 11, color: "var(--q2)", background: "rgba(212,130,10,.08)", borderRadius: 6, padding: "6px 10px" }}>
                            ⚠️ Confira os itens pendentes antes de iniciar a sessão.
                          </div>
                        )}
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
                              <div style={{ fontSize: 11, color: "var(--tx2)" }}>{String(e.start).padStart(2,"0")}h — {getEventLabel(e.tipo, artists)}</div>
                            </div>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: getEventColor(e.tipo, artists, e.artista), flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <div className="stit">Mover no Pipeline</div>
                  <div className="pm">
                    {STAGES.map(s => {
                      const critica = ["cons_agendada","sessao_agend","tatuado"].includes(s.id);
                      return (
                        <button key={s.id} className={"sb" + (sc.etapa === s.id ? " cur" : "")}
                          style={sc.etapa === s.id ? { borderColor: s.color, color: s.color, background: s.color + "18" } : {}}
                          onClick={() => {
                            if (critica && sc.etapa !== s.id) {
                              const evs = agEvents.filter(e => e.cliente_id === sc.id);
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
                      <div className="fil">Avaliação do Cliente pelo Artista</div>
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
                    <textarea value={sc.obs} onChange={e => upC(sc.id, "obs", e.target.value)}
                      style={{ width: "100%", minHeight: 50, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 5, padding: "6px 8px", fontSize: 11, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical", marginTop: 3 }}
                      placeholder="Anotações privadas..." />
                  </div>
                  </>
                  )}
                </div>

                <div>
                  <div className="stit">Historico</div>
                  {[...sc.hist].reverse().map((h: any, i: number) => (
                    <div className="hi" key={i}>
                      <div className="hd" />
                      <div><div className="ht">{h.t}</div><div className="hdt">{h.d}</div></div>
                    </div>
                  ))}
                </div>

                {selCtx === "clientes" && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--br)", marginTop: 8 }}>
                    <button onClick={() => setConfirmExcluirCliente(sc)} style={{ background: "rgba(192,57,43,.15)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "7px 16px", fontSize: 12, color: "var(--q1)", cursor: "pointer", fontWeight: 600 }}>🗑 Excluir cliente</button>
                    <button onClick={() => {
                      const updated = clients.find(c => c.id === sc.id);
                      if (updated) { saveClientDb(updated); setSel(null); }
                    }} style={{ background: "var(--gold)", border: "none", borderRadius: 6, padding: "7px 20px", fontSize: 12, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>💾 Salvar</button>
                  </div>
                )}
                {selCtx !== "clientes" && (
                  <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid var(--br)", marginTop: 8 }}>
                    <button onClick={() => {
                      const updated = clients.find(c => c.id === sc.id);
                      if (updated) { saveClientDb(updated); setSel(null); }
                    }} style={{ background: "var(--gold)", border: "none", borderRadius: 6, padding: "7px 20px", fontSize: 12, color: "#1a1a1a", cursor: "pointer", fontWeight: 700 }}>💾 Salvar</button>
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
                  <div className="mn">{showCtr.type === "artist" ? "Contrato de Artista" : "Confirmação de Projeto"}</div>
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
                        setShowAviso("Contrato copiado! A Aura enviará ao artista para assinar via Gov.br.");
                      }}>📤 Enviar via Aura</button>
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
                  <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 2 }}>Etapa {formStep} de 2 — {formStep === 1 ? "Dados Pessoais" : "Projeto Artístico"}</div>
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
                      <div className="ff"><label className="fl">Email</label><input className="fi" placeholder="email@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                      <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={form.insta} onChange={e => { const v = e.target.value; setForm({ ...form, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
                    </div>
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Artista Responsável</label>
                        <select className="fs" value={form.artista} onChange={e => setForm({ ...form, artista: e.target.value })}>
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
                          <option>Instagram Organico</option><option>Trafego Pago</option><option>Indicação</option>
                          <option>Google</option><option>Presencial</option><option>Site</option>
                        </select>
                      </div>
                      <div className="ff"><label className="fl">Data de Nascimento</label><input className="fi" type="date" value={(form as any).nascimento || ""} onChange={e => setForm({ ...form, nascimento: e.target.value } as any)} /></div>
                    </div>
                  </>
                )}
                {formStep === 2 && (
                  <>
                    <div className="fr">
                      <div className="ff" style={{ position: "relative" }}>
                        <label className="fl">Estilo</label>
                        <div style={{ display: "flex", gap: 4 }}>
                          <input className="fi" style={{ flex: 1 }} placeholder="Fine Line, Realismo..." value={form.estilo}
                            onChange={e => { const v = e.target.value.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase()); setForm({ ...form, estilo: v }); setShowEstiloDD(true); }}
                            onFocus={() => setShowEstiloDD(true)} onBlur={() => setTimeout(() => setShowEstiloDD(false), 150)} />
                          <button type="button" style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "0 8px", cursor: "pointer", color: "var(--tx2)", fontSize: 12 }}
                            onMouseDown={e => { e.preventDefault(); setShowEstiloDD(v => !v); }}>▾</button>
                        </div>
                        {showEstiloDD && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999, background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 7, boxShadow: "0 6px 24px rgba(0,0,0,.5)", maxHeight: 200, overflowY: "auto" }}>
                            {estiloOpts.filter(o => !form.estilo || o.toLowerCase().includes(form.estilo.toLowerCase())).map(o => (
                              <div key={o} onMouseDown={() => { setForm({ ...form, estilo: o }); setShowEstiloDD(false); }}
                                style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", color: "var(--tx)" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--dk3)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "")}>{o}</div>
                            ))}
                            {form.estilo && !estiloOpts.some(o => o.toLowerCase() === form.estilo.toLowerCase()) && (
                              <div onMouseDown={async () => {
                                const novaLista = [...estiloOpts, form.estilo];
                                setEstiloOpts(novaLista);
                                setShowEstiloDD(false);
                                const { data: cfgEx } = await sb.from("configuracoes").select("id").limit(1).single();
                                if (cfgEx?.id) await sb.from("configuracoes").update({ estilo_opts: novaLista }).eq("id", cfgEx.id);
                              }}
                                style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", color: "var(--gold)", borderTop: "1px solid var(--br)", fontWeight: 600 }}>
                                + Adicionar "{form.estilo}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="ff" style={{ position: "relative" }}>
                        <label className="fl">Região</label>
                        <div style={{ display: "flex", gap: 4 }}>
                          <input className="fi" style={{ flex: 1 }} placeholder="Antebraço, Costas..." value={form.regiao}
                            onChange={e => { const v = e.target.value.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase()); setForm({ ...form, regiao: v }); setShowRegiaoDD(true); }}
                            onFocus={() => setShowRegiaoDD(true)} onBlur={() => setTimeout(() => setShowRegiaoDD(false), 150)} />
                          <button type="button" style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "0 8px", cursor: "pointer", color: "var(--tx2)", fontSize: 12 }}
                            onMouseDown={e => { e.preventDefault(); setShowRegiaoDD(v => !v); }}>▾</button>
                        </div>
                        {showRegiaoDD && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999, background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 7, boxShadow: "0 6px 24px rgba(0,0,0,.5)", maxHeight: 200, overflowY: "auto" }}>
                            {regiaoOpts.filter(o => !form.regiao || o.toLowerCase().includes(form.regiao.toLowerCase())).map(o => (
                              <div key={o} onMouseDown={() => { setForm({ ...form, regiao: o }); setShowRegiaoDD(false); }}
                                style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", color: "var(--tx)" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--dk3)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "")}>{o}</div>
                            ))}
                            {form.regiao && !regiaoOpts.some(o => o.toLowerCase() === form.regiao.toLowerCase()) && (
                              <div onMouseDown={async () => {
                                const novaLista = [...regiaoOpts, form.regiao];
                                setRegiaoOpts(novaLista);
                                setShowRegiaoDD(false);
                                const { data: cfgEx } = await sb.from("configuracoes").select("id").limit(1).single();
                                if (cfgEx?.id) await sb.from("configuracoes").update({ regiao_opts: novaLista }).eq("id", cfgEx.id);
                              }}
                                style={{ padding: "8px 12px", fontSize: 12, cursor: "pointer", color: "var(--gold)", borderTop: "1px solid var(--br)", fontWeight: 600 }}>
                                + Adicionar "{form.regiao}"
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Tamanho</label>
                        <select className="fs" value={form.tam} onChange={e => setForm({ ...form, tam: e.target.value })}>
                          <option>Discreto</option><option>Medio</option><option>Grande</option><option>Fechamento</option>
                        </select>
                      </div>
                      <div className="ff">
                        <label className="fl">1ª Tattoo?</label>
                        <select className="fs" value={(form as any).primeira ? "Sim" : "Não"} onChange={e => setForm({ ...form, primeira: e.target.value === "Sim" } as any)}>
                          <option>Não</option><option>Sim</option>
                        </select>
                      </div>
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
                        <label className="fl">Documento RG/CPF — Opcional</label>
                        <input className="fi" placeholder="000.000.000-00" value={(form as any).documento || ""}
                          onChange={e => setForm({ ...form, documento: e.target.value } as any)} />
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
                  <button className="btn-s" disabled={!form.nome || !form.tel} onClick={() => setFormStep(2)}>Próximo →</button>
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
                <div className="fmt">Adicionar Artista</div>
                <button className="mc" onClick={() => setShowArtForm(false)}>✕</button>
              </div>
              <div className="fmb">
                <div className="ff"><label className="fl">Nome Completo *</label><input className="fi" placeholder="Nome do artista" value={artForm.nome} onChange={e => setArtForm({ ...artForm, nome: e.target.value.replace(/(^|\s)(\S)/g, (_, sp, c) => sp + c.toUpperCase()) })} /></div>
                <div className="fr">
                  <div className="ff">
                    <label className="fl">Tipo</label>
                    <select className="fs" value={artForm.role} onChange={e => setArtForm({ ...artForm, role: e.target.value })}>
                      <option value="residente">Residente</option><option value="guest">Guest</option>
                    </select>
                  </div>
                  <div className="ff">
                  <label className="fl">Comissão (%)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input className="fi" type="number" min={0} max={100} value={artForm.com} onChange={e => setArtForm({ ...artForm, com: Number(e.target.value) })} style={{ width: 80 }} />
                    <span style={{ fontSize: 11, color: "var(--tx3)", display: "flex", gap: 10 }}>
                      <span>Artista: <strong style={{ color: "var(--gold)" }}>{artForm.com}%</strong></span>
                      <span style={{ color: "var(--br)" }}>|</span>
                      <span>Estúdio: <strong style={{ color: "#27AE60" }}>{100 - artForm.com}%</strong></span>
                    </span>
                  </div>
                </div>
                </div>
                <div className="fr">
                  <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={artForm.insta} onChange={e => { const v = e.target.value; setArtForm({ ...artForm, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
                  <div className="ff"><label className="fl">Email</label><input className="fi" placeholder="email" value={artForm.email} onChange={e => setArtForm({ ...artForm, email: e.target.value })} /></div>
                </div>
                <div className="ff"><label className="fl">Telefone</label><input className="fi" placeholder="(99) 9 9999-9999" value={artForm.tel} onChange={e => setArtForm({ ...artForm, tel: maskTel(e.target.value) })} /></div>
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
                {!agForm.tipo.startsWith("bloq") && (
                <div className="ff" style={{ position: "relative" }}>
                  <label className="fl">Cliente *</label>
                  {agClientVinc ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 5, padding: "7px 10px" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: aStyle(agClientVinc.artista).background || "var(--gold)", flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: "var(--tx)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600 }}>{agClientVinc.nome}</span>
                      <span style={{ fontSize: 11, color: "var(--tx3)" }}>{agClientVinc.estilo || "—"}</span>
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
                                const tipoBase = agForm.tipo.startsWith("sess") ? "sess_" : agForm.tipo.startsWith("cons") ? "cons_" : "sess_";
                                const artId = c.artista || artists[0]?.id || "abraao";
                                setAgClientVinc(c);
                                setAgForm({ ...agForm, title: c.nome, tipo: tipoBase + artId });
                                setAgClientSearch("");
                                setAgClientDropdown(false);
                              }}>
                              <div>
                                <div style={{ fontSize: 13, color: "var(--tx)", fontFamily: "'Cormorant Garamond',serif", fontWeight: 600 }}>{c.nome}</div>
                                <div style={{ fontSize: 11, color: "var(--tx2)" }}>{c.estilo || "—"}</div>
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
                  <label className="fl">Data</label>
                  <input className="fi" type="date" value={agForm.date} onChange={e => setAgForm({ ...agForm, date: e.target.value })} />
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

                {/* 5. ARTISTA — oculto para bloqueio (sub-opções já mostram artistas) */}
                {!agForm.tipo.startsWith("bloq") && (
                <div className="ff">
                  <label className="fl">Artista</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {artists.filter(a => a.ativo).map(a => (
                      <div key={a.id} onMouseDown={() => setAgForm({ ...agForm, tipo: agForm.tipo.includes("sess") ? "sess_" + a.id : "cons_" + a.id })}
                        style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
                          background: agForm.tipo.includes(a.id) ? a.cor + "33" : "var(--dk3)",
                          border: `1px solid ${agForm.tipo.includes(a.id) ? a.cor : "var(--br)"}`,
                          color: agForm.tipo.includes(a.id) ? a.cor : "var(--tx2)" }}>
                        {a.nome.split(" ")[0]}
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {/* 6. PROJETO VINCULADO — valor vem do projeto do cliente */}
                {agClientVinc && (() => {
                  const projs = (agClientVinc.projetos || []).filter((p: any) => p.status === "ativo");
                  if (projs.length === 0) return null;
                  return (
                    <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "10px 13px" }}>
                      <div style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Projeto(s) ativo(s)</div>
                      {projs.map((p: any) => {
                        const pago = (p.pagamentos || []).reduce((s: number, x: any) => s + (Number(x.valor)||0), 0);
                        const saldo = (Number(p.valorTotal)||0) - pago;
                        return (
                          <div key={p.id} style={{ fontSize: 12, padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.04)", display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--tx)" }}>{p.estilo || "Sem estilo"} — {p.tam}</span>
                            <span>
                              {p.valorTotal > 0 && <span style={{ color: saldo > 0 ? "var(--q1)" : "#27AE60", fontWeight: 600 }}>R$ {saldo > 0 ? saldo.toLocaleString("pt-BR",{minimumFractionDigits:2}) + " a pagar" : "Quitado"}</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 6b. SINAL — oculto para bloqueio */}
                {!agForm.tipo.startsWith("bloq") && <div className="fr" style={{ gap: 10 }}>
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

                {/* 7. TIPO SESSÃO */}
                <div className="ff">
                  <label className="fl">Tipo</label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {["cons", "sess", "piercing"].map(t => {
                      const labels: Record<string,string> = { cons: "Consulta", sess: "Sessão", piercing: "Piercing" };
                      const active = agForm.tipo.startsWith(t);
                      return (
                        <div key={t} onMouseDown={() => {
                          const artist = artists.find(a => agForm.tipo.includes(a.id))?.id || (artists[0]?.id || "abraao");
                          const novoTipo = t === "piercing" ? "piercing" : t + "_" + artist;
                          const novaEtapa = t === "cons" ? "cons_agendada" : t === "sess" ? "sessao_agend" : null;
                          setAgForm({ ...agForm, tipo: novoTipo });
                          if (novaEtapa && agClientVinc) {
                            const cli = clients.find(c => c.id === agClientVinc.id);
                            if (cli && cli.etapa !== novaEtapa) executarMove(agClientVinc.id, novaEtapa);
                          }
                        }} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
                          background: active ? "rgba(201,168,76,.15)" : "var(--dk3)",
                          border: `1px solid ${active ? "var(--gold)" : "var(--br)"}`,
                          color: active ? "var(--gold)" : "var(--tx2)" }}>
                          {labels[t]}
                        </div>
                      );
                    })}
                    {/* Bloqueio — mostra opções por artista */}
                    <div style={{ position: "relative" }}>
                      <div onMouseDown={() => {
                        const isBloq = agForm.tipo.startsWith("bloq");
                        if (!isBloq) setAgForm({ ...agForm, tipo: "bloq_geral" });
                      }} style={{ padding: "6px 14px", borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600,
                        background: agForm.tipo.startsWith("bloq") ? "rgba(192,57,43,.15)" : "var(--dk3)",
                        border: `1px solid ${agForm.tipo.startsWith("bloq") ? "var(--q1)" : "var(--br)"}`,
                        color: agForm.tipo.startsWith("bloq") ? "var(--q1)" : "var(--tx2)" }}>
                        🔒 Bloqueio
                      </div>
                    </div>
                  </div>
                  {/* Sub-opções de bloqueio */}
                  {agForm.tipo.startsWith("bloq") && (
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
                  )}
                </div>

                {/* 8. PIPELINE DO CLIENTE — oculto para bloqueio */}
                {agClientVinc && !agForm.tipo.startsWith("bloq") && (() => {
                  const cli = clients.find(c => c.id === agClientVinc.id);
                  if (!cli) return null;
                  const stage = STAGES.find(s => s.id === cli.etapa);
                  return (
                    <div className="ff">
                      <label className="fl">Pipeline</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {STAGES.filter(s => !["blacklist"].includes(s.id)).map(s => (
                          <div key={s.id}
                            onMouseDown={() => {
                              if (s.id !== cli.etapa) {
                                // Use same confirmation flow as kanban pipeline
                                const evs = agEvents.filter(e => e.cliente_id === cli.id);
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
                    </div>
                  );
                })()}

              </div>
              <div className="fmf" style={{ justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  {editingEvent && (
                    <button className="btn-c" style={{ color: "var(--q1)", borderColor: "rgba(192,57,43,.3)" }}
                      onClick={() => { setConfirmExcluir(editingEvent); }}>
                      🗑 Excluir
                    </button>
                  )}
                  {editingEvent && editingEvent.status !== "cancelado" && !editingEvent.tipo?.startsWith("bloq") && (
                    <button className="btn-c" style={{ color: "#E67E22", borderColor: "rgba(230,126,34,.3)" }}
                      onClick={() => setConfirmCancelarEvento({ event: editingEvent, motivo: "" })}>
                      ⊘ Cliente Desmarcou
                    </button>
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
                  <button className="btn-c" onClick={() => { setShowAgForm(false); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch(""); }}>Cancelar</button>
                  <button className="btn-s" onClick={() => {
                    if (!agClientVinc && !agForm.tipo.startsWith("bloq")) {
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
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button className="btn-c" onClick={() => setConfirmAgForm(false)}>Cancelar</button>
                <button className="btn-s" onClick={() => { setConfirmAgForm(false); saveAgEvent(); }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CONFIRMAR CANCELAR EVENTO ── */}
        {confirmCancelarEvento && (
          <div className="ov" onClick={() => setConfirmCancelarEvento(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid rgba(230,126,34,.4)", borderRadius: 12, width: "min(460px, 92vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "#E67E22" }}>⊘ Cliente Desmarcou</div>
              <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.6 }}>
                Ao cancelar, o cliente será movido automaticamente para <strong style={{ color: "#888" }}>Hibernação</strong> e o motivo ficará registrado no histórico — disponível para a Aura usar no recontato.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: "var(--tx3)", textTransform: "uppercase", letterSpacing: ".06em" }}>Motivo do cancelamento *</label>
                <textarea
                  placeholder="Ex: cliente desmarcou, problema de saúde, questão financeira..."
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
                          { t: "⊘ Evento cancelado: " + (event.date || "").split("-").reverse().join("/"), d: new Date().toLocaleDateString("pt-BR") },
                          { t: "Motivo cancelamento: " + motivo, d: new Date().toLocaleDateString("pt-BR") },
                          { t: "Aura: recontato sugerido em 30 dias", d: new Date().toLocaleDateString("pt-BR") },
                        ]
                      }));
                      executarMove(agClientVinc.id, "hibernacao");
                    }
                    addLog(`Agenda: evento "${event.title}" cancelado — ${motivo}`);
                    setConfirmCancelarEvento(null);
                    setShowAgForm(false); setEditingEvent(null); setAgClientVinc(null); setAgClientSearch("");
                  }}>
                  ⊘ Confirmar Cancelamento
                </button>
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
                <div className="ff"><label className="fl">Data da 1ª Sessão</label>
                  <input className="fi" type="date" value={recorrenteForm.dataInicio} onChange={e => setRecorrenteForm(p => ({ ...p, dataInicio: e.target.value }))} />
                </div>
                <div className="ff"><label className="fl">Artista</label>
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
                    <div style={{ color: "var(--tx)", fontWeight: 600 }}>{proj.estilo || "Sem estilo"} — {proj.tam}</div>
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
        {showAviso && (
          <div className="ov" onClick={() => setShowAviso(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 12, width: "min(400px, 90vw)", padding: "24px 24px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif" }}>⚠ Atenção</div>
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
                    {saldo > 0 && <span>Saldo restante: <strong style={{ color: "var(--q1)" }}>R$ {saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>}
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
                    <select value={f.parcelas} onChange={e => setPagFormas(p => p.map((x,j) => j===i ? {...x, parcelas: e.target.value} : x))}
                      style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "6px 8px", fontSize: 12, color: "var(--tx)", width: 60 }}>
                      {["1","2","3","4","5","6","7","8","9","10","11","12"].map(n => <option key={n}>{n}x</option>)}
                    </select>
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
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--tx)" }}>O que acontece após esta sessão?</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button title="A tatuagem terá mais sessões. Abre o formulário para agendar a próxima." onClick={() => {
                    const etapaAnterior = clients.find(c => c.id === confirmPagamento?.cid)?.etapa || "sessao_agend";
                    confirmarPagamento();
                    const cli = clients.find(c => c.id === confirmPagamento?.cid);
                    // Undo 8s
                    if (undoSessaoTimer) clearTimeout(undoSessaoTimer);
                    const t = setTimeout(() => { setUndoSessao(null); setUndoSessaoTimer(null); }, 8000);
                    setUndoSessaoTimer(t);
                    setUndoSessao({ cid: confirmPagamento?.cid, etapaAnterior, finIds: [] });
                    if (cli) {
                      setTimeout(() => {
                        setEditingEvent(null);
                        setAgClientVinc(cli);
                        setAgClientSearch("");
                        setAgForm({ title: cli.nome, desc: "", tipo: "sess_" + (cli.artista || "abraao"), date: "", start: 9, end: 11 } as any);
                        setShowAgForm(true);
                      }, 400);
                    }
                  }} style={{ flex: 1, background: "rgba(74,158,191,.15)", border: "1px solid rgba(74,158,191,.3)", borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 600, color: "var(--ab)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    📅 Agendar Próxima Sessão
                  </button>
                  <button title="A tatuagem está finalizada. O cliente vai para pós-venda." onClick={() => {
                    const etapaAnterior = clients.find(c => c.id === confirmPagamento?.cid)?.etapa || "sessao_agend";
                    if (undoSessaoTimer) clearTimeout(undoSessaoTimer);
                    const t = setTimeout(() => { setUndoSessao(null); setUndoSessaoTimer(null); }, 8000);
                    setUndoSessaoTimer(t);
                    setUndoSessao({ cid: confirmPagamento?.cid, etapaAnterior, finIds: [] });
                    confirmarPagamento();
                  }} style={{ flex: 1, background: "rgba(39,174,96,.15)", border: "1px solid rgba(39,174,96,.3)", borderRadius: 7, padding: "9px 12px", fontSize: 12, fontWeight: 600, color: "#27AE60", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    ✅ Tatuagem Finalizada
                  </button>
                </div>
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
                      <button title="Altere a data ou horário. Será movido automaticamente no pipeline ao salvar." onClick={() => {
                        setConfirmMover(null);
                        setEditingEvent(e);
                        const cv = clients.find(c => c.id === e.cliente_id) || null;
                        setAgClientVinc(cv);
                        setAgClientSearch("");
                        const tipoCorreto = confirmMover.stage.id === "cons_agendada"
                          ? "cons_" + (cv?.artista || artists[0]?.id || "abraao")
                          : "sess_" + (cv?.artista || artists[0]?.id || "abraao");
                        setAgForm({ title: e.title, tipo: tipoCorreto, date: e.date, start: e.start, end: e.end, desc: e.desc || "", valorPrevisto: e.valor_previsto ? Number(e.valor_previsto).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "", sinal: "", sinalPago: false } as any);
                        setShowAgForm(true);
                      }} style={{ fontSize: 11, background: "var(--dk4)", border: "1px solid var(--gold)", borderRadius: 5, padding: "3px 9px", color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>📅 Definir Agendamento</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: "rgba(212,130,10,.1)", border: "1px solid rgba(212,130,10,.3)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "#D4820A" }}>
                  ⚠️ Nenhum agendamento encontrado para este cliente.
                </div>
              )}
              {/* Botão + Agendar — aparece sempre que não há agendamento, ou em sessão agendada */}
              {(confirmMover.agEvents.length === 0 || confirmMover.stage.id === "sessao_agend") && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button title="Cria um novo agendamento para este cliente. O tipo escolhido move o pipeline automaticamente." onClick={() => {
                    const cli = clients.find(c => c.id === confirmMover.cid);
                    const artId = cli?.artista || artists[0]?.id || "abraao";
                    const tipoDefault = confirmMover.stage.id === "cons_agendada" ? "cons_" + artId : "sess_" + artId;
                    setConfirmMover(null);
                    setEditingEvent(null);
                    setAgClientVinc(cli || null);
                    setAgClientSearch("");
                    setAgForm({ title: cli?.nome || "", desc: "", tipo: tipoDefault, date: "", start: 9, end: 11, sinal: "", sinalPago: false } as any);
                    setShowAgForm(true);
                  }} style={{ flex: 1, background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 6, padding: "7px 10px", fontSize: 11, fontWeight: 600, color: "var(--gold)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
                    + Agendar
                  </button>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn-c" onClick={() => setConfirmMover(null)}>Cancelar</button>
                <button className="btn-s" onClick={() => {
                  const precisaAg = ["cons_agendada", "sessao_agend"].includes(confirmMover.stage.id);
                  if (precisaAg && confirmMover.agEvents.length === 0) {
                    setShowAviso("Defina um horário antes de confirmar. Use o botão + Agendar para criar um agendamento.");
                    return;
                  }
                  setConfirmMover(null);
                  move(confirmMover.cid, confirmMover.stage.id);
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
                  {isHibernacao && "Informe o motivo e em quantos dias a Aura deve tentar recontato."}
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
                    <span style={{ fontSize: 12, color: "var(--tx2)" }}>Aura recontata em</span>
                    <input type="number" min={1} value={pipelineMotivo.dias || "30"}
                      onChange={e => setPipelineMotivo(p => p ? { ...p, dias: e.target.value } : p)}
                      style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 6, padding: "5px 9px", fontSize: 12, color: "var(--tx)", width: 70, outline: "none" }} />
                    <span style={{ fontSize: 12, color: "var(--tx2)" }}>dias</span>
                    <span style={{ fontSize: 11, color: "var(--tx3)", fontStyle: "italic" }}>(sugestão para a Aura)</span>
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
                            ...(isHibernacao && dias ? [{ t: "Aura: recontato em " + dias + " dias", d: new Date().toLocaleDateString("pt-BR") }] : []),
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
          <div className="ov" onClick={() => setConfirmReset(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "var(--dk2)", border: "1px solid rgba(192,57,43,.4)", borderRadius: 12, width: "min(480px, 92vw)", padding: "28px 28px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(192,57,43,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>⚠️</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#C0392B", fontFamily: "'Cormorant Garamond',serif" }}>Reset de Fábrica</div>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginTop: 3 }}>Esta ação é irreversível</div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.7, background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 8, padding: "14px 16px" }}>
                Serão apagados permanentemente:<br />
                <strong style={{ color: "var(--tx)" }}>• Todos os clientes</strong><br />
                <strong style={{ color: "var(--tx)" }}>• Todos os agendamentos</strong><br />
                <strong style={{ color: "var(--tx)" }}>• Todos os lançamentos financeiros e saídas</strong><br /><br />
                <span style={{ color: "var(--tx3)", fontSize: 12 }}>Artistas e configurações do estúdio serão mantidos.</span>
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
                          setClients([]); setAgEvents([]); setFin([]); setSaidas([]);
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
                    const artista = cliente?.artista || "abraao";
                    const artObj = artists.find(a => a.id === artista);
                    const comPct = artObj?.com || 60;
                    upC(orcamentoModal.cid, "val_a", v);
                    upC(orcamentoModal.cid, "orcamento", false);
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
                      status: "pendente"
                    };
                    const { data: fd } = await sb.from("financeiro").insert(finRow).select().single();
                    if (fd) setFin(p => [...p, { ...finRow, id: fd.id, cliente: cliente?.nome }]);
                    setClients(p => p.map(c => c.id !== orcamentoModal.cid ? c : { ...c, hist: [...c.hist, { t: "Orçamento registrado: R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 }), d: new Date().toLocaleString("pt-BR") }] }));
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
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--tx)" }}>Remover artista?</div>
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
                    addLog(`Artista "${confirmRemoverArtista.nome}" removido`);
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

        {/* ── SETTINGS ── */}
        {showSettings && (() => {
          // Snapshot para cancelar
          return (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}>
            <div className="settings-modal">
              <div className="mh">
                <div>
                  <div className="mn">{studioName}</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>In-Quadra Ink System</div>
                </div>
                <button className="mc" onClick={() => setShowSettings(false)}>✕</button>
              </div>
              {/* ABAS */}
              <div style={{ display: "flex", borderBottom: "1px solid var(--br)" }}>
                {([["estudio","🏠 Estúdio"],["ia","🤖 Editar IA"],["sistema","⚙️ Sistema"]] as const).map(([id, label]) => (
                  <div key={id} onClick={() => setSettingsTab(id)}
                    style={{ flex: 1, padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: ".04em",
                      color: settingsTab === id ? "var(--gold)" : "var(--tx3)",
                      borderBottom: settingsTab === id ? "2px solid var(--gold)" : "2px solid transparent",
                      background: settingsTab === id ? "rgba(201,168,76,.05)" : "none" }}>
                    {label}
                  </div>
                ))}
              </div>

              <div className="mb">

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
                    <div className="stit">Perfil do Estúdio</div>
                    <div className="fg2">
                      <div className="fi2"><div className="fil">Nome do Estúdio</div><input className="ef" value={studioName} onChange={e => setStudioName(e.target.value)} /></div>
                      <div className="fi2"><div className="fil">Responsável</div><input className="ef" value={studioOwner} onChange={e => setStudioOwner(e.target.value)} /></div>
                      <div className="fi2"><div className="fil">Cidade</div><input className="ef" value={studioCity} onChange={e => setStudioCity(e.target.value)} /></div>
                      <div className="fi2"><div className="fil">WhatsApp</div><input className="ef" value={studioTel} onChange={e => setStudioTel(e.target.value)} /></div>
                      <div className="fi2"><div className="fil">Instagram</div><input className="ef" value={studioInsta} onChange={e => setStudioInsta(e.target.value)} /></div>
                      <div className="fi2"><div className="fil">Email</div><input className="ef" value={studioEmail} onChange={e => setStudioEmail(e.target.value)} /></div>
                      <div className="fi2"><div className="fil">CNPJ</div><input className="ef" value={cnpj} onChange={e => setCnpj(e.target.value)} /></div>
                      <div className="fi2"><div className="fil">Link Google Meu Negócio</div><input className="ef" value={googleLink} onChange={e => setGoogleLink(e.target.value)} /></div>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Metas Mensais</div>
                    <div className="fg2">
                      <div className="fi2"><div className="fil">Meta de Faturamento (R$)</div><input className="ef" type="number" value={metaMensal} onChange={e => setMetaMensal(Number(e.target.value))} /></div>
                      <div className="fi2"><div className="fil">Meta de Sessões</div><input className="ef" type="number" value={metaSessoes} onChange={e => setMetaSessoes(Number(e.target.value))} /></div>
                      <div className="fi2"><div className="fil">Meta de Leads</div><input className="ef" type="number" value={metaLeads} onChange={e => setMetaLeads(Number(e.target.value))} /></div>
                      <div className="fi2"><div className="fil">Meta NPS 9+</div><input className="ef" type="number" value={metaNPS} onChange={e => setMetaNPS(Number(e.target.value))} /></div>
                    </div>
                  </div>
                  <div>
                    <div className="stit">Horários de Funcionamento</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8 }}>A {auraName} atende 24h. Estes horários são para a agenda interna.</div>
                    {horarios.map((h, i) => (
                      <div key={h.dia} className="hr-row">
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
                    ))}
                  </div>
                  <div>
                    <div className="stit">Manutenção</div>
                    <button style={{ background: "rgba(52,152,219,.12)", border: "1px solid rgba(52,152,219,.3)", borderRadius: 7, padding: "8px 16px", fontSize: 12, color: "#3498DB", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                      onClick={async () => {
                        let corrigidos = 0;
                        for (const c of clients) {
                          const nomeCorrigido = c.nome?.replace(/(^|\s)(\S)/g, (_: string, sp: string, ch: string) => sp + ch.toUpperCase());
                          if (nomeCorrigido !== c.nome) { await sb.from("clientes").update({ nome: nomeCorrigido }).eq("id", c.id); corrigidos++; }
                        }
                        setClients(p => p.map(c => ({ ...c, nome: c.nome?.replace(/(^|\s)(\S)/g, (_: string, sp: string, ch: string) => sp + ch.toUpperCase()) })));
                        setShowAviso(`${corrigidos} nome(s) corrigido(s) com sucesso.`);
                      }}>
                      Aa Corrigir Capitalização dos Nomes
                    </button>
                  </div>
                </>}

                {/* ── ABA IA ── */}
                {settingsTab === "ia" && <>
                  <div style={{ background: "rgba(201,168,76,.06)", border: "1px solid rgba(201,168,76,.15)", borderRadius: 8, padding: "12px 14px", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, color: "var(--gold)", fontWeight: 600, marginBottom: 4 }}>🔒 Essência imutável</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)", lineHeight: 1.6 }}>A {auraName} sempre será transparente sobre ser uma IA, nunca se passará por humano e manterá o padrão premium do estúdio. Estas configurações ajustam comportamentos secundários.</div>
                  </div>
                  <div>
                    <div className="stit">Identidade</div>
                    <div className="fi2">
                      <div className="fil">Nome da IA</div>
                      <input className="ef" value={auraName} placeholder="Aura"
                        onChange={e => setAuraName(e.target.value.replace(/(^|\s)(\S)/g, (_: string, sp: string, ch: string) => sp + ch.toUpperCase()))} />
                    </div>
                  </div>
                  <div>
                    <div className="stit">Tom de Comunicação</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Formalidade</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {["Formal","Equilibrado","Descontraído"].map(op => (
                            <button key={op} onClick={() => setAuraFormalidade(op)}
                              style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: auraFormalidade === op ? "1px solid var(--gold)" : "1px solid var(--br)", background: auraFormalidade === op ? "rgba(201,168,76,.15)" : "var(--dk3)", color: auraFormalidade === op ? "var(--gold)" : "var(--tx2)", fontSize: 12, fontWeight: auraFormalidade === op ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}>
                              {op}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Idioma Principal</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {["Português","Inglês","Espanhol"].map(op => (
                            <button key={op} onClick={() => setAuraIdioma(op)}
                              style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: auraIdioma === op ? "1px solid var(--gold)" : "1px solid var(--br)", background: auraIdioma === op ? "rgba(201,168,76,.15)" : "var(--dk3)", color: auraIdioma === op ? "var(--gold)" : "var(--tx2)", fontSize: 12, fontWeight: auraIdioma === op ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}>
                              {op}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Traços de Personalidade <span style={{ color: "var(--tx3)", fontWeight: 400 }}>(escolha até 3)</span></div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {["Acolhedora","Sofisticada","Empática","Direta","Entusiasmada","Objetiva"].map(op => {
                            const sel: string[] = (auraFormalidade as any).personalidade || [];
                            const isOn = sel.includes(op);
                            return (
                              <button key={op} onClick={() => {
                                const cur: string[] = (auraFormalidade as any).personalidade || [];
                                const next = isOn ? cur.filter((x: string) => x !== op) : cur.length < 3 ? [...cur, op] : cur;
                                setAuraFormalidade({ ...(auraFormalidade as any), personalidade: next } as any);
                              }}
                                style={{ padding: "7px 14px", borderRadius: 7, border: isOn ? "1px solid var(--gold)" : "1px solid var(--br)", background: isOn ? "rgba(201,168,76,.15)" : "var(--dk3)", color: isOn ? "var(--gold)" : "var(--tx2)", fontSize: 12, fontWeight: isOn ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}>
                                {op}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Ritmo das Mensagens</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {["Mensagens curtas","Mensagens elaboradas"].map(op => {
                            const cur = typeof auraFormalidade === "string" ? auraFormalidade : (auraFormalidade as any).ritmo;
                            const isOn = cur === op;
                            return (
                              <button key={op} onClick={() => setAuraFormalidade({ ...(auraFormalidade as any), ritmo: op } as any)}
                                style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: isOn ? "1px solid var(--gold)" : "1px solid var(--br)", background: isOn ? "rgba(201,168,76,.15)" : "var(--dk3)", color: isOn ? "var(--gold)" : "var(--tx2)", fontSize: 12, fontWeight: isOn ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}>
                                {op}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".06em" }}>Uso de Emojis</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {["Nenhum","Moderado","Expressivo"].map(op => {
                            const cur = typeof auraFormalidade === "string" ? "" : (auraFormalidade as any).emojis;
                            const isOn = cur === op;
                            return (
                              <button key={op} onClick={() => setAuraFormalidade({ ...(auraFormalidade as any), emojis: op } as any)}
                                style={{ flex: 1, padding: "8px 4px", borderRadius: 7, border: isOn ? "1px solid var(--gold)" : "1px solid var(--br)", background: isOn ? "rgba(201,168,76,.15)" : "var(--dk3)", color: isOn ? "var(--gold)" : "var(--tx2)", fontSize: 12, fontWeight: isOn ? 700 : 400, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all .15s" }}>
                                {op}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </>}

                {/* ── ABA SISTEMA ── */}
                {settingsTab === "sistema" && <>
                  <div>
                    <div className="stit">Tour Guiado</div>
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 10 }}>Refaça o tour de apresentação do sistema a qualquer momento.</div>
                    <button style={{ background: "rgba(52,152,219,.12)", border: "1px solid rgba(52,152,219,.3)", borderRadius: 7, padding: "8px 16px", fontSize: 12, color: "#3498DB", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                      onClick={() => { setShowSettings(false); localStorage.removeItem("inq_tour"); setTourStep(0); setTimeout(() => setTourAtivo(true), 300); }}>
                      🧭 Refazer Tour
                    </button>
                  </div>
                  <div>
                    <div className="stit">Versão</div>
                    <div style={{ fontSize: 12, color: "var(--tx3)" }}>In-Quadra Ink System <strong style={{ color: "var(--tx2)" }}>v1.5.0</strong></div>
                  </div>
                  <div>
                    <div className="stit" style={{ color: "#C0392B" }}>Zona de Perigo</div>
                    <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 10 }}>Apaga todos os clientes, agendamentos e lançamentos financeiros. Artistas e configurações são mantidos.</div>
                    <button style={{ background: "rgba(192,57,43,.12)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 7, padding: "8px 16px", fontSize: 12, color: "#C0392B", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                      onClick={() => setConfirmReset(true)}>
                      🗑 Limpar Dados de Teste
                    </button>
                  </div>
                </>}

              </div>

              <div className="fmf">
                <button className="btn-c" onClick={() => setShowSettings(false)}>Cancelar</button>
                <div style={{ display: "flex", gap: 8 }}>
                  {settingsTab !== "sistema" && (
                    <button style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "8px 16px", fontSize: 12, color: "var(--tx2)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                      onClick={() => setSettingsTab(settingsTab === "estudio" ? "ia" : "sistema")}>
                      Próximo →
                    </button>
                  )}
                  <button className="btn-s" onClick={async () => {
                  const cfg = {
                    studio_name: studioName, studio_tel: studioTel,
                    studio_owner: studioOwner, studio_email: studioEmail,
                    studio_city: studioCity, studio_insta: studioInsta,
                    aura_name: auraName, aura_formalidade: auraFormalidade,
                    aura_idioma: auraIdioma, google_link: googleLink,
                    cnpj, meta_mensal: metaMensal,
                    meta_sessoes: metaSessoes, meta_leads: metaLeads, meta_nps: metaNPS,
                    horarios, dark_mode: dark,
                    updated_at: new Date().toISOString()
                  };
                  const { data: existing } = await sb.from("configuracoes").select("id").limit(1).single();
                  if (existing?.id) {
                    await sb.from("configuracoes").update(cfg).eq("id", existing.id);
                  } else {
                    await sb.from("configuracoes").insert({ id: 1, ...cfg });
                  }
                  setShowSettings(false);
                  setShowAviso("Configurações salvas com sucesso.");
                }}>Salvar</button>
                </div>
              </div>
            </div>
          </div>
          );
        })()}
      </div>
    </>
  );
}
