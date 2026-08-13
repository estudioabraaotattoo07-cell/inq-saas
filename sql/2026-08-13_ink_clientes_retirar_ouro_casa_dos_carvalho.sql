-- ⚠ SCRIPT MANUAL — NÃO EXECUTAR AUTOMATICAMENTE ⚠
-- ============================================================
-- * NÃO faz parte de nenhum build, deploy ou pipeline deste repositório.
--   Confirmado: não existe vercel.json, workflow de CI, nem script em
--   package.json que leia ou execute arquivos desta pasta sql/ -- os
--   arquivos aqui são só documentação/histórico de migrations, sempre
--   copiados manualmente para o SQL Editor do Supabase por uma pessoa.
-- * NÃO deve ser incluído em nenhuma ferramenta futura de migration
--   automática sem revisão humana explícita linha a linha.
-- * NÃO foi executado como parte desta auditoria/implementação (Bloco 2).
-- * PENDENTE DE APROVAÇÃO: o valor de destino ('Laboratório P&D', abaixo)
--   é uma RECOMENDAÇÃO desta auditoria, não uma decisão definitiva. Só
--   execute depois de aprovar esse valor explicitamente E depois de
--   conferir o painel `ink-system-plataform` (ver pendência abaixo).
-- ============================================================
--
-- Migration (preparada, NÃO executada) — ink_clientes: retirar "Ouro" da
-- linha da Casa dos Carvalho
-- Ver: Bloco 2 — remoção completa da arquitetura Bronze/Prata/Ouro do
-- repositório inq-saas (13/08/2026)
--
-- CONTEXTO
--
-- A conta real da Casa dos Carvalho (o Laboratório P&D) ainda tem
-- ink_clientes.plano = 'Ouro', herdado da arquitetura comercial antiga
-- (Bronze/Prata/Ouro), já abandonada. Esta migration prepara -- mas não
-- executa -- a troca desse valor para um identificador explícito,
-- não-comercial: 'Laboratório P&D'.
--
-- POR QUE ESTE VALOR (RECOMENDAÇÃO, AINDA NÃO APROVADA)
--
-- Este bloco de trabalho confirmou, por busca completa no código-fonte
-- (CRM Casa dos Carvalho.tsx e api/lead.js, os dois únicos lugares deste
-- repositório que já leram ink_clientes.plano), que NENHUM caminho de
-- código deste repositório lê mais esse campo hoje -- nem para decidir
-- carrossel, nem limite de fotos, nem qualquer outra funcionalidade. A
-- troca de valor, portanto, não deveria alterar nenhum comportamento do
-- Laboratório neste repositório.
--
-- 'Laboratório P&D' foi escolhido em vez de '1.0' (pareceria uma edição
-- comercial real) e em vez de manter 'Ouro' (nome abandonado). Não é uma
-- nova escada de planos: é só um rótulo textual, sem nenhuma lógica no
-- código que compare ou ordene esse valor. Mas continua sendo só uma
-- RECOMENDAÇÃO -- o responsável pelo produto ainda precisa aprová-la
-- explicitamente antes deste script ser executado.
--
-- PENDÊNCIA CONHECIDA, FORA DO ESCOPO DESTE REPOSITÓRIO — BLOQUEIA A EXECUÇÃO
--
-- O repositório irmão `ink-system-plataform` (painel administrativo
-- comercial) já leu este mesmo campo, em uma auditoria anterior, para
-- calcular receita prevista (financeiro/page.tsx) e cor de etiqueta
-- (badges de plano). Não foi possível confirmar, a partir daqui, o estado
-- atual desse outro repositório. O efeito esperado, na pior hipótese, é
-- cosmético (uma etiqueta sem cor reconhecida, ou a conta simplesmente não
-- entrar no somatório de receita prevista -- o que é correto, já que o
-- Laboratório não é um cliente pagante) -- não um erro que impeça o painel
-- de funcionar. **Este script não deve ser executado antes de uma auditoria
-- específica desse outro repositório confirmar o mesmo.**
--
-- SEGURANÇA DESTE SCRIPT
--
-- * Só afeta ink_clientes -- nunca licencas, artistas, clientes, agenda,
--   financeiro, pipeline, site_conteudo ou qualquer usuário de autenticação.
-- * Confere auth_user_id, slug e o valor atual exato antes de alterar
--   qualquer coisa.
-- * Interrompe (RAISE EXCEPTION) se não encontrar exatamente 1 linha
--   correspondente -- nunca aplica a mudança "no que encontrar".
-- * Idempotente: rodar de novo depois de já aplicado não faz nada (a
--   segunda verificação de "valor atual" já não encontra mais 'Ouro').
--
-- Os dois valores abaixo (auth_user_id e slug) foram confirmados por você
-- diretamente no banco (não apenas inferidos do código nesta rodada) --
-- coincidem com o valor de STUDIO_USER_ID já usado como identificador fixo
-- do tenant em api/chat.js, api/lead.js e api/config.js. Mesmo assim, o
-- script confere os dois de novo em tempo de execução e falha alto (RAISE
-- EXCEPTION) se algo divergir, em vez de aplicar silenciosamente.
--
-- Este script é destinado a ser executado manualmente no SQL Editor do
-- Supabase, mediante autorização separada da criação deste arquivo -- e só
-- depois de (1) aprovar o valor de destino e (2) confirmar a pendência do
-- ink-system-plataform acima. Não foi executado como parte desta
-- auditoria/implementação.

do $$
declare
  v_auth_user_id_esperado uuid := '2d366d35-1cae-40d5-ba92-06fe2ab8a763'; -- CONFERIR antes de rodar
  v_slug_esperado text := 'a-casa-dos-carvalho'; -- CONFERIR antes de rodar
  v_plano_atual_esperado text := 'Ouro';
  v_plano_novo text := 'Laboratório P&D';
  v_qtd int;
  v_linha record;
begin
  select count(*) into v_qtd
  from public.ink_clientes
  where auth_user_id = v_auth_user_id_esperado
    and slug = v_slug_esperado;

  if v_qtd <> 1 then
    raise exception
      'Esperava encontrar exatamente 1 linha em ink_clientes para auth_user_id=% e slug=%, mas encontrou %. Nenhuma alteração foi feita.',
      v_auth_user_id_esperado, v_slug_esperado, v_qtd;
  end if;

  select * into v_linha
  from public.ink_clientes
  where auth_user_id = v_auth_user_id_esperado
    and slug = v_slug_esperado;

  if v_linha.plano is distinct from v_plano_atual_esperado then
    raise exception
      'Esperava que ink_clientes.plano fosse exatamente ''%'' para esta linha, mas encontrou ''%''. Nenhuma alteração foi feita -- confira se este script já rodou antes, ou se o valor mudou por outro caminho.',
      v_plano_atual_esperado, v_linha.plano;
  end if;

  update public.ink_clientes
  set plano = v_plano_novo
  where auth_user_id = v_auth_user_id_esperado
    and slug = v_slug_esperado
    and plano = v_plano_atual_esperado;

  raise notice 'ink_clientes.plano atualizado de ''%'' para ''%'' na linha auth_user_id=%, slug=%.',
    v_plano_atual_esperado, v_plano_novo, v_auth_user_id_esperado, v_slug_esperado;
end $$;

-- Confirmação final -- deve retornar exatamente 1 linha, já com o novo valor.
select auth_user_id, slug, nome_estudio, plano, status
from public.ink_clientes
where slug = 'a-casa-dos-carvalho';
