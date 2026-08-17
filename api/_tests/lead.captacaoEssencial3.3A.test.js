// api/_tests/lead.captacaoEssencial3.3A.test.js
//
// Bloco 3.3A -- Nova Captação Essencial (2026-08-16). Cobre: nova regra de
// obrigatoriedade (nome + pelo menos um contato), a alteração de
// chave_dedup (fallback por e-mail quando não há telefone) com testes
// COMPORTAMENTAIS reais sobre a função pura (não só textuais -- ver
// justificativa abaixo), consentimento (validação + reconstrução
// server-side), tráfego (normalização), e confirmação de que a ficha/painel
// antigo, o botão flutuante e os CTAs continuam intocados (convivência
// temporária, nada foi removido neste bloco).
//
// Rodar com: node --test api/_tests/lead.captacaoEssencial3.3A.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

process.env.VITE_SUPABASE_URL ||= "https://fake-para-teste.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "fake-para-teste";

const {
  camposObrigatoriosPreenchidos,
  calcularChaveDedup,
  consentimentoValido,
  normalizarTrafego,
} = await import("../lead.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

function semComentarios(texto) {
  return texto.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════
// DEDUPLICAÇÃO -- testes COMPORTAMENTAIS sobre calcularChaveDedup (função
// pura real, a mesma usada pelo handler -- não uma cópia, não um grep).
// Diferente da maioria dos testes deste arquivo/sessão, estes SÃO
// comportamentais: chamam a função de verdade com entradas reais e
// verificam a saída real, sem precisar de Supabase (a função não tem I/O).
// ═══════════════════════════════════════════════════════════════════════════

test("1. novo cadastro com Nome + WhatsApp: chave baseada em telefone", () => {
  const chave = calcularChaveDedup("Maria Silva", "27999998888", undefined);
  assert.equal(chave, "27999998888|maria");
});

test("2. novo cadastro com Nome + E-mail (sem telefone): chave baseada em e-mail, prefixada", () => {
  const chave = calcularChaveDedup("Maria Silva", undefined, "Maria@Exemplo.com");
  assert.equal(chave, "email:maria@exemplo.com|maria", "e-mail precisa ser normalizado (minúsculo) na chave");
});

test("3. novo cadastro com Nome + WhatsApp + E-mail: telefone tem prioridade sobre e-mail na chave", () => {
  const chave = calcularChaveDedup("Maria Silva", "27999998888", "maria@exemplo.com");
  assert.equal(chave, "27999998888|maria");
});

test("4. nome sem nenhum contato: chave não pode ser calculada (null)", () => {
  assert.equal(calcularChaveDedup("Maria Silva", undefined, undefined), null);
  assert.equal(calcularChaveDedup("Maria Silva", "", ""), null);
});

test("5. contato sem nome: chave não pode ser calculada (null), mesmo com telefone e/ou e-mail válidos", () => {
  assert.equal(calcularChaveDedup(undefined, "27999998888", "maria@exemplo.com"), null);
  assert.equal(calcularChaveDedup("", "27999998888", undefined), null);
  assert.equal(calcularChaveDedup("   ", undefined, "maria@exemplo.com"), null, "nome só-espaço não produz primeiro nome real");
});

test("6/8. reconhecimento por telefone: a mesma pessoa reenviando nome+telefone produz sempre a mesma chave (upsert atômico reconheceria/não duplicaria)", () => {
  const primeira = calcularChaveDedup("Maria Silva", "27999998888", undefined);
  const segunda = calcularChaveDedup("Maria Silva", "(27) 99999-8888", undefined);
  assert.equal(primeira, segunda, "formatação diferente do mesmo número precisa produzir a mesma chave");
});

test("7/9. reconhecimento por e-mail: a mesma pessoa reenviando nome+e-mail (sem telefone) produz sempre a mesma chave (upsert atômico reconheceria/não duplicaria)", () => {
  const primeira = calcularChaveDedup("Maria Silva", undefined, "maria@exemplo.com");
  const segunda = calcularChaveDedup("Maria Silva", undefined, "MARIA@EXEMPLO.COM");
  assert.equal(primeira, segunda, "caixa alta/baixa do e-mail precisa produzir a mesma chave");
});

test("10. cadastrada só com e-mail, retorna depois trazendo também telefone: a chave MUDA -- comportamento observado, não uma política nova", () => {
  // Documentação do comportamento real, conforme instruído: não inventamos
  // reconciliação nova. A primeira chave é baseada em e-mail; ao trazer
  // telefone, a fórmula passa a priorizar telefone -- chave diferente. O
  // reconhecimento nesse caso específico NÃO acontece pelo caminho atômico
  // de chave_dedup -- só pelo fallback de busca por e-mail (passo 3 da
  // resolução de identidade em api/lead.js), que continua existindo e
  // ainda encontraria o cadastro (não-atômico, mas funcional).
  const primeiraVisita = calcularChaveDedup("Maria Silva", undefined, "maria@exemplo.com");
  const segundaVisita = calcularChaveDedup("Maria Silva", "27999998888", "maria@exemplo.com");
  assert.equal(primeiraVisita, "email:maria@exemplo.com|maria");
  assert.equal(segundaVisita, "27999998888|maria");
  assert.notEqual(primeiraVisita, segundaVisita, "OBSERVADO: a chave muda de formato quando o telefone passa a existir -- reconhecimento nesse caso depende do fallback por e-mail, não do caminho atômico");
});

test("11. cadastrada com telefone, retorna depois trazendo também e-mail: a chave permanece IDÊNTICA -- caminho atômico continua reconhecendo", () => {
  const primeiraVisita = calcularChaveDedup("Maria Silva", "27999998888", undefined);
  const segundaVisita = calcularChaveDedup("Maria Silva", "27999998888", "maria@exemplo.com");
  assert.equal(primeiraVisita, segundaVisita, "OBSERVADO: uma vez que o telefone existe, adicionar e-mail depois não muda a chave -- o caminho atômico continua reconhecendo o mesmo cadastro");
});

test("telefone com formatação/símbolos diversos normaliza pros mesmos 11 dígitos finais", () => {
  const a = calcularChaveDedup("João Souza", "+55 (27) 99999-8888", undefined);
  const b = calcularChaveDedup("João Souza", "27999998888", undefined);
  assert.equal(a, b);
});

test("chamada com call-site de 2 argumentos (email omitido) continua funcionando -- compatibilidade", () => {
  assert.doesNotThrow(() => calcularChaveDedup("Maria Silva", "27999998888"));
  assert.equal(calcularChaveDedup("Maria Silva", "27999998888"), "27999998888|maria");
});

// ═══════════════════════════════════════════════════════════════════════════
// VALIDAÇÃO Nome + pelo menos um contato (cobertura adicional específica do
// 3.3A -- a cobertura completa/exaustiva já está em
// lead.camposObrigatoriosPreenchidos.test.js, não duplicada aqui)
// ═══════════════════════════════════════════════════════════════════════════

test("nome + WhatsApp aceito", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", undefined), true);
});
test("nome + e-mail aceito", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", undefined, "maria@exemplo.com"), true);
});
test("os três aceitos", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", "27999998888", "maria@exemplo.com"), true);
});
test("nome sozinho rejeitado", () => {
  assert.equal(camposObrigatoriosPreenchidos("Maria Silva", undefined, undefined), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// CONSENTIMENTO -- comportamental, sobre consentimentoValido() (função pura real)
// ═══════════════════════════════════════════════════════════════════════════

test("consentimento ausente: rejeitado", () => {
  assert.equal(consentimentoValido(undefined), false);
  assert.equal(consentimentoValido(null), false);
});
test("consentimento com aceito=false: rejeitado", () => {
  assert.equal(consentimentoValido({ aceito: false, versao_texto: "2026-08-16-v1" }), false);
});
test("consentimento com aceito='true' (string) ou 1 (número): rejeitado -- não é booleano real", () => {
  assert.equal(consentimentoValido({ aceito: "true", versao_texto: "2026-08-16-v1" }), false);
  assert.equal(consentimentoValido({ aceito: 1, versao_texto: "2026-08-16-v1" }), false);
});
test("consentimento com aceito=true e versao_texto válida: aceito", () => {
  assert.equal(consentimentoValido({ aceito: true, versao_texto: "2026-08-16-v1" }), true);
});
test("consentimento com versao_texto ausente/vazia/só-espaço: rejeitado mesmo com aceito=true", () => {
  assert.equal(consentimentoValido({ aceito: true }), false);
  assert.equal(consentimentoValido({ aceito: true, versao_texto: "" }), false);
  assert.equal(consentimentoValido({ aceito: true, versao_texto: "   " }), false);
});
test("consentimento não-objeto (array, string, número): rejeitado, sem lançar exceção", () => {
  assert.doesNotThrow(() => consentimentoValido("aceito"));
  assert.equal(consentimentoValido("aceito"), false);
  assert.equal(consentimentoValido([{ aceito: true, versao_texto: "v1" }]), false);
  assert.equal(consentimentoValido(123), false);
});

test("a data do consentimento é produzida pelo servidor (new Date().toISOString()), nunca recebida do chamador", () => {
  const trecho = semComentarios(srcLead);
  const idx = trecho.indexOf("consentimentoFinal = {");
  assert.ok(idx !== -1, "construção de consentimentoFinal não encontrada");
  const bloco = trecho.slice(idx, idx + 300);
  assert.match(bloco, /data: new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(bloco, /data:\s*consentimento\.data/, "data nunca pode vir do corpo da requisição");
});

test("consentimento só é exigido quando a chave está presente no corpo -- ficha antiga (que nunca a envia) continua funcionando sem aceite", () => {
  const trecho = semComentarios(srcLead);
  assert.match(trecho, /if \(consentimento !== undefined\) \{/);
});

// ═══════════════════════════════════════════════════════════════════════════
// TRÁFEGO -- comportamental, sobre normalizarTrafego() (função pura real)
// ═══════════════════════════════════════════════════════════════════════════

test("tráfego ausente/malformado nunca lança erro, produz objeto vazio", () => {
  assert.doesNotThrow(() => normalizarTrafego(undefined));
  assert.deepEqual(normalizarTrafego(undefined), {});
  assert.deepEqual(normalizarTrafego(null), {});
  assert.deepEqual(normalizarTrafego("string qualquer"), {});
  assert.deepEqual(normalizarTrafego(["array"]), {});
  assert.deepEqual(normalizarTrafego(123), {});
});

test("tráfego válido preserva só as 9 chaves permitidas (8 aqui + capturado_em é acrescentado no handler, não nesta função)", () => {
  const entrada = { utm_source: "google", utm_medium: "cpc", chave_nao_permitida: "x", outra: "y" };
  const limpo = normalizarTrafego(entrada);
  assert.deepEqual(limpo, { utm_source: "google", utm_medium: "cpc" });
});

test("tráfego com valores não-string (número, objeto, array, booleano) descarta só essa chave, sem quebrar as demais", () => {
  const entrada = { utm_source: "google", utm_medium: 123, fbclid: { x: 1 }, referrer: ["a"], utm_campaign: true };
  const limpo = normalizarTrafego(entrada);
  assert.deepEqual(limpo, { utm_source: "google" });
});

test("tráfego trunca valores em 500 caracteres", () => {
  const longo = "a".repeat(600);
  const limpo = normalizarTrafego({ referrer: longo });
  assert.equal(limpo.referrer.length, 500);
});

test("capturado_em é adicionado no handler com o relógio do servidor, não recebido do corpo", () => {
  const trecho = semComentarios(srcLead);
  const idx = trecho.indexOf("trafegoFinal = { ...normalizarTrafego(trafego)");
  assert.ok(idx !== -1, "construção de trafegoFinal não encontrada");
  assert.match(trecho.slice(idx, idx + 150), /capturado_em: new Date\(\)\.toISOString\(\)/);
});

test("tráfego, como o consentimento, só é processado quando a chave está presente -- ficha antiga não é afetada", () => {
  const trecho = semComentarios(srcLead);
  assert.match(trecho, /if \(trafego !== undefined\) \{/);
});

// ═══════════════════════════════════════════════════════════════════════════
// row: consentimento_contato/trafego só preenchidos na criação
// ═══════════════════════════════════════════════════════════════════════════

test("row grava consentimento_contato e trafego (null quando não aplicável)", () => {
  const trecho = semComentarios(srcLead);
  assert.match(trecho, /consentimento_contato: consentimentoFinal,/);
  assert.match(trecho, /trafego: trafegoFinal \? \{ primeiro_toque: trafegoFinal, ultimo_toque: trafegoFinal \} : null,/);
});

// ═══════════════════════════════════════════════════════════════════════════
// E-mail 1 / E-mail 2 -- preservados, gate de e-mail já cobre ausência
// ═══════════════════════════════════════════════════════════════════════════

test("E-mail 1 continua condicionado a 'email' truthy (gate pré-existente, inalterado) -- não dispara sem e-mail na submissão", () => {
  assert.match(srcLead, /if \(cfgDisparos\?\.fluxo_boas_vindas_email_ativa !== false && resendKey && email\) \{/);
});
test("E-mail 2 está dentro do mesmo gate que exige 'email' -- não dispara sem e-mail na submissão", () => {
  const trecho = semComentarios(srcLead);
  const idxGate = trecho.indexOf("if (cfgDisparos?.fluxo_boas_vindas_email_ativa !== false && resendKey && email) {");
  const idxElse = trecho.indexOf("} else {", idxGate);
  const idxCadastroReconhecido = trecho.indexOf('"cadastro reconhecido"', idxElse);
  assert.ok(idxGate !== -1 && idxElse !== -1 && idxCadastroReconhecido !== -1 && idxCadastroReconhecido > idxElse, "E-mail 2 precisa continuar dentro do gate que exige email");
});
test("templates de E-mail 1 e E-mail 2 não foram reescritos neste bloco (assuntos inalterados)", () => {
  assert.match(srcLead, /subject: "Recebemos sua mensagem, " \+ fn \+ "! 🖤"/);
  assert.match(srcLead, /subject: "Vamos continuar seu atendimento, " \+ fn \+ "\?"/);
});
test("alerta ao artista não foi alterado além do necessário -- condição isNewClient preservada", () => {
  assert.match(srcLead, /if \(isNewClient && cfgDisparos\?\.fluxo_notificacao_artista_ativa !== false && resendKey\) \{/);
});

// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp do cliente vs. WhatsApp do estúdio -- não confundidos
// ═══════════════════════════════════════════════════════════════════════════

test("waNumero (destino dos botões de WhatsApp) continua vindo só de cfgDisparos.studio_tel, nunca do tel do lead", () => {
  const trecho = semComentarios(srcLead);
  const ocorrencias = (trecho.match(/const waNumero = cfgDisparos\?\.studio_tel/g) || []).length;
  assert.equal(ocorrencias, 1);
  assert.doesNotMatch(trecho, /"https:\/\/wa\.me\/" \+ tel\b/, "wa.me nunca pode ser montado a partir do telefone do lead");
});

// ═══════════════════════════════════════════════════════════════════════════
// Regra de produto: 1 conta = 1 artista -- sem seletor/transporte na nova seção
// ═══════════════════════════════════════════════════════════════════════════

test("a nova seção de captação essencial não inclui nenhum campo/seletor de artista", () => {
  const inicio = srcLead.indexOf('<section class="captacao-essencial"');
  const fim = srcLead.indexOf("</section>", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "seção da captação essencial não encontrada");
  const trechoSecao = srcLead.slice(inicio, fim);
  assert.doesNotMatch(trechoSecao, /artista/i);
});

// ═══════════════════════════════════════════════════════════════════════════
// Nova seção existe, com os campos certos
// ═══════════════════════════════════════════════════════════════════════════

test("nova seção #captacao-essencial existe no HTML gerado, com nome/tel/email/consentimento/submit", () => {
  assert.match(srcLead, /<section class="captacao-essencial" id="captacao-essencial">/);
  assert.match(srcLead, /id="ce-nome" name="nome" required/);
  assert.match(srcLead, /id="ce-tel" name="tel"/);
  assert.match(srcLead, /id="ce-email" name="email" type="email"/);
  assert.match(srcLead, /id="ce-consent"/);
  assert.match(srcLead, /Concordo em receber contato do estúdio sobre minha solicitação\./);
  assert.match(srcLead, /id="ce-submit"/);
});

test("campos WhatsApp/e-mail da nova seção NÃO têm atributo required (não afirma visualmente que ambos são obrigatórios)", () => {
  const inicio = srcLead.indexOf('id="ce-tel"');
  const fim = srcLead.indexOf('id="ce-email"') + 100;
  const trecho = srcLead.slice(inicio, fim);
  assert.doesNotMatch(trecho, /\brequired\b/);
});

test("nova seção envia payload para /api/lead com consentimento e tráfego", () => {
  const trecho = semComentarios(srcLead);
  const idx = trecho.indexOf("function enviarCaptacaoEssencial");
  assert.ok(idx !== -1);
  const bloco = trecho.slice(idx, idx + 1500);
  assert.match(bloco, /API_BASE \+ '\/api\/lead'/);
  assert.match(bloco, /consentimento: \{ aceito: true, versao_texto: CONSENTIMENTO_VERSAO \}/);
  assert.match(bloco, /trafego: TRAFEGO_CAPTURADO/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Convivência temporária: nada do painel antigo foi removido
// ═══════════════════════════════════════════════════════════════════════════

test("painel/ficha antiga (#aura-panel) permanece no HTML", () => {
  assert.match(srcLead, /id="aura-panel" class="aura-panel"/);
  assert.match(srcLead, /function montarFicha\(artistaPreEscolhido\)\{/);
  assert.match(srcLead, /function enviarFicha\(\)\{/);
});

test("botão flutuante (#aura-fab) permanece temporariamente", () => {
  assert.match(srcLead, /id="aura-fab" class="aura-fab" onclick="AuraChat\.abrir\(\)"/);
});

test("os 4 CTAs antigos continuam chamando AuraChat.abrir() -- nenhum foi redirecionado ainda", () => {
  const ocorrencias = (srcLead.match(/onclick="AuraChat\.abrir\(/g) || []).length;
  assert.equal(ocorrencias, 4, "os 4 CTAs originais (nav, hero, por artista, FAB) precisam continuar chamando AuraChat.abrir()");
});

test("window.AuraChat continua exposto, abrir/fechar inalteradas", () => {
  assert.match(srcLead, /window\.AuraChat = \{ abrir: abrir, fechar: fechar \};/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Ausência de arquitetura fora de escopo (RPC/migration/SQL)
// ═══════════════════════════════════════════════════════════════════════════

test("nenhuma RPC nova, migration ou SQL foi introduzida por este bloco", () => {
  const codigoAtivo = semComentarios(srcLead);
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
  assert.doesNotMatch(codigoAtivo, /resolver_solicitacao_lead/);
  assert.doesNotMatch(codigoAtivo, /solicitacao_id/);
});

test("código promocional (palavra_secreta) não foi tocado -- continua fora da nova seção, mecanismo legado intacto", () => {
  const inicio = srcLead.indexOf('<section class="captacao-essencial"');
  const fim = srcLead.indexOf("</section>", inicio);
  const trechoSecao = srcLead.slice(inicio, fim);
  assert.doesNotMatch(trechoSecao, /palavra_secreta/);
  assert.match(srcLead, /palavraSecreta/, "revalidação server-side do código promocional continua existindo em algum lugar do arquivo");
});
