-- Migration — ink_implantacao_dados: adiciona coluna auth_user_id
-- Ver: Bloco 2.6A — Integração do Motor de Provisionamento, Etapa 0
-- (auditoria factual, 30/07/2026) e Plano de Implementação (Revisão 2).
--
-- Objetivo: dar à ficha de implantação um campo para guardar o auth_user_id
-- da conta criada manualmente no Supabase Auth, informado pelo administrador
-- antes da aprovação — pré-condição de dados da Etapa 3 (ainda não
-- implementada). Nenhum código da aplicação lê ou escreve esta coluna ainda.
--
-- Por que esta tabela: auditoria de Etapa 0 confirmou, por leitura direta do
-- código, que ink_implantacao_dados é a ficha de pré-tenant (dados reais do
-- responsável/estúdio coletados antes de qualquer conta real existir),
-- chaveada por email, e já é lida no mesmo componente onde fica o botão
-- "Aprovar" (LeadFichaModal.tsx / ImplantacaoResumo.tsx). Nenhuma evidência de
-- que auth_user_id devesse ficar em outra tabela — a única tabela que já usa
-- esse campo hoje (ink_clientes) só passa a existir depois da aprovação.
--
-- Migration exclusivamente aditiva: coluna nova, nullable, sem valor padrão,
-- sem constraint de unicidade ou chave estrangeira. Nenhuma linha existente é
-- alterada — todas as linhas atuais simplesmente ganham auth_user_id = NULL.
--
-- Este script é destinado a ser executado UMA ÚNICA VEZ, manualmente, no SQL
-- Editor do Supabase.

-- ── PASSO 1 — Relatório PRÉVIO ──────────────────────────────────────────────
-- Deve retornar 0 linhas — confirma que a coluna ainda não existe nesta
-- tabela. Se retornar qualquer linha, NÃO prossiga para o Passo 2.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ink_implantacao_dados'
  and column_name = 'auth_user_id';

-- ── PASSO 2 — Migração ──────────────────────────────────────────────────────
alter table ink_implantacao_dados
  add column auth_user_id uuid;

-- ── PASSO 3 — Relatório FINAL ────────────────────────────────────────────────
-- Deve retornar exatamente 1 linha, confirmando a coluna criada, do tipo
-- uuid, nullable ("YES") e sem valor padrão.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ink_implantacao_dados'
  and column_name = 'auth_user_id';
