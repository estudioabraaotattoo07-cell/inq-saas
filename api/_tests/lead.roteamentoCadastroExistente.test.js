// api/_tests/lead.roteamentoCadastroExistente.test.js
//
// Bloco 3.2A -- Roteamento seguro e privacidade (2026-08-16). A arquitetura
// complexa de reincidência (solicitacao_id, RPC, seleção de projeto ativo)
// foi abandonada -- este bloco só simplifica o que o formulário público faz
// quando reconhece um cadastro já existente (isNewClient === false): reduz
// as escritas ao enriquecimento cadastral mínimo, para de disparar o alerta
// "Novo lead" ao artista, e remove a exposição pública de matchInfo
// (etapa/projetos/artista). Não é possível chamar o handler HTTP inteiro sem
// um Supabase real (mesma limitação já documentada nos outros testes deste
// arquivo) -- por isso estes são testes ESTRUTURAIS, que leem lead.js como
// texto e provam por padrão de código que as regras aprovadas estão em
// vigor.
//
// Rodar com: node --test api/_tests/lead.roteamentoCadastroExistente.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

function codigoSemComentarios(texto) {
  return texto
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");
}

// Isola o bloco do ramo normal de cliente existente (entre o comentário do
// Bloco 3.2A que abre o updateFields reduzido e a chamada final de update),
// pra checar precisamente o que é/não é escrito ali -- sem contaminar com
// outros trechos do arquivo que também mencionam esses nomes de campo.
function trechoUpdateFieldsExistente() {
  const inicio = srcLead.indexOf("Bloco 3.2A -- Roteamento seguro e privacidade (2026-08-16): cadastro");
  assert.ok(inicio !== -1, "não encontrado: comentário do Bloco 3.2A no ramo de cliente existente");
  const fim = srcLead.indexOf("} else if (match && isNewClient)", inicio);
  assert.ok(fim !== -1, "não encontrado: fim do ramo de cliente existente (else if match && isNewClient)");
  return srcLead.slice(inicio, fim);
}

test("matchInfo não existe mais em código ativo (nem a variável, nem sua construção)", () => {
  const codigoAtivo = codigoSemComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /matchInfo/, "matchInfo não deveria mais aparecer fora de comentário/histórico");
});

test("updateFields do cadastro existente NÃO escreve descricao/regiao/servico/artista/obs/orig/campanha", () => {
  const trecho = trechoUpdateFieldsExistente();
  assert.doesNotMatch(trecho, /updateFields\.descricao\s*=/, "descricao não pode mais ser escrita para cadastro existente");
  assert.doesNotMatch(trecho, /updateFields\.regiao\s*=/, "regiao não pode mais ser escrita para cadastro existente");
  assert.doesNotMatch(trecho, /updateFields\.servico\s*=/, "servico não pode mais ser escrito para cadastro existente");
  assert.doesNotMatch(trecho, /updateFields\.artista\s*=/, "artista não pode mais ser escrito para cadastro existente");
  assert.doesNotMatch(trecho, /updateFields\.obs\s*=/, "obs não pode mais ser escrito para cadastro existente");
  assert.doesNotMatch(trecho, /updateFields\.orig\s*=/, "orig não pode mais ser escrito para cadastro existente");
  assert.doesNotMatch(trecho, /updateFields\.periodo_ligacao\s*=/, "periodo_ligacao não pode mais ser escrito para cadastro existente");
  assert.doesNotMatch(trecho, /Object\.assign\(updateFields,\s*camposCampanha\)/, "campanha não pode mais ser aplicada ao cadastro existente");
});

test("updateFields do cadastro existente MANTÉM só o enriquecimento cadastral mínimo aprovado", () => {
  const trecho = trechoUpdateFieldsExistente();
  assert.match(trecho, /const updateFields = \{ excluido_em: null \};/, "excluido_em: null precisa continuar sendo restaurado");
  assert.match(trecho, /campanhaAplicada = null;/, "campanhaAplicada precisa ser nulado explicitamente pro cadastro existente");
  assert.match(trecho, /const nomeVal = maisCompleto\(match\.nome, nome\);\s*\n\s*if \(nomeVal\) updateFields\.nome = nomeVal;/, "nome via maisCompleto precisa continuar");
  assert.match(trecho, /const emailVal = maisCompleto\(match\.email, email\);\s*\n\s*if \(emailVal\) updateFields\.email = emailVal;/, "email via maisCompleto precisa continuar");
  assert.match(trecho, /const instaVal = maisCompleto\(match\.insta, insta\);\s*\n\s*if \(instaVal\) updateFields\.insta = instaVal;/, "insta via maisCompleto precisa continuar");
  assert.match(trecho, /if \(telDigits && !match\.tel\) updateFields\.tel = tel;/, "tel só-se-vazio precisa continuar");
  assert.match(trecho, /if \(nascimentoISO && !match\.nascimento\) updateFields\.nascimento = nascimentoISO;/, "nascimento só-se-vazio precisa continuar");
});

test("ressincronização de chave_dedup continua acontecendo pro cadastro existente, agora só quando a submissão tem telefone (correção de direção, 2026-08-17 -- ver lead.ressincronizacaoDirecional3.3A.test.js)", () => {
  const trecho = trechoUpdateFieldsExistente();
  assert.match(trecho, /if \(telDigits && chaveDedupAtual && chaveDedupAtual !== match\.chave_dedup\)/, "ressincronização de chave_dedup precisa continuar, condicionada a telDigits");
  assert.match(trecho, /sb\.from\("clientes"\)\.update\(\{ chave_dedup: chaveDedupAtual \}\)\.eq\("id", match\.id\)/, "update de chave_dedup precisa continuar");
});

test("update final do cadastro existente continua sendo aplicado no banco", () => {
  const trecho = trechoUpdateFieldsExistente();
  assert.match(trecho, /await sb\.from\("clientes"\)\.update\(updateFields\)\.eq\("id", match\.id\)/, "o update com os campos reduzidos precisa continuar sendo persistido");
});

test("alerta ao artista ('Novo lead') só dispara para isNewClient === true", () => {
  assert.match(srcLead, /if \(isNewClient && cfgDisparos\?\.fluxo_notificacao_artista_ativa !== false && resendKey\) \{/,
    "a condição de disparo do alerta precisa incluir isNewClient");
});

test("template/conteúdo do alerta ao artista não foi alterado desnecessariamente", () => {
  assert.match(srcLead, /✦ Novo lead — " \+ nome/, "o assunto/título do alerta continua o mesmo -- não foi redesenhado neste bloco");
});

test("E-mail 1 (boas-vindas) continua incondicional a isNewClient -- preservado tal como está", () => {
  const idx = srcLead.indexOf('if (cfgDisparos?.fluxo_boas_vindas_email_ativa !== false && resendKey && email) {');
  assert.ok(idx !== -1, "condição de disparo do E-mail 1 não encontrada como esperado");
  assert.doesNotMatch(srcLead.slice(idx, idx + 200), /isNewClient/, "E-mail 1 não deve ser condicionado a isNewClient neste bloco -- isso pertence ao Bloco 3.2B (E-mail 2)");
});

test("resposta pública do ramo de cliente existente não finalizado é neutra -- sem etapa/projetos/artista/matchInfo", () => {
  assert.match(
    srcLead,
    /if \(!deveNotificar\) return res\.status\(200\)\.json\(\{ ok: true, clienteId, updated: true, campanha: campanhaResp \}\);/,
    "a resposta precisa ser exatamente {ok, clienteId, updated, campanha} -- sem spread de matchInfo nem campos operacionais"
  );
});

test("clienteId continua presente nas respostas públicas (decisão aprovada: manter)", () => {
  const ocorrencias = (srcLead.match(/res\.status\(200\)\.json\(\{ ok: true, clienteId/g) || []).length;
  assert.ok(ocorrencias >= 3, "clienteId precisa continuar presente nos caminhos de resposta de sucesso");
});

test("cadastro novo continua gravando descricao/regiao/referencias em row (Lead/Lead Quente intactos)", () => {
  assert.match(srcLead, /descricao: ideaFinal,/, "row.descricao precisa continuar existindo para cliente novo");
  assert.match(srcLead, /regiao: regiao \|\| "",/, "row.regiao precisa continuar existindo para cliente novo");
  assert.match(srcLead, /referencias: Array\.isArray\(referencias\) && referencias\.length \? referencias : \[\],/, "row.referencias precisa continuar existindo para cliente novo");
});

test("nenhuma arquitetura de projetos/RPC/solicitacao_id foi introduzida", () => {
  const codigoAtivo = codigoSemComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /resolver_solicitacao_lead/);
  assert.doesNotMatch(codigoAtivo, /marcar_email_solicitacao_enviado/);
  assert.doesNotMatch(codigoAtivo, /solicitacao_id/);
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
});

test("criarSolicitacao (o handler do formulário público) continua sem escrever clientes.projetos", () => {
  const idxHandler = srcLead.indexOf("const { nome, tel, email, idea, ideia, artista, artistaNome, insta, regiao, nascimento, referencias, orig,");
  assert.ok(idxHandler !== -1, "início do handler do formulário público (destructuring de req.body) não encontrado");
  const trechoHandler = codigoSemComentarios(srcLead.slice(idxHandler));
  assert.doesNotMatch(trechoHandler, /\bprojetos\s*:/, "criarSolicitacao não pode escrever/inicializar projetos em nenhum objeto");
});
