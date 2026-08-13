// api/_tests/config.licencaDemoPayload.test.js
//
// Bloco 2 da remoção de Bronze/Prata/Ouro (2026-08-13) -- resetDemo (o reset
// da conta demo, disparado a cada carregamento de ?demo=1) não pode mais
// gravar "Ouro", "Bronze" ou "Prata" em licencas.plano. A decisão registrada
// foi usar null: a coluna já aceita null hoje (a própria licença real da
// Casa dos Carvalho está assim), e a conta demo não representa nenhuma
// edição comercial real -- não vira "1.0" (pareceria uma conta comercial de
// verdade) nem "Laboratório" (a demo não é o Laboratório P&D).
//
// Testa a função pura que monta o payload, sem tocar o Supabase real -- não
// executa o reset de verdade (que apagaria/recriaria dados da conta demo em
// produção).
//
// Rodar com: node --test api/_tests/config.licencaDemoPayload.test.js

import test from "node:test";
import assert from "node:assert/strict";

process.env.VITE_SUPABASE_URL ||= "https://fake-para-teste.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "fake-para-teste";

const { licencaDemoPayload } = await import("../config.js");

test("plano é sempre null -- nunca Bronze, Prata ou Ouro", () => {
  const payload = licencaDemoPayload("11111111-1111-1111-1111-111111111111");
  assert.equal(payload.plano, null);
});

test("plano não vira '1.0' automaticamente (não deve parecer conta comercial real)", () => {
  const payload = licencaDemoPayload("11111111-1111-1111-1111-111111111111");
  assert.notEqual(payload.plano, "1.0");
});

test("plano não vira 'Laboratório' (a conta demo não é o Laboratório P&D)", () => {
  const payload = licencaDemoPayload("11111111-1111-1111-1111-111111111111");
  assert.notEqual(payload.plano, "Laboratório P&D");
  assert.notEqual(payload.plano, "Laboratorio");
});

test("demais campos continuam corretos (status ativo, vencimento distante, user_id repassado)", () => {
  const uid = "22222222-2222-2222-2222-222222222222";
  const payload = licencaDemoPayload(uid);
  assert.equal(payload.user_id, uid);
  assert.equal(payload.status, "ativo");
  assert.equal(payload.data_vencimento, "2099-12-31");
});
