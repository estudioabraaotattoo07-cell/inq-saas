// Origens conhecidas e legítimas do ecossistema Ink System. Compartilhado por
// resend.js, zenvia.js e chat.js para não duplicar a mesma lista três vezes.
export const ALLOWED_ORIGINS = [
  "https://inq-saas.vercel.app",
  "https://acasadoscarvalhotattoo.com.br",
  "https://www.acasadoscarvalhotattoo.com.br",
  "https://inksystem.com.br",
  "https://www.inksystem.com.br",
  // Instrumentação temporária -- Bloco 4 (hardening), teste de CORS do H4 em
  // Preview. Só existe quando VERCEL_ENV === "preview"; Production nunca
  // inclui essa origem. Revertida antes do merge para main.
  ...(process.env.VERCEL_ENV === "preview"
    ? ["https://inq-saas-git-harden-6b05bb-estudioabraaotattoo07-cells-projects.vercel.app"]
    : []),
];
