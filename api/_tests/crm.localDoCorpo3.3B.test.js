// api/_tests/crm.localDoCorpo3.3B.test.js
//
// Refinamento "Local do corpo" do Bloco 3.3B-B (2026-08-18). regiao passa a
// ser exibida/editável como atributo de cada Solicitação/projeto no CRM
// (draft.regiao / setProjDraftField, mesmo mecanismo já existente pra
// desc/estilo/servico) e a criar Nova Solicitação manual também aceita
// Local do corpo. Site público: só a copy do campo cd-regiao mudou, pra
// induzir uma resposta mais específica -- id, payload e mecanismo de
// persistência permanecem exatamente os mesmos já homologados no B1/B2.
//
// Decisão de produto explícita: os dois fallbacks de compatibilidade legada
// (clientes sem projetos[] ainda) NÃO recebem regiao -- clientes.regiao
// nunca é usado como fonte de um projeto, nem para leitura nem synthesize.
// Um projeto legado sem regiao simplesmente mostra o campo vazio.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): estrutural/textual,
// sem DOM real/Supabase.
//
// Rodar com: node --test api/_tests/crm.localDoCorpo3.3B.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcCrm = readFileSync(path.join(__dirname, "..", "..", "src", "CRM Casa dos Carvalho.tsx"), "utf8");
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");

// ═══════════════════════════════════════════════════════════════════════════
// Estado inicial e os 3 resets do formulário de Nova Solicitação
// ═══════════════════════════════════════════════════════════════════════════

test("estado inicial de novoProjetoForm inclui regiao: \"\"", () => {
  assert.match(
    srcCrm,
    /const \[novoProjetoForm, setNovoProjetoForm\] = useState\(\{ estilo: "", tam: "Medio", regiao: "", primeira: false,/
  );
});

test("regiao é limpa nos 3 pontos de reset do formulário (abrir, descartar, salvar)", () => {
  const ocorrencias = (srcCrm.match(/\{ estilo: "", tam: "Medio", regiao: "", primeira: false, desc: "", valorTotal: "", servico: "", artista: "", piercingModo: "", joiaId: "", valorAplicacao: "", joiaCascGrupo: "", joiaCascSubgrupo: "", piercingItens: \[\] \}/g) || []).length;
  assert.equal(ocorrencias, 3, "esperava exatamente 3 resets (abrir Nova Solicitação, Descartar, após Salvar Projeto)");
});

// ═══════════════════════════════════════════════════════════════════════════
// Nova Solicitação manual -- campo visual + gravação em projetos[]
// ═══════════════════════════════════════════════════════════════════════════

function trechoFormularioNovaSolicitacao() {
  // Âncora na JSX do formulário inline (não na declaração de estado, que
  // fica muito antes no arquivo, no topo do componente) -- mantém o recorte
  // pequeno e preciso, evitando capturar código não relacionado.
  const inicio = srcCrm.indexOf("novoProjetoAberto === sc.id && (");
  const fim = srcCrm.indexOf("Salvar Projeto</button>", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "formulário de Nova Solicitação não encontrado");
  return srcCrm.slice(inicio, fim);
}

test("Nova Solicitação tem campo visual 'Local do corpo' ligado a novoProjetoForm.regiao", () => {
  const trecho = trechoFormularioNovaSolicitacao();
  assert.match(trecho, /<div className="fil">Local do corpo<\/div>/);
  assert.match(
    trecho,
    /<input className="ef" placeholder="Ex\.: parte interna do antebraço, panturrilha direita, lateral das costelas, costas completas…" value=\{novoProjetoForm\.regiao\} onChange=\{e => setNovoProjetoForm\(p => \(\{ \.\.\.p, regiao: e\.target\.value \}\)\)\} \/>/
  );
});

test("objeto proj criado manualmente inclui regiao: novoProjetoForm.regiao", () => {
  assert.match(
    srcCrm,
    /const proj: any = \{ id: Date\.now\(\), estilo: novoProjetoForm\.estilo, tam: novoProjetoForm\.tam, regiao: novoProjetoForm\.regiao, primeira: novoProjetoForm\.primeira,/
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Edição de Solicitação existente -- leitura e escrita via draft
// ═══════════════════════════════════════════════════════════════════════════

function trechoCardEdicaoSolicitacao() {
  const inicio = srcCrm.indexOf('const draft = getProjDraft(proj);');
  const fim = srcCrm.indexOf("{dirty && (", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "card de edição de Solicitação não encontrado");
  return srcCrm.slice(inicio, fim);
}

test("card de edição de Solicitação tem campo 'Local do corpo' lendo draft.regiao e salvando via setProjDraftField", () => {
  const trecho = trechoCardEdicaoSolicitacao();
  assert.match(trecho, /<div className="fil">Local do corpo<\/div>/);
  assert.match(
    trecho,
    /<input className="ef" placeholder="Ex\.: parte interna do antebraço, panturrilha direita, lateral das costelas, costas completas…" value=\{draft\.regiao \|\| ""\} onChange=\{e => setProjDraftField\(proj, \{ regiao: e\.target\.value \}\)\} \/>/
  );
});

test("campo de Local do corpo na edição vem logo após Descrição do Serviço (mesmo bloco fi2, mesma ordem visual)", () => {
  const trecho = trechoCardEdicaoSolicitacao();
  const idxDesc = trecho.indexOf('<div className="fil">Descrição do Serviço</div>');
  const idxLocal = trecho.indexOf('<div className="fil">Local do corpo</div>');
  assert.ok(idxDesc !== -1 && idxLocal !== -1 && idxDesc < idxLocal);
});

test("editar regiao usa exatamente o mesmo mecanismo (getProjDraft/setProjDraftField) já usado por desc -- nenhuma lógica nova de merge foi criada", () => {
  // getProjDraft faz spread completo do projeto (projDrafts[proj.id] || proj)
  // -- confirma que editar regiao não pode apagar desc/estilo/tam/servico/
  // artista/valorTotal/status/etc., e editar qualquer um desses não apaga
  // regiao, porque nenhum deles reconstrói o objeto do zero.
  assert.match(srcCrm, /const getProjDraft = \(proj: any\) => projDrafts\[proj\.id\] \|\| proj;/);
  assert.match(srcCrm, /const setProjDraftField = \(proj: any, fields: any\) => \{\s*\n\s*setProjDrafts\(p => \(\{ \.\.\.p, \[proj\.id\]: \{ \.\.\.\(p\[proj\.id\] \|\| proj\), \.\.\.fields \} \}\)\);\s*\n\s*\};/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Compatibilidade legada -- clientes.regiao NÃO é usado como fallback
// ═══════════════════════════════════════════════════════════════════════════

test("fallback de migração legada (2ª Solicitação de cliente antigo) NÃO inclui regiao: sc.regiao", () => {
  assert.match(
    srcCrm,
    /projs\.push\(\{ id: Date\.now\(\)-1, estilo: sc\.estilo\|\|"", tam: sc\.tam\|\|"Medio", primeira: sc\.primeira\|\|false, desc: sc\.desc\|\|"", valorTotal: 0, status: "ativo", etapa: \(sc\.etapa \|\| "lead"\), etapa_desde: new Date\(\)\.toISOString\(\), criadoEm: "—", pagamentos: \[\] \}\);/,
    "trecho de migração legada precisa continuar exatamente igual, sem regiao"
  );
  assert.doesNotMatch(srcCrm.slice(srcCrm.indexOf('projs.push({ id: Date.now()-1'), srcCrm.indexOf('projs.push({ id: Date.now()-1') + 300), /sc\.regiao/);
});

test("fallback de exibição legada (cliente sem projetos[]) NÃO inclui regiao: sc.regiao", () => {
  assert.match(
    srcCrm,
    /\? \[\{ id: "legacy", estilo: sc\.estilo \|\| "", tam: sc\.tam \|\| "Medio", primeira: sc\.primeira \|\| false, desc: sc\.desc \|\| "", servico: sc\.servico \|\| "", status: "ativo", criadoEm: "—" \}\]/,
    "trecho de exibição legada precisa continuar exatamente igual, sem regiao"
  );
});

test("clientes.regiao (nível de cliente) continua existindo só como dado legado -- nenhuma migração/backfill foi introduzida", () => {
  const codigoAtivo = srcCrm.split("\n").filter(l => !l.trim().startsWith("//")).join("\n");
  assert.doesNotMatch(codigoAtivo, /\.rpc\(.*regiao/i);
  assert.doesNotMatch(codigoAtivo, /update\(\{[^}]*regiao:\s*sc\.regiao/);
});

// ═══════════════════════════════════════════════════════════════════════════
// tam e estilo permanecem intocados
// ═══════════════════════════════════════════════════════════════════════════

test("tam permanece com o mesmo default 'Medio' e nenhum novo ponto de leitura/escrita/exibição foi introduzido", () => {
  assert.match(srcCrm, /const proj: any = \{ id: Date\.now\(\), estilo: novoProjetoForm\.estilo, tam: novoProjetoForm\.tam, regiao: novoProjetoForm\.regiao,/);
  // novoProjetoForm.tam só pode ser lido nesse único ponto (montagem do
  // objeto proj) -- nenhum novo <input>/<select> foi ligado a ele. Note que
  // a palavra "tamanho" (minúscula, de joia/piercing) aparece legitimamente
  // várias vezes no formulário -- não tem relação com o tam do projeto.
  const ocorrenciasLeitura = (srcCrm.match(/novoProjetoForm\.tam\b/g) || []).length;
  assert.equal(ocorrenciasLeitura, 1, "novoProjetoForm.tam só pode ser lido na montagem do objeto proj, nenhum novo campo visual");
});

test("estilo permanece com o mesmo papel de Nome/Identificação do Projeto -- nenhum campo estiloArtistico foi criado", () => {
  assert.match(srcCrm, /Preencha o nome\/identificação do projeto\./);
  assert.doesNotMatch(srcCrm, /estiloArtistico/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Site público -- só copy, id/payload/backend inalterados
// ═══════════════════════════════════════════════════════════════════════════

test("copy do campo cd-regiao foi atualizada para induzir resposta específica", () => {
  assert.match(
    srcLead,
    /campo\('Onde exatamente no corpo você pretende fazer a tatuagem\? \(opcional\)', '<input class="ficha-input" id="cd-regiao" placeholder="Ex\.: parte interna do antebraço, panturrilha direita, lateral das costelas, costas completas\.\.\.">'\)/
  );
  assert.doesNotMatch(srcLead, /Região do corpo \(opcional\)/, "copy antiga não pode mais existir no campo de detalhamento");
});

test("id=\"cd-regiao\" permanece exatamente o mesmo -- nenhuma mudança de identificador do campo", () => {
  const ocorrencias = (srcLead.match(/id="cd-regiao"/g) || []).length;
  assert.equal(ocorrencias, 1);
});

test("payload de enviarDetalhamento continua enviando regiao: regiaoVal, sem nenhum campo novo", () => {
  assert.match(
    srcLead,
    /idea: descricao, regiao: regiaoVal, referencias: cdReferenciasUrls/
  );
});

test("ficha antiga (campo 'Região do corpo' de name=\"regiao\") permanece intocada -- copy diferente, isolada da captação essencial", () => {
  assert.match(srcLead, /campo\('Região do corpo', '<input class="ficha-input" name="regiao" placeholder="Ex: braço, costas\.\.\.">'\);/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Backend B1 intacto
// ═══════════════════════════════════════════════════════════════════════════

test("guards fail-closed e criação de projetos[] do Bloco 3.3B-B1 permanecem byte-idênticos", () => {
  assert.match(srcLead, /else if \(chaveDedupAtual && formulario !== "captacao_detalhamento"\) \{/);
  assert.match(srcLead, /if \(formulario === "captacao_detalhamento" && !identidadeConflitante && !clienteId\) \{/);
  assert.match(
    srcLead,
    /updateFields\.projetos = \[\.\.\.\(match\.projetos \|\| \[\]\), novoProjeto\];/
  );
  assert.match(srcLead, /desc: ideaFinal \|\| "",\s*\n\s*regiao: regiao \|\| "",/);
});
