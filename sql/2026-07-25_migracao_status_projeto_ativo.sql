-- Migração única e determinística — Padronização do Estado Operacional do Projeto
-- Ver: Auditoria de Padronização do Estado Operacional do Projeto (25/07/2026)
--
-- Objetivo: "ativo" passa a ser o único valor válido de projeto.status para
-- representar "ainda não encerrado". A grafia legada "andamento" (usada só pela
-- fábrica de projeto mais antiga, o cadastro manual de cliente novo) deixa de
-- existir em qualquer registro do banco.
--
-- Este script é destinado a ser executado UMA ÚNICA VEZ, manualmente, no SQL
-- Editor do Supabase. Depois de rodado, nenhum código do sistema precisa (nem
-- deve) tratar "andamento" como um valor possível — é assumido definitivamente
-- extinto.
--
-- projetos é uma coluna JSONB (array de objetos) por cliente — a migração
-- reconstrói o array de cada cliente afetado, trocando só a chave "status" dos
-- itens com valor "andamento", preservando a ordem e todos os demais campos de
-- cada projeto (inclusive projetos não afetados) inalterados.

-- ── PASSO 1 — Relatório PRÉVIO ──────────────────────────────────────────────
-- Quantos projetos serão afetados, e em quantos clientes distintos.
select
  count(*) as projetos_a_migrar,
  count(distinct c.id) as clientes_afetados
from clientes c
cross join lateral jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as elem
where elem->>'status' = 'andamento';

-- ── PASSO 2 — Migração ──────────────────────────────────────────────────────
-- Reescreve projetos apenas dos clientes que têm ao menos um item "andamento".
with corrigidos as (
  select
    c.id,
    jsonb_agg(
      case when t.elem->>'status' = 'andamento'
        then jsonb_set(t.elem, '{status}', '"ativo"'::jsonb)
        else t.elem
      end
      order by t.ord
    ) as novos_projetos
  from clientes c
  cross join lateral jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) with ordinality as t(elem, ord)
  where exists (
    select 1
    from jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as e2
    where e2->>'status' = 'andamento'
  )
  group by c.id
)
update clientes
set projetos = corrigidos.novos_projetos
from corrigidos
where clientes.id = corrigidos.id;

-- ── PASSO 3 — Relatório FINAL ────────────────────────────────────────────────
-- Deve retornar 0. Se retornar qualquer valor maior, NÃO considere a migração
-- concluída — investigue antes de assumir que "andamento" foi extinto.
select count(*) as projetos_restantes_andamento
from clientes c
cross join lateral jsonb_array_elements(coalesce(c.projetos, '[]'::jsonb)) as elem
where elem->>'status' = 'andamento';
