import React from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
export function Community() {
    return (
        <section id="community" className="py-20 bg-white">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-[#882626] font-bold text-sm tracking-widest uppercase mb-4">Equipa Técnica</h2>
                    <h3 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-6">Recolha de Dados e Validação em Campo</h3>
                    <p className="text-stone-600 text-lg">
                        Para além do processamento de imagens de satélite, as nossas equipas percorrem o terreno para garantir a
                        caracterização precisa das habitações e o controlo de qualidade dos dados recolhidos.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    {["/fieldwork1.jpg", "/fieldwork2.png", "/fieldwork3.jpg"].map((src, index) => (
                        <motion.div
                            key={index}
                            initial={{
                                opacity: 0,
                                y: 20,
                            }}
                            whileInView={{
                                opacity: 1,
                                y: 0,
                            }}
                            viewport={{
                                once: true,
                            }}
                            transition={{
                                delay: index * 0.2,
                            }}
                            className="group relative overflow-hidden rounded-2xl aspect-[3/4]"
                        >
                            <img
                                src={src}
                                alt="Community member"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />

                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                            {/* <div className="absolute bottom-0 left-0 p-6">
                                <p className="text-white font-serif text-xl font-medium">Mangrove Mapping</p>
                                <p className="text-white/70 text-sm">Luanda Province</p>
                            </div> */}
                        </motion.div>
                    ))}
                </div>

                {/* <div className="bg-[#f5f2eb] rounded-3xl p-8 md:p-12 relative overflow-hidden">
                    <Quote className="absolute top-8 left-8 text-[#c4703d]/20 w-24 h-24" />
                    <div className="relative z-10 max-w-4xl mx-auto text-center">
                        <p className="text-2xl md:text-3xl font-serif text-stone-800 leading-relaxed mb-8">
                            "Before we had this data, we were fighting blindly. Now we know exactly where the threats are, and we can
                            mobilize our community to protect the areas that need it most."
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-stone-300 overflow-hidden">
                                <img
                                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=2787&auto=format&fit=crop"
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-stone-900">Dr. Mateus Silva</div>
                                <div className="text-stone-500 text-sm">Director of Coastal Conservation</div>
                            </div>
                        </div>
                    </div>
                </div> */}
            </div>
        </section>
    );
}
