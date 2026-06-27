import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const GOOGLE_REVIEW_URL = "https://g.page/r/CSIFD3cla6rxEBM/review";

function paginaAvaliacao(token, mensagem, mostrarFeedback) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Avaliação — Casa dos Carvalho</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;background:#111;color:#f0ede8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#1a1a1a;border:1px solid #333;border-radius:12px;max-width:480px;width:100%;padding:40px 32px;text-align:center}
  .logo{font-size:13px;letter-spacing:3px;color:#d4a84b;text-transform:uppercase;margin-bottom:24px}
  h1{font-size:22px;font-weight:normal;color:#f0ede8;line-height:1.5;margin-bottom:12px}
  .sub{font-size:14px;color:#888;line-height:1.7;margin-bottom:28px}
  .notas{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:28px}
  .notas a{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold}
  .nota-baixa{background:#2a2a2a;color:#aaa;border:1px solid #333}
  .nota-alta{background:#d4a84b;color:#111;border:1px solid #d4a84b}
  .icon{font-size:48px;margin-bottom:16px}
  textarea{width:100%;background:#111;border:1px solid #333;border-radius:8px;color:#f0ede8;font-family:Georgia,serif;font-size:14px;padding:12px;resize:vertical;min-height:100px;margin-bottom:16px}
  button{background:#d4a84b;color:#111;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:bold;cursor:pointer;width:100%}
  .footer{font-size:11px;color:#444;margin-top:28px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">Casa dos Carvalho Tattoo</div>
  ${mensagem}
  ${mostrarFeedback ? `<form method="POST" action="/api/lead?acao=feedback&token=${token}"><textarea name="feedback" placeholder="Conta pra gente o que aconteceu..."></textarea><button type="submit">Enviar feedback</button></form>` : ""}
  <div class="footer">Vitória, ES • acasadoscarvalhotattoo.com.br</div>
</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── ROTA DE AVALIAÇÃO (/api/lead?acao=avaliar ou ?acao=feedback) ──
  const acao = req.query && req.query.acao;
  const token = req.query && req.query.token;
  const nota = req.query && req.query.nota;

  if (acao === "avaliar" || (acao === "feedback") || (token && nota)) {
    if (acao === "feedback" && req.method === "POST") {
      const feedback = (req.body && req.body.feedback) || "";
      if (feedback && token) {
        try {
          const { data: cli } = await sb.from("clientes").select("nome, obs, user_id").eq("id", token).single();
          if (cli) {
            const novaObs = (cli.obs ? cli.obs + "\n" : "") + "[Feedback avaliação]: " + feedback;
            await sb.from("clientes").update({ obs: novaObs }).eq("id", token);
            await sb.from("historico").insert({
              data: new Date().toLocaleDateString("pt-BR"),
              hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              acao: "Feedback de avaliação recebido — " + cli.nome,
              user_id: cli.user_id
            });
          }
        } catch {}
      }
      const msg = "<div class='icon'>🙏</div><h1>Obrigado pelo feedback!</h1><p class='sub'>Cada retorno é muito valioso pra gente. Vamos trabalhar para melhorar sempre.</p>";
      return res.status(200).send(paginaAvaliacao(token, msg, false));
    }

    if (token && nota) {
      const notaNum = parseInt(nota, 10);
      if (!isNaN(notaNum) && notaNum >= 1 && notaNum <= 10) {
        try {
          await sb.from("clientes").update({ stars: notaNum }).eq("id", token);
          const { data: cli } = await sb.from("clientes").select("nome, user_id").eq("id", token).single();
          if (cli) {
            await sb.from("historico").insert({
              data: new Date().toLocaleDateString("pt-BR"),
              hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              acao: "Avaliação recebida: " + notaNum + "/10 — " + cli.nome,
              user_id: cli.user_id
            });
          }
        } catch {}
        if (notaNum >= 8) return res.redirect(302, GOOGLE_REVIEW_URL);
        const msg = "<div class='icon'>💬</div><h1>Que pena que não foi perfeito...</h1><p class='sub'>Nos conta o que aconteceu. Levamos cada feedback muito a sério.</p>";
        return res.status(200).send(paginaAvaliacao(token, msg, true));
      }
    }

    if (!nota) {
      const botoes = [1,2,3,4,5,6,7,8,9,10].map(n =>
        `<a href="/api/lead?token=${token}&nota=${n}" class="${n >= 8 ? "nota-alta" : "nota-baixa"}">${n}</a>`
      ).join("");
      const msg = "<h1>Como foi sua experiência<br>na Casa dos Carvalho?</h1><p class='sub'>De 1 a 10 — sua avaliação nos ajuda a continuar fazendo o que amamos. 🖤</p><div class='notas'>" + botoes + "</div>";
      return res.status(200).send(paginaAvaliacao(token, msg, false));
    }
  }

  // ── ROTA DE ASSINATURA REMOTA (/api/lead?acao=assinar) ──
  if (acao === "assinar") {
    const token = req.query?.token || req.body?.token;
    if (!token) return res.status(400).json({ error: "Token obrigatorio" });

    const { data: clientes } = await sb
      .from("clientes")
      .select("id, nome, email, tel, nascimento, anamnese, menor_responsavel, menor_responsavel_mae, docs_status, assinar_link, docs_arquivos")
      .not("assinar_link", "is", null);

    let cliente = null;
    let docTipo = null;
    for (const c of clientes || []) {
      const links = c.assinar_link || {};
      for (const [doc, info] of Object.entries(links)) {
        if (info && info.token === token) { cliente = c; docTipo = doc; break; }
      }
      if (cliente) break;
    }

    if (!cliente) return res.status(404).json({ error: "Link invalido ou expirado" });
    const linkInfo = (cliente.assinar_link || {})[docTipo];
    if (linkInfo?.exp && new Date(linkInfo.exp) < new Date()) {
      return res.status(410).json({ error: "Link expirado. Solicite um novo link ao estudio." });
    }

    if (req.method === "GET") {
      return res.status(200).json({
        ok: true, doc: docTipo,
        nome: cliente.nome, email: cliente.email, tel: cliente.tel, nascimento: cliente.nascimento,
        anamnese: cliente.anamnese || {},
        menor_responsavel: cliente.menor_responsavel || {},
        menor_responsavel_mae: cliente.menor_responsavel_mae || {},
        docs_status: cliente.docs_status || {},
        ja_assinado: (cliente.docs_status || {})[docTipo] === "assinado",
        enviado_em: linkInfo?.enviado_em || null,
        id: cliente.id,
      });
    }

    if (req.method === "POST") {
      const { assinatura, anamnese, responsavel_dados, foto_base64, foto_tipo, pdf_base64, pdf_nome } = req.body;
      if (!assinatura) return res.status(400).json({ error: "Assinatura obrigatoria" });

      const edicaoBloqueada = linkInfo?.enviado_em &&
        (Date.now() - new Date(linkInfo.enviado_em).getTime()) > 24 * 60 * 60 * 1000;

      const eMenorResp = docTipo === "menor_resp1" || docTipo === "menor_resp2";
      const campoAssin = docTipo === "anamnese" ? "anamnese_assinatura"
        : docTipo === "contrato" ? "contrato_assinatura"
        : docTipo === "menor_resp1" ? "menor_assinatura"
        : docTipo === "menor_resp2" ? "menor_assinatura_mae"
        : "menor_assinatura";

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
      const novoLink = { ...(cliente.assinar_link || {}) };
      delete novoLink[docTipo];

      const updateFields = {
        [campoAssin]: assinSalva,
        docs_status: novoStatus,
        assinar_link: Object.keys(novoLink).length ? novoLink : null,
      };

      if (docTipo === "anamnese" && anamnese && typeof anamnese === "object") {
        updateFields.anamnese = anamnese;
      }

      // Upload foto e dados pessoais — bloqueados após 24h do envio
      if (!edicaoBloqueada) {
        let fotoUrl = null;
        if (eMenorResp && foto_base64) {
          try {
            const fotoBuffer = Buffer.from(foto_base64, "base64");
            const fotoFname = `doc-menor-${cliente.id}-${docTipo}-${Date.now()}.jpg`;
            await sb.storage.from("referencias").upload(fotoFname, fotoBuffer, { contentType: foto_tipo || "image/jpeg", upsert: true });
            const { data: pub } = sb.storage.from("referencias").getPublicUrl(fotoFname);
            fotoUrl = pub.publicUrl;
            if (responsavel_dados) responsavel_dados.foto_doc = fotoUrl;
          } catch {}
        }

        if (eMenorResp && responsavel_dados && typeof responsavel_dados === "object") {
          const campoResp = docTipo === "menor_resp1" ? "menor_responsavel" : "menor_responsavel_mae";
          const respAtual = docTipo === "menor_resp1" ? (cliente.menor_responsavel || {}) : (cliente.menor_responsavel_mae || {});
          updateFields[campoResp] = { ...respAtual, ...responsavel_dados };
        }
      }

      // Upload PDF via servidor (service key)
      if (pdf_base64 && pdf_nome) {
        try {
          const pdfBuffer = Buffer.from(pdf_base64, "base64");
          const pdfFname = `pdf-remoto-${cliente.id}-${docTipo}-${Date.now()}.pdf`;
          await sb.storage.from("referencias").upload(pdfFname, pdfBuffer, { contentType: "application/pdf", upsert: true });
          const { data: pub } = sb.storage.from("referencias").getPublicUrl(pdfFname);
          const arquivosAtuais = cliente.docs_arquivos || [];
          updateFields.docs_arquivos = [...arquivosAtuais, { nome: pdf_nome, url: pub.publicUrl, tipo: "pdf", criado_em: new Date().toISOString() }];
        } catch {}
      }

      const { error: erroUpdate } = await sb.from("clientes").update(updateFields).eq("id", cliente.id);
      if (erroUpdate) { console.error("ERRO update pos-assinatura:", JSON.stringify(erroUpdate), "campos:", Object.keys(updateFields)); }
      return res.status(200).json({ ok: true, debug_erro: erroUpdate || null });
    }

    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { nome, tel, email, idea, ideia, artista, insta, regiao, nascimento, referencias, orig, obs: obsExtra } = req.body;
  if (!nome && !tel && !email) return res.status(400).json({ error: "pelo menos um dado obrigatorio" });

  const ideaFinal = idea || ideia || "";

  // Normalizar nascimento para ISO (AAAA-MM-DD) se vier como DD/MM/AAAA
  let nascimentoISO = null;
  if (nascimento) {
    const parts = String(nascimento).replace(/[^\d]/g, "/").split("/");
    if (parts.length === 3 && parts[2].length === 4) {
      nascimentoISO = parts[2] + "-" + parts[1].padStart(2, "0") + "-" + parts[0].padStart(2, "0");
    }
  }

  const row = {
    nome,
    tel: tel || "",
    email: email || "",
    insta: insta || "",
    qual: "Q1",
    etapa: "lead",
    orig: orig || "Site",
    descricao: ideaFinal,
    nascimento: nascimentoISO,
    artista: artista || null,
    estilo: "",
    regiao: regiao || "",
    tam: "Medio",
    intencao: "",
    cob: false,
    stars: 0,
    obs: obsExtra ? `Lead captado via Aura Chat no site. ${obsExtra}` : "Lead captado via Aura Chat no site.",
    val_a: 0,
    val_c: 0,
    pgto: "",
    orcamento: false,
    contrato: false,
    faltas: 0,
    indicacoes: 0,
    credito: 0,
    cri: "",
    dias: 0,
    referencias: Array.isArray(referencias) && referencias.length ? referencias : [],
  };

  row.user_id = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

  // Identificação de cliente existente por telefone — telefone bate = mesmo cliente, sempre
  // Ao atualizar, prevalece o campo com mais dados (novo só substitui se existente estiver vazio)
  function maisCompleto(existente, novo) {
    const e = (existente || "").trim();
    const n = (novo || "").trim();
    if (!e) return n || undefined;
    if (!n) return undefined; // mantém existente, não sobrescreve
    return n.length > e.length ? n : undefined; // novo mais longo = mais completo
  }

  let clienteId = null;
  let isNewClient = true;
  {
    const telDigits = tel ? tel.replace(/[^0-9]/g, "").slice(-11) : null;
    const emailNorm = email ? email.trim().toLowerCase() : null;
    const { data: existentes } = await sb.from("clientes").select("id,tel,nome,email,insta,descricao,nascimento,artista,regiao").eq("user_id", row.user_id);
    const match =
      (telDigits && (existentes || []).find(c => c.tel && c.tel.replace(/[^0-9]/g, "").slice(-11) === telDigits)) ||
      (emailNorm && (existentes || []).find(c => c.email && c.email.trim().toLowerCase() === emailNorm));
    if (match) {
      const updateFields = { excluido_em: null };
      const nomeVal = maisCompleto(match.nome, nome);
      if (nomeVal) updateFields.nome = nomeVal;
      const emailVal = maisCompleto(match.email, email);
      if (emailVal) updateFields.email = emailVal;
      if (telDigits && !match.tel) updateFields.tel = tel;
      const instaVal = maisCompleto(match.insta, insta);
      if (instaVal) updateFields.insta = instaVal;
      const descVal = maisCompleto(match.descricao, ideaFinal);
      if (descVal) updateFields.descricao = descVal;
      if (nascimentoISO && !match.nascimento) updateFields.nascimento = nascimentoISO;
      const artistaVal = maisCompleto(match.artista, artista);
      if (artistaVal) updateFields.artista = artistaVal;
      const regiaoVal = maisCompleto(match.regiao, regiao);
      if (regiaoVal) updateFields.regiao = regiaoVal;
      if (obsExtra) updateFields.obs = `Lead captado via Aura Chat no site. ${obsExtra}`;
      await sb.from("clientes").update(updateFields).eq("id", match.id);
      clienteId = match.id;
      isNewClient = false;
    }
  }

  if (!clienteId) {
    const { data: inserted, error } = await sb.from("clientes").insert(row).select("id").single();
    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }
    clienteId = inserted?.id || null;
  }

  // Dispara SMS e e-mail apenas no primeiro cadastro (não em updates progressivos)
  if (!isNewClient) return res.status(200).json({ ok: true, clienteId, updated: true });

  const zenviaKey = process.env.ZENVIA_API_KEY;
  const fn = nome.trim().split(" ")[0];

  if (zenviaKey && tel && tel.replace(/\D/g, "").length >= 10) {
    const telLimpo = "55" + tel.replace(/\D/g, "").replace(/^55/, "");

    const smsFns = [
      // SMS para o cliente
      fetch("https://api.zenvia.com/v2/channels/sms/messages", {
        method: "POST",
        headers: { "X-API-TOKEN": zenviaKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "estudio.abraao.tattoo",
          to: telLimpo,
          contents: [{ type: "text", text: `Oi ${fn}! 🖤 Sou a Aura da Casa dos Carvalho. Recebemos sua ideia de tatuagem e em breve nossa equipe entra em contato. Fique de olho no seu e-mail!` }]
        })
      }).catch(e => console.warn("SMS cliente error:", e)),

      // SMS para o profissional responsável (ou estúdio se indefinido)
      fetch("https://api.zenvia.com/v2/channels/sms/messages", {
        method: "POST",
        headers: { "X-API-TOKEN": zenviaKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "estudio.abraao.tattoo",
          to: artista && artista.toLowerCase().includes("camilla") ? "5527996941787" : "5527996929665",
          contents: [{ type: "text", text: `✦ Novo lead: ${nome} | ${tel} | ${email || "—"} | Artista: ${artista || "A definir"}` }]
        })
      }).catch(e => console.warn("SMS estudio error:", e)),
    ];

    await Promise.all(smsFns);
  }

  // E-mail de boas-vindas ao cliente (apenas se tiver e-mail e chave Resend configurada)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && email) {
    const emailFrom = process.env.EMAIL_REMETENTE || "contato@acasadoscarvalhotattoo.com.br";
    const artistaNome = artista && artista.toLowerCase().includes("camilla") ? "a Camilla" : artista ? "o Abraão" : null;
    const waNumero = artista && artista.toLowerCase().includes("camilla") ? "5527996941787" : "5527996929665";
    const waLink = "https://wa.me/" + waNumero;
    const ni = "Não informado";
    const nascFormatado = nascimentoISO
      ? nascimentoISO.split("-").reverse().join("/")
      : ni;
    const resumoDados =
      "<table style='width:100%;border-collapse:collapse;font-size:13px;margin:16px 0'>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555;width:140px'>Nome</td><td style='padding:8px 12px;color:#222'>" + nome + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Telefone</td><td style='padding:8px 12px;color:#222'>" + (tel || ni) + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>E-mail</td><td style='padding:8px 12px;color:#222'>" + (email || ni) + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Artista</td><td style='padding:8px 12px;color:#222'>" + (artista || ni) + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Ideia / projeto</td><td style='padding:8px 12px;color:#222'>" + (ideaFinal || ni) + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Região do corpo</td><td style='padding:8px 12px;color:#222'>" + (regiao || ni) + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Instagram</td><td style='padding:8px 12px;color:#222'>" + (insta || ni) + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Data de nascimento</td><td style='padding:8px 12px;color:#222'>" + nascFormatado + "</td></tr>" +
      (obsExtra ? "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Observações</td><td style='padding:8px 12px;color:#222'>" + obsExtra + "</td></tr>" : "") +
      "</table>";
    const htmlBoasVindas =
      "<div style='font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px'>" +
      "<p style='font-size:22px;font-weight:bold;color:#1a1a1a;margin-bottom:4px'>Casa dos Carvalho Tattoo</p>" +
      "<hr style='border:none;border-top:1px solid #d4a84b;margin-bottom:24px'>" +
      "<p style='font-size:16px'>Olá, <strong>" + fn + "</strong>!</p>" +
      "<p style='line-height:1.8;color:#333'>Que alegria receber sua ideia aqui na Casa dos Carvalho. Já registramos tudo com cuidado" +
      (artistaNome ? " — e vimos que você tem interesse em tatuar com <strong>" + artistaNome + "</strong>!" : "!") + "</p>" +
      "<p style='line-height:1.8;color:#333'>Em até 24h, alguém da nossa equipe vai te ligar pessoalmente para conversar sobre os detalhes do seu projeto. Sem formulário, sem robô — conversa de gente pra gente.</p>" +
      "<p style='line-height:1.8;color:#333'>Se preferir adiantar por WhatsApp, é só chamar a gente aqui:</p>" +
      "<p><a href='" + waLink + "' style='display:inline-block;background:#d4a84b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold'>💬 Chamar no WhatsApp</a></p>" +
      "<p style='line-height:1.8;color:#333;margin-top:20px'>Trabalhamos só com hora marcada, então cada projeto recebe atenção total — do primeiro traço ao último detalhe.</p>" +
      "<p style='margin-top:8px;line-height:1.8;color:#333'><strong>Resumo do que registramos:</strong></p>" +
      resumoDados +
      "<p style='line-height:1.8;color:#333;margin-top:16px'>Obrigado por escolher fazer parte da família Carvalho. Já estamos ansiosos para te conhecer. 🖤</p>" +
      "<p style='margin-top:32px;font-size:12px;color:#999'>Com carinho,<br><strong>Casa dos Carvalho Tattoo</strong> — Vitória, ES</p>" +
      "</div>";
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: emailFrom,
        to: [email],
        subject: "Recebemos sua mensagem, " + fn + "! 🖤",
        html: htmlBoasVindas
      })
    }).catch(e => console.warn("Email boas-vindas error:", e));
  }

  return res.status(200).json({ ok: true, clienteId });
}
