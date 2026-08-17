// api/_tests/lead.resolucaoIdentidade3.3A.test.js
//
// Correção original da assimetria de chave_dedup do Bloco 3.3A (2026-08-16):
// quando uma submissão traz telefone E e-mail ao mesmo tempo, o código
// buscava por e-mail ANTES do upsert atômico por chave_dedup.
//
// SUBSTITUÍDO pela correção final pré-commit de 2026-08-17 (ver
// lead.identidadeConflitante3.3A.test.js para a cobertura completa da nova
// estrutura): a busca por e-mail deixou de exigir telefone junto -- agora
// roda sempre que há e-mail válido, e cruza com a chave_dedup exata ANTES
// de decidir (nunca escolhe entre candidatos ambíguos, e detecta conflito
// quando telefone e e-mail apontam pra clientes diferentes). Este arquivo
// foi reescrito pra continuar provando os mesmos cenários de identidade já
// aprovados (agora contra a estrutura final), sem duplicar a cobertura
// detalhada de estados de conflito/ambiguidade, que vive no arquivo novo.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): `sb` não é
// injetável sem refatorar a assinatura do handler -- por isso a cobertura
// aqui é ESTRUTURAL (ordem, gating, ausência de padrões), não comportamental
// de ponta a ponta contra um Supabase real.
//
// Rodar com: node --test api/_tests/lead.resolucaoIdentidade3.3A.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

function trechoResolucaoIdentidade() {
  const inicio = srcLead.indexOf("let clienteId = null;");
  const fim = srcLead.indexOf("// Saída controlada", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "bloco de resolução de identidade não encontrado");
  return srcLead.slice(inicio, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// Estrutura básica da resolução unificada
// ═══════════════════════════════════════════════════════════════════════════

test("candidatosPorEmail é calculado sempre que há e-mail válido, com ou sem telefone (não exige mais os dois juntos)", () => {
  const trecho = trechoResolucaoIdentidade();
  assert.match(trecho, /let candidatosPorEmail = null;/);
  assert.match(trecho, /if \(!match && emailNorm\) \{/, "a condição não pode mais exigir 'tel &&' -- isso era exatamente a lacuna que permitia a duplicidade da Ana teste");
  assert.doesNotMatch(trecho, /if \(!match && tel && emailNorm\)/, "a condição antiga (exigindo os dois) não pode mais existir");
});

test("donoExato (chave_dedup exata) é buscado por leitura ANTES de qualquer upsert -- nunca escreve antes de cruzar com candidatosPorEmail", () => {
  const trecho = trechoResolucaoIdentidade();
  const idxDono = trecho.indexOf("let donoExato = null;");
  const idxUpsert = trecho.indexOf(".upsert(");
  assert.ok(idxDono !== -1 && idxUpsert !== -1);
  assert.ok(idxDono < idxUpsert, "a leitura de donoExato precisa vir antes do upsert -- é isso que permite detectar conflito sem escrever nada indevido");
});

test("o upsert só roda no último ramo do if/else-if (ninguém possui a chave ainda) -- não é mais um bloco isolado que sempre tenta inserir primeiro", () => {
  const trecho = trechoResolucaoIdentidade();
  const qtdUpsert = (trecho.match(/\.upsert\(/g) || []).length;
  assert.equal(qtdUpsert, 1, "só pode haver um upsert no bloco de identidade");
});

// ═══════════════════════════════════════════════════════════════════════════
// Cenários de identidade normal (sem conflito), reprovados contra a nova
// estrutura
// ═══════════════════════════════════════════════════════════════════════════

test("1. Nome + e-mail (sem telefone), sem histórico: candidatosPorEmail roda, encontra 0 -- upsert cria normalmente (chave baseada em e-mail)", () => {
  const trecho = trechoResolucaoIdentidade();
  assert.match(trecho, /if \(!match && emailNorm\) \{/);
  // Bloco 3.3B-B1 (2026-08-17): ganhou "&& formulario !== 'captacao_detalhamento'" -- só o literal exato mudou.
  assert.match(trecho, /else if \(chaveDedupAtual && formulario !== "captacao_detalhamento"\) \{/);
});

test("2. Mesmo Nome + mesmo e-mail + telefone (2ª visita): exatamente 1 candidato por e-mail, sem donoExato conflitante -- reconhece direto, sem upsert", () => {
  const trecho = trechoResolucaoIdentidade();
  assert.match(trecho, /if \(candidatosPorEmail && candidatosPorEmail\.length === 1\) \{/);
  assert.match(trecho, /if \(!donoExato \|\| donoExato\.id === candidato\.id\) \{/, "só reconhece direto quando não há telefone contraditório -- preserva a correção final desta rodada");
});

test("3. Depois disso, Nome + só o mesmo telefone (3ª visita): reconhece via chave_dedup exata -- garantido agora pela correção de direção da ressincronização (2026-08-17): a 2ª visita (só e-mail) NÃO pode ter rebaixado a chave baseada em telefone, então ela continua lá pra ser encontrada. Ver lead.ressincronizacaoDirecional3.3A.test.js para a prova comportamental da direção.", () => {
  assert.match(srcLead, /if \(telDigits && chaveDedupAtual && chaveDedupAtual !== match\.chave_dedup\) \{/, "ressincronização precisa continuar lá, agora condicionada a telDigits");
});

test("6. Cliente novo com telefone + e-mail, sem histórico: candidatosPorEmail encontra 0, donoExato não existe -- upsert cria normalmente", () => {
  const trecho = trechoResolucaoIdentidade();
  // Bloco 3.3B-B1 (2026-08-17): ganhou "&& formulario !== 'captacao_detalhamento'" -- só o literal exato mudou.
  const idxRamo = trecho.indexOf('else if (chaveDedupAtual && formulario !== "captacao_detalhamento") {');
  const idxUpsert = trecho.indexOf(".upsert(", idxRamo);
  assert.ok(idxRamo !== -1 && idxUpsert !== -1);
  assert.ok(idxUpsert > idxRamo, "o upsert precisa estar dentro do ramo 'else if (chaveDedupAtual)'");
});

test("9. Somente um contato, sem histórico: candidatosPorEmail continua null quando não há e-mail -- nenhuma busca extra desnecessária", () => {
  const trecho = trechoResolucaoIdentidade();
  assert.match(trecho, /let candidatosPorEmail = null;\s*\n\s*if \(!match && emailNorm\) \{/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. Ressincronização de chave_dedup -- mecanismo pré-existente, intocado
// ═══════════════════════════════════════════════════════════════════════════

test("10. ressincronização de chave_dedup continua um UPDATE simples (não upsert) -- uma violação de UNIQUE é REJEITADA pelo Postgres, nunca sobrescreve outro registro", () => {
  const idx = srcLead.indexOf("if (telDigits && chaveDedupAtual && chaveDedupAtual !== match.chave_dedup) {");
  assert.ok(idx !== -1, "ressincronização não encontrada");
  const bloco = srcLead.slice(idx, idx + 250);
  assert.match(bloco, /sb\.from\("clientes"\)\.update\(\{ chave_dedup: chaveDedupAtual \}\)\.eq\("id", match\.id\)/);
  assert.doesNotMatch(bloco, /\.upsert\(/);
});

test("10. a rejeição do Postgres continua engolida sem derrubar a requisição", () => {
  const idx = srcLead.indexOf("if (telDigits && chaveDedupAtual && chaveDedupAtual !== match.chave_dedup) {");
  const bloco = srcLead.slice(idx, idx + 250);
  assert.match(bloco, /\.then\(\(\) => \{\}\)\.catch\(\(\) => \{\}\);/);
});

test("10. NENHUMA arquitetura de merge/exclusão nova foi introduzida pela correção final -- a proteção continua vindo do Postgres + da lógica de não-escolher", () => {
  const codigoAtivo = srcLead.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(codigoAtivo, /merge/i);
  assert.doesNotMatch(codigoAtivo, /\.delete\(\)\.eq\("chave_dedup"/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo: nenhuma tabela/coluna/migration/RPC nova
// ═══════════════════════════════════════════════════════════════════════════

test("nenhuma função nova de módulo foi criada -- a correção final é só lógica inline a mais no bloco de resolução de identidade já existente", () => {
  const trecho = trechoResolucaoIdentidade();
  const qtdFunctionDeclarations = (trecho.match(/\bfunction\s+\w+\s*\(/g) || []).length;
  assert.equal(qtdFunctionDeclarations, 0, "o bloco de resolução de identidade não deveria ganhar nenhuma function declaration nova");
});

test("nenhuma migration/SQL/RPC foi introduzida pela correção final", () => {
  const codigoAtivo = srcLead.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
});
