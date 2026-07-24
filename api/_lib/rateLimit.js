import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Limites por endpoint (Bloco 1 de hardening) -- um só lugar pra ajustar,
// em vez de duplicado em cada arquivo.
const LIMITES = { resend: 30, zenvia: 20, chat: 10, agendar: 5 };

export function identificadorPorIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd || "").split(",")[0].trim();
  return "ip:" + (ip || req.socket?.remoteAddress || "desconhecido");
}

// Verifica e incrementa atomicamente no banco via RPC -- nunca ler-depois-
// escrever em JS, que reintroduziria a mesma race condition (duas chamadas
// simultâneas gastando o mesmo crédito) já identificada na auditoria de
// mensageria. Falha na própria infra de rate limit nunca deve travar um
// envio real -- por isso falha aberta só aqui, nunca na autenticação.
export async function verificarRateLimit(endpoint, identificador) {
  const janela = new Date();
  janela.setSeconds(0, 0);
  const { data, error } = await sb.rpc("incrementar_rate_limit", {
    p_endpoint: endpoint,
    p_identificador: identificador,
    p_janela: janela.toISOString(),
  });
  if (error) {
    console.error("rate limit indisponível:", error.message);
    return { permitido: true, contagem: null };
  }
  const limite = LIMITES[endpoint] ?? 30;
  return { permitido: data <= limite, contagem: data, limite };
}
