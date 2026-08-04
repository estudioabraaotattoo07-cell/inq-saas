-- Migration — clientes: adiciona chave_dedup + UNIQUE(user_id, chave_dedup)
-- Ver: Grupo B — Cliente Recorrente, Deduplicação e Continuidade de Atendimento
-- (Aura 1.0, Laboratório P&D), Auditoria Pré-Implementação de 2026-08-04.
--
-- Objetivo: eliminar definitivamente a possibilidade de dois registros de
-- clientes serem criados para a mesma pessoa (mesmo telefone + mesmo
-- primeiro nome) mesmo sob concorrência real (duas requisições quase
-- simultâneas). A proteção atual (função primeiroNome() em api/lead.js)
-- só existe em memória da aplicação — não impede duas requisições
-- concorrentes de passarem pela mesma checagem "não existe" ao mesmo tempo.
-- Com esta constraint, o próprio Postgres passa a rejeitar a segunda
-- gravação, permitindo o uso de upsert com
-- { onConflict: "user_id,chave_dedup", ignoreDuplicates: true } — mesmo
-- padrão já usado neste projeto em pipeline_etapas (user_id, slug).
--
-- chave_dedup = <telefone, só dígitos, últimos 11> || '|' || <primeiro nome,
-- minúsculo, sem espaços nas pontas>. Mesma composição que a comparação já
-- usa hoje em api/lead.js (telDigits + primeiroNome()) — não é um mecanismo
-- novo, é o mesmo critério movido para dentro do banco.
--
-- Preserva de propósito o comportamento atual de telefone compartilhado por
-- pessoas diferentes (ex.: casal, pai/filho): nomes diferentes geram chaves
-- diferentes, portanto continuam sendo registros distintos, sem conflito.
--
-- Limitação conhecida do backfill: a normalização em SQL abaixo (PASSO 2)
-- não remove acentos do primeiro nome (a versão em JavaScript usa
-- .normalize("NFD") para isso; replicar em SQL puro exigiria a extensão
-- unaccent, que pode não estar habilitada neste projeto). Isso só afeta a
-- chave calculada para linhas JÁ EXISTENTES com primeiro nome acentuado —
-- toda chave calculada a partir de agora, pelo código da aplicação, já usa
-- a normalização correta. Na prática, o pior cenário é uma linha antiga com
-- nome acentuado ganhar uma chave que não bate com uma futura tentativa de
-- match vinda da aplicação — resultando em um registro novo sendo criado
-- (mesmo comportamento de hoje), não em erro ou perda de dado.
--
-- Este script é destinado a ser executado UMA ÚNICA VEZ, manualmente, no SQL
-- Editor do Supabase — ANTES do deploy do código que passa a usar
-- chave_dedup no upsert de clientes.

-- ── PASSO 1 — Relatório PRÉVIO ──────────────────────────────────────────────
-- Deve retornar 0 linhas — confirma que a coluna ainda não existe.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'clientes'
  and column_name = 'chave_dedup';

-- ── PASSO 2 — Adiciona a coluna (nullable, aditiva) e faz o backfill ────────
alter table clientes
  add column chave_dedup text;

update clientes
set chave_dedup =
  nullif(regexp_replace(coalesce(tel, ''), '[^0-9]', '', 'g'), '')
  || '|' ||
  lower(trim(split_part(trim(coalesce(nome, '')), ' ', 1)))
where tel is not null and nome is not null and trim(tel) <> '' and trim(nome) <> '';

-- ── PASSO 3 — Relatório de colisões PÓS-backfill ────────────────────────────
-- Deve retornar 0 linhas. Se retornar alguma, são clientes que hoje já
-- ocupam duas linhas para a mesma pessoa (mesmo telefone + mesmo primeiro
-- nome) — resolva manualmente (mesclando ou ajustando) ANTES do Passo 4,
-- porque a constraint vai rejeitar a duplicidade existente.
select user_id, chave_dedup, count(*) as ocorrencias, array_agg(id) as ids
from clientes
where chave_dedup is not null
group by user_id, chave_dedup
having count(*) > 1;

-- ── PASSO 4 — Constraint de unicidade ────────────────────────────────────────
-- Só rode este passo depois de confirmar que o Passo 3 retornou 0 linhas.
alter table clientes
  add constraint clientes_user_chave_dedup_key unique (user_id, chave_dedup);

-- ── PASSO 5 — Relatório FINAL ────────────────────────────────────────────────
-- Deve retornar exatamente 1 linha, confirmando a constraint criada.
select
  con.conname as nome_da_constraint,
  con.contype as tipo,
  pg_get_constraintdef(con.oid) as definicao
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
where rel.relname = 'clientes'
  and con.conname = 'clientes_user_chave_dedup_key';
