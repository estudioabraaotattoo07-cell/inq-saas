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
function paginaSitePremium(site, cfg, artistas, slug, campanhasAtivas, plano) {
  const carrosselAutomatico = plano === "Ouro";
  const nomeEstudio = cfg?.studio_name || "Estúdio";
  const local = [cfg?.studio_city, cfg?.studio_estado].filter(Boolean).join(" · ");
  const tel = (cfg?.studio_tel || "").replace(/\D/g, "");
  const waLink = tel ? `https://wa.me/55${tel}` : "#";
  const heroFoto = site.hero_foto_url || "";
  const linhas = (site.hero_frase || `Arte na pele, criada\na partir da sua história.`).split("\n");
  const heroHeadline = linhas.map(l => esc(l)).join("<br>");

  // Cores/estilo personalizados — exclusivo plano Ouro (trava fica no CRM,
  // aqui só aplica o que já foi salvo; sem estilo salvo = visual padrão de sempre).
  const est = site.estilo || {};
  const corFundo = /^#[0-9a-f]{3,8}$/i.test(est.corFundo || "") ? est.corFundo : "#080808";
  // Brilho de canto do fundo (superior-esquerdo + inferior-direito) — mesmo padrão
  // visual do CRM/admin, com cor e intensidade editáveis (exclusivo Ouro).
  const corBrilho = /^#[0-9a-f]{3,8}$/i.test(est.corBrilho || "") ? est.corBrilho : "#8B5CDE";
  const hexToRgb = (hex) => {
    const h = hex.replace("#", "");
    const n = h.length === 3 ? h.split("").map(c => c + c).join("") : h.slice(0, 6);
    const num = parseInt(n, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };
  const [brR, brG, brB] = hexToRgb(corBrilho);
  const intensidadeBrilhoOpacidade = { sutil: 0.14, medio: 0.24, forte: 0.36 }[est.intensidadeBrilho] || 0.24;
  const fundoComBrilho = `radial-gradient(700px 700px at -10% -10%, rgba(${brR},${brG},${brB},${intensidadeBrilhoOpacidade}), transparent 60%) fixed, radial-gradient(700px 700px at 110% 110%, rgba(${brR},${brG},${brB},${intensidadeBrilhoOpacidade}), transparent 60%) fixed, ${corFundo}`;
  const corBotao1 = /^#[0-9a-f]{3,8}$/i.test(est.corBotao1 || "") ? est.corBotao1 : "#E8C97A";
  const corBotao2 = /^#[0-9a-f]{3,8}$/i.test(est.corBotao2 || "") ? est.corBotao2 : "#8a6a24";
  const corTitulo = /^#[0-9a-f]{3,8}$/i.test(est.corTitulo || "") ? est.corTitulo : "#ffffff";
  const corCorpo = /^#[0-9a-f]{3,8}$/i.test(est.corCorpo || "") ? est.corCorpo : "rgba(255,255,255,0.38)";
  const radius = { arredondado: "14px", capsula: "999px" }[est.cantos] || "0px";
  const glow = { nenhum: "0px", suave: "10px", intenso: "26px" }[est.brilho] || "0px";
  const velocidadeMult = { lento: 1.6, normal: 1, rapido: 0.6 }[est.velocidadeCarrossel] || 1;

  // Composições de fonte prontas (título + corpo já combinados por um designer)
  // em vez de escolher cada fonte solta — mais fácil de acertar visualmente.
  // Só carrega no Google Fonts as 2 famílias da composição escolhida, não as 12.
  const FONT_PRESETS = {
    classico: { nome: "Clássico Elegante", titulo: "'Cormorant Garamond',serif", corpo: "'Montserrat',sans-serif", google: "Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500;600" },
    editorial: { nome: "Editorial Moderno", titulo: "'Playfair Display',serif", corpo: "'Inter',sans-serif", google: "Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600" },
    minimalista: { nome: "Minimalista", titulo: "'Poppins',sans-serif", corpo: "'Inter',sans-serif", google: "Poppins:wght@300;500;600&family=Inter:wght@300;400;500" },
    vintage: { nome: "Vintage", titulo: "'Abril Fatface',serif", corpo: "'Lato',sans-serif", google: "Abril+Fatface&family=Lato:wght@300;400;600" },
    urbano: { nome: "Urbano", titulo: "'Bebas Neue',sans-serif", corpo: "'Roboto',sans-serif", google: "Bebas+Neue&family=Roboto:wght@300;400;500" },
    sofisticado: { nome: "Sofisticado", titulo: "'Cormorant',serif", corpo: "'Work Sans',sans-serif", google: "Cormorant:wght@300;500;600&family=Work+Sans:wght@300;400;500" },
    gotico: { nome: "Gótico", titulo: "'Cinzel',serif", corpo: "'Nunito Sans',sans-serif", google: "Cinzel:wght@400;600&family=Nunito+Sans:wght@300;400;600" },
    artdeco: { nome: "Art Déco", titulo: "'Poiret One',sans-serif", corpo: "'Raleway',sans-serif", google: "Poiret+One&family=Raleway:wght@300;400;500" },
    rustico: { nome: "Rústico", titulo: "'Special Elite',cursive", corpo: "'Roboto Condensed',sans-serif", google: "Special+Elite&family=Roboto+Condensed:wght@300;400;500" },
    futurista: { nome: "Futurista", titulo: "'Orbitron',sans-serif", corpo: "'Rubik',sans-serif", google: "Orbitron:wght@400;600;700&family=Rubik:wght@300;400;500" },
    autoral: { nome: "Autoral", titulo: "'Caveat',cursive", corpo: "'Montserrat',sans-serif", google: "Caveat:wght@500;700&family=Montserrat:wght@300;400;500" },
    serifmoderna: { nome: "Serifada Moderna", titulo: "'Fraunces',serif", corpo: "'DM Sans',sans-serif", google: "Fraunces:wght@400;600&family=DM+Sans:wght@300;400;500" },
  };
  const fontePreset = FONT_PRESETS[est.fontePreset] || FONT_PRESETS.classico;
  const fonteTitulo = fontePreset.titulo;
  const fonteCorpo = fontePreset.corpo;
  const googleFontsHref = `https://fonts.googleapis.com/css2?family=${fontePreset.google}&display=swap`;

  const IG_ICON = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.24 2.23.41.56.21.96.47 1.38.89.42.42.68.82.89 1.38.17.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.24 1.8-.41 2.23-.21.56-.47.96-.89 1.38-.42.42-.82.68-1.38.89-.42.17-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.24-2.23-.41a3.7 3.7 0 0 1-1.38-.89 3.7 3.7 0 0 1-.89-1.38c-.17-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.24-1.8.41-2.23.21-.56.47-.96.89-1.38.42-.42.82-.68 1.38-.89.42-.17 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14c-.3.76-.5 1.64-.56 2.91C0 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 24 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0Z" fill="currentColor"/><path d="M12 5.84A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4Z" fill="currentColor"/><circle cx="18.41" cy="5.59" r="1.44" fill="currentColor"/></svg>`;
  const EXPAND_ICON = `<svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`;
  const stripIdsComFotos = [];
  const artistasHtml = (artistas || []).map((a, artIdx) => {
    const fotos = Array.isArray(a.portfolio_fotos) ? a.portfolio_fotos : [];
    const stripId = `strip-${artIdx}`;
    if (fotos.length > 0) stripIdsComFotos.push(stripId);
    const igHandle = (a.insta || "").replace(/^@/, "");
    const bioLen = (a.bio_site || "").length;
    const bioFontSize = bioLen > 350 ? 8.5 : bioLen > 220 ? 9.5 : 10;
    // Esteira roda sozinha: a lista de fotos é duplicada e anda -50% em loop,
    // criando a ilusão de rolagem infinita sem salto no fim. Duração calculada
    // por velocidade constante (~70px/s, mesmo ritmo do site real) em vez de um
    // tempo fixo — senão poucas fotos ficam lentas e muitas fotos ficam rápidas.
    // Todas as esteiras andam pro mesmo lado (decisão 2026-07-13).
    const dir = carrosselAutomatico ? "go-right" : "";
    const largItem = 204; // 200px de foto + 4px de gap
    const duracaoSeg = Math.max(12, Math.round((fotos.length * largItem) / 70 * velocidadeMult));
    const fotosStrip = fotos.length > 0
      ? [...fotos, ...fotos].map(f => `<div class="strip-item" data-src="${esc(f)}"><img src="${esc(f)}" alt=""><div class="strip-ov"><div class="strip-exp">${EXPAND_ICON}</div></div></div>`).join("")
      : "";
    return `
    <div class="artist-row">
      <img class="artist-photo" src="${esc(a.foto_site_url || "")}" alt="${esc(a.nome)}">
      <div class="artist-info">
        <div class="artist-eyebrow">Trabalhos de:</div>
        <div class="artist-name">${esc(a.nome)}</div>
        ${a.bio_site ? `<div class="artist-tagline" style="font-size:${bioFontSize}px">${esc(a.bio_site)}</div>` : ""}
        ${igHandle ? `<a class="ig-link" href="https://instagram.com/${esc(igHandle)}" target="_blank">${IG_ICON}${esc(a.botao_social_label || ("@" + igHandle))}</a>` : ""}
        <a class="btn-gold" href="javascript:void(0)" onclick="AuraChat.abrir('${esc(a.nome).replace(/'/g, "\\'")}')" style="margin-top:18px">✦ Quero tatuar com ${esc((a.nome || "").split(" ")[0])}</a>
      </div>
    </div>
    ${fotos.length > 0 ? `<div class="strip-outer">
      <div class="strip-track ${dir}" id="${stripId}" style="animation-duration:${duracaoSeg}s">${fotosStrip}</div>
      <div class="strip-nav strip-nav-prev" onclick="stripArrow('${stripId}','prev')"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
      <div class="strip-nav strip-nav-next" onclick="stripArrow('${stripId}','next')"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
    </div>` : ""}`;
  }).join("");

  const passosDefault = [
    { nome: "Conversa", desc: "Você conta a sua história, referências e intenção. Sem pressa." },
    { nome: "Criação", desc: "Desenvolvemos, do zero, a melhor arte pra você." },
    { nome: "Execução", desc: "Sessão focada, com técnica e atenção total ao seu conforto." },
    { nome: "Cuidado", desc: "Acompanhamento da cicatrização e garantia de resultado." },
  ];
  const comoPassos = Array.isArray(site.como_passos) && site.como_passos.length > 0 ? site.como_passos : passosDefault;
  const comoPassosHtml = comoPassos.map((p, i) => `<div class="como-step"><div class="como-num">${String(i + 1).padStart(2, "0")}</div><div class="como-name">${esc(p.nome || "")}</div><div class="como-desc">${esc(p.desc || "")}</div></div>`).join("");

  const depoimentos = Array.isArray(site.depoimentos) ? site.depoimentos : [];
  const depoimentosHtml = depoimentos.map(d => `
    <div class="depo-card">
      <div class="depo-stars">${"★".repeat(Math.max(1, Math.min(5, d.estrelas || 5)))}</div>
      <p class="depo-text">"${esc(d.texto || "")}"</p>
      <span class="depo-author">— ${esc(d.autor || "")}</span>
      ${d.imagem_url ? `<div class="depo-print-link" onclick="lbOpenImg('${esc(d.imagem_url).replace(/'/g, "\\'")}')"><img class="depo-print" src="${esc(d.imagem_url)}" alt="Print do depoimento"></div>` : ""}
    </div>`).join("");

  const ogDescricao = (site.manifesto_frase || site.hero_frase || `Arte na pele, criada a partir da sua história.`).replace(/\n/g, " ");
  const ogUrl = slug ? `https://inksystem.com.br/${esc(slug)}` : "";
  // Categoria vem de Configurações > Configurações avançadas — texto livre,
  // default cobre o único caso real hoje (estúdio de tatuagem), mas não deve
  // ser fixo no código pra não "mentir" se um dia outro segmento comprar o sistema.
  const categoriaNegocio = cfg?.categoria_negocio || "Estúdio de tatuagem";
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: nomeEstudio,
    description: categoriaNegocio,
    ...(cfg?.studio_city ? { address: { "@type": "PostalAddress", addressLocality: cfg.studio_city, addressRegion: cfg.studio_estado || undefined } } : {}),
    ...(tel ? { telephone: `+55${tel}` } : {}),
    ...(heroFoto ? { image: heroFoto } : {}),
    ...(ogUrl ? { url: ogUrl } : {}),
  };
  const pixelId = (cfg?.meta_pixel_id || "").replace(/[^0-9]/g, "");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(nomeEstudio)} – ${esc(categoriaNegocio)}</title>
<meta name="description" content="${esc(ogDescricao)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(nomeEstudio)}">
<meta property="og:description" content="${esc(ogDescricao)}">
${heroFoto ? `<meta property="og:image" content="${esc(heroFoto)}">` : ""}
${ogUrl ? `<meta property="og:url" content="${ogUrl}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(localBusinessJsonLd)}</script>
${pixelId ? `<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${esc(pixelId)}');
fbq('track', 'PageView');
</script>` : ""}
<link href="${googleFontsHref}" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--gold:${corBotao1};--gold-2:${corBotao2};--gold-dim:rgba(201,168,76,0.35);--bg:${corFundo};--off:#e8e4dc;--dim:${corCorpo};--pad:52px;--radius:${radius};--font-titulo:${fonteTitulo};--font-corpo:${fonteCorpo};--cor-titulo:${corTitulo};--glow:${glow}}
html{scroll-behavior:smooth}
body{background:${fundoComBrilho};color:var(--cor-titulo);font-family:var(--font-corpo);overflow-x:hidden}
.nav{position:fixed;top:0;left:0;right:0;z-index:300;display:flex;align-items:center;justify-content:space-between;padding:14px var(--pad);background:rgba(8,8,8,0.93);backdrop-filter:blur(14px);border-bottom:0.5px solid rgba(255,255,255,0.05)}
.nav-name{font-size:9px;font-weight:500;letter-spacing:3px;color:var(--off);text-transform:uppercase}
.nav-cta{font-size:7.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--gold);border:1px solid var(--gold);padding:10px 22px;background:transparent;text-decoration:none;white-space:nowrap}
.hero{position:relative;width:100%;height:100vh;min-height:500px;overflow:hidden}
.hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(0.52)}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(8,8,8,0.1) 0%,rgba(8,8,8,0.05) 25%,rgba(8,8,8,0.35) 55%,rgba(8,8,8,0.78) 72%,rgba(8,8,8,0.96) 87%,#080808 100%)}
.hero-text{position:absolute;bottom:0;left:0;right:0;z-index:3;text-align:center;padding:0 24px 36px}
.hero-location{font-size:8px;font-weight:400;letter-spacing:5px;color:rgba(232,228,220,0.5);text-transform:uppercase;margin-bottom:14px}
.hero-headline{font-family:var(--font-titulo);font-size:clamp(28px,5vw,64px);font-weight:300;line-height:1.02;color:var(--cor-titulo);text-transform:uppercase}
.cta-zone{background:var(--bg);padding:44px var(--pad);display:flex;justify-content:center}
.btn-gold{display:inline-flex;align-items:center;gap:10px;font-size:8px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#000;background:linear-gradient(135deg,var(--gold),var(--gold-2));border-radius:var(--radius);padding:16px 36px;text-decoration:none;white-space:nowrap;box-shadow:0 0 var(--glow) var(--gold-dim)}
.manifesto{padding:56px var(--pad) 96px;text-align:center}
.manifesto-quote{font-family:var(--font-titulo);font-size:clamp(22px,3.8vw,48px);font-weight:300;font-style:italic;color:var(--off);line-height:1.25;max-width:820px;margin:0 auto}
.portfolio-block{padding:64px 0 0}
.artist-row{display:flex;align-items:flex-end;padding:0 var(--pad);margin-bottom:28px;gap:22px}
.artist-photo{width:140px;height:185px;object-fit:cover;flex-shrink:0;border-radius:var(--radius)}
.artist-eyebrow{font-size:7.5px;font-weight:500;letter-spacing:4px;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
.artist-name{font-family:var(--font-titulo);font-size:clamp(22px,2.8vw,34px);font-weight:300;color:var(--cor-titulo);margin-bottom:6px}
.artist-tagline{font-size:10px;color:var(--dim);letter-spacing:1px;margin-bottom:12px;max-width:360px}
.ig-link{display:inline-flex;align-items:center;gap:8px;font-size:8px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);background:transparent;border:1px solid var(--gold);border-radius:var(--radius);padding:14px 28px;text-decoration:none;white-space:nowrap;margin-bottom:10px}
.strip-outer{overflow:hidden;position:relative;padding-bottom:40px}
.strip-nav{position:absolute;top:0;bottom:40px;width:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:15;opacity:0;transition:opacity .25s}
.strip-outer:hover .strip-nav{opacity:1}
.strip-nav svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2;filter:drop-shadow(0 1px 3px rgba(0,0,0,.7))}
.strip-nav-prev{left:4px}
.strip-nav-next{right:4px}
.strip-outer::before,.strip-outer::after{content:"";position:absolute;top:0;bottom:40px;width:80px;z-index:10;pointer-events:none}
.strip-outer::before{left:0;background:linear-gradient(to right,var(--bg),transparent)}
.strip-outer::after{right:0;background:linear-gradient(to left,var(--bg),transparent)}
.strip-track{display:flex;gap:4px;width:max-content}
.strip-track.go-right{animation:goRight 45s linear infinite}
.strip-track.go-left{animation:goLeft 45s linear infinite}
.strip-outer:hover .strip-track{animation-play-state:paused}
@keyframes goRight{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
@keyframes goLeft{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.strip-item{width:200px;height:255px;flex-shrink:0;overflow:hidden;background:#111;border-radius:var(--radius);position:relative;cursor:pointer}
.strip-item img{width:100%;height:100%;object-fit:cover;pointer-events:none}
.strip-ov{position:absolute;inset:0;background:rgba(0,0,0,0);transition:background .3s;display:flex;align-items:center;justify-content:center}
.strip-item:hover .strip-ov{background:rgba(0,0,0,0.22)}
.strip-exp{opacity:0;transition:opacity .3s;width:36px;height:36px;border-radius:50%;background:rgba(201,168,76,0.9);display:flex;align-items:center;justify-content:center}
.strip-item:hover .strip-exp{opacity:1}
.strip-exp svg{width:13px;height:13px;stroke:#000;fill:none;stroke-width:2}
.depo-print-link{cursor:pointer}
.lb{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.96);display:none;align-items:center;justify-content:center}
.lb.open{display:flex}
.lb-img{max-width:75vw;max-height:75vh;object-fit:contain;width:auto;height:auto;border-radius:var(--radius)}
.lb-close{position:absolute;top:18px;right:20px;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;border:0.5px solid rgba(255,255,255,0.1);transition:border-color .2s}
.lb-close:hover{border-color:var(--gold)}
.lb-close svg{width:15px;height:15px;stroke:#fff;fill:none;stroke-width:1.5}
.lb-nav{position:absolute;top:50%;transform:translateY(-50%);width:42px;height:42px;cursor:pointer;display:flex;align-items:center;justify-content:center;border:0.5px solid rgba(255,255,255,0.1);transition:border-color .2s}
.lb-nav:hover{border-color:var(--gold)}
.lb-nav svg{width:15px;height:15px;stroke:#fff;fill:none;stroke-width:1.5}
.lb-prev{left:16px}.lb-next{right:16px}
.como{padding:88px var(--pad);border-top:0.5px solid rgba(255,255,255,0.04)}
.como-title{font-family:var(--font-titulo);font-size:clamp(26px,3.8vw,44px);font-weight:300;text-align:center;margin-bottom:56px}
.como-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:40px}
.como-step{text-align:center}
.como-num{font-family:var(--font-titulo);font-size:46px;font-weight:300;color:rgba(201,168,76,0.11);margin-bottom:14px}
.como-name{font-size:8.5px;font-weight:600;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
.como-desc{font-size:11px;color:var(--dim);line-height:1.9}
.depo{padding:72px var(--pad);background:#0a0a0a}
.depo-title{font-family:var(--font-titulo);font-size:clamp(24px,3vw,32px);font-weight:300;text-align:center;margin-bottom:40px}
.depo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:960px;margin:0 auto}
.depo-card{padding:24px 20px;border:0.5px solid rgba(255,255,255,0.06);border-radius:var(--radius)}
.depo-stars{color:var(--gold);font-size:10px;letter-spacing:3px;margin-bottom:12px}
.depo-text{font-size:11px;color:var(--dim);line-height:1.85;font-style:italic;margin-bottom:16px}
.depo-author{font-size:7.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.3)}
.depo-print-link{display:block;margin-top:12px}
.depo-print{width:100%;max-height:140px;object-fit:cover;border:0.5px solid rgba(255,255,255,0.1);border-radius:var(--radius);cursor:pointer;display:block}
.banner{position:relative;width:100%;overflow:hidden}
.banner-img{display:block;width:100%;height:auto;min-height:400px;object-fit:cover;filter:brightness(0.42)}
.banner-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,#080808 0%,rgba(8,8,8,0.08) 20%,rgba(8,8,8,0.08) 65%,rgba(8,8,8,0.75) 84%,#080808 100%)}
.banner-bottom{position:absolute;bottom:0;left:0;right:0;z-index:2;padding:0 var(--pad) 56px;text-align:center}
.banner-title{font-family:var(--font-titulo);font-size:clamp(28px,5vw,58px);font-weight:300;line-height:1.05;color:var(--cor-titulo);margin-bottom:14px}
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
.aura-msgs>div:first-child{margin-top:auto}
.aura-msg-bot{background:rgba(255,255,255,0.06);color:#f0ede8;padding:9px 12px;border-radius:10px 10px 10px 2px;font-size:12.5px;line-height:1.5;max-width:85%;align-self:flex-start;white-space:pre-line}
.aura-msg-user{background:var(--gold);color:#17140A;padding:9px 12px;border-radius:10px 10px 2px 10px;font-size:12.5px;line-height:1.5;max-width:85%;align-self:flex-end;font-weight:600}
.aura-input-area{padding:12px 14px;border-top:1px solid rgba(201,168,76,0.15);display:flex;gap:8px;flex-wrap:wrap}
.aura-btns{display:flex;gap:8px;flex-wrap:wrap;width:100%}
.aura-btn{background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.4);color:var(--gold);padding:8px 14px;border-radius:20px;font-size:11.5px;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-block}
.aura-btn:hover{background:rgba(201,168,76,0.2)}
.aura-text-input{flex:1;background:#050505;border:1px solid rgba(201,168,76,0.25);border-radius:20px;padding:9px 14px;color:#fff;font-size:12.5px;font-family:inherit;outline:none;min-width:0}
.aura-send-btn{background:var(--gold);color:#17140A;border:none;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:14px;flex-shrink:0}
@media(max-width:480px){.aura-panel{width:100vw;height:100vh;max-height:100vh;max-width:100vw;bottom:0;right:0;border-radius:0}}
@media(max-width:768px){:root{--pad:20px}.como-grid{grid-template-columns:repeat(2,1fr)}.depo-grid{grid-template-columns:1fr}.artist-row{flex-direction:column;align-items:flex-start;text-align:left}.strip-nav{opacity:0.85}}
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
<div class="cta-zone"><a class="btn-gold" href="javascript:void(0)" onclick="AuraChat.abrir()">✦ ${esc(site.hero_botao_texto || "Quero tatuar com vocês!")}</a></div>
${site.manifesto_frase ? `<section class="manifesto"><blockquote class="manifesto-quote">"${esc(site.manifesto_frase)}"</blockquote></section>` : ""}
<section class="portfolio-block">${artistasHtml}</section>
<section class="como">
  <h2 class="como-title">${esc(site.como_titulo || "No estúdio é assim:")}</h2>
  <div class="como-grid">
    ${comoPassosHtml}
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
<div class="lb" id="lb">
  <div class="lb-close" id="lb-x"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
  <div class="lb-nav lb-prev" id="lb-prev"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
  <img class="lb-img" id="lb-img" src="" alt="">
  <div class="lb-nav lb-next" id="lb-next"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
</div>
<button id="aura-fab" class="aura-fab" onclick="AuraChat.abrir()">✦ Marque agora</button>
<div id="aura-panel" class="aura-panel">
  <div class="aura-head"><span>✦ Fale com a gente</span><span class="aura-close" onclick="AuraChat.fechar()">✕</span></div>
  <div id="aura-msgs" class="aura-msgs"></div>
  <div id="aura-input-area" class="aura-input-area"></div>
</div>
<script>
// Lightbox das fotos (esteira de portfólio + print de depoimento) + arraste
// manual da esteira (mouse/touch) e setas laterais -- mesmo padrão do site
// real (a-casa-dos-carvalho), adaptado pra N artistas dinâmicos.
var lbImgs = [], lbIdx = 0, lbMode = "strip";
function lbOpen(src, sid) {
  lbMode = "strip";
  var t = document.getElementById(sid);
  // A esteira duplica as fotos pra rolar em loop sem salto -- remove repetidas
  // aqui pra prev/next não ficar andando em círculo duas vezes por volta.
  lbImgs = t ? Array.from(new Set(Array.from(t.querySelectorAll(".strip-item")).map(function (el) { return el.dataset.src; }))) : [src];
  lbIdx = Math.max(0, lbImgs.indexOf(src));
  document.getElementById("lb-img").src = lbImgs[lbIdx] || src;
  document.getElementById("lb-prev").style.display = "flex";
  document.getElementById("lb-next").style.display = "flex";
  document.getElementById("lb").classList.add("open");
  document.querySelectorAll(".strip-track").forEach(function (el) { el.classList.add("paused"); });
}
function lbOpenImg(src) {
  lbMode = "single";
  document.getElementById("lb-img").src = src;
  document.getElementById("lb-prev").style.display = "none";
  document.getElementById("lb-next").style.display = "none";
  document.getElementById("lb").classList.add("open");
}
function lbClose() {
  document.getElementById("lb").classList.remove("open");
  document.querySelectorAll(".strip-track").forEach(function (el) { el.classList.remove("paused"); });
}
document.getElementById("lb").addEventListener("click", function (e) { if (e.target === document.getElementById("lb")) lbClose(); });
document.getElementById("lb-x").onclick = lbClose;
document.getElementById("lb-prev").onclick = function (e) { e.stopPropagation(); lbIdx = (lbIdx - 1 + lbImgs.length) % lbImgs.length; document.getElementById("lb-img").src = lbImgs[lbIdx]; };
document.getElementById("lb-next").onclick = function (e) { e.stopPropagation(); lbIdx = (lbIdx + 1) % lbImgs.length; document.getElementById("lb-img").src = lbImgs[lbIdx]; };
document.addEventListener("keydown", function (e) {
  if (!document.getElementById("lb").classList.contains("open")) return;
  if (e.key === "Escape") lbClose();
  if (lbMode === "strip" && e.key === "ArrowLeft") { lbIdx = (lbIdx - 1 + lbImgs.length) % lbImgs.length; document.getElementById("lb-img").src = lbImgs[lbIdx]; }
  if (lbMode === "strip" && e.key === "ArrowRight") { lbIdx = (lbIdx + 1) % lbImgs.length; document.getElementById("lb-img").src = lbImgs[lbIdx]; }
});

var CLICK_THRESH = 10;
var stripArrowFns = {};
function getStripOffset(track) { return new DOMMatrix(getComputedStyle(track).transform).m41; }
function setStripOffset(track, x) { track.style.transform = "translateX(" + x + "px)"; }
function stripArrow(trackId, dir) {
  var fn = stripArrowFns[trackId];
  if (fn) fn(dir);
}
function setupStrip(trackId) {
  var track = document.getElementById(trackId);
  if (!track) return;
  var outer = track.closest(".strip-outer");
  var isDrag = false, startX = 0, startOffset = 0, velX = 0, lastX = 0, lastT = 0, animFrame = null, dragDist = 0;
  function startDrag(x) {
    isDrag = true; dragDist = 0; startX = x; lastX = x; lastT = Date.now();
    startOffset = getStripOffset(track); track.classList.add("paused"); track.style.transition = "none";
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }
  function moveDrag(x) {
    if (!isDrag) return;
    dragDist = Math.abs(x - startX); velX = (x - lastX) / (Date.now() - lastT || 1) * 16;
    lastX = x; lastT = Date.now(); setStripOffset(track, startOffset + (x - startX));
  }
  function endDrag() {
    if (!isDrag) return; isDrag = false; track.style.transition = "";
    var vel = velX;
    function inertia() {
      if (Math.abs(vel) < 0.5) { track.classList.remove("paused"); return; }
      vel *= 0.92; setStripOffset(track, getStripOffset(track) + vel); animFrame = requestAnimationFrame(inertia);
    }
    if (Math.abs(vel) > 1) inertia(); else track.classList.remove("paused");
  }
  outer.addEventListener("mousedown", function (e) { startDrag(e.pageX); e.preventDefault(); });
  document.addEventListener("mousemove", function (e) { if (isDrag) moveDrag(e.pageX); });
  document.addEventListener("mouseup", endDrag);
  outer.addEventListener("touchstart", function (e) { startDrag(e.touches[0].pageX); }, { passive: true });
  outer.addEventListener("touchmove", function (e) { moveDrag(e.touches[0].pageX); }, { passive: true });
  outer.addEventListener("touchend", endDrag);
  outer.addEventListener("mouseenter", function () { if (!isDrag) track.classList.add("paused"); });
  outer.addEventListener("mouseleave", function () { if (!isDrag && !document.getElementById("lb").classList.contains("open")) track.classList.remove("paused"); });
  Array.from(track.querySelectorAll(".strip-item")).forEach(function (item) {
    item.addEventListener("click", function () {
      if (dragDist > CLICK_THRESH) return;
      lbOpen(item.dataset.src, trackId);
    });
  });
  stripArrowFns[trackId] = function (dir) {
    track.classList.add("paused"); track.style.transition = "transform .4s ease";
    setStripOffset(track, getStripOffset(track) + (dir === "next" ? -204 : 204));
    setTimeout(function () { track.style.transition = ""; }, 400);
  };
}
${stripIdsComFotos.map(id => `setupStrip(${JSON.stringify(id)});`).join("\n")}
</script>
<script>
(function(){
  var API_BASE = 'https://inq-saas.vercel.app';
  var ARTISTAS = ${JSON.stringify((artistas || []).map(a => a.nome))};
  var SLUG = ${JSON.stringify(slug || "")};
  var WA_LINK = ${JSON.stringify(waLink)};
  var NOME_ESTUDIO = ${JSON.stringify(nomeEstudio)};
  // Só a existência/link -- a palavra secreta em si nunca é exposta no HTML,
  // fica só no banco pra validação server-side (senão qualquer um vendo o
  // código-fonte da página descobriria a palavra sem precisar dela de verdade).
  var CAMPANHAS_ATIVAS = ${JSON.stringify((campanhasAtivas || []).map(c => ({ link: c.link_divulgacao || "" })))};
  var ORIGEM_SLUG = (function(){
    try { return new URLSearchParams(window.location.search).get('origem') || ''; } catch (e) { return ''; }
  })();
  var lead = {};
  var aberto = false;

  function $(id){ return document.getElementById(id); }

  var cliqueContado = false;
  function abrir(artistaPreEscolhido){
    if (!aberto) {
      aberto = true;
      $('aura-panel').style.display = 'flex';
      $('aura-fab').style.display = 'none';
    }
    if (!cliqueContado) {
      cliqueContado = true;
      if (SLUG) fetch(API_BASE + '/api/lead?acao=track_click&slug=' + encodeURIComponent(SLUG), { method: 'POST', keepalive: true }).catch(function(){});
    }
    if ($('aura-msgs').children.length === 0) {
      if (artistaPreEscolhido) lead.artista = artistaPreEscolhido;
      passoBoasVindas();
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
    var payload = Object.assign({}, lead, { slug: SLUG, orig: 'Site', origem_slug: ORIGEM_SLUG });
    delete payload._jaECliente;
    delete payload._temCampanha;
    delete payload._clienteId;
    if (lead._clienteId) payload.clienteId = lead._clienteId;
    // Depois do primeiro salvamento bem-sucedido, todas as respostas seguintes
    // dessa mesma conversa mandam o clienteId junto -- sem isso, uma resposta
    // com telefone/e-mail ainda incompletos (ex: nao digitou nada valido ainda)
    // nao encontra o registro que acabou de ser criado e cria um cliente novo
    // a cada pergunta, em vez de ir completando o mesmo.
    return fetch(API_BASE + '/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (data && data.clienteId) lead._clienteId = data.clienteId;
        return { json: function(){ return Promise.resolve(data); } };
      })
      .catch(function(){ return { json: function(){ return Promise.resolve(null); } }; });
  }
  function waBtnHtml(){
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.32-1.94 1.4-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.2-1.18-1.56-1.18-2.98s.75-2.11 1.02-2.4c.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.36Z"/></svg>';
  }

  function passoBoasVindas(){
    botMsg('Olá! Eu sou a Aura e sou responsável por cadastrar você no ecossistema do ' + NOME_ESTUDIO + '. Você já é nosso cliente ou é novo por aqui?');
    mostrarBotoes(['Já sou cliente', 'Sou novo por aqui'], function(op){
      lead._jaECliente = op.indexOf('novo') === -1;
      passoAvisoColeta();
    });
  }
  function passoAvisoColeta(){
    botMsg('Precisamos coletar alguns dados pra registrar sua solicitação de agendamento. Qual seu nome completo?');
    mostrarInput('Seu nome completo', function(nome){ lead.nome = nome; passoTelefone(); });
  }
  function passoTelefone(){
    botMsg('Muito prazer, ' + lead.nome.split(' ')[0] + '! Por gentileza, você pode me informar o seu número de WhatsApp?');
    function pedirTelefone(){
      mostrarInput('(99) 99999-9999', function(tel){
        if (tel.replace(/[^0-9]/g, '').length < 10) {
          botMsg('Esse número não parece completo — pode digitar de novo, com DDD? Ex: (27) 99999-9999');
          return pedirTelefone();
        }
        salvar({ nome: lead.nome, tel: tel });
        if (lead._jaECliente) buscarCliente(tel); else passoArtista();
      });
    }
    pedirTelefone();
  }
  function buscarCliente(tel){
    botMsg('Só um instante, deixa eu conferir seu cadastro...');
    fetch(API_BASE + '/api/lead?acao=lead_busca&slug=' + encodeURIComponent(SLUG) + '&tel=' + encodeURIComponent(tel))
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (data.encontrado) {
          botMsg('Que bom te ver por aqui de novo, ' + lead.nome.split(' ')[0] + '! 🖤');
          if (!lead.artista && data.artista) lead.artista = data.artista;
          if (!lead.idea && data.descricao) lead.idea = data.descricao;
          if (!lead.regiao && data.regiao) lead.regiao = data.regiao;
          if (!lead.email && data.email) lead.email = data.email;
          lead._temCampanha = !!data.temCampanha;
        } else {
          botMsg('Não encontrei seu cadastro por aqui ainda — vamos preencher rapidinho!');
        }
        passoArtista();
      })
      .catch(function(){ passoArtista(); });
  }
  function passoArtista(){
    if (lead.artista) { salvar({ artista: lead.artista }); return passoIdeia(); }
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
    if (lead.idea) { salvar({ idea: lead.idea }); return passoRegiao(); }
    botMsg('Me conta um pouco sobre a ideia que você tem em mente:');
    mostrarInput('Sua ideia...', function(idea){ salvar({ idea: idea }); passoRegiao(); });
  }
  function passoRegiao(){
    if (lead.regiao) { salvar({ regiao: lead.regiao }); return passoClassificacao(); }
    botMsg('Em qual região do corpo?');
    mostrarInput('Ex: braço, costas...', function(regiao){ salvar({ regiao: regiao }); passoClassificacao(); });
  }
  function passoClassificacao(){
    botMsg('Você já está pronto pra tatuar ou prefere conversar antes?');
    mostrarBotoes(['🎯 Já decidi, quero agendar', '💬 Quero conversar antes'], function(op){
      var etapa = op.indexOf('conversar') !== -1 ? 'lead_morno' : 'aura_agend';
      salvar({ etapa: etapa });
      passoEmail();
    });
  }
  function passoEmail(){
    if (lead.email) { salvar({ email: lead.email }); return passoPalavraSecreta(); }
    botMsg('Por último, qual o seu melhor e-mail?');
    mostrarInput('seu@email.com', function(email){ salvar({ email: email }); passoPalavraSecreta(); });
  }
  function passoPalavraSecreta(){
    if (!CAMPANHAS_ATIVAS.length || lead._temCampanha) return passoConfirmacao();
    botMsg('Antes de fechar por aqui — você tem uma palavra secreta? 🔑');
    mostrarBotoes(['Sim', 'Não'], function(op){
      if (op === 'Sim') {
        botMsg('Qual é a palavra secreta?');
        pedirPalavraSecreta();
        return;
      }
      var comLink = CAMPANHAS_ATIVAS.filter(function(c){ return c.link; })[0];
      if (comLink) {
        botMsg('Ainda não viu? Dá uma olhada aqui 👉 ' + comLink.link + '. Se descobrir, é só escrever aqui embaixo!');
        pedirPalavraSecreta();
      } else {
        passoConfirmacao();
      }
    });
  }
  function pedirPalavraSecreta(){
    mostrarInput('Digite aqui...', function(palavra){
      botMsg('Só um instante...');
      salvar({ palavra_secreta: palavra })
        .then(function(r){ return r && r.json ? r.json() : null; })
        .then(function(data){
          if (data && data.campanha) {
            var dataFmt = new Date(data.campanha.validade + 'T12:00:00').toLocaleDateString('pt-BR');
            var valorTxt = data.campanha.tipo === 'percentual'
              ? (data.campanha.valor + '% de desconto')
              : ('R$ ' + Number(data.campanha.valor).toFixed(2).replace('.', ',') + ' de crédito');
            botMsg('Prontinho! Você está cadastrado(a) na campanha ' + data.campanha.nome + ' e garantiu ' + valorTxt + '. 🖤 Você tem até ' + dataFmt + ' para aproveitar — é só marcar sua sessão dentro desse prazo.');
          } else {
            botMsg('Não encontrei essa por aqui, mas tudo bem — vamos continuar!');
          }
          passoConfirmacao();
        })
        .catch(function(){ passoConfirmacao(); });
    });
  }
  // Revisão final -- mostra um resumo do que foi coletado antes de encerrar,
  // pra pessoa confirmar ou corrigir algum campo. Evita cadastro com dado
  // errado (ex: telefone digitado errado) chegando sem chance de conserto.
  function passoConfirmacao(){
    var quebra = String.fromCharCode(10);
    var ideiaFinal = lead.idea || lead.ideia || '';
    var linhas = [
      'Só confirmando antes de finalizar:',
      '📋 Nome: ' + (lead.nome || '—'),
      '📱 WhatsApp: ' + (lead.tel || '—'),
      '✉️ E-mail: ' + (lead.email || '—'),
      '🎨 Projeto: ' + (ideiaFinal || '—') + (lead.regiao ? ' — ' + lead.regiao : ''),
      '',
      'Está tudo certo?'
    ];
    botMsg(linhas.join(quebra));
    mostrarBotoes(['✅ Sim, está certo', '✏️ Preciso corrigir algo'], function(op){
      if (op.indexOf('certo') !== -1) return passoFinal();
      passoEscolherCorrecao();
    });
  }
  function passoEscolherCorrecao(){
    botMsg('Qual item você quer corrigir?');
    mostrarBotoes(['Nome', 'Telefone', 'E-mail', 'Projeto'], function(item){
      if (item === 'Nome') {
        botMsg('Qual é o nome completo certo?');
        mostrarInput('Seu nome completo', function(v){ lead.nome = v; salvar({ nome: v }); passoConfirmacao(); });
      } else if (item === 'Telefone') {
        botMsg('Qual é o número de WhatsApp certo?');
        mostrarInput('(99) 99999-9999', function(v){
          if (v.replace(/[^0-9]/g, '').length < 10) {
            botMsg('Esse número não parece completo — com DDD, só números.');
            return passoEscolherCorrecao();
          }
          lead.tel = v; salvar({ tel: v }); passoConfirmacao();
        });
      } else if (item === 'E-mail') {
        botMsg('Qual é o e-mail certo?');
        mostrarInput('seu@email.com', function(v){ lead.email = v; salvar({ email: v }); passoConfirmacao(); });
      } else {
        botMsg('Me conta de novo a ideia:');
        mostrarInput('Sua ideia...', function(v){ lead.idea = v; salvar({ idea: v }); passoConfirmacao(); });
      }
    });
  }
  function montarTextoWhatsApp(){
    var ideiaFinal = lead.idea || lead.ideia || '';
    var partes = ['Olá! Sou ' + (lead.nome || '')];
    if (ideiaFinal) partes.push('conversei com a Aura sobre uma tatuagem de ' + ideiaFinal);
    if (lead.regiao) partes.push('na região: ' + lead.regiao);
    if (lead.artista) partes.push('Artista de interesse: ' + lead.artista);
    if (lead.email) partes.push('Meu e-mail: ' + lead.email);
    return partes.join('. ') + '.';
  }
  function passoFinal(){
    botMsg('Pronto! Já registramos os dados principais — nossa equipe vai entrar em contato com você em breve. Se quiser adiantar, pode chamar no WhatsApp do estúdio! 🖤');
    var area = $('aura-input-area');
    area.innerHTML = '';
    var a = document.createElement('a');
    a.href = WA_LINK !== '#' ? WA_LINK + '?text=' + encodeURIComponent(montarTextoWhatsApp()) : WA_LINK;
    a.target = '_blank'; a.className = 'aura-wa-btn';
    a.innerHTML = waBtnHtml() + 'Falar agora no WhatsApp';
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

// Analytics do site público — visitas (acao=site) e cliques no CTA principal
// (acao=track_click, disparado quando o chat da Aura abre). Ignora bots
// conhecidos (WhatsApp/Facebook/etc já rastreiam o link pra montar o cartão
// de prévia do Open Graph -- isso não é visita de gente de verdade).
const BOT_UA_RE = /bot|crawler|spider|facebookexternalhit|whatsapp|telegrambot|slackbot|twitterbot|linkedinbot|discordbot|pinterest|embedly|quora|outbrain|redditbot|applebot|bingbot|googlebot|semrushbot|ahrefsbot|mj12bot|petalbot|preview/i;

async function incrementarStat(userId, coluna) {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: existente } = await sb.from("site_stats").select("id, visitas, cliques").eq("user_id", userId).eq("dia", hoje).maybeSingle();
  if (existente) {
    await sb.from("site_stats").update({ [coluna]: (existente[coluna] || 0) + 1 }).eq("id", existente.id);
  } else {
    await sb.from("site_stats").insert({ user_id: userId, dia: hoje, visitas: coluna === "visitas" ? 1 : 0, cliques: coluna === "cliques" ? 1 : 0 });
  }
}
async function registrarVisita(userId, req) {
  const ua = req.headers?.["user-agent"] || "";
  if (BOT_UA_RE.test(ua)) return;
  await incrementarStat(userId, "visitas");
}
async function registrarClique(userId) {
  await incrementarStat(userId, "cliques");
}

// Campanhas com palavra secreta que valem hoje (sem data = campanha sempre ativa).
async function campanhasAtivasHoje(userId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data } = await sb.from("campanhas")
    .select("id, nome, palavra_chave, link_divulgacao, credito_tipo, credito_valor, credito_prazo_dias, data_inicio, data_fim")
    .eq("user_id", userId);
  return (data || []).filter(c =>
    (!c.data_inicio || c.data_inicio <= hoje) && (!c.data_fim || c.data_fim >= hoje)
  );
}

// Mesma normalização usada no CRM (slugPalavra) -- ignora maiúscula/minúscula e acento.
function normalizarPalavra(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").trim();
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
    const { data: tenant } = await sb.from("ink_clientes").select("auth_user_id, status, plano").eq("slug", slug).single();
    if (!tenant || tenant.status !== "ativo") return res.status(404).send(paginaSiteIndisponivel());
    const uid = tenant.auth_user_id;
    // Conta demo nunca publica de verdade, mesmo com "Publicado" ligado no CRM.
    if (uid === process.env.DEMO_USER_ID) return res.status(404).send(paginaSiteIndisponivel());
    const [{ data: site }, { data: cfg }, { data: artistas }] = await Promise.all([
      sb.from("site_conteudo").select("*").eq("user_id", uid).single(),
      sb.from("configuracoes").select("studio_name, studio_tel, studio_city, studio_estado, categoria_negocio, meta_pixel_id").eq("user_id", uid).single(),
      sb.from("artistas").select("nome, insta, foto_site_url, bio_site, portfolio_fotos, botao_social_label, ordem_site").eq("user_id", uid).eq("ativo", true).order("ordem_site", { ascending: true, nullsFirst: false }).order("nome"),
    ]);
    if (!site || !site.publicado) return res.status(404).send(paginaSiteIndisponivel());
    // Serverless: se não esperar aqui, a função pode encerrar antes do
    // registro terminar de gravar (fire-and-forget não é confiável na Vercel).
    await registrarVisita(uid, req).catch(() => {});
    const campanhasAtivas = await campanhasAtivasHoje(uid).catch(() => []);
    return res.status(200).send(paginaSitePremium(site, cfg, artistas || [], slug, campanhasAtivas, tenant.plano));
  }

  // ── ANALYTICS: clique no CTA principal (aberto o chat da Aura) ──────────────
  if (acao === "track_click") {
    const slugClick = (req.query?.slug || "").trim();
    if (!slugClick) return res.status(200).json({ ok: false });
    const { data: tenantClick } = await sb.from("ink_clientes").select("auth_user_id").eq("slug", slugClick).single();
    if (tenantClick) await registrarClique(tenantClick.auth_user_id).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  // ── SOLICITAÇÕES (quiz de plano da demo + suporte/assessoria dentro do CRM) ─
  // Sem WhatsApp de propósito — cai numa fila no /admin, revisada manualmente.
  if (acao === "criarSolicitacao") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { tipo, nome, email, telefone, estudio, mensagem, plano_sugerido, respostas, user_id } = req.body || {};
    if (!email || !String(email).includes("@")) return res.status(400).json({ error: "E-mail inválido" });
    const { error: errInsert } = await sb.from("ink_leads").insert({
      tipo: tipo === "suporte" ? "suporte" : "plano",
      nome: nome || null, email, telefone: telefone || null, estudio: estudio || null,
      mensagem: mensagem || null, plano_sugerido: plano_sugerido || null,
      respostas: respostas || null, user_id: user_id || null,
    });
    if (errInsert) return res.status(500).json({ error: errInsert.message });
    // E-mail de confirmação — reusa a mesma infra do resend.js, sem outro round-trip.
    try {
      const key = process.env.RESEND_API_KEY;
      const remetente = process.env.EMAIL_REMETENTE || "";
      if (key && remetente) {
        const assunto = tipo === "suporte" ? "Recebemos sua solicitação de suporte" : "Recebemos seu pedido de informações sobre planos";
        const corpo = tipo === "suporte"
          ? `<p>Olá${nome ? " " + esc(nome) : ""}!</p><p>Recebemos sua solicitação de suporte/assessoria. Nossa equipe vai analisar e te responder por aqui em breve.</p><p>— INK SYSTEM</p>`
          : `<p>Olá${nome ? " " + esc(nome) : ""}!</p><p>Recebemos seu interesse${plano_sugerido ? ` no plano <strong>${esc(plano_sugerido)}</strong>` : ""}. Vamos analisar e te responder por e-mail em breve.</p><p>— INK SYSTEM</p>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
          body: JSON.stringify({ from: remetente, to: email, subject: assunto, html: corpo }),
        });
      }
    } catch { /* confirmação por e-mail é um extra -- não deve travar o envio do pedido */ }
    return res.status(200).json({ ok: true });
  }

  // ── PRÉVIA AO VIVO (aba "Meu Site" do CRM) ──────────────────────────────────
  // Mesma função de render do site real, mas com o rascunho ainda não salvo
  // (vem no corpo do POST, não busca nada no banco) — garante que a prévia
  // fica sempre idêntica ao site publicado de verdade, sem duplicar HTML/CSS.
  if (acao === "preview") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { site, cfg, artistas, slug: slugPreview } = req.body || {};
    let campanhasAtivas = [];
    let planoPreview = null;
    if (slugPreview) {
      const { data: tenantPreview } = await sb.from("ink_clientes").select("auth_user_id, plano").eq("slug", slugPreview).single();
      if (tenantPreview) {
        campanhasAtivas = await campanhasAtivasHoje(tenantPreview.auth_user_id).catch(() => []);
        planoPreview = tenantPreview.plano;
      }
    }
    return res.status(200).send(paginaSitePremium(site || {}, cfg || {}, artistas || [], slugPreview || "", campanhasAtivas, planoPreview));
  }

  // ── BUSCA DE CLIENTE EXISTENTE (widget do site pergunta "já é cliente?") ────
  // Telefone é a chave real de identificação já usada em todo o resto do
  // sistema (mais confiável que nome, que varia de escrita) -- então a busca
  // usa só o telefone, mesmo que o widget também colete o nome no meio.
  if (acao === "lead_busca") {
    const slugBusca = (req.query?.slug || "").trim();
    const telBusca = (req.query?.tel || "").replace(/\D/g, "").slice(-11);
    if (!slugBusca || !telBusca) return res.status(200).json({ encontrado: false });
    const { data: tenantBusca } = await sb.from("ink_clientes").select("auth_user_id").eq("slug", slugBusca).single();
    if (!tenantBusca) return res.status(200).json({ encontrado: false });
    const { data: candidatos } = await sb.from("clientes")
      .select("nome, tel, artista, descricao, regiao, email, campanha_id")
      .eq("user_id", tenantBusca.auth_user_id).is("excluido_em", null);
    const match = (candidatos || []).find(c => c.tel && c.tel.replace(/\D/g, "").slice(-11) === telBusca);
    if (!match) return res.status(200).json({ encontrado: false });
    const completo = !!(match.artista && match.descricao && match.regiao && match.email);
    return res.status(200).json({
      encontrado: true, completo,
      nome: match.nome, artista: match.artista || "", descricao: match.descricao || "",
      regiao: match.regiao || "", email: match.email || "", temCampanha: !!match.campanha_id,
    });
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

  const { nome, tel, email, idea, ideia, artista, insta, regiao, nascimento, referencias, orig, obs: obsExtra, chat_log, etapa: etapaSolicitada, slug: siteSlug, origem_slug: origemSlug, palavra_secreta: palavraSecreta, clienteId: clienteIdBody } = req.body;
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

  // Origem via link (?origem=slug) -- sobrepõe o default "Site" quando o slug bate
  // com uma origem cadastrada desse tenant. Sem slug, comportamento de sempre.
  if (origemSlug) {
    const { data: origemRow } = await sb.from("origens").select("nome").eq("user_id", row.user_id).eq("slug", origemSlug).maybeSingle();
    if (origemRow?.nome) row.orig = origemRow.nome;
  }

  // Palavra secreta de campanha -- revalidada aqui sempre, nunca confia no que o
  // widget acha que bateu (evita alguém forjar um campanha_id/crédito na mão).
  let campanhaAplicada = null;
  let camposCampanha = null;
  if (palavraSecreta) {
    const ativas = await campanhasAtivasHoje(row.user_id);
    const norm = normalizarPalavra(palavraSecreta);
    const achada = norm ? ativas.find(c => c.palavra_chave === norm) : null;
    if (achada) {
      campanhaAplicada = achada;
      const validade = new Date(Date.now() + (Number(achada.credito_prazo_dias) || 30) * 86400000).toISOString().slice(0, 10);
      camposCampanha = achada.credito_tipo === "percentual"
        ? { campanha_id: achada.id, campanha_desconto_pct: achada.credito_valor, campanha_desconto_validade: validade }
        : { campanha_id: achada.id, campanha_credito_valor: achada.credito_valor, campanha_credito_validade: validade };
    }
  }
  if (camposCampanha) Object.assign(row, camposCampanha);

  // Identificação de cliente existente por telefone — telefone bate = mesmo cliente, sempre
  // Ao atualizar, prevalece o campo com mais dados (novo só substitui se existente estiver vazio)
  function maisCompleto(existente, novo) {
    const e = (existente || "").trim();
    const n = (novo || "").trim();
    if (!e) return n || undefined;
    if (!n) return undefined; // mantém existente, não sobrescreve
    return n.length > e.length ? n : undefined; // novo mais longo = mais completo
  }
  function primeiroNome(s) {
    return (s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(" ")[0] || "";
  }

  let clienteId = null;
  let isNewClient = true;
  let matchInfo = null;
  let telefoneCompartilhadoCom = null;
  let etapaMudouAgora = false;
  {
    const telDigits = tel ? tel.replace(/[^0-9]/g, "").slice(-11) : null;
    const emailNorm = email ? email.trim().toLowerCase() : null;
    const { data: existentes } = await sb.from("clientes").select("id,tel,nome,email,insta,descricao,nascimento,artista,regiao,etapa,projetos,campanha_id").eq("user_id", row.user_id);
    // Uma mesma conversa do chat manda várias respostas em sequência (nome,
    // depois ideia, depois região...). Enquanto telefone/e-mail ainda não
    // foram digitados (ou vieram inválidos), não tem como reconhecer "é a
    // mesma pessoa conversando" só por esses dois campos -- por isso, a
    // partir do primeiro salvamento bem-sucedido, o clienteId já resolvido
    // manda direto pra esse registro, sem depender de telefone/e-mail.
    let match = clienteIdBody ? (existentes || []).find(c => String(c.id) === String(clienteIdBody)) : null;
    if (!match) {
      match =
        (telDigits && (existentes || []).find(c => c.tel && c.tel.replace(/[^0-9]/g, "").slice(-11) === telDigits)) ||
        (emailNorm && (existentes || []).find(c => c.email && c.email.trim().toLowerCase() === emailNorm));
    }
    // Telefone/e-mail em comum não garante que é a mesma pessoa (ex: casal
    // dividindo o mesmo número) -- só trata como o mesmo cliente se o primeiro
    // nome bater. Nome diferente = pessoa diferente: vira cadastro novo, com
    // aviso na ficha pra não confundir com erro de duplicidade.
    if (match && !clienteIdBody && nome && match.nome && primeiroNome(nome) !== primeiroNome(match.nome)) {
      telefoneCompartilhadoCom = match.nome;
      match = null;
    }
    if (match) {
      const updateFields = { excluido_em: null };
      if (origemSlug && row.orig !== "Site") updateFields.orig = row.orig;
      if (camposCampanha && !match.campanha_id) Object.assign(updateFields, camposCampanha);
      else campanhaAplicada = null; // já tinha campanha vinculada, ou não bateu -- não reporta como aplicado
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
      // quando o chat explicitamente pedir — e só se o cliente ainda estiver numa
      // fase inicial do funil. Sem essa checagem, um cliente que já tem Sessão
      // Marcada ou está em Pós-venda voltaria pra "Solicitação de Consulta" só
      // por reabrir o chat e responder a pergunta de classificação de novo.
      const ETAPAS_INICIAIS = ["lead", "lead_morno", "aura_agend", "precisa_remarcar"];
      if (etapaSolicitada && (!match.etapa || ETAPAS_INICIAIS.includes(match.etapa))) {
        updateFields.etapa = etapaSolicitada;
        updateFields.etapa_desde = new Date().toISOString();
        etapaMudouAgora = true;
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
    if (telefoneCompartilhadoCom) {
      row.obs = `${row.obs} ⚠️ Mesmo telefone/e-mail de outro cliente cadastrado: ${telefoneCompartilhadoCom}.`;
    }
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
  const campanhaResp = campanhaAplicada ? {
    nome: campanhaAplicada.nome,
    tipo: campanhaAplicada.credito_tipo,
    valor: campanhaAplicada.credito_valor,
    validade: camposCampanha.campanha_credito_validade || camposCampanha.campanha_desconto_validade,
  } : null;

  // deveNotificar so pode olhar se a etapa REALMENTE mudou agora (etapaMudouAgora) --
  // nao basta checar se etapaSolicitada veio no payload, porque o lead acumulado
  // manda esse campo em toda resposta seguinte da mesma conversa (idea, regiao,
  // e-mail, correcoes...), o que disparava o aviso de novo a cada passo.
  const deveNotificar = isNewClient ? !!etapaSolicitada : etapaMudouAgora;
  if (!isNewClient) {
    if (!deveNotificar) return res.status(200).json({ ok: true, clienteId, updated: true, campanha: campanhaResp, ...matchInfo });
  } else if (!deveNotificar) {
    return res.status(200).json({ ok: true, clienteId, campanha: campanhaResp });
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

  return res.status(200).json({ ok: true, clienteId, campanha: campanhaResp });
}
