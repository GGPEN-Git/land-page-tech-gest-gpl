import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import { CAMPO_CONTROLO, COR_POR_OMISSAO, CONTROLOS, SEM_MARCACAO, type ContagemConfig } from "./arcgis";

function preenchimento(cor: string) {
    return new SimpleFillSymbol({
        color: cor,
        outline: new SimpleLineSymbol({ color: [255, 255, 255, 0.35], width: 0.4 }),
    });
}

/**
 * Constrói um renderer por valor único a partir das mesmas constantes que
 * alimentam a legenda — assim as cores do painel e as do mapa nunca divergem.
 *
 * Os valores vão como texto porque é assim que o webmap os declara, mesmo
 * tratando-se de campos inteiros.
 */
/** Forma mínima de um UniqueValueRenderer, para o conseguirmos inspecionar sem `any`. */
interface SimboloComCor {
    color?: { toHex?: () => string } | null;
}

interface RendererValorUnico {
    type?: string;
    field?: string;
    defaultSymbol?: SimboloComCor | null;
    uniqueValueInfos?: { value?: unknown; label?: string; symbol?: SimboloComCor | null }[];
}

export interface LegendaLida {
    campo: string | null;
    /** Valor (como texto) → cor em hexadecimal. */
    cores: Record<string, string>;
    /** Valor (como texto) → rótulo tal como está definido no renderer. */
    rotulos: Record<string, string>;
    corOmissao: string | null;
}

function hexDe(simbolo?: SimboloComCor | null): string | null {
    const hex = simbolo?.color?.toHex?.();
    return hex || null;
}

/**
 * Lê as cores que a camada está mesmo a usar, em vez de assumir as nossas constantes.
 * Assim a legenda continua verdadeira quando a simbologia vem do webmap e alguém
 * a altera no ArcGIS Online.
 */
export function lerLegenda(renderer: unknown): LegendaLida {
    const r = renderer as RendererValorUnico | null;

    if (!r || r.type !== "unique-value") {
        return { campo: null, cores: {}, rotulos: {}, corOmissao: null };
    }

    const cores: Record<string, string> = {};
    const rotulos: Record<string, string> = {};

    for (const info of r.uniqueValueInfos || []) {
        if (info.value === undefined || info.value === null) continue;

        const chave = String(info.value);
        const hex = hexDe(info.symbol);

        if (hex) cores[chave] = hex;
        if (info.label) rotulos[chave] = info.label;
    }

    return { campo: r.field || null, cores, rotulos, corOmissao: hexDe(r.defaultSymbol) };
}

/**
 * Simbologia do modo Controlo, por `GGPEN_Controlo`.
 *
 * O símbolo por omissão é "Sem análise" — os registos a `null`, em que ninguém
 * tocou. Os três estados atribuíveis, incluindo "Por verificar", são valores únicos.
 */
export function criarRendererControlo() {
    return new UniqueValueRenderer({
        field: CAMPO_CONTROLO,
        defaultSymbol: preenchimento(SEM_MARCACAO.cor),
        defaultLabel: SEM_MARCACAO.label,
        uniqueValueInfos: CONTROLOS.map((c) => ({
            value: String(c.valor),
            label: c.label,
            symbol: preenchimento(c.cor),
        })),
    });
}

export function criarRenderer(campo: string, valores: ContagemConfig[]) {
    return new UniqueValueRenderer({
        field: campo,
        defaultSymbol: preenchimento(COR_POR_OMISSAO),
        defaultLabel: "Sem valor",
        uniqueValueInfos: valores.map((v) => ({
            value: String(v.valor),
            label: v.label,
            symbol: preenchimento(v.cor),
        })),
    });
}
