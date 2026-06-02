import { useState, useMemo, useEffect, useCallback } from "react";
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
async function dbUpsert(table: string, row: any) {
  const { data, error } = await sb.from(table).upsert(row).select().single();
  if (error) { console.error("upsert", table, error); return null; }
  return data;
}
async function dbInsert(table: string, row: any) {
  const { data, error } = await sb.from(table).insert(row).select().single();
  if (error) { console.error("insert", table, error); return null; }
  return data;
}
async function dbDelete(table: string, id: any) {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) console.error("delete", table, error);
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
.root{min-height:100vh;background:var(--dk);display:flex;flex-direction:column;}
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
.kw{flex:1;overflow-x:auto;padding:14px;display:flex;gap:11px;}
.kc{min-width:215px;max-width:215px;display:flex;flex-direction:column;gap:6px;}
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
`;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "lead", label: "Lead", color: "#5B8DEF", emoji: "🎯" },
  { id: "qualificacao", label: "Qualificação", color: "#C9A84C", emoji: "🔍" },
  { id: "cons_agendada", label: "Consultoria", color: "#9B6BB5", emoji: "📅" },
  { id: "sessao_agend", label: "Sessão Agendada", color: "#4A9EBF", emoji: "✏️" },
  { id: "tatuado", label: "Tatuado", color: "#27AE60", emoji: "✅" },
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
  sess_abraao: "#C9A84C",
  cons_camilla: "#9B6BB5",
  sess_camilla: "#27AE60",
  bloq_abraao: "#C0392B",
  bloq_camilla: "#E67E22",
  bloq_geral: "#555",
  piercing: "#E91E8C"
};

const CAL_LABELS: Record<string, string> = {
  cons_abraao: "Consulta Abraao",
  sess_abraao: "Sessão Abraao",
  cons_camilla: "Consulta Camilla",
  sess_camilla: "Sessão Camilla",
  bloq_abraao: "Bloq. Abraao",
  bloq_camilla: "Bloq. Camilla",
  bloq_geral: "Bloq. Geral",
  piercing: "Piercing"
};

const SEGS = [
  { id: "todos", label: "Todos", desc: "Toda a base", icon: "👥", f: () => true },
  { id: "q0", label: "Q0 - Acompanhantes", desc: "Estiveram no atelier", icon: "🟣", f: (c: any) => c.qual === "Q0" },
  { id: "q1", label: "Q1 - Frios", desc: "Nutricao e educacao", icon: "🔴", f: (c: any) => c.qual === "Q1" },
  { id: "q2", label: "Q2 - Quentes", desc: "Prontos para avancar", icon: "🟡", f: (c: any) => c.qual === "Q2" },
  { id: "tatuados", label: "Tatuados", desc: "Ja fizeram sessao", icon: "🖤", f: (c: any) => c.etapa === "tatuado" || c.etapa === "pos_venda" },
  { id: "primeira", label: "Primeira Tattoo", desc: "Primeira vez", icon: "✨", f: (c: any) => c.primeira },
  { id: "abraao", label: "Clientes Abraao", desc: "Direcionados ao Abraao", icon: "🔵", f: (c: any) => c.artista === "abraao" },
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
    id: "abraao", nome: "Abraao Carvalho", role: "residente", com: 60,
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
    regiao: "Panturrilha", tam: "Grande", orig: "Indicacao", cri: "",
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
    estilo: "Fine Line", regiao: "Costela", tam: "Medio", orig: "Indicacao", cri: "",
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

const FIN_INIT = [
  {
    id: 1, cliente: "Juliana Ferreira", artista: "camilla", tipo: "Sessão",
    data: "22/05/2026", val_a: 800, val_c: 800, pgto: "Pix", com_base: 60, com_sess: 60
  },
  {
    id: 2, cliente: "Amanda Oliveira", artista: "camilla", tipo: "Sessão",
    data: "15/05/2026", val_a: 2200, val_c: 2200, pgto: "Cartao", com_base: 60, com_sess: 65
  },
];


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
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [onbStep, setOnbStep] = useState(0);
  const [dark, setDark] = useState(true);
  const [studioName, setStudioName] = useState("Casa dos Carvalho");
  const [studioTel, setStudioTel] = useState("(27) 99999-0000");
  const [studioOwner, setStudioOwner] = useState("Abraao Carvalho");
  const [studioEmail, setStudioEmail] = useState("");
  const [studioCity, setStudioCity] = useState("Vitoria - ES");
  const [studioInsta, setStudioInsta] = useState("@casadoscarvalho");
  const [auraName, setAuraName] = useState("Aura");
  const [googleLink, setGoogleLink] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [metaMensal, setMetaMensal] = useState(15000);
  const [saidas, setSaidas] = useState([
    { id: 1, desc: "Material consumível", categoria: "Material", valor: 350, data: "05/06/2026" },
    { id: 2, desc: "Energia elétrica", categoria: "Energia", valor: 280, data: "10/06/2026" },
  ]);
  const [showSaidaForm, setShowSaidaForm] = useState(false);
  const [saidaForm, setSaidaForm] = useState({ desc: "", categoria: "Material", valor: 0, data: new Date().toLocaleDateString("pt-BR") });
  const [clients, setClients] = useState<any[]>([]);
  const [artists, setArtists] = useState(ARTISTS_INIT);
  const [fin, setFin] = useState(FIN_INIT);
  const [agEvents, setAgEvents] = useState<any[]>([]);
  const [tab, setTab] = useState("kanban");
  const [sel, setSel] = useState<any>(null);
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
    nome: "", tel: "", email: "", insta: "", artista: "abraao",
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
        const [cls, arts, fins, sds, ags, cfgs] = await Promise.all([
          dbGet("clientes"), dbGet("artistas"), dbGet("financeiro"),
          dbGet("saidas"), dbGet("agenda"), dbGet("configuracoes")
        ]);
        if (cls && cls.length > 0) setClients(cls.map((c: any) => ({
          ...c,
          hist: c.hist || [],
          pv: c.followups || [],
          faltas: c.faltas || 0,
          indicacoes: c.indicacoes || 0,
          credito: c.credito || 0,
          desc: c.descricao || "",
        })));
        if (arts && arts.length > 0) setArtists(arts);
        if (fins && fins.length > 0) setFin(fins.map((f: any) => ({
          ...f, cliente: f.cliente_nome
        })));
        if (sds && sds.length > 0) setSaidas(sds.map((s: any) => ({
          ...s, desc: s.descricao
        })));
        if (ags && ags.length > 0) setAgEvents(ags.map((a: any) => ({
          ...a,
          title: a.titulo || a.title || "Sem título",
          date: a.data || a.date,
          start: parseInt(a.hora?.split(":")[0] || "9"),
          end: a.hora_fim ? parseInt(a.hora_fim.split(":")[0]) : parseInt(a.hora?.split(":")[0] || "9") + 2
        })));
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
          if (cfg.horarios) setHorarios(cfg.horarios);
          setDark(cfg.dark_mode !== false);
          setOnboardingDone(true);
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
      estilo: c.estilo || "", regiao: c.regiao || "",
      intencao: c.intencao || "", primeira: c.primeira || false,
      cob: c.cob || false, descricao: c.desc || "",
      stars: c.stars || 0, star_reason: c.starReason || "",
      consent: c.consent, nps: c.nps, obs: c.obs || "",
      val_a: c.val_a || 0, val_c: c.val_c || 0, pgto: c.pgto || "",
      orcamento: c.orcamento || false, contrato: c.contrato || false,
      faltas: c.faltas || 0, indicacoes: c.indicacoes || 0,
      credito: c.credito || 0, cri: c.cri || "",
      google_review: c.googleReview || false,
      hist: c.hist || [], followups: c.pv || [], dias: c.dias || 0,
      updated_at: new Date().toISOString()
    });
  }, []);

  useMemo(() => applyTheme(dark), [dark]);

  const filtered = useMemo(() => clients.filter(c => {
    const mA = fa === "todos" || c.artista === fa;
    const mS = !srch ||
      c.nome.toLowerCase().includes(srch.toLowerCase()) ||
      c.estilo.toLowerCase().includes(srch.toLowerCase());
    return mA && mS;
  }), [clients, fa, srch]);

  const getSC = (id: string) => filtered.filter(c => c.etapa === id);
  const miss = (c: any) => {
    const m: string[] = [];
    if (!c.email) m.push("Email");
    if (!c.insta) m.push("Instagram");
    return m;
  };
  const churn = (c: any) => {
    if (c.etapa !== "tatuado" && c.etapa !== "pos_venda") return null;
    if (c.dias >= 365) return "red";
    if (c.dias >= 180) return "orange";
    return null;
  };

  const alertas = useMemo(() => clients.filter(c => miss(c).length > 0 || churn(c) || c.orcamento), [clients]);
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
      return updated;
    });
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
    if (!window.confirm("Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.")) return;
    setClients(p => p.filter(c => c.id !== cid));
    setSel(null);
    await dbDelete("clientes", cid);
  };

  const registrarIndicacao = (cid: number, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novas = (c.indicacoes || 0) + 1;
      const audit = "Indicacao registrada " + novas + "/8 — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      return { ...c, indicacoes: novas, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
    }));
  };

  const removerIndicacao = (cid: number, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novas = Math.max((c.indicacoes || 0) - 1, 0);
      const audit = "Indicacao removida (correcao) " + novas + "/8 — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
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
      hist: [{ t: "Cadastro manual criado", d: new Date().toLocaleString("pt-BR") }], pv: []
    };
    // Salva no banco primeiro para obter o UUID real
    if (sb) {
      const { data, error } = await sb.from("clientes").insert({
        nome: nc.nome, insta: nc.insta || "", tel: nc.tel || "",
        qual: nc.qual, artista: nc.artista, etapa: "lead",
        estilo: nc.estilo || "", regiao: nc.regiao || "",
        intencao: nc.intencao || "", primeira: nc.primeira || false,
        cob: nc.cob || false, descricao: nc.desc || "",
        stars: 0, consent: null, nps: null, obs: "",
        val_a: 0, val_c: 0, pgto: "", orcamento: false, contrato: false,
        faltas: 0, indicacoes: 0, credito: 0, cri: "",
        hist: nc.hist, followups: [], dias: 0,
        updated_at: new Date().toISOString()
      }).select().single();
      if (!error && data) {
        setClients(p => [{ ...nc, id: data.id, etapa: "lead" }, ...p]);
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
  };

  const saveArtist = async () => {
    if (!artForm.nome.trim()) return;
    const na = { id: Date.now().toString(), ...artForm, ativo: true };
    const saved = await dbInsert("artistas", na);
    setArtists(p => [...p, { ...na, id: saved?.id || na.id }]);
    setShowArtForm(false);
    setArtForm({ nome: "", role: "guest", com: 50, cor: "#C9A84C", insta: "@", email: "", tel: "" });
  };

  const saveAgEvent = async () => {
    const row = {
      titulo: agForm.title,
      artista: agForm.tipo.includes("camilla") ? "camilla" : "abraao",
      data: agForm.date,
      hora: String(agForm.start).padStart(2, "0") + ":00",
      tipo: agForm.tipo,
      obs: (agForm as any).desc || ""
    };

    if (editingEvent) {
      const { data, error } = await sb.from("agenda").update(row).eq("id", editingEvent.id).select().single();
      if (error) { console.error("Erro ao atualizar agenda:", error); alert("Erro ao atualizar agendamento."); return; }
      setAgEvents(p => p.map(e => e.id === editingEvent.id ? {
        ...data, title: data.titulo, date: data.data,
        start: parseInt(data.hora?.split(":")[0] || "9"),
        end: parseInt(data.hora?.split(":")[0] || "9") + 2
      } : e));
      setEditingEvent(null);
      setShowAgForm(false);
      return;
    }

    const { data, error } = await sb.from("agenda").insert(row).select().single();
    if (error) { console.error("Erro ao salvar agenda:", error); alert("Erro ao salvar agendamento."); return; }
    setAgEvents(p => [...p, {
      ...data, title: data.titulo || agForm.title, date: data.data || agForm.date,
      start: parseInt(data.hora?.split(":")[0] || String(agForm.start)),
      end: parseInt(data.hora?.split(":")[0] || String(agForm.start)) + 2
    }]);
    setShowAgForm(false);
    setEditingEvent(null);
  };

  const disparo = () => { setSent(true); setTimeout(() => setSent(false), 4000); };

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
    clients.forEach(c => { m[c.orig] = (m[c.orig] || 0) + 1; });
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
  const aName = (id: string) => artists.find(a => a.id === id)?.nome || (id === "abraao" ? "Abraao" : "Camilla");
  const aColor = (id: string) => artists.find(a => a.id === id)?.cor || "#C9A84C";
  const aClass = (id: string) => id === "abraao" ? "at-abraao" : id === "camilla" ? "at-camilla" : "";
  const aStyle = (id: string) => {
    const a = artists.find(x => x.id === id);
    if (!a) return {};
    if (id === "abraao" || id === "camilla") return {};
    const hex = a.cor || "#C9A84C";
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return { background: "rgba("+r+","+g+","+b+",.15)", color: a.cor, border: "1px solid rgba("+r+","+g+","+b+",.25)" };
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

  // ── ONBOARDING ──
  if (!onboardingDone) {
    const onbSteps = ["Estudio", "Horarios", "Artistas", "Concluido"];
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
              {onbStep < 3 && (
                <button className="btn-s" disabled={onbStep === 0 && (!studioName || !studioOwner || !studioTel)} onClick={() => setOnbStep(s => s + 1)}>
                  {onbStep === 2 ? "Concluir" : "Continuar"}
                </button>
              )}
              {onbStep === 3 && <button className="btn-s" onClick={() => setOnboardingDone(true)}>Entrar no Sistema →</button>}
            </div>
          </div>
        </div>
        {showArtForm && (
          <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowArtForm(false); }}>
            <div className="fmod" style={{ maxWidth: 420 }}>
              <div className="fmh"><div className="fmt">Adicionar Artista</div><button className="mc" onClick={() => setShowArtForm(false)}>✕</button></div>
              <div className="fmb">
                <div className="ff"><label className="fl">Nome Completo *</label><input className="fi" placeholder="Nome do artista" value={artForm.nome} onChange={e => setArtForm({ ...artForm, nome: e.target.value })} /></div>
                <div className="fr">
                  <div className="ff"><label className="fl">Tipo</label><select className="fs" value={artForm.role} onChange={e => setArtForm({ ...artForm, role: e.target.value })}><option value="residente">Residente</option><option value="guest">Guest</option></select></div>
                  <div className="ff"><label className="fl">Comissão (%)</label><input className="fi" type="number" min={0} max={100} value={artForm.com} onChange={e => setArtForm({ ...artForm, com: Number(e.target.value) })} /></div>
                </div>
                <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={artForm.insta} onChange={e => { const v = e.target.value; setArtForm({ ...artForm, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
                <div className="ff"><label className="fl">Cor</label><input type="color" value={artForm.cor} onChange={e => setArtForm({ ...artForm, cor: e.target.value })} style={{ width: "100%", height: 38, background: "none", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 5, cursor: "pointer" }} /></div>
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
            <div className="bmark">C</div>
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
            <button className="btn-new" onClick={() => setShowForm(true)}>+ Novo Cliente</button>
          </div>
        </div>
        {/* ALERT DROPDOWN - fora do topbar para evitar overflow */}
        {showAlerts && alertas.length > 0 && (
          <div style={{ position: "fixed", top: 64, right: 16, width: "min(360px, calc(100vw - 32px))", background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,.5)", zIndex: 9999 }}>
            <div className="ad-hdr">Alertas - por prioridade</div>
            <div className="ad-body">
              {alertas.map(c => {
                const m = miss(c); const ch = churn(c);
                return (
                  <div key={c.id} className="ad-item" onClick={() => { setSel(c); setShowAlerts(false); }}>
                    <div className="ad-name">{c.nome}</div>
                    <div className="ad-tags">
                      {ch === "red" && <span className="co co-r">🔴 1a sem retorno</span>}
                      {ch === "orange" && <span className="co co-o">🟠 6m sem retorno</span>}
                      {c.orcamento && <span className="atag">💰 Orcamento</span>}
                      {m.map(x => <span key={x} className="atag">⚠ Sem {x}</span>)}
                    </div>
                  </div>
                );
              })}
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
            { id: "contratos", l: "Contratos", i: "📄" },
            { id: "dashboard", l: "Dashboard", i: "📊" },
            { id: "posvenda", l: "Pós-venda", i: "💬" },
            { id: "disparos", l: "Disparos", i: "📣" },
          ].map(t => (
            <button key={t.id} className={"tab" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
              {t.i} {t.l}
            </button>
          ))}
        </div>

        {/* STATS */}
        <div className="stats">
          {[
            { i: "👥", v: stats.total, l: "Total", bg: "rgba(201,168,76,.1)" },
            { i: "✅", v: stats.ativos, l: "Ativos", bg: "rgba(91,141,239,.1)" },
            { i: "🖤", v: stats.tatuados, l: "Tatuados", bg: "rgba(39,174,96,.1)" },
            { i: "📅", v: stats.hoje, l: "Hoje", bg: "rgba(155,107,181,.1)" },
          ].map((s, i) => (
            <div className="si" key={i}>
              <div className="sico" style={{ background: s.bg }}>{s.i}</div>
              <div><div className="sv">{s.v}</div><div className="sl">{s.l}</div></div>
            </div>
          ))}
        </div>

        {/* FILTER BAR */}
        {(tab === "kanban" || tab === "clientes") && (
          <div className="ctrl">
            <input className="srch" placeholder="Buscar..." value={srch} onChange={e => setSrch(e.target.value)} />
            {["todos", "abraao", "camilla"].map(f => (
              <button key={f} className={"fb" + (fa === f ? " on" : "")} onClick={() => setFa(f)}>
                {f === "todos" ? "Todos" : f === "abraao" ? "Abraao" : "Camilla"}
              </button>
            ))}
          </div>
        )}

        {/* ── KANBAN ── */}
        {tab === "kanban" && (
          <div className="kw">
            {STAGES.map(stage => {
              const sc2 = getSC(stage.id);
              return (
                <div className="kc" key={stage.id}>
                  <div className="kh" style={{ borderBottomColor: stage.color }}>
                    <span className="kt" style={{ color: stage.color }}>{stage.emoji} {stage.label}</span>
                    <span className="kn">{sc2.length}</span>
                  </div>
                  <div className="kb">
                    {sc2.length === 0 && <div className="ke">Nenhum cliente</div>}
                    {sc2.map(c => {
                      const m = miss(c); const ch = churn(c);
                      return (
                        <div key={c.id} className="card" onClick={() => setSel(c)}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: c.artista === "abraao" ? "var(--ab)" : "var(--ca)", borderRadius: "7px 0 0 7px" }} />
                          <div className="ctop">
                            <div className="cname">{c.nome}</div>
                            <span className={"qb " + QC[c.qual]}>{c.qual}</span>
                          </div>
                          <div className="cst">{c.estilo || "Sem estilo"} {c.regiao || " - "}</div>
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
                        <tr key={c.id} data-letter={c.nome[0]?.toUpperCase()} onClick={() => setSel(c)}>
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
                <button className="ag-nb" style={{ fontSize: 11 }} onClick={() => setAgDate(new Date(2026, 4, 30))}>Hoje</button>
              </div>
              <div className="ag-vg">
                {["day", "week", "month"].map(v => (
                  <button key={v} className={"ag-vb" + (agView === v ? " on" : "")} onClick={() => setAgView(v)}>
                    {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mes"}
                  </button>
                ))}
              </div>
              <button className="btn-new" style={{ marginLeft: "auto" }} onClick={() => setShowAgForm(true)}>+ Evento</button>
            </div>
            <div className="ag-leg">
              {Object.entries(CAL_COLORS).map(([k, v]) => (
                <div className="ag-li" key={k}>
                  <div className="ag-ld" style={{ background: v }} />
                  {CAL_LABELS[k]}
                </div>
              ))}
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
                          <div key={e.id} className="mev" style={{ background: CAL_COLORS[e.tipo] || "#888" }}>
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
                          onClick={() => { setAgDate(d); setAgForm(f => ({ ...f, date: ds, start: h, end: h + 2 })); setShowAgForm(true); }}>
                          {evs.map(e => {
                            const duration = Math.max(e.end - e.start, 1);
                            return (
                              <div key={e.id} className="we" style={{
                                background: CAL_COLORS[e.tipo] || "#888",
                                position: "absolute", left: 2, right: 2, top: 2,
                                height: (duration * 46) - 4 + "px",
                                zIndex: 10, borderRadius: 4, padding: "3px 5px",
                                overflow: "hidden", fontSize: 10, fontWeight: 600, color: "#fff"
                              }}>
                                {e.title}<br/><span style={{opacity:.8}}>{e.start}h–{e.end}h</span>
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
                    const evs = agEvents.filter(e => e.date === ds && e.start <= h && e.end > h);
                    return (
                      <div key={h} className="dr">
                        <div className="dtime">{h}:00</div>
                        <div className="dslot" onClick={() => { if (!evs.length) { setEditingEvent(null); setAgForm(f => ({ ...f, date: ds, start: h, end: h + 2, title: "", desc: "" })); setShowAgForm(true); } }}>
                          {evs.map(e => (
                            <div key={e.id} className="dev" style={{ background: CAL_COLORS[e.tipo] || "#888" }}>
                              {e.title} - {e.start}h as {e.end}h
                              <span style={{ marginLeft: 8, opacity: .7, cursor: "pointer" }}
                                onClick={ev => { ev.stopPropagation(); if(window.confirm("Excluir este evento?")) { setAgEvents(p => p.filter(x => x.id !== e.id)); dbDelete("agenda", e.id); } }}>🗑</span>
                              <span style={{ marginLeft: 4, opacity: .7, cursor: "pointer" }}
                                onClick={ev => { ev.stopPropagation(); setEditingEvent(e); setAgForm({ title: e.title, tipo: e.tipo, date: e.date, start: e.start, end: e.end, desc: e.desc || "" }); setShowAgForm(true); }}>✏️</span>
                            </div>
                          ))}
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
          const totalEntradas = fin.reduce((s, f) => s + f.val_a, 0);
          const totalSaidas = saidas.reduce((s, x) => s + x.valor, 0);
          const totalRepasses = fin.reduce((s, f) => s + (f.val_a * f.com_sess / 100), 0);
          const saldoLiquido = totalEntradas - totalSaidas - totalRepasses;
          const inadimplentes = clients.filter(c => (c.etapa === "tatuado" || c.etapa === "pos_venda") && c.val_a > 0 && !c.pgto);
          const progressoMeta = Math.min(totalEntradas / metaMensal * 100, 100);
          const diaAtual = new Date().getDate();
          const projecao = diaAtual > 0 ? Math.round((totalEntradas / diaAtual) * 30) : 0;
          const ticketMedio = (id) => {
            const ss = fin.filter(f => f.artista === id && f.val_a > 0);
            return ss.length > 0 ? Math.round(ss.reduce((s, f) => s + f.val_a, 0) / ss.length) : 0;
          };
          const categorias = ["Material", "Energia", "Internet", "Manutencao", "Marketing", "Pro-labore", "Outros"];
          return (
          <div className="fw">
            <div className="fsum" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
              {[
                { l: "Entradas", v: "R$ " + totalEntradas.toLocaleString("pt-BR"), s: "Sessoes realizadas", c: "var(--q3)" },
                { l: "Saidas", v: "R$ " + totalSaidas.toLocaleString("pt-BR"), s: "Despesas do estudio", c: "var(--q1)" },
                { l: "Repasses", v: "R$ " + totalRepasses.toLocaleString("pt-BR"), s: "A pagar aos artistas", c: "var(--ab)" },
                { l: "Saldo Liquido", v: "R$ " + saldoLiquido.toLocaleString("pt-BR"), s: "Entradas - saidas - repasses", c: saldoLiquido >= 0 ? "var(--q3)" : "var(--q1)" },
              ].map((s, i) => (
                <div className="fsc" key={i}>
                  <div className="fsl">{s.l}</div>
                  <div className="fsv" style={{ color: s.c }}>{s.v}</div>
                  <div className="fss">{s.s}</div>
                </div>
              ))}
            </div>
            <div className="ftable">
              <div className="fth" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Meta Mensal</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--tx2)" }}>Meta: R$</span>
                  <input className="ci" type="number" value={metaMensal} onChange={e => setMetaMensal(Number(e.target.value))} style={{ width: 90 }} />
                </div>
              </div>
              <div style={{ padding: "13px 15px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--tx2)" }}>R$ {totalEntradas.toLocaleString("pt-BR")} de R$ {metaMensal.toLocaleString("pt-BR")}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: progressoMeta >= 100 ? "var(--q3)" : "var(--gold)" }}>{Math.round(progressoMeta)}%</span>
                </div>
                <div style={{ width: "100%", background: "var(--dk4)", borderRadius: 4, height: 10, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, background: progressoMeta >= 100 ? "var(--q3)" : "var(--gold)", width: progressoMeta + "%", transition: "width .4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--tx3)" }}>Projecao do mes: <strong style={{ color: "var(--tx)" }}>R$ {projecao.toLocaleString("pt-BR")}</strong></span>
                  <span style={{ fontSize: 11, color: "var(--tx3)" }}>Faltam: <strong style={{ color: "var(--gold)" }}>R$ {Math.max(metaMensal - totalEntradas, 0).toLocaleString("pt-BR")}</strong></span>
                </div>
              </div>
            </div>
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
                        <span style={{ ...aStyle(a.id), fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 600, padding: "2px 8px", borderRadius: 5 }}>{a.nome.split(" ")[0]}</span>
                        <span style={{ fontSize: 10, color: "var(--tx3)", textTransform: "uppercase" }}>{a.role}</span>
                      </div>
                      {[
                        { l: "Sessoes", v: ss.length },
                        { l: "Faturamento", v: "R$ " + fat.toLocaleString("pt-BR") },
                        { l: "Ticket medio", v: ticket > 0 ? "R$ " + ticket.toLocaleString("pt-BR") : "-" },
                        { l: "Repasse", v: "R$ " + repasse.toLocaleString("pt-BR") },
                        { l: "Comissao base", v: a.com + "%" },
                      ].map((f, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--br)", fontSize: 11 }}>
                          <span style={{ color: "var(--tx2)" }}>{f.l}</span>
                          <span style={{ color: "var(--tx)", fontWeight: 600 }}>{f.v}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="ftable">
              <div className="fth">Registro de Sessoes</div>
              <table className="ft">
                <thead><tr><th>Cliente</th><th>Artista</th><th>Data</th><th>Valor</th><th>Pagto</th><th>Com %</th><th>Repasse</th><th>Status</th></tr></thead>
                <tbody>
                  {fin.map((f, fi) => {
                    const div = f.val_c > 0 && f.val_a !== f.val_c;
                    const rec = f.val_a * f.com_sess / 100;
                    return (
                      <tr key={f.id}>
                        <td style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14 }}>{f.cliente}</td>
                        <td><span style={aStyle(f.artista)} className={aClass(f.artista) ? "at " + aClass(f.artista) : ""}>{aName(f.artista).split(" ")[0]}</span></td>
                        <td style={{ fontSize: 11, color: "var(--tx2)" }}>{f.data}</td>
                        <td style={{ fontWeight: 600, color: "var(--gold)" }}>{f.val_a > 0 ? "R$ " + f.val_a.toLocaleString("pt-BR") : "-"}</td>
                        <td style={{ fontSize: 11 }}>{f.pgto || "-"}</td>
                        <td><div style={{ display: "flex", alignItems: "center", gap: 4 }}><input className="ci" type="number" min={0} max={100} value={f.com_sess} onChange={e => setFin(p => p.map((x, i) => i === fi ? { ...x, com_sess: Number(e.target.value) } : x))} /><span style={{ fontSize: 11, color: "var(--tx2)" }}>%</span></div></td>
                        <td style={{ color: "var(--q3)", fontWeight: 700, fontFamily: "'Cormorant Garamond',serif", fontSize: 14 }}>{rec > 0 ? "R$ " + rec.toLocaleString("pt-BR") : "-"}</td>
                        <td>{div ? <span className="da">Divergencia</span> : f.val_a > 0 ? <span className="dok">OK</span> : <span style={{ fontSize: 11, color: "var(--tx3)" }}>Pendente</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="ftable">
              <div className="fth" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Saidas e Despesas</span>
                <button className="btn-new" style={{ fontSize: 11, padding: "5px 12px" }} onClick={() => setShowSaidaForm(true)}>+ Lancar</button>
              </div>
              <table className="ft">
                <thead><tr><th>Descricao</th><th>Categoria</th><th>Data</th><th>Valor</th><th></th></tr></thead>
                <tbody>
                  {saidas.map(s => (
                    <tr key={s.id}>
                      <td>{s.desc}</td>
                      <td><span style={{ fontSize: 10, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 3, padding: "2px 6px", color: "var(--tx2)" }}>{s.categoria}</span></td>
                      <td style={{ fontSize: 11, color: "var(--tx2)" }}>{s.data}</td>
                      <td style={{ fontWeight: 600, color: "var(--q1)" }}>R$ {s.valor.toLocaleString("pt-BR")}</td>
                      <td><button className="btn-sm" style={{ fontSize: 10, color: "var(--q1)" }} onClick={() => setSaidas(p => p.filter(x => x.id !== s.id))}>Remover</button></td>
                    </tr>
                  ))}
                  {saidas.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--tx3)", fontSize: 12, padding: 16 }}>Nenhuma saida registrada.</td></tr>}
                </tbody>
              </table>
              <div style={{ padding: "10px 15px", background: "var(--dk3)", display: "flex", justifyContent: "flex-end", gap: 4, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--tx2)" }}>Total saidas:</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--q1)", fontFamily: "'Cormorant Garamond',serif" }}>R$ {totalSaidas.toLocaleString("pt-BR")}</span>
              </div>
            </div>
            {inadimplentes.length > 0 && (
              <div className="ftable">
                <div className="fth">Inadimplencia</div>
                <div style={{ padding: "11px 15px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {inadimplentes.map(c => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 11px", background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 7 }}>
                      <div>
                        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 14, fontWeight: 600 }}>{c.nome}</div>
                        <div style={{ fontSize: 11, color: "var(--tx2)" }}>Sessao realizada - pagamento nao registrado</div>
                      </div>
                      <button className="btn-sm gold" onClick={() => setSel(c)}>Ver ficha</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="ftable">
                <div className="fth">Origem do Faturamento</div>
                <div style={{ padding: "13px 15px" }}>
                  {(() => {
                    const m = {};
                    fin.forEach(f => { const c = clients.find(x => x.nome === f.cliente); if (c) m[c.orig] = (m[c.orig] || 0) + f.val_a; });
                    const max = Math.max(...Object.values(m), 1);
                    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([o, v]) => (
                      <div className="br-row" key={o}>
                        <div className="br-lbl" style={{ fontSize: 10 }}>{o}</div>
                        <div className="br-trk"><div className="br-fil" style={{ width: (v / max * 100) + "%", background: "var(--gold)" }} /></div>
                        <div style={{ fontSize: 11, color: "var(--tx)", width: 60, textAlign: "right", flexShrink: 0 }}>R$ {v.toLocaleString("pt-BR")}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="ftable">
                <div className="fth">Dias Mais Rentaveis</div>
                <div style={{ padding: "13px 15px" }}>
                  {(() => {
                    const dias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];
                    const m = {};
                    fin.forEach(f => { const p = f.data.split("/"); if (p.length === 3) { const d = new Date(Number(p[2]), Number(p[1])-1, Number(p[0])); m[dias[d.getDay()]] = (m[dias[d.getDay()]] || 0) + f.val_a; } });
                    const max = Math.max(...Object.values(m), 1);
                    return dias.map(dia => (
                      <div className="br-row" key={dia}>
                        <div className="br-lbl" style={{ fontSize: 11 }}>{dia}</div>
                        <div className="br-trk"><div className="br-fil" style={{ width: ((m[dia] || 0) / max * 100) + "%", background: "var(--ab)" }} /></div>
                        <div style={{ fontSize: 11, color: "var(--tx)", width: 60, textAlign: "right", flexShrink: 0 }}>{m[dia] ? "R$ " + m[dia].toLocaleString("pt-BR") : "-"}</div>
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
                <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>Integracao com emissao de notas em breve. O numero da nota sera vinculado a cada sessao e enviado automaticamente pela Aura.</div>
              </div>
            </div>
            {showSaidaForm && (
              <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowSaidaForm(false); }}>
                <div className="fmod" style={{ maxWidth: 420 }}>
                  <div className="fmh"><div className="fmt">Lancar Saida</div><button className="mc" onClick={() => setShowSaidaForm(false)}>X</button></div>
                  <div className="fmb">
                    <div className="ff"><label className="fl">Descricao *</label><input className="fi" placeholder="Ex: Agulhas e tintas" value={saidaForm.desc} onChange={e => setSaidaForm({ ...saidaForm, desc: e.target.value })} /></div>
                    <div className="fr">
                      <div className="ff"><label className="fl">Categoria</label><select className="fs" value={saidaForm.categoria} onChange={e => setSaidaForm({ ...saidaForm, categoria: e.target.value })}>{categorias.map(c => <option key={c}>{c}</option>)}</select></div>
                      <div className="ff"><label className="fl">Valor (R$)</label><input className="fi" type="number" min={0} value={saidaForm.valor} onChange={e => setSaidaForm({ ...saidaForm, valor: Number(e.target.value) })} /></div>
                    </div>
                    <div className="ff"><label className="fl">Data</label><input className="fi" type="date" onChange={e => { const p = e.target.value.split("-"); setSaidaForm({ ...saidaForm, data: p[2]+"/"+p[1]+"/"+p[0] }); }} /></div>
                  </div>
                  <div className="fmf">
                    <button className="btn-c" onClick={() => setShowSaidaForm(false)}>Cancelar</button>
                    <button className="btn-s" disabled={!saidaForm.desc || saidaForm.valor <= 0} onClick={() => { setSaidas(p => [...p, { id: Date.now(), ...saidaForm }]); setShowSaidaForm(false); setSaidaForm({ desc: "", categoria: "Material", valor: 0, data: new Date().toLocaleDateString("pt-BR") }); }}>Salvar</button>
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
                    {a.role === "guest" && (
                      <button className="btn-sm red" onClick={() => setArtists(p => p.filter(x => x.id !== a.id))}>Remover</button>
                    )}
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
                    <div className="ff"><label className="fl">Nome Completo</label><input className="fi" value={editingArtist.nome} onChange={e => setEditingArtist({ ...editingArtist, nome: e.target.value })} /></div>
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Tipo</label>
                        <select className="fs" value={editingArtist.role} onChange={e => setEditingArtist({ ...editingArtist, role: e.target.value })}>
                          <option value="residente">Residente</option>
                          <option value="guest">Guest</option>
                        </select>
                      </div>
                      <div className="ff"><label className="fl">Comissão (%)</label><input className="fi" type="number" min={0} max={100} value={editingArtist.com} onChange={e => setEditingArtist({ ...editingArtist, com: Number(e.target.value) })} /></div>
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
                      <input type="color" value={editingArtist.cor} onChange={e => setEditingArtist({ ...editingArtist, cor: e.target.value })}
                        style={{ width: "100%", height: 38, background: "none", border: "1px solid var(--br)", borderRadius: 5, cursor: "pointer" }} />
                    </div>
                  </div>
                  <div className="fmf">
                    <button className="btn-c" onClick={() => setEditingArtist(null)}>Cancelar</button>
                    <button className="btn-s" onClick={() => {
                      setArtists(p => p.map(x => x.id === editingArtist.id ? { ...editingArtist } : x));
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
                  {origC.map(([o, c]) => (
                    <div className="br-row" key={o}>
                      <div className="br-lbl">{o}</div>
                      <div className="br-trk"><div className="br-fil" style={{ width: (c / maxO * 100) + "%", background: "var(--gold)" }} /></div>
                      <div className="br-val">{c}</div>
                    </div>
                  ))}
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
                        <div key={c.id} onClick={() => setSel(c)} style={{ padding: "8px 10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, marginBottom: 5, cursor: "pointer" }}>
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
                    { l: "Sessões", v: fin.filter(f => f.val_a > 0).length, m: 10 },
                    { l: "Fat. R$k", v: Math.round(totalFat / 1000), m: 15 },
                    { l: "Leads", v: clients.length, m: 20 },
                    { l: "NPS 9+", v: clients.filter(c => (c.nps || 0) >= 9).length, m: 5 },
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
                      <div key={c.id} onClick={() => setSel(c)} style={{ padding: "8px 10px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, marginBottom: 5, cursor: "pointer", display: "flex", alignItems: "center", gap: 9 }}>
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
                    <button className="mc" style={{ width: "auto", padding: "0 9px", fontSize: 11 }} onClick={() => setSel(c)}>Ver ficha</button>
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
                          : <button className="btn-dis" onClick={disparo} disabled={dest.length === 0}>
                            📣 Programar - {dest.length} cliente{dest.length !== 1 ? "s" : ""}
                          </button>
                        }
                      </>
                    )
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL CLIENTE ── */}
        {sc && (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
            <div className="modal">
              <div className="mh">
                <div>
                  <div className="mn">{sc.nome}</div>
                  <div className="ms">
                    <span className={"qb " + QC[sc.qual]}>{sc.qual}{sc.qual === "Q0" ? " - Acompanhante" : ""}</span>
                    <span className={("at " + aClass(sc.artista)) || ""} style={aStyle(sc.artista)}>{aName(sc.artista).split(" ")[0]}</span>
                    {sc.etapa === "blacklist" && <span className="tag-bl">🚫</span>}
                    {sc.etapa === "lista_espera" && <span className="tag-wl">⏳</span>}
                    <span style={{ color: "var(--tx3)", fontSize: 11 }}>Entrou em {sc.data}</span>
                    {miss(sc).map((m: string) => <span key={m} className="atag">⚠ Sem {m}</span>)}
                  </div>
                </div>
                <button className="mc" onClick={() => setSel(null)}>✕</button>
                <button onClick={() => deleteClient(sc.id)} style={{ background: "rgba(192,57,43,.15)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "var(--q1)", cursor: "pointer", marginRight: 4 }}>🗑 Excluir</button>
              </div>
              <div className="mb">
                {sc.orcamento && (
                  <div className="ba">
                    <span style={{ fontSize: 18 }}>💰</span>
                    <div style={{ flex: 1, fontSize: 12, color: "var(--q2)", fontWeight: 600 }}>Orcamento pendente - registre o valor combinado nesta consultoria.</div>
                    <button className="btn-sm gold" onClick={() => {
                      const v = prompt("Valor combinado (ex: 1200):");
                      if (v) {
                        upC(sc.id, "val_a", Number(v));
                        upC(sc.id, "orcamento", false);
                        setClients(p => p.map(c => c.id !== sc.id ? c : {
                          ...c, hist: [...c.hist, { t: "Orcamento: R$ " + Number(v).toLocaleString("pt-BR"), d: new Date().toLocaleString("pt-BR") }]
                        }));
                      }
                    }}>Registrar</button>
                  </div>
                )}

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
                    {[{ l: "Origem", v: sc.orig }, { l: "Criativo", v: sc.cri }, { l: "Data de Nascimento", v: (sc as any).nascimento || "" }].map((fd, i) => (
                      <div className="fi2" key={i}><div className="fil">{fd.l}</div><div className="fiv">{fd.v || " - "}</div></div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="stit">Projeto Artístico</div>
                  <div className="fg3">
                    {[
                      { l: "Estilo", v: sc.estilo }, { l: "Regiao", v: sc.regiao }, { l: "Tamanho", v: sc.tam },
                      { l: "Cobertura", v: sc.cob ? "Sim" : "Nao" }, { l: "1 Tattoo", v: sc.primeira ? "Sim" : "Nao" },
                      { l: "Intencao", v: sc.intencao }
                    ].map((fd, i) => (
                      <div className="fi2" key={i}>
                        <div className="fil">{fd.l}</div>
                        <div className={"fiv" + ((!fd.v || fd.v === " - ") ? " em" : "")}>{fd.v || " - "}</div>
                      </div>
                    ))}
                  </div>
                  <div className="fi2" style={{ marginTop: 7 }}>
                    <div className="fil">Descrição do Projeto</div>
                    <div className="fiv">{sc.desc}</div>
                  </div>
                </div>

                <div>
                  <div className="stit">Avaliações Internas</div>
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

                <div>
                  <div className="stit">Faltas e Ocorrências</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--tx)", fontWeight: 600 }}>Faltas registradas: {sc.faltas || 0}/3</div>
                      <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
                        {(sc.faltas || 0) === 0 ? "Nenhuma falta registrada" : (sc.faltas || 0) === 1 ? "1ª falta — R$100 cobrado" : "2ª falta — 30% cobrado"}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(sc.faltas || 0) > 0 && (
                        <button className="btn-sm" onClick={() => removerFalta(sc.id, aName(sc.artista))}>− Remover</button>
                      )}
                      {(sc.faltas || 0) < 3 && (
                        <button className="btn-sm red" onClick={() => registrarFalta(sc.id, aName(sc.artista))}>+ Falta</button>
                      )}
                    </div>
                  </div>
                  {(sc.faltas || 0) > 0 && (
                    <div style={{ marginTop: 6, padding: "8px 12px", background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 6, fontSize: 11, color: "var(--q1)" }}>
                      {(sc.faltas || 0) === 1 ? "Taxa de R$100 será abatida no valor final da tatuagem."
                        : (sc.faltas || 0) === 2 ? "30% do valor orçado cobrado. Cliente pode levar o desenho se pagar."
                          : "Cliente na Blacklist — atendimento encerrado."}
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
                          <button className="btn-sm" onClick={() => removerIndicacao(sc.id, aName(sc.artista))}>− Remover</button>
                        )}
                        {(sc.indicacoes || 0) < 8 && (
                          <button className="btn-sm gold" onClick={() => registrarIndicacao(sc.id, aName(sc.artista))}>+ Indicação</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="stit">Mover no Pipeline</div>
                  <div className="pm">
                    {STAGES.map(s => (
                      <button key={s.id} className={"sb" + (sc.etapa === s.id ? " cur" : "")}
                        style={sc.etapa === s.id ? { borderColor: s.color, color: s.color, background: s.color + "18" } : {}}
                        onClick={() => move(sc.id, s.id)}>
                        {s.emoji} {s.label}
                      </button>
                    ))}
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
                  <div className="stit">Historico</div>
                  {[...sc.hist].reverse().map((h: any, i: number) => (
                    <div className="hi" key={i}>
                      <div className="hd" />
                      <div><div className="ht">{h.t}</div><div className="hdt">{h.d}</div></div>
                    </div>
                  ))}
                </div>
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
              <div style={{ padding: "18px 22px" }}>
                <textarea
                  value={ctrEdit[showCtr.type + (showCtr.a?.id || "")] !== undefined
                    ? ctrEdit[showCtr.type + (showCtr.a?.id || "")]
                    : showCtr.type === "artist"
                      ? makeContractArtist(studioName).replace("[NOME]", showCtr.a?.nome || " - ").replace("[EMAIL]", showCtr.a?.email || " - ").replace("[INSTAGRAM]", showCtr.a?.insta || " - ").replace("[RESIDENTE / GUEST]", showCtr.a?.role || " - ")
                      : makeContractClient(studioName, showCtr.nome, showCtr.artista, showCtr.proj, showCtr.valor)
                  }
                  onChange={e => setCtrEdit(prev => ({ ...prev, [showCtr.type + (showCtr.a?.id || "")]: e.target.value }))}
                  style={{ width: "100%", minHeight: 340, background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: 14, fontSize: 12, color: "var(--tx2)", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.8, outline: "none", resize: "vertical" }} />
                <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 6 }}>
                  💡 Edite diretamente acima. As alteracoes ficam salvas enquanto o sistema estiver aberto.
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 11, justifyContent: "flex-end" }}>
                  <button className="btn-c" onClick={() => setShowCtr(null)}>Fechar</button>
                  <button className="btn-s" onClick={() => {
                    const txt = ctrEdit[showCtr.type + (showCtr.a?.id || "")] ||
                      (showCtr.type === "artist"
                        ? makeContractArtist(studioName)
                        : makeContractClient(studioName, showCtr.nome, showCtr.artista, showCtr.proj, showCtr.valor));
                    navigator.clipboard?.writeText(txt);
                    if (showCtr.type === "client" && sc) upC(sc.id, "contrato", true);
                    setShowCtr(null);
                  }}>📤 Enviar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FORM NOVO CLIENTE ── */}
        {showForm && (
          <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="fmod">
              <div className="fmh">
                <div className="fmt">Novo Cliente</div>
                <button className="mc" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <div className="fmb">
                <div className="fr">
                  <div className="ff"><label className="fl">Nome *</label><input className="fi" placeholder="Nome completo" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                  <div className="ff"><label className="fl">Telefone *</label><input className="fi" placeholder="(99) 9 9999-9999" value={form.tel} onChange={e => setForm({ ...form, tel: maskTel(e.target.value) })} /></div>
                </div>
                <div className="fr">
                  <div className="ff"><label className="fl">Email</label><input className="fi" placeholder="email@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                  <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={form.insta} onChange={e => { const v = e.target.value; setForm({ ...form, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
                </div>
                <div className="fr">
                  <div className="ff">
                    <label className="fl">Artista</label>
                    <select className="fs" value={form.artista} onChange={e => setForm({ ...form, artista: e.target.value })}>
                      {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  </div>
                  <div className="ff">
                    <label className="fl">Qualificação</label>
                    <select className="fs" value={form.qual} onChange={e => setForm({ ...form, qual: e.target.value })}>
                      <option value="Q0">Q0 - Acompanhante</option>
                      <option value="Q1">Q1 - Frio</option>
                      <option value="Q2">Q2 - Quente</option>
                      <option value="Q3">Q3 - Pronto</option>
                    </select>
                  </div>
                </div>
                <div className="fr">
                  <div className="ff"><label className="fl">Estilo</label><input className="fi" placeholder="Fine Line, Realismo..." value={form.estilo} onChange={e => setForm({ ...form, estilo: e.target.value })} /></div>
                  <div className="ff"><label className="fl">Regiao</label><input className="fi" placeholder="Antebraco, Costas..." value={form.regiao} onChange={e => setForm({ ...form, regiao: e.target.value })} /></div>
                </div>
                <div className="fr">
                  <div className="ff">
                    <label className="fl">Tamanho</label>
                    <select className="fs" value={form.tam} onChange={e => setForm({ ...form, tam: e.target.value })}>
                      <option>Discreto</option><option>Medio</option><option>Grande</option><option>Fechamento</option>
                    </select>
                  </div>
                  <div className="ff">
                    <label className="fl">Origem</label>
                    <select className="fs" value={form.orig} onChange={e => setForm({ ...form, orig: e.target.value })}>
                      <option>Instagram Organico</option><option>Trafego Pago</option><option>Indicacao</option>
                      <option>Google</option><option>Presencial</option><option>Site</option>
                    </select>
                  </div>
                </div>
                <div className="ff"><label className="fl">Descrição do Projeto</label><textarea className="fta" placeholder="Descreva a ideia..." value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} /></div>

                <div className="ff"><label className="fl">Data de Nascimento</label><input className="fi" type="date" value={(form as any).nascimento || ""} onChange={e => setForm({ ...form, nascimento: e.target.value } as any)} /></div>
                <div style={{ borderTop: "1px solid var(--br)", marginTop: 12, paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <input type="checkbox" id="chkAg" checked={formAg.agendar} onChange={e => setFormAg(f => ({ ...f, agendar: e.target.checked }))} />
                    <label htmlFor="chkAg" style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", cursor: "pointer" }}>📅 Agendar sessão agora</label>
                  </div>
                  {formAg.agendar && (
                    <div className="fr">
                      <div className="ff">
                        <label className="fl">Data</label>
                        <input className="fi" type="date" value={formAg.data} onChange={e => setFormAg(f => ({ ...f, data: e.target.value }))} />
                      </div>
                      <div className="ff">
                        <label className="fl">Hora</label>
                        <input className="fi" type="time" value={formAg.hora} onChange={e => setFormAg(f => ({ ...f, hora: e.target.value }))} />
                      </div>
                      <div className="ff">
                        <label className="fl">Tipo</label>
                        <select className="fs" value={formAg.tipo} onChange={e => setFormAg(f => ({ ...f, tipo: e.target.value }))}>
                          <option value="cons">Consultoria</option>
                          <option value="sess">Sessão</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="fmf">
                <button className="btn-c" onClick={() => setShowForm(false)}>Cancelar</button>
                <button className="btn-s" onClick={saveClient} disabled={!form.nome || !form.tel}>Salvar</button>
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
                <div className="ff"><label className="fl">Nome Completo *</label><input className="fi" placeholder="Nome do artista" value={artForm.nome} onChange={e => setArtForm({ ...artForm, nome: e.target.value })} /></div>
                <div className="fr">
                  <div className="ff">
                    <label className="fl">Tipo</label>
                    <select className="fs" value={artForm.role} onChange={e => setArtForm({ ...artForm, role: e.target.value })}>
                      <option value="residente">Residente</option><option value="guest">Guest</option>
                    </select>
                  </div>
                  <div className="ff"><label className="fl">Comissão (%)</label><input className="fi" type="number" min={0} max={100} value={artForm.com} onChange={e => setArtForm({ ...artForm, com: Number(e.target.value) })} /></div>
                </div>
                <div className="fr">
                  <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={artForm.insta} onChange={e => { const v = e.target.value; setArtForm({ ...artForm, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
                  <div className="ff"><label className="fl">Email</label><input className="fi" placeholder="email" value={artForm.email} onChange={e => setArtForm({ ...artForm, email: e.target.value })} /></div>
                </div>
                <div className="ff"><label className="fl">Telefone</label><input className="fi" placeholder="(99) 9 9999-9999" value={artForm.tel} onChange={e => setArtForm({ ...artForm, tel: maskTel(e.target.value) })} /></div>
                <div className="ff">
                  <label className="fl">Cor</label>
                  <input type="color" value={artForm.cor} onChange={e => setArtForm({ ...artForm, cor: e.target.value })}
                    style={{ width: "100%", height: 38, background: "none", border: "1px solid var(--br)", borderRadius: 5, cursor: "pointer" }} />
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
          <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowAgForm(false); }}>
            <div className="fmod" style={{ maxWidth: 400 }}>
              <div className="fmh">
                <div className="fmt">{editingEvent ? "Editar Evento" : "Novo Evento"}</div>
                <button className="mc" onClick={() => { setShowAgForm(false); setEditingEvent(null); }}>✕</button>
              </div>
              <div className="fmb">
                <div className="ff"><label className="fl">Titulo / Cliente *</label><input className="fi" placeholder="Nome" value={agForm.title} onChange={e => setAgForm({ ...agForm, title: e.target.value })} /></div>
                <div className="ff">
                  <label className="fl">Tipo</label>
                  <select className="fs" value={agForm.tipo} onChange={e => setAgForm({ ...agForm, tipo: e.target.value })}>
                    {Object.entries(CAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="ff"><label className="fl">Descrição (opcional)</label><input className="fi" placeholder="Breve descrição..." value={(agForm as any).desc || ""} onChange={e => setAgForm({ ...agForm, desc: e.target.value } as any)} /></div>
                <div className="ff"><label className="fl">Data</label><input className="fi" type="date" value={agForm.date} onChange={e => setAgForm({ ...agForm, date: e.target.value })} /></div>
                <div className="fr">
                  <div className="ff"><label className="fl">Inicio (h)</label><input className="fi" type="number" min={8} max={20} value={agForm.start} onChange={e => setAgForm({ ...agForm, start: Number(e.target.value) })} /></div>
                  <div className="ff"><label className="fl">Fim (h)</label><input className="fi" type="number" min={9} max={22} value={agForm.end} onChange={e => setAgForm({ ...agForm, end: Number(e.target.value) })} /></div>
                </div>
              </div>
              <div className="fmf">
                <button className="btn-c" onClick={() => setShowAgForm(false)}>Cancelar</button>
                <button className="btn-s" onClick={saveAgEvent} disabled={!agForm.title}>Salvar</button>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {showSettings && (
          <div className="ov" onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}>
            <div className="settings-modal">
              <div className="mh">
                <div>
                  <div className="mn">Configurações do Estúdio</div>
                  <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3 }}>Edite as informações do seu estúdio</div>
                </div>
                <button className="mc" onClick={() => setShowSettings(false)}>✕</button>
              </div>
              <div className="mb">
                <div>
                  <div className="stit">Perfil do Estúdio</div>
                  <div className="fg2">
                    <div className="fi2"><div className="fil">Nome do Estúdio</div><input className="ef" value={studioName} onChange={e => setStudioName(e.target.value)} /></div>
                    <div className="fi2"><div className="fil">Cidade</div><input className="ef" defaultValue="Vitoria" /></div>
                    <div className="fi2"><div className="fil">WhatsApp</div><input className="ef" defaultValue="(27) 99999-0000" /></div>
                    <div className="fi2"><div className="fil">Instagram</div><input className="ef" defaultValue="@casadoscarvalho" /></div>
                  </div>
                </div>
                <div>
                  <div className="stit">Horários de Funcionamento</div>
                  <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 8 }}>A Aura atende 24h. Estes horários são para a agenda interna.</div>
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
                          <span style={{ fontSize: 12, color: "var(--tx2)" }}>as</span>
                          <input className="fi" type="time" value={h.fim} onChange={e => setHorarios(p => p.map((x, j) => j === i ? { ...x, fim: e.target.value } : x))} style={{ width: 90, padding: "4px 7px" }} />
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--tx3)", fontStyle: "italic", flex: 1 }}>Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="fmf">
                <button className="btn-c" onClick={() => setShowSettings(false)}>Fechar</button>
                <button className="btn-s" onClick={async () => {
                  await dbUpsert("configuracoes", {
                    id: 1,
                    studio_name: studioName, studio_tel: studioTel,
                    studio_owner: studioOwner, studio_email: studioEmail,
                    studio_city: studioCity, studio_insta: studioInsta,
                    aura_name: auraName, google_link: googleLink,
                    cnpj, meta_mensal: metaMensal,
                    horarios, dark_mode: dark,
                    updated_at: new Date().toISOString()
                  });
                  setShowSettings(false);
                }}>Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
