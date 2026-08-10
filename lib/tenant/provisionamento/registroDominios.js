// lib/tenant/provisionamento/registroDominios.js
//
// Lista dos domínios ativos do provisionamento — dados, não lógica. O
// orquestrador (provisionarEstudio.js) nunca importa um domínio pelo nome;
// ele só itera sobre esta lista. Adicionar um domínio novo é: escrever o
// arquivo em dominios/, e acrescentar um descritor aqui. Nada muda no
// orquestrador.
//
// Cada descritor tem:
//   chave     — identificador técnico estável (usado se o domínio lançar
//               uma exceção não prevista, em vez de function.name — ver
//               Bloco 2.5, Ajuste 1).
//   nome      — nome legível, para relatório/log humano.
//   executar  — a função do domínio: async (sb, dados) => EtapaResultado.
//
// Campos reservados para evolução futura (não lidos pelo orquestrador
// nesta versão — ver Bloco 2.5, Ajuste 2): obrigatorio, dependeDe.

import { criarIdentidade } from "./dominios/criarIdentidade.js";
import { criarLicenciamento } from "./dominios/criarLicenciamento.js";
import { criarFinanceiro } from "./dominios/criarFinanceiro.js";
import { criarPipeline } from "./dominios/criarPipeline.js";

export const DOMINIOS_ATIVOS = [
  {
    chave: "identidade",
    nome: "Criar identidade",
    executar: criarIdentidade,
  },
  {
    chave: "licenciamento",
    nome: "Criar licenciamento",
    executar: criarLicenciamento,
  },
  {
    chave: "financeiro",
    nome: "Criar financeiro",
    executar: criarFinanceiro,
  },
  {
    chave: "pipeline",
    nome: "Criar pipeline",
    executar: criarPipeline,
  },
  // futuro: criarConfiguracoes, criarSite
];
