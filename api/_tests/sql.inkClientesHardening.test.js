// api/_tests/sql.inkClientesHardening.test.js
//
// Teste ESTRUTURAL do Bloco Corretivo de Segurança de public.ink_clientes
// (Fase 2, inq-saas).
//
// LIMITAÇÃO HONESTA, DECLARADA DE PROPÓSITO (mesmo padrão de toda migration
// desta engenharia): não existe Postgres real disponível neste ambiente --
// este arquivo NÃO PROVA que a migration executa sem erro num banco real,
// nem que aclexplode/attacl se comportam exatamente como o texto presume
// nesta versão específica do Supabase. Isso só a homologação manual
// confirma. O que ESTE arquivo prova, com confiança: que o texto da
// migration contém exatamente as peças estruturais e decisões já
// auditadas e aprovadas -- pré-voo por catálogo real (relacl/attacl, não
// information_schema), os dois estados exatos reconhecidos, os grants por
// coluna exatos, as 2 policies finais exatas, pós-voo completo, transação
// íntegra, zero DML de negócio, zero segredo real.
//
// Rodar com: node --test api/_tests/sql.inkClientesHardening.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRATION = path.join(__dirname, "..", "..", "sql", "2026-08-20_ink_clientes_hardening_colunas.sql");
const sql = readFileSync(CAMINHO_MIGRATION, "utf8");

const COLUNAS_SELECT = [
  "id", "auth_user_id", "slug", "plano", "status", "nome_estudio",
  "storage_usado_mb", "storage_extra_mb", "sms_credito_extra",
  "email_credito_extra", "data_vencimento",
];

function contemTrecho(agulha) {
  const normalizado = sql.replace(/\s+/g, " ");
  const agulhaNormalizada = agulha.replace(/\s+/g, " ");
  return normalizado.includes(agulhaNormalizada);
}

function apenasCodigo(texto) {
  return texto
    .split("\n")
    .map((linha) => linha.replace(/--.*$/, ""))
    .join("\n");
}

function blocoDo(marcador) {
  const abertura = `$${marcador}$`;
  const fechamento = `end $${marcador}$;`;
  const inicio = sql.indexOf(abertura);
  assert.ok(inicio > -1, `bloco DO $${marcador}$ não encontrado na migration`);
  const fim = sql.indexOf(fechamento, inicio);
  assert.ok(fim > -1, `fechamento do bloco DO $${marcador}$ não encontrado`);
  return sql.slice(inicio, fim + fechamento.length);
}

// Posição da instrução COMMIT; REAL (linha própria, só "COMMIT;", sem mais
// nada) -- nunca usar sql.indexOf("COMMIT;") puro, que combina com menções
// a "COMMIT;" dentro de frases nos comentários do cabeçalho (ex.: "...
// DROP POLICY/CREATE POLICY; COMMIT; só depois de toda verificação..."),
// bem antes da instrução real.
function posRealCommit() {
  const m = /^\s*COMMIT;\s*$/m.exec(sql);
  assert.ok(m, "instrução COMMIT; real (linha própria) não encontrada");
  return m.index;
}

// Trecho comentado após o COMMIT real -- roteiro de verificação
// pós-execução e homologação funcional, nunca executado automaticamente.
function blocoPosCommit() {
  return sql.slice(posRealCommit());
}

test("arquivo de migration existe e não está vazio", () => {
  assert.ok(sql.length > 1000, "migration deveria ter conteúdo substancial");
});

// ── Transação integral ────────────────────────────────────────────────────
test("existe exatamente 1 BEGIN; e 1 COMMIT; transacionais, BEGIN antes de qualquer REVOKE/GRANT/DROP POLICY, COMMIT depois de todo pós-voo", () => {
  const codigo = apenasCodigo(sql);
  const begins = codigo.match(/^\s*BEGIN;\s*$/gm) || [];
  const commits = codigo.match(/^\s*COMMIT;\s*$/gm) || [];
  assert.equal(begins.length, 1);
  assert.equal(commits.length, 1);

  const posBegin = codigo.search(/^\s*BEGIN;\s*$/m);
  const posPrimeiroRevoke = codigo.search(/\brevoke\b/i);
  const posPrimeiroGrant = codigo.search(/\bgrant\b/i);
  const posPrimeiroDropPolicy = codigo.search(/drop policy/i);
  assert.ok(posBegin < posPrimeiroRevoke);
  assert.ok(posBegin < posPrimeiroGrant);
  assert.ok(posBegin < posPrimeiroDropPolicy);

  const posCommit = codigo.search(/^\s*COMMIT;\s*$/m);
  const posUltimaVerificacao = codigo.lastIndexOf("end $verificar_owner_final_ink_clientes$;");
  assert.ok(posUltimaVerificacao > -1);
  assert.ok(posCommit > posUltimaVerificacao);
});

test("nenhum ROLLBACK, SAVEPOINT ou EXCEPTION WHEN OTHERS em código real (só nos comentários do roteiro de homologação, fora da transação)", () => {
  const antesDoCommit = apenasCodigo(sql.slice(0, posRealCommit()));
  assert.doesNotMatch(antesDoCommit, /\bsavepoint\b/i);
  assert.doesNotMatch(antesDoCommit, /exception\s+when\s+others/i);
  assert.doesNotMatch(antesDoCommit, /\brollback\b/i);
});

// ── Pré-voo ────────────────────────────────────────────────────────────────
test("pré-voo cobre tabela, colunas, relacl e attacl reais, e policies -- todos antes de qualquer REVOKE/GRANT/DROP POLICY", () => {
  const marcadores = [
    "prevoo_tabela_ink_clientes",
    "prevoo_colunas_ink_clientes",
    "prevoo_relacl_ink_clientes",
    "prevoo_attacl_ink_clientes",
    "prevoo_policies_ink_clientes",
  ];
  // Instrução REVOKE real: início de linha, sem "-- " na frente (as
  // menções ao termo dentro do texto do cabeçalho estão todas em linhas de
  // comentário, então não combinam com esta âncora).
  const posPrimeiroRevoke = sql.search(/^revoke\s+all\s+on\s+table/im);
  assert.ok(posPrimeiroRevoke > -1, "instrução REVOKE real não encontrada");
  for (const m of marcadores) {
    const pos = sql.indexOf(m);
    assert.ok(pos > -1, `bloco de pré-voo ${m} não encontrado`);
    assert.ok(pos < posPrimeiroRevoke, `${m} deve vir antes do primeiro REVOKE`);
  }
});

test("pré-voo de relacl usa pg_catalog/aclexplode, não information_schema.column_privileges", () => {
  const bloco = blocoDo("prevoo_relacl_ink_clientes");
  assert.match(bloco, /aclexplode/);
  assert.match(bloco, /pg_class/);
  assert.doesNotMatch(bloco, /information_schema\.column_privileges/);
});

test("pré-voo de relacl compara os 8 privilégios exatos, incluindo MAINTAIN, para os dois estados reconhecidos", () => {
  const bloco = blocoDo("prevoo_relacl_ink_clientes");
  assert.match(bloco, /'DELETE',\s*'INSERT',\s*'MAINTAIN',\s*'REFERENCES',\s*'SELECT',\s*'TRIGGER',\s*'TRUNCATE',\s*'UPDATE'/);
  assert.match(bloco, /v_estado_original\s*:=/);
  assert.match(bloco, /v_estado_final\s*:=/);
  assert.match(bloco, /raise exception 'Abortando \(pré-voo\): relacl de ink_clientes não bate exatamente/);
});

test("estado original de relacl exige anon/authenticated/service_role/postgres com os 8 privilégios e PUBLIC vazio", () => {
  const bloco = blocoDo("prevoo_relacl_ink_clientes");
  const trechoOriginal = bloco.slice(bloco.indexOf("v_estado_original :="), bloco.indexOf("v_estado_final :="));
  assert.match(trechoOriginal, /v_public = array\[\]::text\[\]/);
  assert.match(trechoOriginal, /v_anon = v_privs_8/);
  assert.match(trechoOriginal, /v_authenticated = v_privs_8/);
  assert.match(trechoOriginal, /v_service_role = v_privs_8/);
  assert.match(trechoOriginal, /v_postgres = v_privs_8/);
});

test("estado final de relacl exige PUBLIC/anon/authenticated vazios e só service_role/postgres com os 8 privilégios", () => {
  const bloco = blocoDo("prevoo_relacl_ink_clientes");
  const trechoFinal = bloco.slice(bloco.indexOf("v_estado_final :="));
  assert.match(trechoFinal, /v_public = array\[\]::text\[\]/);
  assert.match(trechoFinal, /v_anon = array\[\]::text\[\]/);
  assert.match(trechoFinal, /v_authenticated = array\[\]::text\[\]/);
  assert.match(trechoFinal, /v_service_role = v_privs_8/);
  assert.match(trechoFinal, /v_postgres = v_privs_8/);
});

// ── CORREÇÃO (auditoria pós-implementação): os arrays por papel só provam
// que os 5 papéis conhecidos têm os privilégios certos -- não provam
// ausência de um sexto papel inesperado nem de entrada concedível. Estas
// contagens sobre TODAS as linhas de aclexplode (sem filtro) fecham essa
// lacuna, como camada adicional, nunca substituindo os arrays. ──────────
test("pré-voo de relacl exige exatamente 32 entradas totais no estado original (4 papéis x 8 privilégios)", () => {
  const bloco = blocoDo("prevoo_relacl_ink_clientes");
  const trechoOriginal = bloco.slice(bloco.indexOf("v_estado_original :="), bloco.indexOf("v_estado_final :="));
  assert.match(trechoOriginal, /v_total_entradas = 32/);
});

test("pré-voo de relacl exige exatamente 16 entradas totais no estado final (postgres + service_role x 8 privilégios)", () => {
  const bloco = blocoDo("prevoo_relacl_ink_clientes");
  const trechoFinal = bloco.slice(bloco.indexOf("v_estado_final :="));
  assert.match(trechoFinal, /v_total_entradas = 16/);
});

test("pré-voo de relacl exige zero entradas concedíveis (is_grantable=true) em ambos os estados", () => {
  const bloco = blocoDo("prevoo_relacl_ink_clientes");
  const ocorrencias = (bloco.match(/v_qtd_concediveis = 0/g) || []).length;
  assert.equal(ocorrencias, 2, "esperado v_qtd_concediveis = 0 nas duas condições (original e final)");
  assert.match(bloco, /count\(\*\) filter \(where a\.is_grantable = true\)/);
});

test("pré-voo de relacl exige zero grantees inesperados (fora de PUBLIC/anon/authenticated/service_role/postgres) em ambos os estados", () => {
  const bloco = blocoDo("prevoo_relacl_ink_clientes");
  const ocorrencias = (bloco.match(/v_qtd_inesperados = 0/g) || []).length;
  assert.equal(ocorrencias, 2, "esperado v_qtd_inesperados = 0 nas duas condições (original e final)");
  assert.match(bloco, /a\.grantee not in \(0, 'anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole, 'postgres'::regrole\)/);
});

test("verificação pós-grant repete a garantia exata de 16 entradas totais, zero concedível, zero grantee inesperado", () => {
  const bloco = blocoDo("verificar_grants_colunares_ink_clientes");
  assert.match(bloco, /v_total_entradas <> 16/);
  assert.match(bloco, /v_qtd_concediveis <> 0/);
  assert.match(bloco, /v_qtd_grantees_inesperados <> 0/);
});

test("pré-voo de attacl reconhece estado original (completamente vazio) e final (exatamente 12 entradas)", () => {
  const bloco = blocoDo("prevoo_attacl_ink_clientes");
  assert.match(bloco, /v_qtd_attacl_nao_nulo = 0/);
  assert.match(bloco, /v_qtd_total_entradas = 12/);
  assert.match(bloco, /v_qtd_select_esperadas = 11/);
  assert.match(bloco, /v_qtd_update_esperada = 1/);
  assert.match(bloco, /v_qtd_inesperadas = 0/);
});

test("pré-voo de policies compara nome+comando+papéis+USING+WITH CHECK exatos das 2 originais (papel public) e das 2 finais (papel authenticated)", () => {
  const bloco = blocoDo("prevoo_policies_ink_clientes");
  assert.match(bloco, /'cliente_ve_proprio_registro', 'SELECT', array\['public'\]::name\[\]/);
  assert.match(bloco, /'cliente_atualiza_proprio_registro', 'UPDATE', array\['public'\]::name\[\]/);
  assert.match(bloco, /'ink_clientes_select_propria', 'SELECT', array\['authenticated'\]::name\[\]/);
  assert.match(bloco, /'ink_clientes_update_propria', 'UPDATE', array\['authenticated'\]::name\[\]/);
});

// ── Revogação e grants por coluna ───────────────────────────────────────────
test("revoke all de PUBLIC, anon e authenticated em nível de tabela, sem mencionar postgres nem service_role", () => {
  assert.ok(contemTrecho("revoke all on table public.ink_clientes from public, anon, authenticated;"));
  const linha = sql.split("\n").find((l) => l.includes("revoke all on table public.ink_clientes"));
  assert.ok(linha, "linha do REVOKE não encontrada");
  assert.doesNotMatch(linha, /\bpostgres\b/);
  assert.doesNotMatch(linha, /\bservice_role\b/);
});

test("grant select por coluna cobre exatamente as 11 colunas esperadas, para authenticated", () => {
  const inicio = sql.indexOf("grant select (");
  assert.ok(inicio > -1, "GRANT SELECT por coluna não encontrado");
  const fim = sql.indexOf(") on public.ink_clientes to authenticated;", inicio);
  const trecho = sql.slice(inicio, fim);
  for (const coluna of COLUNAS_SELECT) {
    assert.match(trecho, new RegExp(`\\b${coluna}\\b`), `coluna ${coluna} ausente do GRANT SELECT`);
  }
  const colunasEncontradas = trecho.match(/\b[a-z_]+\b/g).filter((c) => c !== "grant" && c !== "select");
  assert.equal(colunasEncontradas.length, COLUNAS_SELECT.length, "GRANT SELECT deveria ter exatamente 11 colunas, nem mais nem menos");
});

test("grant update por coluna cobre exclusivamente slug, para authenticated", () => {
  assert.ok(contemTrecho("grant update (slug) on public.ink_clientes to authenticated;"));
  assert.doesNotMatch(apenasCodigo(sql), /grant update \([^)]*,[^)]*\) on public\.ink_clientes/);
});

test("nenhum grant de tabela inteira (sem lista de colunas) para authenticated em nenhum ponto do arquivo", () => {
  const codigo = apenasCodigo(sql);
  assert.doesNotMatch(codigo, /grant\s+select\s+on\s+public\.ink_clientes\s+to\s+authenticated/i);
  assert.doesNotMatch(codigo, /grant\s+update\s+on\s+public\.ink_clientes\s+to\s+authenticated/i);
  assert.doesNotMatch(codigo, /grant\s+all\s+on\s+public\.ink_clientes\s+to\s+authenticated/i);
});

test("verificação ativa pós-grant confirma relacl e attacl exatos (fail-closed), incluindo MAINTAIN preservado para postgres/service_role", () => {
  const bloco = blocoDo("verificar_grants_colunares_ink_clientes");
  assert.match(bloco, /v_service_role <> v_privs_8/);
  assert.match(bloco, /v_postgres <> v_privs_8/);
  assert.match(bloco, /v_qtd_total_attacl <> 12/);
  assert.match(bloco, /v_qtd_select <> 11/);
  assert.match(bloco, /v_qtd_update <> 1/);
});

// ── Policies finais (CORREÇÃO -- auditoria pós-implementação: a remoção
// dinâmica por consulta a pg_policies + EXECUTE format() era fail-open --
// uma policy inesperada seria apagada em vez de abortar a migration.
// Corrigida para 4 DROP POLICY IF EXISTS nomeados e estáticos, apoiados no
// pré-voo já ter garantido que só essas 4 podem existir neste ponto) ──────

test("nenhuma remoção dinâmica de policy em lugar nenhum do arquivo -- sem laço sobre pg_policies para apagar, sem EXECUTE format('drop policy...')", () => {
  const codigo = apenasCodigo(sql);
  assert.doesNotMatch(codigo, /select\s+policyname\s+from\s+pg_policies/i);
  assert.doesNotMatch(codigo, /execute\s+format\(\s*'drop policy/i);
  assert.doesNotMatch(codigo, /drop policy %I/i);
});

test("nenhum laço (for ... in / loop) usado para apagar policy nenhuma no arquivo inteiro", () => {
  const codigo = apenasCodigo(sql);
  // Os únicos "for ... in ... loop" do arquivo pertencem ao pré-voo (leitura,
  // nunca DROP) -- confirma que, olhando cada ocorrência de "loop" no
  // arquivo, nenhuma delas tem um "drop policy" no corpo do laço.
  const blocosComLoop = codigo.match(/loop[\s\S]*?end loop;/gi) || [];
  for (const bloco of blocosComLoop) {
    assert.doesNotMatch(bloco, /drop policy/i, "encontrado DROP POLICY dentro de um laço -- deveria ser só as 4 remoções estáticas nomeadas");
  }
});

test("exatamente 4 DROP POLICY IF EXISTS nomeados e estáticos em public.ink_clientes -- as 2 originais e as 2 finais, cobrindo os dois estados reconhecidos pelo pré-voo", () => {
  const codigo = apenasCodigo(sql);
  const nomes = [
    "cliente_ve_proprio_registro",
    "cliente_atualiza_proprio_registro",
    "ink_clientes_select_propria",
    "ink_clientes_update_propria",
  ];
  for (const nome of nomes) {
    assert.ok(
      contemTrecho(`drop policy if exists ${nome} on public.ink_clientes;`),
      `DROP POLICY IF EXISTS ${nome} não encontrado`
    );
  }
  const totalDrops = (codigo.match(/drop policy if exists/gi) || []).length;
  assert.equal(totalDrops, 4, "esperado exatamente 4 DROP POLICY IF EXISTS no arquivo inteiro, nem mais nem menos");
});

test("os 4 DROP POLICY vêm depois do pré-voo de policies (1e) e antes das 2 CREATE POLICY finais -- nunca antes do pré-voo ter reconhecido o estado exato", () => {
  const codigo = apenasCodigo(sql);
  const posPrevoo = codigo.indexOf("end $prevoo_policies_ink_clientes$;");
  const posPrimeiroDrop = codigo.search(/drop policy if exists/i);
  const posPrimeiroCreate = codigo.search(/create policy/i);
  assert.ok(posPrevoo > -1 && posPrimeiroDrop > -1 && posPrimeiroCreate > -1);
  assert.ok(posPrevoo < posPrimeiroDrop, "os DROP POLICY devem vir depois do pré-voo de policies ter concluído");
  assert.ok(posPrimeiroDrop < posPrimeiroCreate, "os DROP POLICY devem vir antes das CREATE POLICY finais");
});

test("exatamente 2 CREATE POLICY em todo o arquivo -- só as duas finais, nenhuma outra é criada", () => {
  const codigo = apenasCodigo(sql);
  const totalCreates = (codigo.match(/create policy/gi) || []).length;
  assert.equal(totalCreates, 2, "esperado exatamente 2 CREATE POLICY no arquivo inteiro");
  assert.match(codigo, /create policy ink_clientes_select_propria on public\.ink_clientes/i);
  assert.match(codigo, /create policy ink_clientes_update_propria on public\.ink_clientes/i);
});

test("pré-voo de policies (1e) aborta com terceiro estado -- qualquer policy inesperada (quinta policy, papel diferente, expressão diferente) nunca chega às remoções/criações estáticas", () => {
  const bloco = blocoDo("prevoo_policies_ink_clientes");
  // A condição de aceite exige o total de policies (v_qtd) bater com
  // exatamente 2 E todas elas baterem exatamente (originais ou finais) --
  // uma quinta policy muda v_qtd para 3, reprovando as duas condições e
  // caindo no "else raise exception" abaixo, antes de qualquer DROP/CREATE.
  assert.match(bloco, /if v_originais_ok = constant_total and v_qtd = constant_total then/);
  assert.match(bloco, /elsif v_finais_ok = constant_total and v_qtd = constant_total then/);
  assert.match(bloco, /else\s*\n\s*raise exception 'Abortando \(pré-voo\): estado de policies de ink_clientes não bate exatamente/);
  assert.match(bloco, /nenhuma mistura, ausência parcial ou terceira definição é aceita/);
});

test("ink_clientes_select_propria: SELECT, authenticated, USING auth_user_id = auth.uid(), sem WITH CHECK", () => {
  assert.ok(contemTrecho("create policy ink_clientes_select_propria on public.ink_clientes for select to authenticated using (auth_user_id = auth.uid());"));
});

test("ink_clientes_update_propria: UPDATE, authenticated, USING e WITH CHECK explícitos, ambos auth_user_id = auth.uid()", () => {
  assert.ok(contemTrecho("create policy ink_clientes_update_propria on public.ink_clientes for update to authenticated using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());"));
});

test("pós-voo de policies finais compara nome+comando+papel+USING+WITH CHECK exatos das 2 policies, exige exatamente 2 no total", () => {
  const bloco = blocoDo("verificar_policies_final_ink_clientes");
  assert.match(bloco, /v_qtd <> 2/);
  assert.match(bloco, /qual = '\(auth_user_id = auth\.uid\(\)\)' and with_check is null/);
  assert.match(bloco, /qual = '\(auth_user_id = auth\.uid\(\)\)' and with_check = '\(auth_user_id = auth\.uid\(\)\)'/);
});

// ── RLS preservada ───────────────────────────────────────────────────────
test("pós-voo confirma explicitamente que RLS continua habilitada", () => {
  const bloco = blocoDo("verificar_rls_final");
  assert.match(bloco, /relrowsecurity/);
  assert.match(bloco, /if not v_rls then/);
});

// ── MAINTAIN explícito ──────────────────────────────────────────────────
test("pós-voo tem verificação dedicada e explícita de MAINTAIN preservado para postgres e service_role", () => {
  const bloco = blocoDo("verificar_maintain_preservado");
  assert.match(bloco, /a\.privilege_type = 'MAINTAIN'/g);
  assert.match(bloco, /service_role_tem_maintain/);
  assert.match(bloco, /postgres_tem_maintain/);
});

// ── Zero DML de negócio ──────────────────────────────────────────────────
test("nenhum INSERT, UPDATE, DELETE ou TRUNCATE sobre dados em código real (só DDL/DCL e comentários do roteiro de homologação)", () => {
  const antesDoCommit = apenasCodigo(sql.slice(0, posRealCommit()));
  assert.doesNotMatch(antesDoCommit, /^\s*insert\s+into/im);
  assert.doesNotMatch(antesDoCommit, /^\s*update\s+public\.ink_clientes\s+set/im);
  assert.doesNotMatch(antesDoCommit, /^\s*delete\s+from/im);
  assert.doesNotMatch(antesDoCommit, /^\s*truncate\b/im);
});

// ── Segredo/PII ──────────────────────────────────────────────────────────
test("nenhum UUID real, e-mail ou segredo no arquivo -- só placeholders documentados", () => {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  assert.doesNotMatch(sql, uuidRegex);
  assert.doesNotMatch(sql, /@gmail\.com|@inksystem\.com\.br/);
  assert.match(sql, /<uuid-de-conta-de-teste-existente>/);
});

// ── Verificação pós-execução e roteiro de homologação (comentados, fora
// da transação, nunca executados automaticamente) ──────────────────────────
test("bloco pós-COMMIT contém a consulta de diagnóstico agregado sem PII (sem nome, e-mail ou UUID individual)", () => {
  const bloco = blocoPosCommit();
  assert.match(bloco, /diagnostico_pos_hardening/);
  assert.match(bloco, /total_linhas/);
  assert.match(bloco, /linhas_auth_user_id_nulo/);
  assert.match(bloco, /distribuicao_status_plano/);
  assert.doesNotMatch(bloco, /select\s+nome\b/i);
  assert.doesNotMatch(bloco, /select\s+email\b/i);
});

test("roteiro funcional (Teste A e Teste B) está em duas transações comentadas separadas, cada uma com seu próprio BEGIN/ROLLBACK, nunca executado automaticamente", () => {
  const bloco = blocoPosCommit();
  assert.match(bloco, /-- Teste A -- proibido/);
  assert.match(bloco, /-- Teste B -- permitido/);
  // Todo o roteiro está comentado (prefixado com "-- ") -- nenhuma linha
  // de SQL real (sem "--" na frente) fora deste bloco comentado, exceto a
  // própria linha "COMMIT;" que abre o trecho (não é parte do roteiro).
  const linhasNaoComentadas = bloco
    .split("\n")
    .filter((l) => l.trim().length > 0 && l.trim() !== "COMMIT;" && !l.trim().startsWith("--"));
  assert.equal(linhasNaoComentadas.length, 0, "todo o conteúdo após o COMMIT deveria estar comentado");
});

test("Teste A e Teste B do roteiro funcional usam RETURNING/ROLLBACK e nunca o UUID do Laboratório real", () => {
  const bloco = blocoPosCommit();
  assert.match(bloco, /RETURNING id, slug/);
  assert.doesNotMatch(bloco, /Laboratório.*'[0-9a-f]{8}-/i);
});

// ── CORREÇÃO (auditoria pós-implementação): cabeçalho e consultas
// comentadas ────────────────────────────────────────────────────────────
test("o cabeçalho não contém mais a descrição antiga de busca dinâmica de policies", () => {
  // sql.indexOf("BEGIN;") encontraria a própria menção a "BEGIN;" dentro do
  // texto do cabeçalho ("BEGIN; é o primeiro comando executável...") --
  // mesma armadilha já corrigida para COMMIT; usa-se a instrução BEGIN;
  // real (linha própria) como limite do cabeçalho.
  const m = /^\s*BEGIN;\s*$/m.exec(sql);
  assert.ok(m, "instrução BEGIN; real (linha própria) não encontrada");
  const cabecalho = sql.slice(0, m.index);
  // Normaliza quebra de linha + marcador de comentário ("--") antes de
  // comparar -- frases do cabeçalho quebram entre linhas de comentário,
  // então uma regex sem normalização perderia combinações reais.
  const cabecalhoNormalizado = cabecalho.replace(/\n--\s*/g, " ").replace(/\s+/g, " ");
  assert.doesNotMatch(cabecalhoNormalizado, /removidas por busca dinâmica/i);
  assert.doesNotMatch(cabecalhoNormalizado, /só são criadas se ainda não existirem/i);
  assert.match(cabecalhoNormalizado, /4 DROP POLICY IF EXISTS estáticos e nomeados/);
  assert.match(cabecalhoNormalizado, /nunca busca dinâmica em pg_policies, nunca laço/);
});

test("as consultas comentadas pós-execução (relacl/attacl) não usam ORDER BY ordinal ambíguo (1, 2) -- só expressões reais", () => {
  const bloco = blocoPosCommit();
  assert.doesNotMatch(bloco, /order by 1,\s*2/i);
  // Expressão real: papel decodificado (case grantee=0) + privilege_type.
  const ocorrenciasOrderByReal = (bloco.match(/order by \(case when a\.grantee = 0 then 'PUBLIC' else pg_get_userbyid\(a\.grantee\) end\), a\.privilege_type/g) || []).length;
  assert.equal(ocorrenciasOrderByReal, 2, "esperada a mesma expressão real de ORDER BY nas duas consultas comentadas (relacl e attacl)");
  // Ordenação por coluna preservada na consulta de attacl (ORDER BY externo).
  assert.match(bloco, /group by att\.attname\s*\n--\s*order by att\.attname;/);
});
