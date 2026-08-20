// api/_tests/config.failClosed.test.js
//
// Teste do comportamento fail-closed de api/config.js (Bloco Corretivo de
// Segurança de Créditos, Storage e Licenças, 2026-08-20; reforçado na
// auditoria pós-implementação).
//
// Prova, com um handler HTTP real (req/res simulados, sem rede): se
// SUPABASE_SERVICE_KEY estiver ausente, vazia ou só com espaços, o
// endpoint aborta com erro controlado ANTES de instanciar qualquer
// cliente Supabase -- nunca cai para a chave anônima. Também prova, com
// a chave presente e um cliente Supabase FALSO injetado via
// __usarFabricaClienteSupabaseParaTeste (sem nenhuma chamada de rede
// real), que os dois caminhos (resetDemo e leitura pública) continuam
// executando as operações esperadas.
//
// Rodar com: node --test api/_tests/config.failClosed.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_CONFIG = path.join(__dirname, "..", "config.js");
const codigoFonte = readFileSync(CAMINHO_CONFIG, "utf8");

function criarResMock() {
  const res = {
    _status: null,
    _json: null,
    _ended: false,
    _headers: {},
    setHeader(nome, valor) { res._headers[nome] = valor; },
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
    end() { res._ended = true; return res; },
  };
  return res;
}

// Cliente Supabase FALSO, sem nenhuma chamada de rede: toda operação
// encadeável (select/eq/limit/maybeSingle/single/insert/update/delete)
// devolve o próprio objeto encadeável, que também é "thenable" (resolve
// via .then quando usado com await, em qualquer ponto da cadeia) --
// cobre todos os padrões de chamada reais usados em api/config.js.
function criarClienteSupabaseFalso(resultadosPorTabela = {}) {
  const chamadasFrom = [];
  const operacoes = [];

  function criarCadeia(tabela) {
    const resultado = resultadosPorTabela[tabela] || { data: null, error: null };
    const cadeia = {
      select(...args) { operacoes.push({ tabela, op: "select", args }); return cadeia; },
      eq(...args) { operacoes.push({ tabela, op: "eq", args }); return cadeia; },
      limit(...args) { operacoes.push({ tabela, op: "limit", args }); return cadeia; },
      maybeSingle() { operacoes.push({ tabela, op: "maybeSingle" }); return Promise.resolve(resultado); },
      single() { operacoes.push({ tabela, op: "single" }); return Promise.resolve(resultado); },
      insert(...args) { operacoes.push({ tabela, op: "insert", args }); return cadeia; },
      update(...args) { operacoes.push({ tabela, op: "update", args }); return cadeia; },
      delete() { operacoes.push({ tabela, op: "delete" }); return cadeia; },
      then(resolve) { resolve(resultado); },
    };
    return cadeia;
  }

  const cliente = {
    from(tabela) { chamadasFrom.push(tabela); return criarCadeia(tabela); },
  };

  return { cliente, chamadasFrom, operacoes };
}

test("código-fonte não contém mais o fallback para a chave anônima", () => {
  assert.doesNotMatch(codigoFonte, /VITE_SUPABASE_ANON_KEY/);
});

test("guarda fail-closed (ausente, vazia ou só espaços) vem antes da criação do cliente Supabase no código-fonte", () => {
  const posGuarda = codigoFonte.indexOf("if (!chaveServico || !chaveServico.trim())");
  // O import ("import { createClient } from ...") não tem "createClient("
  // com parêntese -- só a fábrica padrão dentro do módulo tem.
  const posCreateClientReal = codigoFonte.indexOf("createClient(");
  assert.ok(posGuarda > -1, "guarda fail-closed não encontrada");
  assert.ok(posCreateClientReal > -1, "chamada real de createClient não encontrada");
  // A guarda precisa vir antes de _fabricaClienteSupabase ser INVOCADA no
  // handler (não antes de onde ela é definida no topo do módulo).
  const posInvocacaoFabrica = codigoFonte.indexOf("_fabricaClienteSupabase(chaveServico)");
  assert.ok(posInvocacaoFabrica > -1, "invocação da fábrica não encontrada");
  assert.ok(posGuarda < posInvocacaoFabrica, "guarda deve vir antes da invocação da fábrica de cliente Supabase");
});

test("handler aborta com erro controlado (500) quando SUPABASE_SERVICE_KEY está ausente, sem revelar segredo ou nome da variável na resposta", async () => {
  const original = process.env.SUPABASE_SERVICE_KEY;
  delete process.env.SUPABASE_SERVICE_KEY;
  try {
    const modulo = await import(`../config.js?cachebust=${Date.now()}-${Math.random()}`);
    const handler = modulo.default;

    const req = { method: "GET", query: {} };
    const res = criarResMock();

    await handler(req, res);

    assert.equal(res._status, 500);
    assert.ok(res._json && typeof res._json.error === "string");
    assert.doesNotMatch(JSON.stringify(res._json), /SUPABASE_SERVICE_KEY/);
    assert.doesNotMatch(JSON.stringify(res._json), /VITE_SUPABASE_ANON_KEY/);
  } finally {
    if (original !== undefined) process.env.SUPABASE_SERVICE_KEY = original;
  }
});

test("handler aborta com erro controlado também no caminho ?acao=resetDemo quando a chave de serviço está ausente", async () => {
  const original = process.env.SUPABASE_SERVICE_KEY;
  delete process.env.SUPABASE_SERVICE_KEY;
  try {
    const modulo = await import(`../config.js?cachebust=${Date.now()}-${Math.random()}`);
    const handler = modulo.default;

    const req = { method: "GET", query: { acao: "resetDemo" } };
    const res = criarResMock();

    await handler(req, res);

    assert.equal(res._status, 500);
    assert.ok(res._json && typeof res._json.error === "string");
  } finally {
    if (original !== undefined) process.env.SUPABASE_SERVICE_KEY = original;
  }
});

test("handler aborta com erro controlado quando a chave de serviço é uma string vazia", async () => {
  const original = process.env.SUPABASE_SERVICE_KEY;
  process.env.SUPABASE_SERVICE_KEY = "";
  try {
    const modulo = await import(`../config.js?cachebust=${Date.now()}-${Math.random()}`);
    const handler = modulo.default;
    const req = { method: "GET", query: {} };
    const res = criarResMock();
    await handler(req, res);
    assert.equal(res._status, 500);
    assert.ok(res._json && typeof res._json.error === "string");
  } finally {
    if (original === undefined) delete process.env.SUPABASE_SERVICE_KEY;
    else process.env.SUPABASE_SERVICE_KEY = original;
  }
});

test("handler aborta com erro controlado quando a chave de serviço é só espaços em branco", async () => {
  const original = process.env.SUPABASE_SERVICE_KEY;
  process.env.SUPABASE_SERVICE_KEY = "   ";
  try {
    const modulo = await import(`../config.js?cachebust=${Date.now()}-${Math.random()}`);
    const handler = modulo.default;
    const req = { method: "GET", query: {} };
    const res = criarResMock();
    await handler(req, res);
    assert.equal(res._status, 500);
    assert.ok(res._json && typeof res._json.error === "string");
  } finally {
    if (original === undefined) delete process.env.SUPABASE_SERVICE_KEY;
    else process.env.SUPABASE_SERVICE_KEY = original;
  }
});

test("com a chave presente e um cliente Supabase falso injetado, ?acao=resetDemo executa as operações esperadas (delete nas 5 tabelas, licencas, configuracoes, artistas, clientes) sem chamada externa", async () => {
  const originalKey = process.env.SUPABASE_SERVICE_KEY;
  const originalDemo = process.env.DEMO_USER_ID;
  process.env.SUPABASE_SERVICE_KEY = "chave-falsa-de-teste";
  process.env.DEMO_USER_ID = "11111111-1111-1111-1111-111111111111";
  try {
    const modulo = await import(`../config.js?cachebust=${Date.now()}-${Math.random()}`);
    const handler = modulo.default;
    const { cliente, chamadasFrom } = criarClienteSupabaseFalso({
      licencas: { data: null, error: null },
      configuracoes: { data: null, error: null },
    });
    modulo.__usarFabricaClienteSupabaseParaTeste(() => cliente);

    const req = { method: "GET", query: { acao: "resetDemo" } };
    const res = criarResMock();
    await handler(req, res);

    assert.equal(res._status, 200);
    assert.deepEqual(res._json, { ok: true });
    for (const tabela of ["clientes", "agenda", "financeiro", "historico", "artistas", "licencas", "configuracoes"]) {
      assert.ok(chamadasFrom.includes(tabela), `esperava chamada a sb.from("${tabela}")`);
    }
  } finally {
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = originalKey;
    if (originalDemo === undefined) delete process.env.DEMO_USER_ID; else process.env.DEMO_USER_ID = originalDemo;
  }
});

test("com a chave presente e um cliente Supabase falso injetado, a leitura pública (studio_tel/studio_name) continua funcionando sem chamada externa", async () => {
  const originalKey = process.env.SUPABASE_SERVICE_KEY;
  process.env.SUPABASE_SERVICE_KEY = "chave-falsa-de-teste";
  try {
    const modulo = await import(`../config.js?cachebust=${Date.now()}-${Math.random()}`);
    const handler = modulo.default;
    const { cliente, chamadasFrom } = criarClienteSupabaseFalso({
      configuracoes: { data: { studio_tel: "(27) 99999-1234", studio_name: "Estúdio Teste" }, error: null },
    });
    modulo.__usarFabricaClienteSupabaseParaTeste(() => cliente);

    const req = { method: "GET", query: {} };
    const res = criarResMock();
    await handler(req, res);

    assert.equal(res._status, 200);
    assert.equal(res._json.studio_tel, "27999991234");
    assert.equal(res._json.studio_name, "Estúdio Teste");
    assert.ok(chamadasFrom.includes("configuracoes"));
  } finally {
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_KEY; else process.env.SUPABASE_SERVICE_KEY = originalKey;
  }
});

test("OPTIONS e cabeçalhos CORS continuam preservados, sem regressão", async () => {
  const modulo = await import(`../config.js?cachebust=${Date.now()}-${Math.random()}`);
  const handler = modulo.default;
  const req = { method: "OPTIONS", query: {} };
  const res = criarResMock();
  await handler(req, res);
  assert.equal(res._status, 200);
  assert.ok(res._ended);
  assert.equal(res._headers["Access-Control-Allow-Origin"], "*");
  assert.equal(res._headers["Access-Control-Allow-Methods"], "GET, OPTIONS");
});

test("método diferente de GET/OPTIONS continua rejeitado com 405, sem regressão", async () => {
  const modulo = await import(`../config.js?cachebust=${Date.now()}-${Math.random()}`);
  const handler = modulo.default;
  const req = { method: "POST", query: {} };
  const res = criarResMock();
  await handler(req, res);
  assert.equal(res._status, 405);
});
