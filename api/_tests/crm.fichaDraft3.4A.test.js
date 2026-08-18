// api/_tests/crm.fichaDraft3.4A.test.js
//
// Bloco 3.4A -- Draft real e persistência segura dos Dados Básicos da Ficha
// do Cliente (2026-08-18). Corrige o bug sistêmico comprovado: uma edição
// aparentemente não salva/descartada não pode permanecer em `clients` nem
// chegar ao banco por outra ação operacional.
//
// Nome, Telefone, E-mail, Instagram, Nascimento e Observações Internas
// passam a viver isolados em `fichaDraft` (protegido por `clienteId`) até
// "Salvar alterações" confirmar sucesso real do banco, ou "Descartar
// alterações"/fechar-descartando eliminar o draft sem tocar `clients`.
//
// AJUSTES aprovados nesta rodada em relação ao planejamento original:
// - `upC` e seu setTimeout(100) permanecem byte-idênticos -- não fazem
//   parte do escopo do 3.4A (saneamento isolado e posterior).
// - Botão "Descartar alterações" fica disponível diretamente na ficha,
//   além do aviso de saída.
//
// Fora de escopo (não tocado, não testado aqui): Histórico "Projeto criado"
// (3.4B), robustez de salvarProjDraft/projDrafts (3.4C), Resumo do Cliente
// (3.5), regiao/tam/estilo, captação/site, backend, SQL/Supabase.
//
// LIMITAÇÃO DE METODOLOGIA (igual à de todo este bloco): estrutural/textual,
// sem DOM real/Supabase.
//
// Rodar com: node --test api/_tests/crm.fichaDraft3.4A.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcCrm = readFileSync(path.join(__dirname, "..", "..", "src", "CRM Casa dos Carvalho.tsx"), "utf8");

// ═══════════════════════════════════════════════════════════════════════════
// saveClientDb -- contrato de sucesso/falha real
// ═══════════════════════════════════════════════════════════════════════════

test("saveClientDb devolve o resultado real de dbUpsert (null em falha, objeto em sucesso) em vez de descartar o retorno", () => {
  assert.match(srcCrm, /return await dbUpsert\("clientes", \{\s*\n\s*id: typeof c\.id === "number" \? undefined : c\.id,/);
});

test("dbUpsert continua devolvendo null em erro -- contrato pré-existente, não alterado", () => {
  assert.match(srcCrm, /if \(error\) \{ console\.error\("upsert", table, error\.message, row\); onError\?\.\(error\.message\); return null; \}/);
});

// ═══════════════════════════════════════════════════════════════════════════
// fichaSaveStep -- eliminação completa
// ═══════════════════════════════════════════════════════════════════════════

test("fichaSaveStep foi completamente eliminado -- nenhuma ocorrência remanescente no arquivo", () => {
  assert.doesNotMatch(srcCrm, /fichaSaveStep/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Estado fichaDraft -- declaração e proteção por clienteId
// ═══════════════════════════════════════════════════════════════════════════

test("fichaDraft nasce null e é tipado como parcial protegido por clienteId", () => {
  assert.match(
    srcCrm,
    /const \[fichaDraft, setFichaDraft\] = useState<\{ clienteId: any; nome\?: string; tel\?: string; email\?: string; insta\?: string; nascimento\?: string; obs\?: string \} \| null>\(null\);/
  );
});

test("setFichaDraftField só nasce/atualiza o draft do próprio cliente -- se já existir draft de outro clienteId, ele é substituído por um novo draft (nunca misturado)", () => {
  assert.match(
    srcCrm,
    /const setFichaDraftField = \(clienteId: any, campo: string, valor: any\) => \{\s*\n\s*setFichaDraft\(prev => \(prev && prev\.clienteId === clienteId\) \? \{ \.\.\.prev, \[campo\]: valor \} : \{ clienteId, \[campo\]: valor \}\);\s*\n\s*\};/
  );
});

test("fichaDraftValor só devolve o valor do draft quando o clienteId bate -- cliente B nunca lê draft de cliente A (prova estrutural do item 12 do roteiro)", () => {
  assert.match(
    srcCrm,
    /const fichaDraftValor = \(clienteId: any, campo: string, fallback: any\) => \{\s*\n\s*return \(fichaDraft && fichaDraft\.clienteId === clienteId && campo in fichaDraft\) \? \(fichaDraft as any\)\[campo\] : fallback;\s*\n\s*\};/
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Itens 1-5 do roteiro: os 6 campos em escopo escrevem só no draft
// ═══════════════════════════════════════════════════════════════════════════

function trechoLoopDadosBasicos() {
  const inicio = srcCrm.indexOf('{ l: "Nome", f: "nome" }, { l: "Telefone", f: "tel" },');
  const fim = srcCrm.indexOf("Profissional Responsável", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "loop de Nome/Telefone/Email/Instagram não encontrado");
  return srcCrm.slice(inicio, fim);
}

test("Nome/Telefone/Email/Instagram: onChange grava exclusivamente via setFichaDraftField -- upCFicha não é mais chamado nesse trecho (clients não muda ao digitar)", () => {
  const trecho = trechoLoopDadosBasicos();
  assert.match(trecho, /setFichaDraftField\(sc\.id, fd\.f, vFinal\);/);
  assert.doesNotMatch(trecho, /upCFicha\(sc\.id, fd\.f/);
  assert.doesNotMatch(trecho, /upC\(sc\.id, fd\.f/);
  assert.doesNotMatch(trecho, /upCLocal\(sc\.id, fd\.f/);
});

test("Nome/Telefone/Email/Instagram: value exibido vem de fichaDraftValor (fallback para o confirmado), não direto de sc/clients", () => {
  const trecho = trechoLoopDadosBasicos();
  assert.match(trecho, /const valorAtual = fichaDraftValor\(sc\.id, fd\.f, \(sc as any\)\[fd\.f\] \|\| ""\);/);
  assert.match(trecho, /value=\{fd\.f === "tel" \? maskTel\(valorAtual\) : valorAtual\}/);
});

test("Nascimento: monta a data completa via setFichaDraftField, não mais via upCFicha; leitura também passa por fichaDraftValor", () => {
  assert.match(srcCrm, /const nasc = fichaDraftValor\(sc\.id, "nascimento", \(sc as any\)\.nascimento \|\| ""\);/);
  assert.match(
    srcCrm,
    /setFichaDraftField\(sc\.id, "nascimento", d\.padStart\(2,"0"\) \+ "\/" \+ m\.padStart\(2,"0"\) \+ "\/" \+ a\);/
  );
});

test("Observações Internas: onChange grava via setFichaDraftField; onBlur de upC foi removido (nada de autosave)", () => {
  const inicio = srcCrm.indexOf('<div className="fil">Observações Internas</div>');
  const fim = srcCrm.indexOf("</div>", srcCrm.indexOf("placeholder=\"Anotações privadas...\"", inicio));
  const trecho = srcCrm.slice(inicio, fim);
  assert.match(trecho, /value=\{fichaDraftValor\(sc\.id, "obs", sc\.obs \|\| ""\)\}/);
  assert.match(trecho, /onChange=\{e => setFichaDraftField\(sc\.id, "obs", e\.target\.value\)\}/);
  assert.doesNotMatch(trecho, /onBlur=\{e => upC\(sc\.id, "obs"/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Item 6: Salvar alterações -- monta o merge certo, só persiste em clients
// após sucesso confirmado do banco
// ═══════════════════════════════════════════════════════════════════════════

function trechoSalvarFichaAlteracoes() {
  const inicio = srcCrm.indexOf("const salvarFichaAlteracoes = async (clienteAtual: any) => {");
  const fim = srcCrm.indexOf("\n  };", inicio) + "\n  };".length;
  assert.ok(inicio !== -1, "salvarFichaAlteracoes não encontrada");
  return srcCrm.slice(inicio, fim);
}

test("salvarFichaAlteracoes monta atualizado = {...clienteAtual, ...camposDraft} e chama saveClientDb com esse objeto", () => {
  const trecho = trechoSalvarFichaAlteracoes();
  assert.match(trecho, /const \{ clienteId, \.\.\.camposDraft \} = fichaDraft;/);
  assert.match(trecho, /const atualizado = \{ \.\.\.clienteAtual, \.\.\.camposDraft \};/);
  assert.match(trecho, /const resultado = await saveClientDb\(atualizado\);/);
});

test("salvarFichaAlteracoes só atualiza clients/limpa o draft dentro do if (resultado) -- nunca antes da confirmação do banco (item 6 e 13 do roteiro)", () => {
  const trecho = trechoSalvarFichaAlteracoes();
  const idxIf = trecho.indexOf("if (resultado) {");
  assert.ok(idxIf !== -1, "guarda de sucesso não encontrada");
  // Tudo antes do "if (resultado)" não pode conter setClients/setFichaDraft(null)
  const antesDoIf = trecho.slice(0, idxIf);
  assert.doesNotMatch(antesDoIf, /setClients\(/);
  assert.doesNotMatch(antesDoIf, /setFichaDraft\(null\)/);
  const dentroDoIf = trecho.slice(idxIf);
  assert.match(dentroDoIf, /setClients\(prev => prev\.map\(c => c\.id === clienteAtual\.id \? atualizado : c\)\);/);
  assert.match(dentroDoIf, /setFichaDraft\(null\);/);
});

test("falha de persistência (resultado falsy) não limpa fichaDraft nem atualiza clients -- draft e clients permanecem intactos, nada é apresentado como salvo (item 13 do roteiro)", () => {
  const trecho = trechoSalvarFichaAlteracoes();
  // A única ocorrência de setClients/limpeza de draft dentro da função inteira
  // está dentro do bloco if(resultado) -- ou seja, não existe nenhum caminho
  // de código nessa função que toque clients/draft fora dessa guarda.
  const ocorrenciasSetClients = (trecho.match(/setClients\(/g) || []).length;
  const ocorrenciasLimpaDraft = (trecho.match(/setFichaDraft\(null\)/g) || []).length;
  assert.equal(ocorrenciasSetClients, 1, "setClients só pode ser chamado uma vez, dentro do sucesso");
  assert.equal(ocorrenciasLimpaDraft, 1, "fichaDraft só pode ser limpo uma vez, dentro do sucesso");
});

// ═══════════════════════════════════════════════════════════════════════════
// Itens 7-8: Descartar alterações -- clients nunca tocado, nada vai ao banco
// ═══════════════════════════════════════════════════════════════════════════

function trechoDescartarFichaAlteracoes() {
  const inicio = srcCrm.indexOf("const descartarFichaAlteracoes = () => {");
  const fim = srcCrm.indexOf("\n  };", inicio) + "\n  };".length;
  assert.ok(inicio !== -1, "descartarFichaAlteracoes não encontrada");
  return srcCrm.slice(inicio, fim);
}

test("descartarFichaAlteracoes limpa fichaDraft/nascDraft/fichaEditada e NUNCA chama setClients, saveClientDb, upC ou qualquer escrita no banco", () => {
  const trecho = trechoDescartarFichaAlteracoes();
  assert.match(trecho, /setFichaDraft\(null\);/);
  assert.match(trecho, /setNascDraft\(\{ dia: "", mes: "", ano: "" \}\);/);
  assert.match(trecho, /setFichaEditada\(false\);/);
  assert.doesNotMatch(trecho, /setClients\(/);
  assert.doesNotMatch(trecho, /saveClientDb\(/);
  assert.doesNotMatch(trecho, /upC\(/);
  assert.doesNotMatch(trecho, /sb\.from/);
});

test("botão 'Descartar alterações' chama descartarFichaAlteracoes() diretamente, sem nenhum passo intermediário de confirmação dupla", () => {
  assert.match(srcCrm, /onClick=\{\(\) => descartarFichaAlteracoes\(\)\}/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Itens 9-11: Ações Operacionais durante draft pendente permanecem
// independentes e imediatas -- nunca leem/carregam fichaDraft
// ═══════════════════════════════════════════════════════════════════════════

test("upC (usado por uploads, val_a, Profissional Responsável etc.) nunca referencia fichaDraft -- opera só sobre o `c` vivo de clients", () => {
  const inicio = srcCrm.indexOf("const upC = (cid: number, f: string, v: any) => {");
  const fim = srcCrm.indexOf("\n  };", inicio) + "\n  };".length;
  const trecho = srcCrm.slice(inicio, fim);
  assert.doesNotMatch(trecho, /fichaDraft/);
});

test("Profissional Responsável continua chamando upC(sc.id, \"artista\", novoArtista) de forma imediata, sem relação com fichaDraft (item 11 do roteiro)", () => {
  assert.match(srcCrm, /upC\(sc\.id, "artista", novoArtista\);/);
});

test("upload de referência (upC 'referencias') e ação de cicatrização (update direto + upCFicha) continuam com seus próprios mecanismos, sem tocar fichaDraft (item 9-10 do roteiro)", () => {
  assert.match(srcCrm, /upC\(sc\.id, "referencias", refs\);/);
  assert.match(srcCrm, /await sb\.from\("clientes"\)\.update\(\{ cicatrizacao_fotos: atual \}\)\.eq\("id", sc\.id\);/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Item 12: proteção contra vazamento de draft entre clientes (fichaDraft +
// nascDraft) -- reset nos pontos de abertura/fechamento
// ═══════════════════════════════════════════════════════════════════════════

test("os pontos de abrir/fechar a ficha resetam fichaDraft e nascDraft (proteção contra o vazamento comprovado na auditoria) -- pelo menos 10 ocorrências do reset combinado", () => {
  const ocorrencias = (srcCrm.match(/setFichaEditada\(false\); setFichaDraft\(null\); setNascDraft\(\{ dia: "", mes: "", ano: "" \}\);/g) || []).length;
  assert.ok(ocorrencias >= 10, `esperava pelo menos 10 ocorrências do reset combinado, achou ${ocorrencias}`);
});

test("nascDraft continua existindo como buffer de dia/mês/ano (não foi removido, só passou a alimentar fichaDraft em vez de gravar direto)", () => {
  assert.match(srcCrm, /const \[nascDraft, setNascDraft\] = useState<\{dia: string; mes: string; ano: string\}>\(\{ dia: "", mes: "", ano: "" \}\);/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Proteção ao fechar/trocar aba com alterações pendentes (aviso reaproveitado)
// ═══════════════════════════════════════════════════════════════════════════

test("clique fora do modal e botão X passam a considerar fichaDraft do cliente atual, além de fichaEditada, para decidir se mostram o aviso de saída", () => {
  const ocorrencias = (srcCrm.match(/if \(fichaEditada \|\| \(fichaDraft && fichaDraft\.clienteId === sc\.id\)\) \{ setFichaWarnSair\(true\); \}/g) || []).length;
  assert.equal(ocorrencias, 2, "esperava exatamente 2 pontos: clique fora do modal e botão X");
});

test("troca de aba com draft pendente também aciona o aviso (fichaTabPendente), mesma lógica de fichaEditada || fichaDraft", () => {
  assert.match(srcCrm, /if \(fichaEditada \|\| \(fichaDraft && fichaDraft\.clienteId === sc\.id\)\) \{ setFichaTabPendente\(tab\); \} else \{ setFichaTab\(tab\); \}/);
});

test("'Salvar antes' no aviso de saída chama salvarFichaAlteracoes(sc) e só troca de aba pendente depois, sem fechar automaticamente a ficha", () => {
  assert.match(
    srcCrm,
    /if \(sc\) await salvarFichaAlteracoes\(sc\);\s*\n\s*if \(trocarPara\) setFichaTab\(trocarPara as any\);/
  );
});

test("'Descartar alterações' dentro do aviso de saída usa descartarFichaAlteracoes() nos dois ramos (trocar aba e fechar cliente)", () => {
  const ocorrencias = (srcCrm.match(/descartarFichaAlteracoes\(\);/g) || []).length;
  // ramo troca de aba + ramo fechar cliente, dentro do modal de aviso
  // (o botão direto da ficha usa a forma "() => descartarFichaAlteracoes()",
  // sem ";", e já é coberto pelo teste do botão isolado acima)
  assert.ok(ocorrencias >= 2, `esperava pelo menos 2 chamadas a descartarFichaAlteracoes(); dentro do aviso, achou ${ocorrencias}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// Botão único "Salvar alterações" -- sem confirmação dupla
// ═══════════════════════════════════════════════════════════════════════════

test("botão 'Salvar alterações' chama salvarFichaAlteracoes(sc) diretamente -- nenhum passo de confirmação intermediário restante", () => {
  assert.match(srcCrm, /onClick=\{\(\) => salvarFichaAlteracoes\(sc\)\}/);
  assert.doesNotMatch(srcCrm, /Confirmar alterações\?/);
});

test("botão 'Descartar alterações' só aparece quando existe draft pendente do cliente atual", () => {
  assert.match(srcCrm, /\{\(fichaDraft && fichaDraft\.clienteId === sc\.id\) && \(\s*\n\s*<button onClick=\{\(\) => descartarFichaAlteracoes\(\)\}/);
});

// ═══════════════════════════════════════════════════════════════════════════
// AJUSTE 1 aprovado: upC e seu setTimeout(100) permanecem intocados
// ═══════════════════════════════════════════════════════════════════════════

test("upC permanece byte-idêntico ao original, incluindo o setTimeout(100) -- não foi tocado neste bloco (ajuste aprovado)", () => {
  assert.match(
    srcCrm,
    /const upC = \(cid: number, f: string, v: any\) => \{\s*\n\s*setClients\(p => \{\s*\n\s*const updated = p\.map\(c => c\.id !== cid \? c : \{ \.\.\.c, \[f\]: v \}\);\s*\n\s*const c = updated\.find\(c => c\.id === cid\);\s*\n\s*if \(c\) setTimeout\(\(\) => saveClientDb\(c\), 100\);\s*\n\s*return updated;\s*\n\s*\}\);\s*\n\s*\};/
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// Regressão -- projDrafts/Solicitações intocados
// ═══════════════════════════════════════════════════════════════════════════

test("getProjDraft/setProjDraftField (mecanismo de draft de Solicitações) permanecem byte-idênticos -- não foram fundidos com fichaDraft", () => {
  assert.match(srcCrm, /const getProjDraft = \(proj: any\) => projDrafts\[proj\.id\] \|\| proj;/);
  assert.match(
    srcCrm,
    /const setProjDraftField = \(proj: any, fields: any\) => \{\s*\n\s*setProjDrafts\(p => \(\{ \.\.\.p, \[proj\.id\]: \{ \.\.\.\(p\[proj\.id\] \|\| proj\), \.\.\.fields \} \}\)\);\s*\n\s*\};/
  );
});
