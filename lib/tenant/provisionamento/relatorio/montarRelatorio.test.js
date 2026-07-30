// lib/tenant/provisionamento/relatorio/montarRelatorio.test.js
import test from "node:test";
import assert from "node:assert/strict";
import { montarRelatorio } from "./montarRelatorio.js";

const BASE = {
  authUserId: "id-1",
  iniciadoEm: "2026-07-29T10:00:00.000Z",
  concluidoEm: "2026-07-29T10:00:01.000Z",
  versaoProvisionamento: "1.0.0",
};

test("sucesso é true quando todas as etapas são garantido", () => {
  const relatorio = montarRelatorio({
    ...BASE,
    etapas: [
      { etapa: "identidade", status: "garantido" },
      { etapa: "licenciamento", status: "garantido" },
    ],
  });
  assert.equal(relatorio.sucesso, true);
});

test("sucesso é false quando qualquer etapa é erro", () => {
  const relatorio = montarRelatorio({
    ...BASE,
    etapas: [
      { etapa: "identidade", status: "garantido" },
      { etapa: "licenciamento", status: "erro", erro: "falhou" },
    ],
  });
  assert.equal(relatorio.sucesso, false);
});

test("sucesso é false quando não há etapas — [].every(...) retornaria true, mas lista vazia não deve contar como sucesso", () => {
  const relatorio = montarRelatorio({ ...BASE, etapas: [] });
  assert.equal(relatorio.sucesso, false);
});

test("preserva todos os campos repassados, incluindo a lista de etapas na ordem original", () => {
  const etapas = [
    { etapa: "identidade", status: "garantido" },
    { etapa: "licenciamento", status: "erro", erro: "x" },
  ];
  const relatorio = montarRelatorio({ ...BASE, etapas });
  assert.equal(relatorio.authUserId, BASE.authUserId);
  assert.equal(relatorio.iniciadoEm, BASE.iniciadoEm);
  assert.equal(relatorio.concluidoEm, BASE.concluidoEm);
  assert.equal(relatorio.versaoProvisionamento, BASE.versaoProvisionamento);
  assert.deepEqual(relatorio.etapas, etapas);
});
