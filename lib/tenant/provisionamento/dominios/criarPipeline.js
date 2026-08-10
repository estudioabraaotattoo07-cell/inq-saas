// lib/tenant/provisionamento/dominios/criarPipeline.js
//
// Garante a existência das 16 etapas padrão do Pipeline em pipeline_etapas.
// Não sabe o que é HTTP, painel administrativo, onboarding, Vercel ou
// endpoint — recebe um cliente Supabase já pronto e os dados necessários,
// e devolve um EtapaResultado padronizado, no mesmo contrato dos demais
// domínios.
//
// Fonte dos dados: PIPELINE_ETAPAS_PADRAO (lib/tenant/pipelinePadrao.js) --
// a mesma fonte canônica que o CRM usa como fallback local (DEFAULT_STAGES).
// Esse array usa os nomes de campo do CRM (id/color) -- este domínio traduz
// pra id->slug e color->cor, que são as colunas reais de pipeline_etapas.
//
// Idempotente por construção: upsert com onConflict:"user_id,slug",
// ignoreDuplicates:true -- vira "ON CONFLICT DO NOTHING" no Postgres, o
// mesmo padrão já usado e validado em criarFinanceiro.js. Etapa ausente é
// criada; etapa já existente (personalizada ou não) nunca é tocada -- nem
// lida, nem sobrescrita, nem apagada.
//
// Sem .select() encadeado — mesmo motivo de criarFinanceiro.js: um ON
// CONFLICT DO NOTHING que não insere nada não tem linha pra retornar.

import { NOME_ETAPA_PIPELINE } from "../constantes.js";
import { PIPELINE_ETAPAS_PADRAO } from "../../pipelinePadrao.js";

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
export async function criarPipeline(sb, dados) {
  const inicio = Date.now();

  const camposFaltando = validarCamposObrigatorios(dados);
  if (camposFaltando.length > 0) {
    return {
      etapa: NOME_ETAPA_PIPELINE,
      status: "erro",
      erro: `Campos obrigatórios ausentes: ${camposFaltando.join(", ")}`,
      duracaoMs: Date.now() - inicio,
    };
  }

  try {
    const payload = PIPELINE_ETAPAS_PADRAO.map((etapa) => ({
      user_id: dados.authUserId,
      slug: etapa.id,
      label: etapa.label,
      cor: etapa.color,
      emoji: etapa.emoji,
      ordem: etapa.ordem,
      fixo: etapa.fixo,
    }));

    const { error } = await sb
      .from("pipeline_etapas")
      .upsert(payload, { onConflict: "user_id,slug", ignoreDuplicates: true });

    if (error) throw error;

    return {
      etapa: NOME_ETAPA_PIPELINE,
      status: "garantido",
      detalhe: { etapasProcessadas: PIPELINE_ETAPAS_PADRAO.length },
      duracaoMs: Date.now() - inicio,
    };
  } catch (erro) {
    return {
      etapa: NOME_ETAPA_PIPELINE,
      status: "erro",
      erro: erro?.message || String(erro),
      duracaoMs: Date.now() - inicio,
    };
  }
}
