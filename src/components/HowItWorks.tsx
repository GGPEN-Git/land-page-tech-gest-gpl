import React from "react";
import { motion } from "framer-motion";
import { Satellite, GalleryHorizontal, ChartColumn } from "lucide-react";

export function HowItWorks() {
    const steps = [
        {
            icon: Satellite,
            title: "Levantamento Georreferenciado",
            description:
                "Extração automática de polígonos representativos dos imóveis em áreas de difícil acesso no Sambizanga e Ingombota.",
        },
        {
            icon: ChartColumn,
            title: "Módulo de Dados Estatísticos",
            description:
                "Contabilização e caracterização rigorosa das habitações para suporte à tomada de decisão do GPL.",
        },
        {
            icon: GalleryHorizontal,
            title: "Deteção de Zonas de Risco",
            description:
                "Identificação de perímetros críticos e prevenção de atos de vandalização em infraestruturas estratégicas.",
        },
    ];

    return (
        <section
            id="technology"
            className="py-24 bg-[#0a0e14] text-white overflow-hidden relative"
        >
            {/* Subtle red radial glow — echoes the satellite-map accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#c43d3d] opacity-[0.07] blur-[120px] rounded-full pointer-events-none" />

            {/* Background grid pattern */}
            <div className="absolute inset-0 opacity-[0.04]">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-[#c43d3d] font-bold text-sm tracking-[0.2em] uppercase mb-4">
                        Funcionalidades
                    </h2>
                    <h3 className="text-3xl md:text-4xl font-serif font-bold mb-6 leading-tight">
                        Mapeamento Urbano Impulsionado por IA
                    </h3>
                    <p className="text-white/70 text-lg leading-relaxed">
                        A ferramenta permite a visualização das áreas críticas em todo o território municipal, bem como a
                        geração de dados estatísticos por distrito e comuna, permitindo a comparação de densidade
                        habitacional com períodos anteriores para fins de planeamento e realojamento.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.2 }}
                            className="group bg-white/[0.03] backdrop-blur-sm border border-white/10 p-8 rounded-2xl hover:border-[#c43d3d]/40 hover:bg-white/[0.06] transition-all duration-300"
                        >
                            <div className="w-14 h-14 bg-[#c43d3d] rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-[#c43d3d]/20 rotate-3 group-hover:rotate-6 transition-transform duration-300">
                                <step.icon className="w-7 h-7 text-white" />
                            </div>
                            <h4 className="text-xl font-bold mb-3 font-serif">{step.title}</h4>
                            <p className="text-white/60 leading-relaxed">{step.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}