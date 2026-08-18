// api/_tests/crm.normalizacaoContato3.4.test.js
//
// Refinamento de Contato da Ficha do Cliente, pós-Bloco 3.4A (2026-08-18).
// Três mudanças isoladas em src/CRM Casa dos Carvalho.tsx:
//
// 1. Instagram do cliente: comportamento híbrido aprovado --
//    onChange (fichaDraft) aplica só @+minúsculas de forma leve, ao vivo,
//    exatamente como já existia antes deste bloco (comportamento visual
//    preservado); normalizarInstagram() faz a canonização definitiva
//    (remove @ redundante, protocolo, www., "instagram.com/", barra final,
//    query string) só dentro de salvarFichaAlteracoes, antes de
//    saveClientDb -- nunca no onChange, nunca em onBlur.
// 2. E-mail do cliente: trim()+toLowerCase() só dentro de
//    salvarFichaAlteracoes -- onChange permanece sem nenhuma transformação.
// 3. linkWhatsAppCliente(tel): helper único, substitui as duas fórmulas
//    idênticas que estavam duplicadas na ficha (assinatura de documento e
//    confirmação de presença). Devolve a URL base (sem "?text=..."), cada
//    chamador anexa sua própria mensagem.
//
// Fora de escopo (não tocado, não testado aqui): api/lead.js, api/zenvia.js,
// backend, SQL/Supabase/schema, Histórico (hist/historico), Resumo Premium,
// Integrações, hardening de api/aura.js/api/upload.js.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): estrutural/textual,
// sem DOM real/Supabase.
//
// Rodar com: node --test api/_tests/crm.normalizacaoContato3.4.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcCrm = readFileSync(path.join(__dirname, "..", "..", "src", "CRM Casa dos Carvalho.tsx"), "utf8");

// Extrai e executa normalizarInstagram/linkWhatsAppCliente como funções
// JS reais (não regex sobre o texto) -- mesma técnica de extração usada
// para formatarTelefone/telefoneValido em outros arquivos deste projeto,
// adaptada para funções declaradas dentro do .tsx (não exportadas por
// módulo, então extraímos o texto da função e a avaliamos isoladamente).
function extrairFuncao(nome) {
  const inicio = srcCrm.indexOf(`function ${nome}(`);
  assert.ok(inicio !== -1, `função ${nome} não encontrada no arquivo`);
  // Encontra o fechamento do corpo contando chaves, a partir do primeiro "{".
  let i = srcCrm.indexOf("{", inicio);
  let profundidade = 0;
  for (; i < srcCrm.length; i++) {
    if (srcCrm[i] === "{") profundidade++;
    else if (srcCrm[i] === "}") {
      profundidade--;
      if (profundidade === 0) { i++; break; }
    }
  }
  const corpoTs = srcCrm.slice(inicio, i);
  // Remove anotações de tipo TypeScript simples (": string", "): string")
  // suficientes para essas duas funções específicas -- não é um transpiler
  // genérico, só o necessário para tornar este trecho executável como JS puro.
  const corpoJs = corpoTs
    .replace(/function (\w+)\(v: string\)/, "function $1(v)")
    .replace(/function (\w+)\(tel: string\)/, "function $1(tel)")
    .replace(/\): string \{/, ") {");
  const fn = new Function(`${corpoJs}\nreturn ${nome};`)();
  return fn;
}

const normalizarInstagram = extrairFuncao("normalizarInstagram");
const linkWhatsAppCliente = extrairFuncao("linkWhatsAppCliente");

// ═══════════════════════════════════════════════════════════════════════════
// normalizarInstagram() -- execução real, todos os casos do pedido
// ═══════════════════════════════════════════════════════════════════════════

test("normalizarInstagram: handle simples vira @minusculo", () => {
  assert.equal(normalizarInstagram("AbraaoTattoo"), "@abraaotattoo");
});
test("normalizarInstagram: já com @ vira @minusculo, sem duplicar @", () => {
  assert.equal(normalizarInstagram("@AbraaoTattoo"), "@abraaotattoo");
});
test("normalizarInstagram: instagram.com/usuario", () => {
  assert.equal(normalizarInstagram("instagram.com/AbraaoTattoo"), "@abraaotattoo");
});
test("normalizarInstagram: https://instagram.com/usuario/", () => {
  assert.equal(normalizarInstagram("https://instagram.com/AbraaoTattoo/"), "@abraaotattoo");
});
test("normalizarInstagram: https://www.instagram.com/usuario/", () => {
  assert.equal(normalizarInstagram("https://www.instagram.com/AbraaoTattoo/"), "@abraaotattoo");
});
test("normalizarInstagram: espaços nas extremidades são removidos", () => {
  assert.equal(normalizarInstagram("  usuario  "), "@usuario");
});
test("normalizarInstagram: vazio continua vazio", () => {
  assert.equal(normalizarInstagram(""), "");
  assert.equal(normalizarInstagram("   "), "");
});
test("normalizarInstagram: '@' sozinho nunca persiste como só '@'", () => {
  assert.equal(normalizarInstagram("@"), "");
});
test("normalizarInstagram: robusta a valor JÁ prefixado com @ pelo onChange envolvendo uma URL colada (prova da verificação de conflito pré-implementação)", () => {
  // Simula exatamente o que o onChange híbrido produziria se o usuário
  // colasse uma URL no campo: "@" + a URL inteira em minúsculas.
  assert.equal(normalizarInstagram("@https://www.instagram.com/abraaotattoo/"), "@abraaotattoo");
  assert.equal(normalizarInstagram("@instagram.com/abraaotattoo"), "@abraaotattoo");
});

// ═══════════════════════════════════════════════════════════════════════════
// linkWhatsAppCliente() -- execução real
// ═══════════════════════════════════════════════════════════════════════════

test("linkWhatsAppCliente: telefone sem 55 recebe o prefixo", () => {
  assert.equal(linkWhatsAppCliente("27999998888"), "https://wa.me/5527999998888");
});
test("linkWhatsAppCliente: telefone já com 55 não duplica o prefixo", () => {
  assert.equal(linkWhatsAppCliente("5527999998888"), "https://wa.me/5527999998888");
});
test("linkWhatsAppCliente: remove máscara antes de montar o link", () => {
  assert.equal(linkWhatsAppCliente("(27) 99999-8888"), "https://wa.me/5527999998888");
});
test("linkWhatsAppCliente: não inclui '?text=' -- URL base, cada chamador anexa a própria mensagem", () => {
  assert.doesNotMatch(linkWhatsAppCliente("27999998888"), /\?text=/);
});

// ═══════════════════════════════════════════════════════════════════════════
// onChange do Instagram: só @+minúsculas visual, sempre em fichaDraft
// ═══════════════════════════════════════════════════════════════════════════

function trechoOnChangeDadosBasicos() {
  const marcador = 'fd.f === "insta" ? (v ?';
  const idxMarcador = srcCrm.indexOf(marcador);
  assert.ok(idxMarcador !== -1, "onChange do loop de Dados Básicos não encontrado");
  const inicio = srcCrm.lastIndexOf("onChange={e => {", idxMarcador);
  const fim = srcCrm.indexOf("}}", idxMarcador) + 2;
  return srcCrm.slice(inicio, fim);
}

test("onChange do campo Instagram aplica @+minúsculas de forma leve (sem interpretar URL) e escreve só via setFichaDraftField", () => {
  const trecho = trechoOnChangeDadosBasicos();
  assert.match(trecho, /fd\.f === "insta" \? \(v \? \(v\.toLowerCase\(\)\.startsWith\("@"\) \? "@" \+ v\.toLowerCase\(\)\.slice\(1\) : "@" \+ v\.toLowerCase\(\)\) : ""\)/);
  assert.match(trecho, /setFichaDraftField\(sc\.id, fd\.f, vFinal\);/);
  assert.doesNotMatch(trecho, /normalizarInstagram/, "onChange não deve chamar a canonização completa -- isso é exclusivo de salvarFichaAlteracoes");
  assert.doesNotMatch(trecho, /upCFicha|upC\(|upCLocal|saveClientDb|sb\.from/, "onChange não pode, em nenhuma hipótese, tocar clients/banco -- provaria reintrodução de autosave");
});

test("onChange do campo E-mail permanece sem nenhuma transformação (trim/lowercase só acontece em salvarFichaAlteracoes)", () => {
  const trecho = trechoOnChangeDadosBasicos();
  // A expressão inteira do vFinal só trata "tel" e "insta" como casos
  // especiais; email cai no "else" final (": v"), sem toLowerCase/trim.
  assert.match(trecho, /: v;\s*\n\s*setFichaDraftField/, "email deveria cair no branch final 'v' sem transformação");
});

// ═══════════════════════════════════════════════════════════════════════════
// salvarFichaAlteracoes: canonização definitiva antes de saveClientDb
// ═══════════════════════════════════════════════════════════════════════════

function trechoSalvarFichaAlteracoes() {
  const inicio = srcCrm.indexOf("const salvarFichaAlteracoes = async (clienteAtual: any) => {");
  const fim = srcCrm.indexOf("\n  };", inicio) + "\n  };".length;
  assert.ok(inicio !== -1, "salvarFichaAlteracoes não encontrada");
  return srcCrm.slice(inicio, fim);
}

test("salvarFichaAlteracoes normaliza insta/email ANTES de montar 'atualizado' e chamar saveClientDb", () => {
  const trecho = trechoSalvarFichaAlteracoes();
  const idxInsta = trecho.indexOf('if ("insta" in camposDraft) camposDraft.insta = normalizarInstagram(camposDraft.insta as string);');
  const idxEmail = trecho.indexOf('if ("email" in camposDraft) camposDraft.email = ((camposDraft.email as string) || "").trim().toLowerCase();');
  const idxAtualizado = trecho.indexOf("const atualizado = { ...clienteAtual, ...camposDraft };");
  const idxSave = trecho.indexOf("const resultado = await saveClientDb(atualizado);");
  assert.ok(idxInsta !== -1 && idxEmail !== -1 && idxAtualizado !== -1 && idxSave !== -1);
  assert.ok(idxInsta < idxAtualizado && idxEmail < idxAtualizado && idxAtualizado < idxSave,
    "normalização precisa acontecer antes do objeto 'atualizado' ser montado e antes de saveClientDb");
});

test("normalização só ocorre para campos efetivamente presentes no draft ('in camposDraft') -- edição de outro campo não força reescrita de insta/email intocados", () => {
  const trecho = trechoSalvarFichaAlteracoes();
  assert.match(trecho, /if \("insta" in camposDraft\)/);
  assert.match(trecho, /if \("email" in camposDraft\)/);
});

test("falha de persistência não deixa rastro de normalização em fichaDraft: a mutação é só em camposDraft (variável local), setFichaDraft nunca é chamado antes do sucesso", () => {
  const trecho = trechoSalvarFichaAlteracoes();
  const idxIf = trecho.indexOf("if (resultado) {");
  const antesDoIf = trecho.slice(0, idxIf);
  assert.doesNotMatch(antesDoIf, /setFichaDraft\(/, "fichaDraft (estado real) não pode ser tocado antes da confirmação de sucesso");
  assert.doesNotMatch(antesDoIf, /setClients\(/, "clients não pode ser tocado antes da confirmação de sucesso");
});

// ═══════════════════════════════════════════════════════════════════════════
// linkWhatsAppCliente aplicado nos dois pontos antes duplicados
// ═══════════════════════════════════════════════════════════════════════════

test("assinatura de documento usa linkWhatsAppCliente -- fórmula duplicada antiga não existe mais nesse trecho", () => {
  const inicio = srcCrm.indexOf("const linkDoc = (sc as any).assinar_link?.[doc.id]?.token");
  const fim = srcCrm.indexOf("const waUrl =", inicio) + 200;
  const trecho = srcCrm.slice(inicio - 200, fim);
  assert.match(trecho, /const waUrl = `\$\{linkWhatsAppCliente\(\(sc as any\)\.tel\)\}\?text=\$\{encodeURIComponent\(msgWa\)\}`;/);
  assert.doesNotMatch(trecho, /telWa\.startsWith\("55"\)/);
});

test("confirmação de presença usa linkWhatsAppCliente -- fórmula duplicada antiga não existe mais nesse trecho", () => {
  const inicio = srcCrm.indexOf('const msg = `Olá! Confirme sua presença');
  const trecho = srcCrm.slice(inicio - 300, inicio + 400);
  assert.match(trecho, /window\.open\(`\$\{linkWhatsAppCliente\(\(sc as any\)\.tel\)\}\?text=\$\{encodeURIComponent\(msg\)\}`, "_blank"\);/);
  assert.doesNotMatch(trecho, /telWa\.startsWith\("55"\)/);
});

test("nenhuma outra ocorrência de 'telWa.startsWith(\"55\")' restou no arquivo -- as duas duplicações foram exaustivamente substituídas", () => {
  assert.doesNotMatch(srcCrm, /telWa\.startsWith\("55"\)/);
});

test("WhatsApp do estúdio/suporte (fora de escopo) permanece com sua própria lógica, não foi migrado para linkWhatsAppCliente", () => {
  // waLink de piercing/pós-venda (CRM.tsx, const waLink = "https://wa.me/55" + waNumero + ...)
  // continua com sua própria expressão -- é o telefone do ESTÚDIO, não do cliente.
  assert.match(srcCrm, /"https:\/\/wa\.me\/55" \+ waNumero \+/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo negativo -- Histórico, backend, arquivos fora do CRM
// ═══════════════════════════════════════════════════════════════════════════

test("clientes.hist não ganhou nenhuma escrita nova relacionada a este refinamento", () => {
  const trechoSalvar = trechoSalvarFichaAlteracoes();
  assert.doesNotMatch(trechoSalvar, /hist/);
});

test("tabela global 'historico' não é referenciada em nenhuma das funções deste refinamento", () => {
  const trechoSalvar = trechoSalvarFichaAlteracoes();
  assert.doesNotMatch(trechoSalvar, /sb\.from\("historico"\)|addLog\(/);
});
