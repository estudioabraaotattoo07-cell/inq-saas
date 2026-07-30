// lib/tenant/provisionamento/dominios/criarFinanceiro.js
//
// Garante as categorias financeiras e formas de pagamento padrão do
// tenant, em categorias_financeiras e formas_pagamento. Não sabe o que é
// HTTP, painel administrativo, onboarding, Vercel ou endpoint.
//
// Dados-padrão e padrão de UPSERT copiados diretamente de
// `src/CRM Casa dos Carvalho.tsx` (DEFAULT_CATEGORIAS_FINANCEIRAS,
// DEFAULT_FORMAS_PAGAMENTO, linhas 27-51; seed em produção, linhas
// 2650-2664) — confirmados por leitura direta do arquivo em 30/07/2026,
// não reconstruídos de memória. Mesmas constraints que já sustentam esse
// padrão em produção: UNIQUE(user_id,tipo,chave_sistema) em
// categorias_financeiras (Migration 003A) e UNIQUE(user_id,chave_sistema)
// em formas_pagamento (Migration 003B), ambas já aplicadas (Bloco 2.2,
// commit 24e3e1a).
//
// Idempotente por construção: upsert com ignoreDuplicates:true vira
// "ON CONFLICT DO NOTHING" — o que já existe (inclusive editado pelo
// tenant) nunca é sobrescrito; só o que falta é inserido.
//
// Sem .select() encadeado — mesmo padrão já usado em produção para este
// tipo de upsert em lote. Um ON CONFLICT DO NOTHING que não insere nada
// não tem linha pra retornar; encadear .select() aqui arriscaria um erro
// mesmo em caso de sucesso. Por isso `detalhe` do EtapaResultado registra
// só a contagem de itens processados, não as linhas em si.
//
// As duas tabelas são independentes entre si — um erro numa não impede a
// tentativa na outra; o status final só é "garantido" se ambas tiverem
// sucesso.

import { NOME_ETAPA_FINANCEIRO } from "../constantes.js";

const DEFAULT_CATEGORIAS_FINANCEIRAS = [
  { chave_sistema: "sessao", nome: "Sessão", tipo: "entrada" },
  { chave_sistema: "sinal", nome: "Sinal", tipo: "entrada" },
  { chave_sistema: "venda_avulsa", nome: "Venda Avulsa", tipo: "entrada" },
  { chave_sistema: "outro", nome: "Outro", tipo: "entrada" },
  { chave_sistema: "repasse_comissao", nome: "Repasse de Comissão", tipo: "saida" },
  { chave_sistema: "material", nome: "Material", tipo: "saida" },
  { chave_sistema: "energia", nome: "Energia", tipo: "saida" },
  { chave_sistema: "internet", nome: "Internet", tipo: "saida" },
  { chave_sistema: "manutencao", nome: "Manutenção", tipo: "saida" },
  { chave_sistema: "marketing", nome: "Marketing", tipo: "saida" },
  { chave_sistema: "pro_labore", nome: "Pró-labore", tipo: "saida" },
  { chave_sistema: "aluguel", nome: "Aluguel", tipo: "saida" },
  { chave_sistema: "outro", nome: "Outro", tipo: "saida" },
];

const DEFAULT_FORMAS_PAGAMENTO = [
  { chave_sistema: "pix", nome: "Pix" },
  { chave_sistema: "dinheiro", nome: "Dinheiro" },
  { chave_sistema: "cartao_debito", nome: "Cartão de Débito" },
  { chave_sistema: "cartao_credito", nome: "Cartão de Crédito" },
  { chave_sistema: "transferencia", nome: "Transferência" },
  { chave_sistema: "permuta", nome: "Permuta" },
  { chave_sistema: "outro", nome: "Outro" },
];

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
export async function criarFinanceiro(sb, dados) {
  const inicio = Date.now();

  const camposFaltando = validarCamposObrigatorios(dados);
  if (camposFaltando.length > 0) {
    return {
      etapa: NOME_ETAPA_FINANCEIRO,
      status: "erro",
      erro: `Campos obrigatórios ausentes: ${camposFaltando.join(", ")}`,
      duracaoMs: Date.now() - inicio,
    };
  }

  try {
    const { error: erroCategorias } = await sb.from("categorias_financeiras").upsert(
      DEFAULT_CATEGORIAS_FINANCEIRAS.map((c) => ({ ...c, user_id: dados.authUserId, origem: "sistema" })),
      { onConflict: "user_id,tipo,chave_sistema", ignoreDuplicates: true }
    );

    const { error: erroFormas } = await sb.from("formas_pagamento").upsert(
      DEFAULT_FORMAS_PAGAMENTO.map((f) => ({ ...f, user_id: dados.authUserId, origem: "sistema" })),
      { onConflict: "user_id,chave_sistema", ignoreDuplicates: true }
    );

    if (erroCategorias || erroFormas) {
      const mensagens = [];
      if (erroCategorias) mensagens.push(`categorias_financeiras: ${erroCategorias.message}`);
      if (erroFormas) mensagens.push(`formas_pagamento: ${erroFormas.message}`);
      return {
        etapa: NOME_ETAPA_FINANCEIRO,
        status: "erro",
        erro: mensagens.join(" | "),
        duracaoMs: Date.now() - inicio,
      };
    }

    return {
      etapa: NOME_ETAPA_FINANCEIRO,
      status: "garantido",
      detalhe: {
        categoriasProcessadas: DEFAULT_CATEGORIAS_FINANCEIRAS.length,
        formasProcessadas: DEFAULT_FORMAS_PAGAMENTO.length,
      },
      duracaoMs: Date.now() - inicio,
    };
  } catch (erro) {
    return {
      etapa: NOME_ETAPA_FINANCEIRO,
      status: "erro",
      erro: erro?.message || String(erro),
      duracaoMs: Date.now() - inicio,
    };
  }
}
