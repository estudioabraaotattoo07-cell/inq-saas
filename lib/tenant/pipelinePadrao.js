// lib/tenant/pipelinePadrao.js
//
// Fonte canônica única das etapas padrão do Pipeline (Kanban) — consumida
// tanto pelo CRM (src/CRM Casa dos Carvalho.tsx, via Vite) quanto pelo motor
// de provisionamento (lib/tenant/provisionamento/dominios/criarPipeline.js,
// via Node). Dado puro, sem nenhuma dependência de framework — só assim o
// mesmo arquivo funciona nos dois lados sem acoplamento.
//
// Formato IDÊNTICO ao antigo DEFAULT_STAGES do CRM (id/label/color/emoji) --
// de propósito, pra que a extração no CRM seja puramente mecânica (import
// no lugar da declaração, zero mudança de shape). `ordem` (posição, 1-based)
// e `fixo` são campos adicionais, que só existem em pipeline_etapas no banco
// -- o CRM não lê nem espera esses dois quando usa o array como fallback.
// criarPipeline() é responsável por traduzir id->slug e color->cor ao montar
// o payload de upsert, já que essas são as colunas reais da tabela.
//
// Valores extraídos verbatim do antigo DEFAULT_STAGES (Bloco Pipeline-1) --
// nenhuma cor, label, emoji ou slug foi alterado na extração. `fixo` reflete
// a decisão de produto do Bloco Pipeline-1: todas as etapas são fixas,
// exceto "Pós-venda Piercing".
//
// Bloco de Unificação da Entrada de Clientes Interessados (2026-08-14):
// "lead_morno" (Solicitação de Consulta) e "aura_agend" (Solicitação de
// Sessão) foram removidas como etapas do pipeline -- consolidadas na
// própria "lead", relabelada para "Clientes interessados". O identificador
// técnico "lead" foi preservado de propósito (não virou "clientes_interessados")
// para reduzir risco e manter compatibilidade com todo código que já
// escreve/lê etapa === "lead". Ver docs/05-unificacao-clientes-interessados.md
// para o racional completo e sql/2026-08-14_pipeline_unificar_clientes_interessados.sql
// para a migração dos dados já existentes nas duas etapas removidas.

export const PIPELINE_ETAPAS_PADRAO = [
  { id: "lead", label: "Clientes interessados", color: "#5B8DEF", emoji: "🎯", ordem: 1, fixo: true },
  { id: "precisa_remarcar", label: "Precisa Remarcar", color: "#E74C3C", emoji: "📞", ordem: 2, fixo: true },
  { id: "cons_agendada", label: "Consulta Marcada", color: "#9B6BB5", emoji: "📅", ordem: 3, fixo: true },
  { id: "sessao_agend", label: "Sessão Marcada", color: "#4A9EBF", emoji: "✏️", ordem: 4, fixo: true },
  { id: "aguard_agend", label: "Aguardando Agendamento de Sessão em Andamento", color: "#F39C12", emoji: "⏰", ordem: 5, fixo: true },
  { id: "aguard_1a_sessao", label: "Aguardando 1ª Sessão", color: "#F39C12", emoji: "🖊️", ordem: 6, fixo: true },
  { id: "aguard_prox_sessao", label: "Aguardando Nova Solicitação de Projeto", color: "#E8A838", emoji: "🔄", ordem: 7, fixo: true },
  { id: "tatuado", label: "Sessão Realizada", color: "#27AE60", emoji: "✅", ordem: 8, fixo: true },
  { id: "pos_venda", label: "Pós-venda", color: "#E67E22", emoji: "💬", ordem: 9, fixo: true },
  { id: "pos_venda_piercing", label: "Pós-venda Piercing", color: "#D4527E", emoji: "💍", ordem: 10, fixo: false },
  { id: "reengajamento", label: "Reengajamento", color: "#16A085", emoji: "💎", ordem: 11, fixo: true },
  { id: "lista_espera", label: "Lista de Espera", color: "#3498DB", emoji: "⏳", ordem: 12, fixo: true },
  { id: "hibernacao", label: "Hibernação", color: "#666", emoji: "💤", ordem: 13, fixo: true },
  { id: "blacklist", label: "Blacklist", color: "#C0392B", emoji: "🚫", ordem: 14, fixo: true },
];
