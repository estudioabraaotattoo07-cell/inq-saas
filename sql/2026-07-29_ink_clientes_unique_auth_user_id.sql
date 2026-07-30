-- Migration 002 — ink_clientes: UNIQUE (auth_user_id)
-- Ver: Bloco 2 — Criação Automática do Estúdio / Auditoria de Impacto das
-- Migrations (29/07/2026). Migration 001 (pipeline_etapas) já aplicada com
-- sucesso antes desta.
--
-- Objetivo: permitir que a criação/atualização do registro central do tenant
-- (ink_clientes) seja feita por UPSERT com onConflict:"auth_user_id", de
-- forma idempotente. É exatamente a ausência desta constraint que causou a
-- falha original investigada nesta mesma Fase B: um UPDATE por auth_user_id
-- contra uma linha inexistente afeta zero linhas e não retorna erro nenhum
-- — o CRM mostrava "sucesso" sem o registro nunca ter sido criado.
--
-- Nota sobre NULL: auth_user_id não é NOT NULL nesta tabela. Uma constraint
-- UNIQUE do Postgres trata cada NULL como distinto dos demais — ou seja,
-- múltiplas linhas com auth_user_id NULL continuam permitidas mesmo depois
-- desta migration. Isso não compromete o objetivo (nenhum fluxo de
-- provisionamento real usa auth_user_id nulo), só é registrado aqui para
-- não gerar surpresa se algum dia existir uma linha assim.
--
-- Risco confirmado antes de escrever esta migration: zero duplicidade de
-- auth_user_id nas 4 linhas existentes na tabela (verificado via aplicação
-- em 29/07/2026). Esta migration é independente da Migration 001 e de
-- qualquer migration futura de licencas — não depende de backfill.
--
-- Este script é destinado a ser executado UMA ÚNICA VEZ, manualmente, no SQL
-- Editor do Supabase.

-- ── PASSO 1 — Relatório PRÉVIO ──────────────────────────────────────────────
-- Deve retornar 0 linhas. Se retornar qualquer linha, NÃO prossiga para o
-- Passo 2 — a migration vai falhar de qualquer forma, mas investigue a
-- duplicidade antes de decidir o que fazer com ela.
select auth_user_id, count(*) as ocorrencias
from ink_clientes
where auth_user_id is not null
group by auth_user_id
having count(*) > 1;

-- ── PASSO 2 — Migração ──────────────────────────────────────────────────────
alter table ink_clientes
  add constraint ink_clientes_auth_user_id_key unique (auth_user_id);

-- ── PASSO 3 — Relatório FINAL ────────────────────────────────────────────────
-- Deve retornar exatamente 1 linha, confirmando que a constraint foi criada
-- com o nome e a coluna esperados.
select
  con.conname as nome_da_constraint,
  con.contype as tipo,
  pg_get_constraintdef(con.oid) as definicao
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname = 'ink_clientes'
  and con.conname = 'ink_clientes_auth_user_id_key';
