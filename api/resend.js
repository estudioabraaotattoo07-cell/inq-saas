import { ALLOWED_ORIGINS } from "./_lib/allowedOrigins.js";
import { autenticarChamador } from "./_lib/auth.js";
import { verificarRateLimit } from "./_lib/rateLimit.js";

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Internal-Service-Key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Bloco 1 -- hardening: exige sessão Supabase válida ou segredo de serviço.
  // user_id isolado no corpo nunca é aceito como prova de identidade.
  const auth = await autenticarChamador(req);
  if (!auth.ok) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  const { permitido } = await verificarRateLimit("resend", auth.identificador);
  if (!permitido) {
    return res.status(429).json({ error: "Limite de envios excedido. Tente novamente em instantes." });
  }

  const { apiKey, from, to, subject, html } = req.body;

  // Resiliência: se o cliente não enviar chave/remetente válidos (ex: sessão
  // com config incompleta), usa as credenciais do servidor. A chave real do
  // estúdio fica em variável de ambiente e nunca é exposta ao navegador.
  const finalKey = apiKey || process.env.RESEND_API_KEY;
  const envRemetente = process.env.EMAIL_REMETENTE || "";
  const fromValido = from && from.includes("@") && !from.includes("<>");
  const finalFrom = fromValido ? from : envRemetente;

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
