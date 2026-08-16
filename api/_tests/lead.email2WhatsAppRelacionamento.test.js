// api/_tests/lead.email2WhatsAppRelacionamento.test.js
//
// Bloco 3.2C -- Consolidação da experiência de cadastro reconhecido
// (2026-08-16). Duas alterações fechadas: (A) nova mensagem pré-preenchida
// do WhatsApp do E-mail 2 (api/lead.js, waTexto2); (B) representação do
// E-mail 2 na aba Relacionamento do CRM, usando o mesmo padrão CardSistema
// já usado pelo E-mail 1, sem toggleKey próprio (os dois pertencem ao mesmo
// fluxo_boas_vindas_email_ativa, decisão do Bloco 3.2B). Mesma limitação já
// documentada nos outros testes deste arquivo -- sem Supabase real
// disponível, são testes ESTRUTURAIS/TEXTUAIS.
//
// Rodar com: node --test api/_tests/lead.email2WhatsAppRelacionamento.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcLead = readFileSync(path.join(__dirname, "..", "lead.js"), "utf8");
const srcCrm = readFileSync(path.join(__dirname, "..", "..", "src", "CRM Casa dos Carvalho.tsx"), "utf8");

function semComentariosJs(texto) {
  return texto.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
}
function semComentariosJsx(texto) {
  return texto.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
}

function trechoWaTexto2() {
  const inicio = srcLead.indexOf('const waTexto2 = ');
  assert.ok(inicio !== -1, "waTexto2 não encontrado");
  const fim = srcLead.indexOf(";", inicio);
  return srcLead.slice(inicio, fim + 1);
}

function trechoRamoExistenteLead() {
  const inicioBloco = srcLead.indexOf("Bloco 3.2B -- E-mail 2");
  assert.ok(inicioBloco !== -1, "ramo else (E-mail 2) não encontrado em api/lead.js");
  const inicio = srcLead.lastIndexOf("} else {", inicioBloco);
  assert.ok(inicio !== -1, "abertura do ramo else não encontrada");
  const fim = srcLead.indexOf("return res.status(200).json({ ok: true, clienteId, campanha: campanhaResp });", inicio);
  assert.ok(fim !== -1, "fim do handler não encontrado");
  return srcLead.slice(inicio, fim);
}

function trechoRamoNovoEmailLead() {
  const inicio = srcLead.indexOf("if (isNewClient) {");
  const fim = srcLead.indexOf("} else {", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "ramo isNewClient (E-mail 1) não encontrado");
  return srcLead.slice(inicio, fim);
}

function trechoBoasVindasCards() {
  const inicio = srcCrm.indexOf("const boasVindasCards = (<>");
  assert.ok(inicio !== -1, "boasVindasCards não encontrado no CRM");
  const fim = srcCrm.indexOf("</>);", inicio);
  assert.ok(fim !== -1, "fim de boasVindasCards não encontrado");
  return srcCrm.slice(inicio, fim);
}

// ── Alteração A: waTexto2 ────────────────────────────────────────────────────

test("waTexto2 utiliza nomeEstudioLead (não texto fixo de tenant)", () => {
  const trecho = trechoWaTexto2();
  assert.match(trecho, /"Olá! Já faço parte da " \+ nomeEstudioLead \+/);
});

test("nenhuma marca/tenant hardcoded na nova mensagem", () => {
  const trecho = trechoWaTexto2();
  assert.doesNotMatch(trecho, /Casa dos Carvalho/i);
  assert.doesNotMatch(trecho, /acasadoscarvalho/i);
});

test("mensagem contém a ideia de que a pessoa já faz parte do estúdio", () => {
  assert.match(trechoWaTexto2(), /Já faço parte da/);
});

test("mensagem faz referência à continuidade recebida por e-mail", () => {
  assert.match(trechoWaTexto2(), /recebi o e-mail para continuar meu atendimento/);
});

test("mensagem utiliza 'nova solicitação' de forma generalista", () => {
  const trecho = trechoWaTexto2();
  assert.match(trecho, /nova solicitação/);
  // Generalista: não deve citar categorias específicas (projeto/consulta/sessão/
  // reagendamento) dentro da PRÓPRIA mensagem do WhatsApp -- isso é conteúdo do
  // e-mail (corpo do E-mail 2), não da mensagem pré-preenchida.
  assert.doesNotMatch(trecho, /projeto|consulta|sessão|reagendamento/i);
});

test("waLink2 continua construído com encodeURIComponent(waTexto2), fórmula preservada", () => {
  assert.match(srcLead, /const waLink2 = waNumero \? "https:\/\/wa\.me\/" \+ waNumero \+ "\?text=" \+ encodeURIComponent\(waTexto2\) : "";/);
});

test("quebra de linha entre os dois parágrafos da mensagem foi preservada", () => {
  const trecho = trechoWaTexto2();
  assert.match(trecho, /😊\\nQuero falar com vocês/);
});

// ── E-mail 1 permanece intacto ───────────────────────────────────────────────

test("E-mail 1 (ramo isNewClient) permanece com waTexto, resumoDados e template originais", () => {
  const trecho = trechoRamoNovoEmailLead();
  assert.match(trecho, /const waTexto = "Olá! Recebi agora o e-mail confirmando meu cadastro na " \+ nomeEstudioLead/);
  assert.match(trecho, /const resumoDados =/);
  assert.match(trecho, /const ni = "Não informado";/);
  assert.match(trecho, /Chamar no WhatsApp/);
  assert.match(trecho, /subject: "Recebemos sua mensagem, " \+ fn \+ "! 🖤"/);
});

test("E-mail 2 continua sem resumoDados e sem dados da nova intenção (ramo else)", () => {
  const codigoAtivo = semComentariosJs(trechoRamoExistenteLead());
  assert.doesNotMatch(codigoAtivo, /resumoDados/);
  assert.doesNotMatch(codigoAtivo, /ideaFinal/);
});

// ── Alteração B: representação do E-mail 2 na aba Relacionamento ────────────

test("card do E-mail 2 existe dentro de boasVindasCards (etapa lead)", () => {
  const trecho = trechoBoasVindasCards();
  assert.match(trecho, /label="E-mail de cadastro reconhecido"/);
  assert.match(srcCrm, /if \(sid === "lead"\) return boasVindasCards;/);
});

test("card do E-mail 2 utiliza o componente CardSistema (mesmo padrão do E-mail 1)", () => {
  const trecho = trechoBoasVindasCards();
  const qtdCardSistema = (trecho.match(/<CardSistema /g) || []).length;
  assert.equal(qtdCardSistema, 3, "esperava 3 <CardSistema> dentro de boasVindasCards: E-mail 1, E-mail 2 e alerta ao artista");
});

test("card do E-mail 2 NÃO usa CardSistemaEditavel", () => {
  const trecho = trechoBoasVindasCards();
  assert.doesNotMatch(trecho, /CardSistemaEditavel/);
});

test("card do E-mail 2 NÃO introduz toggleKey próprio -- só reflete o mesmo estado de boas_vindas_email", () => {
  const trecho = trechoBoasVindasCards();
  const linhaEmail2 = trecho.slice(trecho.indexOf('label="E-mail de cadastro reconhecido"') - 200, trecho.indexOf('label="E-mail de cadastro reconhecido"') + 400);
  assert.doesNotMatch(linhaEmail2, /toggleKey=/, "o card do E-mail 2 não deve ter toggleKey -- evita um segundo switch controlando a mesma coluna");
  assert.match(linhaEmail2, /ativo=\{fluxoToggles\.boas_vindas_email\}/, "precisa refletir (leitura) o mesmo estado do E-mail 1");
});

test("nenhuma nova persistência/configuração foi criada para o E-mail 2 (fora de comentário explicativo)", () => {
  const trechoSemComentario = semComentariosJsx(trechoBoasVindasCards());
  assert.doesNotMatch(trechoSemComentario, /mensagens_sistema_override/);
  assert.doesNotMatch(trechoSemComentario, /\.upsert\(/);
  assert.doesNotMatch(trechoSemComentario, /\.insert\(/);
});

test("nenhum toggleKey novo foi adicionado ao objeto fluxoToggles", () => {
  assert.match(
    srcCrm,
    /const \[fluxoToggles, setFluxoToggles\] = useState\(\{ boas_vindas_email: true, nps: true, google_convite: true, confirmacao_presenca: true, notificacao_artista: true, confirma_consulta: true, confirma_sessao: true, sms_consulta: true, sms_sessao: true, recontato_prox_sessao: true, remarcar: true, agradecimento_1asessao: true, recontato_d30: true \}\);/,
    "o objeto fluxoToggles precisa continuar exatamente com as mesmas chaves de antes"
  );
});

// ── Backend: lógica de roteamento e ausência de arquitetura fora de escopo ──

test("lógica isNewClient do backend permanece intacta (if/else único, mesmo gate)", () => {
  const trecho = srcLead.slice(srcLead.indexOf('if (cfgDisparos?.fluxo_boas_vindas_email_ativa !== false && resendKey && email) {'));
  const qtdIf = (trecho.slice(0, trecho.indexOf("return res.status(200)")).match(/if \(isNewClient\) \{/g) || []).length;
  assert.equal(qtdIf, 1);
});

test("nenhum código de projetos/RPC/consentimento/tráfego foi introduzido em nenhum dos dois arquivos", () => {
  const alvos = [
    ["api/lead.js", semComentariosJs(srcLead)],
    ["src/CRM Casa dos Carvalho.tsx", srcCrm.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n")],
  ];
  const proibidos = [/resolver_solicitacao_lead/, /marcar_email_solicitacao_enviado/, /solicitacao_id/, /consentimento_contato/, /\butm_source\b/, /\bfbclid\b/];
  for (const [nomeArquivo, conteudo] of alvos) {
    for (const re of proibidos) {
      assert.doesNotMatch(conteudo, re, `${nomeArquivo} não pode conter ${re}`);
    }
  }
});
