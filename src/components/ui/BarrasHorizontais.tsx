import { formatarNumero } from "../../lib/arcgis";
import { SERIES } from "../../lib/graficos";

interface BarrasHorizontaisProps {
    itens: { chave: string; total: number }[];
    /** Base das percentagens. Sem ela mostra-se só o valor absoluto. */
    base?: number;
    cor?: string;
}

/**
 * Barras horizontais de uma série só.
 *
 * Uma série, uma cor: o comprimento já diz o valor, e pintar cada barra de
 * cor diferente gastaria o canal da identidade a repetir o que se vê.
 *
 * As barras vão até 78% da área útil para o valor caber sempre a seguir à
 * ponta. Como o fator é o mesmo para todas, a proporção mantém-se.
 */
export function BarrasHorizontais({ itens, base, cor = SERIES[0] }: BarrasHorizontaisProps) {
    const maximo = itens.reduce((maior, i) => Math.max(maior, i.total), 0) || 1;

    return (
        <div className="space-y-2">
            {itens.map((item) => {
                const parte = base ? ((item.total / base) * 100).toFixed(1).replace(".", ",") + "%" : null;

                return (
                    <div
                        key={item.chave}
                        className="flex items-center gap-3"
                        title={`${item.chave}: ${formatarNumero(item.total)}${parte ? ` (${parte})` : ""}`}
                    >
                        {/* Sem truncar: rótulos como "T5 e superiores / s. inf." partem-se em
                            duas linhas, que é melhor do que aparecerem cortados. */}
                        <span className="w-28 shrink-0 text-right text-xs leading-tight text-stone-600">
                            {item.chave}
                        </span>

                        {/* A borda à esquerda é a linha do zero. */}
                        <div className="flex flex-1 items-center gap-2 border-l border-stone-200 pl-px">
                            <span
                                className="h-5 rounded-r-[4px]"
                                style={{ width: `${(item.total / maximo) * 78}%`, backgroundColor: cor }}
                            />

                            <span className="whitespace-nowrap text-xs tabular-nums text-stone-700">
                                {formatarNumero(item.total)}
                                {parte && <span className="ml-1 text-stone-400">{parte}</span>}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
