import React, { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { alterarPalavraPassePropria } from "../lib/api";

const MIN_PALAVRA_PASSE = 10;

interface AlterarPalavraPasseProps {
    onFechar: () => void;
}

export function AlterarPalavraPasse({ onFechar }: AlterarPalavraPasseProps) {
    const [atual, setAtual] = useState("");
    const [nova, setNova] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [feito, setFeito] = useState(false);
    const [aGravar, setAGravar] = useState(false);

    async function submeter(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (nova !== confirmacao) {
            setErro("A confirmação não coincide com a nova palavra-passe.");
            return;
        }

        if (nova.length < MIN_PALAVRA_PASSE) {
            setErro(`A nova palavra-passe deve ter pelo menos ${MIN_PALAVRA_PASSE} caracteres.`);
            return;
        }

        setAGravar(true);
        setErro(null);

        try {
            await alterarPalavraPassePropria(atual, nova);
            setFeito(true);
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível alterar a palavra-passe.");
        } finally {
            setAGravar(false);
        }
    }

    const campo =
        "w-full bg-transparent border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                role="dialog"
                aria-modal="true"
                aria-label="Alterar palavra-passe"
                className="w-full max-w-md bg-[#0b1c38] rounded-2xl shadow-2xl overflow-hidden"
            >
                <header className="flex items-center justify-between gap-4 px-6 py-4 bg-[#12294d]">
                    <h2 className="text-white text-base font-semibold">Alterar palavra-passe</h2>

                    <button
                        type="button"
                        onClick={onFechar}
                        aria-label="Fechar"
                        className="w-8 h-8 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {feito ? (
                    <div className="px-6 py-6 space-y-4">
                        <p className="text-sm text-[#b6e9a0]">
                            Palavra-passe alterada. As sessões abertas noutros dispositivos foram terminadas.
                        </p>

                        <button
                            type="button"
                            onClick={onFechar}
                            className="px-4 py-2 rounded-md bg-white text-stone-900 text-sm font-semibold hover:bg-stone-100 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                ) : (
                    <form onSubmit={submeter} className="px-6 py-6 space-y-3">
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            value={atual}
                            onChange={(e) => setAtual(e.target.value)}
                            placeholder="Palavra-passe atual"
                            className={campo}
                        />

                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            value={nova}
                            onChange={(e) => setNova(e.target.value)}
                            placeholder={`Nova palavra-passe (mín. ${MIN_PALAVRA_PASSE})`}
                            className={campo}
                        />

                        <input
                            type="password"
                            required
                            autoComplete="new-password"
                            value={confirmacao}
                            onChange={(e) => setConfirmacao(e.target.value)}
                            placeholder="Confirmar a nova palavra-passe"
                            className={campo}
                        />

                        {erro && (
                            <p role="alert" className="text-sm text-[#e08a8a]">
                                {erro}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={aGravar}
                            className="w-full px-4 py-2 rounded-md bg-white text-stone-900 text-sm font-semibold hover:bg-stone-100 transition-colors disabled:opacity-60"
                        >
                            {aGravar ? "A guardar…" : "Guardar"}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
