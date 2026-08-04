import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Em GitHub Pages o site vive num subcaminho (/nome-do-repo/).
    // O workflow define BASE_PATH; localmente fica "/" e nada muda.
    base: process.env.BASE_PATH || "/",
});
