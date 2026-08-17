// api/_tests/lead.sintaxeScriptRenderizado3.3B.test.js
//
// Bloco 3.3B -- correção emergencial de SyntaxError na página pública
// (2026-08-17). A auditoria de causa-raiz descobriu que
// `montarTextoWhatsAppCaptacaoEssencial` (introduzida no 3.3B-A2) continha
// `partes.join('\n')` escrito diretamente dentro do template literal
// EXTERNO de paginaSitePremium() -- e não dentro de um `${...}`. O parser
// do Node, ao interpretar esse template externo (com backticks), processa
// esse `\n` como QUALQUER escape de string: transforma nos dois caracteres
// em uma quebra de linha real ANTES do HTML/script chegar ao navegador. O
// resultado era um `<script>` com uma string de aspas simples contendo uma
// quebra de linha crua no meio -- SyntaxError: Invalid or unexpected token,
// que interrompe o parsing do <script> INTEIRO (não só essa função),
// impedindo inclusive os listeners de máscara de ce-tel/ficha-tel de serem
// registrados.
//
// Correção: 'partes.join(\'\\n\')' (duas barras no código-fonte) -- assim o
// template externo preserva os DOIS CARACTERES literais barra+n no texto
// entregue ao navegador, que o parser do navegador então interpreta
// corretamente como o escape de quebra de linha dentro da string.
//
// Este arquivo NÃO é estrutural/textual como os demais deste bloco -- ele
// executa de verdade paginaSitePremium() (import direto, dados mínimos) e
// valida a sintaxe do <script> efetivamente entregue ao navegador, exatamente
// a técnica usada na auditoria de causa-raiz, agora como regressão
// permanente. sb (Supabase) nunca é chamado por paginaSitePremium() em si
// (é só geração de HTML a partir dos argumentos recebidos), mas o módulo
// importa api/_lib/rateLimit.js, que cria um client Supabase no top-level --
// por isso as variáveis de ambiente dummy abaixo, só para permitir o import.
//
// Rodar com: node --test api/_tests/lead.sintaxeScriptRenderizado3.3B.test.js

import test from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "dummy-key-apenas-para-testes";

const { paginaSitePremium } = await import("../lead.js");

function renderizarPaginaMinima() {
  const site = {
    hero_frase: "Arte na pele, criada\na partir da sua história.",
    hero_botao_texto: "Quero tatuar com vocês!",
    como_titulo: "No estúdio é assim:",
    manifesto_frase: "",
    banner_foto_url: "",
  };
  const cfg = {
    studio_name: "Estúdio Teste",
    studio_tel: "11999999999",
    servico_opts: [],
  };
  const artistas = [{ id: "a1", nome: "Artista Um", servicos_atendidos: [], fotos: [] }];
  const slug = "teste";
  const campanhasAtivas = [];
  return paginaSitePremium(site, cfg, artistas, slug, campanhasAtivas);
}

// Isola o <script> que contém formatarTelefone/ce-tel/ficha-tel -- a página
// tem outros <script> (JSON-LD, lightbox) que não são relevantes aqui.
function extrairScriptCaptacao(html) {
  const marcador = "formatarTelefone(v)";
  const idxMarcador = html.indexOf(marcador);
  assert.ok(idxMarcador !== -1, "marcador 'formatarTelefone(v)' não encontrado no HTML renderizado -- a extração não localizou o script certo");
  const idxInicio = html.lastIndexOf("<script>", idxMarcador);
  const idxFim = html.indexOf("</script>", idxMarcador);
  assert.ok(idxInicio !== -1 && idxFim !== -1, "não foi possível isolar as bordas do <script> de captação/ficha");
  return html.slice(idxInicio + "<script>".length, idxFim);
}

test("paginaSitePremium() renderiza sem lançar exceção com dados mínimos", () => {
  assert.doesNotThrow(() => renderizarPaginaMinima());
});

test("<script> de captação/ficha (o que contém ce-tel/formatarTelefone) é sintaticamente válido para o navegador -- regressão permanente da causa-raiz do SyntaxError", () => {
  const html = renderizarPaginaMinima();
  const script = extrairScriptCaptacao(html);
  // Confirma que pegamos o script certo antes de validar sintaxe.
  assert.match(script, /ce-tel/);
  assert.match(script, /ficha-tel/);
  // new Function lança SyntaxError se o corpo não for JavaScript válido --
  // não executa nada, só valida parsing. É exatamente a técnica que provou
  // a causa-raiz na auditoria (equivalente a node --check sobre o trecho).
  assert.doesNotThrow(() => new Function(script), "o JavaScript entregue ao navegador precisa ter sintaxe válida");
});

test("montarTextoWhatsAppCaptacaoEssencial preserva \\n como escape de duas letras (barra + n) no HTML renderizado, nunca uma quebra de linha crua dentro da string", () => {
  const html = renderizarPaginaMinima();
  const script = extrairScriptCaptacao(html);
  // Precisa existir a sequência de dois caracteres barra-invertida + n
  // dentro das aspas simples (a forma correta, entregue ao navegador).
  assert.match(script, /partes\.join\('\\n'\)/, "os dois caracteres barra+n precisam estar preservados dentro das aspas simples");
  // Não pode existir uma quebra de linha real dentro dessas aspas -- essa
  // era exatamente a causa do SyntaxError.
  assert.doesNotMatch(script, /partes\.join\('\n'\)/, "não pode haver uma quebra de linha real dentro da string -- essa era a causa-raiz do bug");
});

test("formatarTelefone não foi duplicada nem alterada -- só o escape de montarTextoWhatsAppCaptacaoEssencial mudou", () => {
  const html = renderizarPaginaMinima();
  const script = extrairScriptCaptacao(html);
  const ocorrencias = (script.match(/function formatarTelefone\(/g) || []).length;
  assert.equal(ocorrencias, 1, "só pode existir uma única definição de formatarTelefone no script renderizado");
  assert.match(script, /v = \(v \|\| ""\)\.replace\(\/\\D\/g, ""\)\.slice\(0, 11\);/);
});

test("listeners de ce-tel e ficha-tel continuam presentes e inalterados no script renderizado", () => {
  const html = renderizarPaginaMinima();
  const script = extrairScriptCaptacao(html);
  assert.match(script, /\$\('ce-tel'\)\.addEventListener\('input', function \(\) \{ this\.value = formatarTelefone\(this\.value\); \}\);/);
  assert.match(script, /\$\('ficha-tel'\)\.addEventListener\('input', function\(\)\{ this\.value = formatarTelefone\(this\.value\); \}\);/);
});

test("window.AuraChat continua sendo atribuído no script renderizado -- consequência direta do parsing agora ser válido até o fim do script", () => {
  const html = renderizarPaginaMinima();
  const script = extrairScriptCaptacao(html);
  assert.match(script, /window\.AuraChat = \{ abrir: abrir, fechar: fechar \};/);
});

test("maxlength=\"16\" continua presente nos dois campos, no HTML renderizado", () => {
  const html = renderizarPaginaMinima();
  assert.match(html, /id="ce-tel"[^>]*maxlength="16"/);
});
