import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const token = req.query?.token || req.body?.token;
  if (!token) return res.status(400).json({ error: "Token obrigatorio" });

  // Buscar cliente pelo token (apenas clientes com assinar_link preenchido)
  const { data: clientes } = await sb
    .from("clientes")
    .select("id, nome, email, tel, nascimento, anamnese, menor_responsavel, docs_status, assinar_link")
    .not("assinar_link", "is", null);

  let cliente = null;
  let docTipo = null;
  for (const c of clientes || []) {
    const links = c.assinar_link || {};
    for (const [doc, info] of Object.entries(links)) {
      if (info && info.token === token) {
        cliente = c;
        docTipo = doc;
        break;
      }
    }
    if (cliente) break;
  }

  if (!cliente) return res.status(404).json({ error: "Link invalido ou expirado" });

  const linkInfo = (cliente.assinar_link || {})[docTipo];
  if (linkInfo?.exp && new Date(linkInfo.exp) < new Date()) {
    return res.status(410).json({ error: "Link expirado. Solicite um novo link ao estudio." });
  }

  // ── GET: retornar dados seguros para a pagina de assinatura ──
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      doc: docTipo,
      nome: cliente.nome,
      email: cliente.email,
      tel: cliente.tel,
      nascimento: cliente.nascimento,
      anamnese: cliente.anamnese || {},
      menor_responsavel: cliente.menor_responsavel || {},
      docs_status: cliente.docs_status || {},
      ja_assinado: (cliente.docs_status || {})[docTipo] === "assinado",
    });
  }

  // ── POST: salvar assinatura ──
  if (req.method === "POST") {
    const { assinatura, anamnese } = req.body;
    if (!assinatura) return res.status(400).json({ error: "Assinatura obrigatoria" });

    const campoAssin = docTipo === "anamnese"
      ? "anamnese_assinatura"
      : docTipo === "contrato"
      ? "contrato_assinatura"
      : "menor_assinatura";

    // Upload assinatura para Supabase Storage
    let assinSalva = assinatura;
    try {
      const b64 = assinatura.split(",")[1];
      const buffer = Buffer.from(b64, "base64");
      const fname = `assin-${cliente.id}-${docTipo}-remoto.png`;
      await sb.storage.from("referencias").upload(fname, buffer, { contentType: "image/png", upsert: true });
      const { data: pub } = sb.storage.from("referencias").getPublicUrl(fname);
      assinSalva = pub.publicUrl;
    } catch {}

    const novoStatus = { ...(cliente.docs_status || {}), [docTipo]: "assinado" };

    // Invalidar token apos uso
    const novoLink = { ...(cliente.assinar_link || {}) };
    delete novoLink[docTipo];

    const updateFields = {
      [campoAssin]: assinSalva,
      docs_status: novoStatus,
      assinar_link: Object.keys(novoLink).length ? novoLink : null,
    };

    // Se veio anamnese preenchida remotamente, salvar tambem
    if (docTipo === "anamnese" && anamnese && typeof anamnese === "object") {
      updateFields.anamnese = anamnese;
    }

    await sb.from("clientes").update(updateFields).eq("id", cliente.id);

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
