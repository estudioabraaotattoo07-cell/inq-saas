// api/_tests/lead.camposObrigatoriosPreenchidos.test.js
//
// Bloco 1 -- Reconstrução da Captação (2026-08-15): correção da validação
// obrigatória de nome/WhatsApp/e-mail no servidor. A checagem anterior
// (`!nome && !tel && !email`) só rejeitava quando os TRÊS chegavam vazios ao
// mesmo tempo -- bastava um único campo preenchido pra passar.
//
// Bloco 3.3A (2026-08-16): a regra mudou de novo -- nome deixou de exigir
// telefone E e-mail simultaneamente. Agora é nome + PELO MENOS UM contato
// válido (telefone OU e-mail). A ficha antiga continua sempre mandando os
// três (seu HTML nunca mudou), então essa relaxação nunca altera o
// comportamento observado por ela -- só habilita a nova seção de captação
// essencial, que pode enviar só um dos dois contatos.
//
// Este teste exercita a MESMA função usada pelo handler real (não uma
// cópia), e também confirma, por leitura estrutural do código-fonte, que a
// checagem continua posicionada ANTES de qualquer escrita no banco, disparo
// de e-mail, ou aceitação de etapa externa -- ou seja, uma requisição
// rejeitada não pode ter causado nenhum efeito colateral.
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

// ── Casos válidos (nome + pelo menos um contato) ────────────────────────────
test("nome + WhatsApp + e-mail (os três): válido", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", "maria@exemplo.com"), true);
});
test("nome + WhatsApp, sem e-mail: válido", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", undefined), true);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", ""), true);
});
test("nome + e-mail, sem WhatsApp: válido", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", undefined, "maria@exemplo.com"), true);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "", "maria@exemplo.com"), true);
});

// ── Casos inválidos ──────────────────────────────────────────────────────────
test("nome ausente (undefined): rejeita mesmo com os dois contatos presentes", () => {
  assert.equal(camposObrigatoriosPreenchidos(undefined, "27999998888", "maria@exemplo.com"), false);
});
test("WhatsApp sozinho, sem nome: rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos(undefined, "27999998888", undefined), false);
});
test("e-mail sozinho, sem nome: rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos(undefined, undefined, "maria@exemplo.com"), false);
});
test("nome sozinho, sem nenhum contato: rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", undefined, undefined), false);
});
test("nenhum campo preenchido: rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos(undefined, undefined, undefined), false);
});

// ── Casos de borda de texto ──────────────────────────────────────────────────
test("campos contendo somente espaços contam como ausentes (mesmo sendo string não-vazia e truthy em JS)", () => {
  assert.equal(camposObrigatoriosPreenchidos("   ", "27999998888", "maria@exemplo.com"), false, "nome só-espaço precisa continuar rejeitando");
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "   ", "   "), false, "os dois contatos só-espaço equivalem a nenhum contato");
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "   ", "maria@exemplo.com"), true, "WhatsApp só-espaço não invalida quando o e-mail é real");
  assert.equal(camposObrigatoriosPreenchidos("   ", "   ", "   "), false);
});
test("string vazia no nome: rejeita mesmo com contato válido", () => {
  assert.equal(camposObrigatoriosPreenchidos("", "27999998888", "maria@exemplo.com"), false);
});

// ── null explícito ───────────────────────────────────────────────────────────
test("null explícito: rejeita sem lançar exceção, e nome+um contato null ainda passa pelo outro", () => {
  assert.doesNotThrow(() => camposObrigatoriosPreenchidos(null, "27999998888", "maria@exemplo.com"));
  assert.equal(camposObrigatoriosPreenchidos(null, "27999998888", "maria@exemplo.com"), false, "nome null sempre rejeita");
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", null, "maria@exemplo.com"), true, "tel null não invalida se o e-mail é real");
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", null), true, "email null não invalida se o tel é real");
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", null, null), false, "os dois contatos null rejeita");
  assert.equal(camposObrigatoriosPreenchidos(null, null, null), false);
});

// ── Tipo inesperado (a requisição é JSON público, não passa só pelo navegador) ──
test("tipo inesperado (número, objeto, array, booleano) em qualquer campo: nunca lança exceção", () => {
  assert.doesNotThrow(() => camposObrigatoriosPreenchidos(123, "27999998888", "maria@exemplo.com"));
  assert.equal(camposObrigatoriosPreenchidos(123, "27999998888", "maria@exemplo.com"), false, "nome não-string sempre rejeita");
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", { numero: "27999998888" }, "maria@exemplo.com"), true, "tel de tipo errado é tratado como ausente, mas o e-mail real ainda passa");
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", ["27999998888"], ["maria@exemplo.com"]), false, "os dois contatos de tipo errado equivalem a nenhum contato");
  assert.equal(camposObrigatoriosPreenchidos(true, "27999998888", "maria@exemplo.com"), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", NaN), true);
});

test("textoObrigatorioValido isolado: mesma regra, testável campo a campo (função inalterada)", () => {
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

test("a resposta de erro usa HTTP 400 e a mensagem padrão reflete a regra atual, sem expor detalhe interno", () => {
  // Correção final pré-commit (2026-08-17): o retorno deixou de ser um
  // res.status(400) direto -- agora escolhe a mensagem certa por caso
  // (telefone/e-mail inválido, nenhum contato) antes de responder, ver
  // lead.validacaoContatoConsentimento3.3A.test.js. Este teste confirma que
  // a mensagem padrão (usada quando o problema é o nome) continua a mesma.
  assert.match(srcLead, /if \(!camposObrigatoriosPreenchidos\(nome, tel, email\)\) \{/);
  assert.match(srcLead, /let mensagemErro = "Nome completo e pelo menos um contato \(WhatsApp ou e-mail\) são obrigatórios\.";/);
  assert.match(srcLead, /return res\.status\(400\)\.json\(\{ error: mensagemErro \}\);/);
});

test("etapa continua fixa em \"lead\", controlada pelo servidor -- validação não reintroduziu aceitação de etapa externa", () => {
  assert.match(srcLead, /etapa: "lead",/);
  assert.doesNotMatch(srcLead, /etapa:\s*etapaSolicitada/);
});

test("a checagem antiga (só rejeita quando os três estão vazios ao mesmo tempo) não existe mais no código ativo", () => {
  assert.doesNotMatch(srcLead, /if \(!nome && !tel && !email\)/);
});

test("a exigência anterior de nome+tel+email simultâneos (Bloco 1) não existe mais no código ativo", () => {
  assert.doesNotMatch(srcLead, /textoObrigatorioValido\(nome\) && textoObrigatorioValido\(tel\) && textoObrigatorioValido\(email\)/);
});
