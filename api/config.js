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

  // Reset + reseed da conta demo — chamado a cada carregamento de ?demo=1,
  // pra quem está testando sempre ver dados fictícios do zero.
  if (req.query?.acao === "resetDemo") {
    const uid = process.env.DEMO_USER_ID;
    if (!uid) return res.status(500).json({ error: "DEMO_USER_ID não configurado" });
    for (const t of ["clientes", "agenda", "financeiro", "historico", "artistas"]) {
      await sb.from(t).delete().eq("user_id", uid);
    }
    // Garante licença sempre válida pra conta demo (checada no login).
    const { data: licExistente } = await sb.from("licencas").select("id").eq("user_id", uid).limit(1).maybeSingle();
    const licPayload = { user_id: uid, status: "ativo", data_vencimento: "2099-12-31", plano: "Ouro" };
    if (licExistente) await sb.from("licencas").update(licPayload).eq("id", licExistente.id);
    else await sb.from("licencas").insert(licPayload);
    // Garante configuracoes com onboarding_done=true (pula o assistente inicial).
    const { data: cfgExistente } = await sb.from("configuracoes").select("id").eq("user_id", uid).limit(1).maybeSingle();
    const cfgPayload = {
      user_id: uid, studio_name: "Seu Estúdio", studio_owner: "Seu Nome",
      studio_email: "demo@inksystem.com.br", studio_city: "Vitória", studio_estado: "ES",
      onboarding_done: true,
    };
    if (cfgExistente) await sb.from("configuracoes").update(cfgPayload).eq("id", cfgExistente.id);
    else await sb.from("configuracoes").insert(cfgPayload);
    const artistaId1 = crypto.randomUUID();
    const artistaId2 = crypto.randomUUID();
    await sb.from("artistas").insert([
      { id: artistaId1, user_id: uid, nome: "Artista Exemplo 1", email: "artista1@exemplo.com", tel: "(27) 98888-0001", cor: "#4A9EBF", ativo: true, role: "residente", com: 50, insta: "" },
      { id: artistaId2, user_id: uid, nome: "Artista Exemplo 2", email: "artista2@exemplo.com", tel: "(27) 98888-0002", cor: "#9B6BB5", ativo: true, role: "residente", com: 50, insta: "" },
    ]);
    const cli = (over) => ({
      user_id: uid, tel: "(27) 99999-0000", qual: "Q2", orig: "Instagram Orgânico",
      tam: "Médio", primeira: false, cob: false, stars: 0, faltas: 0, indicacoes: 0, credito: 0,
      hist: [{ t: "Cliente cadastrado (exemplo)", d: new Date().toLocaleDateString("pt-BR") }],
      etapa_desde: new Date().toISOString(), ...over,
    });
    await sb.from("clientes").insert([
      cli({ nome: "Marina Alves", artista: artistaId1, etapa: "lead", insta: "@marina.alves" }),
      cli({ nome: "Bruno Kern", artista: artistaId2, etapa: "lead_morno", insta: "@brunokern" }),
      cli({ nome: "Talita Nunes", artista: artistaId1, etapa: "cons_agendada", insta: "@talitanunes" }),
      cli({ nome: "Priscila Gomes", artista: artistaId2, etapa: "sessao_agend", insta: "@pri.gomes" }),
      cli({ nome: "Renan Costa", artista: artistaId1, etapa: "aguard_agend", insta: "@renancosta" }),
      cli({ nome: "Yasmin Duarte", artista: artistaId2, etapa: "pos_venda", insta: "@yasminduarte" }),
      cli({ nome: "Hugo Martins", artista: artistaId1, etapa: "tatuado", insta: "@hugomartins" }),
    ]);
    return res.status(200).json({ ok: true });
  }

  if (req.query?.debugDemo === "1") {
    const uid = process.env.DEMO_USER_ID;
    const { data, error } = await sb.from("configuracoes").select("*").eq("user_id", uid);
    return res.status(200).json({ uid, rows: data, error });
  }

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
