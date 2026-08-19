-- Bloco Corretivo de Segurança — Mensageria Legada
-- Ver: "AUDITORIA DE SEGURANÇA CORRETIVA DA MENSAGERIA LEGADA" (19/08/2026),
-- a implementação original, e duas rodadas de auditoria/correção da própria
-- migration (a segunda revelou que pré-voo, verificação de constraints,
-- policies, ownership, search_path e grants estavam menos rigorosos do que
-- deveriam -- corrigido aqui). Independente do Bloco D (C.1 já publicado;
-- D.2/D.3 ainda não implementados).
--
-- ACHADO QUE MOTIVA ESTE ARQUIVO: diagnóstico real no Supabase confirmou que
-- incrementar_uso_mensageria e registrar_falha_mensageria são
-- SECURITY DEFINER, dono postgres, com EXECUTE concedido a PUBLIC/anon/
-- authenticated/service_role, e NENHUMA validação de auth.uid() -- ou seja,
-- qualquer chamada anônima (sem login, só com a chave pública) podia alterar
-- o uso registrado de QUALQUER tenant, ou inserir falhas falsas em nome de
-- qualquer tenant. incrementar_uso_diario, por ser SECURITY INVOKER, tinha
-- exposição menor (a RLS de mensageria_diario provavelmente já bloqueava
-- escrita cruzada entre tenants), mas nenhuma validação de p_qtd permitia
-- que um tenant manipulasse os próprios números livremente (inclusive
-- negativo).
--
-- ESCOPO (autorizado explicitamente, nada além disso):
--   1. Reforçar as três funções, preservando EXATAMENTE as assinaturas e o
--      comportamento legítimo atual -- nenhum caminho de chamada existente
--      (os ~20 pontos em CRM Casa dos Carvalho.tsx que passam por logEnvio/
--      logFalha) precisa mudar uma linha de código.
--   2. Ajustar grants de função e de tabela, e remover as duas policies de
--      escrita de mensageria_diario (a escrita passa a ser só via função
--      SECURITY DEFINER, mesmo padrão das outras duas).
--   3. Adicionar constraints de integridade (não-negatividade, formato),
--      já confirmadas seguras contra os dados reais existentes (diagnóstico
--      prévio: nenhum contador negativo, nenhum ano_mes inválido, nenhum
--      canal inválido em mensageria_falhas).
--   4. incrementar_uso_diario passa de SECURITY INVOKER para SECURITY
--      DEFINER -- mudança deliberada de modelo de segurança (não uma
--      preservação), necessária porque os grants diretos de INSERT/UPDATE
--      de authenticated na tabela mensageria_diario são revogados nesta
--      mesma migration; se a função permanecesse INVOKER, perderia
--      capacidade de escrita legítima.
--
-- FORA DE ESCOPO NESTE ARQUIVO: nenhuma alteração de assinatura; nenhum
-- bypass de service_role (removido, não reintroduzido); nenhuma alteração
-- em CRM.tsx nem em nenhum arquivo de aplicação; nenhuma implementação de
-- confirmar_disparo/estornar_disparo; nenhum limite superior de p_qtd;
-- nenhuma alteração de ALTER DEFAULT PRIVILEGES do schema (a correção é
-- explícita, por objeto, mesmo padrão já usado no C.1); nenhuma alteração
-- de owner (se ownership divergir do esperado, a migration aborta e exige
-- revisão manual, nunca corrige automaticamente).
--
-- POR QUE PRESERVAR A ASSINATURA: os ~20 pontos de chamada em CRM.tsx (via
-- logEnvio/logFalha, linhas 1823-1839) sempre passam p_user_id = userId (o
-- próprio id da sessão logada, nunca um valor arbitrário) -- por isso a
-- checagem "auth.uid() = p_user_id" adicionada abaixo não quebra nenhum uso
-- legítimo existente, só rejeita quem tentar informar um p_user_id alheio
-- (ou chamar sem sessão nenhuma). Mesmo padrão já comprovado com sucesso em
-- comprar_credito_mensageria, consumir_credito_mensageria,
-- comprar_recarga_mensageria e reservar_disparo, nesta mesma engenharia.
--
-- SEGURANÇA -- padrão idêntico ao já usado em toda RPC desta engenharia:
--   * session_user = 'postgres' -> único bypass, só para homologação manual
--     no SQL Editor -- não concede capacidade nova (quem já é postgres já é
--     onipotente neste banco).
--   * qualquer outra chamada -> exige auth.uid() não nulo E igual a
--     p_user_id. auth.uid() IS NULL é checado separadamente e primeiro
--     (nunca embutido numa comparação), para não repetir o bug de bypass
--     por NULL já corrigido nesta engenharia em rodadas anteriores.
--   * NENHUM bypass por service_role/auth.role() -- decisão deliberada, sem
--     consumidor server-to-server real hoje para nenhuma das três.
--
-- search_path: SET search_path = public, pg_temp -- verificado ao final
-- (Parte 8) por valor EXATO (não só presença), normalizando apenas espaços
-- em branco na comparação, nunca aceitando um search_path diferente do
-- esperado.
--
-- PRÉ-VOO COMPLETO (Parte 1) -- correção desta rodada: a versão anterior só
-- verificava a assinatura das três funções antes de agir. Esta versão
-- verifica, ANTES de qualquer CREATE OR REPLACE / REVOKE / DROP POLICY /
-- ALTER TABLE: que as três tabelas existem, são tabelas ordinárias
-- (relkind='r'), têm owner postgres, têm RLS habilitada; que as colunas
-- essenciais de cada tabela existem com tipo/nulabilidade/default
-- corretos; que as constraints UNIQUE (user_id, ano_mes) e
-- (user_id, dia) existem; e que as três funções existem com a assinatura
-- e o retorno esperados, com owner postgres. Qualquer divergência aborta
-- a migration inteira antes de qualquer alteração.
--
-- VERIFICAÇÃO DE CONSTRAINTS POR DEFINIÇÃO, NÃO SÓ NOME (Parte 7) --
-- correção desta rodada: a versão anterior só conferia se existia uma
-- constraint com aquele nome (via pg_constraint.conname), o que deixaria
-- passar silenciosamente uma constraint pré-existente com o mesmo nome mas
-- regra diferente. Agora cada constraint é comparada via
-- pg_get_expr(conbin, conrelid) contra uma forma canônica esperada,
-- documentada abaixo -- se existir com nome igual mas definição diferente,
-- a migration aborta (nunca remove nem substitui silenciosamente).
--
-- FORMAS CANÔNICAS DOCUMENTADAS (Parte 7): o Postgres reformata expressões
-- de CHECK ao armazená-las -- confirmado empiricamente neste mesmo banco
-- durante a homologação do C.1, onde "canal in ('email','sms')" foi
-- persistido e devolvido como
-- "(canal = ANY (ARRAY['email'::text, 'sms'::text]))". A forma canônica de
-- mensageria_falhas_canal_check abaixo usa exatamente esse padrão já
-- confirmado -- alta confiança. Para as comparações numéricas simples
-- (>= 0) e a expressão de regex de ano_mes, a forma canônica foi inferida
-- pelo comportamento padrão documentado do deparser do Postgres
-- (pg_get_expr envolve a expressão de nível superior de um CHECK em um
-- par de parênteses; literais de texto recebem cast ::text explícito) --
-- confiança razoável, mas não confirmada empiricamente neste banco. Se a
-- execução real divergir, a migration abortará nomeando o texto
-- exatamente encontrado -- nesse caso a forma canônica aqui precisa ser
-- corrigida numa nova rodada, nunca presumida como definitiva de antemão.
--
-- POLICIES SELECT -- VERIFICAÇÃO POSITIVA (Parte 6): a versão anterior só
-- confirmava ausência de policy de escrita. Esta versão também confirma
-- POSITIVAMENTE que exatamente uma policy de SELECT existe em cada uma das
-- três tabelas, com o papel correto (mensageria_uso: public;
-- mensageria_diario: authenticated; mensageria_falhas: public -- estado
-- real confirmado por você) e a expressão exata "(auth.uid() = user_id)".
--
-- OWNERSHIP (Partes 1 e 8): confirmado no pré-voo (antes de qualquer
-- alteração) e reconfirmado ao final (pós-voo) que as três tabelas e as
-- três funções continuam com owner postgres -- esta migration nunca
-- executa ALTER ... OWNER TO, então ownership não pode mudar como efeito
-- colateral dela; a checagem em dois momentos é defesa em profundidade,
-- não uma correção de algo que este arquivo altera.
--
-- GRANTS POR ASSINATURA EXATA (Parte 3): a versão anterior verificava
-- grants via information_schema.role_routine_grants filtrado só por
-- routine_name -- o que poderia, em tese, ser satisfeito por um overload
-- diferente com o mesmo nome. Esta versão localiza o oid exato de cada
-- função via pg_get_function_identity_arguments (nome + assinatura
-- completa) e usa has_function_privilege(papel, oid, 'EXECUTE') para
-- authenticated/anon/service_role/postgres, e aclexplode(proacl) filtrado
-- por grantee = 0 (o sentinel padrão do Postgres para o pseudo-papel
-- PUBLIC em ACLs) para confirmar ausência de EXECUTE direto a PUBLIC.
-- Nota sobre postgres: como é o dono das três funções (e tipicamente
-- superusuário neste projeto), has_function_privilege('postgres', ...)
-- provavelmente retornaria verdadeiro mesmo sem GRANT explícito -- essa
-- checagem aqui é só por consistência documental com o GRANT que a Parte 3
-- já concede explicitamente, não é a linha de defesa real (que é a
-- ownership, já confirmada separadamente).
--
-- IDEMPOTÊNCIA: pré-voo e verificações finais rodam de forma idêntica em
-- qualquer reexecução -- se o estado já bate com o esperado, tudo produz
-- só RAISE NOTICE, sem erro. CREATE OR REPLACE FUNCTION é idempotente por
-- natureza. Grants usam REVOKE/GRANT (idempotentes). Policies são
-- removidas via busca dinâmica por nome real (nunca presumido) com
-- DROP POLICY -- idempotente, a segunda execução não encontra mais nada
-- para remover. Constraints são adicionadas só se ainda não existirem por
-- nome, e comparadas por definição se já existirem.
--
-- ESTE ARQUIVO É MANUAL. Não faz parte de build, deploy, Vercel, cron ou
-- qualquer caminho da aplicação -- só roda se alguém copiar o conteúdo e
-- colar manualmente no SQL Editor do Supabase, mediante autorização
-- separada da criação deste arquivo. Não foi executado como parte desta
-- implementação.
--
-- ROLLBACK -- CORREÇÃO DESTA RODADA: uma versão anterior deste arquivo
-- afirmava, incorretamente, que os corpos anteriores das três funções
-- "nunca foram capturados por pg_get_functiondef nesta engenharia". Isso
-- estava errado -- os corpos anteriores FORAM recuperados via
-- pg_get_functiondef durante o diagnóstico manual real do Supabase (rodada
-- de auditoria que motivou este bloco). Eles não precisam ser incluídos
-- como comandos de rollback executáveis neste arquivo -- o rollback
-- continua sendo manual e separado, decidido deliberadamente, nunca
-- automático a partir desta migration. Em particular: esta migration NUNCA
-- deve ser revertida de forma a restaurar os grants vulneráveis
-- (EXECUTE para anon/PUBLIC/service_role) -- se um rollback for necessário
-- por qualquer motivo, deve preservar os grants endurecidos e reverter só
-- a lógica interna das funções, nunca a superfície de acesso.
--
-- TRANSAÇÃO INTEGRAL -- CORREÇÃO DESTA RODADA: todo o arquivo passa a
-- rodar dentro de uma única transação explícita. BEGIN; é o primeiro
-- comando executável do arquivo, antes de qualquer DO, CREATE OR REPLACE,
-- REVOKE, GRANT, DROP POLICY ou ALTER TABLE. COMMIT; só aparece depois de
-- todas as etapas: as três funções, todos os grants, a remoção das
-- policies de escrita, as constraints, as verificações canônicas das
-- constraints, a verificação das policies de SELECT, a verificação de
-- RLS, a verificação de ownership, a verificação de SECURITY DEFINER e a
-- verificação exata de search_path -- ou seja, depois de toda verificação
-- fail-closed deste arquivo. Não há nenhum COMMIT intermediário, nenhum
-- SAVEPOINT, e nenhum EXCEPTION WHEN OTHERS que capture ou esconda falha.
--
-- SEMÂNTICA EXATA DE FALHA: qualquer RAISE EXCEPTION lançado antes do
-- COMMIT; final aborta a TRANSAÇÃO INTEIRA -- comportamento nativo do
-- Postgres para uma transação com erro não tratado. Nenhuma alteração
-- desta migration (funções, grants, remoção de policies, constraints)
-- permanece no banco -- o estado volta a ser exatamente o de antes do
-- BEGIN;. Depois de corrigir a causa do erro, o arquivo inteiro deve ser
-- colado e executado integralmente novamente, do zero. NUNCA execute só
-- o trecho restante a partir do ponto da falha -- como nada da tentativa
-- anterior foi mantido, rodar só o restante deixaria o banco num estado
-- parcial e inconsistente (por exemplo, tentando verificar grants ou
-- constraints que nunca chegaram a ser criados nesta tentativa).
--
-- Esta correção elimina a incerteza registrada na rodada anterior sobre
-- se múltiplos comandos colados de uma vez no SQL Editor do Supabase
-- seriam ou não agrupados numa única transação implícita pelo protocolo
-- de conexão -- agora isso não depende mais do comportamento do cliente,
-- está garantido explicitamente pelo BEGIN;/COMMIT; do próprio arquivo.

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 1 — pré-voo completo (tabelas, colunas, UNIQUE, funções)
-- ══════════════════════════════════════════════════════════════════════════

-- 1a. Tabelas: existência, relkind, owner, RLS habilitada.
do $prevoo_tabelas_mensageria_legada$
declare
  r record;
  v_relkind "char";
  v_owner text;
  v_rls boolean;
begin
  for r in select unnest(array['mensageria_uso', 'mensageria_diario', 'mensageria_falhas']) as tabela
  loop
    select c.relkind, c.relowner::regrole::text, c.relrowsecurity
      into v_relkind, v_owner, v_rls
    from pg_class c
    where c.relname = r.tabela and c.relnamespace = 'public'::regnamespace;

    if not found then
      raise exception 'Abortando (pré-voo): tabela public.% não encontrada -- não prosseguir sem revisão manual.', r.tabela;
    end if;

    if v_relkind <> 'r' then
      raise exception 'Abortando (pré-voo): public.% não é uma tabela ordinária (relkind=%), esperado "r".', r.tabela, v_relkind;
    end if;

    if v_owner <> 'postgres' then
      raise exception 'Abortando (pré-voo): public.% tem owner "%", esperado "postgres" -- não prosseguir sem revisão manual.', r.tabela, v_owner;
    end if;

    if not v_rls then
      raise exception 'Abortando (pré-voo): public.% não tem RLS habilitada.', r.tabela;
    end if;
  end loop;

  raise notice 'Pré-voo: as 3 tabelas de mensageria legada existem, são tabelas ordinárias, owner postgres, RLS habilitada.';
end $prevoo_tabelas_mensageria_legada$;

-- 1b. Colunas essenciais de cada tabela: tipo, nulabilidade, default.
do $prevoo_colunas_mensageria_legada$
declare
  r record;
  v_tipo text;
  v_nulavel text;
  v_default text;
begin
  for r in
    select * from (values
      ('mensageria_uso', 'user_id', 'uuid', 'NO', null::text),
      ('mensageria_uso', 'ano_mes', 'text', 'NO', null::text),
      ('mensageria_uso', 'emails_enviados', 'integer', 'NO', '0'),
      ('mensageria_uso', 'sms_enviados', 'integer', 'NO', '0'),
      ('mensageria_uso', 'emails_comprados', 'integer', 'NO', '0'),
      ('mensageria_uso', 'sms_comprados', 'integer', 'NO', '0'),
      ('mensageria_uso', 'emails_reservados', 'integer', 'NO', '0'),
      ('mensageria_uso', 'sms_reservados', 'integer', 'NO', '0'),
      ('mensageria_diario', 'user_id', 'uuid', 'NO', null::text),
      ('mensageria_diario', 'dia', 'date', 'NO', 'CURRENT_DATE'),
      ('mensageria_diario', 'emails_enviados', 'integer', 'NO', '0'),
      ('mensageria_diario', 'sms_enviados', 'integer', 'NO', '0'),
      ('mensageria_falhas', 'user_id', 'uuid', 'NO', null::text),
      ('mensageria_falhas', 'canal', 'text', 'NO', null::text),
      ('mensageria_falhas', 'motivo', 'text', 'YES', null::text),
      ('mensageria_falhas', 'criado_em', 'timestamp with time zone', 'NO', 'now()')
    ) as esperado(tabela, coluna, tipo, nulavel, default_esperado)
  loop
    select data_type, is_nullable, column_default
      into v_tipo, v_nulavel, v_default
    from information_schema.columns
    where table_schema = 'public' and table_name = r.tabela and column_name = r.coluna;

    if not found then
      raise exception 'Abortando (pré-voo): coluna public.%.% não encontrada -- não prosseguir sem revisão manual.', r.tabela, r.coluna;
    end if;

    if v_tipo <> r.tipo then
      raise exception 'Abortando (pré-voo): public.%.% tem data_type "%", esperado "%".', r.tabela, r.coluna, v_tipo, r.tipo;
    end if;

    if v_nulavel <> r.nulavel then
      raise exception 'Abortando (pré-voo): public.%.% tem is_nullable "%", esperado "%".', r.tabela, r.coluna, v_nulavel, r.nulavel;
    end if;

    if r.default_esperado is not null then
      -- Normaliza só espaços e caixa (ex.: CURRENT_DATE vs current_date) --
      -- não tolera qualquer outra divergência de conteúdo.
      if regexp_replace(upper(coalesce(v_default, '')), '\s', '', 'g')
         <> regexp_replace(upper(r.default_esperado), '\s', '', 'g') then
        raise exception 'Abortando (pré-voo): public.%.% tem column_default "%", esperado "%".', r.tabela, r.coluna, v_default, r.default_esperado;
      end if;
    end if;
  end loop;

  raise notice 'Pré-voo: colunas essenciais das 3 tabelas de mensageria legada confirmadas (tipo, nulabilidade, default).';
end $prevoo_colunas_mensageria_legada$;

-- 1c. Constraints UNIQUE de que o UPSERT das funções depende.
do $prevoo_unique_mensageria_legada$
declare
  r record;
begin
  for r in
    select * from (values
      ('mensageria_uso', 'UNIQUE (user_id, ano_mes)'),
      ('mensageria_diario', 'UNIQUE (user_id, dia)')
    ) as esperado(tabela, definicao)
  loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = ('public.' || r.tabela)::regclass
        and contype = 'u'
        and pg_get_constraintdef(oid) = r.definicao
    ) then
      raise exception 'Abortando (pré-voo): public.% não tem a constraint UNIQUE esperada (%) -- ON CONFLICT das funções depende dela.', r.tabela, r.definicao;
    end if;
  end loop;

  raise notice 'Pré-voo: constraints UNIQUE de mensageria_uso(user_id, ano_mes) e mensageria_diario(user_id, dia) confirmadas.';
end $prevoo_unique_mensageria_legada$;

-- 1d. Funções: assinatura, retorno, owner -- antes de qualquer CREATE OR REPLACE.
do $prevoo_funcoes_mensageria_legada$
declare
  r record;
  v_owner text;
begin
  for r in
    select * from (values
      ('incrementar_uso_mensageria', 'p_user_id uuid, p_ano_mes text, p_canal text, p_qtd integer', 'void'),
      ('incrementar_uso_diario', 'p_user_id uuid, p_canal text, p_qtd integer', 'void'),
      ('registrar_falha_mensageria', 'p_user_id uuid, p_canal text, p_motivo text', 'void')
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
        'Abortando (pré-voo): public.%(%) não encontrada com a assinatura esperada (retorno %) -- não prosseguir sem revisão manual. Pode já ter sido alterada, ou nunca ter existido com este nome/assinatura.',
        r.nome, r.assinatura, r.retorno;
    end if;

    if v_owner <> 'postgres' then
      raise exception 'Abortando (pré-voo): public.% tem owner "%", esperado "postgres" -- não prosseguir sem revisão manual.', r.nome, v_owner;
    end if;
  end loop;

  raise notice 'Pré-voo: as 3 funções de mensageria legada existem com a assinatura/retorno esperados e owner postgres. Prosseguindo.';
end $prevoo_funcoes_mensageria_legada$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 2 — as três funções endurecidas (assinatura preservada)
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.incrementar_uso_mensageria(
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
  -- ── Segurança: mesmo padrão já usado em toda RPC desta engenharia ────────
  if session_user <> 'postgres' then
    if auth.uid() is null then
      raise exception 'incrementar_uso_mensageria: not authorized -- no active session (auth.uid() is null)';
    end if;
    if auth.uid() <> p_user_id then
      raise exception 'incrementar_uso_mensageria: not authorized -- p_user_id does not match the authenticated session';
    end if;
  end if;

  -- ── Validações ────────────────────────────────────────────────────────────
  if p_user_id is null then
    raise exception 'incrementar_uso_mensageria: p_user_id is required';
  end if;

  if p_canal not in ('email', 'sms') then
    raise exception 'incrementar_uso_mensageria: invalid p_canal "%", expected "email" or "sms"', p_canal;
  end if;

  if p_qtd is null or p_qtd <= 0 then
    raise exception 'incrementar_uso_mensageria: p_qtd must be a positive integer, got %', p_qtd;
  end if;

  if p_ano_mes is null or p_ano_mes !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception 'incrementar_uso_mensageria: invalid p_ano_mes "%", expected format YYYY-MM (01-12)', p_ano_mes;
  end if;

  -- ── Comportamento preservado: UPSERT por UNIQUE(user_id, ano_mes),
  -- incrementa só o contador do canal informado, nunca toca em
  -- *_reservados nem em *_comprados. Nunca decrementa (p_qtd já validado
  -- > 0 acima).
  if p_canal = 'email' then
    insert into public.mensageria_uso (user_id, ano_mes, emails_enviados)
    values (p_user_id, p_ano_mes, p_qtd)
    on conflict (user_id, ano_mes) do update
      set emails_enviados = coalesce(mensageria_uso.emails_enviados, 0) + p_qtd;
  else
    insert into public.mensageria_uso (user_id, ano_mes, sms_enviados)
    values (p_user_id, p_ano_mes, p_qtd)
    on conflict (user_id, ano_mes) do update
      set sms_enviados = coalesce(mensageria_uso.sms_enviados, 0) + p_qtd;
  end if;
end;
$function$;

create or replace function public.incrementar_uso_diario(
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
  if session_user <> 'postgres' then
    if auth.uid() is null then
      raise exception 'incrementar_uso_diario: not authorized -- no active session (auth.uid() is null)';
    end if;
    if auth.uid() <> p_user_id then
      raise exception 'incrementar_uso_diario: not authorized -- p_user_id does not match the authenticated session';
    end if;
  end if;

  if p_user_id is null then
    raise exception 'incrementar_uso_diario: p_user_id is required';
  end if;

  if p_canal not in ('email', 'sms') then
    raise exception 'incrementar_uso_diario: invalid p_canal "%", expected "email" or "sms"', p_canal;
  end if;

  if p_qtd is null or p_qtd <= 0 then
    raise exception 'incrementar_uso_diario: p_qtd must be a positive integer, got %', p_qtd;
  end if;

  -- ── Comportamento preservado: UPSERT por UNIQUE(user_id, dia), current_date
  -- (UTC, confirmado -- TimeZone do Postgres deste projeto é UTC),
  -- incrementa só o contador do canal informado. Nunca decrementa.
  if p_canal = 'email' then
    insert into public.mensageria_diario (user_id, dia, emails_enviados)
    values (p_user_id, current_date, p_qtd)
    on conflict (user_id, dia) do update
      set emails_enviados = coalesce(mensageria_diario.emails_enviados, 0) + p_qtd;
  else
    insert into public.mensageria_diario (user_id, dia, sms_enviados)
    values (p_user_id, current_date, p_qtd)
    on conflict (user_id, dia) do update
      set sms_enviados = coalesce(mensageria_diario.sms_enviados, 0) + p_qtd;
  end if;
end;
$function$;

create or replace function public.registrar_falha_mensageria(
  p_user_id uuid,
  p_canal text,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_motivo text;
begin
  if session_user <> 'postgres' then
    if auth.uid() is null then
      raise exception 'registrar_falha_mensageria: not authorized -- no active session (auth.uid() is null)';
    end if;
    if auth.uid() <> p_user_id then
      raise exception 'registrar_falha_mensageria: not authorized -- p_user_id does not match the authenticated session';
    end if;
  end if;

  if p_user_id is null then
    raise exception 'registrar_falha_mensageria: p_user_id is required';
  end if;

  if p_canal not in ('email', 'sms') then
    raise exception 'registrar_falha_mensageria: invalid p_canal "%", expected "email" or "sms"', p_canal;
  end if;

  -- Decisão explícita desta rodada: p_motivo nulo continua sendo
  -- armazenado como string vazia, preservando o comportamento atual --
  -- não introduz categorias de falha, não amplia o escopo do parâmetro.
  -- Truncamento em 500 caracteres, preservado.
  v_motivo := left(coalesce(p_motivo, ''), 500);

  -- ── Comportamento preservado: INSERT de uma nova ocorrência,
  -- criado_em usa o default da própria tabela (now()), não sobrescrito aqui.
  insert into public.mensageria_falhas (user_id, canal, motivo)
  values (p_user_id, p_canal, v_motivo);
end;
$function$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 3 — grants das funções (nunca anon/PUBLIC/service_role), verificados
-- por assinatura exata
-- ══════════════════════════════════════════════════════════════════════════

revoke all on function public.incrementar_uso_mensageria(uuid, text, text, integer) from public, anon, service_role;
grant execute on function public.incrementar_uso_mensageria(uuid, text, text, integer) to authenticated, postgres;

revoke all on function public.incrementar_uso_diario(uuid, text, integer) from public, anon, service_role;
grant execute on function public.incrementar_uso_diario(uuid, text, integer) to authenticated, postgres;

revoke all on function public.registrar_falha_mensageria(uuid, text, text) from public, anon, service_role;
grant execute on function public.registrar_falha_mensageria(uuid, text, text) to authenticated, postgres;

-- Verificação ativa -- fail-closed -- por oid exato (nome + assinatura
-- completa), nunca por routine_name isolado, para que um eventual overload
-- com o mesmo nome nunca satisfaça esta verificação por engano.
do $verificar_grants_funcoes_legadas$
declare
  r record;
  v_oid oid;
  v_public_tem_execute boolean;
begin
  for r in
    select * from (values
      ('incrementar_uso_mensageria', 'p_user_id uuid, p_ano_mes text, p_canal text, p_qtd integer'),
      ('incrementar_uso_diario', 'p_user_id uuid, p_canal text, p_qtd integer'),
      ('registrar_falha_mensageria', 'p_user_id uuid, p_canal text, p_motivo text')
    ) as esperado(nome, assinatura)
  loop
    select p.oid into v_oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = r.nome
      and pg_get_function_identity_arguments(p.oid) = r.assinatura;

    if v_oid is null then
      raise exception 'Abortando: public.%(%) não encontrada para verificação de grants.', r.nome, r.assinatura;
    end if;

    if not has_function_privilege('authenticated', v_oid, 'EXECUTE') then
      raise exception 'Abortando: authenticated não tem EXECUTE em public.%(%).', r.nome, r.assinatura;
    end if;

    if has_function_privilege('anon', v_oid, 'EXECUTE') then
      raise exception 'Abortando: anon tem EXECUTE (direto ou herdado de PUBLIC) em public.%(%).', r.nome, r.assinatura;
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
      raise exception 'Abortando: PUBLIC (pseudo-papel, grantee=0) tem EXECUTE direto em public.%(%).', r.nome, r.assinatura;
    end if;

    -- postgres: checagem documental -- é o dono (já confirmado no
    -- pré-voo/pós-voo) e tipicamente superusuário, então já tem acesso
    -- garantido independente de GRANT explícito. Confirmamos aqui só por
    -- consistência com o GRANT explícito que a Parte 3 já concede, não
    -- como linha de defesa real.
    if not has_function_privilege('postgres', v_oid, 'EXECUTE') then
      raise exception 'Abortando: postgres não tem EXECUTE em public.%(%) -- inesperado mesmo sendo dono.', r.nome, r.assinatura;
    end if;
  end loop;

  raise notice 'Grants das 3 funções de mensageria legada confirmados por assinatura exata: authenticated com EXECUTE; anon, service_role e PUBLIC sem EXECUTE; postgres com acesso garantido (ownership) e GRANT explícito presente.';
end $verificar_grants_funcoes_legadas$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 4 — remoção das policies de escrita de mensageria_diario
-- ══════════════════════════════════════════════════════════════════════════
-- A escrita passa a ser exclusivamente via incrementar_uso_diario
-- (SECURITY DEFINER, já endurecida acima) -- as policies de INSERT/UPDATE
-- deixam de ser necessárias e são removidas. As policies de SELECT das
-- três tabelas são preservadas e verificadas positivamente na Parte 6.
-- Busca dinâmica pelo nome real da policy -- este script nunca presumiu
-- o nome.

do $remover_policies_escrita_mensageria_diario$
declare
  r record;
  v_removidas int := 0;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'mensageria_diario'
      and cmd in ('INSERT', 'UPDATE')
  loop
    execute format('drop policy %I on public.mensageria_diario', r.policyname);
    v_removidas := v_removidas + 1;
    raise notice 'Policy % removida de mensageria_diario.', r.policyname;
  end loop;

  if v_removidas = 0 then
    raise notice 'Nenhuma policy de INSERT/UPDATE encontrada em mensageria_diario -- nada a remover (execução idempotente).';
  end if;
end $remover_policies_escrita_mensageria_diario$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 5 — grants das tabelas (sem escrita direta, sem SELECT para anon)
-- ══════════════════════════════════════════════════════════════════════════
-- Nenhum papel de aplicação precisa de acesso direto de escrita a estas
-- tabelas -- todas as gravações passam pelas três funções SECURITY DEFINER
-- (que operam com o privilégio do dono, independente de GRANT de tabela --
-- mesma lógica já comprovada com mensageria_reservas no C.1). REVOKE ALL
-- seguido de GRANT SELECT explícito cobre qualquer privilégio não listado
-- individualmente (INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/etc.),
-- de forma mais completa do que revogar item por item.

revoke all on table public.mensageria_uso, public.mensageria_diario, public.mensageria_falhas
  from anon, authenticated, service_role;

grant select on public.mensageria_uso, public.mensageria_diario, public.mensageria_falhas
  to authenticated, service_role;

-- Verificação ativa -- fail-closed.
do $verificar_grants_tabelas_mensageria$
declare
  v_escrita_indevida int;
  v_anon_select int;
  v_authenticated_select int;
  v_service_role_select int;
begin
  select count(*) into v_escrita_indevida
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('mensageria_uso', 'mensageria_diario', 'mensageria_falhas')
    and grantee in ('anon', 'authenticated', 'service_role')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');

  if v_escrita_indevida <> 0 then
    raise exception 'Abortando: % privilégio(s) de escrita indevido(s) para anon/authenticated/service_role nas tabelas de mensageria legada.', v_escrita_indevida;
  end if;

  select count(*) into v_anon_select
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('mensageria_uso', 'mensageria_diario', 'mensageria_falhas')
    and grantee = 'anon' and privilege_type = 'SELECT';

  if v_anon_select <> 0 then
    raise exception 'Abortando: anon ainda tem SELECT em % tabela(s) de mensageria legada.', v_anon_select;
  end if;

  select count(distinct table_name) into v_authenticated_select
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('mensageria_uso', 'mensageria_diario', 'mensageria_falhas')
    and grantee = 'authenticated' and privilege_type = 'SELECT';

  if v_authenticated_select <> 3 then
    raise exception 'Abortando: authenticated não tem SELECT nas 3 tabelas de mensageria legada -- encontrado %, esperado 3.', v_authenticated_select;
  end if;

  select count(distinct table_name) into v_service_role_select
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('mensageria_uso', 'mensageria_diario', 'mensageria_falhas')
    and grantee = 'service_role' and privilege_type = 'SELECT';

  if v_service_role_select <> 3 then
    raise exception 'Abortando: service_role não tem SELECT nas 3 tabelas de mensageria legada -- encontrado %, esperado 3.', v_service_role_select;
  end if;

  raise notice 'Grants das 3 tabelas de mensageria legada confirmados: sem escrita direta, sem SELECT para anon, SELECT preservado para authenticated e service_role.';
end $verificar_grants_tabelas_mensageria$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 6 — policies: verificação positiva de SELECT + ausência de escrita
-- ══════════════════════════════════════════════════════════════════════════

-- 6a. Verificação POSITIVA: exatamente 1 policy de SELECT por tabela, com
-- o papel e a expressão de isolamento esperados (estado real confirmado).
do $verificar_policies_select_mensageria_legada$
declare
  r record;
  v_qtd int;
  v_qual text;
  v_roles name[];
begin
  for r in
    select * from (values
      ('mensageria_uso', array['public']::name[]),
      ('mensageria_diario', array['authenticated']::name[]),
      ('mensageria_falhas', array['public']::name[])
    ) as esperado(tabela, papeis)
  loop
    select count(*) into v_qtd
    from pg_policies
    where schemaname = 'public' and tablename = r.tabela and cmd = 'SELECT';

    if v_qtd <> 1 then
      raise exception 'Abortando: public.% tem % policy(ies) de SELECT, esperado exatamente 1.', r.tabela, v_qtd;
    end if;

    select qual, roles into v_qual, v_roles
    from pg_policies
    where schemaname = 'public' and tablename = r.tabela and cmd = 'SELECT';

    if v_roles <> r.papeis then
      raise exception 'Abortando: policy de SELECT de public.% tem papéis %, esperado %.', r.tabela, v_roles, r.papeis;
    end if;

    if v_qual is distinct from '(auth.uid() = user_id)' then
      raise exception 'Abortando: policy de SELECT de public.% tem qual "%", esperado "(auth.uid() = user_id)".', r.tabela, v_qual;
    end if;
  end loop;

  raise notice 'Confirmado: exatamente 1 policy de SELECT em cada uma das 3 tabelas, com papel e expressão de isolamento esperados.';
end $verificar_policies_select_mensageria_legada$;

-- 6b. Ausência de qualquer policy de escrita, e RLS continua habilitada.
do $verificar_policies_escrita_e_rls_mensageria$
declare
  v_policies_escrita int;
  v_rls_habilitada int;
begin
  select count(*) into v_policies_escrita
  from pg_policies
  where schemaname = 'public'
    and tablename in ('mensageria_uso', 'mensageria_diario', 'mensageria_falhas')
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');

  if v_policies_escrita <> 0 then
    raise exception 'Abortando: % policy(ies) de escrita (INSERT/UPDATE/DELETE/ALL) ainda presente(s) nas tabelas de mensageria legada -- esperado zero.', v_policies_escrita;
  end if;

  select count(*) into v_rls_habilitada
  from pg_class
  where relname in ('mensageria_uso', 'mensageria_diario', 'mensageria_falhas')
    and relnamespace = 'public'::regnamespace
    and relrowsecurity = true;

  if v_rls_habilitada <> 3 then
    raise exception 'Abortando: nem todas as 3 tabelas de mensageria legada têm RLS habilitada -- encontrado %, esperado 3.', v_rls_habilitada;
  end if;

  raise notice 'Confirmado: nenhuma policy de escrita restante; RLS habilitada nas 3 tabelas de mensageria legada.';
end $verificar_policies_escrita_e_rls_mensageria$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 7 — constraints de integridade, verificadas por DEFINIÇÃO
-- ══════════════════════════════════════════════════════════════════════════
-- Diagnóstico prévio já confirmou ausência de dado que viole estas
-- constraints (nenhum contador negativo, nenhum ano_mes inválido, nenhum
-- canal inválido em mensageria_falhas) -- mesmo assim, o próprio
-- ALTER TABLE ADD CONSTRAINT validaria os dados existentes e falharia com
-- erro nativo do Postgres caso algo divergisse -- nenhuma suposição cega.
--
-- Cada linha abaixo tem: tabela, nome, expressão usada para CRIAR (se
-- ausente), e a forma CANÔNICA esperada de volta de
-- pg_get_expr(conbin, conrelid) -- ver nota de canonicalização no
-- cabeçalho deste arquivo.

do $adicionar_constraints_mensageria_legada$
declare
  r record;
  v_definicao_real text;
begin
  for r in
    select * from (values
      ('mensageria_uso', 'mensageria_uso_emails_enviados_nonneg', 'emails_enviados >= 0', '(emails_enviados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_sms_enviados_nonneg', 'sms_enviados >= 0', '(sms_enviados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_emails_comprados_nonneg', 'emails_comprados >= 0', '(emails_comprados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_sms_comprados_nonneg', 'sms_comprados >= 0', '(sms_comprados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_emails_reservados_nonneg', 'emails_reservados >= 0', '(emails_reservados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_sms_reservados_nonneg', 'sms_reservados >= 0', '(sms_reservados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_ano_mes_formato', 'ano_mes ~ ''^\d{4}-(0[1-9]|1[0-2])$''', '(ano_mes ~ ''^\d{4}-(0[1-9]|1[0-2])$''::text)'),
      ('mensageria_diario', 'mensageria_diario_emails_enviados_nonneg', 'emails_enviados >= 0', '(emails_enviados >= 0)'),
      ('mensageria_diario', 'mensageria_diario_sms_enviados_nonneg', 'sms_enviados >= 0', '(sms_enviados >= 0)'),
      ('mensageria_falhas', 'mensageria_falhas_canal_check', 'canal in (''email'', ''sms'')', '(canal = ANY (ARRAY[''email''::text, ''sms''::text]))')
    ) as esperado(tabela, nome, expressao_criacao, forma_canonica)
  loop
    select pg_get_expr(conbin, conrelid) into v_definicao_real
    from pg_constraint
    where conrelid = ('public.' || r.tabela)::regclass and conname = r.nome;

    if not found then
      execute format('alter table public.%I add constraint %I check (%s)', r.tabela, r.nome, r.expressao_criacao);
      raise notice 'Constraint % criada em public.%.', r.nome, r.tabela;
    elsif v_definicao_real <> r.forma_canonica then
      raise exception
        'Abortando: constraint % em public.% já existe mas com definição divergente -- NÃO removida nem substituída. Encontrado: "%". Esperado (forma canônica): "%". Revisão manual necessária.',
        r.nome, r.tabela, v_definicao_real, r.forma_canonica;
    else
      raise notice 'Constraint % já existe em public.% com a definição canônica esperada -- nada a fazer (execução idempotente).', r.nome, r.tabela;
    end if;
  end loop;
end $adicionar_constraints_mensageria_legada$;

-- Verificação ativa -- fail-closed: confirma que as 10 constraints estão
-- todas presentes E com a definição canônica esperada, mesmo em reexecução.
do $verificar_constraints_mensageria_legada$
declare
  r record;
  v_definicao_real text;
  v_problemas text[] := array[]::text[];
begin
  for r in
    select * from (values
      ('mensageria_uso', 'mensageria_uso_emails_enviados_nonneg', '(emails_enviados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_sms_enviados_nonneg', '(sms_enviados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_emails_comprados_nonneg', '(emails_comprados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_sms_comprados_nonneg', '(sms_comprados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_emails_reservados_nonneg', '(emails_reservados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_sms_reservados_nonneg', '(sms_reservados >= 0)'),
      ('mensageria_uso', 'mensageria_uso_ano_mes_formato', '(ano_mes ~ ''^\d{4}-(0[1-9]|1[0-2])$''::text)'),
      ('mensageria_diario', 'mensageria_diario_emails_enviados_nonneg', '(emails_enviados >= 0)'),
      ('mensageria_diario', 'mensageria_diario_sms_enviados_nonneg', '(sms_enviados >= 0)'),
      ('mensageria_falhas', 'mensageria_falhas_canal_check', '(canal = ANY (ARRAY[''email''::text, ''sms''::text]))')
    ) as esperado(tabela, nome, forma_canonica)
  loop
    select pg_get_expr(conbin, conrelid) into v_definicao_real
    from pg_constraint
    where conrelid = ('public.' || r.tabela)::regclass and conname = r.nome and contype = 'c';

    if not found then
      v_problemas := array_append(v_problemas, r.tabela || '.' || r.nome || ' (ausente)');
    elsif v_definicao_real <> r.forma_canonica then
      v_problemas := array_append(v_problemas, r.tabela || '.' || r.nome || ' (definição divergente: ' || v_definicao_real || ')');
    end if;
  end loop;

  if array_length(v_problemas, 1) > 0 then
    raise exception 'Abortando: problema(s) nas constraints de integridade após a migration: %', array_to_string(v_problemas, '; ');
  end if;

  raise notice 'Confirmado: as 10 constraints de integridade da mensageria legada estão presentes com a definição canônica esperada.';
end $verificar_constraints_mensageria_legada$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 8 — verificação final (pós-voo): assinatura, SECURITY DEFINER,
-- owner, search_path exato
-- ══════════════════════════════════════════════════════════════════════════

do $verificar_seguranca_funcoes_legadas$
declare
  r record;
  v_owner text;
  v_prosecdef boolean;
  v_proconfig text[];
  v_cfg text;
  v_encontrado_search_path boolean;
begin
  for r in
    select * from (values
      ('incrementar_uso_mensageria', 'p_user_id uuid, p_ano_mes text, p_canal text, p_qtd integer'),
      ('incrementar_uso_diario', 'p_user_id uuid, p_canal text, p_qtd integer'),
      ('registrar_falha_mensageria', 'p_user_id uuid, p_canal text, p_motivo text')
    ) as esperado(nome, assinatura)
  loop
    select p.prosecdef, p.proconfig, p.proowner::regrole::text
      into v_prosecdef, v_proconfig, v_owner
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = r.nome
      and pg_get_function_identity_arguments(p.oid) = r.assinatura;

    if not found then
      raise exception 'Abortando (pós-voo): public.%(%) não encontrada com a assinatura esperada após a migration.', r.nome, r.assinatura;
    end if;

    if not v_prosecdef then
      raise exception 'Abortando (pós-voo): public.% não é SECURITY DEFINER.', r.nome;
    end if;

    if v_owner <> 'postgres' then
      raise exception 'Abortando (pós-voo): public.% tem owner "%", esperado "postgres".', r.nome, v_owner;
    end if;

    v_encontrado_search_path := false;
    if v_proconfig is not null then
      for v_cfg in select unnest(v_proconfig) loop
        if v_cfg like 'search_path=%' then
          v_encontrado_search_path := true;
          if regexp_replace(substring(v_cfg from 'search_path=(.*)'), '\s', '', 'g') <> 'public,pg_temp' then
            raise exception 'Abortando (pós-voo): public.% tem search_path "%", esperado exatamente "public, pg_temp".', r.nome, v_cfg;
          end if;
        end if;
      end loop;
    end if;

    if not v_encontrado_search_path then
      raise exception 'Abortando (pós-voo): public.% não tem search_path fixado.', r.nome;
    end if;
  end loop;

  raise notice 'Confirmado (pós-voo): as 3 funções têm assinatura esperada, SECURITY DEFINER, owner postgres, e search_path exatamente "public, pg_temp".';
end $verificar_seguranca_funcoes_legadas$;

-- Ownership das três tabelas, reconfirmado ao final (esta migration nunca
-- executa ALTER ... OWNER TO -- esta checagem é defesa em profundidade,
-- não correção de algo que este arquivo altera).
do $verificar_ownership_tabelas_final$
declare
  r record;
  v_owner text;
begin
  for r in select unnest(array['mensageria_uso', 'mensageria_diario', 'mensageria_falhas']) as tabela
  loop
    select relowner::regrole::text into v_owner
    from pg_class where relname = r.tabela and relnamespace = 'public'::regnamespace;

    if v_owner <> 'postgres' then
      raise exception 'Abortando (pós-voo): public.% tem owner "%", esperado "postgres".', r.tabela, v_owner;
    end if;
  end loop;

  raise notice 'Confirmado (pós-voo): owner das 3 tabelas de mensageria legada continua postgres.';
end $verificar_ownership_tabelas_final$;

COMMIT;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente, FORA desta
-- transação -- são só consultas de leitura, comentadas, nunca executadas
-- automaticamente por este arquivo) ────────────────────────────────────────
-- 1) Definição completa das três funções:
-- select p.proname, pg_get_functiondef(p.oid) as definicao
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('incrementar_uso_mensageria', 'incrementar_uso_diario', 'registrar_falha_mensageria');
--
-- 2) Grants finais das três funções (por oid exato):
-- select p.proname, pg_get_function_identity_arguments(p.oid) as assinatura,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
--        has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
--        has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
-- from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('incrementar_uso_mensageria', 'incrementar_uso_diario', 'registrar_falha_mensageria');
--
-- 3) Grants finais das três tabelas:
-- select table_name, grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name in ('mensageria_uso', 'mensageria_diario', 'mensageria_falhas')
-- order by table_name, grantee, privilege_type;
--
-- 4) Policies remanescentes:
-- select tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('mensageria_uso', 'mensageria_diario', 'mensageria_falhas')
-- order by tablename, policyname;
--
-- 5) Constraints finais, com definição:
-- select conrelid::regclass as tabela, conname, pg_get_expr(conbin, conrelid) as definicao
-- from pg_constraint
-- where conrelid in ('public.mensageria_uso'::regclass, 'public.mensageria_diario'::regclass, 'public.mensageria_falhas'::regclass)
--   and contype = 'c'
-- order by tabela, conname;
--
-- 6) Ownership final:
-- select 'mensageria_uso' as objeto, relowner::regrole as owner from pg_class where relname='mensageria_uso' and relnamespace='public'::regnamespace
-- union all select 'mensageria_diario', relowner::regrole from pg_class where relname='mensageria_diario' and relnamespace='public'::regnamespace
-- union all select 'mensageria_falhas', relowner::regrole from pg_class where relname='mensageria_falhas' and relnamespace='public'::regnamespace;
--
-- 7) Teste manual básico (rodar como postgres no SQL Editor -- sem sessão,
--    cai no caminho de bypass session_user='postgres'):
-- select incrementar_uso_mensageria('2d366d35-1cae-40d5-ba92-06fe2ab8a763'::uuid, '2026-08', 'email', 1);
-- select emails_enviados from public.mensageria_uso
--   where user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763' and ano_mes = '2026-08';
-- -- esperado: incrementa em +1 o valor já existente, sem erro.
