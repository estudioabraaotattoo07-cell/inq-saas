import { createClient } from "@supabase/supabase-js";
import { ALLOWED_ORIGINS } from "./_lib/allowedOrigins.js";
import { verificarRateLimit, identificadorPorIp } from "./_lib/rateLimit.js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

const GOOGLE_REVIEW_URL = "https://g.page/r/CSIFD3cla6rxEBM/review";

// Bronze/Prata/Ouro foram descontinuados como plano comercial (decisão de
// produto de 2026-08-13) -- nenhuma solicitação nova pode persistir esses
// nomes em ink_leads.plano_sugerido nem citá-los no e-mail de confirmação,
// não importa o que o chamador envie. Defesa aplicada aqui (servidor), não
// só na interface, porque o endpoint é público e sem autenticação.
const PLANOS_LEGADOS_BLOQUEADOS = new Set(["bronze", "prata", "ouro"]);
export function planoSugeridoSemLegado(valor) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto || PLANOS_LEGADOS_BLOQUEADOS.has(texto.toLowerCase())) return null;
  return texto;
}

// Máscara do campo WhatsApp da ficha de captação. Formato aprovado
// (2026-08-14): (DD) DDDDD-DDDD, com espaço depois do parêntese -- mesmo
// padrão visual do maskTel() já usado nos campos de telefone do CRM
// (src/CRM Casa dos Carvalho.tsx). Função real (não uma cópia) -- o script
// do navegador recebe o mesmo corpo via formatarTelefone.toString() dentro
// de paginaSitePremium(), e os testes importam esta função diretamente.
// Nunca digite a máscara nos dois lugares.
export function formatarTelefone(v) {
  v = (v || "").replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v.length ? "(" + v : v;
  if (v.length <= 6) return "(" + v.slice(0, 2) + ") " + v.slice(2);
  if (v.length <= 10) return "(" + v.slice(0, 2) + ") " + v.slice(2, 6) + "-" + v.slice(6);
  return "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7);
}

// Nome/WhatsApp/e-mail são verdadeiramente obrigatórios na captação pública
// (Bloco 1 -- Reconstrução da Captação, 2026-08-15): só texto de verdade
// conta -- ausente, null, tipo diferente de string, ou string vazia/só com
// espaços não passam. Função pura e exportada (mesmo padrão de
// formatarTelefone/planoSugeridoSemLegado, acima) para o teste exercitar a
// mesma função usada pelo handler real, nunca uma cópia.
export function textoObrigatorioValido(v) {
  return typeof v === "string" && v.trim().length > 0;
}
export function camposObrigatoriosPreenchidos(nome, tel, email) {
  return textoObrigatorioValido(nome) && textoObrigatorioValido(tel) && textoObrigatorioValido(email);
}

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
// inq-saas atende exclusivamente o Laboratório P&D (Sub-bloco 1 e Bloco 2 da
// remoção de Bronze/Prata/Ouro, 2026-08-13) -- carrossel automático e
// portfólio sem limite de fotos são o comportamento padrão deste
// repositório. Não recebe mais "plano" como parâmetro: nenhum dos dois
// chamadores (site real e prévia) lê mais ink_clientes.plano, porque nada
// aqui dentro depende mais desse valor.
export function paginaSitePremium(site, cfg, artistas, slug, campanhasAtivas) {
  const carrosselAutomatico = true;
  const nomeEstudio = cfg?.studio_name || "Estúdio";
  const local = [cfg?.studio_city, cfg?.studio_estado].filter(Boolean).join(" · ");
  const tel = (cfg?.studio_tel || "").replace(/\D/g, "");
  const waLink = tel ? `https://wa.me/55${tel}` : "#";
  const heroFoto = site.hero_foto_url || "";
  const linhas = (site.hero_frase || `Arte na pele, criada\na partir da sua história.`).split("\n");
  const heroHeadline = linhas.map(l => esc(l)).join("<br>");

  // Cores/estilo personalizados — recurso padrão do Laboratório (Bloco 2 da
  // remoção de Bronze/Prata/Ouro, 2026-08-13), sem depender de plano; aqui só
  // aplica o que já foi salvo no CRM; sem estilo salvo = visual padrão de sempre.
  const est = site.estilo || {};
  const corFundo = /^#[0-9a-f]{3,8}$/i.test(est.corFundo || "") ? est.corFundo : "#080808";
  // Brilho de canto do fundo (superior-esquerdo + inferior-direito) — mesmo padrão
  // visual do CRM/admin, com cor e intensidade editáveis.
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
  // Bordas das fotos são um controle independente do cantos dos botões (antes
  // era a mesma variável para tudo -- um raio de 999px, que só faz sentido
  // num botão largo, ficava esquisito numa foto retangular). Sem "cápsula"
  // aqui de propósito -- só reto/arredondado. Cai no valor de "cantos" (dos
  // botões) se a conta ainda não tiver escolhido um valor próprio pras fotos.
  const radiusFotos = { arredondado: "14px" }[est.cantosFotos || est.cantos] || "0px";
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
    const fotosCadastradas = Array.isArray(a.portfolio_fotos) ? a.portfolio_fotos : [];
    const fotos = fotosCadastradas;
    const stripId = `strip-${artIdx}`;
    if (fotos.length > 0) stripIdsComFotos.push(stripId);
    const igHandle = (a.insta || "").replace(/^@/, "");
    const bioLen = (a.bio_site || "").length;
    const bioFontSize = bioLen > 350 ? 11.5 : bioLen > 220 ? 12.5 : 13.5;
    // Esteira roda sozinha: a lista de fotos é duplicada e anda -50% em loop,
    // criando a ilusão de rolagem infinita sem salto no fim. Duração calculada
    // por velocidade constante (~70px/s, mesmo ritmo do site real) em vez de um
    // tempo fixo — senão poucas fotos ficam lentas e muitas fotos ficam rápidas.
    // Todas as esteiras andam pro mesmo lado (decisão 2026-07-13).
    const dir = carrosselAutomatico ? "go-right" : "";
    const largItem = 204; // 200px de foto + 4px de gap
    const duracaoSeg = Math.max(12, Math.round((fotos.length * largItem) / 70 * velocidadeMult));
    // A duplicação da lista só faz sentido com o carrossel automático (padrão
    // deste repositório), onde a esteira anda sozinha e precisa do "loop" pra
    // não dar salto no fim.
    const fotosStrip = fotos.length > 0
      ? (carrosselAutomatico ? [...fotos, ...fotos] : fotos).map(f => `<div class="strip-item" data-src="${esc(f)}"><img src="${esc(f)}" alt=""><div class="strip-ov"><div class="strip-exp">${EXPAND_ICON}</div></div></div>`).join("")
      : "";
    return `
    <div class="artist-row">
      <img class="artist-photo" src="${esc(a.foto_site_url || "")}" alt="${esc(a.nome)}">
      <div class="artist-info">
        <div class="artist-eyebrow">Trabalhos de:</div>
        <div class="artist-name">${esc(a.nome)}</div>
        ${a.bio_site ? `<div class="artist-tagline" style="font-size:${bioFontSize}px">${esc(a.bio_site)}</div>` : ""}
        ${igHandle ? `<a class="ig-link" href="https://instagram.com/${esc(igHandle)}" target="_blank">${IG_ICON}${esc(a.botao_social_label || ("@" + igHandle))}</a>` : ""}
        <a class="btn-gold" href="javascript:void(0)" onclick="AuraChat.abrir('${esc(a.id)}')" style="margin-top:18px">✦ Quero tatuar com ${esc((a.nome || "").split(" ")[0])}</a>
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
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--gold:${corBotao1};--gold-2:${corBotao2};--gold-dim:rgba(201,168,76,0.35);--bg:${corFundo};--off:#e8e4dc;--dim:${corCorpo};--pad:52px;--radius:${radius};--radius-foto:${radiusFotos};--font-titulo:${fonteTitulo};--font-corpo:${fonteCorpo};--cor-titulo:${corTitulo};--glow:${glow}}
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
.artist-photo{width:140px;height:185px;object-fit:cover;flex-shrink:0;border-radius:var(--radius-foto)}
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
.strip-item{width:200px;height:255px;flex-shrink:0;overflow:hidden;background:#111;border-radius:var(--radius-foto);position:relative;cursor:pointer}
.strip-item img{width:100%;height:100%;object-fit:cover;pointer-events:none}
.strip-ov{position:absolute;inset:0;background:rgba(0,0,0,0);transition:background .3s;display:flex;align-items:center;justify-content:center}
.strip-item:hover .strip-ov{background:rgba(0,0,0,0.22)}
.strip-exp{opacity:0;transition:opacity .3s;width:36px;height:36px;border-radius:50%;background:rgba(201,168,76,0.9);display:flex;align-items:center;justify-content:center}
.strip-item:hover .strip-exp{opacity:1}
.strip-exp svg{width:13px;height:13px;stroke:#000;fill:none;stroke-width:2}
.depo-print-link{cursor:pointer}
.lb{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.96);display:none;align-items:center;justify-content:center}
.lb.open{display:flex}
.lb-img{max-width:75vw;max-height:75vh;object-fit:contain;width:auto;height:auto;border-radius:var(--radius-foto)}
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
.depo-print{width:100%;max-height:140px;object-fit:cover;border:0.5px solid rgba(255,255,255,0.1);border-radius:var(--radius-foto);cursor:pointer;display:block}
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
.aura-close{cursor:pointer;color:#fff;font-size:18px;line-height:1;padding:6px;margin:-6px;border-radius:50%}
.aura-close:hover{background:rgba(255,255,255,0.12)}
.ficha-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;font-family:'Inter',sans-serif}
.ficha-aviso{background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:8px;padding:10px 12px;font-size:11px;line-height:1.6;color:#d8d2c4}
.ficha-field{display:flex;flex-direction:column;gap:5px}
.ficha-label{font-size:11px;color:#b8b2a4;letter-spacing:.02em}
.ficha-req{color:var(--gold)}
.ficha-input,.ficha-select,.ficha-textarea{background:#050505;border:1px solid rgba(201,168,76,0.25);border-radius:10px;padding:9px 12px;color:#fff;font-size:16px;font-family:inherit;outline:none;width:100%;box-sizing:border-box;color-scheme:dark}
.ficha-data-row{display:flex;gap:6px}
.ficha-data-row .ficha-select{flex:1;min-width:0}
.ficha-insta-wrap{display:flex;align-items:center;gap:6px}
.ficha-insta-at{color:var(--gold);font-size:16px;flex-shrink:0}
.ficha-insta-wrap .ficha-input{flex:1;min-width:0}
.ficha-textarea{resize:vertical;min-height:60px}
.ficha-file-btn{background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.4);color:var(--gold);padding:9px 14px;border-radius:10px;font-size:11.5px;cursor:pointer;font-family:inherit;text-align:center;width:100%}
.ficha-file-status{font-size:10.5px;color:#8a8474}
.ficha-footer{padding:12px 16px;border-top:1px solid rgba(201,168,76,0.15)}
.ficha-submit{width:100%;background:var(--gold);color:#17140A;border:none;border-radius:999px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
.ficha-submit:disabled{opacity:.6;cursor:default}
.ficha-erro{color:#e07b6e;font-size:11px}
.ficha-obrigado{padding:24px 16px;text-align:center;display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;height:100%}
@media(max-width:480px){.aura-panel{width:100vw;height:85vh;max-height:85vh;max-width:100vw;bottom:0;right:0;border-radius:16px 16px 0 0}}
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
  <div id="ficha-body" class="ficha-body"></div>
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
// Trava o arraste/seta na ultima e primeira foto pra uma eventual esteira
// estatica (classe "go-right" ausente) -- sem isso, dava pra continuar
// "andando" pra fundo preto mesmo sem mais fotos. O carrossel automático
// (classe go-right, padrão deste repositório) tem animacao propria e nao
// usa essa trava, porque a lista la ja vem duplicada de proposito pro loop.
function clampStripOffset(track, outer, x) {
  if (track.classList.contains("go-right")) return x;
  var min = Math.min(0, outer.clientWidth - track.scrollWidth);
  return Math.max(min, Math.min(0, x));
}
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
    lastX = x; lastT = Date.now(); setStripOffset(track, clampStripOffset(track, outer, startOffset + (x - startX)));
  }
  function endDrag() {
    if (!isDrag) return; isDrag = false; track.style.transition = "";
    var vel = velX;
    function inertia() {
      if (Math.abs(vel) < 0.5) { track.classList.remove("paused"); return; }
      vel *= 0.92;
      var alvo = clampStripOffset(track, outer, getStripOffset(track) + vel);
      setStripOffset(track, alvo);
      if (alvo === 0 || alvo <= outer.clientWidth - track.scrollWidth) { track.classList.remove("paused"); return; }
      animFrame = requestAnimationFrame(inertia);
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
    setStripOffset(track, clampStripOffset(track, outer, getStripOffset(track) + (dir === "next" ? -204 : 204)));
    setTimeout(function () { track.style.transition = ""; }, 400);
  };
}
${stripIdsComFotos.map(id => `setupStrip(${JSON.stringify(id)});`).join("\n")}
</script>
<script>
(function(){
  var API_BASE = 'https://inq-saas.vercel.app';
  var ARTISTAS = ${JSON.stringify((artistas || []).map(a => ({ id: a.id, nome: a.nome, servicos: Array.isArray(a.servicos_atendidos) ? a.servicos_atendidos : [] })))};
  var SERVICOS = ${JSON.stringify((cfg?.servico_opts || []))};
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
  var aberto = false;
  var cliqueContado = false;
  var referenciasUrls = [];
  var enviando = false;

  function $(id){ return document.getElementById(id); }
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }

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
    if ($('ficha-body').children.length === 0) montarFicha(artistaPreEscolhido);
  }
  function fechar(){
    aberto = false;
    $('aura-panel').style.display = 'none';
    $('aura-fab').style.display = 'flex';
  }

  function campo(label, inputHtml){
    return '<div class="ficha-field"><label class="ficha-label">' + label + '</label>' + inputHtml + '</div>';
  }
  // Três selects em vez de <input type="date">: no mobile, tocar num select
  // abre a roleta nativa do sistema (mesma sensação de "rolar pra escolher"),
  // e como só existem valores válidos pra escolher, não tem como digitar um
  // ano absurdo sem querer -- o que aconteceu com o date nativo no desktop.
  function diasOptions(){
    var out = '';
    for (var d = 1; d <= 31; d++) out += '<option value="' + d + '">' + d + '</option>';
    return out;
  }
  function mesesOptions(){
    var nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var out = '';
    for (var m = 0; m < 12; m++) out += '<option value="' + (m + 1) + '">' + nomes[m] + '</option>';
    return out;
  }
  function anosOptions(){
    var anoAtual = new Date().getFullYear();
    var out = '';
    for (var a = anoAtual - 5; a >= anoAtual - 100; a--) out += '<option value="' + a + '">' + a + '</option>';
    return out;
  }
  // Corpo real vindo da função exportada no topo do arquivo -- garante que o
  // navegador rode exatamente o mesmo código que os testes exercitam, nunca
  // uma segunda cópia digitada à mão que possa divergir da de produção.
  ${formatarTelefone.toString()}

  // Ficha única, preenchida pelo próprio visitante -- substitui a conversa
  // por etapas (decisão de 2026-08-14: menos código, menos superfície pra
  // bug de estado, e uma ficha "burocrática" deixa claro de cara o que é
  // obrigatório vs. opcional, em vez de pergunta-resposta uma de cada vez).
  function montarFicha(artistaPreEscolhido){
    var html = '';
    html += '<div class="ficha-aviso">Preencha o máximo de informações possível — isso agiliza seu atendimento. <b>Obrigatório: nome completo, e-mail e WhatsApp.</b></div>';
    html += '<form id="ficha-form">';
    html += campo('Nome completo <span class="ficha-req">*</span>', '<input class="ficha-input" name="nome" required placeholder="Seu nome completo">');
    html += campo('WhatsApp <span class="ficha-req">*</span>', '<input class="ficha-input" id="ficha-tel" name="tel" type="text" inputmode="numeric" autocomplete="tel" required placeholder="(99) 99999-9999">');
    html += campo('E-mail <span class="ficha-req">*</span>', '<input class="ficha-input" name="email" type="email" required placeholder="seu@email.com">');
    if (SERVICOS.length) {
      html += campo('Serviço desejado', '<select class="ficha-select" name="servico"><option value="">Selecione...</option>' + SERVICOS.map(function(s){ return '<option value="' + esc(s.nome) + '">' + esc(s.nome) + '</option>'; }).join('') + '</select>');
    }
    html += campo('Ideia / descrição do projeto', '<textarea class="ficha-textarea" name="idea" placeholder="Conte com detalhes o que você imagina..."></textarea>');
    html += campo('Região do corpo', '<input class="ficha-input" name="regiao" placeholder="Ex: braço, costas...">');
    html += campo('Faixa de investimento', '<select class="ficha-select" name="faixaInvestimento"><option value="">Selecione...</option><option>Até R$500</option><option>R$500 a R$1.500</option><option>R$1.500 a R$3.000</option><option>Acima de R$3.000</option></select>');
    if (ARTISTAS.length > 1) {
      html += campo('Artista de preferência', '<select class="ficha-select" name="artista"><option value="">Sem preferência</option>' + ARTISTAS.map(function(a){ return '<option value="' + esc(a.id) + '"' + (a.id === artistaPreEscolhido ? ' selected' : '') + '>' + esc(a.nome) + '</option>'; }).join('') + '</select>');
    }
    html += campo('Instagram', '<div class="ficha-insta-wrap"><span class="ficha-insta-at">@</span><input class="ficha-input" id="ficha-insta" name="insta" placeholder="seu_usuario"></div>');
    html += campo('Data de nascimento', '<div class="ficha-data-row">' +
      '<select class="ficha-select" name="nasc_dia"><option value="">Dia</option>' + diasOptions() + '</select>' +
      '<select class="ficha-select" name="nasc_mes"><option value="">Mês</option>' + mesesOptions() + '</select>' +
      '<select class="ficha-select" name="nasc_ano"><option value="">Ano</option>' + anosOptions() + '</select>' +
      '</div>');
    html += campo('Melhor período pra retorno', '<select class="ficha-select" name="periodo_ligacao"><option value="">Selecione...</option><option>Manhã</option><option>Tarde</option><option>Noite</option></select>');
    if (CAMPANHAS_ATIVAS.length) {
      html += campo('Código promocional (se tiver)', '<input class="ficha-input" name="palavra_secreta" placeholder="Se você tem um código, digite aqui">');
    }
    html += campo('Imagens de referência', '<input type="file" id="ficha-file-input" accept="image/*" multiple style="display:none">' +
      '<button type="button" class="ficha-file-btn" id="ficha-file-btn">📷 Escolher imagens</button>' +
      '<div class="ficha-file-status" id="ficha-file-status"></div>');
    html += '<div class="ficha-erro" id="ficha-erro" style="display:none"></div>';
    html += '</form>';
    $('ficha-body').innerHTML = html;
    if (ARTISTAS.length === 1) {
      var hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.name = 'artista'; hidden.value = ARTISTAS[0].id;
      $('ficha-form').appendChild(hidden);
    }
    $('ficha-file-btn').onclick = function(){ $('ficha-file-input').click(); };
    $('ficha-file-input').onchange = function(){ handleArquivos(this.files); };
    $('ficha-tel').addEventListener('input', function(){ this.value = formatarTelefone(this.value); });
    $('ficha-insta').addEventListener('input', function(){ this.value = this.value.replace(/@/g, ''); });
    var footer = document.createElement('div');
    footer.className = 'ficha-footer';
    footer.innerHTML = '<button type="submit" form="ficha-form" class="ficha-submit" id="ficha-submit-btn">Enviar solicitação</button>';
    $('ficha-body').appendChild(footer);
    $('ficha-form').addEventListener('submit', function(e){ e.preventDefault(); enviarFicha(); });
  }

  // Sobe cada imagem assim que escolhida (sem esperar o cliente existir --
  // /api/upload aceita base64 sem clienteId e só devolve a URL pública), pra
  // ficha inteira ser um único envio no final, sem gravação parcial.
  var LIMITE_IMAGENS = 5;
  function handleArquivos(files){
    var lista = Array.prototype.slice.call(files || []);
    if (!lista.length) return;
    var status = $('ficha-file-status');
    var vagas = LIMITE_IMAGENS - referenciasUrls.length;
    var cortadas = lista.length > vagas;
    lista = lista.slice(0, Math.max(0, vagas));
    if (!lista.length) {
      status.textContent = 'Limite de ' + LIMITE_IMAGENS + ' imagens atingido.';
      return;
    }
    status.textContent = 'Enviando ' + lista.length + ' imagem(ns)...';
    var restantes = lista.length, falhas = 0;
    lista.forEach(function(file){
      comprimirEEnviar(file, function(ok, url){
        restantes--;
        if (ok) referenciasUrls.push(url); else falhas++;
        if (restantes === 0) {
          status.textContent = referenciasUrls.length + '/' + LIMITE_IMAGENS + ' imagem(ns) pronta(s) pra envio' +
            (falhas ? ' — ' + falhas + ' falhou/falharam.' : '.') +
            (cortadas ? ' Limite de ' + LIMITE_IMAGENS + ' atingido, o restante não foi enviado.' : '');
          if (referenciasUrls.length >= LIMITE_IMAGENS) {
            $('ficha-file-btn').disabled = true;
            $('ficha-file-btn').textContent = 'Limite de ' + LIMITE_IMAGENS + ' imagens atingido';
          }
        }
      });
    });
  }
  function comprimirEEnviar(file, cb){
    var reader = new FileReader();
    reader.onload = function(ev){
      var img = new Image();
      img.onload = function(){
        var w = img.width, h = img.height, maxPx = 900;
        if (w > maxPx || h > maxPx) { if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; } else { w = Math.round(w * maxPx / h); h = maxPx; } }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        var base64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
        fetch(API_BASE + '/api/upload', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: base64, mimeType: 'image/jpeg' })
        }).then(function(r){ return r.json(); }).then(function(d){ cb(!!(d && d.url), d && d.url); }).catch(function(){ cb(false); });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function waBtnHtml(){
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.32-1.94 1.4-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.2-1.18-1.56-1.18-2.98s.75-2.11 1.02-2.4c.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.36Z"/></svg>';
  }
  function montarTextoWhatsApp(dados){
    var partes = ['Olá! Sou ' + (dados.nome || '')];
    if (dados.servico) partes.push('procurando ' + dados.servico.toLowerCase());
    if (dados.idea) partes.push('minha ideia: ' + dados.idea);
    if (dados.regiao) partes.push('na região: ' + dados.regiao);
    if (dados.email) partes.push('Meu e-mail: ' + dados.email);
    return partes.join('. ') + '.';
  }

  function enviarFicha(){
    if (enviando) return;
    var fd = new FormData($('ficha-form'));
    var dados = {};
    fd.forEach(function(v, k){ if (v) dados[k] = v; });
    if (!dados.nome || !dados.tel || !dados.email) {
      mostrarErro('Nome completo, WhatsApp e e-mail são obrigatórios.');
      return;
    }
    if (dados.nasc_dia && dados.nasc_mes && dados.nasc_ano) {
      dados.nascimento = String(dados.nasc_dia).padStart(2, '0') + '/' + String(dados.nasc_mes).padStart(2, '0') + '/' + dados.nasc_ano;
    }
    delete dados.nasc_dia; delete dados.nasc_mes; delete dados.nasc_ano;
    if (dados.insta) dados.insta = '@' + dados.insta;
    enviando = true;
    var btn = $('ficha-submit-btn');
    btn.disabled = true; btn.textContent = 'Enviando...';
    var payload = Object.assign({}, dados, {
      referencias: referenciasUrls, slug: SLUG, orig: 'Site', origem_slug: ORIGEM_SLUG, finalizado: true
    });
    fetch(API_BASE + '/api/lead', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        if (!d || !d.ok) throw new Error('falha');
        mostrarObrigado(dados);
      })
      .catch(function(){
        enviando = false;
        btn.disabled = false; btn.textContent = 'Enviar solicitação';
        mostrarErro('Tivemos um problema técnico ao enviar. Pode tentar de novo, ou chamar a gente direto no WhatsApp.');
      });
  }
  function mostrarErro(msg){
    var el = $('ficha-erro');
    el.textContent = msg;
    el.style.display = 'block';
  }
  function mostrarObrigado(dados){
    var wa = WA_LINK !== '#' ? WA_LINK + '?text=' + encodeURIComponent(montarTextoWhatsApp(dados)) : WA_LINK;
    $('ficha-body').innerHTML = '<div class="ficha-obrigado">' +
      '<div style="font-size:14px;line-height:1.6;color:#f0ede8">Pronto, ' + esc((dados.nome || '').split(' ')[0]) + '! Já registramos seus dados — nossa equipe vai entrar em contato em breve. 🖤</div>' +
      '<a href="' + wa + '" target="_blank" class="aura-wa-btn">' + waBtnHtml() + 'Falar agora no WhatsApp</a>' +
      '</div>';
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

  const acao = req.query && req.query.acao;
  const token = req.query && req.query.token;
  const nota = req.query && req.query.nota;

  // Bloco 4 -- hardening: origem restrita + rate limit, só nas 3 ações
  // confirmadas como fetch() de navegador (POST base, lead_busca,
  // track_click). Demais ações (site, preview, links por token, etc.)
  // continuam com o Access-Control-Allow-Origin: "*" de sempre --
  // nenhuma delas foi tocada de propósito.
  const origin = req.headers.origin || "";
  const ip = identificadorPorIp(req);
  const acaoRestrita = acao === "track_click" || acao === "lead_busca" || !acao;
  if (acaoRestrita) {
    res.setHeader("Vary", "Origin");
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.removeHeader("Access-Control-Allow-Origin");
      if (req.method !== "OPTIONS") return res.status(403).json({ error: "Origem não permitida" });
    }
  }

  if (req.method === "OPTIONS") return res.status(200).end();

  if (acaoRestrita) {
    const { permitido: permitidoGlobal } = await verificarRateLimit("lead_global", ip);
    if (!permitidoGlobal) return res.status(429).json({ error: "Muitas requisições. Aguarde um instante." });
  }

  // ── SITE PÚBLICO DO TENANT (molde Premium) ──────────────────────────────────
  if (acao === "site") {
    const slug = (req.query?.slug || "").trim();
    if (!slug) return res.status(400).send(paginaSiteIndisponivel());
    const { data: tenant } = await sb.from("ink_clientes").select("auth_user_id, status").eq("slug", slug).single();
    if (!tenant || tenant.status !== "ativo") return res.status(404).send(paginaSiteIndisponivel());
    const uid = tenant.auth_user_id;
    // Conta demo nunca publica de verdade, mesmo com "Publicado" ligado no CRM.
    if (uid === process.env.DEMO_USER_ID) return res.status(404).send(paginaSiteIndisponivel());
    const [{ data: site }, { data: cfg }, { data: artistas }] = await Promise.all([
      sb.from("site_conteudo").select("*").eq("user_id", uid).single(),
      sb.from("configuracoes").select("studio_name, studio_tel, studio_city, studio_estado, categoria_negocio, meta_pixel_id, servico_opts").eq("user_id", uid).single(),
      sb.from("artistas").select("id, nome, insta, foto_site_url, bio_site, portfolio_fotos, botao_social_label, ordem_site, servicos_atendidos").eq("user_id", uid).eq("ativo", true).order("ordem_site", { ascending: true, nullsFirst: false }).order("nome"),
    ]);
    if (!site || !site.publicado) return res.status(404).send(paginaSiteIndisponivel());
    // Serverless: se não esperar aqui, a função pode encerrar antes do
    // registro terminar de gravar (fire-and-forget não é confiável na Vercel).
    await registrarVisita(uid, req).catch(() => {});
    const campanhasAtivas = await campanhasAtivasHoje(uid).catch(() => []);
    return res.status(200).send(paginaSitePremium(site, cfg, artistas || [], slug, campanhasAtivas));
  }

  // ── ANALYTICS: clique no CTA principal (aberto o chat da Aura) ──────────────
  if (acao === "track_click") {
    const slugClick = (req.query?.slug || "").trim();
    if (!slugClick) return res.status(200).json({ ok: false });
    const { data: tenantClick } = await sb.from("ink_clientes").select("auth_user_id").eq("slug", slugClick).single();
    if (tenantClick) await registrarClique(tenantClick.auth_user_id).catch(() => {});
    return res.status(200).json({ ok: true });
  }

  // ── SOLICITAÇÕES (suporte/assessoria dentro do CRM + fluxo Aura do site de
  // vendas) ── Sem WhatsApp de propósito — cai numa fila no /admin, revisada
  // manualmente. O quiz "qual plano cabe em você" (Bronze/Prata/Ouro) que
  // existia no modo demo do CRM foi removido em 2026-08-13 (Bloco 1 da
  // remoção da arquitetura Bronze/Prata/Ouro) -- este endpoint continua
  // aceitando tipo:"plano" por compatibilidade com outros chamadores, mas
  // plano_sugerido nunca mais persiste nem envia por e-mail um desses três
  // nomes (ver planoSugeridoSemLegado, acima).
  // Suporta salvar progressivamente: sem "id" no corpo, cria a linha (email
  // ainda pode ser vazio); com "id", atualiza a mesma linha em vez de criar
  // outra. E-mail de confirmação só dispara quando "finalizado:true" chega,
  // pro visitante não abandonar recebendo e-mail de algo que nem terminou.
  if (acao === "criarSolicitacao") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { id: leadIdBody, tipo, nome, email, telefone, estudio, mensagem, plano_sugerido, respostas, user_id, finalizado, origem_trafego } = req.body || {};
    if (finalizado && (!email || !String(email).includes("@"))) return res.status(400).json({ error: "E-mail inválido" });

    // Nunca persiste Bronze/Prata/Ouro, em nenhuma variação de maiúscula/
    // minúscula -- sem isso, transforma silenciosamente num valor vazio em
    // vez de recusar a solicitação inteira (o resto do pedido continua
    // legítimo mesmo que plano_sugerido não seja).
    const planoSugeridoSeguro = planoSugeridoSemLegado(plano_sugerido);

    const campos = {
      tipo: tipo === "suporte" ? "suporte" : "plano",
      nome: nome || null, email: email || null, telefone: telefone || null, estudio: estudio || null,
      mensagem: mensagem || null, plano_sugerido: planoSugeridoSeguro,
      respostas: respostas || null, user_id: user_id || null,
      origem_trafego: origem_trafego || null,
      ...(finalizado ? { finalizado: true } : {}),
    };

    let leadId = leadIdBody;
    if (leadId) {
      const { error: errUpdate } = await sb.from("ink_leads").update(campos).eq("id", leadId);
      if (errUpdate) return res.status(500).json({ error: errUpdate.message });
    } else {
      const { data: inserted, error: errInsert } = await sb.from("ink_leads").insert(campos).select("id").single();
      if (errInsert) return res.status(500).json({ error: errInsert.message });
      leadId = inserted.id;
    }

    if (!finalizado) return res.status(200).json({ ok: true, id: leadId });

    // E-mail de confirmação — reusa a mesma infra do resend.js, sem outro round-trip.
    try {
      const key = process.env.RESEND_API_KEY;
      const remetente = process.env.EMAIL_REMETENTE || "";
      if (key && remetente) {
        const assunto = tipo === "suporte" ? "Recebemos sua solicitação de suporte" : "Recebemos seu pedido de informações sobre planos";
        const corpo = tipo === "suporte"
          ? `<p>Olá${nome ? " " + esc(nome) : ""}!</p><p>Recebemos sua solicitação de suporte/assessoria. Nossa equipe vai analisar e te responder por aqui em breve.</p><p>— INK SYSTEM</p>`
          : `<p>Olá${nome ? " " + esc(nome) : ""}!</p><p>Recebemos seu interesse${planoSugeridoSeguro ? ` no plano <strong>${esc(planoSugeridoSeguro)}</strong>` : ""}. Vamos analisar e te responder por e-mail em breve.</p><p>— INK SYSTEM</p>`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
          body: JSON.stringify({ from: "INK SYSTEM <" + remetente + ">", to: email, subject: assunto, html: corpo }),
        });
      }
    } catch { /* confirmação por e-mail é um extra -- não deve travar o envio do pedido */ }
    return res.status(200).json({ ok: true, id: leadId });
  }

  // ── PRÉVIA AO VIVO (aba "Meu Site" do CRM) ──────────────────────────────────
  // Mesma função de render do site real, mas com o rascunho ainda não salvo
  // (vem no corpo do POST, não busca nada no banco) — garante que a prévia
  // fica sempre idêntica ao site publicado de verdade, sem duplicar HTML/CSS.
  if (acao === "preview") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { site, cfg, artistas, slug: slugPreview } = req.body || {};
    let campanhasAtivas = [];
    if (slugPreview) {
      const { data: tenantPreview } = await sb.from("ink_clientes").select("auth_user_id").eq("slug", slugPreview).single();
      if (tenantPreview) {
        campanhasAtivas = await campanhasAtivasHoje(tenantPreview.auth_user_id).catch(() => []);
      }
    }
    return res.status(200).send(paginaSitePremium(site || {}, cfg || {}, artistas || [], slugPreview || "", campanhasAtivas));
  }

  // ── BUSCA DE CLIENTE EXISTENTE (widget do site pergunta "já é cliente?") ────
  // Telefone é a chave real de identificação já usada em todo o resto do
  // sistema (mais confiável que nome, que varia de escrita) -- então a busca
  // usa só o telefone, mesmo que o widget também colete o nome no meio.
  if (acao === "lead_busca") {
    const slugBusca = (req.query?.slug || "").trim();
    const telBusca = (req.query?.tel || "").replace(/\D/g, "").slice(-11);
    // Modo padrão (sem detalhe=1): resposta mínima, sem dado pessoal --
    // suficiente pra alimentar a pergunta "continuar atendimento ou novo
    // projeto?" sem revelar nada antes de confirmar a intenção (Grupo B).
    // Só devolve nome/artista/descrição/região/e-mail quando detalhe=1,
    // chamado depois que o visitante já escolheu "novo projeto" (ou quando
    // completo=false, caso em que a bifurcação nem chega a ser oferecida).
    const detalhe = req.query?.detalhe === "1";
    if (!slugBusca || !telBusca) return res.status(200).json({ encontrado: false });
    const { data: tenantBusca } = await sb.from("ink_clientes").select("auth_user_id").eq("slug", slugBusca).single();
    if (!tenantBusca) return res.status(200).json({ encontrado: false });
    const { permitido: permitidoBusca } = await verificarRateLimit("lead_busca", ip + "|tenant:" + tenantBusca.auth_user_id);
    if (!permitidoBusca) return res.status(429).json({ error: "Muitas requisições. Aguarde um instante." });
    const { data: candidatos } = await sb.from("clientes")
      .select("nome, tel, artista, descricao, regiao, email, campanha_id")
      .eq("user_id", tenantBusca.auth_user_id).is("excluido_em", null);
    const match = (candidatos || []).find(c => c.tel && c.tel.replace(/\D/g, "").slice(-11) === telBusca);
    if (!match) return res.status(200).json({ encontrado: false });
    const completo = !!(match.artista && match.descricao && match.regiao && match.email);
    if (!detalhe) return res.status(200).json({ encontrado: true, completo });
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

  // ── ENDPOINTS LEGADOS CONSOLIDADOS (Bloco 4.6) ──────────────────────────────
  // Portados verbatim de api/campanhas-ativas.js, api/registrar-evento.js e
  // api/vincular-campanha.js -- mesma query, mesmo formato de resposta,
  // inclusive as inconsistências de status HTTP entre eles (preservadas de
  // propósito, não uniformizadas). Uso exclusivo do site legado da Casa dos
  // Carvalho -- hardcoded a STUDIO_USER_ID, igual aos arquivos originais.

  if (acao === "campanhas-ativas") {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    const hojeCA = new Date().toISOString().split("T")[0];
    const studioUserIdCA = process.env.STUDIO_USER_ID || "2d366d35-1cae-40d5-ba92-06fe2ab8a763";
    try {
      const { data, error } = await sb.from("campanhas")
        .select("id, nome, palavra_chave, data_inicio, data_fim")
        .eq("user_id", studioUserIdCA)
        .lte("data_inicio", hojeCA)
        .gte("data_fim", hojeCA);
      if (error) { console.error("campanhas-ativas error:", error); return res.status(200).json({ campanhas: [] }); }
      return res.status(200).json({ campanhas: data || [] });
    } catch (err) {
      console.error("campanhas-ativas exception:", err.message);
      return res.status(200).json({ campanhas: [] });
    }
  }

  if (acao === "registrar-evento") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const studioUserIdRE = process.env.STUDIO_USER_ID || "2d366d35-1cae-40d5-ba92-06fe2ab8a763";
    const { tipo_evento, origem, cliente_id } = req.body || {};
    if (!tipo_evento) return res.status(400).json({ error: "tipo_evento obrigatorio" });
    try {
      const { error } = await sb.from("eventos_trafego").insert({
        user_id: studioUserIdRE,
        tipo_evento,
        origem: origem || "",
        cliente_id: cliente_id || null,
        criado_em: new Date().toISOString()
      });
      if (error) {
        console.error("registrar-evento error:", error);
        return res.status(200).json({ ok: false });
      }
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("registrar-evento exception:", e.message);
      return res.status(200).json({ ok: false });
    }
  }

  if (acao === "vincular-campanha") {
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

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { nome, tel, email, idea, ideia, artista, artistaNome, insta, regiao, nascimento, referencias, orig, obs: obsExtra, chat_log, slug: siteSlugRaw, origem_slug: origemSlug, palavra_secreta: palavraSecreta, clienteId: clienteIdBody, servico, periodo_ligacao: periodoLigacao, faixaInvestimento, retornoAtendimento, motivoRetorno, finalizado } = req.body;
  // Normalização equivalente à já usada em lead_busca -- espaço incidental
  // não deveria diferenciar um slug válido de "inexistente".
  const siteSlug = (siteSlugRaw || "").trim();
  // Correção (Bloco 1 -- Reconstrução da Captação, 2026-08-15): a checagem
  // anterior só rejeitava quando os TRÊS chegavam vazios ao mesmo tempo
  // (`!nome && !tel && !email`) -- bastava um único campo preenchido pra
  // passar, mesmo que os outros dois estivessem ausentes. Nome, WhatsApp e
  // e-mail são obrigatórios de verdade: falta de QUALQUER um dos três
  // rejeita a requisição inteira. Mensagem genérica de propósito -- não
  // expõe qual validação específica falhou.
  if (!camposObrigatoriosPreenchidos(nome, tel, email)) {
    return res.status(400).json({ error: "Nome completo, WhatsApp e e-mail são obrigatórios." });
  }

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
    // Fixo em "lead" ("Clientes interessados") -- endpoint público, sem
    // autenticação, não pode aceitar etapa externa (Bloco de Unificação da
    // Entrada de Clientes Interessados, 2026-08-14). O corpo da requisição
    // ainda pode mandar um campo "etapa", mas ele é ignorado de propósito.
    etapa: "lead",
    orig: orig || "Site",
    descricao: ideaFinal,
    nascimento: nascimentoISO,
    artista: artista || null,
    estilo: "",
    regiao: regiao || "",
    servico: servico || null,
    periodo_ligacao: periodoLigacao || null,
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

  // Site do tenant sempre manda `slug` -- resolve o dono certo. Falha fechada
  // se slug ausente, inexistente ou tenant não ativo (nenhum fallback).
  if (!siteSlug) {
    return res.status(400).json({ error: "slug obrigatório" });
  }
  const { data: tenantLead } = await sb
    .from("ink_clientes")
    .select("auth_user_id, status")
    .eq("slug", siteSlug)
    .single();
  if (!tenantLead || tenantLead.status !== "ativo" || !tenantLead.auth_user_id) {
    return res.status(404).json({ error: "Estúdio não encontrado" });
  }
  const { permitido: permitidoPost } = await verificarRateLimit("lead_post", ip + "|tenant:" + tenantLead.auth_user_id);
  if (!permitidoPost) return res.status(429).json({ error: "Muitas requisições. Aguarde um instante." });
  row.user_id = tenantLead.auth_user_id;

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
  // Mesma composição usada na migration SQL de clientes.chave_dedup --
  // telefone só dígitos + primeiro nome normalizado. Calculável assim que
  // nome+telefone chegam juntos pela primeira vez (sempre acontece na mesma
  // requisição, já que salvar() reenvia o objeto lead inteiro a cada passo).
  function calcularChaveDedup(nomeVal, telVal) {
    const dig = telVal ? String(telVal).replace(/[^0-9]/g, "").slice(-11) : "";
    const pn = primeiroNome(nomeVal);
    return (dig && pn) ? (dig + "|" + pn) : null;
  }
  // E-mail/telefone não são chave única de propósito (comum em estúdio: casal,
  // pai/filho, família dividindo uma conta) -- isso só monta o texto de aviso
  // pro Parecer da Aura quando o mesmo dado aparece em outro cadastro com nome
  // diferente. Reexecutado a cada chamada (inclusive na finalização), pra não
  // se perder quando o Parecer é reconstruído do zero no passo final.
  function detectarCompartilhamento(nomeAtual, telAtual, emailAtual, existentesLista, idExcluir) {
    const telDigitsAtual = telAtual ? String(telAtual).replace(/[^0-9]/g, "").slice(-11) : null;
    const emailNormAtual = emailAtual ? String(emailAtual).trim().toLowerCase() : null;
    const primeiroNomeAtual = primeiroNome(nomeAtual);
    const outroTel = telDigitsAtual
      ? (existentesLista || []).find(c => String(c.id) !== String(idExcluir) && c.tel && c.tel.replace(/[^0-9]/g, "").slice(-11) === telDigitsAtual && primeiroNome(c.nome) !== primeiroNomeAtual)
      : null;
    const outroEmail = emailNormAtual
      ? (existentesLista || []).find(c => String(c.id) !== String(idExcluir) && c.email && c.email.trim().toLowerCase() === emailNormAtual && primeiroNome(c.nome) !== primeiroNomeAtual)
      : null;
    if (!outroTel && !outroEmail) return null;
    if (outroTel && outroEmail && outroTel.id === outroEmail.id) {
      return `⚠️ E-mail e telefone compartilhados: os dados informados também aparecem no cadastro de ${outroTel.nome}. Os registros foram mantidos separadamente.`;
    }
    if (outroTel && outroEmail) {
      return `⚠️ Telefone compartilhado com o cadastro de ${outroTel.nome} e e-mail compartilhado com o cadastro de ${outroEmail.nome}. Os registros foram mantidos separadamente.`;
    }
    if (outroEmail) {
      return `⚠️ E-mail compartilhado: o endereço informado também aparece no cadastro de ${outroEmail.nome}. Os registros foram mantidos separadamente.`;
    }
    return `⚠️ Telefone compartilhado: o número informado também aparece no cadastro de ${outroTel.nome}. Os registros foram mantidos separadamente.`;
  }

  let clienteId = null;
  let isNewClient = true;
  let avisoCompartilhamento = null;
  {
    const telDigits = tel ? tel.replace(/[^0-9]/g, "").slice(-11) : null;
    const emailNorm = email ? email.trim().toLowerCase() : null;
    const chaveDedupAtual = calcularChaveDedup(nome, tel);

    let match = null;

    // 1) Conversa já em andamento -- o id já é conhecido, busca direto por ele.
    if (clienteIdBody) {
      const { data } = await sb.from("clientes").select("*").eq("id", clienteIdBody).eq("user_id", row.user_id).maybeSingle();
      match = data || null;
      if (match) isNewClient = false;
    }

    // 2) Resolução atômica por chave_dedup (telefone + primeiro nome) -- cria
    // só se realmente não existir ainda para este tenant. Duas requisições
    // concorrentes (ex: duplo toque no mobile) nunca resultam em duas linhas:
    // a segunda encontra o UNIQUE(user_id, chave_dedup) já ocupado e o
    // upsert simplesmente não insere nada (ignoreDuplicates: true). Telefone
    // compartilhado com primeiro nome diferente continua virando um
    // registro à parte, de propósito -- chave diferente, sem conflito.
    if (!match && chaveDedupAtual) {
      const { data: criado } = await sb.from("clientes")
        .upsert({ ...row, chave_dedup: chaveDedupAtual }, { onConflict: "user_id,chave_dedup", ignoreDuplicates: true })
        .select("*")
        .maybeSingle();
      if (criado) {
        match = criado;
        isNewClient = true;
      } else {
        const { data: existente } = await sb.from("clientes")
          .select("*").eq("user_id", row.user_id).eq("chave_dedup", chaveDedupAtual).maybeSingle();
        match = existente || null;
        if (match) isNewClient = false;
      }
    }

    // 3) Fallback -- só quando a chave ainda não pôde ser calculada nesta
    // requisição específica (ex: telefone ainda inválido/ausente). Mesmo
    // espírito da busca por e-mail que já existia antes desta mudança.
    if (!match && emailNorm) {
      const { data: existentes } = await sb.from("clientes").select("*").eq("user_id", row.user_id).is("excluido_em", null);
      match = (existentes || []).find(c => c.email && c.email.trim().toLowerCase() === emailNorm) || null;
      if (match) isNewClient = false;
    }

    // Aviso de compartilhamento -- informativo pro Parecer (ex: telefone
    // igual ao de outro cliente com primeiro nome diferente). Independente
    // da resolução de identidade acima, que agora é garantida pelo banco.
    if (telDigits || emailNorm) {
      const { data: candidatosAviso } = await sb.from("clientes")
        .select("id,nome,tel,email").eq("user_id", row.user_id).is("excluido_em", null);
      avisoCompartilhamento = detectarCompartilhamento(nome, tel, email, candidatosAviso, match ? match.id : null);
    }

    if (match && !isNewClient) {
      if (retornoAtendimento) {
        // Caminho "Continuar atendimento" (Grupo B): não mexe em serviço,
        // descrição, região, etapa ou Parecer -- só registra o retorno no
        // histórico, exatamente como decidido na Auditoria Pré-Implementação.
        const novoHist = [
          ...(Array.isArray(match.hist) ? match.hist : []),
          { t: "Cliente retornou pelo site — " + (motivoRetorno || "motivo não informado"), d: new Date().toLocaleString("pt-BR") },
        ];
        const { error: erroUpdateRetorno } = await sb.from("clientes").update({ hist: novoHist, excluido_em: null }).eq("id", match.id);
        if (erroUpdateRetorno) console.error("ERRO update cliente retornando (criarSolicitacao):", JSON.stringify(erroUpdateRetorno));
        clienteId = match.id;
      } else {
        // Bloco 3.2A -- Roteamento seguro e privacidade (2026-08-16): cadastro
        // já existente é só reconhecido, nunca tem sua vida operacional
        // reinterpretada por uma nova passagem pelo formulário público --
        // origem, campanha e dados de intenção/solicitação (descrição, região,
        // serviço, artista, observações, período de ligação) PARAM de ser
        // escritos aqui. Mantido só o enriquecimento cadastral mínimo, que
        // nunca sobrescreve dado real já existente (maisCompleto/só-se-vazio).
        // Ver docs/06-reconstrucao-captacao-site.md.
        const updateFields = { excluido_em: null };
        campanhaAplicada = null; // cadastro existente nunca aplica/reporta campanha
        const nomeVal = maisCompleto(match.nome, nome);
        if (nomeVal) updateFields.nome = nomeVal;
        const emailVal = maisCompleto(match.email, email);
        if (emailVal) updateFields.email = emailVal;
        if (telDigits && !match.tel) updateFields.tel = tel;
        const instaVal = maisCompleto(match.insta, insta);
        if (instaVal) updateFields.insta = instaVal;
        if (nascimentoISO && !match.nascimento) updateFields.nascimento = nascimentoISO;
        // Bloco de Unificação da Entrada de Clientes Interessados (2026-08-14):
        // removido o bloco que deixava a requisição pública escolher a etapa de um
        // cliente já existente via etapaSolicitada (campo "etapa" do corpo da
        // requisição). Motivo duplo: (1) decisão de produto -- consulta/sessão só
        // viram etapa quando existe agendamento real na Agenda, não por "intenção"
        // declarada; (2) segurança -- esse endpoint é público, sem autenticação,
        // e permitia que qualquer chamador externo definisse etapa livremente
        // (inclusive reintroduzindo lead_morno ou aura_agend, que não existem
        // mais). etapaSolicitada nunca é mais lida por este handler.
        // Gera o Parecer da Aura (resumo corrido pra ficha, ao lado do CPF) só
        // quando a conversa termina de verdade (finalizado) -- gerar já na
        // classificação perdia dados que só vêm depois (período, e-mail). A
        // Solicitação de Serviço na aba Projeto continua 100% manual, feita
        // presencialmente pelo estúdio -- o chat não abre nada lá sozinho.
        // Resumo em tópicos (Bloco 1 — Aura 1.0): mesmo contrato de dado (string
        // em parecer_aura, sempre sobrescrito, sem histórico/versionamento) --
        // só muda a organização do texto pra facilitar a leitura do tatuador.
        // "Estágio de decisão" e "Próxima ação sugerida" derivam da etapa já
        // calculada acima; nenhum dado novo é persistido em coluna própria.
        // Pausado em 2026-08-14: captação de lead virou ficha estática (sem
        // conversa pra resumir), então não faz sentido gerar Parecer da Aura
        // pra leads novos por enquanto. Lógica mantida intacta -- só a
        // condição abaixo impede que rode, fácil de reativar depois.
        if (false && finalizado && (ideaFinal || servico)) {
          const nomeParecer = updateFields.nome || match.nome || nome || "";
          const telParecer = tel || match.tel || "";
          const regiaoParecer = updateFields.regiao || match.regiao || regiao || "";
          const qtdReferencias = (match.referencias || []).length;
          const etapaFinal = updateFields.etapa || match.etapa || "";
          // Bloco de Unificação (2026-08-14): as duas etapas de entrada que esses
          // mapas diferenciavam deixaram de existir -- todo contato novo nasce em
          // "lead" hoje, então não há mais "estágio" pra distinguir aqui. Mantido
          // como mapa de 1 entrada (em vez de apagar) só pra preservar o texto
          // amigável de "lead" sem quebrar o fallback pro id bruto de etapas mais
          // avançadas (ex.: se um dia isto for reativado com um cliente que já
          // avançou no Pipeline antes do resumo ser gerado).
          const ESTAGIO_TEXTO = { lead: "Contato novo, ainda não avaliado" };
          const PROXIMA_ACAO = { lead: "Avaliar o pedido e dar o primeiro retorno ao cliente" };

          const bullets = [];
          if (nomeParecer) bullets.push("Nome: " + nomeParecer);
          if (telParecer) bullets.push("Telefone: " + telParecer);
          if (ideaFinal) bullets.push("Projeto: " + ideaFinal);
          if (regiaoParecer) bullets.push("Região do corpo: " + regiaoParecer);
          bullets.push("Referências enviadas: " + (qtdReferencias > 0 ? (qtdReferencias + (qtdReferencias === 1 ? " imagem" : " imagens")) : "Nenhuma"));
          if (faixaInvestimento) bullets.push("Faixa de investimento: " + faixaInvestimento);
          if (etapaFinal) bullets.push("Estágio de decisão: " + (ESTAGIO_TEXTO[etapaFinal] || etapaFinal));
          if (periodoLigacao) bullets.push("Melhor período para contato: " + periodoLigacao);
          if (artistaNome) bullets.push("Artista escolhido: " + artistaNome);
          bullets.push("Próxima ação sugerida: " + (PROXIMA_ACAO[etapaFinal] || "Avaliar contato e dar retorno ao cliente"));

          const cabecalho = avisoCompartilhamento ? avisoCompartilhamento + "\n\n" : "";
          updateFields.parecer_aura = cabecalho + "Resumo do atendimento\n" + bullets.map(b => "• " + b).join("\n");
        }
        // Mantém chave_dedup em sincronia se nome/telefone mudaram nesta
        // requisição (ex: correção no fim da conversa) -- tentativa separada
        // e silenciosa, pra nunca derrubar o salvamento principal por causa
        // disso (ex: colisão rara com a chave de outro cliente já existente).
        if (chaveDedupAtual && chaveDedupAtual !== match.chave_dedup) {
          sb.from("clientes").update({ chave_dedup: chaveDedupAtual }).eq("id", match.id).then(() => {}).catch(() => {});
        }
        const { error: erroUpdateMatch } = await sb.from("clientes").update(updateFields).eq("id", match.id);
        if (erroUpdateMatch) console.error("ERRO update cliente existente (criarSolicitacao):", JSON.stringify(erroUpdateMatch), "campos:", JSON.stringify(updateFields));
        clienteId = match.id;
      }
    } else if (match && isNewClient) {
      // Acabou de ser criado agora mesmo pelo upsert atômico -- já está com
      // os dados corretos de `row`, nada a mesclar.
      clienteId = match.id;
      if (avisoCompartilhamento) {
        await sb.from("clientes").update({ parecer_aura: avisoCompartilhamento }).eq("id", match.id);
      }
    }
  }

  // Fallback final -- só chega aqui se chave_dedup não pôde ser calculada
  // nesta chamada e nenhum outro caminho encontrou/criou o cliente (ex:
  // requisição isolada sem telefone/nome válidos ainda).
  if (!clienteId) {
    const { data: inserted, error } = await sb.from("clientes").insert(row).select("id").single();
    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }
    clienteId = inserted?.id || null;
    isNewClient = true;
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

  // deveNotificar so dispara quando a conversa termina de verdade (finalizado,
  // mandado so pela ultima confirmacao). Antes usava a mudanca de etapa como
  // gatilho, mas isso acontece no MEIO da conversa -- e-mail e periodo de
  // ligacao ainda nao tinham sido perguntados, entao o aviso e o e-mail de
  // boas-vindas ao cliente saiam incompletos (as vezes nem enviavam, por
  // faltar e-mail nesse ponto especifico).
  const deveNotificar = !!finalizado;
  // Bloco 3.2A -- resposta pública neutra: nunca expõe etapa/projetos/artista
  // nem qualquer outro dado operacional interno do cadastro, novo ou
  // existente -- evita transformar o formulário público em mecanismo de
  // enumeração de clientes.
  if (!isNewClient) {
    if (!deveNotificar) return res.status(200).json({ ok: true, clienteId, updated: true, campanha: campanhaResp });
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

  // artista chega como ID (não mais texto) -- resolve nome/e-mail uma vez só,
  // reaproveitado no alerta interno e no e-mail do cliente.
  let artistaNomeResolvido = null;
  let artistaEmailResolvido = null;
  if (artista) {
    try {
      const { data: artRow } = await sb.from("artistas").select("email, nome").eq("id", artista).eq("user_id", row.user_id).maybeSingle();
      if (artRow?.nome) artistaNomeResolvido = artRow.nome;
      if (artRow?.email) artistaEmailResolvido = artRow.email;
    } catch {}
  }

  // E-mail de boas-vindas ao cliente (controlado por fluxo_boas_vindas_email_ativa)
  const resendKey = process.env.RESEND_API_KEY;
  const LOGO_EMAIL_URL = "https://inq-saas.vercel.app/logo-ink-system.png";
  const logoEmailTag = "<img src='" + LOGO_EMAIL_URL + "' width='180' height='53' alt='Ink System' style='display:block;margin-bottom:16px'>";

  // Serverless: sem await aqui a função pode encerrar antes do Resend responder
  // (fire-and-forget não é confiável na Vercel) -- por isso ambos os envios
  // abaixo são aguardados. Falha de e-mail nunca derruba o lead: o cadastro já
  // foi persistido antes deste ponto, então só registramos e seguimos.
  async function enviarEmailLead(tipo, payload) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) {
        let corpo = "";
        try { corpo = (await resp.text()).slice(0, 300); } catch {}
        console.error(`Falha ao enviar e-mail (${tipo}) via Resend: status ${resp.status} — ${corpo}`);
      }
    } catch (e) {
      console.error(`Erro ao enviar e-mail (${tipo}) via Resend:`, e && e.message);
    }
  }

  // E-mail de alerta interno ao profissional responsável -- Bloco 3.2A: o
  // alerta rotula a submissão como "Novo lead" (assunto/título abaixo, texto
  // intencionalmente preservado); cadastro já reconhecido (isNewClient ===
  // false) não deve gerar esse alerta, para não induzir a equipe a tratar
  // reincidência como entrada operacional nova. E-mail 2 pro cadastro
  // reconhecido pertence ao Bloco 3.2B, não implementado aqui.
  if (isNewClient && cfgDisparos?.fluxo_notificacao_artista_ativa !== false && resendKey) {
    let emailArtista = artistaEmailResolvido || cfgDisparos?.studio_email || null;
    const emailFrom2Raw = process.env.EMAIL_REMETENTE || "";
    const emailFrom2 = emailFrom2Raw ? nomeEstudioLead + " <" + emailFrom2Raw + ">" : emailFrom2Raw;
    if (emailArtista) {
    const nascFormatadoAlerta = nascimentoISO ? nascimentoISO.split("-").reverse().join("/") : "—";
    const htmlAlerta =
      "<div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;padding:28px'>" +
      logoEmailTag +
      "<p style='font-size:18px;font-weight:700;color:#c9a84c;margin-bottom:4px'>✦ Novo lead — " + nome + "</p>" +
      "<hr style='border:none;border-top:1px solid #c9a84c33;margin-bottom:18px'>" +
      "<table style='width:100%;border-collapse:collapse;font-size:13px'>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555;width:140px'>Nome</td><td style='padding:8px 12px;color:#222'>" + nome + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Telefone</td><td style='padding:8px 12px;color:#222'>" + (tel || "—") + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>E-mail</td><td style='padding:8px 12px;color:#222'>" + (email || "—") + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Artista</td><td style='padding:8px 12px;color:#222'>" + (artistaNomeResolvido || "A definir") + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Ideia / projeto</td><td style='padding:8px 12px;color:#222'>" + (ideaFinal || "—") + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Região</td><td style='padding:8px 12px;color:#222'>" + (regiao || "—") + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Instagram</td><td style='padding:8px 12px;color:#222'>" + (insta || "—") + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Data de nascimento</td><td style='padding:8px 12px;color:#222'>" + nascFormatadoAlerta + "</td></tr>" +
      (obsExtra ? "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Observações</td><td style='padding:8px 12px;color:#222'>" + obsExtra + "</td></tr>" : "") +
      "</table>" +
      "<p style='margin-top:20px;font-size:12px;color:#aaa'>Entre no INK SYSTEM para dar andamento.</p></div>";
    await enviarEmailLead("alerta ao artista", { from: emailFrom2, to: [emailArtista], subject: "✦ Novo lead — " + nome, html: htmlAlerta });
    }
  }
  if (cfgDisparos?.fluxo_boas_vindas_email_ativa !== false && resendKey && email) {
    const emailFromRaw = process.env.EMAIL_REMETENTE || "";
    const emailFrom = emailFromRaw ? nomeEstudioLead + " <" + emailFromRaw + ">" : emailFromRaw;
    const artistaNome = artistaNomeResolvido;
    const waNumero = cfgDisparos?.studio_tel ? "55" + cfgDisparos.studio_tel.replace(/\D/g, "") : "";
    const waTexto = "Olá! Recebi agora o e-mail confirmando meu cadastro na " + nomeEstudioLead + ". Meus dados: " + nome +
      (ideaFinal ? ", projeto de " + ideaFinal : "") + (regiao ? " na região " + regiao : "") + (artistaNomeResolvido ? ", com " + artistaNomeResolvido : "") +
      ". Se for possível, vocês conseguem adiantar meu atendimento? Agradeço desde já!";
    const waLink = waNumero ? "https://wa.me/" + waNumero + "?text=" + encodeURIComponent(waTexto) : "";
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
      "<tr><td style='padding:8px 12px;color:#555'>Artista</td><td style='padding:8px 12px;color:#222'>" + (artistaNomeResolvido || ni) + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Ideia / projeto</td><td style='padding:8px 12px;color:#222'>" + (ideaFinal || ni) + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Região do corpo</td><td style='padding:8px 12px;color:#222'>" + (regiao || ni) + "</td></tr>" +
      "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Instagram</td><td style='padding:8px 12px;color:#222'>" + (insta || ni) + "</td></tr>" +
      "<tr><td style='padding:8px 12px;color:#555'>Data de nascimento</td><td style='padding:8px 12px;color:#222'>" + nascFormatado + "</td></tr>" +
      (obsExtra ? "<tr style='background:#f7f3ee'><td style='padding:8px 12px;color:#555'>Observações</td><td style='padding:8px 12px;color:#222'>" + obsExtra + "</td></tr>" : "") +
      "</table>";
    const htmlBoasVindas =
      "<div style='font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#222;background:#fff;padding:32px'>" +
      logoEmailTag +
      "<p style='font-size:22px;font-weight:bold;color:#1a1a1a;margin-bottom:4px'>" + nomeEstudioLead + "</p>" +
      "<hr style='border:none;border-top:1px solid #d4a84b;margin-bottom:24px'>" +
      "<p style='font-size:16px'>Olá, <strong>" + fn + "</strong>!</p>" +
      "<p style='line-height:1.8;color:#333'>Que alegria receber sua ideia aqui na " + nomeEstudioLead + ". Já registramos tudo com cuidado" +
      (artistaNome ? " — e vimos que você tem interesse em tatuar com <strong>" + artistaNome + "</strong>!" : "!") + "</p>" +
      "<p style='line-height:1.8;color:#333'>Em até 24h, alguém da nossa equipe vai te ligar pessoalmente para conversar sobre os detalhes do seu projeto. Sem formulário, sem robô — conversa de gente pra gente.</p>" +
      (waLink ? "<p style='line-height:1.8;color:#333'>Se preferir adiantar por WhatsApp, é só chamar a gente aqui:</p><p><a href='" + waLink + "' style='display:inline-block;background:linear-gradient(135deg,#2CE370,#1DA851);color:#fff;text-decoration:none;padding:13px 28px;border-radius:50px;font-size:14px;font-weight:bold;box-shadow:0 4px 14px rgba(29,168,81,0.35)'><span style='display:inline-block;vertical-align:middle;margin-right:8px;width:16px;height:16px'><svg width='16' height='16' viewBox='0 0 24 24' fill='#fff' style='display:block'><path d='M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2Zm5.8 14.02c-.24.68-1.4 1.32-1.94 1.4-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.79-4.17-4.94-4.36-.14-.2-1.18-1.56-1.18-2.98s.75-2.11 1.02-2.4c.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.41-.07.64.49.24.57.81 1.98.88 2.12.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.54.33.07.12.07.68-.17 1.36Z'/></svg></span><span style='display:inline-block;vertical-align:middle'>Chamar no WhatsApp</span></a></p>" : "") +
      "<p style='line-height:1.8;color:#333;margin-top:20px'>Trabalhamos só com hora marcada, então cada projeto recebe atenção total — do primeiro traço ao último detalhe.</p>" +
      "<p style='margin-top:8px;line-height:1.8;color:#333'><strong>Resumo do que registramos:</strong></p>" +
      resumoDados +
      "<p style='line-height:1.8;color:#333;margin-top:16px'>Obrigado por escolher fazer parte da nossa família. Já estamos ansiosos para te conhecer. 🖤</p>" +
      "<p style='margin-top:32px;font-size:12px;color:#999'>Com carinho,<br><strong>" + nomeEstudioLead + "</strong>" + (cidadeLead ? " — " + cidadeLead : "") + "</p>" +
      "<p style='margin-top:20px;font-size:11px;color:#bbb'>Não é necessário responder este e-mail — se preferir falar com a gente, use o WhatsApp acima.</p>" +
      "</div>";
    // reply_to aponta pro e-mail do próprio estúdio (não pro remetente técnico
    // compartilhado por todos os tenants) -- sem isso, resposta de lead de
    // qualquer estúdio cairia todas no mesmo lugar, misturadas.
    const replyToEstudio = cfgDisparos?.studio_email || null;
    await enviarEmailLead("boas-vindas ao cliente", {
      from: emailFrom,
      to: [email],
      ...(replyToEstudio ? { reply_to: replyToEstudio } : {}),
      subject: "Recebemos sua mensagem, " + fn + "! 🖤",
      html: htmlBoasVindas
    });
  }

  return res.status(200).json({ ok: true, clienteId, campanha: campanhaResp });
}
