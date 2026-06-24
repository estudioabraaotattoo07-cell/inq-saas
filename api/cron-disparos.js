// api/cron-disparos.js — Motor de disparo automático (Vercel Cron)
// Roda diariamente às 09h00 (UTC). Verifica réguas pós-venda e pré-venda
// para todos os usuários. Dispara via Resend (email) ou Zenvia (WhatsApp/SMS)
// quando: prazo atingido + não enviado ainda + etapa ativa + canal habilitado.

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function diasEntre(dataISO, hoje) {
  try {
    const d = new Date(dataISO);
    return Math.floor((hoje - d) / (1000 * 60 * 60 * 24));
  } catch {
    return -1;
  }
}

function substituirVars(msg, cliente, studioName) {
  if (!msg) return "";
  return msg
    .replace(/\{nome\}/gi, cliente.nome || "")
    .replace(/\[Nome\]/gi, cliente.nome || "")
    .replace(/\{estudio\}/gi, studioName || "INK SYSTEM")
    .replace(/\[ESTUDIO\]/gi, studioName || "INK SYSTEM");
}

// ─── DISPARAR EMAIL via /api/resend (proxy interno) ──────────────────────────

async function dispararEmail({ apiKey, from, nome_remetente, to, subject, html }) {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? "https://" + process.env.VERCEL_URL
      : "http://localhost:3000";
    const res = await fetch(baseUrl + "/api/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, from, to, subject, html })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── DISPARAR WHATSAPP/SMS via Zenvia ────────────────────────────────────────

async function dispararZenvia({ apiKey, from, to, text, canal }) {
  try {
    const endpoint = canal === "sms"
      ? "https://api.zenvia.com/v2/channels/sms/messages"
      : "https://api.zenvia.com/v2/channels/whatsapp/messages";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "X-API-TOKEN": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from,
        to: to,
        contents: [{ type: "text", text: text }]
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── REGISTRAR NO HISTORICO ───────────────────────────────────────────────────

async function registrarHistorico(userId, acao) {
  try {
    const now = new Date();
    const data = now.toLocaleDateString("pt-BR");
    const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    await sb.from("historico").insert({ data, hora, acao, user_id: userId });
  } catch {}
}

// ─── MARCAR ETAPA COMO ENVIADA ───────────────────────────────────────────────

async function marcarEnviado(clienteId, etapaId, disparosEnviados) {
  try {
    const atualizados = { ...disparosEnviados, [etapaId]: new Date().toISOString() };
    await sb.from("clientes").update({ disparos_enviados: atualizados }).eq("id", clienteId);
  } catch {}
}

// ─── PROCESSAR ETAPA ─────────────────────────────────────────────────────────

async function processarEtapa({
  etapa, diasDecorridos, cliente, cfg, userId, studioName,
  disparosEnviados, canaisHabilitados, tipoRegua, revalidarEtapa
}) {
  const etapaId = etapa.id;
  const etapaAtiva = etapa.ativa !== false;

  if (!etapaAtiva) return;
  if (etapa.dias < 0) return;
  if (diasDecorridos < etapa.dias) return;
  if (disparosEnviados && disparosEnviados[etapaId]) return;

  const canal = etapa.canal || "email";
  const canalOk = canaisHabilitados ? (canaisHabilitados[canal] !== false) : (canal === "email");
  if (!canalOk) return;

  // Pré-venda: revalidar que cliente ainda está na mesma etapa
  if (revalidarEtapa) {
    try {
      const { data: clienteAtual } = await sb
        .from("clientes")
        .select("etapa, etapa_desde")
        .eq("id", cliente.id)
        .single();
      if (!clienteAtual || clienteAtual.etapa !== cliente.etapa) return;
    } catch {
      return;
    }
  }

  const msg = substituirVars(etapa.msg, cliente, studioName);
  let ok = false;

  if (canal === "email") {
    if (!cfg.resend_api_key || !cliente.email) return;
    const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
      msg.replace(/\n/g, "<br>") + "</div>";
    ok = await dispararEmail({
      apiKey: cfg.resend_api_key,
      from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
      nome_remetente: cfg.nome_remetente || studioName || "INK SYSTEM",
      to: cliente.email,
      subject: etapa.label + " — " + studioName,
      html
    });
  } else if (canal === "whatsapp" || canal === "sms") {
    if (!cfg.zenvia_api_key || !cfg.zenvia_numero || !cliente.tel) return;
    const tel = (cliente.tel || "").replace(/[^0-9]/g, "");
    ok = await dispararZenvia({
      apiKey: cfg.zenvia_api_key,
      from: cfg.zenvia_numero,
      to: tel,
      text: msg,
      canal
    });
  }

  if (ok) {
    // Ler disparos_enviados mais recentes antes de marcar
    let disparosAtuais = {};
    try {
      const { data: cliAtual } = await sb
        .from("clientes")
        .select("disparos_enviados")
        .eq("id", cliente.id)
        .single();
      disparosAtuais = cliAtual?.disparos_enviados || {};
    } catch {}
    await marcarEnviado(cliente.id, etapaId, disparosAtuais);
    await registrarHistorico(
      userId,
      "Disparo automático [" + tipoRegua + "] — " + etapa.label + " — " + cliente.nome + " (" + canal + ")"
    );
  }
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Vercel Cron envia GET com header authorization
  const auth = req.headers.authorization || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (cronSecret && auth !== "Bearer " + cronSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const hoje = new Date();
  let totalDisparos = 0;
  let totalErros = 0;

  try {
    // 1. Buscar todas as configurações (todos os user_id)
    const { data: configs, error: cfgErr } = await sb.from("configuracoes").select("*");
    if (cfgErr || !configs) {
      return res.status(500).json({ error: "Erro ao buscar configuracoes" });
    }

    for (const cfg of configs) {
      const userId = cfg.user_id;
      if (!userId) continue;

      // Exclusão definitiva: clientes na lixeira há mais de 30 dias
      const limite30 = new Date(hoje);
      limite30.setDate(limite30.getDate() - 30);
      const { data: expirados } = await sb
        .from("clientes")
        .select("id")
        .eq("user_id", userId)
        .not("excluido_em", "is", null)
        .lt("excluido_em", limite30.toISOString());
      for (const cli of expirados || []) {
        await sb.from("agendamentos_pendentes").delete().eq("cliente_id", cli.id);
        await sb.from("eventos_trafego").delete().eq("cliente_id", cli.id);
        await sb.from("financeiro").delete().eq("cliente_id", cli.id);
        await sb.from("agenda").delete().eq("cliente_id", cli.id);
        await sb.from("clientes").delete().eq("id", cli.id);
      }

      // Parse canais_habilitados
      let canaisHabilitados = { email: true, whatsapp: false, sms: false };
      try {
        const raw = cfg.canais_habilitados;
        if (raw) {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          canaisHabilitados = { ...canaisHabilitados, ...parsed };
        }
      } catch {}

      // Parse pv_regua (pós-venda)
      let pvRegua = [];
      try {
        const raw = cfg.pv_regua;
        if (raw) {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed)) pvRegua = parsed;
        }
      } catch {}

      // Parse pre_venda_regua
      let preVendaRegua = { lead: [], qualificacao: [], hibernacao: [], aguard_agend: [] };
      try {
        const raw = cfg.pre_venda_regua;
        if (raw) {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (parsed && typeof parsed === "object") {
            preVendaRegua = {
              lead: Array.isArray(parsed.lead) ? parsed.lead : [],
              qualificacao: Array.isArray(parsed.qualificacao) ? parsed.qualificacao : [],
              hibernacao: Array.isArray(parsed.hibernacao) ? parsed.hibernacao : [],
              aguard_agend: Array.isArray(parsed.aguard_agend) ? parsed.aguard_agend : []
            };
          }
        }
      } catch {}

      const studioName = cfg.studio_name || "INK SYSTEM";

      // 2. Buscar clientes deste user_id
      let clientes = [];
      try {
        const { data: cliData } = await sb
          .from("clientes")
          .select("id, nome, email, tel, etapa, etapa_desde, sessao_concluida_em, disparos_enviados, hist, followups")
          .eq("user_id", userId)
          .is("excluido_em", null);
        if (cliData) clientes = cliData;
      } catch {
        continue;
      }

      for (const cliente of clientes) {
        let disparosEnviados = {};
        try {
          disparosEnviados = cliente.disparos_enviados || {};
        } catch {}

        // ── PÓS-VENDA ──────────────────────────────────────────────────────
        // Verificar se régua pós-venda está ativa
        const pvReguaObj = cfg.pv_regua_config || null;
        let pvReguaAtiva = true;
        try {
          if (pvReguaObj) {
            const parsed = typeof pvReguaObj === "string" ? JSON.parse(pvReguaObj) : pvReguaObj;
            pvReguaAtiva = parsed.ativa !== false;
          }
        } catch {}

        if (pvReguaAtiva && pvRegua.length > 0 && cliente.sessao_concluida_em && cliente.etapa !== "aguard_agend") {
          const diasPv = diasEntre(cliente.sessao_concluida_em, hoje);
          if (diasPv >= 0) {
            for (const etapa of pvRegua) {
              try {
                await processarEtapa({
                  etapa, diasDecorridos: diasPv, cliente, cfg, userId, studioName,
                  disparosEnviados, canaisHabilitados, tipoRegua: "pós-venda", revalidarEtapa: false
                });
                totalDisparos++;
              } catch {
                totalErros++;
              }
            }
          }
        }

        // ── PRÉ-VENDA ───────────────────────────────────────────────────────
        const etapaCliente = cliente.etapa || "";
        const etapaMapeadas = { lead: "lead", qualificacao: "qualificacao", hibernacao: "hibernacao", aguard_agend: "aguard_agend" };
        const campoPre = etapaMapeadas[etapaCliente] || null;

        if (campoPre && preVendaRegua[campoPre] && preVendaRegua[campoPre].length > 0) {
          // Verificar se a régua pré-venda do campo está ativa
          let preReguaAtiva = true;
          try {
            const rawPreConfig = cfg["pre_venda_regua_config_" + campoPre];
            if (rawPreConfig) {
              const parsed = typeof rawPreConfig === "string" ? JSON.parse(rawPreConfig) : rawPreConfig;
              preReguaAtiva = parsed.ativa !== false;
            }
          } catch {}

          if (preReguaAtiva && cliente.etapa_desde) {
            const diasPre = diasEntre(cliente.etapa_desde, hoje);
            if (diasPre >= 0) {
              for (const etapa of preVendaRegua[campoPre]) {
                try {
                  await processarEtapa({
                    etapa, diasDecorridos: diasPre, cliente, cfg, userId, studioName,
                    disparosEnviados, canaisHabilitados,
                    tipoRegua: "pré-venda/" + campoPre, revalidarEtapa: true
                  });
                  totalDisparos++;
                } catch {
                  totalErros++;
                }
              }
            }
          }
        }
      }
    }

    return res.status(200).json({
      ok: true,
      disparos: totalDisparos,
      erros: totalErros,
      executado_em: hoje.toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detail: String(err.message || err) });
  }
}
