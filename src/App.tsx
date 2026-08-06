import { useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Mission } from "./components/Mission";
import { HowItWorks } from "./components/HowItWorks";
import { Impact } from "./components/Impact";
import { Community } from "./components/Community";
import { Footer } from "./components/Footer";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { Button } from "./components/ui/Button";
import { asset } from "./lib/utils";
import { sessaoAtual, terminarSessao, type Utilizador } from "./lib/api";
export function App() {
    const [view, setView] = useState<"landing" | "login" | "dashboard">("landing");
    const [utilizador, setUtilizador] = useState<Utilizador | null>(null);

    // Sessão em cookie: ao recarregar a página perguntamos ao servidor se ainda é válida.
    useEffect(() => {
        sessaoAtual()
            .then(({ utilizador: atual }) => setUtilizador(atual))
            .catch(() => setUtilizador(null));
    }, []);

    function irParaAcesso() {
        setView(utilizador ? "dashboard" : "login");
    }

    async function sair() {
        try {
            await terminarSessao();
        } catch {
            // Sessão já caducada do lado do servidor — o efeito local é o mesmo.
        }

        setUtilizador(null);
        setView("landing");
    }

    if (view === "login") {
        return (
            <Login
                onBack={() => setView("landing")}
                onSuccess={(autenticado) => {
                    setUtilizador(autenticado);
                    setView("dashboard");
                }}
            />
        );
    }

    if (view === "dashboard") {
        return <Dashboard utilizador={utilizador} onLogout={sair} papel={utilizador?.papel} />;
    }

    return (
        <div className="min-h-screen bg-stone-50 font-sans text-stone-900 selection:bg-[#c4703d] selection:text-white">
            <Navbar />

            <main>
                <Hero onLogin={irParaAcesso} />
                <Mission />
                <HowItWorks />
                <Impact />
                <Community />

                {/* Final CTA Section */}
                <section className="py-20 bg-[#4d221a] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <img src={asset("boavista_mapa.png")} alt="Forest texture" className="w-full h-full object-cover grayscale" />
                    </div>
                    <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
                        {/* <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">Ready to make a difference?</h2>
                        <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                            Join our network of conservationists, researchers, and community leaders working to protect Angola's coastline.
                        </p> */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" variant="primary" onClick={irParaAcesso}>
                                Aceder a Plataforma
                            </Button>
                            {/* <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                                Contact Our Team
                            </Button> */}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
