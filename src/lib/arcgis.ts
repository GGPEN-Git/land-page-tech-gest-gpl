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

/**
 * Bairros das "Novas Áreas".
 *
 * Estes registos vivem na mesma camada que Boavista, mas com o `AOI` a espaço —
 * não é por `AOI` que se distinguem, é pelo bairro. Os nomes têm de estar
 * escritos como estão gravados: `Molhada Q.7` não tem espaço depois do ponto.
 */
export const BAIRROS_NOVAS_AREAS = ["Edipesca", "Molhada Q.7"];

export const FILTRO_NOVAS_AREAS = `${CAMPO_BAIRRO} IN (${BAIRROS_NOVAS_AREAS.map(
    (b) => `'${escaparSql(b)}'`,
).join(", ")})`;

export const FILTRO_BOAVISTA = `${CAMPO_AOI} = 'Boavista'`;

/**
 * Camada principal: Boavista, e com ela Edipesca e Molhada Q.7.
 *
 * Esses dois bairros existem nas duas camadas, com os mesmos registos. São
 * lidos por esta, e o `filtroBase` da de Sambizanga larga-os. Fora ficam ainda
 * o Porto Seco da Mulemba (bairro Mulembeira), os registos sem bairro e o
 * único `Pedreira S1` perdido nesta camada.
 */
export const CAMADA_DADOS: CamadaConfig = {
    id: "residencias-em-risco",
    titulo: "Edifícios — Boavista",
    url: `${BASE}/RESIDENCIAS_EM_RISCO/FeatureServer/0`,
    campoSimbologia: CAMPO_ESTADO,
    filtroBase: `(${FILTRO_BOAVISTA} OR ${FILTRO_NOVAS_AREAS})`,
};

/**
 * Segundo levantamento, com estrutura própria.
 *
 * O `filtroBase` larga Edipesca e Molhada Q.7: esses bairros existem nas duas
 * camadas, com os mesmos registos, e passaram a ser lidos pela de Boavista.
 * Sem isto seriam contados a dobrar sempre que as duas camadas estão ativas.
 */
export const CAMADA_SAMBIZANGA: CamadaConfig = {
    id: "edificios-sambizanga",
    titulo: "Edifícios — Sambizanga",
    url: `${BASE}/Residencias_em_Risco_Sambizanga/FeatureServer/0`,
    visivelPorOmissao: false,
    campoSimbologia: CAMPO_ESTADO,
    filtroBase: `${CAMPO_BAIRRO} NOT IN (${BAIRROS_NOVAS_AREAS.map((b) => `'${escaparSql(b)}'`).join(", ")})`,
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
}

/**
 * Cada área é uma camada; quem as delimita é o `filtroBase` de cada uma. Não há
 * aqui filtro nenhum de propósito — Edipesca e Molhada Q.7 entram em Boavista
 * porque a camada de Boavista os inclui, e saem de Sambizanga porque a dela os
 * exclui. As duas regras vivem uma ao lado da outra, junto às camadas.
 */
export const AREAS: AreaConfig[] = [
    { id: "boavista", label: "Boavista", camadaId: CAMADA_DADOS.id },
    { id: "sambizanga", label: "Sambizanga e novas áreas", camadaId: CAMADA_SAMBIZANGA.id },
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
