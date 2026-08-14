// api/_tests/lead.formatarTelefone.test.js
//
// Testa a função REAL do campo WhatsApp da ficha de captação -- não uma
// cópia. formatarTelefone() é exportada no topo de api/lead.js; o script que
// roda no navegador recebe o mesmo corpo via formatarTelefone.toString()
// dentro de paginaSitePremium(), então testar a função exportada aqui
// exercita exatamente o que roda em produção. Se o algoritmo mudar em
// lead.js, este teste usa a mudança automaticamente, sem precisar editar
// nada aqui.
//
// Formato aprovado (2026-08-14): (DD) DDDDD-DDDD para celular (11 dígitos),
// (DD) DDDD-DDDD para fixo (10 dígitos) -- com espaço depois do parêntese,
// mesmo padrão visual do maskTel() já usado nos campos de telefone do CRM
// (src/CRM Casa dos Carvalho.tsx). O valor com essa formatação é o que
// segue pro FormData/backend sem alteração -- decisão de compatibilidade
// deste bloco é não mexer no contrato salvo.
//
// Rodar com: node --test api/_tests/lead.formatarTelefone.test.js

import test from "node:test";
import assert from "node:assert/strict";

// lead.js (e api/_lib/rateLimit.js, que ele importa) criam seus próprios
// clientes Supabase reais na importação -- valores fake aqui só evitam que a
// importação falhe por falta de env var; este teste nunca chama nenhum
// desses clientes.
process.env.VITE_SUPABASE_URL ||= "https://fake-para-teste.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "fake-para-teste";

const { formatarTelefone } = await import("../lead.js");

test("1-2 dígitos -- início do DDD, sem inventar dígito", () => {
  assert.equal(formatarTelefone("2"), "(2");
  assert.equal(formatarTelefone("27"), "(27");
});

test("10 dígitos -- telefone fixo, (DD) DDDD-DDDD", () => {
  assert.equal(formatarTelefone("2733334444"), "(27) 3333-4444");
});

test("11 dígitos -- celular com nono dígito, (DD) DDDDD-DDDD", () => {
  assert.equal(formatarTelefone("27996929665"), "(27) 99692-9665");
});

test("sempre insere exatamente um espaço depois do fechamento do parêntese", () => {
  assert.equal(formatarTelefone("27996929665").startsWith("(27) "), true);
  assert.equal(formatarTelefone("2733334444").startsWith("(27) "), true);
});

test("campo vazio permanece vazio", () => {
  assert.equal(formatarTelefone(""), "");
  assert.equal(formatarTelefone(null), "");
  assert.equal(formatarTelefone(undefined), "");
});

test("colar 27996929665 (sem máscara) produz (27) 99692-9665", () => {
  assert.equal(formatarTelefone("27996929665"), "(27) 99692-9665");
});

test("colar (27) 99692-9665 (já mascarado) mantém exatamente uma única máscara", () => {
  assert.equal(formatarTelefone("(27) 99692-9665"), "(27) 99692-9665");
});

test("colar com símbolos/letras soltos normaliza pra máscara única", () => {
  assert.equal(formatarTelefone("27.996.929-665"), "(27) 99692-9665");
  assert.equal(formatarTelefone("tel: (27) 99692-9665"), "(27) 99692-9665");
});

test("nunca duplica parênteses, espaço ou hífen, em nenhuma faixa de tamanho", () => {
  for (let n = 0; n <= 12; n++) {
    const digitos = "27996929665".slice(0, n);
    const resultado = formatarTelefone(digitos);
    assert.equal((resultado.match(/\(/g) || []).length <= 1, true, n + " dígitos: mais de um '('");
    assert.equal((resultado.match(/\)/g) || []).length <= 1, true, n + " dígitos: mais de um ')'");
    assert.equal((resultado.match(/-/g) || []).length <= 1, true, n + " dígitos: mais de um '-'");
    assert.equal(/  /.test(resultado), false, n + " dígitos: espaço duplicado");
  }
});

test("mais de 11 dígitos -- trunca em 11, não estoura o padrão", () => {
  assert.equal(formatarTelefone("279969296651234"), "(27) 99692-9665");
});

test("dígitos incompletos só acompanham a digitação, sem inventar separador antes da hora", () => {
  assert.equal(formatarTelefone("279"), "(27) 9");
  assert.equal(formatarTelefone("27999"), "(27) 999");
});
