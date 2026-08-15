# UNIFICAÇÃO DA ENTRADA DE CLIENTES INTERESSADOS NO PIPELINE

## Documento 05 — ADR (Architecture Decision Record — Registro de Decisão de Arquitetura)

**Versão 1.0** — Bloco implementado em 2026-08-14

---

## CONTEXTO

Até esta decisão, o Pipeline (Kanban) do Ink System tinha três etapas separadas
para representar a chegada de um novo interessado:

- `lead` ("Lead");
- `lead_morno` ("Solicitação de Consulta");
- `aura_agend` ("Solicitação de Sessão").

Na prática, essas três etapas não representavam três momentos operacionais
diferentes — representavam apenas **quanto o formulário de entrada tinha
perguntado**. Como o formulário público do site deixou de ser uma conversa
com perguntas progressivas e virou uma ficha única (mudança anterior a este
bloco), a distinção entre as três etapas na entrada perdeu sentido: hoje,
praticamente todo novo contato chega pela mesma via, com a mesma quantidade
de informação possível — só que preenchida ou não.

Mais informação preenchida não deveria decidir **em qual coluna** a pessoa
aparece. Deveria, no máximo, decidir **como aquele cartão é sinalizado**
dentro da mesma coluna.

## DECISÃO

`lead_morno` e `aura_agend` deixam de existir como etapas do Pipeline.

`lead` passa a se chamar **"Clientes interessados"** na interface. O
identificador técnico (`id`/`slug`) continua sendo `lead` — não foi criado um
identificador novo (`clientes_interessados`), para reduzir risco e preservar
compatibilidade com todo o código já existente que lê/escreve esse valor.

Todo novo contato, **independentemente da origem** (formulário do site,
cadastro manual no CRM, ferramenta de IA interna, nova solicitação para
cliente já existente, modo de demonstração, ou qualquer caminho futuro),
entra em `lead`.

## CONCEITOS

Estes três conceitos já existiam no sistema antes deste bloco, mas nunca
tinham sido registrados formalmente num documento — só em comentários soltos
de código (ver "ADR-001"/"Constituição de Domínio", mencionado em
`src/CRM Casa dos Carvalho.tsx`, sem documento próprio até agora). Este
documento formaliza o que já era verdade na prática:

- **Cliente é a pessoa.** Uma linha na tabela `clientes` representa um ser
  humano, com telefone e nome — não um procedimento, não uma tatuagem, não
  um pedido.
- **Solicitação/projeto é o procedimento desejado.** Vive dentro do campo
  `projetos` (lista) da própria linha do cliente. Um cliente pode ter zero,
  um ou vários projetos ao longo do tempo — cada visita ao estúdio, cada
  nova ideia, pode virar um novo item nessa lista, sem nunca duplicar a
  pessoa.
- **O Pipeline acompanha o andamento operacional**, não a intenção
  declarada. Etapas como "Consulta Marcada" ou "Sessão Marcada" só existem
  quando há um compromisso real na Agenda — nunca porque alguém "disse que
  queria" uma consulta ou sessão. Essa é a mudança central deste bloco:
  antes, a etapa nascia da resposta a uma pergunta do formulário; agora,
  nasce de um evento real.

## O QUE MUDA NA PRÁTICA

- Toda nova entrada começa em `lead` / "Clientes interessados", sem exceção.
- A quantidade de informação fornecida **nunca** cria uma coluna diferente.
- Dentro da mesma coluna, um cartão pode ganhar o selo **"✦ Projeto
  detalhado"** — uma classificação calculada na hora de exibir o cartão
  (nunca gravada numa coluna do banco, pra nunca ficar desatualizada),
  usando a função `projetoEstaDetalhado()` (`lib/tenant/classificacaoInteressado.js`).
  Considera detalhado quando pelo menos dois destes três grupos têm
  conteúdo real: descrição da arte, região do corpo, pelo menos uma imagem
  de referência. Instagram, período de contato, e-mail, faixa de
  investimento e tamanho não entram nesse cálculo — são dados
  complementares, não indício de que a pessoa pensou de fato num projeto.
  Um cliente sem esse selo não recebe nenhuma marcação — aparece normal.
  Os termos internos "lead frio"/"lead quente" nunca aparecem na interface;
  o painel de métricas de Origens usa "Contato básico" e "Projeto
  detalhado".
- Consulta e sessão só viram etapa do Pipeline (`cons_agendada`/
  `sessao_agend`) quando existir um agendamento real na Agenda — não existe
  mais um campo ou etapa de "intenção de consulta"/"intenção de sessão".
- Um cliente pode possuir várias solicitações (vários itens em `projetos`)
  sem nunca duplicar a pessoa — mecanismo que já existia (botão "Nova
  Solicitação de Serviço", dentro da ficha do cliente) e continua
  funcionando exatamente igual.

## LIMITAÇÃO CONHECIDA, JÁ MAPEADA PARA O PRÓXIMO BLOCO

O formulário público do site (`api/lead.js`) ainda grava a solicitação como
**campos soltos legados** direto na linha do cliente (`descricao`, `regiao`,
`servico`) — não cria um item dentro de `projetos[]`, ao contrário do
cadastro manual e do botão "Nova Solicitação de Serviço", que já usam
`projetos[]` corretamente. Isso significa que, hoje, se a mesma pessoa
enviar a ficha do site duas vezes, a segunda tentativa não vira uma segunda
solicitação visível — só atualiza os mesmos campos soltos da primeira. A
função `projetoEstaDetalhado()` já foi escrita considerando essa realidade
(lê primeiro a solicitação ativa mais recente em `projetos[]`, quando
existir; senão cai para os campos legados do cliente) — mas o formulário em
si, seu contrato de criação de solicitações, e a reconstrução visual da
ficha (janela, botão flutuante, CTAs, campos) ficam para o próximo bloco,
que reconstrói o formulário do site.

## O QUE NÃO MUDOU

- A Qualificação manual Q0-Q3 (campo `qual`) continua existindo, intocada —
  é uma estrutura diferente e anterior a este bloco, sem nenhuma relação
  com a classificação "Projeto detalhado". Fica registrada como pendência
  separada de produto (avaliar, em algum momento futuro, se as duas devem
  ser unificadas ou continuar independentes — não decidido neste bloco).
- O Pixel do Meta não foi alterado. Não existia, antes deste bloco, nenhuma
  relação de código entre a etapa do Pipeline e o Pixel — só um campo de
  configuração salvo, sem evento de conversão disparado.
- Disparos de e-mail e SMS não foram alterados.
- As demais 13 etapas do Pipeline (`precisa_remarcar`, `cons_agendada`,
  `sessao_agend`, `aguard_agend`, `aguard_1a_sessao`, `aguard_prox_sessao`,
  `tatuado`, `pos_venda`, `pos_venda_piercing`, `reengajamento`,
  `lista_espera`, `hibernacao`, `blacklist`) permanecem como estavam, com
  os mesmos identificadores, cores, emojis e comportamento.

## ADENDO — Revisão Técnica Complementar (2026-08-14)

Após a implementação inicial, uma revisão apontou cinco pontos que exigiam
ajuste ou esclarecimento adicional:

- **Normalização client-side é só visual.** O carregamento do CRM mostra
  clientes antigos em `lead_morno`/`aura_agend` já na coluna "Clientes
  interessados" (mapeamento em memória) — mas, diferente de uma versão
  anterior deste bloco, **não grava mais nenhum UPDATE automático no banco**
  para esses dois casos. Só o SQL versionado
  (`sql/2026-08-14_pipeline_unificar_clientes_interessados.sql`), revisado e
  executado manualmente, migra esses registros de verdade. `qualificacao`
  continua com migração automática de verdade (grava no banco), como já era
  antes deste bloco — comportamento distinto e preservado de propósito.
- **Janela em que o label ainda mostra "Lead".** Para qualquer tenant já
  provisionado antes deste bloco, o label da coluna `lead` fica com o valor
  antigo ("Lead") até o SQL rodar para aquele tenant especificamente — o
  código novo não sobrescreve `pipeline_etapas.label` de linhas já
  existentes (nem o deploy, nem uma nova execução do provisionamento, que
  usa `ON CONFLICT DO NOTHING`). Só tenants provisionados pela primeira vez
  depois do deploy nascem direto com "Clientes interessados".
- **`projetoAtivoMaisRecente()` não usa mais `id` para decidir recência** —
  os formatos de `id` variam (número, string numérica, string literal) e
  nunca representaram ordem cronológica de forma confiável. A regra agora
  prioriza `criadoEm` (formato `DD/MM/AAAA`) quando válido em todos os
  projetos ativos comparados; senão usa a posição no array (todo caminho de
  criação só adiciona ao final, nunca reordena).
- **Isolamento por tenant no SQL passou a ser explícito.** A migração agora
  descobre os tenants afetados, confirma que CADA um possui sua própria
  etapa `lead`, e filtra todo `UPDATE`/`DELETE` por `user_id` — nunca usa a
  etapa `lead` de um estúdio para validar outro.
- **Risco de mistura entre projetos, já existente e não corrigido aqui.**
  Região e referências só existem em nível de cliente (campo solto) — não
  por projeto — então, em teoria, podem ter sido preenchidas para uma
  solicitação anterior e ainda contar junto com a descrição da solicitação
  ativa atual. Comportamento documentado e fixado por teste; a correção
  definitiva (região/referências por item de `projetos[]`) fica para o
  bloco de reconstrução do formulário do site.

Ver `lib/tenant/classificacaoInteressado.js` (docblock) e
`sql/2026-08-14_pipeline_unificar_clientes_interessados.sql` (cabeçalho)
para o detalhamento técnico completo de cada ponto.
