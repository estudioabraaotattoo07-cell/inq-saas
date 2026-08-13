// api/_tests/lead.paginaSitePremium.test.js
//
// Sub-bloco 1 da remoção de Bronze/Prata/Ouro (2026-08-13) -- inq-saas atende
// exclusivamente o Laboratório P&D: o site público (e a pré-visualização, que
// chama exatamente a mesma função) devem sempre usar carrossel automático e
// nunca cortar o portfólio de fotos, não importa o que vier no parâmetro
// `plano`. Este teste comprova isso diretamente na função pura que gera o
// HTML, sem precisar de rede, Supabase ou upload real de imagem.
//
// Mesma convenção de api/_tests/lead.planoSugeridoSemLegado.test.js: node:test
// nativo, sem rede real.
//
// Rodar com: node --test api/_tests/lead.paginaSitePremium.test.js

import test from "node:test";
import assert from "node:assert/strict";

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

for (const plano of ["Ouro", "Prata", "Bronze", "1.0", "", null, undefined, "valor-desconhecido"]) {
  test(`carrossel automático (classe go-right) independe do plano — testado com plano=${JSON.stringify(plano)}`, () => {
    const html = paginaSitePremium({}, CFG_BASICO, [artistaComFotos(3)], "estudio-teste", [], plano);
    assert.match(html, /strip-track go-right/, `esperava classe "go-right" no carrossel para plano=${JSON.stringify(plano)}`);
  });

  test(`portfólio não é cortado, mesmo acima de 30 fotos — testado com plano=${JSON.stringify(plano)}`, () => {
    const html = paginaSitePremium({}, CFG_BASICO, [artistaComFotos(35)], "estudio-teste", [], plano);
    // Carrossel automático duplica a lista pro loop (ver comentário no código-fonte) --
    // 35 fotos vira 70 <div class="strip-item">. Se algum limite de plano ainda
    // existisse, esse número seria menor (ex.: 60 = 2x30, o antigo teto do "Ouro").
    const qtdStripItems = (html.match(/class="strip-item"/g) || []).length;
    assert.equal(qtdStripItems, 70, `esperava as 35 fotos completas (70 com a duplicação do loop), sem corte de limite de plano`);
  });
}

test("nenhuma menção a Bronze, Prata ou Ouro aparece no HTML gerado, mesmo passando esses valores como plano", () => {
  for (const plano of ["Ouro", "Prata", "Bronze"]) {
    const html = paginaSitePremium({}, CFG_BASICO, [artistaComFotos(2)], "estudio-teste", [], plano);
    assert.doesNotMatch(html, /Bronze|Prata|Ouro/, `HTML não deveria citar o plano "${plano}" em lugar nenhum`);
  }
});
