-- Limpeza de tenant órfão de demonstração antiga
-- Ver: Auditoria de leitura pré-migration do Bloco de Unificação de Clientes
-- Interessados (2026-08-15) e
-- sql/2026-08-14_pipeline_unificar_clientes_interessados.sql.
--
-- CONTEXTO: durante a auditoria de leitura que antecede a execução da
-- migration principal (2026-08-14_pipeline_unificar_clientes_interessados.sql),
-- foi encontrado o user_id 72c51303-842b-4656-86a3-29d9fd52ad62 com clientes em
-- lead_morno mas SEM nenhuma linha própria em pipeline_etapas -- isso faria a
-- migration principal abortar (proteção do Passo 2a daquele script: "tenant
-- afetado precisa ter sua própria etapa lead"). Inventário confirmado por
-- leitura manual no Supabase para esse user_id: 7 clientes fictícios (Bruno
-- Kern, Hugo Martins, Marina Alves, Priscila Gomes, Renan Costa, Talita
-- Nunes, Yasmin Duarte -- os mesmos nomes hardcoded no fixture de demo em
-- api/config.js), 2 artistas fictícios, 1 configuração, e ZERO linhas em
-- todas as outras tabelas com user_id (agenda, financeiro, historico,
-- licencas, pipeline_etapas etc.), além de ausência em auth.users e
-- ink_clientes.
--
-- CONCLUSÃO DA AUDITORIA (não é só a coincidência de nomes -- ver corpo do
-- relatório da tarefa que acompanha este arquivo): a ausência de auth.users
-- (ninguém pode autenticar como esse user_id), a ausência de ink_clientes
-- (nunca foi um estúdio comercialmente provisionado), a ausência de licencas
-- (o fluxo de demo atual, em api/config.js, SEMPRE garante uma linha de
-- licencas a cada carregamento de ?demo=1 -- a ausência prova que este
-- user_id não é a conta de demo atualmente ativa) e a ausência total de
-- atividade operacional (zero agenda/financeiro/historico apesar de "ter"
-- clientes) são, em conjunto, evidência de um resíduo de demonstração
-- antiga e abandonada -- não um tenant real, não a conta de demo em uso, e
-- claramente não o Laboratório P&D.
--
-- ESTE ARQUIVO É MANUAL. Não é executado por deploy, build, Vercel, cron,
-- hook ou qualquer caminho da aplicação -- só roda se alguém copiar o
-- conteúdo e colar manualmente no SQL Editor do Supabase, depois de revisar
-- e aprovar. É um arquivo SEPARADO da migration principal
-- (2026-08-14_pipeline_unificar_clientes_interessados.sql) -- nenhum dos
-- dois scripts chama o outro.
--
-- ── PROTEÇÃO DO LABORATÓRIO P&D ────────────────────────────────────────────
-- A conta real do Laboratório P&D (2d366d35-1cae-40d5-ba92-06fe2ab8a763) é
-- protegida por dois mecanismos independentes: (1) o UUID alvo é um literal
-- fixo, nunca uma variável recebida de fora ou resolvida por nome/e-mail --
-- não há como uma chamada externa "confundir" o alvo; (2) uma checagem
-- explícita compara o UUID alvo com o UUID do Laboratório logo no início do
-- bloco e aborta imediatamente se forem iguais (defesa redundante contra
-- edição futura incorreta deste arquivo).
--
-- ── DESCOBERTA DINÂMICA (não uma lista fixa de tabelas) ───────────────────
-- Em vez de confiar numa lista de tabelas escrita à mão (que poderia ficar
-- desatualizada se uma tabela nova com user_id for criada depois), o Passo 2
-- consulta information_schema.columns em tempo de execução pra achar TODA
-- tabela do schema public com uma coluna user_id, soma quantas linhas cada
-- uma tem para o UUID alvo, e compara com o inventário esperado -- qualquer
-- tabela nova, prevista ou não, entra automaticamente nessa checagem.
--
-- ── CHAVES ESTRANGEIRAS E CASCATA ──────────────────────────────────────────
-- O Passo 5 descobre dinamicamente (information_schema) toda constraint de
-- chave estrangeira que referencia clientes, artistas ou configuracoes a
-- partir de QUALQUER outra tabela, e confere se alguma linha de fora aponta
-- para os 10 registros que serão apagados -- aborta se encontrar. A ordem de
-- exclusão (Passo 6) é clientes -> artistas -> configuracoes: clientes é
-- apagado primeiro por poder referenciar artistas (coluna "artista"); não é
-- assumido nenhum ON DELETE CASCADE -- o script não depende de cascata
-- alguma, apaga cada tabela explicitamente, na ordem segura.
--
-- ── TRANSACIONALIDADE ──────────────────────────────────────────────────────
-- Todo o script roda dentro de um único bloco (do $$ ... $$). Qualquer
-- RAISE EXCEPTION aborta e desfaz TUDO que o bloco já tiver feito até aquele
-- ponto -- não existe exclusão parcial possível.
--
-- ── IDEMPOTÊNCIA ────────────────────────────────────────────────────────────
-- Primeira execução: encontra exatamente 7/2/1 e limpa. Segunda execução (ou
-- qualquer execução seguinte, depois de uma limpeza bem-sucedida): encontra
-- 0 em toda tabela com user_id para este UUID -- imprime aviso de "nada a
-- fazer" e retorna sem tentar apagar nada. Qualquer estado INTERMEDIÁRIO
-- (nem 7/2/1 completo, nem tudo zerado -- ex.: alguém já apagou só os
-- artistas manualmente) é tratado como divergência e ABORTA, por segurança
-- -- este script nunca tenta "completar" uma limpeza parcial feita por outro
-- processo.
--
-- ── SEM ESTRATÉGIA DE REVERSÃO PÓS-SUCESSO ────────────────────────────────
-- Assim como a migration principal, isto é um DELETE definitivo. O rollback
-- automático só existe DURANTE uma execução que falha (mesma transação). Não
-- existe (e não é criado aqui) um mecanismo de restaurar os 10 registros
-- depois de uma execução bem-sucedida -- são dados fictícios de demonstração
-- abandonada, não dados de cliente real, por isso essa ausência de reversão
-- pós-sucesso foi considerada aceitável nesta auditoria.

do $limpeza_demo_orfao$
declare
  uuid_alvo constant uuid := '72c51303-842b-4656-86a3-29d9fd52ad62';
  uuid_laboratorio constant uuid := '2d366d35-1cae-40d5-ba92-06fe2ab8a763';

  nomes_esperados constant text[] := array[
    'Bruno Kern', 'Hugo Martins', 'Marina Alves', 'Priscila Gomes',
    'Renan Costa', 'Talita Nunes', 'Yasmin Duarte'
  ];

  qtd_auth_users int;
  qtd_ink_clientes int;

  tabela record;
  qtd_na_tabela int;
  total_geral int := 0;
  ja_limpo boolean := true;
  linha_relatorio text;

  qtd_clientes int;
  qtd_artistas int;
  qtd_configuracoes int;

  qtd_nomes_inesperados int;
  qtd_nomes_faltando int;

  fk record;
  qtd_dependentes int;

  ids_clientes uuid[];
  ids_artistas uuid[];

  qtd_removida int;
  qtd_residual_pos int;
begin

  -- ── PASSO 0 — Trava de identidade do alvo ─────────────────────────────────
  if uuid_alvo = uuid_laboratorio then
    raise exception 'Abortando ANTES de qualquer leitura: uuid_alvo não pode ser igual ao Laboratório P&D. Este arquivo nunca deve ser editado para apontar pro Laboratório.';
  end if;
  if uuid_alvo is null or uuid_alvo <> '72c51303-842b-4656-86a3-29d9fd52ad62'::uuid then
    raise exception 'Abortando: uuid_alvo não confere com o UUID órfão esperado (72c51303-842b-4656-86a3-29d9fd52ad62).';
  end if;

  raise notice '── LIMPEZA DE TENANT ÓRFÃO: % ──', uuid_alvo;

  -- ── PASSO 1 — auth.users e ink_clientes (linkagem por auth_user_id) ───────
  select count(*) into qtd_auth_users from auth.users where id = uuid_alvo;
  select count(*) into qtd_ink_clientes from public.ink_clientes where auth_user_id = uuid_alvo;

  if qtd_auth_users > 0 then
    raise exception 'Abortando: encontrado(s) % registro(s) em auth.users para este UUID -- isto NÃO é um tenant órfão sem autenticação, como a auditoria concluiu. Não prosseguir.', qtd_auth_users;
  end if;
  if qtd_ink_clientes > 0 then
    raise exception 'Abortando: encontrado(s) % registro(s) em ink_clientes (auth_user_id) para este UUID -- isto é um estúdio comercialmente provisionado, não um resíduo isolado. Não prosseguir.', qtd_ink_clientes;
  end if;

  raise notice 'auth.users: 0 (confirmado). ink_clientes: 0 (confirmado).';

  -- ── PASSO 2 — Descoberta dinâmica de TODA tabela public com coluna user_id ─
  raise notice '── INVENTÁRIO POR TABELA (user_id = %) ──', uuid_alvo;
  for tabela in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
    order by c.table_name
  loop
    execute format('select count(*) from public.%I where user_id = $1', tabela.table_name)
      into qtd_na_tabela using uuid_alvo;

    linha_relatorio := format('  %s: %s', tabela.table_name, qtd_na_tabela);
    raise notice '%', linha_relatorio;

    total_geral := total_geral + qtd_na_tabela;
    if qtd_na_tabela > 0 then ja_limpo := false; end if;

    if tabela.table_name = 'clientes' then
      qtd_clientes := qtd_na_tabela;
    elsif tabela.table_name = 'artistas' then
      qtd_artistas := qtd_na_tabela;
    elsif tabela.table_name = 'configuracoes' then
      qtd_configuracoes := qtd_na_tabela;
    elsif qtd_na_tabela > 0 then
      -- Qualquer tabela além de clientes/artistas/configuracoes com QUALQUER
      -- linha pra este UUID é inventário não previsto -- aborta.
      raise exception 'Abortando: tabela "%" (não prevista no inventário) tem % linha(s) para o UUID órfão. A auditoria previa exatamente 0 aqui -- revise antes de prosseguir.', tabela.table_name, qtd_na_tabela;
    end if;
  end loop;

  qtd_clientes := coalesce(qtd_clientes, 0);
  qtd_artistas := coalesce(qtd_artistas, 0);
  qtd_configuracoes := coalesce(qtd_configuracoes, 0);

  -- ── PASSO 3 — Idempotência: já foi limpo antes? ────────────────────────────
  if ja_limpo then
    raise notice 'Nenhuma linha encontrada em nenhuma tabela com user_id para este UUID -- já foi limpo (ou nunca existiu). Nada a fazer. Encerrando sem alterações.';
    return;
  end if;

  -- ── PASSO 4 — Confere as quantidades exatas conhecidas ────────────────────
  if qtd_clientes <> 7 then
    raise exception 'Abortando: esperava exatamente 7 clientes, encontrado %. Divergência de quantidade -- não prosseguir sem revisão manual.', qtd_clientes;
  end if;
  if qtd_artistas <> 2 then
    raise exception 'Abortando: esperava exatamente 2 artistas, encontrado %. Divergência de quantidade -- não prosseguir sem revisão manual.', qtd_artistas;
  end if;
  if qtd_configuracoes <> 1 then
    raise exception 'Abortando: esperava exatamente 1 configuração, encontrado %. Divergência de quantidade -- não prosseguir sem revisão manual.', qtd_configuracoes;
  end if;

  -- ── PASSO 5 — Identidade: nomes dos 7 clientes batem com o conjunto conhecido ──
  select count(*) into qtd_nomes_inesperados
  from (
    select nome from public.clientes where user_id = uuid_alvo
    except
    select unnest(nomes_esperados)
  ) t;
  select count(*) into qtd_nomes_faltando
  from (
    select unnest(nomes_esperados)
    except
    select nome from public.clientes where user_id = uuid_alvo
  ) t;

  if qtd_nomes_inesperados > 0 then
    raise exception 'Abortando: encontrado(s) % cliente(s) com nome fora do conjunto conhecido de 7 nomes de demo -- pode não ser o resíduo esperado.', qtd_nomes_inesperados;
  end if;
  if qtd_nomes_faltando > 0 then
    raise exception 'Abortando: % dos 7 nomes conhecidos NÃO foram encontrados entre os clientes deste UUID -- inventário não bate.', qtd_nomes_faltando;
  end if;

  -- Relatório de identidade -- lista id+nome de cada cliente e artista, e a
  -- configuração, ANTES de apagar qualquer coisa (auditoria por IDs, não só
  -- por quantidade -- item explicitamente pedido).
  raise notice '── IDENTIDADE (antes da exclusão) ──';
  for tabela in select id, nome from public.clientes where user_id = uuid_alvo order by nome loop
    raise notice '  cliente id=% nome=%', tabela.id, tabela.nome;
  end loop;
  for tabela in select id, nome from public.artistas where user_id = uuid_alvo order by nome loop
    raise notice '  artista id=% nome=%', tabela.id, tabela.nome;
  end loop;
  for tabela in select id, studio_name from public.configuracoes where user_id = uuid_alvo loop
    raise notice '  configuracao id=% studio_name=%', tabela.id, tabela.studio_name;
  end loop;

  select array_agg(id) into ids_clientes from public.clientes where user_id = uuid_alvo;
  select array_agg(id) into ids_artistas from public.artistas where user_id = uuid_alvo;

  -- ── PASSO 6 — Chaves estrangeiras: alguma outra tabela referencia estes IDs? ──
  -- Descoberta dinâmica de toda FK que aponta pra clientes/artistas/configuracoes
  -- a partir de QUALQUER outra tabela do schema public.
  for fk in
    select
      tc.table_name as tabela_origem,
      kcu.column_name as coluna_origem,
      ccu.table_name as tabela_destino
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name in ('clientes', 'artistas', 'configuracoes')
      and tc.table_name not in ('clientes', 'artistas', 'configuracoes')
  loop
    if fk.tabela_destino = 'clientes' and ids_clientes is not null then
      execute format('select count(*) from public.%I where %I = any($1)', fk.tabela_origem, fk.coluna_origem)
        into qtd_dependentes using ids_clientes;
    elsif fk.tabela_destino = 'artistas' and ids_artistas is not null then
      execute format('select count(*) from public.%I where %I = any($1)', fk.tabela_origem, fk.coluna_origem)
        into qtd_dependentes using ids_artistas;
    else
      qtd_dependentes := 0;
    end if;

    if qtd_dependentes > 0 then
      raise exception 'Abortando: tabela "%" tem % linha(s) referenciando "%" (via coluna "%") de um dos registros a apagar -- exclusão cancelada, dependência não prevista.', fk.tabela_origem, qtd_dependentes, fk.tabela_destino, fk.coluna_origem;
    end if;

    raise notice '  FK verificada: %.% -> % (0 dependentes)', fk.tabela_origem, fk.coluna_origem, fk.tabela_destino;
  end loop;

  -- ── PASSO 7 — Exclusão, na ordem clientes -> artistas -> configuracoes ────
  delete from public.clientes where user_id = uuid_alvo;
  get diagnostics qtd_removida = row_count;
  if qtd_removida <> 7 then
    raise exception 'Abortando e desfazendo tudo: DELETE em clientes removeu % linha(s), esperava exatamente 7.', qtd_removida;
  end if;
  raise notice 'clientes removidos: %', qtd_removida;

  delete from public.artistas where user_id = uuid_alvo;
  get diagnostics qtd_removida = row_count;
  if qtd_removida <> 2 then
    raise exception 'Abortando e desfazendo tudo: DELETE em artistas removeu % linha(s), esperava exatamente 2.', qtd_removida;
  end if;
  raise notice 'artistas removidos: %', qtd_removida;

  delete from public.configuracoes where user_id = uuid_alvo;
  get diagnostics qtd_removida = row_count;
  if qtd_removida <> 1 then
    raise exception 'Abortando e desfazendo tudo: DELETE em configuracoes removeu % linha(s), esperava exatamente 1.', qtd_removida;
  end if;
  raise notice 'configuracoes removidas: %', qtd_removida;

  -- ── PASSO 8 — Pós-condição global: 0 em TODA tabela com user_id ───────────
  qtd_residual_pos := 0;
  for tabela in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'user_id'
    order by c.table_name
  loop
    execute format('select count(*) from public.%I where user_id = $1', tabela.table_name)
      into qtd_na_tabela using uuid_alvo;
    qtd_residual_pos := qtd_residual_pos + qtd_na_tabela;
  end loop;

  if qtd_residual_pos > 0 then
    raise exception 'Abortando e desfazendo tudo: pós-condição falhou -- ainda restam % linha(s) somando todas as tabelas com user_id para este UUID.', qtd_residual_pos;
  end if;

  raise notice '── RESULTADO FINAL ──';
  raise notice 'clientes removidos: 7, artistas removidos: 2, configuracoes removidas: 1.';
  raise notice 'Pós-condição confirmada: 0 linhas restantes em qualquer tabela com user_id para %.', uuid_alvo;
  raise notice 'Laboratório P&D (%) não foi tocado -- fora do escopo deste script.', uuid_laboratorio;
  raise notice 'Limpeza do tenant órfão concluída com sucesso.';

end $limpeza_demo_orfao$;

-- ── VERIFICAÇÃO PÓS-EXECUÇÃO (rodar depois, separadamente) ───────────────────
-- Deve retornar 0 linhas.
-- select 'clientes' as tabela, count(*) from clientes where user_id = '72c51303-842b-4656-86a3-29d9fd52ad62'
-- union all select 'artistas', count(*) from artistas where user_id = '72c51303-842b-4656-86a3-29d9fd52ad62'
-- union all select 'configuracoes', count(*) from configuracoes where user_id = '72c51303-842b-4656-86a3-29d9fd52ad62';
--
-- Confirma que o Laboratório continua intacto (deve retornar linhas normalmente).
-- select count(*) from clientes where user_id = '2d366d35-1cae-40d5-ba92-06fe2ab8a763';
