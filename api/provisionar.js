// api/provisionar.js
//
// Adaptador HTTP do motor de provisionamento (Bloco 2.6A, Etapa 2). Chamado
// server-to-server pelo painel admin do ink-system-plataform (Etapa 3, ainda
// não implementada) -- nunca pelo navegador, por isso sem CORS/allowlist de
// origem, diferente de resend.js/zenvia.js.
//
// Autenticação dedicada (X-Provisioning-Service-Key / PROVISIONING_SERVICE_SECRET)
// -- deliberadamente distinta de X-Internal-Service-Key/INTERNAL_SERVICE_SECRET
// (usada por resend.js). Reutilizar a mesma chave ampliaria o raio de impacto
// de um vazamento de "spam de e-mail" para "criação não autorizada de
// tenants" -- ver Bloco 2.6A, revisão do plano (autenticação do endpoint).
//
// Este arquivo não contém nenhuma regra de negócio de provisionamento -- só
// traduz uma requisição HTTP autenticada e validada numa chamada já existente
// a provisionarEstudio(). O motor (lib/tenant/provisionamento/*) não muda.
//
// Três validações antes de chamar o motor (todas leitura, nunca criam/editam/
// excluem conta Auth -- a conta continua sendo criada manualmente):
//   (a) o authUserId existe no Supabase Auth;
//   (b) o e-mail da conta Auth coincide com o e-mail informado;
//   (c) o authUserId não está vinculado, com e-mail diferente, a um tenant
//       já existente em ink_clientes -- única tabela com UNIQUE(auth_user_id)
//       hoje (Migration 002, Bloco 2.2); licencas.user_id ainda não tem essa
//       garantia (backfill pendente, adiado desde o Bloco 2.4).
//
// Essas validações são preventivas -- reduzem a chance de vincular um
// authUserId errado por engano humano antes de gastar uma chamada ao motor.
// A garantia definitiva contra duplicidade continua sendo do motor, já
// idempotente por construção (criarIdentidade/criarFinanceiro via upsert,
// criarLicenciamento com proteção própria de conflito de e-mail). Este
// adaptador não substitui essa proteção nem cria nenhuma regra de
// consistência nova.

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { provisionarEstudio } from "../lib/tenant/provisionamento/provisionarEstudio.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAMPOS_OBRIGATORIOS = ["authUserId", "email", "nomeEstudio", "nomeResponsavel"];

function camposFaltando(dados) {
  return CAMPOS_OBRIGATORIOS.filter((campo) => !dados?.[campo]);
}

// Comparação a prova de timing attack -- diferença de tamanho falha fechado
// (sem chamar timingSafeEqual, que exige buffers do mesmo tamanho); ausência
// de qualquer um dos dois lados também falha fechado, em vez de comparar
// contra a string literal "undefined".
function compararSegredoSeguro(recebido, esperado) {
  if (!recebido || !esperado) return false;
  const bufRecebido = Buffer.from(String(recebido), "utf8");
  const bufEsperado = Buffer.from(String(esperado), "utf8");
  if (bufRecebido.length !== bufEsperado.length) return false;
  return crypto.timingSafeEqual(bufRecebido, bufEsperado);
}

// Slug técnico provisório -- responsabilidade de quem orquestra o
// provisionamento, não do motor (ver criarIdentidade.js, linhas 41-48: "Este
// domínio não gera um slug sozinho... Cabe a quem orquestra o provisionamento
// decidir esse valor inicial"). Derivado do próprio authUserId, que já é
// único por definição -- sem risco de colisão, sem nenhuma decisão de
// negócio embutida. O endereço "de verdade" continua sendo escolhido depois,
// no wizard do CRM (confirmarSlugOnboarding), sem nenhuma mudança ali.
function gerarSlugProvisorio(authUserId) {
  return `tenant-${authUserId}`;
}

/**
 * Lógica pura do endpoint -- recebe um cliente Supabase já pronto (real ou
 * falso) e a chave de autenticação já extraída do header, sem depender de
 * req/res do Vercel nem de process.env diretamente (exceto para comparar a
 * credencial). Testável isoladamente com um cliente Auth falso.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string|undefined} chaveRecebida
 * @param {{authUserId?: string, email?: string, nomeEstudio?: string, nomeResponsavel?: string}} dados
 * @returns {Promise<{status: number, body: object}>}
 */
export async function processarProvisionamento(sb, chaveRecebida, dados) {
  if (!compararSegredoSeguro(chaveRecebida, process.env.PROVISIONING_SERVICE_SECRET)) {
    return { status: 401, body: { error: "Não autenticado" } };
  }

  const faltando = camposFaltando(dados);
  if (faltando.length > 0) {
    return { status: 400, body: { error: `Campos obrigatórios ausentes: ${faltando.join(", ")}` } };
  }
  if (!UUID_REGEX.test(dados.authUserId)) {
    return { status: 400, body: { error: "authUserId não está em formato UUID válido" } };
  }

  // Validação (a) + (b)
  const { data: contaAuth, error: erroAuth } = await sb.auth.admin.getUserById(dados.authUserId);
  if (erroAuth || !contaAuth?.user) {
    return { status: 404, body: { error: "Conta não encontrada no Supabase Auth para o authUserId informado" } };
  }
  if ((contaAuth.user.email || "").toLowerCase() !== dados.email.toLowerCase()) {
    return { status: 409, body: { error: "O e-mail da conta no Supabase Auth não coincide com o e-mail informado" } };
  }

  // Validação (c)
  const { data: tenantExistente, error: erroConflito } = await sb
    .from("ink_clientes")
    .select("email")
    .eq("auth_user_id", dados.authUserId)
    .maybeSingle();
  if (erroConflito) {
    console.error("provisionar: falha ao verificar conflito de tenant:", erroConflito.message);
    return { status: 500, body: { error: "Falha ao verificar conflito de tenant. Tente novamente." } };
  }
  if (tenantExistente && (tenantExistente.email || "").toLowerCase() !== dados.email.toLowerCase()) {
    return { status: 409, body: { error: "Esse authUserId já está vinculado a um tenant com e-mail diferente" } };
  }

  const dadosProvisionamento = {
    authUserId: dados.authUserId,
    email: dados.email,
    nomeEstudio: dados.nomeEstudio,
    nomeResponsavel: dados.nomeResponsavel,
    slug: gerarSlugProvisorio(dados.authUserId),
  };

  const relatorio = await provisionarEstudio(sb, dadosProvisionamento);
  return { status: 200, body: relatorio };
}

const sb = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { authUserId, email, nomeEstudio, nomeResponsavel } = req.body || {};
  const resultado = await processarProvisionamento(sb, req.headers["x-provisioning-service-key"], {
    authUserId,
    email,
    nomeEstudio,
    nomeResponsavel,
  });
  return res.status(resultado.status).json(resultado.body);
}
