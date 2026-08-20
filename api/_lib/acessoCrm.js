import { ALLOWED_ORIGINS } from "./allowedOrigins.js";

const OWNER_EMAIL = "estudioabraaotattoo07@gmail.com";

export function origemPermitida(req) {
  const origin = String(req.headers.origin || "");
  return ALLOWED_ORIGINS.includes(origin);
}

export async function usuarioTemAcessoCrm(sb, auth) {
  if (!auth?.userId) return false;
  if ((auth.email || "").toLowerCase() === OWNER_EMAIL) return true;
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb.from("licencas").select("status,data_vencimento").eq("user_id", auth.userId).limit(1).maybeSingle();
  if (error || !data) return false;
  return data.status === "ativo" && String(data.data_vencimento || "") >= hoje;
}
