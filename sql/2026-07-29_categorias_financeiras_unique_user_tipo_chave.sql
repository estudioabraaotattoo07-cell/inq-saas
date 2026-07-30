-- Migration 003A — categorias_financeiras: UNIQUE (user_id, tipo, chave_sistema)
-- Ver: Bloco 2 — Criação Automática do Estúdio / Auditoria de Impacto das
-- Migrations (29/07/2026). Migrations 001 (pipeline_etapas) e 002
-- (ink_clientes) já aplicadas com sucesso antes desta.
--
-- Contexto: a Migration 003 original cobria categorias_financeiras,
-- formas_pagamento e site_conteudo num único bloco defensivo (DO $$), porque
-- não era possível confirmar de antemão quais dessas constraints já
-- existiam. A consulta informativa rodada em 29/07/2026 confirmou que
-- site_conteudo_user_id_key já existe (fica fora do escopo desta migration)
-- e que categorias_financeiras_user_tipo_chave_key e
-- formas_pagamento_user_chave_key NÃO existem. Por isso a 003 foi dividida:
-- esta é a 003A (categorias_financeiras); formas_pagamento fica para a 003B.
--
-- Como já sabemos que a constraint não existe, esta migration não precisa
-- do bloco defensivo DO $$ — é um ADD CONSTRAINT direto, no mesmo padrão das
-- Migrations 001 e 002.
--
-- Objetivo: permitir que o seed das categorias financeiras padrão continue
-- sendo feito por UPSERT com onConflict:"user_id,tipo,chave_sistema" e
-- ignoreDuplicates:true, de forma idempotente e agora com a constraint real
-- garantindo isso no banco (antes, o comportamento correto observado em
-- produção dependia de nunca ter havido uma tentativa real de duplicata).
--
-- Nota sobre NULL: chave_sistema é opcional (nullable). Uma constraint
-- UNIQUE do Postgres trata cada NULL como distinto dos demais — múltiplas
-- categorias com chave_sistema NULL para o mesmo user_id (categorias criadas
-- manualmente pelo tenant, fora do seed padrão) continuam permitidas.
--
-- Esta migration é independente de todas as demais.
--
-- Este script é destinado a ser executado UMA ÚNICA VEZ, manualmente, no SQL
-- Editor do Supabase.

-- ── PASSO 1 — Relatório PRÉVIO ──────────────────────────────────────────────
-- Deve retornar 0 linhas. Se retornar qualquer linha, NÃO prossiga para o
-- Passo 2 — a migration vai falhar de qualquer forma, mas investigue a
-- duplicidade antes de decidir o que fazer com ela.
select user_id, tipo, chave_sistema, count(*) as ocorrencias
from categorias_financeiras
where chave_sistema is not null
group by user_id, tipo, chave_sistema
having count(*) > 1;

-- ── PASSO 2 — Migração ──────────────────────────────────────────────────────
alter table categorias_financeiras
  add constraint categorias_financeiras_user_tipo_chave_key
  unique (user_id, tipo, chave_sistema);

-- ── PASSO 3 — Validação FINAL ────────────────────────────────────────────────
-- Deve retornar exatamente 1 linha, confirmando que a constraint foi criada
-- com o nome e as colunas esperados.
select
  con.conname as nome_da_constraint,
  con.contype as tipo,
  pg_get_constraintdef(con.oid) as definicao
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname = 'categorias_financeiras'
  and con.conname = 'categorias_financeiras_user_tipo_chave_key';
