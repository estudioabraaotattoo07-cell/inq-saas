// api/_tests/sql.creditosStorageLicencasHardening.test.js
//
// Teste ESTRUTURAL do Bloco Corretivo de Segurança de Créditos, Storage e
// Licenças.
//
// LIMITAÇÃO HONESTA, DECLARADA DE PROPÓSITO (mesmo padrão de toda migration
// desta engenharia): não existe Postgres real disponível neste ambiente --
// este arquivo NÃO PROVA que a migration executa sem erro num banco real,
// que o UPDATE condicional de consumir_credito_mensageria realmente
// resolve concorrência sob carga real, ou que as exceções são lançadas
// como o texto sugere em runtime. Isso só a homologação manual no Supabase
// confirma. O que ESTE arquivo prova, com confiança: que o texto da
// migration contém exatamente as peças estruturais e decisões já
// auditadas e aprovadas -- pré-voo completo, as 3 funções congeladas sem
// nenhum DML e sem grant de aplicação, as 2 funções endurecidas com
// validação completa e grants corretos, licencas travada, policies
// corretas, verificações fail-closed, transação integral.
//
// Rodar com: node --test api/_tests/sql.creditosStorageLicencasHardening.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRATION = path.join(__dirname, "..", "..", "sql", "2026-08-20_creditos_storage_licencas_hardening.sql");
const sql = readFileSync(CAMINHO_MIGRATION, "utf8");

function contemTrecho(agulha) {
  const normalizado = sql.replace(/\s+/g, " ");
  const agulhaNormalizada = agulha.replace(/\s+/g, " ");
  return normalizado.includes(agulhaNormalizada);
}

function apenasCodigo(texto) {
  return texto
    .split("\n")
    .map((linha) => linha.replace(/--[^\r\n]*/g, ""))
    .join("\n");
}

function blocoFuncao(nomeFuncao) {
  const marcador = `create or replace function public.${nomeFuncao}(`;
  const inicio = sql.indexOf(marcador);
  assert.ok(inicio > -1, `função ${nomeFuncao} não encontrada na migration`);
  const fim = sql.indexOf("$function$;", inicio) + "$function$;".length;
  return sql.slice(inicio, fim);
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

test("arquivo de migration existe e não está vazio", () => {
  assert.ok(sql.length > 1000, "migration deveria ter conteúdo substancial");
});

// ── Transação integral ────────────────────────────────────────────────────
test("existe exatamente 1 BEGIN; e 1 COMMIT; transacionais, BEGIN antes de qualquer alteração, COMMIT depois de toda verificação", () => {
  const codigo = apenasCodigo(sql);
  const begins = codigo.match(/^\s*BEGIN;\s*$/gm) || [];
  const commits = codigo.match(/^\s*COMMIT;\s*$/gm) || [];
  assert.equal(begins.length, 1);
  assert.equal(commits.length, 1);

  const posBegin = codigo.search(/^\s*BEGIN;\s*$/m);
  const posPrimeiroCreate = codigo.search(/create or replace function/i);
  const posPrimeiroRevoke = codigo.search(/\brevoke\b/i);
  assert.ok(posBegin < posPrimeiroCreate && posBegin < posPrimeiroRevoke);

  const posCommit = codigo.search(/^\s*COMMIT;\s*$/m);
  const posUltimaVerificacao = codigo.lastIndexOf("end $verificar_search_path_5_funcoes$;");
  assert.ok(posUltimaVerificacao > -1);
  assert.ok(posCommit > posUltimaVerificacao);
});

test("nenhum ROLLBACK, SAVEPOINT ou EXCEPTION WHEN OTHERS em código real", () => {
  const codigo = apenasCodigo(sql);
  assert.doesNotMatch(codigo, /\brollback\b/i);
  assert.doesNotMatch(codigo, /\bsavepoint\b/i);
  assert.doesNotMatch(codigo, /exception\s+when\s+others/i);
});

// ── Pré-voo ────────────────────────────────────────────────────────────────
test("pré-voo cobre licencas, ink_clientes e as 5 funções, antes de qualquer CREATE OR REPLACE/REVOKE", () => {
  const marcadores = [
    "prevoo_tabela_licencas",
    "prevoo_colunas_licencas",
    "prevoo_ink_clientes",
    "prevoo_funcoes_creditos_storage",
  ];
  const posPrimeiroCreate = sql.indexOf("create or replace function public.comprar_credito_mensageria");
  for (const m of marcadores) {
    const pos = sql.indexOf(m);
    assert.ok(pos > -1, `bloco de pré-voo ${m} não encontrado`);
    assert.ok(pos < posPrimeiroCreate, `${m} deve vir antes do primeiro CREATE OR REPLACE FUNCTION`);
  }
});

test("pré-voo de ink_clientes confirma UNIQUE(auth_user_id) de que os UPDATEs dependem", () => {
  const bloco = blocoDo("prevoo_ink_clientes");
  assert.match(bloco, /UNIQUE \(auth_user_id\)/);
});

// ── Pré-voo de grants/policies/funções ANTERIORES de licencas (segunda
// correção da auditoria pós-implementação -- comparação EXATA, não
// aproximada) ───────────────────────────────────────────────────────────
test("pré-voo de grants de licencas vem antes de qualquer REVOKE/GRANT/DROP POLICY/CREATE POLICY, e checa privilégios efetivos por array ordenado (não só presença de REVOKE no texto)", () => {
  const codigo = apenasCodigo(sql);
  const posPrevoo = codigo.indexOf("prevoo_grants_licencas");
  const posPrimeiroRevoke = codigo.search(/\brevoke\b/i);
  const posPrimeiroGrant = codigo.search(/\bgrant\b/i);
  const posPrimeiroDropPolicy = codigo.search(/drop policy/i);
  const posPrimeiroCreatePolicy = codigo.search(/create policy/i);
  assert.ok(posPrevoo > -1, "bloco prevoo_grants_licencas não encontrado");
  assert.ok(posPrevoo < posPrimeiroRevoke);
  assert.ok(posPrevoo < posPrimeiroGrant);
  assert.ok(posPrevoo < posPrimeiroDropPolicy);
  assert.ok(posPrevoo < posPrimeiroCreatePolicy);

  const bloco = blocoDo("prevoo_grants_licencas");
  assert.match(bloco, /information_schema\.role_table_grants/);
  assert.match(bloco, /grantee = 'PUBLIC'/);
  assert.match(bloco, /grantee = 'anon'/);
  assert.match(bloco, /grantee = 'authenticated'/);
  assert.match(bloco, /grantee = 'service_role'/);
});

test("pré-voo de grants de licencas compara ARRAYS ORDENADOS completos de privilégio (7 privilégios), não contagem nem booleanos aproximados", () => {
  const bloco = blocoDo("prevoo_grants_licencas");
  assert.match(bloco, /array\['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'\]/);
  assert.match(bloco, /array_agg\(privilege_type order by privilege_type\)/);
  // Não pode sobrar nenhum vestígio da comparação aproximada antiga
  // (um único booleano "authenticated = ['SELECT']" sem checar os outros
  // 3 papéis por array completo).
  assert.doesNotMatch(bloco, /v_service_role_select\b/);
  assert.doesNotMatch(bloco, /v_service_role_insert\b/);
  assert.doesNotMatch(bloco, /v_service_role_update\b/);
});

test("pré-voo de grants de licencas exige EXATAMENTE o estado original (anon/authenticated/service_role com os 7 privilégios, PUBLIC vazio) OU o estado final (authenticated só SELECT, anon/PUBLIC vazios, service_role com os 7 preservados)", () => {
  const bloco = blocoDo("prevoo_grants_licencas");
  assert.match(bloco, /v_estado_original :=\s*\n\s*v_public_privs = array\[\]::text\[\]\s*\n\s*and v_anon_privs = v_privs_completos\s*\n\s*and v_authenticated_privs = v_privs_completos\s*\n\s*and v_service_role_privs = v_privs_completos/);
  assert.match(bloco, /v_estado_final :=\s*\n\s*v_public_privs = array\[\]::text\[\]\s*\n\s*and v_anon_privs = array\[\]::text\[\]\s*\n\s*and v_authenticated_privs = array\['SELECT'\]::text\[\]\s*\n\s*and v_service_role_privs = v_privs_completos/);
  assert.match(bloco, /if not \(v_estado_original or v_estado_final\) then/);
  assert.match(bloco, /raise exception 'Abortando \(pré-voo\): grants de licencas não batem exatamente/);
});

test("pré-voo de policies de licencas compara nome + comando + PAPÉIS + USING + WITH CHECK das 5 policies originais, todos exatos (WITH CHECK incluído, não mais ignorado)", () => {
  const bloco = blocoDo("prevoo_policies_licencas");
  for (const nomePolicy of ["Dono vê tudo", "licencas_delete_propria", "licencas_escrita_propria", "licencas_select", "licencas_update_propria"]) {
    assert.ok(bloco.includes(`'${nomePolicy}'`), `policy original ${nomePolicy} não referenciada no pré-voo`);
  }
  assert.match(bloco, /cmd = r\.comando and roles = r\.papeis/);
  assert.match(bloco, /qual is not distinct from r\.using_esperado/);
  assert.match(bloco, /with_check is not distinct from r\.with_check_esperado/);
  // with_check das duas policies de escrita (INSERT/UPDATE) precisa estar
  // presente com o valor real confirmado, não nulo/ignorado.
  assert.match(bloco, /'licencas_escrita_propria', 'INSERT', array\['public'\]::name\[\], null::text, '\(user_id = auth\.uid\(\)\)'::text/);
  assert.match(bloco, /'licencas_update_propria', 'UPDATE', array\['public'\]::name\[\], '\(user_id = auth\.uid\(\)\)'::text, '\(user_id = auth\.uid\(\)\)'::text/);
});

test("pré-voo de policies de licencas exige EXATAMENTE as 5 originais OU só licencas_select_propria (com WITH CHECK nulo), abortando em qualquer mistura ou ausência parcial", () => {
  const bloco = blocoDo("prevoo_policies_licencas");
  assert.match(bloco, /v_originais_ok = constant_total_originais and v_qtd = constant_total_originais/);
  assert.match(bloco, /and with_check is null/);
  assert.match(bloco, /raise exception 'Abortando \(pré-voo\): estado de policies de licencas não bate exatamente/);
});

test("pré-voo do estado das 5 funções vem antes de qualquer CREATE OR REPLACE FUNCTION, e compara prosecdef + search_path + ACL efetiva contra o original E o final -- não só assinatura/retorno/owner", () => {
  const codigo = apenasCodigo(sql);
  const posPrevoo = codigo.indexOf("prevoo_estado_funcoes_creditos_storage");
  const posPrimeiroCreate = codigo.indexOf("create or replace function public.comprar_credito_mensageria");
  assert.ok(posPrevoo > -1, "bloco prevoo_estado_funcoes_creditos_storage não encontrado");
  assert.ok(posPrevoo < posPrimeiroCreate, "deve vir antes do primeiro CREATE OR REPLACE FUNCTION");

  const bloco = blocoDo("prevoo_estado_funcoes_creditos_storage");
  assert.match(bloco, /select prosecdef, proconfig into v_prosecdef, v_proconfig/);
  assert.match(bloco, /aclexplode\(/);
  assert.match(bloco, /has_function_privilege\('anon', v_oid, 'EXECUTE'\)/);
  assert.match(bloco, /has_function_privilege\('authenticated', v_oid, 'EXECUTE'\)/);
  assert.match(bloco, /has_function_privilege\('service_role', v_oid, 'EXECUTE'\)/);
});

test("pré-voo do estado das 5 funções codifica o estado original exato confirmado pela Fase 2 (SECURITY INVOKER só em comprar_recarga_mensageria; PUBLIC/anon só em comprar_storage_extra e incrementar_storage_usado)", () => {
  const bloco = blocoDo("prevoo_estado_funcoes_creditos_storage");
  // comprar_recarga_mensageria: prosecdef_original = false (SECURITY INVOKER)
  assert.match(bloco, /'comprar_recarga_mensageria', 'p_user_id uuid, p_ano_mes text, p_canal text, p_qtd integer',\s*\n\s*false,/);
  // comprar_storage_extra e incrementar_storage_usado: PUBLIC=true, anon=true originalmente
  assert.match(bloco, /'comprar_storage_extra', 'p_user_id uuid, p_mb numeric',\s*\n\s*true,\s*\n\s*true, true, true, true,/);
  assert.match(bloco, /'incrementar_storage_usado', 'p_user_id uuid, p_mb numeric',\s*\n\s*true,\s*\n\s*true, true, true, true,/);
});

test("pré-voo do estado das 5 funções nunca confunde acesso implícito do owner postgres com grant explícito -- 'postgres' não aparece como papel comparado em nenhuma das checagens de ACL", () => {
  const bloco = apenasCodigo(blocoDo("prevoo_estado_funcoes_creditos_storage"));
  assert.doesNotMatch(bloco, /has_function_privilege\('postgres'/);
});

test("pré-voo do estado das 5 funções aborta se nem o estado original nem o final baterem exatamente", () => {
  const bloco = blocoDo("prevoo_estado_funcoes_creditos_storage");
  assert.match(bloco, /if not \(v_estado_original or v_estado_final\) then/);
  assert.match(bloco, /raise exception 'Abortando \(pré-voo\): public\.%\(%\) não bate exatamente com o estado original nem com o final/);
});

// ── As 3 funções congeladas: fail-closed, sem DML ─────────────────────────
for (const nome of ["comprar_credito_mensageria", "comprar_recarga_mensageria", "comprar_storage_extra"]) {
  test(`${nome}: corpo é fail-closed, sem nenhum DML (insert/update/delete)`, () => {
    const bloco = blocoFuncao(nome);
    assert.match(bloco, /raise exception '.*desativada até a ativação do pagamento integrado/);
    const codigo = apenasCodigo(bloco);
    assert.doesNotMatch(codigo, /\binsert\s+into\b/i);
    assert.doesNotMatch(codigo, /\bupdate\s+public\./i);
    assert.doesNotMatch(codigo, /\bdelete\s+from\b/i);
  });

  test(`${nome}: security definer, search_path fixado, assinatura/retorno preservados`, () => {
    const bloco = blocoFuncao(nome);
    assert.match(bloco, /security definer/);
    assert.match(bloco, /set search_path = public, pg_temp/);
    assert.match(bloco, /returns void/);
  });
}

test("comprar_credito_mensageria preserva assinatura (uuid, text, integer)", () => {
  assert.match(
    sql,
    /create or replace function public\.comprar_credito_mensageria\(\s*p_user_id uuid,\s*p_canal text,\s*p_qtd integer\s*\)/
  );
});

test("comprar_recarga_mensageria preserva assinatura (uuid, text, text, integer)", () => {
  assert.match(
    sql,
    /create or replace function public\.comprar_recarga_mensageria\(\s*p_user_id uuid,\s*p_ano_mes text,\s*p_canal text,\s*p_qtd integer\s*\)/
  );
});

test("comprar_storage_extra preserva assinatura (uuid, numeric)", () => {
  assert.match(
    sql,
    /create or replace function public\.comprar_storage_extra\(\s*p_user_id uuid,\s*p_mb numeric\s*\)/
  );
});

// ── consumir_credito_mensageria ───────────────────────────────────────────
test("consumir_credito_mensageria: trata auth.uid() nulo e p_user_id nulo em passos separados (corrige a falha real confirmada)", () => {
  const bloco = blocoFuncao("consumir_credito_mensageria");
  assert.match(bloco, /if session_user <> 'postgres' then/);
  assert.match(bloco, /if auth\.uid\(\) is null then/);
  assert.match(bloco, /if auth\.uid\(\) <> p_user_id then/);
  assert.match(bloco, /if p_user_id is null then/);
  // A checagem antiga vulnerável (comparação direta sem tratar nulo à parte)
  // não pode aparecer no código real.
  const codigo = apenasCodigo(bloco);
  assert.doesNotMatch(codigo, /p_user_id\s*!=\s*auth\.uid\(\)/);
  assert.doesNotMatch(codigo, /p_user_id\s*<>\s*auth\.uid\(\)/);
});

test("consumir_credito_mensageria: rejeita canal inválido explicitamente, nunca trata desconhecido como sms", () => {
  const bloco = blocoFuncao("consumir_credito_mensageria");
  assert.match(bloco, /if p_canal not in \('email', 'sms'\) then/);
  const codigo = apenasCodigo(bloco);
  // Não pode haver um "else" que trate qualquer coisa como sms sem
  // primeiro ter validado p_canal explicitamente.
  const posValidacaoCanal = codigo.indexOf("if p_canal not in");
  const posPrimeiroElseSms = codigo.indexOf("else");
  assert.ok(posValidacaoCanal > -1 && posValidacaoCanal < posPrimeiroElseSms, "validação de canal deve vir antes do else que trata sms");
});

test("consumir_credito_mensageria: rejeita quantidade nula/zero/negativa", () => {
  const bloco = blocoFuncao("consumir_credito_mensageria");
  assert.match(bloco, /if p_qtd is null or p_qtd <= 0 then/);
});

test("consumir_credito_mensageria: consumo atômico condicionado a saldo suficiente, aborta em vez de consumir parcialmente", () => {
  const bloco = blocoFuncao("consumir_credito_mensageria");
  assert.match(bloco, /where auth_user_id = p_user_id and email_credito_extra >= p_qtd/);
  assert.match(bloco, /where auth_user_id = p_user_id and sms_credito_extra >= p_qtd/);
  assert.match(bloco, /get diagnostics v_afetadas = row_count/);
  assert.match(bloco, /if v_afetadas = 0 then/);
  assert.match(bloco, /raise exception 'consumir_credito_mensageria: saldo insuficiente/);
});

test("consumir_credito_mensageria: opera sobre ink_clientes.email_credito_extra/sms_credito_extra, nunca mensageria_uso", () => {
  const bloco = apenasCodigo(blocoFuncao("consumir_credito_mensageria"));
  assert.match(bloco, /update public\.ink_clientes/);
  assert.doesNotMatch(bloco, /mensageria_uso/);
});

test("consumir_credito_mensageria: security definer, search_path fixado, grants para authenticated e postgres", () => {
  const bloco = blocoFuncao("consumir_credito_mensageria");
  assert.match(bloco, /security definer/);
  assert.match(bloco, /set search_path = public, pg_temp/);
  assert.ok(contemTrecho("grant execute on function public.consumir_credito_mensageria(uuid, text, integer) to authenticated, postgres"));
});

// ── incrementar_storage_usado ─────────────────────────────────────────────
test("incrementar_storage_usado: exige sessão, rejeita p_user_id nulo, exige auth.uid() = p_user_id", () => {
  const bloco = blocoFuncao("incrementar_storage_usado");
  assert.match(bloco, /if session_user <> 'postgres' then/);
  assert.match(bloco, /if auth\.uid\(\) is null then/);
  assert.match(bloco, /if auth\.uid\(\) <> p_user_id then/);
  assert.match(bloco, /if p_user_id is null then/);
});

test("incrementar_storage_usado: só incremento positivo, sem arredondamento nem teto superior (compatível com logStorage)", () => {
  const bloco = blocoFuncao("incrementar_storage_usado");
  assert.match(bloco, /if p_mb is null or p_mb <= 0 then/);
  const codigo = apenasCodigo(bloco);
  assert.doesNotMatch(codigo, /round\s*\(/i);
  assert.doesNotMatch(codigo, /floor\s*\(/i);
  assert.doesNotMatch(codigo, /p_mb\s*[<>]=?\s*\d{2,}/); // nenhum teto numérico hardcoded
});

test("incrementar_storage_usado: aborta com GET DIAGNOSTICS se nenhuma linha for afetada, sem terminar silenciosamente", () => {
  const bloco = blocoFuncao("incrementar_storage_usado");
  assert.match(bloco, /get diagnostics v_afetadas = row_count/);
  assert.match(bloco, /if v_afetadas = 0 then/);
  assert.match(bloco, /raise exception 'incrementar_storage_usado: no matching account found/);
});

test("incrementar_storage_usado: usa COALESCE(storage_usado_mb, 0) na soma, protegendo contra coluna anulável (correção da auditoria pós-implementação)", () => {
  const bloco = apenasCodigo(blocoFuncao("incrementar_storage_usado"));
  assert.match(bloco, /set storage_usado_mb = coalesce\(storage_usado_mb, 0\) \+ p_mb/i);
  // A soma vulnerável antiga (sem coalesce) não pode aparecer em nenhum
  // lugar do código real da função.
  assert.doesNotMatch(bloco, /set storage_usado_mb = storage_usado_mb \+ p_mb/i);
});

test("incrementar_storage_usado: mensagem de erro não interpola p_user_id (não revela identificador sensível)", () => {
  const bloco = blocoFuncao("incrementar_storage_usado");
  const linhasErro = bloco.split("\n").filter((l) => l.includes("raise exception"));
  for (const linha of linhasErro) {
    assert.doesNotMatch(linha, /%.*p_user_id/);
  }
});

test("incrementar_storage_usado: security definer, search_path fixado, grants para authenticated e postgres", () => {
  const bloco = blocoFuncao("incrementar_storage_usado");
  assert.match(bloco, /security definer/);
  assert.match(bloco, /set search_path = public, pg_temp/);
  assert.ok(contemTrecho("grant execute on function public.incrementar_storage_usado(uuid, numeric) to authenticated, postgres"));
});

// ── Grants das 5 funções: revoke explícito, congeladas sem grant a postgres ──
test("as 3 funções congeladas: revoke de public/anon/authenticated/service_role, sem nenhum grant explícito", () => {
  for (const [nome, assinatura] of [
    ["comprar_credito_mensageria", "uuid, text, integer"],
    ["comprar_recarga_mensageria", "uuid, text, text, integer"],
    ["comprar_storage_extra", "uuid, numeric"],
  ]) {
    assert.ok(
      contemTrecho(`revoke all on function public.${nome}(${assinatura}) from public, anon, authenticated, service_role`),
      `revoke esperado não encontrado para ${nome}`
    );
    assert.doesNotMatch(sql, new RegExp(`grant execute on function public\\.${nome}\\(`, "i"));
  }
});

test("verificação ativa fail-closed dos grants das 5 funções identifica oid por assinatura exata, exige authenticated correto por função", () => {
  const bloco = blocoDo("verificar_grants_5_funcoes");
  assert.match(bloco, /pg_get_function_identity_arguments\(p\.oid\) = r\.assinatura/);
  assert.match(bloco, /authenticated_deve_ter_execute/);
  assert.match(bloco, /aclexplode\(/);
  assert.match(bloco, /a\.grantee = 0 and a\.privilege_type = 'EXECUTE'/);
});

// ── Grants e policies de licencas ─────────────────────────────────────────
test("licencas: revoke de PUBLIC e anon, mais grant de SELECT só para authenticated", () => {
  assert.ok(contemTrecho("revoke all on table public.licencas from public, anon, authenticated"));
  assert.ok(contemTrecho("grant select on table public.licencas to authenticated"));
  assert.doesNotMatch(apenasCodigo(sql), /grant\s+(insert|update|delete|truncate|all)\s+on\s+(table\s+)?public\.licencas/i);
});

test("verificação ativa fail-closed dos grants de licencas cobre PUBLIC, anon, escrita de authenticated e SELECT exato", () => {
  const bloco = blocoDo("verificar_grants_licencas");
  assert.match(bloco, /grantee = 'PUBLIC'/);
  assert.match(bloco, /grantee = 'anon'/);
  assert.match(bloco, /privilege_type in \('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'\)/);
  assert.match(bloco, /v_authenticated_select <> 1/);
});

test("remove dinamicamente as policies de INSERT/UPDATE/DELETE/ALL de licencas, sem presumir o nome", () => {
  assert.ok(contemTrecho("cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')"));
  assert.ok(contemTrecho("execute format('drop policy %I on public.licencas', r.policyname)"));
});

test("policy de SELECT de licencas é comparada por definição, substituída se divergente (remove exceção de e-mail fixo)", () => {
  const bloco = blocoDo("corrigir_policy_select_licencas");
  assert.match(bloco, /v_qual is distinct from '\(auth\.uid\(\) = user_id\)'/);
  assert.doesNotMatch(apenasCodigo(bloco), /estudioabraaotattoo07@gmail\.com/);
});

test("não cria nenhuma policy de escrita em licencas em lugar nenhum do arquivo", () => {
  const codigo = apenasCodigo(sql);
  assert.doesNotMatch(codigo, /create policy.*for (insert|update|delete)/i);
});

test("verificação final confirma zero policies de escrita e exatamente 1 de SELECT com papel e qual corretos", () => {
  const bloco = blocoDo("verificar_policies_final_licencas");
  assert.match(bloco, /cmd in \('INSERT', 'UPDATE', 'DELETE', 'ALL'\)/);
  assert.match(bloco, /v_papeis <> array\['authenticated'\]::name\[\]/);
  assert.match(bloco, /v_qual is distinct from '\(auth\.uid\(\) = user_id\)'/);
});

// ── Ownership e search_path finais ────────────────────────────────────────
test("verificação final de ownership cobre licencas e ink_clientes", () => {
  const bloco = blocoDo("verificar_ownership_final");
  assert.match(bloco, /relname = 'licencas'/);
  assert.match(bloco, /relname = 'ink_clientes'/);
});

test("verificação final de search_path exige valor exato 'public, pg_temp' nas 5 funções", () => {
  const bloco = blocoDo("verificar_search_path_5_funcoes");
  assert.match(bloco, /v_cfg like 'search_path=%'/);
  assert.match(bloco, /'public,pg_temp'/);
});

// ── Fora de escopo ────────────────────────────────────────────────────────
test("não altera dado real -- nenhum INSERT/UPDATE/DELETE fora dos blocos DO de verificação sobre linha de negócio", () => {
  const codigo = apenasCodigo(sql);
  // As únicas ocorrências de update público são dentro das 2 funções
  // endurecidas (parte do comportamento delas, não uma alteração de dado
  // desta migration em si) -- já cobertas pelos testes de cada função.
  assert.doesNotMatch(codigo, /insert into public\.licencas/i);
  assert.doesNotMatch(codigo, /delete from public\.licencas/i);
  assert.doesNotMatch(codigo, /update public\.licencas/i);
});

test("nenhuma escrita real é executada por este arquivo (documentação confirma execução manual)", () => {
  assert.ok(contemTrecho("ESTE ARQUIVO É MANUAL"));
  assert.ok(contemTrecho("Não foi executado como parte desta"));
});

// ── Rodapé: sem UUID real, sem agregação/ordenação inválida (segunda
// auditoria pós-implementação) ────────────────────────────────────────────
test("nenhum UUID real aparece no exemplo de teste funcional do rodapé -- só o marcador neutro", () => {
  assert.doesNotMatch(sql, /2d366d35-1cae-40d5-ba92-06fe2ab8a763/);
  assert.ok(contemTrecho("<UUID_REAL_DO_USUARIO>"));
});

test("o rodapé orienta manter o teste funcional num roteiro de homologação separado, não como exemplo executável direto", () => {
  assert.ok(contemTrecho("roteiro de homologação"));
  assert.ok(contemTrecho("NÃO faz parte da homologação obrigatória"));
});

test("a consulta de verificação pós-execução do rodapé usa ORDER BY sempre DENTRO do agregado (json_agg(... order by ...)), nunca ORDER BY externo após agregação sem GROUP BY", () => {
  // Padrão correto: "order by <algo>)" com o parêntese de fechamento do
  // próprio json_agg logo em seguida (mesma linha ou linha seguinte,
  // sempre antes de "from"/"where" de outra subconsulta).
  assert.ok(contemTrecho("json_agg(json_build_object('papel', grantee, 'privilegio', privilege_type) order by grantee, privilege_type)"));
  assert.ok(contemTrecho("json_agg(json_build_object("));
  assert.ok(contemTrecho("'nome', p.proname, 'assinatura', pg_get_function_identity_arguments(p.oid)"));

  // Padrão inválido que não pode mais existir: um SELECT agregando (json_agg)
  // sem GROUP BY, seguido de "order by" FORA dos parênteses do agregado,
  // logo antes do fim da subconsulta/instrução (";" ou fechamento de
  // parêntese de CTE). Verificamos isso especificamente checando que a
  // ocorrência antiga (order by externo depois de "table_name = 'licencas'")
  // sem estar dentro de um json_agg(...) não existe mais.
  const secaoRodape = sql.slice(sql.indexOf("VERIFICAÇÃO PÓS-EXECUÇÃO"));
  const semComentario = secaoRodape.replace(/^--\s?/gm, "");
  assert.doesNotMatch(
    semComentario,
    /table_name = 'licencas';\s*\n\s*order by grantee, privilege_type/
  );
});
