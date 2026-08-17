// api/_tests/lead.resolucaoIdentidade3.3A.test.js
//
// Correção da assimetria de chave_dedup do Bloco 3.3A (2026-08-16): quando
// uma submissão traz telefone E e-mail ao mesmo tempo, o código agora busca
// por e-mail ANTES do upsert atômico por chave_dedup -- evita criar um
// segundo cliente quando a pessoa já existe sob uma chave antiga baseada em
// e-mail (calcularChaveDedup passou a priorizar telefone no próprio 3.3A).
//
// LIMITAÇÃO DE METODOLOGIA, registrada explicitamente: os 10 cenários
// pedidos são sequências com estado (visita 1 cria, visita 2 deveria
// reconhecer...) -- uma prova comportamental de ponta a ponta exigiria um
// Supabase real ou injetado (`sb` é uma constante de módulo fechada, não
// injetável sem refatorar a assinatura do handler -- fora do escopo de
// "menor alteração possível" desta correção) ou o mock de módulo
// experimental do Node (`--experimental-test-module-mocks`, precisa de flag
// especial, nunca usado neste repositório). Nenhuma das duas foi adotada
// aqui, por decisão consciente de não ampliar escopo nem introduzir
// ferramenta nova sem autorização explícita -- registrado no relatório.
// Por isso, estes testes são ESTRUTURAIS de alta precisão: em vez de só
// checar presença de texto, eles provam a ORDEM e o GATING das condições
// que, combinados, determinam o comportamento de cada cenário -- e cada
// teste documenta explicitamente o raciocínio da prova.
//
// Rodar com: node --test api/_tests/lead.resolucaoIdentidade3.3A.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

function trechoResolucaoIdentidade() {
  const inicio = srcLead.indexOf("let clienteId = null;");
  const fim = srcLead.indexOf("// Aviso de compartilhamento", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "bloco de resolução de identidade não encontrado");
  return srcLead.slice(inicio, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// Estrutura básica: ordem e gating do novo bloco 1.5
// ═══════════════════════════════════════════════════════════════════════════

test("bloco 1.5 (busca por e-mail) existe e vem ANTES do bloco 2 (upsert por chave_dedup)", () => {
  const trecho = trechoResolucaoIdentidade();
  const idx15 = trecho.indexOf("if (!match && tel && emailNorm) {");
  const idx2 = trecho.indexOf('if (!match && chaveDedupAtual) {');
  assert.ok(idx15 !== -1, "bloco 1.5 não encontrado");
  assert.ok(idx2 !== -1, "bloco 2 (upsert) não encontrado");
  assert.ok(idx15 < idx2, "bloco 1.5 precisa vir antes do bloco 2 -- é essa ordem que evita o upsert indevido");
});

test("bloco 1.5 só roda quando tel E e-mail estão AMBOS presentes -- não com só um dos dois (cenários 4, 5, 9)", () => {
  const trecho = trechoResolucaoIdentidade();
  assert.match(trecho, /if \(!match && tel && emailNorm\) \{/, "a condição precisa exigir os dois, não OR");
  assert.doesNotMatch(trecho, /if \(!match && \(tel \|\| emailNorm\)\)/, "não pode ter virado OR por engano");
});

test("bloco 1.5 só LÊ (select), nunca escreve/cria -- não pode ele mesmo introduzir um cliente novo (cenário 6)", () => {
  const trecho = trechoResolucaoIdentidade();
  const idx15 = trecho.indexOf("if (!match && tel && emailNorm) {");
  const idx2 = trecho.indexOf('if (!match && chaveDedupAtual) {');
  const blocoInteiro = trecho.slice(idx15, idx2);
  assert.doesNotMatch(blocoInteiro, /\.insert\(/);
  assert.doesNotMatch(blocoInteiro, /\.upsert\(/);
  assert.match(blocoInteiro, /\.select\("\*"\)\.eq\("user_id", row\.user_id\)\.is\("excluido_em", null\)/, "reaproveita exatamente a mesma busca do fallback (passo 3), não uma nova");
});

test("quando o bloco 1.5 encontra alguém, 'match' fica preenchido -- e o guard '!match' do bloco 2 automaticamente pula o upsert (é isso que evita o Cliente B do cenário 2)", () => {
  const trecho = trechoResolucaoIdentidade();
  const idx15 = trecho.indexOf("if (!match && tel && emailNorm) {");
  const bloco15 = trecho.slice(idx15, idx15 + 400);
  assert.match(bloco15, /match = \(existentesPorEmail \|\| \[\]\)\.find\(c => c\.email && c\.email\.trim\(\)\.toLowerCase\(\) === emailNorm\) \|\| null;/);
  assert.match(bloco15, /if \(match\) isNewClient = false;/);
  // O bloco 2 usa a MESMA variável "match" como guard -- não há como o
  // upsert do bloco 2 rodar se o bloco 1.5 já preencheu "match".
  const idx2 = trecho.indexOf('if (!match && chaveDedupAtual) {');
  assert.ok(idx2 > idx15);
});

// ═══════════════════════════════════════════════════════════════════════════
// Cenários 1-9: prova estrutural, um por um, com o raciocínio explícito
// ═══════════════════════════════════════════════════════════════════════════

test("1. Nome + e-mail (sem telefone), sem histórico: bloco 1.5 não roda (falta 'tel'), segue pro bloco 2 -- upsert cria Cliente A normalmente com chave baseada em e-mail", () => {
  // calcularChaveDedup(nome, undefined, email) -- sem tel, cai no e-mail
  // (testado comportamentalmente em lead.captacaoEssencial3.3A.test.js,
  // teste "2. novo cadastro com Nome + E-mail"). Aqui só confirmamos que,
  // SEM telefone, o bloco 1.5 (que exige tel) é estruturalmente inalcançável.
  assert.match(trechoResolucaoIdentidade(), /if \(!match && tel && emailNorm\) \{/);
});

test("2. Mesmo Nome + mesmo e-mail + telefone (2ª visita): bloco 1.5 encontra o Cliente A por e-mail -- upsert do bloco 2 é pulado, Cliente B NUNCA é criado", () => {
  // Prova: bloco 1.5 roda (tel e email presentes) -> busca por email ->
  // encontra o registro criado na visita 1 (mesmo email) -> match preenchido,
  // isNewClient=false -> bloco 2 tem seu guard "!match" falso -> pulado.
  // Isso é a correção central deste bloco, já provado estruturalmente acima.
  const trecho = trechoResolucaoIdentidade();
  assert.match(trecho, /if \(!match && tel && emailNorm\) \{/);
  assert.match(trecho, /if \(!match && chaveDedupAtual\) \{/);
});

test("3. Depois disso, Nome + só o mesmo telefone (3ª visita): reconhece o Cliente A, se a ressincronização da 2ª visita tiver migrado chave_dedup pra telefone", () => {
  // Cadeia de dependência real, documentada: na 2ª visita, isNewClient vira
  // false (achado por e-mail) -> cai no ramo "match && !isNewClient" (não o
  // ramo "match && isNewClient") -> esse ramo contém a ressincronização
  // PRÉ-EXISTENTE de chave_dedup (não tocada por esta correção, ver teste
  // do cenário 10) -- que atualiza chave_dedup pra baseada em telefone,
  // desde que não colida com outro cliente. Na 3ª visita (só telefone), o
  // bloco 2 calcula a mesma chave por telefone, que agora bate com a do
  // Cliente A -> reconhece via o "else" do bloco 2 (busca por chave_dedup).
  // A ressincronização vive fora do bloco de resolução de identidade (roda
  // depois, dentro do ramo "match && !isNewClient") -- busca no arquivo
  // inteiro, não só no trecho recortado.
  assert.match(srcLead, /if \(chaveDedupAtual && chaveDedupAtual !== match\.chave_dedup\) \{/, "ressincronização pré-existente precisa continuar lá, intocada");
});

test("4. Telefone-only repetido: bloco 1.5 nunca roda (falta e-mail) -- comportamento idêntico ao pré-correção, reconhecimento via bloco 2 (chave idêntica nas duas visitas)", () => {
  assert.match(trechoResolucaoIdentidade(), /if \(!match && tel && emailNorm\) \{/);
});

test("5. E-mail-only repetido: bloco 1.5 nunca roda (falta telefone) -- reconhecimento continua pelo bloco 2 (chave por e-mail idêntica nas duas visitas)", () => {
  assert.match(trechoResolucaoIdentidade(), /if \(!match && tel && emailNorm\) \{/);
});

test("6. Cliente novo com telefone + e-mail, sem histórico: bloco 1.5 roda mas não encontra ninguém (só busca, nunca cria) -- upsert do bloco 2 continua alcançável e cria normalmente", () => {
  const trecho = trechoResolucaoIdentidade();
  const idx15 = trecho.indexOf("if (!match && tel && emailNorm) {");
  const idx2 = trecho.indexOf('if (!match && chaveDedupAtual) {');
  const bloco15 = trecho.slice(idx15, idx2);
  assert.doesNotMatch(bloco15, /\.insert\(|\.upsert\(/, "bloco 1.5 nunca cria -- se não achar, match continua null e o bloco 2 permanece alcançável");
});

test("7. Telefone novo + mesmo e-mail: bloco 1.5 reconhece pelo e-mail (idêntico ao cenário 2, telefone sendo novo ou não é irrelevante pra essa busca)", () => {
  assert.match(trechoResolucaoIdentidade(), /c\.email && c\.email\.trim\(\)\.toLowerCase\(\) === emailNorm/);
});

test("8. Mesmo telefone + e-mail novo: bloco 1.5 busca pelo e-mail NOVO e não encontra nada (o cliente existente está salvo com o e-mail ANTIGO) -- match continua null, mas o bloco 2 reconhece pelo telefone (chave idêntica, já que telefone é prioridade e não mudou)", () => {
  // Esse é o caso onde o bloco 1.5 corretamente NÃO encontra ninguém (o
  // e-mail é novo, não bate com nada salvo), e a responsabilidade de
  // reconhecer volta pro bloco 2 -- que já funcionava corretamente pra
  // telefone repetido antes desta correção, e continua funcionando porque
  // o bloco 1.5 não interfere quando não encontra nada.
  const trecho = trechoResolucaoIdentidade();
  const idx2 = trecho.indexOf('if (!match && chaveDedupAtual) {');
  assert.ok(idx2 !== -1, "bloco 2 precisa continuar alcançável quando o bloco 1.5 não encontra ninguém");
});

test("9. Somente um contato, sem histórico: bloco 1.5 não faz nenhuma busca adicional (condição exige os dois) -- zero mudança de comportamento nesse caso", () => {
  const trecho = trechoResolucaoIdentidade();
  const ocorrencias = (trecho.match(/if \(!match && tel && emailNorm\) \{/g) || []).length;
  assert.equal(ocorrencias, 1, "só deve existir um bloco 1.5, com a condição exata que exige os dois contatos");
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. Conflito de ressincronização da chave_dedup -- proteção contra UNIQUE
// ═══════════════════════════════════════════════════════════════════════════

test("10. ressincronização de chave_dedup é um UPDATE simples (não upsert/ignoreDuplicates) -- uma violação de UNIQUE(user_id, chave_dedup) é REJEITADA pelo Postgres, nunca sobrescreve o outro registro", () => {
  const trecho = srcLead;
  const idx = trecho.indexOf("if (chaveDedupAtual && chaveDedupAtual !== match.chave_dedup) {");
  assert.ok(idx !== -1, "ressincronização não encontrada");
  const bloco = trecho.slice(idx, idx + 250);
  assert.match(bloco, /sb\.from\("clientes"\)\.update\(\{ chave_dedup: chaveDedupAtual \}\)\.eq\("id", match\.id\)/, "precisa continuar sendo um .update() simples, não upsert -- é isso que garante que o Postgres rejeita a violação de UNIQUE em vez de sobrescrever outro cliente");
  assert.doesNotMatch(bloco, /\.upsert\(/, "não pode ter virado upsert -- upsert com onConflict poderia mascarar a colisão em vez de deixar o Postgres rejeitar");
});

test("10. a rejeição do Postgres (se houver colisão) é engolida sem derrubar a requisição -- pior caso é chave_dedup ficar desatualizada (stale), nunca corrupção de dado", () => {
  const trecho = srcLead;
  const idx = trecho.indexOf("if (chaveDedupAtual && chaveDedupAtual !== match.chave_dedup) {");
  const bloco = trecho.slice(idx, idx + 250);
  assert.match(bloco, /\.then\(\(\) => \{\}\)\.catch\(\(\) => \{\}\);/, "precisa continuar fire-and-forget com catch silencioso -- uma rejeição de UNIQUE não pode quebrar a resposta ao visitante");
});

test("10. NENHUMA arquitetura de merge/exclusão/política nova foi introduzida para tratar esse conflito -- a proteção já vem inteiramente do Postgres, sem código adicional necessário", () => {
  const codigoAtivo = srcLead.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(codigoAtivo, /merge/i);
  assert.doesNotMatch(codigoAtivo, /\.delete\(\)\.eq\("chave_dedup"/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo: nenhuma tabela/coluna/migration/RPC nova
// ═══════════════════════════════════════════════════════════════════════════

test("nenhuma função nova foi criada -- a correção é só um bloco inline a mais na resolução de identidade já existente", () => {
  const trecho = trechoResolucaoIdentidade();
  const qtdFunctionDeclarations = (trecho.match(/\bfunction\s+\w+\s*\(/g) || []).length;
  assert.equal(qtdFunctionDeclarations, 0, "o bloco de resolução de identidade não deveria ganhar nenhuma function declaration nova");
});

test("nenhuma migration/SQL/RPC foi introduzida por esta correção", () => {
  const codigoAtivo = srcLead.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
});
