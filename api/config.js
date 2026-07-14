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

  // Setup ÚNICO da conta demo (rodar uma vez, depois remover este branch).
  if (req.query?.setupDemo === "confirmado") {
    const DEMO_EMAIL = "demo@inksystem.com.br";
    const DEMO_PASSWORD = "InkSystemDemo2026!";
    let uid;
    const { data: existing } = await sb.auth.admin.listUsers();
    const jaExiste = existing?.users?.find(u => u.email === DEMO_EMAIL);
    if (jaExiste) {
      uid = jaExiste.id;
    } else {
      const { data: created, error: errCreate } = await sb.auth.admin.createUser({
        email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true,
      });
      if (errCreate) return res.status(500).json({ error: errCreate.message });
      uid = created.user.id;
    }
    await sb.from("configuracoes").upsert({
      user_id: uid, studio_name: "Seu Estúdio", studio_owner: "Seu Nome",
      studio_email: DEMO_EMAIL, studio_city: "Vitória", studio_estado: "ES",
      onboarding_done: true,
    }, { onConflict: "user_id" });
    await sb.from("ink_clientes").upsert({
      auth_user_id: uid, email: DEMO_EMAIL, nome_estudio: "Seu Estúdio",
      slug: "demo-interno", status: "ativo", plano: "Ouro",
    }, { onConflict: "auth_user_id" });
    return res.status(200).json({ ok: true, uid, email: DEMO_EMAIL });
  }

  // Reset + reseed da conta demo — chamado a cada carregamento de ?demo=1,
  // pra quem está testando sempre ver dados fictícios do zero.
  if (req.query?.acao === "resetDemo") {
    const uid = process.env.DEMO_USER_ID;
    if (!uid) return res.status(500).json({ error: "DEMO_USER_ID não configurado" });
    for (const t of ["clientes", "agenda", "financeiro", "historico", "artistas"]) {
      await sb.from(t).delete().eq("user_id", uid);
    }
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
