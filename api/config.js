import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const STUDIO_USER_ID = process.env.STUDIO_USER_ID || "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { data } = await sb.from("configuracoes")
      .select("studio_tel, studio_name")
      .eq("user_id", STUDIO_USER_ID)
      .limit(1).single();
    return res.status(200).json({
      studio_tel: (data?.studio_tel || "").replace(/[^0-9]/g, ""),
      studio_name: data?.studio_name || ""
    });
  } catch (err) {
    return res.status(200).json({ studio_tel: "", studio_name: "" });
  }
}
