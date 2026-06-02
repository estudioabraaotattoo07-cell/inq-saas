// ─── TIPOS PRINCIPAIS ────────────────────────────────────────────────────────

export interface Cliente {
  id: any;
  nome: string;
  tel: string;
  email: string;
  insta: string;
  qual: string;
  artista: string;
  etapa: string;
  estilo: string;
  regiao: string;
  tam: string;
  orig: string;
  cri: string;
  data: string;
  dias: number;
  primeira: boolean;
  cob: boolean;
  desc: string;
  stars: number;
  starReason: string;
  consent: boolean | null;
  nps: number | null;
  obs: string;
  val_a: number;
  val_c: number;
  pgto: string;
  parcelas?: string;
  orcamento: boolean;
  contrato: boolean;
  faltas: number;
  indicacoes: number;
  credito: number;
  nascimento?: string;
  hist: HistItem[];
  pv: PvItem[];
  googleReview?: boolean;
}

export interface HistItem {
  t: string;
  d: string;
}

export interface PvItem {
  l: string;
  s: "done" | "pending" | "future";
}

export interface Artista {
  id: string;
  nome: string;
  role: "residente" | "guest";
  com: number;
  cor: string;
  insta: string;
  email: string;
  tel: string;
  ativo: boolean;
}

export interface Evento {
  id: any;
  title: string;
  tipo: string;
  date: string;
  start: number;
  end: number;
  desc?: string;
  cliente_id?: any;
  cliente_nome?: string;
  artista?: string;
}

export interface Financeiro {
  id: any;
  cliente: string;
  cliente_nome?: string;
  artista: string;
  tipo: string;
  data: string;
  val_a: number;
  val_c: number;
  pgto: string;
  com_base: number;
  com_sess: number;
}

export interface Saida {
  id: any;
  desc: string;
  categoria: string;
  valor: number;
  data: string;
}

export interface Horario {
  dia: string;
  aberto: boolean;
  ini: string;
  fim: string;
}

export interface ConfigEstudio {
  studio_name: string;
  studio_tel: string;
  studio_owner: string;
  studio_email: string;
  studio_city: string;
  studio_insta: string;
  aura_name: string;
  google_link: string;
  cnpj: string;
  meta_mensal: number;
  horarios: Horario[];
  dark_mode: boolean;
}
