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
    orcamento ? "Orçamento estimado: " + orcamento : "",
    cliente_insta ? "Instagram: @" + cliente_insta.replace("@", "") : ""
  ].filter(Boolean).join(" | ");

  let finalClienteId = cliente_id || null;
  if (!finalClienteId) {
    const descricaoCliente = [
      projeto ? "Projeto: " + projeto : "",
      regiao ? "Região: " + regiao : "",
      orcamento ? "Orçamento: " + orcamento : ""
    ].filter(Boolean).join(" | ");
    const { data: novoCliente } = await sb.from("clientes").insert({
      user_id: STUDIO_USER_ID,
      nome: cliente_nome,
      tel: (cliente_tel || "").replace(/\D/g, ""),
      email: cliente_email || "",
      insta: cliente_insta || "",
      artista: artista || null,
      descricao: descricaoCliente,
      regiao: regiao || "",
      etapa: "aura_agend",
      orig: "Site - Aura Chat",
      qual: "Q1",
      obs: "Agendamento via Aura Chat",
      estilo: "", tam: "Medio", intencao: "", cob: false, stars: 0,
      val_a: 0, val_c: 0, pgto: "", orcamento: false, contrato: false,
      faltas: 0, indicacoes: 0, credito: 0, cri: "", dias: 0, referencias: []
    }).select("id").single();
    if (novoCliente) finalClienteId = novoCliente.id;
  } else {
    await sb.from("clientes").update({ etapa: "aura_agend" }).eq("id", finalClienteId);
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
  const emailRem = process.env.EMAIL_REMETENTE || "contato@acasadoscarvalhotattoo.com.br";
  const emailPro = artista && artista.toLowerCase().includes("camilla")
    ? "camilla-acampos@hotmail.com"
    : "estudioabraaotattoo07@gmail.com";
  const tipoLabel = tipo === "sessao" ? "Sessão" : "Consulta";
  const dataFmt = data_solicitada ? data_solicitada.split("-").reverse().join("/") : "A confirmar";

  if (resendKey) {
    const htmlPro = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;background:#fafafa;padding:24px;border-radius:8px'>" +
      "<h2 style='color:#C9A84C;border-bottom:2px solid #C9A84C;padding-bottom:8px'>✦ " + tipoLabel + " solicitada via Aura</h2>" +
      "<table style='width:100%;border-collapse:collapse;font-size:14px;margin-top:12px'>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555;width:150px'>Tipo</td><td>" + tipoLabel + "</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Artista</td><td>" + artista + "</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Data solicitada</td><td>" + dataFmt + "</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Horário</td><td>" + (hora_solicitada || "A combinar") + "</td></tr>" +
      "<tr><td colspan='2' style='padding:14px 0 4px;color:#C9A84C;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:.06em'>Cliente</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Nome</td><td>" + cliente_nome + "</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>WhatsApp</td><td>" + (cliente_tel || "—") + "</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>E-mail</td><td>" + (cliente_email || "—") + "</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Instagram</td><td>" + (cliente_insta ? "@" + cliente_insta.replace("@", "") : "—") + "</td></tr>" +
      "<tr><td colspan='2' style='padding:14px 0 4px;color:#C9A84C;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:.06em'>Projeto</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Ideia</td><td>" + (projeto || "—") + "</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Região</td><td>" + (regiao || "—") + "</td></tr>" +
      "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Orçamento</td><td>" + (orcamento || "—") + "</td></tr>" +
      "</table>" +
      "<p style='margin-top:20px;font-size:12px;color:#aaa'>Solicitado via Aura Chat · Casa dos Carvalho · Confirme pelo WhatsApp do cliente.</p>" +
      "</div>";

    const emailEstudio = "estudioabraaotattoo07@gmail.com";
    const toList = emailPro === emailEstudio ? [emailPro] : [emailPro, emailEstudio];
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Casa dos Carvalho <" + emailRem + ">",
        to: toList,
        subject: "✦ " + tipoLabel + " solicitada — " + cliente_nome + " | " + dataFmt,
        html: htmlPro
      })
    }).catch(e => console.warn("Email profissional error:", e));

    if (cliente_email) {
      const fn = cliente_nome.trim().split(" ")[0];
      const htmlCli = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222'>" +
        "<p>Olá, <strong>" + fn + "</strong>!</p>" +
        "<p>Sua solicitação de <strong>" + tipoLabel.toLowerCase() + "</strong> com <strong>" + artista + "</strong> foi recebida. 🖤</p>" +
        "<p><strong>Data solicitada:</strong> " + dataFmt + (hora_solicitada ? " às " + hora_solicitada : "") + "</p>" +
        "<p>Nossa equipe vai entrar em contato pelo seu WhatsApp em breve para confirmar o horário exato.</p>" +
        "<p style='margin-top:24px;font-size:12px;color:#999'>Casa dos Carvalho Tattoo · Vitória-ES</p>" +
        "</div>";
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Casa dos Carvalho <" + emailRem + ">",
          to: [cliente_email],
          subject: "Sua " + tipoLabel.toLowerCase() + " foi solicitada — Casa dos Carvalho Tattoo",
          html: htmlCli
        })
      }).catch(e => console.warn("Email cliente error:", e));
    }
  }

  const zenviaKey = process.env.ZENVIA_API_KEY;
  if (zenviaKey) {
    const smsTo = artista && artista.toLowerCase().includes("camilla") ? "5527996941787" : "5527996929665";
    const smsText = "✦ " + tipoLabel + " | " + cliente_nome + " | " + dataFmt + (hora_solicitada ? " " + hora_solicitada : "") + " | " + ((cliente_tel || "").replace(/\D/g, "").slice(-11) || "—");
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
