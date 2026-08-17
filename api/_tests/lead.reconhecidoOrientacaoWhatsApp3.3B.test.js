// api/_tests/lead.reconhecidoOrientacaoWhatsApp3.3B.test.js
//
// Bloco 3.3B-A (2026-08-17) -- correção pré-commit: a versão anterior deste
// arquivo testava um sinal `updated: !isNewClient` exposto no retorno
// público final de criarSolicitacao, usado pela captacao_essencial pra
// mostrar uma orientação diferente pra cliente novo vs reconhecido.
//
// Essa decisão foi REVERTIDA: o endpoint é público e sem autenticação, e
// expor esse sinal (mesmo aditivamente) permitiria a qualquer chamador
// inferir, pela resposta da API, se um telefone/e-mail já pertence a um
// cliente do estúdio -- uma capacidade de enumeração que não foi aceita
// como limitação da v1.0.
//
// Nova regra: qualquer submissão normal bem-sucedida (cliente novo ou
// reconhecido) recebe a MESMA experiência pública neutra -- "Pronto!
// Recebemos suas informações." + convite pro WhatsApp do estúdio.
// isNewClient continua controlando E-mail 1/E-mail 2/alerta e a resolução
// de identidade inteiramente por dentro do backend, nunca exposto na
// resposta.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): estrutural, sem
// Supabase real.
//
// Bloco 3.3B-A2 (2026-08-17): evolução exclusivamente frontend por cima do
// que este arquivo já cobria. A copy exata mudou -- "Pronto! Recebemos suas
// informações." virou "Pronto, {primeiro nome}! Recebemos suas
// informações." (eco seguro do que o próprio visitante digitou, nunca
// baseado em reconhecimento) -- e o CTA passou a abrir o WhatsApp com uma
// mensagem pré-preenchida (montarTextoWhatsAppCaptacaoEssencial), construída
// só com nome/tel/email locais + NOME_ESTUDIO. Os testes que ancoravam no
// texto antigo foram ajustados para uma âncora estável ("Recebemos suas
// informações.", presente nos dois textos) -- a INTENÇÃO de cada teste não
// mudou, só a string exata buscada.
//
// Rodar com: node --test api/_tests/lead.reconhecidoOrientacaoWhatsApp3.3B.test.js

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

function trechoEnviarCaptacaoEssencial() {
  const inicio = srcLead.indexOf("function enviarCaptacaoEssencial(e) {");
  const fim = srcLead.indexOf("$('ce-form').addEventListener", inicio);
  assert.ok(inicio !== -1 && fim !== -1);
  return srcLead.slice(inicio, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// Backend -- retorno público normal não expõe updated nem isNewClient
// ═══════════════════════════════════════════════════════════════════════════

test("retorno final do handler NÃO contém 'updated' -- revertido nesta correção", () => {
  assert.match(srcLead, /return res\.status\(200\)\.json\(\{ ok: true, clienteId, campanha: campanhaResp \}\);\r?\n\}/);
});

test("retorno final não expõe isNewClient nem nenhuma variante literal dele", () => {
  const idxRetorno = srcLead.lastIndexOf("return res.status(200).json({ ok: true, clienteId, campanha: campanhaResp });");
  assert.ok(idxRetorno !== -1);
  const linha = srcLead.slice(idxRetorno, idxRetorno + 120);
  assert.doesNotMatch(linha, /isNewClient/);
  assert.doesNotMatch(linha, /\bupdated\b/);
});

test("'updated' não aparece mais em nenhum lugar do código ativo -- correção pré-commit também eliminou o ramo remanescente (!isNewClient && !deveNotificar)", () => {
  // Esta rodada de correção (2026-08-17) foi além da reversão anterior: o
  // ramo !isNewClient && !deveNotificar ainda devolvia "updated: true"
  // (herdado do Bloco 3.2A, nunca tocado pelas rodadas anteriores do
  // 3.3B-A). Auditoria confirmou que nenhum chamador público legítimo
  // alcança esse ramo COM finalizado ausente, mas o sinal era tecnicamente
  // explorável por um chamador que montasse a requisição manualmente. Os
  // dois ramos (isNewClient true/false) foram unificados num único
  // "if (!deveNotificar)", sem updated -- resposta idêntica para os dois.
  const codigoAtivo = semComentarios(srcLead);
  const ocorrencias = (codigoAtivo.match(/\bupdated\b/g) || []).length;
  assert.equal(ocorrencias, 0, "updated não pode mais aparecer em nenhum lugar do código ativo");
  assert.match(srcLead, /if \(!deveNotificar\) \{\r?\n\s*return res\.status\(200\)\.json\(\{ ok: true, clienteId, campanha: campanhaResp \}\);\r?\n\s*\}/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Frontend -- não depende mais de d.updated
// ═══════════════════════════════════════════════════════════════════════════

test("enviarCaptacaoEssencial não lê/depende de d.updated em nenhum ponto", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  assert.doesNotMatch(trecho, /d\.updated/);
});

test("d.ambiguo continua sendo tratado, com seu fluxo próprio já aprovado no 3.3A, antes do sucesso normal", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  const idxAmbiguo = trecho.indexOf("if (d.ambiguo) {");
  const idxSucessoNormal = trecho.indexOf("Recebemos suas informações.");
  assert.ok(idxAmbiguo !== -1 && idxSucessoNormal !== -1);
  assert.ok(idxAmbiguo < idxSucessoNormal, "d.ambiguo precisa continuar sendo checado antes do sucesso normal");
});

test("cliente novo e reconhecido recebem a mesma categoria de resposta pública -- só existe UM caminho de sucesso normal no código (fora do ambíguo)", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  const ocorrenciasSucesso = (trecho.match(/Recebemos suas informações\./g) || []).length;
  assert.equal(ocorrenciasSucesso, 1, "só pode haver um único bloco de sucesso normal, usado tanto pra cliente novo quanto reconhecido");
});

test("WhatsApp do estúdio aparece na experiência de sucesso normal, reaproveitando WA_LINK/waBtnHtml() -- nenhum fetch adicional", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  const idxInicioBlocoSucesso = trecho.indexOf("var waDisponivelCE = WA_LINK !== '#';");
  const idxFimBloco = trecho.indexOf("})", idxInicioBlocoSucesso);
  assert.ok(idxInicioBlocoSucesso !== -1 && idxFimBloco !== -1);
  const bloco = trecho.slice(idxInicioBlocoSucesso, idxFimBloco);
  assert.match(bloco, /WA_LINK/);
  assert.match(bloco, /waBtnHtml\(\)/);
  assert.doesNotMatch(bloco, /fetch\(/, "não pode disparar nenhuma requisição de rede adicional");
});

test("copy do CTA de continuidade está presente, reaproveitando a classe .aura-wa-btn já usada nos outros dois desfechos", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  assert.match(trecho, /Se quiser continuar por aqui agora, toque no botão abaixo\. Sua mensagem já vai preparada para nossa equipe\./);
  assert.match(trecho, /Continuar pelo WhatsApp/);
  const idxSucesso = trecho.indexOf("Recebemos suas informações.");
  const idxFimBloco = trecho.indexOf("})", idxSucesso);
  const bloco = trecho.slice(idxSucesso, idxFimBloco);
  assert.match(bloco, /aura-wa-btn/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Payload inalterado
// ═══════════════════════════════════════════════════════════════════════════

test("payload enviado pela captacao_essencial permanece exatamente o mesmo do 3.3A -- nenhum campo novo", () => {
  const inicio = srcLead.indexOf("var payload = {", srcLead.indexOf("function enviarCaptacaoEssencial"));
  const fim = srcLead.indexOf("};", inicio);
  const bloco = srcLead.slice(inicio, fim);
  assert.match(bloco, /nome: nome, tel: tel, email: email,/);
  assert.match(bloco, /slug: SLUG, orig: 'Site', origem_slug: ORIGEM_SLUG, finalizado: true,/);
  assert.match(bloco, /formulario: 'captacao_essencial',/);
  assert.match(bloco, /consentimento: \{ aceito: true, versao_texto: CONSENTIMENTO_VERSAO \},/);
  assert.match(bloco, /trafego: TRAFEGO_CAPTURADO/);
});

// ═══════════════════════════════════════════════════════════════════════════
// E-mail 1 / E-mail 2 / alerta / isNewClient continuam internos e intactos
// ═══════════════════════════════════════════════════════════════════════════

test("E-mail 1 continua exclusivo de isNewClient===true", () => {
  assert.match(srcLead, /if \(isNewClient\) \{/);
});

test("E-mail 2 continua no ramo else, exclusivo de cliente reconhecido", () => {
  const idx = srcLead.indexOf("if (isNewClient) {");
  const idxElse = srcLead.indexOf("} else {", idx);
  const idxCadastroReconhecido = srcLead.indexOf("cadastro reconhecido", idxElse);
  assert.ok(idxElse !== -1, "ramo else de E-mail 2 não encontrado");
  assert.ok(idxCadastroReconhecido !== -1 && idxCadastroReconhecido > idxElse, "template de cadastro reconhecido precisa estar dentro do ramo else");
});

test("alerta ao artista continua condicionado só a isNewClient (Bloco 3.2A), não a nenhum sinal público", () => {
  assert.match(srcLead, /if \(isNewClient && cfgDisparos\?\.fluxo_notificacao_artista_ativa !== false && resendKey\) \{/);
});

test("isNewClient continua sendo calculado e usado inteiramente dentro do backend -- nenhuma nova exposição em resposta JSON pública", () => {
  const codigoAtivo = semComentarios(srcLead);
  const respostasJson = codigoAtivo.match(/res\.status\(200\)\.json\(\{[^}]*\}\)/g) || [];
  for (const resposta of respostasJson) {
    assert.doesNotMatch(resposta, /isNewClient/, `resposta pública não pode conter isNewClient: ${resposta}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Ficha antiga e resolução de identidade intocadas
// ═══════════════════════════════════════════════════════════════════════════

test("ficha antiga (montarFicha/enviarFicha/mostrarObrigado) permanece byte-idêntica -- nenhuma referência a d.updated nela", () => {
  const inicio = srcLead.indexOf("function enviarFicha(){");
  const fim = srcLead.indexOf("function mostrarErro(msg){", inicio);
  const bloco = srcLead.slice(inicio, fim);
  assert.doesNotMatch(bloco, /d\.updated/);
  assert.match(bloco, /if \(!d \|\| !d\.ok\) throw new Error\('falha'\);\s*\r?\n\s*if \(d\.ambiguo\) \{ mostrarOrientacaoAmbiguidade\(\); return; \}\s*\r?\n\s*mostrarObrigado\(dados\);/);
});

test("resolução de identidade do 3.3A (candidatosPorEmail/donoExato/identidadeConflitante) permanece intacta", () => {
  assert.match(srcLead, /let candidatosPorEmail = null;/);
  assert.match(srcLead, /let donoExato = null;/);
  assert.match(srcLead, /let identidadeConflitante = false;/);
  assert.match(srcLead, /if \(telDigits && chaveDedupAtual && chaveDedupAtual !== match\.chave_dedup\) \{/);
});

test("nenhum RPC/SQL/migration foi introduzido por esta correção", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Bloco 3.3B-A2 -- mensagem do WhatsApp personalizada com dados do visitante
// ═══════════════════════════════════════════════════════════════════════════

function trechoMontarTextoWhatsAppCaptacaoEssencial() {
  const inicio = srcLead.indexOf("function montarTextoWhatsAppCaptacaoEssencial(nome, tel, email) {");
  assert.ok(inicio !== -1, "montarTextoWhatsAppCaptacaoEssencial não encontrada");
  const fim = srcLead.indexOf("\n  }", inicio);
  return srcLead.slice(inicio, fim);
}

test("montarTextoWhatsAppCaptacaoEssencial existe, isolada de montarTextoWhatsApp (ficha antiga), e aceita exatamente (nome, tel, email)", () => {
  assert.match(srcLead, /function montarTextoWhatsAppCaptacaoEssencial\(nome, tel, email\) \{/);
  // A função da ficha antiga (montarTextoWhatsApp) precisa continuar existindo,
  // intacta, e ser uma função DIFERENTE -- não pode ter sido removida/reaproveitada.
  assert.match(srcLead, /function montarTextoWhatsApp\(dados\)\{/);
});

test("montarTextoWhatsAppCaptacaoEssencial não lê 'd' em nenhum ponto -- personalização não pode depender da resposta do backend", () => {
  const trecho = trechoMontarTextoWhatsAppCaptacaoEssencial();
  assert.doesNotMatch(trecho, /\bd\./, "a função não pode referenciar a variável 'd' (resposta do backend) em nenhum ponto");
  assert.doesNotMatch(trecho, /isNewClient/);
  assert.doesNotMatch(trecho, /\bupdated\b/);
});

test("mensagem usa NOME_ESTUDIO (dado público já existente na página) e o nome completo digitado pelo visitante", () => {
  const trecho = trechoMontarTextoWhatsAppCaptacaoEssencial();
  assert.match(trecho, /Olá! Acabei de enviar uma solicitação pelo site da ' \+ NOME_ESTUDIO \+ '\./);
  assert.match(trecho, /Meu nome é ' \+ nome \+ '\./);
  assert.match(trecho, /Gostaria de continuar meu atendimento por aqui\./);
});

test("telefone e e-mail só entram na mensagem quando informados -- nenhuma linha vazia/undefined possível", () => {
  const trecho = trechoMontarTextoWhatsAppCaptacaoEssencial();
  assert.match(trecho, /if \(tel\) partes\.push\('WhatsApp: ' \+ tel \+ '\.'\);/);
  assert.match(trecho, /if \(email\) partes\.push\('E-mail: ' \+ email \+ '\.'\);/);
});

test("chamada em enviarCaptacaoEssencial usa exatamente nome/tel/email locais (os mesmos lidos do formulário, não d.*)", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  assert.match(trecho, /var waTextoCE = montarTextoWhatsAppCaptacaoEssencial\(nome, tel, email\);/);
});

test("href do CTA usa encodeURIComponent sobre o texto pré-preenchido, montado em cima de WA_LINK", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  assert.match(trecho, /var waHrefCE = waDisponivelCE \? WA_LINK \+ '\?text=' \+ encodeURIComponent\(waTextoCE\) : WA_LINK;/);
});

test("primeiro nome exibido na tela passa por esc() antes do innerHTML", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  assert.match(trecho, /'<div>Pronto, ' \+ esc\(nome\.split\(' '\)\[0\]\) \+ '! Recebemos suas informações\.<\/div>'/);
});

test("quando WA_LINK === '#' (estúdio sem WhatsApp configurado), nem o botão nem a frase 'toque no botão abaixo' aparecem", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  assert.match(trecho, /var waDisponivelCE = WA_LINK !== '#';/, "a checagem de disponibilidade precisa existir");
  assert.match(trecho, /waDisponivelCE \? 'Se quiser continuar por aqui agora, toque no botão abaixo\. Sua mensagem já vai preparada para nossa equipe\.' : 'Em breve nossa equipe entrará em contato para continuar seu atendimento\.'/, "o texto precisa ter uma variante sem menção a botão quando WA_LINK é '#'");
  assert.match(trecho, /waDisponivelCE \? '<a href="' \+ waHrefCE \+ '" target="_blank" class="aura-wa-btn">' \+ waBtnHtml\(\) \+ 'Continuar pelo WhatsApp<\/a>' : ''/, "o próprio botão precisa ficar condicionado à mesma checagem");
});

test("mensagem alternativa (sem WhatsApp) não menciona 'botão' nem link nenhum", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  const idx = trecho.indexOf("Em breve nossa equipe entrará em contato para continuar seu atendimento.");
  assert.ok(idx !== -1);
  assert.doesNotMatch(trecho.slice(idx, idx + 60), /botão/i);
});

test("nenhuma nova requisição de rede é disparada pela personalização (continua um único fetch)", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  const ocorrenciasFetch = (trecho.match(/fetch\(/g) || []).length;
  assert.equal(ocorrenciasFetch, 1, "captacao_essencial precisa continuar com um único fetch, a personalização é só sobre a resposta já recebida");
});
