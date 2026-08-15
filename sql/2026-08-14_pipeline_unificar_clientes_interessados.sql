-- Migração — Bloco de Unificação da Entrada de Clientes Interessados no Pipeline
-- Ver: Auditoria Pré-Implementação (2026-08-14), Auditoria Pós-Implementação
-- do mesmo bloco, Revisão Técnica Complementar (2026-08-14, item 3) e
-- docs/05-unificacao-clientes-interessados.md.
--
-- Objetivo: as etapas "lead_morno" (Solicitação de Consulta) e "aura_agend"
-- (Solicitação de Sessão) deixam de existir como colunas do Pipeline.
-- Consolidadas em "lead" (relabelada para "Clientes interessados" em
-- pipeline_etapas). O código (lib/tenant/pipelinePadrao.js, CRM, api/lead.js,
-- api/chat.js, api/config.js) já foi implementado e testado ANTES desta
-- migração -- o CRM tem uma normalização client-side que faz esses clientes
-- APARECEREM em "lead" no Kanban assim que a tela carrega, mas (desde a
-- Revisão Técnica Complementar, 2026-08-14) essa normalização é SÓ visual --
-- não grava nada no banco pra lead_morno/aura_agend. Este script SQL, revisado
-- e executado manualmente, é o ÚNICO responsável pela migração de verdade
-- desses dois identificadores no banco.
--
-- NÃO EXECUTAR AUTOMATICAMENTE. Destinado a rodar UMA ÚNICA VEZ, manualmente,
-- no SQL Editor do Supabase, depois de você revisar e aprovar.
--
-- ── ISOLAMENTO POR TENANT (Revisão Técnica Complementar, 2026-08-14, item 3) ──
-- A versão anterior deste script justificava isolamento "implícito" (filtros
-- só por etapa/slug, nunca por user_id). Isso foi considerado insuficiente:
-- não é uma prova, é uma inferência sobre o efeito colateral dos filtros.
-- Esta versão torna o isolamento EXPLÍCITO:
--   - descobre a lista de tenants afetados (clientes.user_id com etapa ou
--     item de projetos[] em lead_morno/aura_agend) ANTES de mexer em
--     qualquer coisa;
--   - pra CADA tenant afetado, confirma que ELE MESMO (não outro tenant)
--     possui sua própria linha "lead" em pipeline_etapas -- se um tenant
--     afetado não tiver, a migração inteira aborta e desfaz tudo (nenhuma
--     etapa "lead" de outro estúdio pode ser usada pra validar esse tenant);
--   - todo UPDATE de clientes/projetos e todo UPDATE/DELETE de
--     pipeline_etapas deste script é filtrado também por user_id = tenant
--     da iteração atual, além do filtro por etapa/slug;
--   - o relatório prévio e o relatório final são impressos POR TENANT (um
--     bloco de RAISE NOTICE por user_id), não só um total agregado.
-- O script continua genérico pra QUALQUER tenant que hoje tenha clientes ou
-- projetos em lead_morno/aura_agend -- nenhum user_id é fixado no código
-- (nem do Laboratório, nem de nenhum dos 19 clientes reais confirmados na
-- Auditoria Pré-Implementação). A lista de tenants afetados é descoberta em
-- tempo de execução, a partir do próprio banco.
--
-- Todo o script roda dentro de um único bloco transacional (do $$ ... $$).
-- Qualquer RAISE EXCEPTION aborta e desfaz TUDO que o bloco já tiver feito
-- até aquele ponto -- inclusive tenants já migrados com sucesso nesta MESMA
-- execução, se um tenant seguinte falhar a checagem. É proposital: ou a
-- migração completa para todos os tenants afetados é aplicada, ou nenhuma é
-- (tudo-ou-nada), pra nunca deixar o banco num estado parcialmente migrado.
--
-- Nada além do campo "etapa" (e "etapa_desde", pra manter o relógio de
-- "tempo na etapa" consistente com a correção equivalente já feita no CRM)
-- é tocado em "clientes". "projetos" só tem o sub-campo "etapa" de itens
-- afetados reescrito, sempre dentro da própria linha do cliente (nunca
-- comparando ou movendo dado entre clientes) -- todo o resto de cada
-- projeto (descrição, valor, status, id, imagens, criadoEm) é preservado
-- byte a byte. Etapas customizadas (slug != 'lead'/'lead_morno'/'aura_agend')
-- de qualquer tenant nunca são tocadas. Nenhum cliente, projeto, imagem,
-- referência, origem ou histórico é apagado por este script.

do $migracao$
declare
  tenants_afetados uuid[];
  tenant_id uuid;
  possui_lead_proprio boolean;
  qtd_lead_antes int;
  qtd_lead_morno_antes int;
  qtd_aura_agend_antes int;
  qtd_clientes_projetos_afetados int;
  qtd_clientes_migrados int;
  qtd_projetos_migrados int;
  qtd_residual_clientes int;
  qtd_residual_projetos int;
  qtd_etapas_removidas int;
  total_tenants_migrados int := 0;
  total_clientes_migrados int := 0;
  total_etapas_removidas int := 0;
begin

  -- ── PASSO 1 — Descobre os tenants afetados, sem fixar nenhum user_id ─────
  -- Um tenant é "afetado" se tiver ao menos um cliente com etapa em
  -- lead_morno/aura_agend, OU ao menos um item dentro de projetos[] com essa
  -- etapa (mesmo que a etapa do cliente em si já seja outra).
  select array_agg(distinct c.user_id) into tenants_afetados
  from clientes c
  where c.etapa in ('lead_morno', 'aura_agend')
     or exists (
       select 1 from jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as elem
       where elem->>'etapa' in ('lead_morno', 'aura_agend')
     );

  if tenants_afetados is null or array_length(tenants_afetados, 1) is null then
    raise notice 'Nenhum tenant com clientes/projetos em lead_morno/aura_agend encontrado -- nada a migrar. Migração encerrada sem alterações.';
    return;
  end if;

  raise notice '── TENANTS AFETADOS: % ──', array_length(tenants_afetados, 1);

  -- ── PASSO 2 — Migra tenant por tenant, cada um isolado do outro ──────────
  foreach tenant_id in array tenants_afetados
  loop

    -- 2a. Confirma que ESTE tenant (não outro) tem sua própria etapa "lead"
    -- em pipeline_etapas. Se não tiver, aborta a transação INTEIRA -- nenhum
    -- lead de outro estúdio pode suprir essa validação.
    select exists(
      select 1 from pipeline_etapas where user_id = tenant_id and slug = 'lead'
    ) into possui_lead_proprio;

    if not possui_lead_proprio then
      raise exception 'Abortando e desfazendo tudo: tenant % tem cliente(s)/projeto(s) em lead_morno/aura_agend mas NÃO possui etapa "lead" própria em pipeline_etapas. Nenhuma etapa "lead" de outro tenant pode validar isso -- verifique o provisionamento desse tenant antes de migrar.', tenant_id;
    end if;

    -- 2b. Relatório PRÉVIO, só deste tenant.
    select count(*) into qtd_lead_antes from clientes where user_id = tenant_id and etapa = 'lead';
    select count(*) into qtd_lead_morno_antes from clientes where user_id = tenant_id and etapa = 'lead_morno';
    select count(*) into qtd_aura_agend_antes from clientes where user_id = tenant_id and etapa = 'aura_agend';
    select count(*) into qtd_clientes_projetos_afetados
    from clientes c
    where c.user_id = tenant_id
      and exists (
        select 1 from jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as elem
        where elem->>'etapa' in ('lead_morno', 'aura_agend')
      );

    raise notice '── TENANT % — RELATÓRIO PRÉVIO ──', tenant_id;
    raise notice '  Clientes em lead: %', qtd_lead_antes;
    raise notice '  Clientes em lead_morno (serão migrados): %', qtd_lead_morno_antes;
    raise notice '  Clientes em aura_agend (serão migrados): %', qtd_aura_agend_antes;
    raise notice '  Clientes com item(ns) de projetos[] afetado(s): %', qtd_clientes_projetos_afetados;

    -- 2c. Move clientes.etapa -- só deste tenant.
    update clientes
    set etapa = 'lead',
        etapa_desde = now()
    where user_id = tenant_id
      and etapa in ('lead_morno', 'aura_agend');
    get diagnostics qtd_clientes_migrados = row_count;

    -- 2d. Reescreve a etapa dentro de projetos[] -- sempre dentro da própria
    -- linha do cliente (join só por c.id, nunca comparando/movendo dado
    -- entre clientes), e sempre filtrado por user_id = tenant_id. Mesmo
    -- padrão de sql/2026-07-25_migracao_status_projeto_ativo.sql: preserva a
    -- ordem e todos os demais campos de cada projeto (inclusive projetos não
    -- afetados) inalterados.
    with corrigidos as (
      select
        c.id,
        jsonb_agg(
          case when t.elem->>'etapa' in ('lead_morno', 'aura_agend')
            then jsonb_set(t.elem, '{etapa}', '"lead"'::jsonb)
            else t.elem
          end
          order by t.ord
        ) as novos_projetos
      from clientes c
      cross join lateral jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) with ordinality as t(elem, ord)
      where c.user_id = tenant_id
        and exists (
          select 1
          from jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as e2
          where e2->>'etapa' in ('lead_morno', 'aura_agend')
        )
      group by c.id
    )
    update clientes
    set projetos = corrigidos.novos_projetos
    from corrigidos
    where clientes.id = corrigidos.id
      and clientes.user_id = tenant_id;
    get diagnostics qtd_projetos_migrados = row_count;

    -- 2e. Checagem de segurança -- só deste tenant. Se sobrar QUALQUER
    -- resíduo, aborta e desfaz TUDO (a transação inteira, incluindo tenants
    -- já migrados nesta mesma execução) -- os passos 2f/2g (que mexem em
    -- pipeline_etapas) nunca rodam pra este tenant.
    select count(*) into qtd_residual_clientes
    from clientes where user_id = tenant_id and etapa in ('lead_morno', 'aura_agend');
    select count(*) into qtd_residual_projetos
    from clientes c
    cross join lateral jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as elem
    where c.user_id = tenant_id and elem->>'etapa' in ('lead_morno', 'aura_agend');

    if qtd_residual_clientes > 0 then
      raise exception 'Abortando e desfazendo tudo: tenant % ainda com % cliente(s) em lead_morno/aura_agend depois da migração.', tenant_id, qtd_residual_clientes;
    end if;
    if qtd_residual_projetos > 0 then
      raise exception 'Abortando e desfazendo tudo: tenant % ainda com % item(ns) de projetos[] em lead_morno/aura_agend depois da migração.', tenant_id, qtd_residual_projetos;
    end if;

    -- 2f. Relabela "lead" pra "Clientes interessados" -- só a linha deste
    -- tenant. Etapas customizadas deste ou de qualquer outro tenant nunca
    -- são tocadas (filtro por slug='lead' E user_id=tenant_id).
    update pipeline_etapas
    set label = 'Clientes interessados'
    where user_id = tenant_id and slug = 'lead';

    -- 2g. Remove lead_morno/aura_agend de pipeline_etapas -- só as linhas
    -- deste tenant. Só chega aqui se o passo 2e confirmou que este tenant
    -- especificamente não depende mais dessas duas etapas.
    delete from pipeline_etapas where user_id = tenant_id and slug in ('lead_morno', 'aura_agend');
    get diagnostics qtd_etapas_removidas = row_count;

    raise notice '── TENANT % — RELATÓRIO FINAL ──', tenant_id;
    raise notice '  Clientes migrados (etapa lead_morno/aura_agend -> lead): %', qtd_clientes_migrados;
    raise notice '  Clientes com projetos[] corrigido: %', qtd_projetos_migrados;
    raise notice '  Linhas removidas de pipeline_etapas (lead_morno + aura_agend, só deste tenant): %', qtd_etapas_removidas;
    raise notice '  Residual pós-migração (deveria ser 0 e 0): % clientes, % projetos', qtd_residual_clientes, qtd_residual_projetos;

    total_tenants_migrados := total_tenants_migrados + 1;
    total_clientes_migrados := total_clientes_migrados + qtd_clientes_migrados;
    total_etapas_removidas := total_etapas_removidas + qtd_etapas_removidas;

  end loop;

  raise notice '── RESUMO GERAL (soma de todos os tenants migrados nesta execução) ──';
  raise notice 'Tenants migrados: %', total_tenants_migrados;
  raise notice 'Total de clientes migrados: %', total_clientes_migrados;
  raise notice 'Total de linhas removidas de pipeline_etapas: %', total_etapas_removidas;
  raise notice 'Migração concluída com sucesso para todos os tenants afetados.';

end $migracao$;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente) ───────────────────
-- Deve retornar 0 linhas nas duas consultas abaixo, pra qualquer user_id.
-- select id, user_id, nome, etapa from clientes where etapa in ('lead_morno', 'aura_agend');
-- select id, user_id, nome from clientes c
--   where exists (select 1 from jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as e where e->>'etapa' in ('lead_morno','aura_agend'));
--
-- Deve retornar 0 linhas (as duas etapas não existem mais em nenhum tenant).
-- select * from pipeline_etapas where slug in ('lead_morno', 'aura_agend');
--
-- Deve mostrar "Clientes interessados" pra todo tenant que tinha algo migrado.
-- select user_id, label from pipeline_etapas where slug = 'lead';
