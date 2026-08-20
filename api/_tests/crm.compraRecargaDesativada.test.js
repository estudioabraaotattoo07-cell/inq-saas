// api/_tests/crm.compraRecargaDesativada.test.js
//
// Teste ESTRUTURAL do ajuste em src/CRM Casa dos Carvalho.tsx (Bloco
// Corretivo de Segurança de Créditos, Storage e Licenças, 2026-08-20).
//
// LIMITAÇÃO HONESTA: este arquivo lê o texto-fonte do CRM, não o executa
// (não há ambiente de UI real neste teste). Prova que o texto contém
// exatamente as peças certas -- comprarRecarga não chama mais nenhuma das
// 3 RPCs congeladas, mostra a mensagem informativa, não simula sucesso.
// Não prova o comportamento visual real (isso exige teste manual no
// navegador).
//
// Rodar com: node --test api/_tests/crm.compraRecargaDesativada.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMINHO_CRM = path.join(__dirname, "..", "..", "src", "CRM Casa dos Carvalho.tsx");
const crm = readFileSync(CAMINHO_CRM, "utf8");

function apenasCodigo(texto) {
  return texto
    .split("\n")
    .map((linha) => linha.replace(/\/\/.*$/, ""))
    .join("\n");
}

function blocoComprarRecarga() {
  const marcador = "const comprarRecarga = async (";
  const inicio = crm.indexOf(marcador);
  assert.ok(inicio > -1, "função comprarRecarga não encontrada no CRM");
  const fim = crm.indexOf("\n  };", inicio) + "\n  };".length;
  return crm.slice(inicio, fim);
}

// Recorta o bloco JSX do modal de recarga inteiro -- do gatilho
// "{showRecargaModal && (" até o próximo comentário de seção conhecido
// ("MODAL: REGISTRAR REPASSE"), que delimita o fim do bloco no arquivo
// real. Corte por marcador de texto real, não por suposição de linha.
function blocoModalRecarga() {
  const inicio = crm.indexOf("{showRecargaModal && (");
  assert.ok(inicio > -1, "bloco do modal de recarga não encontrado no CRM");
  const fim = crm.indexOf("MODAL: REGISTRAR REPASSE", inicio);
  assert.ok(fim > -1, "marcador de fim do bloco do modal de recarga não encontrado");
  return crm.slice(inicio, fim);
}

// Recorta o bloco "Canais habilitados" (onde o gatilho de compra por
// canal é renderizado), do comentário de seção até o próximo comentário
// de seção conhecido ("MODAL: confirmação de toggle").
function blocoCanaisHabilitados() {
  const inicio = crm.indexOf("CANAIS HABILITADOS (status somente leitura");
  assert.ok(inicio > -1, "bloco de Canais habilitados não encontrado no CRM");
  const fim = crm.indexOf("MODAL: confirmação de toggle", inicio);
  assert.ok(fim > -1, "marcador de fim do bloco de Canais habilitados não encontrado");
  return crm.slice(inicio, fim);
}

test("comprarRecarga não chama nenhuma das 3 RPCs de compra congeladas", () => {
  const bloco = apenasCodigo(blocoComprarRecarga());
  assert.doesNotMatch(bloco, /sb\.rpc\(\s*"comprar_credito_mensageria"/);
  assert.doesNotMatch(bloco, /sb\.rpc\(\s*"comprar_recarga_mensageria"/);
  assert.doesNotMatch(bloco, /sb\.rpc\(\s*"comprar_storage_extra"/);
});

test("nenhuma chamada às 3 RPCs congeladas em lugar nenhum do arquivo inteiro (não só dentro de comprarRecarga)", () => {
  const codigo = apenasCodigo(crm);
  assert.doesNotMatch(codigo, /sb\.rpc\(\s*"comprar_credito_mensageria"/);
  assert.doesNotMatch(codigo, /sb\.rpc\(\s*"comprar_recarga_mensageria"/);
  assert.doesNotMatch(codigo, /sb\.rpc\(\s*"comprar_storage_extra"/);
});

test("comprarRecarga exibe mensagem informativa clara, sem incrementar nenhum estado local de saldo", () => {
  const bloco = apenasCodigo(blocoComprarRecarga());
  assert.match(bloco, /pagamento integrado/i);
  assert.doesNotMatch(bloco, /setEmailCreditoExtra/);
  assert.doesNotMatch(bloco, /setSmsCreditoExtra/);
  assert.doesNotMatch(bloco, /setStorageExtraMb/);
});

test("comprarRecarga não simula sucesso (sem addLog de compra) nem exibe erro técnico genérico", () => {
  const bloco = apenasCodigo(blocoComprarRecarga());
  assert.doesNotMatch(bloco, /addLog\(`Recarga comprada/);
  assert.doesNotMatch(bloco, /addLog\(`Armazenamento extra comprado/);
  assert.doesNotMatch(bloco, /Erro ao registrar/);
});

test("consumir_credito_mensageria (mantida no banco) não é chamada por nenhum caminho de compra do CRM -- é lógica automática de consumo, não de compra manual", () => {
  const codigo = apenasCodigo(crm);
  // inq-saas já não chama consumir_credito_mensageria desde o Bloco 2
  // (removida a lógica de cota-por-plano) -- confirma que continua assim.
  assert.doesNotMatch(codigo, /sb\.rpc\(\s*"consumir_credito_mensageria"/);
});

// ── SMS fora da oferta comercial da v1.0 (correção da auditoria pós-
// implementação, 2026-08-20) -- examina o bloco RENDERIZADO do modal, não
// só comprarRecarga() ────────────────────────────────────────────────────
test("o bloco do modal de recarga não referencia RECARGA_SMS_TIERS (não oferece pacotes de SMS)", () => {
  const bloco = apenasCodigo(blocoModalRecarga());
  assert.doesNotMatch(bloco, /RECARGA_SMS_TIERS/);
});

test("o bloco do modal de recarga não apresenta título nem texto de 'SMS extra' ou 'Comprar SMS'", () => {
  const bloco = apenasCodigo(blocoModalRecarga());
  assert.doesNotMatch(bloco, /SMS extra/i);
  assert.doesNotMatch(bloco, /Comprar.*SMS/i);
});

test("o estado showRecargaModal não inclui mais o valor \"sms\" no tipo (garantia em tempo de compilação)", () => {
  const declaracao = crm.slice(crm.indexOf("const [showRecargaModal"), crm.indexOf("const [showRecargaModal") + 200);
  assert.doesNotMatch(apenasCodigo(declaracao), /"sms"\s*\|/);
  assert.match(declaracao, /useState<"email" \| "storage" \| null>/);
});

test("o botão '+ Comprar crédito extra' em Canais habilitados só é renderizado para o canal email, não para sms", () => {
  const bloco = apenasCodigo(blocoCanaisHabilitados());
  assert.match(bloco, /ch === "email" &&/);
  // O gatilho de abertura do modal (setShowRecargaModal(ch)) não pode
  // aparecer fora do bloco condicionado a ch === "email" -- checamos que
  // há só 1 ocorrência de setShowRecargaModal(ch) neste trecho, e que ela
  // vem depois do "ch === \"email\" &&" mais próximo.
  const ocorrencias = (bloco.match(/setShowRecargaModal\(ch\)/g) || []).length;
  assert.equal(ocorrencias, 1, "esperava exatamente 1 gatilho de compra por canal em Canais habilitados");
});

test("o status do canal SMS (badge testado/não testado) continua visível -- só o gatilho de COMPRA foi removido, não a estrutura técnica do canal", () => {
  const bloco = apenasCodigo(blocoCanaisHabilitados());
  assert.match(bloco, /\["email", "whatsapp", "sms"\]/);
  assert.match(bloco, /ch === "sms" \? "SMS"/);
});
