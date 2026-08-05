import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, KeyRound, LogOut, User, Users } from "lucide-react";
import type { Utilizador } from "../lib/api";

interface MenuContaProps {
    utilizador: Utilizador;
    onGerirUtilizadores: () => void;
    onAlterarPalavraPasse: () => void;
    onTerminarSessao: () => void;
}

export function MenuConta({
    utilizador,
    onGerirUtilizadores,
    onAlterarPalavraPasse,
    onTerminarSessao,
}: MenuContaProps) {
    const [aberto, setAberto] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fecha ao clicar fora ou com Escape — comportamento esperado de um menu.
    useEffect(() => {
        if (!aberto) return;

        function aoClicar(evento: MouseEvent) {
            if (!containerRef.current?.contains(evento.target as Node)) setAberto(false);
        }

        function aoTeclar(evento: KeyboardEvent) {
            if (evento.key === "Escape") setAberto(false);
        }

        document.addEventListener("mousedown", aoClicar);
        document.addEventListener("keydown", aoTeclar);

        return () => {
            document.removeEventListener("mousedown", aoClicar);
            document.removeEventListener("keydown", aoTeclar);
        };
    }, [aberto]);

    function executar(acao: () => void) {
        setAberto(false);
        acao();
    }

    const nome = utilizador.nome || utilizador.email;
    const item =
        "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors";

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setAberto((v) => !v)}
                aria-expanded={aberto}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-full border border-white/60 pl-1 pr-2 py-1 text-white hover:bg-white/10 transition-colors"
            >
                <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                </span>

                <span className="hidden sm:block text-xs md:text-sm max-w-[140px] truncate">{nome}</span>

                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
            </button>

            {aberto && (
                <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-[#0b1c38] border border-white/10 shadow-2xl overflow-hidden"
                >
                    <div className="px-4 py-3 bg-[#12294d]">
                        <p className="text-white text-sm font-medium truncate">{nome}</p>
                        <p className="text-white/50 text-xs truncate">{utilizador.email}</p>

                        <span
                            className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                                utilizador.papel === "admin" ? "bg-[#1e6fd9] text-white" : "bg-white/10 text-white/70"
                            }`}
                        >
                            {utilizador.papel === "admin" ? "Administrador" : "Utilizador"}
                        </span>
                    </div>

                    <div className="py-1">
                        <button type="button" role="menuitem" onClick={() => executar(onAlterarPalavraPasse)} className={item}>
                            <KeyRound className="w-4 h-4 shrink-0" />
                            Alterar palavra-passe
                        </button>

                        {utilizador.papel === "admin" && (
                            <button type="button" role="menuitem" onClick={() => executar(onGerirUtilizadores)} className={item}>
                                <Users className="w-4 h-4 shrink-0" />
                                Funcionários e acessos
                            </button>
                        )}
                    </div>

                    <div className="border-t border-white/10 py-1">
                        <button
                            type="button"
                            role="menuitem"
                            onClick={() => executar(onTerminarSessao)}
                            className={`${item} text-[#e08a8a] hover:text-[#e08a8a]`}
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            Terminar sessão
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
