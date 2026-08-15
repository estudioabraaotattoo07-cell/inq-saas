// sql/2026-08-15_limpar_tenant_demo_orfao.test.js
//
// Auditoria de leitura pré-migration do Bloco de Unificação de Clientes
// Interessados (2026-08-15) encontrou um tenant órfão de demonstração
// antiga. Este arquivo roda transacionalmente dentro do Supabase
// (PL/pgSQL) -- não há Postgres disponível neste ambiente de testes e a
// sessão não tem autorização pra acessar o banco, e não a acessa. Por isso
// estes são testes ESTRUTURAIS: leem o .sql como texto e conferem, por
// padrão de texto, que as proteções exigidas estão presentes -- mesmo
// padrão já usado em
// sql/2026-08-14_pipeline_unificar_clientes_interessados.test.js. Não
// substituem uma execução real (que só pode acontecer manualmente, no SQL
// Editor do Supabase, depois de aprovação separada desta auditoria).
//
// Rodar com: node --test sql/2026-08-15_limpar_tenant_demo_orfao.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_SQL = path.join(__dirname, "2026-08-15_limpar_tenant_demo_orfao.sql");
const sql = readFileSync(CAMINHO_SQL, "utf8");

const UUID_ORFAO = "72c51303-842b-4656-86a3-29d9fd52ad62";
const UUID_LABORATORIO = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

test("UUID alvo é exatamente o órfão informado, fixado como literal constante", () => {
  assert.match(sql, new RegExp(`uuid_alvo constant uuid := '${UUID_ORFAO}'`));
});

test("Laboratório P&D é bloqueado explicitamente: comparação direta entre uuid_alvo e uuid_laboratorio, com RAISE EXCEPTION se forem iguais", () => {
  assert.match(sql, new RegExp(`uuid_laboratorio constant uuid := '${UUID_LABORATORIO}'`));
  assert.match(sql, /if uuid_alvo = uuid_laboratorio then\s*\n\s*raise exception/);
});

test("UUID do Laboratório nunca aparece como alvo de nenhum DELETE (só na trava de segurança e na nota final)", () => {
  const linhasComLab = sql.split("\n").filter((l) => l.includes(UUID_LABORATORIO) || l.includes("uuid_laboratorio"));
  for (const linha of linhasComLab) {
    assert.doesNotMatch(linha, /delete\s+from/i, `linha inesperada combinando DELETE com referência ao Laboratório: ${linha.trim()}`);
  }
});

test("descoberta de tabelas afetadas é DINÂMICA via information_schema.columns (coluna user_id), não uma lista fixa escrita à mão", () => {
  const ocorrencias = (sql.match(/information_schema\.columns[\s\S]{0,120}?column_name = 'user_id'/g) || []).length;
  assert.ok(ocorrencias >= 2, `esperava pelo menos 2 usos do loop dinâmico por information_schema.columns (inventário + pós-condição), achou ${ocorrencias}`);
});

test("auth.users é conferido por id, e ink_clientes é conferido por auth_user_id (não user_id) -- aborta se encontrar qualquer linha", () => {
  assert.match(sql, /from auth\.users where id = uuid_alvo/);
  assert.match(sql, /from public\.ink_clientes where auth_user_id = uuid_alvo/);
  assert.match(sql, /qtd_auth_users > 0 then\s*\n\s*raise exception/);
  assert.match(sql, /qtd_ink_clientes > 0 then\s*\n\s*raise exception/);
});

test("quantidades exatas conhecidas (7 clientes, 2 artistas, 1 configuração) são conferidas com RAISE EXCEPTION em qualquer divergência", () => {
  assert.match(sql, /qtd_clientes <> 7 then\s*\n\s*raise exception/);
  assert.match(sql, /qtd_artistas <> 2 then\s*\n\s*raise exception/);
  assert.match(sql, /qtd_configuracoes <> 1 then\s*\n\s*raise exception/);
});

test("identidade dos 7 clientes é conferida por CONJUNTO EXATO de nomes (EXCEPT nos dois sentidos), não só pela contagem", () => {
  const NOMES = ["Bruno Kern", "Hugo Martins", "Marina Alves", "Priscila Gomes", "Renan Costa", "Talita Nunes", "Yasmin Duarte"];
  for (const nome of NOMES) {
    assert.ok(sql.includes(`'${nome}'`), `nome esperado ausente do array nomes_esperados: ${nome}`);
  }
  const qtdExcept = (sql.match(/\bexcept\b/gi) || []).length;
  assert.ok(qtdExcept >= 2, "esperava pelo menos 2 EXCEPT (nomes inesperados + nomes faltando)");
  assert.match(sql, /qtd_nomes_inesperados > 0 then\s*\n\s*raise exception/);
  assert.match(sql, /qtd_nomes_faltando > 0 then\s*\n\s*raise exception/);
});

test("IDs e nomes dos clientes/artistas/configuração são reportados via RAISE NOTICE antes da exclusão (auditoria por identidade, não só quantidade)", () => {
  assert.match(sql, /raise notice\s+'  cliente id=% nome=%'/);
  assert.match(sql, /raise notice\s+'  artista id=% nome=%'/);
  assert.match(sql, /raise notice\s+'  configuracao id=% studio_name=%'/);
});

test("chaves estrangeiras que referenciam clientes/artistas/configuracoes são descobertas dinamicamente (information_schema.table_constraints) e checadas antes da exclusão", () => {
  assert.match(sql, /information_schema\.table_constraints/);
  assert.match(sql, /constraint_type = 'FOREIGN KEY'/);
  assert.match(sql, /ccu\.table_name in \('clientes', 'artistas', 'configuracoes'\)/);
  assert.match(sql, /qtd_dependentes > 0 then\s*\n\s*raise exception/);
});

test("ordem de exclusão é clientes -> artistas -> configuracoes (clientes primeiro, por poder referenciar artistas)", () => {
  const idxClientes = sql.search(/delete from public\.clientes where user_id = uuid_alvo;/);
  const idxArtistas = sql.search(/delete from public\.artistas where user_id = uuid_alvo;/);
  const idxConfig = sql.search(/delete from public\.configuracoes where user_id = uuid_alvo;/);
  assert.ok(idxClientes !== -1 && idxArtistas !== -1 && idxConfig !== -1, "algum dos 3 DELETE esperados não foi encontrado");
  assert.ok(idxClientes < idxArtistas, "clientes precisa ser apagado antes de artistas");
  assert.ok(idxArtistas < idxConfig, "artistas precisa ser apagado antes de configuracoes");
});

test("todo DELETE é filtrado por user_id = uuid_alvo -- nenhuma exclusão ampla sem filtro de tenant", () => {
  const deletes = sql.match(/delete from public\.\w+[^;]*;/g) || [];
  assert.ok(deletes.length >= 3, "esperava pelo menos 3 comandos DELETE");
  for (const del of deletes) {
    assert.match(del, /where user_id = uuid_alvo/, `DELETE sem filtro explícito por user_id = uuid_alvo: ${del}`);
  }
});

test("quantidade removida de cada tabela é conferida via GET DIAGNOSTICS logo após cada DELETE, com RAISE EXCEPTION em divergência", () => {
  const qtdDiagnostics = (sql.match(/get diagnostics qtd_removida = row_count;/g) || []).length;
  assert.equal(qtdDiagnostics, 3, "esperava exatamente 3 usos de GET DIAGNOSTICS (um por DELETE)");
  assert.match(sql, /qtd_removida <> 7 then/);
  assert.match(sql, /qtd_removida <> 2 then/);
  assert.match(sql, /qtd_removida <> 1 then/);
});

test("pós-condição global (depois da exclusão) reconfirma 0 linhas em toda tabela com user_id, abortando e desfazendo tudo se sobrar algo", () => {
  const idxDeleteFinal = sql.search(/delete from public\.configuracoes where user_id = uuid_alvo;/);
  const trechoPos = sql.slice(idxDeleteFinal);
  assert.match(trechoPos, /qtd_residual_pos > 0 then\s*\n\s*raise exception/);
});

test("idempotência: se todas as tabelas já estiverem em 0 para este UUID, script encerra com RAISE NOTICE e RETURN, sem tentar nenhum DELETE", () => {
  const idxJaLimpo = sql.search(/if ja_limpo then/);
  const idxPrimeiroDelete = sql.search(/delete from public\.clientes where user_id = uuid_alvo;/);
  assert.ok(idxJaLimpo !== -1 && idxPrimeiroDelete !== -1 && idxJaLimpo < idxPrimeiroDelete, "checagem de idempotência (ja_limpo) precisa vir antes do primeiro DELETE");
  const trechoIdempotencia = sql.slice(idxJaLimpo, idxJaLimpo + 400);
  assert.match(trechoIdempotencia, /return;/);
  assert.match(trechoIdempotencia, /nada a fazer/i);
});

test("estado intermediário (nem tudo esperado, nem tudo zerado) não é silenciosamente aceito -- só os dois casos exatos (7/2/1 ou 0/0/0) são tratados; qualquer outro aborta via as checagens de quantidade exata", () => {
  // Já coberto por "quantidades exatas conhecidas" acima -- este teste reforça
  // que NÃO existe um caminho de código que "complete" uma limpeza parcial
  // (ex.: nenhuma lógica tipo "se já tem menos de 7, insere os que faltam").
  assert.doesNotMatch(sql, /insert into public\.(clientes|artistas|configuracoes)/i);
});

test("cabeçalho documenta que o arquivo é manual e não é executado por deploy, build, Vercel ou aplicação", () => {
  assert.match(sql, /ESTE ARQUIVO É MANUAL/);
  assert.match(sql, /Não é executado por deploy, build, Vercel/);
});

test("script é um arquivo separado da migration principal -- nenhum dos dois se referencia via execução", () => {
  assert.doesNotMatch(sql, /\\i\s|EXECUTE\s+'.*2026-08-14_pipeline/i);
  assert.doesNotMatch(sql, /2026-08-14_pipeline_unificar_clientes_interessados\.sql['"]?\s*;?\s*$/m);
});

test("script não é referenciado por nenhum caminho de EXECUÇÃO automática em api/, lib/ ou src/ (só comentários explicativos são aceitáveis)", () => {
  const raizRepo = path.join(__dirname, "..");
  const nomeArquivo = "2026-08-15_limpar_tenant_demo_orfao.sql";
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

test("nenhum UUID de tenant real além do órfão e do Laboratório (usado só na trava) aparece hardcoded no script", () => {
  const REGEX_UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const encontrados = new Set((sql.match(REGEX_UUID) || []).map((u) => u.toLowerCase()));
  encontrados.delete(UUID_ORFAO);
  encontrados.delete(UUID_LABORATORIO);
  assert.deepEqual([...encontrados], [], `UUID(s) inesperado(s) hardcoded no script: ${[...encontrados].join(", ")}`);
});
