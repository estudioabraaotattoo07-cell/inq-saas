import { createClient } from "@supabase/supabase-js";

const sbAuth = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

// Autentica o chamador de resend.js/zenvia.js por um dos dois caminhos
// aprovados na Especificação Executável do Bloco 1:
//  - sessão Supabase real (usuário já logado no CRM) -- header Authorization
//  - segredo de serviço (chamada server-to-server já conhecida) -- header
//    X-Internal-Service-Key, nunca o mesmo header da sessão de usuário
// user_id enviado sozinho no corpo nunca é aceito como prova de identidade
// (nem é lido aqui -- só os dois mecanismos abaixo contam).
export async function autenticarChamador(req) {
  const serviceKey = req.headers["x-internal-service-key"];
  if (serviceKey) {
    if (serviceKey === process.env.INTERNAL_SERVICE_SECRET) {
      return { ok: true, tipo: "service", identificador: "service:ink-system-plataform-admin" };
    }
    return { ok: false };
  }

  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    try {
      const { data, error } = await sbAuth.auth.getUser(token);
      if (!error && data?.user) {
        return { ok: true, tipo: "user", identificador: "user:" + data.user.id, userId: data.user.id };
      }
    } catch (e) {
      // Falha de rede validando a sessão nunca deve virar 500 -- trata como
      // não autenticado, igual um token inválido comum.
      console.error("validação de sessão falhou:", e.message);
    }
  }

  return { ok: false };
}
