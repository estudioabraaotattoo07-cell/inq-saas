-- Fotografia (snapshot) pré-migration — Unificação de Clientes Interessados
-- Ver: sql/2026-08-14_pipeline_unificar_clientes_interessados.sql (migration
-- principal, ainda não executada) e
-- sql/2026-08-15_auditoria_pre_migration_clientes_interessados.sql (auditoria
-- de leitura irmã deste arquivo).
--
-- OBJETIVO: capturar, de forma estruturada e EXPORTÁVEL, o estado exato de
-- tudo que a migration principal vai alterar -- ANTES dela rodar -- para que
-- seja possível reconstruir manualmente o estado anterior se um dia for
-- necessário reverter. Isso responde à ausência de um mecanismo de reversão
-- automática depois de uma execução bem-sucedida (só existe rollback
-- automático DURANTE uma execução que falha, dentro da própria transação da
-- migration -- ver cabeçalho daquele arquivo).
--
-- ESTRITAMENTE DE LEITURA. Nenhuma linha deste arquivo contém INSERT,
-- UPDATE, DELETE, ALTER, DROP, TRUNCATE, CREATE ou qualquer outro comando
-- que altere o banco. Só SELECT.
--
-- ESTE ARQUIVO É MANUAL. Não é executado por deploy, build, Vercel, cron,
-- hook ou qualquer caminho da aplicação -- só roda se alguém copiar o
-- conteúdo e colar manualmente no SQL Editor do Supabase.
--
-- DIFERENÇA DE PROPÓSITO EM RELAÇÃO AO ARQUIVO DE AUDITORIA: aquele usa
-- blocos "do $$ ... raise notice ... end $$" -- ótimo para leitura humana no
-- painel de Logs/Notices, mas o resultado ali é só texto de log, não pode
-- ser exportado como CSV/JSON pelo SQL Editor. Este arquivo, ao contrário,
-- é feito só de SELECT puros -- a única forma de conseguir usar o botão de
-- exportação do Supabase sobre cada resultado.
--
-- ── INSTRUÇÕES DE EXPORTAÇÃO (rodar manualmente, quando autorizado) ──────────
-- 1. Rode a CONSULTA 0 primeiro (informativa) só para conferir que os nomes
--    de coluna presumidos abaixo (id, user_id, nome, etapa, etapa_desde,
--    projetos, slug, label, cor, emoji, ordem, fixo) realmente existem no
--    banco -- se algo divergir, PARE e não confie no restante do arquivo.
-- 2. Rode a CONSULTA 1 sozinha. Espere o resultado aparecer na grade. Clique
--    em "Export" (canto da grade de resultado) e salve como
--    "01-tenants-afetados.csv" (ou .json).
-- 3. Repita o mesmo processo, um de cada vez, para as CONSULTAS 2, 3 e 4,
--    salvando "02-pipeline-etapas.csv", "03-clientes-afetados.csv" e
--    "04-hash-integridade.csv" -- NUNCA rode duas consultas de uma vez só
--    esperando exportar as duas: o SQL Editor mostra só o resultado da
--    última consulta executada no bloco.
-- 4. Guarde os 4 arquivos exportados junto com o valor do hash da
--    CONSULTA 4, fora do banco de dados (numa pasta local, por exemplo) --
--    esse é o ponto inteiro de ser uma fotografia externa e independente.

-- ── CONSULTA 0 (informativa, rodar primeiro) — Colunas reais confirmadas ────
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name in ('clientes', 'pipeline_etapas')
order by table_name, ordinal_position;

-- ── CONSULTA 1 — Todos os tenants afetados pela migration principal ─────────
-- Mesmos 4 critérios usados pela migration/auditoria: cliente com etapa
-- antiga; cliente com item de projetos[] em etapa antiga; linha de
-- pipeline_etapas com slug antigo; linha "lead" com label desatualizado.
select distinct uid as tenant_afetado
from (
  select user_id as uid from public.clientes where etapa in ('lead_morno', 'aura_agend')
  union
  select c.user_id as uid from public.clientes c
  where c.projetos is not null and jsonb_typeof(c.projetos) = 'array'
    and exists (
      select 1 from jsonb_array_elements(c.projetos) as e
      where e->>'etapa' in ('lead_morno', 'aura_agend')
    )
  union
  select user_id as uid from public.pipeline_etapas where slug in ('lead_morno', 'aura_agend')
  union
  select user_id as uid from public.pipeline_etapas where slug = 'lead' and label is distinct from 'Clientes interessados'
) t
where uid is not null
order by tenant_afetado;

-- ── CONSULTA 2 — Linhas COMPLETAS de pipeline_etapas para lead/lead_morno/aura_agend ──
-- Cobre, ao mesmo tempo: o label ANTERIOR da etapa "lead" (pra saber o que
-- restaurar se precisar desfazer o passo "renomear label"); e o conteúdo
-- integral das duas linhas que a migration vai remover (id, slug, label,
-- cor, emoji, ordem, fixo, user_id) -- necessário pra recriar exatamente
-- essas linhas, com os mesmos valores, se um dia for preciso reverter.
select *
from public.pipeline_etapas
where slug in ('lead', 'lead_morno', 'aura_agend')
order by user_id, ordem;

-- ── CONSULTA 3 — Clientes afetados, linha completa ──────────────────────────
-- Todo cliente que a migration vai tocar: ou porque etapa está diretamente
-- em lead_morno/aura_agend, ou porque tem pelo menos um item de projetos[]
-- nessas etapas (a migration reescreve os dois casos). select * garante que
-- id, user_id, etapa, etapa_desde, projetos e qualquer outro campo do
-- cliente fiquem preservados na fotografia, não só os campos que a
-- migration toca.
select *
from public.clientes c
where c.etapa in ('lead_morno', 'aura_agend')
   or (
     c.projetos is not null and jsonb_typeof(c.projetos) = 'array'
     and exists (
       select 1 from jsonb_array_elements(c.projetos) as e
       where e->>'etapa' in ('lead_morno', 'aura_agend')
     )
   )
order by c.user_id, c.nome;

-- ── CONSULTA 4 — Hash (impressão digital) de integridade da fotografia ─────
-- Usa md5(), função NATIVA do núcleo do PostgreSQL -- não depende de
-- nenhuma extensão (ao contrário de digest()/pgcrypto, cuja disponibilidade
-- não foi confirmada neste ambiente). Funciona em qualquer banco
-- Postgres/Supabase sem pré-requisito.
--
-- Agrega, em ordem determinística, a representação textual de cada linha
-- capturada nas CONSULTAS 2 e 3, e calcula um único hash sobre esse texto
-- concatenado. Anote o valor retornado junto com os 3 arquivos exportados
-- acima -- ele é a prova de que aquele conjunto de arquivos corresponde
-- exatamente a este momento. LIMITAÇÃO HONESTA: row(...)::text é estável
-- dentro da mesma versão/formatação do Postgres, mas não é uma garantia
-- criptográfica de imutabilidade byte a byte entre versões diferentes do
-- banco -- serve como impressão digital de comparação (detecta se algo
-- mudou), não como assinatura criptográfica forte.
select md5(string_agg(linha, '|' order by linha)) as hash_fotografia
from (
  select (row(pe.*)::text) as linha
  from public.pipeline_etapas pe
  where pe.slug in ('lead', 'lead_morno', 'aura_agend')
  union all
  select (row(c.*)::text) as linha
  from public.clientes c
  where c.etapa in ('lead_morno', 'aura_agend')
     or (
       c.projetos is not null and jsonb_typeof(c.projetos) = 'array'
       and exists (
         select 1 from jsonb_array_elements(c.projetos) as e
         where e->>'etapa' in ('lead_morno', 'aura_agend')
       )
     )
) linhas;
