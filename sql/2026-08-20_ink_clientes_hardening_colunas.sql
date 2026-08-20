-- Bloco Corretivo de Segurança — public.ink_clientes (Fase 2, inq-saas)
--
-- CONTEXTO: durante o planejamento da Fase 1 (ink-system-plataform, commit
-- 22f5d65, já publicado), o diagnóstico real de catálogo (relacl/attacl via
-- aclexplode, não só information_schema.role_table_grants, que não
-- distingue com segurança grant de tabela de grant explícito de coluna)
-- revelou que public.ink_clientes nunca passou por hardening nesta
-- engenharia, ao contrário de public.licencas (já corrigida em
-- 2026-08-20_creditos_storage_licencas_hardening.sql).
--
-- ACHADO QUE MOTIVA ESTE ARQUIVO, confirmado pelo diagnóstico real:
--   * relacl da tabela: postgres, anon, authenticated e service_role
--     seguravam, cada um, os mesmos 8 privilégios de tabela inteira
--     (DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE,
--     UPDATE), nenhum concedível, PUBLIC sem entrada própria. attacl
--     (ACL por coluna) completamente vazio -- nenhum privilégio colunar
--     explícito em nenhuma coluna, então toda a exposição vinha só do
--     grant de tabela inteira.
--   * RLS habilitada, com 2 policies para o papel "public" (pseudo-papel
--     que cobre qualquer role, inclusive anon/authenticated):
--       cliente_ve_proprio_registro (SELECT, USING auth_user_id =
--       auth.uid(), sem WITH CHECK -- não se aplica a SELECT);
--       cliente_atualiza_proprio_registro (UPDATE, USING auth_user_id =
--       auth.uid(), WITH CHECK nulo).
--   * A regra documentada do PostgreSQL para UPDATE sem WITH CHECK
--     explícito é reaproveitar o USING também como WITH CHECK -- ou seja,
--     a única coisa garantida após a atualização é que auth_user_id
--     continua igual ao auth.uid() de quem chamou. Nenhuma outra coluna
--     é restrita. Combinado com o grant de UPDATE de tabela inteira para
--     authenticated, isso significa que qualquer tenant autenticado podia,
--     via uma chamada PATCH direta ao endpoint REST do Supabase (sem
--     precisar de nenhum bug de código de aplicação -- a porta estava
--     aberta na configuração do banco), alterar na própria linha: plano,
--     status, asaas_customer_id, asaas_subscription_id, data_vencimento,
--     data_cancelamento, email_credito_extra, sms_credito_extra,
--     storage_extra_mb. Vulnerabilidade real, confirmada, não teórica.
--
-- ESCOPO (autorizado explicitamente, Fase 2 -- só inq-saas, só
-- ink_clientes, nada além disso):
--   1. Revogar de PUBLIC, anon e authenticated todo privilégio de tabela
--      inteira em public.ink_clientes.
--   2. Conceder a authenticated, só por coluna (nunca por tabela
--      inteira): SELECT em id, auth_user_id, slug, plano, status,
--      nome_estudio, storage_usado_mb, storage_extra_mb,
--      sms_credito_extra, email_credito_extra, data_vencimento (as 11
--      colunas com consumidor real confirmado, nos três repositórios,
--      pela auditoria de leitura que precedeu este arquivo -- excluídas
--      justamente asaas_customer_id, asaas_subscription_id e
--      data_cancelamento, sem nenhum consumidor com credencial
--      authenticated encontrado); e UPDATE só em slug (único caminho de
--      escrita direta real, confirmado no CRM da Mãe e no ink-system-1.0
--      congelado -- onboarding de slug).
--   3. Substituir as 2 policies antigas (papel "public", WITH CHECK nulo
--      na de UPDATE) por 2 novas, escopadas ao papel authenticated, com
--      WITH CHECK explícito na de UPDATE (auth_user_id = auth.uid()) --
--      mesmo efeito de isolamento por linha, mas sem depender do
--      reaproveitamento implícito do USING.
--   4. postgres e service_role preservados sem nenhuma revogação -- são
--      os únicos papéis com consumidor real confirmado que precisa de
--      acesso amplo (provisionamento, Painel Admin, cron, todos via
--      service_role, que ignora RLS).
--
-- FORA DE ESCOPO NESTE ARQUIVO: nenhuma alteração em ink-system-plataform
-- nem em ink-system-1.0 (nenhum arquivo tocado em nenhum dos dois);
-- nenhuma constraint nova (NOT NULL em auth_user_id, checks contra
-- crédito/storage negativo -- avaliadas e adiadas, decisão de produto
-- separada, não incluídas aqui); nenhuma alteração de dado real (zero
-- INSERT/UPDATE/DELETE/TRUNCATE sobre linhas de negócio -- só DDL/DCL:
-- grants por coluna, policies). O plano "Ouro" da única licença existente
-- (Laboratório) não é tocado por este arquivo.
--
-- SEGURANÇA -- padrão consistente com toda migration desta engenharia:
-- pré-voo por catálogo real (pg_class.relacl e pg_attribute.attacl via
-- aclexplode, não information_schema.column_privileges, que mistura
-- origem de tabela e de coluna sem distinguir) reconhece só o estado
-- vulnerável exato confirmado pelo diagnóstico OU o estado final exato
-- desta migration -- qualquer terceiro estado aborta antes de qualquer
-- mutação.
--
-- TRANSAÇÃO INTEGRAL: mesmo padrão já homologado nesta engenharia --
-- BEGIN; é o primeiro comando executável, antes de qualquer REVOKE/GRANT/
-- DROP POLICY/CREATE POLICY; COMMIT; só depois de toda verificação
-- fail-closed. Nenhum COMMIT intermediário, nenhum SAVEPOINT, nenhum
-- EXCEPTION WHEN OTHERS que capture ou esconda falha. Qualquer RAISE
-- EXCEPTION antes do COMMIT; final aborta a transação inteira -- nenhuma
-- alteração permanece; corrija a causa e execute o arquivo inteiro
-- novamente, do zero, nunca só o trecho restante.
--
-- IDEMPOTÊNCIA: o pré-voo (Parte 1) só aceita o estado inicial exato ou o
-- estado final exato -- qualquer terceiro estado aborta antes de qualquer
-- mutação, em qualquer reexecução. REVOKE/GRANT por coluna são
-- idempotentes por natureza. As policies são tratadas por 4 DROP POLICY IF
-- EXISTS estáticos e nomeados (as 2 antigas + as 2 finais -- nunca um
-- quinto nome, nunca busca dinâmica em pg_policies, nunca laço), seguidos
-- da recriação determinística das 2 policies finais -- mesmo resultado em
-- qualquer reexecução, sem depender de checar existência previamente.
--
-- ROLLBACK: só progressivo, por uma nova migration corretiva futura.
-- Enquanto nenhum consumidor real gravar dado através do estado corrigido
-- (o que já é verdade hoje -- os únicos consumidores confirmados
-- continuam funcionando com exatamente os grants concedidos aqui), uma
-- reversão estrutural seria tecnicamente possível, mas este arquivo não a
-- prepara nem a documenta como caminho válido -- os grants vulneráveis
-- (tabela inteira para PUBLIC/anon/authenticated) nunca devem ser
-- restaurados. Qualquer ajuste necessário no futuro (ex.: uma coluna a
-- mais precisar de SELECT) é uma nova migration para frente.
--
-- ESTE ARQUIVO É MANUAL. Não faz parte de build, deploy, Vercel, cron ou
-- qualquer caminho da aplicação -- só roda se alguém copiar o conteúdo e
-- colar manualmente no SQL Editor do Supabase, mediante autorização
-- separada da criação deste arquivo. Não foi executado como parte desta
-- implementação. Nenhum UUID, e-mail ou segredo real aparece neste
-- arquivo.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 1 — pré-voo completo (tabela, colunas, relacl real, attacl real,
-- policies)
-- ══════════════════════════════════════════════════════════════════════════

-- 1a. ink_clientes: existência, relkind, owner, RLS.
do $prevoo_tabela_ink_clientes$
declare
  v_relkind "char";
  v_owner text;
  v_rls boolean;
begin
  select c.relkind, c.relowner::regrole::text, c.relrowsecurity
    into v_relkind, v_owner, v_rls
  from pg_class c
  where c.relname = 'ink_clientes' and c.relnamespace = 'public'::regnamespace;

  if not found then
    raise exception 'Abortando (pré-voo): tabela public.ink_clientes não encontrada.';
  end if;

  if v_relkind <> 'r' then
    raise exception 'Abortando (pré-voo): public.ink_clientes não é uma tabela ordinária (relkind=%), esperado "r".', v_relkind;
  end if;

  if v_owner <> 'postgres' then
    raise exception 'Abortando (pré-voo): public.ink_clientes tem owner "%", esperado "postgres".', v_owner;
  end if;

  if not v_rls then
    raise exception 'Abortando (pré-voo): public.ink_clientes não tem RLS habilitada.';
  end if;

  raise notice 'Pré-voo: public.ink_clientes existe, é tabela ordinária, owner postgres, RLS habilitada.';
end $prevoo_tabela_ink_clientes$;

-- 1b. ink_clientes: as 11 colunas de SELECT + slug (UPDATE) existem --
-- checagem de existência antes de qualquer GRANT por coluna referenciá-las
-- (um GRANT numa coluna inexistente falharia sem essa mensagem clara).
do $prevoo_colunas_ink_clientes$
declare
  v_coluna text;
  v_colunas constant text[] := array[
    'id', 'auth_user_id', 'slug', 'plano', 'status', 'nome_estudio',
    'storage_usado_mb', 'storage_extra_mb', 'sms_credito_extra',
    'email_credito_extra', 'data_vencimento'
  ];
begin
  foreach v_coluna in array v_colunas loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'ink_clientes' and column_name = v_coluna
    ) then
      raise exception 'Abortando (pré-voo): coluna public.ink_clientes.% não encontrada.', v_coluna;
    end if;
  end loop;

  raise notice 'Pré-voo: as 11 colunas de SELECT (incluindo slug, que também recebe UPDATE) confirmadas em public.ink_clientes.';
end $prevoo_colunas_ink_clientes$;

-- 1c. ink_clientes: estado ANTERIOR real de relacl (privilégio de tabela
-- inteira), lido por pg_catalog/aclexplode -- não information_schema, que
-- não distingue origem de tabela vs. coluna. Compara os 8 privilégios
-- exatos (incluindo MAINTAIN) por papel contra os dois únicos estados
-- reconhecidos, confirmados pelo diagnóstico real. Qualquer terceira
-- combinação aborta.
do $prevoo_relacl_ink_clientes$
declare
  v_privs_8 constant text[] := array['DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'];
  v_oid oid;
  v_relowner oid;
  v_relacl aclitem[];
  v_public text[];
  v_anon text[];
  v_authenticated text[];
  v_service_role text[];
  v_postgres text[];
  -- CORREÇÃO (auditoria pós-implementação): os arrays por papel acima só
  -- provam que os 5 papéis conhecidos têm os privilégios certos -- não
  -- provam AUSÊNCIA de um sexto papel inesperado em relacl, nem de uma
  -- entrada concedível (WITH GRANT OPTION) que os arrays (filtrados por
  -- is_grantable=false) simplesmente não capturariam. As 3 contagens
  -- abaixo cobrem TODAS as linhas produzidas por aclexplode, sem filtro,
  -- como camada adicional -- nunca substituem as comparações de array.
  v_total_entradas int;
  v_qtd_concediveis int;
  v_qtd_inesperados int;
  v_estado_original boolean;
  v_estado_final boolean;
begin
  select c.oid, c.relowner, c.relacl into v_oid, v_relowner, v_relacl
  from pg_class c
  where c.relname = 'ink_clientes' and c.relnamespace = 'public'::regnamespace;

  select
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 0), array[]::text[]),
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 'anon'::regrole), array[]::text[]),
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 'authenticated'::regrole), array[]::text[]),
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 'service_role'::regrole), array[]::text[]),
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 'postgres'::regrole), array[]::text[])
    into v_public, v_anon, v_authenticated, v_service_role, v_postgres
  from aclexplode(coalesce(v_relacl, acldefault('r', v_relowner))) a
  where a.is_grantable = false;

  select
    count(*),
    count(*) filter (where a.is_grantable = true),
    count(*) filter (where a.grantee not in (0, 'anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole, 'postgres'::regrole))
    into v_total_entradas, v_qtd_concediveis, v_qtd_inesperados
  from aclexplode(coalesce(v_relacl, acldefault('r', v_relowner))) a;

  raise notice 'Pré-voo (relacl real de ink_clientes, is_grantable=false): PUBLIC=%; anon=%; authenticated=%; service_role=%; postgres=%.', v_public, v_anon, v_authenticated, v_service_role, v_postgres;
  raise notice 'Pré-voo (relacl real de ink_clientes, todas as entradas sem filtro): total=%, concedíveis=%, grantees inesperados=%.', v_total_entradas, v_qtd_concediveis, v_qtd_inesperados;

  v_estado_original :=
    v_public = array[]::text[]
    and v_anon = v_privs_8
    and v_authenticated = v_privs_8
    and v_service_role = v_privs_8
    and v_postgres = v_privs_8
    and v_total_entradas = 32
    and v_qtd_concediveis = 0
    and v_qtd_inesperados = 0;

  v_estado_final :=
    v_public = array[]::text[]
    and v_anon = array[]::text[]
    and v_authenticated = array[]::text[]
    and v_service_role = v_privs_8
    and v_postgres = v_privs_8
    and v_total_entradas = 16
    and v_qtd_concediveis = 0
    and v_qtd_inesperados = 0;

  if not (v_estado_original or v_estado_final) then
    raise exception 'Abortando (pré-voo): relacl de ink_clientes não bate exatamente com o estado original (PUBLIC=[], anon/authenticated/service_role/postgres com os 8 privilégios, total=32) nem com o final (PUBLIC=[], anon=[], authenticated=[], service_role/postgres com os 8 privilégios, total=16) -- encontrado PUBLIC=%, anon=%, authenticated=%, service_role=%, postgres=%, total=%, concedíveis=%, inesperados=% -- revisão manual necessária.', v_public, v_anon, v_authenticated, v_service_role, v_postgres, v_total_entradas, v_qtd_concediveis, v_qtd_inesperados;
  end if;

  if v_estado_original then
    raise notice 'Pré-voo: relacl de ink_clientes está exatamente no estado original confirmado pelo diagnóstico (32 entradas, zero concedível, zero papel inesperado) -- prosseguindo com a correção.';
  else
    raise notice 'Pré-voo: relacl de ink_clientes já está exatamente no estado final (16 entradas, zero concedível, zero papel inesperado) -- execução idempotente detectada.';
  end if;
end $prevoo_relacl_ink_clientes$;

-- 1d. ink_clientes: estado ANTERIOR real de attacl (ACL por coluna), lido
-- por pg_catalog/aclexplode. Estado original = attacl completamente vazio
-- (zero coluna com ACL explícita, confirmado pelo diagnóstico real).
-- Estado final = exatamente 12 entradas explodidas, todas authenticated,
-- não concedíveis -- 11 SELECT nas colunas exatas + 1 UPDATE só em slug,
-- zero PUBLIC/anon, zero fora deste conjunto exato. Qualquer terceiro
-- estado (parcial, a mais, a menos) aborta.
do $prevoo_attacl_ink_clientes$
declare
  v_oid oid;
  v_colunas_select constant text[] := array[
    'id', 'auth_user_id', 'slug', 'plano', 'status', 'nome_estudio',
    'storage_usado_mb', 'storage_extra_mb', 'sms_credito_extra',
    'email_credito_extra', 'data_vencimento'
  ];
  v_qtd_attacl_nao_nulo int;
  v_qtd_total_entradas int := 0;
  v_qtd_select_esperadas int := 0;
  v_qtd_update_esperada int := 0;
  v_qtd_inesperadas int := 0;
  v_estado_original boolean;
  v_estado_final boolean;
begin
  select c.oid into v_oid
  from pg_class c
  where c.relname = 'ink_clientes' and c.relnamespace = 'public'::regnamespace;

  select count(*) into v_qtd_attacl_nao_nulo
  from pg_attribute att
  where att.attrelid = v_oid and att.attnum > 0 and not att.attisdropped and att.attacl is not null;

  v_estado_original := (v_qtd_attacl_nao_nulo = 0);

  if v_qtd_attacl_nao_nulo > 0 then
    select count(*) into v_qtd_total_entradas
    from pg_attribute att
    cross join lateral aclexplode(att.attacl) a
    where att.attrelid = v_oid and att.attnum > 0 and not att.attisdropped;

    select count(*) into v_qtd_select_esperadas
    from pg_attribute att
    cross join lateral aclexplode(att.attacl) a
    where att.attrelid = v_oid and att.attnum > 0 and not att.attisdropped
      and att.attname = any(v_colunas_select)
      and a.grantee = 'authenticated'::regrole and a.privilege_type = 'SELECT' and a.is_grantable = false;

    select count(*) into v_qtd_update_esperada
    from pg_attribute att
    cross join lateral aclexplode(att.attacl) a
    where att.attrelid = v_oid and att.attnum > 0 and not att.attisdropped
      and att.attname = 'slug'
      and a.grantee = 'authenticated'::regrole and a.privilege_type = 'UPDATE' and a.is_grantable = false;

    select count(*) into v_qtd_inesperadas
    from pg_attribute att
    cross join lateral aclexplode(att.attacl) a
    where att.attrelid = v_oid and att.attnum > 0 and not att.attisdropped
      and not (
        (att.attname = any(v_colunas_select) and a.grantee = 'authenticated'::regrole and a.privilege_type = 'SELECT' and a.is_grantable = false)
        or (att.attname = 'slug' and a.grantee = 'authenticated'::regrole and a.privilege_type = 'UPDATE' and a.is_grantable = false)
      );

    v_estado_final :=
      v_qtd_total_entradas = 12
      and v_qtd_select_esperadas = 11
      and v_qtd_update_esperada = 1
      and v_qtd_inesperadas = 0;
  else
    v_estado_final := false;
  end if;

  raise notice 'Pré-voo (attacl real de ink_clientes): colunas com ACL não-nula=%, total de entradas explodidas=%, SELECT esperadas presentes=%, UPDATE esperada presente=%, entradas fora do esperado=%.', v_qtd_attacl_nao_nulo, v_qtd_total_entradas, v_qtd_select_esperadas, v_qtd_update_esperada, v_qtd_inesperadas;

  if not (v_estado_original or v_estado_final) then
    raise exception 'Abortando (pré-voo): attacl de ink_clientes não bate exatamente com o estado original (completamente vazio) nem com o final (exatamente 12 entradas: 11 SELECT + 1 UPDATE em slug, todas authenticated, não concedíveis) -- revisão manual necessária.';
  end if;

  if v_estado_original then
    raise notice 'Pré-voo: attacl de ink_clientes completamente vazio (estado original confirmado) -- prosseguindo.';
  else
    raise notice 'Pré-voo: attacl de ink_clientes já está exatamente no estado final (12 entradas exatas) -- execução idempotente detectada.';
  end if;
end $prevoo_attacl_ink_clientes$;

-- 1e. ink_clientes: estado ANTERIOR real de policies -- compara nome +
-- comando + papéis + USING + WITH CHECK das 2 policies originais (papel
-- "public"), OU as 2 finais (papel authenticated, WITH CHECK explícito na
-- de UPDATE). Qualquer mistura, ausência parcial ou terceira definição
-- aborta.
do $prevoo_policies_ink_clientes$
declare
  v_qtd int;
  r record;
  v_originais_ok int := 0;
  v_finais_ok int := 0;
  constant_total constant int := 2;
begin
  select count(*) into v_qtd from pg_policies where schemaname = 'public' and tablename = 'ink_clientes';
  raise notice 'Pré-voo (policies anteriores de ink_clientes): % policy(ies) encontrada(s) no total.', v_qtd;

  for r in
    select * from (values
      ('cliente_ve_proprio_registro', 'SELECT', array['public']::name[], '(auth_user_id = auth.uid())'::text, null::text),
      ('cliente_atualiza_proprio_registro', 'UPDATE', array['public']::name[], '(auth_user_id = auth.uid())'::text, null::text)
    ) as esperado(nome, comando, papeis, using_esperado, with_check_esperado)
  loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ink_clientes' and policyname = r.nome
        and cmd = r.comando and roles = r.papeis
        and qual is not distinct from r.using_esperado
        and with_check is not distinct from r.with_check_esperado
    ) then
      v_originais_ok := v_originais_ok + 1;
    end if;
  end loop;

  for r in
    select * from (values
      ('ink_clientes_select_propria', 'SELECT', array['authenticated']::name[], '(auth_user_id = auth.uid())'::text, null::text),
      ('ink_clientes_update_propria', 'UPDATE', array['authenticated']::name[], '(auth_user_id = auth.uid())'::text, '(auth_user_id = auth.uid())'::text)
    ) as esperado(nome, comando, papeis, using_esperado, with_check_esperado)
  loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'ink_clientes' and policyname = r.nome
        and cmd = r.comando and roles = r.papeis
        and qual is not distinct from r.using_esperado
        and with_check is not distinct from r.with_check_esperado
    ) then
      v_finais_ok := v_finais_ok + 1;
    end if;
  end loop;

  if v_originais_ok = constant_total and v_qtd = constant_total then
    raise notice 'Pré-voo: as 2 policies originais de ink_clientes confirmadas EXATAMENTE (nome+comando+papéis+USING+WITH CHECK) -- correção ainda não aplicada, prosseguindo.';
  elsif v_finais_ok = constant_total and v_qtd = constant_total then
    raise notice 'Pré-voo: ink_clientes já está exatamente no estado de policies corrigido -- execução idempotente detectada.';
  else
    raise exception 'Abortando (pré-voo): estado de policies de ink_clientes não bate exatamente com o original nem com o corrigido (% de % originais batendo exatamente, % de % finais batendo exatamente, total de policies=%) -- nenhuma mistura, ausência parcial ou terceira definição é aceita, revisão manual necessária.', v_originais_ok, constant_total, v_finais_ok, constant_total, v_qtd;
  end if;
end $prevoo_policies_ink_clientes$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 2 — revogação de PUBLIC, anon e authenticated (nível de tabela
-- inteira)
-- ══════════════════════════════════════════════════════════════════════════
-- postgres e service_role preservados sem nenhuma alteração -- nenhum
-- REVOKE os menciona. PUBLIC incluído por padrão de menor privilégio,
-- mesmo já sem entrada em relacl (idempotente, sem efeito, documental).

revoke all on table public.ink_clientes from public, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 3 — grants por coluna, exclusivamente para authenticated
-- ══════════════════════════════════════════════════════════════════════════

grant select (
  id, auth_user_id, slug, plano, status, nome_estudio,
  storage_usado_mb, storage_extra_mb, sms_credito_extra,
  email_credito_extra, data_vencimento
) on public.ink_clientes to authenticated;

grant update (slug) on public.ink_clientes to authenticated;

-- Verificação ativa -- fail-closed -- relacl e attacl reais, não
-- information_schema.
do $verificar_grants_colunares_ink_clientes$
declare
  v_privs_8 constant text[] := array['DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'];
  v_colunas_select constant text[] := array[
    'id', 'auth_user_id', 'slug', 'plano', 'status', 'nome_estudio',
    'storage_usado_mb', 'storage_extra_mb', 'sms_credito_extra',
    'email_credito_extra', 'data_vencimento'
  ];
  v_oid oid;
  v_relowner oid;
  v_relacl aclitem[];
  v_public text[];
  v_anon text[];
  v_authenticated text[];
  v_service_role text[];
  v_postgres text[];
  v_qtd_total_attacl int;
  v_qtd_select int;
  v_qtd_update int;
  v_qtd_inesperadas int;
  -- CORREÇÃO (auditoria pós-implementação): mesma camada adicional do
  -- pré-voo -- os arrays por papel não provam ausência de um sexto papel
  -- nem de entrada concedível. Neste ponto (pós-GRANT), só o estado final
  -- é aceitável: exatamente 16 entradas totais.
  v_total_entradas int;
  v_qtd_concediveis int;
  v_qtd_grantees_inesperados int;
begin
  select c.oid, c.relowner, c.relacl into v_oid, v_relowner, v_relacl
  from pg_class c
  where c.relname = 'ink_clientes' and c.relnamespace = 'public'::regnamespace;

  select
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 0), array[]::text[]),
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 'anon'::regrole), array[]::text[]),
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 'authenticated'::regrole), array[]::text[]),
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 'service_role'::regrole), array[]::text[]),
    coalesce(array_agg(a.privilege_type order by a.privilege_type) filter (where a.grantee = 'postgres'::regrole), array[]::text[])
    into v_public, v_anon, v_authenticated, v_service_role, v_postgres
  from aclexplode(coalesce(v_relacl, acldefault('r', v_relowner))) a
  where a.is_grantable = false;

  select
    count(*),
    count(*) filter (where a.is_grantable = true),
    count(*) filter (where a.grantee not in (0, 'anon'::regrole, 'authenticated'::regrole, 'service_role'::regrole, 'postgres'::regrole))
    into v_total_entradas, v_qtd_concediveis, v_qtd_grantees_inesperados
  from aclexplode(coalesce(v_relacl, acldefault('r', v_relowner))) a;

  if v_public <> array[]::text[] then
    raise exception 'Abortando: PUBLIC ainda tem privilégio(s) de tabela em ink_clientes: %.', v_public;
  end if;
  if v_anon <> array[]::text[] then
    raise exception 'Abortando: anon ainda tem privilégio(s) de tabela em ink_clientes: %.', v_anon;
  end if;
  if v_authenticated <> array[]::text[] then
    raise exception 'Abortando: authenticated ainda tem privilégio(s) de TABELA (não coluna) em ink_clientes: % -- esperado zero, todo acesso deve ser só por coluna.', v_authenticated;
  end if;
  if v_service_role <> v_privs_8 then
    raise exception 'Abortando: service_role não tem mais os 8 privilégios esperados em ink_clientes (incluindo MAINTAIN) -- encontrado %.', v_service_role;
  end if;
  if v_postgres <> v_privs_8 then
    raise exception 'Abortando: postgres não tem mais os 8 privilégios esperados em ink_clientes (incluindo MAINTAIN) -- encontrado %.', v_postgres;
  end if;
  if v_total_entradas <> 16 then
    raise exception 'Abortando: relacl de ink_clientes tem % entrada(s) no total, esperado exatamente 16 (postgres + service_role, 8 privilégios cada).', v_total_entradas;
  end if;
  if v_qtd_concediveis <> 0 then
    raise exception 'Abortando: relacl de ink_clientes tem % entrada(s) concedível(is) (is_grantable=true), esperado zero.', v_qtd_concediveis;
  end if;
  if v_qtd_grantees_inesperados <> 0 then
    raise exception 'Abortando: relacl de ink_clientes tem % entrada(s) de papel inesperado (fora de PUBLIC/anon/authenticated/service_role/postgres).', v_qtd_grantees_inesperados;
  end if;

  select count(*) into v_qtd_total_attacl
  from pg_attribute att cross join lateral aclexplode(att.attacl) a
  where att.attrelid = v_oid and att.attnum > 0 and not att.attisdropped;

  select count(*) into v_qtd_select
  from pg_attribute att cross join lateral aclexplode(att.attacl) a
  where att.attrelid = v_oid and att.attnum > 0 and not att.attisdropped
    and att.attname = any(v_colunas_select)
    and a.grantee = 'authenticated'::regrole and a.privilege_type = 'SELECT' and a.is_grantable = false;

  select count(*) into v_qtd_update
  from pg_attribute att cross join lateral aclexplode(att.attacl) a
  where att.attrelid = v_oid and att.attnum > 0 and not att.attisdropped
    and att.attname = 'slug'
    and a.grantee = 'authenticated'::regrole and a.privilege_type = 'UPDATE' and a.is_grantable = false;

  select count(*) into v_qtd_inesperadas
  from pg_attribute att cross join lateral aclexplode(att.attacl) a
  where att.attrelid = v_oid and att.attnum > 0 and not att.attisdropped
    and not (
      (att.attname = any(v_colunas_select) and a.grantee = 'authenticated'::regrole and a.privilege_type = 'SELECT' and a.is_grantable = false)
      or (att.attname = 'slug' and a.grantee = 'authenticated'::regrole and a.privilege_type = 'UPDATE' and a.is_grantable = false)
    );

  if v_qtd_total_attacl <> 12 then
    raise exception 'Abortando: attacl de ink_clientes tem % entrada(s) no total, esperado exatamente 12.', v_qtd_total_attacl;
  end if;
  if v_qtd_select <> 11 then
    raise exception 'Abortando: attacl de ink_clientes tem % entrada(s) de SELECT esperadas, esperado exatamente 11.', v_qtd_select;
  end if;
  if v_qtd_update <> 1 then
    raise exception 'Abortando: attacl de ink_clientes tem % entrada(s) de UPDATE esperadas, esperado exatamente 1 (só slug).', v_qtd_update;
  end if;
  if v_qtd_inesperadas <> 0 then
    raise exception 'Abortando: attacl de ink_clientes tem % entrada(s) fora do conjunto exato esperado.', v_qtd_inesperadas;
  end if;

  raise notice 'Grants por coluna de ink_clientes confirmados: PUBLIC/anon/authenticated sem nenhum privilégio de tabela inteira; postgres/service_role com os 8 privilégios (incluindo MAINTAIN), relacl com exatamente 16 entradas no total, zero concedível, zero papel inesperado; attacl com exatamente 12 entradas (11 SELECT + 1 UPDATE em slug), todas authenticated, não concedíveis.';
end $verificar_grants_colunares_ink_clientes$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 4 — policies (substitui as 2 antigas de papel "public" pelas 2
-- novas, escopadas a authenticated, com WITH CHECK explícito na de UPDATE)
-- ══════════════════════════════════════════════════════════════════════════
-- CORREÇÃO (auditoria pós-implementação): a versão anterior removia
-- dinamicamente "qualquer policy com nome diferente das duas finais",
-- consultando pg_policies e apagando por EXECUTE format() o que encontrasse
-- -- comportamento fail-open: uma policy inesperada seria apagada em vez de
-- abortar a migration. Corrigido para 4 remoções nomeadas, estáticas, sem
-- laço nem EXECUTE dinâmico -- as únicas 4 que podem legitimamente existir
-- neste ponto, porque o pré-voo (1e, acima, antes de qualquer REVOKE/GRANT/
-- DROP POLICY) já abortou se o estado não fosse exatamente as 2 originais
-- OU as 2 finais. Uma quinta policy, papel diferente ou expressão diferente
-- nunca chega até aqui -- já causou abort no pré-voo.

drop policy if exists cliente_ve_proprio_registro on public.ink_clientes;
drop policy if exists cliente_atualiza_proprio_registro on public.ink_clientes;
drop policy if exists ink_clientes_select_propria on public.ink_clientes;
drop policy if exists ink_clientes_update_propria on public.ink_clientes;

create policy ink_clientes_select_propria on public.ink_clientes
  for select to authenticated using (auth_user_id = auth.uid());

create policy ink_clientes_update_propria on public.ink_clientes
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 5 — pós-voo (relacl, attacl, RLS, policies, MAINTAIN explícito)
-- ══════════════════════════════════════════════════════════════════════════

do $verificar_rls_final$
declare
  v_rls boolean;
begin
  select relrowsecurity into v_rls
  from pg_class where relname = 'ink_clientes' and relnamespace = 'public'::regnamespace;

  if not v_rls then
    raise exception 'Abortando (pós-voo): RLS de public.ink_clientes não está mais habilitada.';
  end if;

  raise notice 'Confirmado (pós-voo): RLS de public.ink_clientes permanece habilitada.';
end $verificar_rls_final$;

do $verificar_maintain_preservado$
declare
  v_oid oid;
  v_relowner oid;
  v_relacl aclitem[];
  v_service_role_tem_maintain boolean;
  v_postgres_tem_maintain boolean;
begin
  select c.oid, c.relowner, c.relacl into v_oid, v_relowner, v_relacl
  from pg_class c
  where c.relname = 'ink_clientes' and c.relnamespace = 'public'::regnamespace;

  select exists (
    select 1 from aclexplode(coalesce(v_relacl, acldefault('r', v_relowner))) a
    where a.grantee = 'service_role'::regrole and a.privilege_type = 'MAINTAIN' and a.is_grantable = false
  ) into v_service_role_tem_maintain;

  select exists (
    select 1 from aclexplode(coalesce(v_relacl, acldefault('r', v_relowner))) a
    where a.grantee = 'postgres'::regrole and a.privilege_type = 'MAINTAIN' and a.is_grantable = false
  ) into v_postgres_tem_maintain;

  if not v_service_role_tem_maintain then
    raise exception 'Abortando (pós-voo): service_role perdeu o privilégio MAINTAIN em ink_clientes -- deveria ter sido preservado sem alteração.';
  end if;

  if not v_postgres_tem_maintain then
    raise exception 'Abortando (pós-voo): postgres perdeu o privilégio MAINTAIN em ink_clientes -- deveria ter sido preservado sem alteração.';
  end if;

  raise notice 'Confirmado (pós-voo, explícito): postgres e service_role continuam com MAINTAIN (entre os 8 privilégios preservados) em ink_clientes.';
end $verificar_maintain_preservado$;

do $verificar_policies_final_ink_clientes$
declare
  v_qtd int;
  v_select_ok boolean;
  v_update_ok boolean;
begin
  select count(*) into v_qtd from pg_policies where schemaname = 'public' and tablename = 'ink_clientes';

  if v_qtd <> 2 then
    raise exception 'Abortando (pós-voo): ink_clientes tem % policy(ies), esperado exatamente 2.', v_qtd;
  end if;

  select exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ink_clientes' and policyname = 'ink_clientes_select_propria'
      and cmd = 'SELECT' and roles = array['authenticated']::name[]
      and qual = '(auth_user_id = auth.uid())' and with_check is null
  ) into v_select_ok;

  select exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ink_clientes' and policyname = 'ink_clientes_update_propria'
      and cmd = 'UPDATE' and roles = array['authenticated']::name[]
      and qual = '(auth_user_id = auth.uid())' and with_check = '(auth_user_id = auth.uid())'
  ) into v_update_ok;

  if not v_select_ok then
    raise exception 'Abortando (pós-voo): ink_clientes_select_propria não bate exatamente com o esperado (SELECT, authenticated, USING auth_user_id = auth.uid(), sem WITH CHECK).';
  end if;

  if not v_update_ok then
    raise exception 'Abortando (pós-voo): ink_clientes_update_propria não bate exatamente com o esperado (UPDATE, authenticated, USING e WITH CHECK ambos auth_user_id = auth.uid()).';
  end if;

  raise notice 'Confirmado (pós-voo): exatamente 2 policies em ink_clientes, ambas batendo exatamente nome+comando+papel+USING+WITH CHECK.';
end $verificar_policies_final_ink_clientes$;

do $verificar_owner_final_ink_clientes$
declare
  v_owner text;
begin
  select relowner::regrole::text into v_owner
  from pg_class where relname = 'ink_clientes' and relnamespace = 'public'::regnamespace;

  if v_owner <> 'postgres' then
    raise exception 'Abortando (pós-voo): public.ink_clientes tem owner "%", esperado "postgres".', v_owner;
  end if;

  raise notice 'Confirmado (pós-voo): owner de ink_clientes continua postgres.';
end $verificar_owner_final_ink_clientes$;

COMMIT;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente, FORA desta
-- transação -- são só consultas de leitura, comentadas, nunca executadas
-- automaticamente por este arquivo) ────────────────────────────────────────
--
-- 1) relacl bruto e explodido da tabela (ORDER BY por expressão real --
-- papel decodificado + privilege_type -- nunca posição ordinal ambígua):
-- select
--   relacl::text as relacl_bruto,
--   (
--     select json_agg(json_build_object(
--       'role', case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
--       'privilegio', a.privilege_type, 'concedivel', a.is_grantable
--     ) order by (case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end), a.privilege_type)
--     from aclexplode(c.relacl) a
--   ) as relacl_explodido
-- from pg_class c
-- where c.relname = 'ink_clientes' and c.relnamespace = 'public'::regnamespace;
--
-- 2) attacl por coluna (só colunas com ACL explícita) -- ORDER BY do
-- json_agg por papel decodificado + privilege_type; ordenação por coluna
-- preservada no ORDER BY externo (att.attname), já que o agrupamento é por
-- coluna:
-- select att.attname,
--   json_agg(json_build_object(
--     'role', case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
--     'privilegio', a.privilege_type, 'concedivel', a.is_grantable
--   ) order by (case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end), a.privilege_type) as attacl_explodido
-- from pg_attribute att
-- cross join lateral aclexplode(att.attacl) a
-- where att.attrelid = 'public.ink_clientes'::regclass and att.attnum > 0 and not att.attisdropped
-- group by att.attname
-- order by att.attname;
--
-- 3) policies finais:
-- select policyname, cmd, roles, qual, with_check from pg_policies
-- where schemaname = 'public' and tablename = 'ink_clientes';
--
-- 4) diagnóstico agregado de dados, sem PII (nenhum nome, e-mail ou UUID
-- individual) -- confirma ausência de anomalia após o hardening, sem
-- alterar nada:
-- select json_build_object(
--   'total_linhas', (select count(*) from public.ink_clientes),
--   'linhas_auth_user_id_nulo', (select count(*) from public.ink_clientes where auth_user_id is null),
--   'linhas_email_credito_extra_negativo', (select count(*) from public.ink_clientes where email_credito_extra < 0),
--   'linhas_sms_credito_extra_negativo', (select count(*) from public.ink_clientes where sms_credito_extra < 0),
--   'linhas_storage_extra_mb_negativo', (select count(*) from public.ink_clientes where storage_extra_mb < 0),
--   'linhas_storage_usado_mb_negativo', (select count(*) from public.ink_clientes where storage_usado_mb < 0),
--   'linhas_com_identificador_asaas_preenchido', (select count(*) from public.ink_clientes where asaas_customer_id is not null or asaas_subscription_id is not null),
--   'distribuicao_status_plano', (
--     select json_agg(json_build_object('status', status, 'plano', plano, 'qtde', qtde) order by status, plano)
--     from (select status, plano, count(*) as qtde from public.ink_clientes group by status, plano) d
--   )
-- ) as diagnostico_pos_hardening;
--
-- 5) ROTEIRO FUNCIONAL DE HOMOLOGAÇÃO -- opcional, NÃO faz parte da
-- homologação obrigatória e NÃO deve ser copiado com um UUID inventado.
-- Dois testes SEPARADOS (o primeiro gera erro e aborta a própria
-- transação -- rodar em duas transações distintas, nunca uma seguida da
-- outra na mesma). Nunca usar o UUID do Laboratório real -- só uma conta
-- de teste dedicada, se existir.
--
-- Teste A -- proibido (nova transação):
-- BEGIN;
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims = '{"sub":"<uuid-de-conta-de-teste-existente>","role":"authenticated"}';
-- UPDATE public.ink_clientes SET plano = 'Teste-Bloqueado' WHERE auth_user_id = '<uuid-de-conta-de-teste-existente>';
-- -- ESPERADO: ERROR 42501 permission denied for column plano.
-- ROLLBACK;
--
-- Teste B -- permitido (nova transação):
-- BEGIN;
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims = '{"sub":"<uuid-de-conta-de-teste-existente>","role":"authenticated"}';
-- UPDATE public.ink_clientes
--   SET slug = 'homolog-temp-' || substr(md5(random()::text), 1, 8)
--   WHERE auth_user_id = '<uuid-de-conta-de-teste-existente>'
--   RETURNING id, slug;
-- -- ESPERADO: exatamente 1 linha retornada, com o novo slug temporário.
-- ROLLBACK;
-- SELECT slug FROM public.ink_clientes WHERE auth_user_id = '<uuid-de-conta-de-teste-existente>';
-- -- ESPERADO: slug original, sem o valor "homolog-temp-..." usado no teste.
