// lib/tenant/provisionamento/provisionarEstudio.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { provisionarEstudio } from "./provisionarEstudio.js";
import { criarIdentidade } from "./dominios/criarIdentidade.js";
import { criarLicenciamento } from "./dominios/criarLicenciamento.js";
import { criarFinanceiro } from "./dominios/criarFinanceiro.js";

const DADOS = {
  authUserId: "33333333-3333-3333-3333-333333333333",
  email: "estudio@exemplo.com",
  nomeEstudio: "Estúdio Exemplo",
  nomeResponsavel: "Fulana de Tal",
  slug: "estudio-exemplo",
};

// sb falso — não é usado por descritores falsos, mas a assinatura de
// provisionarEstudio exige um valor.
const SB_INERTE = {};

test("executa todos os domínios registrados, na ordem, e agrega as etapas", async () => {
  const ordem = [];
  const dominiosFalsos = [
    { chave: "a", nome: "A", executar: async () => { ordem.push("a"); return { etapa: "a", status: "garantido" }; } },
    { chave: "b", nome: "B", executar: async () => { ordem.push("b"); return { etapa: "b", status: "garantido" }; } },
  ];
  const relatorio = await provisionarEstudio(SB_INERTE, DADOS, dominiosFalsos);
  assert.deepEqual(ordem, ["a", "b"]);
  assert.equal(relatorio.etapas.length, 2);
  assert.equal(relatorio.sucesso, true);
});

test("continua executando as demais etapas mesmo quando uma retorna erro", async () => {
  const dominiosFalsos = [
    { chave: "a", nome: "A", executar: async () => ({ etapa: "a", status: "erro", erro: "falhou de propósito" }) },
    { chave: "b", nome: "B", executar: async () => ({ etapa: "b", status: "garantido" }) },
  ];
  const relatorio = await provisionarEstudio(SB_INERTE, DADOS, dominiosFalsos);
  assert.equal(relatorio.etapas.length, 2, "a etapa b não deve ser pulada por causa do erro na etapa a");
  assert.equal(relatorio.etapas[0].status, "erro");
  assert.equal(relatorio.etapas[1].status, "garantido");
  assert.equal(relatorio.sucesso, false);
});

test("converte uma exceção não capturada pelo domínio num EtapaResultado de erro, usando a chave do descritor (não function.name)", async () => {
  async function funcaoComNomeQualquer() {
    throw new Error("bug inesperado dentro do domínio");
  }
  const dominiosFalsos = [
    { chave: "chave-estavel", nome: "Nome Legível", executar: funcaoComNomeQualquer },
  ];
  const relatorio = await provisionarEstudio(SB_INERTE, DADOS, dominiosFalsos);
  assert.equal(relatorio.etapas[0].etapa, "chave-estavel");
  assert.equal(relatorio.etapas[0].status, "erro");
  assert.equal(relatorio.etapas[0].erro, "bug inesperado dentro do domínio");
});

test("uma exceção com objeto simples (não Error) vira JSON legível, nunca '[object Object]'", async () => {
  const dominiosFalsos = [
    { chave: "x", nome: "X", executar: async () => { throw { codigo: "FALHA_X", detalhe: "algo específico" }; } },
  ];
  const relatorio = await provisionarEstudio(SB_INERTE, DADOS, dominiosFalsos);
  assert.equal(relatorio.etapas[0].status, "erro");
  assert.notEqual(relatorio.etapas[0].erro, "[object Object]");
  assert.equal(relatorio.etapas[0].erro, JSON.stringify({ codigo: "FALHA_X", detalhe: "algo específico" }));
});

test("uma exceção como string simples é preservada como está", async () => {
  const dominiosFalsos = [
    { chave: "y", nome: "Y", executar: async () => { throw "mensagem de erro em texto puro"; } },
  ];
  const relatorio = await provisionarEstudio(SB_INERTE, DADOS, dominiosFalsos);
  assert.equal(relatorio.etapas[0].erro, "mensagem de erro em texto puro");
});

test("uma exceção também não interrompe as etapas seguintes", async () => {
  const dominiosFalsos = [
    { chave: "a", nome: "A", executar: async () => { throw new Error("explodiu"); } },
    { chave: "b", nome: "B", executar: async () => ({ etapa: "b", status: "garantido" }) },
  ];
  const relatorio = await provisionarEstudio(SB_INERTE, DADOS, dominiosFalsos);
  assert.equal(relatorio.etapas.length, 2);
  assert.equal(relatorio.etapas[1].status, "garantido");
});

test("relatório inclui versaoProvisionamento, authUserId e os dois timestamps", async () => {
  const relatorio = await provisionarEstudio(SB_INERTE, DADOS, []);
  assert.equal(relatorio.authUserId, DADOS.authUserId);
  assert.match(relatorio.versaoProvisionamento, /^\d+\.\d+\.\d+$/);
  assert.ok(relatorio.iniciadoEm);
  assert.ok(relatorio.concluidoEm);
});

test("lista vazia de domínios produz relatório vazio e NÃO bem-sucedido (evita o falso-positivo de [].every(...) === true)", async () => {
  const relatorio = await provisionarEstudio(SB_INERTE, DADOS, []);
  assert.deepEqual(relatorio.etapas, []);
  assert.equal(relatorio.sucesso, false);
});

test("integração: sem terceiro parâmetro, usa o registro real (DOMINIOS_ATIVOS) e executa os três domínios congelados de ponta a ponta", async () => {
  // Combina os fakes já usados nos testes de cada domínio, roteados por tabela.
  const tabelaInkClientes = new Map();
  const tabelaLicencas = new Map();
  const tabelaCategorias = new Map();
  const tabelaFormasPagamento = new Map();
  let proximoIdLicenca = 1;

  const sb = {
    from(nomeTabela) {
      if (nomeTabela === "ink_clientes") {
        return {
          upsert(payload) {
            return {
              select: () => ({
                async single() {
                  const existente = tabelaInkClientes.get(payload.auth_user_id);
                  const linha = existente ? { ...existente, ...payload } : { id: "id-identidade", ...payload };
                  tabelaInkClientes.set(payload.auth_user_id, linha);
                  return { data: linha, error: null };
                },
              }),
            };
          },
        };
      }
      if (nomeTabela === "categorias_financeiras") {
        return {
          async upsert(payload) {
            for (const item of payload) tabelaCategorias.set(`${item.tipo}:${item.chave_sistema}`, item);
            return { data: null, error: null };
          },
        };
      }
      if (nomeTabela === "formas_pagamento") {
        return {
          async upsert(payload) {
            for (const item of payload) tabelaFormasPagamento.set(item.chave_sistema, item);
            return { data: null, error: null };
          },
        };
      }
      if (nomeTabela === "licencas") {
        return {
          select(_cols) {
            return {
              eq(_c, valor) {
                return {
                  async maybeSingle() {
                    const achou = [...tabelaLicencas.values()].find((l) => l.user_id === valor);
                    return { data: achou ? { id: achou.id } : null, error: null };
                  },
                };
              },
              ilike(_c, valor) {
                return {
                  async limit() {
                    const achadas = [...tabelaLicencas.values()].filter(
                      (l) => l.email && l.email.toLowerCase() === valor.toLowerCase()
                    );
                    return { data: achadas.map((l) => ({ id: l.id })), error: null };
                  },
                };
              },
            };
          },
          update(payload) {
            return {
              eq(_c, id) {
                return {
                  select: () => ({
                    async single() {
                      const linha = tabelaLicencas.get(id);
                      Object.assign(linha, payload);
                      return { data: linha, error: null };
                    },
                  }),
                };
              },
            };
          },
          insert(payload) {
            return {
              select: () => ({
                async single() {
                  const id = `licenca-${proximoIdLicenca++}`;
                  const linha = { id, ...payload };
                  tabelaLicencas.set(id, linha);
                  return { data: linha, error: null };
                },
              }),
            };
          },
        };
      }
      throw new Error(`tabela inesperada no teste: ${nomeTabela}`);
    },
  };

  const relatorio = await provisionarEstudio(sb, DADOS);

  assert.equal(relatorio.etapas.length, 3);
  assert.equal(relatorio.etapas[0].etapa, "identidade");
  assert.equal(relatorio.etapas[1].etapa, "licenciamento");
  assert.equal(relatorio.etapas[2].etapa, "financeiro");
  assert.equal(relatorio.sucesso, true);
  assert.equal(tabelaInkClientes.size, 1);
  assert.equal(tabelaLicencas.size, 1);
  assert.equal(tabelaCategorias.size, 13);
  assert.equal(tabelaFormasPagamento.size, 7);

  // Confirma que criarIdentidade/criarLicenciamento/criarFinanceiro continuam
  // com a mesma assinatura que o registro espera (documentação viva do
  // contrato).
  assert.equal(typeof criarIdentidade, "function");
  assert.equal(typeof criarLicenciamento, "function");
  assert.equal(typeof criarFinanceiro, "function");
});
