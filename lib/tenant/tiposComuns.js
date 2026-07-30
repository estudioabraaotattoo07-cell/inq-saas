// lib/tenant/tiposComuns.js
// Formas de dado compartilhadas entre domínios do ciclo de vida do tenant
// (não só provisionamento — pensado para ser reaproveitado por futuras fases
// como ativação, suspensão, reativação). Ver arquitetura aprovada no
// Bloco 2.0.

/**
 * Dados que qualquer domínio de provisionamento pode precisar. Nem todo
 * domínio usa todos os campos — cada um lê só o que precisa.
 *
 * @typedef {Object} DadosProvisionamento
 * @property {string} authUserId  - UUID do Supabase Auth. Único campo que amarra tudo.
 * @property {string} email
 * @property {string} nomeEstudio
 * @property {string} nomeResponsavel
 * @property {string} slug        - Endereço público do tenant. NOT NULL em ink_clientes hoje;
 *                                   ver nota em criarIdentidade.js sobre por que este domínio
 *                                   não gera esse valor sozinho.
 * @property {string} [plano]
 * @property {string} [status]
 * @property {string} [dataInicio]      - Usado por criarLicenciamento(). Formato ISO (YYYY-MM-DD).
 * @property {string} [dataVencimento]  - Usado por criarLicenciamento(). Formato ISO (YYYY-MM-DD).
 */

export {};
