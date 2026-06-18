import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprenN5a21uaHJrd212Z2Vrc2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk2MzE1NSwiZXhwIjoyMDk2NTM5MTU1fQ.H6ODQO_0jeuNWB0ep_GHaOatN5QpFLfRLOnZAzK2p84",
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const hoje = new Date().toISOString().split("T")[0];
  const studioUserId = process.env.STUDIO_USER_ID;

  try {
    let query = sb.from("campanhas")
      .select("id, nome, palavra_chave, data_inicio, data_fim")
      .lte("data_inicio", hoje)
      .gte("data_fim", hoje);

    if (studioUserId) query = query.eq("user_id", studioUserId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ campanhas: data || [] });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detail: err.message });
  }
}
