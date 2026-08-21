/**
 * Módulo Luanda — configuração própria, independente de `lib/arcgis.ts`.
 */

/** Webmap próprio: fundo topográfico. */
export const WEBMAP_LUANDA = "6b9f7d26963d439aa499c1fc66fa55de";

/** Item do serviço no portal. Guardado para referência; o código usa o URL. */
export const ITEM_LUANDA = "f627b4b8f23c46048d2782b8970dd198";

const BASE = "https://services-eu1.arcgis.com/7r9gTPdSG9MPi1LZ/arcgis/rest/services";

export const CAMPO_INSCRICAO = "Inscricao";

/**
 * Bairros do levantamento, tal como estão escritos na camada.
 *
 * Não se filtra por município: estes onze estão repartidos por **dois** —
 * seis em Sambizanga e cinco em Ingombota. Filtrar por `Municipio` traria
 * 21 bairros a mais e deixaria 5 de fora.
 *
 * A grafia tem de bater certo ao caractere: repare em "Kimbaria Q 3" sem ponto
 * e em "Molhada Q.7" sem espaço.
 */
export const BAIRROS_LUANDA = [
    "Boa Vista Q. 11",
    "Caranguejo Q. 2",
    "Edipesca",
    "Kimbaria Q 3",
    "Landilson Q. 1",
    "Madeira S3",
    "Molhada Q.7",
    "Morro dos Bois S5",
    "Pedreira S1",
    "Roque Santeiro S4",
    "Seriango Q. 10",
];

/**
 * Restrição fixa da camada: entra em todas as consultas — mapa, contagens e
 * opções dos filtros — e a interface não a consegue remover.
 */
export const FILTRO_BASE_LUANDA = `Bairro IN (${BAIRROS_LUANDA.map((b) => `'${b.replace(/'/g, "''")}'`).join(", ")})`;

export const CAMADA_LUANDA = {
    id: "luanda-nova",
    titulo: "Bairros do levantamento",
    url: `${BASE}/Luanda_Nova_gdb/FeatureServer/0`,
    filtroBase: FILTRO_BASE_LUANDA,
};

export interface FiltroLuanda {
    id: string;
    label: string;
    campo: string;
}

/** Município continua a fazer sentido: os bairros repartem-se por dois. */
export const FILTROS_LUANDA: FiltroLuanda[] = [
    { id: "municipio", label: "MUNICÍPIO", campo: "Municipio" },
    { id: "comuna", label: "COMUNA", campo: "Comuna" },
    { id: "bairro", label: "BAIRRO", campo: "Bairro" },
    { id: "afetacao", label: "AFETAÇÃO", campo: "Afetacao" },
];

export interface ValorContagem {
    valor: number;
    label: string;
    cor: string;
}

/**
 * Valores de `Inscricao`, com as cores do renderer do webmap.
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
