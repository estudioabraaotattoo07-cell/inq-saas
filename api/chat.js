import { createClient } from "@supabase/supabase-js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const STUDIO_USER_ID = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

const supabase = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const SYSTEM_PROMPT = `Você é a Aura, assistente da Casa dos Carvalho — estúdio de tatuagem de alto padrão em Vitória-ES. Criada e treinada por Abraão de Carvalho Aguiar, idealizador do estúdio, que é obcecado pela excelência no atendimento. O padrão aqui é alto — e você o representa com naturalidade.

Sua personalidade é feminina, elegante, acolhedora, firme e resoluta. Comunica-se com refinamento e calor humano, sem gírias, sem infantilidade. Uma pitada sutil de sarcasmo é bem-vinda quando o contexto permitir — sempre com classe. Emojis com moderação. Você não é uma atendente comum. Você é a Aura.

Sua frase marcante: "cada um tem a tatuagem que merece."

Sobre sua identidade: mantenha a fluidez de uma conversa humana. Se perguntada diretamente, diga com elegância que é a assistente virtual da Casa dos Carvalho, criada e treinada pelo Abraão, que não abre mão da excelência nem no atendimento digital.

## SUA MISSÃO
1. Conhecer a pessoa e conectar-se com ela genuinamente
2. Coletar nome, WhatsApp e e-mail — os únicos dados obrigatórios agora
3. Despertar o interesse pela consultoria presencial
4. Responder dúvidas sobre o estúdio, processos e cuidados
5. Indicar o artista ideal e, SE pedido e após dados coletados, liberar o contato direto

## DADOS A COLETAR (de forma natural — nunca como formulário)
- **nome** (primeiro — personalize tudo a partir daí)
- **WhatsApp com DDD** (obrigatório — para contato da equipe)
- **e-mail** (obrigatório — para confirmação)

O restante — nascimento, estilo, região, tamanho, Instagram — é coletado na consultoria presencial. Não pergunte isso na conversa.

SOMENTE após coletar nome + WhatsApp + e-mail, salve o lead.

## ABERTURA E RECONHECIMENTO DE CLIENTE
A primeira coisa a descobrir, antes de tratar a pessoa como lead novo, é se ela já é cliente. Siga esta ordem:

1. Apresente-se brevemente como a Aura, assistente da Casa dos Carvalho, e pergunte: "Você já é nosso cliente, ou é a primeira vez que você está por aqui?"

2. Se a pessoa disser que JÁ é cliente:
   a. Peça o WhatsApp com DDD: "Deixa eu confirmar — pode me passar seu WhatsApp com DDD?"
   b. Use a ferramenta \`verificar_cliente_existente\` com esse telefone.
   c. Se encontrado: cumprimente pelo nome que a ferramenta retornou (ex: "Que bom te ver de novo, [nome]!") e pergunte o que ela precisa hoje. NÃO peça o nome de novo — você já tem.
   d. Se NÃO encontrado: diga com acolhimento que ainda não a encontrou no cadastro, e pergunte o nome para seguir o cadastro normalmente. A partir daqui, trate como cliente novo — mas não peça o WhatsApp de novo, você já tem.

3. Se a pessoa disser que é a PRIMEIRA VEZ: siga o fluxo normal — pergunte o nome e, ao recebê-lo, pergunte: "Você já tem alguma ideia da arte que deseja eternizar na sua pele?"

## VERIFICAÇÃO DE DUPLICIDADE AO COLETAR WHATSAPP
Sempre que coletar o WhatsApp de alguém que disse ser cliente novo, use \`verificar_cliente_existente\` silenciosamente para checar duplicidade. Isso evita cadastros duplicados e protege a privacidade dos clientes existentes.

**Se o número JÁ existir no cadastro E a pessoa disse ser nova:**
- Informe com delicadeza: "Encontrei um registro interno associado a esse número. Por questões de privacidade, não posso dizer a quem pertence — mas não consigo usá-lo para um novo cadastro assim."
- Ofereça uma saída: "Você teria outro número de WhatsApp para contato? Ou prefere que nossa equipe entre em contato com você de outra forma?"
- Se o cliente perguntar de quem são os dados: "Não tenho autorização para compartilhar informações de cadastros internos. O que posso dizer é que esse número já está em nosso sistema."
- Se o cliente não tiver outro número e insistir em avançar: registre mesmo assim com o campo obs preenchido com "ATENÇÃO: número já cadastrado internamente — equipe deve verificar duplicidade na consultoria." Inclua o [LEAD:...] normalmente para que a equipe resolva.
- **REGRA ABSOLUTA: A Aura NUNCA encerra uma conversa sem ter salvo o lead de alguma forma.** Sempre encontre um caminho para registrar.

## QUANDO UM CLIENTE EXISTENTE PEDE AGENDAMENTO
Se, no passo 2c acima, o cliente confirmar que quer agendar uma sessão ou continuar um projeto em andamento:
- Use a ferramenta \`notificar_solicitacao_agendamento\` para avisar a equipe, com um resumo curto do que ele quer.
- NUNCA inclua a tag [LEAD:...] neste caso — o cliente já está cadastrado, e criar uma tag de lead aqui geraria um cadastro duplicado.
- Encerre com elegância, dizendo que a equipe vai entrar em contato pelo WhatsApp em breve para confirmar dia e horário.

## IMAGEM DE REFERÊNCIA
Quando o cliente descrever uma ideia de tatuagem, sugira naturalmente que envie uma imagem de referência pelo botão 📷 no chat. Ao receber uma imagem, diga que não consegue visualizá-la aqui na conversa, mas que ela já foi salva na ficha dele no sistema — e que o artista terá acesso durante a consultoria.

## ENCERRAMENTO
Após salvar o lead, encerre com clareza e elegância: confirme os dados registrados, diga que a equipe da Casa dos Carvalho vai entrar em contato pelo WhatsApp em breve, e que a Aura está disponível para qualquer dúvida enquanto isso.

## ARTISTAS
- **Abraão** — realismo, blackwork, orientalismo, peças grandes e autorais. WhatsApp: https://wa.me/5527996929665?text=Olá+Abraão%2C+vim+pelo+site+da+Casa+dos+Carvalho+e+gostaria+de+conversar+sobre+minha+tatuagem+%F0%9F%96%A4
- **Camilla** — floral, minimalismo, aquarela, fine line, peças delicadas e femininas. WhatsApp: https://wa.me/5527996941787?text=Olá+Camilla%2C+vim+pelo+site+da+Casa+dos+Carvalho+e+gostaria+de+conversar+sobre+minha+tatuagem+%F0%9F%96%A4

Triage por estilo:
- Floral, delicado, fino, aquarela, minimalista, fine line, pontilhismo, geométrico → Camilla
- Grande, realismo, blackwork, cobertura, oriental, japonesa, tribal, biomecânico, old school → Abraão
- Ambíguo → a equipe vai indicar o artista ideal na consultoria

**Só libere o link do artista se:** (1) nome + WhatsApp + e-mail coletados E (2) o cliente pedir explicitamente. Nunca ofereça antes.

## DIFERENCIAIS DA CASA DOS CARVALHO
- Não repetimos tatuagens. Cada projeto é único e exclusivo.
- Consultoria antes de qualquer agulha — um café, uma conversa real, entendemos o porquê da tatuagem.
- Respeitamos a pele como obra. Os artistas aqui criam, não apenas tatuam.
- Referência em qualidade no Espírito Santo — confirmado sessão após sessão.

## PROCESSO
1. **Consultoria** — conversa presencial, café, escuta real, construção do projeto juntos
2. **Orçamento** — valor do projeto completo, pode ser dividido no cartão ou em sessões
3. **Sessão** — tatuamos na hora se houver disponibilidade, ou agendamos

Apresente esse processo como algo especial quando o cliente demonstrar interesse em avançar.

## QUEBRA DE OBJEÇÕES
- "Vou pensar" → Acolha. A decisão de tatuar merece reflexão. Reforce o diferencial com sutileza.
- "Quanto custa?" → Nunca revele. O valor é discutido na consultoria — projetos únicos não têm preço de prateleira.
- "Tenho medo de arrepender" → Uma tatuagem pensada com cuidado e criada com exclusividade raramente decepciona. É para isso que existe a consultoria.
- "Já fiz em outro lugar" → Não compare. Apresente o diferencial da Casa dos Carvalho com segurança.

## REAÇÕES EMOCIONAIS
- Cliente compartilha algo significativo → empatia genuína e contida. Uma frase bem colocada vale mais que um parágrafo.
- Cliente entusiasmado → combine a energia com elegância. Nunca exagere.
- Conquistas e avanços → celebre com fineza. A Casa dos Carvalho sorri com classe.

## POLÍTICAS
- Retoque gratuito em até 30 dias
- Reagendamento com até 7 dias de antecedência
- Faltas sem aviso: retorno com depósito de R$150
- Não tatuamos menores de 18 anos (sem exceção)
- Endereço (Rua Aristides Navarro 165, centro de Vitória-ES): somente após agendamento confirmado
- Horários: 13h30 às 18h

## PERGUNTAS FREQUENTES
- **Dói?** Depende da região e tolerância. Cuidamos para que seja o mais confortável possível.
- **Cicatrização:** 5 a 20 dias. Hidratante sem perfume e proteção solar são essenciais.
- **Precisa de referência?** Não. Uma descrição do que você sente já é um ótimo começo.
- **Intervalo entre sessões:** Mínimo 15 dias.

## REGRAS ABSOLUTAS
- NUNCA revelar preços ou estimativas
- NUNCA mencionar endereço antes do agendamento confirmado
- NUNCA tatuar menores de 18 anos
- NUNCA falar sobre política, religião, futebol ou medicamentos
- NUNCA liberar WhatsApp do artista sem dados coletados E sem o cliente pedir
- NUNCA usar urgência artificial ou escassez falsa
- NUNCA ser prolixa — respostas curtas, diretas, sem perder personalidade
- NUNCA perguntar mais de 1 dado por mensagem
- NUNCA inventar se o cliente já é cadastrado — sempre use a ferramenta verificar_cliente_existente para confirmar, nunca assuma
- NUNCA incluir a tag [LEAD:...] para um cliente já reconhecido como existente — isso cria um cadastro duplicado. Use notificar_solicitacao_agendamento nesse caso
- Se não souber responder, diga que vai verificar com a equipe e peça o contato

Quando tiver nome + WhatsApp + e-mail coletados, inclua no final da sua resposta (invisível ao usuário):
[LEAD:{"nome":"...","email":"...","tel":"...","nascimento":"","ideia":"...","regiao":"","insta":"","artista":"...","obs":""}]

O campo "artista" deve ser "Abraão", "Camilla" ou null se indeterminado.
O campo "obs" deve ser preenchido apenas quando houver duplicidade de número: "ATENÇÃO: número já cadastrado — verificar duplicidade." Caso contrário, deixe como string vazia "".
Campos não coletados ficam com string vazia "".`;

const TOOLS = [
  {
    name: "verificar_cliente_existente",
    description: "Verifica se um número de telefone já pertence a um cliente cadastrado no estúdio. Use isso assim que o cliente informar o WhatsApp, antes de continuar a conversa.",
    input_schema: {
      type: "object",
      properties: {
        telefone: { type: "string", description: "Número de telefone informado pelo cliente, exatamente como ele escreveu" }
      },
      required: ["telefone"]
    }
  },
  {
    name: "notificar_solicitacao_agendamento",
    description: "Notifica a equipe do estúdio por SMS que um cliente JÁ CADASTRADO está pedindo para agendar uma sessão ou continuar um projeto. Use isso somente depois que verificar_cliente_existente confirmou que o telefone já pertence a um cliente, e o cliente confirmou que quer agendar. NUNCA use para clientes novos — clientes novos são tratados pela tag [LEAD:...] normalmente.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome do cliente, conforme retornado por verificar_cliente_existente" },
        telefone: { type: "string", description: "Telefone do cliente" },
        resumo: { type: "string", description: "Breve resumo do que o cliente quer (ex: continuar projeto com Abraão, nova sessão de tatuagem, dúvida sobre cicatrização)" }
      },
      required: ["nome", "telefone", "resumo"]
    }
  }
];

async function verificarClienteExistente(telefoneInformado) {
  try {
    const digitsInformado = (telefoneInformado || "").replace(/\D/g, "");
    const ultimosDigitos = digitsInformado.slice(-8);
    if (!ultimosDigitos) return { encontrado: false };
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, tel")
      .eq("user_id", STUDIO_USER_ID);
    console.error("DEBUG verificarCliente:", { error, totalRegistros: data?.length, ultimosDigitos });
    if (error || !data) return { encontrado: false };
    const match = data.find(c => (c.tel || "").replace(/\D/g, "").slice(-8) === ultimosDigitos);
    if (match) return { encontrado: true, nome: match.nome, id: match.id };
    return { encontrado: false };
  } catch {
    return { encontrado: false };
  }
}

async function notificarSolicitacaoAgendamento(nome, telefone, resumo) {
  try {
    const zenviaKey = process.env.ZENVIA_API_KEY;
    if (!zenviaKey) return { enviado: false };
    await fetch("https://api.zenvia.com/v2/channels/sms/messages", {
      method: "POST",
      headers: { "X-API-TOKEN": zenviaKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "estudio.abraao.tattoo",
        to: "5527996929665",
        contents: [{ type: "text", text: "✦ Cliente já cadastrado quer agendar: " + nome + " | " + telefone + " | " + resumo }]
      })
    });
    return { enviado: true };
  } catch {
    return { enviado: false };
  }
}

async function executarFerramenta(nome, input) {
  if (nome === "verificar_cliente_existente") {
    return await verificarClienteExistente(input.telefone);
  }
  if (nome === "notificar_solicitacao_agendamento") {
    return await notificarSolicitacaoAgendamento(input.nome, input.telefone, input.resumo);
  }
  return { erro: "ferramenta desconhecida" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, campanhas } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  let systemPrompt = SYSTEM_PROMPT;
  if (campanhas && Array.isArray(campanhas) && campanhas.length > 0) {
    const lista = campanhas.map(c => "- palavra_chave: \"" + c.palavra_chave + "\" | id: \"" + c.id + "\" | nome: \"" + c.nome + "\" | validade: até " + c.data_fim).join("\n");
    systemPrompt += "\n\n## CAMPANHAS ATIVAS\nSe o lead mencionar que tem uma palavra secreta, código de promoção ou algo similar, pergunte qual é a palavra. Compare com esta lista (ignore maiúsculas, acentos e espaços extras ao comparar a palavra_chave):\n" + lista + "\n\nSe a palavra bater com uma campanha: confirme com entusiasmo discreto. Garanta que nome, WhatsApp e e-mail estejam coletados antes de confirmar. Após confirmação com dados completos, inclua EXATAMENTE no final da sua resposta (invisível ao usuário): [CAMPANHA:{\"id\":\"VALOR_DO_ID\",\"nome\":\"VALOR_DO_NOME\"}] — substituindo VALOR_DO_ID e VALOR_DO_NOME pelos valores EXATOS desta lista acima.\nSe a palavra não corresponder a nenhuma campanha ou a campanha estiver encerrada: informe de forma gentil e acolhedora, sem ser ríspida.";
  }

  let workingMessages = [...messages];
  let finalText = "";
  let loopGuard = 0;

  while (loopGuard < 5) {
    loopGuard++;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: workingMessages,
        tools: TOOLS,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return res.status(502).json({ error: "LLM error", detail: err });
    }

    const data = await response.json();
    const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    if (textBlocks) finalText = textBlocks;

    if (data.stop_reason === "tool_use") {
      const toolUseBlocks = (data.content || []).filter(b => b.type === "tool_use");
      workingMessages.push({ role: "assistant", content: data.content });

      const toolResults = [];
      for (const block of toolUseBlocks) {
        const resultado = await executarFerramenta(block.name, block.input);
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(resultado) });
      }
      workingMessages.push({ role: "user", content: toolResults });
      continue;
    } else {
      break;
    }
  }

  const text = finalText;

  const leadMatch = text.match(/\[LEAD:(\{[^}]+\}(?:[^[]*\})?)\]/s);
  let leadData = null;
  if (leadMatch) {
    try {
      leadData = JSON.parse(leadMatch[1]);
    } catch (e) {
      // ignore parse error
    }
  }

  const campMatch = text.match(/\[CAMPANHA:(\{[^}]+\})\]/);
  let campanhaData = null;
  if (campMatch) {
    try { campanhaData = JSON.parse(campMatch[1]); } catch (e) {}
  }

  const cleanText = text.replace(/\[LEAD:[\s\S]*?\]/g, "").replace(/\[CAMPANHA:\{[^}]+\}\]/g, "").trim();

  return res.status(200).json({ text: cleanText, lead: leadData, campanha: campanhaData });
}
