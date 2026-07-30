// lib/tenant/provisionamento/dominios/criarIdentidade.test.js
//
// Testes básicos, sem framework novo — usa node:test (nativo do Node 18+),
// mesma filosofia "sem build step" já usada em todo o api/. Rodar com:
//   node --test lib/tenant/provisionamento/dominios/criarIdentidade.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { criarIdentidade } from "./criarIdentidade.js";

const DADOS_VALIDOS = {
  authUserId: "11111111-1111-1111-1111-111111111111",
  email: "estudio@exemplo.com",
  nomeEstudio: "Estúdio Exemplo",
  nomeResponsavel: "Fulana de Tal",
  slug: "estudio-exemplo",
};

/**
 * Cliente Supabase falso — só o suficiente pra cobrir .from().upsert()
 * .select().single(), que é a única chamada que criarIdentidade faz hoje.
 * `linhasExistentes` simula linhas já presentes na tabela.
 */
function criarSbFalso({ linhasExistentes = [], forcarErroUpsert = null } = {}) {
  const tabela = new Map(linhasExistentes.map((l) => [l.auth_user_id, { ...l }]));
  return {
    from(_tabela) {
      return {
        upsert(payload) {
          return {
            select() {
              return {
                async single() {
                  if (forcarErroUpsert) return { data: null, error: forcarErroUpsert };
                  const existente = tabela.get(payload.auth_user_id);
                  const linha = existente ? { ...existente, ...payload } : { id: "novo-id", ...payload };
                  tabela.set(payload.auth_user_id, linha);
                  return { data: linha, error: null };
                },
              };
            },
          };
        },
      };
    },
    _tabela: tabela,
  };
}

test("retorna erro sem chamar o banco quando falta campo obrigatório", async () => {
  const sb = criarSbFalso();
  const resultado = await criarIdentidade(sb, { ...DADOS_VALIDOS, email: "" });
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /email/);
});

test("garante o tenant quando ele ainda não existe (um único round-trip)", async () => {
  const sb = criarSbFalso({ linhasExistentes: [] });
  const resultado = await criarIdentidade(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "garantido");
  assert.equal(resultado.detalhe.auth_user_id, DADOS_VALIDOS.authUserId);
});

test("garante o tenant quando ele já existia, sem duplicar — mesmo rótulo, não afirma qual dos dois aconteceu", async () => {
  const sb = criarSbFalso({
    linhasExistentes: [{ id: "id-existente", auth_user_id: DADOS_VALIDOS.authUserId }],
  });
  const resultado = await criarIdentidade(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "garantido");
  assert.equal(sb._tabela.size, 1, "não deve duplicar a linha");
});

test("aplica plano e status padrão quando não informados", async () => {
  const sb = criarSbFalso();
  const resultado = await criarIdentidade(sb, DADOS_VALIDOS);
  assert.equal(resultado.detalhe.plano, "Bronze");
  assert.equal(resultado.detalhe.status, "ativo");
});

test("respeita plano e status explícitos quando informados", async () => {
  const sb = criarSbFalso();
  const resultado = await criarIdentidade(sb, { ...DADOS_VALIDOS, plano: "Ouro", status: "trial" });
  assert.equal(resultado.detalhe.plano, "Ouro");
  assert.equal(resultado.detalhe.status, "trial");
});

test("captura erro de upsert e retorna status erro", async () => {
  const sb = criarSbFalso({ forcarErroUpsert: { message: "falha simulada no upsert" } });
  const resultado = await criarIdentidade(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.equal(resultado.erro, "falha simulada no upsert");
});

test("chamar várias vezes é idempotente nos dados, sempre com o mesmo rótulo honesto", async () => {
  const sb = criarSbFalso();
  const primeira = await criarIdentidade(sb, DADOS_VALIDOS);
  const segunda = await criarIdentidade(sb, DADOS_VALIDOS);
  const terceira = await criarIdentidade(sb, DADOS_VALIDOS);

  assert.equal(primeira.status, "garantido");
  assert.equal(segunda.status, "garantido");
  assert.equal(terceira.status, "garantido");
  assert.equal(sb._tabela.size, 1, "nunca duplica, em nenhuma chamada");
});

test("não faz nenhuma leitura antes do upsert (um único round-trip)", async () => {
  let chamadasAoFrom = 0;
  const sbContando = {
    from(_nomeTabela) {
      chamadasAoFrom++;
      return {
        upsert(payload) {
          return {
            select: () => ({
              single: async () => ({ data: { id: "novo-id", ...payload }, error: null }),
            }),
          };
        },
      };
    },
  };
  await criarIdentidade(sbContando, DADOS_VALIDOS);
  assert.equal(chamadasAoFrom, 1, "sb.from() deve ser chamado exatamente uma vez por execução");
});

test("contrato de retorno nunca usa os rótulos antigos 'criado'/'ja_existia'", async () => {
  const sb = criarSbFalso();
  const resultado = await criarIdentidade(sb, DADOS_VALIDOS);
  assert.ok(["garantido", "erro"].includes(resultado.status));
});
