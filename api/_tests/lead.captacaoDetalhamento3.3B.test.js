// api/_tests/lead.captacaoDetalhamento3.3B.test.js
//
// Bloco 3.3B-B1 (2026-08-17) -- backend da segunda etapa opcional de
// detalhamento ("Quer contar um pouco mais?"). formulario ===
// "captacao_detalhamento" é só um discriminador operacional (mesmo papel já
// documentado para "captacao_essencial") -- NUNCA um mecanismo de
// autenticação nem autorização para criar cliente. A pessoa precisa já
// estar reconhecida pela resolução de identidade do 3.3A (reenviando
// nome+tel/email, sem clienteId) para que qualquer escrita aconteça.
//
// Fail-closed: a auditoria pré-implementação identificou DOIS caminhos de
// código independentes capazes de criar um cliente novo (o upsert atômico
// de chave_dedup e o Fallback Final) -- este bloco precisa provar que
// nenhum dos dois é alcançável quando formulario === "captacao_detalhamento".
//
// Cliente existente != projeto existente: quando há match seguro, o
// detalhamento nunca escreve em clientes.descricao/regiao (isso reabriria o
// que o Bloco 3.2A fechou) -- acrescenta um novo item ao FINAL de
// match.projetos, preservando os anteriores. Referências continuam
// exclusivamente em clientes.referencias, sempre concatenadas.
//
// Nenhuma comunicação automática (E-mail 1, E-mail 2, alerta ao artista)
// pode disparar nesta modalidade -- a comunicação pertinente já aconteceu
// na captação essencial imediatamente anterior.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): estrutural/textual,
// sem Supabase real.
//
// Rodar com: node --test api/_tests/lead.captacaoDetalhamento3.3B.test.js

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
  const inicio = srcLead.indexOf("let identidadeConflitante = false;");
  const fim = srcLead.indexOf("// Saída controlada -- identidade conflitante/ambígua detectada acima.");
  assert.ok(inicio !== -1 && fim !== -1, "não foi possível isolar o bloco de resolução de identidade");
  return srcLead.slice(inicio, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// Os dois guards de criação -- evidência de que nenhum dos dois caminhos de
// criação é alcançável para captacao_detalhamento.
// ═══════════════════════════════════════════════════════════════════════════

test("Guard 1: o upsert atômico de criação (chave_dedup) é pulado quando formulario === captacao_detalhamento", () => {
  assert.match(srcLead, /\} else if \(chaveDedupAtual && formulario !== "captacao_detalhamento"\) \{/);
  // Garante que não existe NENHUM outro caminho para chaveDedupAtual chegar
  // ao upsert sem essa condição -- só uma ocorrência do upsert em todo o
  // bloco de resolução.
  const trecho = trechoResolucaoIdentidade();
  const ocorrenciasUpsert = (trecho.match(/\.upsert\(\{ \.\.\.row, chave_dedup: chaveDedupAtual \}/g) || []).length;
  assert.equal(ocorrenciasUpsert, 1, "só pode existir um único upsert de criação, e ele precisa estar atrás do guard");
});

test("Guard 2: fail-closed impede o Fallback Final de criar cliente quando formulario === captacao_detalhamento", () => {
  assert.match(
    srcLead,
    /if \(formulario === "captacao_detalhamento" && !identidadeConflitante && !clienteId\) \{\s*\n\s*identidadeConflitante = true;\s*\n\s*\}/
  );
});

test("ordem: guard 2 (fail-closed) vem ANTES do retorno de identidadeConflitante, que vem ANTES do Fallback Final", () => {
  const idxGuard2 = srcLead.indexOf('if (formulario === "captacao_detalhamento" && !identidadeConflitante && !clienteId)');
  const idxRetornoAmbiguo = srcLead.indexOf('return res.status(200).json({ ok: true, ambiguo: true });');
  const idxFallbackFinal = srcLead.indexOf('const { data: inserted, error } = await sb.from("clientes").insert(row)');
  assert.ok(idxGuard2 !== -1 && idxRetornoAmbiguo !== -1 && idxFallbackFinal !== -1);
  assert.ok(idxGuard2 < idxRetornoAmbiguo, "guard 2 precisa rodar antes do retorno de ambiguo:true");
  assert.ok(idxRetornoAmbiguo < idxFallbackFinal, "o retorno de ambiguo:true precisa acontecer antes do Fallback Final");
});

test("nenhum outro caminho de INSERT de cliente existe fora do Fallback Final já guardado", () => {
  const codigoAtivo = semComentarios(srcLead);
  const ocorrenciasInsertClientes = (codigoAtivo.match(/sb\.from\("clientes"\)\.insert\(/g) || []).length;
  assert.equal(ocorrenciasInsertClientes, 1, "só pode existir um único .insert() de cliente em todo o arquivo (o Fallback Final)");
});

// ═══════════════════════════════════════════════════════════════════════════
// Novo item de projetos[] -- formato, conteúdo real obrigatório, preservação
// ═══════════════════════════════════════════════════════════════════════════

function trechoRamoEnriquecimento() {
  const inicio = srcLead.indexOf("const updateFields = { excluido_em: null };");
  const fim = srcLead.indexOf("// Bloco de Unificação da Entrada de Clientes Interessados (2026-08-14):", inicio);
  assert.ok(inicio !== -1 && fim !== -1);
  return srcLead.slice(inicio, fim);
}

test("novo projeto só é montado quando formulario === captacao_detalhamento", () => {
  const trecho = trechoRamoEnriquecimento();
  assert.match(trecho, /if \(formulario === "captacao_detalhamento"\) \{/);
});

test("projeto vazio nunca é criado -- exige descrição, região OU referências", () => {
  const trecho = trechoRamoEnriquecimento();
  assert.match(trecho, /const temDetalhamento = !!\(ideaFinal \|\| regiao \|\| \(Array\.isArray\(referencias\) && referencias\.length > 0\)\);/);
  assert.match(trecho, /if \(temDetalhamento\) \{/);
});

test("formato exato do novo item de projetos[] -- id, status, etapa, desc, regiao e demais campos aprovados", () => {
  const trecho = trechoRamoEnriquecimento();
  assert.match(trecho, /const novoProjeto = \{\s*\n\s*id: Date\.now\(\)\.toString\(\),\s*\n\s*status: "ativo",\s*\n\s*etapa: "lead", etapa_desde: new Date\(\)\.toISOString\(\),\s*\n\s*desc: ideaFinal \|\| "",\s*\n\s*regiao: regiao \|\| "",\s*\n\s*estilo: "", servico: "", tam: "Medio", valorTotal: 0,\s*\n\s*pagamentos: \[\], criadoEm: new Date\(\)\.toLocaleDateString\("pt-BR"\),\s*\n\s*\};/);
});

test("projetos anteriores são preservados -- novoProjeto é acrescentado ao FINAL de match.projetos, nunca substitui o array", () => {
  const trecho = trechoRamoEnriquecimento();
  assert.match(trecho, /updateFields\.projetos = \[\.\.\.\(match\.projetos \|\| \[\]\), novoProjeto\];/);
});

test("descricao/regiao do CLIENTE nunca são escritas por captacao_detalhamento -- só o item de projetos[]", () => {
  const trecho = trechoRamoEnriquecimento();
  assert.doesNotMatch(trecho, /updateFields\.descricao\s*=/);
  assert.doesNotMatch(trecho, /updateFields\.regiao\s*=/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Referências -- concatenação, nunca substituição, nunca dentro de projetos[]
// ═══════════════════════════════════════════════════════════════════════════

test("referências concatenam sobre match.referencias -- nunca substituem o array anterior", () => {
  const trecho = trechoRamoEnriquecimento();
  assert.match(trecho, /updateFields\.referencias = \[\.\.\.\(match\.referencias \|\| \[\]\), \.\.\.referencias\];/);
});

test("referências só entram em updateFields quando o array vier não-vazio", () => {
  const trecho = trechoRamoEnriquecimento();
  assert.match(trecho, /if \(Array\.isArray\(referencias\) && referencias\.length > 0\) \{\s*\n\s*updateFields\.referencias = \[\.\.\.\(match\.referencias \|\| \[\]\), \.\.\.referencias\];/);
});

test("novoProjeto nunca contém uma chave 'referencias' -- continuam exclusivamente em clientes.referencias", () => {
  const trecho = trechoRamoEnriquecimento();
  const idxNovoProjeto = trecho.indexOf("const novoProjeto = {");
  const idxFimNovoProjeto = trecho.indexOf("};", idxNovoProjeto);
  const blocoNovoProjeto = trecho.slice(idxNovoProjeto, idxFimNovoProjeto);
  assert.doesNotMatch(blocoNovoProjeto, /referencias/);
});

test("api/upload.js não foi alterado por este bloco", () => {
  const srcUpload = readFileSync(path.join(__dirname, "..", "upload.js"), "utf8");
  assert.match(srcUpload, /export default async function handler\(req, res\) \{/);
  assert.match(srcUpload, /sb\.rpc\("append_referencia", \{ cid: clienteId, url \}\)/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Nenhuma comunicação automática
// ═══════════════════════════════════════════════════════════════════════════

test("alerta ao artista é explicitamente excluído para captacao_detalhamento", () => {
  assert.match(
    srcLead,
    /if \(isNewClient && formulario !== "captacao_detalhamento" && cfgDisparos\?\.fluxo_notificacao_artista_ativa !== false && resendKey\) \{/
  );
});

test("E-mail 1 e E-mail 2 são explicitamente excluídos para captacao_detalhamento (mesmo gate, único ponto de entrada)", () => {
  assert.match(
    srcLead,
    /if \(formulario !== "captacao_detalhamento" && cfgDisparos\?\.fluxo_boas_vindas_email_ativa !== false && resendKey && email\) \{/
  );
});

test("nenhuma outra chamada a enviarEmailLead existe fora dos dois gates já auditados", () => {
  const codigoAtivo = semComentarios(srcLead);
  const ocorrencias = (codigoAtivo.match(/await enviarEmailLead\(/g) || []).length;
  assert.equal(ocorrencias, 3, "esperado: alerta ao artista + E-mail 1 (boas-vindas) + E-mail 2 (cadastro reconhecido) -- nenhum quarto disparo");
});

// ═══════════════════════════════════════════════════════════════════════════
// 3.3A intocado -- mesma resolução de identidade, sem segunda implementação
// ═══════════════════════════════════════════════════════════════════════════

test("telDigits, chaveDedupAtual, donoExato, candidatosPorEmail permanecem byte-idênticos", () => {
  assert.match(srcLead, /const telDigits = tel \? tel\.replace\(\/\[\^0-9\]\/g, ""\)\.slice\(-11\) : null;/);
  assert.match(srcLead, /const chaveDedupAtual = calcularChaveDedup\(nome, tel, email\);/);
  assert.match(srcLead, /let donoExato = null;/);
  assert.match(srcLead, /let candidatosPorEmail = null;/);
});

test("identidadeConflitante, detectarCompartilhamento e a ressincronização de chave_dedup permanecem intactos", () => {
  assert.match(srcLead, /let identidadeConflitante = false;/);
  assert.match(srcLead, /function detectarCompartilhamento\(nomeAtual, telAtual, emailAtual, existentesLista, idExcluir\) \{/);
  assert.match(srcLead, /if \(telDigits && chaveDedupAtual && chaveDedupAtual !== match\.chave_dedup\) \{/);
});

test("captacao_detalhamento não introduz nenhuma segunda leitura/consulta de identidade -- reaproveita match já resolvido pelo bloco existente", () => {
  const trecho = trechoRamoEnriquecimento();
  assert.doesNotMatch(trecho, /candidatosPorEmail/);
  assert.doesNotMatch(trecho, /donoExato/);
  assert.doesNotMatch(trecho, /sb\.from\("clientes"\)\.select/);
});

test("clienteIdBody continua não sendo exigido nem lido por captacao_detalhamento -- nenhum novo ponto de leitura foi introduzido", () => {
  const codigoAtivo = semComentarios(srcLead);
  const ocorrencias = (codigoAtivo.match(/clienteIdBody/g) || []).length;
  // Mesmas 3 ocorrências de antes deste bloco: a desestruturação (linha
  // ~1779) + "if (clienteIdBody)" + ".eq('id', clienteIdBody)" (ambas
  // dentro do caminho pré-existente "Conversa já em andamento", Bloco 3.3A)
  // -- nenhuma nova introduzida pelo detalhamento.
  assert.equal(ocorrencias, 3, "clienteIdBody não pode ganhar nenhum novo ponto de leitura por causa do detalhamento");
});

// ═══════════════════════════════════════════════════════════════════════════
// Demais formulários inalterados
// ═══════════════════════════════════════════════════════════════════════════

test("captacao_essencial e ficha antiga (sem formulario) continuam alcançando o upsert de criação normalmente -- guard 1 não os afeta", () => {
  // Com formulario undefined ou "captacao_essencial", a condição
  // "formulario !== 'captacao_detalhamento'" é sempre verdadeira -- o ramo
  // de criação continua acessível exatamente como antes.
  assert.match(srcLead, /else if \(chaveDedupAtual && formulario !== "captacao_detalhamento"\) \{/);
});

test("resposta pública final continua sem updated/isNewClient/clienteId revelando novo x reconhecido", () => {
  const codigoAtivo = semComentarios(srcLead);
  const respostasJson = codigoAtivo.match(/res\.status\(200\)\.json\(\{[^}]*\}\)/g) || [];
  for (const resposta of respostasJson) {
    assert.doesNotMatch(resposta, /isNewClient/, `resposta pública não pode conter isNewClient: ${resposta}`);
    assert.doesNotMatch(resposta, /\bupdated\b/, `resposta pública não pode conter updated: ${resposta}`);
  }
});

test("nenhum RPC/SQL/migration foi introduzido por este bloco (api/lead.js nunca usou .rpc)", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
});
