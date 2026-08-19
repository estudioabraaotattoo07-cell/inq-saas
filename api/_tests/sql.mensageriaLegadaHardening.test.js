// api/_tests/sql.mensageriaLegadaHardening.test.js
//
// Teste ESTRUTURAL do Bloco Corretivo de Segurança da Mensageria Legada.
//
// LIMITAÇÃO HONESTA, DECLARADA DE PROPÓSITO (mesmo padrão do C.1): não
// existe Postgres real disponível neste ambiente -- este arquivo NÃO PROVA
// que a migration executa sem erro num banco real, que as constraints
// realmente rejeitam dado inválido em tempo de execução, que
// pg_get_expr(conbin, conrelid) realmente devolve as formas canônicas aqui
// documentadas, ou que a checagem de auth.uid() se comporta exatamente
// como o texto sugere sob PostgREST real. Isso só a homologação manual no
// Supabase confirma. O que ESTE arquivo prova, com confiança: que o texto
// da migration contém exatamente as peças estruturais e decisões já
// auditadas e aprovadas -- pré-voo completo (tabelas + colunas + UNIQUE +
// funções) antes de qualquer alteração, assinaturas preservadas, checagens
// de segurança presentes, grants verificados por assinatura exata (não só
// nome), ownership verificado, search_path verificado por valor exato,
// policies de escrita removidas e as de SELECT preservadas e verificadas
// positivamente, constraints com definição comparada (não só nome), e
// ausência de qualquer peça fora de escopo.
//
// Rodar com: node --test api/_tests/sql.mensageriaLegadaHardening.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRATION = path.join(__dirname, "..", "..", "sql", "2026-08-19_mensageria_legada_hardening.sql");
const sql = readFileSync(CAMINHO_MIGRATION, "utf8");

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

function blocoFuncao(nomeFuncao) {
  const marcador = `create or replace function public.${nomeFuncao}(`;
  const inicio = sql.indexOf(marcador);
  assert.ok(inicio > -1, `função ${nomeFuncao} não encontrada na migration`);
  const fim = sql.indexOf("$function$;", inicio) + "$function$;".length;
  return sql.slice(inicio, fim);
}

// Recorta o corpo de um bloco DO nomeado ($marcador ... $marcador$), pelo
// marcador de dollar-quote exato -- nunca por busca de palavra solta no
// arquivo inteiro, para que nenhuma asserção seja satisfeita por um trecho
// de comentário ou de outro bloco com nome parecido.
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

// ── Pré-voo: ordem e cobertura completa ──────────────────────────────────
test("pré-voo de tabelas/colunas/UNIQUE/funções vem antes de qualquer CREATE OR REPLACE/REVOKE/DROP POLICY/ALTER TABLE", () => {
  const posPrevooTabelas = sql.indexOf("prevoo_tabelas_mensageria_legada");
  const posPrevooColunas = sql.indexOf("prevoo_colunas_mensageria_legada");
  const posPrevooUnique = sql.indexOf("prevoo_unique_mensageria_legada");
  const posPrevooFuncoes = sql.indexOf("prevoo_funcoes_mensageria_legada");
  const posPrimeiroCreate = sql.indexOf("create or replace function public.incrementar_uso_mensageria");
  const posPrimeiroRevoke = sql.indexOf("revoke all on function");
  const posPrimeiroDropPolicy = sql.indexOf("drop policy");
  const posPrimeiroAlterTable = sql.indexOf("alter table public.%I add constraint");

  for (const [nome, pos] of [
    ["prevoo_tabelas_mensageria_legada", posPrevooTabelas],
    ["prevoo_colunas_mensageria_legada", posPrevooColunas],
    ["prevoo_unique_mensageria_legada", posPrevooUnique],
    ["prevoo_funcoes_mensageria_legada", posPrevooFuncoes],
  ]) {
    assert.ok(pos > -1, `bloco de pré-voo ${nome} não encontrado`);
    assert.ok(pos < posPrimeiroCreate, `${nome} deve vir antes do primeiro CREATE OR REPLACE FUNCTION`);
    assert.ok(pos < posPrimeiroRevoke, `${nome} deve vir antes do primeiro REVOKE`);
    assert.ok(pos < posPrimeiroDropPolicy, `${nome} deve vir antes do primeiro DROP POLICY`);
    assert.ok(pos < posPrimeiroAlterTable, `${nome} deve vir antes do primeiro ALTER TABLE ADD CONSTRAINT`);
  }
});

test("pré-voo de tabelas confirma existência, relkind='r', owner postgres e RLS habilitada, com aborto por RAISE EXCEPTION", () => {
  const bloco = blocoDo("prevoo_tabelas_mensageria_legada");
  assert.match(bloco, /unnest\(array\['mensageria_uso', 'mensageria_diario', 'mensageria_falhas'\]\)/);
  assert.match(bloco, /v_relkind <> 'r'/);
  assert.match(bloco, /v_owner <> 'postgres'/);
  assert.match(bloco, /not v_rls/);
  assert.match(bloco, /raise exception 'Abortando \(pré-voo\)/);
});

test("pré-voo de colunas confirma tipo/nulabilidade/default das colunas essenciais das 3 tabelas", () => {
  const bloco = blocoDo("prevoo_colunas_mensageria_legada");
  const colunasEsperadas = [
    ["mensageria_uso", "user_id", "uuid"],
    ["mensageria_uso", "ano_mes", "text"],
    ["mensageria_uso", "emails_enviados", "integer"],
    ["mensageria_uso", "emails_reservados", "integer"],
    ["mensageria_uso", "sms_reservados", "integer"],
    ["mensageria_diario", "user_id", "uuid"],
    ["mensageria_diario", "dia", "date"],
    ["mensageria_diario", "emails_enviados", "integer"],
    ["mensageria_falhas", "user_id", "uuid"],
    ["mensageria_falhas", "canal", "text"],
    ["mensageria_falhas", "motivo", "text"],
    ["mensageria_falhas", "criado_em", "timestamp with time zone"],
  ];
  for (const [tabela, coluna, tipo] of colunasEsperadas) {
    assert.ok(
      bloco.includes(`('${tabela}', '${coluna}', '${tipo}'`),
      `coluna esperada não encontrada no pré-voo: ${tabela}.${coluna} (${tipo})`
    );
  }
  assert.match(bloco, /v_tipo <> r\.tipo/);
  assert.match(bloco, /v_nulavel <> r\.nulavel/);
  assert.match(bloco, /data_type, is_nullable, column_default/);
});

test("pré-voo de colunas normaliza só espaço/caixa ao comparar defaults, nunca aceita divergência de conteúdo", () => {
  const bloco = blocoDo("prevoo_colunas_mensageria_legada");
  assert.match(bloco, /regexp_replace\(upper\(coalesce\(v_default, ''\)\), '\\s', '', 'g'\)/);
});

test("pré-voo confirma as 2 constraints UNIQUE de que o ON CONFLICT das funções depende", () => {
  const bloco = blocoDo("prevoo_unique_mensageria_legada");
  assert.match(bloco, /'mensageria_uso', 'UNIQUE \(user_id, ano_mes\)'/);
  assert.match(bloco, /'mensageria_diario', 'UNIQUE \(user_id, dia\)'/);
  assert.match(bloco, /contype = 'u'/);
});

test("pré-voo de funções confirma assinatura, retorno void e owner postgres antes de qualquer CREATE OR REPLACE", () => {
  const bloco = blocoDo("prevoo_funcoes_mensageria_legada");
  assert.match(bloco, /pg_get_function_identity_arguments\(p\.oid\) = r\.assinatura/);
  assert.match(bloco, /pg_get_function_result\(p\.oid\) = r\.retorno/);
  assert.match(bloco, /v_owner <> 'postgres'/);
});

// ── Assinaturas preservadas ──────────────────────────────────────────────
test("preserva a assinatura de incrementar_uso_mensageria(uuid, text, text, integer) returns void", () => {
  assert.match(
    sql,
    /create or replace function public\.incrementar_uso_mensageria\(\s*p_user_id uuid,\s*p_ano_mes text,\s*p_canal text,\s*p_qtd integer\s*\)\s*returns void/
  );
});

test("preserva a assinatura de incrementar_uso_diario(uuid, text, integer) returns void", () => {
  assert.match(
    sql,
    /create or replace function public\.incrementar_uso_diario\(\s*p_user_id uuid,\s*p_canal text,\s*p_qtd integer\s*\)\s*returns void/
  );
});

test("preserva a assinatura de registrar_falha_mensageria(uuid, text, text) returns void", () => {
  assert.match(
    sql,
    /create or replace function public\.registrar_falha_mensageria\(\s*p_user_id uuid,\s*p_canal text,\s*p_motivo text\s*\)\s*returns void/
  );
});

// ── SECURITY DEFINER e search_path ───────────────────────────────────────
for (const nome of ["incrementar_uso_mensageria", "incrementar_uso_diario", "registrar_falha_mensageria"]) {
  test(`${nome} é SECURITY DEFINER com search_path = public, pg_temp`, () => {
    const bloco = blocoFuncao(nome);
    assert.match(bloco, /security definer/);
    assert.match(bloco, /set search_path = public, pg_temp/);
  });
}

// ── Segurança: auth.uid() nulo, tenant divergente, bypass ───────────────
for (const nome of ["incrementar_uso_mensageria", "incrementar_uso_diario", "registrar_falha_mensageria"]) {
  test(`${nome}: checa session_user='postgres' como único bypass`, () => {
    const bloco = blocoFuncao(nome);
    assert.match(bloco, /if session_user <> 'postgres' then/);
  });

  test(`${nome}: trata auth.uid() IS NULL separadamente da comparação com p_user_id`, () => {
    const bloco = blocoFuncao(nome);
    assert.match(bloco, /if auth\.uid\(\) is null then/);
    assert.match(bloco, /if auth\.uid\(\) <> p_user_id then/);
  });

  test(`${nome}: nenhum bypass por service_role/auth.role() no código real`, () => {
    const bloco = apenasCodigo(blocoFuncao(nome));
    assert.doesNotMatch(bloco, /service_role/i);
    assert.doesNotMatch(bloco, /auth\.role\s*\(/i);
    assert.doesNotMatch(bloco, /request\.jwt\.claim/i);
  });
}

// ── Validações ────────────────────────────────────────────────────────────
test("incrementar_uso_mensageria valida p_canal, p_qtd > 0 e formato de p_ano_mes", () => {
  const bloco = blocoFuncao("incrementar_uso_mensageria");
  assert.match(bloco, /if p_canal not in \('email', 'sms'\) then/);
  assert.match(bloco, /if p_qtd is null or p_qtd <= 0 then/);
  assert.match(bloco, /p_ano_mes !~ '\^\\d\{4\}-\(0\[1-9\]\|1\[0-2\]\)\$'/);
});

test("incrementar_uso_diario valida p_canal e p_qtd > 0, sem parâmetro de data", () => {
  const bloco = blocoFuncao("incrementar_uso_diario");
  assert.match(bloco, /if p_canal not in \('email', 'sms'\) then/);
  assert.match(bloco, /if p_qtd is null or p_qtd <= 0 then/);
  assert.doesNotMatch(bloco, /p_ano_mes/);
});

test("registrar_falha_mensageria valida p_canal e trunca p_motivo em 500 caracteres, nulo vira string vazia", () => {
  const bloco = blocoFuncao("registrar_falha_mensageria");
  assert.match(bloco, /if p_canal not in \('email', 'sms'\) then/);
  assert.match(bloco, /v_motivo := left\(coalesce\(p_motivo, ''\), 500\);/);
});

// ── Comportamento preservado ──────────────────────────────────────────────
test("incrementar_uso_mensageria preserva UPSERT por UNIQUE(user_id, ano_mes) e nunca toca reservados/comprados", () => {
  const bloco = blocoFuncao("incrementar_uso_mensageria");
  assert.match(bloco, /on conflict \(user_id, ano_mes\) do update/);
  const codigo = apenasCodigo(bloco);
  assert.doesNotMatch(codigo, /reservados/);
  assert.doesNotMatch(codigo, /comprados/);
});

test("incrementar_uso_diario preserva UPSERT por UNIQUE(user_id, dia) e usa current_date", () => {
  const bloco = blocoFuncao("incrementar_uso_diario");
  assert.match(bloco, /on conflict \(user_id, dia\) do update/);
  assert.match(bloco, /current_date/);
});

test("nenhuma das três funções aceita decremento (p_qtd sempre somado, nunca subtraído)", () => {
  for (const nome of ["incrementar_uso_mensageria", "incrementar_uso_diario"]) {
    const bloco = blocoFuncao(nome);
    assert.doesNotMatch(bloco, /-\s*p_qtd/);
  }
});

test("registrar_falha_mensageria preserva INSERT simples, criado_em não sobrescrito", () => {
  const bloco = blocoFuncao("registrar_falha_mensageria");
  assert.match(bloco, /insert into public\.mensageria_falhas \(user_id, canal, motivo\)/);
  assert.doesNotMatch(apenasCodigo(bloco), /criado_em/);
});

// ── Grants das funções, por assinatura exata (não só routine_name) ───────
test("revoga explicitamente de public, anon e service_role nas três funções, concede só a authenticated e postgres", () => {
  assert.ok(contemTrecho("revoke all on function public.incrementar_uso_mensageria(uuid, text, text, integer) from public, anon, service_role"));
  assert.ok(contemTrecho("grant execute on function public.incrementar_uso_mensageria(uuid, text, text, integer) to authenticated, postgres"));
  assert.ok(contemTrecho("revoke all on function public.incrementar_uso_diario(uuid, text, integer) from public, anon, service_role"));
  assert.ok(contemTrecho("grant execute on function public.incrementar_uso_diario(uuid, text, integer) to authenticated, postgres"));
  assert.ok(contemTrecho("revoke all on function public.registrar_falha_mensageria(uuid, text, text) from public, anon, service_role"));
  assert.ok(contemTrecho("grant execute on function public.registrar_falha_mensageria(uuid, text, text) to authenticated, postgres"));
});

test("verificação ativa fail-closed dos grants das funções identifica o oid por nome + assinatura exata, não por routine_name isolado", () => {
  const bloco = blocoDo("verificar_grants_funcoes_legadas");
  assert.match(bloco, /pg_get_function_identity_arguments\(p\.oid\) = r\.assinatura/);
  assert.doesNotMatch(bloco, /information_schema\.role_routine_grants/);
});

test("verificação de grants das funções usa has_function_privilege para authenticated/anon/service_role/postgres por oid exato", () => {
  const bloco = blocoDo("verificar_grants_funcoes_legadas");
  assert.match(bloco, /has_function_privilege\('authenticated', v_oid, 'EXECUTE'\)/);
  assert.match(bloco, /has_function_privilege\('anon', v_oid, 'EXECUTE'\)/);
  assert.match(bloco, /has_function_privilege\('service_role', v_oid, 'EXECUTE'\)/);
  assert.match(bloco, /has_function_privilege\('postgres', v_oid, 'EXECUTE'\)/);
});

test("verificação de grants das funções confirma ausência de EXECUTE para PUBLIC via aclexplode(grantee=0), não via nome de papel", () => {
  const bloco = blocoDo("verificar_grants_funcoes_legadas");
  assert.match(bloco, /aclexplode\(/);
  assert.match(bloco, /a\.grantee = 0 and a\.privilege_type = 'EXECUTE'/);
});

test("verificação de grants das funções documenta que o acesso de postgres é garantido por ownership, não é a linha de defesa real", () => {
  const bloco = blocoDo("verificar_grants_funcoes_legadas");
  assert.match(apenasCodigo(bloco), /postgres/);
  assert.match(bloco, /checagem documental|não como linha de defesa real/);
});

// ── Grants das tabelas ────────────────────────────────────────────────────
test("revoga tudo das tabelas legadas para anon/authenticated/service_role, concede só SELECT a authenticated e service_role", () => {
  assert.ok(
    contemTrecho(
      "revoke all on table public.mensageria_uso, public.mensageria_diario, public.mensageria_falhas from anon, authenticated, service_role"
    )
  );
  assert.ok(
    contemTrecho(
      "grant select on public.mensageria_uso, public.mensageria_diario, public.mensageria_falhas to authenticated, service_role"
    )
  );
});

test("nenhum GRANT de escrita (INSERT/UPDATE/DELETE) aparece em lugar nenhum do arquivo para as tabelas legadas", () => {
  assert.doesNotMatch(sql, /grant\s+(insert|update|delete|truncate|all)\s+on\s+(table\s+)?public\.mensageria_(uso|diario|falhas)/i);
});

test("verificação ativa fail-closed dos grants das tabelas está presente", () => {
  const bloco = blocoDo("verificar_grants_tabelas_mensageria");
  assert.match(bloco, /privilege_type in \('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'\)/);
  assert.match(bloco, /grantee = 'anon' and privilege_type = 'SELECT'/);
  assert.match(bloco, /grantee = 'authenticated' and privilege_type = 'SELECT'/);
  assert.match(bloco, /grantee = 'service_role' and privilege_type = 'SELECT'/);
});

// ── Policies: escrita removida, SELECT preservada e verificada positivamente ──
test("remove dinamicamente as policies de INSERT/UPDATE de mensageria_diario, sem presumir o nome", () => {
  assert.ok(contemTrecho("cmd in ('INSERT', 'UPDATE')"));
  assert.ok(contemTrecho("execute format('drop policy %I on public.mensageria_diario', r.policyname)"));
});

test("não cria nenhuma policy nova em lugar nenhum do arquivo", () => {
  assert.doesNotMatch(sql, /create policy/i);
});

test("verificação positiva confirma exatamente 1 policy de SELECT por tabela, com papel esperado", () => {
  const bloco = blocoDo("verificar_policies_select_mensageria_legada");
  assert.match(bloco, /'mensageria_uso', array\['public'\]::name\[\]/);
  assert.match(bloco, /'mensageria_diario', array\['authenticated'\]::name\[\]/);
  assert.match(bloco, /'mensageria_falhas', array\['public'\]::name\[\]/);
  assert.match(bloco, /v_qtd <> 1/);
  assert.match(bloco, /v_roles <> r\.papeis/);
});

test("verificação positiva confirma a expressão de isolamento exata (auth.uid() = user_id) das policies de SELECT", () => {
  const bloco = blocoDo("verificar_policies_select_mensageria_legada");
  assert.match(bloco, /v_qual is distinct from '\(auth\.uid\(\) = user_id\)'/);
});

test("verificação ativa fail-closed confirma ausência de policy de escrita e RLS habilitada nas 3 tabelas", () => {
  const bloco = blocoDo("verificar_policies_escrita_e_rls_mensageria");
  assert.match(bloco, /cmd in \('INSERT', 'UPDATE', 'DELETE', 'ALL'\)/);
  assert.match(bloco, /relrowsecurity = true/);
});

// ── Ownership ─────────────────────────────────────────────────────────────
test("ownership das 3 tabelas é confirmado tanto no pré-voo quanto no pós-voo, abortando (nunca corrigindo) em caso de divergência", () => {
  const preVoo = blocoDo("prevoo_tabelas_mensageria_legada");
  const posVoo = blocoDo("verificar_ownership_tabelas_final");
  assert.match(preVoo, /v_owner <> 'postgres'/);
  assert.match(posVoo, /v_owner <> 'postgres'/);
  assert.doesNotMatch(apenasCodigo(posVoo), /alter table.*owner to/i);
});

test("ownership das 3 funções é confirmado tanto no pré-voo quanto na verificação final de segurança", () => {
  const preVoo = blocoDo("prevoo_funcoes_mensageria_legada");
  const posVoo = blocoDo("verificar_seguranca_funcoes_legadas");
  assert.match(preVoo, /v_owner <> 'postgres'/);
  assert.match(posVoo, /v_owner <> 'postgres'/);
  assert.doesNotMatch(apenasCodigo(posVoo), /alter function.*owner to/i);
});

// ── Constraints, verificadas por definição (não só nome) ──────────────────
test("adiciona as 10 constraints esperadas, com nomes explícitos", () => {
  const nomes = [
    "mensageria_uso_emails_enviados_nonneg",
    "mensageria_uso_sms_enviados_nonneg",
    "mensageria_uso_emails_comprados_nonneg",
    "mensageria_uso_sms_comprados_nonneg",
    "mensageria_uso_emails_reservados_nonneg",
    "mensageria_uso_sms_reservados_nonneg",
    "mensageria_uso_ano_mes_formato",
    "mensageria_diario_emails_enviados_nonneg",
    "mensageria_diario_sms_enviados_nonneg",
    "mensageria_falhas_canal_check",
  ];
  for (const nome of nomes) {
    assert.ok(contemTrecho(`'${nome}'`), `constraint esperada não encontrada: ${nome}`);
  }
});

test("criação das constraints compara a definição real (pg_get_expr) contra forma canônica quando o nome já existe, e aborta em vez de substituir", () => {
  const bloco = blocoDo("adicionar_constraints_mensageria_legada");
  assert.match(bloco, /pg_get_expr\(conbin, conrelid\) into v_definicao_real/);
  assert.match(bloco, /v_definicao_real <> r\.forma_canonica/);
  assert.match(bloco, /NÃO removida nem substituída/);
  assert.doesNotMatch(apenasCodigo(bloco), /drop constraint/i);
});

test("verificação final das constraints compara definição real (não só existência por nome/contype)", () => {
  const bloco = blocoDo("verificar_constraints_mensageria_legada");
  assert.match(bloco, /pg_get_expr\(conbin, conrelid\) into v_definicao_real/);
  assert.match(bloco, /v_definicao_real <> r\.forma_canonica/);
  assert.match(bloco, /contype = 'c'/);
});

test("forma canônica de mensageria_falhas_canal_check usa a transformação IN->ANY/ARRAY já confirmada empiricamente neste banco", () => {
  assert.ok(
    contemTrecho("'mensageria_falhas_canal_check', '(canal = ANY (ARRAY[''email''::text, ''sms''::text]))'")
  );
});

test("não adiciona limite superior para nenhum contador (só >= 0 e formato)", () => {
  assert.doesNotMatch(sql, /<=\s*\d+\)/);
});

// ── Verificação final de segurança: search_path exato ────────────────────
test("verificação final fail-closed confirma assinatura + SECURITY DEFINER + owner + search_path das 3 funções", () => {
  const bloco = blocoDo("verificar_seguranca_funcoes_legadas");
  assert.match(bloco, /v_prosecdef/);
  assert.match(bloco, /not v_prosecdef/);
});

test("verificação final de search_path exige valor EXATO 'public, pg_temp' (normalizando só espaço), não apenas presença de 'search_path='", () => {
  const bloco = blocoDo("verificar_seguranca_funcoes_legadas");
  assert.match(bloco, /v_cfg like 'search_path=%'/);
  assert.match(bloco, /regexp_replace\(substring\(v_cfg from 'search_path=\(\.\*\)'\), '\\s', '', 'g'\) <> 'public,pg_temp'/);
});

// ── Idempotência textual ──────────────────────────────────────────────────
test("todo bloco de alteração estrutural (constraints, policies) verifica existência antes de agir", () => {
  assert.ok(contemTrecho("if not exists"));
  assert.match(sql, /if v_removidas = 0 then/);
});

// ── Rollback: documentação corrigida ──────────────────────────────────────
test("cabeçalho corrige a afirmação anterior: os corpos antigos FORAM capturados via pg_get_functiondef no diagnóstico manual", () => {
  assert.ok(contemTrecho("FORAM recuperados via"));
  assert.ok(contemTrecho("pg_get_functiondef durante o diagnóstico manual real do Supabase"));
  assert.doesNotMatch(sql, /não foi capturado por pg_get_functiondef/i);
});

test("cabeçalho não inclui nenhum comando de rollback executável, e afirma que grants vulneráveis nunca devem ser restaurados", () => {
  assert.doesNotMatch(apenasCodigo(sql), /^\s*grant execute on function.*to (public|anon)/im);
  const cabecalhoSemMarcadoresDeComentario = sql.replace(/^--\s?/gm, "");
  assert.match(
    cabecalhoSemMarcadoresDeComentario.replace(/\s+/g, " "),
    /esta migration NUNCA\s*deve ser revertida de forma a restaurar os grants vulneráveis/
  );
});

// ── Transação integral: BEGIN;/COMMIT; explícitos ─────────────────────────
test("existe exatamente 1 BEGIN; transacional (maiúsculo, com ponto-e-vírgula, linha própria) no código real", () => {
  const codigo = apenasCodigo(sql);
  const begins = codigo.match(/^\s*BEGIN;\s*$/gm) || [];
  assert.equal(begins.length, 1, `esperado exatamente 1 BEGIN; transacional, encontrado ${begins.length}`);
});

test("existe exatamente 1 COMMIT; transacional no código real, e nenhum COMMIT intermediário", () => {
  const codigo = apenasCodigo(sql);
  const commits = codigo.match(/^\s*COMMIT;\s*$/gm) || [];
  assert.equal(commits.length, 1, `esperado exatamente 1 COMMIT; transacional, encontrado ${commits.length}`);
});

test("distingue o 'begin' de bloco PL/pgSQL (minúsculo, sem ; imediato, dentro de DO/função) do BEGIN; transacional", () => {
  const codigo = apenasCodigo(sql);
  const beginsPlpgsql = codigo.match(/^\s*begin\s*$/gim) || [];
  const beginsTransacionais = codigo.match(/^\s*BEGIN;\s*$/gm) || [];
  // 3 funções + os blocos DO (pré-voo x4, grants x2, policies x2, remoção de
  // policy, constraints x2, verificação final x1, ownership final x1) somam
  // bem mais de 10 "begin" de bloco PL/pgSQL -- nenhum deles é o BEGIN;
  // transacional, que é maiúsculo, tem ; e não abre um bloco declare/loop.
  assert.ok(
    beginsPlpgsql.length > 10,
    `esperadas várias ocorrências de 'begin' de bloco PL/pgSQL, encontrado ${beginsPlpgsql.length}`
  );
  assert.equal(beginsTransacionais.length, 1);
});

test("distingue COMMIT; executável de menções à palavra COMMIT dentro de comentários do cabeçalho", () => {
  const ocorrenciasBrutas = (sql.match(/COMMIT;/g) || []).length;
  const ocorrenciasReais = (apenasCodigo(sql).match(/^\s*COMMIT;\s*$/gm) || []).length;
  assert.ok(
    ocorrenciasBrutas > ocorrenciasReais,
    "o cabeçalho deveria mencionar COMMIT; em prosa (dentro de comentário), a mais do que a única ocorrência executável real"
  );
  assert.equal(ocorrenciasReais, 1);
});

test("BEGIN; transacional aparece antes de qualquer DO/CREATE OR REPLACE/REVOKE/GRANT/DROP POLICY/ALTER TABLE executável", () => {
  const codigo = apenasCodigo(sql);
  const posBegin = codigo.search(/^\s*BEGIN;\s*$/m);
  assert.ok(posBegin > -1, "BEGIN; transacional não encontrado no código real");

  const primeiros = {
    DO: codigo.search(/\bdo\s+\$/i),
    "CREATE OR REPLACE": codigo.search(/create or replace/i),
    REVOKE: codigo.search(/\brevoke\b/i),
    GRANT: codigo.search(/\bgrant\b/i),
    "DROP POLICY": codigo.search(/drop policy/i),
    "ALTER TABLE": codigo.search(/alter table/i),
  };

  for (const [nome, pos] of Object.entries(primeiros)) {
    assert.ok(pos > -1, `comando ${nome} não encontrado no código real`);
    assert.ok(posBegin < pos, `BEGIN; deveria vir antes do primeiro ${nome} executável`);
  }
});

test("COMMIT; transacional aparece depois da última verificação fail-closed (ownership final das tabelas)", () => {
  const codigo = apenasCodigo(sql);
  const posCommit = codigo.search(/^\s*COMMIT;\s*$/m);
  const posUltimaVerificacao = codigo.lastIndexOf("end $verificar_ownership_tabelas_final$;");
  assert.ok(posCommit > -1, "COMMIT; transacional não encontrado no código real");
  assert.ok(posUltimaVerificacao > -1, "bloco de verificação final de ownership não encontrado");
  assert.ok(posCommit > posUltimaVerificacao, "COMMIT; deveria vir depois da última verificação fail-closed");
});

test("nenhum ROLLBACK executável em lugar nenhum do arquivo", () => {
  assert.doesNotMatch(apenasCodigo(sql), /\brollback\b/i);
});

test("nenhum SAVEPOINT executável em lugar nenhum do arquivo", () => {
  assert.doesNotMatch(apenasCodigo(sql), /\bsavepoint\b/i);
});

test("nenhum EXCEPTION WHEN OTHERS que capture ou esconda falha", () => {
  assert.doesNotMatch(apenasCodigo(sql), /exception\s+when\s+others/i);
});

test("consultas pós-execução aparecem só depois do COMMIT; e continuam comentadas (nenhum SQL executável depois do COMMIT;)", () => {
  const posCommit = sql.search(/^\s*COMMIT;\s*$/m);
  assert.ok(posCommit > -1);
  const posMarcadorPosExecucao = sql.indexOf("VERIFICAÇÃO PÓS-EXECUÇÃO");
  assert.ok(posMarcadorPosExecucao > posCommit, "marcador de consultas pós-execução deveria vir depois do COMMIT;");

  // Localiza o texto literal "COMMIT;" (não o comprimento do match da regex
  // -- ^\s* pode absorver a linha em branco anterior no início do match,
  // deslocando um slice por comprimento fixo).
  const inicioLiteral = sql.indexOf("COMMIT;", posCommit);
  const restante = sql.slice(inicioLiteral + "COMMIT;".length);
  const restanteSemComentarios = apenasCodigo(restante).trim();
  assert.equal(restanteSemComentarios, "", "não deveria haver nenhum SQL executável depois do COMMIT;");
});

test("cabeçalho documenta a semântica exata de falha: aborto da transação inteira, nenhuma alteração permanece, reexecução integral do zero, nunca só o trecho restante", () => {
  const cabecalhoSemMarcadoresDeComentario = sql.replace(/^--\s?/gm, "").replace(/\s+/g, " ");
  assert.match(cabecalhoSemMarcadoresDeComentario, /aborta a TRANSAÇÃO INTEIRA/);
  assert.match(cabecalhoSemMarcadoresDeComentario, /Nenhuma alteração\s*desta migration/);
  assert.match(cabecalhoSemMarcadoresDeComentario, /permanece no banco/);
  assert.match(cabecalhoSemMarcadoresDeComentario, /deve ser colado e executado integralmente novamente, do zero/);
  assert.match(cabecalhoSemMarcadoresDeComentario, /NUNCA execute só\s*o trecho restante/);
});

// ── Fora de escopo ────────────────────────────────────────────────────────
test("não cria confirmar_disparo nem estornar_disparo (fora de escopo desta rodada)", () => {
  assert.doesNotMatch(apenasCodigo(sql), /create (or replace )?function public\.(confirmar|estornar)_disparo/i);
});

test("não altera ALTER DEFAULT PRIVILEGES em nenhum código real do arquivo", () => {
  assert.doesNotMatch(apenasCodigo(sql), /alter default privileges/i);
});

test("nenhuma escrita real é executada por este arquivo (documentação confirma execução manual)", () => {
  assert.ok(contemTrecho("ESTE ARQUIVO É MANUAL"));
  assert.ok(contemTrecho("Não foi executado como parte desta"));
});
