import UniqueValueRenderer from "@arcgis/core/renderers/UniqueValueRenderer";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import { COR_POR_OMISSAO, CONTROLOS, VALOR_POR_VERIFICAR, type ContagemConfig } from "./arcgis";
import { CONFORMIDADES, expressaoConformidade } from "./conformidade";

/**
 * Preenchimento a cheio, como antes, mas com o contorno da mesma cor e da
 * espessura do webmap — antes era um branco fino que destoava do resto do mapa.
 */
function preenchimento(cor: string) {
    return new SimpleFillSymbol({
        color: cor,
        outline: new SimpleLineSymbol({ color: cor, width: 1.8 }),
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
 * Simbologia do modo Controlo, com dois eixos ao mesmo tempo:
 *
 * - **preenchimento** = estado de controlo (`GGPEN_Controlo`), que é o que se marca
 * - **contorno** = diagnóstico automático, nas cores da expressão do webmap
 *
 * Como o diagnóstico não é um campo mas uma expressão, o renderer classifica por
 * `valueExpression` e há um símbolo por cada combinação das duas.
 */
export function criarRendererControlo(campoControlo: string) {
    const infos = [];

    for (const conformidade of CONFORMIDADES) {
        for (const controlo of CONTROLOS) {
            infos.push({
                value: `${conformidade.id}|${controlo.valor}`,
                label: `${controlo.label} · ${conformidade.resumo}`,
                symbol: new SimpleFillSymbol({
                    color: controlo.cor,
                    outline: new SimpleLineSymbol({ color: conformidade.cor, width: 1.8 }),
                }),
            });
        }
    }

    const porVerificar = CONTROLOS.find((c) => c.valor === VALOR_POR_VERIFICAR);

    return new UniqueValueRenderer({
        valueExpression: expressaoConformidade(campoControlo),
        valueExpressionTitle: "Controlo e conformidade",
        // Rede de segurança: uma combinação nova cai aqui em vez de desaparecer.
        defaultSymbol: preenchimento(porVerificar?.cor || COR_POR_OMISSAO),
        defaultLabel: porVerificar?.label || "Por verificar",
        uniqueValueInfos: infos,
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
