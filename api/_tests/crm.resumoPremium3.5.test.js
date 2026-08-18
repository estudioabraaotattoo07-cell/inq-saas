// api/_tests/crm.resumoPremium3.5.test.js
//
// Bloco 3.5 -- Refinamento do Resumo Premium (2026-08-18), sobre a base
// mínima já em produção (commit d34e187). Adiciona ao Resumo: badges de
// aniversariante/menor no cabeçalho (reaproveitando isAniversHoje/isMenor),
// etapa+profissional, todas as Solicitações (sc.projetos[], sem valorTotal),
// próximo agendamento (agEvents, só quando existir), financeiro (saldo
// devedor/crédito via saldoFinanceiroCliente, extraída do painel já
// existente na ficha completa, mesma matemática), e o novo layout de
// Contatos (WhatsApp/Instagram/SMS/E-mail compactos, alinhados à esquerda,
// separador + botão "Editar" isolado). SMS ganha um atalho sms: em celular
// (heurística ehCelular(), sem dependência externa) e uma orientação inline
// em desktop/tablet, sem Zenvia. E-mail ganha um compositor provisório
// (destinatário fixo, assunto/mensagem efêmeros) que só monta mailto: ao
// confirmar, sem Resend.
//
// Este arquivo SUBSTITUI integralmente a versão anterior (que testava só a
// base mínima) -- adaptado, não removido: todas as garantias da versão
// anterior (somente leitura, sem Histórico, sem escrita no banco, reuso de
// linkWhatsAppCliente/normalizarInstagram) continuam cobertas aqui, com
// âncoras atualizadas para a nova estrutura.
//
// Fora de escopo (não tocado, não testado aqui): Zenvia/Resend reais,
// motor de disparos do ink-system-plataform, projeto "Integrações",
// Histórico de comunicação real (fica para quando o envio for confirmado).
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
  const fim = srcCrm.indexOf("COMPOSITOR DE E-MAIL PROVISÓRIO", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "bloco do Resumo do Cliente não encontrado");
  return srcCrm.slice(inicio, fim);
}

function trechoComposerEmail() {
  const inicio = srcCrm.indexOf("COMPOSITOR DE E-MAIL PROVISÓRIO");
  const fim = srcCrm.indexOf("MODAL CLIENTE (ficha completa, modo Edição", inicio);
  assert.ok(inicio !== -1 && fim !== -1, "compositor de e-mail não encontrado");
  return srcCrm.slice(inicio, fim);
}

function trechoModalEdicao() {
  const inicio = srcCrm.indexOf("MODAL CLIENTE (ficha completa, modo Edição");
  assert.ok(inicio !== -1, "modal de edição não encontrado");
  return srcCrm.slice(inicio, inicio + 4000);
}

// ═══════════════════════════════════════════════════════════════════════════
// Estados novos
// ═══════════════════════════════════════════════════════════════════════════

test("novos estados efêmeros existem e nascem 'fechados'/vazios", () => {
  assert.match(srcCrm, /const \[smsAvisoAberto, setSmsAvisoAberto\] = useState\(false\);/);
  assert.match(srcCrm, /const \[emailComposerAberto, setEmailComposerAberto\] = useState\(false\);/);
  assert.match(srcCrm, /const \[emailComposerAssunto, setEmailComposerAssunto\] = useState\(""\);/);
  assert.match(srcCrm, /const \[emailComposerMensagem, setEmailComposerMensagem\] = useState\(""\);/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 1-4. Cabeçalho -- badges 🎂/👼, reuso literal dos helpers já existentes
// ═══════════════════════════════════════════════════════════════════════════

test("cabeçalho do Resumo reaproveita isMenor/isAniversHoje literalmente -- mesma expressão já usada no card do pipeline e na ficha completa, nenhuma regra nova", () => {
  const trecho = trechoResumo();
  assert.match(
    trecho,
    /<div className="mn">\{isMenor\(\(sc as any\)\.nascimento \|\| ""\) \? "👼 " : ""\}\{isAniversHoje\(\(sc as any\)\.nascimento \|\| ""\) \? "🎂 " : ""\}\{sc\.nome\}<\/div>/
  );
});

test("os dois badges podem coexistir -- são checagens independentes, uma não exclui a outra", () => {
  const trecho = trechoResumo();
  const idxMenor = trecho.indexOf('isMenor((sc as any).nascimento || "") ? "👼 " : ""');
  const idxAnivers = trecho.indexOf('isAniversHoje((sc as any).nascimento || "") ? "🎂 " : ""');
  assert.ok(idxMenor !== -1 && idxAnivers !== -1 && idxMenor < idxAnivers);
});

test("bolinhas de completude/sessão NÃO entram no Resumo -- ausência de background baseado em status concluido/futuro típico das bolinhas", () => {
  const trecho = trechoResumo();
  assert.doesNotMatch(trecho, /width: 8, height: 8, borderRadius: "50%"/);
  assert.doesNotMatch(trecho, /width: 10, height: 10, borderRadius: "50%"/);
});

test("linha secundária do cabeçalho mostra etapa (via stages.find) e profissional (via aName), sem gravar nada", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /\{stages\.find\(s => s\.id === sc\.etapa\)\?\.label \|\| sc\.etapa\}/);
  assert.match(trecho, /\{sc\.artista && aName\(sc\.artista\) \? " · " \+ aName\(sc\.artista\) : ""\}/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 5-8. Solicitações -- todas, sem valorTotal, sem "faixa de investimento"
// ═══════════════════════════════════════════════════════════════════════════

test("todas as Solicitações são exibidas via .map sobre sc.projetos, na ordem do array (sem .sort())", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /\{\(sc\.projetos \|\| \[\]\)\.map\(\(proj: any, i: number\) => \{/);
  assert.doesNotMatch(trecho.slice(trecho.indexOf("SOLICITAÇÕES"), trecho.indexOf("PRÓXIMO AGENDAMENTO")), /\.sort\(/);
});

test("cada card de Solicitação usa proj.estilo como identificação (com fallback), reaproveita artistaDoProjeto() já existente para o profissional, e nunca mostra valorTotal", () => {
  const trecho = trechoResumo();
  const inicioBloco = trecho.indexOf("SOLICITAÇÕES");
  // Pula o comentário de cabeçalho da seção, que MENCIONA "valorTotal" em
  // prosa (documentando que ele foi deliberadamente excluído) -- checar só
  // o código real depois do fechamento desse comentário.
  const inicioCodigo = trecho.indexOf("*/", inicioBloco) + 2;
  const blocoSolicitacoes = trecho.slice(inicioCodigo, trecho.indexOf("PRÓXIMO AGENDAMENTO"));
  assert.match(blocoSolicitacoes, /const nomeProj = proj\.estilo \|\| "\(sem título\)";/);
  assert.match(blocoSolicitacoes, /const artistaProjNome = aName\(artistaDoProjeto\(proj, sc\)\);/);
  assert.doesNotMatch(blocoSolicitacoes, /valorTotal/, "cards de Solicitação não podem exibir valorTotal");
  assert.doesNotMatch(blocoSolicitacoes, /faixa de investimento/i, "não deve existir 'faixa de investimento' -- campo não existe em projetos[]");
});

test("campos vazios (regiao/servico/artista) são omitidos via filter(Boolean), não preenchidos com 'não informado'", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /const linhaSecundaria = \[proj\.regiao, proj\.servico, artistaProjNome\]\.filter\(Boolean\)\.join\(" · "\);/);
  assert.match(trecho, /\{linhaSecundaria && <div/);
});

test("status do projeto é traduzido para rótulo humano (Ativa/Concluída/Cancelada), sem inventar novos valores de status", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /const statusLabel = proj\.status === "concluido" \? "Concluída" : proj\.status === "cancelado" \? "Cancelada" : "Ativa";/);
});

test("Solicitações não usam campos legados de nível do cliente (sc.desc/sc.regiao/sc.servico) como fonte -- só sc.projetos[]", () => {
  const trecho = trechoResumo();
  const blocoSolicitacoes = trecho.slice(trecho.indexOf("SOLICITAÇÕES"), trecho.indexOf("PRÓXIMO AGENDAMENTO"));
  assert.doesNotMatch(blocoSolicitacoes, /sc\.desc\b|sc\.regiao\b|sc\.servico\b/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 9-10. Próximo agendamento
// ═══════════════════════════════════════════════════════════════════════════

test("próximo agendamento filtra por cliente_id, exclui concluido/cancelado, usa comparação de data até 23:59 (regra mais precisa já em uso no arquivo), e ordena crescente antes de pegar o primeiro", () => {
  const trecho = trechoResumo();
  assert.match(
    trecho,
    /agEvents\s*\n\s*\.filter\(\(e: any\) => e\.cliente_id === sc\.id && e\.status !== "concluido" && e\.status !== "cancelado" && new Date\(e\.date \+ "T23:59:00"\) >= agora\)/
  );
  assert.match(trecho, /\.sort\(\(a: any, b: any\) => a\.date === b\.date \? \(Number\(a\.start\) \|\| 0\) - \(Number\(b\.start\) \|\| 0\) : \(a\.date < b\.date \? -1 : 1\)\);/);
  assert.match(trecho, /const prox = proximos\[0\];/);
});

test("seção de agendamento retorna null (não renderiza vazia) quando não há próximo evento", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /if \(!prox\) return null;/);
});

test("agendamento mostra data/hora/tipo(getEventLabel)/profissional(aName), sem nenhum controle de edição/criação de evento", () => {
  const trecho = trechoResumo();
  const blocoAgenda = trecho.slice(trecho.indexOf("PRÓXIMO AGENDAMENTO"), trecho.indexOf("FINANCEIRO"));
  assert.match(blocoAgenda, /getEventLabel\(prox\.tipo, artists\)/);
  assert.doesNotMatch(blocoAgenda, /<input\b|<select\b|onChange=/, "seção de agendamento não pode ter nenhum controle de edição");
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. Financeiro -- extração sem alterar a matemática
// ═══════════════════════════════════════════════════════════════════════════

test("saldoFinanceiroCliente() existe como função pura, com a MESMA fórmula que antes estava inline no painel da ficha completa", () => {
  assert.match(
    srcCrm,
    /function saldoFinanceiroCliente\(sc: any, fin: any\[\]\): \{ saldoDevedor: number; credito: number \} \{\s*\n\s*const credito = sc\.credito \|\| 0;\s*\n\s*const projs = \(sc\.projetos \|\| \[\]\)\.filter\(\(p: any\) => p\.status === "ativo"\);\s*\n\s*const saldoDevedor = projs\.reduce\(\(s: number, p: any\) => \{\s*\n\s*const pago = \(p\.pagamentos \|\| \[\]\)\.reduce\(\(ss: number, pg: any\) => ss \+ \(Number\(pg\.valor\) \|\| 0\), 0\);\s*\n\s*return s \+ Math\.max\(\(Number\(p\.valorTotal\) \|\| 0\) - pago, 0\);\s*\n\s*\}, 0\);\s*\n\s*return \{ saldoDevedor, credito \};\s*\n\s*\}/
  );
});

test("o painel Financeiro da ficha completa agora usa saldoFinanceiroCliente() em vez da conta inline duplicada -- prova de que a extração foi de fato aplicada, não só criada e ignorada", () => {
  assert.match(srcCrm, /const \{ saldoDevedor: totalDevedor, credito \} = saldoFinanceiroCliente\(sc, fin\);/);
  // a fórmula antiga (const totalDevedor = projs.reduce(...)) não pode mais existir solta no painel financeiro
  const inicioFinanceiro = srcCrm.indexOf("FINANCEIRO DO CLIENTE");
  const trechoFinanceiro = srcCrm.slice(inicioFinanceiro, inicioFinanceiro + 1500);
  assert.doesNotMatch(trechoFinanceiro, /const totalDevedor = projs\.reduce/);
});

test("Total Pago do painel da ficha completa permanece com seu próprio cálculo (pagCliente), intocado -- não fazia parte da extração pedida", () => {
  const inicioFinanceiro = srcCrm.indexOf("FINANCEIRO DO CLIENTE");
  const trechoFinanceiro = srcCrm.slice(inicioFinanceiro, inicioFinanceiro + 1500);
  assert.match(trechoFinanceiro, /const totalPago = pagCliente\.reduce\(\(s: number, f: any\) => s \+ \(Number\(f\.val_a\)\|\|0\), 0\);/);
});

test("Resumo usa saldoFinanceiroCliente(sc, fin), mostra Saldo devedor e Crédito como valores SEPARADOS (nunca subtraídos entre si), e omite a seção inteira quando ambos são <= 0", () => {
  const trecho = trechoResumo();
  const blocoFin = trecho.slice(trecho.indexOf("FINANCEIRO"), trecho.indexOf("CONTATOS"));
  assert.match(blocoFin, /const \{ saldoDevedor, credito \} = saldoFinanceiroCliente\(sc, fin\);/);
  assert.match(blocoFin, /if \(saldoDevedor <= 0 && credito <= 0\) return null;/);
  assert.doesNotMatch(blocoFin, /saldoDevedor\s*-\s*credito|credito\s*-\s*saldoDevedor/, "não pode calcular saldo líquido entre os dois");
  assert.match(blocoFin, /\{saldoDevedor > 0 && \(/);
  assert.match(blocoFin, /\{credito > 0 && \(/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 12-13. Layout de Contatos + separador + botão Editar isolado
// ═══════════════════════════════════════════════════════════════════════════

test("Contatos usam flexWrap, alinhados à esquerda (sem textAlign:center, sem width total de 4 botões grandes)", () => {
  const trecho = trechoResumo();
  const blocoContatos = trecho.slice(trecho.indexOf('<div className="stit">Contatos</div>'), trecho.indexOf("Editar"));
  assert.match(blocoContatos, /display: "flex", flexWrap: "wrap", gap: 8/);
  assert.doesNotMatch(blocoContatos, /width: "100%".*btn-sm/);
});

test("existe separador (borda superior) entre Contatos e o botão Editar, e o botão fica isolado, alinhado à direita, com o texto exato 'Editar'", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /borderTop: "1px solid var\(--br\)", marginTop: 18, paddingTop: 14, display: "flex", justifyContent: "flex-end"/);
  assert.match(trecho, /<button className="btn-sm gold" onClick=\{\(\) => setModoFicha\("edicao"\)\}>Editar<\/button>/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 9 (WhatsApp) e 10 (Instagram) -- comportamento homologado preservado
// ═══════════════════════════════════════════════════════════════════════════

test("WhatsApp continua usando linkWhatsAppCliente(), abrindo em nova aba, sem Zenvia", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /<a href=\{linkWhatsAppCliente\(\(sc as any\)\.tel\)\} target="_blank" rel="noopener noreferrer" style=\{pillAtiva\}>💬 WhatsApp<\/a>/);
});

test("Instagram continua usando normalizarInstagram() e a mesma derivação de URL já homologada, sem segunda normalização", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /const instaCanonico = normalizarInstagram\(\(sc as any\)\.insta \|\| ""\);/);
  assert.match(trecho, /href=\{`https:\/\/instagram\.com\/\$\{instaCanonico\.slice\(1\)\}`\}/);
});

// ═══════════════════════════════════════════════════════════════════════════
// 14. SMS -- ehCelular(), atalho sms:, orientação sem Zenvia
// ═══════════════════════════════════════════════════════════════════════════

test("ehCelular() é uma heurística de userAgent, sem dependência externa nova (nenhum import adicionado)", () => {
  assert.match(
    srcCrm,
    /function ehCelular\(\): boolean \{\s*\n\s*if \(typeof navigator === "undefined"\) return false;\s*\n\s*return \/iPhone\|Android\.\*Mobile\|Windows Phone\/i\.test\(navigator\.userAgent\);\s*\n\s*\}/
  );
  const inicioImports = srcCrm.indexOf("import");
  const fimImports = srcCrm.indexOf("const SUPA_URL");
  const blocoImports = srcCrm.slice(inicioImports, fimImports);
  assert.equal((blocoImports.match(/^import /gm) || []).length, 6, "nenhum import novo deveria ter sido adicionado para detectar dispositivo");
});

test("clique em SMS: celular -> sms: via window.location.href; senão -> alterna o aviso local (nunca chama /api/zenvia)", () => {
  const trecho = trechoResumo();
  assert.match(
    trecho,
    /onClick=\{\(\) => \{ if \(ehCelular\(\)\) \{ window\.location\.href = "sms:" \+ telDigits; \} else \{ setSmsAvisoAberto\(v => !v\); \} \}\}/
  );
  const blocoContatos = trecho.slice(trecho.indexOf('<div className="stit">Contatos</div>'));
  assert.doesNotMatch(blocoContatos, /api\/zenvia|zenviaApiKey|zenviaNumero/);
});

test("SMS sem telefone mostra fallback 'SMS não informado', igual ao padrão de WhatsApp/Instagram/E-mail", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /if \(telDigits\.length < 10\) return <span style=\{pillInativa\}>📩 SMS não informado<\/span>;/);
});

test("aviso de SMS é curto, não-técnico, dispensável, e não menciona Zenvia/API/backend", () => {
  const trecho = trechoResumo();
  assert.match(trecho, /Para enviar um SMS direto, acesse o INK SYSTEM pelo celular\. O envio de SMS pelo próprio sistema chega em breve\./);
  const blocoAviso = trecho.slice(trecho.indexOf("smsAvisoAberto &&"), trecho.indexOf("</div>\n                  )}"));
  assert.doesNotMatch(blocoAviso, /Zenvia|API|endpoint|backend/i);
});

// ═══════════════════════════════════════════════════════════════════════════
// 11 (E-mail) -- compositor provisório, sem Resend
// ═══════════════════════════════════════════════════════════════════════════

test("clique em E-mail (com e-mail cadastrado) abre o compositor com assunto/mensagem zerados -- nunca abre diretamente um mailto", () => {
  const trecho = trechoResumo();
  assert.match(
    trecho,
    /onClick=\{\(\) => \{ setEmailComposerAssunto\(""\); setEmailComposerMensagem\(""\); setEmailComposerAberto\(true\); \}\}/
  );
});

test("compositor: destinatário vem de sc.email e é somente leitura (sem input), assunto e mensagem são inputs efêmeros (useState local)", () => {
  const trecho = trechoComposerEmail();
  assert.match(trecho, /<div className="fil">Para<\/div>\s*\n\s*<div className="fiv">\{\(sc as any\)\.email\}<\/div>/);
  assert.match(trecho, /<input className="ef" value=\{emailComposerAssunto\} onChange=\{e => setEmailComposerAssunto\(e\.target\.value\)\}/);
  assert.match(trecho, /<textarea value=\{emailComposerMensagem\} onChange=\{e => setEmailComposerMensagem\(e\.target\.value\)\}/);
});

test("confirmar monta mailto: com destinatário/assunto/mensagem via encodeURIComponent -- nunca chama /api/resend nem usa resendApiKey", () => {
  const trecho = trechoComposerEmail();
  assert.match(
    trecho,
    /href=\{`mailto:\$\{\(\(sc as any\)\.email \|\| ""\)\.trim\(\)\.toLowerCase\(\)\}\?subject=\$\{encodeURIComponent\(emailComposerAssunto\)\}&body=\$\{encodeURIComponent\(emailComposerMensagem\)\}`\}/
  );
  // trechoComposerEmail() começa DENTRO do comentário explicativo de
  // cabeçalho (que MENCIONA "api/resend.js"/"resendApiKey" em prosa,
  // documentando o que NÃO fazer -- esperado). Pula até o fechamento desse
  // comentário ("*/") antes de checar uso funcional real.
  const semComentarioInicial = trecho.slice(trecho.indexOf("*/") + 2);
  assert.doesNotMatch(semComentarioInicial, /api\/resend|resendApiKey/);
});

test("compositor não altera clients/banco -- nenhum setClients/saveClientDb/upC/sb.from dentro do trecho inteiro", () => {
  const trecho = trechoComposerEmail();
  assert.doesNotMatch(trecho, /setClients\(|saveClientDb\(|upCFicha|upC\(|upCLocal|sb\.from\(/);
});

// ═══════════════════════════════════════════════════════════════════════════
// Provas transversais -- Histórico, banco, edição
// ═══════════════════════════════════════════════════════════════════════════

test("nenhuma referência a hist/historico/addLog em todo o Resumo + compositor de e-mail (nenhum contato gera Histórico)", () => {
  const trechoTotal = trechoResumo() + trechoComposerEmail();
  assert.doesNotMatch(trechoTotal, /\bhist\b/);
  assert.doesNotMatch(trechoTotal, /historico/);
  assert.doesNotMatch(trechoTotal, /addLog\(/);
});

test("nenhuma escrita no banco em todo o Resumo + compositor (setClients/saveClientDb/upC/sb.from ausentes)", () => {
  const trechoTotal = trechoResumo() + trechoComposerEmail();
  assert.doesNotMatch(trechoTotal, /setClients\(|saveClientDb\(|upCFicha|upC\(|upCLocal|sb\.from\(/);
});

test("Resumo continua sem <select> nenhum; os únicos <input>/<textarea> pertencem ao compositor de e-mail (assunto/mensagem), não a edição de dados do cliente", () => {
  const trechoResumoPuro = trechoResumo();
  assert.doesNotMatch(trechoResumoPuro, /<input\b|<textarea\b|<select\b/, "o corpo do Resumo em si (fora do compositor) não pode ter nenhum campo editável");
  const composer = trechoComposerEmail();
  const qtdInputs = (composer.match(/<input\b/g) || []).length;
  const qtdTextareas = (composer.match(/<textarea\b/g) || []).length;
  assert.equal(qtdInputs, 1, "compositor deve ter exatamente 1 <input> (assunto)");
  assert.equal(qtdTextareas, 1, "compositor deve ter exatamente 1 <textarea> (mensagem)");
});

test("botão Editar continua levando ao modo 'edicao' -- a ficha completa em si permanece intocada", () => {
  const trechoModal = trechoModalEdicao();
  assert.match(trechoModal, /\{sc && modoFicha === "edicao" && \(/);
  assert.match(trechoModal, /TABS DA FICHA/);
});

test("fichaDraft/salvarFichaAlteracoes/descartarFichaAlteracoes permanecem byte-idênticos -- o Refinamento do Resumo não tocou o mecanismo do 3.4A", () => {
  assert.match(
    srcCrm,
    /const descartarFichaAlteracoes = \(\) => \{\s*\n\s*setFichaDraft\(null\);\s*\n\s*setNascDraft\(\{ dia: "", mes: "", ano: "" \}\);\s*\n\s*setFichaEditada\(false\);\s*\n\s*\};/
  );
  assert.match(srcCrm, /const salvarFichaAlteracoes = async \(clienteAtual: any\) => \{/);
});

test("nenhuma referência FUNCIONAL a Zenvia/Resend/motor de disparos em todo o Resumo + compositor -- arquitetura comercial futura não foi antecipada (comentário explicativo do compositor menciona o que NÃO fazer, em prosa, e é pulado aqui)", () => {
  const composer = trechoComposerEmail();
  const composerSemComentarioInicial = composer.slice(composer.indexOf("*/") + 2);
  const trechoTotal = trechoResumo() + composerSemComentarioInicial;
  assert.doesNotMatch(trechoTotal, /Zenvia|Resend|ink-system-plataform/i);
});
