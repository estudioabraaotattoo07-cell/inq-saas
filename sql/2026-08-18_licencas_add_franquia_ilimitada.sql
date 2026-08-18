-- Bloco A — Fundação Comercial de Mensageria: licencas.franquia_ilimitada
-- Ver: auditoria "AUDITORIA PRÉ-IMPLEMENTAÇÃO DO BLOCO A" (18/08/2026) e as
-- rodadas anteriores de planejamento do motor de franquia de mensageria.
--
-- ESCOPO (autorizado explicitamente, nada além disso):
--   1. Adiciona public.licencas.franquia_ilimitada (boolean, not null,
--      default false).
--   2. Marca franquia_ilimitada = true SOMENTE na licença do Laboratório
--      P&D (a única linha de public.licencas hoje, confirmada por SQL em
--      rodada anterior).
--
-- FORA DE ESCOPO NESTE ARQUIVO (decisão explícita, não esquecimento):
--   Nenhuma outra tabela é tocada. Nenhuma lógica de franquia (400/80/30),
--   preço, Asaas, Resend/Zenvia, Resumo Premium ou WhatsApp é criada.
--   avaliarAcesso.ts e o motor de provisionamento não são alterados --
--   nenhum código de nenhum repositório lê esta coluna ainda. Esta
--   migration é fundação pura: só identifica, no banco, qual licença é
--   comercialmente ilimitada, sem que nada dependa disso por enquanto.
--
-- POR QUE NÃO É UM UUID HARDCODED NO CÓDIGO: o valor abaixo
-- (v_user_id_laboratorio) existe só dentro deste script SQL, como o dado de
-- qual linha marcar num backfill de execução única -- não em nenhum arquivo
-- .ts/.tsx/.js de nenhum repositório. A identificação definitiva e
-- reutilizável do Laboratório passa a ser a coluna
-- licencas.franquia_ilimitada = true, não este UUID.
--
-- IDEMPOTÊNCIA:
--   Parte 1 (ADD COLUMN): consulta information_schema.columns antes de
--   criar. Se a coluna já existir, confirma tipo/nulidade/default exatos --
--   se algo divergir do esperado, ABORTA com RAISE EXCEPTION em vez de
--   seguir sobre uma coluna incompatível.
--   Parte 2 (backfill): confirma que existe exatamente 1 linha em
--   public.licencas para o user_id do Laboratório antes de alterar
--   qualquer coisa -- RAISE EXCEPTION se não encontrar exatamente 1. Se o
--   valor já for true, não faz UPDATE nenhum (sucesso silencioso, só
--   RAISE NOTICE). Depois do UPDATE, confere via GET DIAGNOSTICS que
--   exatamente 1 linha foi afetada -- nunca mais que isso.
--
-- ESTE ARQUIVO É MANUAL. Não faz parte de build, deploy, Vercel, cron ou
-- qualquer caminho da aplicação -- só roda se alguém copiar o conteúdo e
-- colar manualmente no SQL Editor do Supabase, mediante autorização
-- separada da criação deste arquivo. Não foi executado como parte desta
-- implementação.
--
-- ROLLBACK: "alter table public.licencas drop column franquia_ilimitada;"
-- reverte a Parte 1 sem apagar nenhuma outra coluna/linha (nada mais
-- depende dela ainda). Não incluído como comando executável aqui -- só
-- deve ser rodado mediante decisão explícita de abandonar este campo,
-- nunca como efeito colateral de reverter este arquivo.

-- ── Parte 1: coluna ──────────────────────────────────────────────────────
do $adicionar_coluna_franquia_ilimitada$
declare
  v_tipo_atual text;
  v_nullable_atual text;
  v_default_atual text;
begin
  select data_type, is_nullable, column_default
    into v_tipo_atual, v_nullable_atual, v_default_atual
  from information_schema.columns
  where table_schema = 'public' and table_name = 'licencas' and column_name = 'franquia_ilimitada';

  if v_tipo_atual is null then
    alter table public.licencas
      add column franquia_ilimitada boolean not null default false;
    raise notice 'Coluna licencas.franquia_ilimitada criada (boolean, not null, default false). Nenhuma linha existente teve outro valor além do default.';
  elsif v_tipo_atual <> 'boolean' or v_nullable_atual <> 'NO' or v_default_atual is distinct from 'false' then
    raise exception
      'Abortando: licencas.franquia_ilimitada já existe com data_type=%, is_nullable=%, column_default=% -- esperado boolean/NO/false. Não prosseguir sem revisão manual -- nenhuma alteração foi feita.',
      v_tipo_atual, v_nullable_atual, v_default_atual;
  else
    raise notice 'Coluna licencas.franquia_ilimitada já existe com o tipo/default esperados -- nada a fazer (execução idempotente).';
  end if;
end $adicionar_coluna_franquia_ilimitada$;

-- ── Parte 2: backfill exclusivo da licença do Laboratório P&D ──────────────
do $backfill_laboratorio_ilimitado$
declare
  v_user_id_laboratorio uuid := '2d366d35-1cae-40d5-ba92-06fe2ab8a763'; -- CONFERIR antes de rodar
  v_qtd int;
  v_valor_atual boolean;
  v_linhas_afetadas int;
begin
  select count(*) into v_qtd
  from public.licencas
  where user_id = v_user_id_laboratorio;

  if v_qtd <> 1 then
    raise exception
      'Esperava encontrar exatamente 1 linha em public.licencas para user_id=%, mas encontrou %. Nenhuma alteração foi feita.',
      v_user_id_laboratorio, v_qtd;
  end if;

  select franquia_ilimitada into v_valor_atual
  from public.licencas
  where user_id = v_user_id_laboratorio;

  if v_valor_atual then
    raise notice 'licencas.franquia_ilimitada já é true para user_id=% -- nada a fazer (execução idempotente).', v_user_id_laboratorio;
  else
    update public.licencas
    set franquia_ilimitada = true
    where user_id = v_user_id_laboratorio
      and franquia_ilimitada = false;

    get diagnostics v_linhas_afetadas = row_count;

    if v_linhas_afetadas <> 1 then
      raise exception
        'UPDATE deveria ter afetado exatamente 1 linha (user_id=%), mas afetou %. Verifique o estado do banco manualmente.',
        v_user_id_laboratorio, v_linhas_afetadas;
    end if;

    raise notice 'licencas.franquia_ilimitada marcada como true para user_id=% (Laboratório P&D). Nenhuma outra linha foi tocada.', v_user_id_laboratorio;
  end if;
end $backfill_laboratorio_ilimitado$;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente) ─────────────────
-- Deve retornar todas as linhas de licencas. Espera-se hoje exatamente 1
-- linha (a do Laboratório), com franquia_ilimitada = true. Qualquer linha
-- futura deve nascer com franquia_ilimitada = false (o default da coluna).
-- select id, user_id, email, plano, status, franquia_ilimitada
-- from public.licencas
-- order by user_id;
