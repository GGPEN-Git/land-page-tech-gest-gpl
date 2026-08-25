/**
 * Parâmetros comuns aos gráficos.
 *
 * As cores são as duas primeiras da paleta categórica de referência, validadas
 * para daltonismo (protanopia e deuteranopia) contra superfície clara. Não são
 * escolha de gosto — trocar por cores da paleta do site partiria a separação.
 */
export const SERIES = ["#2a78d6", "#eb6834"];

/** Espessura máxima de uma barra ou coluna, em px. */
export const ESPESSURA_MAXIMA = 24;

/** Folga entre marcas encostadas, em px, na cor da superfície. */
export const FOLGA = 2;

/**
 * Escala com marcas em números redondos.
 *
 * Um eixo que acaba em 4.657 não se lê; um que acaba em 5.000 com marcas de mil
 * lê-se de relance.
 */
export function escalaLimpa(maximo: number, divisoes = 4): { topo: number; marcas: number[] } {
    if (!(maximo > 0)) return { topo: 1, marcas: [0, 1] };

    const bruto = maximo / divisoes;
    const magnitude = Math.pow(10, Math.floor(Math.log10(bruto)));
    const passo = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((p) => p >= bruto) ?? 10 * magnitude;
    const topo = Math.ceil(maximo / passo) * passo;

    const marcas: number[] = [];
    for (let v = 0; v <= topo + passo / 1000; v += passo) marcas.push(v);

    return { topo, marcas };
}

/**
 * Retângulo com o topo arredondado e a base esquadriada.
 *
 * O `rx` do SVG arredonda os quatro cantos, o que descola a coluna da linha de
 * base — daí o caminho à mão.
 */
export function colunaArredondada(x: number, y: number, largura: number, altura: number, raio = 4): string {
    const r = Math.max(0, Math.min(raio, altura, largura / 2));
    const base = y + altura;

    return `M${x},${base} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + largura - r},${y} Q${x + largura},${y} ${x + largura},${y + r} L${x + largura},${base} Z`;
}
