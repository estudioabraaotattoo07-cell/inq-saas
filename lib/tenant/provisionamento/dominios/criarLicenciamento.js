// lib/tenant/provisionamento/dominios/criarLicenciamento.js
//
// Garante a existência do registro de licenciamento do tenant em licencas.
// Não sabe o que é HTTP, painel administrativo, onboarding, Vercel ou
// endpoint — recebe um cliente Supabase já pronto e os dados necessários,
// e devolve um EtapaResultado padronizado, no mesmo contrato de
// criarIdentidade.js.
//
// PRÉ-CONDIÇÃO DE USO, PROTEGIDA PELO PRÓPRIO CÓDIGO (não só documentada):
// este domínio busca a licença por `user_id` — nunca vincula por e-mail.
// Ele é seguro para provisionar TENANTS NOVOS a partir de agora (nenhuma
// ambiguidade possível: auth_user_id é único por definição). Para proteger
// contra o uso indevido — alguém reaproveitar este domínio pra um tenant
// antigo, cuja licença só está vinculada por e-mail (user_id ainda nulo) —
// antes de inserir uma linha nova, o código verifica se já existe alguma
// licença com o mesmo e-mail. Se existir, é sinal de que este não é um
// tenant genuinamente novo: a função recusa a inserção automática e retorna
// erro, em vez de criar uma linha duplicada silenciosamente. O e-mail nunca
// é usado para decidir um vínculo (isso é o que causava o risco corrigido
// na revisão anterior) — só para detectar a situação e recusar agir.
//
// Essa proteção deixa de ser acionada sozinha assim que a migração formal
// de backfill (Bloco 2.1.5) rodar: tenants antigos passam a ter user_id
// preenchido, e a busca por user_id (primeiro passo) já os encontra
// diretamente, sem nunca chegar nesta checagem.
//
// Por que a busca não usa e-mail como fallback de vínculo (decisão
// revisada numa etapa anterior): a primeira versão deste domínio fazia um
// "backfill orgânico" de user_id ao encontrar uma licença antiga por
// e-mail. Análise crítica revelou um risco real: e-mail pode ser
// compartilhado ou reaproveitado entre tenants diferentes ao longo do
// tempo (contato de suporte, teste antigo, erro de cadastro) — vincular
// automaticamente, sem revisão, arrisca associar a licença ao
// auth_user_id errado. Esse tipo de decisão de identidade ambígua pertence
// à migração formal e revisada de backfill de licencas.user_id, não a um
// efeito colateral automático de domínio de provisionamento.
//
// DIFERENÇA em relação a criarIdentidade(): ainda não é UPSERT de round-trip
// único, porque licencas não tem nenhuma constraint UNIQUE hoje (nem em
// user_id). Para um tenant já existente (achado por user_id): consulta +
// update, dois round-trips. Para um tenant genuinamente novo: consulta por
// user_id + checagem de e-mail + insert, três round-trips — o custo
// adicional da proteção, pago só no caminho de criação, nunca no de
// atualização. Ainda existe uma janela de corrida teórica entre a checagem
// e o insert (duas chamadas simultâneas pro mesmo tenant novo). Assim que a
// migration pendente (UNIQUE(user_id)) for aplicada, este domínio deve
// virar um UPSERT de round-trip único, no mesmo padrão de criarIdentidade(),
// e esta checagem de e-mail deixa de ser necessária.

import { NOME_ETAPA_LICENCIAMENTO, PLANO_PADRAO, STATUS_INICIAL_PADRAO } from "../constantes.js";

/** @typedef {import('../../tiposComuns.js').DadosProvisionamento} DadosProvisionamento */
/** @typedef {import('../relatorio/tiposRelatorio.js').EtapaResultado} EtapaResultado */

const CAMPOS_OBRIGATORIOS = ["authUserId", "email"];

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
export async function criarLicenciamento(sb, dados) {
  const inicio = Date.now();

  const camposFaltando = validarCamposObrigatorios(dados);
  if (camposFaltando.length > 0) {
    return {
      etapa: NOME_ETAPA_LICENCIAMENTO,
      status: "erro",
      erro: `Campos obrigatórios ausentes: ${camposFaltando.join(", ")}`,
      duracaoMs: Date.now() - inicio,
    };
  }

  try {
    // Passo 1 — só por user_id. Sempre seguro: auth_user_id é único.
    const { data: existente, error: erroConsulta } = await sb
      .from("licencas")
      .select("id")
      .eq("user_id", dados.authUserId)
      .maybeSingle();

    if (erroConsulta) throw erroConsulta;

    if (!existente) {
      // Passo 2 (só no caminho de criação) — a proteção: existe alguma
      // licença com este e-mail, mesmo sem user_id bater? Se sim, isto não
      // é um tenant genuinamente novo — recusa, não insere.
      const { data: conflito, error: erroConflito } = await sb
        .from("licencas")
        .select("id")
        .ilike("email", dados.email)
        .limit(1);

      if (erroConflito) throw erroConflito;

      if (conflito && conflito.length > 0) {
        return {
          etapa: NOME_ETAPA_LICENCIAMENTO,
          status: "erro",
          erro:
            "Já existe uma licença com este e-mail, não vinculada a este auth_user_id. " +
            "Este domínio não deve ser usado para recuperar tenants antigos — " +
            "aplique a migração formal de backfill de licencas.user_id antes de provisionar este tenant.",
          duracaoMs: Date.now() - inicio,
        };
      }
    }

    const payload = {
      user_id: dados.authUserId,
      email: dados.email,
      plano: dados.plano || PLANO_PADRAO,
      status: dados.status || STATUS_INICIAL_PADRAO,
      data_inicio: dados.dataInicio || new Date().toISOString().slice(0, 10),
      ...(dados.dataVencimento ? { data_vencimento: dados.dataVencimento } : {}),
    };

    const query = existente
      ? sb.from("licencas").update(payload).eq("id", existente.id)
      : sb.from("licencas").insert(payload);

    const { data, error } = await query.select().single();

    if (error) throw error;

    return {
      etapa: NOME_ETAPA_LICENCIAMENTO,
      status: "garantido",
      detalhe: data,
      duracaoMs: Date.now() - inicio,
    };
  } catch (erro) {
    return {
      etapa: NOME_ETAPA_LICENCIAMENTO,
      status: "erro",
      erro: erro?.message || String(erro),
      duracaoMs: Date.now() - inicio,
    };
  }
}
