-- ⚠ SCRIPT MANUAL — NÃO EXECUTAR AUTOMATICAMENTE ⚠
-- ============================================================
-- * NÃO faz parte de nenhum build, deploy ou pipeline deste repositório.
--   Confirmado: não existe vercel.json, workflow de CI, nem script em
--   package.json que leia ou execute arquivos desta pasta sql/.
-- * NÃO foi executado como parte desta auditoria/implementação (Bloco 2).
-- * Destinado a ser copiado manualmente para o SQL Editor do Supabase,
--   mediante autorização separada da criação deste arquivo.
-- ============================================================
--
-- Migration (preparada, NÃO executada) — ink_leads: excluir os 8 resíduos
-- do fluxo comercial antigo (Bronze/Prata/Ouro)
-- Ver: Bloco 2 — remoção completa da arquitetura Bronze/Prata/Ouro do
-- repositório inq-saas (13/08/2026)
--
-- CONTEXTO
--
-- 8 registros antigos em ink_leads são resíduos do extinto fluxo comercial
-- de quiz "qual plano cabe em você" (Bronze/Prata/Ouro). Já confirmado
-- anteriormente: não são usuários, não são contas, não têm e-mail, e
-- nenhuma chave estrangeira aponta para eles -- excluí-los é seguro do
-- ponto de vista de integridade referencial.
--
-- Os 8 identificadores exatos (fornecidos e confirmados diretamente no
-- banco, não inferidos nesta auditoria):
--   024fa9c0-20f8-4f6c-ac4e-155eb8107cff
--   0ae0ab1d-1b17-441e-9ba8-77fe07f31e07
--   0d4216f2-3eef-4313-8724-4fbb2cd833a2
--   1d664fd7-18c0-47e6-8b65-065fcd11351d
--   59aeea89-1fdd-402f-a739-74d32dabce11
--   be23361c-2038-4ce7-9c4f-6f78b258f548
--   be73de4f-5db3-4269-b9d7-8697c177a528
--   f1b32e2e-589f-4f19-85dd-48910f811fca
--
-- Distribuição conhecida de plano_sugerido entre esses 8: 3 "Bronze",
-- 1 "Prata", 2 "Ouro", 2 sem plano (null). Todos com tipo='plano' e
-- status='novo', todos com email nulo.
--
-- SEGURANÇA DESTE SCRIPT
--
-- * Só afeta ink_leads -- nunca usuários de autenticação, licencas,
--   ink_clientes, artistas, clientes, agenda, financeiro, pipeline ou site.
-- * Roda inteiro dentro de um único bloco PL/pgSQL (do $$ ... $$), que
--   executa na transação corrente do SQL Editor -- qualquer RAISE
--   EXCEPTION não tratada aborta e desfaz tudo que o bloco tiver feito
--   até ali (mesmo padrão já usado em
--   sql/2026-08-11_licencas_unique_user_id.sql e no script irmão desta
--   mesma auditoria, sql/2026-08-13_ink_clientes_retirar_ouro_casa_dos_carvalho.sql).
--   Não há como este script excluir "parte" dos 8 registros: ou os 8 saem
--   juntos, ou nenhum sai.
-- * Confere, antes de excluir qualquer coisa: (1) que existem exatamente
--   8 linhas com esses IDs exatos; (2) que as 8 têm email nulo; (3) que as
--   8 têm tipo='plano' e status='novo'; (4) que a distribuição de
--   plano_sugerido bate exatamente com o esperado (3/1/2/2). Se qualquer
--   uma dessas condições divergir, a transação inteira é abortada -- não
--   exclui nada, nem parcialmente.
-- * O próprio DELETE repete as condições de email/tipo/status (defesa
--   extra: mesmo que a validação anterior tivesse um erro, o DELETE
--   sozinho já não alcançaria nenhuma linha fora do esperado).
-- * Confere, depois de excluir, que a quantidade removida foi exatamente
--   8 -- se não for (ex.: alteração concorrente entre a validação e a
--   exclusão), aborta e desfaz tudo também.
-- * Devolve (via RAISE NOTICE) a quantidade e os IDs efetivamente
--   excluídos, para ficar registrado na tela do SQL Editor no momento da
--   execução.

do $$
declare
  v_ids uuid[] := array[
    '024fa9c0-20f8-4f6c-ac4e-155eb8107cff',
    '0ae0ab1d-1b17-441e-9ba8-77fe07f31e07',
    '0d4216f2-3eef-4313-8724-4fbb2cd833a2',
    '1d664fd7-18c0-47e6-8b65-065fcd11351d',
    '59aeea89-1fdd-402f-a739-74d32dabce11',
    'be23361c-2038-4ce7-9c4f-6f78b258f548',
    'be73de4f-5db3-4269-b9d7-8697c177a528',
    'f1b32e2e-589f-4f19-85dd-48910f811fca'
  ]::uuid[];
  v_qtd_total int;
  v_qtd_email_nulo int;
  v_qtd_tipo_status_ok int;
  v_qtd_bronze int;
  v_qtd_prata int;
  v_qtd_ouro int;
  v_qtd_sem_plano int;
  v_deletados_ids uuid[];
  v_qtd_deletados int;
begin
  -- (1) Exatamente 8 linhas com esses IDs exatos.
  select count(*) into v_qtd_total from public.ink_leads where id = any(v_ids);
  if v_qtd_total <> 8 then
    raise exception 'Esperava exatamente 8 registros para os IDs informados, encontrou %. Nenhuma exclusão foi feita.', v_qtd_total;
  end if;

  -- (2) Todos com e-mail nulo.
  select count(*) into v_qtd_email_nulo from public.ink_leads where id = any(v_ids) and email is null;
  if v_qtd_email_nulo <> 8 then
    raise exception 'Esperava que os 8 registros tivessem email nulo, mas só % têm. Nenhuma exclusão foi feita.', v_qtd_email_nulo;
  end if;

  -- (3) Todos com tipo='plano' e status='novo'.
  select count(*) into v_qtd_tipo_status_ok from public.ink_leads where id = any(v_ids) and tipo = 'plano' and status = 'novo';
  if v_qtd_tipo_status_ok <> 8 then
    raise exception 'Esperava que os 8 registros tivessem tipo=''plano'' e status=''novo'', mas só % têm. Nenhuma exclusão foi feita.', v_qtd_tipo_status_ok;
  end if;

  -- (4) Distribuição conhecida de plano_sugerido: 3 Bronze, 1 Prata, 2 Ouro, 2 sem plano.
  -- Comparação sem diferenciar maiúscula/minúscula, mesmo padrão de normalização já usado no código da aplicação.
  select count(*) into v_qtd_bronze from public.ink_leads where id = any(v_ids) and lower(trim(plano_sugerido)) = 'bronze';
  select count(*) into v_qtd_prata from public.ink_leads where id = any(v_ids) and lower(trim(plano_sugerido)) = 'prata';
  select count(*) into v_qtd_ouro from public.ink_leads where id = any(v_ids) and lower(trim(plano_sugerido)) = 'ouro';
  select count(*) into v_qtd_sem_plano from public.ink_leads where id = any(v_ids) and plano_sugerido is null;

  if v_qtd_bronze <> 3 or v_qtd_prata <> 1 or v_qtd_ouro <> 2 or v_qtd_sem_plano <> 2 then
    raise exception 'Distribuição de plano_sugerido não bate com o esperado (3 Bronze / 1 Prata / 2 Ouro / 2 sem plano). Encontrado: % Bronze, % Prata, % Ouro, % sem plano. Nenhuma exclusão foi feita.',
      v_qtd_bronze, v_qtd_prata, v_qtd_ouro, v_qtd_sem_plano;
  end if;

  -- Tudo validado — agora sim, exclusão. Repete as condições de email/tipo/
  -- status no próprio DELETE, como defesa extra.
  with excluidos as (
    delete from public.ink_leads
    where id = any(v_ids)
      and email is null
      and tipo = 'plano'
      and status = 'novo'
    returning id
  )
  select array_agg(id), count(*) into v_deletados_ids, v_qtd_deletados from excluidos;

  if v_qtd_deletados <> 8 then
    raise exception 'Esperava excluir exatamente 8 registros, mas excluiu %. Transação abortada -- nada foi mantido excluído.', v_qtd_deletados;
  end if;

  raise notice 'Excluídos % registros de ink_leads. IDs removidos: %', v_qtd_deletados, v_deletados_ids;
end $$;
