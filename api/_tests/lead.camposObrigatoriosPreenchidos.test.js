// api/_tests/lead.camposObrigatoriosPreenchidos.test.js
//
// Bloco 1 -- Reconstrução da Captação (2026-08-15): correção da validação
// obrigatória de nome/WhatsApp/e-mail no servidor. A checagem anterior
// (`!nome && !tel && !email`) só rejeitava quando os TRÊS chegavam vazios ao
// mesmo tempo -- bastava um único campo preenchido pra passar. Este teste
// exercita a MESMA função usada pelo handler real (não uma cópia), e também
// confirma, por leitura estrutural do código-fonte, que a checagem continua
// posicionada ANTES de qualquer escrita no banco, disparo de e-mail, ou
// aceitação de etapa externa -- ou seja, uma requisição rejeitada não pode
// ter causado nenhum efeito colateral.
//
// Rodar com: node --test api/_tests/lead.camposObrigatoriosPreenchidos.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

process.env.VITE_SUPABASE_URL ||= "https://fake-para-teste.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "fake-para-teste";

const { camposObrigatoriosPreenchidos, textoObrigatorioValido } = await import("../lead.js");

// ── Função pura: os três campos presentes ───────────────────────────────────
test("os três campos presentes (texto real): validação permite continuar", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", "maria@exemplo.com"), true);
});

// ── Um campo ausente por vez ────────────────────────────────────────────────
test("nome ausente (undefined): rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos(undefined, "27999998888", "maria@exemplo.com"), false);
});
test("WhatsApp ausente (undefined): rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", undefined, "maria@exemplo.com"), false);
});
test("e-mail ausente (undefined): rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", undefined), false);
});

// ── Combinações parciais ────────────────────────────────────────────────────
test("apenas um campo presente (os outros dois ausentes): rejeita -- este é exatamente o caso que a validação antiga deixava passar", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", undefined, undefined), false);
  assert.equal(camposObrigatoriosPreenchidos(undefined, "27999998888", undefined), false);
  assert.equal(camposObrigatoriosPreenchidos(undefined, undefined, "maria@exemplo.com"), false);
});
test("dois campos presentes, um ausente: rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", undefined), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", undefined, "maria@exemplo.com"), false);
  assert.equal(camposObrigatoriosPreenchidos(undefined, "27999998888", "maria@exemplo.com"), false);
});
test("todos ausentes: rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos(undefined, undefined, undefined), false);
});

// ── Casos de borda de texto ──────────────────────────────────────────────────
test("campos contendo somente espaços: rejeita (mesmo sendo string não-vazia e truthy em JS)", () => {
  assert.equal(camposObrigatoriosPreenchidos("   ", "27999998888", "maria@exemplo.com"), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "   ", "maria@exemplo.com"), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", "   "), false);
  assert.equal(camposObrigatoriosPreenchidos("   ", "   ", "   "), false);
});
test("string vazia: rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos("", "27999998888", "maria@exemplo.com"), false);
});

// ── null explícito ───────────────────────────────────────────────────────────
test("null explícito em qualquer um dos três campos: rejeita, sem lançar exceção", () => {
  assert.doesNotThrow(() => camposObrigatoriosPreenchidos(null, "27999998888", "maria@exemplo.com"));
  assert.equal(camposObrigatoriosPreenchidos(null, "27999998888", "maria@exemplo.com"), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", null, "maria@exemplo.com"), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", null), false);
  assert.equal(camposObrigatoriosPreenchidos(null, null, null), false);
});

// ── Tipo inesperado (a requisição é JSON público, não passa só pelo navegador) ──
test("tipo inesperado (número, objeto, array, booleano) em qualquer campo: rejeita, sem lançar exceção", () => {
  assert.doesNotThrow(() => camposObrigatoriosPreenchidos(123, "27999998888", "maria@exemplo.com"));
  assert.equal(camposObrigatoriosPreenchidos(123, "27999998888", "maria@exemplo.com"), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", { numero: "27999998888" }, "maria@exemplo.com"), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", ["maria@exemplo.com"]), false);
  assert.equal(camposObrigatoriosPreenchidos(true, "27999998888", "maria@exemplo.com"), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", NaN), false);
});

test("textoObrigatorioValido isolado: mesma regra, testável campo a campo", () => {
  assert.equal(textoObrigatorioValido("Maria"), true);
  assert.equal(textoObrigatorioValido(""), false);
  assert.equal(textoObrigatorioValido("   "), false);
  assert.equal(textoObrigatorioValido(null), false);
  assert.equal(textoObrigatorioValido(undefined), false);
  assert.equal(textoObrigatorioValido(123), false);
  assert.equal(textoObrigatorioValido({}), false);
  assert.equal(textoObrigatorioValido([]), false);
});

// ── Garantias estruturais: leitura do código-fonte real ─────────────────────
// Não é possível chamar o handler HTTP inteiro sem um Supabase real (mesma
// limitação já documentada em lead.paginaSitePremium.test.js e
// lead.planoSugeridoSemLegado.test.js) -- por isso estas garantias são
// verificadas por ESTRUTURA do código-fonte: a posição relativa das linhas
// prova que, se a validação falhar (return 400 antecipado), nenhum código
// depois dela pode ter rodado -- não é uma suposição, é a ordem real do
// arquivo.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

function indiceOuFalha(regex, motivo) {
  const idx = srcLead.search(regex);
  assert.ok(idx !== -1, `não encontrado no código-fonte: ${motivo}`);
  return idx;
}

test("a validação obrigatória está posicionada ANTES de qualquer escrita no banco (ink_clientes, chave_dedup, insert em clientes)", () => {
  const idxValidacao = indiceOuFalha(/if \(!camposObrigatoriosPreenchidos\(nome, tel, email\)\) \{/, "chamada da validação no handler");
  const idxTenantLookup = indiceOuFalha(/from\("ink_clientes"\)\s*\n\s*\.select\("auth_user_id, status"\)/, "resolução do tenant por slug");
  const idxDedupUpsert = indiceOuFalha(/onConflict: "user_id,chave_dedup"/, "upsert atômico de deduplicação");
  const idxInsertClientes = indiceOuFalha(/from\("clientes"\)\.insert\(row\)/, "insert final do cliente novo");

  assert.ok(idxValidacao < idxTenantLookup, "validação precisa vir antes da resolução do tenant");
  assert.ok(idxValidacao < idxDedupUpsert, "validação precisa vir antes da deduplicação");
  assert.ok(idxValidacao < idxInsertClientes, "validação precisa vir antes do insert do cliente");
});

test("a validação obrigatória está posicionada ANTES de qualquer disparo de e-mail (boas-vindas, alerta ao artista)", () => {
  const idxValidacao = indiceOuFalha(/if \(!camposObrigatoriosPreenchidos\(nome, tel, email\)\) \{/, "chamada da validação no handler");
  const idxEnviarEmailLead = indiceOuFalha(/async function enviarEmailLead\(tipo, payload\) \{/, "função de envio de e-mail");
  assert.ok(idxValidacao < idxEnviarEmailLead, "validação precisa vir antes da definição/uso do envio de e-mail");
});

test("a resposta de erro usa HTTP 400 e não expõe detalhe interno na mensagem", () => {
  assert.match(srcLead, /if \(!camposObrigatoriosPreenchidos\(nome, tel, email\)\) \{\s*\n\s*return res\.status\(400\)\.json\(\{ error: "Nome completo, WhatsApp e e-mail são obrigatórios\." \}\);/);
});

test("etapa continua fixa em \"lead\", controlada pelo servidor -- validação não reintroduziu aceitação de etapa externa", () => {
  assert.match(srcLead, /etapa: "lead",/);
  assert.doesNotMatch(srcLead, /etapa:\s*etapaSolicitada/);
});

test("a checagem antiga (só rejeita quando os três estão vazios ao mesmo tempo) não existe mais no código ativo", () => {
  assert.doesNotMatch(srcLead, /if \(!nome && !tel && !email\)/);
});
