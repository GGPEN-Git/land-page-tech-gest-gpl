import React from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Mission } from "./components/Mission";
import { HowItWorks } from "./components/HowItWorks";
import { Impact } from "./components/Impact";
import { Community } from "./components/Community";
import { Footer } from "./components/Footer";
import { Button } from "./components/ui/Button";
export function App() {
    return (
        <div className="min-h-screen bg-stone-50 font-sans text-stone-900 selection:bg-[#c4703d] selection:text-white">
            <Navbar />

            <main>
                <Hero />
                <Mission />
                <HowItWorks />
                <Impact />
                <Community />

                {/* Final CTA Section */}
                <section className="py-20 bg-[#4d221a] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <img src="/boavista_mapa.png" alt="Forest texture" className="w-full h-full object-cover grayscale" />
                    </div>
                    <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
                        {/* <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">Ready to make a difference?</h2>
                        <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                            Join our network of conservationists, researchers, and community leaders working to protect Angola's coastline.
                        </p> */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button size="lg" variant="primary">
                                <a href="https://gedae.ggpen.gov.ao/tech-gest-gpl" rel="noopener noreferrer">
                                    Aceder a Plataforma
                                </a>
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
