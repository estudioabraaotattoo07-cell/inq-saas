// Origens conhecidas e legítimas do ecossistema Ink System. Compartilhado por
// resend.js, zenvia.js e chat.js para não duplicar a mesma lista três vezes.
const ORIGENS_PRODUCAO = [
  "https://inq-saas.vercel.app",
  "https://acasadoscarvalhotattoo.com.br",
  "https://www.acasadoscarvalhotattoo.com.br",
  "https://inksystem.com.br",
  "https://www.inksystem.com.br",
];

// Instrumentação TEMPORÁRIA de teste do Hardening H2 (clientes/aura_site_insert)
// -- viabiliza validar o novo contrato slug -> tenant de chat.js num deployment
// de Preview sem alterar a allowlist de Production. Travada estruturalmente ao
// ambiente Preview via VERCEL_ENV (variável que a própria Vercel define, não
// depende de nenhuma configuração nossa) -- fora desse ambiente, ALLOWED_ORIGINS
// é idêntica a ORIGENS_PRODUCAO, sem nenhuma exceção. Remover antes do
// encerramento formal do H2, ver Auditoria Pós.
const ORIGEM_PREVIEW_TESTE_H2 = "https://inq-saas-git-harden-088fff-estudioabraaotattoo07-cells-projects.vercel.app";

export const ALLOWED_ORIGINS = process.env.VERCEL_ENV === "preview"
  ? [...ORIGENS_PRODUCAO, ORIGEM_PREVIEW_TESTE_H2]
  : ORIGENS_PRODUCAO;
