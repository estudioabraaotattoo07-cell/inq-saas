// lib/tenant/provisionamento/provisionarEstudio.js
//
// O orquestrador. Não sabe o que é ink_clientes, licencas, upsert, HTTP,
// painel administrativo, onboarding ou endpoint — só sabe executar uma
// lista de descritores de domínio contra os mesmos dados, e agregar o
// resultado. Ver Bloco 2.5 para a arquitetura completa.
//
// Fluxo: sequencial, na ordem da lista; nunca interrompe por causa de uma
// etapa com erro (política desta versão inicial — ver Bloco 2.5, Ajuste 2).
// Sem rollback automático: a idempotência de cada domínio é a estratégia de
// recuperação — reexecutar esta função inteira resolve.

import { DOMINIOS_ATIVOS } from "./registroDominios.js";
import { montarRelatorio } from "./relatorio/montarRelatorio.js";
import { VERSAO_PROVISIONAMENTO_ATUAL } from "./versao.js";

/** @typedef {import('../tiposComuns.js').DadosProvisionamento} DadosProvisionamento */
/** @typedef {import('./relatorio/tiposRelatorio.js').RelatorioExecucao} RelatorioExecucao */
/**
 * @typedef {Object} DescritorDominio
 * @property {string} chave
 * @property {string} nome
 * @property {(sb: import('@supabase/supabase-js').SupabaseClient, dados: DadosProvisionamento) => Promise<import('./relatorio/tiposRelatorio.js').EtapaResultado>} executar
 */

/**
 * Extrai uma mensagem legível de qualquer coisa que um catch possa capturar
 * — não só instâncias de Error. Sem isso, um domínio que lançasse um
 * objeto simples (em vez de `throw new Error(...)`) produziria
 * "[object Object]" no relatório, em vez de uma mensagem útil.
 *
 * @param {unknown} erro
 * @returns {string}
 */
function obterMensagemErro(erro) {
  if (erro instanceof Error) {
    return erro.message;
  }

  if (typeof erro === "string") {
    return erro;
  }

  try {
    return JSON.stringify(erro);
  } catch {
    return "Erro inesperado durante o provisionamento.";
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {DadosProvisionamento} dados
 * @param {DescritorDominio[]} [dominios] - Default: registro ativo (registroDominios.js). Sobrescrever em testes.
 * @returns {Promise<RelatorioExecucao>}
 */
export async function provisionarEstudio(sb, dados, dominios = DOMINIOS_ATIVOS) {
  const iniciadoEm = new Date().toISOString();
  const etapas = [];

  for (const descritor of dominios) {
    try {
      const resultado = await descritor.executar(sb, dados);
      etapas.push(resultado);
    } catch (erro) {
      // Rede de segurança: mesmo que um domínio nunca devesse lançar (todos
      // são desenhados com try/catch interno), o orquestrador não confia
      // cegamente nisso. O identificador vem do descritor (chave estável),
      // nunca de descritor.executar.name.
      etapas.push({
        etapa: descritor.chave,
        status: "erro",
        erro: obterMensagemErro(erro),
      });
    }
  }

  const concluidoEm = new Date().toISOString();

  return montarRelatorio({
    authUserId: dados.authUserId,
    etapas,
    iniciadoEm,
    concluidoEm,
    versaoProvisionamento: VERSAO_PROVISIONAMENTO_ATUAL,
  });
}
