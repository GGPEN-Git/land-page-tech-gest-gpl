import React, { useEffect, useState } from "react";
import { Menu, X, Leaf } from "lucide-react";
import { Button } from "./ui/Button";
import { motion, AnimatePresence } from "framer-motion";
export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white/95 backdrop-blur-md shadow-sm py-3" : "bg-transparent py-6"}`}
        >
            <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-[#fff] px-1 py-0.5 rounded-lg">
                        <img width={40} height={20} src={"/client_luanda1.png"} alt="Forest texture" className="" />
                    </div>
                    <span className={`font-serif font-bold text-md tracking-tight ${isScrolled ? "text-[#c43d3d]" : "text-white"}`}>
                        Tech-Gest: <span className="text-[#c43d3d]">GPL</span>
                        <span className="text-[#d89595] text-[10px] mx-2">POWERED BY</span>
                    </span>

                    <div className="bg-[#fff] px-1 py-0.5 rounded-lg">
                        <img width={42} height={22} src={"/GGPEN_LOGO-scaled.png"} alt="Forest texture" className="" />
                    </div>
                </div>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {/* {["Mission", "Technology", "Impact", "Community"].map((item) => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase()}`}
                            className={`text-sm font-medium transition-colors hover:text-[#c4703d] ${isScrolled ? "text-stone-600" : "text-white/90"}`}
                        >
                            {item}
                        </a>
                    ))} */}

                    {/* {[
                        "/public/614946542_1184548203854193_3146070011328753933_n.jpg",
                        "https://gedae.ggpen.gov.ao/ferramenta-de-visualizacao/projeto-seca/images/ptflag.png",
                    ].map((item) => (
                        <img width={30} height={15} src={item} alt="Forest texture" className="" />
                    ))} */}

                    {/* <Button variant={isScrolled ? "primary" : "secondary"} size="sm">
                        <a href="https://gedae.ggpen.gov.ao/ferramenta-de-visualizacao/otchiva/index.php" rel="noopener noreferrer">
                            Login
                        </a>
                    </Button> */}
                </div>

                {/* Mobile Toggle */}
                <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? (
                        <X className={isScrolled ? "text-[#1a4d2e]" : "text-white"} />
                    ) : (
                        <Menu className={isScrolled ? "text-[#1a4d2e]" : "text-white"} />
                    )}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{
                            opacity: 0,
                            height: 0,
                        }}
                        animate={{
                            opacity: 1,
                            height: "auto",
                        }}
                        exit={{
                            opacity: 0,
                            height: 0,
                        }}
                        className="md:hidden bg-white border-t border-stone-100"
                    >
                        <div className="flex flex-col p-4 gap-4">
                            {["Mission", "Technology", "Impact", "Community"].map((item) => (
                                <a
                                    key={item}
                                    href={`#${item.toLowerCase()}`}
                                    className="text-stone-600 font-medium py-2 border-b border-stone-100"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {item}
                                </a>
                            ))}
                            <Button className="w-full mt-2">Access Platform</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
