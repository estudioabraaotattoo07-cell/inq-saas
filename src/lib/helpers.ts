// ─── CONSTANTES ───────────────────────────────────────────────────────────────

export const STAGES = [
  { id: "lead", label: "Lead", color: "#5B8DEF", emoji: "🎯" },
  { id: "qualificacao", label: "Qualificação", color: "#C9A84C", emoji: "🔍" },
  { id: "cons_agendada", label: "Consultoria", color: "#9B6BB5", emoji: "📅" },
  { id: "sessao_agend", label: "Sessão Agendada", color: "#4A9EBF", emoji: "✏️" },
  { id: "tatuado", label: "Tatuado", color: "#27AE60", emoji: "✅" },
  { id: "pos_venda", label: "Pós-venda", color: "#E67E22", emoji: "💬" },
  { id: "lista_espera", label: "Lista de Espera", color: "#3498DB", emoji: "⏳" },
  { id: "hibernacao", label: "Hibernação", color: "#666", emoji: "💤" },
  { id: "blacklist", label: "Blacklist", color: "#C0392B", emoji: "🚫" },
];

export const QC: Record<string, string> = {
  Q0: "q0c", Q1: "q1c", Q2: "q2c", Q3: "q3c"
};

export const STAR_REASONS = [
  "", "Muito difícil", "Comunicação difícil", "Normal", "Boa experiência", "Excelente"
];

export const CAL_COLORS: Record<string, string> = {
  cons_abraao: "#4A9EBF",
  sess_abraao: "#C9A84C",
  cons_camilla: "#9B6BB5",
  sess_camilla: "#27AE60",
  bloq_abraao: "#C0392B",
  bloq_camilla: "#E67E22",
  bloq_geral: "#555"
};

export const CAL_LABELS: Record<string, string> = {
  cons_abraao: "Consulta Abraão",
  sess_abraao: "Sessão Abraão",
  cons_camilla: "Consulta Camilla",
  sess_camilla: "Sessão Camilla",
  bloq_abraao: "Bloq. Abraão",
  bloq_camilla: "Bloq. Camilla",
  bloq_geral: "Bloq. Geral"
};

export const HOURS = Array.from({ length: 12 }, (_, i) => i + 8);
export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const SEGS = [
  { id: "todos", label: "Todos", desc: "Toda a base", icon: "👥", f: () => true },
  { id: "q0", label: "Q0 - Acompanhantes", desc: "Estiveram no atelier", icon: "🟣", f: (c: any) => c.qual === "Q0" },
  { id: "q1", label: "Q1 - Frios", desc: "Nutrição e educação", icon: "🔴", f: (c: any) => c.qual === "Q1" },
  { id: "q2", label: "Q2 - Quentes", desc: "Prontos para avançar", icon: "🟡", f: (c: any) => c.qual === "Q2" },
  { id: "tatuados", label: "Tatuados", desc: "Já fizeram sessão", icon: "🖤", f: (c: any) => c.etapa === "tatuado" || c.etapa === "pos_venda" },
  { id: "primeira", label: "Primeira Tattoo", desc: "Primeira vez", icon: "✨", f: (c: any) => c.primeira },
  { id: "abraao", label: "Clientes Abraão", desc: "Direcionados ao Abraão", icon: "🔵", f: (c: any) => c.artista === "abraao" },
  { id: "camilla", label: "Clientes Camilla", desc: "Direcionados à Camilla", icon: "🟣", f: (c: any) => c.artista === "camilla" },
  { id: "google", label: "Avaliação Google", desc: "Tatuados sem avaliação", icon: "⭐", f: (c: any) => (c.etapa === "tatuado" || c.etapa === "pos_venda") && !c.googleReview },
  { id: "retorno", label: "Retorno Sazonal", desc: "Tatuados há mais de 6 meses", icon: "🔄", f: (c: any) => (c.etapa === "tatuado" || c.etapa === "pos_venda") && c.dias >= 180 },
];

export const DATAS = [
  { id: "maes", label: "Dia das Mães", data: "11 Mai", icon: "🌸" },
  { id: "namorados", label: "Namorados", data: "12 Jun", icon: "💝" },
  { id: "pais", label: "Dia dos Pais", data: "10 Ago", icon: "👨‍👦" },
  { id: "natal", label: "Natal", data: "25 Dez", icon: "🎄" },
  { id: "anoNovo", label: "Ano Novo", data: "01 Jan", icon: "🎆" },
  { id: "aniversario", label: "Aniversários", data: "Mensal", icon: "🎂" },
  { id: "aniAbraao", label: "Aniv. Abraão (30/Nov)", data: "30 Nov", icon: "🎉" },
  { id: "aniCamilla", label: "Aniv. Camilla (26/Jun)", data: "26 Jun", icon: "🎉" },
  { id: "diaTatuador", label: "Dia do Tatuador", data: "10 Dez", icon: "🖋️" },
];

export const PV_FLOW = [
  { id: "d0", label: "Dia da sessão", dias: 0, msg: "Olá, [Nome]! Obrigado por confiar na Casa dos Carvalho. Como foi sua experiência hoje? Estamos aqui se precisar de qualquer coisa." },
  { id: "d1", label: "D+1 Cicatrização", dias: 1, msg: "Olá, [Nome]! Como está sua tatuagem hoje? Lembre-se: mantenha hidratada, evite sol direto e não fure as bolhas se aparecerem. Qualquer dúvida, é só chamar." },
  { id: "d7", label: "D+7 Saúde", dias: 7, msg: "Olá, [Nome]! Uma semana já! Como está cicatrizando? Se notar vermelhidão, inchaço ou secreção, nos avise imediatamente." },
  { id: "d7g", label: "D+7 Avaliação Google", dias: 7, msg: "Olá, [Nome]! Se sua experiência na Casa dos Carvalho foi especial, sua avaliação no Google faz toda a diferença para nós. Leva só 1 minutinho: [LINK_GOOGLE]" },
  { id: "d30", label: "D+30 Garantia", dias: 30, msg: "Olá, [Nome]! Seu retoque gratuito vence em 7 dias. Se quiser agendar, é só nos chamar. Após o dia 37, o retoque será cobrado normalmente." },
  { id: "d37", label: "D+37 Último dia", dias: 37, msg: "Olá, [Nome]! Hoje é o último dia da sua garantia de retoque gratuito. Se precisar, nos chame agora. Depois disso, o retoque será cobrado a combinar." },
];

export const MSGS: Record<string, string> = {
  todos: "Olá, [Nome]\n\nA Casa dos Carvalho tem algo especial esperando por você.\n\nSe a sua ideia ainda está guardada, talvez seja hora de tirá-la do papel.",
  q0: "Olá, [Nome]\n\nQue bom ter te recebido aqui.\n\nA arte que você viu sendo criada foi feita com muito cuidado. Se algum dia quiser criar a sua, será uma honra.",
  q1: "Olá, [Nome]\n\nA Casa dos Carvalho não tem pressa - tem comprometimento com projetos que fazem sentido para quem os carrega na pele.",
  q2: "Olá, [Nome]\n\nVocê chegou com uma ideia linda - e ela ficou guardada com a gente.\n\nSeria um prazer evoluir essa conversa juntos.",
  tatuados: "Olá, [Nome]\n\nEspero que sua arte esteja linda e bem cuidada. Se a próxima ideia já está nascendo, você sabe onde nos encontrar.",
  homenagem: "Olá, [Nome]\n\nNessa época especial, lembramos de você e da arte que escolheu eternizar na sua pele.",
  primeira: "Olá, [Nome]\n\nTodo começo é especial - e o seu ficou guardado com muito carinho.\n\nSe a segunda ideia está surgindo, será uma honra.",
  abraao: "Olá, [Nome]\n\nO Abraão tem novidades no atelier e pensou em você.\n\nQuando quiser conversar, é só chamar.",
  camilla: "Olá, [Nome]\n\nA Camilla tem algo especial se formando e pensou em você.",
  maes: "Olá, [Nome]\n\nFeliz Dia das Mães.\n\nAlgumas memórias merecem ser eternas. A Casa dos Carvalho está aqui para transformar esse sentimento em arte.",
  namorados: "Olá, [Nome]\n\nFeliz Dia dos Namorados.\n\nA Casa dos Carvalho transforma amor em arte.",
  pais: "Olá, [Nome]\n\nFeliz Dia dos Pais.\n\nSe existe uma homenagem guardada no coração - talvez esse seja o momento certo.",
  natal: "Olá, [Nome]\n\nQue esse Natal seja cheio de momentos que você vai querer guardar para sempre.",
  anoNovo: "Olá, [Nome]\n\nUm novo ano carrega novas histórias. A Casa dos Carvalho está pronta para fazer acontecer.",
  aniAbraao: "Olá, [Nome]\n\nHoje é um dia muito especial para a Casa dos Carvalho - é o aniversário do Abraão.\n\nE como todo bom aniversário, quem ganha presente é você.\n\nPreparamos uma condição exclusiva para celebrar esse dia juntos. Quando quiser saber mais, é só me chamar.",
  aniCamilla: "Olá, [Nome]\n\nHoje a Casa dos Carvalho celebra o aniversário da Camilla.\n\nE a melhor forma de comemorar é presentear quem faz parte da nossa história.\n\nTemos algo especial reservado para você. Quando quiser saber mais, é só me chamar.",
  aniversario: "Olá, [Nome]\n\nHoje é um dia muito especial - e a Casa dos Carvalho quer fazer parte dele.\n\nComo presente: 50% de desconto na sua próxima tatuagem, válido por 15 dias.\n\nQuando quiser saber mais, é só chamar.",
  google: "Olá, [Nome]\n\nEspero que sua tatuagem esteja linda e bem cuidada.\n\nSe sua experiência na Casa dos Carvalho foi especial, sua avaliação no Google faz toda a diferença para nós crescermos juntos.\n\nLeva só 1 minutinho: [LINK_GOOGLE]\n\nObrigado de coração.",
  diaTatuador: "Olá, [Nome]\n\nHoje é o Dia do Tatuador - e a Casa dos Carvalho tem muito a celebrar.\n\nObrigado por fazer parte dessa história. Cada arte que criamos juntos é uma memória que você carrega para sempre.",
  retorno: "Olá, [Nome]\n\nFaz um tempo que não nos vemos por aqui.\n\nA Casa dos Carvalho está com novidades e seria uma honra continuar a sua história com a gente. Quando quiser conversar, é só chamar.",
};

// ─── DADOS INICIAIS ───────────────────────────────────────────────────────────

export const ARTISTS_INIT = [
  { id: "abraao", nome: "Abraão Carvalho", role: "residente", com: 60, cor: "#4A9EBF", ativo: true, insta: "@abraaotattoo", email: "abraao@casadoscarvalho.com", tel: "(27) 99999-0001" },
  { id: "camilla", nome: "Camilla Carvalho", role: "residente", com: 60, cor: "#9B6BB5", ativo: true, insta: "@camillatattoo", email: "camilla@casadoscarvalho.com", tel: "(27) 99999-0002" },
];

export const HORARIOS_INIT = [
  { dia: "Segunda", aberto: true, ini: "09:00", fim: "19:00" },
  { dia: "Terça", aberto: true, ini: "09:00", fim: "19:00" },
  { dia: "Quarta", aberto: true, ini: "09:00", fim: "19:00" },
  { dia: "Quinta", aberto: true, ini: "09:00", fim: "19:00" },
  { dia: "Sexta", aberto: true, ini: "09:00", fim: "19:00" },
  { dia: "Sábado", aberto: true, ini: "10:00", fim: "17:00" },
  { dia: "Domingo", aberto: false, ini: "", fim: "" },
];

export const CORES_ARTISTA = [
  "#4A9EBF", "#9B6BB5", "#C0392B", "#E67E22", "#C9A84C",
  "#27AE60", "#3498DB", "#E91E8C", "#1ABC9C", "#8E44AD",
  "#E8E2D9", "#555045"
];

// ─── FUNÇÕES UTILITÁRIAS ──────────────────────────────────────────────────────

export function maskTel(v: string): string {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v.length ? "(" + v : v;
  if (v.length <= 7) return "(" + v.slice(0, 2) + ") " + v.slice(2);
  if (v.length <= 11) return "(" + v.slice(0, 2) + ") " + v.slice(2, 7) + "-" + v.slice(7);
  return v;
}

export function fmtDate(d: Date): string {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

export function getWeekDates(d: Date): Date[] {
  const day = d.getDay();
  const mon = new Date(d);
  mon.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return x;
  });
}

export function getMonthDates(d: Date): { date: Date; cur: boolean }[] {
  const y = d.getFullYear(), m = d.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const sd = first.getDay();
  const days: { date: Date; cur: boolean }[] = [];
  for (let i = 0; i < sd; i++) days.push({ date: new Date(y, m, 1 - sd + i), cur: false });
  for (let i = 1; i <= last.getDate(); i++) days.push({ date: new Date(y, m, i), cur: true });
  while (days.length % 7 !== 0) days.push({ date: new Date(y, m + 1, days.length - last.getDate() - sd + 1), cur: false });
  return days;
}

export function todayStr(): string {
  return fmtDate(new Date());
}

export function makeContractArtist(sName: string): string {
  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS
In-Quadra Ink System - ${sName}

CONTRATANTE: ${sName}
CONTRATADO(A): [NOME COMPLETO] | CPF: [CPF] | Email: [EMAIL] | Instagram: [INSTAGRAM]
Tipo de vínculo: [RESIDENTE / GUEST] | Período: [DATA INÍCIO] a [DATA FIM]

CLÁUSULA 1 - OBJETO
Prestação de serviços de tatuagem artística nas dependências do estúdio contratante, pelo período acima definido.

CLÁUSULA 2 - REMUNERAÇÃO E COMISSÃO
O(A) contratado(a) receberá comissão de [X]% sobre o valor líquido de cada sessão realizada. Os repasses serão efetuados mensalmente até o dia [X] do mês subsequente.

CLÁUSULA 3 - HORÁRIO E CONDUTA
O(A) contratado(a) respeitará integralmente o horário de funcionamento do estúdio. Bloqueios de agenda devem ser comunicados com antecedência mínima de [X] dias.

CLÁUSULA 4 - CONFIDENCIALIDADE E LGPD
Os dados pessoais dos clientes são propriedade exclusiva do contratante. É expressamente proibido ao(a) contratado(a) utilizar dados de clientes para fins pessoais ou comerciais.

CLÁUSULA 5 - NÃO CAPTAÇÃO DE CLIENTES
Pelo período de 12 meses após o encerramento deste contrato, o(a) contratado(a) fica proibido(a) de contatar ativamente clientes da base do estúdio.

CLÁUSULA 6 - DIREITOS AUTORAIS
As artes desenvolvidas nas dependências do estúdio são de co-autoria do(a) artista e do contratante.

CLÁUSULA 7 - RESCISÃO
Qualquer das partes poderá rescindir este contrato com aviso prévio de [X] dias.

________________________ ________________________
Contratante                    Contratado(a)

* Revisar com advogado especializado antes de assinar.`;
}

export function makeContractClient(sName: string, nome: string, artista: string, proj: string, valor: string): string {
  return `CONFIRMAÇÃO DE PROJETO ARTÍSTICO
${sName}

Cliente: ${nome} | Artista: ${artista}
Data: ${new Date().toLocaleDateString("pt-BR")}
Projeto: ${proj}
Valor acordado: ${valor}

TERMOS E CONDIÇÕES

1. EXCLUSIVIDADE DO PROJETO
Este projeto foi desenvolvido de forma personalizada e exclusiva para o cliente.

2. VALOR E PAGAMENTO
Em caso de não comparecimento sem aviso com 24h de antecedência, será cobrada uma taxa de R$100,00, abatida no valor final. Em caso de segunda falta, será cobrado 30% do valor orçado.

3. DIREITO AO DESENHO
O desenho desenvolvido na consultoria pertence ao estúdio. O cliente não tem direito de levá-lo sem autorização expressa do artista.

4. GARANTIA DE RETOQUE
O retoque gratuito é garantido por 30 dias após a sessão, com tolerância de até 37 dias.

5. USO DE IMAGEM
O cliente autoriza o uso de fotos da tatuagem para portfólio e redes sociais da Casa dos Carvalho, salvo solicitação contrária registrada formalmente.

6. REAGENDAMENTO
O cliente pode reagendar sem cobrança desde que avise com mínimo de 24 horas de antecedência.

Ao responder CONFIRMO, o cliente declara estar de acordo com todos os termos acima.

Casa dos Carvalho - In-Quadra Ink System`;
}
