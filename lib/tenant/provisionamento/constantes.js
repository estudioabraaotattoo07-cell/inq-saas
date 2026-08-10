// lib/tenant/provisionamento/constantes.js
// Valores de negócio fixos do provisionamento. Nenhum domínio deve
// hardcodar esses valores diretamente — sempre importar daqui.

export const NOME_ETAPA_IDENTIDADE = "identidade";
export const NOME_ETAPA_LICENCIAMENTO = "licenciamento";
export const NOME_ETAPA_FINANCEIRO = "financeiro";
export const NOME_ETAPA_PIPELINE = "pipeline";

// Coerente com o gatilho de provisionamento ser a própria ativação da
// licença — o tenant já nasce marcado como comercialmente ativo.
export const STATUS_INICIAL_PADRAO = "ativo";

// Decisão de negócio de qual versão comercial um tenant novo recebe por
// padrão quando nenhuma for informada explicitamente pelo chamador.
export const PLANO_PADRAO = "1.0";
