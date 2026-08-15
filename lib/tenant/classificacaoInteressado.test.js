// lib/tenant/classificacaoInteressado.test.js
//
// node:test nativo, mesma filosofia dos demais testes do projeto.
// Rodar com: node --test lib/tenant/classificacaoInteressado.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { projetoEstaDetalhado, _internos } from "./classificacaoInteressado.js";
const { projetoAtivoMaisRecente, timestampCriadoEm } = _internos;

test("descrição + região gera Projeto detalhado", () => {
  assert.equal(projetoEstaDetalhado({ descricao: "Fechamento de braço", regiao: "braço" }), true);
});

test("descrição + referência gera Projeto detalhado", () => {
  assert.equal(projetoEstaDetalhado({ descricao: "Fechamento de braço", referencias: ["https://x/img1.jpg"] }), true);
});

test("região + referência gera Projeto detalhado", () => {
  assert.equal(projetoEstaDetalhado({ regiao: "braço", referencias: ["https://x/img1.jpg"] }), true);
});

test("apenas um dos três critérios não gera Projeto detalhado", () => {
  assert.equal(projetoEstaDetalhado({ descricao: "Fechamento de braço" }), false);
  assert.equal(projetoEstaDetalhado({ regiao: "braço" }), false);
  assert.equal(projetoEstaDetalhado({ referencias: ["https://x/img1.jpg"] }), false);
});

test("nenhum critério não gera Projeto detalhado", () => {
  assert.equal(projetoEstaDetalhado({}), false);
  assert.equal(projetoEstaDetalhado(null), false);
  assert.equal(projetoEstaDetalhado(undefined), false);
});

test("lista vazia de referências não conta", () => {
  assert.equal(projetoEstaDetalhado({ descricao: "Fechamento de braço", regiao: "", referencias: [] }), false);
});

test("strings vazias ou só com espaços não contam em nenhum dos três campos", () => {
  assert.equal(projetoEstaDetalhado({ descricao: "   ", regiao: "  ", referencias: ["   ", ""] }), false);
  // dois campos "preenchidos" só com espaço + um real ainda é só 1 critério real
  assert.equal(projetoEstaDetalhado({ descricao: "   ", regiao: "braço", referencias: ["   "] }), false);
});

test("campos ausentes (chave nem existe no objeto) não contam, sem lançar exceção", () => {
  assert.doesNotThrow(() => projetoEstaDetalhado({ nome: "Fulano" }));
  assert.equal(projetoEstaDetalhado({ nome: "Fulano" }), false);
});

test("Instagram, período de contato, e-mail, faixa de investimento e tamanho nunca contam pro critério", () => {
  const cliente = {
    insta: "@fulano",
    periodo_ligacao: "Tarde",
    email: "fulano@exemplo.com",
    faixaInvestimento: "R$1.500 a R$3.000",
    tam: "Grande",
  };
  assert.equal(projetoEstaDetalhado(cliente), false);
});

test("projeto cancelado dentro de projetos[] não qualifica indevidamente -- cai pro legado vazio", () => {
  const cliente = {
    regiao: "",
    referencias: [],
    projetos: [{ id: 3, status: "cancelado", desc: "Fechamento de braço completo, com detalhes" }],
  };
  assert.equal(projetoEstaDetalhado(cliente), false);
});

test("projeto concluído dentro de projetos[] não qualifica indevidamente", () => {
  const cliente = {
    regiao: "braço",
    referencias: [],
    projetos: [{ id: 3, status: "concluido", desc: "Fechamento de braço completo, com detalhes" }],
  };
  // só região = 1 critério real -- a descrição do projeto concluído é ignorada
  assert.equal(projetoEstaDetalhado(cliente), false);
});

test("solicitação ativa mais recente é considerada corretamente (sem criadoEm em nenhum ativo -> cai pra posição no array, nunca pro id)", () => {
  const cliente = {
    regiao: "braço",
    referencias: [],
    projetos: [
      { id: 1, status: "ativo", desc: "" },
      { id: 2, status: "cancelado", desc: "Ideia antiga cancelada, bem detalhada" },
      { id: 3, status: "ativo", desc: "Ideia nova ativa, com bastante detalhe" },
    ],
  };
  // a mais recente ativa por posição (id 3, último ativo do array) tem descrição real -> 2 critérios
  assert.equal(projetoEstaDetalhado(cliente), true);
});

// ── Revisão Técnica Complementar (2026-08-14, item 2) ───────────────────────
// projetoAtivoMaisRecente() não pode usar "id" como critério de recência --
// ids vêm em formatos incompatíveis (número, string numérica, UUID, string
// literal). Os testes abaixo comprovam a regra determinística nova: prioriza
// criadoEm válido (DD/MM/AAAA); só cai pra posição no array quando qualquer
// ativo tiver criadoEm ausente ou inválido.

test("timestampCriadoEm: reconhece DD/MM/AAAA válido e rejeita ausente/placeholder/data impossível/formato ISO", () => {
  assert.equal(typeof timestampCriadoEm("14/08/2026"), "number");
  assert.equal(timestampCriadoEm(undefined), null);
  assert.equal(timestampCriadoEm(null), null);
  assert.equal(timestampCriadoEm("—"), null);
  assert.equal(timestampCriadoEm("31/02/2026"), null); // fevereiro não tem dia 31
  assert.equal(timestampCriadoEm("2026-08-14"), null); // formato ISO não é o usado hoje, não é adivinhado
});

test("IDs numéricos (Date.now(), botão Nova Solicitação de Serviço): criadoEm válido em todos os ativos decide, não o id", () => {
  const cliente = {
    referencias: [],
    projetos: [
      { id: 1755000000000, status: "ativo", desc: "Projeto mais novo por id, mas criadoEm mais antigo", regiao: undefined, criadoEm: "01/01/2026" },
      { id: 1700000000000, status: "ativo", desc: "", criadoEm: "10/08/2026" },
    ],
  };
  cliente.regiao = "braço";
  // id menor (1700000000000) tem criadoEm mais recente (10/08/2026) -> vence por data, não por id
  assert.equal(projetoAtivoMaisRecente(cliente.projetos).criadoEm, "10/08/2026");
});

test("IDs em texto (Date.now().toString(), ferramenta criar_projeto da Aura): criadoEm ausente nos dois -> cai pra posição no array, id em string nunca é comparado numericamente", () => {
  const projetos = [
    { id: "1700000000000", status: "ativo", desc: "Mais antigo por posição" },
    { id: "1699999999999", status: "ativo", desc: "Mais novo por posição, mesmo com id textual 'menor'" },
  ];
  // sem criadoEm em nenhum -> último ativo por posição vence (índice 1), mesmo
  // o id textual sendo "menor" que o do índice 0 -- prova que id não é usado
  assert.equal(projetoAtivoMaisRecente(projetos).desc, "Mais novo por posição, mesmo com id textual 'menor'");
});

test("UUID como id (formato hipotético/futuro): nunca é comparado como número -- decide por criadoEm ou por posição, nunca lança exceção", () => {
  const projetos = [
    { id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", status: "ativo", desc: "Projeto A", criadoEm: "01/01/2026" },
    { id: "9c858901-8a57-4791-81fe-4c455b099bc9", status: "ativo", desc: "Projeto B", criadoEm: "05/06/2026" },
  ];
  assert.doesNotThrow(() => projetoAtivoMaisRecente(projetos));
  assert.equal(projetoAtivoMaisRecente(projetos).desc, "Projeto B"); // criadoEm mais recente
});

test("datas criadoEm diferentes: a maior data vence, independente da posição no array", () => {
  const projetos = [
    { id: 1, status: "ativo", desc: "Mais recente por data, mas primeiro no array", criadoEm: "20/08/2026" },
    { id: 2, status: "ativo", desc: "Mais antigo por data, mas último no array", criadoEm: "01/01/2026" },
  ];
  assert.equal(projetoAtivoMaisRecente(projetos).desc, "Mais recente por data, mas primeiro no array");
});

test("criadoEm ausente em pelo menos um ativo: ignora criadoEm por inteiro (mesmo quando outro ativo TEM data válida) e usa posição no array", () => {
  const projetos = [
    { id: 1, status: "ativo", desc: "Tem criadoEm válido mas não é o último do array", criadoEm: "01/01/2026" },
    { id: 2, status: "ativo", desc: "Sem criadoEm (ex.: criado pela Aura), mas é o último do array" },
  ];
  // não mistura comparação por data com comparação por posição caso a caso --
  // como nem todos têm data válida, ignora datas e usa só a posição
  assert.equal(projetoAtivoMaisRecente(projetos).desc, "Sem criadoEm (ex.: criado pela Aura), mas é o último do array");
});

test("projeto cancelado mais recente (mesmo com criadoEm maior) não pode qualificar -- é excluído antes de qualquer comparação de data", () => {
  const cliente = {
    regiao: "",
    referencias: [],
    projetos: [
      { id: 1, status: "ativo", desc: "Ideia ativa mais antiga, bem detalhada e completa", criadoEm: "01/01/2026" },
      { id: 2, status: "cancelado", desc: "Ideia cancelada muito mais recente", criadoEm: "13/08/2026" },
    ],
  };
  const escolhido = projetoAtivoMaisRecente(cliente.projetos);
  assert.equal(escolhido.status, "ativo");
  assert.equal(escolhido.desc, "Ideia ativa mais antiga, bem detalhada e completa");
});

test("mais de um projeto ativo simultaneamente: escolhe corretamente por data quando todos têm criadoEm válido", () => {
  const projetos = [
    { id: 1, status: "ativo", desc: "A", criadoEm: "01/01/2026" },
    { id: 2, status: "ativo", desc: "B", criadoEm: "15/06/2026" },
    { id: 3, status: "ativo", desc: "C", criadoEm: "10/03/2026" },
  ];
  assert.equal(projetoAtivoMaisRecente(projetos).desc, "B");
});

test("projetoAtivoMaisRecente nunca muta nem reordena o array recebido", () => {
  const projetos = [
    { id: 1, status: "ativo", desc: "A", criadoEm: "01/01/2026" },
    { id: 2, status: "cancelado", desc: "B", criadoEm: "15/06/2026" },
  ];
  const copia = JSON.parse(JSON.stringify(projetos));
  projetoAtivoMaisRecente(projetos);
  assert.deepEqual(projetos, copia);
});

test("solicitação ativa mais recente sem descrição real cai pro campo legado do cliente", () => {
  const cliente = {
    descricao: "Descrição legada preenchida no cadastro antigo",
    regiao: "braço",
    referencias: [],
    projetos: [{ id: 5, status: "ativo", desc: "" }],
  };
  assert.equal(projetoEstaDetalhado(cliente), true);
});

test("campos legados continuam funcionando para clientes antigos sem array projetos", () => {
  const cliente = { descricao: "Tatuagem floral", regiao: "costas" };
  assert.equal(projetoEstaDetalhado(cliente), true);
});

test("caso real confirmado na auditoria: Thays Araújo -- projeto ativo com descrição vazia, sem região nem referência, não é Projeto detalhado", () => {
  const cliente = {
    nome: "Thays Araújo",
    regiao: "",
    referencias: [],
    projetos: [{ id: 1723000000000, status: "ativo", desc: "" }],
  };
  assert.equal(projetoEstaDetalhado(cliente), false);
});

test("nenhuma lista de referências com 6 ou 20 itens é cortada -- só a presença de item real importa, tamanho da lista é irrelevante pro critério", () => {
  const seis = Array.from({ length: 6 }, (_, i) => `https://x/img${i}.jpg`);
  const vinte = Array.from({ length: 20 }, (_, i) => `https://x/img${i}.jpg`);
  assert.equal(projetoEstaDetalhado({ referencias: seis, regiao: "braço" }), true);
  assert.equal(projetoEstaDetalhado({ referencias: vinte, regiao: "braço" }), true);
  // a própria função nunca corta/modifica a lista recebida
  const original = [...vinte];
  projetoEstaDetalhado({ referencias: vinte, regiao: "braço" });
  assert.deepEqual(vinte, original);
});

test("referencias que não é array (undefined, string, objeto) não lança exceção e não conta", () => {
  assert.doesNotThrow(() => projetoEstaDetalhado({ referencias: undefined, descricao: "x", regiao: "y" }));
  assert.equal(projetoEstaDetalhado({ referencias: "não é array", descricao: "x" }), false);
});

// ── Revisão Técnica Complementar (2026-08-14, item 5) ───────────────────────
// Região e referências só existem hoje em nível de cliente (campo solto),
// nunca de fato por projeto -- mesmo quando o cadastro manual grava uma
// cópia de "regiao" dentro do item de projetos[] na criação, nada volta a
// ler essa cópia depois. Isso significa que região/referências podem, em
// teoria, ter sido preenchidas para uma solicitação diferente da que está
// ativa agora. Este teste fixa o comportamento ESCOLHIDO (não o ideal): a
// função sempre conta região/referências do campo solto do cliente, mesmo
// quando existe um projeto ativo mais recente com uma descrição diferente
// -- por ser a única fonte desses dois campos hoje mantida por qualquer
// caminho de criação/edição. Corrigir isso de verdade exige guardar região
// e referências por projeto, o que fica para o próximo bloco (reconstrução
// do formulário do site) -- ver "LIMITAÇÃO CONHECIDA" no docblock de
// projetoAtivoMaisRecente() e em docs/05-unificacao-clientes-interessados.md.
test("comportamento escolhido (limitação conhecida, não corrigida neste bloco): região do cliente pode ter sido preenchida para uma solicitação anterior, mas ainda conta junto com a descrição da solicitação ativa atual", () => {
  const cliente = {
    // regiao ainda reflete a solicitação ANTERIOR (já cancelada) -- nunca foi
    // limpa quando a nova solicitação ativa começou
    regiao: "braço (da solicitação antiga, já cancelada)",
    referencias: [],
    projetos: [
      { id: 1, status: "cancelado", desc: "Solicitação antiga: tatuagem no braço", regiao: "braço (da solicitação antiga, já cancelada)", criadoEm: "01/01/2026" },
      { id: 2, status: "ativo", desc: "Solicitação nova: tatuagem nas costas", criadoEm: "10/08/2026" },
    ],
  };
  // 2 critérios reais (descrição da solicitação ativa + região, mesmo a
  // região pertencendo à solicitação cancelada) -> comportamento atual conta
  // como Projeto detalhado, apesar da mistura -- risco documentado, aceito
  // como a opção menos enganosa disponível sem redesenhar o formulário.
  assert.equal(projetoEstaDetalhado(cliente), true);
});
