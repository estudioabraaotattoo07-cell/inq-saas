-- Auditoria de leitura IMEDIATAMENTE ANTERIOR à migration principal
-- (sql/2026-08-14_pipeline_unificar_clientes_interessados.sql).
-- Ver também: sql/2026-08-15_fotografia_pre_migration_clientes_interessados.sql
-- (irmã deste arquivo -- gera a fotografia exportável; este arquivo gera um
-- relatório de leitura humana no painel de Notices/Logs).
--
-- ESTRITAMENTE DE LEITURA: nenhum INSERT/UPDATE/DELETE/ALTER/DROP/TRUNCATE/
-- CREATE. Só SELECT e RAISE NOTICE (informativo, não altera nada).
--
-- ESTE ARQUIVO É MANUAL. Não é executado por deploy, build, Vercel, cron,
-- hook ou qualquer caminho da aplicação -- só roda se alguém copiar o
-- conteúdo e colar manualmente no SQL Editor do Supabase.
--
-- Rode este arquivo inteiro de uma vez no SQL Editor do Supabase. O
-- resultado aparece no painel de "Notices"/"Logs", não numa tabela --
-- diferente do arquivo de fotografia (irmão), que é feito só de SELECT pra
-- poder ser exportado.
--
-- ── CORREÇÕES APLICADAS (revisão de 2026-08-15, antes da primeira execução) ──
-- Uma revisão encontrou quatro problemas reais numa versão anterior deste
-- script, todos corrigidos aqui:
--   1. NULL: a Parte 9 comparava "c.etapa not in (...)" ANTES de checar
--      "c.etapa is null" dentro de um AND -- em SQL, comparar NULL com
--      NOT IN retorna NULL (não FALSE), e "TRUE and NULL" também é NULL, o
--      que faz a linha ser silenciosamente excluída do resultado mesmo
--      quando deveria ter sido capturada pelo "is null" do OR interno.
--      Corrigido: "c.etapa is null" agora é o primeiro ramo de um OR no
--      nível mais externo da condição, nunca atrás de um AND que pode virar
--      NULL. Uma autoverificação estrutural (contagem independente de NULL,
--      sem nenhum NOT IN por perto) confere e aborta com RAISE EXCEPTION se
--      o resultado da Parte 9 não bater com essa contagem independente.
--   2. Views na descoberta dinâmica (Parte 2): information_schema.columns
--      lista colunas de tabelas E de views -- uma view com coluna user_id
--      entraria na varredura e poderia contar a mesma linha de novo, por
--      outro caminho (contagem duplicada disfarçada). Corrigido: a
--      descoberta agora filtra explicitamente table_type = 'BASE TABLE'.
--   3. jsonb_array_elements com valor que não é array (Parte 6):
--      jsonb_array_elements lança ERRO (não retorna vazio) se "projetos"
--      não for uma lista de verdade -- isso pararia a execução do bloco
--      inteiro sem aviso claro. Corrigido: só abre a lista quando
--      jsonb_typeof confirma que é 'array', e reporta separadamente
--      qualquer cliente cujo "projetos" esteja num formato inesperado.
--   4. Silêncio em vez de "zero ocorrências" (Partes 8 e 9): antes, essas
--      partes só imprimiam algo quando encontravam um problema -- se
--      estivesse tudo certo, ficavam mudas, o que pode ser lido como "não
--      rodou" em vez de "rodou, está tudo certo". Corrigido: as duas agora
--      sempre terminam com uma linha explícita de total, mesmo quando zero.

do $descoberta_de_colunas$
declare
  linha record;
begin
  raise notice '── PARTE 0: Descoberta de colunas reais (não presumidas) ──';
  raise notice '-- Colunas de public.clientes:';
  for linha in
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes'
    order by ordinal_position
  loop
    raise notice '  %: %', linha.column_name, linha.data_type;
  end loop;
  raise notice '-- Colunas de public.pipeline_etapas:';
  for linha in
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'pipeline_etapas'
    order by ordinal_position
  loop
    raise notice '  %: %', linha.column_name, linha.data_type;
  end loop;
end $descoberta_de_colunas$;

do $auditoria_pre_migration$
declare
  uuid_laboratorio constant uuid := '2d366d35-1cae-40d5-ba92-06fe2ab8a763';
  uuid_orfao constant uuid := '72c51303-842b-4656-86a3-29d9fd52ad62';

  linha record;
  tabela record;
  qtd_na_tabela int;
  total_orfao int := 0;

  qtd_lab_auth_users int;
  qtd_lab_ink_clientes int;

  total_antes int;
  total_sera_movido int;
  total_permanece int;

  qtd_duplicidades int;
  qtd_etapa_nula_independente int;
  qtd_etapa_nula_na_parte9 int := 0;
  qtd_etapa_desconhecida int := 0;
  qtd_projetos_nao_array int;
begin
  raise notice '═══════════════════════════════════════════════════════';
  raise notice 'AUDITORIA DE LEITURA -- IMEDIATAMENTE ANTES DA MIGRATION';
  raise notice '═══════════════════════════════════════════════════════';

  -- ── PARTE 1 — Identidade do Laboratório ──────────────────────────────────
  select count(*) into qtd_lab_auth_users from auth.users where id = uuid_laboratorio;
  select count(*) into qtd_lab_ink_clientes from public.ink_clientes where auth_user_id = uuid_laboratorio;
  raise notice '';
  raise notice '── PARTE 1: Identidade do Laboratório P&D (%) ──', uuid_laboratorio;
  raise notice '  auth.users: % (esperado 1)', qtd_lab_auth_users;
  raise notice '  ink_clientes: % (esperado 1)', qtd_lab_ink_clientes;

  -- ── PARTE 2 — Reconfirma ausência do tenant órfão (só tabelas reais, sem views) ──
  raise notice '';
  raise notice '── PARTE 2: Reconfirmação de ausência do tenant órfão (%) ──', uuid_orfao;
  for tabela in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
      and t.table_type = 'BASE TABLE'
    order by c.table_name
  loop
    execute format('select count(*) from public.%I where user_id = $1', tabela.table_name)
      into qtd_na_tabela using uuid_orfao;
    if qtd_na_tabela > 0 then
      raise notice '  ATENÇÃO: % ainda tem % linha(s) para o UUID órfão!', tabela.table_name, qtd_na_tabela;
    end if;
    total_orfao := total_orfao + qtd_na_tabela;
  end loop;
  select count(*) into qtd_na_tabela from auth.users where id = uuid_orfao;
  total_orfao := total_orfao + qtd_na_tabela;
  select count(*) into qtd_na_tabela from public.ink_clientes where auth_user_id = uuid_orfao;
  total_orfao := total_orfao + qtd_na_tabela;
  raise notice '  Total de linhas encontradas para o UUID órfão em todo o banco: % (esperado 0)', total_orfao;

  -- ── PARTE 3 — Etapas atuais de pipeline_etapas do Laboratório (linha completa) ──
  raise notice '';
  raise notice '── PARTE 3: pipeline_etapas do Laboratório (linha completa, ordenado por "ordem") ──';
  for linha in
    select * from public.pipeline_etapas where user_id = uuid_laboratorio order by ordem
  loop
    raise notice '  %', to_jsonb(linha);
  end loop;

  -- ── PARTE 4 — Clientes do Laboratório agrupados por etapa ──────────────────
  raise notice '';
  raise notice '── PARTE 4: Clientes do Laboratório por etapa (clientes.etapa) ──';
  select count(*) into total_antes from public.clientes where user_id = uuid_laboratorio;
  for linha in
    select etapa, count(*) as qtd
    from public.clientes
    where user_id = uuid_laboratorio
    group by etapa
    order by qtd desc
  loop
    raise notice '  etapa=% -> % cliente(s)', coalesce(linha.etapa, '(NULO)'), linha.qtd;
  end loop;
  raise notice '  Total de clientes do Laboratório: %', total_antes;

  -- ── PARTE 5 — Identidade nominal dos clientes que a migration vai mudar ────
  raise notice '';
  raise notice '── PARTE 5: Clientes do Laboratório que a migration vai alterar (etapa -> lead) ──';
  select count(*) into total_sera_movido
  from public.clientes where user_id = uuid_laboratorio and etapa in ('lead_morno', 'aura_agend');
  for linha in
    select id, nome, etapa
    from public.clientes
    where user_id = uuid_laboratorio and etapa in ('lead_morno', 'aura_agend')
    order by nome
  loop
    raise notice '  id=% nome=% etapa_atual=% -> etapa_proposta=lead', linha.id, linha.nome, linha.etapa;
  end loop;
  raise notice '  Total que será movido: %', total_sera_movido;

  -- ── PARTE 6 — Itens de projetos[] do Laboratório que a migration vai alterar ──
  -- Proteção: jsonb_array_elements lança ERRO (não retorna vazio) se o valor
  -- não for uma lista JSON de verdade. Filtramos por jsonb_typeof = 'array'
  -- ANTES de tentar abrir, e reportamos separadamente qualquer cliente cujo
  -- "projetos" não seja uma lista -- isso também é um alerta de risco para a
  -- migration principal, que faz a mesma operação.
  raise notice '';
  select count(*) into qtd_projetos_nao_array
  from public.clientes
  where user_id = uuid_laboratorio
    and projetos is not null
    and jsonb_typeof(projetos) <> 'array';
  raise notice '── PARTE 6: Itens de projetos[] do Laboratório que a migration vai alterar ──';
  if qtd_projetos_nao_array > 0 then
    raise notice '  ATENÇÃO: % cliente(s) do Laboratório têm "projetos" que NÃO é uma lista válida -- excluídos desta verificação, e a migration principal pode falhar ao processá-los.', qtd_projetos_nao_array;
  end if;
  for linha in
    select c.id as cliente_id, c.nome as cliente_nome, elem->>'id' as projeto_id, elem->>'etapa' as etapa_atual
    from public.clientes c
    cross join lateral jsonb_array_elements(c.projetos) as elem
    where c.user_id = uuid_laboratorio
      and c.projetos is not null
      and jsonb_typeof(c.projetos) = 'array'
      and elem->>'etapa' in ('lead_morno', 'aura_agend')
    order by c.nome
  loop
    raise notice '  cliente_id=% cliente_nome=% projeto_id=% etapa_atual=% -> etapa_proposta=lead', linha.cliente_id, linha.cliente_nome, linha.projeto_id, linha.etapa_atual;
  end loop;

  -- ── PARTE 7 — Confirmação de existência de etapas específicas (Laboratório) ──
  raise notice '';
  raise notice '── PARTE 7: Confirmação de existência de etapas específicas (Laboratório) ──';
  raise notice '  possui slug=lead: %', exists(select 1 from public.pipeline_etapas where user_id = uuid_laboratorio and slug = 'lead');
  raise notice '  possui slug=lead_morno: %', exists(select 1 from public.pipeline_etapas where user_id = uuid_laboratorio and slug = 'lead_morno');
  raise notice '  possui slug=aura_agend: %', exists(select 1 from public.pipeline_etapas where user_id = uuid_laboratorio and slug = 'aura_agend');

  -- ── PARTE 8 — Duplicidades/colisões em pipeline_etapas (qualquer tenant) ────
  raise notice '';
  raise notice '── PARTE 8: Duplicidades de (user_id, slug) em pipeline_etapas ──';
  qtd_duplicidades := 0;
  for linha in
    select user_id, slug, count(*) as qtd
    from public.pipeline_etapas
    group by user_id, slug
    having count(*) > 1
  loop
    raise notice '  ATENÇÃO -- DUPLICIDADE: user_id=% slug=% aparece % vezes', linha.user_id, linha.slug, linha.qtd;
    qtd_duplicidades := qtd_duplicidades + 1;
  end loop;
  raise notice '  Total de duplicidades encontradas: % (esperado 0)', qtd_duplicidades;

  -- ── PARTE 9 — Clientes do Laboratório com etapa nula ou genuinamente desconhecida ──
  -- CORRIGIDO (2026-08-15): o IS NULL agora é o primeiro ramo de um OR no
  -- nível mais externo -- nunca fica atrás de um AND com um NOT IN que pode
  -- virar NULL e "engolir" a linha antes do OR conseguir agir.
  raise notice '';
  select count(*) into qtd_etapa_nula_independente
  from public.clientes where user_id = uuid_laboratorio and etapa is null;
  raise notice '── PARTE 9: Clientes do Laboratório com etapa nula ou sem correspondência (excluindo lead_morno/aura_agend, que são esperadas) ──';
  for linha in
    select c.id, c.nome, c.etapa
    from public.clientes c
    where c.user_id = uuid_laboratorio
      and (
        c.etapa is null
        or (
          c.etapa not in ('lead_morno', 'aura_agend')
          and not exists (
            select 1 from public.pipeline_etapas pe
            where pe.user_id = c.user_id and pe.slug = c.etapa
          )
        )
      )
  loop
    if linha.etapa is null then
      qtd_etapa_nula_na_parte9 := qtd_etapa_nula_na_parte9 + 1;
    else
      qtd_etapa_desconhecida := qtd_etapa_desconhecida + 1;
    end if;
    raise notice '  ATENÇÃO: cliente id=% nome=% etapa=%', linha.id, linha.nome, coalesce(linha.etapa, '(NULO)');
  end loop;
  raise notice '  Total com etapa nula: % | Total com etapa desconhecida: %', qtd_etapa_nula_na_parte9, qtd_etapa_desconhecida;

  -- Autoverificação estrutural: a contagem independente de NULL (calculada
  -- ANTES, sem nenhum NOT IN por perto) precisa bater exatamente com o que a
  -- Parte 9 encontrou. Se não bater, é sinal de que o mesmo tipo de falha
  -- pode ter voltado -- para a execução e avisa em vez de seguir calado.
  if qtd_etapa_nula_independente <> qtd_etapa_nula_na_parte9 then
    raise exception 'AUTOVERIFICAÇÃO FALHOU: contagem independente de etapa nula (%) não bate com o que a Parte 9 encontrou (%) -- não confie neste resultado, revise a consulta antes de prosseguir.', qtd_etapa_nula_independente, qtd_etapa_nula_na_parte9;
  end if;
  raise notice '  Autoverificação: contagem independente de etapa nula (%) confere com a Parte 9. OK.', qtd_etapa_nula_independente;

  -- ── PARTE 10 — Outros tenants (fora do Laboratório) com valores antigos ──────
  raise notice '';
  raise notice '── PARTE 10: Outros tenants com clientes/projetos/pipeline_etapas em lead_morno ou aura_agend, ou label desatualizado ──';
  for linha in
    select distinct uid from (
      select user_id as uid from public.clientes where etapa in ('lead_morno', 'aura_agend')
      union
      select c.user_id as uid from public.clientes c
      where c.projetos is not null and jsonb_typeof(c.projetos) = 'array'
        and exists (select 1 from jsonb_array_elements(c.projetos) as e where e->>'etapa' in ('lead_morno', 'aura_agend'))
      union
      select user_id as uid from public.pipeline_etapas where slug in ('lead_morno', 'aura_agend')
      union
      select user_id as uid from public.pipeline_etapas where slug = 'lead' and label is distinct from 'Clientes interessados'
    ) t
    where uid is not null
  loop
    if linha.uid = uuid_laboratorio then
      raise notice '  tenant=% (LABORATÓRIO) -- será migrado normalmente por esta migration', linha.uid;
    else
      raise notice '  tenant=% (OUTRO TENANT) -- também será migrado pela mesma migration, isolado por user_id', linha.uid;
    end if;
  end loop;

  -- ── PARTE 11 — Totais conciliáveis (Laboratório) ────────────────────────────
  total_permanece := total_antes - total_sera_movido;
  raise notice '';
  raise notice '── PARTE 11: Totais conciliáveis (Laboratório) ──';
  raise notice '  Total de clientes ANTES: %', total_antes;
  raise notice '  Quantidade que SERÁ MOVIDA (lead_morno/aura_agend -> lead): %', total_sera_movido;
  raise notice '  Quantidade que PERMANECE como está: %', total_permanece;
  raise notice '  Total ESPERADO depois (deve ser igual ao total antes -- migration não apaga cliente): %', total_antes;

  -- ── PARTE 12 — Confirmação de que nada é apagado ────────────────────────────
  raise notice '';
  raise notice '── PARTE 12: Confirmação -- nenhuma exclusão de cliente/projeto ──';
  raise notice '  Esta auditoria é 100%% leitura -- nenhum INSERT/UPDATE/DELETE foi executado.';
  raise notice '  A migration principal (quando autorizada) só altera etapa/etapa_desde/projetos[].etapa/pipeline_etapas.label e remove linhas DE CONFIGURAÇÃO de pipeline_etapas (lead_morno/aura_agend) -- nunca linhas de clientes, projetos, histórico, agenda ou financeiro.';

  -- ── PARTE 13 — Repetição da verificação de identidade ──────────────────────
  raise notice '';
  raise notice '── PARTE 13: Repetição da verificação de identidade ──';
  raise notice '  Laboratório (%) -- auth.users=%, ink_clientes=%', uuid_laboratorio, qtd_lab_auth_users, qtd_lab_ink_clientes;
  raise notice '  Órfão (%) -- total de linhas em todo o banco=%', uuid_orfao, total_orfao;

  raise notice '';
  raise notice '═══════════════════════════════════════════════════════';
  raise notice 'FIM DA AUDITORIA DE LEITURA';
  raise notice '═══════════════════════════════════════════════════════';
end $auditoria_pre_migration$;
