// lib/tenant/provisionamento/dominios/criarIdentidade.js
//
// Garante a existência do registro central do tenant em ink_clientes.
// Não sabe o que é HTTP, painel administrativo, onboarding, Vercel ou
// endpoint — recebe um cliente Supabase já pronto e os dados necessários,
// e devolve um EtapaResultado padronizado. Reutilizável por qualquer
// chamador futuro (endpoint, cron de self-healing, script, teste).
//
// Idempotente por construção: usa UPSERT com onConflict:"auth_user_id",
// aproveitando a constraint UNIQUE criada na Migration 002 (Bloco 2.2), num
// único round-trip — nenhum SELECT prévio. auth_user_id é a fonte de
// verdade; a existência da linha nunca depende de uma leitura separada, só
// do resultado atômico deste comando.
//
// DOMÍNIO CONGELADO — estável, revisado e pronto para reutilização pelo
// futuro orquestrador de provisionamento. Ver histórico de revisão no fim
// deste arquivo antes de reabrir qualquer mudança aqui.

import { NOME_ETAPA_IDENTIDADE, PLANO_PADRAO, STATUS_INICIAL_PADRAO } from "../constantes.js";

/** @typedef {import('../../tiposComuns.js').DadosProvisionamento} DadosProvisionamento */
/** @typedef {import('../relatorio/tiposRelatorio.js').EtapaResultado} EtapaResultado */

const CAMPOS_OBRIGATORIOS = ["authUserId", "email", "nomeEstudio", "nomeResponsavel", "slug"];

/**
 * Valida os campos mínimos exigidos por esta etapa. Não valida formato
 * (e-mail bem formado, uuid válido etc.) — isso é responsabilidade de quem
 * monta DadosProvisionamento antes de chamar o domínio.
 *
 * @param {DadosProvisionamento} dados
 * @returns {string[]} lista de campos ausentes (vazia se tudo presente)
 */
function validarCamposObrigatorios(dados) {
  return CAMPOS_OBRIGATORIOS.filter((campo) => {
    const valor = dados?.[campo];
    return valor === undefined || valor === null || valor === "";
  });
}

/**
 * NOTA IMPORTANTE sobre `slug`: a decisão de produto já aprovada é que o
 * endereço público "oficial" do tenant continua sendo confirmado depois,
 * na aba Meu Site — mas a coluna `slug` em ink_clientes é NOT NULL. Este
 * domínio não gera um slug sozinho; espera recebê-lo já pronto em `dados`.
 * Cabe a quem orquestra o provisionamento decidir esse valor inicial (por
 * exemplo, um slug provisório derivado do nome do estúdio). Ver Bloco 2.0,
 * seção 5, para o registro dessa tensão de arquitetura.
 *
 * NOTA SOBRE O CONTRATO DE RETORNO: status só assume "garantido" ou "erro"
 * — nunca "criado" nem "ja_existia". Via REST puro (upsert por onConflict),
 * não há como provar de forma objetiva se a linha acabou de nascer ou já
 * existia (isso exigiria SQL bruto, ex: a coluna de sistema xmax, ou uma
 * função no banco — fora do que este domínio usa). "garantido" afirma
 * exatamente o que é verdade e comprovável: a linha existe agora, com os
 * dados informados. O contrato nunca afirma o que a implementação não
 * consegue garantir.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {DadosProvisionamento} dados
 * @returns {Promise<EtapaResultado>}
 */
export async function criarIdentidade(sb, dados) {
  const inicio = Date.now();

  const camposFaltando = validarCamposObrigatorios(dados);
  if (camposFaltando.length > 0) {
    return {
      etapa: NOME_ETAPA_IDENTIDADE,
      status: "erro",
      erro: `Campos obrigatórios ausentes: ${camposFaltando.join(", ")}`,
      duracaoMs: Date.now() - inicio,
    };
  }

  try {
    const payload = {
      auth_user_id: dados.authUserId,
      email: dados.email,
      nome_estudio: dados.nomeEstudio,
      nome_responsavel: dados.nomeResponsavel,
      slug: dados.slug,
      plano: dados.plano || PLANO_PADRAO,
      status: dados.status || STATUS_INICIAL_PADRAO,
      atualizado_em: new Date().toISOString(),
    };

    const { data, error } = await sb
      .from("ink_clientes")
      .upsert(payload, { onConflict: "auth_user_id" })
      .select()
      .single();

    if (error) throw error;

    return {
      etapa: NOME_ETAPA_IDENTIDADE,
      status: "garantido",
      detalhe: data,
      duracaoMs: Date.now() - inicio,
    };
  } catch (erro) {
    return {
      etapa: NOME_ETAPA_IDENTIDADE,
      status: "erro",
      erro: erro?.message || String(erro),
      duracaoMs: Date.now() - inicio,
    };
  }
}

// ── Histórico de revisão ────────────────────────────────────────────────
// 1. Primeira versão: SELECT prévio + UPSERT, rótulo "criado"/"ja_existia"
//    calculado a partir do SELECT.
// 2. Revisão de concorrência: SELECT eliminado, rótulo passou a ser
//    inferido por heurística de timestamp (criado_em vs atualizado_em).
// 3. Revisão de contrato (esta): heurística removida por completo — o
//    contrato de retorno não afirma mais nada que não possa garantir.
//    status agora é só "garantido" ou "erro".
