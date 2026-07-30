-- Migration 001 — pipeline_etapas: UNIQUE (user_id, slug)
-- Ver: Bloco 2 — Criação Automática do Estúdio / Auditoria de Impacto das
-- Migrations (29/07/2026).
--
-- Objetivo: permitir que o seed das etapas padrão do Kanban seja feito por
-- UPSERT com { onConflict: "user_id,slug", ignoreDuplicates: true }, de forma
-- idempotente — sem essa constraint, o banco não tem como saber o que já
-- existe, e o mesmo seed rodado duas vezes duplicaria as etapas.
--
-- Risco confirmado antes de escrever esta migration: zero duplicidade de
-- (user_id, slug) nas 16 linhas existentes na tabela (verificado via
-- aplicação em 29/07/2026). Esta migration é independente de qualquer outra
-- — não depende de backfill nem de nenhuma outra tabela.
--
-- Este script é destinado a ser executado UMA ÚNICA VEZ, manualmente, no SQL
-- Editor do Supabase.

-- ── PASSO 1 — Relatório PRÉVIO ──────────────────────────────────────────────
-- Deve retornar 0 linhas. Se retornar qualquer linha, NÃO prossiga para o
-- Passo 2 — a migration vai falhar de qualquer forma, mas investigue a
-- duplicidade antes de decidir o que fazer com ela.
select user_id, slug, count(*) as ocorrencias
from pipeline_etapas
group by user_id, slug
having count(*) > 1;

-- ── PASSO 2 — Migração ──────────────────────────────────────────────────────
alter table pipeline_etapas
  add constraint pipeline_etapas_user_slug_key unique (user_id, slug);

-- ── PASSO 3 — Relatório FINAL ────────────────────────────────────────────────
-- Deve retornar exatamente 1 linha, confirmando que a constraint foi criada
-- com o nome e as colunas esperadas.
select
  con.conname as nome_da_constraint,
  con.contype as tipo,
  pg_get_constraintdef(con.oid) as definicao
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname = 'pipeline_etapas'
  and con.conname = 'pipeline_etapas_user_slug_key';
