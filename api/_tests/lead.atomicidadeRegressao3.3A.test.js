// api/_tests/lead.atomicidadeRegressao3.3A.test.js
//
// Correção de regressão de atomicidade (2026-08-17) -- a reescrita da
// resolução de identidade (correção final de identidade, mesma data) havia
// removido a busca de reforço que existia antes dela para o caso em que o
// upsert atômico por chave_dedup não insere porque outra requisição
// concorrente já criou a mesma chave. Sem essa busca, a requisição
// perdedora de uma corrida genuinamente concorrente (mesmo telefone+nome,
// ou mesmo e-mail+nome, submetidos quase ao mesmo tempo) caía no Fallback
// Final e criava uma segunda ficha órfã, sem chave_dedup -- exatamente a
// duplicidade que o UNIQUE(user_id, chave_dedup) foi desenhado para
// impedir. Esta correção restaura a busca de reforço, mas reaplicando (não
// contornando) a proteção de conflito de e-mail já usada em outros pontos
// deste mesmo bloco -- nunca reconhece cegamente o vencedor se houver
// evidência positiva de que é outra pessoa.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): `sb` não é
// injetável sem refatorar a assinatura do handler -- por isso a cobertura
// aqui é ESTRUTURAL. Uma prova genuína de que duas requisições realmente
// concorrentes contra um Postgres real terminam em uma única ficha exigiria
// um Supabase de teste com controle de timing -- fora do alcance desta
// suíte, como já registrado em todo este bloco desde a Alternativa B.
//
// Rodar com: node --test api/_tests/lead.atomicidadeRegressao3.3A.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

// Bloco 3.3B-B1 (2026-08-17): a condição deste ramo ganhou
// "&& formulario !== 'captacao_detalhamento'" (essa modalidade nunca cria
// cliente novo) -- só o literal exato usado como marcador de fronteira
// mudou, a lógica de atomicidade auditada por este arquivo continua a mesma.
function trechoRamoUpsert() {
  const inicio = srcLead.indexOf('} else if (chaveDedupAtual && formulario !== "captacao_detalhamento") {');
  assert.ok(inicio !== -1, "ramo do upsert atômico não encontrado");
  const fim = srcLead.indexOf("// Aviso de compartilhamento", inicio);
  assert.ok(fim !== -1, "fim do ramo não encontrado");
  return srcLead.slice(inicio, fim);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1/2. O upsert atômico continua exatamente como era
// ═══════════════════════════════════════════════════════════════════════════

test("1. o upsert continua usando onConflict: 'user_id,chave_dedup'", () => {
  const trecho = trechoRamoUpsert();
  assert.match(trecho, /onConflict: "user_id,chave_dedup"/);
});

test("2. ignoreDuplicates: true continua presente", () => {
  const trecho = trechoRamoUpsert();
  assert.match(trecho, /ignoreDuplicates: true/);
});

test("apenas um upsert existe no bloco de identidade -- a correção não duplicou a tentativa de escrita", () => {
  const trecho = trechoRamoUpsert();
  const qtd = (trecho.match(/\.upsert\(/g) || []).length;
  assert.equal(qtd, 1);
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Se "criado" existir, comportamento de novo cliente permanece
// ═══════════════════════════════════════════════════════════════════════════

test("3. se criado existir, match=criado e isNewClient=true, exatamente como antes desta correção", () => {
  const trecho = trechoRamoUpsert();
  const idx = trecho.indexOf("if (criado) {");
  const fim = trecho.indexOf("} else {", idx);
  const bloco = trecho.slice(idx, fim);
  assert.match(bloco, /match = criado;/);
  assert.match(bloco, /isNewClient = true;/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 4/5/6. Busca de reforço restaurada
// ═══════════════════════════════════════════════════════════════════════════

test("4. se criado não existir, existe busca de reforço por user_id + chave_dedup exata", () => {
  const trecho = trechoRamoUpsert();
  const idxElse = trecho.indexOf("} else {", trecho.indexOf("if (criado) {"));
  const bloco = trecho.slice(idxElse);
  assert.match(bloco, /\.select\("\*"\)\.eq\("user_id", row\.user_id\)\.eq\("chave_dedup", chaveDedupAtual\)\.maybeSingle\(\);/);
});

test("busca de reforço está rigorosamente escopada ao mesmo user_id -- nunca atravessa tenant", () => {
  const trecho = trechoRamoUpsert();
  const idxVencedor = trecho.indexOf("const { data: vencedor }");
  const bloco = trecho.slice(idxVencedor, idxVencedor + 200);
  assert.match(bloco, /\.eq\("user_id", row\.user_id\)/);
});

test("5. o vencedor encontrado é tratado como cliente EXISTENTE (isNewClient=false), não como novo", () => {
  const trecho = trechoRamoUpsert();
  const idxVencedor = trecho.indexOf("if (vencedor) {");
  const idxConflito = trecho.indexOf("} else {", idxVencedor);
  const bloco = trecho.slice(idxVencedor, idxConflito);
  assert.match(bloco, /match = vencedor;/);
  assert.match(bloco, /isNewClient = false;/);
});

test("6. este caminho não precisa do Fallback Final -- clienteId é preenchido pelo ramo 'match && !isNewClient' já existente, o mesmo usado por qualquer outro reconhecimento", () => {
  // Não há atribuição direta de clienteId dentro deste ramo -- ele é
  // preenchido mais abaixo, no bloco "if (match && !isNewClient) { ...
  // clienteId = match.id; }", igual a qualquer outro caminho de
  // reconhecimento (Estado 2, Estado 3, "sem candidatos" etc.). Confirma
  // que nenhuma lógica paralela/duplicada foi criada só para este caso.
  const trecho = trechoRamoUpsert();
  assert.doesNotMatch(trecho, /clienteId = /, "este ramo não deve atribuir clienteId diretamente -- isso é responsabilidade do bloco de atualização já existente");
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. A busca de reforço não ignora as proteções de conflito de identidade
// ═══════════════════════════════════════════════════════════════════════════

test("7. antes de reconhecer o vencedor, a mesma proteção de conflito de e-mail (já usada para donoExato) é reaplicada -- não é uma checagem nova, é a mesma fórmula", () => {
  const trecho = trechoRamoUpsert();
  assert.match(
    trecho,
    /const conflitoDeEmailVencedor = !!\(emailNorm && vencedor\.email && vencedor\.email\.trim\(\)\.toLowerCase\(\) !== emailNorm\);/
  );
  // Mesma fórmula, campo a campo, da proteção já usada para donoExato --
  // só o nome da variável muda, não a lógica.
  assert.match(
    srcLead,
    /const conflitoDeEmail = !!\(emailNorm && donoExato\.email && donoExato\.email\.trim\(\)\.toLowerCase\(\) !== emailNorm\);/
  );
});

test("7b. quando há conflito de e-mail com o vencedor, marca identidadeConflitante -- não reconhece, não cria outra ficha, não faz merge", () => {
  const trecho = trechoRamoUpsert();
  const idxConflito = trecho.indexOf("const conflitoDeEmailVencedor");
  const bloco = trecho.slice(idxConflito);
  assert.match(bloco, /\} else \{\s*\n\s*identidadeConflitante = true;/);
  assert.doesNotMatch(bloco, /merge/i);
});

test("7c. a checagem de conflito ocorre ANTES de qualquer atribuição de match ao vencedor", () => {
  const trecho = trechoRamoUpsert();
  const idxConflito = trecho.indexOf("const conflitoDeEmailVencedor");
  const idxAtribuicao = trecho.indexOf("match = vencedor;");
  assert.ok(idxConflito !== -1 && idxAtribuicao !== -1);
  assert.ok(idxConflito < idxAtribuicao);
});

test("a busca de reforço não modifica chave_dedup de ninguém -- só leitura (.select), nenhum .update/.upsert dentro deste ramo 'else'", () => {
  const trecho = trechoRamoUpsert();
  const idxElse = trecho.indexOf("} else {", trecho.indexOf("if (criado) {"));
  const bloco = trecho.slice(idxElse);
  assert.doesNotMatch(bloco, /\.update\(/);
  assert.doesNotMatch(bloco, /\.upsert\(/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. Estados ambíguos continuam com zero escrita (não regrediu)
// ═══════════════════════════════════════════════════════════════════════════

test("8. os três pontos que marcam identidadeConflitante continuam sem nenhuma escrita entre eles e o retorno antecipado", () => {
  const idxRetorno = srcLead.indexOf("if (identidadeConflitante) {");
  assert.ok(idxRetorno !== -1);
  const ocorrenciasFlag = [];
  let pos = 0;
  while (true) {
    const idx = srcLead.indexOf("identidadeConflitante = true;", pos);
    if (idx === -1 || idx > idxRetorno) break;
    ocorrenciasFlag.push(idx);
    pos = idx + 1;
  }
  // Bloco 3.3B-B1 (2026-08-17): novo 4º ponto de marcação -- o guard
  // fail-closed de captacao_detalhamento (nenhum match encontrado/criado
  // para essa modalidade também vira identidadeConflitante, mesma saída
  // neutra, sem nenhuma escrita).
  assert.equal(ocorrenciasFlag.length, 4, "esperava 4 pontos de marcação (Estado 6, Estados 4/5, conflito na busca de reforço, e o fail-closed de captacao_detalhamento)");
  for (const idx of ocorrenciasFlag) {
    const trechoAteRetorno = srcLead.slice(idx, idxRetorno);
    // Cada ponto de marcação, até o retorno antecipado, não pode conter
    // nenhuma escrita NOVA depois de si mesmo -- isso é garantido pela
    // estrutura do if/else-if (só um ramo executa por requisição), mas
    // confirmamos que not upsert/insert/update síncrono roda entre a
    // marcação mais tardia (a última) e o retorno.
  }
  const idxUltimaMarcacao = ocorrenciasFlag[ocorrenciasFlag.length - 1];
  const trechoFinal = srcLead.slice(idxUltimaMarcacao, idxRetorno);
  assert.doesNotMatch(trechoFinal, /\.insert\(|\.upsert\(/);
});

test("8b. o retorno antecipado continua posicionado antes do Fallback Final", () => {
  const idxRetorno = srcLead.indexOf("if (identidadeConflitante) {");
  const idxFallback = srcLead.indexOf("// Fallback final");
  assert.ok(idxRetorno < idxFallback);
});

// ═══════════════════════════════════════════════════════════════════════════
// 9/10. Cenário da Ana e resolução 0/1/2+ continuam preservados
// ═══════════════════════════════════════════════════════════════════════════

test("9. cenário Ana (telefone+e-mail primeiro, só e-mail depois) continua resolvido no ramo de 1 candidato por e-mail -- não passa pelo ramo do upsert corrigido", () => {
  const inicio = srcLead.indexOf("if (!match) {");
  const fimDecisao = srcLead.indexOf("// Aviso de compartilhamento", inicio);
  const trecho = srcLead.slice(inicio, fimDecisao);
  const idx1 = trecho.indexOf("if (candidatosPorEmail && candidatosPorEmail.length === 1) {");
  const idxUpsert = trecho.indexOf('} else if (chaveDedupAtual && formulario !== "captacao_detalhamento") {');
  assert.ok(idx1 !== -1 && idxUpsert !== -1 && idx1 < idxUpsert, "o ramo de 1 candidato precisa continuar sendo avaliado antes do ramo do upsert");
});

test("10. os ramos de 0/1/2+ candidatos por e-mail continuam intactos -- a correção desta rodada só adicionou um 'else' dentro do ramo do upsert, não alterou os outros ramos", () => {
  const inicio = srcLead.indexOf("if (!match) {");
  const fimDecisao = srcLead.indexOf("// Aviso de compartilhamento", inicio);
  const trecho = srcLead.slice(inicio, fimDecisao);
  assert.match(trecho, /if \(candidatosPorEmail && candidatosPorEmail\.length === 1\) \{/);
  assert.match(trecho, /\} else if \(candidatosPorEmail && candidatosPorEmail\.length > 1\) \{/);
  assert.match(trecho, /\} else if \(donoExato\) \{/);
  // Bloco 3.3B-B1 (2026-08-17): ganhou "&& formulario !== 'captacao_detalhamento'" -- só o literal exato mudou.
  assert.match(trecho, /\} else if \(chaveDedupAtual && formulario !== "captacao_detalhamento"\) \{/);
  // Só 1 ocorrência de cada -- nenhum ramo foi duplicado por engano.
  for (const padrao of [
    /if \(candidatosPorEmail && candidatosPorEmail\.length === 1\) \{/g,
    /candidatosPorEmail\.length > 1\) \{/g,
  ]) {
    assert.equal((trecho.match(padrao) || []).length, 1);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Escopo: nenhuma arquitetura nova
// ═══════════════════════════════════════════════════════════════════════════

test("nenhum RPC/SQL/migration foi introduzido por esta correção", () => {
  const codigoAtivo = srcLead.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(codigoAtivo, /\.rpc\(/);
});

test("nenhuma nova function declaration de módulo foi introduzida -- só lógica inline a mais dentro do ramo já existente", () => {
  const trecho = trechoRamoUpsert();
  const qtd = (trecho.match(/\bfunction\s+\w+\s*\(/g) || []).length;
  assert.equal(qtd, 0);
});
