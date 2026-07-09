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

// ─── DATAS-ÂNCORA DAS CAMPANHAS SAZONAIS ─────────────────────────────────────

function nthSundayOfMonth(year, month0, nth) {
  const first = new Date(year, month0, 1);
  const firstSunday = 1 + ((7 - first.getDay()) % 7);
  return new Date(year, month0, firstSunday + (nth - 1) * 7);
}

function anchorDateForCampanha(slug, year, nascimento) {
  if (slug === "dia_maes") return nthSundayOfMonth(year, 4, 2); // maio, 2o domingo
  if (slug === "dia_pais") return nthSundayOfMonth(year, 7, 2); // agosto, 2o domingo
  if (slug === "dia_namorados") return new Date(year, 5, 12); // 12 de junho
  if (slug === "natal") return new Date(year, 11, 25);
  if (slug === "ano_novo") return new Date(year, 0, 1);
  if (slug === "aniversario") {
    if (!nascimento) return null;
    const d = new Date(nascimento);
    if (isNaN(d.getTime())) return null;
    return new Date(year, d.getMonth(), d.getDate());
  }
  return null;
}

function mesmoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatarTelBR(tel) {
  const digitos = (tel || "").replace(/[^0-9]/g, "");
  if (!digitos) return "";
  // Já tem DDI 55 (13 digitos: 55 + DDD + 9 digitos, ou 12 sem o 9)
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) return digitos;
  // Numero nacional (10 ou 11 digitos: DDD + numero) — adiciona DDI 55
  if (digitos.length === 10 || digitos.length === 11) return "55" + digitos;
  return digitos;
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

// ─── DISPARAR EMAIL direto via API da Resend ─────────────────────────────────
// Chamado server-to-server (cron), por isso vai direto na Resend em vez de
// passar pelo proxy /api/resend — chamar o proprio dominio via VERCEL_URL
// caía numa URL de deploy protegida por autenticacao da Vercel (401), o que
// fazia todo email do cron falhar silenciosamente.

async function dispararEmail({ apiKey, from, nome_remetente, to, subject, html }) {
  try {
    const finalKey = apiKey || process.env.RESEND_API_KEY;
    if (!finalKey || !to) return false;
    const envRemetente = process.env.EMAIL_REMETENTE || "contato@acasadoscarvalhotattoo.com.br";
    const fromValido = from && from.includes("@") && !from.includes("<>");
    const finalFrom = fromValido ? from : ("A Casa dos Carvalho <" + envRemetente + ">");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + finalKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: finalFrom, to, subject, html })
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
    const tel = formatarTelBR(cliente.tel);
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
          .select("id, nome, email, tel, etapa, etapa_desde, nascimento, sessao_concluida_em, disparos_enviados, hist, followups, confirmacao_token, confirmacao_token_exp, confirmacao_evento_id, confirmacao_presenca, artista, descricao, avaliacao_fluxo_status, avaliacao_token, avaliacao_token_exp, google_convite_em")
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

      // 3b. Buscar campanhas_sazonais_etapas deste user_id (agrupado por campanha_slug)
      let campSazEtapas = {};
      try {
        const { data: campSazData } = await sb
          .from("campanhas_sazonais_etapas")
          .select("*")
          .eq("user_id", userId)
          .eq("ativo", true);
        if (campSazData) {
          for (const fe of campSazData) {
            if (!campSazEtapas[fe.campanha_slug]) campSazEtapas[fe.campanha_slug] = [];
            campSazEtapas[fe.campanha_slug].push(fe);
          }
        }
      } catch {}

      for (const cliente of clientes) {
        let disparosEnviados = {};
        try {
          disparosEnviados = cliente.disparos_enviados || {};
        } catch {}

        // ── AVALIAÇÃO GOOGLE (sistema fixo — D+1 após sessão concluída) ────
        if (cfg.fluxo_nps_ativa !== false && cliente.sessao_concluida_em && cfg.resend_api_key && cliente.email) {
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

        // ── AVALIAÇÃO NPS + CONVITE GOOGLE (fluxo pós-sessão encadeado) ────────
        if (cfg.fluxo_nps_ativa !== false && cliente.etapa === "pos_venda" && cfg.resend_api_key && cliente.email) {
          const status = cliente.avaliacao_fluxo_status;
          const fn = (cliente.nome || "").trim().split(" ")[0];

          // Buscar nome do artista para remetente personalizado
          let nomeArtista = studioName;
          if (cliente.artista) {
            try {
              const { data: art } = await sb.from("artistas").select("nome, tel").eq("id", cliente.artista).single();
              if (art?.nome) nomeArtista = art.nome.split(" ")[0] + " — " + studioName;
            } catch {}
          }

          // E-mail 1: disparar se status é null e diasEtapa >= 1
          if (!status && cliente.etapa_desde) {
            const diasPv = diasEntre(cliente.etapa_desde, hoje);
            if (diasPv >= 1) {
              const token = crypto.randomUUID();
              const exp = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
              const linkAv = "https://inq-saas.vercel.app/avaliar.html?token=" + token;
              const botoesNota = [0,1,2,3,4,5,6,7,8,9,10].map(n =>
                `<a href="https://inq-saas.vercel.app/api/lead?acao=avaliar_nps&token=${token}&nota=${n}" style="display:inline-block;margin:3px;width:42px;height:42px;line-height:42px;text-align:center;background:${n>=7?"#d4a84b":"#2a2a2a"};color:${n>=7?"#111":"#aaa"};text-decoration:none;border-radius:7px;font-weight:bold;font-size:14px;border:1px solid ${n>=7?"#d4a84b":"#333"}">${n}</a>`
              ).join("");
              const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px"><p style="font-size:11px;letter-spacing:2px;color:#d4a84b;text-transform:uppercase;margin-bottom:4px">Casa dos Carvalho Tattoo</p><hr style="border:none;border-top:1px solid #d4a84b;margin-bottom:24px"><p style="font-size:16px">Olá, <strong>${fn}</strong>!</p><p style="line-height:1.8;color:#444;margin:16px 0">Foi uma alegria ter você aqui no estúdio. Sua opinião é muito importante para nós — ela nos ajuda a continuar evoluindo e a receber cada cliente com ainda mais cuidado.</p><p style="font-size:15px;color:#222;font-weight:bold;margin-bottom:16px">Como você avalia sua experiência conosco?</p><div style="text-align:center;margin-bottom:8px">${botoesNota}</div><p style="font-size:11px;color:#aaa;text-align:center;margin-bottom:28px">0 = extremamente insatisfeito · 10 = extremamente satisfeito</p><p style="font-size:12px;color:#bbb;margin-top:24px">Com carinho, ${nomeArtista}</p></div>`;
              const ok = await dispararEmail({
                apiKey: cfg.resend_api_key,
                from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
                nome_remetente: nomeArtista,
                to: cliente.email,
                subject: "Como foi sua sessão, " + fn + "?",
                html,
              });
              if (ok) {
                await sb.from("clientes").update({
                  avaliacao_token: token,
                  avaliacao_token_exp: exp,
                  avaliacao_fluxo_status: "aguardando",
                }).eq("id", cliente.id);
                await registrarHistorico(userId, "Avaliação NPS (E-mail 1) enviada — " + cliente.nome);
                totalDisparos++;
              }
            }
          }

          // E-mail 2: disparar convite Google se status é "positiva" e google_convite_em <= agora
          if (cfg.fluxo_google_convite_ativa !== false && status === "positiva" && cliente.google_convite_em && new Date(cliente.google_convite_em) <= hoje) {
            const linkSim = "https://inq-saas.vercel.app/api/lead?acao=google_sim&token=" + cliente.id;
            const linkNao = "https://inq-saas.vercel.app/api/lead?acao=google_nao&token=" + cliente.id;
            const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px"><p style="font-size:11px;letter-spacing:2px;color:#d4a84b;text-transform:uppercase;margin-bottom:4px">Casa dos Carvalho Tattoo</p><hr style="border:none;border-top:1px solid #d4a84b;margin-bottom:24px"><p style="font-size:16px">Olá, <strong>${fn}</strong>!</p><p style="line-height:1.8;color:#444;margin:16px 0">Muito obrigado pela sua avaliação — fico feliz que sua experiência no estúdio tenha sido boa.</p><p style="line-height:1.8;color:#444;margin-bottom:24px">Se você topar, sua opinião no Google faz uma diferença enorme para nós. Quando as pessoas pesquisam um estúdio, são as avaliações reais de clientes como você que ajudam a decidir.</p><div style="text-align:center;margin-bottom:24px"><a href="${linkSim}" style="display:inline-block;background:#d4a84b;color:#111;text-decoration:none;border-radius:8px;padding:13px 28px;font-size:14px;font-weight:bold;margin:6px">Sim, quero avaliar no Google</a><br><a href="${linkNao}" style="display:inline-block;background:#f5f5f5;color:#555;text-decoration:none;border-radius:8px;padding:13px 28px;font-size:14px;margin:6px">Não, obrigado</a></div><p style="font-size:12px;color:#bbb;text-align:center">Sem pressão — qualquer resposta é válida para nós.</p><p style="font-size:12px;color:#bbb;margin-top:24px">Com carinho, ${nomeArtista}</p></div>`;
            const ok = await dispararEmail({
              apiKey: cfg.resend_api_key,
              from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
              nome_remetente: nomeArtista,
              to: cliente.email,
              subject: "Uma última coisa, " + fn + " — leva 1 minuto",
              html,
            });
            if (ok) {
              await sb.from("clientes").update({ google_convite_em: null }).eq("id", cliente.id);
              await registrarHistorico(userId, "Convite Google (E-mail 2) enviado — " + cliente.nome);
              totalDisparos++;
            }
          }
        }

        // ── AGUARDANDO NOVA SOLICITAÇÃO DE PROJETO — D+60 e-mail / D+90 hibernação ──
        if (cfg.fluxo_recontato_prox_sessao_ativa !== false && cliente.etapa === "aguard_prox_sessao" && cliente.etapa_desde) {
          const diasEtapa = diasEntre(cliente.etapa_desde, hoje);
          const fn = (cliente.nome || "").trim().split(" ")[0];

          // D+90: mover automaticamente para Hibernação
          if (diasEtapa >= 90) {
            await sb.from("clientes").update({ etapa: "hibernacao", etapa_desde: new Date().toISOString() }).eq("id", cliente.id);
            await registrarHistorico(userId, "Movido automaticamente para Hibernação após 90 dias sem nova solicitação — " + cliente.nome);
            totalDisparos++;
          } else if (diasEtapa >= 60 && cfg.resend_api_key && cliente.email) {
            // D+60: e-mail de recontato (uma única vez)
            const jaEnviouD60 = disparosEnviados && disparosEnviados["__aguard_prox_sessao_d60__"];
            if (!jaEnviouD60) {
              const linkWpp = "https://wa.me/5527999598230?text=" + encodeURIComponent("Olá! Sou " + cliente.nome + " e já tenho uma nova ideia para tatuar na Casa dos Carvalho. Gostaria de agendar uma consulta para conversarmos sobre o projeto!");
              const htmlD60 = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px">
<p style="font-size:11px;letter-spacing:2px;color:#d4a84b;text-transform:uppercase;margin-bottom:4px">Casa dos Carvalho Tattoo</p>
<hr style="border:none;border-top:1px solid #d4a84b;margin-bottom:24px">
<p style="font-size:16px">Olá, <strong>${fn}</strong>!</p>
<p style="line-height:1.8;color:#444;margin:16px 0">Faz um tempo desde a sua última sessão aqui na Casa dos Carvalho — e esperamos que sua arte esteja linda e bem cicatrizada.</p>
<p style="line-height:1.8;color:#444;margin-bottom:24px">Sabemos que uma boa ideia não tem pressa para nascer. Mas quando ela chegar, queremos ser os primeiros a saber.</p>
<p style="line-height:1.8;color:#444;margin-bottom:28px">Se já está pensando no próximo projeto, é só chamar a gente.</p>
<div style="text-align:center;margin-bottom:28px">
  <a href="${linkWpp}" style="display:inline-block;background:#d4a84b;color:#111;text-decoration:none;border-radius:8px;padding:14px 32px;font-size:14px;font-weight:bold">Tenho uma nova ideia</a>
</div>
<p style="font-size:12px;color:#bbb;margin-top:24px">Respeitoso abraço, ${studioName}</p>
</div>`;
              const ok = await dispararEmail({
                apiKey: cfg.resend_api_key,
                from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
                nome_remetente: studioName,
                to: cliente.email,
                subject: "A próxima ideia já nasceu, " + fn + "?",
                html: htmlD60,
              });
              if (ok) {
                let disparosAtuais = {};
                try { const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single(); disparosAtuais = cliAtual?.disparos_enviados || {}; } catch {}
                await marcarEnviado(cliente.id, "__aguard_prox_sessao_d60__", disparosAtuais);
                await registrarHistorico(userId, "E-mail recontato D+60 Aguardando Nova Solicitação enviado — " + cliente.nome);
                totalDisparos++;
              }
            }
          }
        }

        // ── PRECISA REMARCAR — E-mail imediato com link WhatsApp ────────────────
        if (cfg.fluxo_remarcar_ativa !== false && cliente.etapa === "precisa_remarcar" && cfg.resend_api_key && cliente.email) {
          const fn = (cliente.nome || "").trim().split(" ")[0];
          const jaEnviouRemarcar = disparosEnviados && disparosEnviados["__precisa_remarcar_email__"];
          if (!jaEnviouRemarcar && cliente.etapa_desde) {
            const diasEtapa = diasEntre(cliente.etapa_desde, hoje);
            if (diasEtapa >= 0) {
              const linkWpp = "https://wa.me/5527999598230?text=" + encodeURIComponent("Olá! Sou " + cliente.nome + " e preciso remarcar minha sessão/consulta na Casa dos Carvalho. Podemos verificar uma nova data?");
              const htmlRemarcar = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px">
<p style="font-size:11px;letter-spacing:2px;color:#d4a84b;text-transform:uppercase;margin-bottom:4px">Casa dos Carvalho Tattoo</p>
<hr style="border:none;border-top:1px solid #d4a84b;margin-bottom:24px">
<p style="font-size:16px">Olá, <strong>${fn}</strong>.</p>
<p style="line-height:1.8;color:#444;margin:16px 0">Sua sessão foi desmarcada e o horário já foi disponibilizado para outros clientes.</p>
<p style="line-height:1.8;color:#444;margin-bottom:16px">Trabalhamos com agenda limitada por uma razão: cada projeto merece atenção total. Quando um horário é agendado, a nossa atenção é plena para você — não terá a surpresa de ter o seu artista dividindo atenção com outros clientes.</p>
<p style="line-height:1.8;color:#444;margin-bottom:28px">Assim que estiver pronto(a) para retomar, guardamos seu projeto com cuidado. Ele é seu.</p>
<div style="text-align:center;margin-bottom:28px">
  <a href="${linkWpp}" style="display:inline-block;background:#d4a84b;color:#111;text-decoration:none;border-radius:8px;padding:14px 32px;font-size:14px;font-weight:bold">Remarcar pelo WhatsApp</a>
</div>
<p style="font-size:12px;color:#bbb;margin-top:24px">Casa dos Carvalho Tattoo</p>
</div>`;
              const ok = await dispararEmail({
                apiKey: cfg.resend_api_key,
                from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
                nome_remetente: studioName,
                to: cliente.email,
                subject: "Sua vaga foi liberada, " + fn,
                html: htmlRemarcar,
              });
              if (ok) {
                let disparosAtuais = {};
                try { const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single(); disparosAtuais = cliAtual?.disparos_enviados || {}; } catch {}
                await marcarEnviado(cliente.id, "__precisa_remarcar_email__", disparosAtuais);
                await registrarHistorico(userId, "E-mail Precisa Remarcar enviado — " + cliente.nome);
                totalDisparos++;
              }
            }
          }
        }

        // ── AGUARDANDO 1ª SESSÃO — E-mail imediato (D+0) + recontato D+30 ──────
        if (cliente.etapa === "aguard_1a_sessao" && cfg.resend_api_key && cliente.email) {
          const fn = (cliente.nome || "").trim().split(" ")[0];

          // Buscar nome do artista
          let nomeArtista = "";
          if (cliente.artista) {
            try {
              const { data: art } = await sb.from("artistas").select("nome, tel").eq("id", cliente.artista).single();
              if (art?.nome) nomeArtista = art.nome;
            } catch {}
          }

          const jaEnviouBV = disparosEnviados && disparosEnviados["__aguard_1a_sessao_bv__"];
          if (cfg.fluxo_agradecimento_1asessao_ativa !== false && !jaEnviouBV && cliente.etapa_desde) {
            const diasEtapa = diasEntre(cliente.etapa_desde, hoje);
            if (diasEtapa >= 0) {
              const htmlBV = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px">
<p style="font-size:11px;letter-spacing:2px;color:#d4a84b;text-transform:uppercase;margin-bottom:4px">Casa dos Carvalho Tattoo</p>
<hr style="border:none;border-top:1px solid #d4a84b;margin-bottom:24px">
<p style="font-size:16px">Olá, <strong>${fn}</strong>!</p>
<p style="line-height:1.8;color:#444;margin:16px 0">Queremos te agradecer por ter vindo até a gente. Sua pontualidade e compromisso dizem muito sobre quem você é — e é exatamente o tipo de cliente que a gente adora receber.</p>
<p style="line-height:1.8;color:#444;margin-bottom:16px">Seu projeto está registrado com carinho aqui no sistema. Quando quiser dar o próximo passo e agendar sua sessão, é só falar — estaremos prontos para você.</p>
<p style="line-height:1.8;color:#444;margin-bottom:24px">Daqui a 30 dias vamos entrar em contato novamente para saber se já chegou a sua hora!</p>
<p style="font-size:12px;color:#bbb;margin-top:24px">Respeitoso abraço, ${studioName}</p>
</div>`;
              const ok = await dispararEmail({
                apiKey: cfg.resend_api_key,
                from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
                nome_remetente: studioName,
                to: cliente.email,
                subject: "Obrigado pela sua visita, " + fn,
                html: htmlBV,
              });
              if (ok) {
                let disparosAtuais = {};
                try { const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single(); disparosAtuais = cliAtual?.disparos_enviados || {}; } catch {}
                await marcarEnviado(cliente.id, "__aguard_1a_sessao_bv__", disparosAtuais);
                await registrarHistorico(userId, "E-mail boas-vindas Aguardando 1ª Sessão enviado — " + cliente.nome);
                totalDisparos++;
              }
            }
          }

          // E-mail D+30 de recontato com botões Sim/Não
          const jaEnviouD30 = disparosEnviados && disparosEnviados["__aguard_1a_sessao_d30__"];
          if (cfg.fluxo_recontato_d30_ativa !== false && !jaEnviouD30 && cliente.etapa_desde) {
            const diasEtapa = diasEntre(cliente.etapa_desde, hoje);
            if (diasEtapa >= 30) {
              const baseUrl = process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : "http://localhost:3000";
              const linkSim = "https://wa.me/5527999598230?text=" + encodeURIComponent("Olá! Sou " + cliente.nome + " e gostaria de solicitar o agendamento para a execução do meu projeto" + (nomeArtista ? " criado pelo(a) " + nomeArtista : "") + " na Casa dos Carvalho. Estou pronto(a) para dar o próximo passo!");
              const linkNao = baseUrl + "/api/lead?acao=adiar_sessao&token=" + cliente.id;
              const artistaTexto = nomeArtista ? `pelo(a) <strong>${nomeArtista}</strong>` : "pelo nosso artista";
              const htmlD30 = `<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px">
<p style="font-size:11px;letter-spacing:2px;color:#d4a84b;text-transform:uppercase;margin-bottom:4px">Casa dos Carvalho Tattoo</p>
<hr style="border:none;border-top:1px solid #d4a84b;margin-bottom:24px">
<p style="font-size:16px">Olá, <strong>${fn}</strong>!</p>
<p style="line-height:1.8;color:#444;margin:16px 0">Faz 30 dias desde a sua consulta aqui na Casa dos Carvalho — e o seu projeto continua guardado com o mesmo cuidado de sempre.</p>
<p style="line-height:1.8;color:#444;margin-bottom:24px">${artistaTexto} criou algo pensado exclusivamente para você, nos mínimos detalhes, para ser eternizado na sua pele. Estamos prontos quando você estiver.</p>
<p style="font-size:15px;color:#222;font-weight:bold;text-align:center;margin-bottom:20px">Já chegou a sua hora de eternizarmos esse projeto?</p>
<div style="text-align:center;margin-bottom:28px">
  <a href="${linkSim}" style="display:inline-block;background:#d4a84b;color:#111;text-decoration:none;border-radius:8px;padding:14px 28px;font-size:14px;font-weight:bold;margin:6px">Sim, quero agendar!</a>
  <br>
  <a href="${linkNao}" style="display:inline-block;background:#f5f5f5;color:#555;text-decoration:none;border-radius:8px;padding:14px 28px;font-size:14px;margin:6px">Ainda não</a>
</div>
<p style="font-size:11px;color:#bbb;text-align:center">Ao clicar em "Ainda não", te avisamos novamente em 30 dias.</p>
<p style="font-size:12px;color:#bbb;margin-top:24px">Respeitoso abraço, ${studioName}</p>
</div>`;
              const ok = await dispararEmail({
                apiKey: cfg.resend_api_key,
                from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
                nome_remetente: studioName,
                to: cliente.email,
                subject: "Já chegou a sua hora, " + fn + "?",
                html: htmlD30,
              });
              if (ok) {
                let disparosAtuais = {};
                try { const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single(); disparosAtuais = cliAtual?.disparos_enviados || {}; } catch {}
                await marcarEnviado(cliente.id, "__aguard_1a_sessao_d30__", disparosAtuais);
                await registrarHistorico(userId, "E-mail recontato D+30 Aguardando 1ª Sessão enviado — " + cliente.nome);
                totalDisparos++;
              }
            }
          }
        }

        // ── E-MAIL DE CONFIRMAÇÃO IMEDIATA (sessão ou consulta agendada) ────────
        if ((cliente.etapa === "sessao_agend" || cliente.etapa === "cons_agendada") && cliente.etapa_desde && cfg.resend_api_key && cliente.email) {
          const ehConsultaImediata = cliente.etapa === "cons_agendada";
          const flagAtivoImediata = ehConsultaImediata ? (cfg.fluxo_confirma_consulta_ativa !== false) : (cfg.fluxo_confirma_sessao_ativa !== false);
          if (flagAtivoImediata) {
            try {
              const dedupKeyConfirma = (ehConsultaImediata ? "__confirma_consulta__" : "__confirma_sessao__") + cliente.etapa_desde;
              const jaEnviouConfirma = disparosEnviados && disparosEnviados[dedupKeyConfirma];
              if (!jaEnviouConfirma) {
                const hojeStrConfirma = hoje.toISOString().split("T")[0];
                const { data: evProximo } = await sb
                  .from("agenda")
                  .select("id, data, hora, status")
                  .eq("cliente_id", cliente.id)
                  .neq("status", "concluido")
                  .gte("data", hojeStrConfirma)
                  .order("data", { ascending: true })
                  .limit(1)
                  .single();

                if (evProximo) {
                  let profissionalNome = "";
                  if (cliente.artista) {
                    try {
                      const { data: art } = await sb.from("artistas").select("nome").eq("id", cliente.artista).single();
                      profissionalNome = art?.nome || "";
                    } catch {}
                  }
                  const dataFormatadaConfirma = new Date(evProximo.data + "T12:00:00")
                    .toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                  const enderecoStudio = "Rua Aristides Navarro 165, Centro de Vitória - ES";
                  const tipoLabel = ehConsultaImediata ? "consulta" : "sessão";

                  const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
                    "<p>Olá, <strong>" + (cliente.nome || "") + "</strong>!</p>" +
                    "<p>Sua " + tipoLabel + " na " + studioName + " está marcada e a gente já está animado com o que vem por aí.</p>" +
                    "<p>📅 " + dataFormatadaConfirma + (evProximo.hora ? " · 🕐 " + evProximo.hora : "") + (profissionalNome ? " · ✦ " + profissionalNome : "") + " · 📍 " + enderecoStudio + "</p>" +
                    (ehConsultaImediata
                      ? "<p>Na consulta vamos: entender sua ideia, definir estilo/tamanho/posicionamento, tirar dúvidas e apresentar orçamento personalizado.</p>"
                      : "<p>Antes da sua sessão: alimente-se bem, evite álcool 24h antes, durma bem, hidrate a pele da região.</p>") +
                    "</div>";

                  const okConfirma = await dispararEmail({
                    apiKey: cfg.resend_api_key,
                    from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
                    nome_remetente: cfg.nome_remetente || studioName,
                    to: cliente.email,
                    subject: "Sua " + tipoLabel + " está confirmada, " + (cliente.nome || "") + " ✦",
                    html
                  });

                  if (okConfirma) {
                    let disparosAtuais = {};
                    try {
                      const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                      disparosAtuais = cliAtual?.disparos_enviados || {};
                    } catch {}
                    await marcarEnviado(cliente.id, dedupKeyConfirma, disparosAtuais);
                    await registrarHistorico(userId, (ehConsultaImediata ? "E-mail de confirmação de consulta enviado" : "E-mail de confirmação de sessão enviado") + " — " + cliente.nome);
                    totalDisparos++;
                  }
                }
              }
            } catch {}
          }
        }

        // ── SMS D-0 (dia da sessão ou consulta — cliente + artista) ────────────
        if (cfg.zenvia_api_key && cfg.zenvia_numero && (cliente.etapa === "sessao_agend" || cliente.etapa === "cons_agendada")) {
          const ehConsulta = cliente.etapa === "cons_agendada";
          const smsAtivo = ehConsulta ? (cfg.fluxo_sms_consulta_ativa !== false) : (cfg.fluxo_sms_sessao_ativa !== false);
          if (!smsAtivo) { /* fluxo pausado */ } else
          try {
            const hojeUtc = new Date();
            const hojeBRT = new Date(hojeUtc.getTime() - 3 * 60 * 60 * 1000);
            const hojeStr = hojeBRT.toISOString().split("T")[0];

            const { data: evHoje } = await sb
              .from("agenda")
              .select("id, data, hora")
              .eq("cliente_id", cliente.id)
              .neq("status", "concluido")
              .eq("data", hojeStr)
              .limit(1)
              .single();

            if (evHoje) {
              const dedupKey = "__sms_d0__" + evHoje.id;
              const jaEnviouD0 = disparosEnviados && disparosEnviados[dedupKey];

              if (!jaEnviouD0) {
                const horaEv = evHoje.hora || "";
                const enderecoStudio = "Rua Aristides Navarro 165, Centro de Vitoria - ES";
                const solicitacao = cliente.descricao || "";
                let enviouD0 = false;

                // SMS para o cliente
                if (cliente.tel) {
                  const telCliente = formatarTelBR(cliente.tel);
                  const msgCliente = ehConsulta
                    ? `Ola, ${cliente.nome}! Hoje e o dia da sua consulta na Casa dos Carvalho. Estamos ansiosos para ouvir a sua ideia e apresentar o projeto da sua nova arte que sera eternizada na sua pele. Te esperamos as ${horaEv} em: ${enderecoStudio}. Ate logo! - ${studioName}`
                    : `Ola, ${cliente.nome}! Hoje e o dia da sua sessao de tatuagem na Casa dos Carvalho. A arte esta pronta e o artista esta animado para tatuar voce! Te esperamos as ${horaEv} em: ${enderecoStudio}. Pontualidade e muito importante para nos. Ate logo! - ${studioName}`;
                  const okCliente = await dispararZenvia({ apiKey: cfg.zenvia_api_key, from: cfg.zenvia_numero, to: telCliente, text: msgCliente, canal: "sms" });
                  if (okCliente) enviouD0 = true;
                }

                // SMS para o artista (busca tel na tabela de artistas do studio)
                if (cliente.artista) {
                  try {
                    const { data: art } = await sb.from("artistas").select("nome, tel").eq("id", cliente.artista).single();
                    if (art?.tel) {
                      const telArtista = formatarTelBR(art.tel);
                      const msgArtista = ehConsulta
                        ? `INK SYSTEM: Voce tem uma consulta hoje com ${cliente.nome} as ${horaEv}.${solicitacao ? " Projeto solicitado: " + solicitacao + "." : ""} Confira sua agenda e prepare-se.`
                        : `INK SYSTEM: Voce tem uma sessao de tatuagem hoje com ${cliente.nome} as ${horaEv}.${solicitacao ? " Projeto solicitado: " + solicitacao + "." : ""} Prepare tudo para a arte de hoje.`;
                      await dispararZenvia({ apiKey: cfg.zenvia_api_key, from: cfg.zenvia_numero, to: telArtista, text: msgArtista, canal: "sms" });
                    }
                  } catch {}
                }

                if (enviouD0) {
                  let disparosAtuais = {};
                  try {
                    const { data: cliAtual } = await sb.from("clientes").select("disparos_enviados").eq("id", cliente.id).single();
                    disparosAtuais = cliAtual?.disparos_enviados || {};
                  } catch {}
                  await marcarEnviado(cliente.id, dedupKey, disparosAtuais);
                  await registrarHistorico(userId, (ehConsulta ? "SMS D-0 de consulta enviado" : "SMS D-0 de sessao enviado") + " — " + cliente.nome);
                  totalDisparos++;
                }
              }
            }
          } catch {}
        }

        // ── LEMBRETE D-1 (sessão ou consulta) ───────────────────────────────
        if (cfg.fluxo_confirmacao_presenca_ativa !== false && (cliente.etapa === "sessao_agend" || cliente.etapa === "cons_agendada")) {
          const ehConsulta = cliente.etapa === "cons_agendada";
          try {
            // Calcular amanhã em horário de Brasília (UTC-3)
            const hojeUtc = new Date();
            const hojeBRT = new Date(hojeUtc.getTime() - 3 * 60 * 60 * 1000);
            const amanhaStr = new Date(hojeBRT.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

            // Buscar evento da agenda para amanhã
            const { data: evAmanha } = await sb
              .from("agenda")
              .select("id, data, hora")
              .eq("cliente_id", cliente.id)
              .neq("status", "concluido")
              .eq("data", amanhaStr)
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
                const expDate = new Date(evAmanha.data + "T23:59:00");
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

                const dataEvFormatada = new Date(evAmanha.data + "T12:00:00")
                  .toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                const horaEv = evAmanha.hora ? " às " + evAmanha.hora : "";
                const tipoAppt = ehConsulta ? "consulta" : "sessão";
                const msgPadrao = ehConsulta
                  ? `Olá {nome}! Sua consulta está marcada para amanhã, ${dataEvFormatada}${horaEv}.\n\nEstamos ansiosos para conhecer a sua ideia e dar vida ao seu projeto — mal podemos esperar!\n\nPor favor, confirme sua presença para garantirmos tudo preparado para você:\n{link}\n\nLembrete carinhoso: faltas sem aviso prévio podem resultar em restrições futuras de agendamento. Sua pontualidade é muito importante para nós.\n\nAté amanhã! ✦\n{estudio}`
                  : `Olá {nome}! Sua sessão está marcada para amanhã, ${dataEvFormatada}${horaEv}.\n\nA arte está pronta, o artista está animado — mal podemos esperar para tatuar você!\n\nConfirme sua presença aqui:\n{link}\n\nLembrete carinhoso: faltas sem aviso prévio são registradas no sistema e podem resultar em restrições futuras. Pontualidade e respeito fazem parte do nosso ritual.\n\nNos vemos amanhã! ✦\n{estudio}`;

                // Verificar se existe mensagem personalizada em fluxo_etapas do slug da etapa
                const slugEtapaD1 = ehConsulta ? "cons_agendada" : "sessao_agend";
                const fluxoSessao = (fluxoEtapas[slugEtapaD1] || []);
                const feConfirm = fluxoSessao.find(fe => fe.dias <= 0 || fe.label?.toLowerCase().includes("confirm") || fe.label?.toLowerCase().includes("d-1") || fe.label?.toLowerCase().includes("lembrete"));
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
                      subject: (ehConsulta ? "Sua consulta é amanhã" : "Sua sessão é amanhã") + " — " + studioName,
                      html,
                    });
                    if (ok) enviou = true;
                  } else if ((canal === "sms" || canal === "whatsapp") && cfg.zenvia_api_key && cfg.zenvia_numero && cliente.tel) {
                    const tel = formatarTelBR(cliente.tel);
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
                  await registrarHistorico(userId, (ehConsulta ? "Lembrete D-1 de consulta enviado" : "Confirmação de presença D-1 enviada") + " — " + cliente.nome);
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
                const feId = "fluxo__" + fe.id + "__" + cliente.etapa_desde;
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
                    const tel = formatarTelBR(cliente.tel);
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

        // ── CAMPANHAS SAZONAIS (Mães/Pais/Namorados/Aniversário/Natal/Ano Novo) ──
        if (cliente.etapa !== "blacklist") {
          for (const slug of Object.keys(campSazEtapas)) {
            for (const fe of campSazEtapas[slug]) {
              try {
                for (const ano of [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]) {
                  const anchor = anchorDateForCampanha(slug, ano, cliente.nascimento);
                  if (!anchor) continue;
                  const alvo = new Date(anchor);
                  alvo.setDate(alvo.getDate() + (fe.dias_offset || 0));
                  if (!mesmoDia(alvo, hoje)) continue;

                  const feId = "sazonal__" + fe.id + "_" + ano;
                  if (disparosEnviados && disparosEnviados[feId]) break;

                  const canalAtual = fe.canal || "email";
                  const canalOk = canaisHabilitados ? (canaisHabilitados[canalAtual] !== false) : (canalAtual === "email");
                  if (!canalOk) break;

                  const msg = substituirVars(fe.mensagem, cliente, studioName);
                  let ok = false;

                  if (canalAtual === "email") {
                    if (!cfg.resend_api_key || !cliente.email) break;
                    const html = "<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.8;color:#222;max-width:600px'>" +
                      msg.replace(/\n/g, "<br>") + "</div>";
                    ok = await dispararEmail({
                      apiKey: cfg.resend_api_key,
                      from: cfg.email_remetente || "noreply@acasadoscarvalhotattoo.com.br",
                      nome_remetente: cfg.nome_remetente || studioName,
                      to: cliente.email,
                      subject: (fe.label || slug) + " — " + studioName,
                      html
                    });
                  } else if (canalAtual === "sms" || canalAtual === "whatsapp") {
                    if (!cfg.zenvia_api_key || !cfg.zenvia_numero || !cliente.tel) break;
                    const tel = formatarTelBR(cliente.tel);
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
                    await registrarHistorico(userId, "Campanha sazonal [" + slug + "] — " + (fe.label || feId) + " — " + cliente.nome + " (" + canalAtual + ")");
                    totalDisparos++;
                  }
                  break; // ano-âncora certo já processado, não precisa checar os outros
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
