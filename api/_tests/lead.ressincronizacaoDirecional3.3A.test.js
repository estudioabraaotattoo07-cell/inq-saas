// api/_tests/lead.ressincronizacaoDirecional3.3A.test.js
//
// Correção de direção da ressincronização de chave_dedup (2026-08-17) --
// bug real comprovado em produção: cliente criado com telefone+e-mail (chave
// baseada em telefone) que depois retorna só com e-mail era corretamente
// RECONHECIDO, mas a ressincronização pré-existente rebaixava sua chave pra
// uma baseada em e-mail (porque a submissão daquele momento, sem telefone,
// só conseguia calcular uma chave email-based) -- liberando a chave
// baseada em telefone pra ser "roubada" por uma visita seguinte só com
// telefone, que criava uma segunda ficha.
//
// Regra de produto: a chave pode EVOLUIR de e-mail pra telefone (mais
// forte), nunca REGREDIR de telefone pra e-mail (mais fraco). A correção é
// a adição de "telDigits &&" na condição da ressincronização -- telDigits
// só é truthy quando a submissão ATUAL contém telefone, que é exatamente
// quando a migração é uma evolução legítima.
//
// PROVA DE DIREÇÃO, não só de existência do texto: em vez de só verificar
// que o "if" existe, este arquivo extrai a condição booleana literal do
// código-fonte e a executa de verdade (via Function), com valores
// sintéticos de telDigits/chaveDedupAtual/match.chave_dedup representando
// cada cenário -- provando o comportamento real da expressão, não só sua
// presença textual.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): a chamada de rede
// (sb.from("clientes").update(...)) em si continua não executável sem
// Supabase real -- o que é provado aqui é que a CONDIÇÃO que decide se essa
// chamada roda ou não se comporta corretamente para cada direção.
//
// Rodar com: node --test api/_tests/lead.ressincronizacaoDirecional3.3A.test.js

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

// Extrai a condição literal do "if" da ressincronização, ex.:
// "telDigits && chaveDedupAtual && chaveDedupAtual !== match.chave_dedup"
function extrairCondicaoResync() {
  const marcador = "if (telDigits && chaveDedupAtual && chaveDedupAtual !== match.chave_dedup) {";
  const idx = srcLead.indexOf(marcador);
  assert.ok(idx !== -1, "condição da ressincronização não encontrada no formato esperado");
  const inicio = idx + "if (".length;
  const fim = srcLead.indexOf(") {", idx);
  return srcLead.slice(inicio, fim);
}

// Executa a condição extraída de verdade, contra valores sintéticos --
// prova comportamental da expressão em si (não da chamada de rede).
function avaliarCondicao(telDigits, chaveDedupAtual, matchChaveDedup) {
  const condicao = extrairCondicaoResync();
  const fn = new Function("telDigits", "chaveDedupAtual", "match", "return (" + condicao + ");");
  return fn(telDigits, chaveDedupAtual, { chave_dedup: matchChaveDedup });
}

// ═══════════════════════════════════════════════════════════════════════════
// Prova de direção -- a condição extraída do código real, executada
// ═══════════════════════════════════════════════════════════════════════════

test("1. chave phone-based existente + retorno só com e-mail: telDigits null -- condição falsa, chave NÃO é sobrescrita (preserva a chave telefone-based)", () => {
  // Exatamente o estado do Cenário A, 2ª submissão: telDigits null (sem
  // telefone nesta submissão), chaveDedupAtual email-based (calculada a
  // partir desta submissão), match.chave_dedup ainda phone-based (da
  // primeira submissão).
  const resultado = avaliarCondicao(
    null,
    "email:estudioabraaotattoo07@gmail.com|ana",
    "33333333333|ana"
  );
  assert.ok(!resultado, "com telDigits null, a ressincronização não pode rodar, mesmo com chaves diferentes");
});

test("2. depois, retorno só com o mesmo telefone: como a chave phone-based não foi sobrescrita no passo 1, ela continua lá pra ser encontrada pela busca exata (donoExato)", () => {
  // Prova estrutural complementar: donoExato (passo 2 da resolução de
  // identidade) busca por igualdade exata de chave_dedup -- se ela nunca
  // foi trocada, a 3ª submissão (só telefone, chaveDedupAtual phone-based
  // idêntica à da 1ª) encontra o mesmo registro.
  const idxDono = srcLead.indexOf("let donoExato = null;");
  assert.ok(idxDono !== -1);
  assert.match(srcLead, /const \{ data \} = await sb\.from\("clientes"\)\.select\("\*"\)\.eq\("user_id", row\.user_id\)\.eq\("chave_dedup", chaveDedupAtual\)\.maybeSingle\(\);/);
});

test("3. não ocorre segunda criação nessa sequência: com a chave preservada, donoExato encontra o registro ANTES de qualquer upsert ser tentado (guard '!match')", () => {
  const inicio = srcLead.indexOf("if (!match) {");
  const fim = srcLead.indexOf("// Aviso de compartilhamento", inicio);
  const trecho = srcLead.slice(inicio, fim);
  const idxDonoExatoRamo = trecho.indexOf("} else if (donoExato) {");
  const idxUpsertRamo = trecho.indexOf("} else if (chaveDedupAtual) {");
  assert.ok(idxDonoExatoRamo !== -1 && idxUpsertRamo !== -1);
  assert.ok(idxDonoExatoRamo < idxUpsertRamo, "o ramo que reconhece por donoExato precisa continuar sendo avaliado antes do ramo que tenta o upsert");
});

test("4. chave email-based existente + retorno com telefone: telDigits presente -- condição verdadeira, migração pra phone-based continua permitida (Cenário C, comportamento já aprovado preservado)", () => {
  const resultado = avaliarCondicao(
    "33333333333",
    "33333333333|ana",
    "email:estudioabraaotattoo07@gmail.com|ana"
  );
  assert.equal(resultado, true, "com telDigits presente, a migração de e-mail pra telefone precisa continuar permitida");
});

test("5. ausência de telefone na submissão impede a ressincronização mesmo quando as chaves diferem por outro motivo (ex: nome mudou)", () => {
  const resultado = avaliarCondicao(
    null,
    "email:outroemail@exemplo.com|maria",
    "email:email-antigo@exemplo.com|maria"
  );
  assert.ok(!resultado, "sem telefone na submissão, a ressincronização não roda, qualquer que seja a causa da divergência de chave");
});

test("6. presença de telefone válido permite a ressincronização quando as chaves realmente divergem (correção no fim de uma conversa, por exemplo)", () => {
  const resultado = avaliarCondicao(
    "27999998888",
    "27999998888|joao",
    "27988887777|joao"
  );
  assert.equal(resultado, true, "com telefone presente e chaves diferentes, a ressincronização precisa continuar rodando");
});

test("quando as chaves já são idênticas, a condição é falsa independentemente de telDigits -- nenhuma escrita desnecessária", () => {
  assert.ok(!avaliarCondicao("33333333333", "33333333333|ana", "33333333333|ana"));
  assert.ok(!avaliarCondicao(null, "33333333333|ana", "33333333333|ana"));
});

// ═══════════════════════════════════════════════════════════════════════════
// 7/8. Proteção de conflito e busca de reforço de atomicidade intocadas
// ═══════════════════════════════════════════════════════════════════════════

test("7. a proteção de conflito de identidade (candidatosPorEmail/donoExato/identidadeConflitante) não foi tocada por esta correção -- só a linha da ressincronização mudou", () => {
  assert.match(srcLead, /let candidatosPorEmail = null;/);
  assert.match(srcLead, /let donoExato = null;/);
  assert.match(srcLead, /let identidadeConflitante = false;/);
  assert.match(srcLead, /const conflitoDeEmail = !!\(emailNorm && donoExato\.email && donoExato\.email\.trim\(\)\.toLowerCase\(\) !== emailNorm\);/);
});

test("8. a busca de reforço de atomicidade (correção anterior) permanece intacta -- mesma query, mesma proteção de conflito de e-mail do vencedor", () => {
  assert.match(srcLead, /const \{ data: vencedor \} = await sb\.from\("clientes"\)/);
  assert.match(srcLead, /const conflitoDeEmailVencedor = !!\(emailNorm && vencedor\.email && vencedor\.email\.trim\(\)\.toLowerCase\(\) !== emailNorm\);/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo: só a linha da ressincronização mudou, nenhuma arquitetura nova
// ═══════════════════════════════════════════════════════════════════════════

test("a correção é só a adição de 'telDigits &&' na condição já existente -- nenhuma nova function declaration, nenhuma consulta nova", () => {
  const idx = srcLead.indexOf("if (telDigits && chaveDedupAtual && chaveDedupAtual !== match.chave_dedup) {");
  const fim = srcLead.indexOf("const { error: erroUpdateMatch }", idx);
  const bloco = srcLead.slice(idx, fim);
  assert.doesNotMatch(bloco, /\bfunction\s+\w+\s*\(/);
  const qtdSelects = (bloco.match(/\.select\(/g) || []).length;
  assert.equal(qtdSelects, 0, "a correção não pode ter introduzido nenhuma consulta nova -- só reusa telDigits, já calculado antes");
});

test("nenhum RPC/SQL/migration/merge foi introduzido por esta correção", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
  assert.doesNotMatch(codigoAtivo, /merge/i);
});

test("apenas uma ocorrência da condição de ressincronização existe no arquivo -- não foi duplicada por engano", () => {
  const qtd = (srcLead.match(/if \(telDigits && chaveDedupAtual && chaveDedupAtual !== match\.chave_dedup\) \{/g) || []).length;
  assert.equal(qtd, 1);
});
