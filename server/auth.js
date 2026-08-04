import crypto from "node:crypto";
import { promisify } from "node:util";
import { consultar, consultarUma } from "./db.js";

const scrypt = promisify(crypto.scrypt);

const BYTES_SAL = 16;
const BYTES_CHAVE = 64;
const DIAS_SESSAO = Number(process.env.SESSAO_DIAS) || 7;

export const NOME_COOKIE = "sessao";

/**
 * Gera "sal:hash" com scrypt, que é da biblioteca padrão do Node.
 * Evita o bcrypt, que é uma dependência nativa e complica o build no Render.
 */
export async function cifrarPalavraPasse(palavraPasse) {
    const sal = crypto.randomBytes(BYTES_SAL);
    const chave = await scrypt(palavraPasse, sal, BYTES_CHAVE);

    return `${sal.toString("hex")}:${chave.toString("hex")}`;
}

/** Comparação em tempo constante — não revela onde as cadeias divergem. */
export async function conferirPalavraPasse(palavraPasse, guardada) {
    const [salHex, chaveHex] = String(guardada).split(":");
    if (!salHex || !chaveHex) return false;

    const esperada = Buffer.from(chaveHex, "hex");
    const obtida = await scrypt(palavraPasse, Buffer.from(salHex, "hex"), esperada.length);

    return crypto.timingSafeEqual(esperada, obtida);
}

function hashDoToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

/** Cria a sessão e devolve o token em claro — é o único momento em que existe. */
export async function criarSessao(utilizadorId) {
    const token = crypto.randomBytes(32).toString("base64url");
    const expiraEm = new Date(Date.now() + DIAS_SESSAO * 24 * 60 * 60 * 1000);

    await consultar("insert into sessoes (token_hash, utilizador_id, expira_em) values ($1, $2, $3)", [
        hashDoToken(token),
        utilizadorId,
        expiraEm,
    ]);

    return { token, expiraEm };
}

export async function utilizadorDaSessao(token) {
    if (!token) return null;

    return consultarUma(
        `select u.id, u.email, u.nome, u.papel
           from sessoes s
           join utilizadores u on u.id = s.utilizador_id
          where s.token_hash = $1
            and s.expira_em > now()
            and u.ativo = true`,
        [hashDoToken(token)],
    );
}

export async function apagarSessao(token) {
    if (!token) return;

    await consultar("delete from sessoes where token_hash = $1", [hashDoToken(token)]);
}

/** Remove sessões caducadas. Chamado no arranque; a tabela não cresce sem fim. */
export async function limparSessoesCaducadas() {
    await consultar("delete from sessoes where expira_em <= now()");
}

export function opcoesCookie() {
    return {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: DIAS_SESSAO * 24 * 60 * 60 * 1000,
        path: "/",
    };
}
