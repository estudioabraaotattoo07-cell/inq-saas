// lib/tenant/classificacaoInteressado.js
//
// Bloco de Unificação da Entrada de Clientes Interessados no Pipeline
// (2026-08-14), revisado na Revisão Técnica Complementar do mesmo bloco
// (2026-08-14, item 2). Função pura, sem dependência de banco nem de
// framework -- mesmo padrão de lib/tenant/pipelinePadrao.js, importável
// tanto pelo CRM (src/CRM Casa dos Carvalho.tsx, via Vite) quanto por
// testes Node.
//
// Decide se um cliente tem "Projeto detalhado" -- classificação interna,
// calculada na hora da leitura/renderização, nunca persistida em coluna
// própria (evita ficar desatualizada) e nunca exibida com os termos
// internos "lead frio"/"lead quente" na interface (ver
// docs/05-unificacao-clientes-interessados.md).
//
// CRITÉRIO (decisão de produto, 2026-08-14): considera detalhado quando
// pelo menos DOIS destes três grupos têm conteúdo REAL -- não apenas a
// chave existir no objeto, o valor precisa ser texto/lista não-vazia de
// verdade, depois de remover espaços:
//   - descrição da arte;
//   - região do corpo;
//   - pelo menos uma imagem de referência.
//
// Instagram, melhor período de contato, e-mail, faixa de investimento e
// tamanho aproximado NÃO entram nesse cálculo -- são dados complementares/
// logísticos, não indício de que a pessoa pensou de fato num projeto.
//
// PRIORIDADE DE LEITURA (compatibilidade com dado legado + novo): primeiro
// tenta a solicitação ATIVA mais recente dentro de cliente.projetos
// (ignorando "concluido"/"cancelado"); se ela não tiver descrição real,
// cai para o campo solto legado cliente.descricao. Região e referências
// sempre leem do campo solto do cliente (cliente.regiao/cliente.referencias)
// -- NÃO do projeto ativo -- pelos seguintes motivos, auditados na Revisão
// Técnica Complementar (2026-08-14, item 2 e item 5):
//   - Só a descrição ("desc") tem hoje duas origens possíveis (projeto
//     ativo OU campo solto). Região e referências, na prática, só têm UMA
//     origem realmente mantida: o campo solto do cliente. O cadastro
//     manual ("+Novo Cliente") até grava uma cópia de "regiao" dentro do
//     item de projetos[] no momento da criação -- mas nenhum código depois
//     disso volta a ler essa cópia; ela nunca é atualizada de novo e
//     nenhum outro caminho de criação (botão "Nova Solicitação de
//     Serviço", ferramenta "criar_projeto" da Aura interna, formulário do
//     site) grava região ou referências dentro de um item de projetos[] --
//     só o campo solto do cliente é realmente mantido ao longo do tempo.
//     Por isso ler do campo solto é mais confiável que ler a cópia inerte
//     do projeto.
//
// LIMITAÇÃO CONHECIDA (não corrigida neste bloco -- ver docs/05-...md):
// como região e referências vivem só no cliente (não por projeto), um
// cliente com mais de uma solicitação ao longo do tempo pode, em teoria,
// ter a descrição da solicitação ativa mais recente combinada com uma
// região ou referência que na verdade foi preenchida para uma solicitação
// ANTERIOR e diferente (ex.: cliente pediu uma tatuagem no braço em 2025,
// depois voltou em 2026 com uma ideia nova de tatuagem nas costas sem
// atualizar o campo "região" -- a classificação poderia contar "braço"
// como se fosse da solicitação de 2026). Esse é um limite estrutural do
// modelo de dado atual (região/referência não são por-projeto), não um bug
// desta função -- e não será corrigido aqui: a correção definitiva exige
// redesenhar o contrato de criação de solicitações (região e referências
// por item de projetos[]), o que está fora do escopo deste bloco (ver
// "LIMITAÇÃO CONHECIDA" em docs/05-unificacao-clientes-interessados.md). A
// regra escolhida aqui -- sempre ler do campo solto do cliente -- é a
// opção menos enganosa disponível hoje: é o único lugar onde esse dado é
// realmente mantido/atualizado por qualquer caminho de criação ou edição.

/** Texto não-vazio depois de remover espaços das pontas. */
function textoReal(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/** Lista com pelo menos um item de texto real (lista vazia não conta). */
function referenciasReais(lista) {
  return Array.isArray(lista) && lista.some((r) => textoReal(r));
}

// Todo ponto de criação de projeto hoje grava "criadoEm" (quando grava) no
// formato pt-BR "DD/MM/AAAA" via new Date().toLocaleDateString("pt-BR") --
// ex.: cadastro manual ("+Novo Cliente"), botão "Nova Solicitação de
// Serviço". Um valor "—" (travessão) é usado como placeholder explícito de
// "sem data" em projetos sintéticos/legados montados só pra exibição. A
// ferramenta "criar_projeto" da Aura interna hoje NÃO grava "criadoEm" (o
// campo fica ausente/undefined nesse caso). Nenhum formato ISO é usado
// hoje, então o parser abaixo só reconhece DD/MM/AAAA de propósito -- um
// valor em outro formato é tratado como inválido, nunca adivinhado.
const REGEX_CRIADO_EM_PT_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Converte "criadoEm" pra um timestamp comparável, ou null se o valor
 * estiver ausente, não for string, ou não bater no formato DD/MM/AAAA
 * conhecido (inclui o placeholder "—" e datas inválidas como 31/02/2026).
 */
function timestampCriadoEm(criadoEm) {
  if (typeof criadoEm !== "string") return null;
  const m = criadoEm.trim().match(REGEX_CRIADO_EM_PT_BR);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);
  const ts = Date.UTC(ano, mes - 1, dia);
  // Confere que a data "voltou" igual ao que foi digitado (Date.UTC aceita
  // dia/mês fora do intervalo e "rola" pro mês seguinte silenciosamente --
  // ex.: 31/02 viraria 03/03). Isso rejeita datas inválidas em vez de
  // adivinhar uma data errada.
  const d = new Date(ts);
  if (d.getUTCFullYear() !== ano || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null;
  return ts;
}

/**
 * Item de cliente.projetos com status "ativo" mais recente, ou null se não
 * houver nenhum (lista vazia, ausente, ou todos concluídos/cancelados).
 *
 * Regra determinística (Revisão Técnica Complementar, 2026-08-14, item 2):
 * NÃO usa o "id" do projeto pra decidir recência -- ids hoje vêm em formatos
 * incompatíveis entre si (número literal incremental no cadastro manual,
 * ex.: 1; timestamp numérico Date.now() no botão "Nova Solicitação de
 * Serviço"; timestamp em STRING via Date.now().toString() na ferramenta
 * "criar_projeto" da Aura interna; a string literal "legacy" num projeto
 * sintético de exibição) -- comparar esses valores como se fossem todos
 * pontos numa mesma escala cronológica é logicamente inválido (um UUID,
 * por exemplo, não teria relação nenhuma com ordem cronológica).
 *
 * Em vez disso:
 *   1. Se TODOS os projetos ativos tiverem um "criadoEm" válido (formato
 *      DD/MM/AAAA reconhecido), o mais recente é escolhido por data --
 *      critério de desempate: posição mais avançada no array.
 *   2. Caso contrário (qualquer projeto ativo com criadoEm ausente ou em
 *      formato não reconhecido), "criadoEm" é ignorado por inteiro pra essa
 *      decisão -- misturar comparação por data com comparação por posição
 *      caso a caso seria arbitrário. A alternativa seguraé usar a POSIÇÃO
 *      no array: todo caminho de criação de projeto hoje SÓ ADICIONA ao
 *      final do array (spread + item novo, ou push) -- nenhum código
 *      reordena, insere no meio ou faz unshift em cliente.projetos. Por
 *      isso a ordem do array é, por construção, cronológica (mais antigo
 *      primeiro), e o último item ativo nessa ordem é o mais recente. Esta
 *      é uma suposição estrutural explícita: se um caminho futuro passar a
 *      reordenar o array, esta regra deixa de valer e precisa ser revista.
 *
 * O array recebido NUNCA é mutado, reordenado, nem o valor salvo no banco é
 * alterado -- esta função só LÊ, pra decidir qual item usar no cálculo de
 * classificação.
 */
function projetoAtivoMaisRecente(projetos) {
  if (!Array.isArray(projetos) || projetos.length === 0) return null;

  const ativos = [];
  for (let i = 0; i < projetos.length; i++) {
    const p = projetos[i];
    if (p && p.status === "ativo") ativos.push({ projeto: p, posicao: i });
  }
  if (ativos.length === 0) return null;
  if (ativos.length === 1) return ativos[0].projeto;

  const todosComDataValida = ativos.every((a) => timestampCriadoEm(a.projeto.criadoEm) !== null);

  if (todosComDataValida) {
    return ativos.reduce((maisRecente, atual) => {
      const tsAtual = timestampCriadoEm(atual.projeto.criadoEm);
      const tsMaisRecente = timestampCriadoEm(maisRecente.projeto.criadoEm);
      if (tsAtual > tsMaisRecente) return atual;
      if (tsAtual === tsMaisRecente && atual.posicao > maisRecente.posicao) return atual;
      return maisRecente;
    }).projeto;
  }

  // Alternativa segura e documentada: último ativo por posição no array.
  return ativos[ativos.length - 1].projeto;
}

/**
 * @param {object} cliente Registro de clientes (aceita qualquer shape --
 *   sem tipo próprio de propósito, pra não acoplar este módulo compartilhado
 *   ao tipo do CRM).
 * @returns {boolean} true = "Projeto detalhado" (interno: lead quente);
 *   false = sem selo, aparece normal (interno: lead frio).
 */
export function projetoEstaDetalhado(cliente) {
  if (!cliente || typeof cliente !== "object") return false;

  const projetoAtivo = projetoAtivoMaisRecente(cliente.projetos);
  const descricao = projetoAtivo && textoReal(projetoAtivo.desc) ? projetoAtivo.desc : cliente.descricao;

  let criterios = 0;
  if (textoReal(descricao)) criterios++;
  if (textoReal(cliente.regiao)) criterios++;
  if (referenciasReais(cliente.referencias)) criterios++;

  return criterios >= 2;
}

// Exportado só para os testes deste módulo -- não é usado fora daqui.
export const _internos = { projetoAtivoMaisRecente, timestampCriadoEm };
