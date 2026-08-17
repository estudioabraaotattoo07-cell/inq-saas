// api/_tests/lead.mascaraTelefone3.3B.test.js
//
// Bloco 3.3B -- correção do bug de máscara do WhatsApp encontrado na
// validação manual pós-deploy do 3.3B-A2 (2026-08-17). O campo de telefone
// não tinha nenhum reforço em HTML (maxlength) nem sanitização no backend --
// se a máscara de JS (formatarTelefone, via listener de 'input') falhasse
// por qualquer motivo, uma string bruta/longa podia ser gravada como está em
// clientes.tel. Duas camadas de correção:
//   1) maxlength="16" nos dois campos (ce-tel e ficha-tel) -- reforço em
//      HTML, teto mesmo se o JS falhar;
//   2) normalização com formatarTelefone(tel) -- a mesma função já usada
//      pra máscara em tempo real, sem lógica nova -- antes de persistir em
//      row.tel (cliente novo) e updateFields.tel (cliente reconhecido sem
//      telefone ainda).
//
// A Auditoria Pré-Implementação confirmou que telDigits/calcularChaveDedup/
// detectarCompartilhamento leem a variável `tel` diretamente (nunca
// row.tel/updateFields.tel), então a normalização da persistência não
// intercepta a resolução de identidade do 3.3A -- este arquivo prova
// exatamente isso, estruturalmente.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): sem Supabase real,
// testes estruturais/textuais sobre lead.js.
//
// Rodar com: node --test api/_tests/lead.mascaraTelefone3.3B.test.js

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

function trechoHandlerFallback() {
  const inicio = srcLead.indexOf(
    'const { nome, tel, email, idea, ideia, artista, artistaNome, insta, regiao, nascimento, referencias, orig,'
  );
  assert.ok(inicio !== -1, "início do handler fallback não encontrado");
  return srcLead.slice(inicio);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1) maxlength="16" nos dois campos
// ═══════════════════════════════════════════════════════════════════════════

test("ce-tel (captacao_essencial) tem maxlength=\"16\"", () => {
  assert.match(
    srcLead,
    /<input class="ficha-input" id="ce-tel" name="tel" type="text" inputmode="numeric" autocomplete="tel" maxlength="16" placeholder="\(99\) 99999-9999">/
  );
});

test("ficha-tel (ficha antiga) tem maxlength=\"16\"", () => {
  assert.match(
    srcLead,
    /campo\('WhatsApp <span class="ficha-req">\*<\/span>', '<input class="ficha-input" id="ficha-tel" name="tel" type="text" inputmode="numeric" autocomplete="tel" maxlength="16" required placeholder="\(99\) 99999-9999">'\);/
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 2) Normalização na persistência
// ═══════════════════════════════════════════════════════════════════════════

test("cliente novo: row.tel usa formatarTelefone(tel), não o valor bruto", () => {
  assert.match(srcLead, /const row = \{\s*\n\s*nome,/);
  assert.match(srcLead, /tel: formatarTelefone\(tel\),/);
  assert.doesNotMatch(semComentarios(srcLead), /tel: tel \|\| "",/, "a atribuição bruta antiga não pode mais existir");
});

test("cliente reconhecido sem telefone: updateFields.tel usa formatarTelefone(tel), trava telDigits && !match.tel intacta", () => {
  assert.match(
    srcLead,
    /if \(telDigits && !match\.tel\) updateFields\.tel = formatarTelefone\(tel\);/
  );
});

test("cliente reconhecido que já possui telefone não tem updateFields.tel sobrescrito -- condição !match.tel é a única trava, inalterada", () => {
  const ocorrencias = (semComentarios(srcLead).match(/if \(telDigits && !match\.tel\) updateFields\.tel = formatarTelefone\(tel\);/g) || []).length;
  assert.equal(ocorrencias, 1, "só pode existir um único ponto de escrita de updateFields.tel, sempre condicionado a !match.tel");
  // Não existe nenhum outro caminho que escreva updateFields.tel fora dessa condição.
  const qtdEscritasTel = (semComentarios(srcLead).match(/updateFields\.tel\s*=/g) || []).length;
  assert.equal(qtdEscritasTel, 1, "updateFields.tel só pode ser escrito nesse único ponto condicionado");
});

test("formatarTelefone é reaproveitada -- nenhuma segunda implementação de máscara foi criada em lead.js", () => {
  const ocorrenciasDef = (srcLead.match(/function formatarTelefone\(/g) || []).length;
  assert.equal(ocorrenciasDef, 1, "só pode existir uma única definição de formatarTelefone");
});

// ═══════════════════════════════════════════════════════════════════════════
// 3) Isolamento da resolução de identidade do 3.3A
// ═══════════════════════════════════════════════════════════════════════════

test("telDigits continua computado a partir da variável tel bruta, não de row.tel/updateFields.tel", () => {
  assert.match(srcLead, /const telDigits = tel \? tel\.replace\(\/\[\^0-9\]\/g, ""\)\.slice\(-11\) : null;/);
});

test("calcularChaveDedup continua chamada com a variável tel bruta", () => {
  assert.match(srcLead, /const chaveDedupAtual = calcularChaveDedup\(nome, tel, email\);/);
});

test("detectarCompartilhamento continua chamado com a variável tel bruta", () => {
  assert.match(srcLead, /avisoCompartilhamento = detectarCompartilhamento\(nome, tel, email, candidatosAviso, match \? match\.id : null\);/);
});

test("nenhuma reatribuição da variável tel foi introduzida -- só leituras, formatarTelefone(tel) nunca é atribuído de volta a 'tel'", () => {
  const trecho = trechoHandlerFallback();
  const semComent = semComentarios(trecho);
  // Qualquer "tel = " (reatribuição da variável, não de uma propriedade como
  // row.tel/updateFields.tel/match.tel) precisa ser zero.
  const reatribuicoes = semComent.match(/(?<![.\w])tel\s*=(?!=)/g) || [];
  assert.equal(reatribuicoes.length, 0, `nenhuma reatribuição direta de 'tel' pode existir, encontrado: ${JSON.stringify(reatribuicoes)}`);
});

test("resolução de identidade do 3.3A (candidatosPorEmail/donoExato/identidadeConflitante) permanece intacta", () => {
  assert.match(srcLead, /let candidatosPorEmail = null;/);
  assert.match(srcLead, /let donoExato = null;/);
  assert.match(srcLead, /let identidadeConflitante = false;/);
  assert.match(srcLead, /if \(telDigits && chaveDedupAtual && chaveDedupAtual !== match\.chave_dedup\) \{/);
});

test("telefoneValido não foi alterado -- regra de mínimo de dígitos preservada", () => {
  assert.match(
    srcLead,
    /export function telefoneValido\(tel\) \{\s*\n\s*if \(typeof tel !== "string" \|\| tel\.trim\(\)\.length === 0\) return false;\s*\n\s*return tel\.replace\(\/\[\^0-9\]\/g, ""\)\.length >= 10;\s*\n\s*\}/
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 4) Escopo negativo -- pontos residuais permanecem com valor bruto, de propósito
// ═══════════════════════════════════════════════════════════════════════════

test("telParecer (Parecer da Aura) continua usando a variável tel bruta -- risco residual registrado, fora do escopo desta correção", () => {
  assert.match(srcLead, /const telParecer = tel \|\| match\.tel \|\| "";/);
});

test("E-mail 1 e E-mail 2 continuam exibindo a variável tel bruta -- fora do escopo desta correção", () => {
  const ocorrencias = (srcLead.match(/\(tel \|\| (?:"—"|ni)\)/g) || []).length;
  assert.equal(ocorrencias, 2, "as duas linhas de e-mail (E-mail 1 e E-mail 2) precisam continuar usando tel bruto, sem normalização");
});

test("payload da captacao_essencial permanece inalterado -- nenhum campo novo por causa desta correção", () => {
  const inicio = srcLead.indexOf("var payload = {", srcLead.indexOf("function enviarCaptacaoEssencial"));
  const fim = srcLead.indexOf("};", inicio);
  const bloco = srcLead.slice(inicio, fim);
  assert.match(bloco, /nome: nome, tel: tel, email: email,/);
});

test("resposta pública final continua sem updated/isNewClient", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.equal((codigoAtivo.match(/\bupdated\b/g) || []).length, 0);
  const respostasJson = codigoAtivo.match(/res\.status\(200\)\.json\(\{[^}]*\}\)/g) || [];
  for (const resposta of respostasJson) {
    assert.doesNotMatch(resposta, /isNewClient/);
  }
});

test("nenhum RPC/SQL/migration foi introduzido por esta correção", () => {
  assert.doesNotMatch(semComentarios(srcLead), /\.rpc\(/);
});
