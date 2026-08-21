import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fonte = readFileSync(new URL("../resend.js", import.meta.url), "utf8");

test("remetente corporativo possui lista fechada de nomes aprovados", () => {
  for (const nome of [
    "Ink System | Acesso e Segurança",
    "Ink System | Relacionamento",
    "Ink System | Assinaturas",
    "Ink System | Suporte",
  ]) assert.match(fonte, new RegExp(nome.replace("|", "\\|")));
});

test("somente chamada interna pode escolher o nome de apresentação", () => {
  assert.match(fonte, /chamadaInterna && nomesCorporativos\.has\(senderName\)/);
  assert.match(fonte, /EMAIL_REMETENTE/);
  assert.doesNotMatch(fonte, /req\.body\.from/);
});
