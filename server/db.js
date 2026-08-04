import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está definida. Copie o .env.example para .env.");
}

/**
 * TLS decidido pelo destino, não pelo NODE_ENV: assim funciona contra o Supabase
 * mesmo a partir da máquina local, e continua desligado no Postgres do Docker.
 */
function precisaDeTls(url) {
    try {
        const { hostname, searchParams } = new URL(url);

        if (searchParams.get("sslmode") === "disable") return false;
        if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "postgres") return false;

        return true;
    } catch {
        return false;
    }
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // rejectUnauthorized: false porque Supabase e Render usam cadeias próprias.
    ssl: precisaDeTls(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
});

pool.on("error", (erro) => {
    console.error("Erro inesperado no pool do Postgres:", erro);
});

/** Atalho para consultas simples. Devolve as linhas. */
export async function consultar(sql, valores = []) {
    const resultado = await pool.query(sql, valores);
    return resultado.rows;
}

/** Devolve a primeira linha, ou null. */
export async function consultarUma(sql, valores = []) {
    const linhas = await consultar(sql, valores);
    return linhas[0] || null;
}
