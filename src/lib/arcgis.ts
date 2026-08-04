/**
 * Configuração central do ArcGIS.
 * Alterar URLs, campos ou o id do webmap só aqui.
 */

/** Versão instalada do @arcgis/core. Tem de coincidir com o package.json. */
export const ARCGIS_VERSION = "4.31";

/** Webmap do ArcGIS Online que define o mapa base e a simbologia. */
export const WEBMAP_ID = "56676e3af62748e29429492cafb1ed23";

const BASE = "https://services-eu1.arcgis.com/7r9gTPdSG9MPi1LZ/arcgis/rest/services";

export const CAMPO_ESTADO = "Estado";
export const CAMPO_VALIDACAO = "Validacao";
export const CAMPO_AOI = "AOI";

export interface CamadaConfig {
    id: string;
    titulo: string;
    url: string;
    /** Visibilidade inicial no mapa. Omitido = visível. */
    visivelPorOmissao?: boolean;
    /**
     * Campo pelo qual o renderer do webmap colore esta camada.
     * Só as camadas de edifícios o têm; os contornos ficam sem.
     */
    campoSimbologia?: typeof CAMPO_VALIDACAO | typeof CAMPO_ESTADO;
}

/**
 * Camada que alimenta filtros e indicadores.
 * É a de Boavista & Porto Seco — a de Sambizanga tem AOI, Tipologia,
 * T_Constru e Afetacao por preencher, logo não serve para filtrar.
 */
export const CAMADA_DADOS: CamadaConfig = {
    id: "residencias-em-risco",
    titulo: "Edifícios — Boavista & Porto Seco",
    url: `${BASE}/RESIDENCIAS_EM_RISCO/FeatureServer/0`,
    campoSimbologia: CAMPO_VALIDACAO,
};

/** Segundo levantamento. Não tem o campo Validacao; o renderer usa Estado. */
export const CAMADA_SAMBIZANGA: CamadaConfig = {
    id: "edificios-sambizanga",
    titulo: "Edifícios — Sambizanga",
    url: `${BASE}/Residencias_em_Risco_Sambizanga/FeatureServer/0`,
    visivelPorOmissao: false,
    campoSimbologia: CAMPO_ESTADO,
};

/** Contornos de área, 1 polígono cada. Enquadramento, não dados. */
export const CAMADAS_LIMITE: CamadaConfig[] = [
    { id: "boavista", titulo: "Boavista", url: `${BASE}/Boavista/FeatureServer/0` },
    { id: "porto-seco-mulemba", titulo: "Porto Seco da Mulemba", url: `${BASE}/Porto_Seco_Mulemba/FeatureServer/0` },
];

export const CAMADAS: CamadaConfig[] = [CAMADA_DADOS, CAMADA_SAMBIZANGA, ...CAMADAS_LIMITE];

/** Camadas de edifícios — só uma fica visível de cada vez, conforme a área escolhida. */
export const CAMADAS_EDIFICIOS: CamadaConfig[] = [CAMADA_DADOS, CAMADA_SAMBIZANGA];

export interface AreaConfig {
    id: string;
    label: string;
    /** Camada a mostrar e a consultar quando esta área está escolhida. */
    camadaId: string;
    /** Valor de AOI a filtrar dentro dessa camada. Ausente = a camada inteira. */
    aoi?: string;
}

/**
 * As áreas não vivem todas no mesmo sítio: Boavista e Porto Seco são valores
 * do campo AOI numa camada; Sambizanga é uma camada à parte, cujo AOI está vazio.
 * Este mapeamento esconde essa diferença da interface.
 */
export const AREAS: AreaConfig[] = [
    { id: "boavista", label: "Boavista", camadaId: CAMADA_DADOS.id, aoi: "Boavista" },
    { id: "sambizanga", label: "Sambizanga", camadaId: CAMADA_SAMBIZANGA.id },
    // Porto Seco da Mulemba existe no campo AOI e continua a ser desenhado no mapa,
    // mas foi retirado da lista de áreas a pedido. Para o repor, basta descomentar:
    // { id: "porto-seco", label: "Porto Seco da Mulemba", camadaId: CAMADA_DADOS.id, aoi: "Porto Seco da Mulemba" },
];

export interface FiltroConfig {
    id: string;
    label: string;
    campo: string;
}

/**
 * Filtros da aba lateral, por ordem de apresentação.
 * A ÁREA não está aqui: é escolhida à parte, por `AREAS`, porque pode implicar
 * trocar de camada e não apenas filtrar um campo.
 */
export const FILTROS: FiltroConfig[] = [
    { id: "bairro", label: "BAIRRO", campo: "Bairro" },
    { id: "tipologia", label: "TIPOLOGIA", campo: "Tipologia" },
    { id: "construcao", label: "TIPO DE CONSTRUÇÃO", campo: "T_Constru" },
    { id: "afetacao", label: "AFETAÇÃO", campo: "Afetacao" },
];

export interface ContagemConfig {
    valor: number;
    label: string;
    cor: string;
}

/**
 * Domínio do campo Estado.
 * Cores tiradas do renderer da camada "Edifícios — Sambizanga" no webmap:
 * é essa que o mapa desenha por Estado.
 */
export const ESTADOS: ContagemConfig[] = [
    { valor: 0, label: "Não Inscritos", cor: "#f0270c" },
    { valor: 1, label: "Pendente", cor: "#e1da14" },
    { valor: 2, label: "Inscritos", cor: "#5dd618" },
];

/**
 * Domínio do campo Validacao — 0: Outros, 1: Primária, 2: Secundária.
 * Cores tiradas do renderer de `CAMADA_DADOS` no webmap; "Outros" é o símbolo por omissão.
 */
export const VALIDACOES: ContagemConfig[] = [
    { valor: 1, label: "Primária", cor: "#fd7f6f" },
    { valor: 2, label: "Secundária", cor: "#7eb0d5" },
    { valor: 0, label: "Outros", cor: "#999999" },
];

/** Duplica plicas — o where vai para SQL do lado do servidor. */
export function escaparSql(valor: string): string {
    return valor.replace(/'/g, "''");
}

/**
 * Constrói a cláusula where a partir das seleções (campo → valor).
 * `ignorar` exclui um campo, para listar as suas próprias opções sem se auto-filtrar.
 */
export function construirWhere(selecoes: Record<string, string>, ignorar?: string): string {
    const partes = Object.entries(selecoes)
        .filter(([campo, valor]) => valor && campo !== ignorar)
        .map(([campo, valor]) => `${campo} = '${escaparSql(valor)}'`);

    return partes.length ? partes.join(" AND ") : "1=1";
}

/** Junta uma condição ao where, sem deixar o "1=1" pendurado. */
export function comCondicao(where: string, condicao: string): string {
    return where === "1=1" ? condicao : `${where} AND ${condicao}`;
}

/** Normaliza um URL de serviço para comparação (sem barra final, minúsculas). */
export function normalizarUrl(url: string): string {
    return url.replace(/\/+$/, "").toLowerCase();
}

/**
 * O ArcGIS guarda o URL do serviço em `url` e o índice da camada em `layerId`.
 * Junta os dois para poder comparar com os URLs configurados acima.
 */
export function urlCompletaDaCamada(camada: { url?: string | null; layerId?: number | null }): string | null {
    if (!camada.url) return null;

    const base = camada.url.replace(/\/+$/, "");

    return camada.layerId == null ? base : `${base}/${camada.layerId}`;
}

const FORMATADOR = new Intl.NumberFormat("pt-PT");

export function formatarNumero(valor: number): string {
    return FORMATADOR.format(valor);
}
