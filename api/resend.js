import { ALLOWED_ORIGINS } from "./_lib/allowedOrigins.js";
import { autenticarChamador } from "./_lib/auth.js";
import { verificarRateLimit } from "./_lib/rateLimit.js";
import { createClient } from "@supabase/supabase-js";
import { origemPermitida, usuarioTemAcessoCrm } from "./_lib/acessoCrm.js";

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Internal-Service-Key");

  const auth = await autenticarChamador(req);
  const chamadaInterna = auth.ok && auth.tipo === "service";
  if (!chamadaInterna && !origemPermitida(req)) return res.status(403).json({ error: "Acesso não permitido" });
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Bloco 1 -- hardening: exige sessão Supabase válida ou segredo de serviço.
  // user_id isolado no corpo nunca é aceito como prova de identidade.
  if (!auth.ok) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  const { permitido } = await verificarRateLimit("resend", auth.identificador);
  if (!permitido) {
    return res.status(429).json({ error: "Limite de envios excedido. Tente novamente em instantes." });
  }

  if (auth.tipo === "user") {
    const serviceKey = (process.env.SUPABASE_SERVICE_KEY || "").trim();
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) return res.status(500).json({ error: "Serviço de e-mail indisponível." });
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    if (!(await usuarioTemAcessoCrm(sb, auth))) return res.status(403).json({ error: "Acesso não permitido" });
  }

  const { to, subject, html, senderName } = req.body;

  // O e-mail é provisionado pelo Ink System: chave e remetente vivem somente
  // no servidor e nunca são aceitos do navegador.
  const finalKey = process.env.RESEND_API_KEY;
  const envRemetente = process.env.EMAIL_REMETENTE || "";
  const nomesCorporativos = new Set([
    "Ink System | Acesso e Segurança",
    "Ink System | Relacionamento",
    "Ink System | Assinaturas",
    "Ink System | Suporte",
  ]);
  const emailRemetente = (envRemetente.match(/<([^>]+)>/)?.[1] || envRemetente).trim();
  // Somente projetos internos autenticados podem escolher um dos nomes da
  // identidade corporativa. Usuários do CRM nunca controlam o remetente.
  const nomeCorporativo = chamadaInterna && nomesCorporativos.has(senderName) ? senderName : "";
  const finalFrom = nomeCorporativo && emailRemetente
    ? `${nomeCorporativo} <${emailRemetente}>`
    : envRemetente;

  if (!finalKey) {
    return res.status(500).json({ error: "Serviço de e-mail indisponível." });
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
