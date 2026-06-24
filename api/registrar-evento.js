import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL || "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const STUDIO_USER_ID = process.env.STUDIO_USER_ID || "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { tipo_evento, origem, cliente_id } = req.body || {};

  if (!tipo_evento) return res.status(400).json({ error: "tipo_evento obrigatorio" });

  try {
    const { error } = await sb.from("eventos_trafego").insert({
      user_id: STUDIO_USER_ID,
      tipo_evento,
      origem: origem || "",
      cliente_id: cliente_id || null,
      criado_em: new Date().toISOString()
    });

    if (error) {
      console.error("registrar-evento error:", error);
      return res.status(200).json({ ok: false });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("registrar-evento exception:", e.message);
    return res.status(200).json({ ok: false });
  }
}
