-- Migração — Bloco de Unificação da Entrada de Clientes Interessados no Pipeline
-- Ver: Auditoria Pré-Implementação (2026-08-14), Auditoria Pós-Implementação
-- do mesmo bloco, Revisão Técnica Complementar (2026-08-14, item 3) e
-- Correção pós-revisão externa (2026-08-15) em
-- docs/05-unificacao-clientes-interessados.md.
--
-- Objetivo: as etapas "lead_morno" (Solicitação de Consulta) e "aura_agend"
-- (Solicitação de Sessão) deixam de existir como colunas do Pipeline.
-- Consolidadas em "lead" (relabelada para "Clientes interessados" em
-- pipeline_etapas). O código (lib/tenant/pipelinePadrao.js, CRM, api/lead.js,
-- api/chat.js, api/config.js) já foi implementado e testado ANTES desta
-- migração -- o CRM tem uma normalização client-side que faz esses clientes
-- APARECEREM em "lead" no Kanban assim que a tela carrega, mas essa
-- normalização é SÓ visual -- não grava nada no banco pra lead_morno/
-- aura_agend. Este script SQL, revisado e executado manualmente, é o ÚNICO
-- responsável pela migração de verdade desses dois identificadores no banco.
--
-- NÃO EXECUTAR AUTOMATICAMENTE. Destinado a rodar UMA ÚNICA VEZ (mas seguro
-- rodar mais de uma vez -- ver "IDEMPOTÊNCIA" abaixo), manualmente, no SQL
-- Editor do Supabase, depois de você revisar e aprovar.
--
-- ── CORREÇÃO PÓS-REVISÃO EXTERNA (2026-08-15) ─────────────────────────────
-- Uma revisão externa ao conteúdo integral deste arquivo (não só a esta
-- migração em abstrato) encontrou uma falha real na versão anterior: a
-- descoberta de tenants afetados olhava só pra clientes/projetos em
-- lead_morno/aura_agend. Isso deixava de fora um tenant já provisionado que
-- possui linha(s) de pipeline_etapas com lead_morno/aura_agend (ou cujo
-- "lead" ainda tem o label antigo "Lead") mas já não tem NENHUM cliente ou
-- projeto nessas etapas -- por exemplo, um tenant que nunca teve clientes
-- nelas, ou que já teve seus clientes movidos por algum outro processo. Esse
-- tenant manteria as colunas antigas em pipeline_etapas (ou o label antigo)
-- pra sempre, porque nunca seria "descoberto". Corrigido abaixo: a
-- descoberta de tenants agora é a UNIÃO de quatro critérios (ver PASSO 1).
--
-- ── ISOLAMENTO POR TENANT ──────────────────────────────────────────────────
-- Descobre a lista de tenants afetados ANTES de mexer em qualquer coisa. Pra
-- CADA tenant afetado, confirma que ELE MESMO (não outro tenant) possui sua
-- própria linha "lead" em pipeline_etapas -- se um tenant afetado não tiver,
-- a migração inteira aborta e desfaz tudo (nenhuma etapa "lead" de outro
-- estúdio pode ser usada pra validar esse tenant). Todo UPDATE de clientes/
-- projetos e todo UPDATE/DELETE de pipeline_etapas deste script é filtrado
-- também por user_id = tenant da iteração atual, além do filtro por etapa/
-- slug. O relatório prévio e o relatório final são impressos POR TENANT (um
-- bloco de RAISE NOTICE por user_id), não só um total agregado. O script
-- continua genérico pra QUALQUER tenant que hoje se enquadre num dos quatro
-- critérios do PASSO 1 -- nenhum user_id é fixado no código (nem do
-- Laboratório, nem de nenhum dos 19 clientes reais confirmados na Auditoria
-- Pré-Implementação). A lista de tenants afetados é descoberta em tempo de
-- execução, a partir do próprio banco.
--
-- ── SEGURANÇA PARA user_id NULO ────────────────────────────────────────────
-- Antes de montar a lista de tenants (PASSO 0, roda primeiro), o script
-- confere se existe cliente com user_id nulo e etapa antiga, cliente com
-- user_id nulo contendo projeto em etapa antiga, ou linha de pipeline_etapas
-- afetada (slug lead/lead_morno/aura_agend) com user_id nulo. Se existir
-- qualquer um desses casos, aborta com RAISE EXCEPTION ANTES de alterar
-- qualquer coisa -- um registro sem user_id não pode ser atribuído com
-- segurança a nenhum tenant, então nunca é migrado nem ignorado
-- silenciosamente; a migração inteira para até isso ser corrigido
-- manualmente.
--
-- Todo o script roda dentro de um único bloco transacional (do $$ ... $$).
-- Qualquer RAISE EXCEPTION aborta e desfaz TUDO que o bloco já tiver feito
-- até aquele ponto -- inclusive tenants já migrados com sucesso nesta MESMA
-- execução, se um tenant seguinte (ou a checagem global no final) falhar. É
-- proposital: ou a migração completa pra todos os tenants afetados é
-- aplicada, ou nenhuma é (tudo-ou-nada), pra nunca deixar o banco num estado
-- parcialmente migrado.
--
-- ── PÓS-CONDIÇÕES GLOBAIS ──────────────────────────────────────────────────
-- Depois de processar todos os tenants afetados, o script confere -- pra
-- TODO o banco, não só pros tenants processados nesta execução -- que não
-- sobrou nenhum cliente em lead_morno/aura_agend, nenhum item de projetos[]
-- nessas etapas, nenhuma linha de pipeline_etapas com esses dois slugs, e
-- que toda linha de pipeline_etapas com slug='lead' tem label='Clientes
-- interessados'. Qualquer uma dessas condições falhando aborta e desfaz tudo
-- -- essa é também a prova de que a descoberta do PASSO 1 foi completa (se
-- sobrasse algum tenant não descoberto, a checagem global pegaria).
--
-- ── IDEMPOTÊNCIA ────────────────────────────────────────────────────────────
-- Primeira execução: descobre os tenants afetados e aplica a migração
-- neles. Segunda execução (ou qualquer execução seguinte): a descoberta do
-- PASSO 1 não encontra mais nenhum tenant (nenhum cliente/projeto/linha de
-- pipeline_etapas antiga, nenhum label desatualizado) -- o script imprime um
-- aviso de "nada a fazer" e retorna sem alterar absolutamente nada (nenhum
-- UPDATE, nenhum DELETE). Rodar de novo depois de uma migração bem-sucedida
-- não causa erro nem toca em outros dados.
--
-- Nada além do campo "etapa" (e "etapa_desde", pra manter o relógio de
-- "tempo na etapa" consistente com a correção equivalente já feita no CRM)
-- é tocado em "clientes". "projetos" só tem o sub-campo "etapa" de itens
-- afetados reescrito, sempre dentro da própria linha do cliente (nunca
-- comparando ou movendo dado entre clientes) -- todo o resto de cada
-- projeto (descrição, valor, status, id, imagens, criadoEm) é preservado
-- SEMANTICAMENTE: mesma ordem, mesmos campos, mesmos valores, conteúdo não
-- afetado inalterado. (Não "byte a byte" -- jsonb_agg/jsonb_set reconstroem
-- o array JSONB; Postgres não garante que a representação textual armazenada
-- depois seja idêntica caractere por caractere à anterior, só que o
-- conteúdo/estrutura lógica é equivalente onde não deveria mudar.) Etapas
-- customizadas (slug != 'lead'/'lead_morno'/'aura_agend') de qualquer tenant
-- nunca são tocadas. Nenhum cliente, projeto, imagem, referência, origem ou
-- histórico é apagado por este script.

do $migracao$
declare
  qtd_null_clientes_etapa int;
  qtd_null_clientes_projetos int;
  qtd_null_pipeline_etapas int;
  tenants_afetados uuid[];
  tenant_id uuid;
  possui_lead_proprio boolean;
  qtd_lead_antes int;
  qtd_lead_morno_antes int;
  qtd_aura_agend_antes int;
  qtd_clientes_projetos_afetados int;
  qtd_pipeline_etapas_antigas_antes int;
  label_lead_antes text;
  qtd_clientes_migrados int;
  qtd_projetos_migrados int;
  qtd_residual_clientes int;
  qtd_residual_projetos int;
  qtd_etapas_removidas int;
  total_tenants_migrados int := 0;
  total_clientes_migrados int := 0;
  total_etapas_removidas int := 0;
  qtd_residual_clientes_global int;
  qtd_residual_projetos_global int;
  qtd_residual_pipeline_etapas_global int;
  qtd_lead_label_incorreto_global int;
begin

  -- ── PASSO 0 — Segurança pra user_id nulo (roda ANTES de tudo) ────────────
  select count(*) into qtd_null_clientes_etapa
  from clientes where user_id is null and etapa in ('lead_morno', 'aura_agend');

  select count(*) into qtd_null_clientes_projetos
  from clientes c
  where c.user_id is null
    and exists (
      select 1 from jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as elem
      where elem->>'etapa' in ('lead_morno', 'aura_agend')
    );

  select count(*) into qtd_null_pipeline_etapas
  from pipeline_etapas
  where user_id is null and slug in ('lead', 'lead_morno', 'aura_agend');

  if qtd_null_clientes_etapa > 0 or qtd_null_clientes_projetos > 0 or qtd_null_pipeline_etapas > 0 then
    raise exception 'Abortando ANTES de qualquer alteração: encontrado(s) registro(s) com user_id NULO relacionados a lead_morno/aura_agend -- % cliente(s) com etapa antiga, % cliente(s) com projeto em etapa antiga, % linha(s) de pipeline_etapas afetada(s). Um registro sem user_id não pode ser atribuído com segurança a nenhum tenant -- corrija manualmente antes de rodar esta migração.', qtd_null_clientes_etapa, qtd_null_clientes_projetos, qtd_null_pipeline_etapas;
  end if;

  -- ── PASSO 1 — Descobre os tenants afetados (união de 4 critérios) ────────
  -- Correção pós-revisão externa (2026-08-15): um tenant é "afetado" se
  -- QUALQUER um destes for verdade -- não só ter clientes/projetos em
  -- lead_morno/aura_agend:
  --   1. cliente com etapa em lead_morno/aura_agend;
  --   2. cliente com item de projetos[] em lead_morno/aura_agend;
  --   3. linha de pipeline_etapas com slug lead_morno/aura_agend (mesmo sem
  --      nenhum cliente/projeto usando essas etapas);
  --   4. linha de pipeline_etapas com slug='lead' cujo label ainda não é
  --      'Clientes interessados' (mesmo sem nenhum cliente/projeto afetado).
  select array_agg(distinct uid) into tenants_afetados
  from (
    select user_id as uid from clientes where etapa in ('lead_morno', 'aura_agend')
    union
    select c.user_id as uid from clientes c
    where exists (
      select 1 from jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as elem
      where elem->>'etapa' in ('lead_morno', 'aura_agend')
    )
    union
    select user_id as uid from pipeline_etapas where slug in ('lead_morno', 'aura_agend')
    union
    select user_id as uid from pipeline_etapas where slug = 'lead' and label is distinct from 'Clientes interessados'
  ) descoberta
  where uid is not null; -- defensivo: PASSO 0 já teria abortado se houvesse nulo relevante

  if tenants_afetados is null or array_length(tenants_afetados, 1) is null then
    raise notice 'Nenhum tenant afetado encontrado (nenhum cliente/projeto em lead_morno/aura_agend, nenhuma linha antiga de pipeline_etapas, nenhum label desatualizado) -- nada a fazer. Migração encerrada sem alterações.';
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
      raise exception 'Abortando e desfazendo tudo: tenant % foi identificado como afetado mas NÃO possui etapa "lead" própria em pipeline_etapas. Nenhuma etapa "lead" de outro tenant pode validar isso -- verifique o provisionamento desse tenant antes de migrar.', tenant_id;
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
    select count(*) into qtd_pipeline_etapas_antigas_antes
    from pipeline_etapas where user_id = tenant_id and slug in ('lead_morno', 'aura_agend');
    select label into label_lead_antes
    from pipeline_etapas where user_id = tenant_id and slug = 'lead';

    raise notice '── TENANT % — RELATÓRIO PRÉVIO ──', tenant_id;
    raise notice '  Clientes em lead: %', qtd_lead_antes;
    raise notice '  Clientes em lead_morno (serão migrados): %', qtd_lead_morno_antes;
    raise notice '  Clientes em aura_agend (serão migrados): %', qtd_aura_agend_antes;
    raise notice '  Clientes com item(ns) de projetos[] afetado(s): %', qtd_clientes_projetos_afetados;
    raise notice '  Linhas de pipeline_etapas lead_morno/aura_agend (serão removidas): %', qtd_pipeline_etapas_antigas_antes;
    raise notice '  Label atual de "lead": %', label_lead_antes;

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
    -- padrão de sql/2026-07-25_migracao_status_projeto_ativo.sql: preserva
    -- semanticamente a ordem e todos os demais campos de cada projeto
    -- (inclusive projetos não afetados).
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
    -- são tocadas (filtro por slug='lead' E user_id=tenant_id). Roda mesmo
    -- quando este tenant só foi descoberto pelo critério 3 ou 4 do PASSO 1
    -- (zero clientes/projetos afetados) -- é exatamente o caso que a
    -- correção pós-revisão externa passou a cobrir.
    update pipeline_etapas
    set label = 'Clientes interessados'
    where user_id = tenant_id and slug = 'lead' and label is distinct from 'Clientes interessados';

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

  -- ── PASSO 3 — Pós-condições GLOBAIS (todo o banco, não só os tenants
  -- processados nesta execução) ─────────────────────────────────────────────
  -- Se qualquer uma falhar, aborta e desfaz TUDO. Também funciona como prova
  -- de que a descoberta do PASSO 1 foi completa: se sobrasse algum tenant
  -- não descoberto, uma dessas quatro contagens seria > 0.
  select count(*) into qtd_residual_clientes_global from clientes where etapa in ('lead_morno', 'aura_agend');
  select count(*) into qtd_residual_projetos_global
  from clientes c
  cross join lateral jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as elem
  where elem->>'etapa' in ('lead_morno', 'aura_agend');
  select count(*) into qtd_residual_pipeline_etapas_global from pipeline_etapas where slug in ('lead_morno', 'aura_agend');
  select count(*) into qtd_lead_label_incorreto_global from pipeline_etapas where slug = 'lead' and label is distinct from 'Clientes interessados';

  if qtd_residual_clientes_global > 0 then
    raise exception 'Abortando e desfazendo tudo: pós-condição global falhou -- ainda existem % cliente(s) em lead_morno/aura_agend em algum tenant não coberto pela descoberta do PASSO 1.', qtd_residual_clientes_global;
  end if;
  if qtd_residual_projetos_global > 0 then
    raise exception 'Abortando e desfazendo tudo: pós-condição global falhou -- ainda existem % item(ns) de projetos[] em lead_morno/aura_agend em algum tenant não coberto pela descoberta do PASSO 1.', qtd_residual_projetos_global;
  end if;
  if qtd_residual_pipeline_etapas_global > 0 then
    raise exception 'Abortando e desfazendo tudo: pós-condição global falhou -- ainda existem % linha(s) de pipeline_etapas com slug lead_morno/aura_agend em algum tenant não coberto pela descoberta do PASSO 1.', qtd_residual_pipeline_etapas_global;
  end if;
  if qtd_lead_label_incorreto_global > 0 then
    raise exception 'Abortando e desfazendo tudo: pós-condição global falhou -- ainda existem % linha(s) de pipeline_etapas com slug=lead e label diferente de "Clientes interessados" em algum tenant não coberto pela descoberta do PASSO 1.', qtd_lead_label_incorreto_global;
  end if;

  raise notice '── RESUMO GERAL (soma de todos os tenants migrados nesta execução) ──';
  raise notice 'Tenants migrados: %', total_tenants_migrados;
  raise notice 'Total de clientes migrados: %', total_clientes_migrados;
  raise notice 'Total de linhas removidas de pipeline_etapas: %', total_etapas_removidas;
  raise notice 'Pós-condições globais confirmadas: 0 clientes, 0 projetos, 0 linhas de pipeline_etapas antigas, 0 labels de lead incorretos em todo o banco.';
  raise notice 'Migração concluída com sucesso para todos os tenants afetados.';

end $migracao$;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente) ───────────────────
-- Deve retornar 0 linhas em todas as consultas abaixo, pra qualquer user_id.
-- select id, user_id, nome, etapa from clientes where etapa in ('lead_morno', 'aura_agend');
-- select id, user_id, nome from clientes c
--   where exists (select 1 from jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as e where e->>'etapa' in ('lead_morno','aura_agend'));
-- select * from pipeline_etapas where slug in ('lead_morno', 'aura_agend');
-- select user_id, label from pipeline_etapas where slug = 'lead' and label is distinct from 'Clientes interessados';
--
-- Deve mostrar "Clientes interessados" pra todo tenant.
-- select user_id, label from pipeline_etapas where slug = 'lead';
--
-- IDEMPOTÊNCIA: rodar o bloco "do $migracao$ ... end $migracao$;" de novo
-- depois de uma migração bem-sucedida deve só imprimir o RAISE NOTICE de
-- "nada a fazer" (PASSO 1) e retornar, sem nenhum UPDATE/DELETE.
