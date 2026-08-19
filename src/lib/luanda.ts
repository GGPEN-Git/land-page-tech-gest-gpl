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
 * A camada tem 2 066 168 polígonos de toda a província. O módulo trata apenas
 * do município de Sambizanga — que inclui o bairro Boa Vista Q. 11 — e por isso
 * a restrição é fixa: entra em todas as consultas e a interface não a remove.
 */
export const FILTRO_BASE_LUANDA = "Municipio = 'Sambizanga'";

export const CAMADA_LUANDA = {
    id: "luanda-nova",
    titulo: "Sambizanga",
    url: `${BASE}/Luanda_Nova_gdb/FeatureServer/0`,
    filtroBase: FILTRO_BASE_LUANDA,
};

export interface FiltroLuanda {
    id: string;
    label: string;
    campo: string;
}

/**
 * Sem Município: está fixo em Sambizanga pelo filtro de base, e um menu com uma
 * única opção não serve para nada.
 */
export const FILTROS_LUANDA: FiltroLuanda[] = [
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
