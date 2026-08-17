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

// Bloco 3.3B-B2 (2026-08-17): a tela de sucesso normal (antes inline dentro
// de enviarCaptacaoEssencial) foi extraída para mostrarOfertaDetalhamento
// -- chamada por enviarCaptacaoEssencial, mas definida como função própria
// (ainda dentro do range amplo de trechoEnviarCaptacaoEssencial, que vai
// até o listener de submit do ce-form). Usada quando o teste precisa de um
// recorte mais preciso, sem o risco de capturar o fetch() de
// enviarDetalhamento (função nova, também dentro desse range amplo).
function trechoMostrarOfertaDetalhamento() {
  const inicio = srcLead.indexOf("function mostrarOfertaDetalhamento() {");
  const fim = srcLead.indexOf("$('cd-abrir-btn').addEventListener", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "mostrarOfertaDetalhamento não encontrada");
  return srcLead.slice(inicio, fim);
}

// Corpo isolado só de enviarCaptacaoEssencial (sem as funções novas do
// detalhamento que vêm depois dela no arquivo) -- necessário pra testes que
// precisam contar ocorrências (ex: número de fetch) sem contaminação.
function trechoSoEnviarCaptacaoEssencial() {
  const inicio = srcLead.indexOf("function enviarCaptacaoEssencial(e) {");
  const fim = srcLead.indexOf("// Bloco 3.3B-B2 -- Detalhamento opcional (2026-08-17).", inicio);
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

test("WhatsApp do estúdio aparece na experiência de sucesso normal (mostrarOfertaDetalhamento), reaproveitando WA_LINK/waBtnHtml() -- nenhum fetch adicional", () => {
  // Bloco 3.3B-B2: variáveis renomeadas de waDisponivelCE/waTextoCE/waHrefCE
  // (quando eram locais de enviarCaptacaoEssencial) pra waDisponivel/waTexto/
  // waHref (agora locais de mostrarOfertaDetalhamento) -- mesmo papel.
  const bloco = trechoMostrarOfertaDetalhamento();
  assert.match(bloco, /WA_LINK/);
  assert.match(bloco, /waBtnHtml\(\)/);
  assert.doesNotMatch(bloco, /fetch\(/, "não pode disparar nenhuma requisição de rede adicional");
});

test("copy da oferta de continuidade está presente, reaproveitando a classe .aura-wa-btn já usada nos outros desfechos", () => {
  // Bloco 3.3B-B2 (2026-08-17): copy aprovada -- oferece "Detalhar meu
  // projeto" e "Continuar pelo WhatsApp" lado a lado, nenhum obrigatório.
  const bloco = trechoMostrarOfertaDetalhamento();
  assert.match(bloco, /Se quiser, você também pode contar um pouco mais sobre o projeto que tem em mente\. Essa etapa é opcional\./);
  assert.match(bloco, /Quer contar um pouco mais sobre seu projeto\?/);
  assert.match(bloco, /Detalhar meu projeto/);
  assert.match(bloco, /Continuar pelo WhatsApp/);
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
  // Bloco 3.3B-B1 (2026-08-17): ganhou "formulario !== 'captacao_detalhamento'"
  // -- isNewClient continua a checagem central, só o literal mudou.
  assert.match(srcLead, /if \(isNewClient && formulario !== "captacao_detalhamento" && cfgDisparos\?\.fluxo_notificacao_artista_ativa !== false && resendKey\) \{/);
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

test("mostrarOfertaDetalhamento usa exatamente ultimaCaptacao.nome/tel/email (os mesmos capturados na captação essencial, não d.* nem campo reeditável)", () => {
  // Bloco 3.3B-B2: a mensagem do WhatsApp da tela de sucesso agora é
  // montada em mostrarOfertaDetalhamento (não mais inline em
  // enviarCaptacaoEssencial), usando ultimaCaptacao -- que por sua vez é
  // preenchida com os mesmos nome/tel/email locais da submissão (ver teste
  // "ultimaCaptacao é preenchida com..." em lead.detalhamentoFrontend3.3B.test.js).
  const bloco = trechoMostrarOfertaDetalhamento();
  assert.match(bloco, /var waTexto = montarTextoWhatsAppCaptacaoEssencial\(ultimaCaptacao\.nome, ultimaCaptacao\.tel, ultimaCaptacao\.email\);/);
});

test("href do CTA usa encodeURIComponent sobre o texto pré-preenchido, montado em cima de WA_LINK", () => {
  const bloco = trechoMostrarOfertaDetalhamento();
  assert.match(bloco, /var waHref = waDisponivel \? WA_LINK \+ '\?text=' \+ encodeURIComponent\(waTexto\) : WA_LINK;/);
});

test("primeiro nome exibido na tela passa por esc() antes do innerHTML", () => {
  const bloco = trechoMostrarOfertaDetalhamento();
  assert.match(bloco, /'<div>Pronto, ' \+ esc\(ultimaCaptacao\.nome\.split\(' '\)\[0\]\) \+ '! Recebemos suas informações\.<\/div>'/);
});

test("quando WA_LINK === '#' (estúdio sem WhatsApp configurado), o botão de WhatsApp não aparece -- fallback de texto sem menção a botão", () => {
  // Bloco 3.3B-B2: a estrutura mudou de um único texto ternário pra duas
  // saídas completas (link vs. div de fallback) -- "toque no botão abaixo"
  // não existe mais nesta copy (aprovada nesta rodada); "Detalhar meu
  // projeto" continua oferecido independentemente do WhatsApp estar
  // configurado ou não.
  const bloco = trechoMostrarOfertaDetalhamento();
  assert.match(bloco, /var waDisponivel = WA_LINK !== '#';/, "a checagem de disponibilidade precisa existir");
  assert.match(
    bloco,
    /waDisponivel\s*\n\s*\? '<a href="' \+ waHref \+ '" target="_blank" class="aura-wa-btn">' \+ waBtnHtml\(\) \+ 'Continuar pelo WhatsApp<\/a>'\s*\n\s*: '<div>Em breve nossa equipe entrará em contato para continuar seu atendimento\.<\/div>'/,
    "o botão precisa ficar condicionado à disponibilidade do WhatsApp, com fallback de texto"
  );
  assert.match(bloco, /Detalhar meu projeto/, "a opção de detalhar precisa continuar oferecida mesmo sem WhatsApp configurado");
});

test("mensagem alternativa (sem WhatsApp) não menciona 'botão' nem link nenhum", () => {
  const trecho = trechoEnviarCaptacaoEssencial();
  const idx = trecho.indexOf("Em breve nossa equipe entrará em contato para continuar seu atendimento.");
  assert.ok(idx !== -1);
  assert.doesNotMatch(trecho.slice(idx, idx + 60), /botão/i);
});

test("nenhuma nova requisição de rede é disparada pela personalização da tela de sucesso (enviarCaptacaoEssencial em si continua com um único fetch)", () => {
  // Bloco 3.3B-B2: o range amplo de trechoEnviarCaptacaoEssencial() agora
  // também contém enviarDetalhamento (função nova, com seu próprio fetch
  // legítimo e independente) -- por isso este teste usa o corpo ISOLADO só
  // de enviarCaptacaoEssencial, não o range amplo.
  const trecho = trechoSoEnviarCaptacaoEssencial();
  const ocorrenciasFetch = (trecho.match(/fetch\(/g) || []).length;
  assert.equal(ocorrenciasFetch, 1, "enviarCaptacaoEssencial precisa continuar com um único fetch -- a personalização/oferta de detalhamento é só sobre a resposta já recebida");
});
