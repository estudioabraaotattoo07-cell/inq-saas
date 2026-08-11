-- Migration — licencas: registro versionado de UNIQUE (user_id)
-- Ver: COMERCIAL-ACESSO-1C.3 (11/08/2026)
--
-- Esta migration documenta, de forma idempotente, a constraint
-- licencas_user_id_key -- já aplicada manualmente no banco real durante
-- o subbloco COMERCIAL-ACESSO-1C.2 (SQL Editor do Supabase, 2026-08-11),
-- depois de confirmado por consulta prévia que não havia nenhum user_id
-- duplicado em public.licencas.
--
-- Diferente das migrations anteriores deste projeto (ex.:
-- 2026-07-29_pipeline_etapas_unique_user_slug.sql,
-- 2026-07-29_ink_clientes_unique_auth_user_id.sql), que são instruções de
-- "aplicar uma vez" contra um estado que ainda não tinha a constraint,
-- esta migration serve pra reconciliar o repositório com um estado que
-- já existe no banco -- por isso, e só por isso, usa um bloco condicional
-- (DO $$ ... $$): o caminho normal e esperado ao rodar isto hoje é
-- "a constraint já existe, correta, nada a fazer", não "aplicar agora".
--
-- Verificação reforçada (não só o nome da constraint, mas tipo e
-- definição exatos): confirma contype = 'u' (unique) e
-- pg_get_constraintdef(oid) = 'UNIQUE (user_id)'. Se existir uma
-- constraint chamada licencas_user_id_key com tipo ou definição
-- diferentes do esperado, a migration falha explicitamente
-- (RAISE EXCEPTION, informando o que foi encontrado) em vez de mascarar
-- uma constraint incorreta como se fosse a certa.
--
-- Sobre user_id NULL: a constraint foi criada como UNIQUE (user_id), sem
-- a opção NULLS NOT DISTINCT -- por isso o Postgres trata cada valor NULL
-- como distinto de qualquer outro NULL, e múltiplas linhas com
-- user_id IS NULL continuam permitidas. Isso é intencional nesta fase:
-- user_id NOT NULL é uma decisão separada, não tomada aqui.
--
-- Sobre duplicidade, se a constraint precisar ser criada por este script
-- (cenário "não existe ainda"): o próprio ALTER TABLE do Postgres recusa
-- a operação com seu erro nativo de violação de unicidade caso existam
-- duplicatas -- este script não adiciona nem substitui esse
-- comportamento, só deixa o Postgres agir.
--
-- Sobre reversão: DROP CONSTRAINT IF EXISTS licencas_user_id_key
-- é tecnicamente capaz de remover a constraint sem apagar nenhuma linha
-- de dado -- mas NÃO deve ser tratado como rollback automático desta
-- migration. No banco real, licencas_user_id_key já existia ANTES da
-- criação deste arquivo -- esta migration só reconhece/documenta a
-- constraint, não é quem a originou. Reverter esta migration não
-- significa "desfazer o que ela fez" (ela não criou nada no cenário
-- atual), e um DROP CONSTRAINT só deve ser executado futuramente
-- mediante decisão explícita de abandonar a garantia estrutural de uma
-- licença por usuário -- nunca como efeito colateral de reverter este
-- arquivo. Por isso, nenhum comando de reversão é incluído neste script.
--
-- Este script é destinado a ser executado manualmente no SQL Editor do
-- Supabase, mediante autorização separada da criação deste arquivo.

do $$
declare
  tipo_atual text;
  definicao_atual text;
begin
  select con.contype, pg_get_constraintdef(con.oid)
    into tipo_atual, definicao_atual
  from pg_constraint con
  where con.conrelid = 'public.licencas'::regclass
    and con.conname = 'licencas_user_id_key';

  if definicao_atual is null then
    -- Não existe ainda com esse nome: cria. Se houver duplicidade de
    -- user_id, o próprio ALTER TABLE falha aqui com o erro nativo do
    -- Postgres (violação de unicidade) -- comportamento esperado, não
    -- tratado nem mascarado por este script.
    alter table public.licencas
      add constraint licencas_user_id_key unique (user_id);
  elsif tipo_atual <> 'u' or definicao_atual <> 'UNIQUE (user_id)' then
    -- Existe com o mesmo nome, mas não é a constraint que esperamos --
    -- não mascarar: falha alto, informando exatamente o que foi
    -- encontrado.
    raise exception
      'licencas_user_id_key existe com tipo/definição inesperados -- contype: %, definicao: %',
      tipo_atual, definicao_atual;
  end if;
  -- Se já existe com contype='u' e definição 'UNIQUE (user_id)': nada a
  -- fazer, sucesso silencioso -- este é o cenário real esperado hoje.
end $$;

-- Relatório final — deve sempre retornar exatamente 1 linha, com esta
-- definição, seja a migration tendo criado agora ou encontrado já pronta.
select conname, contype, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'public.licencas'::regclass
  and conname = 'licencas_user_id_key';
