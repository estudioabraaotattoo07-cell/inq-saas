import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { nome, tel, email, idea, ideia, artista, insta, regiao, nascimento, referencias, orig, obs: obsExtra } = req.body;
  if (!nome) return res.status(400).json({ error: "nome obrigatório" });

  const ideaFinal = idea || ideia || "";

  // Normalizar nascimento para ISO (AAAA-MM-DD) se vier como DD/MM/AAAA
  let nascimentoISO = null;
  if (nascimento) {
    const parts = String(nascimento).replace(/[^\d]/g, "/").split("/");
    if (parts.length === 3 && parts[2].length === 4) {
      nascimentoISO = parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0");
    }
  }

  const row = {
    nome,
    tel: tel || "",
    email: email || "",
    insta: insta || "",
    qual: "Q1",
    etapa: "lead",
    orig: orig || "Site",
    descricao: ideaFinal,
    nascimento: nascimentoISO,
    artista: artista || null,
    estilo: "",
    regiao: regiao || "",
    tam: "Medio",
    intencao: "",
    cob: false,
    stars: 0,
    obs: obsExtra ? `Lead captado via Aura Chat no site. ${obsExtra}` : "Lead captado via Aura Chat no site.",
    val_a: 0,
    val_c: 0,
    pgto: "",
    orcamento: false,
    contrato: false,
    faltas: 0,
    indicacoes: 0,
    credito: 0,
    cri: "",
    dias: 0,
    referencias: Array.isArray(referencias) && referencias.length ? referencias : [],
  };

  row.user_id = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

  // Upsert: se o telefone já existe, atualiza em vez de inserir
  let clienteId = null;
  let isNewClient = true;
  if (tel) {
    const telDigits = tel.replace(/\D/g, "").slice(-8);
    const { data: existentes } = await sb.from("clientes").select("id,tel").eq("user_id", row.user_id);
    const match = (existentes || []).find(c => (c.tel || "").replace(/\D/g, "").slice(-8) === telDigits);
    if (match) {
      const updateRow = { ...row };
      delete updateRow.user_id; delete updateRow.etapa; delete updateRow.orig;
      // Só atualiza campos que vieram preenchidos
      const updateFields = {};
      if (nome) updateFields.nome = updateRow.nome;
      if (email) updateFields.email = updateRow.email;
      if (insta) updateFields.insta = updateRow.insta;
      if (ideaFinal) updateFields.descricao = ideaFinal;
      if (nascimentoISO) updateFields.nascimento = nascimentoISO;
      if (artista) updateFields.artista = updateRow.artista;
      if (regiao) updateFields.regiao = updateRow.regiao;
      if (obsExtra) updateFields.obs = updateRow.obs;
      if (Object.keys(updateFields).length > 0) {
        await sb.from("clientes").update(updateFields).eq("id", match.id);
      }
      clienteId = match.id;
      isNewClient = false;
    }
  }

  if (!clienteId) {
    const { data: inserted, error } = await sb.from("clientes").insert(row).select("id").single();
    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }
    clienteId = inserted?.id || null;
  }

  // Dispara SMS e e-mail apenas no primeiro cadastro (não em updates progressivos)
  if (!isNewClient) return res.status(200).json({ ok: true, clienteId, updated: true });

  const zenviaKey = process.env.ZENVIA_API_KEY;
  const fn = nome.trim().split(" ")[0];

  if (zenviaKey && tel && tel.replace(/\D/g, "").length >= 10) {
    const telLimpo = "55" + tel.replace(/\D/g, "").replace(/^55/, "");

    const smsFns = [
      // SMS para o cliente
      fetch("https://api.zenvia.com/v2/channels/sms/messages", {
        method: "POST",
        headers: { "X-API-TOKEN": zenviaKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "estudio.abraao.tattoo",
          to: telLimpo,
          contents: [{ type: "text", text: `Oi ${fn}! 🖤 Sou a Aura da Casa dos Carvalho. Recebemos sua ideia de tatuagem e em breve nossa equipe entra em contato. Fique de olho no seu e-mail!` }]
        })
      }).catch(e => console.warn("SMS cliente error:", e)),

      // SMS para o profissional responsável (ou estúdio se indefinido)
      fetch("https://api.zenvia.com/v2/channels/sms/messages", {
        method: "POST",
        headers: { "X-API-TOKEN": zenviaKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "estudio.abraao.tattoo",
          to: artista && artista.toLowerCase().includes("camilla") ? "5527996941787" : "5527996929665",
          contents: [{ type: "text", text: `✦ Novo lead: ${nome} | ${tel} | ${email || "—"} | Artista: ${artista || "A definir"}` }]
        })
      }).catch(e => console.warn("SMS estudio error:", e)),
    ];

    await Promise.all(smsFns);
  }

  // E-mail de boas-vindas ao cliente (apenas se tiver e-mail e chave Resend configurada)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && email) {
    const emailFrom = process.env.EMAIL_REMETENTE || "contato@acasadoscarvalhotattoo.com.br";
    const htmlBoasVindas = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222'>" +
      "<p>Olá, <strong>" + fn + "</strong>!</p>" +
      "<p>Recebemos suas informações com sucesso. Em breve, nossa equipe entrará em contato com você diretamente pelo WhatsApp para darmos continuidade ao seu atendimento.</p>" +
      "<p>Fique à vontade para explorar nossas redes sociais e conhecer mais sobre o nosso trabalho enquanto isso.</p>" +
      "<p style='margin-top:24px;font-size:12px;color:#999'>Casa dos Carvalho Tattoo</p>" +
      "</div>";
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: "Recebemos seu contato — Casa dos Carvalho Tattoo",
        html: htmlBoasVindas
      })
    }).catch(e => console.warn("Email boas-vindas error:", e));
  }

  return res.status(200).json({ ok: true, clienteId });
}
