-- Migration — Grupo B.2: Fusão das duplicidades identificadas no Bloco B.1
-- Ver: Grupo B — Cliente Recorrente, Deduplicação e Continuidade de Atendimento.
-- Base: Inventário B.1 (Parecer de Fusão) + Planejamento e Auditoria
-- Pré-Implementação do Grupo B.2 + Complementação da Auditoria + Revisão
-- Final de Robustez do SQL, todos de 2026-08-04/05.
--
-- ⚠ PARA REVISÃO. NÃO EXECUTAR SEM APROVAÇÃO EXPLÍCITA. ⚠
--
-- ══════════════════════════════════════════════════════════════════════════
-- ⚠⚠⚠ CADA "select _fundir_grupo_b2(...)" (Passos 2 a 6) DEVE SER EXECUTADO
-- SOZINHO, COMO UMA AÇÃO SEPARADA NO SQL EDITOR. NUNCA selecione vários
-- desses passos de uma vez e rode juntos, e NUNCA envolva mais de um em um
-- BEGIN/COMMIT manual. Cada chamada já é sua própria transação implícita
-- (autocommit do Postgres) — envolver várias num único BEGIN/COMMIT anularia
-- essa independência: uma falha no Passo 5, por exemplo, faria rollback
-- também dos Passos 2, 3 e 4 já bem-sucedidos dentro daquele mesmo BEGIN,
-- mesmo depois de cada um ter impresso "OK" no RAISE NOTICE. ⚠⚠⚠
-- ══════════════════════════════════════════════════════════════════════════
--
-- Escopo: fundir 13 registros absorvidos em 5 canônicos, dentro do
-- user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763' (Casa dos Carvalho)
-- exclusivamente. Nenhum outro tenant é tocado.
--
-- Dois modos, por decisão de produto já aprovada:
--   Modo A (preservação completa) — sâmela, thamiris, maria: mescla hist e
--   projetos (com renumeração de id), além de repontar relacionamentos.
--   Modo B (simplificado) — testando, teste: só repontamento de
--   relacionamentos + cadastro principal preservado; hist/projetos/
--   referencias/aura_chat_log do absorvido NÃO são copiados ao canônico
--   (permanecem intactos no próprio registro soft-deletado, recuperáveis).
--
-- chave_dedup dos absorvidos é zerada (NULL) no soft-delete — assim a
-- constraint UNIQUE(user_id, chave_dedup) do B.3 não colidiria mais com
-- NULL, sem exigir índice parcial (ver Complementação da Auditoria, item 1).
--
-- Recomendação operacional: rodar primeiro o grupo mais simples (Sâmela,
-- Modo A) como canário, conferir o resultado, e só então prosseguir para os
-- demais — mesmo que cada grupo seja tecnicamente independente.

-- ── PASSO 0 — Tabela de snapshot (permanente, não temporária) ──────────────
-- Sobrevive ao commit e ao fim da sessão — é a base do rollback pós-commit.
-- executado_por: captura current_user automaticamente em todo INSERT, sem
-- precisar alterar nenhuma instrução de escrita abaixo.
create table if not exists clientes_fusao_b2_snapshot (
  id bigserial primary key,
  operacao_id text not null,
  versao_script text not null,
  executado_por text not null default current_user,
  criado_em timestamptz not null default now(),
  tipo_registro text not null,
  chave_dedup text,
  cliente_id uuid,
  tabela_afetada text,
  registro_afetado_id text,
  coluna_afetada text,
  valor_antigo jsonb,
  valor_novo jsonb,
  dados_json jsonb
);

-- ── PASSO 0b — Função de fusão (reutilizada pelos 5 grupos) ────────────────
create or replace function _fundir_grupo_b2(
  p_operacao_id text,
  p_canonico uuid,
  p_absorvidos uuid[],
  p_modo text,                                   -- 'A' ou 'B'
  p_repoint_eventos_trafego uuid[] default '{}'  -- absorvidos cujo eventos_trafego repontar
) returns void language plpgsql as $$
declare
  v_canon clientes%rowtype;
  v_abs clientes%rowtype;
  v_abs_id uuid;
  v_max_proj_id numeric;
  v_novos_projetos jsonb;
  v_mapa_projetos jsonb;
  v_hist_novo jsonb;
  v_projetos_novo jsonb;
  v_hist_len_esperado int;
  v_projetos_len_esperado int;
  v_dup_id_count int;
  v_qtd_et_snapshot int;
  v_qtd_et_atualizados int;
  v_qtd_et_depois int;
  v_qtd_softdeletados int;
begin
  -- 1. lock das linhas envolvidas
  perform 1 from clientes where id = p_canonico for update;
  perform 1 from clientes where id = any(p_absorvidos) for update;

  -- 2. recheck de precondição (estado pode ter mudado desde a auditoria).
  -- A trava real é chave_dedup preenchida (ainda não processado por esta
  -- função) — NÃO exigir excluido_em is null nos absorvidos: um absorvido
  -- pode já estar soft-deletado de uma exclusão manual anterior ao Grupo
  -- B.2, e isso é um estado válido, não uma falha de precondição.
  select * into v_canon from clientes where id = p_canonico and excluido_em is null;
  if not found then
    raise exception 'Falha de grupo (%): canônico % não existe ou já está excluído', p_operacao_id, p_canonico;
  end if;
  if (select count(*) from clientes where id = any(p_absorvidos) and chave_dedup is not null)
     <> array_length(p_absorvidos, 1) then
    raise exception 'Falha de grupo (%): nem todos os absorvidos de % existem com chave_dedup preenchida (já processados antes?)', p_operacao_id, p_canonico;
  end if;

  -- 3. snapshot do canônico antes do merge
  insert into clientes_fusao_b2_snapshot(operacao_id, versao_script, tipo_registro, chave_dedup, cliente_id, dados_json)
  select p_operacao_id, 'b2-v1', 'canonico_pre_merge', chave_dedup, id, to_jsonb(clientes.*)
  from clientes where id = p_canonico;

  -- 4. snapshot dos absorvidos antes do soft-delete
  insert into clientes_fusao_b2_snapshot(operacao_id, versao_script, tipo_registro, chave_dedup, cliente_id, dados_json)
  select p_operacao_id, 'b2-v1', 'absorvido_pre_softdelete', chave_dedup, id, to_jsonb(clientes.*)
  from clientes where id = any(p_absorvidos);

  v_hist_novo := coalesce(v_canon.hist, '[]'::jsonb);
  v_hist_len_esperado := jsonb_array_length(v_hist_novo);
  v_projetos_novo := coalesce(v_canon.projetos, '[]'::jsonb);
  v_projetos_len_esperado := jsonb_array_length(v_projetos_novo);

  select coalesce(max((elem->>'id')::numeric), 0) into v_max_proj_id
  from jsonb_array_elements(v_projetos_novo) elem;

  foreach v_abs_id in array p_absorvidos loop
    select * into v_abs from clientes where id = v_abs_id;

    if v_abs.excluido_em is not null then
      raise notice 'Nota (%): absorvido % já estava soft-deletado desde % (exclusão manual anterior ao Grupo B.2) — dados preservados no canônico, chave_dedup limpa, data de exclusão original mantida.', p_operacao_id, v_abs_id, v_abs.excluido_em;
    end if;

    if p_modo = 'A' then
      -- 5a. merge de hist (concatenação, nunca sobrescrita)
      v_hist_novo := v_hist_novo || coalesce(v_abs.hist, '[]'::jsonb);
      v_hist_len_esperado := v_hist_len_esperado + jsonb_array_length(coalesce(v_abs.hist, '[]'::jsonb));

      -- 5b. merge de projetos com renumeração determinística de id
      v_projetos_len_esperado := v_projetos_len_esperado + jsonb_array_length(coalesce(v_abs.projetos, '[]'::jsonb));

      if jsonb_array_length(coalesce(v_abs.projetos, '[]'::jsonb)) > 0 then

        -- checagem defensiva: existe financeiro/agenda.projeto_id apontando
        -- para um id deste array, dentro do escopo deste cliente absorvido?
        -- (ver Complementação da Auditoria, item 5 — referência externa real,
        -- mas não observada em nenhum dos 5 grupos desta execução)
        if exists (
          select 1 from financeiro where cliente_id = v_abs_id and projeto_id is not null
          union all
          select 1 from agenda where cliente_id = v_abs_id and projeto_id is not null
        ) then
          raise exception 'Falha sistêmica (%): % tem financeiro/agenda.projeto_id preenchido — renumeração exigiria repontamento adicional não coberto por este script', p_operacao_id, v_abs_id;
        end if;

        -- row_number() precisa ser calculado numa subconsulta antes de
        -- entrar no jsonb_agg — Postgres não aceita chamada de window
        -- function diretamente dentro de uma aggregate function.
        select jsonb_agg(jsonb_set(elem, '{id}', to_jsonb(v_max_proj_id + rn)) order by ord)
        into v_novos_projetos
        from (
          select elem, ord, row_number() over (order by ord) as rn
          from jsonb_array_elements(v_abs.projetos) with ordinality as t(elem, ord)
        ) t_novos;

        select jsonb_agg(jsonb_build_object('id_original', elem->>'id', 'id_novo', v_max_proj_id + rn) order by ord)
        into v_mapa_projetos
        from (
          select elem, ord, row_number() over (order by ord) as rn
          from jsonb_array_elements(v_abs.projetos) with ordinality as t(elem, ord)
        ) t_mapa;

        insert into clientes_fusao_b2_snapshot(operacao_id, versao_script, tipo_registro, chave_dedup, cliente_id, dados_json)
        values (p_operacao_id, 'b2-v1', 'mapa_projeto_id', v_abs.chave_dedup, v_abs_id,
                jsonb_build_object('absorvido', v_abs_id, 'canonico', p_canonico, 'mapa', v_mapa_projetos));

        v_max_proj_id := v_max_proj_id + jsonb_array_length(v_abs.projetos);
        v_projetos_novo := v_projetos_novo || coalesce(v_novos_projetos, '[]'::jsonb);
      end if;
    end if;

    -- 6. repontamento de eventos_trafego, só para os absorvidos indicados.
    -- Validado por GET DIAGNOSTICS, não só pela ausência posterior do id
    -- antigo — confirma que o NÚMERO de linhas tocadas bate exatamente com
    -- o número de linhas capturadas no snapshot, não apenas que "não sobrou
    -- nada", o que também passaria silenciosamente se 0 linhas existissem.
    if v_abs_id = any(p_repoint_eventos_trafego) then
      insert into clientes_fusao_b2_snapshot(operacao_id, versao_script, tipo_registro, cliente_id, tabela_afetada, registro_afetado_id, coluna_afetada, valor_antigo, valor_novo)
      select p_operacao_id, 'b2-v1', 'fk_repontada', v_abs_id, 'eventos_trafego', id::text, 'cliente_id', to_jsonb(v_abs_id), to_jsonb(p_canonico)
      from eventos_trafego where cliente_id = v_abs_id;
      get diagnostics v_qtd_et_snapshot = row_count;

      update eventos_trafego set cliente_id = p_canonico where cliente_id = v_abs_id;
      get diagnostics v_qtd_et_atualizados = row_count;

      if v_qtd_et_atualizados <> v_qtd_et_snapshot then
        raise exception 'Falha sistêmica (%): repontamento de eventos_trafego de % atualizou % linha(s), esperado % (snapshot)', p_operacao_id, v_abs_id, v_qtd_et_atualizados, v_qtd_et_snapshot;
      end if;

      select count(*) into v_qtd_et_depois from eventos_trafego where cliente_id = v_abs_id;
      if v_qtd_et_depois <> 0 then
        raise exception 'Falha sistêmica (%): repontamento de eventos_trafego de % não zerou (restam %)', p_operacao_id, v_abs_id, v_qtd_et_depois;
      end if;
    end if;
  end loop;

  -- 7. entrada sintética de auditoria da fusão, visível na ficha do cliente
  v_hist_novo := v_hist_novo || jsonb_build_array(jsonb_build_object(
    't', 'Fusão de duplicidade (Grupo B.2) — registro(s) absorvido(s): ' || array_to_string(p_absorvidos, ', '),
    'd', to_char(now(), 'DD/MM/YYYY, HH24:MI:SS')
  ));
  v_hist_len_esperado := v_hist_len_esperado + 1;

  update clientes
  set hist = v_hist_novo,
      projetos = case when p_modo = 'A' then v_projetos_novo else projetos end
  where id = p_canonico;
  -- Sem GET DIAGNOSTICS aqui de propósito: id = p_canonico é comparação por
  -- chave primária, e a existência do canônico já foi confirmada no passo 2
  -- sob o mesmo lock adquirido no passo 1 e nunca liberado até aqui — não há
  -- como esta linha deixar de existir ou se multiplicar dentro desta mesma
  -- transação. Adicionar a checagem aqui testaria uma invariante que o
  -- próprio Postgres já garante estruturalmente (chave primária + lock),
  -- não uma incerteza real.

  -- 8. validação integral (contagem exata, não amostragem)
  if (select jsonb_array_length(hist) from clientes where id = p_canonico) <> v_hist_len_esperado then
    raise exception 'Falha sistêmica (%): contagem de hist do canônico % não bate (esperado %)', p_operacao_id, p_canonico, v_hist_len_esperado;
  end if;

  if p_modo = 'A' then
    if (select jsonb_array_length(projetos) from clientes where id = p_canonico) <> v_projetos_len_esperado then
      raise exception 'Falha sistêmica (%): contagem de projetos do canônico % não bate (esperado % = canônico original + absorvidos)', p_operacao_id, p_canonico, v_projetos_len_esperado;
    end if;

    select count(*) into v_dup_id_count from (
      select elem->>'id' as pid, count(*) from clientes, jsonb_array_elements(projetos) elem
      where id = p_canonico group by pid having count(*) > 1
    ) dup;
    if v_dup_id_count > 0 then
      raise exception 'Falha sistêmica (%): id duplicado em projetos após merge no canônico %', p_operacao_id, p_canonico;
    end if;
  end if;

  -- 9. soft-delete + limpeza de chave_dedup nos absorvidos (nunca hard-delete).
  -- coalesce(excluido_em, now()): se já estava soft-deletado antes do Grupo
  -- B.2, preserva a data ORIGINAL da exclusão em vez de sobrescrevê-la.
  -- Validado por GET DIAGNOSTICS: confirma que o número de linhas
  -- efetivamente alteradas bate exatamente com o tamanho do array recebido —
  -- não presume que "rodou sem erro" implica "todas as linhas esperadas
  -- foram tocadas".
  update clientes set excluido_em = coalesce(excluido_em, now()), chave_dedup = null where id = any(p_absorvidos);
  get diagnostics v_qtd_softdeletados = row_count;
  if v_qtd_softdeletados <> array_length(p_absorvidos, 1) then
    raise exception 'Falha sistêmica (%): soft-delete atualizou % linha(s), esperado % (tamanho do array de absorvidos)', p_operacao_id, v_qtd_softdeletados, array_length(p_absorvidos, 1);
  end if;

  raise notice 'OK — grupo % (modo %): canônico %, % absorvido(s) fundido(s), % linha(s) de eventos_trafego repontada(s)', p_operacao_id, p_modo, p_canonico, array_length(p_absorvidos, 1), coalesce(array_length(p_repoint_eventos_trafego, 1), 0);
end;
$$;

-- ── PASSO 1 — Pré-voo (somente leitura) ─────────────────────────────────────
select user_id, chave_dedup, count(*) as ocorrencias, array_agg(id) as ids
from clientes
where user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763'
  and chave_dedup in (
    '27988387189|sâmela', '27996929665|testando', '27996929665|teste',
    '27999760980|thamiris', '73998176166|maria'
  )
group by user_id, chave_dedup
order by chave_dedup;
-- Esperado: sâmela=2, testando=2, teste=10, thamiris=2, maria=2.

-- ⚠ Execute cada select abaixo SOZINHO — Passos 2 a 6, um de cada vez ⚠

-- ── PASSO 2 — Grupo Sâmela (Modo A) — rodar sozinho, como canário ──────────
select _fundir_grupo_b2(
  'grupoB2_2026-08-05',
  'ab21baea-7506-48b6-b21b-66d9a652efaa'::uuid,
  array['94863259-02d7-440e-a0ac-7e202edcf858']::uuid[],
  'A'
);

-- ⚠ Aguarde o "OK" do Passo 2 antes de seguir. Execute o Passo 3 sozinho. ⚠

-- ── PASSO 3 — Grupo Testando (Modo B) ───────────────────────────────────────
select _fundir_grupo_b2(
  'grupoB2_2026-08-05',
  '2f179fe2-2b67-4e6e-b3d3-38f8cf27ae8b'::uuid,
  array['5d6d2210-11f2-4fd7-834d-5a6c68f87302']::uuid[],
  'B'
);

-- ⚠ Aguarde o "OK" do Passo 3 antes de seguir. Execute o Passo 4 sozinho. ⚠

-- ── PASSO 4 — Grupo Teste (Modo B, com repontamento de eventos_trafego) ────
select _fundir_grupo_b2(
  'grupoB2_2026-08-05',
  '0d94ab10-add5-441d-8252-06708522aedc'::uuid,
  array[
    '7aaa68ea-a099-44bd-a51a-2da94d747796',
    'f163bcf1-0ea4-4af8-9016-9a3b958fa6d4',
    '3f4cd7e9-f963-4589-8162-ba82652a2702',
    '05e94307-172e-4908-bb8e-421d7cda7557',
    'ea6d68cb-0940-4e99-93a4-a48d72848032',
    '3728ab48-f96a-4b0e-bfaf-fc44cc49f5f6',
    '4d738886-94ea-4a10-b5b2-c8117de4b084',
    'cc034bb8-fd11-4a4d-9fd8-ef1ec88dfa2e',
    '5cebccdc-095a-4ddf-8880-5a895ba0eaac'
  ]::uuid[],
  'B',
  array[
    'f163bcf1-0ea4-4af8-9016-9a3b958fa6d4',
    '3f4cd7e9-f963-4589-8162-ba82652a2702',
    '05e94307-172e-4908-bb8e-421d7cda7557',
    'ea6d68cb-0940-4e99-93a4-a48d72848032',
    '3728ab48-f96a-4b0e-bfaf-fc44cc49f5f6',
    '4d738886-94ea-4a10-b5b2-c8117de4b084',
    'cc034bb8-fd11-4a4d-9fd8-ef1ec88dfa2e',
    '5cebccdc-095a-4ddf-8880-5a895ba0eaac'
  ]::uuid[]
);
-- Nota: 35efb162-920c-4ca2-8520-64d11f0aad6a NÃO participa — pertence a
-- outro tenant (user_id = ad278eb4…), removido do escopo.

-- ⚠ Aguarde o "OK" do Passo 4 antes de seguir. Execute o Passo 5 sozinho. ⚠

-- ── PASSO 5 — Grupo Thamiris (Modo A) ───────────────────────────────────────
select _fundir_grupo_b2(
  'grupoB2_2026-08-05',
  '3bc81e7d-06a9-4ad0-a694-c9096c0b581a'::uuid,
  array['1e0ef5db-ac1a-410e-95ad-c11ee5937a24']::uuid[],
  'A'
);

-- ⚠ Aguarde o "OK" do Passo 5 antes de seguir. Execute o Passo 6 sozinho. ⚠

-- ── PASSO 6 — Grupo Maria (Modo A) ──────────────────────────────────────────
select _fundir_grupo_b2(
  'grupoB2_2026-08-05',
  '7030dbad-1bf2-46ae-a6af-aeb39e820471'::uuid,
  array['ea563178-fee3-4cbb-ba7c-10141535f449']::uuid[],
  'A'
);

-- ── PASSO 7 — Validação final (somente leitura) ─────────────────────────────
select user_id, chave_dedup, count(*) as ocorrencias
from clientes
where user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763'
  and chave_dedup is not null
group by user_id, chave_dedup
having count(*) > 1;
-- Esperado: 0 linhas.

select chave_dedup, count(*) as ativos
from clientes
where user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763'
  and excluido_em is null
  and chave_dedup in (
    '27988387189|sâmela', '27996929665|testando', '27996929665|teste',
    '27999760980|thamiris', '73998176166|maria'
  )
group by chave_dedup;
-- Esperado: 1 linha por chave_dedup, contagem = 1 em todas.

select count(*) as orfaos_eventos_trafego
from eventos_trafego
where cliente_id in (
  '7aaa68ea-a099-44bd-a51a-2da94d747796','f163bcf1-0ea4-4af8-9016-9a3b958fa6d4',
  '3f4cd7e9-f963-4589-8162-ba82652a2702','05e94307-172e-4908-bb8e-421d7cda7557',
  'ea6d68cb-0940-4e99-93a4-a48d72848032','3728ab48-f96a-4b0e-bfaf-fc44cc49f5f6',
  '4d738886-94ea-4a10-b5b2-c8117de4b084','cc034bb8-fd11-4a4d-9fd8-ef1ec88dfa2e',
  '5cebccdc-095a-4ddf-8880-5a895ba0eaac'
);
-- Esperado: 0.

-- Auditoria de quem/quando executou (após rodar os passos 2-6):
select operacao_id, executado_por, tipo_registro, chave_dedup, criado_em
from clientes_fusao_b2_snapshot
order by criado_em;
