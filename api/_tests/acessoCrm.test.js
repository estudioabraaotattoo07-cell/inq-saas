import assert from "node:assert/strict";
import test from "node:test";
import { origemPermitida, usuarioTemAcessoCrm } from "../_lib/acessoCrm.js";

test("rejeita chamadas sem Origin ou vindas de outro site", () => {
  assert.equal(origemPermitida({ headers: {} }), false);
  assert.equal(origemPermitida({ headers: { origin: "https://site-malicioso.example" } }), false);
});

test("aceita somente uma origem oficial do CRM", () => {
  assert.equal(origemPermitida({ headers: { origin: "https://inq-saas.vercel.app" } }), true);
});

test("nega conta sem licença e aceita licença ativa não expirada", async () => {
  const semLicenca = { from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) };
  assert.equal(await usuarioTemAcessoCrm(semLicenca, { userId: "u1", email: "cliente@example.com" }), false);

  const comLicenca = { from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { status: "ativo", data_vencimento: "2099-12-31" }, error: null }) }) }) }) }) };
  assert.equal(await usuarioTemAcessoCrm(comLicenca, { userId: "u1", email: "cliente@example.com" }), true);
});

test("nega licença bloqueada ou expirada", async () => {
  const sb = { from: () => ({ select: () => ({ eq: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { status: "bloqueado", data_vencimento: "2099-12-31" }, error: null }) }) }) }) }) };
  assert.equal(await usuarioTemAcessoCrm(sb, { userId: "u1", email: "cliente@example.com" }), false);
});
