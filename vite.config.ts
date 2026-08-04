import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Em GitHub Pages o site vive num subcaminho (/nome-do-repo/).
    // O workflow define BASE_PATH; localmente fica "/" e nada muda.
    base: process.env.BASE_PATH || "/",
    server: {
        // Em dev o Vite serve na 5173 e o Express na 3000. Sem este proxy os
        // pedidos /api iriam para o Vite, e o cookie de sessão seria de outra origem.
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
        },
    },
});
