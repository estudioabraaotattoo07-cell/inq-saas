import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const GOOGLE_REVIEW_URL = "https://g.page/r/CSIFD3cla6rxEBM/review";

// Estilo premium compartilhado por todas as paginas publicas server-rendered
// (confirmacao, avaliacao NPS, convite Google) -- mesmo padrao visual do app:
// fundo com brilho violeta, quadro com moldura dourada neon, botoes em pilula.
const PAGE_STYLE = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,serif;background:radial-gradient(ellipse 700px 420px at 50% -5%, rgba(139,92,222,0.3), transparent 65%), #0A0A0A;color:#E8E2D9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:radial-gradient(ellipse 320px 160px at 50% -10%, rgba(139,92,222,0.22), transparent 70%), linear-gradient(180deg, #1A1A1A, #0F0F0F);border:1.5px solid rgba(201,168,76,0.4);border-radius:20px;max-width:460px;width:100%;padding:40px 32px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,0.75), 0 0 34px rgba(201,168,76,0.16)}
.logo-img{width:min(220px,70%);height:auto;margin:0 auto 24px}
h1{font-size:20px;font-weight:normal;color:#E8E2D9;line-height:1.5;margin-bottom:12px}
.sub{font-size:14px;color:#A09585;line-height:1.7;margin-bottom:24px}
.icon{font-size:48px;margin-bottom:16px}
.caixa{background:#050505;border:1px solid rgba(201,168,76,0.15);border-radius:8px;padding:14px;font-size:13px;color:#C9BFB2;text-align:left;line-height:1.7;margin-bottom:12px;white-space:pre-wrap;box-shadow:inset 0 2px 6px rgba(0,0,0,0.5)}
textarea{width:100%;background:#050505;border:1px solid rgba(201,168,76,0.15);border-radius:8px;color:#E8E2D9;font-family:Georgia,serif;font-size:14px;padding:12px;resize:vertical;min-height:100px;margin-bottom:16px;box-shadow:inset 0 2px 6px rgba(0,0,0,0.5)}
button,button[type=submit],.btn-g{display:block;width:100%;background:linear-gradient(135deg,#E8C97A,#C9A84C 45%,#8a6a24);color:#17140A;border:1px solid rgba(255,224,160,0.6);border-radius:999px;padding:14px;font-size:15px;font-weight:700;cursor:pointer;font-family:Georgia,serif;text-decoration:none;box-shadow:0 4px 16px rgba(201,168,76,0.3),inset 0 1px 0 rgba(255,255,255,0.35);margin-bottom:8px}
.btn-copy{background:rgba(255,255,255,0.03);color:var(--gold,#C9A84C);border:1px solid rgba(201,168,76,0.4);border-radius:999px;padding:10px 20px;font-size:13px;cursor:pointer;width:100%;font-family:Georgia,serif}
.nota-btn,.notas a{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:999px;text-decoration:none;font-size:15px;font-weight:bold;margin:4px;border:1px solid rgba(201,168,76,0.2)}
.baixa,.nota-baixa{background:#050505;color:#A09585}
.alta,.nota-alta{background:linear-gradient(135deg,#E8C97A,#C9A84C 45%,#8a6a24);color:#17140A;border-color:rgba(255,224,160,0.6)}
.footer{font-size:11px;color:#4a4235;margin-top:28px;letter-spacing:.05em;text-transform:uppercase}`;
const PAGE_LOGO = `<img class="logo-img" src="https://inq-saas.vercel.app/logo-ink-system.png" alt="INK SYSTEM">`;

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
        <button type="submit" style="background:linear-gradient(135deg,#4fd68a,#27AE60 60%,#1c8a4b);color:#0A1A10;border-color:rgba(160,255,200,0.5);margin-bottom:12px">✅ Confirmo minha presença</button>
      </form>
      <form method="POST">
        <input type="hidden" name="resposta" value="precisa_remarcar">
        <button type="submit" style="background:linear-gradient(135deg,#e57368,#C0392B 60%,#8a281c);color:#1A0A0A;border-color:rgba(255,190,180,0.5)">❌ Preciso remarcar</button>
      </form>
    `,
  }[estado] || "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confirmação de Presença</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<div class="card">
  ${PAGE_LOGO}
  ${conteudo}
  <div class="footer">Powered by INK SYSTEM</div>
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
<title>Avaliação</title>
<style>${PAGE_STYLE}</style>
</head>
<body>
<div class="card">
  ${PAGE_LOGO}
  ${mensagem}
  ${mostrarFeedback ? `<form method="POST" action="/api/lead?acao=feedback&token=${token}"><textarea name="feedback" placeholder="Conta pra gente o que aconteceu..."></textarea><button type="submit">Enviar feedback</button></form>` : ""}
  <div class="footer">Powered by INK SYSTEM</div>
</div>
</body>
</html>`;
}

function paginaAvaliacaoNps(estado, cli, nota) {
  const nome = cli?.nome ? cli.nome.split(" ")[0] : "Olá";

  const conteudos = {
    invalido: `<div class="icon">❌</div><h1>Link inválido</h1><p class="sub">Este link não foi encontrado. Entre em contato com o estúdio.</p>`,
    expirado: `<div class="icon">⏰</div><h1>Link expirado</h1><p class="sub">Este link passou da data de validade. Entre em contato com o estúdio.</p>`,
    escala: `<h1>Olá, ${nome}!</h1><p class="sub">Foi uma alegria ter você aqui. Sua opinião nos ajuda a continuar evoluindo e a receber cada cliente com ainda mais cuidado.</p><p style="font-size:15px;color:#f0ede8;margin-bottom:20px"><strong>Como você avalia sua experiência conosco?</strong></p><div style="display:flex;flex-wrap:wrap;justify-content:center;margin-bottom:20px">${[0,1,2,3,4,5,6,7,8,9,10].map(n=>`<a href="?nota=${n}" class="nota-btn ${n>=7?"alta":"baixa"}">${n}</a>`).join("")}</div><p style="font-size:11px;color:#555">0 = extremamente insatisfeito · 10 = extremamente satisfeito</p>`,
    comentario_positivo: `<div class="icon">🙏</div><h1>Que alegria, ${nome}!</h1><p class="sub">Conta pra gente com suas próprias palavras o que foi mais especial — pode ser a tatuagem, o atendimento, a atmosfera do estúdio, qualquer coisa que tenha marcado você.</p><form method="POST"><input type="hidden" name="nota" value="${nota}"><textarea name="comentario" placeholder="Escreva aqui..." required></textarea><button type="submit">Enviar avaliação</button></form>`,
    comentario_negativo: `<div class="icon">💬</div><h1>Obrigado pela honestidade</h1><p class="sub">Queremos entender o que aconteceu para melhorar. Pode nos contar com calma o que não foi como você esperava?</p><form method="POST"><input type="hidden" name="nota" value="${nota}"><textarea name="comentario" placeholder="Conte o que aconteceu..." required></textarea><button type="submit">Enviar</button></form>`,
    obrigado_positivo: `<div class="icon">🖤</div><h1>Obrigado, ${nome}!</h1><p class="sub">Sua avaliação foi registrada. Em breve você receberá mais um recadinho nosso.</p>`,
    obrigado_negativo: `<div class="icon">🙏</div><h1>Obrigado pela honestidade, ${nome}</h1><p class="sub">Cada retorno nos ajuda a melhorar. Vamos levar sua experiência muito a sério.</p>`,
  };

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avaliação</title><style>${PAGE_STYLE}</style></head><body><div class="card">${PAGE_LOGO}${conteudos[estado] || ""}<div class="footer">Powered by INK SYSTEM</div></div></body></html>`;
}

function paginaGoogleResposta(estado, cli, googleLink) {
  const nome = cli?.nome ? cli.nome.split(" ")[0] : "Olá";
  const comentario = cli?.avaliacao_comentario || "";

  const conteudos = {
    invalido: `<div class="icon">❌</div><h1>Link inválido</h1><p class="sub">Entre em contato com o estúdio.</p>`,
    sim: `<div class="icon">🙏</div><h1>Que generoso da sua parte, ${nome}!</h1><p class="sub">Para facilitar, aqui está o que você já escreveu sobre sua experiência. Copie e cole direto no Google:</p><div class="caixa" id="txt">${comentario.replace(/</g,"&lt;")}</div><button class="btn-copy" onclick="navigator.clipboard.writeText(document.getElementById('txt').innerText).then(()=>{this.textContent='✓ Copiado!'})">Copiar texto</button><br><br><a class="btn-g" href="${googleLink || "https://g.page/r/"}" target="_blank">Abrir avaliação no Google →</a>`,
    nao: `<div class="icon">🖤</div><h1>Tudo bem, ${nome}!</h1><p class="sub">Obrigado por ter avaliado sua experiência conosco — isso já nos ajuda muito. Até a próxima sessão!</p>`,
  };

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Avaliação Google</title><style>${PAGE_STYLE}</style></head><body><div class="card">${PAGE_LOGO}${conteudos[estado] || ""}<div class="footer">Powered by INK SYSTEM</div></div></body></html>`;
}

function paginaSiteIndisponivel() {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Site indisponível</title><style>${PAGE_STYLE}</style></head><body><div class="card">${PAGE_LOGO}<div class="icon">🖤</div><h1>Este site não está disponível no momento.</h1><div class="footer">Powered by INK SYSTEM</div></div></body></html>`;
}

// Molde "Premium" — site publico do tenant, gerado a partir de site_conteudo +
// configuracoes + artistas (colunas foto_site_url/bio_site/portfolio_fotos).
// Publicacao automatica: nao ha build, o HTML e montado na hora a cada visita.
function paginaSitePremium(site, cfg, artistas, slug) {
  const nomeEstudio = cfg?.studio_name || "Estúdio";
  const local = [cfg?.studio_city, cfg?.studio_estado].filter(Boolean).join(" · ");
  const tel = (cfg?.studio_tel || "").replace(/\D/g, "");
  const waLink = tel ? `https://wa.me/55${tel}` : "#";
  const heroFoto = site.hero_foto_url || "";
  const linhas = (site.hero_frase || `Arte na pele, criada\na partir da sua história.`).split("\n");
  const heroHeadline = linhas.map(l => esc(l)).join("<br>");

  const artistasHtml = (artistas || []).map((a, i) => {
    const fotos = Array.isArray(a.portfolio_fotos) ? a.portfolio_fotos : [];
    const igHandle = (a.insta || "").replace(/^@/, "");
    // Esteira roda sozinha: a lista de fotos é duplicada e anda -50% em loop,
    // criando a ilusão de rolagem infinita sem salto no fim. Duração calculada
    // por velocidade constante (~70px/s, mesmo ritmo do site real) em vez de um
    // tempo fixo — senão poucas fotos ficam lentas e muitas fotos ficam rápidas.
    const dir = i % 2 === 0 ? "go-right" : "go-left";
    const largItem = 204; // 200px de foto + 4px de gap
    const duracaoSeg = Math.max(12, Math.round((fotos.length * largItem) / 70));
    const fotosStrip = fotos.length > 0
      ? [...fotos, ...fotos].map(f => `<div class="strip-item"><img src="${esc(f)}" alt=""></div>`).join("")
      : "";
    return `
    <div class="artist-row">
      <img class="artist-photo" src="${esc(a.foto_site_url || "")}" alt="${esc(a.nome)}">
      <div class="artist-info">
        <div class="artist-eyebrow">Trabalhos de:</div>
        <div class="artist-name">${esc(a.nome)}</div>
        ${a.bio_site ? `<div class="artist-tagline">${esc(a.bio_site)}</div>` : ""}
        ${igHandle ? `<a class="ig-link" href="https://instagram.com/${esc(igHandle)}" target="_blank">@${esc(igHandle)}</a>` : ""}
        <a class="btn-gold" href="javascript:void(0)" onclick="AuraChat.abrir('${esc(a.nome).replace(/'/g, "\\'")}')" style="margin-top:18px">✦ Quero tatuar com ${esc((a.nome || "").split(" ")[0])}</a>
      </div>
    </div>
    ${fotos.length > 0 ? `<div class="strip-outer"><div class="strip-track ${dir}" style="animation-duration:${duracaoSeg}s">${fotosStrip}</div></div>` : ""}`;
  }).join("");

  const depoimentos = Array.isArray(site.depoimentos) ? site.depoimentos : [];
  const depoimentosHtml = depoimentos.map(d => `
    <div class="depo-card">
      <div class="depo-stars">${"★".repeat(Math.max(1, Math.min(5, d.estrelas || 5)))}</div>
      <p class="depo-text">"${esc(d.texto || "")}"</p>
      <span class="depo-author">— ${esc(d.autor || "")}</span>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(nomeEstudio)} – Estúdio de Tatuagem</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--gold:#C9A84C;--gold-dim:rgba(201,168,76,0.35);--bg:#080808;--off:#e8e4dc;--dim:rgba(255,255,255,0.38);--pad:52px}
html{scroll-behavior:smooth}
body{background:var(--bg);color:#fff;font-family:"Montserrat",sans-serif;overflow-x:hidden}
.nav{position:fixed;top:0;left:0;right:0;z-index:300;display:flex;align-items:center;justify-content:space-between;padding:14px var(--pad);background:rgba(8,8,8,0.93);backdrop-filter:blur(14px);border-bottom:0.5px solid rgba(255,255,255,0.05)}
.nav-name{font-size:9px;font-weight:500;letter-spacing:3px;color:var(--off);text-transform:uppercase}
.nav-cta{font-size:7.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--gold);border:1px solid var(--gold);padding:10px 22px;background:transparent;text-decoration:none;white-space:nowrap}
.hero{position:relative;width:100%;height:100vh;min-height:500px;overflow:hidden}
.hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(0.52)}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(8,8,8,0.1) 0%,rgba(8,8,8,0.05) 25%,rgba(8,8,8,0.35) 55%,rgba(8,8,8,0.78) 72%,rgba(8,8,8,0.96) 87%,#080808 100%)}
.hero-text{position:absolute;bottom:0;left:0;right:0;z-index:3;text-align:center;padding:0 24px 36px}
.hero-location{font-size:8px;font-weight:400;letter-spacing:5px;color:rgba(232,228,220,0.5);text-transform:uppercase;margin-bottom:14px}
.hero-headline{font-family:"Cormorant Garamond",serif;font-size:clamp(28px,5vw,64px);font-weight:300;line-height:1.02;color:#fff;text-transform:uppercase}
.cta-zone{background:var(--bg);padding:44px var(--pad);display:flex;justify-content:center}
.btn-gold{display:inline-flex;align-items:center;gap:10px;font-size:8px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#000;background:var(--gold);padding:16px 36px;text-decoration:none;white-space:nowrap}
.manifesto{padding:56px var(--pad) 96px;text-align:center}
.manifesto-quote{font-family:"Cormorant Garamond",serif;font-size:clamp(22px,3.8vw,48px);font-weight:300;font-style:italic;color:var(--off);line-height:1.25;max-width:820px;margin:0 auto}
.portfolio-block{padding:64px 0 0}
.artist-row{display:flex;align-items:flex-end;padding:0 var(--pad);margin-bottom:28px;gap:22px}
.artist-photo{width:140px;height:185px;object-fit:cover;flex-shrink:0}
.artist-eyebrow{font-size:7.5px;font-weight:500;letter-spacing:4px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
.artist-name{font-family:"Cormorant Garamond",serif;font-size:clamp(22px,2.8vw,34px);font-weight:300;color:#fff;margin-bottom:6px}
.artist-tagline{font-size:10px;color:var(--dim);letter-spacing:1px;margin-bottom:12px;max-width:360px}
.ig-link{display:inline-block;font-size:10px;font-weight:500;letter-spacing:2px;color:var(--gold);text-decoration:none}
.strip-outer{overflow:hidden;position:relative;padding-bottom:40px}
.strip-outer::before,.strip-outer::after{content:"";position:absolute;top:0;bottom:40px;width:80px;z-index:10;pointer-events:none}
.strip-outer::before{left:0;background:linear-gradient(to right,var(--bg),transparent)}
.strip-outer::after{right:0;background:linear-gradient(to left,var(--bg),transparent)}
.strip-track{display:flex;gap:4px;width:max-content}
.strip-track.go-right{animation:goRight 45s linear infinite}
.strip-track.go-left{animation:goLeft 45s linear infinite}
.strip-outer:hover .strip-track{animation-play-state:paused}
@keyframes goRight{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
@keyframes goLeft{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.strip-item{width:200px;height:255px;flex-shrink:0;overflow:hidden;background:#111}
.strip-item img{width:100%;height:100%;object-fit:cover}
.como{padding:88px var(--pad);border-top:0.5px solid rgba(255,255,255,0.04)}
.como-title{font-family:"Cormorant Garamond",serif;font-size:clamp(26px,3.8vw,44px);font-weight:300;text-align:center;margin-bottom:56px}
.como-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:40px}
.como-step{text-align:center}
.como-num{font-family:"Cormorant Garamond",serif;font-size:46px;font-weight:300;color:rgba(201,168,76,0.11);margin-bottom:14px}
.como-name{font-size:8.5px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
.como-desc{font-size:11px;color:var(--dim);line-height:1.9}
.depo{padding:72px var(--pad);background:#0a0a0a}
.depo-title{font-family:"Cormorant Garamond",serif;font-size:clamp(24px,3vw,32px);font-weight:300;text-align:center;margin-bottom:40px}
.depo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:960px;margin:0 auto}
.depo-card{padding:24px 20px;border:0.5px solid rgba(255,255,255,0.06)}
.depo-stars{color:var(--gold);font-size:10px;letter-spacing:3px;margin-bottom:12px}
.depo-text{font-size:11px;color:var(--dim);line-height:1.85;font-style:italic;margin-bottom:16px}
.depo-author{font-size:7.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.3)}
.banner{position:relative;width:100%;overflow:hidden}
.banner-img{display:block;width:100%;height:auto;min-height:400px;object-fit:cover;filter:brightness(0.42)}
.banner-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,#080808 0%,rgba(8,8,8,0.08) 20%,rgba(8,8,8,0.08) 65%,rgba(8,8,8,0.75) 84%,#080808 100%)}
.banner-bottom{position:absolute;bottom:0;left:0;right:0;z-index:2;padding:0 var(--pad) 56px;text-align:center}
.banner-title{font-family:"Cormorant Garamond",serif;font-size:clamp(28px,5vw,58px);font-weight:300;line-height:1.05;color:#fff;margin-bottom:14px}
.banner-body{font-size:11.5px;color:rgba(232,228,220,0.5);line-height:1.9;max-width:520px;margin:0 auto}
footer{border-top:0.5px solid rgba(255,255,255,0.06);padding:36px var(--pad) 28px;background:#050505;text-align:center}
.footer-line{font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:1px;margin-bottom:6px}
.footer-bottom{margin-top:20px;font-size:7.5px;color:rgba(255,255,255,0.18);letter-spacing:1.5px}
.aura-fab{position:fixed;bottom:26px;right:26px;z-index:220;height:52px;padding:0 22px;border-radius:999px;background:linear-gradient(135deg,#E8C97A,#C9A84C 45%,#8a6a24);display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 22px rgba(201,168,76,0.4);cursor:pointer;font-size:13px;font-weight:700;letter-spacing:.03em;color:#17140A;border:none;font-family:"Montserrat",sans-serif;white-space:nowrap}
.aura-wa-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;box-sizing:border-box;background:#25D366;color:#fff;border:none;border-radius:999px;padding:11px;font-size:12px;font-weight:700;text-decoration:none;font-family:"Montserrat",sans-serif}
.aura-panel{display:none;flex-direction:column;position:fixed;bottom:26px;right:26px;z-index:230;width:340px;max-width:calc(100vw - 32px);height:480px;max-height:calc(100vh - 60px);background:radial-gradient(ellipse 300px 160px at 50% -10%, rgba(139,92,222,0.2), transparent 70%), linear-gradient(180deg,#151515,#0A0A0A);border:1px solid rgba(201,168,76,0.35);border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.6);overflow:hidden;font-family:"Montserrat",sans-serif}
.aura-head{padding:14px 16px;background:rgba(0,0,0,0.3);border-bottom:1px solid rgba(201,168,76,0.2);display:flex;justify-content:space-between;align-items:center;font-size:12px;letter-spacing:1px;color:var(--gold)}
.aura-close{cursor:pointer;color:var(--dim);font-size:14px}
.aura-msgs{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px}
.aura-msg-bot{background:rgba(255,255,255,0.06);color:#f0ede8;padding:9px 12px;border-radius:10px 10px 10px 2px;font-size:12.5px;line-height:1.5;max-width:85%;align-self:flex-start}
.aura-msg-user{background:var(--gold);color:#17140A;padding:9px 12px;border-radius:10px 10px 2px 10px;font-size:12.5px;line-height:1.5;max-width:85%;align-self:flex-end;font-weight:600}
.aura-input-area{padding:12px 14px;border-top:1px solid rgba(201,168,76,0.15);display:flex;gap:8px;flex-wrap:wrap}
.aura-btns{display:flex;gap:8px;flex-wrap:wrap;width:100%}
.aura-btn{background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.4);color:var(--gold);padding:8px 14px;border-radius:20px;font-size:11.5px;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block}
.aura-btn:hover{background:rgba(201,168,76,0.2)}
.aura-text-input{flex:1;background:#050505;border:1px solid rgba(201,168,76,0.25);border-radius:20px;padding:9px 14px;color:#fff;font-size:12.5px;font-family:inherit;outline:none;min-width:0}
.aura-send-btn{background:var(--gold);color:#17140A;border:none;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:14px;flex-shrink:0}
@media(max-width:480px){.aura-panel{width:100vw;height:100vh;max-height:100vh;max-width:100vw;bottom:0;right:0;border-radius:0}}
@media(max-width:768px){:root{--pad:20px}.como-grid{grid-template-columns:repeat(2,1fr)}.depo-grid{grid-template-columns:1fr}.artist-row{flex-direction:column;align-items:flex-start;text-align:left}}
</style>
</head>
<body>
<nav class="nav">
  <span class="nav-name">${esc(nomeEstudio)}</span>
  <a class="nav-cta" href="javascript:void(0)" onclick="AuraChat.abrir()">✦ Marque seu horário</a>
</nav>
<section class="hero">
  ${heroFoto ? `<img class="hero-img" src="${esc(heroFoto)}" alt="${esc(nomeEstudio)}">` : ""}
  <div class="hero-overlay"></div>
  <div class="hero-text">
    ${local ? `<p class="hero-location">${esc(local)}</p>` : ""}
    <h1 class="hero-headline">${heroHeadline}</h1>
  </div>
</section>
<div class="cta-zone"><a class="btn-gold" href="javascript:void(0)" onclick="AuraChat.abrir()">✦ Quero tatuar com vocês!</a></div>
${site.manifesto_frase ? `<section class="manifesto"><blockquote class="manifesto-quote">"${esc(site.manifesto_frase)}"</blockquote></section>` : ""}
<section class="portfolio-block">${artistasHtml}</section>
<section class="como">
  <h2 class="como-title">No estúdio é assim:</h2>
  <div class="como-grid">
    <div class="como-step"><div class="como-num">01</div><div class="como-name">Conversa</div><div class="como-desc">Você conta a sua história, referências e intenção. Sem pressa.</div></div>
    <div class="como-step"><div class="como-num">02</div><div class="como-name">Criação</div><div class="como-desc">Desenvolvemos, do zero, a melhor arte pra você.</div></div>
    <div class="como-step"><div class="como-num">03</div><div class="como-name">Execução</div><div class="como-desc">Sessão focada, com técnica e atenção total ao seu conforto.</div></div>
    <div class="como-step"><div class="como-num">04</div><div class="como-name">Cuidado</div><div class="como-desc">Acompanhamento da cicatrização e garantia de resultado.</div></div>
  </div>
</section>
${depoimentosHtml ? `<section class="depo"><h2 class="depo-title">Nossos clientes dizem:</h2><div class="depo-grid">${depoimentosHtml}</div></section>` : ""}
${site.banner_foto_url ? `<section class="banner">
  <img class="banner-img" src="${esc(site.banner_foto_url)}" alt="${esc(nomeEstudio)}">
  <div class="banner-overlay"></div>
  <div class="banner-bottom">
    ${site.banner_titulo ? `<div class="banner-title">${esc(site.banner_titulo)}</div>` : ""}
    ${site.banner_texto ? `<p class="banner-body">${esc(site.banner_texto)}</p>` : ""}
  </div>
</section>` : ""}
<footer>
  ${local ? `<div class="footer-line">${esc(local)}</div>` : ""}
  <div class="footer-line">© ${new Date().getFullYear()} ${esc(nomeEstudio)}</div>
  <div class="footer-bottom">Powered by INK SYSTEM</div>
</footer>
<button id="aura-fab" class="aura-fab" onclick="AuraChat.abrir()">✦ Marque agora</button>
<div id="aura-panel" class="aura-panel">
  <div class="aura-head"><span>✦ Fale com a gente</span><span class="aura-close" onclick="AuraChat.fechar()">✕</span></div>
  <div id="aura-msgs" class="aura-msgs"></div>
  <div id="aura-input-area" class="aura-input-area"></div>
</div>
<script>
(function(){
  var ARTISTAS = ${JSON.stringify((artistas || []).map(a => a.nome))};
  var SLUG = ${JSON.stringify(slug || "")};
  var WA_LINK = ${JSON.stringify(waLink)};
  var NOME_ESTUDIO = ${JSON.stringify(nomeEstudio)};
  var lead = {};
  var aberto = false;

  function $(id){ return document.getElementById(id); }

  function abrir(artistaPreEscolhido){
    if (!aberto) {
      aberto = true;
      $('aura-panel').style.display = 'flex';
      $('aura-fab').style.display = 'none';
    }
    if ($('aura-msgs').children.length === 0) {
      if (artistaPreEscolhido) lead._artistaSugerido = artistaPreEscolhido;
      passoNome();
    }
  }
  function fechar(){
    aberto = false;
    $('aura-panel').style.display = 'none';
    $('aura-fab').style.display = 'flex';
  }

  function botMsg(texto){
    var d = document.createElement('div');
    d.className = 'aura-msg-bot';
    d.textContent = texto;
    $('aura-msgs').appendChild(d);
    $('aura-msgs').scrollTop = $('aura-msgs').scrollHeight;
  }
  function userMsg(texto){
    var d = document.createElement('div');
    d.className = 'aura-msg-user';
    d.textContent = texto;
    $('aura-msgs').appendChild(d);
    $('aura-msgs').scrollTop = $('aura-msgs').scrollHeight;
  }
  function mostrarBotoes(opcoes, onEscolher){
    var area = $('aura-input-area');
    area.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'aura-btns';
    opcoes.forEach(function(op){
      var b = document.createElement('button');
      b.className = 'aura-btn';
      b.textContent = op;
      b.onclick = function(){ userMsg(op); area.innerHTML = ''; onEscolher(op); };
      wrap.appendChild(b);
    });
    area.appendChild(wrap);
  }
  function mostrarInput(placeholder, onEnviar){
    var area = $('aura-input-area');
    area.innerHTML = '';
    var inp = document.createElement('input');
    inp.className = 'aura-text-input';
    inp.placeholder = placeholder;
    var btn = document.createElement('button');
    btn.className = 'aura-send-btn';
    btn.textContent = '→';
    function enviar(){
      var v = inp.value.trim();
      if (!v) return;
      userMsg(v);
      area.innerHTML = '';
      onEnviar(v);
    }
    btn.onclick = enviar;
    inp.onkeydown = function(e){ if (e.key === 'Enter') enviar(); };
    area.appendChild(inp);
    area.appendChild(btn);
    inp.focus();
  }

  function salvar(campos){
    Object.assign(lead, campos);
    var payload = Object.assign({}, lead, { slug: SLUG, orig: 'Site' });
    delete payload._artistaSugerido;
    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(function(){});
  }

  function passoNome(){
    botMsg('Olá! Eu sou a Aura e sou responsável por cadastrar você no ecossistema do ' + NOME_ESTUDIO + '. Como você se chama?');
    mostrarInput('Seu nome', function(nome){ lead.nome = nome; passoTelefone(); });
  }
  function passoTelefone(){
    botMsg('Muito prazer, ' + lead.nome.split(' ')[0] + '! Por gentileza, você pode me informar o seu número de WhatsApp?');
    mostrarInput('(99) 99999-9999', function(tel){ salvar({ nome: lead.nome, tel: tel }); passoArtista(); });
  }
  function passoArtista(){
    if (lead._artistaSugerido) { salvar({ artista: lead._artistaSugerido }); return passoIdeia(); }
    if (ARTISTAS.length <= 1) { salvar({ artista: ARTISTAS[0] || '' }); return passoIdeia(); }
    botMsg('Vendo os trabalhos dos profissionais, com qual você se identificou mais?');
    var area = $('aura-input-area');
    area.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'aura-btns';
    ARTISTAS.forEach(function(art, i){
      var b = document.createElement('button');
      b.className = 'aura-btn';
      b.textContent = '(' + (i + 1) + ') ' + art;
      b.onclick = function(){ userMsg(art); area.innerHTML = ''; salvar({ artista: art }); passoIdeia(); };
      wrap.appendChild(b);
    });
    area.appendChild(wrap);
  }
  function passoIdeia(){
    botMsg('Me conta um pouco sobre a ideia que você tem em mente:');
    mostrarInput('Sua ideia...', function(idea){ salvar({ idea: idea }); passoRegiao(); });
  }
  function passoRegiao(){
    botMsg('Em qual região do corpo?');
    mostrarInput('Ex: braço, costas...', function(regiao){ salvar({ regiao: regiao }); passoClassificacao(); });
  }
  function passoClassificacao(){
    botMsg('Você já está pronto pra tatuar ou prefere conversar antes?');
    mostrarBotoes(['🎯 Já decidi, quero agendar', '💬 Quero conversar antes'], function(op){
      var etapa = op.indexOf('conversar') !== -1 ? 'lead_morno' : 'aura_agend';
      salvar({ etapa: etapa });
      passoFinal();
    });
  }
  function passoFinal(){
    botMsg('Perfeito! Já registrei tudo por aqui — nossa equipe vai entrar em contato em breve. 🖤');
    var area = $('aura-input-area');
    area.innerHTML = '';
    var a = document.createElement('a');
    a.href = WA_LINK; a.target = '_blank'; a.className = 'aura-wa-btn';
    a.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.32-1.94 1.4-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.2-1.18-1.56-1.18-2.98s.75-2.11 1.02-2.4c.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.36Z"/></svg>Falar agora no WhatsApp';
    area.appendChild(a);
  }

  window.AuraChat = { abrir: abrir, fechar: fechar };
})();
</script>
</body>
</html>`;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const acao = req.query && req.query.acao;
  const token = req.query && req.query.token;
  const nota = req.query && req.query.nota;

  // ── SITE PÚBLICO DO TENANT (molde Premium) ──────────────────────────────────
  if (acao === "site") {
    const slug = (req.query?.slug || "").trim();
    if (!slug) return res.status(400).send(paginaSiteIndisponivel());
    const { data: tenant } = await sb.from("ink_clientes").select("auth_user_id, status").eq("slug", slug).single();
    if (!tenant || tenant.status !== "ativo") return res.status(404).send(paginaSiteIndisponivel());
    const uid = tenant.auth_user_id;
    const [{ data: site }, { data: cfg }, { data: artistas }] = await Promise.all([
      sb.from("site_conteudo").select("*").eq("user_id", uid).single(),
      sb.from("configuracoes").select("studio_name, studio_tel, studio_city, studio_estado").eq("user_id", uid).single(),
      sb.from("artistas").select("nome, insta, foto_site_url, bio_site, portfolio_fotos").eq("user_id", uid).eq("ativo", true).order("nome"),
    ]);
    if (!site || !site.publicado) return res.status(404).send(paginaSiteIndisponivel());
    return res.status(200).send(paginaSitePremium(site, cfg, artistas || [], slug));
  }

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
    const { data: cfg } = await sb.from("configuracoes").select("google_link, google_avaliacao_link").eq("user_id", cli.user_id).single();
    return res.status(200).send(paginaGoogleResposta("sim", cli, cfg?.google_avaliacao_link || cfg?.google_link));
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
      const msg = "<h1>Como foi sua experiência<br>conosco?</h1><p class='sub'>De 1 a 10 — sua avaliação nos ajuda a continuar fazendo o que amamos. 🖤</p><div class='notas'>" + botoes + "</div>";
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
      return res.status(200).send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmação</title><style>${PAGE_STYLE}</style></head><body><div class="card">${PAGE_LOGO}<div class="icon">🖤</div><h1>Tudo bem, ${(cli.nome || "").split(" ")[0]}!</h1><p class="sub">Seu projeto continua guardado com carinho. Entraremos em contato novamente em 30 dias.</p><div class="footer">Powered by INK SYSTEM</div></div></body></html>`);
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

  const { nome, tel, email, idea, ideia, artista, insta, regiao, nascimento, referencias, orig, obs: obsExtra, chat_log, etapa: etapaSolicitada, slug: siteSlug } = req.body;
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
    etapa: etapaSolicitada || "lead",
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

  // Site do tenant manda `slug` -- resolve o dono certo. Sem slug (chat antigo
  // da Casa dos Carvalho, que não manda esse campo), mantém o comportamento
  // de sempre pra não quebrar nada em produção.
  row.user_id = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";
  if (siteSlug) {
    const { data: tenantLead } = await sb.from("ink_clientes").select("auth_user_id").eq("slug", siteSlug).single();
    if (tenantLead?.auth_user_id) row.user_id = tenantLead.auth_user_id;
  }

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
  let matchInfo = null;
  {
    const telDigits = tel ? tel.replace(/[^0-9]/g, "").slice(-11) : null;
    const emailNorm = email ? email.trim().toLowerCase() : null;
    const { data: existentes } = await sb.from("clientes").select("id,tel,nome,email,insta,descricao,nascimento,artista,regiao,etapa,projetos").eq("user_id", row.user_id);
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
      // Classificação (Sessão/Consulta/Aguardando nova solicitação) só move a etapa
      // quando o chat explicitamente pedir — nunca sobrescreve silenciosamente
      // uma etapa mais avançada do pipeline (ex: cliente já com Sessão Marcada).
      if (etapaSolicitada) {
        updateFields.etapa = etapaSolicitada;
        updateFields.etapa_desde = new Date().toISOString();
      }
      await sb.from("clientes").update(updateFields).eq("id", match.id);
      clienteId = match.id;
      isNewClient = false;
      matchInfo = {
        artista: updateFields.artista || match.artista || null,
        etapa: match.etapa || null,
        projetos: match.projetos || [],
      };
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

  // Dispara e-mail/SMS só quando o lead vira Solicitação de Consulta ou de Sessão
  // (intenção real de agendar) -- lead frio/morno que só passou nome+telefone e
  // sumiu não notifica, fica só visível no Pipeline quando o estúdio abrir o CRM.
  // Pensado pro modelo SaaS: cliente vai ter cota limitada de e-mail/SMS por mês.
  const deveNotificar = !!etapaSolicitada;
  if (!isNewClient) {
    if (!deveNotificar) return res.status(200).json({ ok: true, clienteId, updated: true, ...matchInfo });
  } else if (!deveNotificar) {
    return res.status(200).json({ ok: true, clienteId });
  }

  // Buscar toggles de automação + dados do estúdio
  const { data: cfgDisparos } = await sb.from("configuracoes")
    .select("fluxo_boas_vindas_email_ativa, fluxo_boas_vindas_sms_ativa, fluxo_notificacao_artista_ativa, studio_name, studio_email, studio_tel, studio_city, studio_estado")
    .eq("user_id", row.user_id).single();
  const nomeEstudioLead = cfgDisparos?.studio_name || "seu estúdio";

  const zenviaKey = process.env.ZENVIA_API_KEY;
  const fn = (nome || "").trim().split(" ")[0] || "Cliente";

  // E-mail de boas-vindas ao cliente (controlado por fluxo_boas_vindas_email_ativa)
  const resendKey = process.env.RESEND_API_KEY;

  // E-mail de alerta interno ao profissional responsável
  if (cfgDisparos?.fluxo_notificacao_artista_ativa !== false && resendKey) {
    let emailArtista = cfgDisparos?.studio_email || null;
    if (artista) {
      try {
        const { data: artRow } = await sb.from("artistas").select("email").ilike("nome", "%" + artista.split(" ")[0] + "%").eq("user_id", row.user_id).limit(1).single();
        if (artRow?.email) emailArtista = artRow.email;
      } catch {}
    }
    const emailFrom2 = process.env.EMAIL_REMETENTE || "";
    if (emailArtista) {
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
  }
  if (cfgDisparos?.fluxo_boas_vindas_email_ativa !== false && resendKey && email) {
    const emailFrom = process.env.EMAIL_REMETENTE || "";
    const artistaNome = artista || null;
    const waNumero = cfgDisparos?.studio_tel ? "55" + cfgDisparos.studio_tel.replace(/\D/g, "") : "";
    const waLink = waNumero ? "https://wa.me/" + waNumero : "";
    const cidadeLead = [cfgDisparos?.studio_city, cfgDisparos?.studio_estado].filter(Boolean).join(", ");
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
      "<p style='font-size:22px;font-weight:bold;color:#1a1a1a;margin-bottom:4px'>" + nomeEstudioLead + "</p>" +
      "<hr style='border:none;border-top:1px solid #d4a84b;margin-bottom:24px'>" +
      "<p style='font-size:16px'>Olá, <strong>" + fn + "</strong>!</p>" +
      "<p style='line-height:1.8;color:#333'>Que alegria receber sua ideia aqui na " + nomeEstudioLead + ". Já registramos tudo com cuidado" +
      (artistaNome ? " — e vimos que você tem interesse em tatuar com <strong>" + artistaNome + "</strong>!" : "!") + "</p>" +
      "<p style='line-height:1.8;color:#333'>Em até 24h, alguém da nossa equipe vai te ligar pessoalmente para conversar sobre os detalhes do seu projeto. Sem formulário, sem robô — conversa de gente pra gente.</p>" +
      (waLink ? "<p style='line-height:1.8;color:#333'>Se preferir adiantar por WhatsApp, é só chamar a gente aqui:</p><p><a href='" + waLink + "' style='display:inline-block;background:#d4a84b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:bold'>💬 Chamar no WhatsApp</a></p>" : "") +
      "<p style='line-height:1.8;color:#333;margin-top:20px'>Trabalhamos só com hora marcada, então cada projeto recebe atenção total — do primeiro traço ao último detalhe.</p>" +
      "<p style='margin-top:8px;line-height:1.8;color:#333'><strong>Resumo do que registramos:</strong></p>" +
      resumoDados +
      "<p style='line-height:1.8;color:#333;margin-top:16px'>Obrigado por escolher fazer parte da nossa família. Já estamos ansiosos para te conhecer. 🖤</p>" +
      "<p style='margin-top:32px;font-size:12px;color:#999'>Com carinho,<br><strong>" + nomeEstudioLead + "</strong>" + (cidadeLead ? " — " + cidadeLead : "") + "</p>" +
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
