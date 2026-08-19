-- Bloco B — Fundação da Franquia Comercial de Mensageria (e-mail/SMS)
-- Ver: auditoria "AUDITORIA PRÉ-IMPLEMENTAÇÃO DO BLOCO B" (18/08/2026) e o
-- Bloco A já publicado (licencas.franquia_ilimitada).
--
-- ESCOPO (autorizado explicitamente, nada além disso):
--   Adiciona duas colunas a public.licencas:
--     email_incluido_mes integer, aceita NULL, default NULL.
--     sms_incluido_mes   integer, aceita NULL, default NULL.
--
-- O QUE O NULL SIGNIFICA (proposital, não é zero):
--   NULL = "franquia ainda não definida/preenchida" para aquela licença.
--   Preencher com um número (400, 80, ou qualquer outro) é decisão de um
--   bloco comercial futuro -- este script não grava nenhum valor numérico
--   em nenhuma linha, nem mesmo na do Laboratório.
--
-- FORA DE ESCOPO NESTE ARQUIVO (decisão explícita, não esquecimento):
--   Nenhum backfill. Nenhuma linha existente é atualizada -- nem a do
--   Laboratório, nem nenhuma outra. Nenhuma outra tabela é tocada. Nenhuma
--   lógica de franquia, preço, Asaas, Resend/Zenvia, Resumo Premium,
--   WhatsApp, capacidade global, alertas, painel admin/usuário ou "ofertas
--   comerciais" é criada. criarLicenciamento.js, provisionarEstudio.js,
--   avaliarAcesso.ts e qualquer arquivo de ink-system-plataform ou
--   ink-system-1.0 não são alterados -- nenhum código de nenhum repositório
--   lê estas colunas ainda. O motor de provisionamento continua criando
--   licenças normalmente; uma licença nova nasce com email_incluido_mes e
--   sms_incluido_mes em NULL (o default da coluna), sem precisar de
--   nenhuma mudança de código -- isso é intencional nesta fase.
--
-- PENDÊNCIA PARALELA, NÃO BLOQUEADORA (registrada, não resolvida aqui):
--   Confirmar no painel da Vercel se o projeto ink-system-1.0 aponta para
--   o mesmo Supabase deste banco, e definir o processo formal de
--   promoção/release da Mãe (inq-saas) para a versão 1.0. Não bloqueia
--   este Bloco B porque nenhuma aplicação ainda lê as colunas criadas
--   aqui.
--
-- IDEMPOTÊNCIA:
--   Para cada coluna: consulta information_schema.columns antes de criar.
--   Se a coluna já existir, confirma tipo/nulidade/default exatos -- se
--   algo divergir do esperado (data_type <> 'integer', is_nullable <> 'YES',
--   ou column_default não for NULL), ABORTA com RAISE EXCEPTION em vez de
--   seguir sobre uma coluna incompatível. As duas colunas são checadas de
--   forma independente, uma não depende do resultado da outra.
--
-- ESTE ARQUIVO É MANUAL. Não faz parte de build, deploy, Vercel, cron ou
-- qualquer caminho da aplicação -- só roda se alguém copiar o conteúdo e
-- colar manualmente no SQL Editor do Supabase, mediante autorização
-- separada da criação deste arquivo. Não foi executado como parte desta
-- implementação.
--
-- ROLLBACK: "alter table public.licencas drop column email_incluido_mes;"
-- e "alter table public.licencas drop column sms_incluido_mes;" revertem
-- sem apagar nenhuma outra coluna/linha (nada mais depende delas ainda).
-- Não incluídos como comando executável aqui -- só devem ser rodados
-- mediante decisão explícita de abandonar estes campos, nunca como efeito
-- colateral de reverter este arquivo.

-- ── email_incluido_mes ──────────────────────────────────────────────────
do $adicionar_email_incluido_mes$
declare
  v_tipo_atual text;
  v_nullable_atual text;
  v_default_atual text;
begin
  select data_type, is_nullable, column_default
    into v_tipo_atual, v_nullable_atual, v_default_atual
  from information_schema.columns
  where table_schema = 'public' and table_name = 'licencas' and column_name = 'email_incluido_mes';

  if v_tipo_atual is null then
    alter table public.licencas
      add column email_incluido_mes integer;
    raise notice 'Coluna licencas.email_incluido_mes criada (integer, aceita NULL, default NULL). Nenhuma linha existente foi alterada.';
  elsif v_tipo_atual <> 'integer' or v_nullable_atual <> 'YES' or v_default_atual is not null then
    raise exception
      'Abortando: licencas.email_incluido_mes já existe com data_type=%, is_nullable=%, column_default=% -- esperado integer/YES/NULL. Não prosseguir sem revisão manual -- nenhuma alteração foi feita.',
      v_tipo_atual, v_nullable_atual, v_default_atual;
  else
    raise notice 'Coluna licencas.email_incluido_mes já existe com o tipo/nulidade/default esperados -- nada a fazer (execução idempotente).';
  end if;
end $adicionar_email_incluido_mes$;

-- ── sms_incluido_mes ─────────────────────────────────────────────────────
do $adicionar_sms_incluido_mes$
declare
  v_tipo_atual text;
  v_nullable_atual text;
  v_default_atual text;
begin
  select data_type, is_nullable, column_default
    into v_tipo_atual, v_nullable_atual, v_default_atual
  from information_schema.columns
  where table_schema = 'public' and table_name = 'licencas' and column_name = 'sms_incluido_mes';

  if v_tipo_atual is null then
    alter table public.licencas
      add column sms_incluido_mes integer;
    raise notice 'Coluna licencas.sms_incluido_mes criada (integer, aceita NULL, default NULL). Nenhuma linha existente foi alterada.';
  elsif v_tipo_atual <> 'integer' or v_nullable_atual <> 'YES' or v_default_atual is not null then
    raise exception
      'Abortando: licencas.sms_incluido_mes já existe com data_type=%, is_nullable=%, column_default=% -- esperado integer/YES/NULL. Não prosseguir sem revisão manual -- nenhuma alteração foi feita.',
      v_tipo_atual, v_nullable_atual, v_default_atual;
  else
    raise notice 'Coluna licencas.sms_incluido_mes já existe com o tipo/nulidade/default esperados -- nada a fazer (execução idempotente).';
  end if;
end $adicionar_sms_incluido_mes$;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente) ─────────────────
-- Deve retornar as duas colunas, ambas com data_type = 'integer',
-- is_nullable = 'YES' e column_default = NULL.
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'licencas'
--   and column_name in ('email_incluido_mes', 'sms_incluido_mes');
--
-- Deve retornar todas as linhas de licencas, com email_incluido_mes e
-- sms_incluido_mes em NULL para toda linha (nenhum backfill foi feito).
-- select id, user_id, email, plano, status, franquia_ilimitada,
--        email_incluido_mes, sms_incluido_mes
-- from public.licencas
-- order by user_id;
