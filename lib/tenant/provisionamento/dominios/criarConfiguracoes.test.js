// lib/tenant/provisionamento/dominios/criarConfiguracoes.test.js
//
// node:test nativo, mesma filosofia de criarPipeline.test.js. Rodar com:
//   node --test lib/tenant/provisionamento/dominios/criarConfiguracoes.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { criarConfiguracoes } from "./criarConfiguracoes.js";

const DADOS_VALIDOS = {
  authUserId: "55555555-5555-5555-5555-555555555555",
};

/**
 * Cliente Supabase falso. Cobre apenas o que este domínio usa:
 *   .from("configuracoes").select("id").eq("user_id",...).limit(1).maybeSingle()
 *   .from("configuracoes").insert({ user_id })
 * update()/delete()/upsert() lançam exceção se chamados -- prova viva de
 * que este domínio nunca tenta nenhum dos três.
 */
function criarSbFalso({ linhaExistenteId = null, erroSelect = null, erroInsert = null } = {}) {
  const chamadas = { selects: 0, inserts: [] };
  return {
    from(tabela) {
      if (tabela !== "configuracoes") throw new Error(`tabela inesperada no teste: ${tabela}`);
      return {
        select(colunas) {
          return {
            eq(_coluna, _valor) {
              return {
                limit(_n) {
                  return {
                    async maybeSingle() {
                      chamadas.selects++;
                      if (erroSelect) return { data: null, error: erroSelect };
                      return { data: linhaExistenteId ? { id: linhaExistenteId } : null, error: null };
                    },
                  };
                },
              };
            },
          };
        },
        async insert(payload) {
          chamadas.inserts.push(payload);
          if (erroInsert) return { data: null, error: erroInsert };
          return { data: null, error: null };
        },
        update() {
          throw new Error("criarConfiguracoes() nunca deve chamar update()");
        },
        delete() {
          throw new Error("criarConfiguracoes() nunca deve chamar delete()");
        },
        upsert() {
          throw new Error("criarConfiguracoes() nunca deve chamar upsert() -- UNIQUE(user_id) ainda não existe");
        },
      };
    },
    _chamadas: chamadas,
  };
}

test("retorna erro sem chamar o banco quando falta authUserId", async () => {
  const sb = criarSbFalso();
  const resultado = await criarConfiguracoes(sb, {});
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /authUserId/);
  assert.equal(sb._chamadas.selects, 0);
  assert.equal(sb._chamadas.inserts.length, 0);
});

test("linha inexistente: cria via INSERT", async () => {
  const sb = criarSbFalso({ linhaExistenteId: null });
  const resultado = await criarConfiguracoes(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "garantido");
  assert.equal(resultado.detalhe.jaExistia, false);
  assert.equal(sb._chamadas.inserts.length, 1);
});

test("o INSERT contém exclusivamente user_id -- nenhum outro campo", async () => {
  const sb = criarSbFalso({ linhaExistenteId: null });
  await criarConfiguracoes(sb, DADOS_VALIDOS);
  const payload = sb._chamadas.inserts[0];
  assert.deepEqual(Object.keys(payload), ["user_id"]);
  assert.equal(payload.user_id, DADOS_VALIDOS.authUserId);
});

test("linha já existente: não insere de novo", async () => {
  const sb = criarSbFalso({ linhaExistenteId: "cfg-existente-1" });
  const resultado = await criarConfiguracoes(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "garantido");
  assert.equal(resultado.detalhe.jaExistia, true);
  assert.equal(sb._chamadas.inserts.length, 0);
});

test("linha já existente: nunca chama update() -- o próprio fake lançaria se chamasse", async () => {
  const sb = criarSbFalso({ linhaExistenteId: "cfg-existente-1" });
  await assert.doesNotReject(() => criarConfiguracoes(sb, DADOS_VALIDOS));
});

test("linha já existente: nunca chama delete() -- o próprio fake lançaria se chamasse", async () => {
  const sb = criarSbFalso({ linhaExistenteId: "cfg-existente-1" });
  await assert.doesNotReject(() => criarConfiguracoes(sb, DADOS_VALIDOS));
});

test("erro no SELECT vira EtapaResultado de erro, sem tentar INSERT", async () => {
  const sb = criarSbFalso({ erroSelect: { message: "falha simulada no select" } });
  const resultado = await criarConfiguracoes(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /falha simulada no select/);
  assert.equal(sb._chamadas.inserts.length, 0);
});

test("erro no INSERT vira EtapaResultado de erro", async () => {
  const sb = criarSbFalso({ linhaExistenteId: null, erroInsert: { message: "falha simulada no insert" } });
  const resultado = await criarConfiguracoes(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /falha simulada no insert/);
});

test("contrato de retorno só usa 'garantido' ou 'erro'", async () => {
  const sb = criarSbFalso({ linhaExistenteId: null });
  const resultado = await criarConfiguracoes(sb, DADOS_VALIDOS);
  assert.ok(["garantido", "erro"].includes(resultado.status));
});

test("reexecução (linha já existente) preserva a configuração -- não sobrescreve onboarding já preenchido", async () => {
  const sb = criarSbFalso({ linhaExistenteId: "cfg-com-onboarding-preenchido" });
  const primeira = await criarConfiguracoes(sb, DADOS_VALIDOS);
  const segunda = await criarConfiguracoes(sb, DADOS_VALIDOS);
  assert.equal(primeira.status, "garantido");
  assert.equal(segunda.status, "garantido");
  assert.equal(primeira.detalhe.jaExistia, true);
  assert.equal(segunda.detalhe.jaExistia, true);
  assert.equal(sb._chamadas.inserts.length, 0);
});
