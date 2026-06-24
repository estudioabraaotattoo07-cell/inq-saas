import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { clienteId, campanhaId } = req.body;
  if (!clienteId || !campanhaId) {
    return res.status(400).json({ error: "clienteId e campanhaId obrigatórios" });
  }

  try {
    const { error } = await sb.from("clientes").update({ campanha_id: campanhaId }).eq("id", clienteId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detail: err.message });
  }
}
