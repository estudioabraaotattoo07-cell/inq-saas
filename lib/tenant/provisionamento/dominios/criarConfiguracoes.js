// lib/tenant/provisionamento/dominios/criarConfiguracoes.js
//
// Garante que o tenant possua sua linha-base em configuracoes. Não sabe o
// que é HTTP, painel administrativo, onboarding, Vercel ou endpoint —
// recebe um cliente Supabase já pronto e os dados necessários, e devolve
// um EtapaResultado padronizado, no mesmo contrato dos demais domínios.
//
// Payload mínimo por design: { user_id }. Nenhum dado cadastral (studio_*,
// horários, metas, Aura, API keys, tema) é inventado aqui — isso é
// responsabilidade do onboarding, que roda depois, com o usuário real.
//
// Idempotência via SELECT → INSERT, não upsert: UNIQUE(user_id) ainda não
// existe em configuracoes (ver CONFIG-0B, pendente), então um upsert com
// onConflict:"user_id" não teria constraint pra resolver o conflito. Uma
// linha existente nunca é lida além do id, nunca é atualizada, nunca é
// apagada — só sua presença é confirmada.

import { NOME_ETAPA_CONFIGURACOES } from "../constantes.js";

/** @typedef {import('../../tiposComuns.js').DadosProvisionamento} DadosProvisionamento */
/** @typedef {import('../relatorio/tiposRelatorio.js').EtapaResultado} EtapaResultado */

const CAMPOS_OBRIGATORIOS = ["authUserId"];

/**
 * @param {DadosProvisionamento} dados
 * @returns {string[]}
 */
function validarCamposObrigatorios(dados) {
  return CAMPOS_OBRIGATORIOS.filter((campo) => {
    const valor = dados?.[campo];
    return valor === undefined || valor === null || valor === "";
  });
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {DadosProvisionamento} dados
 * @returns {Promise<EtapaResultado>}
 */
export async function criarConfiguracoes(sb, dados) {
  const inicio = Date.now();

  const camposFaltando = validarCamposObrigatorios(dados);
  if (camposFaltando.length > 0) {
    return {
      etapa: NOME_ETAPA_CONFIGURACOES,
      status: "erro",
      erro: `Campos obrigatórios ausentes: ${camposFaltando.join(", ")}`,
      duracaoMs: Date.now() - inicio,
    };
  }

  try {
    const { data: existente, error: erroSelect } = await sb
      .from("configuracoes")
      .select("id")
      .eq("user_id", dados.authUserId)
      .limit(1)
      .maybeSingle();

    if (erroSelect) throw erroSelect;

    if (existente) {
      return {
        etapa: NOME_ETAPA_CONFIGURACOES,
        status: "garantido",
        detalhe: { jaExistia: true },
        duracaoMs: Date.now() - inicio,
      };
    }

    const { error: erroInsert } = await sb
      .from("configuracoes")
      .insert({ user_id: dados.authUserId });

    if (erroInsert) throw erroInsert;

    return {
      etapa: NOME_ETAPA_CONFIGURACOES,
      status: "garantido",
      detalhe: { jaExistia: false },
      duracaoMs: Date.now() - inicio,
    };
  } catch (erro) {
    return {
      etapa: NOME_ETAPA_CONFIGURACOES,
      status: "erro",
      erro: erro?.message || String(erro),
      duracaoMs: Date.now() - inicio,
    };
  }
}
