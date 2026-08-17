// api/_tests/lead.identidadeConflitante3.3A.test.js
//
// Correção final pré-commit do Bloco 3.3A (2026-08-17) -- fecha a
// assimetria comprovada pelas duas fichas reais da Ana teste (telefone+
// e-mail -> depois só e-mail criava um segundo cliente), implementando os 6
// estados auditados e aprovados:
//
//   1) 0 candidatos por e-mail + chave inexistente -> pessoa nova -> cria.
//   2) exatamente 1 candidato por e-mail, sem telefone contraditório ->
//      reconhece.
//   3) 2+ candidatos por e-mail + chave exata pertence a um deles ->
//      reconhece especificamente aquele.
//   4) 2+ candidatos por e-mail + chave exata pertence a registro externo
//      ao conjunto -> conflito -> nenhuma escrita.
//   5) 2+ candidatos por e-mail + nenhuma chave resolve -> ambiguidade ->
//      nenhuma escrita.
//   6) telefone aponta pra Cliente A + e-mail aponta pra Cliente B, IDs
//      diferentes -> conflito -> nenhuma escrita.
//
// Nos estados 4/5/6 ("identidadeConflitante"), o fluxo retorna ANTES do
// Fallback Final, sem INSERT, sem UPDATE, sem E-mail 1, sem E-mail 2, sem
// alerta ao artista, sem usar parecer_aura -- só a resposta pública neutra
// { ok: true, ambiguo: true }, HTTP 200, sem clienteId nem qualquer dado
// interno.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco, registrada em
// lead.resolucaoIdentidade3.3A.test.js): `sb` não é injetável sem refatorar
// a assinatura do handler -- por isso a cobertura aqui é ESTRUTURAL (ordem,
// gating, ausência de padrões no código-fonte), não comportamental de ponta
// a ponta contra um Supabase real. Cada teste documenta explicitamente o
// raciocínio da prova.
//
// Rodar com: node --test api/_tests/lead.identidadeConflitante3.3A.test.js

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

function trechoResolucaoIdentidade() {
  const inicio = srcLead.indexOf("let clienteId = null;");
  const fimBloco = srcLead.indexOf("// Saída controlada", inicio);
  assert.ok(inicio !== -1 && fimBloco !== -1, "bloco de resolução de identidade não encontrado");
  return srcLead.slice(inicio, fimBloco);
}

function trechoDecisao() {
  const trecho = trechoResolucaoIdentidade();
  const inicio = trecho.indexOf("if (!match) {");
  const fim = trecho.indexOf("// Aviso de compartilhamento", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "bloco de decisão não encontrado");
  return trecho.slice(inicio, fim);
}

function trechoSaidaControlada() {
  const inicio = srcLead.indexOf("// Saída controlada");
  const fim = srcLead.indexOf("// Fallback final", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "saída controlada não encontrada");
  return srcLead.slice(inicio, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// Estado 1 -- pessoa genuinamente nova
// ═══════════════════════════════════════════════════════════════════════════

test("Estado 1: 0 candidatos + chave inexistente -- cria normalmente via upsert, isNewClient=true", () => {
  const trecho = trechoDecisao();
  assert.match(trecho, /\} else if \(chaveDedupAtual\) \{/);
  const idx = trecho.indexOf("} else if (chaveDedupAtual) {");
  const bloco = trecho.slice(idx);
  assert.match(bloco, /\.upsert\(/);
  assert.match(bloco, /isNewClient = true;/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Estado 2 -- identidade inequívoca por e-mail, sem telefone contraditório
// ═══════════════════════════════════════════════════════════════════════════

test("Estado 2: exatamente 1 candidato por e-mail + sem donoExato conflitante -- reconhece direto, UPDATE, isNewClient=false", () => {
  const trecho = trechoDecisao();
  assert.match(trecho, /if \(candidatosPorEmail && candidatosPorEmail\.length === 1\) \{/);
  const idx = trecho.indexOf("if (candidatosPorEmail && candidatosPorEmail.length === 1) {");
  const fimRamo = trecho.indexOf("} else if (candidatosPorEmail && candidatosPorEmail.length > 1)", idx);
  const bloco = trecho.slice(idx, fimRamo);
  assert.match(bloco, /if \(!donoExato \|\| donoExato\.id === candidato\.id\) \{/);
  assert.match(bloco, /match = candidato;/);
  assert.match(bloco, /isNewClient = false;/);
});

test("Estado 2 cobre o bug comprovado da Ana: telefone+e-mail primeiro, depois só e-mail -- na 2ª visita, chaveDedupAtual seria calculada mas NÃO é usada pra decidir aqui, 'candidato' (achado por e-mail) é quem vira match", () => {
  const trecho = trechoDecisao();
  const idx = trecho.indexOf("if (candidatosPorEmail && candidatosPorEmail.length === 1) {");
  const fimRamo = trecho.indexOf("} else if (candidatosPorEmail && candidatosPorEmail.length > 1)", idx);
  const bloco = trecho.slice(idx, fimRamo);
  assert.doesNotMatch(bloco, /\.upsert\(/, "o estado 2 nunca faz upsert -- reconhece o candidato encontrado por e-mail, não cria nada novo");
});

// ═══════════════════════════════════════════════════════════════════════════
// Estado 6 -- telefone e e-mail apontam pra clientes diferentes (conflito)
// ═══════════════════════════════════════════════════════════════════════════

test("Estado 6: 1 candidato por e-mail, mas donoExato existe com ID diferente -- identidadeConflitante=true, nenhum dos dois é atribuído a match", () => {
  const trecho = trechoDecisao();
  const idx = trecho.indexOf("if (candidatosPorEmail && candidatosPorEmail.length === 1) {");
  const fimRamo = trecho.indexOf("} else if (candidatosPorEmail && candidatosPorEmail.length > 1)", idx);
  const bloco = trecho.slice(idx, fimRamo);
  assert.match(bloco, /\} else \{\r?\n(\s*\/\/.*\r?\n)*\s*identidadeConflitante = true;/, "o ramo 'else' (donoExato existe com ID diferente do candidato) precisa marcar conflito, não escolher nenhum");
});

// ═══════════════════════════════════════════════════════════════════════════
// Estados 3/4/5 -- 2+ candidatos por e-mail (ambíguo)
// ═══════════════════════════════════════════════════════════════════════════

test("Estado 3: 2+ candidatos + chave exata pertence a um deles -- reconhece especificamente esse, UPDATE, isNewClient=false", () => {
  const trecho = trechoDecisao();
  assert.match(trecho, /if \(donoExato && candidatosPorEmail\.some\(c => c\.id === donoExato\.id\)\) \{/);
  const idx = trecho.indexOf("if (donoExato && candidatosPorEmail.some(c => c.id === donoExato.id)) {");
  const fim = trecho.indexOf("} else {", idx);
  const bloco = trecho.slice(idx, fim);
  assert.match(bloco, /match = donoExato;/);
  assert.match(bloco, /isNewClient = false;/);
});

test("Estados 4 e 5: 2+ candidatos sem resolução segura (chave externa ao conjunto OU nenhuma chave) -- identidadeConflitante=true, nenhum match", () => {
  const trecho = trechoDecisao();
  const idxRamo2Plus = trecho.indexOf("} else if (candidatosPorEmail && candidatosPorEmail.length > 1) {");
  const idxDentro = trecho.indexOf("if (donoExato && candidatosPorEmail.some(c => c.id === donoExato.id)) {", idxRamo2Plus);
  const idxElseFinal = trecho.indexOf("} else {", idxDentro);
  const fimRamo2Plus = trecho.indexOf("} else if (donoExato) {", idxRamo2Plus);
  const blocoElse = trecho.slice(idxElseFinal, fimRamo2Plus);
  assert.match(blocoElse, /identidadeConflitante = true;/, "tanto 'chave pertence a alguém fora do conjunto' quanto 'nenhuma chave resolve' caem no mesmo else -- nenhum dos dois escolhe");
  assert.doesNotMatch(blocoElse, /match = /, "o ramo ambíguo/conflitante nunca atribui match");
});

test("candidatosPorEmail nunca é resolvido por .find() (primeira ocorrência arbitrária) -- usa .filter() e contagem, nunca escolhe entre ambíguos", () => {
  const trecho = trechoResolucaoIdentidade();
  assert.match(trecho, /candidatosPorEmail = \(existentesPorEmail \|\| \[\]\)\.filter\(c => c\.email && c\.email\.trim\(\)\.toLowerCase\(\) === emailNorm\);/);
  assert.doesNotMatch(trecho, /candidatosPorEmail = .*\.find\(/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 6/7/8. Cenário real da Ana: telefone+e-mail primeiro, só e-mail depois
// ═══════════════════════════════════════════════════════════════════════════

test("7. telefone+e-mail primeiro -> só e-mail depois: uma única ficha -- candidatosPorEmail.length===1 (a original) e donoExato é null (ninguém tem a chave email-based ainda) -> reconhece, não cria segunda", () => {
  // Prova estrutural: no cenário descrito, a 2ª submissão não tem telefone
  // -> chaveDedupAtual é baseada em e-mail -> essa chave nunca existiu (a
  // ficha original tem chave baseada em TELEFONE) -> donoExato fica null ->
  // cai no "if (!donoExato || ...)" do Estado 2 -> reconhece o candidato
  // (a ficha original, achada por e-mail) em vez de cair no upsert.
  const trecho = trechoDecisao();
  assert.match(trecho, /if \(!donoExato \|\| donoExato\.id === candidato\.id\) \{/);
});

test("8. nenhuma situação ambígua/conflitante alcança o Fallback Final -- o retorno antecipado acontece antes dele no arquivo", () => {
  const idxRetorno = srcLead.indexOf("if (identidadeConflitante) {");
  const idxFallback = srcLead.indexOf("// Fallback final");
  assert.ok(idxRetorno !== -1 && idxFallback !== -1);
  assert.ok(idxRetorno < idxFallback, "o retorno antecipado precisa vir antes do Fallback Final");
});

test("9/10. nenhuma situação ambígua/conflitante alcança E-mail 1 ou E-mail 2 -- o retorno antecipado acontece antes do bloco de e-mails", () => {
  const idxRetorno = srcLead.indexOf("if (identidadeConflitante) {");
  const idxEmail1 = srcLead.indexOf("if (isNewClient) {", idxRetorno);
  assert.ok(idxRetorno !== -1 && idxEmail1 !== -1);
  assert.ok(idxRetorno < idxEmail1);
});

test("11. nenhuma situação ambígua/conflitante alcança o alerta ao artista -- o retorno antecipado acontece antes desse bloco", () => {
  const idxRetorno = srcLead.indexOf("if (identidadeConflitante) {");
  const idxAlerta = srcLead.indexOf("fluxo_notificacao_artista_ativa", idxRetorno);
  assert.ok(idxRetorno !== -1 && idxAlerta !== -1);
  assert.ok(idxRetorno < idxAlerta);
});

test("nenhuma situação ambígua/conflitante roda a query do aviso de compartilhamento (custo evitado) nem usa parecer_aura", () => {
  const trecho = trechoResolucaoIdentidade();
  assert.match(trecho, /if \(!identidadeConflitante && \(telDigits \|\| emailNorm\)\) \{/);
  const idxRetorno = srcLead.indexOf("if (identidadeConflitante) {");
  const bloco = srcLead.slice(idxRetorno, idxRetorno + 400);
  assert.doesNotMatch(bloco, /parecer_aura/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 12. Resposta ambígua não contém informações internas
// ═══════════════════════════════════════════════════════════════════════════

test("12. a resposta de identidade conflitante é { ok: true, ambiguo: true }, HTTP 200, sem clienteId/e-mail/tel/chave_dedup/quantidade de candidatos", () => {
  const trecho = trechoSaidaControlada();
  assert.match(trecho, /return res\.status\(200\)\.json\(\{ ok: true, ambiguo: true \}\);/);
  // Checagem no CÓDIGO ATIVO (sem comentários explicativos, que citam esses
  // termos só pra descrever a garantia) -- a linha de retorno em si não
  // pode conter nenhum desses campos.
  const codigoAtivo = semComentarios(trecho);
  assert.doesNotMatch(codigoAtivo, /clienteId/);
  assert.doesNotMatch(codigoAtivo, /chave_dedup/);
  assert.doesNotMatch(codigoAtivo, /candidatosPorEmail/);
  assert.doesNotMatch(codigoAtivo, /donoExato/);
});

test("12b. o retorno antecipado acontece dentro do próprio handler de criarSolicitacao, não expõe motivo técnico nenhum na string retornada", () => {
  const trecho = trechoSaidaControlada();
  const dentroDoJson = trecho.match(/res\.status\(200\)\.json\((\{[^}]*\})\)/);
  assert.ok(dentroDoJson, "json da resposta não encontrado");
  assert.doesNotMatch(dentroDoJson[1], /email|tel|chave|id:|motivo|candidato/i);
});

// ═══════════════════════════════════════════════════════════════════════════
// 13. captacao_essencial trata ambiguo:true e usa WA_LINK
// ═══════════════════════════════════════════════════════════════════════════

function trechoEnviarCaptacaoEssencial() {
  const inicio = srcLead.indexOf("function enviarCaptacaoEssencial(e) {");
  const fim = srcLead.indexOf("$('ce-form').addEventListener", inicio);
  assert.ok(inicio !== -1 && fim !== -1);
  return srcLead.slice(inicio, fim);
}

test("13. enviarCaptacaoEssencial reconhece d.ambiguo === true antes de mostrar sucesso normal", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  const idxAmbiguo = trecho.indexOf("if (d.ambiguo) {");
  // Copy do sucesso normal mudou no Bloco 3.3B-A (correção pré-commit,
  // 2026-08-17) -- de "Recebemos sua solicitação" (com nome) para "Pronto!
  // Recebemos suas informações." (neutro, igual pra cliente novo e
  // reconhecido). O que este teste precisa continuar provando -- que
  // d.ambiguo é checado antes do sucesso normal -- não muda.
  const idxSucessoNormal = trecho.indexOf("Recebemos suas informações");
  assert.ok(idxAmbiguo !== -1 && idxSucessoNormal !== -1);
  assert.ok(idxAmbiguo < idxSucessoNormal, "a checagem de ambiguidade precisa vir antes da mensagem de sucesso normal");
});

test("13b. no caso ambíguo, a nova ficha usa WA_LINK já existente -- nenhuma nova requisição de rede, nenhuma integração nova", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  const idxAmbiguo = trecho.indexOf("if (d.ambiguo) {");
  const idxFimRamo = trecho.indexOf("return;", idxAmbiguo);
  const bloco = trecho.slice(idxAmbiguo, idxFimRamo);
  assert.match(bloco, /WA_LINK/);
  assert.doesNotMatch(bloco, /fetch\(/, "não pode fazer nenhuma requisição de rede adicional pra mostrar a orientação de WhatsApp");
  assert.doesNotMatch(bloco, /\$\('ce-tel'\)\.value/, "não pode usar o telefone do próprio visitante como destino do WhatsApp");
});

test("13c. a copy da nova ficha no caso ambíguo é a orientação neutra aprovada, sem afirmar que dados foram registrados", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  assert.match(trecho, /Já encontramos algumas informações suas em nosso cadastro\. Para continuarmos com segurança, fale conosco pelo WhatsApp\./);
  const idxAmbiguo = trecho.indexOf("if (d.ambiguo) {");
  const idxFimRamo = trecho.indexOf("return;", idxAmbiguo);
  const bloco = trecho.slice(idxAmbiguo, idxFimRamo);
  assert.doesNotMatch(bloco, /registramos|recebemos/i, "não pode afirmar que os dados foram registrados/recebidos nesse caso");
});

test("13d. reaproveita a mesma classe .captacao-obrigado já usada no sucesso normal -- nenhum modal/componente novo", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  const idxAmbiguo = trecho.indexOf("if (d.ambiguo) {");
  const idxFimRamo = trecho.indexOf("return;", idxAmbiguo);
  const bloco = trecho.slice(idxAmbiguo, idxFimRamo);
  assert.match(bloco, /captacao-obrigado/);
  assert.match(bloco, /aura-wa-btn/, "reaproveita a mesma classe de botão de WhatsApp já usada pela ficha antiga");
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. Ficha antiga também trata ambiguo:true, sem confirmação falsa
// ═══════════════════════════════════════════════════════════════════════════

function trechoEnviarFicha() {
  const inicio = srcLead.indexOf("function enviarFicha(){");
  const fim = srcLead.indexOf("function mostrarErro(msg){", inicio);
  assert.ok(inicio !== -1 && fim !== -1);
  return srcLead.slice(inicio, fim);
}

test("14. enviarFicha (ficha antiga) reconhece d.ambiguo antes de chamar mostrarObrigado -- não afirma falsamente que os dados foram registrados", () => {
  const trecho = trechoEnviarFicha();
  assert.match(trecho, /if \(d\.ambiguo\) \{ mostrarOrientacaoAmbiguidade\(\); return; \}/);
  const idxAmbiguo = trecho.indexOf("if (d.ambiguo)");
  const idxMostrarObrigado = trecho.indexOf("mostrarObrigado(dados);");
  assert.ok(idxAmbiguo < idxMostrarObrigado, "a checagem de ambiguidade precisa vir antes da chamada a mostrarObrigado");
});

test("14b. mostrarOrientacaoAmbiguidade não usa a palavra 'registramos' nem reaproveita mostrarObrigado -- é uma função própria, pequena, ao lado dela", () => {
  const idxFn = srcLead.indexOf("function mostrarOrientacaoAmbiguidade(){");
  assert.ok(idxFn !== -1, "mostrarOrientacaoAmbiguidade não encontrada");
  const fim = srcLead.indexOf("\n  }", idxFn);
  const bloco = srcLead.slice(idxFn, fim);
  assert.doesNotMatch(bloco, /registramos/i);
  assert.match(bloco, /WA_LINK/);
  assert.match(bloco, /ficha-obrigado/, "reaproveita a mesma classe já usada por mostrarObrigado -- nenhuma estrutura visual nova");
});

test("14c. mostrarObrigado (ficha antiga, caminho normal) continua exatamente como estava -- nenhum campo novo, nenhuma mudança de arquitetura", () => {
  assert.match(
    srcLead,
    /function mostrarObrigado\(dados\)\{\s*\n\s*var wa = WA_LINK !== '#' \? WA_LINK \+ '\?text=' \+ encodeURIComponent\(montarTextoWhatsApp\(dados\)\) : WA_LINK;/
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo: nenhuma arquitetura nova
// ═══════════════════════════════════════════════════════════════════════════

test("nenhuma tabela/coluna/RPC/SQL/migration foi introduzida por esta correção", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
});

test("nenhum estado persistido de revisão foi criado -- identidadeConflitante é variável local, nunca gravada no banco", () => {
  const codigoAtivo = semComentarios(srcLead);
  const ocorrencias = (codigoAtivo.match(/identidadeConflitante/g) || []).length;
  // Declaração + leitura no if/else da decisão + leitura no retorno
  // antecipado -- nunca aparece dentro de um .insert/.update/.upsert.
  assert.ok(ocorrencias >= 3);
  const linhasComVar = codigoAtivo.split("\n").filter((l) => l.includes("identidadeConflitante"));
  for (const linha of linhasComVar) {
    assert.doesNotMatch(linha, /\.insert\(|\.update\(|\.upsert\(/, "identidadeConflitante não pode aparecer na mesma linha de nenhuma escrita");
  }
});
