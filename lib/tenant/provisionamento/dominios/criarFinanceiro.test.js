// lib/tenant/provisionamento/dominios/criarFinanceiro.test.js
//
// node:test nativo, mesma filosofia de criarIdentidade.test.js /
// criarLicenciamento.test.js. Rodar com:
//   node --test lib/tenant/provisionamento/dominios/criarFinanceiro.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { criarFinanceiro } from "./criarFinanceiro.js";

const DADOS_VALIDOS = {
  authUserId: "33333333-3333-3333-3333-333333333333",
};

/**
 * Cliente Supabase falso. Cobre apenas o que este domínio usa:
 *   .from(tabela).upsert(payload, { onConflict, ignoreDuplicates })
 * Sem .select() encadeado — o próprio domínio não encadeia, então o
 * fake não precisa (nem deve) oferecer esse método.
 */
function criarSbFalso({ forcarErroCategorias = null, forcarErroFormas = null } = {}) {
  const chamadas = [];
  return {
    from(tabela) {
      return {
        async upsert(payload, opcoes) {
          chamadas.push({ tabela, payload, opcoes });
          if (tabela === "categorias_financeiras" && forcarErroCategorias) {
            return { data: null, error: forcarErroCategorias };
          }
          if (tabela === "formas_pagamento" && forcarErroFormas) {
            return { data: null, error: forcarErroFormas };
          }
          return { data: null, error: null };
        },
      };
    },
    _chamadas: chamadas,
  };
}

test("retorna erro sem chamar o banco quando falta authUserId", async () => {
  const sb = criarSbFalso();
  const resultado = await criarFinanceiro(sb, {});
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /authUserId/);
  assert.equal(sb._chamadas.length, 0);
});

test("garante categorias e formas de pagamento padrão com sucesso", async () => {
  const sb = criarSbFalso();
  const resultado = await criarFinanceiro(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "garantido");
  assert.equal(resultado.detalhe.categoriasProcessadas, 13);
  assert.equal(resultado.detalhe.formasProcessadas, 7);
  assert.equal(sb._chamadas.length, 2);
});

test("cada item enviado inclui user_id e origem sistema", async () => {
  const sb = criarSbFalso();
  await criarFinanceiro(sb, DADOS_VALIDOS);
  const chamadaCategorias = sb._chamadas.find((c) => c.tabela === "categorias_financeiras");
  const chamadaFormas = sb._chamadas.find((c) => c.tabela === "formas_pagamento");

  for (const item of chamadaCategorias.payload) {
    assert.equal(item.user_id, DADOS_VALIDOS.authUserId);
    assert.equal(item.origem, "sistema");
    assert.ok(item.tipo === "entrada" || item.tipo === "saida");
  }
  for (const item of chamadaFormas.payload) {
    assert.equal(item.user_id, DADOS_VALIDOS.authUserId);
    assert.equal(item.origem, "sistema");
  }
});

test("usa o onConflict correto para cada tabela, com ignoreDuplicates", async () => {
  const sb = criarSbFalso();
  await criarFinanceiro(sb, DADOS_VALIDOS);
  const chamadaCategorias = sb._chamadas.find((c) => c.tabela === "categorias_financeiras");
  const chamadaFormas = sb._chamadas.find((c) => c.tabela === "formas_pagamento");

  assert.equal(chamadaCategorias.opcoes.onConflict, "user_id,tipo,chave_sistema");
  assert.equal(chamadaCategorias.opcoes.ignoreDuplicates, true);
  assert.equal(chamadaFormas.opcoes.onConflict, "user_id,chave_sistema");
  assert.equal(chamadaFormas.opcoes.ignoreDuplicates, true);
});

test("erro em categorias_financeiras não impede a tentativa em formas_pagamento", async () => {
  const sb = criarSbFalso({ forcarErroCategorias: { message: "falha simulada em categorias" } });
  const resultado = await criarFinanceiro(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /categorias_financeiras/);
  assert.equal(sb._chamadas.length, 2, "formas_pagamento também deve ter sido tentada");
});

test("erro em formas_pagamento não impede a tentativa em categorias_financeiras", async () => {
  const sb = criarSbFalso({ forcarErroFormas: { message: "falha simulada em formas" } });
  const resultado = await criarFinanceiro(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /formas_pagamento/);
  assert.equal(sb._chamadas.length, 2, "categorias_financeiras também deve ter sido tentada");
});

test("erro em ambas as tabelas retorna mensagem combinada", async () => {
  const sb = criarSbFalso({
    forcarErroCategorias: { message: "falha simulada em categorias" },
    forcarErroFormas: { message: "falha simulada em formas" },
  });
  const resultado = await criarFinanceiro(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /categorias_financeiras/);
  assert.match(resultado.erro, /formas_pagamento/);
});

test("chamar duas vezes seguidas para o mesmo authUserId não gera comportamento diferente (idempotência é do banco, não deste teste)", async () => {
  const sb = criarSbFalso();
  const primeira = await criarFinanceiro(sb, DADOS_VALIDOS);
  const segunda = await criarFinanceiro(sb, DADOS_VALIDOS);
  assert.equal(primeira.status, "garantido");
  assert.equal(segunda.status, "garantido");
  assert.equal(sb._chamadas.length, 4);
});

test("contrato de retorno só usa 'garantido' ou 'erro'", async () => {
  const sb = criarSbFalso();
  const resultado = await criarFinanceiro(sb, DADOS_VALIDOS);
  assert.ok(["garantido", "erro"].includes(resultado.status));
});
