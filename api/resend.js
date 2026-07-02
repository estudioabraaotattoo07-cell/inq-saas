const ALLOWED_ORIGINS = [
  "https://inq-saas.vercel.app",
  "https://acasadoscarvalhotattoo.com.br",
  "https://www.acasadoscarvalhotattoo.com.br",
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

  const { apiKey, from, to, subject, html } = req.body;

  // Resiliência: se o cliente não enviar chave/remetente válidos (ex: sessão
  // com config incompleta), usa as credenciais do servidor. A chave real do
  // estúdio fica em variável de ambiente e nunca é exposta ao navegador.
  const finalKey = apiKey || process.env.RESEND_API_KEY;
  const envRemetente = process.env.EMAIL_REMETENTE || "contato@acasadoscarvalhotattoo.com.br";
  const fromValido = from && from.includes("@") && !from.includes("<>");
  const finalFrom = fromValido ? from : ("A Casa dos Carvalho <" + envRemetente + ">");

  if (!finalKey) {
    return res.status(400).json({ error: "Nenhuma chave Resend disponível (nem no cliente nem no servidor)" });
  }
  if (!to) {
    return res.status(400).json({ error: "Destinatário obrigatório" });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + finalKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: finalFrom, to, subject, html })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detail: err.message });
  }
}
