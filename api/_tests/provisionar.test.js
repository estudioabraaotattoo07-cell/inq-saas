// api/_tests/provisionar.test.js
//
// Primeiro arquivo de teste para api/ neste projeto (confirmado na auditoria
// da Etapa 0: não havia convenção herdada). Segue a mesma filosofia dos
// domínios em lib/tenant/: node:test nativo, cliente Supabase (e Auth) falso,
// sem rede real -- e usa o motor de provisionamento REAL (provisionarEstudio,
// registro de domínios real), não um motor falso, para garantir que a
// integração ponta a ponta continua correta.
//
// Movido de api/provisionar.test.js para api/_tests/ no Bloco 4.2 (correção
// emergencial): a Vercel detecta qualquer .js direto em api/ como Serverless
// Function, e este arquivo nunca foi um endpoint -- mesma convenção de
// exclusão já usada por api/_lib/ (pasta com "_" no início do nome).
//
// Rodar com: node --test api/_tests/provisionar.test.js

import test from "node:test";
import assert from "node:assert/strict";

// provisionar.js cria seu próprio cliente Supabase real na importação (mesmo
// padrão de lead.js/cron-disparos.js) -- valores fake aqui só evitam que a
// importação falhe por falta de env var; processarProvisionamento() recebe
// sempre o cliente FALSO deste arquivo, nunca este client real.
process.env.VITE_SUPABASE_URL ||= "https://fake-para-teste.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "fake-para-teste";
process.env.PROVISIONING_SERVICE_SECRET = "segredo-de-teste-fake";

const { processarProvisionamento } = await import("../provisionar.js");
const CHAVE_CORRETA = process.env.PROVISIONING_SERVICE_SECRET;

const AUTH_USER_ID = "11111111-1111-1111-1111-111111111111";
const OUTRO_AUTH_USER_ID = "22222222-2222-2222-2222-222222222222";
const DADOS_VALIDOS = {
  authUserId: AUTH_USER_ID,
  email: "estudio@exemplo.com",
  nomeEstudio: "Estúdio Exemplo",
  nomeResponsavel: "Fulana de Tal",
};

/**
 * Cliente Supabase + Auth falso. Cobre:
 *   - auth.admin.getUserById(uid)
 *   - from("ink_clientes"): select/eq/maybeSingle (validação de conflito) e
 *     upsert/select/single (criarIdentidade real)
 *   - from("licencas"): select/eq/maybeSingle, select/ilike/limit,
 *     update/eq/select/single, insert/select/single (criarLicenciamento real)
 *   - from("categorias_financeiras") / from("formas_pagamento"): upsert em
 *     lote, sem .select() (criarFinanceiro real)
 */
function criarSbFalso({ contasAuth = {}, linhasInkClientes = [], forcarErroConflito = null } = {}) {
  const tabelaInkClientes = new Map(linhasInkClientes.map((l) => [l.auth_user_id, { ...l }]));
  const tabelaLicencas = new Map();
  const tabelaCategorias = new Map();
  const tabelaFormasPagamento = new Map();
  let proximoIdLicenca = 1;

  return {
    auth: {
      admin: {
        async getUserById(uid) {
          const conta = contasAuth[uid];
          if (!conta) return { data: { user: null }, error: { message: "Usuário não encontrado" } };
          return { data: { user: { id: uid, email: conta.email } }, error: null };
        },
      },
    },
    from(tabela) {
      if (tabela === "ink_clientes") {
        return {
          select(_cols) {
            return {
              eq(_c, valor) {
                return {
                  async maybeSingle() {
                    if (forcarErroConflito) return { data: null, error: forcarErroConflito };
                    const linha = tabelaInkClientes.get(valor);
                    return { data: linha ? { email: linha.email } : null, error: null };
                  },
                };
              },
            };
          },
          upsert(payload) {
            return {
              select: () => ({
                async single() {
                  const existente = tabelaInkClientes.get(payload.auth_user_id);
                  const linha = existente ? { ...existente, ...payload } : { id: "id-identidade", ...payload };
                  tabelaInkClientes.set(payload.auth_user_id, linha);
                  return { data: linha, error: null };
                },
              }),
            };
          },
        };
      }
      if (tabela === "licencas") {
        return {
          select(_cols) {
            return {
              eq(_c, valor) {
                return {
                  async maybeSingle() {
                    const achou = [...tabelaLicencas.values()].find((l) => l.user_id === valor);
                    return { data: achou ? { id: achou.id } : null, error: null };
                  },
                };
              },
              ilike(_c, valor) {
                return {
                  async limit() {
                    const achadas = [...tabelaLicencas.values()].filter(
                      (l) => l.email && l.email.toLowerCase() === valor.toLowerCase()
                    );
                    return { data: achadas.map((l) => ({ id: l.id })), error: null };
                  },
                };
              },
            };
          },
          update(payload) {
            return {
              eq(_c, id) {
                return {
                  select: () => ({
                    async single() {
                      const linha = tabelaLicencas.get(id);
                      Object.assign(linha, payload);
                      return { data: linha, error: null };
                    },
                  }),
                };
              },
            };
          },
          insert(payload) {
            return {
              select: () => ({
                async single() {
                  const id = `licenca-${proximoIdLicenca++}`;
                  const linha = { id, ...payload };
                  tabelaLicencas.set(id, linha);
                  return { data: linha, error: null };
                },
              }),
            };
          },
        };
      }
      if (tabela === "categorias_financeiras") {
        return {
          async upsert(payload) {
            for (const item of payload) tabelaCategorias.set(`${item.tipo}:${item.chave_sistema}`, item);
            return { data: null, error: null };
          },
        };
      }
      if (tabela === "formas_pagamento") {
        return {
          async upsert(payload) {
            for (const item of payload) tabelaFormasPagamento.set(item.chave_sistema, item);
            return { data: null, error: null };
          },
        };
      }
      throw new Error("tabela inesperada no teste: " + tabela);
    },
    _tabelas: { tabelaInkClientes, tabelaLicencas, tabelaCategorias, tabelaFormasPagamento },
  };
}

test("recusa sem a credencial dedicada, sem tocar em nada", async () => {
  const sb = criarSbFalso({ contasAuth: { [AUTH_USER_ID]: { email: DADOS_VALIDOS.email } } });
  const r = await processarProvisionamento(sb, undefined, DADOS_VALIDOS);
  assert.equal(r.status, 401);
  assert.equal(sb._tabelas.tabelaInkClientes.size, 0);
});

test("recusa com a credencial errada", async () => {
  const sb = criarSbFalso({ contasAuth: { [AUTH_USER_ID]: { email: DADOS_VALIDOS.email } } });
  const r = await processarProvisionamento(sb, "chave-errada", DADOS_VALIDOS);
  assert.equal(r.status, 401);
});

test("recusa payload incompleto, sem chamar Auth nem o motor", async () => {
  const sb = criarSbFalso();
  const r = await processarProvisionamento(sb, CHAVE_CORRETA, { ...DADOS_VALIDOS, nomeEstudio: "" });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /nomeEstudio/);
});

test("recusa authUserId fora do formato UUID", async () => {
  const sb = criarSbFalso();
  const r = await processarProvisionamento(sb, CHAVE_CORRETA, { ...DADOS_VALIDOS, authUserId: "não-é-um-uuid" });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /UUID/);
});

test("recusa quando a conta não existe no Supabase Auth", async () => {
  const sb = criarSbFalso({ contasAuth: {} });
  const r = await processarProvisionamento(sb, CHAVE_CORRETA, DADOS_VALIDOS);
  assert.equal(r.status, 404);
});

test("recusa quando o e-mail da conta Auth diverge do e-mail informado", async () => {
  const sb = criarSbFalso({ contasAuth: { [AUTH_USER_ID]: { email: "outro@exemplo.com" } } });
  const r = await processarProvisionamento(sb, CHAVE_CORRETA, DADOS_VALIDOS);
  assert.equal(r.status, 409);
  assert.match(r.body.error, /e-mail/i);
});

test("recusa quando o authUserId já está vinculado a outro tenant com e-mail diferente", async () => {
  const sb = criarSbFalso({
    contasAuth: { [AUTH_USER_ID]: { email: DADOS_VALIDOS.email } },
    linhasInkClientes: [{ auth_user_id: AUTH_USER_ID, email: "tenant-antigo@exemplo.com" }],
  });
  const r = await processarProvisionamento(sb, CHAVE_CORRETA, DADOS_VALIDOS);
  assert.equal(r.status, 409);
  assert.match(r.body.error, /já está vinculado/);
});

test("prossegue normalmente quando o authUserId já existe em ink_clientes com o MESMO e-mail (reexecução segura)", async () => {
  const sb = criarSbFalso({
    contasAuth: { [AUTH_USER_ID]: { email: DADOS_VALIDOS.email } },
    linhasInkClientes: [{ auth_user_id: AUTH_USER_ID, email: DADOS_VALIDOS.email }],
  });
  const r = await processarProvisionamento(sb, CHAVE_CORRETA, DADOS_VALIDOS);
  assert.equal(r.status, 200);
  assert.equal(r.body.sucesso, true);
});

test("com tudo válido, chama provisionarEstudio() de verdade e devolve o relatório com as 3 etapas", async () => {
  const sb = criarSbFalso({ contasAuth: { [AUTH_USER_ID]: { email: DADOS_VALIDOS.email } } });
  const r = await processarProvisionamento(sb, CHAVE_CORRETA, DADOS_VALIDOS);
  assert.equal(r.status, 200);
  assert.equal(r.body.sucesso, true);
  assert.equal(r.body.etapas.length, 3);
  assert.deepEqual(r.body.etapas.map((e) => e.etapa), ["identidade", "licenciamento", "financeiro"]);
  assert.equal(sb._tabelas.tabelaInkClientes.size, 1);
  assert.equal(sb._tabelas.tabelaLicencas.size, 1);
  assert.equal(sb._tabelas.tabelaCategorias.size, 13);
  assert.equal(sb._tabelas.tabelaFormasPagamento.size, 7);
});

test("gera o slug técnico provisório derivado do authUserId, sem risco de colisão", async () => {
  const sb = criarSbFalso({ contasAuth: { [AUTH_USER_ID]: { email: DADOS_VALIDOS.email } } });
  const r = await processarProvisionamento(sb, CHAVE_CORRETA, DADOS_VALIDOS);
  const linha = sb._tabelas.tabelaInkClientes.get(AUTH_USER_ID);
  assert.match(linha.slug, new RegExp(AUTH_USER_ID));
});

test("chamar duas vezes com os mesmos dados não duplica nenhuma linha (idempotência ponta a ponta)", async () => {
  const sb = criarSbFalso({ contasAuth: { [AUTH_USER_ID]: { email: DADOS_VALIDOS.email } } });
  const r1 = await processarProvisionamento(sb, CHAVE_CORRETA, DADOS_VALIDOS);
  const r2 = await processarProvisionamento(sb, CHAVE_CORRETA, DADOS_VALIDOS);
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(sb._tabelas.tabelaInkClientes.size, 1);
  assert.equal(sb._tabelas.tabelaLicencas.size, 1);
});

test("dois authUserId diferentes não conflitam entre si", async () => {
  const sb = criarSbFalso({
    contasAuth: {
      [AUTH_USER_ID]: { email: DADOS_VALIDOS.email },
      [OUTRO_AUTH_USER_ID]: { email: "outro-estudio@exemplo.com" },
    },
  });
  const r1 = await processarProvisionamento(sb, CHAVE_CORRETA, DADOS_VALIDOS);
  const r2 = await processarProvisionamento(sb, CHAVE_CORRETA, {
    ...DADOS_VALIDOS,
    authUserId: OUTRO_AUTH_USER_ID,
    email: "outro-estudio@exemplo.com",
  });
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(sb._tabelas.tabelaInkClientes.size, 2);
});
