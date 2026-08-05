-- Migration (registro histórico) — agendamentos_pendentes.cliente_id: text → uuid
-- Ver: Grupo B — Cliente Recorrente, Deduplicação e Continuidade de Atendimento,
-- Bloco B.1 (Inventário das Colisões) e a Auditoria do Achado Estrutural (Tipos
-- de Dados) de 2026-08-04.
--
-- ⚠ ESTE SCRIPT JÁ FOI EXECUTADO MANUALMENTE NO SUPABASE DURANTE A AUDITORIA.
-- ⚠ NÃO EXECUTAR O PASSO 2 NOVAMENTE. Este arquivo existe apenas para que o
-- ⚠ histórico do repositório reflita o estado real do banco de produção —
-- ⚠ é sincronização, não uma migration pendente.
--
-- Contexto: ao montar a consulta de diagnóstico do Bloco B.1 (Passo A1, que
-- compara clientes.id com o cliente_id de agenda/financeiro/
-- agendamentos_pendentes/eventos_trafego), o Postgres retornou o erro 42883
-- "operator does not exist: text = uuid" na subquery de
-- agendamentos_pendentes. A investigação confirmou que clientes.id, e o
-- cliente_id de agenda, financeiro e eventos_trafego já eram uuid — apenas
-- agendamentos_pendentes.cliente_id havia sido criada como text (tabela
-- adicionada ao schema depois do baseline original, provavelmente pelo Table
-- Editor do Supabase, sem fixar o tipo uuid).
--
-- Antes de alterar, foi confirmado que a tabela estava com 0 registros — ou
-- seja, não havia nenhum cliente_id existente para converter, e portanto
-- nenhum risco de perda ou corrupção de dado nesta alteração.
--
-- Nenhuma lógica de aplicação foi alterada. O código já grava/lê
-- agendamentos_pendentes.cliente_id como uma string de uuid (ex.:
-- api/chat.js, CRM Casa dos Carvalho.tsx) — via Supabase-js/PostgREST, que já
-- fazia a conversão de tipo automaticamente na camada HTTP, então o
-- comportamento observável da aplicação não muda. O que muda é que o schema
-- do banco passa a ser internamente consistente, e SQL bruto (fora do
-- PostgREST) que compare as duas colunas passa a funcionar sem cast.

-- ── PASSO 1 — Relatório PRÉVIO (executado durante a auditoria) ──────────────
-- Confirmou tipo `text` na coluna e 0 registros na tabela.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'agendamentos_pendentes'
  and column_name = 'cliente_id';

select count(*) as total_registros
from agendamentos_pendentes;

-- ── PASSO 2 — Alteração de tipo (JÁ EXECUTADO — não executar novamente) ─────
-- alter table agendamentos_pendentes
--   alter column cliente_id type uuid
--   using cliente_id::uuid;

-- ── PASSO 3 — Relatório FINAL (somente leitura, seguro para conferência) ────
-- Confirma o estado atual — deve retornar `uuid` para as 5 colunas do
-- domínio de Clientes.
select table_name, column_name, data_type
from information_schema.columns
where (table_name = 'clientes' and column_name = 'id')
   or (table_name in ('agenda', 'financeiro', 'agendamentos_pendentes', 'eventos_trafego')
       and column_name = 'cliente_id')
order by table_name;
