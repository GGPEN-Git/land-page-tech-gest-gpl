/**
 * Configuração central do ArcGIS.
 * Alterar URLs, campos ou o id do webmap só aqui.
 */

/** Versão instalada do @arcgis/core. Tem de coincidir com o package.json. */
export const ARCGIS_VERSION = "4.31";

/** Webmap do ArcGIS Online que define o mapa base e a simbologia. */
export const WEBMAP_ID = "56676e3af62748e29429492cafb1ed23";

const BASE = "https://services-eu1.arcgis.com/7r9gTPdSG9MPi1LZ/arcgis/rest/services";

export const CAMPO_AOI = "AOI";
export const CAMPO_BAIRRO = "Bairro";
export const CAMPO_ESTADO = "Estado";
export const CAMPO_VALIDACAO = "Validacao";
/**
 * O campo de controlo não tem o mesmo nome nas duas camadas: republicar a partir
 * de um shapefile trunca os nomes a 10 caracteres, e foi o que aconteceu a
 * `RESIDENCIAS_EM_RISCO`. Procura-se por esta ordem, e usa-se o que existir.
 */
export const CAMPOS_CONTROLO = ["GGPEN_Controlo", "GGPEN_Cont"];

/** Devolve o nome do campo de controlo nesta camada, ou null se não o tiver. */
export function campoControloDe(campos?: { name: string }[] | null): string | null {
    if (!campos) return null;

    return CAMPOS_CONTROLO.find((nome) => campos.some((c) => c.name === nome)) || null;
}

export interface CamadaConfig {
    id: string;
    titulo: string;
    url: string;
    /** Visibilidade inicial no mapa. Omitido = visível. */
    visivelPorOmissao?: boolean;
    /** Campo pelo qual a camada é classificada. Só as de edifícios o têm. */
    campoSimbologia?: string;
    /** Condição SQL aplicada sempre, antes de qualquer filtro do utilizador. */
    filtroBase?: string;
}

/** Camada principal: edifícios de Boavista. */
export const CAMADA_DADOS: CamadaConfig = {
    id: "residencias-em-risco",
    titulo: "Edifícios — Boavista",
    url: `${BASE}/RESIDENCIAS_EM_RISCO/FeatureServer/0`,
    campoSimbologia: CAMPO_ESTADO,
    // Porto Seco da Mulemba e os registos com AOI em branco ficam de fora.
    filtroBase: `${CAMPO_AOI} = 'Boavista'`,
};

/**
 * Bairros da área "Novas Áreas". A camada tem oito; só estes três entram.
 *
 * Os nomes têm de ser escritos como estão gravados — `Molhada Q.7` não tem
 * espaço depois do ponto e `Madeira S3` não tem ponto nenhum.
 */
export const BAIRROS_NOVAS_AREAS = ["Edipesca", "Madeira S3", "Molhada Q.7"];

/** Segundo levantamento, com estrutura própria. */
export const CAMADA_SAMBIZANGA: CamadaConfig = {
    id: "edificios-sambizanga",
    titulo: "Edifícios — Novas Áreas",
    url: `${BASE}/Residencias_em_Risco_Sambizanga/FeatureServer/0`,
    visivelPorOmissao: false,
    campoSimbologia: CAMPO_ESTADO,
    // Pedreira, Roque Santeiro, Morro dos Bois, Boa Vista Q. 11 e Seriango
    // ficam de fora — nem no mapa, nem nos filtros, nem nas contagens.
    filtroBase: `${CAMPO_BAIRRO} IN (${BAIRROS_NOVAS_AREAS.map((b) => `'${escaparSql(b)}'`).join(", ")})`,
};

/** Contornos de área, 1 polígono cada. Enquadramento, não dados. */
export const CAMADAS_LIMITE: CamadaConfig[] = [
    { id: "boavista", titulo: "Boavista", url: `${BASE}/Boavista/FeatureServer/0` },
    {
        id: "porto-seco-mulemba",
        titulo: "Porto Seco da Mulemba",
        url: `${BASE}/Porto_Seco_Mulemba/FeatureServer/0`,
        // Porto Seco está fora do painel: os edifícios pelo filtroBase, o contorno aqui.
        visivelPorOmissao: false,
    },
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
 * As áreas não vivem todas no mesmo sítio: Boavista é um valor do campo AOI numa
 * camada; Sambizanga é uma camada à parte, cujo AOI está vazio.
 */
export const AREAS: AreaConfig[] = [
    { id: "boavista", label: "Boavista", camadaId: CAMADA_DADOS.id, aoi: "Boavista" },
    { id: "sambizanga", label: "Novas Áreas", camadaId: CAMADA_SAMBIZANGA.id },
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

/** Símbolo por omissão dos renderers: o que não encaixa em nenhum valor conhecido. */
export const COR_POR_OMISSAO = "#999999";

/** Domínio do campo Estado, tal como definido no serviço. */
export const ESTADOS: ContagemConfig[] = [
    { valor: 0, label: "Não Inscritos", cor: "#f0270c" },
    { valor: 1, label: "Pendente", cor: "#e1da14" },
    { valor: 2, label: "Inscritos", cor: "#5dd618" },
];

/** Domínio do campo Validacao — mantido para referência; sem modo próprio na UI. */
export const VALIDACOES: ContagemConfig[] = [
    { valor: 1, label: "Primária", cor: "#fd7f6f" },
    { valor: 2, label: "Secundária", cor: "#7eb0d5" },
    { valor: 0, label: "Outros", cor: "#999999" },
];

/**
 * Controlo de verificação, gravado em `GGPEN_Controlo`. O campo não tem domínio
 * no portal, por isso os códigos são convenção nossa.
 *
 * "Por verificar" é o estado de partida e também o de quem viu o polígono e o
 * deixou para uma segunda passagem — inclui os registos a `null`.
 */
export const VALOR_POR_VERIFICAR = 0;
export const VALOR_VALIDADO = 1;
export const VALOR_NAO_VALIDADO = 2;

export const CONTROLOS: ContagemConfig[] = [
    { valor: VALOR_VALIDADO, label: "Validado", cor: "#16a34a" },
    { valor: VALOR_NAO_VALIDADO, label: "Não validado", cor: "#dc2626" },
    { valor: VALOR_POR_VERIFICAR, label: "Por verificar", cor: "#ffd166" },
];

/** "Por verificar" apanha o zero e o nulo. O campo varia conforme a camada. */
export function condicaoControlo(campo: string, valor: number): string {
    return valor === VALOR_POR_VERIFICAR
        ? `(${campo} IS NULL OR ${campo} = ${VALOR_POR_VERIFICAR})`
        : `${campo} = ${valor}`;
}

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
