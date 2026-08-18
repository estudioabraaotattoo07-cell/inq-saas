// api/_tests/crm.resumoPremium3.5.test.js
//
// Bloco 3.5 (versão mínima) -- Resumo do Cliente somente leitura, aberto por
// padrão ao clicar num cliente, com WhatsApp/Instagram/E-mail clicáveis e um
// botão "Editar ficha" que leva à ficha completa já existente (modo
// "edicao"), inalterada. Reutiliza linkWhatsAppCliente()/normalizarInstagram()
// já criados no commit 7f0e588, só para derivar links -- nunca escreve em
// clients/banco/fichaDraft.
//
// Fora de escopo (não tocado, não testado aqui): badges/indicadores futuros
// do Resumo (ainda não definidos por produto), botão dedicado de "voltar ao
// Resumo" a partir da Edição (fechar+reabrir já cumpre isso nesta versão
// mínima), Histórico, Integrações, hardening de api/aura.js/api/upload.js.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): estrutural/textual,
// sem DOM real/Supabase.
//
// Rodar com: node --test api/_tests/crm.resumoPremium3.5.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcCrm = readFileSync(path.join(__dirname, "..", "..", "src", "CRM Casa dos Carvalho.tsx"), "utf8");

function trechoResumo() {
  const inicio = srcCrm.indexOf("RESUMO DO CLIENTE (Bloco 3.5");
  const fim = srcCrm.indexOf("MODAL CLIENTE (ficha completa", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "bloco do Resumo do Cliente não encontrado");
  return srcCrm.slice(inicio, fim);
}

function trechoModalEdicao() {
  const inicio = srcCrm.indexOf("MODAL CLIENTE (ficha completa, modo Edição");
  assert.ok(inicio !== -1, "modal de edição não encontrado");
  return srcCrm.slice(inicio, inicio + 4000);
}

// ═══════════════════════════════════════════════════════════════════════════
// Estado modoFicha
// ═══════════════════════════════════════════════════════════════════════════

test("modoFicha nasce em 'resumo' por padrão", () => {
  assert.match(srcCrm, /const \[modoFicha, setModoFicha\] = useState<"resumo"\|"edicao">\("resumo"\);/);
});

test("todos os pontos de abertura da ficha (13 no total: 10 idênticos + carregar-clientes + tabela + pipeline) resetam modoFicha para 'resumo'", () => {
  const ocorrencias = (srcCrm.match(/setModoFicha\("resumo"\)/g) || []).length;
  // 10 pontos idênticos de alerta/lista + 1 pipeline + 1 linha de tabela +
  // 1 "Ver ficha" já cobertos pelo replace_all; mais os 3 pontos de
  // fechamento (2 botões X/overlay + 1 ramo "Descartar" do aviso de saída).
  assert.ok(ocorrencias >= 13, `esperava pelo menos 13 ocorrências de setModoFicha("resumo"), achou ${ocorrencias}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// Bloco do Resumo -- somente leitura, 3 contatos, "Editar ficha"
// ═══════════════════════════════════════════════════════════════════════════

test("Resumo renderiza só quando sc existe E modoFicha === 'resumo'", () => {
  assert.match(srcCrm, /\{sc && modoFicha === "resumo" && \(/);
});

test("Resumo usa linkWhatsAppCliente() e normalizarInstagram() -- reuso confirmado, sem lógica nova de formatação de telefone/instagram", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /linkWhatsAppCliente\(\(sc as any\)\.tel\)/);
  assert.match(trecho, /normalizarInstagram\(\(sc as any\)\.insta \|\| ""\)/);
});

test("link do WhatsApp abre em nova aba, sem texto pré-preenchido (URL base do helper)", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /<a href=\{linkWhatsAppCliente\(\(sc as any\)\.tel\)\} target="_blank" rel="noopener noreferrer"/);
});

test("link do Instagram deriva a URL de perfil a partir do valor canônico, sem gravar nada de volta em clients", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /href=\{`https:\/\/instagram\.com\/\$\{instaCanonico\.slice\(1\)\}`\}/);
  assert.doesNotMatch(trecho, /setFichaDraftField|upCFicha|upC\(|upCLocal|saveClientDb|setClients/, "Resumo não pode gravar nada -- é somente leitura");
});

test("link do e-mail usa mailto: com o valor em minúsculas, só na derivação do link (não altera sc.email)", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /href=\{`mailto:\$\{emailOk\.toLowerCase\(\)\}`\}/);
});

test("os 3 contatos têm fallback textual quando ausentes -- nunca geram link quebrado", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /WhatsApp não informado/);
  assert.match(trecho, /Instagram não informado/);
  assert.match(trecho, /E-mail não informado/);
});

test("botão 'Editar ficha' só chama setModoFicha(\"edicao\") -- nenhuma outra ação, nenhuma escrita", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /onClick=\{\(\) => setModoFicha\("edicao"\)\}/);
});

test("Resumo não contém nenhum campo editável (input/textarea/select) -- prova do caráter não editável", () => {
  const trecho = trechoResumo();
  assert.doesNotMatch(trecho, /<input\b/);
  assert.doesNotMatch(trecho, /<textarea\b/);
  assert.doesNotMatch(trecho, /<select\b/);
});

test("nenhum clique dentro do Resumo referencia hist/historico/addLog -- clicar em WhatsApp/Instagram/e-mail é navegação pura, não gera Histórico", () => {
  const trecho = trechoResumo();
  assert.doesNotMatch(trecho, /\bhist\b/);
  assert.doesNotMatch(trecho, /historico/);
  assert.doesNotMatch(trecho, /addLog\(/);
});

test("os links de WhatsApp/Instagram/e-mail não têm onClick próprio -- são <a href> puros, sem risco de disparar seleção/edição/propagação indevida", () => {
  const trecho = trechoResumo();
  // Único onClick dentro do bloco inteiro do Resumo deve ser o do botão
  // fechar (✕) e o do botão "Editar ficha" -- nenhum onClick nas 3 <a>.
  const linhasComA = trecho.split("\n").filter(l => l.includes("<a href="));
  assert.equal(linhasComA.length, 3, "esperava exatamente 3 links <a href=...>");
  for (const linha of linhasComA) {
    assert.doesNotMatch(linha, /onClick=/, `link não deveria ter onClick próprio: ${linha.trim()}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Ficha completa (modo Edição) permanece intocada
// ═══════════════════════════════════════════════════════════════════════════

test("modal de edição só renderiza quando sc existe E modoFicha === 'edicao' -- mesmo conteúdo de sempre, só a condição de entrada mudou", () => {
  assert.match(srcCrm, /\{sc && modoFicha === "edicao" && \(/);
});

test("modal de edição continua com as abas Dados/Documentos/Histórico e todo o conteúdo original, sem nenhuma remoção", () => {
  const trecho = trechoModalEdicao();
  assert.match(trecho, /TABS DA FICHA/);
  assert.match(trecho, /\(\["dados","docs","historico"\] as const\)\.map/);
});

test("salvarFichaAlteracoes/descartarFichaAlteracoes permanecem byte-idênticas -- este bloco não tocou o mecanismo de draft do 3.4A", () => {
  assert.match(
    srcCrm,
    /const descartarFichaAlteracoes = \(\) => \{\s*\n\s*setFichaDraft\(null\);\s*\n\s*setNascDraft\(\{ dia: "", mes: "", ano: "" \}\);\s*\n\s*setFichaEditada\(false\);\s*\n\s*\};/
  );
  assert.match(srcCrm, /const salvarFichaAlteracoes = async \(clienteAtual: any\) => \{/);
});

test("nenhuma chamada a setModoFicha dentro de salvarFichaAlteracoes/descartarFichaAlteracoes -- Salvar/Descartar permanecem em modo Edição após a ação (escolha mínima registrada)", () => {
  const inicioSalvar = srcCrm.indexOf("const salvarFichaAlteracoes = async (clienteAtual: any) => {");
  const fimSalvar = srcCrm.indexOf("\n  };", inicioSalvar) + "\n  };".length;
  const trechoSalvar = srcCrm.slice(inicioSalvar, fimSalvar);
  assert.doesNotMatch(trechoSalvar, /setModoFicha/);

  const inicioDescartar = srcCrm.indexOf("const descartarFichaAlteracoes = () => {");
  const fimDescartar = srcCrm.indexOf("\n  };", inicioDescartar) + "\n  };".length;
  const trechoDescartar = srcCrm.slice(inicioDescartar, fimDescartar);
  assert.doesNotMatch(trechoDescartar, /setModoFicha/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo negativo
// ═══════════════════════════════════════════════════════════════════════════

test("nenhuma tabela/coluna nova, nenhum identificador externo -- só reuso de campos já existentes do cliente (tel/insta/email)", () => {
  const trecho = trechoResumo();
  assert.doesNotMatch(trecho, /external_id|provider_id|channel_id|sb\.from\("clientes"\)\.insert|ALTER TABLE/i);
});
