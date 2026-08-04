/**
 * Cria ou atualiza um utilizador. Não há registo aberto — as contas
 * são criadas por quem administra o sistema.
 *
 *   npm run db:utilizador -- email@dominio.ao "PalavraPasse" "Nome Completo" admin
 *
 * O papel é opcional e por omissão fica "utilizador".
 * Correr de novo com o mesmo email substitui a palavra-passe.
 */
import { pool } from "../server/db.js";
import { cifrarPalavraPasse } from "../server/auth.js";

const PAPEIS = ["admin", "utilizador"];

const argumentos = process.argv.slice(2);
const [emailBruto, palavraPasse] = argumentos;

// O papel, se vier, é o último argumento; o resto do meio é o nome.
const ultimo = argumentos[argumentos.length - 1];
const papel = PAPEIS.includes(ultimo) && argumentos.length > 2 ? ultimo : "utilizador";
const nome = argumentos
    .slice(2, papel === ultimo && argumentos.length > 2 ? -1 : undefined)
    .join(" ")
    .trim();

if (!emailBruto || !palavraPasse) {
    console.error('Uso: npm run db:utilizador -- email@dominio.ao "PalavraPasse" "Nome Completo" [admin|utilizador]');
    process.exit(1);
}

if (palavraPasse.length < 10) {
    console.error("A palavra-passe deve ter pelo menos 10 caracteres.");
    process.exit(1);
}

const email = emailBruto.trim().toLowerCase();

try {
    const cifrada = await cifrarPalavraPasse(palavraPasse);

    const { rows } = await pool.query(
        `insert into utilizadores (email, nome, palavra_passe, papel)
              values ($1, $2, $3, $4)
         on conflict (email) do update
                set palavra_passe = excluded.palavra_passe,
                    nome = coalesce(nullif(excluded.nome, ''), utilizadores.nome),
                    papel = excluded.papel,
                    ativo = true
          returning id, email, nome, papel`,
        [email, nome || email, cifrada, papel],
    );

    console.log("Utilizador pronto:", rows[0]);
} catch (erro) {
    console.error("Falha ao criar o utilizador:", erro.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
