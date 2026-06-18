import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprenN5a21uaHJrd212Z2Vrc2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk2MzE1NSwiZXhwIjoyMDk2NTM5MTU1fQ.H6ODQO_0jeuNWB0ep_GHaOatN5QpFLfRLOnZAzK2p84",
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
