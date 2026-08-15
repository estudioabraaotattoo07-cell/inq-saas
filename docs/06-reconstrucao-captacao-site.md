# RECONSTRUÇÃO DA CAPTAÇÃO DO SITE ALINHADA AO NOVO FLUXO DE CLIENTES INTERESSADOS

## Documento 06 — Registro de Bloco Transversal

**Versão 1.0** — Bloco iniciado em 2026-08-15 (Planejamento e Auditoria Pré-Implementação), Bloco 1 concluído em 2026-08-15.

---

## 1. OBJETIVO GERAL DO BLOCO TRANSVERSAL

Reconstruir a captação de interessados do site público, alinhando-a por
completo ao fluxo já unificado de "Clientes interessados" (ver
`docs/05-unificacao-clientes-interessados.md`). O bloco é **transversal**
porque envolve simultaneamente: o site público e o formulário
(`api/lead.js`), a API de recebimento, o CRM, a classificação comercial do
interessado ("lead básico"/"lead quente", exibida como `✦ Projeto
detalhado`) e as automações da aba Relacionamento.

Este é um bloco maior, dividido em etapas menores e sequenciais, cada uma
com auditoria e aprovação própria — este documento acompanha o progresso de
todas elas.

## 2. RESULTADO DA AUDITORIA INICIAL (SITE, API E RELACIONAMENTO)

Uma auditoria técnica completa (Auditorias A, B, C e D) foi realizada antes
de qualquer implementação, cobrindo: como o formulário público é
construído e validado (`api/lead.js`); como a classificação `✦ Projeto
detalhado` funciona (`lib/tenant/classificacaoInteressado.js`); como a aba
Relacionamento do CRM lê e reage às etapas do pipeline; e os impactos
transversais em pipeline, clientes, projetos, e-mails, upload de
referências, deduplicação, segurança, provisionamento e integrações
futuras.

Principais achados:
- O formulário atual (`api/lead.js`, função `montarFicha()`) exige Nome,
  WhatsApp e E-mail só no navegador (atributo `required`) — o servidor
  aceitava a requisição com apenas um desses três campos preenchido. Esta
  divergência foi corrigida no Bloco 1 (ver seção 9).
- A deduplicação (`chave_dedup`, telefone + primeiro nome, resolução
  atômica por `UNIQUE(user_id, chave_dedup)`) já é robusta e não precisou
  de nenhuma alteração.
- A campanha promocional (`palavra_secreta`) já é revalidada no servidor,
  nunca aceita cegamente do cliente — boa prática já existente, preservada.
- O formulário atual não grava a solicitação dentro de `clientes.projetos`
  (usa campos soltos legados) — limitação já conhecida desde
  `docs/05-unificacao-clientes-interessados.md`, ainda não corrigida,
  candidata a um bloco futuro desta mesma reconstrução.
- Não existe hoje nenhum campo de consentimento no formulário público,
  embora a coluna `clientes.consent` já exista no banco.

## 3. CONFIRMAÇÃO: `a-casa-dos-carvalho` É EXTERNO A ESTE REPOSITÓRIO

Durante a auditoria, foi levantada a hipótese de que `a-casa-dos-carvalho`
pudesse ser um projeto legado dentro deste repositório. **Confirmado e
esclarecido pelo responsável do estúdio**: trata-se de um projeto e
repositório **separados**, com deploy próprio na Vercel, correspondente ao
site `acasadoscarvalhotattoo.com.br`. Este domínio, aliás, já aparece
listado como origem permitida em `api/_lib/allowedOrigins.js` — confirma
que é um site real e externo que consome as APIs deste repositório, não
código deste repositório.

**Este bloco transversal não acessa, altera nem inclui esse projeto
externo em nenhuma etapa.** O único alvo é a página pública de captação
gerada por `api/lead.js`, dentro do repositório `inq-saas`.

## 4. FUNCIONAMENTO AUTOMÁTICO DE "CLIENTES INTERESSADOS" NA ABA RELACIONAMENTO

A aba Relacionamento do CRM já exibe "Clientes interessados" corretamente,
**sem nenhuma alteração de código necessária para isso**. O accordion
"Fluxo de Relacionamento por Etapa" (`src/CRM Casa dos Carvalho.tsx:8538`)
itera sobre `stages` — o mesmo array carregado de `pipeline_etapas` que
alimenta as colunas do Kanban. Como o `label` da etapa `lead` já foi
atualizado para "Clientes interessados" pela migration do Bloco de
Unificação, a aba Relacionamento reflete isso automaticamente. As
mensagens customizadas e automações que já existiam para o slug técnico
`lead` (que nunca mudou de nome técnico, só de rótulo visível) continuam
funcionando exatamente como antes, sem interrupção.

## 5. OS DOIS E-MAILS DE SISTEMA QUE REALMENTE FUNCIONAM

Confirmados como os únicos disparos **automáticos e reais** ligados à
entrada de um novo interessado, disparados de forma síncrona dentro de
`api/lead.js` no momento da submissão do formulário (linhas 1898-1998),
controlados por toggles em `configuracoes`:
1. **E-mail de boas-vindas ao cliente**
   (`fluxo_boas_vindas_email_ativa`).
2. **E-mail de alerta interno ao artista responsável**
   (`fluxo_notificacao_artista_ativa`).

Ambos foram **preservados sem nenhuma alteração** neste bloco e devem
continuar funcionando exatamente assim em qualquer bloco futuro desta
reconstrução.

## 6. PENDÊNCIA SEPARADA: MOTOR DE MENSAGENS CUSTOMIZADAS COM ATRASO

A tabela `fluxo_etapas` permite configurar, pela interface do CRM,
mensagens customizadas por etapa com atraso (`dias`) e repetição
(`repetir`). A auditoria **não encontrou, em nenhum lugar do repositório,
um processo (cron, função agendada, dispatcher) que efetivamente leia
essas configurações e envie as mensagens** depois do prazo configurado —
`fluxo_etapas` só é referenciada dentro da própria tela do CRM (CRUD),
nunca em `api/`. Isso sugere que essa funcionalidade pode ser hoje só uma
tela de configuração, sem motor de disparo real implementado.

**Esta é uma pendência registrada separadamente, não confirmada com
certeza absoluta** (não é possível descartar um mecanismo externo ao
repositório, como uma função agendada do lado do Supabase), **e não foi
implementada nem corrigida neste bloco**. Fica para avaliação e decisão de
produto futura, fora do escopo da reconstrução da captação.

## 7. DECISÃO: INTEGRAÇÃO COM A META NÃO SERÁ IMPLEMENTADA AGORA

Confirmado como decisão de produto: a integração com a API de Conversões
da Meta (Meta Conversions API) permanece **futura**. Nenhuma implementação,
evento ou chamada relacionada foi feita neste bloco. O único compromisso
assumido é estrutural: a função `projetoEstaDetalhado()`
(`lib/tenant/classificacaoInteressado.js`) deve continuar sendo pura, sem
depender de banco ou tela, para poder ser reaproveitada pelo backend
quando essa integração for planejada — sem duplicar a regra de
classificação.

## 8. PLANEJAMENTO DOS PRÓXIMOS BLOCOS

| # | Bloco | Nível |
|---|---|---|
| 1 | Correção da validação obrigatória no servidor | 1 — **concluído** (ver seção 9) |
| 2 | Definição do novo formulário e sua experiência | 1 |
| 3 | Implementação da captação | 3 |
| 4 | Integração com "Clientes interessados" (`projetos[]`) | 2 |
| 5 | Preservação da classificação `✦ Projeto detalhado` | 1 |
| 6 | Validação do fluxo de Relacionamento | 2 |
| 7 | Testes de ponta a ponta | 2 |
| 8 | Auditoria pós-implementação | 1 |
| 9 | Encerramento documental | 1 |

Detalhamento completo (objetivo, escopo, arquivos prováveis, banco
afetado, riscos, dependências, testes, critérios de aceite) já apresentado
e aprovado na auditoria/planejamento inicial deste bloco transversal.

## 9. ENCERRAMENTO DO BLOCO 1 — CORREÇÃO DA VALIDAÇÃO OBRIGATÓRIA

**Concluído com sucesso em 2026-08-15.**

- **Causa:** a checagem do servidor (`api/lead.js`) só rejeitava a
  requisição quando os três campos obrigatórios (nome, WhatsApp, e-mail)
  chegavam vazios **ao mesmo tempo** — bastava um único preenchido para
  passar.
- **Correção:** novas funções puras e exportadas
  `textoObrigatorioValido()`/`camposObrigatoriosPreenchidos()`, exigindo
  texto real (string não vazia após remover espaços) nos três campos,
  aplicadas antes de qualquer resolução de tenant, deduplicação, gravação
  no banco ou disparo de e-mail.
- **Commit:** `eb492eba56a5ebcbd6085432e75271fd0be654bd` —
  `fix(lead): exige nome whatsapp e email no servidor`.
- **Testes:** 17/17 específicos (`api/_tests/lead.camposObrigatoriosPreenchidos.test.js`,
  incluindo casos de campo ausente, `null`, string vazia, só espaços e
  tipo inesperado, mais garantias estruturais de que a validação precede
  qualquer escrita/e-mail); **216/216 na suíte completa** do repositório.
- **Deploy confirmado:** push realizado, `origin/main` sincronizado, site e
  API respondendo normalmente em produção.
- **Testes negativos em produção:** `POST /api/lead` sem nenhum campo e com
  apenas um dos três campos retornaram **HTTP 400** com a mensagem "Nome
  completo, WhatsApp e e-mail são obrigatórios." — confirmado ao vivo que o
  cenário exato do bug original (só um campo preenchido) agora é
  corretamente rejeitado.
- **Nenhum cliente de teste foi criado** — todas as requisições de teste
  foram deliberadamente incompletas.
- **Nenhum banco de dados ou pipeline foi alterado** por este bloco — a
  mudança foi só de validação de entrada, no código já publicado.

## 10. PRÓXIMO PASSO

**Bloco 2 — Definição da experiência do novo formulário.** Decisão de
produto (campos, UX, consentimento, obrigatoriedade), sem escrita de
código — aguardando autorização separada para começar.
