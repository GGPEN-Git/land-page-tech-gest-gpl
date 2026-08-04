/**
 * Aplica o db/schema.sql. Idempotente — pode correr sempre que quiser.
 *   npm run db:migrar
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../server/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sql = await fs.readFile(path.join(__dirname, "..", "db", "schema.sql"), "utf8");

try {
    await pool.query(sql);
    console.log("Esquema aplicado.");
} catch (erro) {
    console.error("Falha ao aplicar o esquema:", erro.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
