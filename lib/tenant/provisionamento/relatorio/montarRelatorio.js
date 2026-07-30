// lib/tenant/provisionamento/relatorio/montarRelatorio.js
//
// Função pura — sem I/O, sem conhecimento de domínios ou do Supabase. Só
// agrega o que já foi coletado em um RelatorioExecucao padronizado.

/** @typedef {import('./tiposRelatorio.js').EtapaResultado} EtapaResultado */
/** @typedef {import('./tiposRelatorio.js').RelatorioExecucao} RelatorioExecucao */

/**
 * @param {Object} args
 * @param {string} args.authUserId
 * @param {EtapaResultado[]} args.etapas
 * @param {string} args.iniciadoEm
 * @param {string} args.concluidoEm
 * @param {string} args.versaoProvisionamento
 * @returns {RelatorioExecucao}
 */
export function montarRelatorio({ authUserId, etapas, iniciadoEm, concluidoEm, versaoProvisionamento }) {
  return {
    versaoProvisionamento,
    authUserId,
    iniciadoEm,
    concluidoEm,
    sucesso:
      etapas.length > 0 &&
      etapas.every((etapa) => etapa.status === "garantido"),
    etapas,
  };
}
