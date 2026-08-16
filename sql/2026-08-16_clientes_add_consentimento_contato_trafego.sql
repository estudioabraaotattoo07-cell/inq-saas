-- Bloco 3.1 — Reconstrução da Captação do Site: preparação de schema
-- Adiciona duas colunas novas à tabela public.clientes:
--   consentimento_contato jsonb -- consentimento de contato do formulário
--     público (estrutura própria, nunca reaproveita clientes.consent, que
--     continua sendo só "Consentimento de Uso de Imagem" -- decisão de
--     produto já registrada).
--   trafego jsonb -- captura passiva de origem de tráfego (UTM/fbclid/
--     página de entrada/referrer), sem nenhuma chamada à API da Meta.
--
-- Ver: docs/06-reconstrucao-captacao-site.md e o relatório de arquitetura
-- do Bloco 2 (auditoria técnica pré-implementação, 2026-08-15/16).
--
-- ESTRITAMENTE ESTRUTURAL (DDL). Este script NÃO contém nenhum INSERT,
-- UPDATE ou DELETE -- não preenche nenhum valor pra clientes já existentes
-- (ambas as colunas nascem NULL pra toda linha antiga, sem valor padrão
-- artificial, e continuam aceitando NULL -- não são obrigatórias). Não cria
-- a função resolver_solicitacao_lead nem nenhuma outra função -- isso fica
-- pro Bloco 3.2, com sua própria auditoria e aprovação separadas. Não
-- altera api/lead.js, o CRM, a classificação "Projeto detalhado" ou
-- qualquer outro comportamento já existente -- só prepara o schema.
--
-- ESTE ARQUIVO É MANUAL. Não é executado por deploy, build, Vercel, cron,
-- hook ou qualquer caminho da aplicação -- só roda se alguém copiar o
-- conteúdo e colar manualmente no SQL Editor do Supabase, depois de
-- revisar e aprovar.
--
-- IDEMPOTÊNCIA: antes de cada ADD COLUMN, o script consulta o catálogo do
-- PostgreSQL (information_schema.columns) para saber se a coluna já
-- existe. Se já existir, confirma que o tipo real é exatamente "jsonb" --
-- se for qualquer outro tipo, ABORTA com RAISE EXCEPTION (desfaz tudo que
-- o bloco já tiver feito até esse ponto), em vez de seguir silenciosamente
-- sobre uma coluna incompatível. Rodar este script uma segunda vez, depois
-- de já ter tido sucesso, não altera nada -- só confirma que as duas
-- colunas já existem com o tipo certo e imprime aviso, sem tentar recriar
-- nem tocar em nenhuma linha.

do $adicionar_colunas_captacao$
declare
  v_tipo_atual text;
begin
  -- ── consentimento_contato ──────────────────────────────────────────────
  select data_type into v_tipo_atual
  from information_schema.columns
  where table_schema = 'public' and table_name = 'clientes' and column_name = 'consentimento_contato';

  if v_tipo_atual is null then
    alter table public.clientes add column consentimento_contato jsonb;
    raise notice 'Coluna consentimento_contato criada (jsonb, sem valor padrão, aceita NULL, nenhuma linha existente alterada).';
  elsif v_tipo_atual <> 'jsonb' then
    raise exception 'Abortando: clientes.consentimento_contato já existe com tipo "%", esperado "jsonb". Não prosseguir sem revisão manual -- nenhuma alteração foi feita.', v_tipo_atual;
  else
    raise notice 'Coluna consentimento_contato já existe com tipo jsonb -- nada a fazer (execução idempotente).';
  end if;

  -- ── trafego ──────────────────────────────────────────────────────────────
  select data_type into v_tipo_atual
  from information_schema.columns
  where table_schema = 'public' and table_name = 'clientes' and column_name = 'trafego';

  if v_tipo_atual is null then
    alter table public.clientes add column trafego jsonb;
    raise notice 'Coluna trafego criada (jsonb, sem valor padrão, aceita NULL, nenhuma linha existente alterada).';
  elsif v_tipo_atual <> 'jsonb' then
    raise exception 'Abortando: clientes.trafego já existe com tipo "%", esperado "jsonb". Não prosseguir sem revisão manual -- nenhuma alteração foi feita.', v_tipo_atual;
  else
    raise notice 'Coluna trafego já existe com tipo jsonb -- nada a fazer (execução idempotente).';
  end if;

  raise notice 'Migration concluída -- nenhum dado de cliente existente foi lido, alterado ou preenchido. Nenhuma função RPC foi criada.';
end $adicionar_colunas_captacao$;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente) ───────────────────
-- Deve retornar as duas colunas, ambas com data_type = 'jsonb' e is_nullable = 'YES'.
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'clientes'
--   and column_name in ('consentimento_contato', 'trafego');
