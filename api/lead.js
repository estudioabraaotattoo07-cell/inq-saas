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

  const { nome, tel, email, idea, artista, insta, regiao, nascimento, referencias, orig } = req.body;
  if (!nome) return res.status(400).json({ error: "nome obrigatório" });

  const row = {
    nome,
    tel: tel || "",
    email: email || "",
    insta: insta || "",
    qual: "Q1",
    etapa: "lead",
    orig: orig || "Site",
    descricao: [idea, nascimento ? `Nascimento: ${nascimento}` : ""].filter(Boolean).join(" | "),
    artista: artista || null,
    estilo: "",
    regiao: regiao || "",
    tam: "Medio",
    intencao: "",
    cob: false,
    stars: 0,
    obs: "Lead captado via Aura Chat no site.",
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

  const { data: inserted, error } = await sb.from("clientes").insert(row).select("id").single();

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: error.message });
  }

  const clienteId = inserted?.id || null;

  // Dispara SMS para o cliente e para o estúdio em paralelo
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

      // SMS para o estúdio
      fetch("https://api.zenvia.com/v2/channels/sms/messages", {
        method: "POST",
        headers: { "X-API-TOKEN": zenviaKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "estudio.abraao.tattoo",
          to: "5527996929665",
          contents: [{ type: "text", text: `✦ Novo lead: ${nome} | ${tel} | ${email} | Artista: ${artista || "A definir"}` }]
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
