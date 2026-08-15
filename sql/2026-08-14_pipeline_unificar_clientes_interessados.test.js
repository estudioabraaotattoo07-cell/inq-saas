// sql/2026-08-14_pipeline_unificar_clientes_interessados.test.js
//
// Correção pós-revisão externa (2026-08-15) do Bloco de Unificação da
// Entrada de Clientes Interessados. Este arquivo SQL roda transacionalmente
// dentro do Supabase (PL/pgSQL) -- não há Postgres disponível neste
// ambiente de testes e a sessão não tem autorização pra acessar o banco, e
// não a acessa. Por isso estes são testes ESTRUTURAIS: leem o arquivo .sql
// como texto e conferem, por padrão de texto, que as propriedades exigidas
// estão presentes -- mesmo padrão já usado pra api/lead.js/chat.js/config.js
// em api/_tests/unificacaoClientesInteressados.test.js. Não substituem uma
// execução real (que só pode acontecer manualmente, no SQL Editor do
// Supabase, depois de aprovação).
//
// Rodar com: node --test sql/2026-08-14_pipeline_unificar_clientes_interessados.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_SQL = path.join(__dirname, "2026-08-14_pipeline_unificar_clientes_interessados.sql");
const sql = readFileSync(CAMINHO_SQL, "utf8");

test("tenant com colunas antigas em pipeline_etapas e ZERO clientes também é descoberto (critério 3 da união)", () => {
  assert.match(
    sql,
    /select user_id as uid from pipeline_etapas where slug in \('lead_morno', 'aura_agend'\)/,
    "a descoberta de tenants precisa incluir tenants só por terem linha(s) de pipeline_etapas com slug lead_morno/aura_agend, mesmo sem cliente/projeto nenhum"
  );
});

test("tenant com label antigo em 'lead' (sem nenhum cliente/projeto afetado) também é descoberto (critério 4 da união)", () => {
  assert.match(
    sql,
    /select user_id as uid from pipeline_etapas where slug = 'lead' and label is distinct from 'Clientes interessados'/,
    "a descoberta de tenants precisa incluir tenants cujo 'lead' ainda tem label diferente de 'Clientes interessados', mesmo sem cliente/projeto afetado"
  );
});

test("descoberta de tenants é a união dos 4 critérios (clientes, projetos[], pipeline_etapas antigas, label desatualizado)", () => {
  const ocorrenciasUnion = (sql.match(/\bunion\b/g) || []).length;
  assert.ok(ocorrenciasUnion >= 3, `esperava pelo menos 3 UNION (4 critérios) na descoberta de tenants, achou ${ocorrenciasUnion}`);
});

test("isolamento explícito por user_id: todo UPDATE/DELETE dentro do loop por tenant é filtrado também por user_id = tenant_id", () => {
  // Extrai só o corpo do loop "foreach tenant_id in array tenants_afetados ... end loop;"
  const inicioLoop = sql.indexOf("foreach tenant_id in array tenants_afetados");
  const fimLoop = sql.indexOf("end loop;");
  assert.ok(inicioLoop !== -1 && fimLoop !== -1 && fimLoop > inicioLoop, "não encontrou o corpo do loop por tenant");
  const corpoLoop = sql.slice(inicioLoop, fimLoop);

  const blocosMutacao = corpoLoop.split(/\n\s*\n/).filter((bloco) =>
    /update\s+clientes|update\s+pipeline_etapas|delete\s+from\s+pipeline_etapas/i.test(bloco)
  );
  assert.ok(blocosMutacao.length >= 3, "esperava pelo menos 3 blocos de mutação (update clientes, update pipeline_etapas, delete pipeline_etapas) dentro do loop");
  for (const bloco of blocosMutacao) {
    assert.match(bloco, /user_id\s*=\s*tenant_id/, `bloco de mutação sem filtro explícito por user_id = tenant_id:\n${bloco}`);
  }
});

test("bloqueio de user_id nulo roda ANTES da descoberta de tenants (PASSO 0 vem antes do PASSO 1) e aborta com RAISE EXCEPTION", () => {
  // Busca os cabeçalhos de seção reais dentro do corpo do bloco PL/pgSQL
  // (formato "-- ── PASSO N —"), não menções soltas em prosa no comentário
  // de topo do arquivo (que citam "PASSO 1" antes mesmo do PASSO 0 aparecer,
  // só como referência cruzada explicativa).
  const idxPasso0 = sql.search(/──\s*PASSO 0\s*—/);
  const idxPasso1 = sql.search(/──\s*PASSO 1\s*—/);
  assert.ok(idxPasso0 !== -1 && idxPasso1 !== -1 && idxPasso0 < idxPasso1, "PASSO 0 (segurança user_id nulo) precisa vir antes do PASSO 1 (descoberta de tenants)");

  const trechoPasso0 = sql.slice(idxPasso0, idxPasso1);
  assert.match(trechoPasso0, /user_id is null and etapa in \('lead_morno', 'aura_agend'\)/, "falta checagem de cliente com user_id nulo e etapa antiga");
  assert.match(trechoPasso0, /c\.user_id is null/, "falta checagem de cliente com user_id nulo e projeto em etapa antiga");
  assert.match(trechoPasso0, /user_id is null and slug in \('lead', 'lead_morno', 'aura_agend'\)/, "falta checagem de pipeline_etapas afetada com user_id nulo");
  assert.match(trechoPasso0, /raise exception 'Abortando ANTES de qualquer alteração.*user_id NULO/, "falta o RAISE EXCEPTION que aborta antes de qualquer alteração quando há user_id nulo");
});

test("pós-condições globais (PASSO 3): confere clientes, projetos[], pipeline_etapas e label 'lead' em TODO o banco, não só nos tenants processados", () => {
  const idxPasso3 = sql.indexOf("PASSO 3");
  assert.ok(idxPasso3 !== -1, "PASSO 3 (pós-condições globais) não encontrado");
  const trechoPasso3 = sql.slice(idxPasso3);

  // as 4 consultas globais não podem estar filtradas por tenant_id/user_id específico
  assert.match(trechoPasso3, /select count\(\*\) into qtd_residual_clientes_global from clientes where etapa in \('lead_morno', 'aura_agend'\);/);
  assert.match(trechoPasso3, /qtd_residual_projetos_global/);
  assert.match(trechoPasso3, /qtd_residual_pipeline_etapas_global/);
  assert.match(trechoPasso3, /qtd_lead_label_incorreto_global/);

  const qtdExceptionsGlobais = (trechoPasso3.match(/raise exception 'Abortando e desfazendo tudo: pós-condição global falhou/g) || []).length;
  assert.equal(qtdExceptionsGlobais, 4, "esperava exatamente 4 RAISE EXCEPTION de pós-condição global (clientes, projetos, pipeline_etapas, label)");
});

test("idempotência: descoberta vazia encerra com aviso de 'nada a fazer' e RETURN, sem nenhum UPDATE/DELETE antes disso", () => {
  const idxPasso1 = sql.indexOf("PASSO 1");
  const idxRetorno = sql.indexOf("return;", idxPasso1);
  assert.ok(idxRetorno !== -1, "não encontrou o RETURN antecipado quando não há tenants afetados");
  const trechoAntesDoRetorno = sql.slice(0, idxRetorno);
  assert.doesNotMatch(trechoAntesDoRetorno, /\bupdate\s+clientes\b/i, "não pode haver UPDATE em clientes antes da checagem de 'nada a fazer'");
  assert.doesNotMatch(trechoAntesDoRetorno, /\bdelete\s+from\s+pipeline_etapas\b/i, "não pode haver DELETE em pipeline_etapas antes da checagem de 'nada a fazer'");
  assert.match(sql.slice(idxPasso1, idxRetorno + 10), /nada a fazer/);
});

test("segunda execução não altera outros dados: UPDATE de pipeline_etapas.label só roda quando o label já não é o esperado (idempotente por construção)", () => {
  assert.match(
    sql,
    /update pipeline_etapas\s+set label = 'Clientes interessados'\s+where user_id = tenant_id and slug = 'lead' and label is distinct from 'Clientes interessados';/,
    "o UPDATE de label deveria ter 'and label is distinct from' pra não reescrever a linha à toa numa segunda execução"
  );
});

test("nenhum user_id fixo (nenhum UUID literal) está hardcoded no script -- a descoberta de tenants é sempre dinâmica", () => {
  const REGEX_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  assert.doesNotMatch(sql, REGEX_UUID, "encontrado um UUID literal no script -- a lista de tenants afetados deve ser sempre descoberta em tempo de execução, nunca fixada");
});

test("afirmação de preservação de dado usa 'semanticamente', não afirma preservação byte a byte como fato (JSONB não garante representação textual idêntica)", () => {
  // A única ocorrência aceitável de "byte a byte" é a própria correção
  // explicando que NÃO é esse o caso -- nunca uma afirmação positiva de que
  // a preservação É byte a byte.
  assert.doesNotMatch(sql, /preservad[oa]s?\s+byte a byte/i, "não pode afirmar preservação byte a byte como fato -- JSONB não garante representação textual idêntica");
  assert.match(sql, /Não\s+"byte a byte"/, "esperava a correção explícita dizendo que NÃO é byte a byte");
  assert.match(sql, /SEMANTICAMENTE/);
});

test("script não é referenciado por nenhum caminho de EXECUÇÃO automática em api/, lib/ ou src/ (só comentários explicativos são aceitáveis, nunca import/require/leitura real do arquivo)", () => {
  const raizRepo = path.join(__dirname, "..");
  const nomeArquivo = "2026-08-14_pipeline_unificar_clientes_interessados.sql";
  const diretoriosParaVarrer = ["api", "lib", "src"];
  const ocorrenciasOperacionais = [];

  for (const dirRelativo of diretoriosParaVarrer) {
    const dirAbsoluto = path.join(raizRepo, dirRelativo);
    let entradas;
    try {
      entradas = readdirSync(dirAbsoluto, { recursive: true, withFileTypes: true });
    } catch {
      continue;
    }
    for (const entrada of entradas) {
      if (!entrada.isFile()) continue;
      if (!/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entrada.name)) continue;
      const caminhoCompleto = path.join(entrada.parentPath ?? entrada.path, entrada.name);
      const conteudo = readFileSync(caminhoCompleto, "utf8");
      const linhasComReferencia = conteudo.split("\n").filter((l) => l.includes(nomeArquivo));
      for (const linha of linhasComReferencia) {
        const ehComentario = linha.trim().startsWith("//") || linha.trim().startsWith("*") || linha.trim().startsWith("/*");
        if (!ehComentario) ocorrenciasOperacionais.push(`${caminhoCompleto}: ${linha.trim()}`);
      }
    }
  }

  assert.deepEqual(ocorrenciasOperacionais, [], `o SQL não pode ser executado/lido automaticamente por código, mas achou referência fora de comentário em: ${ocorrenciasOperacionais.join(" | ")}`);
});
