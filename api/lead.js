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

  // Identificação de cliente existente: telefone + nome (tolerante) + email
  function normalizarNome(str) {
    return (str || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  }

  let clienteId = null;
  let isNewClient = true;
  if (tel) {
    const telDigits = tel.replace(/[^0-9]/g, "").slice(-11);
    const { data: existentes } = await sb.from("clientes").select("id,tel,nome,email").eq("user_id", row.user_id);
    const matchTel = (existentes || []).find(c => (c.tel || "").replace(/[^0-9]/g, "").slice(-11) === telDigits);
    if (matchTel) {
      const nomeNovo = normalizarNome(nome);
      const nomeExistente = normalizarNome(matchTel.nome);
      const emailNovo = (email || "").toLowerCase().trim();
      const emailExistente = (matchTel.email || "").toLowerCase().trim();
      const nomesBatem = nomeNovo && nomeExistente && nomeNovo === nomeExistente;
      const emailsBatem = !emailNovo || !emailExistente || emailNovo === emailExistente;
      if (nomesBatem && emailsBatem) {
        // Mesmo cliente confirmado — atualiza só campos preenchidos e limpa lixeira se necessário
        const updateFields = { excluido_em: null };
        if (nome) updateFields.nome = nome;
        if (email) updateFields.email = email;
        if (insta) updateFields.insta = insta;
        if (ideaFinal) updateFields.descricao = ideaFinal;
        if (nascimentoISO) updateFields.nascimento = nascimentoISO;
        if (artista) updateFields.artista = artista;
        if (regiao) updateFields.regiao = regiao;
        if (obsExtra) updateFields.obs = `Lead captado via Aura Chat no site. ${obsExtra}`;
        await sb.from("clientes").update(updateFields).eq("id", matchTel.id);
        clienteId = matchTel.id;
        isNewClient = false;
      }
      // Se nome ou email divergem: ignora o registro existente e cria novo
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
    const artistaNome = artista && artista.toLowerCase().includes("camilla") ? "a Camilla" : artista ? "o Abraão" : null;
    const waNumero = artista && artista.toLowerCase().includes("camilla") ? "5527996941787" : "5527996929665";
    const waLink = "https://wa.me/" + waNumero;
    const ni = "Não informado";
    const nascFormatado = nascimentoISO
      ? nascimentoISO.split("-").reverse().join("/")
      : ni;
    const resumoDados =
      "<table style='width:100%;border-collapse:collapse;font-size:13px;margin:16px 0'>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555;width:140px'>Nome</td><td style='padding:8px 12px;color:#222'>" + nome + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Telefone</td><td style='padding:8px 12px;color:#222'>" + (tel || ni) + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>E-mail</td><td style='padding:8px 12px;color:#222'>" + (email || ni) + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Artista</td><td style='padding:8px 12px;color:#222'>" + (artista || ni) + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Ideia / projeto</td><td style='padding:8px 12px;color:#222'>" + (ideaFinal || ni) + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Região do corpo</td><td style='padding:8px 12px;color:#222'>" + (regiao || ni) + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Instagram</td><td style='padding:8px 12px;color:#222'>" + (insta || ni) + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Data de nascimento</td><td style='padding:8px 12px;color:#222'>" + nascFormatado + "</td></tr>" +
      (obsExtra ? "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Observações</td><td style='padding:8px 12px;color:#222'>" + obsExtra + "</td></tr>" : "") +
      "</table>";
    const htmlBoasVindas =
      "<div style='font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px'>" +
      "<p style='font-size:22px;font-weight:bold;color:#1a1a1a;margin-bottom:4px'>Casa dos Carvalho Tattoo</p>" +
      "<hr style='border:none;border-top:1px solid #d4a84b;margin-bottom:24px'>" +
      "<p style='font-size:16px'>Olá, <strong>" + fn + "</strong>!</p>" +
      "<p style='line-height:1.8;color:#333'>Que alegria receber sua ideia aqui na Casa dos Carvalho. Já registramos tudo com cuidado" +
      (artistaNome ? " — e vimos que você tem interesse em tatuar com <strong>" + artistaNome + "</strong>!" : "!") + "</p>" +
      "<p style='line-height:1.8;color:#333'>Em até 24h, alguém da nossa equipe vai te ligar pessoalmente para conversar sobre os detalhes do seu projeto. Sem formulário, sem robô — conversa de gente pra gente.</p>" +
      "<p style='line-height:1.8;color:#333'>Se preferir adiantar por WhatsApp, é só chamar a gente aqui:</p>" +
      "<p><a href='" + waLink + "' style='display:inline-block;background:#d4a84b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold'>💬 Chamar no WhatsApp</a></p>" +
      "<p style='line-height:1.8;color:#333;margin-top:20px'>Trabalhamos só com hora marcada, então cada projeto recebe atenção total — do primeiro traço ao último detalhe.</p>" +
      "<p style='margin-top:8px;line-height:1.8;color:#333'><strong>Resumo do que registramos:</strong></p>" +
      resumoDados +
      "<p style='line-height:1.8;color:#333;margin-top:16px'>Obrigado por escolher fazer parte da família Carvalho. Já estamos ansiosos para te conhecer. 🖤</p>" +
      "<p style='margin-top:32px;font-size:12px;color:#999'>Com carinho,<br><strong>Casa dos Carvalho Tattoo</strong> — Vitória, ES</p>" +
      "</div>";
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: "Recebemos sua mensagem, " + fn + "! 🖤",
        html: htmlBoasVindas
      })
    }).catch(e => console.warn("Email boas-vindas error:", e));
  }

  return res.status(200).json({ ok: true, clienteId });
}
