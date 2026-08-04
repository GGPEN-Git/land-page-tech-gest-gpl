import express from "express";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rotas } from "./server/rotas.js";
import { limparSessoesCaducadas } from "./server/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");

// O Render atribui a porta; em local cai para 3000.
const port = process.env.PORT || 3000;

const app = express();

// Confia no proxy do Render, para req.ip e o secure do cookie virem corretos.
app.set("trust proxy", 1);

app.disable("x-powered-by");

app.use((_req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
});

app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());

// Usado pelo healthCheckPath do Render para saber se a instância está viva.
app.get("/healthz", (_req, res) => {
    res.status(200).send("ok");
});

// A API vem antes dos ficheiros estáticos: caso contrário o fallback da SPA
// devolveria o index.html para qualquer /api desconhecido, em vez de 404.
app.use("/api", rotas);

app.use("/api", (_req, res) => {
    res.status(404).json({ erro: "Rota inexistente." });
});

// Ficheiros com hash no nome (index-a3f9c2.js): podem ser cacheados para sempre.
app.use(
    "/assets",
    express.static(path.join(dist, "assets"), {
        immutable: true,
        maxAge: "1y",
    }),
);

// Restantes ficheiros de public/. index: false para o fallback abaixo tratar da raiz.
app.use(express.static(dist, { index: false, maxAge: "1h" }));

// Fallback da SPA: qualquer rota não resolvida devolve o index.html.
// Middleware em vez de app.get("*") — este último deixou de ser válido no Express 5.
app.use((_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
});

// Tratador de erros: sem isto uma falha do Postgres devolveria HTML de stack trace.
app.use((erro, _req, res, _next) => {
    console.error("Erro não tratado:", erro);
    res.status(500).json({ erro: "Erro interno." });
});

limparSessoesCaducadas().catch((erro) => {
    console.error("Não foi possível limpar as sessões caducadas:", erro);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`A servir em http://0.0.0.0:${port}`);
});
