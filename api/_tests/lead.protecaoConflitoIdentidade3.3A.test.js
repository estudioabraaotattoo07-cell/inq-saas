// api/_tests/lead.protecaoConflitoIdentidade3.3A.test.js
//
// Bloco 3.3A -- Proteção contra reconhecimento de identidade errada
// (2026-08-16): quando o passo 2 (upsert atômico por chave_dedup) encontra
// um cliente já existente por colisão de chave, mas a submissão e o
// registro encontrado têm e-mails preenchidos e DIFERENTES, isso é
// evidência positiva de que são pessoas diferentes que só coincidem em
// telefone + primeiro nome -- o registro encontrado deixa de ser tratado
// automaticamente como "match" desta submissão, evitando atualizar o
// cadastro de outra pessoa. Quando não há e-mail em um dos dois lados
// (mais comum: submissão só com telefone), não há dado confiável pra essa
// checagem -- o comportamento permanece idêntico ao anterior a esta
// correção. Isso é uma limitação conhecida e aceita da versão 1.0, não uma
// omissão.
//
// Escopo estritamente aprovado: nenhuma resolução de concorrência real, nenhum
// RPC/SQL/migration/nova tabela/coluna, nenhuma normalização por nome
// completo, nenhuma segunda checagem pós-INSERT, nenhuma alteração na
// ressincronização de chave_dedup (mecanismo pré-existente, intocado).
//
// LIMITAÇÃO DE METODOLOGIA (mesma de lead.resolucaoIdentidade3.3A.test.js):
// `sb` é uma constante de módulo fechada, não injetável sem refatorar a
// assinatura do handler -- fora do escopo de "menor alteração possível".
// Por isso estes testes são ESTRUTURAIS: provam a ORDEM, o GATING e a
// AUSÊNCIA de efeitos colaterais indevidos por leitura do código-fonte.
//
// Rodar com: node --test api/_tests/lead.protecaoConflitoIdentidade3.3A.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

function semComentarios(texto) {
  return texto.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
}

function trechoRamoElse() {
  const idx2 = srcLead.indexOf("if (!match && chaveDedupAtual) {");
  assert.ok(idx2 !== -1, "bloco 2 (upsert por chave_dedup) não encontrado");
  const idxElse = srcLead.indexOf("} else {", idx2);
  assert.ok(idxElse !== -1, "ramo else do bloco 2 não encontrado");
  const idxFimBloco2 = srcLead.indexOf("// 3) Fallback", idxElse);
  assert.ok(idxFimBloco2 !== -1, "fim do bloco 2 não encontrado");
  return srcLead.slice(idxElse, idxFimBloco2);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1/2/3. Reconhece normalmente quando não há conflito; bloqueia quando há
// ═══════════════════════════════════════════════════════════════════════════

test("1. chave encontra registro com o MESMO e-mail (ou submissão/registro sem e-mail em algum lado): match é atribuído normalmente", () => {
  const trecho = trechoRamoElse();
  assert.match(trecho, /if \(existente && !conflitoDeEmail\) \{/, "a atribuição de match precisa continuar condicionada só à ausência de conflito");
  assert.match(trecho, /match = existente;/);
  assert.match(trecho, /isNewClient = false;/);
});

test("2. chave encontra registro com e-mail DIFERENTE (ambos preenchidos): match NÃO é atribuído a existente", () => {
  const trecho = trechoRamoElse();
  // A variável 'existente' nunca é atribuída a match fora do guard
  // 'if (existente && !conflitoDeEmail)' -- não existe nenhum outro
  // 'match = existente' incondicional no ramo else.
  const ocorrenciasAtribuicao = (trecho.match(/match = existente;/g) || []).length;
  assert.equal(ocorrenciasAtribuicao, 1, "só pode haver uma atribuição de match=existente, e ela precisa estar dentro do guard de conflito");
});

test("3. a checagem de conflito ocorre ANTES da atribuição de match (não depois)", () => {
  const trecho = trechoRamoElse();
  const idxConflito = trecho.indexOf("const conflitoDeEmail =");
  const idxAtribuicao = trecho.indexOf("match = existente;");
  assert.ok(idxConflito !== -1, "cálculo de conflitoDeEmail não encontrado");
  assert.ok(idxAtribuicao !== -1, "atribuição de match não encontrada");
  assert.ok(idxConflito < idxAtribuicao, "conflitoDeEmail precisa ser calculado antes de decidir se atribui match");
});

// ═══════════════════════════════════════════════════════════════════════════
// 4/5. Submissão sem e-mail / registro existente sem e-mail: comportamento
// anterior preservado (sem checagem de conflito possível)
// ═══════════════════════════════════════════════════════════════════════════

test("4. submissão sem e-mail (emailNorm null): conflitoDeEmail nunca fica true -- fórmula exige emailNorm truthy", () => {
  const trecho = trechoRamoElse();
  assert.match(
    trecho,
    /const conflitoDeEmail = !!\(existente && emailNorm && existente\.email && existente\.email\.trim\(\)\.toLowerCase\(\) !== emailNorm\);/,
    "a fórmula precisa exigir emailNorm (submissão) presente -- sem isso, curto-circuita e nunca detecta conflito"
  );
});

test("5. registro existente sem e-mail (existente.email vazio/null): conflitoDeEmail nunca fica true -- fórmula exige existente.email truthy", () => {
  const trecho = trechoRamoElse();
  // A mesma fórmula do teste anterior já cobre isso -- 'existente.email' é
  // um dos operandos do && antes da comparação, então um valor vazio/null
  // ali também curto-circuita pra false.
  assert.match(trecho, /existente\.email &&/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 6/7. Normalização: maiúsculas/minúsculas e espaços não geram falso conflito
// ═══════════════════════════════════════════════════════════════════════════

test("6. diferença só de maiúsculas/minúsculas no mesmo e-mail não gera conflito -- ambos os lados passam por .trim().toLowerCase() antes de comparar", () => {
  const trecho = trechoRamoElse();
  assert.match(trecho, /existente\.email\.trim\(\)\.toLowerCase\(\) !== emailNorm/, "existente.email precisa ser normalizado antes de comparar");
  // emailNorm (o lado da submissão) já vem normalizado por trim().toLowerCase()
  // no início do bloco de resolução de identidade (const emailNorm = email ?
  // email.trim().toLowerCase() : null;) -- não precisa normalizar de novo aqui.
  assert.match(srcLead, /const emailNorm = email \? email\.trim\(\)\.toLowerCase\(\) : null;/);
});

test("7. espaços nas extremidades do e-mail do registro existente não geram falso conflito -- .trim() aplicado", () => {
  const trecho = trechoRamoElse();
  assert.match(trecho, /existente\.email\.trim\(\)/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Nenhuma consulta de rede nova além das já existentes
// ═══════════════════════════════════════════════════════════════════════════

test("8. a proteção não faz nenhuma consulta de rede adicional -- usa só 'existente' (já buscado) e 'emailNorm' (já calculado)", () => {
  const trecho = trechoRamoElse();
  const qtdSelectsNoRamo = (trecho.match(/\.select\(/g) || []).length;
  // O único .select(...) do ramo else é o que já buscava 'existente' antes
  // desta correção -- a proteção em si (cálculo de conflitoDeEmail + guard)
  // não introduz nenhum .select/.from/.upsert/.insert novo.
  assert.equal(qtdSelectsNoRamo, 1, "não pode haver select adicional -- a checagem usa só dados já obtidos");
});

test("8b. só existe uma busca por chave_dedup no ramo else (a mesma de antes desta correção, não uma duplicada)", () => {
  const trecho = trechoRamoElse();
  const qtdBuscaPorChave = (trecho.match(/\.eq\("chave_dedup", chaveDedupAtual\)/g) || []).length;
  assert.equal(qtdBuscaPorChave, 1);
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Nenhuma heurística por nome completo foi introduzida
// ═══════════════════════════════════════════════════════════════════════════

test("9. a proteção não usa nome (completo ou primeiro) para detectar conflito -- só compara e-mails", () => {
  const trecho = trechoRamoElse();
  assert.doesNotMatch(trecho, /existente\.nome/, "a checagem de conflito não pode comparar nomes -- só e-mail, conforme autorizado");
  assert.doesNotMatch(trecho, /primeiroNome\(/, "não pode chamar primeiroNome dentro da checagem de conflito");
});

test("9b. calcularChaveDedup continua priorizando primeiro nome (função original intocada por esta correção)", () => {
  assert.match(srcLead, /export function primeiroNome\(s\) \{/);
  const qtd = (srcLead.match(/export function primeiroNome\(s\) \{/g) || []).length;
  assert.equal(qtd, 1, "não pode ter sido duplicada/alterada por engano");
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. Nenhum RPC/SQL/migration/merge foi introduzido; concorrência intocada
// ═══════════════════════════════════════════════════════════════════════════

test("10. nenhum RPC/SQL/migration/merge foi introduzido por esta correção", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
  assert.doesNotMatch(codigoAtivo, /merge/i);
});

test("10b. a resolução de concorrência simultânea não foi alterada -- upsert do bloco 2 continua exatamente o mesmo (onConflict/ignoreDuplicates preservados)", () => {
  assert.match(
    srcLead,
    /\.upsert\(\{ \.\.\.row, chave_dedup: chaveDedupAtual \}, \{ onConflict: "user_id,chave_dedup", ignoreDuplicates: true \}\)/,
    "o upsert atômico precisa continuar idêntico -- esta correção não mexe na resolução de concorrência"
  );
});

test("10c. a ressincronização pré-existente de chave_dedup permanece intocada (mesmo update simples, mesmo catch silencioso)", () => {
  const idx = srcLead.indexOf("if (chaveDedupAtual && chaveDedupAtual !== match.chave_dedup) {");
  assert.ok(idx !== -1);
  const bloco = srcLead.slice(idx, idx + 250);
  assert.match(bloco, /sb\.from\("clientes"\)\.update\(\{ chave_dedup: chaveDedupAtual \}\)\.eq\("id", match\.id\)/);
  assert.match(bloco, /\.then\(\(\) => \{\}\)\.catch\(\(\) => \{\}\);/);
});

test("10d. nenhuma nova function declaration foi introduzida -- a proteção é só uma const + if inline no bloco já existente", () => {
  const trecho = trechoRamoElse();
  const qtdFunctionDeclarations = (trecho.match(/\bfunction\s+\w+\s*\(/g) || []).length;
  assert.equal(qtdFunctionDeclarations, 0);
});
