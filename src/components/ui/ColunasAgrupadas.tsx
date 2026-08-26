import { useEffect, useRef, useState } from "react";
import { formatarNumero } from "../../lib/arcgis";
import { ESPESSURA_MAXIMA, FOLGA, SERIES, colunaArredondada, escalaLimpa } from "../../lib/graficos";

export interface SerieGrafico {
    nome: string;
    /** Um valor por categoria, pela mesma ordem. */
    valores: number[];
}

interface ColunasAgrupadasProps {
    categorias: string[];
    series: SerieGrafico[];
}

const ALTURA = 280;
const MARGEM = { topo: 12, direita: 12, baixo: 40, esquerda: 56 };

/**
 * Colunas agrupadas para comparar duas grandezas pelas mesmas categorias.
 *
 * Um eixo só. Duas grandezas de escalas diferentes nunca partilham este
 * gráfico — seriam dois gráficos, não dois eixos.
 *
 * O desenho é feito à largura medida do contentor, e não com um `viewBox`
 * elástico: com escala, uma coluna de 24px sai com 43 e o texto do eixo cresce
 * na mesma proporção, ficando maior do que o resto da página.
 */
export function ColunasAgrupadas({ categorias, series }: ColunasAgrupadasProps) {
    const contentor = useRef<HTMLDivElement>(null);
    const [largura, setLargura] = useState(0);

    useEffect(() => {
        const elemento = contentor.current;
        if (!elemento) return;

        const observador = new ResizeObserver(([entrada]) => setLargura(entrada.contentRect.width));
        observador.observe(elemento);

        return () => observador.disconnect();
    }, []);

    const plotLargura = Math.max(0, largura - MARGEM.esquerda - MARGEM.direita);
    const plotAltura = ALTURA - MARGEM.topo - MARGEM.baixo;

    const maximo = Math.max(0, ...series.flatMap((s) => s.valores));
    const { topo, marcas } = escalaLimpa(maximo);

    const banda = plotLargura / Math.max(1, categorias.length);
    const larguraGrupo = Math.min(banda * 0.6, series.length * ESPESSURA_MAXIMA + (series.length - 1) * FOLGA);
    const espessura = Math.max(1, (larguraGrupo - FOLGA * (series.length - 1)) / series.length);

    const y = (valor: number) => MARGEM.topo + plotAltura - (valor / topo) * plotAltura;

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1">
                {series.map((serie, i) => (
                    <span key={serie.nome} className="flex items-center gap-2 text-xs text-stone-600">
                        <span
                            className="h-2.5 w-2.5 rounded-sm"
                            style={{ backgroundColor: SERIES[i % SERIES.length] }}
                            aria-hidden="true"
                        />
                        {serie.nome}
                    </span>
                ))}
            </div>

            <div ref={contentor} style={{ height: ALTURA }}>
                {largura > 0 && (
                    <svg
                        width={largura}
                        height={ALTURA}
                        // Ao imprimir, a página é mais estreita do que o ecrã e o
                        // `ResizeObserver` já não chega a tempo — assim encolhe sozinho.
                        style={{ maxWidth: "100%", height: "auto" }}
                        role="img"
                        aria-label={`Colunas agrupadas por ${categorias.join(", ")}`}
                    >
                        {marcas.map((marca) => (
                            <g key={marca}>
                                <line
                                    x1={MARGEM.esquerda}
                                    x2={largura - MARGEM.direita}
                                    y1={y(marca)}
                                    y2={y(marca)}
                                    stroke={marca === 0 ? "#d6d3d1" : "#ececea"}
                                    strokeWidth={1}
                                />
                                <text
                                    x={MARGEM.esquerda - 10}
                                    y={y(marca) + 4}
                                    textAnchor="end"
                                    fontSize={12}
                                    fill="#78716c"
                                    style={{ fontVariantNumeric: "tabular-nums" }}
                                >
                                    {formatarNumero(marca)}
                                </text>
                            </g>
                        ))}

                        {categorias.map((categoria, c) => {
                            const centro = MARGEM.esquerda + banda * c + banda / 2;
                            const inicio = centro - larguraGrupo / 2;

                            return (
                                <g key={categoria}>
                                    {series.map((serie, s) => {
                                        const valor = serie.valores[c] ?? 0;

                                        return (
                                            <path
                                                key={serie.nome}
                                                d={colunaArredondada(
                                                    inicio + s * (espessura + FOLGA),
                                                    y(valor),
                                                    espessura,
                                                    (valor / topo) * plotAltura,
                                                )}
                                                fill={SERIES[s % SERIES.length]}
                                            >
                                                <title>{`${categoria} · ${serie.nome}: ${formatarNumero(valor)}`}</title>
                                            </path>
                                        );
                                    })}

                                    <text
                                        x={centro}
                                        y={ALTURA - MARGEM.baixo + 22}
                                        textAnchor="middle"
                                        fontSize={12}
                                        fill="#57534e"
                                    >
                                        {categoria}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>
                )}
            </div>
        </div>
    );
}
