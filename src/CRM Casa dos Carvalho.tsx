import { useState, useMemo, useCallback } from "react";

const DARK={"--dk":"#0E0E0E","--dk2":"#161616","--dk3":"#1E1E1E","--dk4":"#272727","--dk5":"#303030","--tx":"#E8E2D9","--tx2":"#8A8070","--tx3":"#555045","--br":"rgba(201,168,76,0.12)","--brh":"rgba(201,168,76,0.35)"};
const LIGHT={"--dk":"#F5F0EB","--dk2":"#EDE8E2","--dk3":"#E4DED7","--dk4":"#D8D1C9","--dk5":"#C8C0B7","--tx":"#1A1714","--tx2":"#5A4F45","--tx3":"#8A7D72","--br":"rgba(139,100,50,0.18)","--brh":"rgba(139,100,50,0.45)"};

function applyTheme(dark){
  const v=dark?DARK:LIGHT;
  Object.entries(v).forEach(([k,val])=>document.documentElement.style.setProperty(k,val));
}

const S=`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700&family=DM+Sans:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{--gold:#C9A84C;--gold-l:#E8C97A;--gold-d:rgba(201,168,76,0.13);--q0:#8E44AD;--q1:#C0392B;--q2:#D4820A;--q3:#27AE60;--ab:#4A9EBF;--ca:#9B6BB5;}
body{background:var(--dk);color:var(--tx);font-family:'DM Sans',sans-serif;}
.root{min-height:100vh;background:var(--dk);display:flex;flex-direction:column;}
.topbar{background:var(--dk2);border-bottom:1px solid var(--br);padding:0 20px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
.bmark{width:30px;height:30px;background:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:700;color:#000;}
.bname{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;letter-spacing:.08em;color:var(--tx);}
.bsub{font-size:10px;letter-spacing:.15em;color:var(--gold);text-transform:uppercase;}
.tbr{display:flex;align-items:center;gap:8px;position:relative;}
.theme-btn{background:var(--dk3);border:1px solid var(--br);border-radius:20px;padding:5px 11px;cursor:pointer;font-size:12px;color:var(--tx2);}
.btn-new{background:var(--gold);color:#000;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;}
.btn-new:hover{background:var(--gold-l);}
.alert-btn{background:rgba(212,130,10,.15);border:1px solid rgba(212,130,10,.3);border-radius:6px;padding:4px 10px;font-size:11px;color:#D4820A;font-weight:600;cursor:pointer;}
.alert-drop{position:fixed;top:58px;right:8px;width:min(320px,calc(100vw - 16px));background:var(--dk2);border:1px solid var(--br);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5);z-index:300;}
.settings-modal{background:var(--dk2);border:1px solid var(--br);border-radius:11px;width:100%;max-width:560px;max-height:88vh;overflow-y:auto;}
.hr-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--br);}
.hr-dia{font-size:12px;font-weight:600;color:var(--tx);width:70px;flex-shrink:0;}
.hr-toggle{width:36px;height:20px;border-radius:10px;cursor:pointer;position:relative;flex-shrink:0;transition:background .2s;}
.hr-toggle-dot{width:16px;height:16px;background:#fff;border-radius:50%;position:absolute;top:2px;transition:left .2s;}
.mob-toggle{display:flex;gap:3px;}
.mob-btn{background:var(--dk3);border:1px solid var(--br);border-radius:5px;color:var(--tx2);padding:5px 10px;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;}
.mob-btn.on{background:var(--gold-d);border-color:var(--gold);color:var(--gold);}
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
.fb.ab.on{background:rgba(74,158,191,.15);border-color:var(--ab);color:var(--ab);}
.fb.ca.on{background:rgba(155,107,181,.15);border-color:var(--ca);color:var(--ca);}
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
.ctbl tr:nth-child(even) td{background:var(--dk3);}
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
.btn-aa:hover{background:var(--gold-l);}
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
.onb-ov{position:fixed;inset:0;background:rgba(0,0,0,.93);z-index:500;display:flex;align-items:center;justify-content:center;padding:18px;}
.onb-modal{background:var(--dk2);border:1px solid var(--br);border-radius:14px;width:100%;max-width:540px;overflow:hidden;}
.onb-header{padding:26px 30px 18px;background:var(--dk3);border-bottom:1px solid var(--br);text-align:center;}
.onb-logo{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:700;color:var(--gold);letter-spacing:.1em;}
.onb-sub{font-size:11px;color:var(--tx2);margin-top:5px;letter-spacing:.1em;text-transform:uppercase;}
.onb-steps{display:flex;border-bottom:1px solid var(--br);}
.onb-step{flex:1;padding:9px 5px;text-align:center;font-size:10px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--tx3);border-bottom:2px solid transparent;}
.onb-step.on{color:var(--gold);border-bottom-color:var(--gold);}
.onb-step.done{color:var(--q3);}
.onb-body{padding:22px 28px;display:flex;flex-direction:column;gap:12px;}
.onb-footer{padding:14px 28px;border-top:1px solid var(--br);display:flex;justify-content:space-between;align-items:center;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:var(--dk2);}
::-webkit-scrollbar-thumb{background:var(--dk5);border-radius:3px;}
.empty{text-align:center;padding:48px 14px;color:var(--tx3);font-size:13px;}
.tag-bl{background:rgba(192,57,43,.15);color:var(--q1);border:1px solid rgba(192,57,43,.25);font-size:9px;font-weight:700;padding:2px 4px;border-radius:3px;}
.tag-wl{background:rgba(74,158,191,.15);color:var(--ab);border:1px solid rgba(74,158,191,.25);font-size:9px;font-weight:700;padding:2px 4px;border-radius:3px;}
`;
const STAGES=[
  {id:"lead",label:"Lead",color:"#5B8DEF",emoji:""},
  {id:"qualificacao",label:"Qualificacao",color:"#C9A84C",emoji:"🎯"},
  {id:"cons_agendada",label:"Consultoria",color:"#9B6BB5",emoji:"📅"},
  {id:"sessao_agend",label:"Sessao Agendada",color:"#4A9EBF",emoji:"🖊"},
  {id:"tatuado",label:"Tatuado",color:"#27AE60",emoji:""},
  {id:"pos_venda",label:"Pos-venda",color:"#E67E22",emoji:""},
  {id:"lista_espera",label:"Lista de Espera",color:"#3498DB",emoji:""},
  {id:"hibernacao",label:"Hibernacao",color:"#666",emoji:"💤"},
  {id:"blacklist",label:"Blacklist",color:"#C0392B",emoji:"🚫"},
];

const QC={Q0:"q0c",Q1:"q1c",Q2:"q2c",Q3:"q3c"};
const STAR_REASONS=["","Muito dificil","Comunicacao dificil","Normal","Boa experiencia","Excelente"];

const CAL_COLORS={cons_abraao:"#4A9EBF",sess_abraao:"#C9A84C",cons_camilla:"#9B6BB5",sess_camilla:"#27AE60",bloq_abraao:"#C0392B",bloq_camilla:"#E67E22",bloq_geral:"#555"};
const CAL_LABELS={cons_abraao:"Consulta Abraao",sess_abraao:"Sessao Abraao",cons_camilla:"Consulta Camilla",sess_camilla:"Sessao Camilla",bloq_abraao:"Bloq. Abraao",bloq_camilla:"Bloq. Camilla",bloq_geral:"Bloq. Geral"};

const SEGS=[
  {id:"todos",label:"Todos",desc:"Toda a base",icon:"👥",f:()=>true},
  {id:"q0",label:"Q0 - Acompanhantes",desc:"Estiveram no atelier",icon:"🟣",f:c=>c.qual==="Q0"},
  {id:"q1",label:"Q1 - Frios",desc:"Nutricao e educacao",icon:"🔴",f:c=>c.qual==="Q1"},
  {id:"q2",label:"Q2 - Quentes",desc:"Prontos para avancar",icon:"🟡",f:c=>c.qual==="Q2"},
  {id:"tatuados",label:"Tatuados",desc:"Ja fizeram sessao",icon:"",f:c=>c.etapa==="tatuado"||c.etapa==="pos_venda"},
  {id:"homenagem",label:"Homenagem",desc:"Intencao ligada a pessoas",icon:"",f:c=>(c.intencao||"").toLowerCase().includes("home")},
  {id:"primeira",label:"Primeira Tattoo",desc:"Primeira vez",icon:"🌟",f:c=>c.primeira},
  {id:"abraao",label:"Clientes Abraao",desc:"Direcionados ao Abraao",icon:"🔵",f:c=>c.artista==="abraao"},
  {id:"camilla",label:"Clientes Camilla",desc:"Direcionados a Camilla",icon:"🟣",f:c=>c.artista==="camilla"},
];

const DATAS=[
  {id:"maes",label:"Dia das Maes",data:"11 Mai",icon:"🌸"},
  {id:"namorados",label:"Namorados",data:"12 Jun",icon:"💕"},
  {id:"pais",label:"Dia dos Pais",data:"10 Ago",icon:"👑"},
  {id:"natal",label:"Natal",data:"25 Dez",icon:"🎄"},
  {id:"anoNovo",label:"Ano Novo",data:"01 Jan",icon:"🎆"},
  {id:"aniversario",label:"Aniversarios",data:"Mensal",icon:"🎂"},
  {id:"aniAbraao",label:"Aniv. Abraao (30/Nov)",data:"30 Nov",icon:"🎉"},
  {id:"aniCamilla",label:"Aniv. Camilla (26/Jun)",data:"26 Jun",icon:"🎊"},
];

const MSGS={
  todos:"Ola, [Nome]\n\nA Casa dos Carvalho tem algo especial esperando por voce.\n\nSe a sua ideia ainda esta guardada, talvez seja hora de tira-la do papel.",
  q0:"Ola, [Nome]\n\nQue bom ter te recebido aqui.\n\nA arte que voce viu sendo criada foi feita com muito cuidado. Se algum dia quiser criar a sua, sera uma honra.",
  q1:"Ola, [Nome]\n\nA Casa dos Carvalho nao tem pressa - tem comprometimento com projetos que fazem sentido para quem os carrega na pele.",
  q2:"Ola, [Nome]\n\nVoce chegou com uma ideia linda - e ela ficou guardada com a gente.\n\nSeria um prazer evoluir essa conversa juntos.",
  tatuados:"Ola, [Nome]\n\nEspero que sua arte esteja linda e bem cuidada. Se a proxima ideia ja esta nascendo, voce sabe onde nos encontrar.",
  homenagem:"Ola, [Nome]\n\nNessa epoca especial, lembramos de voce e da arte que escolheu eternizar na sua pele.",
  primeira:"Ola, [Nome]\n\nTodo comeco e especial - e o seu ficou guardado com muito carinho.\n\nSe a segunda ideia esta surgindo, sera uma honra.",
  abraao:"Ola, [Nome]\n\nO Abraao tem novidades no atelier e pensou em voce.\n\nQuando quiser conversar, e so chamar.",
  camilla:"Ola, [Nome]\n\nA Camilla tem algo especial se formando e pensou em voce.",
  maes:"Ola, [Nome]\n\nFeliz Dia das Maes.\n\nAlgumas memorias merecem ser eternas. A Casa dos Carvalho esta aqui para transformar esse sentimento em arte.",
  namorados:"Ola, [Nome]\n\nFeliz Dia dos Namorados.\n\nA Casa dos Carvalho transforma amor em arte.",
  pais:"Ola, [Nome]\n\nFeliz Dia dos Pais.\n\nSe existe uma homenagem guardada no coracao - talvez esse seja o momento certo.",
  natal:"Ola, [Nome]\n\nQue esse Natal seja cheio de momentos que voce vai querer guardar para sempre.",
  anoNovo:"Ola, [Nome]\n\nUm novo ano carrega novas historias. A Casa dos Carvalho esta pronta para fazer acontecer.",
  aniAbraao:"Ola, [Nome]\n\nHoje e um dia muito especial para a Casa dos Carvalho - e o aniversario do Abraao.\n\nE como todo bom aniversario, quem ganha presente e voce.\n\nPreparamos uma condicao exclusiva para celebrar esse dia juntos. Quando quiser saber mais, e so me chamar.",
  aniCamilla:"Ola, [Nome]\n\nHoje a Casa dos Carvalho celebra o aniversario da Camilla.\n\nE a melhor forma de comemorar e presentear quem faz parte da nossa historia.\n\nTemos algo especial reservado para voce. Quando quiser saber mais, e so me chamar.",
  aniversario:"Ola, [Nome]\n\nHoje e um dia muito especial - e a Casa dos Carvalho quer fazer parte dele.\n\nComo presente: 50% de desconto na sua proxima tatuagem, valido por 15 dias.\n\nQuando quiser saber mais, e so chamar.",
};

const HOURS=Array.from({length:12},(_,i)=>i+8);
const WEEKDAYS=["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];
const MONTHS=["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function fmtDate(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function getWeekDates(d){const day=d.getDay();const mon=new Date(d);mon.setDate(d.getDate()-day);return Array.from({length:7},(_,i)=>{const x=new Date(mon);x.setDate(mon.getDate()+i);return x;});}
function getMonthDates(d){const y=d.getFullYear(),m=d.getMonth();const first=new Date(y,m,1);const last=new Date(y,m+1,0);const sd=first.getDay();const days=[];for(let i=0;i<sd;i++){days.push({date:new Date(y,m,1-sd+i),cur:false});}for(let i=1;i<=last.getDate();i++){days.push({date:new Date(y,m,i),cur:true});}while(days.length%7!==0){days.push({date:new Date(y,m+1,days.length-last.getDate()-sd+1),cur:false});}return days;}

const ARTISTS_INIT=[
  {id:"abraao",nome:"Abraao Carvalho",role:"residente",com:60,cor:"#4A9EBF",ativo:true,insta:"@abraaotattoo",email:"abraao@casadoscarvalho.com",tel:"(27) 99999-0001"},
  {id:"camilla",nome:"Camilla Carvalho",role:"residente",com:60,cor:"#9B6BB5",ativo:true,insta:"@camillatattoo",email:"camilla@casadoscarvalho.com",tel:"(27) 99999-0002"},
];

const CLIENTS_INIT=[
  {id:1,nome:"Marina Alves",tel:"(27) 99812-3456",email:"marina@email.com",insta:"@marina.ink",qual:"Q3",artista:"abraao",etapa:"cons_agendada",estilo:"Fine Line Floral",regiao:"Antebr",tam:"Medio",orig:"Instagram Organico",cri:"Post Portfolio",data:"28/05/2026",dias:2,intencao:"Homenagem a mae",primeira:false,cob:false,desc:"Rosa delicada com nomes em caligrafia",stars:0,starReason:"",consent:null,nps:null,obs:"",val_a:0,val_c:0,pgto:"",orcamento:false,contrato:false,faltas:0,indicacoes:0,credito:0,hist:[{t:"Aura iniciou atendimento",d:"28/05 14h"},{t:"Q3 definido",d:"28/05 14h22"},{t:"Consultoria agendada 04/06 as 14h",d:"28/05 14h35"}],pv:[]},
  {id:2,nome:"Carlos Mendes",tel:"(27) 99723-9900",email:"",insta:"@c.mendes",qual:"Q2",artista:"camilla",etapa:"qualificacao",estilo:"Black Work",regiao:"Costela",tam:"Grande",orig:"Trafego Pago",cri:"Stories",data:"27/05/2026",dias:3,intencao:"Estetica pura",primeira:true,cob:false,desc:"Mandala geometrica fechando costela",stars:0,starReason:"",consent:null,nps:null,obs:"",val_a:0,val_c:0,pgto:"",orcamento:false,contrato:false,faltas:0,indicacoes:0,credito:0,hist:[{t:"Aura iniciou atendimento",d:"27/05 10h"},{t:"Q2 definido",d:"27/05 10h40"}],pv:[]},
  {id:3,nome:"Fernanda Costa",tel:"(27) 99600-4411",email:"fer@email.com",insta:"",qual:"Q1",artista:"abraao",etapa:"qualificacao",estilo:"Realismo",regiao:"Panturrilha",tam:"Grande",orig:"Indicacao",cri:"",data:"25/05/2026",dias:5,intencao:"Estetica pura",primeira:false,cob:false,desc:"Retrato realista de cachorro",stars:0,starReason:"",consent:null,nps:null,obs:"",val_a:0,val_c:0,pgto:"",orcamento:false,contrato:false,faltas:0,indicacoes:0,credito:0,hist:[{t:"Aura iniciou atendimento",d:"25/05 09h"},{t:"Q1 nutricao iniciada",d:"25/05 09h30"}],pv:[]},
  {id:4,nome:"Rafael Sousa",tel:"(27) 99501-7788",email:"rafa@email.com",insta:"@rafa.s",qual:"Q3",artista:"abraao",etapa:"sessao_agend",estilo:"Surrealismo",regiao:"Braco inteiro",tam:"Fechamento",orig:"Trafego Pago",cri:"Reels",data:"20/05/2026",dias:10,intencao:"Autoral",primeira:false,cob:false,desc:"Manga surrealista com relogio derretido",stars:0,starReason:"",consent:null,nps:null,obs:"",val_a:0,val_c:0,pgto:"",orcamento:true,contrato:false,faltas:0,indicacoes:0,credito:0,hist:[{t:"Aura iniciou atendimento",d:"20/05 16h"},{t:"Q3 definido",d:"20/05 16h45"},{t:"Consultoria realizada",d:"23/05 15h"},{t:"Sessao 1 agendada: 10/06 as 09h",d:"23/05 15h30"}],pv:[]},
  {id:5,nome:"Juliana Ferreira",tel:"(27) 99388-2255",email:"ju@email.com",insta:"@ju.ferro",qual:"Q3",artista:"camilla",etapa:"tatuado",estilo:"Fine Line Botanico",regiao:"Clavicula",tam:"Medio",orig:"Instagram Organico",cri:"Post",data:"10/05/2026",dias:20,intencao:"Autoestima",primeira:true,cob:false,desc:"Ramo de lavanda com traco fino",stars:5,starReason:"Excelente",consent:true,nps:10,obs:"Cliente incrivel",val_a:800,val_c:800,pgto:"Pix",orcamento:false,contrato:true,hist:[{t:"Aura iniciou atendimento",d:"10/05 11h"},{t:"Q3",d:"10/05 11h30"},{t:"Consultoria realizada",d:"14/05 10h"},{t:"Sessao realizada",d:"22/05 09h"},{t:"NPS: 10",d:"23/05"}],pv:[{l:"Dia da sessao",s:"done"},{l:"D+1 Cicatrizacao",s:"done"},{l:"D+7 Saude",s:"pending"},{l:"D+30 Garantia",s:"future"},{l:"1 Ano",s:"future"}]},
  {id:6,nome:"Pedro Araujo",tel:"(27) 99200-6644",email:"pedro@email.com",insta:"@pedro.a",qual:"Q2",artista:"abraao",etapa:"lead",estilo:"Tribal",regiao:"Ombro",tam:"Medio",orig:"Google",cri:"",data:"29/05/2026",dias:1,intencao:"Identidade",primeira:false,cob:true,desc:"Tribal cobrindo tattoo antiga",stars:0,starReason:"",consent:null,nps:null,obs:"",val_a:0,val_c:0,pgto:"",orcamento:false,contrato:false,faltas:0,indicacoes:0,credito:0,hist:[{t:"Aura iniciou atendimento - cobertura",d:"29/05 08h"}],pv:[]},
  {id:7,nome:"Amanda Oliveira",tel:"(27) 99111-3377",email:"amanda@email.com",insta:"@amanda.o",qual:"Q3",artista:"camilla",etapa:"pos_venda",estilo:"Aquarela",regiao:"Costas",tam:"Grande",orig:"Trafego Pago",cri:"Feed",data:"01/05/2026",dias:29,intencao:"Transformacao",primeira:false,cob:false,desc:"Borboleta em aquarela nas costas",stars:4,starReason:"Boa experiencia",consent:true,nps:9,obs:"",val_a:2200,val_c:2200,pgto:"Cartao",orcamento:false,contrato:true,hist:[{t:"Aura iniciou atendimento",d:"01/05 13h"},{t:"Sessao realizada",d:"15/05 10h"}],pv:[{l:"Dia da sessao",s:"done"},{l:"D+1 Cicatrizacao",s:"done"},{l:"D+7 Saude",s:"done"},{l:"D+30 Garantia",s:"pending"},{l:"1 Ano",s:"future"}]},
  {id:8,nome:"Lucas Barros",tel:"(27) 99044-8811",email:"lucas@email.com",insta:"@lucasb",qual:"Q1",artista:"abraao",etapa:"hibernacao",estilo:"Geometrico",regiao:"Pescoco",tam:"Pequeno",orig:"Instagram Organico",cri:"",data:"15/04/2026",dias:45,intencao:"Estetica",primeira:false,cob:false,desc:"Figura geometrica no pescoco",stars:0,starReason:"",consent:null,nps:null,obs:"",val_a:0,val_c:0,pgto:"",orcamento:false,contrato:false,faltas:0,indicacoes:0,credito:0,hist:[{t:"Aura iniciou atendimento",d:"15/04 17h"},{t:"Q1",d:"15/04 17h20"},{t:"Hibernacao",d:"14/05"}],pv:[]},
  {id:9,nome:"Beatriz Souza",tel:"(27) 99777-5544",email:"bia@email.com",insta:"@bia.souza",qual:"Q3",artista:"camilla",etapa:"lista_espera",estilo:"Fine Line",regiao:"Costela",tam:"Medio",orig:"Indicacao",cri:"",data:"28/05/2026",dias:2,intencao:"Autoestima",primeira:true,cob:false,desc:"Frase minimalista em fine line",stars:0,starReason:"",consent:null,nps:null,obs:"Agenda lotada",val_a:0,val_c:0,pgto:"",orcamento:false,contrato:false,faltas:0,indicacoes:0,credito:0,hist:[{t:"Aura iniciou atendimento",d:"28/05 15h"},{t:"Q3 - lista de espera",d:"28/05 15h40"}],pv:[]},
  {id:10,nome:"Sofia Martins",tel:"(27) 99888-1122",email:"",insta:"",qual:"Q0",artista:"camilla",etapa:"qualificacao",estilo:"",regiao:"",tam:"",orig:"Presencial",cri:"",data:"29/05/2026",dias:1,intencao:"",primeira:true,cob:false,desc:"Veio acompanhar a amiga.",stars:0,starReason:"",consent:null,nps:null,obs:"Acompanhou sessao da Juliana",val_a:0,val_c:0,pgto:"",orcamento:false,contrato:false,faltas:0,indicacoes:0,credito:0,hist:[{t:"Cadastro manual - acompanhante",d:"29/05 11h"}],pv:[]},
];

const FIN_INIT=[
  {id:1,cliente:"Juliana Ferreira",artista:"camilla",tipo:"Sessao",data:"22/05/2026",val_a:800,val_c:800,pgto:"Pix",com_base:60,com_sess:60},
  {id:2,cliente:"Amanda Oliveira",artista:"camilla",tipo:"Sessao",data:"15/05/2026",val_a:2200,val_c:2200,pgto:"Cartao",com_base:60,com_sess:65},
];

const ONB_STEPS=["Estudio","Artistas","Horarios","Concluido"];

function makeContractArtist(sName){
  return `CONTRATO DE PRESTACAO DE SERVICOS ARTISTICOS
In-Quadra Tattoo System  -  ${sName}

CONTRATANTE: ${sName}
CONTRATADO(A): [NOME COMPLETO] | CPF: [CPF] | Email: [EMAIL] | Instagram: [INSTAGRAM]
Tipo de vinculo: [RESIDENTE / GUEST] | Periodo: [DATA INICIO] a [DATA FIM]

CLAUSULA 1  -  OBJETO
Prestacao de servicos de tatuagem artistica nas dependencias do estudio contratante, pelo periodo acima definido.

CLAUSULA 2  -  REMUNERACAO E COMISSAO
O(A) contratado(a) recebera comissao de [X]% sobre o valor liquido de cada sessao realizada. Os repasses serao efetuados mensalmente ate o dia [X] do mes subsequente. A taxa de R$100,00 cobrada por falta do cliente sem aviso e o valor de 30% cobrado em caso de segunda falta tambem serao divididos conforme o percentual acordado nesta clausula.

CLAUSULA 3  -  HORARIO E CONDUTA
O(A) contratado(a) respeitara integralmente o horario de funcionamento do estudio. Bloqueios de agenda devem ser comunicados com antecedencia minima de [X] dias. As mesmas regras de atendimento, incluindo politica de faltas e blacklist, aplicam-se igualmente a artistas residentes e guests.

CLAUSULA 4  -  CONFIDENCIALIDADE E LGPD
Os dados pessoais dos clientes sao propriedade exclusiva do contratante. E expressamente proibido ao(a) contratado(a): copiar, reproduzir ou utilizar dados de clientes para fins pessoais ou comerciais; entrar em contato com clientes do estudio por canais externos ao sistema; divulgar informacoes sobre clientes a terceiros. O descumprimento sujeitara o(a) contratado(a) as penalidades previstas na Lei 13.709/2018 (LGPD).

CLAUSULA 5  -  NAO CAPTACAO DE CLIENTES
Pelo periodo de 12 (doze) meses apos o encerramento deste contrato, o(a) contratado(a) fica proibido(a) de contatar ativamente clientes da base do estudio com o objetivo de atrai-los para outro estabelecimento. Esta clausula nao impede o cliente de buscar o(a) artista por iniciativa propria.

CLAUSULA 6  -  DIREITOS AUTORAIS
As artes desenvolvidas nas dependencias do estudio e com clientes do estudio sao de co-autoria do(a) artista e do contratante, podendo ambas as partes utiliza-las para portfolio com credito mutuo.

CLAUSULA 7  -  RESCISAO
Qualquer das partes podera rescindir este contrato com aviso previo de [X] dias. O descumprimento das clausulas de confidencialidade ou nao captacao autoriza rescisao imediata e responsabilizacao civil.

________________________   ________________________
Contratante                             Contratado(a)

* Revisar com advogado especializado antes de assinar.`;
}

function makeContractClient(sName,nome,artista,proj,valor){
  return `CONFIRMACAO DE PROJETO ARTISTICO
${sName}

Cliente: ${nome} | Artista: ${artista}
Data: ${new Date().toLocaleDateString('pt-BR')}
Projeto: ${proj}
Valor acordado: ${valor}

TERMOS E CONDICOES

1. EXCLUSIVIDADE DO PROJETO
Este projeto foi desenvolvido de forma personalizada e exclusiva para o cliente. A Casa dos Carvalho nao reproduz artes de terceiros. Referencias sao utilizadas apenas como inspiracao.

2. VALOR E PAGAMENTO
O valor da tatuagem e definido exclusivamente na consultoria presencial. Em caso de nao comparecimento a consultoria sem aviso com 24h de antecedencia, sera cobrada uma taxa de R$100,00, abatida no valor final. Em caso de segunda falta, sera cobrado 30% do valor orcado.

3. DIREITO AO DESENHO
O desenho desenvolvido na consultoria pertence ao estudio. O cliente nao tem direito de leva-lo sem autorizacao expressa do artista.

4. MULTIPLAS SESSOES
Projetos que exigem mais de uma sessao terao o numero de sessoes definido conforme necessidade tecnica. Este contrato cobre o projeto completo. Alteracoes significativas no projeto apos a assinatura requerem novo contrato.

5. GARANTIA DE RETOQUE
O retoque gratuito e garantido por 30 dias apos a sessao, com tolerancia de ate 37 dias. Apos esse prazo, o retoque sera cobrado normalmente. Em caso comprovado de dano intencional a tatuagem, o valor do retoque sera o dobro do valor original da sessao.

6. USO DE IMAGEM
O cliente autoriza o uso de fotos da tatuagem para portfolio e redes sociais da Casa dos Carvalho, salvo solicitacao contraria registrada formalmente.

7. REAGENDAMENTO
O cliente pode reagendar sem cobranca desde que avise com minimo de 24 horas de antecedencia.

Ao responder CONFIRMO, o cliente declara estar de acordo com todos os termos acima.

Casa dos Carvalho  -  In-Quadra Tattoo System`;
}

export default function CRM(){
  const [dark,setDark]=useState(true);
  const [studioName,setStudioName]=useState("Casa dos Carvalho");
  const [clients,setClients]=useState(CLIENTS_INIT);
  const [artists,setArtists]=useState(ARTISTS_INIT);
  const [fin,setFin]=useState(FIN_INIT);
  const [agEvents,setAgEvents]=useState([
    {id:1,title:"Marina Alves",tipo:"cons_abraao",date:"2026-06-04",start:14,end:16},
    {id:2,title:"Rafael Sousa",tipo:"sess_abraao",date:"2026-06-10",start:9,end:13},
    {id:3,title:"Beatriz Souza",tipo:"cons_camilla",date:"2026-06-07",start:10,end:12},
  ]);
  const [tab,setTab]=useState("kanban");
  const [sel,setSel]=useState(null);
  const [fa,setFa]=useState("todos");
  const [srch,setSrch]=useState("");
  const [showForm,setShowForm]=useState(false);
  const [showArtForm,setShowArtForm]=useState(false);
  const [showAgForm,setShowAgForm]=useState(false);
  const [showAlerts,setShowAlerts]=useState(false);
  const [showCtr,setShowCtr]=useState(null);
  const [showSettings,setShowSettings]=useState(false);
  const [mobileView,setMobileView]=useState(true);
  const [segSel,setSegSel]=useState(null);
  const [dateSel,setDateSel]=useState(null);
  const [sent,setSent]=useState(false);
  const [editing,setEditing]=useState(false);
  const [msgEdit,setMsgEdit]=useState("");
  const [agView,setAgView]=useState("week");
  const [agDate,setAgDate]=useState(new Date(2026,5,4));
  const [horarios,setHorarios]=useState([
    {dia:"Segunda",aberto:true,ini:"09:00",fim:"19:00"},
    {dia:"Terca",aberto:true,ini:"09:00",fim:"19:00"},
    {dia:"Quarta",aberto:true,ini:"09:00",fim:"19:00"},
    {dia:"Quinta",aberto:true,ini:"09:00",fim:"19:00"},
    {dia:"Sexta",aberto:true,ini:"09:00",fim:"19:00"},
    {dia:"Sabado",aberto:true,ini:"10:00",fim:"17:00"},
    {dia:"Domingo",aberto:false,ini:"",fim:""},
  ]);
  const [form,setForm]=useState({nome:"",tel:"",email:"",insta:"",artista:"abraao",estilo:"",regiao:"",tam:"Medio",desc:"",orig:"Instagram Organico",qual:"Q2",primeira:false,cob:false,intencao:""});
  const [artForm,setArtForm]=useState({nome:"",role:"guest",com:50,cor:"#C9A84C",insta:"",email:"",tel:""});
  const [agForm,setAgForm]=useState({title:"",tipo:"cons_abraao",date:"2026-06-01",start:9,end:11});

  useEffect(()=>{
    const el=document.createElement('style');
    el.textContent=S;
    document.head.appendChild(el);
    return()=>document.head.removeChild(el);
  },[]);
  useMemo(()=>applyTheme(dark),[dark]);

  const filtered=useMemo(()=>clients.filter(c=>{
    const mA=fa==="todos"||c.artista===fa;
    const mS=!srch||c.nome.toLowerCase().includes(srch.toLowerCase())||c.estilo.toLowerCase().includes(srch.toLowerCase());
    return mA&&mS;
  }),[clients,fa,srch]);

  const getSC=id=>filtered.filter(c=>c.etapa===id);
  const miss=c=>{const m=[];if(!c.email)m.push("Email");if(!c.insta)m.push("Instagram");return m;};
  const churn=c=>{if(c.etapa!=="tatuado"&&c.etapa!=="pos_venda")return null;if(c.dias>=365)return"red";if(c.dias>=180)return"orange";return null;};
  const alertas=useMemo(()=>clients.filter(c=>miss(c).length>0||churn(c)||c.orcamento),[clients]);
  const reativacao=useMemo(()=>clients.filter(c=>!["blacklist","tatuado","pos_venda"].includes(c.etapa)&&c.dias>=30).sort((a,b)=>b.dias-a.dias).slice(0,5),[clients]);
  const paraExcluir=useMemo(()=>clients.filter(c=>c.dias>=40&&c.etapa==="qualificacao"&&!["blacklist"].includes(c.etapa)),[clients]);

  const move=(cid,ns)=>{
    const lbl=STAGES.find(s=>s.id===ns)?.label||ns;
    const orq=ns==="sessao_agend";
    setClients(p=>p.map(c=>c.id!==cid?c:{...c,etapa:ns,orcamento:orq,hist:[...c.hist,{t:"Movido para: "+lbl,d:new Date().toLocaleDateString('pt-BR')},...(orq?[{t:"Orcamento pendente de registro",d:new Date().toLocaleDateString('pt-BR')}]:[])]}));
  };

  const upC=(cid,f,v)=>setClients(p=>p.map(c=>c.id!==cid?c:{...c,[f]:v}));

  const registrarFalta=(cid)=>{
    setClients(p=>p.map(c=>{
      if(c.id!==cid) return c;
      const novasFaltas=(c.faltas||0)+1;
      const novoEtapa=novasFaltas>=3?"blacklist":c.etapa;
      const msg=novasFaltas===1?"Falta registrada - taxa de R$100 notificada ao cliente":novasFaltas===2?"2a falta - cobranca de 30% notificada":"3a falta - cliente movido para Blacklist automaticamente";
      return{...c,faltas:novasFaltas,etapa:novoEtapa,hist:[...c.hist,{t:msg,d:new Date().toLocaleString("pt-BR")}]};
    }));
  };

  const registrarIndicacao=(cid)=>{
    setClients(p=>p.map(c=>{
      if(c.id!==cid) return c;
      const novas=(c.indicacoes||0)+1;
      return{...c,indicacoes:novas,hist:[...c.hist,{t:"Indicacao confirmada "+novas+"/8",d:new Date().toLocaleString("pt-BR")}]};
    }));
  };

  const setStars=(cid,n)=>{
    const r=STAR_REASONS[n]||"";
    setClients(p=>p.map(c=>c.id!==cid?c:{...c,stars:n,starReason:r,hist:[...c.hist,{t:"".repeat(n)+" - "+r,d:new Date().toLocaleString("pt-BR")}]}));
  };

  const saveClient=()=>{
    const nc={...form,id:Date.now(),data:new Date().toLocaleDateString('pt-BR'),dias:0,stars:0,starReason:"",consent:null,nps:null,obs:"",val_a:0,val_c:0,pgto:"",cri:"",orcamento:false,hist:[{t:"Cadastro manual criado",d:new Date().toLocaleString("pt-BR")}],pv:[]};
    setClients(p=>[nc,...p]);
    setShowForm(false);
    setForm({nome:"",tel:"",email:"",insta:"",artista:"abraao",estilo:"",regiao:"",tam:"Medio",desc:"",orig:"Instagram Organico",qual:"Q2",primeira:false,cob:false,intencao:""});
  };

  const saveArtist=()=>{
    setArtists(p=>[...p,{id:Date.now().toString(),...artForm,ativo:true}]);
    setShowArtForm(false);
    setArtForm({nome:"",role:"guest",com:50,cor:"#C9A84C",insta:"",email:"",tel:""});
  };

  const saveAgEvent=()=>{
    setAgEvents(p=>[...p,{id:Date.now(),...agForm,start:Number(agForm.start),end:Number(agForm.end)}]);
    setShowAgForm(false);
  };

  const disparo=()=>{setSent(true);setTimeout(()=>setSent(false),4000);};
  const pk=dateSel||segSel;
  const pmsg=pk?MSGS[pk]:null;
  const dest=useMemo(()=>{
    if(!segSel&&!dateSel)return[];
    if(dateSel)return clients;
    const sg=SEGS.find(x=>x.id===segSel);
    return sg?clients.filter(sg.f):[];
  },[segSel,dateSel,clients]);

  const sc=sel?clients.find(c=>c.id===sel.id):null;
  const stats={total:clients.length,ativos:clients.filter(c=>!["hibernacao","blacklist"].includes(c.etapa)).length,tatuados:clients.filter(c=>c.etapa==="tatuado"||c.etapa==="pos_venda").length,hoje:clients.filter(c=>c.data==="29/05/2026").length};
  const pvC=clients.filter(c=>c.pv.length>0);
  const totalFat=fin.reduce((s,f)=>s+f.val_a,0);
  const origC=useMemo(()=>{const m={};clients.forEach(c=>{m[c.orig]=(m[c.orig]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[clients]);
  const estilos=useMemo(()=>{const m={};clients.filter(c=>c.estilo).forEach(c=>{m[c.estilo]=(m[c.estilo]||0)+1;});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5);},[clients]);
  const maxO=origC[0]?.[1]||1;
  const maxE=estilos[0]?.[1]||1;
  const wDates=useMemo(()=>getWeekDates(agDate),[agDate]);
  const mDates=useMemo(()=>getMonthDates(agDate),[agDate]);
  const todayStr=fmtDate(new Date(2026,4,30));
  const evOn=d=>agEvents.filter(e=>e.date===d);
  const agNav=dir=>{const d=new Date(agDate);if(agView==="day")d.setDate(d.getDate()+dir);else if(agView==="week")d.setDate(d.getDate()+dir*7);else d.setMonth(d.getMonth()+dir);setAgDate(d);};
  const agTitle=()=>{if(agView==="day")return agDate.getDate()+" de "+MONTHS[agDate.getMonth()]+" "+agDate.getFullYear();if(agView==="week"){const wd=getWeekDates(agDate);return wd[0].getDate()+" a "+wd[6].getDate()+" de "+MONTHS[agDate.getMonth()]+" "+agDate.getFullYear();}return MONTHS[agDate.getMonth()]+" "+agDate.getFullYear();};
  const aName=id=>artists.find(a=>a.id===id)?.nome||(id==="abraao"?"Abraao":"Camilla");
  const aClass=id=>id==="abraao"?"at-abraao":"at-camilla";
  const EBS={lead:{bg:"rgba(91,141,239,.15)",color:"#5B8DEF",b:"rgba(91,141,239,.3)"},qualificacao:{bg:"rgba(201,168,76,.15)",color:"#C9A84C",b:"rgba(201,168,76,.3)"},cons_agendada:{bg:"rgba(155,107,181,.15)",color:"#9B6BB5",b:"rgba(155,107,181,.3)"},sessao_agend:{bg:"rgba(74,158,191,.15)",color:"#4A9EBF",b:"rgba(74,158,191,.3)"},tatuado:{bg:"rgba(39,174,96,.15)",color:"#27AE60",b:"rgba(39,174,96,.3)"},pos_venda:{bg:"rgba(230,126,34,.15)",color:"#E67E22",b:"rgba(230,126,34,.3)"},lista_espera:{bg:"rgba(52,152,219,.15)",color:"#3498DB",b:"rgba(52,152,219,.3)"},hibernacao:{bg:"rgba(102,102,102,.15)",color:"#888",b:"rgba(102,102,102,.3)"},blacklist:{bg:"rgba(192,57,43,.15)",color:"#C0392B",b:"rgba(192,57,43,.3)"}};


  return (
    <>
      <div className="root">

        <div className="topbar">
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div className="bmark">C</div>
            <div style={{cursor:"pointer"}} onClick={()=>setShowSettings(true)}>
              <div className="bname">{studioName}</div>
              <div className="bsub">In-Quadra Tattoo System (editar)</div>
            </div>
          </div>
          <div className="tbr">
            {alertas.length>0&&(
              <div style={{position:"relative"}}>
                <div className="alert-btn" onClick={()=>setShowAlerts(v=>!v)}> {alertas.length} alerta{alertas.length>1?"s":""}</div>
                {showAlerts&&(
                  <div className="alert-drop">
                    <div className="ad-hdr">Alertas  -  por prioridade</div>
                    <div className="ad-body">
                      {alertas.map(c=>{
                        const m=miss(c);const ch=churn(c);
                        return(
                          <div key={c.id} className="ad-item" onClick={()=>{setSel(c);setShowAlerts(false);}}>
                            <div className="ad-name">{c.nome}</div>
                            <div className="ad-tags">
                              {ch==="red"&&<span className="co co-r">🔴 1a sem retorno</span>}
                              {ch==="orange"&&<span className="co co-o">🟠 6m sem retorno</span>}
                              {c.orcamento&&<span className="atag">💰 Orcamento</span>}
                              {m.map(x=><span key={x} className="atag"> Sem {x}</span>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="mob-toggle">
              <button className={"mob-btn"+(mobileView?" on":"")} onClick={()=>setMobileView(true)}>📱</button>
              <button className={"mob-btn"+(!mobileView?" on":"")} onClick={()=>setMobileView(false)}>🖥</button>
            </div>
            <button className="theme-btn" onClick={()=>setDark(d=>!d)}>{dark?"":"🌙"}</button>
            <button className="btn-new" onClick={()=>setShowForm(true)}>+ Novo Cliente</button>
          </div>
        </div>

        <div className="tabs">
          {[{id:"kanban",l:"Pipeline",i:"📋"},{id:"clientes",l:"Clientes",i:"👥"},{id:"agenda",l:"Agenda",i:"📅"},{id:"financeiro",l:"Financeiro",i:"💰"},{id:"artistas",l:"Artistas",i:"🎨"},{id:"contratos",l:"Contratos",i:"📄"},{id:"dashboard",l:"Dashboard",i:"📊"},{id:"posvenda",l:"Pos-venda",i:""},{id:"disparos",l:"Disparos",i:"📣"}].map(t=>(
            <button key={t.id} className={"tab"+(tab===t.id?" on":"")} onClick={()=>setTab(t.id)}>{t.i} {t.l}</button>
          ))}
        </div>

        <div className="stats">
          {[{i:"👥",v:stats.total,l:"Total",bg:"rgba(201,168,76,.1)"},{i:"",v:stats.ativos,l:"Ativos",bg:"rgba(91,141,239,.1)"},{i:"",v:stats.tatuados,l:"Tatuados",bg:"rgba(39,174,96,.1)"},{i:"🔔",v:stats.hoje,l:"Hoje",bg:"rgba(155,107,181,.1)"}].map((s,i)=>(
            <div className="si" key={i}><div className="sico" style={{background:s.bg}}>{s.i}</div><div><div className="sv">{s.v}</div><div className="sl">{s.l}</div></div></div>
          ))}
        </div>

        {(tab==="kanban"||tab==="clientes")&&(
          <div className="ctrl">
            <input className="srch" placeholder="Buscar..." value={srch} onChange={e=>setSrch(e.target.value)}/>
            {["todos","abraao","camilla"].map(f=>(
              <button key={f} className={"fb "+f+(fa===f?" on":"")} onClick={()=>setFa(f)}>{f==="todos"?"Todos":f==="abraao"?"Abraao":"Camilla"}</button>
            ))}
          </div>
        )}

        {tab==="kanban"&&(
          <div className="kw">
            {STAGES.map(stage=>{
              const sc2=getSC(stage.id);
              return(
                <div className="kc" key={stage.id}>
                  <div className="kh" style={{borderBottomColor:stage.color}}>
                    <span className="kt" style={{color:stage.color}}>{stage.emoji} {stage.label}</span>
                    <span className="kn">{sc2.length}</span>
                  </div>
                  <div className="kb">
                    {sc2.length===0&&<div className="ke">Nenhum cliente</div>}
                    {sc2.map(c=>{
                      const m=miss(c);const ch=churn(c);
                      return(
                        <div key={c.id} className="card" onClick={()=>setSel(c)}>
                          <div style={{position:"absolute",left:0,top:0,bottom:0,width:"3px",background:c.artista==="abraao"?"var(--ab)":"var(--ca)",borderRadius:"7px 0 0 7px"}}/>
                          <div className="ctop"><div className="cname">{c.nome}</div><span className={"qb "+QC[c.qual]}>{c.qual}</span></div>
                          <div className="cst">{c.estilo||"Sem estilo"}   {c.regiao||" - "}</div>
                          <div className="cft"><span className={"at "+aClass(c.artista)}>{aName(c.artista).split(" ")[0]}</span><span className="cd">{c.data}</span></div>
                          <div className="cor">📍 {c.orig}</div>
                          {(m.length>0||ch||c.orcamento||c.etapa==="blacklist"||c.etapa==="lista_espera")&&(
                            <div className="ar">
                              {m.map(x=><span key={x} className="atag"> {x}</span>)}
                              {ch==="orange"&&<span className="co co-o">🟠</span>}
                              {ch==="red"&&<span className="co co-r">🔴</span>}
                              {c.orcamento&&<span className="atag">💰</span>}
                              {c.etapa==="blacklist"&&<span className="tag-bl">🚫</span>}
                              {c.etapa==="lista_espera"&&<span className="tag-wl"></span>}
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
          </div>
        )}

        {tab==="clientes"&&(
          <div className="cw">
            {filtered.length===0?<div className="empty">Nenhum cliente encontrado.</div>:(
              <table className="ctbl">
                <thead><tr><th>Cliente</th><th>Contato</th><th>Projeto</th><th>Artista</th><th>Q</th><th>Etapa</th><th>Alertas</th><th>Origem</th></tr></thead>
                <tbody>
                  {filtered.map(c=>{
                    const es=EBS[c.etapa]||EBS.lead;const m=miss(c);const ch=churn(c);
                    return(
                      <tr key={c.id} onClick={()=>setSel(c)}>
                        <td><div className="tdn">{c.nome}</div><div className="tdd">{c.insta||<span style={{color:"var(--q2)"}}> Instagram</span>}</div></td>
                        <td><div style={{fontSize:12}}>{c.tel}</div><div className="tdd">{c.email||<span style={{color:"var(--q2)"}}> Email</span>}</div></td>
                        <td><div style={{fontSize:12}}>{c.estilo||" - "}</div><div className="tdd">{c.regiao?c.regiao+"   "+c.tam:""}</div></td>
                        <td><span className={"at "+aClass(c.artista)}>{aName(c.artista).split(" ")[0]}</span></td>
                        <td><span className={"qb "+QC[c.qual]}>{c.qual}</span></td>
                        <td><span className="eb" style={{background:es.bg,color:es.color,border:"1px solid "+es.b}}>{STAGES.find(s=>s.id===c.etapa)?.emoji} {STAGES.find(s=>s.id===c.etapa)?.label}</span></td>
                        <td>{m.length===0&&!ch&&!c.orcamento?<span style={{color:"var(--q3)",fontSize:11}}>OK</span>:<div style={{display:"flex",gap:3}}>{m.map(x=><span key={x} className="atag"></span>)}{ch==="orange"&&<span className="co co-o">🟠</span>}{ch==="red"&&<span className="co co-r">🔴</span>}{c.orcamento&&<span className="atag">💰</span>}</div>}</td>
                        <td><div className="tdd">{c.orig}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab==="agenda"&&(
          <div className="agw">
            <div className="ag-ctrl">
              <div className="ag-nav">
                <button className="ag-nb" onClick={()=>agNav(-1)}><</button>
                <div className="ag-title">{agTitle()}</div>
                <button className="ag-nb" onClick={()=>agNav(1)}>></button>
                <button className="ag-nb" style={{fontSize:11}} onClick={()=>setAgDate(new Date(2026,4,30))}>Hoje</button>
              </div>
              <div className="ag-vg">
                {["day","week","month"].map(v=><button key={v} className={"ag-vb"+(agView===v?" on":"")} onClick={()=>setAgView(v)}>{v==="day"?"Dia":v==="week"?"Semana":"Mes"}</button>)}
              </div>
              <button className="btn-new" style={{marginLeft:"auto"}} onClick={()=>setShowAgForm(true)}>+ Evento</button>
            </div>
            <div className="ag-leg">
              {Object.entries(CAL_COLORS).map(([k,v])=><div className="ag-li" key={k}><div className="ag-ld" style={{background:v}}/>{CAL_LABELS[k]}</div>)}
            </div>
            {agView==="month"&&(
              <div className="ag-month">
                <div className="mg">
                  {WEEKDAYS.map(d=><div className="mdh" key={d}>{d}</div>)}
                  {mDates.map((item,i)=>{
                    const ds=fmtDate(item.date);const evs=evOn(ds);
                    return(
                      <div key={i} className={"mday"+(item.cur?"":" om")+(ds===todayStr?" today":"")} onClick={()=>{setAgDate(item.date);setAgView("day");}}>
                        <div className="mdn">{item.date.getDate()}</div>
                        {evs.slice(0,3).map(e=><div key={e.id} className="mev" style={{background:CAL_COLORS[e.tipo]||"#888"}}>{e.start}h {e.title}</div>)}
                        {evs.length>3&&<div style={{fontSize:10,color:"var(--tx2)"}}>+{evs.length-3}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {agView==="week"&&(
              <div className="ag-week">
                <div className="wg">
                  <div className="wh"/>
                  {wDates.map((d,i)=><div key={i} className="wh" style={{color:fmtDate(d)===todayStr?"var(--gold)":"var(--tx2)"}}>{WEEKDAYS[d.getDay()]} {d.getDate()}</div>)}
                  {HOURS.map(h=>[
                    <div key={"t"+h} className="wt">{h}:00</div>,
                    ...wDates.map((d,di)=>{
                      const ds=fmtDate(d);const evs=agEvents.filter(e=>e.date===ds&&e.start<=h&&e.end>h);
                      return(
                        <div key={h+"-"+di} className="wc" onClick={()=>{setAgDate(d);setAgForm(f=>({...f,date:ds,start:h,end:h+2}));setShowAgForm(true);}}>
                          {evs.map(e=><div key={e.id} className="we" style={{background:CAL_COLORS[e.tipo]||"#888"}}>{e.title}</div>)}
                        </div>
                      );
                    })
                  ])}
                </div>
              </div>
            )}
            {agView==="day"&&(
              <div className="ag-day">
                <div className="dg">
                  {HOURS.map(h=>{
                    const ds=fmtDate(agDate);const evs=agEvents.filter(e=>e.date===ds&&e.start<=h&&e.end>h);
                    return(
                      <div key={h} className="dr">
                        <div className="dtime">{h}:00</div>
                        <div className="dslot" onClick={()=>{setAgForm(f=>({...f,date:ds,start:h,end:h+2}));setShowAgForm(true);}}>
                          {evs.map(e=>(
                            <div key={e.id} className="dev" style={{background:CAL_COLORS[e.tipo]||"#888"}}>
                              {e.title}  -  {e.start}h as {e.end}h
                              <span style={{marginLeft:8,opacity:.7,cursor:"pointer"}} onClick={ev=>{ev.stopPropagation();setAgEvents(p=>p.filter(x=>x.id!==e.id));}}></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          </div>
            )}
        )}

        {tab==="financeiro"&&(
          <div className="fw">
            <div className="fsum">
              {[{l:"Faturamento",v:"R$ "+totalFat.toLocaleString("pt-BR"),s:"Total registrado",c:"var(--gold)"},{l:"Comissoes",v:"R$ "+fin.reduce((s,f)=>s+(f.val_a*f.com_sess/100),0).toLocaleString("pt-BR"),s:"A pagar",c:"var(--ab)"},{l:"Sessoes",v:fin.filter(f=>f.val_a>0).length,s:"Com valor",c:"var(--q3)"},{l:"Divergencias",v:fin.filter(f=>f.val_a!==f.val_c&&f.val_c>0).length,s:"Verificar",c:"var(--q1)"}].map((s,i)=>(
                <div className="fsc" key={i}><div className="fsl">{s.l}</div><div className="fsv" style={{color:s.c}}>{s.v}</div><div className="fss">{s.s}</div></div>
              ))}
            </div>
            <div className="ftable">
              <div className="fth">💰 Registro de Sessoes</div>
              <table className="ft">
                <thead><tr><th>Cliente</th><th>Artista</th><th>Data</th><th>Valor Artista</th><th>Valor Cliente</th><th>Pagto</th><th>Com. Sessao</th><th>A Receber</th><th>Status</th></tr></thead>
                <tbody>
                  {fin.map((f,fi)=>{
                    const div=f.val_c>0&&f.val_a!==f.val_c;const rec=f.val_a*f.com_sess/100;
                    return(
                      <tr key={f.id}>
                        <td style={{fontFamily:"'Cormorant Garamond',serif",fontSize:14}}>{f.cliente}</td>
                        <td><span className={"at "+aClass(f.artista)}>{aName(f.artista).split(" ")[0]}</span></td>
                        <td style={{fontSize:11,color:"var(--tx2)"}}>{f.data}</td>
                        <td style={{fontWeight:600,color:"var(--gold)"}}>{f.val_a>0?"R$ "+f.val_a.toLocaleString("pt-BR"):" - "}</td>
                        <td style={{fontWeight:600,color:div?"var(--q1)":"var(--tx)"}}>{f.val_c>0?"R$ "+f.val_c.toLocaleString("pt-BR"):" - "}</td>
                        <td style={{fontSize:11}}>{f.pgto}</td>
                        <td><div style={{display:"flex",alignItems:"center",gap:4}}><input className="ci" type="number" min={0} max={100} value={f.com_sess} onChange={e=>setFin(p=>p.map((x,i)=>i===fi?{...x,com_sess:Number(e.target.value)}:x))}/><span style={{fontSize:11,color:"var(--tx2)"}}>%</span></div></td>
                        <td style={{color:"var(--q3)",fontWeight:700,fontFamily:"'Cormorant Garamond',serif",fontSize:14}}>{rec>0?"R$ "+rec.toLocaleString("pt-BR"):" - "}</td>
                        <td>{div?<span className="da"> Divergencia</span>:f.val_a>0?<span className="dok">OK OK</span>:<span style={{fontSize:11,color:"var(--tx3)"}}>Pendente</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="ftable">
              <div className="fth">📊 Fechamento por Artista</div>
              <table className="ft">
                <thead><tr><th>Artista</th><th>Tipo</th><th>Sessoes</th><th>Faturamento</th><th>Comissao Base</th><th>A Receber</th></tr></thead>
                <tbody>
                  {artists.filter(a=>a.ativo).map(a=>{
                    const ss=fin.filter(f=>f.artista===a.id&&f.val_a>0);const fat=ss.reduce((s,f)=>s+f.val_a,0);const rec=ss.reduce((s,f)=>s+(f.val_a*f.com_sess/100),0);
                    return(
                      <tr key={a.id}>
                        <td><span className={"at "+aClass(a.id)}>{a.nome.split(" ")[0]}</span></td>
                        <td style={{fontSize:11,textTransform:"capitalize",color:"var(--tx2)"}}>{a.role}</td>
                        <td style={{fontWeight:600}}>{ss.length}</td>
                        <td style={{color:"var(--gold)",fontWeight:600}}>{fat>0?"R$ "+fat.toLocaleString("pt-BR"):" - "}</td>
                        <td><div style={{display:"flex",alignItems:"center",gap:5}}><input className="ci" type="number" min={0} max={100} value={a.com} onChange={e=>setArtists(p=>p.map(x=>x.id===a.id?{...x,com:Number(e.target.value)}:x))}/><span style={{fontSize:11,color:"var(--tx2)"}}>%</span></div></td>
                        <td style={{color:"var(--q3)",fontWeight:700,fontFamily:"'Cormorant Garamond',serif",fontSize:16}}>{rec>0?"R$ "+rec.toLocaleString("pt-BR"):" - "}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==="artistas"&&(
          <div className="aw">
            <div className="aabar"><button className="btn-aa" onClick={()=>setShowArtForm(true)}> Adicionar Artista</button></div>
            {artists.map(a=>(
              <div className="acard" key={a.id} style={{opacity:a.ativo?1:.55}}>
                <div className="acardh">
                  <div>
                    <div className="aname" style={{color:a.cor}}>{a.nome}</div>
                    <div className="arole">
                      <span style={{background:a.role==="residente"?"rgba(39,174,96,.15)":"rgba(201,168,76,.15)",color:a.role==="residente"?"var(--q3)":"var(--gold)",border:"1px solid "+(a.role==="residente"?"rgba(39,174,96,.3)":"rgba(201,168,76,.3)"),borderRadius:3,padding:"2px 6px",fontSize:10,fontWeight:700,marginRight:7,textTransform:"uppercase"}}>
                        {a.role==="residente"?"RESIDENTE":"GUEST"}
                      </span>
                      {a.ativo?"Ativo":"Inativo"}   {a.insta||"Sem Instagram"}   {a.email||"Sem email"}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="btn-sm gold" onClick={()=>setShowCtr({type:"artist",a})}>📄 Contrato</button>
                    <button className="btn-sm" onClick={()=>setArtists(p=>p.map(x=>x.id===a.id?{...x,ativo:!x.ativo}:x))}>{a.ativo?"Desativar":"Reativar"}</button>
                    {a.role==="guest"&&<button className="btn-sm red" onClick={()=>setArtists(p=>p.filter(x=>x.id!==a.id))}>Remover</button>}
                  </div>
                </div>
                <div className="abody">
                  {[{l:"Clientes",v:clients.filter(c=>c.artista===a.id).length},{l:"Tatuados",v:clients.filter(c=>c.artista===a.id&&(c.etapa==="tatuado"||c.etapa==="pos_venda")).length},{l:"Conversao",v:Math.round(clients.filter(c=>c.artista===a.id&&(c.etapa==="tatuado"||c.etapa==="pos_venda")).length/Math.max(clients.filter(c=>c.artista===a.id).length,1)*100)+"%"}].map((f,i)=>(
                    <div className="af" key={i}><div className="afl">{f.l}</div><div className="afv">{f.v}</div></div>
                  ))}
                  <div className="af"><div className="afl">Comissao Base (%)</div><div style={{display:"flex",alignItems:"center",gap:5,marginTop:4}}><input className="ci" type="number" min={0} max={100} value={a.com} onChange={e=>setArtists(p=>p.map(x=>x.id===a.id?{...x,com:Number(e.target.value)}:x))}/><span style={{fontSize:11,color:"var(--tx2)"}}>%</span></div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="contratos"&&(
          <div className="contratos-w">
            <div style={{background:"var(--dk2)",border:"1px solid var(--br)",borderRadius:9,overflow:"hidden"}}>
              <div style={{padding:"13px 17px",background:"var(--dk3)",borderBottom:"1px solid var(--br)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,fontWeight:600,color:"var(--tx)"}}>📄 Contrato de Artista</div><div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>Revisar com advogado antes de usar</div></div>
                <div style={{display:"flex",gap:7}}>{artists.map(a=><button key={a.id} className="btn-sm gold" onClick={()=>setShowCtr({type:"artist",a})}>Ver  -  {a.nome.split(" ")[0]}</button>)}</div>
              </div>
              <div style={{padding:"14px 18px",fontSize:12,color:"var(--tx2)",lineHeight:1.9}}>OK Identificacao das partes  -  Estudio e Artista<br/>OK Tipo de vinculo (Residente / Guest)<br/>OK Comissao e forma de repasse<br/>OK Horario e periodo de trabalho<br/>OK Clausula LGPD  -  protecao de dados dos clientes<br/>OK Direitos autorais das obras<br/>OK Conduta e imagem da marca<br/>OK Rescisao e penalidades</div>
            </div>
            <div style={{background:"var(--dk2)",border:"1px solid var(--br)",borderRadius:9,overflow:"hidden"}}>
              <div style={{padding:"13px 17px",background:"var(--dk3)",borderBottom:"1px solid var(--br)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div><div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:19,fontWeight:600,color:"var(--tx)"}}> Confirmacao de Projeto  -  Cliente</div><div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>Enviada por WhatsApp apos aprovacao do projeto</div></div>
                <button className="btn-sm gold" onClick={()=>setShowCtr({type:"client",nome:"[CLIENTE]",artista:"[ARTISTA]",proj:"[PROJETO]",valor:"[VALOR]"})}>Ver Modelo</button>
              </div>
              <div style={{padding:"14px 18px",fontSize:12,color:"var(--tx2)",lineHeight:1.9}}>OK Cliente, artista e data<br/>OK Descricao do projeto aprovado<br/>OK Valor acordado<br/>OK Autorizacao de uso de imagem<br/>OK Garantia de retoque  -  30 dias<br/>OK Confirmacao: cliente responde "CONFIRMO"</div>
            </div>
            <div style={{background:"rgba(201,168,76,.08)",border:"1px solid rgba(201,168,76,.2)",borderRadius:7,padding:"11px 15px",fontSize:12,color:"var(--tx2)"}}>
              💡 <strong style={{color:"var(--gold)"}}>Dica:</strong> Na aba Artistas, clique em "📄 Contrato" no card de cada artista para gerar o contrato com os dados preenchidos automaticamente.
            </div>
          </div>
        )}

        {tab==="dashboard"&&(
          <div className="dw">
            <div className="dgrid">
              <div className="dcard"><div className="dch">📍 Origem dos Leads</div><div className="dcb">{origC.map(([o,c])=><div className="br-row" key={o}><div className="br-lbl">{o}</div><div className="br-trk"><div className="br-fil" style={{width:(c/maxO*100)+"%",background:"var(--gold)"}}/></div><div className="br-val">{c}</div></div>)}</div></div>
              <div className="dcard"><div className="dch">🎨 Estilos Demandados</div><div className="dcb">{estilos.map(([e,c])=><div className="br-row" key={e}><div className="br-lbl">{e}</div><div className="br-trk"><div className="br-fil" style={{width:(c/maxE*100)+"%",background:"var(--ab)"}}/></div><div className="br-val">{c}</div></div>)}</div></div>
              <div className="dcard"><div className="dch">📊 Pipeline</div><div className="dcb">{STAGES.map(s=>{const c=clients.filter(x=>x.etapa===s.id).length;return c>0?<div className="br-row" key={s.id}><div className="br-lbl">{s.emoji} {s.label}</div><div className="br-trk"><div className="br-fil" style={{width:(c/clients.length*100)+"%",background:s.color}}/></div><div className="br-val">{c}</div></div>:null;})}</div></div>
              <div className="dcard"><div className="dch"> Alertas Ativos</div><div className="dcb">
                {alertas.length===0?<div style={{color:"var(--tx3)",fontSize:12}}>OK Nenhum alerta</div>:alertas.map(c=>{
                  const m=miss(c);const ch=churn(c);
                  return(<div key={c.id} onClick={()=>setSel(c)} style={{padding:"8px 10px",background:"var(--dk3)",border:"1px solid var(--br)",borderRadius:7,marginBottom:5,cursor:"pointer"}}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,marginBottom:3}}>{c.nome}</div>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                      {m.map(x=><span key={x} className="atag"> Sem {x}</span>)}
                      {ch==="orange"&&<span className="co co-o">🟠 6m</span>}
                      {ch==="red"&&<span className="co co-r">🔴 1a</span>}
                      {c.orcamento&&<span className="atag">💰 Orcamento</span>}
                    </div>
                  </div>);
                })}
              </div></div>
              <div className="dcard"><div className="dch"> Desempenho por Artista</div><div className="dcb">
                {artists.filter(a=>a.ativo).map(a=>{
                  const clts=clients.filter(c=>c.artista===a.id);
                  const fat=fin.filter(f=>f.artista===a.id).reduce((s,f)=>s+f.val_a,0);
                  const npsA=clts.filter(c=>c.nps).length?Math.round(clts.filter(c=>c.nps).reduce((s,c)=>s+c.nps,0)/clts.filter(c=>c.nps).length*10)/10:" - ";
                  return(<div key={a.id} style={{marginBottom:14}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span className={"at "+aClass(a.id)}>{a.nome.split(" ")[0]}</span><span style={{fontSize:11,color:"var(--tx2)"}}>{clts.length} clientes   R$ {fat.toLocaleString("pt-BR")}</span></div>
                    <div style={{fontSize:12,color:"var(--tx2)",marginBottom:4}}>NPS Medio: <strong style={{color:"var(--gold)"}}>{npsA}</strong></div>
                    <div className="br-row"><div className="br-lbl" style={{fontSize:11}}>Tatuados</div><div className="br-trk"><div className="br-fil" style={{width:(clts.filter(c=>c.etapa==="tatuado"||c.etapa==="pos_venda").length/Math.max(clts.length,1)*100)+"%",background:a.cor}}/></div><div className="br-val">{clts.filter(c=>c.etapa==="tatuado"||c.etapa==="pos_venda").length}</div></div>
                  </div>);
                })}
              </div></div>
              <div className="dcard"><div className="dch">🎯 Metas  -  Junho 2026</div><div className="dcb">
                {[{l:"Sessoes",v:fin.filter(f=>f.val_a>0).length,m:10},{l:"Fat. R$k",v:Math.round(totalFat/1000),m:15},{l:"Leads",v:clients.length,m:20},{l:"NPS 9+",v:clients.filter(c=>c.nps>=9).length,m:5}].map((mt,i)=>(
                  <div key={i} style={{marginBottom:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:"var(--tx)"}}>{mt.l}</span><span style={{fontSize:11,color:"var(--tx2)"}}>{mt.v}/{mt.m}</span></div>
                    <div className="mt-trk"><div className="mt-fil" style={{width:Math.min(mt.v/mt.m*100,100)+"%"}}/></div>
                  </div>
                ))}
              </div></div>
            
              </div></div>
              <div className="dcard"><div className="dch">🔄 Fila de Reativacao  -  Esta Semana</div><div className="dcb">
                {reativacao.length===0?<div style={{color:"var(--tx3)",fontSize:12}}>Nenhum cliente para reativar.</div>:reativacao.map(c=>(
                  <div key={c.id} onClick={()=>setSel(c)} style={{padding:"8px 10px",background:"var(--dk3)",border:"1px solid var(--br)",borderRadius:7,marginBottom:5,cursor:"pointer",display:"flex",alignItems:"center",gap:9}}>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:14,fontWeight:600,color:"var(--tx)"}}>{c.nome}</div>
                      <div style={{fontSize:11,color:"var(--tx2)"}}>{c.dias} dias sem movimento   {c.qual}</div>
                    </div>
                    <div style={{fontSize:11,color:c.qual==="Q1"?"var(--q1)":c.qual==="Q2"?"var(--q2)":"var(--q3)",fontWeight:600}}>
                      {c.qual==="Q1"?"Enviar conteudo educativo":c.qual==="Q2"?"Convite direto":"Oferta especial"}
                    </div>
                  </div>
                ))}
                {paraExcluir.length>0&&<div style={{marginTop:8,padding:"8px 11px",background:"rgba(192,57,43,.08)",border:"1px solid rgba(192,57,43,.2)",borderRadius:6,fontSize:11,color:"var(--q1)"}}> {paraExcluir.length} lead{paraExcluir.length>1?"s":""} com +40 dias sem resposta  -  prontos para exclusao.</div>}
              </div></div>
            </div>
          </div>
          </div>
          </div>
          </div>
        )}

        {tab==="posvenda"&&(
          <div className="pvw">
            {pvC.length===0?<div className="empty">Nenhum cliente em pos-venda.</div>:pvC.map(c=>(
              <div className="pvc" key={c.id}>
                <div className="pvh">
                  <div>
                    <div className="pvn">{c.nome}</div>
                    <div className="pvm"><span className={"at "+aClass(c.artista)} style={{marginRight:7}}>{aName(c.artista).split(" ")[0]}</span>{c.estilo}{c.nps&&<span style={{marginLeft:9,color:"var(--gold)",fontWeight:600}}>NPS: {c.nps}/10</span>}</div>
                  </div>
                  <button className="mc" style={{width:"auto",padding:"0 9px",fontSize:11}} onClick={()=>setSel(c)}>Ver ficha</button>
                </div>
                <div className="pvt">
                  {c.pv.map((p,i)=>(
                    <div className="pvs" key={i}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:p.s==="done"?"var(--q3)":p.s==="pending"?"var(--q2)":"var(--tx3)"}}/><span className="pvsl">{p.l}</span></div>
                      <span className={"pvss "+(p.s==="done"?"pvd":p.s==="pending"?"pvp":"pvf")}>{p.s==="done"?"OK Enviado":p.s==="pending"?" Pendente":"🔮 Aguardando"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        )}

        {tab==="disparos"&&(
          <div className="disw">
            <div className="disl">
              <div className="dsec">
                <div className="dsh"><div className="dst">🎯 Disparar por Perfil</div><div className="dss">Mensagens personalizadas por segmento</div></div>
                <div className="dsb">
                  {SEGS.map(sg=>{
                    const cnt=clients.filter(sg.f).length;
                    return(
                      <div key={sg.id} className={"seg"+(segSel===sg.id?" on":"")} onClick={()=>{setSegSel(segSel===sg.id?null:sg.id);setDateSel(null);setSent(false);setEditing(false);setMsgEdit("");}}>
                        <div><div className="sn">{sg.icon} {sg.label}</div><div className="sd">{sg.desc}</div></div>
                        <div className="sc2">{cnt}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="dsec">
                <div className="dsh"><div className="dst">🗓 Datas Comemorativas</div><div className="dss">Mensagens emocionais para toda a base</div></div>
                <div className="dsb">
                  {DATAS.map(d=>(
                    <div key={d.id} className={"di"+(dateSel===d.id?" on":"")} onClick={()=>{setDateSel(dateSel===d.id?null:d.id);setSegSel(null);setSent(false);setEditing(false);setMsgEdit("");}}>
                      <div style={{fontSize:12,fontWeight:500,color:"var(--tx)",display:"flex",alignItems:"center",gap:6}}>{d.icon} {d.label}</div>
                      <div style={{fontSize:11,color:"var(--tx2)"}}>{d.data}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="disr">
              <div className="dsec">
                <div className="dsh"><div className="dst">📱 Preview da Mensagem</div><div className="dss">A palavra final e sempre sua</div></div>
                <div className="dsb">
                  {!pmsg?<div style={{textAlign:"center",padding:"24px 0",color:"var(--tx3)",fontSize:12}}>Selecione um segmento ou data</div>:(
                    <>
                      <div className="prev">
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
                          <div className="prevl" style={{margin:0}}>Mensagem via Aura</div>
                          <button onClick={()=>{if(!editing)setMsgEdit(pmsg);setEditing(!editing);}} style={{background:editing?"var(--gold-d)":"var(--dk4)",border:"1px solid "+(editing?"var(--gold)":"var(--br)"),borderRadius:4,color:editing?"var(--gold)":"var(--tx2)",padding:"3px 8px",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600}}>{editing?"OK Ok":" Editar"}</button>
                        </div>
                        {editing?<textarea value={msgEdit} onChange={e=>setMsgEdit(e.target.value)} style={{width:"100%",minHeight:170,background:"var(--dk4)",border:"1px solid var(--gold)",borderRadius:7,padding:11,fontSize:12,color:"var(--tx)",fontFamily:"'DM Sans',sans-serif",lineHeight:1.7,outline:"none",resize:"vertical"}}/>:<div className="prevm">{msgEdit||pmsg}</div>}
                        <div className="prevc">📤 {dest.length} destinatario{dest.length!==1?"s":""}{dest.length>0&&"   "+dest.map(c=>c.nome.split(" ")[0]).slice(0,3).join(", ")+(dest.length>3?" +"+( dest.length-3):"")}</div>
                      </div>
                      {sent?<div className="dis-ok"><div style={{fontSize:12,color:"var(--q3)",fontWeight:600}}>OK Disparo programado!</div><div style={{fontSize:11,color:"var(--tx2)",marginTop:3}}>Aura envia para {dest.length} cliente{dest.length!==1?"s":""} com elegancia.</div></div>:<button className="btn-dis" onClick={disparo} disabled={dest.length===0}>📣 Programar  -  {dest.length} cliente{dest.length!==1?"s":""}</button>}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {sc&&(
          <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setSel(null)}}>
            <div className="modal">
              <div className="mh">
                <div>
                  <div className="mn">{sc.nome}</div>
                  <div className="ms">
                    <span className={"qb "+QC[sc.qual]}>{sc.qual}{sc.qual==="Q0"?"  -  Acompanhante":""}</span>
                    <span className={"at "+aClass(sc.artista)}>{aName(sc.artista).split(" ")[0]}</span>
                    {sc.etapa==="blacklist"&&<span className="tag-bl">🚫</span>}
                    {sc.etapa==="lista_espera"&&<span className="tag-wl"></span>}
                    <span style={{color:"var(--tx3)",fontSize:11}}>Entrou em {sc.data}</span>
                    {miss(sc).map(m=><span key={m} className="atag"> Sem {m}</span>)}
                  </div>
                </div>
                <button className="mc" onClick={()=>setSel(null)}></button>
              </div>
              <div className="mb">
                {sc.orcamento&&(
                  <div className="ba">
                    <span style={{fontSize:18}}>💰</span>
                    <div style={{flex:1,fontSize:12,color:"var(--q2)",fontWeight:600}}>Orcamento pendente  -  registre o valor combinado nesta consultoria.</div>
                    <button className="btn-sm gold" onClick={()=>{const v=prompt("Valor combinado (ex: 1200):");if(v){upC(sc.id,"val_a",Number(v));upC(sc.id,"orcamento",false);setClients(p=>p.map(c=>c.id!==sc.id?c:{...c,hist:[...c.hist,{t:"Orcamento: R$ "+Number(v).toLocaleString("pt-BR"),d:new Date().toLocaleString("pt-BR")}]}));}}}>Registrar</button>
                  </div>
                )}
                <div>
                  <div className="stit">Dados Basicos</div>
                  <div className="fg2">
                    {[{l:"Nome",f:"nome"},{l:"Telefone",f:"tel"},{l:"Email",f:"email",w:!sc.email},{l:"Instagram",f:"insta",w:!sc.insta}].map((fd,i)=>(
                      <div className="fi2" key={i}>
                        <div className="fil">{fd.l}{fd.w?" ":""}</div>
                        <input className="ef" value={sc[fd.f]||""} placeholder={fd.w?"Clique para adicionar":""} onChange={e=>upC(sc.id,fd.f,e.target.value)} style={{borderColor:fd.w&&!sc[fd.f]?"var(--q2)":"var(--br)"}}/>
                      </div>
                    ))}
                    {[{l:"Origem",v:sc.orig},{l:"Criativo",v:sc.cri}].map((fd,i)=>(
                      <div className="fi2" key={i}><div className="fil">{fd.l}</div><div className="fiv">{fd.v||" - "}</div></div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="stit">Projeto Artistico</div>
                  <div className="fg3">
                    {[{l:"Estilo",v:sc.estilo},{l:"Regiao",v:sc.regiao},{l:"Tamanho",v:sc.tam},{l:"Cobertura",v:sc.cob?"Sim":"Nao"},{l:"1 Tattoo",v:sc.primeira?"Sim":"Nao"},{l:"Intencao",v:sc.intencao}].map((fd,i)=>(
                      <div className="fi2" key={i}><div className="fil">{fd.l}</div><div className={"fiv"+((!fd.v||fd.v===" - ")?" em":"")}>{fd.v||" - "}</div></div>
                    ))}
                  </div>
                  <div className="fi2" style={{marginTop:7}}><div className="fil">Descricao do Projeto</div><div className="fiv">{sc.desc}</div></div>
                </div>
                <div>
                  <div className="stit">Avaliacoes Internas</div>
                  <div className="fg2">
                    <div className="fi2">
                      <div className="fil">Avaliacao do Cliente pelo Artista</div>
                      <div className="stars" style={{marginTop:4}}>
                        {[1,2,3,4,5].map(n=>(
                          <span key={n} className="star" style={{opacity:n<=(sc.stars||0)?1:.25}} onClick={()=>setStars(sc.id,n)}></span>
                        ))}
                      </div>
                      {sc.starReason&&<div style={{fontSize:11,color:"var(--tx2)",marginTop:3,fontStyle:"italic"}}>{sc.starReason}</div>}
                    </div>
                    <div className="fi2">
                      <div className="fil">NPS do Cliente (0 - 10)</div>
                      {sc.nps!=null?<div style={{fontSize:20,fontWeight:700,color:"var(--gold)",fontFamily:"'Cormorant Garamond',serif",marginTop:3}}>{sc.nps}/10</div>:(
                        <div className="nps-bar">{[0,1,2,3,4,5,6,7,8,9,10].map(n=><button key={n} className={"nps-btn"+(sc.nps===n?" sel":"")} onClick={()=>upC(sc.id,"nps",n)}>{n}</button>)}</div>
                      )}
                    </div>
                  </div>
                  <div className="fi2" style={{marginTop:7}}>
                    <div className="fil">Consentimento de Uso de Imagem</div>
                    <div style={{display:"flex",gap:6,marginTop:5}}>
                      <button className={"cb"+(sc.consent===true?" yes":"")} onClick={()=>upC(sc.id,"consent",true)}>OK Autorizado</button>
                      <button className={"cb"+(sc.consent===false?" no":"")} onClick={()=>upC(sc.id,"consent",false)}> Nao autorizado</button>
                      {sc.consent===null&&<span style={{fontSize:11,color:"var(--tx3)",alignSelf:"center"}}>Nao informado</span>}
                    </div>
                  </div>
                  <div className="fi2" style={{marginTop:7}}>
                    <div className="fil">Observacoes Internas</div>
                    <textarea value={sc.obs} onChange={e=>upC(sc.id,"obs",e.target.value)} style={{width:"100%",minHeight:50,background:"var(--dk4)",border:"1px solid var(--br)",borderRadius:5,padding:"6px 8px",fontSize:11,color:"var(--tx)",fontFamily:"'DM Sans',sans-serif",outline:"none",resize:"vertical",marginTop:3}} placeholder="Anotacoes privadas..."/>
                  </div>
                </div>
                {sc.val_a>0&&(
                  <div>
                    <div className="stit">Financeiro da Sessao</div>
                    <div className="fg3">
                      {[{l:"Valor Registrado",v:"R$ "+sc.val_a.toLocaleString("pt-BR")},{l:"Valor via Aura",v:sc.val_c>0?"R$ "+sc.val_c.toLocaleString("pt-BR"):"Nao coletado"},{l:"Pagamento",v:sc.pgto||" - "}].map((fd,i)=>(
                        <div className="fi2" key={i}><div className="fil">{fd.l}</div><div className={"fiv"+(sc.val_a!==sc.val_c&&sc.val_c>0&&i<2?" warn":"")}>{fd.v}</div></div>
                      ))}
                    </div>
                    {sc.val_a!==sc.val_c&&sc.val_c>0&&<div style={{background:"rgba(192,57,43,.1)",border:"1px solid rgba(192,57,43,.25)",borderRadius:5,padding:"7px 10px",marginTop:7,fontSize:12,color:"var(--q1)",fontWeight:600}}> Divergencia  -  verificar com o artista</div>}
                  </div>
                )}
                <div>
                  <div className="stit">Confirmacao de Projeto</div>
                  <div style={{display:"flex",alignItems:"center",gap:11,padding:"9px 12px",background:"var(--dk3)",border:"1px solid var(--br)",borderRadius:7}}>
                    <div style={{fontSize:12,color:"var(--tx)",flex:1}}>Contrato: <strong style={{color:sc.contrato?"var(--q3)":"var(--q2)"}}>{sc.contrato?"OK Enviado":"Nao enviado"}</strong></div>
                    <button className="btn-sm gold" onClick={()=>setShowCtr({type:"client",nome:sc.nome,artista:aName(sc.artista),proj:sc.desc,valor:sc.val_a>0?"R$ "+sc.val_a.toLocaleString("pt-BR"):"A definir"})}>Ver / Enviar</button>
                  </div>
                </div>
                <div>
                  <div className="stit">Faltas e Ocorrencias</div>
                  <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 13px",background:"var(--dk3)",border:"1px solid var(--br)",borderRadius:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:"var(--tx)",fontWeight:600}}>Faltas registradas: {sc.faltas||0}/3</div>
                      <div style={{fontSize:11,color:"var(--tx2)",marginTop:2}}>
                        {(sc.faltas||0)===0?"Nenhuma falta registrada":(sc.faltas||0)===1?"1a falta  -  R$100 cobrado":"2a falta  -  30% cobrado"}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      {(sc.faltas||0)<3&&(
                        <button className="btn-sm red" onClick={()=>registrarFalta(sc.id)}>Registrar Falta</button>
                      )}
                      {sc.etapa==="blacklist"&&<span className="tag-bl">BLACKLIST</span>}
                    </div>
                  </div>
                  {(sc.faltas||0)>0&&(
                    <div style={{marginTop:6,padding:"8px 12px",background:"rgba(192,57,43,.08)",border:"1px solid rgba(192,57,43,.2)",borderRadius:6,fontSize:11,color:"var(--q1)"}}>
                      {(sc.faltas||0)===1?"Taxa de R$100 sera abatida no valor final da tatuagem.":(sc.faltas||0)===2?"30% do valor orcado cobrado. Cliente pode levar o desenho se pagar.":"Cliente na Blacklist  -  atendimento encerrado."}
                    </div>
                  )}
                </div>

                <div>
                  <div className="stit">Programa de Fidelidade</div>
                  <div style={{padding:"12px 14px",background:"var(--dk3)",border:"1px solid var(--br)",borderRadius:8}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{fontSize:13,color:"var(--tx)",fontWeight:600}}>Indicacoes: {sc.indicacoes||0}/8</div>
                      {(sc.credito||0)>0&&<div style={{fontSize:13,color:"var(--gold)",fontWeight:700}}>Credito: R$ {(sc.credito||0).toLocaleString("pt-BR")}</div>}
                    </div>
                    <div style={{width:"100%",background:"var(--dk4)",borderRadius:4,height:8,overflow:"hidden",marginBottom:8}}>
                      <div style={{height:"100%",borderRadius:4,background:"var(--gold)",width:Math.min((sc.indicacoes||0)/8*100,100)+"%",transition:"width .4s"}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:11,color:"var(--tx2)"}}>
                        {(sc.indicacoes||0)>=8?"Meta atingida! Credito disponivel.":"Faltam "+(8-(sc.indicacoes||0))+" indicacoes para o credito"}
                      </div>
                      {(sc.indicacoes||0)<8&&<button className="btn-sm gold" onClick={()=>registrarIndicacao(sc.id)}>+ Indicacao</button>}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="stit">Mover no Pipeline</div>
                  <div className="pm">
                    {STAGES.map(s=>(
                      <button key={s.id} className={"sb"+(sc.etapa===s.id?" cur":"")} style={sc.etapa===s.id?{borderColor:s.color,color:s.color,background:s.color+"18"}:{}} onClick={()=>move(sc.id,s.id)}>{s.emoji} {s.label}</button>
                    ))}
                  </div>
                </div>
                {sc.pv.length>0&&(
                  <div>
                    <div className="stit">Pos-venda</div>
                    {sc.pv.map((p,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 9px",background:"var(--dk3)",border:"1px solid var(--br)",borderRadius:5,marginBottom:5}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:p.s==="done"?"var(--q3)":p.s==="pending"?"var(--q2)":"var(--tx3)",flexShrink:0}}/>
                        <span style={{fontSize:12,color:"var(--tx)",flex:1}}>{p.l}</span>
                        <span className={"pvss "+(p.s==="done"?"pvd":p.s==="pending"?"pvp":"pvf")}>{p.s==="done"?"OK Enviado":p.s==="pending"?" Pendente":"🔮 Aguardando"}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <div className="stit">Historico</div>
                  {[...sc.hist].reverse().map((h,i)=>(
                    <div className="hi" key={i}><div className="hd"/><div><div className="ht">{h.t}</div><div className="hdt">{h.d}</div></div></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCtr&&(
          <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setShowCtr(null)}}>
            <div className="modal" style={{maxWidth:640}}>
              <div className="mh">
                <div><div className="mn">{showCtr.type==="artist"?"Contrato de Artista":"Confirmacao de Projeto"}</div><div style={{fontSize:11,color:"var(--tx2)",marginTop:3}}>Copie o texto e edite conforme necessario</div></div>
                <button className="mc" onClick={()=>setShowCtr(null)}></button>
              </div>
              <div style={{padding:"18px 22px"}}>
                <textarea readOnly value={showCtr.type==="artist"?makeContractArtist(studioName).replace("[NOME]",showCtr.a?.nome||" - ").replace("[EMAIL]",showCtr.a?.email||" - ").replace("[INSTAGRAM]",showCtr.a?.insta||" - ").replace("[RESIDENTE / GUEST]",showCtr.a?.role||" - "):makeContractClient(studioName,showCtr.nome,showCtr.artista,showCtr.proj,showCtr.valor)} style={{width:"100%",minHeight:340,background:"var(--dk3)",border:"1px solid var(--br)",borderRadius:7,padding:14,fontSize:12,color:"var(--tx2)",fontFamily:"'DM Sans',sans-serif",lineHeight:1.8,outline:"none",resize:"vertical"}}/>
                <div style={{display:"flex",gap:7,marginTop:11,justifyContent:"flex-end"}}>
                  <button className="btn-c" onClick={()=>setShowCtr(null)}>Fechar</button>
                  <button className="btn-s" onClick={()=>{navigator.clipboard?.writeText(showCtr.type==="artist"?makeContractArtist(studioName):makeContractClient(studioName,showCtr.nome,showCtr.artista,showCtr.proj,showCtr.valor));if(showCtr.type==="client"&&sc)upC(sc.id,"contrato",true);setShowCtr(null);}}>📋 Copiar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showForm&&(
          <div className="fov" onClick={e=>{if(e.target===e.currentTarget)setShowForm(false)}}>
            <div className="fmod">
              <div className="fmh"><div className="fmt">Novo Cliente</div><button className="mc" onClick={()=>setShowForm(false)}></button></div>
              <div className="fmb">
                <div className="fr"><div className="ff"><label className="fl">Nome *</label><input className="fi" placeholder="Nome completo" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/></div><div className="ff"><label className="fl">Telefone *</label><input className="fi" placeholder="(27) 99999-9999" value={form.tel} onChange={e=>setForm({...form,tel:e.target.value})}/></div></div>
                <div className="fr"><div className="ff"><label className="fl">Email </label><input className="fi" placeholder="email@email.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div><div className="ff"><label className="fl">Instagram </label><input className="fi" placeholder="@perfil" value={form.insta} onChange={e=>setForm({...form,insta:e.target.value})}/></div></div>
                <div className="fr"><div className="ff"><label className="fl">Artista</label><select className="fs" value={form.artista} onChange={e=>setForm({...form,artista:e.target.value})}>{artists.filter(a=>a.ativo).map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></div><div className="ff"><label className="fl">Qualificacao</label><select className="fs" value={form.qual} onChange={e=>setForm({...form,qual:e.target.value})}><option value="Q0">Q0  -  Acompanhante</option><option value="Q1">Q1  -  Frio</option><option value="Q2">Q2  -  Quente</option><option value="Q3">Q3  -  Pronto</option></select></div></div>
                <div className="fr"><div className="ff"><label className="fl">Estilo</label><input className="fi" placeholder="Fine Line, Realismo..." value={form.estilo} onChange={e=>setForm({...form,estilo:e.target.value})}/></div><div className="ff"><label className="fl">Regiao</label><input className="fi" placeholder="Antebraco, Costas..." value={form.regiao} onChange={e=>setForm({...form,regiao:e.target.value})}/></div></div>
                <div className="fr"><div className="ff"><label className="fl">Tamanho</label><select className="fs" value={form.tam} onChange={e=>setForm({...form,tam:e.target.value})}><option>Discreto</option><option>Medio</option><option>Grande</option><option>Fechamento</option></select></div><div className="ff"><label className="fl">Origem</label><select className="fs" value={form.orig} onChange={e=>setForm({...form,orig:e.target.value})}><option>Instagram Organico</option><option>Trafego Pago</option><option>Indicacao</option><option>Google</option><option>Presencial</option><option>Site</option></select></div></div>
                <div className="ff"><label className="fl">Descricao do Projeto</label><textarea className="fta" placeholder="Descreva a ideia..." value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})}/></div>
                <div className="ff"><label className="fl">Intencao Emocional</label><input className="fi" placeholder="Homenagem, estetica, memoria..." value={form.intencao} onChange={e=>setForm({...form,intencao:e.target.value})}/></div>
              </div>
              <div className="fmf"><button className="btn-c" onClick={()=>setShowForm(false)}>Cancelar</button><button className="btn-s" onClick={saveClient} disabled={!form.nome||!form.tel}>Salvar</button></div>
            </div>
          </div>
        )}

        {showArtForm&&(
          <div className="fov" onClick={e=>{if(e.target===e.currentTarget)setShowArtForm(false)}}>
            <div className="fmod" style={{maxWidth:420}}>
              <div className="fmh"><div className="fmt">Adicionar Artista</div><button className="mc" onClick={()=>setShowArtForm(false)}></button></div>
              <div className="fmb">
                <div className="ff"><label className="fl">Nome Completo *</label><input className="fi" placeholder="Nome do artista" value={artForm.nome} onChange={e=>setArtForm({...artForm,nome:e.target.value})}/></div>
                <div className="fr"><div className="ff"><label className="fl">Tipo</label><select className="fs" value={artForm.role} onChange={e=>setArtForm({...artForm,role:e.target.value})}><option value="residente">Residente</option><option value="guest">Guest</option></select></div><div className="ff"><label className="fl">Comissao (%)</label><input className="fi" type="number" min={0} max={100} value={artForm.com} onChange={e=>setArtForm({...artForm,com:Number(e.target.value)})}/></div></div>
                <div className="fr"><div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={artForm.insta} onChange={e=>setArtForm({...artForm,insta:e.target.value})}/></div><div className="ff"><label className="fl">Email</label><input className="fi" placeholder="email" value={artForm.email} onChange={e=>setArtForm({...artForm,email:e.target.value})}/></div></div>
                <div className="ff"><label className="fl">Telefone</label><input className="fi" placeholder="(27) 99999-9999" value={artForm.tel} onChange={e=>setArtForm({...artForm,tel:e.target.value})}/></div>
                <div className="ff"><label className="fl">Cor</label><input type="color" value={artForm.cor} onChange={e=>setArtForm({...artForm,cor:e.target.value})} style={{width:"100%",height:38,background:"none",border:"1px solid var(--br)",borderRadius:5,cursor:"pointer"}}/></div>
              </div>
              <div className="fmf"><button className="btn-c" onClick={()=>setShowArtForm(false)}>Cancelar</button><button className="btn-s" onClick={saveArtist} disabled={!artForm.nome}>Salvar</button></div>
            </div>
          </div>
        )}

        {showAgForm&&(
          <div className="fov" onClick={e=>{if(e.target===e.currentTarget)setShowAgForm(false)}}>
            <div className="fmod" style={{maxWidth:400}}>
              <div className="fmh"><div className="fmt">Novo Evento</div><button className="mc" onClick={()=>setShowAgForm(false)}></button></div>
              <div className="fmb">
                <div className="ff"><label className="fl">Titulo / Cliente *</label><input className="fi" placeholder="Nome" value={agForm.title} onChange={e=>setAgForm({...agForm,title:e.target.value})}/></div>
                <div className="ff"><label className="fl">Tipo</label><select className="fs" value={agForm.tipo} onChange={e=>setAgForm({...agForm,tipo:e.target.value})}>{Object.entries(CAL_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
                <div className="ff"><label className="fl">Data</label><input className="fi" type="date" value={agForm.date} onChange={e=>setAgForm({...agForm,date:e.target.value})}/></div>
                <div className="fr"><div className="ff"><label className="fl">Inicio (h)</label><input className="fi" type="number" min={8} max={20} value={agForm.start} onChange={e=>setAgForm({...agForm,start:Number(e.target.value)})}/></div><div className="ff"><label className="fl">Fim (h)</label><input className="fi" type="number" min={9} max={22} value={agForm.end} onChange={e=>setAgForm({...agForm,end:Number(e.target.value)})}/></div></div>
              </div>
              <div className="fmf"><button className="btn-c" onClick={()=>setShowAgForm(false)}>Cancelar</button><button className="btn-s" onClick={saveAgEvent} disabled={!agForm.title}>Salvar</button></div>
            </div>
          </div>
        )}

        {showSettings&&(
          <div className="ov" onClick={e=>{if(e.target===e.currentTarget)setShowSettings(false)}}>
            <div className="settings-modal">
              <div className="mh">
                <div><div className="mn">Configuracoes do Estudio</div><div style={{fontSize:11,color:"var(--tx2)",marginTop:3}}>Edite as informacoes do seu estudio</div></div>
                <button className="mc" onClick={()=>setShowSettings(false)}></button>
              </div>
              <div className="mb">
                <div>
                  <div className="stit">Perfil do Estudio</div>
                  <div className="fg2">
                    <div className="fi2"><div className="fil">Nome do Estudio</div><input className="ef" value={studioName} onChange={e=>setStudioName(e.target.value)}/></div>
                    <div className="fi2"><div className="fil">Cidade</div><input className="ef" defaultValue="Vitoria"/></div>
                    <div className="fi2"><div className="fil">WhatsApp</div><input className="ef" defaultValue="(27) 99999-0000"/></div>
                    <div className="fi2"><div className="fil">Instagram</div><input className="ef" defaultValue="@casadoscarvalho"/></div>
                  </div>
                </div>
                <div>
                  <div className="stit">Horarios de Funcionamento</div>
                  <div style={{fontSize:11,color:"var(--tx3)",marginBottom:8}}>A Aura atende 24h. Estes horarios sao para a agenda interna.</div>
                  {horarios.map((h,i)=>(
                    <div key={h.dia} className="hr-row">
                      <div className="hr-dia">{h.dia}</div>
                      <div className="hr-toggle" style={{background:h.aberto?"var(--q3)":"var(--dk5)"}} onClick={()=>setHorarios(p=>p.map((x,j)=>j===i?{...x,aberto:!x.aberto}:x))}>
                        <div className="hr-toggle-dot" style={{left:h.aberto?"18px":"2px"}}/>
                      </div>
                      {h.aberto?(
                        <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                          <input className="fi" type="time" value={h.ini} onChange={e=>setHorarios(p=>p.map((x,j)=>j===i?{...x,ini:e.target.value}:x))} style={{width:90,padding:"4px 7px"}}/>
                          <span style={{fontSize:12,color:"var(--tx2)"}}>as</span>
                          <input className="fi" type="time" value={h.fim} onChange={e=>setHorarios(p=>p.map((x,j)=>j===i?{...x,fim:e.target.value}:x))} style={{width:90,padding:"4px 7px"}}/>
                        </div>
                      ):(
                        <span style={{fontSize:12,color:"var(--tx3)",fontStyle:"italic",flex:1}}>Fechado</span>
                      )}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="stit">Zona de Perigo</div>
                  <div style={{background:"rgba(192,57,43,.08)",border:"1px solid rgba(192,57,43,.2)",borderRadius:8,padding:"12px 14px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--q1)"}}>Resetar Configuracoes</div>
                      <div style={{fontSize:11,color:"var(--tx2)",marginTop:3}}>Volta ao padrao de fabrica. Os dados de clientes sao preservados.</div>
                    </div>
                    <button className="btn-sm red" onClick={()=>{if(window.confirm("Resetar configuracoes? Os clientes serao preservados.")){setStudioName("Meu Estudio");setHorarios([{dia:"Segunda",aberto:true,ini:"09:00",fim:"19:00"},{dia:"Terca",aberto:true,ini:"09:00",fim:"19:00"},{dia:"Quarta",aberto:true,ini:"09:00",fim:"19:00"},{dia:"Quinta",aberto:true,ini:"09:00",fim:"19:00"},{dia:"Sexta",aberto:true,ini:"09:00",fim:"19:00"},{dia:"Sabado",aberto:true,ini:"10:00",fim:"17:00"},{dia:"Domingo",aberto:false,ini:"",fim:""}]);setShowSettings(false);}}}>Resetar</button>
                  </div>
                </div>
              </div>
              <div className="fmf">
                <button className="btn-c" onClick={()=>setShowSettings(false)}>Fechar</button>
                <button className="btn-s" onClick={()=>setShowSettings(false)}>Salvar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );

;
}
