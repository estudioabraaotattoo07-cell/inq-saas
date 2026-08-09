// lib/tenant/provisionamento/dominios/criarLicenciamento.test.js
//
// node:test nativo, mesma filosofia de criarIdentidade.test.js. Rodar com:
//   node --test lib/tenant/provisionamento/dominios/criarLicenciamento.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { criarLicenciamento } from "./criarLicenciamento.js";

const DADOS_VALIDOS = {
  authUserId: "22222222-2222-2222-2222-222222222222",
  email: "estudio@exemplo.com",
};

/**
 * Cliente Supabase falso. Cobre:
 *   - select("id").eq("user_id",...).maybeSingle()   (passo 1)
 *   - select("id").ilike("email",...).limit(1)       (passo 2, checagem de conflito)
 *   - update().eq().select().single() / insert().select().single()
 */
function criarSbFalso({ linhasExistentes = [], forcarErroConsulta = null, forcarErroConflito = null, forcarErroEscrita = null } = {}) {
  const tabela = new Map(linhasExistentes.map((l) => [l.id, { ...l }]));
  let proximoId = 1;
  return {
    from(_tabela) {
      return {
        select(_cols) {
          return {
            eq(_coluna, valor) {
              return {
                async maybeSingle() {
                  if (forcarErroConsulta) return { data: null, error: forcarErroConsulta };
                  const achou = [...tabela.values()].find((l) => l.user_id === valor);
                  return { data: achou ? { id: achou.id } : null, error: null };
                },
              };
            },
            ilike(_coluna, valor) {
              return {
                async limit(_n) {
                  if (forcarErroConflito) return { data: null, error: forcarErroConflito };
                  const achadas = [...tabela.values()].filter(
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
            eq(_coluna, id) {
              return {
                select: () => ({
                  async single() {
                    if (forcarErroEscrita) return { data: null, error: forcarErroEscrita };
                    const linha = tabela.get(id);
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
                if (forcarErroEscrita) return { data: null, error: forcarErroEscrita };
                const id = `nova-${proximoId++}`;
                const linha = { id, ...payload };
                tabela.set(id, linha);
                return { data: linha, error: null };
              },
            }),
          };
        },
      };
    },
    _tabela: tabela,
  };
}

test("retorna erro sem chamar o banco quando falta campo obrigatório", async () => {
  const sb = criarSbFalso();
  const resultado = await criarLicenciamento(sb, { ...DADOS_VALIDOS, email: "" });
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /email/);
});

test("cria a licença quando não existe nenhuma para este user_id nem conflito de e-mail", async () => {
  const sb = criarSbFalso({ linhasExistentes: [] });
  const resultado = await criarLicenciamento(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "garantido");
  assert.equal(resultado.detalhe.user_id, DADOS_VALIDOS.authUserId);
  assert.equal(sb._tabela.size, 1);
});

test("encontra licença existente por user_id e atualiza, sem duplicar (não passa pela checagem de e-mail)", async () => {
  const sb = criarSbFalso({
    linhasExistentes: [{ id: "existente-1", user_id: DADOS_VALIDOS.authUserId, email: DADOS_VALIDOS.email, plano: "Bronze" }],
  });
  const resultado = await criarLicenciamento(sb, { ...DADOS_VALIDOS, plano: "Ouro" });
  assert.equal(resultado.status, "garantido");
  assert.equal(resultado.detalhe.plano, "Ouro");
  assert.equal(sb._tabela.size, 1);
});

test("PROTEÇÃO: recusa criar quando existe licença antiga com o mesmo e-mail (user_id nulo) — não duplica", async () => {
  const sb = criarSbFalso({
    linhasExistentes: [{ id: "antiga-1", user_id: null, email: DADOS_VALIDOS.email, plano: "Bronze" }],
  });
  const resultado = await criarLicenciamento(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.match(resultado.erro, /migração formal de backfill/);
  assert.equal(sb._tabela.size, 1, "nenhuma linha nova foi criada — a proteção impediu a duplicidade");
  assert.equal(sb._tabela.get("antiga-1").user_id, null, "a linha antiga permanece intocada");
});

test("PROTEÇÃO: recusa mesmo quando o e-mail em conflito pertence a um user_id diferente", async () => {
  const sb = criarSbFalso({
    linhasExistentes: [{ id: "outro-tenant", user_id: "99999999-9999-9999-9999-999999999999", email: DADOS_VALIDOS.email }],
  });
  const resultado = await criarLicenciamento(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.equal(sb._tabela.size, 1);
});

test("checagem de e-mail é case-insensitive", async () => {
  const sb = criarSbFalso({
    linhasExistentes: [{ id: "antiga-2", user_id: null, email: "ESTUDIO@EXEMPLO.COM" }],
  });
  const resultado = await criarLicenciamento(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
});

test("aplica plano, status e data_inicio padrão quando não informados", async () => {
  const sb = criarSbFalso();
  const resultado = await criarLicenciamento(sb, DADOS_VALIDOS);
  assert.equal(resultado.detalhe.plano, "1.0");
  assert.equal(resultado.detalhe.status, "ativo");
  assert.equal(resultado.detalhe.data_inicio, new Date().toISOString().slice(0, 10));
});

test("respeita plano, status, data_inicio e data_vencimento explícitos", async () => {
  const sb = criarSbFalso();
  const resultado = await criarLicenciamento(sb, {
    ...DADOS_VALIDOS,
    plano: "Ouro",
    status: "trial",
    dataInicio: "2026-01-01",
    dataVencimento: "2027-01-01",
  });
  assert.equal(resultado.detalhe.plano, "Ouro");
  assert.equal(resultado.detalhe.status, "trial");
  assert.equal(resultado.detalhe.data_inicio, "2026-01-01");
  assert.equal(resultado.detalhe.data_vencimento, "2027-01-01");
});

test("captura erro na consulta por user_id e retorna status erro", async () => {
  const sb = criarSbFalso({ forcarErroConsulta: { message: "falha simulada na consulta" } });
  const resultado = await criarLicenciamento(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.equal(resultado.erro, "falha simulada na consulta");
});

test("captura erro na checagem de conflito de e-mail e retorna status erro", async () => {
  const sb = criarSbFalso({ forcarErroConflito: { message: "falha simulada na checagem de conflito" } });
  const resultado = await criarLicenciamento(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.equal(resultado.erro, "falha simulada na checagem de conflito");
});

test("captura erro de escrita (insert/update) e retorna status erro", async () => {
  const sb = criarSbFalso({ forcarErroEscrita: { message: "falha simulada na escrita" } });
  const resultado = await criarLicenciamento(sb, DADOS_VALIDOS);
  assert.equal(resultado.status, "erro");
  assert.equal(resultado.erro, "falha simulada na escrita");
});

test("chamar duas vezes seguidas para o mesmo user_id não duplica", async () => {
  const sb = criarSbFalso();
  const primeira = await criarLicenciamento(sb, DADOS_VALIDOS);
  const segunda = await criarLicenciamento(sb, DADOS_VALIDOS);

  assert.equal(primeira.status, "garantido");
  assert.equal(segunda.status, "garantido");
  assert.equal(sb._tabela.size, 1, "não deve duplicar em nenhuma das duas chamadas");
});

test("contrato de retorno só usa 'garantido' ou 'erro'", async () => {
  const sb = criarSbFalso();
  const resultado = await criarLicenciamento(sb, DADOS_VALIDOS);
  assert.ok(["garantido", "erro"].includes(resultado.status));
});
