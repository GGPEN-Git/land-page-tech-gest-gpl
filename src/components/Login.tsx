import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { asset } from "../lib/utils";
import { iniciarSessao, type Utilizador } from "../lib/api";

interface LoginProps {
    onBack?: () => void;
    onSuccess?: (utilizador: Utilizador) => void;
}

export function Login({ onBack, onSuccess }: LoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [notice, setNotice] = useState<string | null>(null);
    const [aEnviar, setAEnviar] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!email.trim() || !password) {
            setNotice("Preencha o email e a palavra-passe.");
            return;
        }

        setNotice(null);
        setAEnviar(true);

        try {
            const { utilizador } = await iniciarSessao(email.trim(), password);
            onSuccess?.(utilizador);
        } catch (erro) {
            setNotice(erro instanceof Error ? erro.message : "Não foi possível iniciar sessão.");
            setPassword("");
        } finally {
            setAEnviar(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-black font-sans">
            {/* Barra superior */}
            <header className="relative z-20 bg-black">
                <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="text-white/50 hover:text-white transition-colors"
                                aria-label="Voltar à página inicial"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <span className="text-white text-sm md:text-base font-medium tracking-wide">TECH-GEST: GPL</span>
                    </div>

                    <span className="text-white/90 text-sm md:text-base hidden sm:block">Governo Provincial de Luanda</span>
                </div>
            </header>

            {/* Corpo */}
            <main className="relative flex-1 flex flex-col items-center justify-center overflow-hidden py-12">
                {/* Fundo */}
                <div className="absolute inset-0 z-0">
                    <img src={asset("boavista_mapa.png")} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/35" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/15 to-black/45" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10 w-full max-w-xl px-4 md:px-6"
                >
                    {/* Título */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-5xl font-sans font-bold text-white tracking-[0.15em] uppercase">
                            Tech-Gest: GPL
                        </h1>

                        <span className="inline-block mt-4 px-4 py-1.5 bg-[#8b2020] text-white text-xs md:text-sm font-medium tracking-[0.2em] uppercase">
                            Portal de Acesso
                        </span>
                    </div>

                    {/* Cartão */}
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <form onSubmit={handleSubmit} className="px-8 md:px-14 py-12 space-y-5">
                            <div>
                                <label htmlFor="email" className="sr-only">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email"
                                    className="w-full bg-transparent border border-white/25 rounded-md px-5 py-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 transition-colors"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="sr-only">
                                    Palavra-passe
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Palavra-passe"
                                    className="w-full bg-transparent border border-white/25 rounded-md px-5 py-4 text-white placeholder:text-white/50 focus:outline-none focus:border-white/60 transition-colors"
                                />
                            </div>

                            <motion.button
                                type="submit"
                                disabled={aEnviar}
                                whileHover={aEnviar ? undefined : { scale: 1.01 }}
                                whileTap={aEnviar ? undefined : { scale: 0.99 }}
                                className="w-full bg-white text-stone-900 rounded-md py-4 font-bold text-sm tracking-[0.2em] uppercase hover:bg-stone-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black disabled:opacity-60 disabled:cursor-wait"
                            >
                                {aEnviar ? "A entrar…" : "Entrar"}
                            </motion.button>

                            {notice && (
                                <p role="status" className="text-center text-sm text-[#e0a0a0] pt-2">
                                    {notice}
                                </p>
                            )}
                        </form>

                        {/* Rodapé do cartão */}
                        <div className="bg-[#5c1414] px-6 py-6 text-center">
                            <p className="text-[#e08a8a] text-xs tracking-wider uppercase">
                                © {new Date().getFullYear()} Tech-Gest: GPL. Todos os direitos reservados.
                            </p>
                        </div>
                    </div>

                    {/* Logos institucionais */}
                    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8 mt-10">
                        <div className="bg-white rounded-lg border-2 border-white shadow-lg px-6 py-3 flex items-center justify-center">
                            <img src={asset("client_luanda1.png")} alt="Governo Provincial de Luanda" className="h-12 md:h-14 w-auto object-contain" />
                        </div>

                        <div className="bg-white rounded-lg border-2 border-white shadow-lg px-6 py-3 flex items-center justify-center">
                            <img src={asset("GGPEN_LOGO-scaled.png")} alt="GGPEN" className="h-12 md:h-14 w-auto object-contain" />
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
