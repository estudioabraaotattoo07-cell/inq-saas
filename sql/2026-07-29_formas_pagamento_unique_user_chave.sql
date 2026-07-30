-- Migration 003B — formas_pagamento: UNIQUE (user_id, chave_sistema)
-- Ver: Bloco 2 — Criação Automática do Estúdio / Auditoria de Impacto das
-- Migrations (29/07/2026). Migrations 001 (pipeline_etapas), 002
-- (ink_clientes) e 003A (categorias_financeiras) já aplicadas com sucesso
-- antes desta.
--
-- Contexto: última parte da antiga Migration 003, dividida em migrations
-- independentes. A consulta informativa rodada em 29/07/2026 confirmou que
-- formas_pagamento_user_chave_key NÃO existe hoje — por isso esta migration
-- é um ADD CONSTRAINT direto, sem bloco defensivo DO $$, no mesmo padrão das
-- Migrations 001, 002 e 003A.
--
-- Objetivo: permitir que o seed das formas de pagamento padrão continue
-- sendo feito por UPSERT com onConflict:"user_id,chave_sistema" e
-- ignoreDuplicates:true, de forma idempotente e agora com a constraint real
-- garantindo isso no banco.
--
-- Nota sobre NULL: chave_sistema é opcional (nullable). Uma constraint
-- UNIQUE do Postgres trata cada NULL como distinto dos demais — múltiplas
-- formas de pagamento com chave_sistema NULL para o mesmo user_id (criadas
-- manualmente pelo tenant, fora do seed padrão) continuam permitidas.
--
-- Esta migration é independente de todas as demais. Com ela, as 4 migrations
-- de baixo risco do Bloco 2.2 ficam concluídas (pipeline_etapas, ink_clientes,
-- categorias_financeiras, formas_pagamento) — restando só licencas (backfill
-- + UNIQUE), deliberadamente fora de escopo desta etapa.
--
-- Este script é destinado a ser executado UMA ÚNICA VEZ, manualmente, no SQL
-- Editor do Supabase.

-- ── PASSO 1 — Relatório PRÉVIO ──────────────────────────────────────────────
-- Deve retornar 0 linhas. Se retornar qualquer linha, NÃO prossiga para o
-- Passo 2 — a migration vai falhar de qualquer forma, mas investigue a
-- duplicidade antes de decidir o que fazer com ela.
select user_id, chave_sistema, count(*) as ocorrencias
from formas_pagamento
where chave_sistema is not null
group by user_id, chave_sistema
having count(*) > 1;

-- ── PASSO 2 — Migração ──────────────────────────────────────────────────────
alter table formas_pagamento
  add constraint formas_pagamento_user_chave_key
  unique (user_id, chave_sistema);

-- ── PASSO 3 — Validação FINAL ────────────────────────────────────────────────
-- Deve retornar exatamente 1 linha, confirmando que a constraint foi criada
-- com o nome e as colunas esperados.
select
  con.conname as nome_da_constraint,
  con.contype as tipo,
  pg_get_constraintdef(con.oid) as definicao
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname = 'formas_pagamento'
  and con.conname = 'formas_pagamento_user_chave_key';
