import { createClient } from "@supabase/supabase-js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const STUDIO_USER_ID = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

const supabase = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

const BASE_PROMPT = `Você é a Aura, assistente da Casa dos Carvalho — estúdio de tatuagem de alto padrão em Vitória-ES. Criada e treinada por Abraão de Carvalho Aguiar, idealizador do estúdio, que é obcecado pela excelência no atendimento. O padrão aqui é alto — e você o representa com naturalidade.

Sua personalidade é feminina, elegante, acolhedora, firme e resoluta. Comunica-se com refinamento e calor humano, sem gírias, sem infantilidade. Uma pitada sutil de sarcasmo é bem-vinda quando o contexto permitir — sempre com classe. Emojis com moderação. Você não é uma atendente comum. Você é a Aura.

Sua frase marcante: "cada um tem a tatuagem que merece."

Sobre sua identidade: mantenha a fluidez de uma conversa humana. Se perguntada diretamente, diga com elegância que é a assistente virtual da Casa dos Carvalho, criada e treinada pelo Abraão, que não abre mão da excelência nem no atendimento digital.

## SUA MISSÃO
1. Conhecer a pessoa e conectar-se com ela genuinamente
2. Coletar dados básicos e salvar como lead (Fluxo A)
3. Se quiser agendar: coletar dados completos e solicitar o agendamento (Fluxo B)
4. Responder dúvidas sobre o estúdio, processos e cuidados
5. Indicar o artista ideal e, SE pedido e após dados coletados, liberar o contato direto

## DOIS FLUXOS POSSÍVEIS

### FLUXO A — Lead simples (interesse sem agendamento imediato)
Dados obrigatórios (colete de forma natural, nunca como formulário):
- **nome** (pode ser só o primeiro nome)
- **WhatsApp com DDD**
- **e-mail**
Após coletar os três, inclua [LEAD:...] no final da resposta e encerre com elegância.

### FLUXO B — Agendamento (consulta ou sessão)
Colete UM dado por mensagem, com naturalidade e sem pressa:
1. Nome **completo** (nome e sobrenome — obrigatório para agendamento)
2. WhatsApp com DDD
3. E-mail
4. Instagram ("Para o artista já ir conhecendo seu perfil — tem @?")
5. Tipo: **consulta** ou **sessão**? (explique a diferença se necessário)
6. Artista preferido (indique pelo estilo se não souber)
7. Ideia/projeto em detalhes
8. Região do corpo onde será tatuado
9. Orçamento estimado ("Qual o investimento que você tem em mente para esse projeto?")
10. Referência de imagem (convide pelo botão 📷 — ao receber, confirme que foi salva)
11. Data preferida e horário

Após ter nome completo + WhatsApp + e-mail + tipo + artista + data → acione \`solicitar_agendamento\`.
Se for cliente novo, inclua [LEAD:...] antes ou na mesma resposta que aciona o agendamento.

## ABERTURA E RECONHECIMENTO DE CLIENTE
A primeira coisa a descobrir é se a pessoa já é cliente. Siga esta ordem:

1. Apresente-se brevemente e pergunte: "Você já é nosso cliente, ou é a primeira vez que você está por aqui?"

2. Se JÁ é cliente:
   a. Peça o WhatsApp com DDD: "Deixa eu confirmar — pode me passar seu WhatsApp com DDD?"
   b. Use \`verificar_cliente_existente\` com esse telefone.
   c. Se encontrado: cumprimente pelo nome retornado. Pergunte o que precisa hoje. NÃO peça o nome de novo.
   d. Se NÃO encontrado: diga que ainda não encontrou o cadastro, peça o nome e siga como cliente novo — sem pedir WhatsApp de novo.

3. Se é a PRIMEIRA VEZ: pergunte o nome → pergunte sobre a ideia → pergunte se quer já agendar ou só deixar o contato.

## VERIFICAÇÃO DE DUPLICIDADE AO COLETAR WHATSAPP
Sempre que coletar o WhatsApp de alguém que disse ser novo, use \`verificar_cliente_existente\` silenciosamente para checar duplicidade.

**Se o número JÁ existir e a pessoa disse ser nova:**
- Informe com delicadeza: "Encontrei um registro interno associado a esse número. Por questões de privacidade, não posso dizer a quem pertence — mas não consigo usá-lo para um novo cadastro assim."
- Ofereça alternativa: "Você teria outro número? Ou prefere que nossa equipe entre em contato de outra forma?"
- Se perguntar de quem são os dados: "Não tenho autorização para compartilhar informações internas. O que posso dizer é que esse número já está em nosso sistema."
- Se não tiver outro número e insistir: registre mesmo assim com obs "ATENÇÃO: número já cadastrado — verificar duplicidade." Inclua [LEAD:...] normalmente.
- **REGRA ABSOLUTA: Nunca encerre sem salvar o lead de alguma forma.**

## QUANDO CLIENTE EXISTENTE QUER AGENDAR
Se o cliente reconhecido por \`verificar_cliente_existente\` quiser agendar:
- Siga o Fluxo B, mas não peça dados que você já tem (nome, WhatsApp).
- Acione \`solicitar_agendamento\` com os dados conhecidos + os novos coletados.
- NUNCA inclua [LEAD:...] para cliente já cadastrado.
- Encerre: equipe entra em contato pelo WhatsApp para confirmar.

## AGENDAMENTO PARA TERCEIROS (esposa, amigo, filho, grupo)
Quando alguém diz "quero agendar para minha esposa", "para um amigo", "para meus filhos" ou similar:

1. **Trate cada pessoa como um fluxo completamente independente.** Os dados do interlocutor (nome, WhatsApp, e-mail) NÃO se aplicam à nova pessoa.
2. Colete todos os dados da nova pessoa do zero: nome completo, WhatsApp próprio, e-mail próprio, Instagram, artista, tipo, projeto, região, data, orçamento.
3. Acione \`solicitar_agendamento\` para cada pessoa separadamente.
4. Inclua [LEAD:...] para cada nova pessoa que ainda não está cadastrada.
5. No campo "projeto" do agendamento, inclua o contexto: "Indicado por [nome de quem está agendando] | Projeto: [descrição]".
6. Após concluir um, pergunte: "Tem mais alguém para agendar, ou ficamos por aqui?"

**Caso especial — grupos com Camilla:** Ela frequentemente atende 4 a 5 pessoas ao mesmo tempo. Nesse caso, seja especialmente detalhista: registre a ideia de cada pessoa individualmente, o horário que cada uma prefere dentro do bloco, e observe no campo projeto quem forma o grupo. Exemplo de projeto: "Grupo de 4 amigas | Piece 1: floral no pulso | Piece 2: frase no tornozelo | ..." — quanto mais detalhado, melhor para Camilla se preparar.

## DISPONIBILIDADE DOS ARTISTAS
- **Abraão**: faz consultas (~1h30 a 2h) e sessões (~3h). Gosta de conversar, criar a arte e discutir valores antes de tatuar. Aura pode agendar qualquer tipo para ele.
- **Camilla**: faz sessões (~3h a 6h), sem consulta separada — ela cria e tatua na mesma visita. Blocos disponíveis: 13h–16h ou 16h–20h. NUNCA sugira "consulta" com Camilla.
- Ao perguntar data/hora, deixe o cliente sugerir. Diga que a equipe confirma disponibilidade pelo WhatsApp.

## IMAGEM DE REFERÊNCIA
Quando o cliente descrever uma ideia, convide a enviar imagem pelo botão 📷. Ao receber, diga que não consegue ver aqui, mas que já foi salva na ficha e o artista terá acesso.

## ENCERRAMENTO
- Fluxo A: confirme os dados, diga que a equipe entra em contato pelo WhatsApp.
- Fluxo B: confirme os dados, diga que a equipe confirma o horário pelo WhatsApp e que um e-mail foi enviado.

## ARTISTAS
- **Abraão** — realismo, blackwork, orientalismo, peças grandes e autorais. WhatsApp: https://wa.me/5527996929665?text=Olá+Abraão%2C+vim+pelo+site+da+Casa+dos+Carvalho+e+gostaria+de+conversar+sobre+minha+tatuagem+%F0%9F%96%A4
- **Camilla** — floral, minimalismo, aquarela, fine line, peças delicadas e femininas. WhatsApp: https://wa.me/5527996941787?text=Olá+Camilla%2C+vim+pelo+site+da+Casa+dos+Carvalho+e+gostaria+de+conversar+sobre+minha+tatuagem+%F0%9F%96%A4

Triage por estilo:
- Floral, delicado, fino, aquarela, minimalista, fine line, pontilhismo, geométrico → Camilla
- Grande, realismo, blackwork, cobertura, oriental, japonesa, tribal, biomecânico, old school → Abraão
- Ambíguo → a equipe indica na consultoria

**Só libere link do artista se:** (1) dados coletados E (2) cliente pedir explicitamente.

## DIFERENCIAIS DA CASA DOS CARVALHO
- Não repetimos tatuagens. Cada projeto é único e exclusivo.
- Consultoria antes de qualquer agulha — um café, uma conversa real, entendemos o porquê da tatuagem.
- Respeitamos a pele como obra. Os artistas aqui criam, não apenas tatuam.
- Referência em qualidade no Espírito Santo — confirmado sessão após sessão.

## PROCESSO
1. **Consulta** — conversa presencial, café, escuta real, construção do projeto juntos
2. **Orçamento** — valor do projeto completo, pode ser dividido no cartão ou em sessões
3. **Sessão** — tatuamos na hora se houver disponibilidade, ou agendamos

## QUEBRA DE OBJEÇÕES
- "Vou pensar" → Acolha. Reforce o diferencial com sutileza.
- "Quanto custa?" → Nunca revele. O valor é discutido na consulta.
- "Tenho medo de arrepender" → Uma tatuagem pensada com cuidado raramente decepciona. É para isso que existe a consulta.
- "Já fiz em outro lugar" → Não compare. Apresente o diferencial com segurança.

## REAÇÕES EMOCIONAIS
- Cliente compartilha algo significativo → empatia genuína e contida.
- Cliente entusiasmado → combine a energia com elegância. Nunca exagere.

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
- NUNCA inventar se o cliente já é cadastrado — sempre use verificar_cliente_existente
- NUNCA incluir [LEAD:...] para cliente já reconhecido como existente
- NUNCA sugerir consulta com Camilla — ela faz sessões diretas
- NUNCA acionar solicitar_agendamento sem: nome completo, WhatsApp, e-mail, tipo, artista e data
- NUNCA encerrar sem ter salvo o lead de alguma forma
- Se não souber responder, diga que vai verificar com a equipe e peça o contato

## SALVAMENTO PROGRESSIVO DO LEAD
A partir do momento em que tiver **nome + WhatsApp**, inclua no final da sua resposta (invisível ao usuário) a tag [LEAD:...] com os dados coletados até agora. Continue incluindo essa tag em TODAS as respostas seguintes, sempre atualizada com os novos dados coletados. Assim, mesmo que a conversa seja interrompida, os dados parciais são salvos.

[LEAD:{"nome":"...","email":"...","tel":"...","nascimento":"","ideia":"...","regiao":"","insta":"","artista":"...","obs":""}]

Regras da tag:
- Dispare assim que tiver nome + WhatsApp (e-mail pode estar vazio "")
- Atualize a tag em cada resposta seguinte com os novos dados coletados
- O campo "artista" deve ser "Abraão", "Camilla" ou "" se indeterminado
- O campo "obs" deve ser preenchido apenas quando houver duplicidade de número: "ATENÇÃO: número já cadastrado — verificar duplicidade." Caso contrário, deixe como string vazia ""
- Campos não coletados ficam com string vazia ""
- NUNCA inclua [LEAD:...] para cliente já reconhecido como existente via verificar_cliente_existente`;

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
  },
  {
    name: "solicitar_agendamento",
    description: "Cria uma solicitação formal de agendamento (consulta ou sessão) para um cliente. Use somente após coletar: nome completo, WhatsApp, e-mail, tipo (consulta ou sessao), artista preferido e data preferida. Para clientes novos inclua também o [LEAD:...] na mesma resposta. Para clientes já cadastrados reconhecidos via verificar_cliente_existente, use o cliente_id retornado.",
    input_schema: {
      type: "object",
      properties: {
        cliente_id: { type: "string", description: "ID do cliente se já cadastrado (retornado por verificar_cliente_existente). Omita para clientes novos." },
        cliente_nome: { type: "string", description: "Nome completo do cliente (nome e sobrenome)" },
        cliente_email: { type: "string", description: "E-mail do cliente" },
        cliente_tel: { type: "string", description: "WhatsApp do cliente com DDD" },
        cliente_insta: { type: "string", description: "Instagram do cliente sem @, se informado" },
        artista: { type: "string", description: "Nome do artista: Abraão ou Camilla" },
        tipo: { type: "string", enum: ["consulta", "sessao"], description: "Tipo: consulta (~1h30-2h, somente Abraão) ou sessao (a tatuagem em si, ~3h)" },
        data_solicitada: { type: "string", description: "Data preferida no formato YYYY-MM-DD" },
        hora_solicitada: { type: "string", description: "Horário preferido no formato HH:MM" },
        projeto: { type: "string", description: "Descrição detalhada do projeto/tatuagem desejada" },
        regiao: { type: "string", description: "Região do corpo onde será tatuado" },
        orcamento: { type: "string", description: "Orçamento estimado informado pelo cliente" }
      },
      required: ["cliente_nome", "cliente_email", "cliente_tel", "artista", "tipo", "data_solicitada"]
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

async function solicitarAgendamento(input) {
  try {
    const { cliente_id, cliente_nome, cliente_email, cliente_tel, cliente_insta, artista, tipo, data_solicitada, hora_solicitada, projeto, regiao, orcamento } = input;

    const descricao = [
      projeto ? "Projeto: " + projeto : "",
      regiao ? "Região: " + regiao : "",
      orcamento ? "Orçamento estimado: " + orcamento : "",
      cliente_insta ? "Instagram: @" + cliente_insta.replace("@", "") : ""
    ].filter(Boolean).join(" | ");

    // Para clientes novos: cria o registro no CRM direto com etapa aura_agend
    let finalClienteId = cliente_id || null;
    if (!finalClienteId) {
      const { data: novoCliente } = await supabase.from("clientes").insert({
        user_id: STUDIO_USER_ID,
        nome: cliente_nome,
        tel: (cliente_tel || "").replace(/\D/g, ""),
        email: cliente_email || "",
        insta: cliente_insta || "",
        artista: artista || null,
        descricao: descricao || "",
        regiao: regiao || "",
        etapa: "aura_agend",
        orig: "Site - Aura Chat",
        qual: "Q1",
        obs: "Agendamento via Aura Chat",
        estilo: "", tam: "Medio", intencao: "", cob: false, stars: 0,
        val_a: 0, val_c: 0, pgto: "", orcamento: false, contrato: false,
        faltas: 0, indicacoes: 0, credito: 0, cri: "", dias: 0, referencias: []
      }).select("id").single();
      if (novoCliente) finalClienteId = novoCliente.id;
    } else {
      await supabase.from("clientes").update({ etapa: "aura_agend" }).eq("id", finalClienteId);
    }

    // Inserir agendamento pendente — sem .select().single() para evitar erro de RLS no SELECT
    const { error: pendErr } = await supabase
      .from("agendamentos_pendentes")
      .insert({
        user_id: STUDIO_USER_ID,
        status: "pendente",
        cliente_id: finalClienteId,
        cliente_nome,
        cliente_email: cliente_email || "",
        cliente_tel: (cliente_tel || "").replace(/\D/g, ""),
        profissional_nome: artista,
        data_solicitada,
        hora_solicitada: hora_solicitada || "",
        tipo,
        descricao
      });

    if (pendErr) {
      console.error("agendamentos_pendentes insert error:", pendErr);
      return { ok: false, erro: pendErr.message };
    }

    const resendKey = process.env.RESEND_API_KEY;
    const emailRem = process.env.EMAIL_REMETENTE || "contato@acasadoscarvalhotattoo.com.br";
    const emailPro = artista && artista.toLowerCase().includes("camilla")
      ? "camilla-acampos@hotmail.com"
      : "estudioabraaotattoo07@gmail.com";
    const tipoLabel = tipo === "sessao" ? "Sessão" : "Consulta";
    const dataFmt = data_solicitada ? data_solicitada.split("-").reverse().join("/") : "A confirmar";

    if (resendKey) {
      const htmlPro = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222;background:#fafafa;padding:24px;border-radius:8px'>" +
        "<h2 style='color:#C9A84C;border-bottom:2px solid #C9A84C;padding-bottom:8px'>✦ " + tipoLabel + " solicitada via Aura</h2>" +
        "<table style='width:100%;border-collapse:collapse;font-size:14px;margin-top:12px'>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555;width:150px'>Tipo</td><td>" + tipoLabel + "</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Artista</td><td>" + artista + "</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Data solicitada</td><td>" + dataFmt + "</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Horário</td><td>" + (hora_solicitada || "A combinar") + "</td></tr>" +
        "<tr><td colspan='2' style='padding:14px 0 4px;color:#C9A84C;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:.06em'>Cliente</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Nome</td><td>" + cliente_nome + "</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>WhatsApp</td><td>" + (cliente_tel || "—") + "</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>E-mail</td><td>" + (cliente_email || "—") + "</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Instagram</td><td>" + (cliente_insta ? "@" + cliente_insta.replace("@", "") : "—") + "</td></tr>" +
        "<tr><td colspan='2' style='padding:14px 0 4px;color:#C9A84C;font-weight:bold;font-size:12px;text-transform:uppercase;letter-spacing:.06em'>Projeto</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Ideia</td><td>" + (projeto || "—") + "</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Região</td><td>" + (regiao || "—") + "</td></tr>" +
        "<tr><td style='padding:5px 0;font-weight:bold;color:#555'>Orçamento</td><td>" + (orcamento || "—") + "</td></tr>" +
        "</table>" +
        "<p style='margin-top:20px;font-size:12px;color:#aaa'>Solicitado via Aura Chat · Casa dos Carvalho · Confirme pelo WhatsApp do cliente.</p>" +
        "</div>";

      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Casa dos Carvalho <" + emailRem + ">",
          to: [emailPro],
          subject: "✦ " + tipoLabel + " solicitada — " + cliente_nome + " | " + dataFmt,
          html: htmlPro
        })
      }).catch(e => console.warn("Email profissional error:", e));

      if (cliente_email) {
        const fn = cliente_nome.trim().split(" ")[0];
        const htmlCli = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222'>" +
          "<p>Olá, <strong>" + fn + "</strong>!</p>" +
          "<p>Sua solicitação de <strong>" + tipoLabel.toLowerCase() + "</strong> com <strong>" + artista + "</strong> foi recebida com sucesso. 🖤</p>" +
          "<p><strong>Data solicitada:</strong> " + dataFmt + (hora_solicitada ? " às " + hora_solicitada : "") + "</p>" +
          "<p>Nossa equipe vai entrar em contato pelo seu WhatsApp em breve para confirmar o horário exato.</p>" +
          "<p style='margin-top:24px;font-size:12px;color:#999'>Casa dos Carvalho Tattoo · Vitória-ES</p>" +
          "</div>";
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Casa dos Carvalho <" + emailRem + ">",
            to: [cliente_email],
            subject: "Sua " + tipoLabel.toLowerCase() + " foi solicitada — Casa dos Carvalho Tattoo",
            html: htmlCli
          })
        }).catch(e => console.warn("Email cliente error:", e));
      }
    }

    const zenviaKey = process.env.ZENVIA_API_KEY;
    if (zenviaKey) {
      const smsTo = artista && artista.toLowerCase().includes("camilla") ? "5527996941787" : "5527996929665";
      const smsText = "✦ " + tipoLabel + " | " + cliente_nome + " | " + dataFmt + (hora_solicitada ? " " + hora_solicitada : "") + " | " + ((cliente_tel || "").replace(/\D/g, "").slice(-11) || "—");
      fetch("https://api.zenvia.com/v2/channels/sms/messages", {
        method: "POST",
        headers: { "X-API-TOKEN": zenviaKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "estudio.abraao.tattoo",
          to: smsTo,
          contents: [{ type: "text", text: smsText }]
        })
      }).catch(e => console.warn("SMS profissional error:", e));
    }

    return { ok: true, clienteId: finalClienteId, mensagem: "Agendamento solicitado. Profissional notificado por e-mail e SMS." };
  } catch (e) {
    return { ok: false, erro: String(e) };
  }
}

async function executarFerramenta(nome, input) {
  if (nome === "verificar_cliente_existente") {
    return await verificarClienteExistente(input.telefone);
  }
  if (nome === "notificar_solicitacao_agendamento") {
    return await notificarSolicitacaoAgendamento(input.nome, input.telefone, input.resumo);
  }
  if (nome === "solicitar_agendamento") {
    return await solicitarAgendamento(input);
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

  const hojeStr = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    timeZone: "America/Sao_Paulo"
  });
  const hojeISO = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    .toISOString().split("T")[0];
  let systemPrompt = BASE_PROMPT + "\n\n## DATA ATUAL\nHoje é " + hojeStr + " (" + hojeISO + "). Use esta data como referência ao interpretar pedidos de agendamento como \"amanhã\", \"semana que vem\", etc.";
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
