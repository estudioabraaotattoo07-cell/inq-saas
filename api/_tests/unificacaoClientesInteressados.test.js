// api/_tests/unificacaoClientesInteressados.test.js
//
// Bloco de Unificação da Entrada de Clientes Interessados no Pipeline
// (2026-08-14). Cobre os itens 1-6 da lista de Validações Obrigatórias:
//   1. PIPELINE_ETAPAS_PADRAO tem "lead" com label "Clientes interessados".
//   2. "lead_morno" não existe mais.
//   3. "aura_agend" não existe mais.
//   4. As demais etapas continuam preservadas (mesmos ids, ordem sequencial).
//   5. Quantidade correta de etapas provisionadas -- coberto em
//      lib/tenant/provisionamento/dominios/criarPipeline.test.js.
//   6. Todo caminho de entrada identificado usa "lead".
//
// Os testes de "caminho de entrada" (api/lead.js, api/chat.js, api/config.js)
// são estruturais -- leem o código-fonte como texto, mesmo padrão já usado em
// api/_tests/lead.paginaSitePremium.test.js ("os dois chamadores HTTP usam
// paginaSitePremium()"). Não é um teste de comportamento em runtime (esses
// arquivos criam clientes Supabase reais na importação, fora do escopo de um
// teste unitário sem mocks), mas garante que a string exata que decide a
// etapa de um cliente novo está correta e que os identificadores removidos
// não aparecem mais nesses arquivos.
//
// Rodar com: node --test api/_tests/unificacaoClientesInteressados.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { PIPELINE_ETAPAS_PADRAO } = await import("../../lib/tenant/pipelinePadrao.js");

const IDS_ESPERADOS = [
  "lead", "precisa_remarcar", "cons_agendada", "sessao_agend", "aguard_agend",
  "aguard_1a_sessao", "aguard_prox_sessao", "tatuado", "pos_venda",
  "pos_venda_piercing", "reengajamento", "lista_espera", "hibernacao", "blacklist",
];

test("lead tem label 'Clientes interessados'", () => {
  const lead = PIPELINE_ETAPAS_PADRAO.find((e) => e.id === "lead");
  assert.ok(lead, "etapa 'lead' precisa existir");
  assert.equal(lead.label, "Clientes interessados");
});

test("lead_morno não existe mais no pipeline padrão", () => {
  assert.equal(PIPELINE_ETAPAS_PADRAO.some((e) => e.id === "lead_morno"), false);
});

test("aura_agend não existe mais no pipeline padrão", () => {
  assert.equal(PIPELINE_ETAPAS_PADRAO.some((e) => e.id === "aura_agend"), false);
});

test("as demais 13 etapas continuam preservadas, com os mesmos identificadores e na mesma ordem relativa", () => {
  assert.deepEqual(PIPELINE_ETAPAS_PADRAO.map((e) => e.id), IDS_ESPERADOS);
  assert.equal(PIPELINE_ETAPAS_PADRAO.length, 14);
});

test("ordem sequencial 1 a 14, sem lacunas, depois da remoção das duas etapas", () => {
  assert.deepEqual(
    PIPELINE_ETAPAS_PADRAO.map((e) => e.ordem),
    Array.from({ length: 14 }, (_, i) => i + 1)
  );
});

test("pos_venda_piercing continua a única etapa não-fixa; as outras 13 continuam fixo=true", () => {
  const naoFixas = PIPELINE_ETAPAS_PADRAO.filter((e) => e.fixo === false);
  assert.deepEqual(naoFixas.map((e) => e.id), ["pos_venda_piercing"]);
  const fixas = PIPELINE_ETAPAS_PADRAO.filter((e) => e.id !== "pos_venda_piercing");
  assert.equal(fixas.length, 13);
  for (const e of fixas) assert.equal(e.fixo, true);
});

// ── Caminhos de entrada (checagem estrutural do código-fonte) ──────────────

function lerFonte(...partes) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return readFileSync(path.join(__dirname, ...partes), "utf8");
}

test("api/lead.js (formulário do site): cliente novo sempre nasce com etapa fixa 'lead', sem aceitar etapa vinda do corpo da requisição", () => {
  const src = lerFonte("..", "lead.js");
  assert.match(src, /etapa:\s*"lead",/, "esperava encontrar etapa: \"lead\", fixo no objeto row");
  assert.doesNotMatch(src, /etapa:\s*etapaSolicitada/, "não deveria mais existir etapa vinda de etapaSolicitada");
  assert.doesNotMatch(src, /"lead_morno"/);
  assert.doesNotMatch(src, /"aura_agend"/);
});

test("api/chat.js (Aura pausada): nenhum caminho de criação/atualização de cliente aponta mais para lead_morno/aura_agend", () => {
  const src = lerFonte("..", "chat.js");
  const linhasAtivas = src.split("\n").filter((l) => !l.trim().startsWith("//"));
  const codigoAtivo = linhasAtivas.join("\n");
  assert.doesNotMatch(codigoAtivo, /"lead_morno"/);
  assert.doesNotMatch(codigoAtivo, /"aura_agend"/);
  // as 3 ocorrências de etapa (criação, atualização por telefone batendo, atualização por
  // cliente_id conhecido) devem todas ter virado o literal "lead"
  const ocorrenciasEtapaLead = (codigoAtivo.match(/etapa:\s*"lead"/g) || []).length;
  assert.equal(ocorrenciasEtapaLead, 3);
});

test("api/config.js (modo demonstração): exemplos não criam mais clientes em lead_morno/aura_agend", () => {
  const src = lerFonte("..", "config.js");
  assert.doesNotMatch(src, /etapa:\s*"lead_morno"/);
  assert.doesNotMatch(src, /etapa:\s*"aura_agend"/);
});

test("src/CRM Casa dos Carvalho.tsx: nenhuma referência operacional ativa a lead_morno/aura_agend fora de comentário explicativo ou normalização defensiva", () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(path.join(__dirname, "..", "..", "src", "CRM Casa dos Carvalho.tsx"), "utf8");
  const linhas = src.split("\n").filter((l) => l.includes("lead_morno") || l.includes("aura_agend"));
  for (const linha of linhas) {
    const trimmed = linha.trim();
    const ehComentario = trimmed.startsWith("//");
    const ehNormalizacaoDefensiva = /===\s*"lead_morno"|===\s*"aura_agend"/.test(linha) && linha.includes("lead");
    assert.ok(
      ehComentario || ehNormalizacaoDefensiva,
      `linha inesperada ainda referenciando etapa removida: ${trimmed}`
    );
  }
});

test("src/CRM Casa dos Carvalho.tsx: carregamento NÃO grava automaticamente lead_morno/aura_agend->lead no banco (Revisão Técnica Complementar, 2026-08-14) -- só normaliza a exibição em memória; só 'qualificacao' dispara UPDATE automático, como já era antes deste bloco", () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(path.join(__dirname, "..", "..", "src", "CRM Casa dos Carvalho.tsx"), "utf8");

  // Mapeamento visual (em memória, nunca grava): deve continuar tratando os
  // três casos, senão o card some da tela até o SQL rodar.
  const linhaMapeamentoVisual = src.split("\n").find((l) => l.includes("etapa === \"qualificacao\"") && l.includes("etapa:"));
  assert.ok(linhaMapeamentoVisual, "linha do mapeamento visual (clientesMapeados) não encontrada");
  assert.match(linhaMapeamentoVisual, /"lead_morno"/, "mapeamento visual deveria continuar normalizando lead_morno em memória");
  assert.match(linhaMapeamentoVisual, /"aura_agend"/, "mapeamento visual deveria continuar normalizando aura_agend em memória");

  // Filtro que decide QUEM recebe update() automático: só qualificacao.
  const linhaFiltroMigracao = src.split("\n").find((l) => l.includes("clientesParaMigrar = cls.filter"));
  assert.ok(linhaFiltroMigracao, "linha do filtro clientesParaMigrar não encontrada");
  assert.match(linhaFiltroMigracao, /"qualificacao"/, "filtro de migração automática deveria continuar cobrindo qualificacao");
  assert.doesNotMatch(linhaFiltroMigracao, /"lead_morno"/, "filtro de migração automática NÃO pode gravar lead_morno sozinho no banco");
  assert.doesNotMatch(linhaFiltroMigracao, /"aura_agend"/, "filtro de migração automática NÃO pode gravar aura_agend sozinho no banco");
});
