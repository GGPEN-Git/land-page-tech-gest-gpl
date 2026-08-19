/**
 * Módulo Luanda — configuração própria, independente de `lib/arcgis.ts`.
 *
 * Webmap, camada, campos e filtros são só deste módulo. Nada aqui é usado pelo
 * painel principal, e nada do painel principal é usado aqui a não ser os
 * utilitários de SQL e de formatação, que são genéricos.
 */

/** Webmap próprio: fundo topográfico, enquadramento de toda a província. */
export const WEBMAP_LUANDA = "6b9f7d26963d439aa499c1fc66fa55de";

/** Item do serviço no portal. Guardado para referência; o código usa o URL. */
export const ITEM_LUANDA = "f627b4b8f23c46048d2782b8970dd198";

const BASE = "https://services-eu1.arcgis.com/7r9gTPdSG9MPi1LZ/arcgis/rest/services";

/** Camada única: 2 066 168 polígonos, toda a Luanda. */
export const URL_LUANDA = `${BASE}/Luanda_Nova_gdb/FeatureServer/0`;
export const ID_CAMADA_LUANDA = "luanda-nova";
export const TITULO_LUANDA = "Luanda";

export const CAMPO_INSCRICAO = "Inscricao";

export interface FiltroLuanda {
    id: string;
    label: string;
    campo: string;
}

/**
 * Esta camada não tem AOI nem Estado; a divisão faz-se pela hierarquia
 * administrativa, que é o que ela traz preenchido.
 */
export const FILTROS_LUANDA: FiltroLuanda[] = [
    { id: "municipio", label: "MUNICÍPIO", campo: "Municipio" },
    { id: "comuna", label: "COMUNA", campo: "Comuna" },
    { id: "bairro", label: "BAIRRO", campo: "Bairro" },
    { id: "afetacao", label: "AFETAÇÃO", campo: "Afetacao" },
];

export interface ValorInscricao {
    valor: number;
    label: string;
    cor: string;
}

/**
 * Valores de `Inscricao`, com as cores do renderer do webmap.
 *
 * O serviço **não define domínio** para este campo, por isso os rótulos são os
 * próprios códigos — é também o que o portal mostra. Quando souber o significado
 * de cada um, basta trocar os `label` aqui.
 */
export const INSCRICOES: ValorInscricao[] = [
    { valor: 0, label: "0", cor: "#ed5151" },
    { valor: 1, label: "1", cor: "#9e559c" },
    { valor: 2, label: "2", cor: "#149ece" },
    { valor: 3, label: "3", cor: "#f789d8" },
    { valor: 6, label: "6", cor: "#a7c636" },
    { valor: 7, label: "7", cor: "#ffde3e" },
    { valor: 8, label: "8", cor: "#fc921f" },
];
