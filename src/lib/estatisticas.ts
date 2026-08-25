/**
 * Cálculo dos indicadores do relatório, a partir da camada.
 *
 * Tudo é calculado no browser a partir de uma única passagem pelos registos.
 * Podia parte disto ser feito no servidor com `outStatistics`, mas as regras de
 * imóveis e de tipologias precisam de partir listas separadas por vírgula — e
 * misturar as duas origens abriria a porta a números que não fecham entre si.
 */

/** Campos necessários para todos os indicadores. Só estes são descarregados. */
export const CAMPOS_ESTATISTICA = ["Bairro", "Num_Edif", "Tipologia", "T_Constru", "Afetacao", "Area_m2", "Estado"];

export const AFETACAO_HABITACAO = "Habitação";

export interface LinhaBairro {
    bairro: string;
    poligonos: number;
    imoveis: number;
    habitacoes: number;
    outrasAfetacoes: number;
    area: number;
}

export interface Estatisticas {
    poligonos: number;
    imoveis: number;
    habitacoes: number;
    outrasAfetacoes: number;
    area: number;
    porBairro: LinhaBairro[];
    /** Contagem de unidades por tipologia, só entre habitações. */
    tipologias: { chave: string; total: number }[];
    /**
     * Base das percentagens de tipologia. Igual a `habitacoes` — a contagem é
     * limitada ao `Num_Edif`, como no relatório do levantamento.
     */
    baseTipologias: number;
    /**
     * Polígonos cuja lista de tipologias tem mais unidades do que o `Num_Edif`
     * declara. As que sobram não são contadas; o número fica aqui para se saber
     * quantos registos estão nesse estado.
     */
    poligonosTipologiaAcimaDoDeclarado: number;
    construcoes: { chave: string; total: number }[];
    afetacoes: { chave: string; total: number }[];
}

type Atributos = Record<string, unknown>;

function texto(valor: unknown): string {
    return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : "Não indicado";
}

/**
 * Quantos imóveis cabem num polígono.
 *
 * Um polígono é um edifício mapeado e vale por um imóvel; quando contém mais do
 * que uma unidade autónoma, `Num_Edif` regista o total.
 */
function imoveisDe(atributos: Atributos): number {
    const declarado = Number(atributos.Num_Edif);

    return Number.isFinite(declarado) && declarado > 0 ? declarado : 1;
}

export const TIPOLOGIA_DESCONHECIDA = "Não indicado";

/**
 * Lê o campo `Tipologia`, que traz **uma entrada por habitação** do polígono.
 *
 * O preenchimento é livre e está longe de ser uniforme — estes casos existem
 * todos nos dados e são tratados aqui:
 *
 * | No campo | Leitura |
 * |---|---|
 * | `T1,T1,T2` / `T1, T1` | separador vírgula, com ou sem espaço |
 * | `T2-T1-2T2` / `T3 /T6` | hífen e barra também separam |
 * | `2T3` | multiplicador: duas unidades T3 |
 * | `T0T2` | duas tipologias coladas, sem separador |
 * | `TO` | letra O em vez de zero |
 * | `T,2` | vírgula a mais dentro de um T2 |
 * | `T1,T2,` | vírgula final, sem item a seguir |
 * | `Sem`, `Sem t`, `T`, `Tt`, `000000` | sem tipologia utilizável |
 *
 * Devolve as unidades já contadas por tipo — `2T3` são duas, não uma.
 */
export function tipologiasDe(bruto: unknown): { tipo: string; unidades: number }[] {
    if (typeof bruto !== "string" || bruto.trim() === "") return [];

    // A vírgula entre o T e o número é gralha, não separador: "T,2" é um T2.
    const texto = bruto.replace(/T\s*[,;/-]\s*(\d)/gi, "T$1");

    const contagem = new Map<string, number>();

    for (const parte of texto.split(/[,;/\n-]+/)) {
        const token = parte.replace(/\s+/g, "").toUpperCase();

        if (!token) continue;

        for (const { tipo, unidades } of interpretarToken(token)) {
            contagem.set(tipo, (contagem.get(tipo) || 0) + unidades);
        }
    }

    return [...contagem.entries()].map(([tipo, unidades]) => ({ tipo, unidades }));
}

/** Um pedaço já sem espaços e em maiúsculas: `2T3`, `T0T2`, `TO`, `SEMT`, `1`. */
function interpretarToken(token: string): { tipo: string; unidades: number }[] {
    // "Sem", "Sem t", "SemT1" — quem escreveu isto está a dizer que não sabe.
    if (token.startsWith("SEM")) return [{ tipo: TIPOLOGIA_DESCONHECIDA, unidades: 1 }];

    if (token === "OUTROS") return [{ tipo: "Outros", unidades: 1 }];

    // O do teclado em vez do zero.
    const normalizado = token.replace(/TO/g, "T0");
    const saida: { tipo: string; unidades: number }[] = [];

    // `2T3` traz o multiplicador à frente; `T0T2` são duas apanhadas de seguida.
    for (const [, vezes, digito] of normalizado.matchAll(/(\d+)?T(\d)/g)) {
        saida.push({ tipo: `T${digito}`, unidades: vezes ? Number(vezes) : 1 });
    }

    if (saida.length > 0) return saida;

    // Um algarismo sozinho num campo de tipologia só pode ser o T que falta.
    if (/^\d$/.test(normalizado)) return [{ tipo: `T${normalizado}`, unidades: 1 }];

    return [{ tipo: TIPOLOGIA_DESCONHECIDA, unidades: 1 }];
}

/**
 * Tipologias por ordem de T0 a T9, e não por quantidade: numa lista de
 * tipologias o leitor procura o T2, não o mais frequente. O que não é `Tn` vai
 * para o fim.
 */
function ordenarTipologias(mapa: Map<string, number>) {
    return [...mapa.entries()]
        .map(([chave, total]) => ({ chave, total }))
        .sort((a, b) => {
            const na = /^T(\d)$/.exec(a.chave);
            const nb = /^T(\d)$/.exec(b.chave);

            if (na && nb) return Number(na[1]) - Number(nb[1]);
            if (na) return -1;
            if (nb) return 1;

            return b.total - a.total;
        });
}

function ordenar(mapa: Map<string, number>) {
    return [...mapa.entries()]
        .map(([chave, total]) => ({ chave, total }))
        .sort((a, b) => b.total - a.total);
}

/** Percorre os registos uma vez e devolve todos os indicadores. */
export function calcular(registos: Atributos[]): Estatisticas {
    const bairros = new Map<string, LinhaBairro>();
    const tipologias = new Map<string, number>();
    const construcoes = new Map<string, number>();
    const afetacoes = new Map<string, number>();

    let poligonos = 0;
    let imoveis = 0;
    let habitacoes = 0;
    let area = 0;
    let baseTipologias = 0;
    let poligonosTipologiaAcimaDoDeclarado = 0;

    for (const atributos of registos) {
        const nomeBairro = texto(atributos.Bairro);
        const unidades = imoveisDe(atributos);
        const metros = Number(atributos.Area_m2) || 0;
        const afetacao = texto(atributos.Afetacao);
        const ehHabitacao = afetacao === AFETACAO_HABITACAO;

        poligonos += 1;
        imoveis += unidades;
        area += metros;
        if (ehHabitacao) habitacoes += unidades;

        // Afetação e tipo de construção são do polígono, mas contam-se por imóvel:
        // é assim que os totais fecham com o número de imóveis.
        afetacoes.set(afetacao, (afetacoes.get(afetacao) || 0) + unidades);

        if (ehHabitacao) {
            const construcao = texto(atributos.T_Constru);
            construcoes.set(construcao, (construcoes.get(construcao) || 0) + unidades);

            const lista = tipologiasDe(atributos.Tipologia);
            const listadas = lista.reduce((soma, i) => soma + i.unidades, 0);

            // A base é o número de habitações, como no relatório: um polígono
            // nunca conta mais unidades do que o `Num_Edif` declara, mesmo que
            // a lista traga mais, e o que faltar entra em "Não indicado".
            let porAtribuir = unidades;

            for (const { tipo, unidades: quantas } of lista) {
                if (porAtribuir <= 0) break;

                const contadas = Math.min(quantas, porAtribuir);
                tipologias.set(tipo, (tipologias.get(tipo) || 0) + contadas);
                porAtribuir -= contadas;
            }

            if (porAtribuir > 0) {
                tipologias.set(TIPOLOGIA_DESCONHECIDA, (tipologias.get(TIPOLOGIA_DESCONHECIDA) || 0) + porAtribuir);
            }

            // O desvio fica registado em vez de ser calado.
            if (listadas > unidades) poligonosTipologiaAcimaDoDeclarado += 1;

            baseTipologias += unidades;
        }

        const linha = bairros.get(nomeBairro) || {
            bairro: nomeBairro,
            poligonos: 0,
            imoveis: 0,
            habitacoes: 0,
            outrasAfetacoes: 0,
            area: 0,
        };

        linha.poligonos += 1;
        linha.imoveis += unidades;
        linha.area += metros;

        if (ehHabitacao) linha.habitacoes += unidades;
        else linha.outrasAfetacoes += unidades;

        bairros.set(nomeBairro, linha);
    }

    return {
        poligonos,
        imoveis,
        habitacoes,
        outrasAfetacoes: imoveis - habitacoes,
        area,
        porBairro: [...bairros.values()].sort((a, b) => b.imoveis - a.imoveis),
        tipologias: ordenarTipologias(tipologias),
        baseTipologias,
        poligonosTipologiaAcimaDoDeclarado,
        construcoes: ordenar(construcoes),
        afetacoes: ordenar(afetacoes),
    };
}
