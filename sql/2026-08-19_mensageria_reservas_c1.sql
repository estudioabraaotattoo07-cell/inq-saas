-- Bloco C.1 — Reserva Atômica de Mensageria
-- Ver: "AUDITORIA PRÉ-IMPLEMENTAÇÃO DO BLOCO C" (18/08/2026), "COMPLEMENTO DA
-- AUDITORIA DO BLOCO C — RESERVA, CONFIRMAÇÃO E ESTORNO" e "VALIDAÇÃO FINAL
-- PRÉ-IMPLEMENTAÇÃO DO BLOCO C" (19/08/2026). Blocos A e B já publicados
-- (licencas.franquia_ilimitada, licencas.email_incluido_mes/sms_incluido_mes).
--
-- ESCOPO (autorizado explicitamente, nada além disso):
--   1. Tabela public.mensageria_reservas — o "recibo" de cada solicitação de
--      disparo, usado para idempotência e para o Bloco D confirmar/estornar.
--   2. Colunas public.mensageria_uso.emails_reservados / sms_reservados —
--      contador transitório de franquia em voo (reservada, ainda não
--      confirmada), separado de emails_enviados/sms_enviados (que continuam
--      significando só "confirmado de verdade" -- sem mudança de semântica).
--   3. RPC public.reservar_disparo(p_user_id, p_solicitacao_id, p_canal) —
--      decide e reserva atomicamente um único direito de envio (ilimitado,
--      franquia ou crédito extra), ou persiste um bloqueio imutável.
--
-- O C.1 NÃO ENVIA NENHUMA MENSAGEM. Não cria confirmar_disparo nem
-- estornar_disparo (Bloco D). Não toca em Resend, Zenvia, Histórico,
-- mensageria_diario, registrar_falha_mensageria, Asaas, compra de crédito,
-- capacidade global, alertas, WhatsApp, Resumo Premium, o adaptador de
-- CrmClient.tsx ou ink-system-1.0.
--
-- POR QUE UMA TABELA NOVA, E NÃO SÓ CONTADORES: o mecanismo de bloqueio de
-- concorrência em si (quem "ganha" a última unidade) é feito só por UPDATE
-- condicional + lock de linha do Postgres, sem precisar de tabela nova. A
-- tabela existe para outra finalidade: guardar o resultado de cada
-- solicitação individual (por solicitacao_id), para que (a) um retry da
-- mesma solicitação nunca reserve duas vezes, e (b) o Bloco D, numa chamada
-- HTTP totalmente separada de quando a reserva foi feita, saiba o que
-- confirmar ou estornar.
--
-- IMUTABILIDADE DO solicitacao_id (decisão da rodada de validação): uma
-- solicitação bloqueada permanece bloqueada para sempre com aquele ID —
-- nunca é reavaliada financeiramente numa segunda chamada. Por isso
-- "bloqueado" também é persistido (correção em relação à auditoria
-- conceitual anterior, que havia sugerido não persistir bloqueios — essa
-- rodada de validação já registrou e justificou essa mudança). Uma nova
-- tentativa deliberada, depois de comprar crédito por exemplo, exige um
-- solicitacao_id novo, gerado pelo chamador -- este script não decide isso,
-- só garante que o ID antigo nunca "muda de resposta".
--
-- SEGURANÇA -- HISTÓRICO DA DECISÃO (importante para quem ler depois): a
-- primeira versão desta função tentava reconhecer chamadas administrativas
-- via "session_user in ('service_role', 'postgres')". Uma rodada de
-- auditoria dedicada mostrou, por raciocínio de arquitetura do PostgREST,
-- que isso muito provavelmente nunca seria verdadeiro para uma chamada real
-- (o PostgREST conecta com um único papel de pool -- "authenticator" -- e
-- troca de papel via SET ROLE, o que muda current_user mas NUNCA
-- session_user). Isso foi CONFIRMADO EMPIRICAMENTE chamando uma função de
-- diagnóstico temporária (diagnostico_auth_temp_c1, já removida do banco)
-- a partir de uma sessão real e autenticada do Laboratório:
--   session_user = 'authenticator' -- nunca 'authenticated' nem 'service_role'
--   current_user = 'postgres'      -- dono da função, não quem chamou
--   auth.uid()    = <uuid do usuário real>, sem erro
--   auth.role()   = 'authenticated', sem erro
-- Uma segunda tentativa de confirmar o caminho "service_role" com a Secret
-- Key moderna deste projeto (formato sb_secret_..., não mais o JWT legado)
-- foi recusada pelo próprio gateway do Supabase ("Forbidden use of secret
-- API key..."), deixando genuinamente incerto como uma chamada
-- administrativa com esse formato de chave se comportaria dentro do
-- Postgres/RPC neste modelo novo -- e sem nenhum consumidor real de
-- reservar_disparo hoje que precise disso.
--
-- DECISÃO FINAL (princípio do menor privilégio): remover completamente
-- qualquer bypass por service_role/auth.role()/claim de JWT. Não construir
-- um mecanismo de acesso privilegiado sobre uma premissa não confirmada,
-- para um consumidor que ainda não existe. O único bypass mantido é
-- session_user = 'postgres' -- não por representar um papel "administrativo"
-- do PostgREST, mas porque é o papel real e já comprovado do SQL Editor
-- (uma conexão direta, fora do PostgREST, não afetada por nada disso) --
-- necessário para você continuar homologando esta função manualmente, e sem
-- conceder nenhuma capacidade nova (quem já roda como postgres neste banco
-- já é onipotente, com ou sem esta função). Quando existir um consumidor
-- real que precise operar em nome de qualquer tenant (o motor automático da
-- Plataforma, só no Bloco H ou depois), a forma de autenticá-lo será
-- decidida deliberadamente, com o modelo de chaves deste projeto já
-- entendido -- não presumida aqui.
--
--   * session_user = 'postgres' -> pode operar em nome de qualquer p_user_id
--     (só para homologação manual no SQL Editor).
--   * qualquer outra chamada -> exige auth.uid() não nulo E igual a
--     p_user_id.
-- O caso auth.uid() IS NULL é tratado explicitamente com uma mensagem de
-- erro distinta ("no active session"), para não repetir o padrão de bug já
-- corrigido nesta engenharia (uma comparação "p_user_id != auth.uid()" com
-- auth.uid() nulo, em PL/pgSQL, é tratada como falsa dentro de um IF, e o
-- bloco de RAISE EXCEPTION correspondente nunca disparava -- aqui a checagem
-- de NULL é feita separadamente e primeiro, não embutida numa comparação).
--
-- CONCORRÊNCIA DO MESMO solicitacao_id: uma auditoria dedicada encontrou que
-- duas chamadas concorrentes com o MESMO solicitacao_id (duplo clique, retry
-- de rede) não eram serializadas pela consulta de idempotência original (um
-- SELECT simples, sem lock) -- as duas podiam avançar até tentar reservar
-- franquia/crédito e só colidir no fim, no INSERT final em
-- mensageria_reservas, com um erro cru de violação de chave única em vez do
-- contrato JSON esperado. A correção usa pg_advisory_xact_lock (variante
-- TRANSACIONAL, liberada automaticamente no fim da transação -- segura sob
-- pooling em modo transação, ao contrário de pg_advisory_lock de sessão),
-- com uma chave derivada do próprio solicitacao_id via hashtextextended,
-- adquirida logo no início da função, antes de qualquer leitura de
-- idempotência ou de qualquer reserva de recurso. Isso garante que, para o
-- MESMO solicitacao_id, só uma chamada por vez chega a tocar franquia ou
-- crédito -- a concorrente espera parada (sem reservar nada) até a primeira
-- terminar, e então simplesmente encontra a decisão já persistida pela
-- checagem de idempotência já existente, sem nenhuma reserva provisória
-- para desfazer. Avaliado e descartado por redundância: adicionar
-- "ON CONFLICT (solicitacao_id) DO NOTHING" aos INSERTs finais -- sob o lock,
-- essa colisão deixa de ser alcançável para o mesmo solicitacao_id, e
-- adicionar tratamento pra um caminho inalcançável só aumentaria a
-- complexidade do replay sem proteção real adicional; se essa colisão algum
-- dia ocorrer mesmo assim, é sinal de algo mais profundo (lock contornado,
-- por exemplo), e é melhor que isso falhe alto e visível do que seja
-- mascarado silenciosamente.
--
-- search_path: fixado para 'public' na própria função (SET search_path =
-- public), prática recomendada para funções SECURITY DEFINER que nenhuma das
-- RPCs anteriores desta engenharia usava -- é um reforço novo, não uma
-- continuação de um padrão já existente no projeto, e vale registrar essa
-- diferença explicitamente. Todas as tabelas referenciadas dentro da função
-- também são qualificadas com "public." por reforço adicional.
--
-- GRANTS -- REVISADO APÓS HOMOLOGAÇÃO (19/08/2026): a primeira execução
-- real no Supabase revelou que este projeto tem privilégios padrão no nível
-- do schema public que concedem, DIRETAMENTE (não via PUBLIC), EXECUTE em
-- toda função nova a anon/authenticated/service_role, e DML completo em
-- toda tabela nova aos mesmos papéis. "REVOKE ALL FROM PUBLIC" só neutraliza
-- o default nativo do Postgres (PUBLIC), não esses privilégios padrão do
-- schema -- por isso a primeira versão desta migration deixou
-- reservar_disparo com EXECUTE para anon, e mensageria_reservas com DML
-- completo para anon e authenticated, mesmo com o REVOKE FROM PUBLIC já
-- presente. Correção: revogar EXPLICITAMENTE por nome de papel, o mesmo
-- princípio já usado com sucesso no hardening emergencial de
-- comprar_credito_mensageria/consumir_credito_mensageria/
-- comprar_recarga_mensageria nesta mesma engenharia.
--
-- GRANTS FINAIS da função: authenticated, postgres -- nunca anon, PUBLIC ou
-- service_role. service_role foi removido (não só nunca adicionado): a
-- lógica de bypass por service_role já não existe no corpo da função (ver
-- "SEGURANÇA -- HISTÓRICO DA DECISÃO" acima) -- não há consumidor
-- server-to-server hoje, e uma chamada via service_role seria rejeitada
-- pela própria função. Manter o GRANT sem nenhuma lógica que o use não tem
-- utilidade real, só amplia superfície sem propósito -- quando existir um
-- consumidor real (Bloco H ou depois), o GRANT deve voltar junto com a
-- lógica que o suporta, na mesma migration, não antes.
--
-- GRANTS FINAIS da tabela public.mensageria_reservas: NENHUM para papel de
-- aplicação (anon, authenticated, service_role) -- o único caminho de
-- acesso pretendido é a RPC (SECURITY DEFINER, executa como o dono). Só o
-- dono (postgres) tem acesso, automático por ownership, sem depender de
-- GRANT algum.
--
-- Verificação ativa (Parte 4, fail-closed): depois de aplicar os REVOKE/
-- GRANT, dois blocos DO consultam information_schema para confirmar que
-- nenhum grant indevido restou -- se restar (por exemplo, um privilégio
-- padrão do schema sendo reaplicado por algum motivo), a migration aborta
-- com RAISE EXCEPTION em vez de terminar "com sucesso" escondendo o
-- problema.
--
-- RLS: public.mensageria_reservas nasce com row level security habilitada e
-- ZERO policies -- ou seja, nenhum papel sujeito a RLS consegue ler/escrever
-- direto na tabela (deny-by-default). O único caminho de acesso é a RPC
-- SECURITY DEFINER, que roda com o dono da função (não sujeito a RLS). Isto
-- é defesa em profundidade: mesmo que um GRANT de tabela seja adicionado por
-- engano no futuro, a ausência de policy continua bloqueando acesso direto.
--
-- IDEMPOTÊNCIA DESTE ARQUIVO: a Parte 1 (tabela) verifica existência antes
-- de criar, e valida a estrutura completa (colunas + constraints) mesmo se
-- já existir, abortando com RAISE EXCEPTION em caso de divergência -- nunca
-- segue silenciosamente sobre algo incompatível. A Parte 2 (colunas em
-- mensageria_uso) segue o mesmo padrão já usado nos Blocos A/B. A Parte 3
-- (função) usa CREATE OR REPLACE FUNCTION, que já é idempotente por natureza
-- no Postgres -- rodar de novo substitui pela mesma definição, sem
-- necessidade da mesma checagem defensiva usada para colunas/tabelas. A
-- Parte 4 (grants) usa REVOKE/GRANT, ambos idempotentes (revogar algo já
-- revogado, ou conceder algo já concedido, não é erro).
--
-- ESTE ARQUIVO É MANUAL. Não faz parte de build, deploy, Vercel, cron ou
-- qualquer caminho da aplicação -- só roda se alguém copiar o conteúdo e
-- colar manualmente no SQL Editor do Supabase, mediante autorização
-- separada da criação deste arquivo. Não foi executado como parte desta
-- implementação.
--
-- ROLLBACK (não executado aqui, só documentado, na ordem correta de
-- dependência):
--   drop function if exists public.reservar_disparo(uuid, uuid, text);
--   alter table public.mensageria_uso drop column if exists emails_reservados;
--   alter table public.mensageria_uso drop column if exists sms_reservados;
--   drop table if exists public.mensageria_reservas;
-- Só deve ser executado mediante decisão explícita de abandonar o Bloco C,
-- nunca como efeito colateral de reverter este arquivo.

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 1 — tabela public.mensageria_reservas
-- ══════════════════════════════════════════════════════════════════════════

do $criar_tabela_mensageria_reservas$
declare
  v_tabela_existe boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'mensageria_reservas'
  ) into v_tabela_existe;

  if not v_tabela_existe then
    create table public.mensageria_reservas (
      solicitacao_id  uuid primary key,
      user_id         uuid not null,
      canal           text not null,
      origem          text null,
      estado          text not null default 'reservado',
      motivo_bloqueio text null,
      criado_em       timestamptz not null default now(),
      resolvido_em    timestamptz null,
      constraint mensageria_reservas_canal_check
        check (canal in ('email', 'sms')),
      constraint mensageria_reservas_estado_check
        check (estado in ('reservado', 'confirmado', 'estornado', 'bloqueado')),
      constraint mensageria_reservas_origem_check
        check (origem is null or origem in ('ilimitado', 'franquia', 'credito_extra')),
      constraint mensageria_reservas_coerencia_check
        check (
          (estado = 'bloqueado' and origem is null and motivo_bloqueio is not null)
          or
          (estado <> 'bloqueado' and origem is not null and motivo_bloqueio is null)
        )
    );
    raise notice 'Tabela public.mensageria_reservas criada.';
  else
    raise notice 'Tabela public.mensageria_reservas já existe -- validando estrutura abaixo (execução idempotente).';
  end if;
end $criar_tabela_mensageria_reservas$;

-- Validação de estrutura -- roda sempre, tenha a tabela acabado de ser
-- criada ou já existisse antes. Fail-closed: qualquer divergência aborta com
-- RAISE EXCEPTION em vez de seguir sobre uma estrutura incompatível.
do $validar_estrutura_mensageria_reservas$
declare
  r record;
  v_encontrado boolean;
begin
  for r in
    select * from (values
      ('solicitacao_id',  'uuid',                      'NO'),
      ('user_id',         'uuid',                      'NO'),
      ('canal',           'text',                       'NO'),
      ('origem',          'text',                       'YES'),
      ('estado',          'text',                       'NO'),
      ('motivo_bloqueio', 'text',                       'YES'),
      ('criado_em',       'timestamp with time zone',   'NO'),
      ('resolvido_em',    'timestamp with time zone',   'YES')
    ) as esperado(coluna, tipo, nulavel)
  loop
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'mensageria_reservas'
        and column_name = r.coluna and data_type = r.tipo and is_nullable = r.nulavel
    ) into v_encontrado;

    if not v_encontrado then
      raise exception
        'Abortando: public.mensageria_reservas.% não bate com o esperado (tipo=%, nulável=%). Não prosseguir sem revisão manual.',
        r.coluna, r.tipo, r.nulavel;
    end if;
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mensageria_reservas'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) = 'PRIMARY KEY (solicitacao_id)'
  ) then
    raise exception 'Abortando: public.mensageria_reservas não tem PRIMARY KEY (solicitacao_id) como esperado.';
  end if;

  for r in
    select unnest(array[
      'mensageria_reservas_canal_check',
      'mensageria_reservas_estado_check',
      'mensageria_reservas_origem_check',
      'mensageria_reservas_coerencia_check'
    ]) as nome
  loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = 'public.mensageria_reservas'::regclass
        and conname = r.nome and contype = 'c'
    ) then
      raise exception 'Abortando: constraint % não encontrada em public.mensageria_reservas.', r.nome;
    end if;
  end loop;

  raise notice 'Estrutura de public.mensageria_reservas validada com sucesso (colunas, PK e 4 CHECK constraints).';
end $validar_estrutura_mensageria_reservas$;

-- RLS: habilitada, zero policies (deny-by-default para qualquer papel
-- sujeito a RLS; a RPC SECURITY DEFINER não é afetada). Idempotente por
-- natureza -- reabilitar algo já habilitado não é erro.
alter table public.mensageria_reservas enable row level security;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 2 — contadores transitórios em public.mensageria_uso
-- ══════════════════════════════════════════════════════════════════════════

do $adicionar_emails_reservados$
declare
  v_tipo_atual text;
  v_nullable_atual text;
  v_default_atual text;
begin
  select data_type, is_nullable, column_default
    into v_tipo_atual, v_nullable_atual, v_default_atual
  from information_schema.columns
  where table_schema = 'public' and table_name = 'mensageria_uso' and column_name = 'emails_reservados';

  if v_tipo_atual is null then
    alter table public.mensageria_uso
      add column emails_reservados integer not null default 0;
    raise notice 'Coluna mensageria_uso.emails_reservados criada (integer, not null, default 0).';
  elsif v_tipo_atual <> 'integer' or v_nullable_atual <> 'NO' or v_default_atual is distinct from '0' then
    raise exception
      'Abortando: mensageria_uso.emails_reservados já existe com data_type=%, is_nullable=%, column_default=% -- esperado integer/NO/0. Não prosseguir sem revisão manual.',
      v_tipo_atual, v_nullable_atual, v_default_atual;
  else
    raise notice 'Coluna mensageria_uso.emails_reservados já existe com o tipo/default esperados -- nada a fazer (execução idempotente).';
  end if;
end $adicionar_emails_reservados$;

do $adicionar_sms_reservados$
declare
  v_tipo_atual text;
  v_nullable_atual text;
  v_default_atual text;
begin
  select data_type, is_nullable, column_default
    into v_tipo_atual, v_nullable_atual, v_default_atual
  from information_schema.columns
  where table_schema = 'public' and table_name = 'mensageria_uso' and column_name = 'sms_reservados';

  if v_tipo_atual is null then
    alter table public.mensageria_uso
      add column sms_reservados integer not null default 0;
    raise notice 'Coluna mensageria_uso.sms_reservados criada (integer, not null, default 0).';
  elsif v_tipo_atual <> 'integer' or v_nullable_atual <> 'NO' or v_default_atual is distinct from '0' then
    raise exception
      'Abortando: mensageria_uso.sms_reservados já existe com data_type=%, is_nullable=%, column_default=% -- esperado integer/NO/0. Não prosseguir sem revisão manual.',
      v_tipo_atual, v_nullable_atual, v_default_atual;
  else
    raise notice 'Coluna mensageria_uso.sms_reservados já existe com o tipo/default esperados -- nada a fazer (execução idempotente).';
  end if;
end $adicionar_sms_reservados$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 3 — RPC public.reservar_disparo
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.reservar_disparo(
  p_user_id uuid,
  p_solicitacao_id uuid,
  p_canal text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_existente        record;
  v_licenca          record;
  v_ano_mes          text := to_char(now(), 'YYYY-MM');
  v_franquia_canal    integer;
  v_restante         integer;
  v_motivo           text;
begin
  -- ── Segurança: quem pode chamar em nome de quem ──────────────────────────
  -- Único bypass: session_user = 'postgres' (SQL Editor, homologação manual
  -- -- não concede nenhuma capacidade nova, quem já é postgres já é
  -- onipotente neste banco). Nenhum bypass por service_role/auth.role() --
  -- removido deliberadamente após auditoria dedicada (ver cabeçalho do
  -- arquivo). Qualquer outra chamada exige auth.uid() não nulo E igual a
  -- p_user_id.
  if session_user <> 'postgres' then
    if auth.uid() is null then
      raise exception 'reservar_disparo: not authorized -- no active session (auth.uid() is null)';
    end if;
    if auth.uid() <> p_user_id then
      raise exception 'reservar_disparo: not authorized -- p_user_id does not match the authenticated session';
    end if;
  end if;

  if p_canal not in ('email', 'sms') then
    raise exception 'reservar_disparo: invalid p_canal "%", expected "email" or "sms"', p_canal;
  end if;

  -- ── Concorrência do mesmo solicitacao_id ──────────────────────────────────
  -- Lock transacional (liberado automaticamente no fim da transação, seguro
  -- sob pooling em modo transação), adquirido ANTES de qualquer leitura de
  -- idempotência ou reserva de recurso. Para o mesmo solicitacao_id, só uma
  -- chamada por vez passa daqui -- a concorrente espera parada, sem tocar
  -- franquia/crédito, e ao ser liberada encontra a decisão já persistida na
  -- checagem de idempotência logo abaixo.
  perform pg_advisory_xact_lock(hashtextextended(p_solicitacao_id::text, 0));

  -- ── Idempotência: esta solicitacao_id já foi decidida antes? ─────────────
  -- Imutável: se já existe (reservado, confirmado, estornado OU bloqueado),
  -- devolve exatamente o que já foi persistido -- nunca reavalia.
  select * into v_existente
  from public.mensageria_reservas
  where solicitacao_id = p_solicitacao_id;

  if found then
    if v_existente.user_id <> p_user_id then
      raise exception 'reservar_disparo: solicitacao_id already belongs to a different tenant';
    end if;
    return jsonb_build_object(
      'autorizado', v_existente.estado in ('reservado', 'confirmado'),
      'solicitacaoId', v_existente.solicitacao_id,
      'estado', v_existente.estado,
      'origem', v_existente.origem,
      'motivoBloqueio', v_existente.motivo_bloqueio,
      'restante', null,
      'falhaTecnica', false
    );
  end if;

  -- ── Avaliação nova ────────────────────────────────────────────────────────
  select status, franquia_ilimitada, email_incluido_mes, sms_incluido_mes
    into v_licenca
  from public.licencas
  where user_id = p_user_id;

  if not found then
    insert into public.mensageria_reservas
      (solicitacao_id, user_id, canal, origem, estado, motivo_bloqueio, resolvido_em)
    values (p_solicitacao_id, p_user_id, p_canal, null, 'bloqueado', 'sem_licenca', now());
    return jsonb_build_object(
      'autorizado', false, 'solicitacaoId', p_solicitacao_id, 'estado', 'bloqueado',
      'origem', null, 'motivoBloqueio', 'sem_licenca', 'restante', null, 'falhaTecnica', false
    );
  end if;

  if v_licenca.status <> 'ativo' then
    insert into public.mensageria_reservas
      (solicitacao_id, user_id, canal, origem, estado, motivo_bloqueio, resolvido_em)
    values (p_solicitacao_id, p_user_id, p_canal, null, 'bloqueado', 'licenca_inativa', now());
    return jsonb_build_object(
      'autorizado', false, 'solicitacaoId', p_solicitacao_id, 'estado', 'bloqueado',
      'origem', null, 'motivoBloqueio', 'licenca_inativa', 'restante', null, 'falhaTecnica', false
    );
  end if;

  -- ── Laboratório / licença ilimitada ──────────────────────────────────────
  if v_licenca.franquia_ilimitada then
    insert into public.mensageria_reservas
      (solicitacao_id, user_id, canal, origem, estado)
    values (p_solicitacao_id, p_user_id, p_canal, 'ilimitado', 'reservado');
    return jsonb_build_object(
      'autorizado', true, 'solicitacaoId', p_solicitacao_id, 'estado', 'reservado',
      'origem', 'ilimitado', 'motivoBloqueio', null, 'restante', null, 'falhaTecnica', false
    );
  end if;

  -- ── Licença limitada: franquia mensal primeiro ───────────────────────────
  v_franquia_canal := case when p_canal = 'email' then v_licenca.email_incluido_mes
                            else v_licenca.sms_incluido_mes end;

  if v_franquia_canal is not null and v_franquia_canal >= 1 then
    if p_canal = 'email' then
      insert into public.mensageria_uso (user_id, ano_mes, emails_enviados, emails_reservados)
      values (p_user_id, v_ano_mes, 0, 1)
      on conflict (user_id, ano_mes) do update
        set emails_reservados = mensageria_uso.emails_reservados + 1
        where (mensageria_uso.emails_enviados + mensageria_uso.emails_reservados) < v_franquia_canal;
    else
      insert into public.mensageria_uso (user_id, ano_mes, sms_enviados, sms_reservados)
      values (p_user_id, v_ano_mes, 0, 1)
      on conflict (user_id, ano_mes) do update
        set sms_reservados = mensageria_uso.sms_reservados + 1
        where (mensageria_uso.sms_enviados + mensageria_uso.sms_reservados) < v_franquia_canal;
    end if;

    if found then
      if p_canal = 'email' then
        select (v_franquia_canal - emails_enviados - emails_reservados) into v_restante
        from public.mensageria_uso where user_id = p_user_id and ano_mes = v_ano_mes;
      else
        select (v_franquia_canal - sms_enviados - sms_reservados) into v_restante
        from public.mensageria_uso where user_id = p_user_id and ano_mes = v_ano_mes;
      end if;

      insert into public.mensageria_reservas
        (solicitacao_id, user_id, canal, origem, estado)
      values (p_solicitacao_id, p_user_id, p_canal, 'franquia', 'reservado');
      return jsonb_build_object(
        'autorizado', true, 'solicitacaoId', p_solicitacao_id, 'estado', 'reservado',
        'origem', 'franquia', 'motivoBloqueio', null, 'restante', v_restante, 'falhaTecnica', false
      );
    end if;
  end if;

  -- ── Franquia indisponível ou esgotada: tenta crédito extra ───────────────
  if p_canal = 'email' then
    update public.ink_clientes
    set email_credito_extra = email_credito_extra - 1
    where auth_user_id = p_user_id and coalesce(email_credito_extra, 0) >= 1;
  else
    update public.ink_clientes
    set sms_credito_extra = sms_credito_extra - 1
    where auth_user_id = p_user_id and coalesce(sms_credito_extra, 0) >= 1;
  end if;

  if found then
    if p_canal = 'email' then
      select email_credito_extra into v_restante from public.ink_clientes where auth_user_id = p_user_id;
    else
      select sms_credito_extra into v_restante from public.ink_clientes where auth_user_id = p_user_id;
    end if;

    insert into public.mensageria_reservas
      (solicitacao_id, user_id, canal, origem, estado)
    values (p_solicitacao_id, p_user_id, p_canal, 'credito_extra', 'reservado');
    return jsonb_build_object(
      'autorizado', true, 'solicitacaoId', p_solicitacao_id, 'estado', 'reservado',
      'origem', 'credito_extra', 'motivoBloqueio', null, 'restante', v_restante, 'falhaTecnica', false
    );
  end if;

  -- ── Nem franquia nem crédito: bloqueia, de forma imutável ────────────────
  v_motivo := case when v_franquia_canal is null then 'franquia_nao_configurada' else 'franquia_esgotada' end;

  insert into public.mensageria_reservas
    (solicitacao_id, user_id, canal, origem, estado, motivo_bloqueio, resolvido_em)
  values (p_solicitacao_id, p_user_id, p_canal, null, 'bloqueado', v_motivo, now());

  return jsonb_build_object(
    'autorizado', false, 'solicitacaoId', p_solicitacao_id, 'estado', 'bloqueado',
    'origem', null, 'motivoBloqueio', v_motivo, 'restante', null, 'falhaTecnica', false
  );
end;
$function$;

-- ══════════════════════════════════════════════════════════════════════════
-- Parte 4 — grants de tabela e função (nunca anon/PUBLIC/service_role)
-- ══════════════════════════════════════════════════════════════════════════

-- Função: revoga de PUBLIC (default nativo do Postgres) e, explicitamente
-- por nome, de anon e service_role (privilégio padrão do schema deste
-- projeto Supabase, que REVOKE FROM PUBLIC sozinho não alcança -- achado da
-- homologação real). Concede só a authenticated e postgres.
revoke all on function public.reservar_disparo(uuid, uuid, text) from public, anon, service_role;
grant execute on function public.reservar_disparo(uuid, uuid, text) to authenticated, postgres;

-- Tabela: revoga explicitamente de anon, authenticated e service_role (mesmo
-- privilégio padrão do schema, aplicado a toda tabela nova). Nenhum GRANT é
-- concedido a ninguém -- o único caminho de acesso pretendido é a RPC;
-- postgres mantém acesso automaticamente, por ser o dono, sem depender de
-- GRANT.
revoke all on table public.mensageria_reservas from anon, authenticated, service_role;

-- Verificação ativa -- fail-closed: confirma que nenhum grant indevido
-- restou na função, mesmo que algum privilégio padrão do schema tenha sido
-- reaplicado por qualquer motivo entre a criação e esta checagem.
do $verificar_grants_reservar_disparo$
declare
  v_qtd int;
begin
  select count(*) into v_qtd
  from information_schema.role_routine_grants
  where routine_schema = 'public' and routine_name = 'reservar_disparo'
    and grantee in ('anon', 'PUBLIC', 'service_role');

  if v_qtd <> 0 then
    raise exception
      'Abortando: reservar_disparo ainda tem % grant(s) indevido(s) para anon/PUBLIC/service_role -- revise manualmente (pode ser privilégio padrão do schema sendo reaplicado).',
      v_qtd;
  end if;

  raise notice 'Grants de reservar_disparo confirmados: authenticated e postgres, sem anon/PUBLIC/service_role.';
end $verificar_grants_reservar_disparo$;

-- Mesma verificação ativa para a tabela.
do $verificar_grants_mensageria_reservas$
declare
  v_qtd int;
begin
  select count(*) into v_qtd
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'mensageria_reservas'
    and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC');

  if v_qtd <> 0 then
    raise exception
      'Abortando: mensageria_reservas ainda tem % grant(s) indevido(s) para anon/authenticated/service_role/PUBLIC -- revise manualmente (pode ser privilégio padrão do schema sendo reaplicado).',
      v_qtd;
  end if;

  raise notice 'Grants de mensageria_reservas confirmados: sem acesso direto de anon/authenticated/service_role/PUBLIC -- só o dono (postgres) tem acesso.';
end $verificar_grants_mensageria_reservas$;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente) ─────────────────
-- 1) Estrutura da tabela:
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'mensageria_reservas'
-- order by ordinal_position;
--
-- 2) Colunas novas em mensageria_uso:
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'mensageria_uso'
--   and column_name in ('emails_reservados', 'sms_reservados');
--
-- 3) Grants da RPC -- esperado: authenticated e postgres, só isso. Sem
--    anon, sem PUBLIC, sem service_role:
-- select routine_name, grantee, privilege_type
-- from information_schema.role_routine_grants
-- where routine_schema = 'public' and routine_name = 'reservar_disparo'
-- order by grantee;
--
-- 4) RLS da tabela -- esperado: relrowsecurity = true, zero policies:
-- select relrowsecurity, relforcerowsecurity
-- from pg_class where relname = 'mensageria_reservas' and relnamespace = 'public'::regnamespace;
-- select policyname from pg_policies where schemaname = 'public' and tablename = 'mensageria_reservas';
--
-- 4b) Grants diretos da tabela -- esperado: ZERO linhas (nenhum papel de
--     aplicação deve ter acesso direto; só o dono/postgres, que não
--     depende de GRANT):
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public' and table_name = 'mensageria_reservas'
--   and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC');
--
-- 5) Teste manual básico (rodar como postgres no SQL Editor -- sem sessão,
--    então session_user = 'postgres' cai no caminho de bypass):
-- select reservar_disparo('2d366d35-1cae-40d5-ba92-06fe2ab8a763'::uuid, gen_random_uuid(), 'email');
-- -- esperado: autorizado=true, origem=ilimitado (linha do Laboratório).
-- -- rodar de novo com o MESMO solicitacao_id deve devolver exatamente o
-- -- mesmo resultado, sem criar segunda linha em mensageria_reservas.
