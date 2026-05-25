import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
export function Mission() {
    return (
        <section id="mission" className="py-20 md:py-32 bg-stone-50">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
                    {/* Image Grid */}
                    <motion.div
                        initial={{
                            opacity: 0,
                            x: -20,
                        }}
                        whileInView={{
                            opacity: 1,
                            x: 0,
                        }}
                        viewport={{
                            once: true,
                        }}
                        transition={{
                            duration: 0.8,
                        }}
                        className="relative"
                    >
                        <div className="aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl" id="usmore">
                            <img
                                src="/caminhodeferro02.jpg"
                                alt="Angolan community near mangroves"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-2/3 aspect-square rounded-2xl overflow-hidden shadow-xl border-8 border-stone-50 hidden md:block">
                            <img src="/caminhodeferro03.jpg" alt="Mangrove roots detail" className="w-full h-full object-cover" />
                        </div>
                        {/* Decorative element */}
                        <div className="absolute -top-4 -left-4 w-24 h-24 bg-[#c4703d]/10 rounded-full -z-10" />
                    </motion.div>

                    {/* Content */}
                    <motion.div
                        initial={{
                            opacity: 0,
                            x: 20,
                        }}
                        whileInView={{
                            opacity: 1,
                            x: 0,
                        }}
                        viewport={{
                            once: true,
                        }}
                        transition={{
                            duration: 0.8,
                            delay: 0.2,
                        }}
                    >
                        <h2 className="text-[#b82727] font-bold text-sm tracking-widest uppercase mb-4">Sobre o Projeto</h2>
                        <h3 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-6 leading-tight">
                            Do Satélite ao Terreno: Mapeamento Inteligente de <span className="text-[#882626]">Luanda</span>
                        </h3>
                        <p className="text-lg text-stone-600 mb-8 leading-relaxed">
                            No âmbito do reforço da cooperação institucional entre o GPL e o GGPEN, implementamos uma solução tecnológica
                            focada na identificação de comunidades em áreas de risco e na prevenção da vandalização de infraestruturas. Esta
                            ferramenta é essencial para o sucesso do censo nos distritos da Ingombota e do Sambizanga.
                        </p>

                        {/* <ul className="space-y-4 mb-10">
                            {[
                                "Protecting coastal communities from erosion and flooding",
                                "Supporting local fisheries and food security",
                                "Sequestering carbon to fight climate change",
                                "Preserving biodiversity unique to Angola",
                            ].map((item, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-[#c4703d] flex-shrink-0 mt-0.5" />
                                    <span className="text-stone-700 font-medium">{item}</span>
                                </li>
                            ))}
                        </ul> */}

                        <div className="p-6 bg-white rounded-xl border border-stone-100 shadow-sm">
                            <p className="text-stone-800 italic font-serif text-lg">
                                "A plataforma utiliza Inteligência Artificial para extrair automaticamente polígonos de imóveis a partir de
                                imagens de satélite de alta resolução. Geramos dados precisos de localização, área e morfologia habitacional
                                para apoiar decisões estratégicas de realojamento e ordenamento do território."
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
