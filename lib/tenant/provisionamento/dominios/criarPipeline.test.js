// lib/tenant/provisionamento/dominios/criarPipeline.test.js
//
// node:test nativo, mesma filosofia de criarFinanceiro.test.js. Rodar com:
//   node --test lib/tenant/provisionamento/dominios/criarPipeline.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { criarPipeline } from "./criarPipeline.js";
import { PIPELINE_ETAPAS_PADRAO } from "../../pipelinePadrao.js";

const DADOS_VALIDOS = {
  authUserId: "44444444-4444-4444-4444-444444444444",
};

/**
 * Cliente Supabase falso. Cobre apenas o que este domínio usa:
 *   .from("pipeline_etapas").upsert(payload, { onConflict, ignoreDuplicates })
 * Sem .update()/.delete() — o próprio domínio nunca chama esses métodos.
 */
function criarSbFalso({ forcarErro = null } = {}) {
  const chamadas = [];
  return {
    from(tabela) {
      if (tabela !== "pipeline_etapas") throw new Error(`tabela inesperada no teste: ${tabela}`);
      return {
        async upsert(payload, opcoes) {
          chamadas.push({ tabela, payload, opcoes });
          if (forcarErro) return { data: null, error: forcarErro };
          return { data: null, error: null };
        },
        update() {
          throw new Error("criarPipeline() nunca deve chamar update()");
        },
        delete() {
          throw new Error("criarPipeline() nunca deve chamar delete()");
        },
      };
    },
    _chamadas: chamadas,
  };
}

test("retorna erro sem chamar o banco quando falta authUserId", async () => {
  const sb = criarSbFalso();
  const resultado = await criarPipeline(sb, {});
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /authUserId/);
  assert.equal(sb._chamadas.length, 0);
});

test("garante as 16 etapas padrão com sucesso", async () => {
  const sb = criarSbFalso();
  const resultado = await criarPipeline(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "garantido");
  assert.equal(resultado.detalhe.etapasProcessadas, 16);
  assert.equal(sb._chamadas.length, 1);
  assert.equal(sb._chamadas[0].payload.length, 16);
});

test("todas as 16 linhas recebem o user_id correto", async () => {
  const sb = criarSbFalso();
  await criarPipeline(sb, DADOS_VALIDOS);
  const payload = sb._chamadas[0].payload;
  for (const item of payload) {
    assert.equal(item.user_id, DADOS_VALIDOS.authUserId);
  }
});

test("slugs enviados batem exatamente com PIPELINE_ETAPAS_PADRAO, na mesma ordem", async () => {
  const sb = criarSbFalso();
  await criarPipeline(sb, DADOS_VALIDOS);
  const payload = sb._chamadas[0].payload;
  assert.deepEqual(
    payload.map((p) => p.slug),
    PIPELINE_ETAPAS_PADRAO.map((e) => e.id)
  );
});

test("ordem enviada é 1 a 16, na sequência do array canônico", async () => {
  const sb = criarSbFalso();
  await criarPipeline(sb, DADOS_VALIDOS);
  const payload = sb._chamadas[0].payload;
  assert.deepEqual(payload.map((p) => p.ordem), Array.from({ length: 16 }, (_, i) => i + 1));
});

test("pos_venda_piercing é a única etapa com fixo=false", async () => {
  const sb = criarSbFalso();
  await criarPipeline(sb, DADOS_VALIDOS);
  const payload = sb._chamadas[0].payload;
  const naoFixas = payload.filter((p) => p.fixo === false);
  assert.equal(naoFixas.length, 1);
  assert.equal(naoFixas[0].slug, "pos_venda_piercing");
});

test("as outras 15 etapas têm fixo=true", async () => {
  const sb = criarSbFalso();
  await criarPipeline(sb, DADOS_VALIDOS);
  const payload = sb._chamadas[0].payload;
  const fixas = payload.filter((p) => p.slug !== "pos_venda_piercing");
  assert.equal(fixas.length, 15);
  for (const item of fixas) assert.equal(item.fixo, true);
});

test("hibernacao usa cor literal #666", async () => {
  const sb = criarSbFalso();
  await criarPipeline(sb, DADOS_VALIDOS);
  const payload = sb._chamadas[0].payload;
  const hibernacao = payload.find((p) => p.slug === "hibernacao");
  assert.equal(hibernacao.cor, "#666");
});

test("blacklist está presente no payload", async () => {
  const sb = criarSbFalso();
  await criarPipeline(sb, DADOS_VALIDOS);
  const payload = sb._chamadas[0].payload;
  assert.ok(payload.some((p) => p.slug === "blacklist"));
});

test("usa onConflict e ignoreDuplicates corretos", async () => {
  const sb = criarSbFalso();
  await criarPipeline(sb, DADOS_VALIDOS);
  const { opcoes } = sb._chamadas[0];
  assert.equal(opcoes.onConflict, "user_id,slug");
  assert.equal(opcoes.ignoreDuplicates, true);
});

test("erro do Supabase é propagado como EtapaResultado de erro", async () => {
  const sb = criarSbFalso({ forcarErro: { message: "falha simulada no upsert" } });
  const resultado = await criarPipeline(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /falha simulada no upsert/);
});

test("nenhuma chamada tenta update() ou delete() em linhas existentes", async () => {
  // O próprio fake já lança exceção se update()/delete() forem chamados --
  // se este teste passar sem lançar, é porque criarPipeline() nunca tenta.
  const sb = criarSbFalso();
  await assert.doesNotReject(() => criarPipeline(sb, DADOS_VALIDOS));
});

test("contrato de retorno só usa 'garantido' ou 'erro'", async () => {
  const sb = criarSbFalso();
  const resultado = await criarPipeline(sb, DADOS_VALIDOS);
  assert.ok(["garantido", "erro"].includes(resultado.status));
});
