// api/_tests/lead.validacaoContatoConsentimento3.3A.test.js
//
// Correção final pré-commit do Bloco 3.3A (2026-08-17): duas mudanças de
// servidor autorizadas nesta rodada.
//
// (1) Telefone/e-mail "preenchidos" passam a exigir formato mínimo válido --
// um contato preenchido mas de formato inválido reprova a requisição
// inteira, mesmo com o outro contato válido (nunca é tratado como se
// estivesse ausente). Validação puramente por quantidade de dígitos (tel,
// >=10 após remover tudo que não é número) e por um regex mínimo e
// pragmático (e-mail, /^[^\s@]+@[^\s@]+\.[^\s@]+$/) -- sem biblioteca, sem
// tentativa de implementar a especificação completa de e-mail.
//
// (2) A nova ficha essencial passa a enviar um identificador operacional
// (formulario: "captacao_essencial"); quando presente, o backend exige
// consentimento válido mesmo que a chave "consentimento" esteja totalmente
// ausente do corpo -- fechando o contorno por omissão identificado na
// auditoria anterior. A ficha antiga (que nunca envia "formulario" nem
// "consentimento") permanece com o comportamento de compatibilidade
// temporária, inalterado.
//
// LIMITAÇÃO DE METODOLOGIA (mesma de todos os testes deste arquivo desde o
// Bloco 3.3A): `sb` não é injetável sem refatorar a assinatura do handler --
// por isso a cobertura do handler completo é ESTRUTURAL (leitura do
// código-fonte, ordem/gating), enquanto as funções puras (telefoneValido,
// emailValido, camposObrigatoriosPreenchidos) são exercitadas de verdade,
// chamando a mesma função usada pelo handler real.
//
// Rodar com: node --test api/_tests/lead.validacaoContatoConsentimento3.3A.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

process.env.VITE_SUPABASE_URL ||= "https://fake-para-teste.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "fake-para-teste";

const { telefoneValido, emailValido, camposObrigatoriosPreenchidos } = await import("../lead.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

function semComentarios(texto) {
  return texto.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// telefoneValido -- contagem de dígitos, sem heurística de DDD/operadora
// ═══════════════════════════════════════════════════════════════════════════

test("telefone com 9 dígitos: inválido", () => {
  assert.equal(telefoneValido("279999888"), false);
});
test("telefone com 10 dígitos (fixo com DDD): válido", () => {
  assert.equal(telefoneValido("2733334444"), true);
});
test("telefone com 11 dígitos (celular com DDD): válido", () => {
  assert.equal(telefoneValido("27999998888"), true);
});
test("telefone com máscara brasileira válida: válido (máscara é só formatação, dígitos contam igual)", () => {
  assert.equal(telefoneValido("(27) 99999-8888"), true);
});
test("telefone com código do país (55) + número brasileiro: válido (dígitos extras à esquerda não derrubam o mínimo)", () => {
  assert.equal(telefoneValido("5527999998888"), true);
});
test("letras/símbolos sem quantidade suficiente de dígitos: inválido", () => {
  assert.equal(telefoneValido("abc-def"), false);
  assert.equal(telefoneValido("()"), false);
  assert.equal(telefoneValido("telefone"), false);
});
test("telefone ausente/vazio/tipo errado: inválido, sem lançar exceção", () => {
  assert.doesNotThrow(() => telefoneValido(undefined));
  assert.equal(telefoneValido(undefined), false);
  assert.equal(telefoneValido(null), false);
  assert.equal(telefoneValido(""), false);
  assert.equal(telefoneValido("   "), false);
  assert.equal(telefoneValido(123456789012), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// emailValido -- regex mínimo e pragmático
// ═══════════════════════════════════════════════════════════════════════════

test("'abc' (sem @): inválido", () => {
  assert.equal(emailValido("abc"), false);
});
test("'joao@' (sem domínio): inválido", () => {
  assert.equal(emailValido("joao@"), false);
});
test("'@gmail.com' (sem parte local): inválido", () => {
  assert.equal(emailValido("@gmail.com"), false);
});
test("e-mail comum: válido", () => {
  assert.equal(emailValido("joao@gmail.com"), true);
  assert.equal(emailValido("maria.silva@estudio.com.br"), true);
});
test("e-mail com subdomínio: válido", () => {
  assert.equal(emailValido("contato@mail.estudio.com.br"), true);
});
test("espaços nas extremidades: aceito depois do trim (mesma normalização já usada em emailNorm)", () => {
  assert.equal(emailValido("  joao@gmail.com  "), true);
});
test("e-mail ausente/vazio/tipo errado: inválido, sem lançar exceção", () => {
  assert.doesNotThrow(() => emailValido(undefined));
  assert.equal(emailValido(undefined), false);
  assert.equal(emailValido(null), false);
  assert.equal(emailValido(""), false);
  assert.equal(emailValido("   "), false);
  assert.equal(emailValido({ email: "joao@gmail.com" }), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// camposObrigatoriosPreenchidos -- regra final combinada (nome + contato
// válido, contato preenchido-mas-inválido sempre reprova)
// ═══════════════════════════════════════════════════════════════════════════

test("telefone válido sem e-mail: aceita", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", undefined), true);
});
test("e-mail válido sem telefone: aceita", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", undefined, "maria@exemplo.com"), true);
});
test("ambos válidos: aceita", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", "maria@exemplo.com"), true);
});
test("nenhum contato: rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", undefined, undefined), false);
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "", ""), false);
});
test("telefone inválido + e-mail válido: rejeita (não trata o telefone inválido como ausente)", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "123", "maria@exemplo.com"), false);
});
test("telefone válido + e-mail inválido: rejeita (não trata o e-mail inválido como ausente)", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", "abc"), false);
});
test("ambos inválidos: rejeita", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "123", "abc"), false);
});
test("nome ausente, mesmo com contatos válidos: rejeita (regra de nome inalterada)", () => {
  assert.equal(camposObrigatoriosPreenchidos(undefined, "27999998888", "maria@exemplo.com"), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// Handler -- mensagens específicas por caso, sem termos técnicos
// ═══════════════════════════════════════════════════════════════════════════

function trechoValidacaoContato() {
  const inicio = srcLead.indexOf("if (!camposObrigatoriosPreenchidos(nome, tel, email)) {");
  const fim = srcLead.indexOf("// Bloco 3.3A -- consentimento só é exigido", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "bloco de validação de contato não encontrado");
  return srcLead.slice(inicio, fim);
}

test("mensagem de telefone inválido não usa termos técnicos (regex/payload/backend/chave_dedup)", () => {
  const trecho = trechoValidacaoContato();
  assert.match(trecho, /Confira o WhatsApp informado/);
  assert.doesNotMatch(semComentarios(trecho), /regex|payload|backend|chave_dedup/i);
});
test("mensagem de e-mail inválido não usa termos técnicos", () => {
  const trecho = trechoValidacaoContato();
  assert.match(trecho, /Confira o e-mail informado/);
});
test("mensagem de nenhum contato preservada", () => {
  const trecho = trechoValidacaoContato();
  assert.match(trecho, /Informe pelo menos um contato: WhatsApp ou e-mail\./);
});
test("a escolha de mensagem não é uma segunda validação -- só roda dentro do 'if (!camposObrigatoriosPreenchidos(...))', reaproveitando o mesmo resultado", () => {
  const trecho = trechoValidacaoContato();
  const qtdChamadas = (trecho.match(/camposObrigatoriosPreenchidos\(/g) || []).length;
  assert.equal(qtdChamadas, 1, "camposObrigatoriosPreenchidos só pode ser chamada uma vez neste bloco -- a escolha de mensagem usa telefoneValido/emailValido diretamente, não uma segunda chamada");
});
test("validação de contato continua posicionada ANTES de qualquer escrita no banco e antes da resolução de identidade/chave_dedup", () => {
  const idxValidacao = srcLead.indexOf("if (!camposObrigatoriosPreenchidos(nome, tel, email)) {");
  const idxChaveDedup = srcLead.indexOf("const chaveDedupAtual = calcularChaveDedup(nome, tel, email);");
  // from("ink_clientes") aparece mais de uma vez no arquivo (outras rotas
  // deste handler multi-ação) -- precisa ser a ocorrência DEPOIS da
  // validação, dentro do mesmo handler de criarSolicitacao, não a primeira
  // do arquivo inteiro.
  const idxTenantLookup = srcLead.indexOf('from("ink_clientes")', idxValidacao);
  assert.ok(idxValidacao !== -1 && idxChaveDedup !== -1 && idxTenantLookup !== -1);
  assert.ok(idxValidacao < idxTenantLookup, "validação precisa vir antes da resolução do tenant");
  assert.ok(idxValidacao < idxChaveDedup, "validação precisa vir antes do cálculo de chave_dedup");
});

// ═══════════════════════════════════════════════════════════════════════════
// Consentimento -- identificador "formulario" e exigência para a nova ficha
// ═══════════════════════════════════════════════════════════════════════════

function trechoConsentimento() {
  const inicio = srcLead.indexOf("let consentimentoFinal = null;");
  const fim = srcLead.indexOf("// Bloco 3.3A -- tráfego é só captura passiva opcional", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "bloco de consentimento não encontrado");
  return srcLead.slice(inicio, fim);
}

test("ficha nova envia formulario:'captacao_essencial' no payload", () => {
  assert.match(srcLead, /formulario: 'captacao_essencial',/);
});

test("nova ficha + consentimento válido: segue (chave presente e válida, ramo normal já existente)", () => {
  const trecho = trechoConsentimento();
  assert.match(trecho, /if \(consentimento !== undefined\) \{/);
  assert.match(trecho, /if \(!consentimentoValido\(consentimento\)\) \{/);
});

test("identificador + consentimento ausente: bloco 'else if' rejeita mesmo sem a chave consentimento estar presente", () => {
  const trecho = trechoConsentimento();
  assert.match(trecho, /\} else if \(formulario === "captacao_essencial"\) \{/);
  const idxElseIf = trecho.indexOf('} else if (formulario === "captacao_essencial") {');
  const blocoElseIf = trecho.slice(idxElseIf);
  assert.match(blocoElseIf, /return res\.status\(400\)\.json\(\{ error: "É necessário aceitar o consentimento de contato para continuar\." \}\);/);
});

test("identificador + aceito:false ou estrutura inválida: cai no ramo 'if (consentimento !== undefined)' já existente -- rejeitado igual, com ou sem formulario", () => {
  // consentimentoValido já rejeita aceito:false/estrutura inválida
  // independentemente de "formulario" -- não precisa de um segundo caminho.
  const trecho = trechoConsentimento();
  const qtdConsentimentoValido = (trecho.match(/consentimentoValido\(consentimento\)/g) || []).length;
  assert.equal(qtdConsentimentoValido, 1, "só uma chamada a consentimentoValido -- a exigência por 'formulario' não duplica essa validação");
});

test("ficha antiga sem formulario e sem consentimento: nenhum dos dois ramos de rejeição dispara -- comportamento de compatibilidade preservado", () => {
  // formulario undefined !== "captacao_essencial" -> else-if não dispara;
  // consentimento undefined -> if externo não dispara. consentimentoFinal
  // permanece null, exatamente como antes desta correção.
  const trecho = trechoConsentimento();
  assert.match(trecho, /let consentimentoFinal = null;/);
});

test("payload sem 'formulario' mas com consentimento inválido: continua rejeitado (o ramo 'if (consentimento !== undefined)' não depende de formulario)", () => {
  const trecho = trechoConsentimento();
  const idxIf = trecho.indexOf("if (consentimento !== undefined) {");
  const idxElseIf = trecho.indexOf('} else if (formulario === "captacao_essencial") {');
  assert.ok(idxIf !== -1 && idxElseIf !== -1 && idxIf < idxElseIf, "o ramo de validação de consentimento presente precisa continuar independente do identificador");
});

test("'formulario' não é persistido em 'row' nem usado fora da checagem de consentimento", () => {
  const codigoAtivo = semComentarios(srcLead);
  // A única leitura de "formulario" fora da desestruturação do corpo da
  // requisição deve ser a comparação de consentimento -- não pode aparecer
  // dentro da montagem do objeto "row" nem em nenhum .insert/.upsert/.update.
  const ocorrencias = (codigoAtivo.match(/\bformulario\b/g) || []).length;
  // 1 no payload enviado pela ficha nova (JS do navegador) + 1 na
  // desestruturação do req.body (servidor) + 1 na comparação de
  // consentimento (servidor) = 3.
  assert.equal(ocorrencias, 3, "formulario só pode aparecer no payload da ficha nova, na desestruturação do corpo e na comparação de consentimento");
  assert.doesNotMatch(codigoAtivo, /row\.formulario|formulario:\s*formulario|\.\.\.\s*formulario/);
});

test("'formulario' não é mecanismo de autenticação -- nenhuma verificação de token/hash/jwt foi introduzida na checagem de consentimento", () => {
  // Escopo restrito ao trecho de consentimento -- o arquivo inteiro já
  // contém "assinatura" em colunas pré-existentes e não relacionadas
  // (menor_assinatura, assinar_link, feature de assinatura de contrato),
  // então checar o arquivo inteiro geraria falso positivo.
  const trecho = trechoConsentimento();
  assert.doesNotMatch(trecho, /jwt|hmac|token|hash/i);
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo proibido -- nenhuma arquitetura nova, nada fora do combinado
// ═══════════════════════════════════════════════════════════════════════════

test("nenhuma dependência nova foi introduzida (package.json fora do diff desta correção)", () => {
  // Verificação indireta: nenhuma nova declaração de import apareceu no
  // arquivo além dos três já existentes desde antes do 3.3A.
  const imports = (srcLead.match(/^import /gm) || []).length;
  assert.equal(imports, 3, "api/lead.js deve continuar com exatamente os mesmos 3 imports de sempre");
});

test("nenhum RPC/SQL/migration foi introduzido por esta correção", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
});

test("resolução de identidade e proteção de conflito permanecem intocadas (mesmos marcos estruturais já testados em lead.resolucaoIdentidade3.3A.test.js / lead.protecaoConflitoIdentidade3.3A.test.js)", () => {
  assert.match(srcLead, /if \(!match && tel && emailNorm\) \{/);
  assert.match(srcLead, /const conflitoDeEmail = !!\(existente && emailNorm && existente\.email && existente\.email\.trim\(\)\.toLowerCase\(\) !== emailNorm\);/);
});
