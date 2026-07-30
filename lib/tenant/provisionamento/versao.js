// lib/tenant/provisionamento/versao.js
// Versão do algoritmo de provisionamento — representa QUAL lógica rodou,
// não quando. Sobe cada vez que a sequência de domínios registrados ou as
// regras de negócio de algum domínio mudarem de forma relevante. Ver
// Bloco 2.0, seção 7.
//
// Nota: esta versão aparece no RelatorioExecucao de cada chamada, mas não é
// persistida em nenhuma tabela hoje (ink_clientes não tem uma coluna pra
// isso) — ver limitação já registrada no Bloco 2.0.

export const VERSAO_PROVISIONAMENTO_ATUAL = "1.0.0";
