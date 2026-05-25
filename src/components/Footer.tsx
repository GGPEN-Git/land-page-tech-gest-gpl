import React from "react";
import { MapPin, Mail, ArrowUpRight } from "lucide-react";

export function Footer() {
  
    return (
        <footer className="bg-[#0a0e14] text-white pt-20 pb-10 relative overflow-hidden">
            {/* Subtle red glow to tie back to the brand accent */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#c43d3d] opacity-[0.05] blur-[120px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    {/* Brand block */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-white p-1 rounded-lg shrink-0">
                                <img
                                    width={40}
                                    height={20}
                                    src={"/client_luanda1.png"}
                                    alt="Brasão do Governo Provincial de Luanda"
                                />
                            </div>
                            <span className="font-serif font-bold text-xl tracking-tight leading-tight">
                                Tech-Gest:{" "}
                                <span className="text-[#c43d3d]">Governo Provincial de Luanda</span>
                            </span>
                        </div>
                        <p className="text-white/60 max-w-md leading-relaxed">
                            Solução de inteligência artificial aplicada ao planeamento urbano e à gestão de zonas de
                            risco, desenvolvida pelo GGPEN para o Governo Provincial de Luanda.
                        </p>
                    </div>

                    {/* Navigation */}
                    

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold text-sm tracking-[0.2em] uppercase text-[#c43d3d] mb-6">
                            Contacto
                        </h4>
                        <ul className="space-y-4 text-white/60">
                            <li className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-[#c43d3d] shrink-0" />
                                <span>Luanda, Angola</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-[#c43d3d] shrink-0" />
                                <a href="mailto:geral@ggpen.gov.ao" className="hover:text-white transition-colors">
                                    geral@ggpen.gov.ao
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
                    <p>&copy; 2026 Tech-Gest: DNP. Todos os direitos reservados.</p>
                    <div className="flex items-center gap-2">
                        <span>Desenvolvido em</span>
                        <span className="font-semibold text-white/70">Angola</span>
                        <div className="flex h-3 w-4 border border-white/20 overflow-hidden rounded-[2px]">
                            <div className="w-1/2 bg-[#CD2A3E]" />
                            <div className="w-1/2 bg-black" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}