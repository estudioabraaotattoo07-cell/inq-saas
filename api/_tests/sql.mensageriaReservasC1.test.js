// api/_tests/sql.mensageriaReservasC1.test.js
//
// Teste ESTRUTURAL do Bloco C.1 (reserva atômica de mensageria).
//
// LIMITAÇÃO HONESTA, DECLARADA DE PROPÓSITO: não existe Postgres real
// disponível neste ambiente de teste (mesma limitação de todos os testes
// deste repositório -- node:test nativo, sem rede real). Portanto este
// arquivo NÃO PROVA nem pode provar: (a) que a migration executa sem erro
// num banco real; (b) que o bloqueio de concorrência realmente impede duas
// reservas simultâneas de usar a mesma última unidade; (c) que os tipos
// SQL declarados (uuid, integer, timestamptz) se comportam como esperado em
// tempo de execução; (d) que o Postgres realmente reformata as cláusulas
// CHECK do jeito que presumimos. Essas quatro coisas só podem ser
// homologadas rodando a migration de verdade no Supabase (SQL Editor),
// depois desta implementação local -- é exatamente por isso que o processo
// desta engenharia sempre trata "implementação local" e "homologação no
// banco" como duas etapas distintas e nunca confunde uma com a outra.
//
// O que ESTE arquivo prova, com confiança: que o texto da migration contém
// exatamente as peças estruturais e as decisões de desenho já auditadas e
// aprovadas -- nomes de coluna/constraint/função corretos, a ordem de
// decisão certa, a ausência de grant a anon/PUBLIC, a presença da checagem
// de session_user/auth.uid(), a posição correta do pg_advisory_xact_lock, e
// a ausência de qualquer peça fora do escopo do C.1 (Resend, Zenvia,
// confirmar_disparo, etc). É um teste de "o arquivo diz o que deveríamos ter
// pedido para ele dizer", não um teste de comportamento em runtime -- em
// particular, NÃO prova que duas chamadas concorrentes com o mesmo
// solicitacao_id realmente convergem para uma única decisão (isso exige
// duas conexões reais e simultâneas contra um Postgres real, só possível na
// homologação no Supabase); o que se prova aqui é só que o lock está
// posicionado antes de qualquer leitura/reserva, condição necessária (mas
// não demonstrável localmente como suficiente) para essa garantia.
//
// Rodar com: node --test api/_tests/sql.mensageriaReservasC1.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_MIGRATION = path.join(__dirname, "..", "..", "sql", "2026-08-19_mensageria_reservas_c1.sql");
const sql = readFileSync(CAMINHO_MIGRATION, "utf8");

// ── Utilitário: normaliza espaços para facilitar buscas por trecho de código ──
function contemTrecho(agulha) {
  const normalizado = sql.replace(/\s+/g, " ");
  const agulhaNormalizada = agulha.replace(/\s+/g, " ");
  return normalizado.includes(agulhaNormalizada);
}

// ── Utilitário: remove comentários de linha (-- ...) para checar só código
// SQL real executável, ignorando prosa explicativa que legitimamente cita
// nomes de mecanismos removidos/rejeitados (ex.: comentário ao lado do
// código explicando "não usamos mais X").
function apenasCodigo(texto) {
  return texto
    .split("\n")
    .map((linha) => linha.replace(/--[^\r\n]*/g, ""))
    .join("\n");
}

test("arquivo de migration existe e não está vazio", () => {
  assert.ok(sql.length > 1000, "migration deveria ter conteúdo substancial");
});

// ── Parte 1: tabela mensageria_reservas ──────────────────────────────────────
test("cria a tabela mensageria_reservas com as 8 colunas mínimas aprovadas", () => {
  assert.match(sql, /create table public\.mensageria_reservas/);
  for (const coluna of [
    "solicitacao_id  uuid primary key",
    "user_id         uuid not null",
    "canal           text not null",
    "origem          text null",
    "estado          text not null default 'reservado'",
    "motivo_bloqueio text null",
    "criado_em       timestamptz not null default now()",
    "resolvido_em    timestamptz null",
  ]) {
    assert.ok(contemTrecho(coluna), `coluna esperada não encontrada: ${coluna}`);
  }
});

test("não adiciona nenhuma coluna especulativa (ex.: quantidade, whatsapp) na tabela de reservas", () => {
  const blocoTabela = sql.split("create table public.mensageria_reservas")[1].split(");")[0];
  assert.doesNotMatch(blocoTabela, /whatsapp/i);
  assert.doesNotMatch(blocoTabela, /\bqtd\b|\bquantidade\b/i);
});

test("restringe canal a email/sms", () => {
  assert.ok(contemTrecho("check (canal in ('email', 'sms'))"));
});

test("restringe estado aos quatro valores aprovados, incluindo bloqueado persistido", () => {
  assert.ok(contemTrecho("check (estado in ('reservado', 'confirmado', 'estornado', 'bloqueado'))"));
});

test("restringe origem aos três valores válidos, permitindo NULL", () => {
  assert.ok(contemTrecho("check (origem is null or origem in ('ilimitado', 'franquia', 'credito_extra'))"));
});

test("constraint de coerência impede bloqueio com origem preenchida, e impede reserva sem origem", () => {
  assert.ok(contemTrecho("estado = 'bloqueado' and origem is null and motivo_bloqueio is not null"));
  assert.ok(contemTrecho("estado <> 'bloqueado' and origem is not null and motivo_bloqueio is null"));
});

test("habilita RLS na tabela de reservas (deny-by-default sem policies)", () => {
  assert.match(sql, /alter table public\.mensageria_reservas enable row level security/);
  // Não deve haver nenhuma "create policy" nesta migration -- confirma que
  // a proteção é só a ausência de policy, como documentado no cabeçalho.
  assert.doesNotMatch(sql, /create policy/i);
});

test("migration valida estrutura já existente (fail-closed) em vez de só checar existência", () => {
  assert.match(sql, /validar_estrutura_mensageria_reservas/);
  assert.match(sql, /raise exception[\s\S]{0,80}Abortando/);
});

// ── Parte 2: contadores em mensageria_uso ────────────────────────────────────
test("adiciona emails_reservados e sms_reservados como integer not null default 0", () => {
  assert.ok(contemTrecho("add column emails_reservados integer not null default 0"));
  assert.ok(contemTrecho("add column sms_reservados integer not null default 0"));
});

test("não altera a semântica de emails_enviados/sms_enviados nem toca em emails_comprados/sms_comprados", () => {
  assert.doesNotMatch(sql, /alter table public\.mensageria_uso[\s\S]*?add column emails_enviados/);
  assert.doesNotMatch(sql, /alter table public\.mensageria_uso[\s\S]*?add column sms_enviados/);
  assert.doesNotMatch(sql, /emails_comprados/);
  assert.doesNotMatch(sql, /sms_comprados/);
});

// ── Parte 3: RPC reservar_disparo ────────────────────────────────────────────
test("cria a função reservar_disparo com a assinatura mínima exigida, retornando jsonb", () => {
  assert.match(
    sql,
    /create or replace function public\.reservar_disparo\(\s*p_user_id uuid,\s*p_solicitacao_id uuid,\s*p_canal text\s*\)\s*returns jsonb/
  );
});

test("é SECURITY DEFINER com search_path fixado em public", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1];
  assert.match(blocoFuncao, /security definer/);
  assert.match(blocoFuncao, /set search_path = public/);
});

test("todas as referências SQL reais a tabelas dentro da função são qualificadas com public.", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  for (const tabela of ["mensageria_reservas", "licencas", "mensageria_uso", "ink_clientes"]) {
    // Só verifica após palavras-chave SQL reais (from/into/update/insert into),
    // nunca dentro de texto de RAISE NOTICE/EXCEPTION (que são strings de log,
    // não identificadores SQL, e legitimamente citam nomes de tabela sem
    // qualificação por serem só texto legível por humano).
    const semQualificacao = new RegExp(`\\b(from|into|update|insert into)\\s+(?!public\\.)${tabela}\\b`, "gi");
    const encontrados = blocoFuncao.match(semQualificacao) || [];
    assert.equal(
      encontrados.length,
      0,
      `referência SQL não qualificada a ${tabela} encontrada: ${encontrados.join(", ")}`
    );
  }
});

test("único bypass de autorização é session_user = 'postgres' -- sem service_role em nenhum CÓDIGO real dentro da função", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  assert.ok(blocoFuncao.includes("if session_user <> 'postgres' then"));
  // service_role/auth.role()/claims de JWT foram removidos deliberadamente
  // após auditoria empírica (ver histórico no cabeçalho do arquivo). Dentro
  // do corpo da função, um comentário legitimamente documenta essa remoção
  // ao lado do código ("Nenhum bypass por service_role/auth.role()") -- por
  // isso a checagem remove comentários de linha antes de procurar, provando
  // ausência no CÓDIGO executável, não no texto explicativo.
  const codigoFuncao = apenasCodigo(blocoFuncao);
  assert.doesNotMatch(codigoFuncao, /service_role/i);
  assert.doesNotMatch(codigoFuncao, /auth\.role\s*\(/i);
  assert.doesNotMatch(codigoFuncao, /request\.jwt\.claim/i);
});

test("trata auth.uid() IS NULL explicitamente, separado da comparação com p_user_id", () => {
  assert.ok(contemTrecho("if auth.uid() is null then"));
  assert.ok(contemTrecho("if auth.uid() <> p_user_id then"));
});

test("valida p_canal antes de qualquer decisão de negócio", () => {
  assert.ok(contemTrecho("if p_canal not in ('email', 'sms') then"));
});

// ── Concorrência do mesmo solicitacao_id (pg_advisory_xact_lock) ──────────
test("adquire pg_advisory_xact_lock (variante transacional) com chave derivada de solicitacao_id", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  assert.match(
    blocoFuncao,
    /pg_advisory_xact_lock\s*\(\s*hashtextextended\s*\(\s*p_solicitacao_id::text,\s*0\s*\)\s*\)/
  );
});

test("nunca usa a variante de sessão pg_advisory_lock (insegura sob pooling em modo transação)", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  assert.doesNotMatch(blocoFuncao, /pg_advisory_lock\s*\(/);
  assert.doesNotMatch(blocoFuncao, /pg_advisory_unlock/);
});

test("lock é adquirido antes da checagem de idempotência e antes de qualquer reserva de franquia/crédito", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  const posLock = blocoFuncao.indexOf("pg_advisory_xact_lock");
  const posIdempotencia = blocoFuncao.indexOf("select * into v_existente");
  const posFranquia = blocoFuncao.indexOf("insert into public.mensageria_uso");
  const posCredito = blocoFuncao.indexOf("update public.ink_clientes");
  assert.ok(posLock > -1, "aquisição do lock não encontrada");
  assert.ok(posLock < posIdempotencia, "lock deve vir antes da checagem de idempotência");
  assert.ok(posLock < posFranquia, "lock deve vir antes de qualquer reserva de franquia");
  assert.ok(posLock < posCredito, "lock deve vir antes de qualquer decremento de crédito extra");
});

test("não adiciona ON CONFLICT (solicitacao_id) nos INSERTs finais -- redundante sob o advisory lock, decisão deliberada", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  assert.doesNotMatch(blocoFuncao, /on conflict\s*\(\s*solicitacao_id\s*\)/i);
});

test("idempotência: consulta solicitacao_id existente antes de qualquer nova avaliação, e nunca reavalia", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  const posConsulta = blocoFuncao.indexOf("select * into v_existente");
  const posLicenca = blocoFuncao.indexOf("select status, franquia_ilimitada");
  assert.ok(posConsulta > -1, "consulta de idempotência não encontrada");
  assert.ok(posLicenca > -1, "consulta de licença não encontrada");
  assert.ok(posConsulta < posLicenca, "consulta de idempotência deve vir ANTES da avaliação de licença");
  assert.match(blocoFuncao, /if found then[\s\S]{0,400}return jsonb_build_object/);
});

test("replay de solicitacao_id não cria nova linha nem chama INSERT de novo antes do return", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  const blocoReplay = blocoFuncao.split("select * into v_existente")[1].split("-- ── Avaliação nova")[0];
  assert.doesNotMatch(blocoReplay, /insert into/i);
});

test("Laboratório (franquia_ilimitada): autoriza com origem ilimitado e não toca em mensageria_uso nem ink_clientes", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  const blocoIlimitado = blocoFuncao
    .split("if v_licenca.franquia_ilimitada then")[1]
    .split("-- ── Licença limitada")[0];
  assert.match(blocoIlimitado, /'origem',\s*'ilimitado'/);
  assert.match(blocoIlimitado, /'estado',\s*'reservado'/);
  assert.doesNotMatch(blocoIlimitado, /mensageria_uso/);
  assert.doesNotMatch(blocoIlimitado, /ink_clientes/);
});

test("franquia NULL não é tratada como disponível nem como esgotada silenciosamente", () => {
  assert.ok(contemTrecho("if v_franquia_canal is not null and v_franquia_canal >= 1 then"));
  assert.ok(contemTrecho("v_franquia_canal is null then 'franquia_nao_configurada' else 'franquia_esgotada'"));
});

test("reserva de franquia usa UPSERT condicional apoiado na constraint UNIQUE(user_id, ano_mes) já confirmada", () => {
  assert.ok(contemTrecho("on conflict (user_id, ano_mes) do update"));
  assert.match(sql, /where \(mensageria_uso\.emails_enviados \+ mensageria_uso\.emails_reservados\) < v_franquia_canal/);
  assert.match(sql, /where \(mensageria_uso\.sms_enviados \+ mensageria_uso\.sms_reservados\) < v_franquia_canal/);
});

test("primeira reserva do mês zera emails_enviados/sms_enviados explicitamente no INSERT, sem depender do default da coluna pré-existente", () => {
  assert.ok(contemTrecho("values (p_user_id, v_ano_mes, 0, 1)"));
});

test("checagem e reserva de franquia acontecem na mesma instrução SQL (sem SELECT de leitura separado antes do UPDATE)", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  const blocoFranquia = blocoFuncao
    .split("if v_franquia_canal is not null and v_franquia_canal >= 1 then")[1]
    .split("-- ── Franquia indisponível")[0];
  const posInsert = blocoFranquia.indexOf("insert into public.mensageria_uso");
  const posSelectAntes = blocoFranquia.slice(0, posInsert).indexOf("select");
  assert.equal(posSelectAntes, -1, "não deve haver SELECT de leitura antes do INSERT/UPDATE atômico de franquia");
});

test("crédito extra: decremento condicional na mesma instrução, nunca satura silenciosamente como consumir_credito_mensageria", () => {
  assert.ok(contemTrecho("set email_credito_extra = email_credito_extra - 1"));
  assert.ok(contemTrecho("where auth_user_id = p_user_id and coalesce(email_credito_extra, 0) >= 1"));
  assert.ok(contemTrecho("set sms_credito_extra = sms_credito_extra - 1"));
  assert.ok(contemTrecho("where auth_user_id = p_user_id and coalesce(sms_credito_extra, 0) >= 1"));
  // consumir_credito_mensageria é citada só em prosa no cabeçalho (explicando
  // por que NÃO é usada) -- o que não pode existir é uma CHAMADA real a ela.
  assert.doesNotMatch(sql, /\bselect\s+consumir_credito_mensageria\s*\(/i);
  assert.doesNotMatch(sql, /\bperform\s+consumir_credito_mensageria\s*\(/i);
  assert.doesNotMatch(sql, /greatest\s*\(\s*0/);
});

test("bloqueio final marca origem NULL, motivo correto e resolvido_em preenchido (imutável e terminal)", () => {
  const blocoFuncao = sql.split("create or replace function public.reservar_disparo")[1].split("$function$;")[0];
  const blocoBloqueioFinal = blocoFuncao.split("-- ── Nem franquia nem crédito")[1];
  assert.match(blocoBloqueioFinal, /p_solicitacao_id, p_user_id, p_canal, null, 'bloqueado', v_motivo, now\(\)/);
});

// ── Parte 4: grants ───────────────────────────────────────────────────────
// Correção pós-homologação (19/08/2026): a primeira versão revogava só de
// PUBLIC, insuficiente porque este projeto Supabase concede privilégios
// padrão diretamente a anon/authenticated/service_role em todo objeto novo
// do schema public. A versão final revoga explicitamente por nome de papel.
test("revoga EXPLICITAMENTE de PUBLIC, anon e service_role na função -- concede só a authenticated e postgres", () => {
  assert.ok(
    contemTrecho("revoke all on function public.reservar_disparo(uuid, uuid, text) from public, anon, service_role")
  );
  assert.ok(
    contemTrecho("grant execute on function public.reservar_disparo(uuid, uuid, text) to authenticated, postgres")
  );
});

test("revoga explicitamente o acesso direto de tabela de anon, authenticated e service_role em mensageria_reservas", () => {
  assert.ok(
    contemTrecho("revoke all on table public.mensageria_reservas from anon, authenticated, service_role")
  );
  // Nenhum GRANT (só REVOKE) deve existir para a tabela -- o único acesso
  // pretendido é via a RPC, nunca direto.
  assert.doesNotMatch(sql, /grant\s+(all|select|insert|update|delete)[\s\S]{0,80}on table public\.mensageria_reservas/i);
});

test("verificação ativa (fail-closed) confirma ausência de anon/PUBLIC/service_role nos grants da função", () => {
  assert.match(sql, /verificar_grants_reservar_disparo/);
  const blocoVerificacaoFuncao = sql.split("verificar_grants_reservar_disparo$")[1].split("end $verificar_grants_reservar_disparo$")[0];
  assert.match(blocoVerificacaoFuncao, /grantee in \('anon', 'PUBLIC', 'service_role'\)/);
  assert.match(blocoVerificacaoFuncao, /raise exception[\s\S]{0,60}Abortando/);
});

test("verificação ativa (fail-closed) confirma ausência de anon/authenticated/service_role/PUBLIC nos grants da tabela", () => {
  assert.match(sql, /verificar_grants_mensageria_reservas/);
  const blocoVerificacaoTabela = sql.split("verificar_grants_mensageria_reservas$")[1].split("end $verificar_grants_mensageria_reservas$")[0];
  assert.match(blocoVerificacaoTabela, /grantee in \('anon', 'authenticated', 'service_role', 'PUBLIC'\)/);
  assert.match(blocoVerificacaoTabela, /raise exception[\s\S]{0,60}Abortando/);
});

// ── Fora de escopo do C.1 ─────────────────────────────────────────────────
// Os nomes abaixo aparecem DE PROPÓSITO no cabeçalho, em prosa, documentando
// o que está fora de escopo (ex.: "Não cria confirmar_disparo nem
// estornar_disparo"). O que este teste precisa provar é que não existe
// IMPLEMENTAÇÃO real de nenhuma dessas peças -- não que a palavra nunca
// apareça em texto explicativo.
test("não cria nenhuma função/tabela reservada para blocos futuros", () => {
  for (const criacaoIndevida of [
    "create or replace function public.confirmar_disparo",
    "create or replace function public.estornar_disparo",
    "create table public.historico",
    "create table public.mensageria_diario",
    "create table public.ink_pagamentos",
  ]) {
    assert.ok(!contemTrecho(criacaoIndevida), `criação fora de escopo do C.1 encontrada: ${criacaoIndevida}`);
  }
});

test("não escreve (insert/update) em mensageria_diario, historico ou registrar_falha_mensageria", () => {
  assert.doesNotMatch(sql, /\b(insert into|update)\s+(public\.)?mensageria_diario\b/i);
  assert.doesNotMatch(sql, /\b(insert into|update)\s+(public\.)?historico\b/i);
  assert.doesNotMatch(sql, /\b(select|perform)\s+registrar_falha_mensageria\s*\(/i);
});

test("nenhuma escrita real é executada por este arquivo (documentação confirma execução manual)", () => {
  assert.ok(contemTrecho("ESTE ARQUIVO É MANUAL"));
  assert.ok(contemTrecho("Não foi executado como parte desta"));
});
