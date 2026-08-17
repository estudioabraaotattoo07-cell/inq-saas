// api/_tests/lead.protecaoConflitoIdentidade3.3A.test.js
//
// Proteção contra reconhecimento de identidade errada quando NÃO há
// candidatos por e-mail nesta submissão (0, ou sem e-mail algum) -- quando a
// chave_dedup exata (donoExato) tem um e-mail preenchido e DIFERENTE do
// e-mail desta submissão, isso é evidência positiva de pessoas diferentes
// que só coincidem em telefone + primeiro nome. Nesse caso, "donoExato" não
// é tratado como o cliente desta submissão.
//
// Reescrito na correção final pré-commit (2026-08-17): a checagem agora vive
// no ramo "else if (donoExato)" da resolução unificada de identidade (ver
// lead.identidadeConflitante3.3A.test.js para a cobertura dos ESTADOS novos
// -- candidatos ambíguos por e-mail e conflito telefone x e-mail -- que não
// existiam quando este arquivo foi criado). Este arquivo cobre
// especificamente o caso mais simples (sem candidatos por e-mail nesta
// submissão), que continua existindo e sendo necessário.
//
// LIMITAÇÃO DE METODOLOGIA (mesma de todo o bloco): estrutural, sem
// Supabase real.
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

function trechoRamoSemCandidatos() {
  const idx = srcLead.indexOf("} else if (donoExato) {");
  assert.ok(idx !== -1, "ramo 'sem candidatos por e-mail' não encontrado");
  // Bloco 3.3B-B1 (2026-08-17): a condição ganhou "&& formulario !== 'captacao_detalhamento'" -- só o literal exato mudou.
  const fim = srcLead.indexOf('} else if (chaveDedupAtual && formulario !== "captacao_detalhamento") {', idx);
  assert.ok(fim !== -1, "fim do ramo não encontrado");
  return srcLead.slice(idx, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1/2/3. Reconhece normalmente quando não há conflito; bloqueia quando há
// ═══════════════════════════════════════════════════════════════════════════

test("1. donoExato com o MESMO e-mail (ou submissão/registro sem e-mail em algum lado): match é atribuído normalmente", () => {
  const trecho = trechoRamoSemCandidatos();
  assert.match(trecho, /if \(!conflitoDeEmail\) \{/);
  assert.match(trecho, /match = donoExato;/);
  assert.match(trecho, /isNewClient = false;/);
});

test("2. donoExato com e-mail DIFERENTE (ambos preenchidos): match NÃO é atribuído", () => {
  const trecho = trechoRamoSemCandidatos();
  const ocorrenciasAtribuicao = (trecho.match(/match = donoExato;/g) || []).length;
  assert.equal(ocorrenciasAtribuicao, 1, "só pode haver uma atribuição, e ela precisa estar dentro do guard de conflito");
});

test("3. a checagem de conflito ocorre ANTES da atribuição de match", () => {
  const trecho = trechoRamoSemCandidatos();
  const idxConflito = trecho.indexOf("const conflitoDeEmail =");
  const idxAtribuicao = trecho.indexOf("match = donoExato;");
  assert.ok(idxConflito !== -1 && idxAtribuicao !== -1);
  assert.ok(idxConflito < idxAtribuicao);
});

// ═══════════════════════════════════════════════════════════════════════════
// 4/5. Submissão sem e-mail / registro sem e-mail: comportamento preservado
// ═══════════════════════════════════════════════════════════════════════════

test("4. submissão sem e-mail (emailNorm null): conflitoDeEmail nunca fica true", () => {
  const trecho = trechoRamoSemCandidatos();
  assert.match(
    trecho,
    /const conflitoDeEmail = !!\(emailNorm && donoExato\.email && donoExato\.email\.trim\(\)\.toLowerCase\(\) !== emailNorm\);/
  );
});

test("5. registro sem e-mail (donoExato.email vazio/null): conflitoDeEmail nunca fica true", () => {
  const trecho = trechoRamoSemCandidatos();
  assert.match(trecho, /donoExato\.email &&/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 6/7. Normalização: maiúsculas/minúsculas e espaços não geram falso conflito
// ═══════════════════════════════════════════════════════════════════════════

test("6. diferença só de maiúsculas/minúsculas não gera conflito -- normalizado antes de comparar", () => {
  const trecho = trechoRamoSemCandidatos();
  assert.match(trecho, /donoExato\.email\.trim\(\)\.toLowerCase\(\) !== emailNorm/);
  assert.match(srcLead, /const emailNorm = email \? email\.trim\(\)\.toLowerCase\(\) : null;/);
});

test("7. espaços nas extremidades não geram falso conflito", () => {
  const trecho = trechoRamoSemCandidatos();
  assert.match(trecho, /donoExato\.email\.trim\(\)/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Nenhuma consulta de rede nova além das já existentes
// ═══════════════════════════════════════════════════════════════════════════

test("8. a proteção não faz nenhuma consulta de rede adicional -- usa só 'donoExato' (já buscado) e 'emailNorm' (já calculado)", () => {
  const trecho = trechoRamoSemCandidatos();
  const qtdSelects = (trecho.match(/\.select\(/g) || []).length;
  assert.equal(qtdSelects, 0, "este ramo não pode fazer nenhuma consulta -- donoExato já foi buscado antes, fora deste ramo");
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. Nenhuma heurística por nome completo
// ═══════════════════════════════════════════════════════════════════════════

test("9. a proteção não usa nome (completo ou primeiro) para detectar conflito -- só compara e-mails", () => {
  const trecho = trechoRamoSemCandidatos();
  assert.doesNotMatch(trecho, /donoExato\.nome/);
  assert.doesNotMatch(trecho, /primeiroNome\(/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. Nenhum RPC/SQL/migration/merge; concorrência não tocada por este ramo
// ═══════════════════════════════════════════════════════════════════════════

test("10. nenhum RPC/SQL/migration/merge nesta proteção", () => {
  const trecho = semComentarios(trechoRamoSemCandidatos());
  assert.doesNotMatch(trecho, /\.rpc\(/);
  assert.doesNotMatch(trecho, /merge/i);
});

test("10d. nenhuma nova function declaration foi introduzida -- só um const + if inline", () => {
  const trecho = trechoRamoSemCandidatos();
  const qtd = (trecho.match(/\bfunction\s+\w+\s*\(/g) || []).length;
  assert.equal(qtd, 0);
});
