import express from "express";
import { consultar, consultarUma } from "./db.js";
import {
    NOME_COOKIE,
    apagarSessao,
    cifrarPalavraPasse,
    conferirPalavraPasse,
    criarSessao,
    opcoesCookie,
    utilizadorDaSessao,
} from "./auth.js";

export const rotas = express.Router();

const PAPEIS = ["admin", "utilizador"];
const MIN_PALAVRA_PASSE = 10;

// Trava de tentativas por IP. Em memória: chega para travar força bruta simples,
// mas reinicia com o processo e não é partilhada entre instâncias.
const TENTATIVAS_MAX = 8;
const JANELA_MS = 15 * 60 * 1000;
const tentativas = new Map();

function excedeuTentativas(chave) {
    const registo = tentativas.get(chave);
    if (!registo) return false;

    if (Date.now() - registo.desde > JANELA_MS) {
        tentativas.delete(chave);
        return false;
    }

    return registo.total >= TENTATIVAS_MAX;
}

function registarFalha(chave) {
    const registo = tentativas.get(chave);

    if (!registo || Date.now() - registo.desde > JANELA_MS) {
        tentativas.set(chave, { total: 1, desde: Date.now() });
        return;
    }

    registo.total += 1;
}

/** Põe req.utilizador ou responde 401. */
async function exigirSessao(req, res, proximo) {
    const utilizador = await utilizadorDaSessao(req.cookies?.[NOME_COOKIE]);

    if (!utilizador) {
        res.status(401).json({ erro: "Sessão inválida ou expirada." });
        return;
    }

    req.utilizador = utilizador;
    proximo();
}

/** Corre depois de exigirSessao. O papel vem sempre da base de dados, nunca do cliente. */
function exigirAdmin(req, res, proximo) {
    if (req.utilizador?.papel !== "admin") {
        res.status(403).json({ erro: "Sem permissão." });
        return;
    }

    proximo();
}

// ── Sessão ───────────────────────────────────────────────────────────────

rotas.get("/sessao", async (req, res) => {
    const utilizador = await utilizadorDaSessao(req.cookies?.[NOME_COOKIE]);

    if (!utilizador) {
        res.status(401).json({ erro: "Sem sessão." });
        return;
    }

    res.json({ utilizador });
});

rotas.post("/sessao", async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const palavraPasse = String(req.body?.palavraPasse || "");

    if (!email || !palavraPasse) {
        res.status(400).json({ erro: "Preencha o email e a palavra-passe." });
        return;
    }

    if (excedeuTentativas(req.ip)) {
        res.status(429).json({ erro: "Demasiadas tentativas. Aguarde alguns minutos." });
        return;
    }

    const utilizador = await consultarUma(
        "select id, email, nome, papel, palavra_passe, ativo from utilizadores where email = $1",
        [email],
    );

    // Mensagem igual para email inexistente e palavra-passe errada:
    // dizer qual falhou permitiria descobrir que emails estão registados.
    const valida = utilizador?.ativo ? await conferirPalavraPasse(palavraPasse, utilizador.palavra_passe) : false;

    if (!valida) {
        registarFalha(req.ip);
        res.status(401).json({ erro: "Credenciais inválidas." });
        return;
    }

    tentativas.delete(req.ip);

    const { token } = await criarSessao(utilizador.id);

    res.cookie(NOME_COOKIE, token, opcoesCookie());
    res.json({
        utilizador: { id: utilizador.id, email: utilizador.email, nome: utilizador.nome, papel: utilizador.papel },
    });
});

rotas.delete("/sessao", async (req, res) => {
    await apagarSessao(req.cookies?.[NOME_COOKIE]);

    res.clearCookie(NOME_COOKIE, { ...opcoesCookie(), maxAge: undefined });
    res.status(204).end();
});

// ── Gestão de utilizadores (só admin) ────────────────────────────────────

rotas.get("/utilizadores", exigirSessao, exigirAdmin, async (_req, res) => {
    const utilizadores = await consultar(
        "select id, email, nome, papel, ativo, criado_em from utilizadores order by criado_em",
    );

    res.json({ utilizadores });
});

rotas.post("/utilizadores", exigirSessao, exigirAdmin, async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const nome = String(req.body?.nome || "").trim();
    const palavraPasse = String(req.body?.palavraPasse || "");
    const papel = String(req.body?.papel || "utilizador");

    if (!email.includes("@")) {
        res.status(400).json({ erro: "Email inválido." });
        return;
    }

    if (palavraPasse.length < MIN_PALAVRA_PASSE) {
        res.status(400).json({ erro: `A palavra-passe deve ter pelo menos ${MIN_PALAVRA_PASSE} caracteres.` });
        return;
    }

    if (!PAPEIS.includes(papel)) {
        res.status(400).json({ erro: "Papel inválido." });
        return;
    }

    const jaExiste = await consultarUma("select id from utilizadores where email = $1", [email]);

    if (jaExiste) {
        res.status(409).json({ erro: "Já existe uma conta com esse email." });
        return;
    }

    const [criado] = await consultar(
        `insert into utilizadores (email, nome, palavra_passe, papel)
              values ($1, $2, $3, $4)
           returning id, email, nome, papel, ativo, criado_em`,
        [email, nome || email, await cifrarPalavraPasse(palavraPasse), papel],
    );

    res.status(201).json({ utilizador: criado });
});

rotas.patch("/utilizadores/:id", exigirSessao, exigirAdmin, async (req, res) => {
    const { id } = req.params;
    const alteracoes = [];
    const valores = [];

    if (typeof req.body?.ativo === "boolean") {
        // Sem isto, um admin podia desativar-se a si próprio e ficar de fora.
        if (id === req.utilizador.id && req.body.ativo === false) {
            res.status(400).json({ erro: "Não pode desativar a sua própria conta." });
            return;
        }

        valores.push(req.body.ativo);
        alteracoes.push(`ativo = $${valores.length}`);
    }

    if (req.body?.papel !== undefined) {
        if (!PAPEIS.includes(req.body.papel)) {
            res.status(400).json({ erro: "Papel inválido." });
            return;
        }

        // Mesmo raciocínio: não deixar o último admin despromover-se sozinho.
        if (id === req.utilizador.id && req.body.papel !== "admin") {
            res.status(400).json({ erro: "Não pode retirar-se a si próprio o papel de administrador." });
            return;
        }

        valores.push(req.body.papel);
        alteracoes.push(`papel = $${valores.length}`);
    }

    if (req.body?.palavraPasse) {
        if (String(req.body.palavraPasse).length < MIN_PALAVRA_PASSE) {
            res.status(400).json({ erro: `A palavra-passe deve ter pelo menos ${MIN_PALAVRA_PASSE} caracteres.` });
            return;
        }

        valores.push(await cifrarPalavraPasse(String(req.body.palavraPasse)));
        alteracoes.push(`palavra_passe = $${valores.length}`);
    }

    if (alteracoes.length === 0) {
        res.status(400).json({ erro: "Nada a alterar." });
        return;
    }

    valores.push(id);

    const [atualizado] = await consultar(
        `update utilizadores set ${alteracoes.join(", ")}
          where id = $${valores.length}
      returning id, email, nome, papel, ativo, criado_em`,
        valores,
    );

    if (!atualizado) {
        res.status(404).json({ erro: "Utilizador não encontrado." });
        return;
    }

    // Desativar ou despromover só produz efeito depois de cortar as sessões abertas.
    if (req.body?.ativo === false || req.body?.palavraPasse || req.body?.papel) {
        await consultar("delete from sessoes where utilizador_id = $1", [id]);
    }

    res.json({ utilizador: atualizado });
});
