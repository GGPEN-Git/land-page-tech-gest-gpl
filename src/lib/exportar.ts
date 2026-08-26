import type { Estatisticas } from "./estatisticas";

/**
 * Exportação dos indicadores para CSV.
 *
 * Separador `;` e não vírgula: é o que o Excel em português espera, e os dados
 * têm vírgulas lá dentro.
 */
const SEPARADOR = ";";

function campo(valor: string | number): string {
    const texto = String(valor);

    return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function linha(...valores: (string | number)[]): string {
    return valores.map(campo).join(SEPARADOR);
}

function parte(valor: number, base: number): string {
    return base ? ((valor / base) * 100).toFixed(1).replace(".", ",") + "%" : "";
}

function distribuicao(titulo: string, base: number, itens: { chave: string; total: number }[]): string[] {
    return [
        "",
        linha(titulo, `base ${base}`),
        linha("Categoria", "Total", "Percentagem"),
        ...itens.map((i) => linha(i.chave, i.total, parte(i.total, base))),
    ];
}

/**
 * Tudo o que o painel mostra, numa folha só.
 *
 * Os números vão em bruto, sem separador de milhares — `4.358` seria lido pelo
 * Excel como quatro vírgula trezentos e cinquenta e oito.
 */
export function indicadoresParaCsv(dados: Estatisticas, area: string, lidoEm: Date): string {
    const linhas = [
        linha("Indicadores do levantamento"),
        linha("Área", area),
        linha("Lido em", lidoEm.toLocaleString("pt-PT")),
        "",
        linha("Indicador", "Valor"),
        linha("Polígonos mapeados", dados.poligonos),
        linha("Imóveis identificados", dados.imoveis),
        linha("Habitações", dados.habitacoes),
        linha("Outras afetações", dados.outrasAfetacoes),
        linha("Área construída (m²)", Math.round(dados.area)),
        "",
        linha("Por bairro"),
        linha("Bairro", "Polígonos", "Imóveis", "Habitações", "Outras afetações", "Área (m²)"),
        ...dados.porBairro.map((b) =>
            linha(b.bairro, b.poligonos, b.imoveis, b.habitacoes, b.outrasAfetacoes, Math.round(b.area)),
        ),
        linha("Total", dados.poligonos, dados.imoveis, dados.habitacoes, dados.outrasAfetacoes, Math.round(dados.area)),
        ...distribuicao("Tipologia das habitações", dados.baseTipologias, dados.tipologias),
        ...distribuicao("Tipo de construção", dados.habitacoes, dados.construcoes),
        ...distribuicao("Afetação dos imóveis", dados.imoveis, dados.afetacoes),
    ];

    return linhas.join("\r\n");
}

/** Nome do ficheiro: área e dia, para dois descarregamentos não colidirem. */
export function nomeDoFicheiro(area: string, lidoEm: Date): string {
    const identificador = area
        .toLowerCase()
        .normalize("NFD")
        // O NFD separa a letra do acento; a marca solta sai nesta linha. Sem
        // isto, "Novas Áreas" daria "novas-a-reas".
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return `indicadores-${identificador}-${lidoEm.toISOString().slice(0, 10)}.csv`;
}

/** Marca de ordem de bytes, escrita sem o caracter invisivel no codigo. */
const BOM = String.fromCharCode(0xfeff);

export function descarregarCsv(nome: string, conteudo: string) {
    // O BOM não é decoração: sem ele o Excel abre o ficheiro na codificação do
    // sistema e "Habitação" chega ao utilizador estropiado.
    const blob = new Blob([BOM + conteudo], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const ligacao = document.createElement("a");
    ligacao.href = url;
    ligacao.download = nome;
    ligacao.click();

    URL.revokeObjectURL(url);
}
