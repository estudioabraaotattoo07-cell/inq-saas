-- Grupo B.2 — Encerramento excepcional do Grupo Teste (saneamento sem fusão)
-- chave_dedup = '27996929665|teste', user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763'
--
-- ⚠ PARA REVISÃO. NÃO EXECUTAR SEM APROVAÇÃO EXPLÍCITA. ⚠
--
-- Motivo: entre a auditoria e a execução, o registro que seria o canônico
-- (0d94ab10…) também foi soft-deletado — muito provavelmente por limpeza
-- manual de dado de homologação, em paralelo a este trabalho. A auditoria
-- confirmou que NENHUM dos 10 registros deste grupo está ativo. A função
-- _fundir_grupo_b2() exige um canônico ativo por desenho (é ela quem recebe
-- o merge) e abortou corretamente ao encontrar essa precondição violada —
-- não é um erro a contornar, é a arquitetura funcionando como planejado.
--
-- Sem canônico ativo, não existe "fusão" possível — não há destino para
-- consolidar dado. O único problema que resta é técnico: os 10 registros
-- ainda têm chave_dedup preenchida, e a constraint UNIQUE(user_id,
-- chave_dedup) do B.3 não ignora excluido_em — colisão entre linhas
-- soft-deletadas ainda bloquearia a criação da constraint.
--
-- Este script NÃO reativa nada, NÃO mescla hist/projetos, NÃO repontua
-- eventos_trafego (não haveria registro ativo para repontar). A única
-- ação é zerar chave_dedup nos 10 registros, preservando integralmente
-- todo o resto.

do $$
declare
  v_ids uuid[] := array[
    '0d94ab10-add5-441d-8252-06708522aedc',
    '7aaa68ea-a099-44bd-a51a-2da94d747796',
    'f163bcf1-0ea4-4af8-9016-9a3b958fa6d4',
    '3f4cd7e9-f963-4589-8162-ba82652a2702',
    '05e94307-172e-4908-bb8e-421d7cda7557',
    'ea6d68cb-0940-4e99-93a4-a48d72848032',
    '3728ab48-f96a-4b0e-bfaf-fc44cc49f5f6',
    '4d738886-94ea-4a10-b5b2-c8117de4b084',
    'cc034bb8-fd11-4a4d-9fd8-ef1ec88dfa2e',
    '5cebccdc-095a-4ddf-8880-5a895ba0eaac'
  ];
  v_ativos_no_grupo int;
  v_prontos int;
  v_atualizados int;
begin
  -- pré-condição 1: nenhum registro ativo com esta chave_dedup (senão isto
  -- deixaria de ser um caso excepcional de saneamento e voltaria a ser um
  -- caso normal de fusão, que deve usar _fundir_grupo_b2())
  select count(*) into v_ativos_no_grupo
  from clientes
  where user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763'
    and chave_dedup = '27996929665|teste'
    and excluido_em is null;

  if v_ativos_no_grupo > 0 then
    raise exception 'Saneamento abortado: existe % registro(s) ATIVO(s) com esta chave_dedup — não é mais um caso de saneamento sem canônico.', v_ativos_no_grupo;
  end if;

  -- pré-condição 2: os 10 ids esperados existem, pertencem exatamente ao
  -- tenant da Casa dos Carvalho, mantêm exatamente a chave_dedup esperada
  -- (não apenas "preenchida" — o valor exato, já que outro tenant já
  -- coincidiu no mesmo texto de chave_dedup nesta mesma investigação) e
  -- estão soft-deletados.
  select count(*) into v_prontos
  from clientes
  where id = any(v_ids)
    and user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763'
    and chave_dedup = '27996929665|teste'
    and excluido_em is not null;

  if v_prontos <> array_length(v_ids, 1) then
    raise exception 'Saneamento abortado: esperava 10 registros soft-deletados com chave_dedup preenchida, encontrei %', v_prontos;
  end if;

  -- snapshot do estado antes da limpeza (mesma tabela de auditoria da fusão)
  insert into clientes_fusao_b2_snapshot(operacao_id, versao_script, tipo_registro, chave_dedup, cliente_id, dados_json)
  select 'grupoB2_2026-08-05', 'b2-v1', 'saneamento_sem_canonico_pre', chave_dedup, id, to_jsonb(clientes.*)
  from clientes where id = any(v_ids);

  -- limpeza mínima: só chave_dedup. excluido_em, hist, projetos e todo o
  -- resto permanecem intocados.
  update clientes set chave_dedup = null where id = any(v_ids);
  get diagnostics v_atualizados = row_count;

  if v_atualizados <> array_length(v_ids, 1) then
    raise exception 'Falha sistêmica: % linha(s) esperada(s), % atualizada(s)', array_length(v_ids, 1), v_atualizados;
  end if;

  raise notice 'OK — saneamento do Grupo Teste: % registro(s) com chave_dedup zerada; excluido_em, hist e projetos preservados intactos.', v_atualizados;
end;
$$;

-- ── VALIDAÇÃO 1 — chave_dedup limpa, excluido_em/hist/projetos preservados ──
-- Comparação direta contra o snapshot pré-limpeza: hist_inalterado e
-- projetos_inalterado devem ser `true` em todas as linhas; excluido_em deve
-- ser idêntico ao original.
select
  c.id,
  c.chave_dedup as chave_dedup_agora,
  c.excluido_em,
  (s.dados_json->>'excluido_em')::timestamptz as excluido_em_original,
  c.hist = (s.dados_json->'hist') as hist_inalterado,
  c.projetos = (s.dados_json->'projetos') as projetos_inalterado
from clientes c
join clientes_fusao_b2_snapshot s
  on s.cliente_id = c.id
  and s.tipo_registro = 'saneamento_sem_canonico_pre'
  and s.operacao_id = 'grupoB2_2026-08-05'
where c.id in (
  '0d94ab10-add5-441d-8252-06708522aedc','7aaa68ea-a099-44bd-a51a-2da94d747796',
  'f163bcf1-0ea4-4af8-9016-9a3b958fa6d4','3f4cd7e9-f963-4589-8162-ba82652a2702',
  '05e94307-172e-4908-bb8e-421d7cda7557','ea6d68cb-0940-4e99-93a4-a48d72848032',
  '3728ab48-f96a-4b0e-bfaf-fc44cc49f5f6','4d738886-94ea-4a10-b5b2-c8117de4b084',
  'cc034bb8-fd11-4a4d-9fd8-ef1ec88dfa2e','5cebccdc-095a-4ddf-8880-5a895ba0eaac'
);

-- ── VALIDAÇÃO 2 — B.3 pode prosseguir para esta chave_dedup ─────────────────
-- Escopada ao tenant da Casa dos Carvalho — já comprovado que outro tenant
-- coincide no mesmo texto de chave_dedup, embora não participe da mesma
-- restrição composta UNIQUE(user_id, chave_dedup). Esperado: 0 linhas.
select user_id, chave_dedup, count(*) as ocorrencias
from clientes
where user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763'
  and chave_dedup = '27996929665|teste'
group by user_id, chave_dedup
having count(*) > 1;
