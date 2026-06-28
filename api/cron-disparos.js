// api/cron-disparos.js — Motor de disparo automático (Vercel Cron)
// Roda diariamente às 09h00 (UTC). Verifica réguas pós-venda, pré-venda e
// fluxo_etapas para todos os usuários. Dispara via Resend (email) ou
// Zenvia (WhatsApp/SMS) quando: prazo atingido + não enviado ainda + ativo.

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

function substituirVars(msg, cliente, studioName, extra) {
  if (!msg) return "";
  let r = msg
    .replace(/\{nome\}/gi, cliente.nome || "")
    .replace(/\[Nome\]/gi, cliente.nome || "")
    .replace(/\{estudio\}/gi, studioName || "INK SYSTEM")
    .replace(/\[ESTUDIO\]/gi, studioName || "INK SYSTEM");
  if (extra?.link) r = r.replace(/\{link\}/gi, extra.link);
  return r;
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

      const studioName = cfg.studio_name || "INK SYSTEM";

      // 2. Buscar clientes deste user_id
      let clientes = [];
      try {
        const { data: cliData } = await sb
          .from("clientes")
          .select("id, nome, email, tel, etapa, etapa_desde, sessao_concluida_em, disparos_enviados, hist, followups, confirmacao_token, confirmacao_token_exp, confirmacao_evento_id, confirmacao_presenca")
          .eq("user_id", userId)
          .is("excluido_em", null);
        if (cliData) clientes = cliData;
      } catch {
        continue;
      }

      // 3. Buscar fluxo_etapas deste user_id (agrupado por etapa_slug)
      let fluxoEtapas = {};
      try {
        const { data: fluxoData } = await sb
          .from("fluxo_etapas")
          .select("*")
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("ordem", { ascending: true });
        if (fluxoData) {
          for (const fe of fluxoData) {
            if (!fluxoEtapas[fe.etapa_slug]) fluxoEtapas[fe.etapa_slug] = [];
            fluxoEtapas[fe.etapa_slug].push(fe);
          }
        }
      } catch {}

      for (const cliente of clientes) {
        let disparosEnviados = {};
        try {
          disparosEnviados = cliente.disparos_enviados || {};
        } catch {}

        // ── AVALIAÇÃO GOOGLE (sistema fixo — D+1 após sessão concluída) ────
        if (cliente.sessao_concluida_em && cfg.resend_api_key && cliente.email) {
          const diasPv = diasEntre(cliente.sessao_concluida_em, hoje);
          const jaEnviouAvaliacao = disparosEnviados && disparosEnviados["__avaliacao_google__"];
          if (diasPv >= 1 && !jaEnviouAvaliacao) {
            const fn = (cliente.nome || "").trim().split(" ")[0];
            const linkAvaliacao = "https://inq-saas.vercel.app/api/lead?token=" + cliente.id;
            const htmlAvaliacao =
              "<div style='font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px'>" +
              "<p style='font-size:22px;font-weight:bold;color:#1a1a1a;margin-bottom:4px'>Casa dos Carvalho Tattoo</p>" +
              "<hr style='border:none;border-top:1px solid #d4a84b;margin-bottom:24px'>" +
              "<p style='font-size:16px'>Olá, <strong>" + fn + "</strong>! 🖤</p>" +
              "<p style='line-height:1.8;color:#333'>Foi um prazer enorme ter você aqui. A sua tatuagem foi feita com muito cuidado e carinho — e adoraríamos saber o que você achou.</p>" +
              "<p style='line-height:1.8;color:#333'><strong>De 1 a 10, como foi sua experiência na Casa dos Carvalho?</strong></p>" +
              "<p style='margin:24px 0;text-align:center'>" +
              [1,2,3,4,5,6,7,8,9,10].map(n =>
                "<a href='" + linkAvaliacao + "&nota=" + n + "' style='display:inline-block;margin:4px;width:40px;height:40px;line-height:40px;text-align:center;background:" + (n >= 8 ? "#d4a84b" : "#eee") + ";color:" + (n >= 8 ? "#fff" : "#555") + ";text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px'>" + n + "</a>"
              ).join("") +
              "</p>" +
              "<p style='font-size:12px;color:#aaa;margin-top:32px'>Com carinho, Casa dos Carvalho Tattoo — Vitória, ES</p>" +
              "</div>";
            const okAv = await dispararEmail({
              apiKey: cfg.resend_api_key,
              from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
              nome_remetente: studioName,
              to: cliente.email,
              subject: "Como foi sua experiência, " + fn + "? 🖤",
              html: htmlAvaliacao
            });
            if (okAv) {
              let disparosAtuais = {};
              try {
                const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                disparosAtuais = cliAtual?.disparos_enviados || {};
              } catch {}
              await marcarEnviado(cliente.id, "__avaliacao_google__", disparosAtuais);
              await registrarHistorico(userId, "Avaliação Google enviada — " + cliente.nome);
              totalDisparos++;
            }
          }
        }

        // ── CONFIRMAÇÃO DE PRESENÇA D-1 ─────────────────────────────────────
        if (cliente.etapa === "sessao_agend") {
          try {
            // Calcular amanhã em horário de Brasília (UTC-3)
            const hojeUtc = new Date();
            const hojeBRT = new Date(hojeUtc.getTime() - 3 * 60 * 60 * 1000);
            const amanhaStr = new Date(hojeBRT.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            // Buscar evento da agenda para amanhã
            const { data: evAmanha } = await sb
              .from("agenda")
              .select("id, date, hora")
              .eq("cliente_id", cliente.id)
              .neq("status", "concluido")
              .eq("date", amanhaStr)
              .limit(1)
              .single();

            if (evAmanha) {
              const dedupKey = "__confirmacao_d1__" + evAmanha.id;

              // Skip se o cron já enviou para esse evento
              const jaEnviouCron = disparosEnviados && disparosEnviados[dedupKey];

              // Skip se já existe token ativo gerado manualmente para esse evento
              const tokenAtivoManual = cliente.confirmacao_token
                && cliente.confirmacao_token_exp
                && new Date(cliente.confirmacao_token_exp) > hojeUtc
                && String(cliente.confirmacao_evento_id) === String(evAmanha.id);

              if (!jaEnviouCron && !tokenAtivoManual) {
                // Gerar token novo (crypto global disponível no Node 18+)
                const token = crypto.randomUUID();
                const expDate = new Date(evAmanha.date + "T23:59:00");
                expDate.setDate(expDate.getDate() + 1);
                const exp = expDate.toISOString();

                await sb.from("clientes").update({
                  confirmacao_token: token,
                  confirmacao_token_exp: exp,
                  confirmacao_evento_id: evAmanha.id,
                  confirmacao_presenca: null,
                }).eq("id", cliente.id);

                const baseUrl = process.env.VERCEL_URL
                  ? "https://" + process.env.VERCEL_URL
                  : "http://localhost:3000";
                const linkConfirmacao = baseUrl + "/confirmar.html?token=" + token;

                const dataEvFormatada = new Date(evAmanha.date + "T12:00:00")
                  .toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                const horaEv = evAmanha.hora ? " às " + evAmanha.hora : "";
                const msgPadrao = "Olá {nome}! Sua sessão está marcada para " + dataEvFormatada + horaEv + ". Confirme sua presença: {link}";

                // Verificar se existe mensagem personalizada em fluxo_etapas do slug sessao_agend
                const fluxoSessao = (fluxoEtapas["sessao_agend"] || []);
                const feConfirm = fluxoSessao.find(fe => fe.dias <= 0 || fe.label?.toLowerCase().includes("confirm"));
                const msgFinal = substituirVars(feConfirm?.mensagem || msgPadrao, cliente, studioName, { link: linkConfirmacao });

                const canaisParaEnviar = feConfirm?.canal === "ambos"
                  ? ["email", "sms"]
                  : feConfirm?.canal
                    ? [feConfirm.canal]
                    : Object.entries(canaisHabilitados).filter(([, v]) => v).map(([k]) => k).filter(k => k !== "whatsapp" || canaisHabilitados.whatsapp);

                let enviou = false;
                for (const canal of canaisParaEnviar) {
                  if (canal === "email" && cfg.resend_api_key && cliente.email) {
                    const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
                      msgFinal.replace(/\n/g, "<br>") + "</div>";
                    const ok = await dispararEmail({
                      apiKey: cfg.resend_api_key,
                      from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
                      nome_remetente: cfg.nome_remetente || studioName,
                      to: cliente.email,
                      subject: "Confirme sua presença amanhã — " + studioName,
                      html,
                    });
                    if (ok) enviou = true;
                  } else if ((canal === "sms" || canal === "whatsapp") && cfg.zenvia_api_key && cfg.zenvia_numero && cliente.tel) {
                    const tel = (cliente.tel || "").replace(/[^0-9]/g, "");
                    const ok = await dispararZenvia({ apiKey: cfg.zenvia_api_key, from: cfg.zenvia_numero, to: tel, text: msgFinal, canal });
                    if (ok) enviou = true;
                  }
                }

                if (enviou) {
                  let disparosAtuais = {};
                  try {
                    const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                    disparosAtuais = cliAtual?.disparos_enviados || {};
                  } catch {}
                  await marcarEnviado(cliente.id, dedupKey, disparosAtuais);
                  await registrarHistorico(userId, "Confirmação de presença D-1 enviada — " + cliente.nome);
                  totalDisparos++;
                }
              }
            }
          } catch {}
        }

        // ── FLUXO_ETAPAS (régua unificada por slug de etapa) ────────────────
        const etapaSlug = cliente.etapa || "";
        const etapasDoFluxo = fluxoEtapas[etapaSlug] || [];

        if (etapasDoFluxo.length > 0 && cliente.etapa_desde) {
          const diasEtapa = diasEntre(cliente.etapa_desde, hoje);
          if (diasEtapa >= 0) {
            for (const fe of etapasDoFluxo) {
              try {
                const feId = "fluxo__" + fe.id;
                const jaEnviou = disparosEnviados && disparosEnviados[feId];

                // repetir: reengajamento envia a cada repetir_intervalo_dias dias
                if (jaEnviou && fe.repetir && fe.repetir_intervalo_dias > 0) {
                  const enviadoEm = new Date(jaEnviou);
                  const diasDesdeEnvio = Math.floor((hoje - enviadoEm) / (1000 * 60 * 60 * 24));
                  if (diasDesdeEnvio < fe.repetir_intervalo_dias) continue;
                } else if (jaEnviou) {
                  continue;
                }

                if (diasEtapa < fe.dias) continue;

                const canais = fe.canal === "ambos" ? ["email", "sms"] : [fe.canal || "email"];
                for (const canalAtual of canais) {
                  const canalOk = canaisHabilitados ? (canaisHabilitados[canalAtual] !== false) : (canalAtual === "email");
                  if (!canalOk) continue;

                  const msg = substituirVars(fe.mensagem, cliente, studioName);
                  let ok = false;

                  if (canalAtual === "email") {
                    if (!cfg.resend_api_key || !cliente.email) continue;
                    const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
                      msg.replace(/\n/g, "<br>") + "</div>";
                    ok = await dispararEmail({
                      apiKey: cfg.resend_api_key,
                      from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
                      nome_remetente: cfg.nome_remetente || studioName,
                      to: cliente.email,
                      subject: (fe.label || etapaSlug) + " — " + studioName,
                      html
                    });
                  } else if (canalAtual === "sms" || canalAtual === "whatsapp") {
                    if (!cfg.zenvia_api_key || !cfg.zenvia_numero || !cliente.tel) continue;
                    const tel = (cliente.tel || "").replace(/[^0-9]/g, "");
                    ok = await dispararZenvia({
                      apiKey: cfg.zenvia_api_key,
                      from: cfg.zenvia_numero,
                      to: tel,
                      text: msg,
                      canal: canalAtual
                    });
                  }

                  if (ok) {
                    let disparosAtuais = {};
                    try {
                      const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                      disparosAtuais = cliAtual?.disparos_enviados || {};
                    } catch {}
                    await marcarEnviado(cliente.id, feId, disparosAtuais);
                    await registrarHistorico(userId, "Fluxo [" + etapaSlug + "] — " + (fe.label || feId) + " — " + cliente.nome + " (" + canalAtual + ")");
                    totalDisparos++;
                  }
                }
              } catch {
                totalErros++;
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
