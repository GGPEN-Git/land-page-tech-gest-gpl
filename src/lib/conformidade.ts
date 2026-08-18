/**
 * Réplica das regras de validação da expressão Arcade do webmap.
 *
 * Existe para que o módulo de Controlo possa mostrar, no polígono selecionado,
 * o mesmo diagnóstico que o mapa está a desenhar — sem ter de adivinhar.
 *
 * **Se a expressão for alterada no ArcGIS Online, este ficheiro tem de acompanhar.**
 * As cores são as dos símbolos do webmap, para o diagnóstico e o desenho coincidirem.
 */

export interface Conformidade {
    id: string;
    /** Valor devolvido pela expressão Arcade. */
    categoria: string;
    /** Texto curto para a interface. */
    resumo: string;
    cor: string;
    /** Se representa conformidade ou um problema a resolver. */
    ok: boolean;
    /** Falso quando o webmap não tem símbolo para esta categoria. */
    desenhada: boolean;
}

const REGULARIZADO: Conformidade = {
    id: "regularizado",
    categoria: "Regularizado",
    resumo: "Regularizado",
    cor: "#78ff0a",
    ok: true,
    desenhada: true,
};

/** Categorias que a expressão devolve mas para as quais o webmap não tem símbolo. */
const SEM_SIMBOLO = "#9ca3af";

const NAO_INSCRITO: Conformidade = {
    id: "nao-inscrito",
    categoria: "Não Inscrito",
    resumo: "Não Inscrito",
    cor: SEM_SIMBOLO,
    ok: true,
    desenhada: false,
};

const PENDENTE_SEM_CASAS: Conformidade = {
    id: "pendente-casas",
    categoria: "Inconsistência: Pendente exige >= 2 casas",
    resumo: "Pendente exige 2 ou mais casas",
    cor: "#ffb55a",
    ok: false,
    desenhada: true,
};

const HABITACAO_TIPOLOGIA_OUTROS: Conformidade = {
    id: "habitacao-outros",
    categoria: "Inválido: Habitação com Tipologia Outros",
    resumo: "Habitação não pode ter tipologia Outros",
    cor: "#0f33ff",
    ok: false,
    desenhada: true,
};

const OUTROS_OUTROS: Conformidade = {
    id: "outros-outros",
    categoria: "Verificar: Tipologia Outros com Afetação Outros",
    resumo: "Tipologia e afetação ambas Outros — verificar no terreno",
    cor: "#f0270c",
    ok: false,
    desenhada: true,
};

const ERRO_NIF: Conformidade = {
    id: "erro-nif",
    categoria: "Erro NIF: Quantidade de NIFs não bate com n.º de casas",
    resumo: "Quantidade de NIFs não bate com o n.º de casas",
    cor: "#c812e0",
    ok: false,
    desenhada: true,
};

const ERRO_TIPOLOGIA: Conformidade = {
    id: "erro-tipologia",
    categoria: "Erro Tipologia: Qtd de Tipologias não bate com n.º de casas",
    resumo: "Quantidade de tipologias não bate com o n.º de casas",
    cor: SEM_SIMBOLO,
    ok: false,
    desenhada: false,
};

export const CONFORMIDADES: Conformidade[] = [
    REGULARIZADO,
    PENDENTE_SEM_CASAS,
    HABITACAO_TIPOLOGIA_OUTROS,
    OUTROS_OUTROS,
    ERRO_NIF,
    ERRO_TIPOLOGIA,
    NAO_INSCRITO,
];

/**
 * A mesma lógica em Arcade, para o renderer do mapa poder classificar cada
 * polígono sem os trazer todos para o browser.
 *
 * **Tem de acompanhar `classificar()` linha a linha.** São a mesma regra escrita
 * duas vezes: uma corre no motor do ArcGIS, a outra no nosso código.
 * Devolve `"<id da conformidade>|<valor do controlo>"`.
 */
export const EXPRESSAO_CONFORMIDADE = `
function diagnostico() {
    var estado = $feature.Estado;
    if (estado == 0 || estado == 'Não Inscrito') { return '${NAO_INSCRITO.id}'; }

    var num_casas = $feature.Num_Edif;
    var nifs = $feature.NIF_Prop;
    var tipologias = $feature.Tipologia;
    var afetacao = $feature.Afetacao;
    var pendente = (estado == 1 || estado == 'Pendente');

    if (pendente && (IsEmpty(num_casas) || num_casas < 2)) { return '${PENDENTE_SEM_CASAS.id}'; }
    if (tipologias == 'Outros' && afetacao == 'Habitação') { return '${HABITACAO_TIPOLOGIA_OUTROS.id}'; }
    if (tipologias == 'Outros' && afetacao == 'Outros') { return '${OUTROS_OUTROS.id}'; }

    if (pendente) {
        var total_nifs = 0;
        if (!IsEmpty(nifs)) { total_nifs = Count(Split(nifs, ',')); }
        if (total_nifs == 0 || total_nifs != num_casas) { return '${ERRO_NIF.id}'; }

        var total_tipos = 0;
        if (!IsEmpty(tipologias)) { total_tipos = Count(Split(tipologias, ',')); }
        if (total_tipos == 0 || total_tipos != num_casas) { return '${ERRO_TIPOLOGIA.id}'; }
    }

    return '${REGULARIZADO.id}';
}

var controlo = IIf(IsEmpty($feature.GGPEN_Controlo), 0, $feature.GGPEN_Controlo);
return diagnostico() + '|' + controlo;
`;

type Atributos = Record<string, unknown>;

function vazio(valor: unknown): boolean {
    return valor === null || valor === undefined || valor === "";
}

/** Conta elementos separados por vírgula, como o Count(Split(...)) do Arcade. */
function quantos(valor: unknown): number {
    if (vazio(valor)) return 0;

    return String(valor).split(",").length;
}

/**
 * Devolve o diagnóstico de um edifício, seguindo a mesma ordem de regras da
 * expressão Arcade — a ordem importa: a primeira que corresponder é a que vale.
 */
export function classificar(atributos: Atributos): Conformidade {
    const estado = atributos.Estado;

    if (estado === 0 || estado === "Não Inscrito") return NAO_INSCRITO;

    const numCasas = atributos.Num_Edif;
    const nifs = atributos.NIF_Prop;
    const tipologias = atributos.Tipologia;
    const afetacao = atributos.Afetacao;

    const pendente = estado === 1 || estado === "Pendente";

    if (pendente && (vazio(numCasas) || Number(numCasas) < 2)) return PENDENTE_SEM_CASAS;

    if (tipologias === "Outros" && afetacao === "Habitação") return HABITACAO_TIPOLOGIA_OUTROS;

    if (tipologias === "Outros" && afetacao === "Outros") return OUTROS_OUTROS;

    if (pendente) {
        const totalNifs = quantos(nifs);
        if (totalNifs === 0 || totalNifs !== Number(numCasas)) return ERRO_NIF;

        const totalTipos = quantos(tipologias);
        if (totalTipos === 0 || totalTipos !== Number(numCasas)) return ERRO_TIPOLOGIA;
    }

    return REGULARIZADO;
}
