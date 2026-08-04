import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Plus, X } from "lucide-react";
import {
    atualizarUtilizador,
    criarUtilizador,
    listarUtilizadores,
    type Papel,
    type Utilizador,
    type UtilizadorDetalhe,
} from "../lib/api";

const MIN_PALAVRA_PASSE = 10;

interface UtilizadoresProps {
    /** Sessão atual — usada para não deixar o admin mexer na própria conta. */
    atual: Utilizador;
    onFechar: () => void;
}

export function Utilizadores({ atual, onFechar }: UtilizadoresProps) {
    const [lista, setLista] = useState<UtilizadorDetalhe[]>([]);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    const [aCriar, setACriar] = useState(false);
    const [email, setEmail] = useState("");
    const [nome, setNome] = useState("");
    const [palavraPasse, setPalavraPasse] = useState("");
    const [papel, setPapel] = useState<Papel>("utilizador");
    const [aGravar, setAGravar] = useState(false);

    async function recarregar() {
        try {
            const { utilizadores } = await listarUtilizadores();
            setLista(utilizadores);
            setErro(null);
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível obter os utilizadores.");
        } finally {
            setACarregar(false);
        }
    }

    useEffect(() => {
        recarregar();
    }, []);

    async function submeter(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (palavraPasse.length < MIN_PALAVRA_PASSE) {
            setErro(`A palavra-passe deve ter pelo menos ${MIN_PALAVRA_PASSE} caracteres.`);
            return;
        }

        setAGravar(true);
        setErro(null);

        try {
            await criarUtilizador({ email: email.trim(), nome: nome.trim(), palavraPasse, papel });

            setAviso(`Conta criada para ${email.trim()}. Comunique-lhe a palavra-passe por um canal seguro.`);
            setEmail("");
            setNome("");
            setPalavraPasse("");
            setPapel("utilizador");
            setACriar(false);

            await recarregar();
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível criar a conta.");
        } finally {
            setAGravar(false);
        }
    }

    async function alternarAtivo(utilizador: UtilizadorDetalhe) {
        setErro(null);

        try {
            await atualizarUtilizador(utilizador.id, { ativo: !utilizador.ativo });
            await recarregar();
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível alterar a conta.");
        }
    }

    async function alternarPapel(utilizador: UtilizadorDetalhe) {
        setErro(null);

        try {
            await atualizarUtilizador(utilizador.id, {
                papel: utilizador.papel === "admin" ? "utilizador" : "admin",
            });
            await recarregar();
        } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível alterar o papel.");
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                role="dialog"
                aria-modal="true"
                aria-label="Gestão de utilizadores"
                className="w-full max-w-3xl max-h-full flex flex-col bg-[#0b1c38] rounded-2xl shadow-2xl overflow-hidden"
            >
                <header className="shrink-0 flex items-center justify-between gap-4 px-6 py-4 bg-[#12294d]">
                    <h2 className="text-white text-base font-semibold">Utilizadores</h2>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setACriar((v) => !v)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1e6fd9] text-white text-sm hover:bg-[#1a5fb8] transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Dar acesso
                        </button>

                        <button
                            type="button"
                            onClick={onFechar}
                            aria-label="Fechar"
                            className="w-8 h-8 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
                    {aviso && (
                        <p className="rounded-md bg-[#1a4d2e]/40 border border-[#5dd618]/30 px-4 py-3 text-sm text-[#b6e9a0]">
                            {aviso}
                        </p>
                    )}

                    {erro && (
                        <p role="alert" className="rounded-md bg-[#5c1414]/50 border border-[#e08a8a]/30 px-4 py-3 text-sm text-[#e08a8a]">
                            {erro}
                        </p>
                    )}

                    {aCriar && (
                        <form onSubmit={submeter} className="rounded-xl bg-[#0e2242] p-4 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email"
                                    className="bg-transparent border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50"
                                />

                                <input
                                    type="text"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    placeholder="Nome completo"
                                    className="bg-transparent border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50"
                                />

                                <input
                                    type="text"
                                    required
                                    value={palavraPasse}
                                    onChange={(e) => setPalavraPasse(e.target.value)}
                                    placeholder={`Palavra-passe (mín. ${MIN_PALAVRA_PASSE})`}
                                    className="bg-transparent border border-white/20 rounded-md px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50"
                                />

                                <select
                                    value={papel}
                                    onChange={(e) => setPapel(e.target.value as Papel)}
                                    className="bg-[#0b1c38] border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-white/50"
                                >
                                    <option value="utilizador">Utilizador</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>

                            <p className="text-[11px] text-white/40 leading-snug">
                                A palavra-passe é escrita por si e mostrada em claro aqui. Comunique-a por um canal
                                seguro e peça que seja mudada no primeiro acesso.
                            </p>

                            <button
                                type="submit"
                                disabled={aGravar}
                                className="flex items-center gap-2 px-4 py-2 rounded-md bg-white text-stone-900 text-sm font-semibold hover:bg-stone-100 transition-colors disabled:opacity-60"
                            >
                                {aGravar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Criar conta
                            </button>
                        </form>
                    )}

                    {aCarregar ? (
                        <p className="text-sm text-white/50">A carregar…</p>
                    ) : (
                        <ul className="space-y-2">
                            {lista.map((utilizador) => {
                                const euProprio = utilizador.id === atual.id;

                                return (
                                    <li
                                        key={utilizador.id}
                                        className="flex flex-wrap items-center gap-3 rounded-xl bg-[#0e2242] px-4 py-3"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-white text-sm truncate">
                                                {utilizador.nome}
                                                {euProprio && <span className="text-white/40"> (você)</span>}
                                            </p>
                                            <p className="text-white/50 text-xs truncate">{utilizador.email}</p>
                                        </div>

                                        <span
                                            className={`shrink-0 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide ${
                                                utilizador.papel === "admin"
                                                    ? "bg-[#1e6fd9] text-white"
                                                    : "bg-white/10 text-white/70"
                                            }`}
                                        >
                                            {utilizador.papel === "admin" ? "Admin" : "Utilizador"}
                                        </span>

                                        {!utilizador.ativo && (
                                            <span className="shrink-0 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide bg-[#5c1414] text-[#e08a8a]">
                                                Inativo
                                            </span>
                                        )}

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => alternarPapel(utilizador)}
                                                disabled={euProprio}
                                                className="text-xs text-white/70 hover:text-white underline underline-offset-2 disabled:opacity-30 disabled:no-underline disabled:cursor-not-allowed"
                                            >
                                                {utilizador.papel === "admin" ? "Despromover" : "Tornar admin"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => alternarAtivo(utilizador)}
                                                disabled={euProprio}
                                                className="text-xs text-white/70 hover:text-white underline underline-offset-2 disabled:opacity-30 disabled:no-underline disabled:cursor-not-allowed"
                                            >
                                                {utilizador.ativo ? "Desativar" : "Reativar"}
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
