-- Correção de rastreabilidade — Grupo B.2
-- Backfill de chave_dedup nos registros mapa_projeto_id já gravados em
-- clientes_fusao_b2_snapshot (operacao_id = 'grupoB2_2026-08-05').
--
-- ⚠ PARA REVISÃO. NÃO EXECUTAR SEM APROVAÇÃO EXPLÍCITA. ⚠
--
-- Causa: o INSERT de tipo_registro='mapa_projeto_id' na função
-- _fundir_grupo_b2() nunca preenchia a coluna chave_dedup (já corrigido na
-- função — ver 2026-08-05_grupoB2_fusao_duplicidades.sql). Este script
-- corrige apenas os registros já gravados pelas execuções do canário
-- (Sâmela) e do Grupo Thamiris, feitas antes da correção.
--
-- Fonte escolhida para recuperar chave_dedup: o próprio snapshot
-- absorvido_pre_softdelete (mesma operacao_id, mesmo cliente_id), NÃO a
-- tabela clientes. Motivo: para absorvidos já fundidos (Sâmela, Thamiris),
-- clientes.chave_dedup já foi zerada pela própria fusão — não existe mais
-- lá. O snapshot absorvido_pre_softdelete captura o estado ANTES dessa
-- zeragem, e é uma tabela permanente — é a única fonte confiável e
-- persistente para este backfill, funcionando igual independente de o
-- absorvido já ter sido fundido ou não.
--
-- Escopo estritamente restrito: operacao_id = 'grupoB2_2026-08-05' e
-- tipo_registro = 'mapa_projeto_id' — nenhum outro tipo de registro do
-- snapshot é tocado.

-- ── PASSO 1 — Leitura, antes da correção ────────────────────────────────────
select id, cliente_id, chave_dedup
from clientes_fusao_b2_snapshot
where operacao_id = 'grupoB2_2026-08-05'
  and tipo_registro = 'mapa_projeto_id'
  and chave_dedup is null;

-- Contagem por tipo, para confirmar depois que só mapa_projeto_id mudou
-- (o número de linhas por tipo deve ser idêntico antes e depois — só o
-- conteúdo da coluna chave_dedup muda, nenhuma linha é criada ou removida):
select tipo_registro, count(*) as total
from clientes_fusao_b2_snapshot
where operacao_id = 'grupoB2_2026-08-05'
group by tipo_registro
order by tipo_registro;

-- ── PASSO 2 — Correção, restrita e validada por ROW_COUNT ──────────────────
do $$
declare
  v_esperados int;
  v_atualizados int;
begin
  select count(*) into v_esperados
  from clientes_fusao_b2_snapshot
  where operacao_id = 'grupoB2_2026-08-05'
    and tipo_registro = 'mapa_projeto_id'
    and chave_dedup is null;

  if v_esperados = 0 then
    raise notice 'Nada a corrigir — nenhum registro mapa_projeto_id com chave_dedup nula para esta operação.';
    return;
  end if;

  update clientes_fusao_b2_snapshot as alvo
  set chave_dedup = fonte.dados_json->>'chave_dedup'
  from clientes_fusao_b2_snapshot as fonte
  where alvo.operacao_id = 'grupoB2_2026-08-05'
    and alvo.tipo_registro = 'mapa_projeto_id'
    and alvo.chave_dedup is null
    and fonte.operacao_id = alvo.operacao_id
    and fonte.tipo_registro = 'absorvido_pre_softdelete'
    and fonte.cliente_id = alvo.cliente_id;

  get diagnostics v_atualizados = row_count;

  if v_atualizados <> v_esperados then
    raise exception 'Correção incompleta: % linha(s) esperada(s), % atualizada(s) — investigar antes de prosseguir (possível ausência do snapshot absorvido_pre_softdelete correspondente)', v_esperados, v_atualizados;
  end if;

  raise notice 'OK — % registro(s) de mapa_projeto_id corrigido(s) com chave_dedup recuperada do snapshot absorvido_pre_softdelete.', v_atualizados;
end;
$$;

-- ── PASSO 3 — Leitura, depois da correção ───────────────────────────────────
select id, cliente_id, chave_dedup
from clientes_fusao_b2_snapshot
where operacao_id = 'grupoB2_2026-08-05'
  and tipo_registro = 'mapa_projeto_id';
-- Esperado: chave_dedup preenchida em todas as linhas
-- ('27988387189|sâmela' e '27999760980|thamiris').

-- Confirmação de que nenhum outro tipo foi alterado — deve bater exatamente
-- com a contagem do Passo 1:
select tipo_registro, count(*) as total
from clientes_fusao_b2_snapshot
where operacao_id = 'grupoB2_2026-08-05'
group by tipo_registro
order by tipo_registro;
