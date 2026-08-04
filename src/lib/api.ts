/**
 * Cliente da API de autenticação.
 * A sessão viaja num cookie httpOnly, por isso todos os pedidos levam
 * `credentials: "include"` e nenhum token é guardado em JavaScript.
 */

export type Papel = "admin" | "utilizador";

export interface Utilizador {
    id: string;
    email: string;
    nome: string;
    papel: Papel;
}

/** Como vem da listagem de administração, com os campos de gestão. */
export interface UtilizadorDetalhe extends Utilizador {
    ativo: boolean;
    criado_em: string;
}

export class ErroApi extends Error {
    readonly estado: number;

    constructor(mensagem: string, estado: number) {
        super(mensagem);
        this.name = "ErroApi";
        this.estado = estado;
    }
}

async function pedir<T>(caminho: string, init?: RequestInit): Promise<T> {
    let resposta: Response;

    try {
        resposta = await fetch(`/api${caminho}`, {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            ...init,
        });
    } catch {
        throw new ErroApi("Sem ligação ao servidor.", 0);
    }

    if (resposta.status === 204) return undefined as T;

    const corpo = await resposta.json().catch(() => null);

    if (!resposta.ok) {
        throw new ErroApi(corpo?.erro || "Ocorreu um erro inesperado.", resposta.status);
    }

    return corpo as T;
}

export function iniciarSessao(email: string, palavraPasse: string) {
    return pedir<{ utilizador: Utilizador }>("/sessao", {
        method: "POST",
        body: JSON.stringify({ email, palavraPasse }),
    });
}

export function sessaoAtual() {
    return pedir<{ utilizador: Utilizador }>("/sessao");
}

export function terminarSessao() {
    return pedir<void>("/sessao", { method: "DELETE" });
}

// ── Gestão de utilizadores. Só responde a quem tem papel "admin". ──

export function listarUtilizadores() {
    return pedir<{ utilizadores: UtilizadorDetalhe[] }>("/utilizadores");
}

export function criarUtilizador(dados: { email: string; nome: string; palavraPasse: string; papel: Papel }) {
    return pedir<{ utilizador: UtilizadorDetalhe }>("/utilizadores", {
        method: "POST",
        body: JSON.stringify(dados),
    });
}

export function atualizarUtilizador(
    id: string,
    alteracoes: { ativo?: boolean; papel?: Papel; palavraPasse?: string },
) {
    return pedir<{ utilizador: UtilizadorDetalhe }>(`/utilizadores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(alteracoes),
    });
}
