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

// ── Controlo de verificação dos polígonos. Só admin. ──

export interface Verificacao {
    global_id: string;
    objectid: number;
    verificado: boolean;
    atualizado_em: string;
    utilizador: string | null;
}

export function listarVerificacoes(camadaId: string) {
    return pedir<{ verificacoes: Verificacao[] }>(`/controlo/${encodeURIComponent(camadaId)}`);
}

export function marcarVerificacao(
    camadaId: string,
    globalId: string,
    dados: { objectid: number; verificado: boolean; nota?: string },
) {
    return pedir<{ verificacao: Verificacao }>(
        `/controlo/${encodeURIComponent(camadaId)}/${encodeURIComponent(globalId)}`,
        { method: "PUT", body: JSON.stringify(dados) },
    );
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

export function alterarPalavraPassePropria(palavraPasseAtual: string, palavraPasse: string) {
    return pedir<void>("/eu/palavra-passe", {
        method: "PATCH",
        body: JSON.stringify({ palavraPasseAtual, palavraPasse }),
    });
}

export function atualizarUtilizador(
    id: string,
    alteracoes: { ativo?: boolean; papel?: Papel; palavraPasse?: string; nome?: string },
) {
    return pedir<{ utilizador: UtilizadorDetalhe }>(`/utilizadores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(alteracoes),
    });
}
