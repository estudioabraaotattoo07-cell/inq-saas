// lib/tenant/provisionamento/relatorio/tiposRelatorio.js
// Formato padronizado que toda etapa de domínio devolve. Ver arquitetura
// aprovada no Bloco 2.0 — este é o contrato que permite log/depuração e
// self-healing lerem o resultado de qualquer domínio da mesma forma.

/**
 * status usa "garantido", não "criado"/"ja_existia": via REST puro (upsert
 * por onConflict), não há como provar de forma objetiva se a linha acabou
 * de nascer ou já existia — só que ela existe agora, com os dados
 * informados. O contrato nunca afirma o que a implementação não consegue
 * garantir. Distinguir insert de update exigiria SQL bruto (ex: xmax) ou
 * uma função no banco, fora do que qualquer domínio deste módulo usa hoje.
 *
 * @typedef {Object} EtapaResultado
 * @property {string} etapa            - Nome canônico da etapa (ex: "identidade").
 * @property {"garantido"|"erro"} status
 * @property {object} [detalhe]        - O registro garantido, quando fizer sentido logar.
 * @property {string} [erro]           - Só presente quando status === "erro".
 * @property {number} [duracaoMs]
 */

/**
 * @typedef {Object} RelatorioExecucao
 * @property {string} versaoProvisionamento  - Ex: "1.0.0". Ver versao.js.
 * @property {string} authUserId
 * @property {string} iniciadoEm             - ISO
 * @property {string} concluidoEm            - ISO
 * @property {boolean} sucesso               - true só se TODAS as etapas forem "garantido".
 * @property {EtapaResultado[]} etapas       - Uma entrada por descritor executado, na ordem em que rodaram.
 */

export {};
