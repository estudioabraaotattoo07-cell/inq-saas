-- Migration — site_conteudo: adiciona coluna banner_botao_texto
-- Ver: Bloco 1 — Aura 1.0 (Laboratório P&D), item "CTA Final" (revisão da
-- Auditoria Pós-Implementação, 2026-08-03).
--
-- Objetivo: dar ao banner do Meu Site um botão configurável (CTA Final),
-- seguindo exatamente o mesmo padrão já usado por hero_botao_texto — texto
-- livre, com fallback de app quando vazio ("Quero tatuar com vocês!"), sem
-- exigir preenchimento.
--
-- Por que esta tabela: site_conteudo já é a tabela de conteúdo editável do
-- Meu Site (hero_foto_url, hero_frase, banner_titulo, banner_texto, etc.),
-- upsert por user_id via CRM Casa dos Carvalho.tsx. O botão do banner é
-- conceitualmente o mesmo tipo de campo que os demais desta tabela — nenhuma
-- evidência de que devesse ficar em outro lugar.
--
-- Migration exclusivamente aditiva: coluna nova, nullable, sem valor padrão,
-- sem constraint. Nenhuma linha existente é alterada — todas as linhas atuais
-- simplesmente ganham banner_botao_texto = NULL (o app já trata isso como
-- "usar o texto padrão").
--
-- Este script é destinado a ser executado UMA ÚNICA VEZ, manualmente, no SQL
-- Editor do Supabase — ANTES do deploy do código que passa a enviar este
-- campo no upsert da aba Meu Site (sem a coluna existente, o Supabase rejeita
-- silenciosamente o upsert inteiro, não só este campo).

-- ── PASSO 1 — Relatório PRÉVIO ──────────────────────────────────────────────
-- Deve retornar 0 linhas — confirma que a coluna ainda não existe nesta
-- tabela. Se retornar qualquer linha, NÃO prossiga para o Passo 2.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'site_conteudo'
  and column_name = 'banner_botao_texto';

-- ── PASSO 2 — Migração ──────────────────────────────────────────────────────
alter table site_conteudo
  add column banner_botao_texto text;

-- ── PASSO 3 — Relatório FINAL ────────────────────────────────────────────────
-- Deve retornar exatamente 1 linha, confirmando a coluna criada, do tipo
-- text, nullable ("YES") e sem valor padrão.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'site_conteudo'
  and column_name = 'banner_botao_texto';
