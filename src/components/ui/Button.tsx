import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost";
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
}
export function Button({ className, variant = "primary", size = "md", children, ...props }: ButtonProps) {
    const variants = {
        primary: "bg-[#c43d3d] text-white hover:bg-[#754040] border border-transparent shadow-sm",
        secondary: "bg-[#c4b03d] text-white hover:bg-[#a85d30] border border-transparent shadow-sm",
        outline: "bg-transparent border-2 border-[#1a4d2e] text-[#1a4d2e] hover:bg-[#1a4d2e]/5",
        ghost: "bg-transparent text-[#1a4d2e] hover:bg-[#1a4d2e]/10",
    };
    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg",
    };
    return (
        <motion.button
            whileHover={{
                scale: 1.02,
            }}
            whileTap={{
                scale: 0.98,
            }}
            className={`
        inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none
        ${variants[variant]}
        ${sizes[size]}
        ${className || ""}
      `}
            {...props}
        >
            {children}
        </motion.button>
    );
}
