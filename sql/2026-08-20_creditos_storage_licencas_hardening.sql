-- Bloco Corretivo de Segurança — Créditos, Storage e Licenças
-- Ver: "AUDITORIA E PLANEJAMENTO — CONCLUSÃO DO MOTOR DE E-MAIL DA VERSÃO
-- 1.0" e as rodadas de auditoria/revisão/decisão que a seguiram (19-20/08/
-- 2026), incluindo o diagnóstico Fase 2 real executado no Supabase, que
-- revelou o corpo exato de consumir_credito_mensageria e confirmou a
-- assinatura de comprar_storage_extra/incrementar_storage_usado.
--
-- ACHADO QUE MOTIVA ESTE ARQUIVO: cinco funções (comprar_credito_mensageria,
-- comprar_recarga_mensageria, consumir_credito_mensageria,
-- comprar_storage_extra, incrementar_storage_usado) e a tabela public.
-- licencas nunca passaram por nenhuma rodada de hardening desta engenharia.
-- Confirmado pelo diagnóstico real: duas delas concediam crédito/saldo sem
-- qualquer verificação de pagamento (comprar_credito_mensageria) ou
-- aceitavam quantidade negativa, permitindo inflar saldo via uma falsa
-- operação de "consumo" (consumir_credito_mensageria, corpo real
-- confirmado: "verifica p_user_id != auth.uid() de forma vulnerável a
-- nulo... não valida canal... não valida quantidade positiva... não possui
-- search_path"); duas outras (comprar_storage_extra,
-- incrementar_storage_usado) tinham EXECUTE liberado para PUBLIC e anon --
-- chamáveis sem nenhuma autenticação; e licencas concedia PUBLIC/anon/
-- authenticated privilégios de escrita, exclusão e até TRUNCATE, com
-- policies que permitiam ao próprio usuário inserir, atualizar ou apagar
-- sua licença -- incluindo, em tese, auto-conceder franquia_ilimitada.
--
-- ESCOPO (autorizado explicitamente, nada além disso):
--   1. Congelar comprar_credito_mensageria, comprar_recarga_mensageria e
--      comprar_storage_extra -- corpo passa a só abortar com exceção
--      controlada, sem tocar em nenhuma tabela. Nenhum grant de execução
--      para nenhum papel de aplicação (nem authenticated) -- só acesso
--      implícito do owner postgres. Decisão de produto: a concessão
--      direta e gratuita de crédito não pode continuar disponível, e o
--      fluxo definitivo (catálogo + Asaas + extrato auditável) ainda não
--      existe -- não há meio-termo seguro além de desativar.
--   2. Endurecer consumir_credito_mensageria: identidade (auth.uid() =
--      p_user_id, tratando nulo separadamente, nunca comparando contra
--      p_user_id nulo -- correção direta da falha real confirmada),
--      quantidade estritamente positiva, canal só email/sms (nunca um
--      else genérico tratando canal desconhecido como sms), consumo
--      atômico condicionado a saldo suficiente (aborta em vez de
--      consumir parcialmente até zero), search_path fixado. Mantida
--      acessível a authenticated -- é a única das cinco com consumidor
--      real confirmado hoje (ink-system-1.0), e seu comportamento para
--      quantidade positiva e saldo suficiente permanece compatível.
--   3. Endurecer incrementar_storage_usado: identidade, quantidade
--      estritamente positiva (sem teto superior nem arredondamento --
--      ver nota de compatibilidade numérica abaixo), search_path
--      fixado, abortar se nenhuma linha for afetada (sem terminar
--      silenciosamente). Mantida acessível a authenticated.
--   4. Travar public.licencas: revogar todo privilégio de PUBLIC e anon;
--      revogar escrita/exclusão/TRUNCATE/REFERENCES/TRIGGER de
--      authenticated, preservando só SELECT; remover as policies de
--      INSERT/UPDATE/DELETE/ALL; substituir a policy de SELECT por uma
--      única, sem a exceção de e-mail administrativo fixado (confirmado
--      seguro remover -- o Painel do Administrador usa service_role,
--      que ignora RLS, não essa policy). service_role preservado sem
--      alteração -- sustenta o Painel Admin e o resetDemo de inq-saas/
--      api/config.js.
--
-- NOTA DE COMPATIBILIDADE NUMÉRICA (incrementar_storage_usado): CRM.tsx
-- (logStorage, "mb = bytes / (1024 * 1024)") sempre envia um valor
-- fracionário, nunca arredondado no frontend -- por isso a validação
-- desta função rejeita só nulo/zero/negativo, sem impor arredondamento
-- nem limite superior, para não alterar a semântica numérica existente
-- além do estritamente necessário para fechar a vulnerabilidade.
--
-- FORA DE ESCOPO NESTE ARQUIVO: nenhuma alteração em ink-system-1.0 nem em
-- ink-system-plataform (nenhum arquivo tocado em nenhum dos dois); nenhum
-- catálogo comercial, integração Asaas ou extrato de movimentações (Bloco
-- J, futuro); nenhum teto superior de armazenamento (decisão de produto
-- pendente, não inventada aqui); nenhuma alteração de dado real (nenhuma
-- linha de licencas, ink_clientes ou qualquer tabela de negócio é tocada
-- por este arquivo -- só DDL/DCL: funções, grants, policies).
--
-- COMPATIBILIDADE DELIBERADA COM ink-system-1.0: o botão antigo de comprar
-- crédito extra/armazenamento extra, lá, passará a receber exceção do
-- banco -- incompatibilidade aceita e deliberada (não existe cliente
-- comercial hoje, o Laboratório é ilimitado, compra grátis não pode
-- continuar disponível, e nenhum arquivo é alterado no repositório
-- congelado). consumir_credito_mensageria permanece 100% compatível para
-- quantidade positiva e saldo suficiente.
--
-- SEGURANÇA -- padrão idêntico ao já usado em toda RPC desta engenharia:
--   * session_user = 'postgres' -> único bypass, só para homologação
--     manual no SQL Editor.
--   * qualquer outra chamada -> auth.uid() não nulo E igual a p_user_id,
--     checados em blocos separados (nunca embutido numa única
--     comparação, para não repetir a falha real confirmada em
--     consumir_credito_mensageria).
--   * NENHUM bypass por service_role/auth.role() em nenhuma das 5.
--
-- TRANSAÇÃO INTEGRAL: mesmo padrão do bloco anterior já homologado
-- (commit 9914ae4) -- BEGIN; é o primeiro comando executável, antes de
-- qualquer DO/CREATE OR REPLACE/REVOKE/GRANT/DROP POLICY; COMMIT; só
-- depois de toda verificação fail-closed. Nenhum COMMIT intermediário,
-- nenhum SAVEPOINT, nenhum EXCEPTION WHEN OTHERS que capture ou esconda
-- falha. Qualquer RAISE EXCEPTION antes do COMMIT; final aborta a
-- transação inteira -- nenhuma alteração permanece; corrija a causa e
-- execute o arquivo inteiro novamente, do zero, nunca só o trecho
-- restante.
--
-- IDEMPOTÊNCIA: pré-voo e verificações finais rodam igual em qualquer
-- reexecução. CREATE OR REPLACE FUNCTION é idempotente por natureza.
-- REVOKE/GRANT são idempotentes. Policies de escrita são removidas por
-- busca dinâmica de nome real (nunca presumido). A policy de SELECT é
-- comparada por definição antes de decidir se recria.
--
-- ESTE ARQUIVO É MANUAL. Não faz parte de build, deploy, Vercel, cron ou
-- qualquer caminho da aplicação -- só roda se alguém copiar o conteúdo e
-- colar manualmente no SQL Editor do Supabase, mediante autorização
-- separada da criação deste arquivo. Não foi executado como parte desta
-- implementação.
--
-- CORREÇÕES DA AUDITORIA PÓS-IMPLEMENTAÇÃO (2026-08-20): esta versão
-- corrige duas divergências reais encontradas por auditoria antes de
-- qualquer execução no Supabase -- (1) incrementar_storage_usado somava
-- "storage_usado_mb + p_mb" sem proteção contra NULL (coluna anulável),
-- o que produziria NULL silenciosamente em vez de acumular; corrigido
-- para "coalesce(storage_usado_mb, 0) + p_mb". (2) o pré-voo (Parte 1)
-- não verificava o estado anterior real de grants/policies de licencas
-- antes de alterá-los, só estrutura de tabela; adicionados os blocos
-- prevoo_grants_licencas e prevoo_policies_licencas, que exigem que o
-- estado atual seja reconhecível como o original (confirmado pela Fase
-- 1/2) ou o já corrigido, abortando em qualquer terceiro estado.
--
-- CORREÇÕES DA SEGUNDA AUDITORIA PÓS-IMPLEMENTAÇÃO (2026-08-20): (3)
-- prevoo_grants_licencas comparava só um booleano aproximado de
-- authenticated -- agora compara arrays ordenados de privilégio por
-- papel (PUBLIC/anon/authenticated/service_role) contra os dois únicos
-- estados exatos confirmados pela Fase 2. (4) prevoo_policies_licencas
-- ignorava WITH CHECK -- agora compara nome+comando+papéis+USING+WITH
-- CHECK das 5 policies originais, todos exatos. (5) novo bloco
-- prevoo_estado_funcoes_creditos_storage compara prosecdef, presença/
-- valor exato de search_path e ACL efetiva por papel das 5 funções
-- contra o estado original E o final, não só assinatura/retorno/owner
-- (que não mudam entre os dois estados). (6) a consulta de verificação
-- pós-execução tinha ORDER BY externo inválido após agregação sem GROUP
-- BY -- corrigido para ORDER BY dentro do agregado. (7) UUID real
-- removido do exemplo de teste funcional do rodapé, substituído por
-- marcador neutro.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 1 — pré-voo completo (licencas, ink_clientes, as 5 funções)
-- ══════════════════════════════════════════════════════════════════════════

-- 1a. licencas: existência, relkind, owner, RLS.
do $prevoo_tabela_licencas$
declare
  v_relkind "char";
  v_owner text;
  v_rls boolean;
begin
  select c.relkind, c.relowner::regrole::text, c.relrowsecurity
    into v_relkind, v_owner, v_rls
  from pg_class c
  where c.relname = 'licencas' and c.relnamespace = 'public'::regnamespace;

  if not found then
    raise exception 'Abortando (pré-voo): tabela public.licencas não encontrada.';
  end if;

  if v_relkind <> 'r' then
    raise exception 'Abortando (pré-voo): public.licencas não é uma tabela ordinária (relkind=%), esperado "r".', v_relkind;
  end if;

  if v_owner <> 'postgres' then
    raise exception 'Abortando (pré-voo): public.licencas tem owner "%", esperado "postgres".', v_owner;
  end if;

  if not v_rls then
    raise exception 'Abortando (pré-voo): public.licencas não tem RLS habilitada.';
  end if;

  raise notice 'Pré-voo: public.licencas existe, é tabela ordinária, owner postgres, RLS habilitada.';
end $prevoo_tabela_licencas$;

-- 1b. licencas: colunas essenciais.
do $prevoo_colunas_licencas$
declare
  r record;
  v_tipo text;
  v_nulavel text;
begin
  for r in
    select * from (values
      ('user_id', 'uuid', 'YES'),
      ('status', 'text', 'YES'),
      ('data_inicio', 'date', 'YES'),
      ('data_vencimento', 'date', 'YES'),
      ('created_at', 'timestamp without time zone', 'YES'),
      ('franquia_ilimitada', 'boolean', 'NO'),
      ('email_incluido_mes', 'integer', 'YES'),
      ('sms_incluido_mes', 'integer', 'YES')
    ) as esperado(coluna, tipo, nulavel)
  loop
    select data_type, is_nullable into v_tipo, v_nulavel
    from information_schema.columns
    where table_schema = 'public' and table_name = 'licencas' and column_name = r.coluna;

    if not found then
      raise exception 'Abortando (pré-voo): coluna public.licencas.% não encontrada.', r.coluna;
    end if;

    if v_tipo <> r.tipo then
      raise exception 'Abortando (pré-voo): public.licencas.% tem data_type "%", esperado "%".', r.coluna, v_tipo, r.tipo;
    end if;

    if v_nulavel <> r.nulavel then
      raise exception 'Abortando (pré-voo): public.licencas.% tem is_nullable "%", esperado "%".', r.coluna, v_nulavel, r.nulavel;
    end if;
  end loop;

  raise notice 'Pré-voo: colunas essenciais de public.licencas confirmadas.';
end $prevoo_colunas_licencas$;

-- 1c. ink_clientes: existência, owner, RLS, colunas tocadas pelas funções endurecidas.
do $prevoo_ink_clientes$
declare
  v_relkind "char";
  v_owner text;
  v_rls boolean;
  r record;
  v_tipo text;
  v_nulavel text;
begin
  select c.relkind, c.relowner::regrole::text, c.relrowsecurity
    into v_relkind, v_owner, v_rls
  from pg_class c
  where c.relname = 'ink_clientes' and c.relnamespace = 'public'::regnamespace;

  if not found then
    raise exception 'Abortando (pré-voo): tabela public.ink_clientes não encontrada.';
  end if;

  if v_relkind <> 'r' then
    raise exception 'Abortando (pré-voo): public.ink_clientes não é uma tabela ordinária (relkind=%).', v_relkind;
  end if;

  if v_owner <> 'postgres' then
    raise exception 'Abortando (pré-voo): public.ink_clientes tem owner "%", esperado "postgres".', v_owner;
  end if;

  if not v_rls then
    raise exception 'Abortando (pré-voo): public.ink_clientes não tem RLS habilitada.';
  end if;

  for r in
    select * from (values
      ('auth_user_id', 'uuid', 'YES'),
      ('email_credito_extra', 'numeric', 'NO'),
      ('sms_credito_extra', 'numeric', 'NO'),
      ('storage_usado_mb', 'integer', 'YES')
    ) as esperado(coluna, tipo, nulavel)
  loop
    select data_type, is_nullable into v_tipo, v_nulavel
    from information_schema.columns
    where table_schema = 'public' and table_name = 'ink_clientes' and column_name = r.coluna;

    if not found then
      raise exception 'Abortando (pré-voo): coluna public.ink_clientes.% não encontrada.', r.coluna;
    end if;

    if v_tipo <> r.tipo then
      raise exception 'Abortando (pré-voo): public.ink_clientes.% tem data_type "%", esperado "%".', r.coluna, v_tipo, r.tipo;
    end if;

    if v_nulavel <> r.nulavel then
      raise exception 'Abortando (pré-voo): public.ink_clientes.% tem is_nullable "%", esperado "%".', r.coluna, v_nulavel, r.nulavel;
    end if;
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.ink_clientes'::regclass and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (auth_user_id)'
  ) then
    raise exception 'Abortando (pré-voo): public.ink_clientes não tem a constraint UNIQUE(auth_user_id) esperada.';
  end if;

  raise notice 'Pré-voo: public.ink_clientes existe, owner postgres, RLS habilitada, colunas e UNIQUE(auth_user_id) confirmadas.';
end $prevoo_ink_clientes$;

-- 1d. As 5 funções: assinatura, retorno, owner -- antes de qualquer CREATE OR REPLACE.
do $prevoo_funcoes_creditos_storage$
declare
  r record;
  v_owner text;
begin
  for r in
    select * from (values
      ('comprar_credito_mensageria', 'p_user_id uuid, p_canal text, p_qtd integer', 'void'),
      ('comprar_recarga_mensageria', 'p_user_id uuid, p_ano_mes text, p_canal text, p_qtd integer', 'void'),
      ('consumir_credito_mensageria', 'p_user_id uuid, p_canal text, p_qtd integer', 'void'),
      ('comprar_storage_extra', 'p_user_id uuid, p_mb numeric', 'void'),
      ('incrementar_storage_usado', 'p_user_id uuid, p_mb numeric', 'void')
    ) as esperado(nome, assinatura, retorno)
  loop
    select p.proowner::regrole::text
      into v_owner
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = r.nome
      and pg_get_function_identity_arguments(p.oid) = r.assinatura
      and pg_get_function_result(p.oid) = r.retorno;

    if not found then
      raise exception
        'Abortando (pré-voo): public.%(%) não encontrada com a assinatura esperada (retorno %) -- não prosseguir sem revisão manual.',
        r.nome, r.assinatura, r.retorno;
    end if;

    if v_owner <> 'postgres' then
      raise exception 'Abortando (pré-voo): public.% tem owner "%", esperado "postgres".', r.nome, v_owner;
    end if;
  end loop;

  raise notice 'Pré-voo: as 5 funções existem com a assinatura/retorno esperados e owner postgres. Prosseguindo.';
end $prevoo_funcoes_creditos_storage$;

-- 1e. licencas: estado ANTERIOR real de grants -- CORREÇÃO (segunda
-- auditoria pós-implementação, 2026-08-20): a versão anterior aceitava
-- "qualquer estado em que authenticated não tenha só SELECT" como
-- "original", sem comparar exatamente. Agora compara arrays ORDENADOS de
-- privilégio por papel contra os dois únicos estados permitidos,
-- confirmados pela Fase 2 -- qualquer terceira combinação aborta.
do $prevoo_grants_licencas$
declare
  v_privs_completos constant text[] := array['DELETE', 'INSERT', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'];
  v_public_privs text[];
  v_anon_privs text[];
  v_authenticated_privs text[];
  v_service_role_privs text[];
  v_estado_original boolean;
  v_estado_final boolean;
begin
  select coalesce(array_agg(privilege_type order by privilege_type), array[]::text[]) into v_public_privs
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'licencas' and grantee = 'PUBLIC';
  select coalesce(array_agg(privilege_type order by privilege_type), array[]::text[]) into v_anon_privs
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'licencas' and grantee = 'anon';
  select coalesce(array_agg(privilege_type order by privilege_type), array[]::text[]) into v_authenticated_privs
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'licencas' and grantee = 'authenticated';
  select coalesce(array_agg(privilege_type order by privilege_type), array[]::text[]) into v_service_role_privs
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'licencas' and grantee = 'service_role';

  raise notice 'Pré-voo (grants exatos de licencas): PUBLIC=%; anon=%; authenticated=%; service_role=%.', v_public_privs, v_anon_privs, v_authenticated_privs, v_service_role_privs;

  v_estado_original :=
    v_public_privs = array[]::text[]
    and v_anon_privs = v_privs_completos
    and v_authenticated_privs = v_privs_completos
    and v_service_role_privs = v_privs_completos;

  v_estado_final :=
    v_public_privs = array[]::text[]
    and v_anon_privs = array[]::text[]
    and v_authenticated_privs = array['SELECT']::text[]
    and v_service_role_privs = v_privs_completos;

  if not (v_estado_original or v_estado_final) then
    raise exception 'Abortando (pré-voo): grants de licencas não batem exatamente com o estado original (PUBLIC=[], anon/authenticated/service_role=os 7 privilégios) nem com o estado final (PUBLIC=[], anon=[], authenticated=[SELECT], service_role=os 7 privilégios) -- encontrado PUBLIC=%, anon=%, authenticated=%, service_role=% -- revisão manual necessária.', v_public_privs, v_anon_privs, v_authenticated_privs, v_service_role_privs;
  end if;

  if v_estado_original then
    raise notice 'Pré-voo: licencas está exatamente no estado original de grants confirmado pela Fase 2 -- prosseguindo com a correção.';
  else
    raise notice 'Pré-voo: licencas já está exatamente no estado final de grants -- execução idempotente detectada.';
  end if;
end $prevoo_grants_licencas$;

-- 1f. licencas: estado ANTERIOR real de policies -- CORREÇÃO (segunda
-- auditoria pós-implementação): compara nome + comando + papéis + USING +
-- WITH CHECK das 5 policies originais, todos exatamente como confirmado
-- pela Fase 2 (WITH CHECK incluído -- não é mais ignorado). Só aceita as
-- 5 originais intactas OU só licencas_select_propria já corrigida --
-- qualquer mistura, ausência parcial ou terceira definição aborta.
do $prevoo_policies_licencas$
declare
  v_qtd int;
  r record;
  v_originais_ok int := 0;
  v_final_ok boolean := false;
  constant_total_originais constant int := 5;
begin
  select count(*) into v_qtd from pg_policies where schemaname = 'public' and tablename = 'licencas';
  raise notice 'Pré-voo (policies anteriores de licencas): % policy(ies) encontrada(s) no total.', v_qtd;

  for r in
    select * from (values
      ('Dono vê tudo', 'ALL', array['public']::name[], '(auth.uid() = user_id)'::text, null::text),
      ('licencas_delete_propria', 'DELETE', array['public']::name[], '(user_id = auth.uid())'::text, null::text),
      ('licencas_escrita_propria', 'INSERT', array['public']::name[], null::text, '(user_id = auth.uid())'::text),
      ('licencas_select', 'SELECT', array['public']::name[], '((user_id = auth.uid()) OR ((auth.jwt() ->> ''email''::text) = ''estudioabraaotattoo07@gmail.com''::text))'::text, null::text),
      ('licencas_update_propria', 'UPDATE', array['public']::name[], '(user_id = auth.uid())'::text, '(user_id = auth.uid())'::text)
    ) as esperado(nome, comando, papeis, using_esperado, with_check_esperado)
  loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = 'licencas' and policyname = r.nome
        and cmd = r.comando and roles = r.papeis
        and qual is not distinct from r.using_esperado
        and with_check is not distinct from r.with_check_esperado
    ) then
      v_originais_ok := v_originais_ok + 1;
    end if;
  end loop;

  if v_qtd = 1 and exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'licencas' and policyname = 'licencas_select_propria'
      and cmd = 'SELECT' and roles = array['authenticated']::name[]
      and qual = '(auth.uid() = user_id)' and with_check is null
  ) then
    v_final_ok := true;
  end if;

  if v_originais_ok = constant_total_originais and v_qtd = constant_total_originais then
    raise notice 'Pré-voo: as 5 policies originais de licencas confirmadas EXATAMENTE (nome+comando+papéis+USING+WITH CHECK) -- correção ainda não aplicada, prosseguindo.';
  elsif v_final_ok then
    raise notice 'Pré-voo: licencas já está exatamente no estado de policies corrigido -- execução idempotente detectada.';
  else
    raise exception 'Abortando (pré-voo): estado de policies de licencas não bate exatamente com o original nem com o corrigido (% de % originais batendo exatamente por nome+comando+papéis+USING+WITH CHECK, total de policies=%) -- nenhuma mistura, ausência parcial ou terceira definição é aceita, revisão manual necessária.', v_originais_ok, constant_total_originais, v_qtd;
  end if;
end $prevoo_policies_licencas$;

-- 1g. As 5 funções: estado ANTERIOR completo (segurança + configuração +
-- ACL efetiva) -- CORREÇÃO (segunda auditoria pós-implementação): o
-- pré-voo anterior (1d) só confirmava assinatura/retorno/owner, o que já
-- seria verdade tanto no estado original quanto no final (nenhum dos dois
-- muda assinatura/retorno/owner). Este bloco adicional distingue de fato
-- entre "ainda original" e "já corrigida" comparando prosecdef,
-- search_path (ausente vs "public, pg_temp" exato) e ACL efetiva exata
-- por papel de aplicação (PUBLIC/anon/authenticated/service_role) --
-- nunca confundindo isso com o acesso implícito do owner postgres, que
-- não é comparado aqui (é sempre garantido por ownership, já verificado
-- em 1d, independente de grant).
do $prevoo_estado_funcoes_creditos_storage$
declare
  r record;
  v_oid oid;
  v_prosecdef boolean;
  v_proconfig text[];
  v_tem_search_path_exato boolean;
  v_tem_qualquer_search_path boolean;
  v_cfg text;
  v_public boolean;
  v_anon boolean;
  v_authenticated boolean;
  v_service_role boolean;
  v_estado_original boolean;
  v_estado_final boolean;
begin
  for r in
    -- Colunas: nome, assinatura,
    --   prosecdef_original,
    --   original_public, original_anon, original_authenticated, original_service_role,
    --   final_public, final_anon, final_authenticated, final_service_role
    select * from (values
      ('comprar_credito_mensageria', 'p_user_id uuid, p_canal text, p_qtd integer',
        true,
        false, false, true, true,
        false, false, false, false),
      ('comprar_recarga_mensageria', 'p_user_id uuid, p_ano_mes text, p_canal text, p_qtd integer',
        false,
        false, false, false, true,
        false, false, false, false),
      ('comprar_storage_extra', 'p_user_id uuid, p_mb numeric',
        true,
        true, true, true, true,
        false, false, false, false),
      ('consumir_credito_mensageria', 'p_user_id uuid, p_canal text, p_qtd integer',
        true,
        false, false, true, true,
        false, false, true, false),
      ('incrementar_storage_usado', 'p_user_id uuid, p_mb numeric',
        true,
        true, true, true, true,
        false, false, true, false)
    ) as esperado(nome, assinatura, prosecdef_original,
                   original_public, original_anon, original_authenticated, original_service_role,
                   final_public, final_anon, final_authenticated, final_service_role)
  loop
    select p.oid into v_oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = r.nome and pg_get_function_identity_arguments(p.oid) = r.assinatura;

    if v_oid is null then
      raise exception 'Abortando (pré-voo): public.%(%) não encontrada.', r.nome, r.assinatura;
    end if;

    select prosecdef, proconfig into v_prosecdef, v_proconfig from pg_proc where oid = v_oid;

    v_tem_qualquer_search_path := false;
    v_tem_search_path_exato := false;
    if v_proconfig is not null then
      for v_cfg in select unnest(v_proconfig) loop
        if v_cfg like 'search_path=%' then
          v_tem_qualquer_search_path := true;
          if regexp_replace(substring(v_cfg from 'search_path=(.*)'), '\s', '', 'g') = 'public,pg_temp' then
            v_tem_search_path_exato := true;
          end if;
        end if;
      end loop;
    end if;

    v_public := exists (
      select 1 from aclexplode(coalesce((select proacl from pg_proc where oid = v_oid), acldefault('f', (select proowner from pg_proc where oid = v_oid)))) a
      where a.grantee = 0 and a.privilege_type = 'EXECUTE'
    );
    v_anon := has_function_privilege('anon', v_oid, 'EXECUTE');
    v_authenticated := has_function_privilege('authenticated', v_oid, 'EXECUTE');
    v_service_role := has_function_privilege('service_role', v_oid, 'EXECUTE');

    v_estado_original :=
      v_prosecdef = r.prosecdef_original
      and not v_tem_qualquer_search_path
      and v_public = r.original_public and v_anon = r.original_anon
      and v_authenticated = r.original_authenticated and v_service_role = r.original_service_role;

    v_estado_final :=
      v_prosecdef = true
      and v_tem_search_path_exato
      and v_public = r.final_public and v_anon = r.final_anon
      and v_authenticated = r.final_authenticated and v_service_role = r.final_service_role;

    if not (v_estado_original or v_estado_final) then
      raise exception 'Abortando (pré-voo): public.%(%) não bate exatamente com o estado original nem com o final -- prosecdef=%, tem_search_path=%, PUBLIC=%, anon=%, authenticated=%, service_role=% -- revisão manual necessária.',
        r.nome, r.assinatura, v_prosecdef, v_tem_qualquer_search_path, v_public, v_anon, v_authenticated, v_service_role;
    end if;

    if v_estado_original then
      raise notice 'Pré-voo: public.% está exatamente no estado original confirmado pela Fase 2 -- prosseguindo com a correção.', r.nome;
    else
      raise notice 'Pré-voo: public.% já está exatamente no estado final desta migration -- execução idempotente detectada.', r.nome;
    end if;
  end loop;

  raise notice 'Pré-voo: estado anterior completo (segurança + configuração + ACL) das 5 funções confirmado -- cada uma bate exatamente com o original ou com o final, nenhuma mistura.';
end $prevoo_estado_funcoes_creditos_storage$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 2 — as 5 funções (3 congeladas, fail-closed + 2 endurecidas)
-- ══════════════════════════════════════════════════════════════════════════

-- ── Congelada: nenhum acesso além do owner implícito; corpo sem DML ────────
create or replace function public.comprar_credito_mensageria(
  p_user_id uuid,
  p_canal text,
  p_qtd integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  raise exception 'comprar_credito_mensageria: operação de compra direta desativada até a ativação do pagamento integrado';
end;
$function$;

-- ── Congelada: órfã (nenhum consumidor real encontrado nos três
-- repositórios), mantida por precaução, não removida precipitadamente ──────
create or replace function public.comprar_recarga_mensageria(
  p_user_id uuid,
  p_ano_mes text,
  p_canal text,
  p_qtd integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  raise exception 'comprar_recarga_mensageria: operação de compra direta desativada até a ativação do pagamento integrado';
end;
$function$;

-- ── Congelada: tinha EXECUTE para PUBLIC/anon -- fechada por completo ──────
create or replace function public.comprar_storage_extra(
  p_user_id uuid,
  p_mb numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  raise exception 'comprar_storage_extra: operação de compra direta desativada até a ativação do pagamento integrado';
end;
$function$;

-- ── Endurecida: único consumidor real confirmado hoje (ink-system-1.0) ─────
create or replace function public.consumir_credito_mensageria(
  p_user_id uuid,
  p_canal text,
  p_qtd integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_afetadas int;
begin
  -- ── Segurança: mesmo padrão já usado em toda RPC desta engenharia. O
  -- corpo anterior comparava "p_user_id != auth.uid()" diretamente, o que
  -- deixava passar quando p_user_id era nulo (NULL <> qualquer coisa
  -- avalia para NULL, não verdadeiro -- a checagem simplesmente não
  -- disparava). Corrigido tratando auth.uid() nulo e p_user_id nulo em
  -- passos separados, nunca numa única comparação. ─────────────────────────
  if session_user <> 'postgres' then
    if auth.uid() is null then
      raise exception 'consumir_credito_mensageria: not authorized -- no active session (auth.uid() is null)';
    end if;
    if auth.uid() <> p_user_id then
      raise exception 'consumir_credito_mensageria: not authorized -- p_user_id does not match the authenticated session';
    end if;
  end if;

  if p_user_id is null then
    raise exception 'consumir_credito_mensageria: p_user_id is required';
  end if;

  if p_canal not in ('email', 'sms') then
    raise exception 'consumir_credito_mensageria: invalid p_canal "%", expected "email" or "sms"', p_canal;
  end if;

  if p_qtd is null or p_qtd <= 0 then
    raise exception 'consumir_credito_mensageria: p_qtd must be a positive integer, got %', p_qtd;
  end if;

  -- ── Consumo atômico condicionado a saldo suficiente -- decisão desta
  -- rodada: nunca consumir parcialmente até zero. Se p_qtd > saldo
  -- disponível, a linha não é afetada (WHERE ... >= p_qtd falha) e
  -- GET DIAGNOSTICS confirma isso abaixo, abortando a transação. O
  -- UPDATE condicional numa única instrução é seguro contra concorrência
  -- sem precisar de SELECT ... FOR UPDATE explícito: duas chamadas
  -- concorrentes disputando o mesmo saldo são serializadas pelo próprio
  -- bloqueio de linha do Postgres -- a segunda só prossegue depois que a
  -- primeira commita, e nesse momento reavalia o WHERE contra o valor já
  -- decrementado (mesmo raciocínio já comprovado em reservar_disparo/C.1
  -- para evitar reserva dupla da última unidade). ─────────────────────────
  if p_canal = 'email' then
    update public.ink_clientes
      set email_credito_extra = email_credito_extra - p_qtd
      where auth_user_id = p_user_id and email_credito_extra >= p_qtd;
  else
    update public.ink_clientes
      set sms_credito_extra = sms_credito_extra - p_qtd
      where auth_user_id = p_user_id and sms_credito_extra >= p_qtd;
  end if;

  get diagnostics v_afetadas = row_count;
  if v_afetadas = 0 then
    raise exception 'consumir_credito_mensageria: saldo insuficiente ou conta não encontrada';
  end if;
end;
$function$;

-- ── Endurecida: consumidor legítimo confirmado (logStorage, CRM.tsx) ───────
create or replace function public.incrementar_storage_usado(
  p_user_id uuid,
  p_mb numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_afetadas int;
begin
  if session_user <> 'postgres' then
    if auth.uid() is null then
      raise exception 'incrementar_storage_usado: not authorized -- no active session (auth.uid() is null)';
    end if;
    if auth.uid() <> p_user_id then
      raise exception 'incrementar_storage_usado: not authorized -- p_user_id does not match the authenticated session';
    end if;
  end if;

  if p_user_id is null then
    raise exception 'incrementar_storage_usado: p_user_id is required';
  end if;

  -- Sem arredondamento nem teto superior nesta correção -- CRM.tsx
  -- (logStorage) sempre envia um valor fracionário (bytes / 1024 / 1024),
  -- nunca arredondado no frontend; só fecha a vulnerabilidade real
  -- (nulo/zero/negativo), sem alterar a semântica numérica existente.
  if p_mb is null or p_mb <= 0 then
    raise exception 'incrementar_storage_usado: p_mb must be a positive number, got %', p_mb;
  end if;

  -- CORREÇÃO (auditoria pós-implementação, 2026-08-20): storage_usado_mb é
  -- anulável (confirmado no pré-voo desta migration) -- "storage_usado_mb
  -- + p_mb" sem proteção resultaria em NULL quando a coluna já for NULL
  -- (aritmética de NULL em Postgres), afetando a linha (ROW_COUNT=1) sem
  -- nenhum erro, mas gravando NULL em vez de acumular -- falso sucesso
  -- silencioso. coalesce(storage_usado_mb, 0) fecha isso.
  update public.ink_clientes
    set storage_usado_mb = coalesce(storage_usado_mb, 0) + p_mb
    where auth_user_id = p_user_id;

  get diagnostics v_afetadas = row_count;
  if v_afetadas = 0 then
    raise exception 'incrementar_storage_usado: no matching account found for the given user';
  end if;

  -- Documentado para revisão futura: esta medição hoje é gravada direto
  -- pelo cliente após um upload, confiando no valor que o frontend
  -- calcula e envia. O caminho ideal seria medir no servidor -- não
  -- corrigido nesta rodada, fora de escopo.
  --
  -- DÍVIDA TÉCNICA REGISTRADA (auditoria pós-implementação, 2026-08-20):
  -- storage_usado_mb é integer, mas p_mb é numeric (fracionário, conforme
  -- logStorage envia). A soma "coalesce(storage_usado_mb, 0) + p_mb"
  -- produz um resultado numeric que sofre cast implícito de volta para
  -- integer na atribuição -- arredondando (não truncando) a cada
  -- gravação. Comportamento pré-existente (a coluna já era integer antes
  -- desta correção) -- não alterado aqui, fora de escopo desta correção;
  -- registrado para decisão futura (ex.: mudar a coluna para numeric).
end;
$function$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 3 — grants das 5 funções, por assinatura exata
-- ══════════════════════════════════════════════════════════════════════════
-- Congeladas: sem GRANT explícito para postgres -- acesso implícito de
-- owner, por decisão desta rodada (não preparar para reabertura futura).

revoke all on function public.comprar_credito_mensageria(uuid, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.comprar_recarga_mensageria(uuid, text, text, integer) from public, anon, authenticated, service_role;
revoke all on function public.comprar_storage_extra(uuid, numeric) from public, anon, authenticated, service_role;

revoke all on function public.consumir_credito_mensageria(uuid, text, integer) from public, anon, service_role;
grant execute on function public.consumir_credito_mensageria(uuid, text, integer) to authenticated, postgres;

revoke all on function public.incrementar_storage_usado(uuid, numeric) from public, anon, service_role;
grant execute on function public.incrementar_storage_usado(uuid, numeric) to authenticated, postgres;

-- Verificação ativa -- fail-closed -- por oid exato (nome + assinatura
-- completa), nunca por routine_name isolado.
do $verificar_grants_5_funcoes$
declare
  r record;
  v_oid oid;
  v_public_tem_execute boolean;
  v_authenticated_real boolean;
begin
  for r in
    select * from (values
      ('comprar_credito_mensageria', 'p_user_id uuid, p_canal text, p_qtd integer', false),
      ('comprar_recarga_mensageria', 'p_user_id uuid, p_ano_mes text, p_canal text, p_qtd integer', false),
      ('comprar_storage_extra', 'p_user_id uuid, p_mb numeric', false),
      ('consumir_credito_mensageria', 'p_user_id uuid, p_canal text, p_qtd integer', true),
      ('incrementar_storage_usado', 'p_user_id uuid, p_mb numeric', true)
    ) as esperado(nome, assinatura, authenticated_deve_ter_execute)
  loop
    select p.oid into v_oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = r.nome
      and pg_get_function_identity_arguments(p.oid) = r.assinatura;

    if v_oid is null then
      raise exception 'Abortando: public.%(%) não encontrada para verificação de grants.', r.nome, r.assinatura;
    end if;

    v_authenticated_real := has_function_privilege('authenticated', v_oid, 'EXECUTE');
    if v_authenticated_real <> r.authenticated_deve_ter_execute then
      raise exception 'Abortando: authenticated tem EXECUTE=% em public.%(%), esperado %.', v_authenticated_real, r.nome, r.assinatura, r.authenticated_deve_ter_execute;
    end if;

    if has_function_privilege('anon', v_oid, 'EXECUTE') then
      raise exception 'Abortando: anon tem EXECUTE em public.%(%).', r.nome, r.assinatura;
    end if;

    if has_function_privilege('service_role', v_oid, 'EXECUTE') then
      raise exception 'Abortando: service_role tem EXECUTE em public.%(%).', r.nome, r.assinatura;
    end if;

    select exists (
      select 1
      from aclexplode(
        coalesce(
          (select proacl from pg_proc where oid = v_oid),
          acldefault('f', (select proowner from pg_proc where oid = v_oid))
        )
      ) a
      where a.grantee = 0 and a.privilege_type = 'EXECUTE'
    ) into v_public_tem_execute;

    if v_public_tem_execute then
      raise exception 'Abortando: PUBLIC (grantee=0) tem EXECUTE direto em public.%(%).', r.nome, r.assinatura;
    end if;

    -- postgres: acesso garantido por ownership (já confirmado no
    -- pré-voo), independente de GRANT explícito -- checagem documental,
    -- não linha de defesa real.
    if not has_function_privilege('postgres', v_oid, 'EXECUTE') then
      raise exception 'Abortando: postgres não tem EXECUTE (nem implícito por ownership) em public.%(%).', r.nome, r.assinatura;
    end if;
  end loop;

  raise notice 'Grants das 5 funções confirmados por assinatura exata: 3 congeladas sem acesso de aplicação nenhum; consumir_credito_mensageria e incrementar_storage_usado com authenticated; anon/PUBLIC/service_role sem EXECUTE em nenhuma.';
end $verificar_grants_5_funcoes$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 4 — grants de licencas (PUBLIC, anon e authenticated travados)
-- ══════════════════════════════════════════════════════════════════════════
-- service_role preservado sem alteração -- sustenta o Painel do
-- Administrador (leitura completa e escrita real) e api/config.js
-- (?acao=resetDemo). REVOKE de PUBLIC (pseudo-papel) e de anon/
-- authenticated (papéis nomeados, cobrindo o caminho de Default
-- Privileges do schema) juntos -- mesmo padrão já usado em toda migration
-- desta engenharia.

revoke all on table public.licencas from public, anon, authenticated;
grant select on table public.licencas to authenticated;

do $verificar_grants_licencas$
declare
  v_publico int;
  v_anon int;
  v_authenticated_escrita int;
  v_authenticated_select int;
begin
  select count(*) into v_publico
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'licencas' and grantee = 'PUBLIC';

  if v_publico <> 0 then
    raise exception 'Abortando: PUBLIC ainda tem % privilégio(s) em licencas.', v_publico;
  end if;

  select count(*) into v_anon
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'licencas' and grantee = 'anon';

  if v_anon <> 0 then
    raise exception 'Abortando: anon ainda tem % privilégio(s) em licencas.', v_anon;
  end if;

  select count(*) into v_authenticated_escrita
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'licencas' and grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');

  if v_authenticated_escrita <> 0 then
    raise exception 'Abortando: authenticated ainda tem % privilégio(s) de escrita/TRUNCATE em licencas.', v_authenticated_escrita;
  end if;

  select count(*) into v_authenticated_select
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'licencas' and grantee = 'authenticated' and privilege_type = 'SELECT';

  if v_authenticated_select <> 1 then
    raise exception 'Abortando: authenticated não tem exatamente 1 grant de SELECT em licencas -- encontrado %.', v_authenticated_select;
  end if;

  raise notice 'Grants de licencas confirmados: PUBLIC e anon sem nenhum privilégio; authenticated só com SELECT; service_role preservado.';
end $verificar_grants_licencas$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 5 — policies de licencas (só 1 de SELECT, sem exceção de e-mail)
-- ══════════════════════════════════════════════════════════════════════════

-- 5a. Remove dinamicamente qualquer policy de INSERT/UPDATE/DELETE/ALL --
-- busca por nome real, nunca presumido.
do $remover_policies_escrita_licencas$
declare
  r record;
  v_removidas int := 0;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'licencas' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on public.licencas', r.policyname);
    v_removidas := v_removidas + 1;
    raise notice 'Policy % removida de licencas.', r.policyname;
  end loop;

  if v_removidas = 0 then
    raise notice 'Nenhuma policy de escrita/ALL encontrada em licencas -- nada a remover (execução idempotente).';
  end if;
end $remover_policies_escrita_licencas$;

-- 5b. Corrige a policy de SELECT: cria se ausente; se existir com
-- definição diferente da esperada (ex.: a exceção de e-mail fixo), a
-- substitui por uma nova policy limpa -- nunca presume, sempre compara.
do $corrigir_policy_select_licencas$
declare
  v_qtd int;
  v_policyname text;
  v_qual text;
begin
  select count(*) into v_qtd
  from pg_policies where schemaname = 'public' and tablename = 'licencas' and cmd = 'SELECT';

  if v_qtd = 0 then
    create policy licencas_select_propria on public.licencas
      for select to authenticated using (auth.uid() = user_id);
    raise notice 'Policy licencas_select_propria criada em licencas.';
  elsif v_qtd = 1 then
    select policyname, qual into v_policyname, v_qual
    from pg_policies where schemaname = 'public' and tablename = 'licencas' and cmd = 'SELECT';

    if v_qual is distinct from '(auth.uid() = user_id)' then
      execute format('drop policy %I on public.licencas', v_policyname);
      create policy licencas_select_propria on public.licencas
        for select to authenticated using (auth.uid() = user_id);
      raise notice 'Policy de SELECT de licencas (% ) tinha definição divergente -- substituída por licencas_select_propria, sem exceção de e-mail fixo.', v_policyname;
    else
      raise notice 'Policy de SELECT de licencas já está correta -- nada a fazer (execução idempotente).';
    end if;
  else
    raise exception 'Abortando: licencas tem % policies de SELECT, esperado no máximo 1 antes desta correção -- revisão manual necessária.', v_qtd;
  end if;
end $corrigir_policy_select_licencas$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 6 — verificação final (pós-voo): policies, ownership, search_path
-- ══════════════════════════════════════════════════════════════════════════

do $verificar_policies_final_licencas$
declare
  v_escrita int;
  v_select int;
  v_papeis name[];
  v_qual text;
begin
  select count(*) into v_escrita
  from pg_policies
  where schemaname = 'public' and tablename = 'licencas' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  if v_escrita <> 0 then
    raise exception 'Abortando: % policy(ies) de escrita/ALL ainda presente(s) em licencas -- esperado zero.', v_escrita;
  end if;

  select count(*) into v_select
  from pg_policies where schemaname = 'public' and tablename = 'licencas' and cmd = 'SELECT';

  if v_select <> 1 then
    raise exception 'Abortando: licencas tem % policy(ies) de SELECT, esperado exatamente 1.', v_select;
  end if;

  select roles, qual into v_papeis, v_qual
  from pg_policies where schemaname = 'public' and tablename = 'licencas' and cmd = 'SELECT';

  if v_papeis <> array['authenticated']::name[] then
    raise exception 'Abortando: policy de SELECT de licencas tem papéis %, esperado {authenticated}.', v_papeis;
  end if;

  if v_qual is distinct from '(auth.uid() = user_id)' then
    raise exception 'Abortando: policy de SELECT de licencas tem qual "%", esperado "(auth.uid() = user_id)".', v_qual;
  end if;

  raise notice 'Confirmado (pós-voo): licencas com zero policies de escrita e exatamente 1 de SELECT, papel authenticated, sem exceção de e-mail.';
end $verificar_policies_final_licencas$;

do $verificar_ownership_final$
declare
  v_owner_licencas text;
  v_owner_ink_clientes text;
begin
  select relowner::regrole::text into v_owner_licencas
  from pg_class where relname = 'licencas' and relnamespace = 'public'::regnamespace;

  if v_owner_licencas <> 'postgres' then
    raise exception 'Abortando (pós-voo): public.licencas tem owner "%", esperado "postgres".', v_owner_licencas;
  end if;

  select relowner::regrole::text into v_owner_ink_clientes
  from pg_class where relname = 'ink_clientes' and relnamespace = 'public'::regnamespace;

  if v_owner_ink_clientes <> 'postgres' then
    raise exception 'Abortando (pós-voo): public.ink_clientes tem owner "%", esperado "postgres".', v_owner_ink_clientes;
  end if;

  raise notice 'Confirmado (pós-voo): owner de licencas e ink_clientes continua postgres.';
end $verificar_ownership_final$;

do $verificar_search_path_5_funcoes$
declare
  r record;
  v_proconfig text[];
  v_cfg text;
  v_encontrado boolean;
  v_owner text;
begin
  for r in
    select unnest(array[
      'comprar_credito_mensageria', 'comprar_recarga_mensageria', 'comprar_storage_extra',
      'consumir_credito_mensageria', 'incrementar_storage_usado'
    ]) as nome
  loop
    select p.proconfig, p.proowner::regrole::text into v_proconfig, v_owner
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = r.nome
    limit 1;

    if v_owner <> 'postgres' then
      raise exception 'Abortando (pós-voo): public.% tem owner "%", esperado "postgres".', r.nome, v_owner;
    end if;

    v_encontrado := false;
    if v_proconfig is not null then
      for v_cfg in select unnest(v_proconfig) loop
        if v_cfg like 'search_path=%' then
          v_encontrado := true;
          if regexp_replace(substring(v_cfg from 'search_path=(.*)'), '\s', '', 'g') <> 'public,pg_temp' then
            raise exception 'Abortando (pós-voo): public.% tem search_path "%", esperado exatamente "public, pg_temp".', r.nome, v_cfg;
          end if;
        end if;
      end loop;
    end if;

    if not v_encontrado then
      raise exception 'Abortando (pós-voo): public.% não tem search_path fixado.', r.nome;
    end if;
  end loop;

  raise notice 'Confirmado (pós-voo): as 5 funções têm search_path exatamente "public, pg_temp" e owner postgres.';
end $verificar_search_path_5_funcoes$;

COMMIT;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente, FORA desta
-- transação -- são só consultas de leitura, comentadas, nunca executadas
-- automaticamente por este arquivo) ────────────────────────────────────────
-- 1) Definição completa das 5 funções:
-- select p.proname, pg_get_functiondef(p.oid) as definicao
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('comprar_credito_mensageria', 'comprar_recarga_mensageria',
--                      'consumir_credito_mensageria', 'comprar_storage_extra',
--                      'incrementar_storage_usado');
--
-- 2) Grants finais de licencas (ORDER BY dentro do array_agg -- correto
-- para agregação sem GROUP BY; nunca ORDER BY externo depois de agregar):
-- select json_agg(
--   json_build_object('papel', grantee, 'privilegio', privilege_type)
--   order by grantee, privilege_type
-- ) as grants_licencas
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'licencas';
--
-- 3) Policies finais de licencas:
-- select policyname, cmd, roles, qual, with_check from pg_policies
-- where schemaname = 'public' and tablename = 'licencas';
--
-- 4) Consolidado completo (mesma consulta entregue na preparação de
-- homologação -- reproduzida aqui, corrigida, para ficar junto do arquivo
-- que ela verifica; ORDER BY sempre dentro do agregado, nunca externo):
-- select json_build_object(
--   'gerado_em', now(),
--   'funcoes_seguranca', (
--     select json_agg(json_build_object(
--       'nome', p.proname, 'assinatura', pg_get_function_identity_arguments(p.oid),
--       'owner', p.proowner::regrole::text, 'security_definer', p.prosecdef, 'search_path', p.proconfig,
--       'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
--       'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
--       'service_role_execute', has_function_privilege('service_role', p.oid, 'EXECUTE')
--     ) order by p.proname)
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--     where n.nspname = 'public'
--       and p.proname in ('comprar_credito_mensageria', 'comprar_recarga_mensageria',
--                          'consumir_credito_mensageria', 'comprar_storage_extra',
--                          'incrementar_storage_usado')
--   ),
--   'licencas_grants', (
--     select json_agg(json_build_object('papel', grantee, 'privilegio', privilege_type) order by grantee, privilege_type)
--     from information_schema.role_table_grants
--     where table_schema = 'public' and table_name = 'licencas'
--   ),
--   'licencas_policies', (
--     select json_agg(json_build_object('nome', policyname, 'comando', cmd, 'papeis', roles, 'using', qual, 'with_check', with_check) order by policyname)
--     from pg_policies where schemaname = 'public' and tablename = 'licencas'
--   ),
--   'creditos_e_storage_agregados', (
--     select json_build_object(
--       'soma_email_credito_extra', coalesce(sum(email_credito_extra), 0),
--       'soma_sms_credito_extra', coalesce(sum(sms_credito_extra), 0),
--       'soma_storage_usado_mb', coalesce(sum(storage_usado_mb), 0)
--     )
--     from public.ink_clientes
--   )
-- ) as verificacao_pos_execucao;
--
-- 5) Teste funcional opcional -- NÃO faz parte da homologação obrigatória
-- e NÃO deve ser copiado com um UUID inventado. <UUID_REAL_DO_USUARIO> é
-- um marcador neutro, não um valor executável -- substitua pelo UUID real
-- de uma conta de teste antes de rodar, ou (preferível) mantenha este
-- teste funcional num roteiro de homologação separado, fora desta
-- migration, decidido e escrito à parte:
-- select comprar_credito_mensageria('<UUID_REAL_DO_USUARIO>'::uuid, 'email', 100);
-- -- esperado: exceção "operação de compra direta desativada...".
