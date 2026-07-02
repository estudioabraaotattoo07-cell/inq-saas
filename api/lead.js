import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const GOOGLE_REVIEW_URL = "https://g.page/r/CSIFD3cla6rxEBM/review";

function paginaConfirmacao(estado, cli, evento) {
  const nome = cli?.nome ? cli.nome.split(" ")[0] : "Olá";
  const dataEv = evento?.data
    ? new Date(evento.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
    : null;
  const horaEv = evento?.hora || null;

  const conteudo = {
    invalido: `<div class="icon">❌</div><h1>Link inválido</h1><p class="sub">Este link de confirmação não foi encontrado.<br>Entre em contato com o estúdio.</p>`,
    expirado: `<div class="icon">⏰</div><h1>Link expirado</h1><p class="sub">Este link já passou da data de validade.<br>Entre em contato com o estúdio.</p>`,
    confirmado: `<div class="icon">✅</div><h1>Presença confirmada!</h1><p class="sub">Obrigado, ${nome}! Te esperamos na data combinada. 🖤</p>`,
    precisa_remarcar: `<div class="icon">📞</div><h1>Recebemos seu aviso</h1><p class="sub">Entraremos em contato para remarcar sua sessão, ${nome}.</p>`,
    pendente: `
      <h1>Olá, ${nome}!</h1>
      <p class="sub">Confirme sua presença para a sessão${dataEv ? `<br><strong>${dataEv}${horaEv ? " às " + horaEv : ""}</strong>` : ""}.</p>
      <form method="POST">
        <input type="hidden" name="resposta" value="confirmado">
        <button type="submit" style="background:#27ae60;margin-bottom:12px">✅ Confirmo minha presença</button>
      </form>
      <form method="POST">
        <input type="hidden" name="resposta" value="precisa_remarcar">
        <button type="submit" style="background:#c0392b">❌ Preciso remarcar</button>
      </form>
    `,
  }[estado] || "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirmação de Presença — Casa dos Carvalho</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;background:#111;color:#f0ede8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#1a1a1a;border:1px solid #333;border-radius:12px;max-width:420px;width:100%;padding:40px 32px;text-align:center}
  .logo{font-size:12px;letter-spacing:3px;color:#d4a84b;text-transform:uppercase;margin-bottom:24px}
  h1{font-size:20px;font-weight:normal;color:#f0ede8;line-height:1.5;margin-bottom:12px}
  .sub{font-size:14px;color:#888;line-height:1.7;margin-bottom:24px}
  .icon{font-size:48px;margin-bottom:16px}
  button{width:100%;border:none;border-radius:8px;padding:14px;font-size:15px;font-weight:bold;cursor:pointer;color:#fff;font-family:Georgia,serif;margin-bottom:0}
  .footer{font-size:11px;color:#444;margin-top:28px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">Casa dos Carvalho Tattoo</div>
  ${conteudo}
  <div class="footer">Vitória, ES • acasadoscarvalhotattoo.com.br</div>
</div>
</body>
</html>`;
}

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

function paginaAvaliacaoNps(estado, cli, nota) {
  const nome = cli?.nome ? cli.nome.split(" ")[0] : "Olá";
  const estiloBase = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;background:#111;color:#f0ede8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#1a1a1a;border:1px solid #333;border-radius:12px;max-width:480px;width:100%;padding:40px 32px;text-align:center}.logo{font-size:12px;letter-spacing:3px;color:#d4a84b;text-transform:uppercase;margin-bottom:24px}h1{font-size:20px;font-weight:normal;color:#f0ede8;line-height:1.5;margin-bottom:12px}.sub{font-size:14px;color:#888;line-height:1.7;margin-bottom:24px}.icon{font-size:48px;margin-bottom:16px}.nota-btn{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:bold;margin:4px}.baixa{background:#2a2a2a;color:#aaa;border:1px solid #333}.alta{background:#d4a84b;color:#111;border:1px solid #d4a84b}textarea{width:100%;background:#111;border:1px solid #444;border-radius:8px;color:#f0ede8;font-family:Georgia,serif;font-size:14px;padding:12px;resize:vertical;min-height:100px;margin-bottom:16px}button[type=submit]{background:#d4a84b;color:#111;border:none;border-radius:8px;padding:13px 28px;font-size:14px;font-weight:bold;cursor:pointer;width:100%}.footer{font-size:11px;color:#444;margin-top:28px}`;

  const conteudos = {
    invalido: `<div class="icon">❌</div><h1>Link inválido</h1><p class="sub">Este link não foi encontrado. Entre em contato com o estúdio.</p>`,
    expirado: `<div class="icon">⏰</div><h1>Link expirado</h1><p class="sub">Este link passou da data de validade. Entre em contato com o estúdio.</p>`,
    escala: `<h1>Olá, ${nome}!</h1><p class="sub">Foi uma alegria ter você aqui. Sua opinião nos ajuda a continuar evoluindo e a receber cada cliente com ainda mais cuidado.</p><p style="font-size:15px;color:#f0ede8;margin-bottom:20px"><strong>Como você avalia sua experiência conosco?</strong></p><div style="display:flex;flex-wrap:wrap;justify-content:center;margin-bottom:20px">${[0,1,2,3,4,5,6,7,8,9,10].map(n=>`<a href="?nota=${n}" class="nota-btn ${n>=7?"alta":"baixa"}">${n}</a>`).join("")}</div><p style="font-size:11px;color:#555">0 = extremamente insatisfeito · 10 = extremamente satisfeito</p>`,
    comentario_positivo: `<div class="icon">🙏</div><h1>Que alegria, ${nome}!</h1><p class="sub">Conta pra gente com suas próprias palavras o que foi mais especial — pode ser a tatuagem, o atendimento, a atmosfera do estúdio, qualquer coisa que tenha marcado você.</p><form method="POST"><input type="hidden" name="nota" value="${nota}"><textarea name="comentario" placeholder="Escreva aqui..." required></textarea><button type="submit">Enviar avaliação</button></form>`,
    comentario_negativo: `<div class="icon">💬</div><h1>Obrigado pela honestidade</h1><p class="sub">Queremos entender o que aconteceu para melhorar. Pode nos contar com calma o que não foi como você esperava?</p><form method="POST"><input type="hidden" name="nota" value="${nota}"><textarea name="comentario" placeholder="Conte o que aconteceu..." required></textarea><button type="submit">Enviar</button></form>`,
    obrigado_positivo: `<div class="icon">🖤</div><h1>Obrigado, ${nome}!</h1><p class="sub">Sua avaliação foi registrada. Em breve você receberá mais um recadinho nosso.</p>`,
    obrigado_negativo: `<div class="icon">🙏</div><h1>Obrigado pela honestidade, ${nome}</h1><p class="sub">Cada retorno nos ajuda a melhorar. Vamos levar sua experiência muito a sério.</p>`,
  };

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avaliação — Casa dos Carvalho</title><style>${estiloBase}</style></head><body><div class="card"><div class="logo">Casa dos Carvalho Tattoo</div>${conteudos[estado] || ""}<div class="footer">Vitória, ES · acasadoscarvalhotattoo.com.br</div></div></body></html>`;
}

function paginaGoogleResposta(estado, cli, googleLink) {
  const nome = cli?.nome ? cli.nome.split(" ")[0] : "Olá";
  const comentario = cli?.avaliacao_comentario || "";
  const estiloBase = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;background:#111;color:#f0ede8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#1a1a1a;border:1px solid #333;border-radius:12px;max-width:480px;width:100%;padding:40px 32px;text-align:center}.logo{font-size:12px;letter-spacing:3px;color:#d4a84b;text-transform:uppercase;margin-bottom:24px}h1{font-size:20px;font-weight:normal;color:#f0ede8;line-height:1.5;margin-bottom:12px}.sub{font-size:14px;color:#888;line-height:1.7;margin-bottom:20px}.icon{font-size:48px;margin-bottom:16px}.caixa{background:#111;border:1px solid #444;border-radius:8px;padding:14px;font-size:13px;color:#ccc;text-align:left;line-height:1.7;margin-bottom:12px;white-space:pre-wrap}.btn-g{display:block;background:#d4a84b;color:#111;border:none;border-radius:8px;padding:13px 28px;font-size:14px;font-weight:bold;cursor:pointer;width:100%;text-decoration:none;margin-bottom:8px}.btn-copy{background:#2a2a2a;color:#d4a84b;border:1px solid #d4a84b;border-radius:8px;padding:10px 20px;font-size:13px;cursor:pointer;width:100%;font-family:Georgia,serif}.footer{font-size:11px;color:#444;margin-top:28px}`;

  const conteudos = {
    invalido: `<div class="icon">❌</div><h1>Link inválido</h1><p class="sub">Entre em contato com o estúdio.</p>`,
    sim: `<div class="icon">🙏</div><h1>Que generoso da sua parte, ${nome}!</h1><p class="sub">Para facilitar, aqui está o que você já escreveu sobre sua experiência. Copie e cole direto no Google:</p><div class="caixa" id="txt">${comentario.replace(/</g,"&lt;")}</div><button class="btn-copy" onclick="navigator.clipboard.writeText(document.getElementById('txt').innerText).then(()=>{this.textContent='✓ Copiado!'})">Copiar texto</button><br><br><a class="btn-g" href="${googleLink || "https://g.page/r/"}" target="_blank">Abrir avaliação no Google →</a>`,
    nao: `<div class="icon">🖤</div><h1>Tudo bem, ${nome}!</h1><p class="sub">Obrigado por ter avaliado sua experiência conosco — isso já nos ajuda muito. Até a próxima sessão!</p>`,
  };

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avaliação Google — Casa dos Carvalho</title><style>${estiloBase}</style></head><body><div class="card"><div class="logo">Casa dos Carvalho Tattoo</div>${conteudos[estado] || ""}<div class="footer">Vitória, ES · acasadoscarvalhotattoo.com.br</div></div></body></html>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const acao = req.query && req.query.acao;
  const token = req.query && req.query.token;
  const nota = req.query && req.query.nota;

  // ── AVALIAÇÃO NPS + CONVITE GOOGLE (novo fluxo pós-sessão) ──────────────────

  if (acao === "avaliar_nps") {
    const avToken = (req.query?.token || "").trim();
    if (!avToken) return res.status(400).send(paginaAvaliacaoNps("invalido", null, null));

    const { data: cli } = await sb.from("clientes")
      .select("id, nome, email, artista, nps, avaliacao_fluxo_status, avaliacao_token, avaliacao_token_exp, avaliacao_comentario, hist, user_id")
      .eq("avaliacao_token", avToken).single();

    if (!cli) return res.status(404).send(paginaAvaliacaoNps("invalido", null, null));
    if (cli.avaliacao_token_exp && new Date(cli.avaliacao_token_exp) < new Date())
      return res.status(410).send(paginaAvaliacaoNps("expirado", cli, null));

    const notaParam = req.query?.nota != null ? parseInt(req.query.nota, 10) : null;

    // GET sem nota → mostrar escala
    if (req.method === "GET" && notaParam === null) {
      return res.status(200).send(paginaAvaliacaoNps("escala", cli, null));
    }

    // GET com nota → mostrar campo de comentário
    if (req.method === "GET" && notaParam !== null && !isNaN(notaParam)) {
      const positiva = notaParam >= 7;
      return res.status(200).send(paginaAvaliacaoNps(positiva ? "comentario_positivo" : "comentario_negativo", cli, notaParam));
    }

    // POST → salvar nota + comentário
    if (req.method === "POST") {
      const notaPost = parseInt(req.body?.nota ?? req.query?.nota ?? "0", 10);
      const comentario = (req.body?.comentario || "").trim();
      const positiva = notaPost >= 7;
      const conviteEm = positiva ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
      await sb.from("clientes").update({
        nps: notaPost,
        avaliacao_comentario: comentario,
        avaliacao_fluxo_status: positiva ? "positiva" : "negativa",
        avaliacao_token: null,
        avaliacao_token_exp: null,
        google_convite_em: conviteEm,
        hist: [...(cli.hist || []), { t: "Avaliação NPS recebida: " + notaPost + "/10", d: new Date().toLocaleString("pt-BR") }],
      }).eq("id", cli.id);
      await sb.from("historico").insert({
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        acao: "Avaliação NPS: " + notaPost + "/10 — " + cli.nome + (comentario ? " (com comentário)" : ""),
        user_id: cli.user_id,
      });
      return res.status(200).send(paginaAvaliacaoNps(positiva ? "obrigado_positivo" : "obrigado_negativo", cli, notaPost));
    }
  }

  if (acao === "google_sim") {
    const avToken = (req.query?.token || "").trim();
    if (!avToken) return res.status(400).send(paginaGoogleResposta("invalido", null));
    const { data: cli } = await sb.from("clientes")
      .select("id, nome, avaliacao_comentario, avaliacao_fluxo_status, hist, user_id")
      .eq("id", avToken).single();
    if (!cli) return res.status(404).send(paginaGoogleResposta("invalido", null));
    await sb.from("clientes").update({
      avaliacao_fluxo_status: "google_sim",
      hist: [...(cli.hist || []), { t: "Aceitou avaliar no Google", d: new Date().toLocaleString("pt-BR") }],
    }).eq("id", cli.id);
    await sb.from("historico").insert({
      data: new Date().toLocaleDateString("pt-BR"),
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      acao: "Aceitou convite de avaliação Google — " + cli.nome,
      user_id: cli.user_id,
    });
    const { data: cfg } = await sb.from("configuracoes").select("google_link").eq("user_id", cli.user_id).single();
    return res.status(200).send(paginaGoogleResposta("sim", cli, cfg?.google_link));
  }

  if (acao === "google_nao") {
    const avToken = (req.query?.token || "").trim();
    if (!avToken) return res.status(400).send(paginaGoogleResposta("invalido", null));
    const { data: cli } = await sb.from("clientes")
      .select("id, nome, hist, user_id")
      .eq("id", avToken).single();
    if (!cli) return res.status(404).send(paginaGoogleResposta("invalido", null));
    await sb.from("clientes").update({
      avaliacao_fluxo_status: "google_nao",
      hist: [...(cli.hist || []), { t: "Recusou avaliar no Google", d: new Date().toLocaleString("pt-BR") }],
    }).eq("id", cli.id);
    await sb.from("historico").insert({
      data: new Date().toLocaleDateString("pt-BR"),
      hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      acao: "Recusou convite de avaliação Google — " + cli.nome,
      user_id: cli.user_id,
    });
    return res.status(200).send(paginaGoogleResposta("nao", cli));
  }

  // ── ROTA DE AVALIAÇÃO (/api/lead?acao=avaliar ou ?acao=feedback) ──

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

  // ── ROTA DE REAGENDAMENTO AGUARD_1A_SESSAO (/api/lead?acao=adiar_sessao) ──
  if (acao === "adiar_sessao") {
    const cliId = (req.query?.token || "").trim();
    if (!cliId) return res.status(400).send("<p style='font-family:Georgia,serif;padding:40px;text-align:center;color:#888'>Link inválido.</p>");
    try {
      const { data: cli } = await sb.from("clientes").select("id, nome, disparos_enviados, user_id").eq("id", cliId).single();
      if (!cli) return res.status(404).send("<p style='font-family:Georgia,serif;padding:40px;text-align:center;color:#888'>Cliente não encontrado.</p>");
      // Remove a chave de dedup do e-mail D+30 para o cron reenviar em mais 30 dias
      const disparosAtuais = cli.disparos_enviados || {};
      delete disparosAtuais["__aguard_1a_sessao_d30__"];
      await sb.from("clientes").update({ disparos_enviados: disparosAtuais, etapa_desde: new Date().toISOString() }).eq("id", cli.id);
      await sb.from("historico").insert({
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        acao: "Ainda não — recontato em 30 dias agendado — " + cli.nome,
        user_id: cli.user_id,
      });
      return res.status(200).send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Casa dos Carvalho</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;background:#111;color:#f0ede8;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#1a1a1a;border:1px solid #333;border-radius:12px;max-width:420px;width:100%;padding:40px 32px;text-align:center}.logo{font-size:12px;letter-spacing:3px;color:#d4a84b;text-transform:uppercase;margin-bottom:24px}h1{font-size:20px;font-weight:normal;color:#f0ede8;line-height:1.5;margin-bottom:12px}.sub{font-size:14px;color:#888;line-height:1.7}</style></head><body><div class="card"><div class="logo">Casa dos Carvalho Tattoo</div><div style="font-size:40px;margin-bottom:16px">🖤</div><h1>Tudo bem, ${(cli.nome || "").split(" ")[0]}!</h1><p class="sub">Seu projeto continua guardado com carinho. Entraremos em contato novamente em 30 dias.</p></div></body></html>`);
    } catch (e) {
      return res.status(500).send("<p style='font-family:Georgia,serif;padding:40px;text-align:center;color:#888'>Erro interno.</p>");
    }
  }

  // ── ROTA DE ASSINATURA REMOTA (/api/lead?acao=assinar) ──
  if (acao === "assinar") {
    const token = req.query?.token || req.body?.token;
    if (!token) return res.status(400).json({ error: "Token obrigatorio" });

    const { data: clientes } = await sb
      .from("clientes")
      .select("id, nome, email, tel, nascimento, documento, artista, projetos, val_a, pgto, regiao, servico_interesse, anamnese, menor_responsavel, menor_responsavel_mae, menor_assinatura, menor_assinatura_mae, contrato_obs, docs_status, assinar_link, docs_arquivos")
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
        documento: cliente.documento || null,
        projetos: cliente.projetos || [],
        val_a: cliente.val_a || null,
        pgto: cliente.pgto || null,
        regiao: cliente.regiao || null,
        servico_interesse: cliente.servico_interesse || null,
        artista_nome: linkInfo?.artista_nome || null,
        anamnese: cliente.anamnese || {},
        menor_responsavel: cliente.menor_responsavel || {},
        menor_responsavel_mae: cliente.menor_responsavel_mae || {},
        menor_assinatura: cliente.menor_assinatura || null,
        menor_assinatura_mae: cliente.menor_assinatura_mae || null,
        contrato_obs: cliente.contrato_obs || linkInfo?.obs_contrato || null,
        studio_city: linkInfo?.studio_city || null,
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

          // Adiciona foto do documento como arquivo separado em docs_arquivos
          const fotoDocUrl = responsavel_dados.foto_doc || fotoUrl;
          if (fotoDocUrl) {
            const sufixo = docTipo === "menor_resp1" ? "Responsavel-1" : "Responsavel-2";
            const dataHoje = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
            const nomeArq = `DOC-IDENTIDADE-${sufixo}-${cliente.nome ? cliente.nome.replace(/ /g,"-") : "menor"}-${dataHoje}.jpg`;
            const arquivosAtuais = cliente.docs_arquivos || [];
            updateFields.docs_arquivos = [...arquivosAtuais, { nome: nomeArq, url: fotoDocUrl, tipo: "imagem", criado_em: new Date().toISOString() }];
          }
        }
      }

      // Upload PDF via servidor (service key)
      if (pdf_base64 && pdf_nome) {
        try {
          const pdfBuffer = Buffer.from(pdf_base64, "base64");
          const pdfFname = `pdf-remoto-${cliente.id}-${docTipo}-${Date.now()}.pdf`;
          await sb.storage.from("referencias").upload(pdfFname, pdfBuffer, { contentType: "application/pdf", upsert: true });
          const { data: pub } = sb.storage.from("referencias").getPublicUrl(pdfFname);
          // usa updateFields.docs_arquivos se foto já foi adicionada neste request
          const arquivosAtuais = updateFields.docs_arquivos || cliente.docs_arquivos || [];
          updateFields.docs_arquivos = [...arquivosAtuais, { nome: pdf_nome, url: pub.publicUrl, tipo: "pdf", criado_em: new Date().toISOString() }];
        } catch {}
      }

      const { error: erroUpdate } = await sb.from("clientes").update(updateFields).eq("id", cliente.id);
      if (erroUpdate) { console.error("ERRO update pos-assinatura:", JSON.stringify(erroUpdate)); }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── ROTA DE CONFIRMAÇÃO DE PRESENÇA (/api/lead?acao=confirmar_presenca) ──
  if (acao === "confirmar_presenca") {
    const cfToken = (req.query?.token || req.body?.token || "").trim();
    const resposta = (req.body?.resposta || req.query?.resposta || "").trim();

    if (!cfToken) return res.status(400).json({ error: "Token obrigatorio" });

    const { data: cli, error: cliErr } = await sb
      .from("clientes")
      .select("id, nome, etapa, confirmacao_token, confirmacao_token_exp, confirmacao_evento_id, user_id, hist")
      .eq("confirmacao_token", cfToken)
      .single();

    if (cliErr || !cli) return res.status(404).send(paginaConfirmacao("invalido", null, null));

    if (cli.confirmacao_token_exp && new Date(cli.confirmacao_token_exp) < new Date()) {
      return res.status(410).send(paginaConfirmacao("expirado", null, null));
    }

    if (req.method === "GET") {
      let evento = null;
      if (cli.confirmacao_evento_id) {
        const { data: ev } = await sb
          .from("agenda")
          .select("titulo, data, hora, artista")
          .eq("id", cli.confirmacao_evento_id)
          .single();
        evento = ev;
      }
      return res.status(200).send(paginaConfirmacao("pendente", cli, evento));
    }

    if (req.method === "POST") {
      if (!["confirmado", "precisa_remarcar"].includes(resposta)) {
        return res.status(400).json({ error: "Resposta invalida" });
      }

      const histMsg = resposta === "confirmado"
        ? "Presença confirmada pelo cliente via link"
        : "Cliente sinalizou que precisa remarcar via link";

      const updateFields = {
        confirmacao_presenca: resposta,
        confirmacao_token: null,
        confirmacao_token_exp: null,
        hist: [...(cli.hist || []), { t: histMsg, d: new Date().toLocaleString("pt-BR") }],
      };

      if (resposta === "precisa_remarcar") {
        updateFields.etapa = "precisa_remarcar";
        updateFields.etapa_desde = new Date().toISOString();
      }

      await sb.from("clientes").update(updateFields).eq("id", cli.id);
      await sb.from("historico").insert({
        data: new Date().toLocaleDateString("pt-BR"),
        hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        acao: histMsg + " — " + cli.nome,
        user_id: cli.user_id,
      });

      return res.status(200).send(paginaConfirmacao(resposta, cli, null));
    }

    return res.status(405).json({ error: "Method not allowed" });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { nome, tel, email, idea, ideia, artista, insta, regiao, nascimento, referencias, orig, obs: obsExtra, chat_log } = req.body;
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

  // Salvar histórico de conversa da Aura (enviado pelo widget via chat_log)
  if (chat_log && Array.isArray(chat_log) && chat_log.length > 0 && clienteId) {
    try {
      const sessaoData = new Date().toISOString();
      const hoje = sessaoData.split("T")[0];
      const { data: cliLog } = await sb.from("clientes").select("aura_chat_log").eq("id", clienteId).single();
      const logAnterior = Array.isArray(cliLog?.aura_chat_log) ? cliLog.aura_chat_log : [];
      const idxHoje = logAnterior.findIndex(s => (s.data || "").startsWith(hoje));
      const novoLog = idxHoje >= 0
        ? logAnterior.map((s, i) => i === idxHoje ? { ...s, mensagens: chat_log, atualizado_em: sessaoData } : s)
        : [...logAnterior, { data: sessaoData, mensagens: chat_log }];
      await sb.from("clientes").update({ aura_chat_log: novoLog }).eq("id", clienteId);
    } catch (e) { console.warn("chat_log save error:", e); }
  }

  // Dispara SMS e e-mail apenas no primeiro cadastro (não em updates progressivos)
  if (!isNewClient) return res.status(200).json({ ok: true, clienteId, updated: true });

  // Buscar toggles de automação
  const { data: cfgDisparos } = await sb.from("configuracoes")
    .select("fluxo_boas_vindas_email_ativa, fluxo_boas_vindas_sms_ativa, fluxo_notificacao_artista_ativa")
    .eq("user_id", row.user_id).single();

  const zenviaKey = process.env.ZENVIA_API_KEY;
  const fn = nome.trim().split(" ")[0];

  // E-mail de boas-vindas ao cliente (controlado por fluxo_boas_vindas_email_ativa)
  const resendKey = process.env.RESEND_API_KEY;

  // E-mail de alerta interno ao profissional responsável
  if (cfgDisparos?.fluxo_notificacao_artista_ativa !== false && resendKey) {
    const emailArtista = artista && artista.toLowerCase().includes("camilla")
      ? "camilla-acampos@hotmail.com"
      : "estudioabraaotattoo07@gmail.com";
    const emailFrom2 = process.env.EMAIL_REMETENTE || "contato@acasadoscarvalhotattoo.com.br";
    const htmlAlerta =
      "<div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;padding:28px'>" +
      "<p style='font-size:18px;font-weight:700;color:#c9a84c;margin-bottom:4px'>✦ Novo lead — " + nome + "</p>" +
      "<hr style='border:none;border-top:1px solid #c9a84c33;margin-bottom:18px'>" +
      "<table style='width:100%;border-collapse:collapse;font-size:13px'>" +
      "<tr><td style='padding:7px 0;color:#888;width:130px'>Nome</td><td style='color:#222'>" + nome + "</td></tr>" +
      "<tr><td style='padding:7px 0;color:#888'>Telefone</td><td style='color:#222'>" + (tel || "—") + "</td></tr>" +
      "<tr><td style='padding:7px 0;color:#888'>E-mail</td><td style='color:#222'>" + (email || "—") + "</td></tr>" +
      "<tr><td style='padding:7px 0;color:#888'>Ideia / projeto</td><td style='color:#222'>" + (ideaFinal || "—") + "</td></tr>" +
      "<tr><td style='padding:7px 0;color:#888'>Região</td><td style='color:#222'>" + (regiao || "—") + "</td></tr>" +
      "<tr><td style='padding:7px 0;color:#888'>Instagram</td><td style='color:#222'>" + (insta || "—") + "</td></tr>" +
      "<tr><td style='padding:7px 0;color:#888'>Artista</td><td style='color:#222'>" + (artista || "A definir") + "</td></tr>" +
      "</table>" +
      "<p style='margin-top:20px;font-size:12px;color:#aaa'>Entre no INK SYSTEM para dar andamento.</p></div>";
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
      body: JSON.stringify({ from: emailFrom2, to: [emailArtista], subject: "✦ Novo lead — " + nome, html: htmlAlerta })
    }).catch(e => console.warn("Email artista error:", e));
  }
  if (cfgDisparos?.fluxo_boas_vindas_email_ativa !== false && resendKey && email) {
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
