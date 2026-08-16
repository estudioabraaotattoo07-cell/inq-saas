// api/_tests/lead.email2CadastroReconhecido.test.js
//
// Bloco 3.2B -- E-mail 2 para cadastro reconhecido (2026-08-16). Bifurca o
// disparo de e-mail automático da captação pública: isNewClient===true
// continua recebendo o E-mail 1 (boas-vindas) tal como já existia;
// isNewClient===false passa a receber o E-mail 2 (cadastro reconhecido),
// nunca os dois juntos. Mesma limitação já documentada nos outros testes
// deste arquivo -- não é possível chamar o handler HTTP inteiro sem um
// Supabase real, então estes são testes ESTRUTURAIS/TEXTUAIS: leem lead.js
// como texto e provam por padrão de código que a bifurcação e o conteúdo
// aprovado estão em vigor.
//
// Rodar com: node --test api/_tests/lead.email2CadastroReconhecido.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

// Isola o bloco inteiro de disparo de e-mail automático (o if externo do
// toggle até seu fechamento), pra checar precisamente os dois ramos sem
// contaminar com outros trechos do arquivo.
function trechoBlocoEmails() {
  const inicio = srcLead.indexOf('if (cfgDisparos?.fluxo_boas_vindas_email_ativa !== false && resendKey && email) {');
  assert.ok(inicio !== -1, "não encontrado: bloco condicional do e-mail automático");
  const inicioAlerta = srcLead.lastIndexOf("if (isNewClient && cfgDisparos?.fluxo_notificacao_artista_ativa", inicio);
  assert.ok(inicioAlerta !== -1 && inicioAlerta < inicio, "referência de alerta ao artista não encontrada antes do bloco de e-mails");
  const fim = srcLead.indexOf("\n  return res.status(200).json({ ok: true, clienteId, campanha: campanhaResp });", inicio);
  assert.ok(fim !== -1, "não encontrado: fim do handler (resposta final)");
  return srcLead.slice(inicio, fim);
}

function trechoRamoNovo() {
  const trecho = trechoBlocoEmails();
  const inicio = trecho.indexOf("if (isNewClient) {");
  const fim = trecho.indexOf("} else {", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "ramo isNewClient (E-mail 1) não encontrado");
  return trecho.slice(inicio, fim);
}

function trechoRamoExistente() {
  const trecho = trechoBlocoEmails();
  const inicioElse = trecho.indexOf("} else {");
  assert.ok(inicioElse !== -1, "ramo else (E-mail 2) não encontrado");
  return trecho.slice(inicioElse);
}

// Remove linhas só-comentário antes de checar ausência de uma frase/palavra --
// senão o próprio comentário que EXPLICA o que não deve aparecer (ex.: "nunca
// afirma 'já tatuou'") faria a asserção de ausência falhar contra si mesma.
function semComentarios(texto) {
  return texto
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
}

test("E-mail 1 e E-mail 2 são mutuamente exclusivos -- um único if/else dentro do mesmo gate", () => {
  const trecho = trechoBlocoEmails();
  const qtdIfIsNewClient = (trecho.match(/if \(isNewClient\) \{/g) || []).length;
  const qtdElse = (trecho.match(/\} else \{/g) || []).length;
  assert.equal(qtdIfIsNewClient, 1, "precisa haver exatamente um if (isNewClient) dentro do bloco de e-mails");
  assert.equal(qtdElse, 1, "precisa haver exatamente um else correspondente");
});

test("novo cadastro: ramo isNewClient continua enviando 'boas-vindas ao cliente' com resumoDados", () => {
  const trecho = trechoRamoNovo();
  assert.match(trecho, /enviarEmailLead\("boas-vindas ao cliente", \{/, "E-mail 1 precisa continuar sendo disparado no ramo de cliente novo");
  assert.match(trecho, /subject: "Recebemos sua mensagem, " \+ fn \+ "! 🖤"/, "assunto do E-mail 1 precisa continuar igual");
  assert.match(trecho, /const resumoDados =/, "E-mail 1 precisa continuar com a tabela resumoDados");
  assert.doesNotMatch(trecho, /cadastro reconhecido/, "ramo de cliente novo não pode mencionar o E-mail 2");
});

test("cadastro existente: ramo else dispara 'cadastro reconhecido', nunca 'boas-vindas ao cliente'", () => {
  const trecho = trechoRamoExistente();
  assert.match(trecho, /enviarEmailLead\("cadastro reconhecido", \{/, "E-mail 2 precisa ser disparado no ramo de cliente existente");
  assert.doesNotMatch(trecho, /"boas-vindas ao cliente"/, "E-mail 1 não pode ser disparado no ramo de cliente existente");
});

test("assunto do E-mail 2 usa fn (primeiro nome já calculado)", () => {
  const trecho = trechoRamoExistente();
  assert.match(trecho, /subject: "Vamos continuar seu atendimento, " \+ fn \+ "\?"/);
});

test("corpo do E-mail 2 só informa reconhecimento do cadastro -- sem afirmar situação operacional não comprovada", () => {
  const trecho = trechoRamoExistente();
  assert.match(trecho, /Recebemos suas informações e reconhecemos que você já possui um cadastro conosco\./);
  const codigoAtivo = semComentarios(trecho);
  const proibidas = [/já tatuou/i, /já é (nosso )?cliente/i, /projeto ativo/i, /já realizou/i, /cliente efetivo/i];
  for (const re of proibidas) {
    assert.doesNotMatch(codigoAtivo, re, `E-mail 2 não pode afirmar situação operacional não comprovada, fora de comentário (padrão: ${re})`);
  }
});

test("E-mail 2 usa nomeEstudioLead, e-mail submetido e reply_to do estúdio -- mesmo mecanismo do E-mail 1", () => {
  const trecho = trechoRamoExistente();
  assert.match(trecho, /nomeEstudioLead/);
  assert.match(trecho, /to: \[email\]/, "precisa usar a variável email submetida, sem plumbing nova pra match.email");
  assert.match(trecho, /\.\.\.\(replyToEstudio \? \{ reply_to: replyToEstudio \} : \{\}\)/);
});

test("E-mail 2 NÃO inclui resumoDados nem dados da nova intenção (ideia/região/artista/serviço/observações)", () => {
  const codigoAtivo = semComentarios(trechoRamoExistente());
  assert.doesNotMatch(codigoAtivo, /resumoDados/);
  assert.doesNotMatch(codigoAtivo, /ideaFinal/);
  assert.doesNotMatch(codigoAtivo, /\bregiao\b/);
  assert.doesNotMatch(codigoAtivo, /artistaNomeResolvido/);
  assert.doesNotMatch(codigoAtivo, /\bobsExtra\b/);
});

test("E-mail 2 não dispara alerta ao artista -- alerta continua isolado, condicionado só a isNewClient (Bloco 3.2A)", () => {
  assert.match(srcLead, /if \(isNewClient && cfgDisparos\?\.fluxo_notificacao_artista_ativa !== false && resendKey\) \{/);
  const trecho = trechoRamoExistente();
  assert.doesNotMatch(trecho, /alerta ao artista/);
});

test("WhatsApp do E-mail 2 reaproveita waNumero (cfgDisparos.studio_tel) e encodeURIComponent, sem nova consulta", () => {
  const trechoBloco = trechoBlocoEmails();
  const qtdWaNumero = (trechoBloco.match(/const waNumero = cfgDisparos\?\.studio_tel/g) || []).length;
  assert.equal(qtdWaNumero, 1, "waNumero precisa ser calculado uma única vez, compartilhado pelos dois e-mails");
  const trechoExistente = trechoRamoExistente();
  assert.match(trechoExistente, /const waTexto2 = "Olá! Já possuo cadastro e gostaria de continuar meu atendimento\.";/);
  assert.match(trechoExistente, /const waLink2 = waNumero \? "https:\/\/wa\.me\/" \+ waNumero \+ "\?text=" \+ encodeURIComponent\(waTexto2\) : "";/);
  assert.match(trechoExistente, /Continuar pelo WhatsApp/);
});

test("mensagem pré-preenchida do E-mail 2 não altera a mensagem do E-mail 1 (waTexto original preservado)", () => {
  const trechoNovo = trechoRamoNovo();
  assert.match(trechoNovo, /const waTexto = "Olá! Recebi agora o e-mail confirmando meu cadastro na " \+ nomeEstudioLead/, "waTexto do E-mail 1 precisa continuar exatamente igual");
});

test("ausência de WhatsApp: E-mail 2 continua sendo enviado, sem botão quebrado, com orientação de resposta por e-mail", () => {
  const trecho = trechoRamoExistente();
  assert.match(trecho, /const ctaOuOrientacao = waLink2/, "precisa existir um fallback explícito quando waLink2 for vazio");
  assert.match(trecho, /Para continuar seu atendimento, responda este e-mail e nossa equipe dará continuidade ao contato\./);
  assert.doesNotMatch(trecho, /href='' /, "não pode existir link href vazio renderizado");
});

test("resposta pública final permanece exatamente igual -- bifurcação é só interna", () => {
  assert.match(
    srcLead,
    /return res\.status\(200\)\.json\(\{ ok: true, clienteId, campanha: campanhaResp \}\);\r?\n\}/,
    "a resposta final não pode ter sido alterada por este bloco"
  );
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /isNewClient[,:]/, "isNewClient não pode ser exposto em nenhuma construção de resposta JSON");
});
