// sql/2026-08-15_auditoria_pre_migration_clientes_interessados.test.js
//
// Auditoria de leitura imediatamente anterior à migration principal -- não
// há Postgres disponível neste ambiente de testes e a sessão não tem
// autorização pra acessar o banco, e não a acessa. Por isso estes são
// testes ESTRUTURAIS: leem o .sql como texto e provam, por padrão de
// texto, que as quatro correções da revisão de 2026-08-15 estão presentes
// e que o arquivo continua estritamente de leitura.
//
// Rodar com: node --test sql/2026-08-15_auditoria_pre_migration_clientes_interessados.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_SQL = path.join(__dirname, "2026-08-15_auditoria_pre_migration_clientes_interessados.sql");
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
});

test("não executa nem referencia a migration principal nem o SQL de limpeza do órfão fora de comentário", () => {
  const codigoAtivo = codigoSemComentarios(sql);
  assert.doesNotMatch(codigoAtivo, /2026-08-14_pipeline_unificar_clientes_interessados/);
  assert.doesNotMatch(codigoAtivo, /2026-08-15_limpar_tenant_demo_orfao/);
});

test("correção 1 (NULL): 'c.etapa is null' é o primeiro ramo de um OR no nível mais externo da Parte 9, nunca atrás de um AND com NOT IN", () => {
  const idxParte9 = sql.indexOf("PARTE 9");
  assert.ok(idxParte9 !== -1, "Parte 9 não encontrada");
  const trechoParte9 = sql.slice(idxParte9, idxParte9 + 1200);
  assert.match(
    trechoParte9,
    /where c\.user_id = uuid_laboratorio\s*\n\s*and \(\s*\n\s*c\.etapa is null\s*\n\s*or \(/,
    "c.etapa is null precisa ser o primeiro ramo do OR mais externo, logo após o AND de user_id -- não atrás de um NOT IN"
  );
});

test("correção 1 (autoverificação): existe uma contagem independente de etapa nula, calculada sem NOT IN por perto, e uma comparação que aborta se divergir da Parte 9", () => {
  assert.match(sql, /select count\(\*\) into qtd_etapa_nula_independente\s*\n\s*from public\.clientes where user_id = uuid_laboratorio and etapa is null;/);
  assert.match(sql, /if qtd_etapa_nula_independente <> qtd_etapa_nula_na_parte9 then\s*\n\s*raise exception 'AUTOVERIFICAÇÃO FALHOU/);
});

test("correção 2 (views): a descoberta dinâmica da Parte 2 filtra table_type = 'BASE TABLE', excluindo views", () => {
  const idxParte2 = sql.indexOf("PARTE 2");
  const idxParte3 = sql.indexOf("PARTE 3", idxParte2);
  const trechoParte2 = sql.slice(idxParte2, idxParte3);
  assert.match(trechoParte2, /information_schema\.tables/);
  assert.match(trechoParte2, /t\.table_type = 'BASE TABLE'/);
});

test("correção 3 (projetos não-array): jsonb_array_elements só roda depois de confirmar jsonb_typeof(...) = 'array', e há contagem separada de clientes com projetos inválido", () => {
  const idxParte6 = sql.indexOf("PARTE 6");
  const idxParte7 = sql.indexOf("PARTE 7", idxParte6);
  const trechoParte6 = sql.slice(idxParte6, idxParte7);
  assert.match(trechoParte6, /qtd_projetos_nao_array/);
  assert.match(trechoParte6, /jsonb_typeof\(projetos\) <> 'array'/);
  assert.match(trechoParte6, /and jsonb_typeof\(c\.projetos\) = 'array'/, "jsonb_array_elements precisa ser protegido por jsonb_typeof = 'array' antes de rodar");
});

test("correção 4 (silêncio vs. zero): Partes 8 e 9 sempre imprimem um total explícito, mesmo quando zero", () => {
  const idxParte8 = sql.indexOf("PARTE 8");
  const idxParte9 = sql.indexOf("PARTE 9");
  const trechoParte8 = sql.slice(idxParte8, idxParte9);
  assert.match(trechoParte8, /raise notice '  Total de duplicidades encontradas: %/, "Parte 8 precisa imprimir o total mesmo quando zero");

  const idxParte10 = sql.indexOf("PARTE 10");
  const trechoParte9 = sql.slice(idxParte9, idxParte10);
  assert.match(trechoParte9, /raise notice '  Total com etapa nula: % \| Total com etapa desconhecida: %/, "Parte 9 precisa imprimir o total mesmo quando zero");
});

test("cabeçalho documenta que o arquivo é manual e não é executado por deploy, build, Vercel ou aplicação", () => {
  assert.match(sql, /ESTE ARQUIVO É MANUAL/);
  assert.match(sql, /Não é executado por deploy, build, Vercel/);
});

test("script não é referenciado por nenhum caminho de EXECUÇÃO automática em api/, lib/ ou src/ (só comentários explicativos são aceitáveis)", () => {
  const raizRepo = path.join(__dirname, "..");
  const nomeArquivo = "2026-08-15_auditoria_pre_migration_clientes_interessados.sql";
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
