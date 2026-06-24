import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const hoje = new Date().toISOString().split("T")[0];
  const studioUserId = process.env.STUDIO_USER_ID || "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

  try {
    const { data, error } = await sb.from("campanhas")
      .select("id, nome, palavra_chave, data_inicio, data_fim")
      .eq("user_id", studioUserId)
      .lte("data_inicio", hoje)
      .gte("data_fim", hoje);

    if (error) { console.error("campanhas-ativas error:", error); return res.status(200).json({ campanhas: [] }); }
    return res.status(200).json({ campanhas: data || [] });
  } catch (err) {
    console.error("campanhas-ativas exception:", err.message);
    return res.status(200).json({ campanhas: [] });
  }
}
