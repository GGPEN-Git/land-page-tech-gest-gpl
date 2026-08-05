/**
 * Cria as duas contas iniciais: um administrador e um utilizador normal.
 *
 *   npm run db:semear
 *
 * As palavras-passe são geradas ao acaso e impressas UMA única vez — não ficam
 * escritas em ficheiro nenhum. Guarde-as antes de fechar o terminal.
 *
 * Para escolher as suas: ADMIN_SENHA=... UTILIZADOR_SENHA=... npm run db:semear
 * Contas já existentes não são tocadas.
 */
import crypto from "node:crypto";
import { pool } from "../server/db.js";
import { cifrarPalavraPasse } from "../server/auth.js";

function gerarPalavraPasse() {
    // base64url em 18 bytes dá 24 caracteres sem símbolos ambíguos de escapar.
    return crypto.randomBytes(18).toString("base64url");
}

const CONTAS = [
    {
        email: process.env.ADMIN_EMAIL || "admin@ggpen.gov.ao",
        nome: process.env.ADMIN_NOME || "Administrador",
        papel: "admin",
        palavraPasse: process.env.ADMIN_SENHA || gerarPalavraPasse(),
        // Só se imprime a palavra-passe quando fomos nós a inventá-la. Se veio de
        // variável de ambiente, quem a definiu já a conhece e não vai para o log.
        gerada: !process.env.ADMIN_SENHA,
    },
    {
        email: process.env.UTILIZADOR_EMAIL || "tecnico@ggpen.gov.ao",
        nome: process.env.UTILIZADOR_NOME || "Técnico",
        papel: "utilizador",
        palavraPasse: process.env.UTILIZADOR_SENHA || gerarPalavraPasse(),
        gerada: !process.env.UTILIZADOR_SENHA,
    },
];

try {
    const criadas = [];

    for (const conta of CONTAS) {
        const email = conta.email.trim().toLowerCase();

        const { rows } = await pool.query(
            `insert into utilizadores (email, nome, palavra_passe, papel)
                  values ($1, $2, $3, $4)
             on conflict (email) do nothing
              returning id, email, papel`,
            [email, conta.nome, await cifrarPalavraPasse(conta.palavraPasse), conta.papel],
        );

        if (rows[0]) criadas.push({ ...conta, email });
        else console.log(`Já existia, não foi alterada: ${email}`);
    }

    if (criadas.length === 0) {
        console.log("\nNada a fazer. Para repor uma palavra-passe use: npm run db:utilizador -- ...");
    } else {
        console.log("\n─────────────────────────────────────────────");
        console.log(" Contas criadas:");
        console.log("─────────────────────────────────────────────");

        for (const conta of criadas) {
            console.log(`\n  ${conta.papel.toUpperCase()}`);
            console.log(`  Email:         ${conta.email}`);
            console.log(
                conta.gerada
                    ? `  Palavra-passe: ${conta.palavraPasse}   <-- guarde, não volta a ser mostrada`
                    : "  Palavra-passe: a que definiu na variável de ambiente",
            );
        }

        console.log("\n─────────────────────────────────────────────\n");
    }
} catch (erro) {
    console.error("Falha ao semear:", erro.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
