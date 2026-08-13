// api/_tests/lead.planoSugeridoSemLegado.test.js
//
// Bloco 1 da remoção da arquitetura Bronze/Prata/Ouro (2026-08-13) --
// defesa no servidor de POST /api/lead?acao=criarSolicitacao: nenhum valor
// de plano_sugerido igual a Bronze, Prata ou Ouro (em qualquer variação de
// maiúscula/minúscula ou espaço em volta) pode ser persistido em ink_leads
// nem citado no e-mail de confirmação, não importa o que o chamador envie.
//
// Mesma convenção de api/_tests/provisionar.test.js: node:test nativo, sem
// rede real. Não testa o handler HTTP inteiro (não há separação entre lógica
// e req/res em lead.js hoje, ao contrário de provisionar.js) -- testa
// diretamente a função pura de defesa, que é o que decide o que é gravado e
// o que vai no e-mail.
//
// Rodar com: node --test api/_tests/lead.planoSugeridoSemLegado.test.js

import test from "node:test";
import assert from "node:assert/strict";

// lead.js (e api/_lib/rateLimit.js, que ele importa) criam seus próprios
// clientes Supabase reais na importação (mesmo padrão de provisionar.js) --
// valores fake aqui só evitam que a importação falhe por falta de env var;
// este teste nunca chama nenhum desses clientes.
process.env.VITE_SUPABASE_URL ||= "https://fake-para-teste.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "fake-para-teste";

const { planoSugeridoSemLegado } = await import("../lead.js");

test("rejeita Bronze/Prata/Ouro exatos", () => {
  assert.equal(planoSugeridoSemLegado("Bronze"), null);
  assert.equal(planoSugeridoSemLegado("Prata"), null);
  assert.equal(planoSugeridoSemLegado("Ouro"), null);
});

test("rejeita Bronze/Prata/Ouro em qualquer variação de maiúscula/minúscula", () => {
  assert.equal(planoSugeridoSemLegado("bronze"), null);
  assert.equal(planoSugeridoSemLegado("BRONZE"), null);
  assert.equal(planoSugeridoSemLegado("BroNZe"), null);
  assert.equal(planoSugeridoSemLegado("prata"), null);
  assert.equal(planoSugeridoSemLegado("PRATA"), null);
  assert.equal(planoSugeridoSemLegado("ouro"), null);
  assert.equal(planoSugeridoSemLegado("OURO"), null);
});

test("rejeita com espaços em volta", () => {
  assert.equal(planoSugeridoSemLegado("  Bronze  "), null);
  assert.equal(planoSugeridoSemLegado(" ouro"), null);
});

test("não transforma automaticamente em 1.0 -- resultado é null, não '1.0'", () => {
  assert.equal(planoSugeridoSemLegado("Ouro"), null);
  assert.notEqual(planoSugeridoSemLegado("Ouro"), "1.0");
});

test("valores vazios/ausentes viram null", () => {
  assert.equal(planoSugeridoSemLegado(""), null);
  assert.equal(planoSugeridoSemLegado("   "), null);
  assert.equal(planoSugeridoSemLegado(undefined), null);
  assert.equal(planoSugeridoSemLegado(null), null);
});

test("entrada de tipo inesperado (não-string) vira null, sem lançar exceção", () => {
  assert.equal(planoSugeridoSemLegado(123), null);
  assert.equal(planoSugeridoSemLegado({ plano: "Ouro" }), null);
  assert.equal(planoSugeridoSemLegado(["Ouro"]), null);
});

test("texto legítimo, não relacionado ao legado, passa intacto", () => {
  assert.equal(planoSugeridoSemLegado("Interesse geral no CRM"), "Interesse geral no CRM");
  assert.equal(planoSugeridoSemLegado("1.0"), "1.0");
});
