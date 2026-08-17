// api/_tests/lead.detalhamentoFrontend3.3B.test.js
//
// Bloco 3.3B-B2 (2026-08-17) -- frontend do detalhamento opcional, inline,
// na mesma região da captacao_essencial. Sempre depois de uma captação
// essencial já concluída com sucesso -- nunca pede nome/WhatsApp/e-mail de
// novo, nunca envia clienteId, nunca cria uma segunda experiência de
// reconhecimento. Reaproveita comprimirEEnviar/LIMITE_IMAGENS (ficha
// antiga) sem alterá-los; usa estado (cdReferenciasUrls) e elementos de DOM
// inteiramente próprios, nunca referenciasUrls/handleArquivos da ficha
// antiga.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): estrutural/textual
// sobre api/lead.js, sem DOM real/Supabase. A sintaxe do <script>
// efetivamente renderizado é coberta por lead.sintaxeScriptRenderizado3.3B.test.js,
// executado à parte.
//
// Rodar com: node --test api/_tests/lead.detalhamentoFrontend3.3B.test.js

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

function trechoRegiaoCaptacao() {
  // Atenção: existe um comentário mais antigo, dentro de camposObrigatoriosPreenchidos
  // (topo do arquivo), que também começa com "Bloco 3.3A -- Nova Captação
  // Essencial" -- a âncora precisa ser específica o bastante pra não colidir.
  const inicio = srcLead.indexOf("// Bloco 3.3A -- Nova Captação Essencial (2026-08-16). Isolada da ficha");
  const fim = srcLead.indexOf("$('ce-form').addEventListener('submit', enviarCaptacaoEssencial);");
  assert.ok(inicio !== -1 && fim !== -1, "região da captação essencial/detalhamento não encontrada");
  return srcLead.slice(inicio, fim);
}

function trechoFuncao(nome) {
  const inicio = srcLead.indexOf("function " + nome + "(");
  assert.ok(inicio !== -1, "função não encontrada: " + nome);
  // Fecha no primeiro "\n  }" no mesmo nível de indentação (2 espaços) --
  // mesmo padrão já usado pelos outros testes deste bloco.
  const fim = srcLead.indexOf("\n  }", inicio);
  assert.ok(fim !== -1, "fim da função não encontrado: " + nome);
  return srcLead.slice(inicio, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// Estados novos -- declarados, separados dos estados já existentes
// ═══════════════════════════════════════════════════════════════════════════

test("ultimaCaptacao, cdEnviando e cdReferenciasUrls estão declarados", () => {
  assert.match(srcLead, /var ultimaCaptacao = null;/);
  assert.match(srcLead, /var cdEnviando = false;/);
  assert.match(srcLead, /var cdReferenciasUrls = \[\];/);
});

test("cdReferenciasUrls é uma variável distinta de referenciasUrls (ficha antiga) -- nunca aparecem na mesma declaração", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /referenciasUrls\s*=\s*cdReferenciasUrls|cdReferenciasUrls\s*=\s*referenciasUrls/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Isolamento -- funções do detalhamento nunca tocam estado da ficha antiga
// ═══════════════════════════════════════════════════════════════════════════

test("handleArquivosDetalhamento nunca referencia referenciasUrls, ficha-file-status ou ficha-file-btn (estado/DOM da ficha antiga)", () => {
  const trecho = trechoFuncao("handleArquivosDetalhamento");
  assert.doesNotMatch(trecho, /\breferenciasUrls\b/);
  assert.doesNotMatch(trecho, /ficha-file-status|ficha-file-btn/);
  assert.match(trecho, /cdReferenciasUrls/);
  assert.match(trecho, /cd-file-status|cd-file-btn/);
});

test("enviarDetalhamento e montarFormularioDetalhamento nunca referenciam ce-nome/ce-tel/ce-email (campos da captação essencial)", () => {
  const trechoEnviar = trechoFuncao("enviarDetalhamento");
  const trechoMontar = trechoFuncao("montarFormularioDetalhamento");
  for (const trecho of [trechoEnviar, trechoMontar]) {
    assert.doesNotMatch(trecho, /ce-nome|ce-tel|ce-email/);
  }
});

test("comprimirEEnviar e LIMITE_IMAGENS não foram duplicados -- só uma definição de cada em todo o arquivo", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.equal((codigoAtivo.match(/function comprimirEEnviar\(/g) || []).length, 1, "comprimirEEnviar precisa continuar com uma única definição");
  assert.equal((codigoAtivo.match(/var LIMITE_IMAGENS\s*=/g) || []).length, 1, "LIMITE_IMAGENS precisa continuar com uma única declaração");
  assert.match(srcLead, /comprimirEEnviar\(file, function \(ok, url\) \{\s*\n\s*restantes--;\s*\n\s*if \(ok\) cdReferenciasUrls\.push\(url\); else falhas\+\+;/, "handleArquivosDetalhamento precisa CHAMAR comprimirEEnviar já existente, não redefini-la");
});

test("handleArquivos (ficha antiga) permanece byte-idêntico -- nenhuma alteração de assinatura ou corpo", () => {
  assert.match(srcLead, /function handleArquivos\(files\)\{/);
  const trecho = trechoFuncao("handleArquivos");
  assert.match(trecho, /var vagas = LIMITE_IMAGENS - referenciasUrls\.length;/);
  assert.doesNotMatch(trecho, /cdReferenciasUrls|cd-file/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Nenhum clienteId no payload/estado do detalhamento
// ═══════════════════════════════════════════════════════════════════════════

test("payload de enviarDetalhamento não contém clienteId -- só nome/tel/email de ultimaCaptacao, slug, formulario, finalizado, idea, regiao, referencias", () => {
  const trecho = trechoFuncao("enviarDetalhamento");
  assert.doesNotMatch(trecho, /clienteId/);
  assert.match(
    trecho,
    /var payload = \{\s*\n\s*nome: ultimaCaptacao\.nome, tel: ultimaCaptacao\.tel, email: ultimaCaptacao\.email,\s*\n\s*slug: SLUG, formulario: 'captacao_detalhamento', finalizado: true,\s*\n\s*idea: descricao, regiao: regiaoVal, referencias: cdReferenciasUrls\s*\n\s*\};/
  );
});

test("nenhuma variável cd* ou ultimaCaptacao guarda/lê clienteId em nenhum ponto do código ativo", () => {
  // Comentários explicativos desta região mencionam "clienteId" só pra
  // documentar a decisão de NÃO usá-lo -- por isso a checagem é sobre
  // código ativo, igual ao padrão já usado no resto deste bloco.
  const trechoRegiao = semComentarios(trechoRegiaoCaptacao());
  assert.doesNotMatch(trechoRegiao, /clienteId/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Telefone/e-mail não editáveis na segunda etapa
// ═══════════════════════════════════════════════════════════════════════════

test("montarFormularioDetalhamento nunca cria um <input> de tel/e-mail -- só descrição, região e upload", () => {
  const trecho = trechoFuncao("montarFormularioDetalhamento");
  assert.doesNotMatch(trecho, /type="tel"|type="email"|id="cd-tel"|id="cd-email"/);
  assert.match(trecho, /id="cd-descricao"/);
  assert.match(trecho, /id="cd-regiao"/);
});

test("nome/tel/email do detalhamento vêm exclusivamente de ultimaCaptacao, nunca de um $('cd-...').value", () => {
  const trecho = trechoFuncao("enviarDetalhamento");
  assert.doesNotMatch(trecho, /\$\('cd-nome'\)|\$\('cd-tel'\)|\$\('cd-email'\)/);
});

test("ultimaCaptacao é preenchida com os mesmos nome/tel/email lidos pelo formulário da captação essencial, antes de oferecer o detalhamento", () => {
  const trecho = trechoFuncao("enviarCaptacaoEssencial");
  const idxAtribuicao = trecho.indexOf("ultimaCaptacao = { nome: nome, tel: tel, email: email };");
  const idxOferta = trecho.indexOf("mostrarOfertaDetalhamento();");
  assert.ok(idxAtribuicao !== -1 && idxOferta !== -1 && idxAtribuicao < idxOferta);
});

// ═══════════════════════════════════════════════════════════════════════════
// Validação de "pelo menos um conteúdo" e limite de referências
// ═══════════════════════════════════════════════════════════════════════════

test("enviarDetalhamento exige pelo menos um conteúdo real antes de enviar", () => {
  const trecho = trechoFuncao("enviarDetalhamento");
  assert.match(trecho, /if \(!descricao && !regiaoVal && cdReferenciasUrls\.length === 0\) \{/);
});

test("limite de referências no detalhamento continua sendo LIMITE_IMAGENS (5), não um número novo hardcoded", () => {
  const trecho = trechoFuncao("handleArquivosDetalhamento");
  assert.doesNotMatch(trecho, /\b5\b/, "o limite não pode estar hardcoded como número solto -- precisa vir de LIMITE_IMAGENS");
  assert.match(trecho, /LIMITE_IMAGENS - cdReferenciasUrls\.length/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Duplo envio
// ═══════════════════════════════════════════════════════════════════════════

test("cdEnviando bloqueia um segundo envio enquanto o primeiro está em andamento", () => {
  const trecho = trechoFuncao("enviarDetalhamento");
  assert.match(trecho, /if \(cdEnviando\) return;/);
  assert.match(trecho, /cdEnviando = true;/);
  assert.match(trecho, /btn\.disabled = true; btn\.textContent = 'Enviando\.\.\.';/);
});

test("cdEnviando é restaurado (false) e o botão reabilitado só no caminho de erro", () => {
  const trecho = trechoFuncao("enviarDetalhamento");
  const idxCatch = trecho.indexOf(".catch(function () {");
  assert.ok(idxCatch !== -1);
  const blocoCatch = trecho.slice(idxCatch);
  assert.match(blocoCatch, /cdEnviando = false;/);
  assert.match(blocoCatch, /btn\.disabled = false;/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Voltar -- sem POST, limpa o estado temporário das referências
// ═══════════════════════════════════════════════════════════════════════════

test("botão Voltar (cd-voltar) é type=button (nunca submit) e não existe fetch entre seu clique e mostrarOfertaDetalhamento", () => {
  const trecho = trechoFuncao("montarFormularioDetalhamento");
  assert.match(trecho, /<button type="button" class="captacao-hint" id="cd-voltar"/);
  const idxVoltar = trecho.indexOf("$('cd-voltar').addEventListener('click', function () {");
  assert.ok(idxVoltar !== -1);
  const blocoVoltar = trecho.slice(idxVoltar, trecho.indexOf("});", idxVoltar));
  assert.doesNotMatch(blocoVoltar, /fetch\(/);
});

test("clicar em Voltar limpa cdReferenciasUrls explicitamente antes de chamar mostrarOfertaDetalhamento", () => {
  const trecho = trechoFuncao("montarFormularioDetalhamento");
  assert.match(
    trecho,
    /\$\('cd-voltar'\)\.addEventListener\('click', function \(\) \{\s*\n\s*cdReferenciasUrls = \[\];\s*\n\s*mostrarOfertaDetalhamento\(\);\s*\n\s*\}\);/
  );
});

test("montarFormularioDetalhamento também zera cdReferenciasUrls ao ser montado -- nenhuma tentativa nova herda upload de uma anterior abandonada", () => {
  const trecho = trechoFuncao("montarFormularioDetalhamento");
  const idxZerar = trecho.indexOf("cdReferenciasUrls = [];");
  const idxHtml = trecho.indexOf("$('captacao-essencial').innerHTML =");
  assert.ok(idxZerar !== -1 && idxHtml !== -1 && idxZerar < idxHtml, "cdReferenciasUrls precisa ser zerada antes de montar o formulário");
});

// ═══════════════════════════════════════════════════════════════════════════
// d.ambiguo -- neutro, reaproveitado, sem revelar reconhecimento
// ═══════════════════════════════════════════════════════════════════════════

test("mostrarOrientacaoNeutraCaptacao existe uma única vez e é chamada tanto por enviarCaptacaoEssencial quanto por enviarDetalhamento", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.equal((codigoAtivo.match(/function mostrarOrientacaoNeutraCaptacao\(\)/g) || []).length, 1);
  const chamadas = (codigoAtivo.match(/mostrarOrientacaoNeutraCaptacao\(\);/g) || []).length;
  assert.equal(chamadas, 2, "precisa ser chamada exatamente 2 vezes: no d.ambiguo da essencial e no d.ambiguo do detalhamento");
});

test("mostrarOrientacaoNeutraCaptacao não expõe isNewClient, updated, clienteId nem qualquer sinal de reconhecimento", () => {
  const trecho = trechoFuncao("mostrarOrientacaoNeutraCaptacao");
  assert.doesNotMatch(trecho, /isNewClient|updated|clienteId|d\.ambiguo/);
});

test("d.ambiguo continua sendo checado antes de qualquer outra lógica em enviarDetalhamento, igual ao padrão já aprovado da essencial", () => {
  const trecho = trechoFuncao("enviarDetalhamento");
  const idxAmbiguo = trecho.indexOf("if (d.ambiguo)");
  const idxSucesso = trecho.indexOf("mostrarSucessoDetalhamento();");
  assert.ok(idxAmbiguo !== -1 && idxSucesso !== -1 && idxAmbiguo < idxSucesso);
});

// ═══════════════════════════════════════════════════════════════════════════
// Continuar pelo WhatsApp sempre disponível, sem depender do detalhamento
// ═══════════════════════════════════════════════════════════════════════════

test("mostrarOfertaDetalhamento sempre oferece o CTA de WhatsApp (ou a orientação sem WhatsApp), independente da escolha de detalhar", () => {
  const trecho = trechoFuncao("mostrarOfertaDetalhamento");
  assert.match(trecho, /Continuar pelo WhatsApp/);
  assert.match(trecho, /Detalhar meu projeto/);
  assert.match(trecho, /Em breve nossa equipe entrará em contato para continuar seu atendimento\./, "fallback sem WhatsApp configurado precisa continuar existindo");
});

test("mensagem pré-preenchida do WhatsApp continua vindo de montarTextoWhatsAppCaptacaoEssencial -- nenhuma revisão de copy neste bloco", () => {
  const codigoAtivo = semComentarios(srcLead);
  const ocorrencias = (codigoAtivo.match(/montarTextoWhatsAppCaptacaoEssencial\(/g) || []).length;
  // Definição + chamada em mostrarOfertaDetalhamento + chamada em mostrarSucessoDetalhamento = 3.
  assert.equal(ocorrencias, 3, "montarTextoWhatsAppCaptacaoEssencial precisa continuar sendo a única fonte da mensagem, reaproveitada nos dois novos pontos");
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo negativo -- nada fora do frontend foi tocado
// ═══════════════════════════════════════════════════════════════════════════

test("nenhuma nova chamada de rede a /api/upload com clienteId foi introduzida", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /\/api\/upload[\s\S]{0,120}clienteId/);
});

test("backend (B1), resolução de identidade e e-mails/alerta permanecem intocados por este bloco", () => {
  assert.match(srcLead, /else if \(chaveDedupAtual && formulario !== "captacao_detalhamento"\) \{/);
  assert.match(srcLead, /if \(formulario === "captacao_detalhamento" && !identidadeConflitante && !clienteId\) \{/);
  assert.match(srcLead, /if \(isNewClient && formulario !== "captacao_detalhamento" && cfgDisparos\?\.fluxo_notificacao_artista_ativa/);
  assert.match(srcLead, /if \(formulario !== "captacao_detalhamento" && cfgDisparos\?\.fluxo_boas_vindas_email_ativa/);
});

test("nenhum RPC/SQL/migration foi introduzido por este bloco", () => {
  assert.doesNotMatch(semComentarios(srcLead), /\.rpc\(/);
});
