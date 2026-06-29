// api/chat.js — Aura IA + persistência de histórico de conversa por cliente
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

**Leitura de energia:** adapte o tom ao projeto e ao perfil do cliente. Para artes brutas, masculinas, intensas (realismo, blackwork, animais, símbolos de força) — use linguagem direta, forte, sem afetação. Nunca diga "adoro", "lindo", "que delícia" para esse perfil. Para artes delicadas, femininas, florais — mantenha a elegância suave. A Aura sente o cliente e fala a linguagem dele.

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

Após coletar os três dados obrigatórios, NÃO encerre ainda. Continue a conversa e colete naturalmente:
- Ideia do projeto (o que quer tatuar, estilo, referência)
- Região do corpo
- Artista de interesse (se cabível)

Somente após isso, encerre com elegância e inclua [LEAD:...] com tudo que coletou. Um lead sem ideia registrada é um lead incompleto.

### FLUXO B — Agendamento (consulta ou sessão)
Colete UM dado por mensagem, com naturalidade e sem pressa:
1. Nome **completo** (nome e sobrenome — obrigatório para agendamento)
2. WhatsApp com DDD
3. E-mail
4. Instagram ("Tem @? Quando for marcar você em uma publicação, já está no seu cadastro!")
5. Data de aniversário ("Só pra gente te surpreender na data certa — qual seu aniversário?") — obrigatório coletar. **APÓS receber a data:** calcule se o aniversário cai nos próximos 7 dias (compare o dia e mês com a data atual). Se cair, reaja com calor genuíno e imediato — NÃO continue coletando dados na mesma mensagem. Exemplos: "Espera — seu aniversário é essa semana?! Que presente você está se dando. 🖤 Camilla vai adorar saber disso." / "Aniversário em [data]? Que forma linda de começar mais um ano se tatuando." / "Isso é lindo — se presentear com arte na sua data. 🖤" Não seja protocolar. Essa pessoa não é qualquer cliente — ela decidiu gastar o dinheiro aqui e possivelmente está se dando um presente. Mostre que isso importa.
6. Tipo: **consulta** ou **sessão**? — se o artista já foi identificado como Camilla, não ofereça consulta (ela não faz). **Se o cliente já deixou claro em qualquer momento que quer tatuar (ex: "quero tatuar", "já quero tatuar faz tempo", "quero fazer a tatuagem"), NÃO pergunte de novo — assuma sessão e avance.** Se precisar confirmar, diga apenas: "Certo — vamos direto para a sessão então." Nunca repita a pergunta consulta/sessão para quem já sinalizou que quer tatuar.
7. Artista preferido (indique pelo estilo se não souber — mas se já ficou claro no contexto, não pergunte de novo)
8. Ideia/projeto em detalhes
9. Região do corpo onde será tatuado
10. Orçamento — pergunte sempre assim: "Qual o valor que você se programou para investir nesta obra de arte?"
11. Referência de imagem (convide pelo botão 📷 — ao receber, confirme que foi salva)
12. Data preferida
13. Melhor horário para receber uma ligação da equipe ("Para a gente confirmar com você — prefere pela manhã, tarde ou na parte da noite?")
14. Orçamento — se o cliente não respondeu ou desviou, volte a perguntar antes de acionar solicitar_agendamento. Toda informação é preciosa — não avance sem ela.

Após ter nome completo + WhatsApp + e-mail + tipo + artista + data → acione \`solicitar_agendamento\`. **REGRA ABSOLUTA: se o cliente informou data preferida, orçamento e artista durante a conversa, SEMPRE acione solicitar_agendamento — mesmo que o cliente não tenha pedido explicitamente. Esses dados indicam intenção concreta. Não encerre a conversa no Fluxo A se você já tem dados suficientes para o Fluxo B.**
Se for cliente novo, inclua [LEAD:...] antes ou na mesma resposta que aciona o agendamento.
No campo "projeto" do agendamento, use o seguinte modelo obrigatório — preencha TODOS os campos com o que foi coletado. Deixe em branco apenas o que realmente não foi mencionado:

"[Ideia do projeto] | Região: [região do corpo] | Estilo: [estilo/técnica] | Investimento: R$[valor] | Instagram: @[usuario] | Aniversário: [data] | Contexto: [ex: presente de aniversário, primeira tatuagem, faz tempo que quer] | Referência visual: [sim/não] | Melhor horário p/ ligação: [período] | [Qualquer outra informação relevante dita na conversa]"

REGRA ABSOLUTA sobre correções de dados: se o cliente corrigir WhatsApp ou e-mail durante a conversa, inclua AMBOS no campo projeto — ex: "WhatsApp informado inicialmente: 27996929665 | WhatsApp corrigido: 27999995555 | E-mail informado inicialmente: missionburger@gmail.com | E-mail corrigido: missionburger.v27@gmail.com". Use o valor corrigido nos campos do tool. Isso garante que a equipe veja a correção mesmo que o sistema tenha salvo o valor errado.

REGRA ABSOLUTA sobre campos do tool: ao acionar solicitar_agendamento, preencha TODOS os campos disponíveis com os dados coletados — cliente_insta, cliente_nascimento, regiao, orcamento, horario_ligacao. Nunca deixe um campo vazio se o dado foi coletado na conversa.

## ABERTURA E RECONHECIMENTO DE CLIENTE
A primeira coisa a descobrir é se a pessoa já é cliente. Siga esta ordem:

1. Apresente-se brevemente e pergunte: "Você já é nosso cliente, ou é a primeira vez que você está por aqui?"

2. Se JÁ é cliente:
   a. Peça o WhatsApp com DDD: "Deixa eu confirmar — pode me passar seu WhatsApp com DDD?"
   b. Use \`verificar_cliente_existente\` com esse telefone.
   c. Se encontrado: cumprimente pelo nome retornado. Pergunte o que precisa hoje. NÃO peça o nome de novo.
   d. Se NÃO encontrado: diga que ainda não encontrou o cadastro, peça o nome e siga EXATAMENTE como cliente novo — sem pedir WhatsApp de novo. REGRA ABSOLUTA: se verificar_cliente_existente retornou "nao encontrado", o cliente e tratado como novo para todos os efeitos — isso inclui emitir [LEAD:...] obrigatoriamente assim que tiver o nome, e seguir o Fluxo B completo de coleta de dados. Nunca pule o [LEAD:...] porque o cliente disse que ja e cliente — o que importa e o que o sistema retornou.

3. Se é a PRIMEIRA VEZ: siga esta ordem obrigatória:
   a. Antes de qualquer pergunta, avise com naturalidade: "Para fazer sua solicitação, vou precisar coletar alguns dados importantes para que nossa equipe entre em contato com você." Só então comece a perguntar.
   b. Pergunte o nome **completo** (nome e sobrenome — obrigatório). Se o cliente informar só o primeiro nome, peça o sobrenome com leveza: "E o sobrenome?" Não avance sem o nome completo.
   c. **Imediatamente após o nome, peça o WhatsApp com DDD** — de forma natural: "Ótimo, [nome]! Me passa seu WhatsApp com DDD para eu já te deixar no nosso sistema enquanto a gente conversa?" Não espere o final da conversa para coletar isso. Se o cliente sumir depois do nome, ao menos o WhatsApp já foi salvo.
   c. Após WhatsApp, inclua o [LEAD:...] inicial (super frio) e **continue a conversa** perguntando sobre a ideia: "Agora me conta — você já sabe qual arte deseja eternizar na sua pele, ou ainda está construindo isso?"
   d. Continue coletando os dados restantes naturalmente ao longo da conversa.
   e. Quando o momento for natural, pergunte diretamente: "Me responda uma coisa — você já está pronto para tatuar ou quer marcar uma consulta com [profissional responsável]?" NUNCA ofereça a saída "quando você estiver no seu tempo" — isso abre brecha para o lead esfriar. Direcione sempre para uma ação concreta.

## NORMALIZAÇÃO E VALIDAÇÃO DE E-MAIL
- **Sempre converta o e-mail para letras minúsculas** antes de salvar — sem exceção. Se o cliente digitou "Fulano@Gmail.COM", salve como "fulano@gmail.com".
- **Valide o padrão básico**: o e-mail deve conter "@" e um domínio com ponto após o "@" (ex: gmail.com, hotmail.com, outlook.com). Se o e-mail parecer inválido (sem "@", sem ponto, extensão estranha como ".cin" em vez de ".com", espaços, etc.), pergunte na conversa antes de salvar: "Só confirmar — o e-mail é [e-mail digitado]? Parece ter algo diferente no final."
- **Nunca corrija por dedução** o que acha que o cliente quis dizer (ex: não mude "gmial.com" para "gmail.com" sem perguntar). Apenas normalize maiúsculas→minúsculas e, se o padrão for suspeito, peça confirmação.

## CORREÇÃO DE DADOS DURANTE A CONVERSA
Se o cliente disser que errou o WhatsApp ou e-mail, pergunte o correto imediatamente. Use SEMPRE o valor corrigido nos campos do agendamento. Se o WhatsApp foi corrigido, rode verificar_cliente_existente com o número corrigido. Registre os dois valores (errado e correto) no campo projeto do agendamento para que a equipe veja.

## VERIFICAÇÃO DE DUPLICIDADE AO COLETAR WHATSAPP
Sempre que coletar o WhatsApp de alguém que disse ser novo, use \`verificar_cliente_existente\` silenciosamente para checar duplicidade.

**Se o número JÁ existir e a pessoa disse ser nova:**
- O sistema verifica automaticamente se nome e e-mail também batem com o cadastro existente.
- Se nome e e-mail **batem**: é o mesmo cliente — reconheça e siga como cliente existente.
- Se nome ou e-mail **divergem**: o sistema cria um cadastro novo automaticamente, sem tocar no registro existente. Não mencione isso para o cliente — siga a conversa normalmente.
- Se não tiver outro número e insistir: registre mesmo assim com obs "ATENÇÃO: número já cadastrado — verificar duplicidade." Inclua [LEAD:...] normalmente.
- **REGRA ABSOLUTA: Nunca encerre sem salvar o lead de alguma forma.**

## ATUALIZAÇÃO DE CADASTRO DE CLIENTE EXISTENTE
Sempre que um cliente reconhecido por \`verificar_cliente_existente\` fornecer qualquer informação nova (orçamento, instagram, data de aniversário, observação, artista preferido), acione imediatamente \`atualizar_cliente\` com o cliente_id e os campos informados. Não espere o fim da conversa — atualize assim que o dado for coletado. O cliente não precisa saber que o cadastro foi atualizado.

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
5. No campo "projeto" do agendamento, inclua o contexto completo: "Indicado por [nome] | Projeto: [descrição] | Orçamento: [valor informado]".
6. O orçamento informado pelo cliente é **obrigatório** no campo projeto — é referência direta para o artista criar e dimensionar o trabalho.
7. Após concluir um, pergunte: "Tem mais alguém para agendar, ou ficamos por aqui?"

**Caso especial — grupos com Camilla:** Ela frequentemente atende 4 a 5 pessoas ao mesmo tempo. Nesse caso, seja especialmente detalhista: registre a ideia, a região e o orçamento de cada pessoa individualmente. Exemplo de projeto: "Grupo de 4 amigas | Piece 1: floral no pulso — R$300 | Piece 2: frase no tornozelo — R$200 | Piece 3: lua minimalista na nuca — R$250 | ..." — quanto mais detalhado, melhor para Camilla se preparar e precificar.

## DISPONIBILIDADE DOS ARTISTAS
- **Abraão**: faz consultas e sessões. Gosta de conversar, criar a arte e discutir valores antes de tatuar. Aura pode agendar qualquer tipo para ele.
- **Camilla**: faz sessões diretas, sem consulta separada — ela cria e tatua na mesma visita. NUNCA sugira "consulta" com Camilla.
- **Ao falar de tempo com o cliente:** NUNCA mencione duração em horas de forma espontânea. Se o cliente perguntar quanto tempo leva uma consulta, diga apenas: "Vamos precisar de mais ou menos 1h30 do seu tempo aqui no estúdio — mas a equipe vai te ligar para alinhar tudo." Para sessão, se perguntado: "O tempo varia de acordo com o projeto — nossa equipe vai te passar todos os detalhes quando ligar."
- Ao perguntar data/hora: deixe o cliente sugerir o dia. NUNCA ofereça blocos de horário específicos. Para confirmar ligação, pergunte: "Qual o melhor período para a equipe te ligar — manhã, tarde ou noite?" Você não tem acesso à agenda em tempo real.

## IMAGEM DE REFERÊNCIA
Quando o cliente descrever uma ideia, convide a enviar imagem pelo botão 📷. Ao receber, diga que não consegue ver aqui, mas que já foi salva na ficha e o artista terá acesso.

## ENCERRAMENTO
- Fluxo A: confirme os dados, diga que a equipe entra em contato pelo WhatsApp.
- Fluxo B: após acionar \`solicitar_agendamento\`, encerre com elegância e força independentemente do resultado da ferramenta. Exemplos: "Seus dados já estão em nossos registros — assim que possível a equipe entra em contato! Seja muito bem-vindo à Família Carvalho!" ou "Cada um tem a tatuagem que merece e você está construindo a sua do jeito certo! A equipe entra em contato em breve." NUNCA diga que o agendamento está confirmado. NUNCA prometa dia ou hora específica para o contato.

## ERROS TÉCNICOS — REGRA ABSOLUTA
NUNCA mencione falha, instabilidade, erro ou problema técnico ao cliente — em nenhuma circunstância. Se uma ferramenta retornar erro, ok: false, ou qualquer resultado negativo, ignore completamente e prossiga como se tivesse funcionado perfeitamente. Nunca peça para o cliente "tentar novamente" por motivo técnico. O cliente não deve ter qualquer percepção de que algo falhou internamente.

## ARTISTAS
- **Abraão** — realismo, blackwork, orientalismo, peças grandes e autorais. Trata cada tatuagem como uma **tela** — está na pele, mas é uma obra de arte. Desenvolveu o estilo próprio de **realismo em pontilhismo** — uma técnica única que combina a profundidade do realismo com a precisão dos pontos. Quando alguém mencionar "realismo em pontilhismo" ou "pontilhismo realista", destaque isso ativamente: _"Você escolheu bem — o realismo em pontilhismo é uma técnica que o Abraão desenvolveu com identidade própria. Cada ponto é uma decisão de artista, e o resultado é visceral."_
- **Camilla** — floral, minimalismo, aquarela, fine line, peças delicadas e femininas.

Triage por estilo:
- Floral, delicado, fino, aquarela, minimalista, fine line, pontilhismo decorativo, geométrico → Camilla
- Grande, realismo, blackwork, cobertura, oriental, japonesa, tribal, biomecânico, old school, **realismo em pontilhismo**, pontilhismo realista → Abraão
- Ambíguo → a equipe indica na consultoria

**Contato via WhatsApp:** após acionar solicitar_agendamento com sucesso, inclua a tag [WA_LINK] na mesma resposta de confirmação. Use essa tag apenas uma vez por conversa, nunca antes do agendamento ser solicitado. A tag [WA_LINK] NUNCA deve aparecer para quem ainda não solicitou consulta ou sessão.

REGRAS ABSOLUTAS sobre [WA_LINK]:
- Escreva APENAS a tag literal [WA_LINK] — nunca gere URLs, links, HTML, números de telefone ou qualquer texto de contato além da tag. O sistema converte a tag em botão automaticamente.
- Nunca escreva "wa.me/...", "WhatsApp: (xx)...", nem qualquer número de telefone junto ou depois da tag — o botão já contém tudo.
- Nunca gere a tag em formato diferente de [WA_LINK] (sem espaços, sem aspas, sem HTML ao redor).
- Adapte apenas a frase ANTES da tag: se foi consulta, "Sua consulta foi registrada — nossa equipe entra em contato em breve. Enquanto isso, pode nos chamar direto: [WA_LINK]"; se foi sessão, "Sua sessão foi solicitada — a equipe entra em contato para confirmar tudo. Pode nos chamar também: [WA_LINK]".

Se o cliente iniciar a conversa com algo como "Quero falar com vocês pelo WhatsApp", responda com calor que, para agilizar o atendimento da equipe, você vai fazer algumas perguntas rápidas primeiro — e siga o fluxo normal de coleta de dados a partir daí. Ao final, quando solicitar_agendamento for acionado, o link de WhatsApp será entregue automaticamente.

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
- Horários: segunda a sexta, 13h30 às 18h; sábado, 13h às 20h. Domingo fechado.

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
- Quando o cliente informar o orçamento, confirme sempre assim: "Anotado — R$[valor] é a sua base de investimento! Pode ter certeza que [nome do artista] entrega sempre mais do que você espera." Nunca use a palavra "referência" para o valor — use sempre "base de investimento".
- NUNCA revelar problemas técnicos, falhas internas ou mencionar que algo deu errado para o cliente. Problemas são internos — o cliente nunca deve saber.
- NUNCA dar saídas passivas como "quando você estiver pronto" ou "quando quiser" — sempre direcione para uma ação concreta (consulta ou sessão).
- NUNCA repetir uma pergunta que já foi respondida — se o cliente disse que quer consulta, não pergunte de novo se quer consulta ou sessão.
- NUNCA ser prolixa — respostas curtas, diretas, sem perder personalidade
- NUNCA perguntar mais de 1 dado por mensagem — isso é absoluto. Mesmo que dois dados pareçam relacionados (ex: "tem imagem em mente? e onde quer tatuar?"), pergunte UM, espere a resposta, depois o outro. Sem exceção.
- NUNCA inventar se o cliente já é cadastrado — sempre use verificar_cliente_existente
- NUNCA incluir [LEAD:...] para cliente já reconhecido como existente
- NUNCA sugerir consulta com Camilla — ela faz sessões diretas
- NUNCA acionar solicitar_agendamento sem: nome completo, WhatsApp, e-mail, tipo, artista e data
- Sempre inclua cliente_nascimento no solicitar_agendamento se tiver sido coletado
- Sempre inclua horario_ligacao no solicitar_agendamento se tiver sido coletado
- NUNCA dizer que o agendamento está confirmado — a equipe confirma pelo WhatsApp
- NUNCA encerrar sem ter salvo o lead de alguma forma
- Se não souber responder, diga que vai verificar com a equipe e peça o contato

## SALVAMENTO PROGRESSIVO DO LEAD
A partir do momento em que tiver **apenas o nome**, inclua no final da sua resposta (invisível ao usuário) a tag [LEAD:...] com os dados coletados até agora. Continue incluindo essa tag em TODAS as respostas seguintes, sempre atualizada com os novos dados coletados. Assim, mesmo que a conversa seja interrompida, os dados parciais são salvos.

**Classificacao progressiva na obs:** desde o primeiro [LEAD:...], a obs deve refletir o estado atual:
- So tem nome, sem contato → obs: "LEAD SUPER FRIO — so nome coletado. Sem WhatsApp ou email. Conversa abandonada."
- Tem nome + algum dado de contato (WhatsApp ou email) mas nenhum interesse concreto → obs: "LEAD SUPER FRIO — dados minimos. Sem ideia ou intencao clara."
- Tem dados de contato + demonstrou interesse mas nao solicitou nada → obs: "LEAD — interesse demonstrado, sem agendamento. [avaliacao do perfil]"
- Solicitou consulta ou sessao → use solicitar_agendamento (o pixel e o CRM classificam automaticamente)

[LEAD:{"nome":"...","email":"...","tel":"...","nascimento":"","ideia":"...","regiao":"","insta":"","artista":"...","obs":""}]

Regras da tag:
- Dispare assim que tiver o nome (WhatsApp e email podem estar vazios "")
- Atualize a tag em cada resposta seguinte com os novos dados coletados
- O campo "artista" deve ser "Abraão", "Camilla" ou "" se indeterminado
- O campo "ideia" deve conter TUDO que foi coletado na conversa — não apenas a ideia do projeto. Formato obrigatório: "[ideia do projeto] | Região: [região] | Estilo: [estilo] | Data preferida: [data] | Investimento: R$[valor] | Aniversário: [data nascimento] | Melhor horário p/ ligação: [período] | Instagram: @[usuario] | Referência visual: [sim/não] | [qualquer outro detalhe relevante]". Omita apenas o que realmente não foi coletado.
- O campo "obs" deve sempre conter a classificação do lead + avaliação honesta baseada na conversa. Use obrigatoriamente uma das categorias abaixo como abertura da obs — sem emojis, sem caracteres especiais:

  LEAD SUPER FRIO — usada quando o cliente passou poucos dados e sumiu, ou nao demonstrou nenhum interesse concreto. Ex: "LEAD SUPER FRIO — abandonou a conversa apos passar nome e WhatsApp. Nenhuma ideia coletada. Tentativa de contato recomendada."

  LEAD — usada quando o cliente deixou dados de contato (WhatsApp ou email), mas esta indeciso, nao tem ideia clara, ou disse que nao e hora. Ex: "LEAD — tem contato, demonstrou interesse vago. Requer orientacao da equipe na ligacao."

  Se houver duplicidade de número, adicione ao final: "ATENCAO: numero ja cadastrado — verificar duplicidade."
  Seja direto e util para quem vai ligar. Nao seja generico.
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
    name: "atualizar_cliente",
    description: "Atualiza campos do cadastro de um cliente já existente reconhecido via verificar_cliente_existente. Use sempre que o cliente fornecer informações novas (orçamento, observação, instagram, aniversário, etc.) durante a conversa. NUNCA use para clientes novos.",
    input_schema: {
      type: "object",
      properties: {
        cliente_id: { type: "string", description: "ID do cliente retornado por verificar_cliente_existente" },
        orcamento: { type: "string", description: "OBRIGATORIO: valor que o cliente pretende investir. Se o cliente mencionou qualquer valor em qualquer momento da conversa (ex: 'tenho 700', 'uns 500 reais', 'posso gastar ate 1000'), extraia o numero e preencha aqui. Nunca deixe vazio se o valor foi mencionado." },
        obs: { type: "string", description: "Observação ou informação relevante adicional fornecida pelo cliente" },
        insta: { type: "string", description: "Instagram do cliente sem @, se informado" },
        nascimento: { type: "string", description: "Data de nascimento no formato YYYY-MM-DD, se informada" },
        artista: { type: "string", description: "Nome do artista preferido (Abraão ou Camilla), se informado" }
      },
      required: ["cliente_id"]
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
        cliente_nascimento: { type: "string", description: "Data de aniversário do cliente no formato DD/MM/AAAA, se informada" },
        artista: { type: "string", description: "Nome do artista: Abraão ou Camilla" },
        tipo: { type: "string", enum: ["consulta", "sessao"], description: "REGRA: use 'sessao' se o cliente disse qualquer variação de 'quero tatuar', 'tatuar logo', 'quero fazer a tatuagem', 'já quero tatuar', ou se o artista for Camilla (ela não faz consulta — sempre sessao). Use 'consulta' apenas se o cliente pediu explicitamente uma conversa antes de tatuar E o artista for Abraão." },
        data_solicitada: { type: "string", description: "Data preferida no formato YYYY-MM-DD" },
        hora_solicitada: { type: "string", description: "Horário preferido no formato HH:MM" },
        projeto: { type: "string", description: "Descrição detalhada do projeto/tatuagem desejada" },
        regiao: { type: "string", description: "Região do corpo onde será tatuado" },
        orcamento: { type: "string", description: "Orçamento estimado informado pelo cliente" },
        horario_ligacao: { type: "string", description: "Melhor horário para a equipe ligar para o cliente (ex: 'manhãs', 'após 17h', 'qualquer hora')" }
      },
      required: ["cliente_nome", "cliente_email", "cliente_tel", "artista", "tipo", "data_solicitada"]
    }
  }
];

async function verificarClienteExistente(telefoneInformado) {
  try {
    const digitsInformado = (telefoneInformado || "").replace(/\D/g, "");
    const ultimosDigitos = digitsInformado.slice(-11);
    if (!ultimosDigitos) return { encontrado: false };
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, tel")
      .eq("user_id", STUDIO_USER_ID);
    if (error || !data) return { encontrado: false };
    const match = data.find(c => (c.tel || "").replace(/\D/g, "").slice(-11) === ultimosDigitos);
    if (match) return { encontrado: true, nome: match.nome, id: match.id };
    return { encontrado: false };
  } catch {
    return { encontrado: false };
  }
}

async function atualizarCliente(input) {
  try {
    const { cliente_id, orcamento, obs, insta, nascimento, artista } = input;
    if (!cliente_id) return { ok: false, erro: "cliente_id obrigatório" };
    const campos = {};
    if (orcamento) campos.val_a = parseFloat(orcamento.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    if (obs) campos.obs = obs;
    if (insta) campos.insta = insta.replace("@", "");
    if (nascimento) campos.nascimento = nascimento;
    if (artista) {
      const { data: artistaRow } = await supabase.from("artistas").select("id").ilike("nome", "%" + artista.split(" ")[0] + "%").eq("user_id", STUDIO_USER_ID).limit(1).single();
      if (artistaRow) campos.artista = artistaRow.id;
    }
    if (Object.keys(campos).length === 0) return { ok: true, mensagem: "Nada para atualizar" };
    const { error } = await supabase.from("clientes").update(campos).eq("id", cliente_id);
    if (error) { console.error("atualizar_cliente error:", error); return { ok: false, erro: error.message }; }
    return { ok: true, mensagem: "Cadastro atualizado com sucesso" };
  } catch (e) {
    return { ok: false, erro: String(e) };
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
        contents: [{ type: "text", text: "CLIENTE JA CADASTRADO QUER AGENDAR: " + nome + " | " + telefone + " | " + resumo }]
      })
    });
    return { enviado: true };
  } catch {
    return { enviado: false };
  }
}

async function solicitarAgendamento(input) {
  try {
    const { cliente_id, cliente_nome, cliente_email, cliente_tel, cliente_insta, cliente_nascimento, artista, tipo, data_solicitada, hora_solicitada, projeto, regiao, orcamento, horario_ligacao } = input;

    const descricao = [
      projeto ? "Projeto: " + projeto : "",
      regiao ? "Região: " + regiao : "",
      orcamento ? "Orçamento: " + orcamento : "",
      cliente_insta ? "Instagram: @" + cliente_insta.replace("@", "") : ""
    ].filter(Boolean).join(" | ");

    // Buscar dados do artista (com ID) e configurações do estúdio em paralelo
    const [artistaRow, cfgRow] = await Promise.all([
      artista
        ? supabase.from("artistas").select("id,nome,email,tel").ilike("nome", "%" + artista.split(" ")[0] + "%").eq("user_id", STUDIO_USER_ID).limit(1).single().then(r => r.data)
        : Promise.resolve(null),
      supabase.from("configuracoes").select("studio_email,studio_name,fluxo_notificacao_artista_ativa").eq("user_id", STUDIO_USER_ID).limit(1).single().then(r => r.data)
    ]);

    const artistaId = artistaRow?.id || null;
    const emailArtista = artistaRow?.email || null;
    const telArtista = artistaRow?.tel ? "55" + (artistaRow.tel).replace(/\D/g, "").replace(/^55/, "") : null;
    const emailEstudio = cfgRow?.studio_email || "estudioabraaotattoo07@gmail.com";
    const nomeEstudio = cfgRow?.studio_name || "Casa dos Carvalho Tattoo";

    // Normalizar nascimento para formato ISO (AAAA-MM-DD) se vier como DD/MM/AAAA
    let nascimentoISO = null;
    if (cliente_nascimento) {
      const parts = cliente_nascimento.replace(/[^\d]/g, "/").split("/");
      if (parts.length === 3 && parts[2].length === 4) {
        nascimentoISO = parts[2] + "-" + parts[1].padStart(2,"0") + "-" + parts[0].padStart(2,"0");
      }
    }

    // Para clientes novos: verifica por telefone + nome + email antes de associar
    function normalizarNome(str) {
      return (str || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    }

    let finalClienteId = cliente_id || null;
    if (!finalClienteId && cliente_tel) {
      const telDigits = (cliente_tel || "").replace(/[^0-9]/g, "").slice(-11);
      const { data: existentes } = await supabase.from("clientes").select("id,tel,nome,email").eq("user_id", STUDIO_USER_ID);
      const matchTel = (existentes || []).find(c => (c.tel || "").replace(/[^0-9]/g, "").slice(-11) === telDigits);
      if (matchTel) {
        const nomeNovo = normalizarNome(cliente_nome);
        const nomeExistente = normalizarNome(matchTel.nome);
        const emailNovo = (cliente_email || "").toLowerCase().trim();
        const emailExistente = (matchTel.email || "").toLowerCase().trim();
        const nomesBatem = nomeNovo && nomeExistente && nomeNovo === nomeExistente;
        const emailsBatem = !emailNovo || !emailExistente || emailNovo === emailExistente;
        if (nomesBatem && emailsBatem) {
          finalClienteId = matchTel.id;
          const upd = { etapa: (tipo === "consulta") ? "lead_morno" : "aura_agend", excluido_em: null };
          if (descricao) upd.descricao = descricao;
          if (artistaId) upd.artista = artistaId;
          if (nascimentoISO) upd.nascimento = nascimentoISO;
          await supabase.from("clientes").update(upd).eq("id", finalClienteId);
        }
        // Se nome ou email divergem: ignora o registro existente e cria novo
      }
    }
    if (!finalClienteId) {
      const novoClienteRow = {
        user_id: STUDIO_USER_ID,
        nome: cliente_nome,
        tel: (cliente_tel || "").replace(/\D/g, ""),
        email: cliente_email || "",
        insta: cliente_insta || "",
        artista: artistaId || artista || null,
        descricao: descricao || "",
        regiao: regiao || "",
        etapa: (tipo === "consulta") ? "lead_morno" : "aura_agend",
        orig: "Site - Aura Chat",
        qual: "Q1",
        obs: "Solicitação via Aura Chat." + (horario_ligacao ? " Melhor horário para ligação: " + horario_ligacao + "." : ""),
        estilo: "", tam: "Medio", intencao: "", cob: false, stars: 0,
        val_a: 0, val_c: 0, pgto: "", orcamento: false, contrato: false,
        faltas: 0, indicacoes: 0, credito: 0, cri: "", dias: 0, referencias: []
      };
      if (nascimentoISO) novoClienteRow.nascimento = nascimentoISO;
      const { data: novoCliente, error: clienteErr } = await supabase.from("clientes").insert(novoClienteRow).select("id").single();
      if (clienteErr) console.error("clientes insert error:", clienteErr);
      if (novoCliente) finalClienteId = novoCliente.id;
    } else {
      const updateFields = { etapa: (tipo === "consulta") ? "lead_morno" : "aura_agend" };
      if (descricao) updateFields.descricao = descricao;
      if (artistaId) updateFields.artista = artistaId;
      if (nascimentoISO) updateFields.nascimento = nascimentoISO;
      await supabase.from("clientes").update(updateFields).eq("id", finalClienteId);
    }

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
      // Não retorna erro para a IA — ela encerra normalmente sem mencionar falha
    }

    const resendKey = process.env.RESEND_API_KEY;
    const emailRem = process.env.EMAIL_REMETENTE || "contato@acasadoscarvalhotattoo.com.br";
    const tipoLabel = tipo === "sessao" ? "Sessão" : "Consulta";
    const dataFmt = data_solicitada ? data_solicitada.split("-").reverse().join("/") : "A confirmar";

    if (resendKey) {
      // E-mail completo para profissional + estúdio
      const row = (label, val) => "<tr><td style='padding:6px 8px;font-weight:bold;color:#555;width:160px;vertical-align:top'>" + label + "</td><td style='padding:6px 8px'>" + (val || "—") + "</td></tr>";
      const sec = (title) => "<tr><td colspan='2' style='padding:16px 8px 4px;color:#C9A84C;font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:.08em;border-top:1px solid #eee'>" + title + "</td></tr>";
      const htmlRico = "<div style='font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#222;background:#fafafa;padding:28px;border-radius:10px;border:1px solid #e8e8e8'>" +
        "<h2 style='margin:0 0 20px;color:#C9A84C;font-size:20px;border-bottom:2px solid #C9A84C;padding-bottom:10px'>✦ " + tipoLabel + " solicitada via Aura Chat</h2>" +
        "<table style='width:100%;border-collapse:collapse;font-size:14px'>" +
        sec("Agendamento") +
        row("Tipo", "<strong>" + tipoLabel + "</strong>") +
        row("Artista", artista) +
        row("Data solicitada", "<strong>" + dataFmt + "</strong>") +
        row("Horário", hora_solicitada || "A combinar") +
        sec("Cliente") +
        row("Nome", "<strong>" + cliente_nome + "</strong>") +
        row("WhatsApp", cliente_tel ? "<a href='https://wa.me/55" + (cliente_tel).replace(/\D/g,"").replace(/^55/,"") + "' style='color:#25D366'>" + cliente_tel + "</a>" : "—") +
        row("E-mail", cliente_email || "—") +
        row("Instagram", cliente_insta ? "<a href='https://instagram.com/" + cliente_insta.replace("@","") + "' style='color:#C9A84C'>@" + cliente_insta.replace("@","") + "</a>" : "—") +
        sec("Projeto") +
        row("Descrição / Ideia", projeto || "—") +
        row("Região do corpo", regiao || "—") +
        row("Orçamento informado", orcamento ? "<strong style='color:#2d8a4e;font-size:15px'>" + orcamento + "</strong>" : "—") +
        (horario_ligacao ? sec("Contato") + row("Melhor horário p/ ligação", "<strong>" + horario_ligacao + "</strong>") : "") +
        "</table>" +
        "<p style='margin:20px 0 0;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:12px'>Solicitado via Aura Chat · " + nomeEstudio + " · Confirme pelo WhatsApp do cliente.</p>" +
        "</div>";

      const destsPro = [];
      if (emailArtista) destsPro.push(emailArtista);
      if (emailEstudio && !destsPro.includes(emailEstudio)) destsPro.push(emailEstudio);

      if (cfgRow?.fluxo_notificacao_artista_ativa !== false && destsPro.length > 0) {
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: nomeEstudio + " <" + emailRem + ">",
            to: destsPro,
            subject: "✦ " + tipoLabel + " | " + cliente_nome + " | " + dataFmt + (orcamento ? " | " + orcamento : ""),
            html: htmlRico
          })
        }).catch(e => console.warn("Email profissional error:", e));
      }

      // E-mail simples para o cliente
      if (cliente_email) {
        const fn = cliente_nome.trim().split(" ")[0];
        const htmlCli = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#222'>" +
          "<p>Olá, <strong>" + fn + "</strong>! 🖤</p>" +
          "<p>Sua solicitação de <strong>" + tipoLabel.toLowerCase() + "</strong> com <strong>" + artista + "</strong> foi recebida com sucesso.</p>" +
          "<p><strong>Data solicitada:</strong> " + dataFmt + (hora_solicitada ? " às " + hora_solicitada : "") + "</p>" +
          (orcamento ? "<p><strong>Investimento registrado:</strong> " + orcamento + "</p>" : "") +
          "<p>Nossa equipe vai entrar em contato pelo seu WhatsApp em breve para confirmar o horário.</p>" +
          "<p style='margin-top:24px;font-size:12px;color:#999'>" + nomeEstudio + " · Vitória-ES</p>" +
          "</div>";
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": "Bearer " + resendKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: nomeEstudio + " <" + emailRem + ">",
            to: [cliente_email],
            subject: "Sua " + tipoLabel.toLowerCase() + " foi solicitada — " + nomeEstudio,
            html: htmlCli
          })
        }).catch(e => console.warn("Email cliente error:", e));
      }
    }

    // SMS para o artista — conteúdo completo
    const zenviaKey = process.env.ZENVIA_API_KEY;
    if (cfgRow?.fluxo_notificacao_artista_ativa !== false && zenviaKey) {
      const smsTo = telArtista || (artista && artista.toLowerCase().includes("camilla") ? "5527996941787" : "5527996929665");
      const smsText = [
        tipoLabel.toUpperCase(),
        cliente_nome,
        dataFmt + (hora_solicitada ? " " + hora_solicitada : ""),
        "WA: " + ((cliente_tel || "").replace(/\D/g, "").slice(-11) || "—"),
        orcamento ? "R$: " + orcamento : "",
        projeto ? projeto.substring(0, 60) + (projeto.length > 60 ? "..." : "") : ""
      ].filter(Boolean).join(" | ");
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

    return {
      ok: true,
      agendamento: true,
      tipo: tipo || "",
      clienteId: finalClienteId,
      mensagem: "Solicitação registrada. Profissional notificado — a equipe entrará em contato pelo WhatsApp para confirmar data e hora."
    };
  } catch (e) {
    console.error("solicitarAgendamento exception:", e);
    return { ok: false, erro: String(e) };
  }
}

async function executarFerramenta(nome, input) {
  if (nome === "verificar_cliente_existente") {
    return await verificarClienteExistente(input.telefone);
  }
  if (nome === "atualizar_cliente") {
    return await atualizarCliente(input);
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

  const { messages, campanhas, contexto } = req.body;
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
  if (contexto === "abraao") {
    // ── COLE AQUI O TEXTO FINAL DE PERSONALIDADE/CONTEXTO DO ABRAÃO ──
    // Este bloco é injetado apenas nas conversas vindas da página /abraao.
    // Exemplo do que pode vir aqui:
    // "Nesta conversa, você está atendendo alguém que acessou a página pessoal
    //  do Abraão de Carvalho. O cliente já demonstrou interesse no trabalho do Abraão
    //  especificamente. Mencione o nome dele naturalmente e foque em realismo em pontilhismo."
    systemPrompt += "\n\n## CONTEXTO DESTA CONVERSA\nEsta conversa está acontecendo na página pessoal do Abraão de Carvalho. O visitante chegou diretamente pelo link do Abraão — provavelmente via Instagram ou indicação. Ele quer tatuar com o Abraão especificamente. Mencione o nome do Abraão naturalmente. Foque no estilo dele: realismo em pontilhismo — uma técnica única que ele desenvolveu com identidade própria. Quando pertinente, reforce: cada ponto é uma decisão de artista. O artista padrão desta conversa é Abraão — não ofereça Camilla a menos que o cliente peça especificamente.";
  }
  if (campanhas && Array.isArray(campanhas) && campanhas.length > 0) {
    const lista = campanhas.map(c => "- palavra_chave: \"" + c.palavra_chave + "\" | id: \"" + c.id + "\" | nome: \"" + c.nome + "\" | validade: até " + c.data_fim).join("\n");
    systemPrompt += "\n\n## CAMPANHAS ATIVAS\nSe o lead mencionar que tem uma palavra secreta, código de promoção ou algo similar, pergunte qual é a palavra. Compare com esta lista (ignore maiúsculas, acentos e espaços extras ao comparar a palavra_chave):\n" + lista + "\n\nSe a palavra bater com uma campanha: confirme com entusiasmo discreto. Garanta que nome, WhatsApp e e-mail estejam coletados antes de confirmar. Após confirmação com dados completos, inclua EXATAMENTE no final da sua resposta (invisível ao usuário): [CAMPANHA:{\"id\":\"VALOR_DO_ID\",\"nome\":\"VALOR_DO_NOME\"}] — substituindo VALOR_DO_ID e VALOR_DO_NOME pelos valores EXATOS desta lista acima.\nSe a palavra não corresponder a nenhuma campanha ou a campanha estiver encerrada: informe de forma gentil e acolhedora, sem ser ríspida.";
  }

  let workingMessages = [...messages];
  let finalText = "";
  let loopGuard = 0;
  let agendamentoRealizado = false;
  let agendamentoTipo = "";
  let clienteIdCapturado = null; // captura o id do cliente identificado ou criado nesta conversa

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
        if (resultado && resultado.agendamento) { agendamentoRealizado = true; agendamentoTipo = resultado.tipo || ""; }
        if (resultado && resultado.clienteId) clienteIdCapturado = resultado.clienteId;
        if (resultado && resultado.encontrado && resultado.id) clienteIdCapturado = resultado.id;
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(resultado) });
      }
      workingMessages.push({ role: "user", content: toolResults });
      continue;
    } else {
      break;
    }
  }

  const text = finalText;

  function extrairCampoLead(raw, campo) {
    const m = raw.match(new RegExp('"' + campo + '"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"'));
    return m ? m[1] : "";
  }

  const leadMatch = text.match(/\[LEAD:(\{[\s\S]*?\})\]/);
  let leadData = null;
  if (leadMatch) {
    const raw = leadMatch[1];
    const nome = extrairCampoLead(raw, "nome");
    const tel  = extrairCampoLead(raw, "tel");
    if (nome) {
      leadData = {
        nome,
        email:      extrairCampoLead(raw, "email"),
        tel,
        nascimento: extrairCampoLead(raw, "nascimento"),
        ideia:      extrairCampoLead(raw, "ideia"),
        regiao:     extrairCampoLead(raw, "regiao"),
        insta:      extrairCampoLead(raw, "insta"),
        artista:    extrairCampoLead(raw, "artista"),
        obs:        extrairCampoLead(raw, "obs"),
      };
      if (!leadData.obs) {
        console.warn("[LEAD aviso] obs vazio | nome:", nome, "tel:", tel);
      }
    } else {
      console.error("[LEAD parse ignorado — nome vazio] | raw:", raw);
    }
  }

  const campMatch = text.match(/\[CAMPANHA:(\{[^}]+\})\]/);
  let campanhaData = null;
  if (campMatch) {
    try { campanhaData = JSON.parse(campMatch[1]); } catch (e) {}
  }

  const cleanText = text.replace(/\[LEAD:[\s\S]*?\]/g, "").replace(/\[CAMPANHA:\{[^}]+\}\]/g, "").trim();

  let studioTelResp = "";
  try {
    const { data: cfgTel } = await supabase.from("configuracoes")
      .select("studio_tel").eq("user_id", STUDIO_USER_ID).limit(1).single();
    studioTelResp = (cfgTel?.studio_tel || "").replace(/[^0-9]/g, "");
  } catch (e) {}

  // ── PERSISTIR HISTÓRICO DE CONVERSA COM A AURA ──────────────────────────
  // Tentar resolver cliente_id se ainda não foi capturado via tool (ex: só tag [LEAD:] sem agendamento)
  let finalClienteIdParaLog = clienteIdCapturado;
  if (!finalClienteIdParaLog && leadData?.tel) {
    try {
      const telDigits = (leadData.tel || "").replace(/[^0-9]/g, "").slice(-11);
      if (telDigits) {
        const { data: found } = await supabase
          .from("clientes")
          .select("id")
          .eq("user_id", STUDIO_USER_ID)
          .filter("tel", "ilike", "%" + telDigits.slice(-8))
          .limit(1)
          .single();
        if (found) finalClienteIdParaLog = found.id;
      }
    } catch {}
  }

  if (finalClienteIdParaLog && workingMessages.length > 0) {
    try {
      const { data: cliAtual } = await supabase
        .from("clientes")
        .select("aura_chat_log")
        .eq("id", finalClienteIdParaLog)
        .single();

      const logAnterior = Array.isArray(cliAtual?.aura_chat_log) ? cliAtual.aura_chat_log : [];

      // Cada sessão é identificada pela data de início (primeira msg do array recebido)
      const sessaoData = new Date().toISOString();
      // Verificar se já existe uma sessão aberta hoje (mesmo cliente, mesmo dia)
      const hoje = sessaoData.split("T")[0];
      const idxHoje = logAnterior.findIndex(s => (s.data || "").startsWith(hoje));

      let novoLog;
      if (idxHoje >= 0) {
        // Atualiza a sessão de hoje com as mensagens mais recentes (substitui — workingMessages já contém tudo)
        novoLog = logAnterior.map((s, i) => i === idxHoje ? { ...s, mensagens: workingMessages, atualizado_em: sessaoData } : s);
      } else {
        // Nova sessão — sem limite de histórico (JSONB suporta, histórico tem valor de longo prazo)
        novoLog = [...logAnterior, { data: sessaoData, mensagens: workingMessages }];
      }

      await supabase
        .from("clientes")
        .update({ aura_chat_log: novoLog })
        .eq("id", finalClienteIdParaLog);
    } catch {}
  }

  return res.status(200).json({ text: cleanText, lead: leadData, campanha: campanhaData, agendamento: agendamentoRealizado, agendamento_tipo: agendamentoTipo, studio_tel: studioTelResp });
}
