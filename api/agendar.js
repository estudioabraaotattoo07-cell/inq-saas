import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const STUDIO_USER_ID = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    cliente_id, cliente_nome, cliente_email, cliente_tel, cliente_insta,
    artista, tipo, data_solicitada, hora_solicitada, projeto, regiao, orcamento
  } = req.body;

  if (!cliente_nome || !artista || !data_solicitada || !tipo) {
    return res.status(400).json({ error: "Dados obrigatórios: cliente_nome, artista, tipo, data_solicitada" });
  }

  const descricao = [
    projeto ? "Projeto: " + projeto : "",
    regiao ? "Região: " + regiao : "",
    orcamento ? "Orçamento: " + orcamento : "",
    cliente_insta ? "Instagram: @" + cliente_insta.replace("@", "") : ""
  ].filter(Boolean).join(" | ");

  // Buscar dados do artista e configurações do estúdio
  const [artistaRow, cfgRow] = await Promise.all([
    artista
      ? sb.from("artistas").select("nome,email,tel").ilike("nome", "%" + artista.split(" ")[0] + "%").eq("user_id", STUDIO_USER_ID).limit(1).single().then(r => r.data)
      : Promise.resolve(null),
    sb.from("configuracoes").select("studio_email,studio_name,studio_city,studio_estado,studio_tel,fluxo_notificacao_artista_ativa").eq("user_id", STUDIO_USER_ID).limit(1).single().then(r => r.data)
  ]);

  const emailArtista = artistaRow?.email || null;
  const telArtista = artistaRow?.tel ? "55" + (artistaRow.tel).replace(/\D/g, "").replace(/^55/, "") : null;
  const emailEstudio = cfgRow?.studio_email || null;
  const nomeEstudio = cfgRow?.studio_name || "seu estúdio";
  const cidadeEstudio = [cfgRow?.studio_city, cfgRow?.studio_estado].filter(Boolean).join("-");

  let finalClienteId = cliente_id || null;
  if (!finalClienteId) {
    const { data: novoCliente } = await sb.from("clientes").insert({
      user_id: STUDIO_USER_ID,
      nome: cliente_nome,
      tel: (cliente_tel || "").replace(/\D/g, ""),
      email: cliente_email || "",
      insta: cliente_insta || "",
      artista: artista || null,
      descricao,
      regiao: regiao || "",
      etapa: "aura_agend",
      etapa_desde: new Date().toISOString(),
      orig: "Site - Aura Chat",
      qual: "Q1",
      obs: "Agendamento via Aura Chat",
      estilo: "", tam: "Medio", intencao: "", cob: false, stars: 0,
      val_a: 0, val_c: 0, pgto: "", orcamento: false, contrato: false,
      faltas: 0, indicacoes: 0, credito: 0, cri: "", dias: 0, referencias: []
    }).select("id").single();
    if (novoCliente) finalClienteId = novoCliente.id;
  } else {
    await sb.from("clientes").update({ etapa: "aura_agend", descricao: descricao || undefined }).eq("id", finalClienteId);
  }

  const { error: pendErr } = await sb.from("agendamentos_pendentes").insert({
    user_id: STUDIO_USER_ID,
    status: "pendente",
    cliente_id: finalClienteId,
    cliente_nome,
    cliente_email: cliente_email || "",
    cliente_tel: (cliente_tel || "").replace(/\D/g, ""),
    profissional_nome: artista,
    data_solicitada,
    hora_solicitada: hora_solicitada || "",
    tipo,
    descricao
  });

  if (pendErr) {
    console.error("agendamentos_pendentes insert error:", pendErr);
    return res.status(500).json({ error: pendErr.message });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const emailRem = process.env.EMAIL_REMETENTE || "";
  const tipoLabel = tipo === "sessao" ? "Sessão" : "Consulta";
  const dataFmt = data_solicitada ? data_solicitada.split("-").reverse().join("/") : "A confirmar";

  if (resendKey) {
    const row = (label, val) => "<tr><td style='padding:6px 8px;font-weight:bold;color:#555;width:160px;vertical-align:top'>" + label + "</td><td style='padding:6px 8px'>" + (val || "—") + "</td></tr>";
    const sec = (title) => "<tr><td colspan='2' style='padding:16px 8px 4px;color:#C9A84C;font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:.08em;border-top:1px solid #eee'>" + title + "</td></tr>";
    const htmlRico = "<div style='font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#222;background:#fafafa;padding:28px;border-radius:10px;border:1px solid #e8e8e8'>" +
      "<h2 style='margin:0 0 20px;color:#C9A84C;font-size:20px;border-bottom:2px solid #C9A84C;padding-bottom:10px'>✦ " + tipoLabel + " solicitada via Aura Chat</h2>" +
      "<table style='width:100%;border-collapse:collapse;font-size:14px'>" +
      sec("Agendamento") +
      row("Tipo", "<strong>" + tipoLabel + "</strong>") +
      row("Artista", artista) +
      row("Data solicitada", "<strong>" + dataFmt + "</strong>") +
      row("Horário", hora_solicitada || "A combinar") +
      sec("Cliente") +
      row("Nome", "<strong>" + cliente_nome + "</strong>") +
      row("WhatsApp", cliente_tel ? "<a href='https://wa.me/55" + (cliente_tel).replace(/\D/g,"").replace(/^55/,"") + "' style='color:#25D366'>" + cliente_tel + "</a>" : "—") +
      row("E-mail", cliente_email || "—") +
      row("Instagram", cliente_insta ? "<a href='https://instagram.com/" + cliente_insta.replace("@","") + "' style='color:#C9A84C'>@" + cliente_insta.replace("@","") + "</a>" : "—") +
      sec("Projeto") +
      row("Descrição / Ideia", projeto || "—") +
      row("Região do corpo", regiao || "—") +
      row("Orçamento informado", orcamento ? "<strong style='color:#2d8a4e;font-size:15px'>" + orcamento + "</strong>" : "—") +
      "</table>" +
      "<p style='margin:20px 0 0;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:12px'>Solicitado via Aura Chat · " + nomeEstudio + " · Confirme pelo WhatsApp do cliente.</p>" +
      "</div>";

    const destsPro = [];
    if (emailArtista) destsPro.push(emailArtista);
    if (emailEstudio && !destsPro.includes(emailEstudio)) destsPro.push(emailEstudio);

    if (cfgRow?.fluxo_notificacao_artista_ativa !== false && destsPro.length > 0) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: nomeEstudio + " <" + emailRem + ">",
          to: destsPro,
          subject: "✦ " + tipoLabel + " | " + cliente_nome + " | " + dataFmt + (orcamento ? " | " + orcamento : ""),
          html: htmlRico
        })
      }).catch(e => console.warn("Email profissional error:", e));
    }

    if (cliente_email) {
      const fn = cliente_nome.trim().split(" ")[0];
      const htmlCli = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222'>" +
        "<p>Olá, <strong>" + fn + "</strong>! 🖤</p>" +
        "<p>Sua solicitação de <strong>" + tipoLabel.toLowerCase() + "</strong> com <strong>" + artista + "</strong> foi recebida com sucesso.</p>" +
        "<p><strong>Data solicitada:</strong> " + dataFmt + (hora_solicitada ? " às " + hora_solicitada : "") + "</p>" +
        "<p>Nossa equipe vai entrar em contato pelo seu WhatsApp em breve para confirmar o horário.</p>" +
        "<p style='margin-top:24px;font-size:12px;color:#999'>" + nomeEstudio + (cidadeEstudio ? " · " + cidadeEstudio : "") + "</p>" +
        "</div>";
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: nomeEstudio + " <" + emailRem + ">",
          to: [cliente_email],
          subject: "Sua " + tipoLabel.toLowerCase() + " foi solicitada — " + nomeEstudio,
          html: htmlCli
        })
      }).catch(e => console.warn("Email cliente error:", e));
    }
  }

  const zenviaKey = process.env.ZENVIA_API_KEY;
  const smsTo = telArtista || (cfgRow?.studio_tel ? "55" + cfgRow.studio_tel.replace(/\D/g, "") : null);
  if (zenviaKey && smsTo) {
    const smsText = [
      "✦ " + tipoLabel,
      cliente_nome,
      dataFmt + (hora_solicitada ? " " + hora_solicitada : ""),
      "WA: " + ((cliente_tel || "").replace(/\D/g, "").slice(-11) || "—"),
      orcamento ? "R$: " + orcamento : "",
      projeto ? projeto.substring(0, 60) + (projeto.length > 60 ? "..." : "") : ""
    ].filter(Boolean).join(" | ");
    fetch("https://api.zenvia.com/v2/channels/sms/messages", {
      method: "POST",
      headers: { "X-API-TOKEN": zenviaKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "estudio.abraao.tattoo",
        to: smsTo,
        contents: [{ type: "text", text: smsText }]
      })
    }).catch(e => console.warn("SMS profissional error:", e));
  }

  return res.status(200).json({ ok: true, clienteId: finalClienteId });
}
