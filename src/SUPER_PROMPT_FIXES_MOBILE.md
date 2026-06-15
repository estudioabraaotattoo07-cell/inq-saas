# SUPER PROMPT — INK SYSTEM CRM
## Tarefa: Fix Alertas Mobile + Pipeline Horizontal + Serviço no Projeto

---

## CONTEXTO

- Arquivo: `CRM Casa dos Carvalho.tsx` (~8.773 linhas)
- Stack: React/TSX arquivo único, Vite, Vercel, Supabase
- NÃO subir no GitHub — entregar arquivo para revisão

---

## PARTE 1 — FIX ALERTAS MOBILE: MODAL CENTRALIZADO EM TELAS PEQUENAS

### Problema
No mobile o modal de alertas é posicionado baseado na posição do botão (`alertPos`), mas em telas pequenas isso coloca o modal fora da área visível à esquerda.

### Localizar (linha ~3038):
```tsx
const rect = alertBtnRef.current?.getBoundingClientRect();
if (rect) setAlertPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
setShowAlerts(v => !v);
```

### Substituir por:
```tsx
const rect = alertBtnRef.current?.getBoundingClientRect();
if (rect) {
  const isMobile = window.innerWidth < 600;
  if (isMobile) {
    setAlertPos({ top: rect.bottom + 8, right: 8 });
  } else {
    setAlertPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
  }
}
setShowAlerts(v => !v);
```

### E no modal (linha ~3056), substituir o style por:
```tsx
<div onClick={e => e.stopPropagation()} style={{
  position: "fixed",
  top: alertPos.top,
  right: alertPos.right,
  left: window.innerWidth < 600 ? 8 : "auto",
  zIndex: 2147483647,
  width: window.innerWidth < 600 ? "calc(100vw - 16px)" : "min(380px, calc(100vw - 16px))",
  maxWidth: "calc(100vw - 16px)",
  background: "var(--dk2)",
  border: "1px solid var(--br)",
  borderRadius: 10,
  boxShadow: "0 8px 32px rgba(0,0,0,.5)",
  maxHeight: "min(80vh, calc(100dvh - 80px))",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column"
}}>
```

**Atenção:** `window.innerWidth` dentro do JSX pode causar problemas de hidratação. Usar uma variável intermediária antes do return:

```typescript
const isMobileView = typeof window !== "undefined" && window.innerWidth < 600;
```

E usar `isMobileView` no JSX em vez de `window.innerWidth < 600` diretamente.

---

## PARTE 2 — PIPELINE MAIS COMPACTO HORIZONTALMENTE NO MOBILE

### Problema
No mobile, as colunas do pipeline aparecem empilhadas verticalmente em vez de lado a lado com scroll horizontal. Precisa reduzir mais a largura das colunas e garantir scroll horizontal suave.

### Localizar na string S (linha ~139):
```
.kc{min-width:195px;max-width:195px;display:flex;flex-direction:column;gap:5px;}
```

### Substituir por:
```
.kc{min-width:175px;max-width:175px;display:flex;flex-direction:column;gap:5px;}
@media(max-width:600px){.kc{min-width:155px;max-width:155px;}.kw{padding:8px 6px;gap:7px;}}
```

### E o padding do kw:
Localizar:
```
.kw{flex:1;overflow-x:auto;padding:14px;display:flex;gap:11px;
```

Substituir por:
```
.kw{flex:1;overflow-x:auto;padding:12px;display:flex;gap:9px;
```

---

## PARTE 3 — CAMPO SERVIÇO VISÍVEL NO FORMULÁRIO DE NOVO PROJETO

### Problema
O campo "Serviço" existe no código (linha ~5435) mas o formulário não mostra o campo "Estilo/Tipo" que é o título do projeto. O formulário está faltando o campo de nome/estilo do projeto, que é o identificador principal.

### Localizar o início do formulário de Nova Solicitação (linha ~5426):
```tsx
<div style={{ background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 8, padding: "14px", marginBottom: 10, display: "flex", flexDirection: "column", gap: 10 }}>
  <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Nova Solicitação</div>
  <div className="fi2">
    <div className="fil">Valor Total do Projeto (R$)</div>
```

### Substituir por (adicionando campo de nome/identificação antes do valor):
```tsx
<div style={{ background: "var(--dk3)", border: "1px solid var(--gold)", borderRadius: 8, padding: "14px", marginBottom: 10, display: "flex", flexDirection: "column", gap: 10 }}>
  <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>Nova Solicitação</div>
  <div className="fi2">
    <div className="fil">Nome / Identificação do Projeto *</div>
    <input className="ef" placeholder="Ex: Tatuagem no braço, Limpeza de pele, Implante..." value={novoProjetoForm.estilo}
      onChange={e => setNovoProjetoForm(p => ({ ...p, estilo: e.target.value }))} />
  </div>
  <div className="fi2">
    <div className="fil">Serviço</div>
    <select className="ef" value={novoProjetoForm.servico || ""} onChange={e => setNovoProjetoForm({ ...novoProjetoForm, servico: e.target.value })}>
      <option value="">Selecione o serviço...</option>
      {servicoOpts.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
    </select>
  </div>
  <div className="fi2">
    <div className="fil">Valor Total do Projeto (R$)</div>
```

### E adicionar validação antes de salvar (localizar o onClick do botão "Salvar Projeto", linha ~5447):

Substituir:
```tsx
<button onClick={() => {
  const val = parseFloat(novoProjetoForm.valorTotal.replace(/\./g,"").replace(",",".")) || 0;
  const proj = { id: Date.now(), estilo: novoProjetoForm.estilo, tam: novoProjetoForm.tam, primeira: novoProjetoForm.primeira, desc: novoProjetoForm.desc, servico: (novoProjetoForm as any).servico || "", valorTotal: val, status: "ativo", criadoEm: new Date().toLocaleDateString("pt-BR"), pagamentos: [] };
```

Por:
```tsx
<button onClick={() => {
  if (!novoProjetoForm.estilo.trim()) {
    setShowAviso("Preencha o nome/identificação do projeto.");
    return;
  }
  const val = parseFloat(novoProjetoForm.valorTotal.replace(/\./g,"").replace(",",".")) || 0;
  const proj = { id: Date.now(), estilo: novoProjetoForm.estilo, tam: novoProjetoForm.tam, primeira: novoProjetoForm.primeira, desc: novoProjetoForm.desc, servico: (novoProjetoForm as any).servico || "", valorTotal: val, status: "ativo", criadoEm: new Date().toLocaleDateString("pt-BR"), pagamentos: [] };
```

### Limpar o form ao fechar (botão Descartar, linha ~5446):

Substituir:
```tsx
<button onClick={() => { setNovoProjetoAberto(null); }}
```

Por:
```tsx
<button onClick={() => { setNovoProjetoAberto(null); setNovoProjetoForm({ estilo: "", tam: "Medio", primeira: false, desc: "", valorTotal: "", servico: "" }); }}
```

---

## PARTE 4 — MOVER PIPELINE PARA SESSÃO ABRE MODAL DE AGENDAMENTO

### Situação atual
Ao mover para `sessao_agend`, se não há eventos, já abre o `showAgForm` (linha 1479-1488). Isso está correto.

### O problema relatado
O usuário disse que ao mudar o pipeline na ficha do cliente, não foi para a agenda. Isso acontece porque na **ficha do cliente** (modal lateral), os botões de pipeline usam um fluxo diferente do pipeline principal.

### Localizar na ficha do cliente os botões de mudança de etapa (linha ~5820):
```tsx
const critica = ["cons_agendada","sessao_agend","tatuado"].includes(s.id);
```

Verificar o bloco que executa a mudança de etapa na ficha do cliente e garantir que quando `s.id === "sessao_agend"` e não há eventos agendados, o modal de agendamento é aberto corretamente.

Localizar (linha ~5828):
```tsx
setConfirmMover({ cid: sc.id, stage: s, agEvents: evs });
```

Verificar se existe lógica que após `confirmMover` ser confirmado, para `sessao_agend` sem eventos, abre o `showAgForm`. Se não existir, adicionar após o `executarMove` no handler do `confirmMover`:

```typescript
// Após executarMove no confirmMover handler
if (confirmMover.stage.id === "sessao_agend" && confirmMover.agEvents.length === 0) {
  const cli = clients.find(c => c.id === confirmMover.cid);
  setTimeout(() => {
    setEditingEvent(null);
    setAgClientVinc(cli || null);
    setAgClientSearch("");
    setSessoesExtras([]);
    const artistaId = cli?.artista || artists[0]?.id || "";
    setAgForm({
      title: cli?.nome || "",
      desc: "",
      tipo: "sess_" + artistaId,
      date: new Date().toISOString().split("T")[0],
      start: 9,
      end: 11,
      sinal: "",
      sinalPago: false
    } as any);
    setShowAgForm(true);
  }, 300);
}
```

---

## REGRAS CRÍTICAS (SEMPRE OBSERVAR)

1. **NUNCA** usar `/\D/g` em JSX → sempre `/[^0-9]/g`
2. **NUNCA** divisão após `)` em JSX → variável intermediária
3. **NUNCA** ternários aninhados em template literals → concatenação `+`
4. **NÃO modularizar** — arquivo único intencional
5. Hooks sempre importados diretamente (`useState`, não `React.useState`)
6. Nome do arquivo: `CRM Casa dos Carvalho.tsx` (espaços, nunca underscore)
7. `window.innerWidth` em JSX → usar variável intermediária antes do return
8. **NÃO subir no GitHub** — entregar para revisão primeiro

---

## ENTREGA ESPERADA

1 arquivo: `CRM Casa dos Carvalho.tsx` com todas as alterações acima.

Após as correções, rodar:
```
npx tsc --noEmit --jsx react --target es2020 --module esnext --moduleResolution bundler --strict false
```
Confirmar zero erros antes de entregar.
