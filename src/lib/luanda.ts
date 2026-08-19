/**
 * Módulo Luanda — configuração própria, independente de `lib/arcgis.ts`.
 *
 * Tem três áreas, e cada uma traz a sua camada, os seus filtros e o seu campo de
 * contagem: as camadas não partilham a mesma ficha de campos, por isso não há um
 * conjunto de filtros comum a todas.
 */

/** Webmap próprio: fundo topográfico, enquadramento de toda a província. */
export const WEBMAP_LUANDA = "6b9f7d26963d439aa499c1fc66fa55de";

/** Item do serviço de Luanda no portal. Guardado para referência; o código usa o URL. */
export const ITEM_LUANDA = "f627b4b8f23c46048d2782b8970dd198";

const BASE = "https://services-eu1.arcgis.com/7r9gTPdSG9MPi1LZ/arcgis/rest/services";

export interface FiltroLuanda {
    id: string;
    label: string;
    campo: string;
}

export interface ValorContagem {
    valor: number;
    label: string;
    cor: string;
}

export interface CamadaModulo {
    id: string;
    titulo: string;
    url: string;
    /** Condição SQL aplicada sempre, antes de qualquer filtro do utilizador. */
    filtroBase?: string;
}

export interface AreaModulo {
    id: string;
    label: string;
    camada: CamadaModulo;
    filtros: FiltroLuanda[];
    /** Campo inteiro por que se conta e se pode colorir. */
    campoContagem: string;
    valores: ValorContagem[];
}

/**
 * Valores de `Inscricao` na camada de Luanda, com as cores do renderer do webmap.
 * O serviço não define domínio, por isso os rótulos são os próprios códigos.
 */
export const INSCRICOES: ValorContagem[] = [
    { valor: 0, label: "0", cor: "#ed5151" },
    { valor: 1, label: "1", cor: "#9e559c" },
    { valor: 2, label: "2", cor: "#149ece" },
    { valor: 3, label: "3", cor: "#f789d8" },
    { valor: 6, label: "6", cor: "#a7c636" },
    { valor: 7, label: "7", cor: "#ffde3e" },
    { valor: 8, label: "8", cor: "#fc921f" },
];

/** Domínio do campo Estado nas camadas de levantamento. */
export const ESTADOS: ValorContagem[] = [
    { valor: 0, label: "Não Inscritos", cor: "#f0270c" },
    { valor: 1, label: "Pendente", cor: "#e1da14" },
    { valor: 2, label: "Inscritos", cor: "#5dd618" },
];

/** Filtros das camadas de levantamento, que partilham a mesma ficha. */
const FILTROS_LEVANTAMENTO: FiltroLuanda[] = [
    { id: "bairro", label: "BAIRRO", campo: "Bairro" },
    { id: "tipologia", label: "TIPOLOGIA", campo: "Tipologia" },
    { id: "construcao", label: "TIPO DE CONSTRUÇÃO", campo: "T_Constru" },
    { id: "afetacao", label: "AFETAÇÃO", campo: "Afetacao" },
];

export const AREAS_LUANDA: AreaModulo[] = [
    {
        id: "luanda",
        label: "Luanda",
        camada: {
            id: "luanda-nova",
            titulo: "Luanda",
            url: `${BASE}/Luanda_Nova_gdb/FeatureServer/0`,
        },
        // Sem AOI: a divisão é pela hierarquia administrativa.
        filtros: [
            { id: "municipio", label: "MUNICÍPIO", campo: "Municipio" },
            { id: "comuna", label: "COMUNA", campo: "Comuna" },
            { id: "bairro", label: "BAIRRO", campo: "Bairro" },
            { id: "afetacao", label: "AFETAÇÃO", campo: "Afetacao" },
        ],
        campoContagem: "Inscricao",
        valores: INSCRICOES,
    },
    {
        id: "boavista",
        label: "Boavista",
        camada: {
            id: "residencias-em-risco",
            titulo: "Edifícios — Boavista",
            url: `${BASE}/RESIDENCIAS_EM_RISCO/FeatureServer/0`,
            // A camada tem também Porto Seco e registos sem AOI; aqui só Boavista.
            filtroBase: "AOI = 'Boavista'",
        },
        filtros: FILTROS_LEVANTAMENTO,
        campoContagem: "Estado",
        valores: ESTADOS,
    },
    {
        id: "sambizanga",
        label: "Sambizanga e novas áreas",
        camada: {
            id: "edificios-sambizanga",
            titulo: "Edifícios — Sambizanga",
            url: `${BASE}/Residencias_em_Risco_Sambizanga/FeatureServer/0`,
        },
        filtros: FILTROS_LEVANTAMENTO,
        campoContagem: "Estado",
        valores: ESTADOS,
    },
];

/** Todas as camadas do módulo, para o mapa as carregar de uma vez. */
export const CAMADAS_MODULO: CamadaModulo[] = AREAS_LUANDA.map((a) => a.camada);
