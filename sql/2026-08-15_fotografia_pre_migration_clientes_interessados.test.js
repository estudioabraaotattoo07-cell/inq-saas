// sql/2026-08-15_fotografia_pre_migration_clientes_interessados.test.js
//
// Este arquivo SQL gera uma fotografia exportável do estado anterior à
// migration principal -- não há Postgres disponível neste ambiente de
// testes e a sessão não tem autorização pra acessar o banco, e não a
// acessa. Por isso estes são testes ESTRUTURAIS: leem o .sql como texto e
// provam, por padrão de texto, que o arquivo (a) não contém nenhum comando
// de escrita, (b) não executa a migration principal nem o SQL de limpeza,
// e (c) é feito só de SELECT puros -- requisito pra poder ser exportado
// pelo SQL Editor do Supabase (blocos "do $$ ... end $$" com RAISE NOTICE,
// como o arquivo de auditoria irmão, não geram resultado exportável).
//
// Rodar com: node --test sql/2026-08-15_fotografia_pre_migration_clientes_interessados.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_SQL = path.join(__dirname, "2026-08-15_fotografia_pre_migration_clientes_interessados.sql");
const sql = readFileSync(CAMINHO_SQL, "utf8");

function codigoSemComentarios(texto) {
  return texto
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
}

test("não contém nenhum comando de escrita (INSERT/UPDATE/DELETE/ALTER/DROP/TRUNCATE/CREATE) fora de comentário", () => {
  const codigoAtivo = codigoSemComentarios(sql);
  const REGEX_ESCRITA = /\b(insert\s+into|update\s+\w|delete\s+from|alter\s+table|drop\s+table|drop\s+database|truncate)\b/i;
  assert.doesNotMatch(codigoAtivo, REGEX_ESCRITA, "encontrado comando de escrita em código ativo -- este arquivo precisa ser estritamente de leitura");
  // "create" isolado também não pode aparecer em código ativo (nem CREATE
  // EXTENSION, nem CREATE TABLE) -- este arquivo não deve depender de nem
  // criar nenhum objeto no banco.
  assert.doesNotMatch(codigoAtivo, /\bcreate\b/i, "encontrado 'create' em código ativo -- este arquivo não deve criar nenhum objeto no banco");
});

test("todo statement de código ativo é um SELECT -- nenhum DO block, nenhuma chamada mutável", () => {
  const codigoAtivo = codigoSemComentarios(sql);
  // Remove linhas vazias, agrupa em statements terminados por ';' e confere
  // que cada um começa com "select" (ignorando espaços).
  const statements = codigoAtivo
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  assert.ok(statements.length >= 4, `esperava pelo menos 4 statements (consultas 1-4), achou ${statements.length}`);
  for (const stmt of statements) {
    assert.match(stmt.toLowerCase(), /^select\b/, `statement não começa com SELECT: ${stmt.slice(0, 60)}...`);
  }
  assert.doesNotMatch(codigoAtivo, /\bdo\s+\$/i, "não pode haver bloco 'do $$ ... $$' neste arquivo -- resultado de DO block não é exportável no SQL Editor");
});

test("usa md5() (função nativa do núcleo do PostgreSQL) para o hash de integridade -- nunca digest()/pgcrypto como código ativo (extensão não confirmada)", () => {
  const codigoAtivo = codigoSemComentarios(sql);
  assert.match(sql, /\bmd5\(/);
  assert.doesNotMatch(codigoAtivo, /\bdigest\(/i, "digest() só pode aparecer em comentário explicando por que NÃO foi usado, nunca em código ativo");
  assert.doesNotMatch(codigoAtivo, /pgcrypto/i, "pgcrypto só pode aparecer em comentário, nunca em código ativo (create extension, etc.)");
});

test("as 3 etapas relevantes (lead, lead_morno, aura_agend) e os campos essenciais (projetos, etapa_desde) aparecem nas consultas", () => {
  assert.match(sql, /'lead_morno'/);
  assert.match(sql, /'aura_agend'/);
  assert.match(sql, /slug in \('lead', 'lead_morno', 'aura_agend'\)/);
  assert.match(sql, /\bprojetos\b/);
  assert.match(sql, /jsonb_typeof/);
});

test("não referencia nem executa a migration principal nem o SQL de limpeza do órfão -- só os menciona em comentário", () => {
  const codigoAtivo = codigoSemComentarios(sql);
  assert.doesNotMatch(codigoAtivo, /2026-08-14_pipeline_unificar_clientes_interessados/);
  assert.doesNotMatch(codigoAtivo, /2026-08-15_limpar_tenant_demo_orfao/);
});

test("script não é referenciado por nenhum caminho de EXECUÇÃO automática em api/, lib/ ou src/ (só comentários explicativos são aceitáveis)", () => {
  const raizRepo = path.join(__dirname, "..");
  const nomeArquivo = "2026-08-15_fotografia_pre_migration_clientes_interessados.sql";
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
