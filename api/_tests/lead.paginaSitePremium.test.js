// api/_tests/lead.paginaSitePremium.test.js
//
// Sub-bloco 1 (2026-08-13) e Bloco 2 (remoção completa de Bronze/Prata/Ouro,
// 2026-08-13) -- inq-saas atende exclusivamente o Laboratório P&D: o site
// público (e a pré-visualização, que chama exatamente a mesma função) devem
// sempre usar carrossel automático e nunca cortar o portfólio de fotos.
// A função nem recebe mais um parâmetro "plano" (removido no Bloco 2, já que
// nada aqui dentro dependia mais dele). Este teste comprova isso diretamente
// na função pura que gera o HTML, sem precisar de rede, Supabase ou upload
// real de imagem.
//
// Mesma convenção de api/_tests/lead.planoSugeridoSemLegado.test.js: node:test
// nativo, sem rede real.
//
// Rodar com: node --test api/_tests/lead.paginaSitePremium.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// lead.js (e api/_lib/rateLimit.js, que ele importa) criam seus próprios
// clientes Supabase reais na importação -- valores fake aqui só evitam que a
// importação falhe por falta de env var; este teste nunca chama esse cliente.
process.env.VITE_SUPABASE_URL ||= "https://fake-para-teste.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "fake-para-teste";

const { paginaSitePremium } = await import("../lead.js");

const CFG_BASICO = { studio_name: "Estúdio Teste", studio_city: "Vitória", studio_estado: "ES", studio_tel: "27999990000" };

function artistaComFotos(qtd) {
  return {
    nome: "Artista Teste",
    insta: "",
    foto_site_url: "",
    bio_site: "",
    portfolio_fotos: Array.from({ length: qtd }, (_, i) => `https://exemplo.com/foto-${i}.jpg`),
  };
}

test("carrossel automático (classe go-right) é sempre o padrão -- função não recebe mais 'plano'", () => {
  const html = paginaSitePremium({}, CFG_BASICO, [artistaComFotos(3)], "estudio-teste", []);
  assert.match(html, /strip-track go-right/, 'esperava classe "go-right" no carrossel');
});

test("portfólio não é cortado, mesmo acima de 30 fotos (antigo teto do 'Ouro')", () => {
  const html = paginaSitePremium({}, CFG_BASICO, [artistaComFotos(35)], "estudio-teste", []);
  // Carrossel automático duplica a lista pro loop (ver comentário no código-fonte) --
  // 35 fotos vira 70 <div class="strip-item">. Se algum limite de plano ainda
  // existisse, esse número seria menor (ex.: 60 = 2x30, o antigo teto do "Ouro").
  const qtdStripItems = (html.match(/class="strip-item"/g) || []).length;
  assert.equal(qtdStripItems, 70, "esperava as 35 fotos completas (70 com a duplicação do loop), sem corte de limite de plano");
});

test("função aceita chamada com argumento extra ignorado (compatibilidade com chamador antigo) sem quebrar nem reintroduzir limite", () => {
  // Confirma que, mesmo se algum chamador esquecido ainda passar um 6º
  // argumento (o antigo "plano"), o resultado continua idêntico -- a função
  // simplesmente ignora qualquer argumento além do 5º.
  const htmlComExtra = paginaSitePremium({}, CFG_BASICO, [artistaComFotos(35)], "estudio-teste", [], "Ouro");
  const htmlSemExtra = paginaSitePremium({}, CFG_BASICO, [artistaComFotos(35)], "estudio-teste", []);
  assert.equal(htmlComExtra, htmlSemExtra);
});

test("nenhuma menção a Bronze, Prata ou Ouro aparece no HTML gerado", () => {
  const html = paginaSitePremium({}, CFG_BASICO, [artistaComFotos(2)], "estudio-teste", []);
  assert.doesNotMatch(html, /Bronze|Prata|Ouro/, "HTML não deveria citar planos legados em lugar nenhum");
});

// ── Regressão com dados vazios/incompletos (site novo, sem nada preenchido ainda) ──
test("não quebra com site/cfg vazios e nenhum artista", () => {
  assert.doesNotThrow(() => paginaSitePremium({}, {}, [], "estudio-teste", []));
});

test("não quebra com artistas sem portfolio_fotos (campo ausente, não só vazio)", () => {
  const artistaSemFotos = { nome: "Sem Fotos", insta: "", foto_site_url: "", bio_site: "" }; // portfolio_fotos nem existe
  assert.doesNotThrow(() => paginaSitePremium({}, CFG_BASICO, [artistaSemFotos], "estudio-teste", []));
  const html = paginaSitePremium({}, CFG_BASICO, [artistaSemFotos], "estudio-teste", []);
  assert.match(html, /Sem Fotos/, "deve renderizar o artista mesmo sem nenhuma foto cadastrada");
});

test("não quebra com campanhasAtivas ausente (undefined)", () => {
  // site/cfg vazios (mas presentes) representam o caso real de "site novo,
  // ainda sem conteúdo preenchido" -- os dois chamadores HTTP sempre
  // garantem site/cfg como objeto antes de chegar aqui (nunca null/undefined:
  // "acao=site" só chama depois de confirmar `site.publicado`, "acao=preview"
  // usa `site || {}`), então null/undefined em site/cfg não é um cenário real.
  assert.doesNotThrow(() => paginaSitePremium({}, CFG_BASICO, [], "estudio-teste", undefined));
});

// ── Site publicado e pré-visualização usam a mesma função (contrato estrutural) ──
// Não mocka o handler HTTP inteiro (exigiria simular o cliente Supabase para
// os dois SELECTs de ink_clientes) -- em vez disso, confirma diretamente no
// código-fonte que os dois pontos de entrada ("acao=site" e "acao=preview")
// chamam paginaSitePremium(), a mesma função testada acima. Se um dia algum
// dos dois passar a montar o HTML de outro jeito, este teste quebra.
test("os dois chamadores HTTP (site real e prévia) usam paginaSitePremium()", () => {
  const caminhoLeadJs = fileURLToPath(new URL("../lead.js", import.meta.url));
  const codigoFonte = readFileSync(caminhoLeadJs, "utf8");
  const blocoSite = codigoFonte.slice(codigoFonte.indexOf('acao === "site"'), codigoFonte.indexOf('acao === "preview"'));
  const blocoPreview = codigoFonte.slice(codigoFonte.indexOf('acao === "preview"'));
  assert.match(blocoSite, /paginaSitePremium\(/, "o bloco acao=site deveria chamar paginaSitePremium()");
  assert.match(blocoPreview, /paginaSitePremium\(/, "o bloco acao=preview deveria chamar paginaSitePremium()");
});
