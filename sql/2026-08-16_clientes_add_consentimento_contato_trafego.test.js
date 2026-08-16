// sql/2026-08-16_clientes_add_consentimento_contato_trafego.test.js
//
// Bloco 3.1 -- Reconstrução da Captação do Site. Este arquivo SQL roda
// transacionalmente dentro do Supabase (PL/pgSQL) -- não há Postgres
// disponível neste ambiente de testes e a sessão não tem autorização pra
// acessar o banco, e não a acessa. Por isso estes são testes ESTRUTURAIS:
// leem o .sql como texto e provam, por padrão de texto, que as proteções
// exigidas estão presentes -- mesmo padrão já usado nas migrations
// anteriores deste projeto.
//
// Rodar com: node --test sql/2026-08-16_clientes_add_consentimento_contato_trafego.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_SQL = path.join(__dirname, "2026-08-16_clientes_add_consentimento_contato_trafego.sql");
const sql = readFileSync(CAMINHO_SQL, "utf8");

function codigoSemComentarios(texto) {
  return texto
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n");
}

test("presença das duas colunas: consentimento_contato e trafego, ambas jsonb", () => {
  assert.match(sql, /alter table public\.clientes add column consentimento_contato jsonb;/);
  assert.match(sql, /alter table public\.clientes add column trafego jsonb;/);
});

test("verifica no catálogo (information_schema.columns) antes de cada ADD COLUMN, para as duas colunas", () => {
  const ocorrencias = (sql.match(/from information_schema\.columns\s*\n\s*where table_schema = 'public' and table_name = 'clientes' and column_name = '(consentimento_contato|trafego)'/g) || []).length;
  assert.equal(ocorrencias, 2, "esperava exatamente 2 consultas ao catálogo (uma por coluna)");
});

test("verificação de tipo quando a coluna já existe: aborta com RAISE EXCEPTION se o tipo não for jsonb, para as duas colunas", () => {
  const qtdVerificacoes = (sql.match(/elsif v_tipo_atual <> 'jsonb' then/g) || []).length;
  assert.equal(qtdVerificacoes, 2, "esperava exatamente 2 checagens de tipo divergente (uma por coluna)");
  const qtdExcecoes = (sql.match(/raise exception 'Abortando: clientes\.(consentimento_contato|trafego) já existe com tipo/g) || []).length;
  assert.equal(qtdExcecoes, 2, "esperava exatamente 2 RAISE EXCEPTION de tipo divergente");
});

test("idempotência: se a coluna já existe com tipo jsonb, só avisa e não tenta recriar", () => {
  const qtdRamoIdempotente = (sql.match(/já existe com tipo jsonb -- nada a fazer \(execução idempotente\)\./g) || []).length;
  assert.equal(qtdRamoIdempotente, 2, "esperava exatamente 2 ramos de 'já existe, nada a fazer' (um por coluna)");
});

test("nenhum ADD COLUMN incondicional -- cada um está dentro do ramo 'if v_tipo_atual is null'", () => {
  // Cada ADD COLUMN precisa vir logo depois de um "if v_tipo_atual is null then"
  const trechoConsentimento = sql.slice(sql.indexOf("consentimento_contato ──"), sql.indexOf("trafego ──"));
  assert.match(trechoConsentimento, /if v_tipo_atual is null then\s*\n\s*alter table public\.clientes add column consentimento_contato jsonb;/);

  const trechoTrafego = sql.slice(sql.indexOf("trafego ──"));
  assert.match(trechoTrafego, /if v_tipo_atual is null then\s*\n\s*alter table public\.clientes add column trafego jsonb;/);
});

test("não define NOT NULL nem valor padrão (DEFAULT) para nenhuma das duas colunas", () => {
  const codigoAtivo = codigoSemComentarios(sql);
  assert.doesNotMatch(codigoAtivo, /not null/i);
  assert.doesNotMatch(codigoAtivo, /\bdefault\b/i);
});

test("não contém nenhum comando de escrita em dados (INSERT/UPDATE/DELETE) nem DROP/TRUNCATE/CREATE fora de comentário", () => {
  const codigoAtivo = codigoSemComentarios(sql);
  const REGEX_ESCRITA_DADOS = /\b(insert\s+into|update\s+public\.clientes\s+set|delete\s+from)\b/i;
  assert.doesNotMatch(codigoAtivo, REGEX_ESCRITA_DADOS, "não pode haver escrita de dados -- só DDL (ALTER TABLE ADD COLUMN)");
  assert.doesNotMatch(codigoAtivo, /\bdrop\b/i, "não pode haver DROP");
  assert.doesNotMatch(codigoAtivo, /\btruncate\b/i, "não pode haver TRUNCATE");
  assert.doesNotMatch(codigoAtivo, /\bcreate\s+(table|function|or\s+replace\s+function)\b/i, "não pode criar tabela nem função neste arquivo");
});

test("não cria a função resolver_solicitacao_lead nem qualquer outra função (fica pro Bloco 3.2) -- o nome só pode aparecer em comentário explicando que NÃO foi criada aqui", () => {
  const codigoAtivo = codigoSemComentarios(sql);
  assert.doesNotMatch(codigoAtivo, /resolver_solicitacao_lead/, "não pode haver código ativo (fora de comentário) mencionando essa função");
  assert.doesNotMatch(codigoAtivo, /marcar_email_solicitacao_enviado/);
  assert.doesNotMatch(codigoAtivo, /\bcreate\s+or\s+replace\s+function\b/i, "não pode haver criação de função neste arquivo");
  assert.doesNotMatch(codigoAtivo, /\blanguage\s+plpgsql\b/i, "não deveria haver definição de função (só o bloco do $$ ... $$ anônimo, que não conta como função nomeada)");
});

test("cabeçalho documenta que o arquivo é manual e não é executado por deploy, build, Vercel ou aplicação", () => {
  assert.match(sql, /ESTE ARQUIVO É MANUAL/);
  assert.match(sql, /Não é executado por deploy, build, Vercel/);
});

test("cabeçalho confirma explicitamente que nenhum cliente antigo é preenchido e que nenhuma função RPC é criada", () => {
  assert.match(sql, /não preenche nenhum valor pra clientes já existentes/);
  assert.match(sql, /Não cria\s*\n--\s*a função resolver_solicitacao_lead/);
});

test("script não é referenciado por nenhum caminho de EXECUÇÃO automática em api/, lib/ ou src/ (só comentários explicativos são aceitáveis)", () => {
  const raizRepo = path.join(__dirname, "..");
  const nomeArquivo = "2026-08-16_clientes_add_consentimento_contato_trafego.sql";
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

test("nenhum acesso ao Supabase é feito por este teste -- estritamente leitura de texto local", () => {
  // Autoverificação estrutural: confirma que este próprio arquivo de teste
  // não importa nenhum cliente Supabase nem faz nenhuma chamada de rede.
  const esteArquivo = readFileSync(new URL(import.meta.url), "utf8");
  assert.doesNotMatch(esteArquivo, /@supabase\/supabase-js/);
  assert.doesNotMatch(esteArquivo, /createClient\(/);
  assert.doesNotMatch(esteArquivo, /\bfetch\(/);
});
