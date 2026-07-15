const ALLOWED_ORIGINS = [
  "https://inq-saas.vercel.app",
  "https://acasadoscarvalhotattoo.com.br",
  "https://www.acasadoscarvalhotattoo.com.br",
  "https://inksystem.com.br",
  "https://www.inksystem.com.br",
];

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey, from, to, text, canal } = req.body;

  // Segurança: usa a chave do cliente apenas se enviada (ex: botão de teste
  // com a chave recém-digitada). Nos envios normais o cliente NÃO manda a
  // chave — o servidor usa a variável de ambiente e a chave nunca é exposta
  // no navegador.
  const finalKey = apiKey || process.env.ZENVIA_API_KEY;

  if (!finalKey || !from || !to || !text) {
    return res.status(400).json({ error: "Campos obrigatórios: from, to, text (e chave no servidor)" });
  }

  const endpoint = canal === "whatsapp"
    ? "https://api.zenvia.com/v2/channels/whatsapp/messages"
    : "https://api.zenvia.com/v2/channels/sms/messages";

  // Normaliza telefone para padrão BR com DDI 55 (Zenvia recusa número
  // nacional sem código de país como "SMS internacional").
  const digitos = String(to).replace(/[^0-9]/g, "");
  const toFinal = (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13))
    ? digitos
    : ((digitos.length === 10 || digitos.length === 11) ? "55" + digitos : digitos);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "X-API-TOKEN": finalKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: from,
        to: toFinal,
        contents: [{ type: "text", text: text }]
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detail: err.message });
  }
}
