import { MapPin } from "lucide-react";
export function Footer() {
    return (
        <footer className="bg-[#1a1a1a] text-white pt-20 pb-10">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="bg-[#fff] p-0.5 rounded-lg">
                                <img width={40} height={20} src={"/client_luanda1.png"} alt="Forest texture" className="" />
                            </div>

                            <span className="font-serif font-bold text-xl tracking-tight">
                                Tech-Gest: <span className="text-[#c4b03d]">Governo Provincial de Luanda</span>
                            </span>
                        </div>
                        {/* <p className="text-stone-400 max-w-md mb-8 leading-relaxed">
                            A national initiative combining satellite technology and community action to preserve Angola's vital coastal
                            ecosystems for future generations.
                        </p> */}
                        <div className="flex gap-4">
                            {/* Placeholder Social Icons */}
                            {/* {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#c4703d] transition-colors cursor-pointer"
                                >
                                    <div className="w-5 h-5 bg-current rounded-sm opacity-50" />
                                </div>
                            ))} */}
                        </div>
                    </div>

                    {/* <div>
                        <h4 className="font-bold text-lg mb-6">Quick Links</h4>
                        <ul className="space-y-4 text-stone-400">
                            <li>
                                <a href="#" className="hover:text-[#c4703d] transition-colors">
                                    About the Project
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-[#c4703d] transition-colors">
                                    Methodology
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-[#c4703d] transition-colors">
                                    Impact Reports
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-[#c4703d] transition-colors">
                                    Partner With Us
                                </a>
                            </li>
                        </ul>
                    </div> */}

                    <div>
                        {/* <h4 className="font-bold text-lg mb-6">Contacto</h4> */}
                        <ul className="space-y-4 text-stone-400">
                            {/* <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-[#c4b03d]" />
                                <span>EMAIL</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-[#c4b03d]" />
                                <span>NUMERO DE TELEFONE</span>
                            </li> */}
                            <li className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-[#c4b03d]" />
                                <span>Luanda, Angola</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-stone-500 text-sm">
                    <p>&copy; 2026 Tech-Gest: GPL. Todos os direitos reservados.</p>
                    <div className="flex items-center gap-2">
                        {/* <span>Built with pride in</span>
                        <span className="font-bold text-white">Angola</span>
                        <div className="flex h-3 w-4 border border-white/20">
                            <div className="w-1/2 bg-[#CD2A3E]"></div>
                            <div className="w-1/2 bg-black"></div>
                        </div> */}
                    </div>
                </div>
            </div>
        </footer>
    );
}
