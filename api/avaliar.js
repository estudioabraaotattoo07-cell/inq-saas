import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const GOOGLE_REVIEW_URL = "https://g.page/r/CSIFD3cla6rxEBM/review";

function paginaAvaliacao(token, mensagem, subtext, mostrarFeedback) {
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
  .notas a{display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;transition:transform .1s}
  .notas a:hover{transform:scale(1.1)}
  .nota-baixa{background:#2a2a2a;color:#aaa;border:1px solid #333}
  .nota-alta{background:#d4a84b;color:#111;border:1px solid #d4a84b}
  .icon{font-size:48px;margin-bottom:16px}
  textarea{width:100%;background:#111;border:1px solid #333;border-radius:8px;color:#f0ede8;font-family:Georgia,serif;font-size:14px;padding:12px;resize:vertical;min-height:100px;margin-bottom:16px}
  textarea:focus{outline:none;border-color:#d4a84b}
  button{background:#d4a84b;color:#111;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:bold;cursor:pointer;width:100%}
  button:hover{opacity:.9}
  .footer{font-size:11px;color:#444;margin-top:28px}
</style>
</head>
<body>
<div class="card">
  <div class="logo">Casa dos Carvalho Tattoo</div>
  ${mensagem}
  ${mostrarFeedback ? `
  <form method="POST" action="/api/avaliar?token=${token}&acao=feedback">
    <textarea name="feedback" placeholder="Conta pra gente o que aconteceu. Cada detalhe nos ajuda a melhorar..."></textarea>
    <button type="submit">Enviar feedback</button>
  </form>
  ` : ""}
  <div class="footer">Vitória, ES • acasadoscarvalhotattoo.com.br</div>
</div>
</body>
</html>`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { token, nota, acao } = req.method === "POST"
    ? { ...req.query, ...req.body }
    : req.query;

  if (!token) {
    return res.status(400).send(paginaAvaliacao("", "<h1>Link inválido.</h1>", "", false));
  }

  // POST: salvar feedback textual (nota < 8)
  if (acao === "feedback") {
    const feedback = (req.body && req.body.feedback) || "";
    if (feedback && token) {
      await sb.from("clientes").update({
        obs: sb.rpc ? undefined : undefined // apenas log; evitar sobrescrever obs existente
      }).eq("id", token);
      // Registra no histórico
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
    const msg = "<div class='icon'>🙏</div><h1>Obrigado pelo feedback!</h1><p class='sub'>Cada retorno é muito valioso para a gente. Vamos trabalhar para melhorar sempre.</p>";
    return res.status(200).send(paginaAvaliacao(token, msg, "", false));
  }

  // GET sem nota: exibir tela de escolha
  if (!nota) {
    const botoes = [1,2,3,4,5,6,7,8,9,10].map(n =>
      `<a href="/api/avaliar?token=${token}&nota=${n}" class="${n >= 8 ? "nota-alta" : "nota-baixa"}">${n}</a>`
    ).join("");
    const msg =
      "<h1>Como foi sua experiência<br>na Casa dos Carvalho?</h1>" +
      "<p class='sub'>De 1 a 10 — sua avaliação nos ajuda a continuar fazendo o que amamos. 🖤</p>" +
      "<div class='notas'>" + botoes + "</div>";
    return res.status(200).send(paginaAvaliacao(token, msg, "", false));
  }

  const notaNum = parseInt(nota, 10);
  if (isNaN(notaNum) || notaNum < 1 || notaNum > 10) {
    return res.status(400).send(paginaAvaliacao(token, "<h1>Nota inválida.</h1>", "", false));
  }

  // Salvar nota no banco
  try {
    await sb.from("clientes").update({ stars: notaNum }).eq("id", token);
    await sb.from("clientes").select("nome, user_id").eq("id", token).single().then(({ data }) => {
      if (data) {
        sb.from("historico").insert({
          data: new Date().toLocaleDateString("pt-BR"),
          hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          acao: "Avaliação recebida: " + notaNum + "/10 — " + data.nome,
          user_id: data.user_id
        });
      }
    });
  } catch {}

  // Nota >= 8: redireciona para Google
  if (notaNum >= 8) {
    return res.redirect(302, GOOGLE_REVIEW_URL);
  }

  // Nota < 8: mostrar formulário de feedback interno
  const msg =
    "<div class='icon'>💬</div>" +
    "<h1>Que pena que não foi perfeito...</h1>" +
    "<p class='sub'>Nos conta o que aconteceu. Levamos cada feedback muito a sério — é assim que a gente cresce.</p>";
  return res.status(200).send(paginaAvaliacao(token, msg, "", true));
}
