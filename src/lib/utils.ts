import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Prefixa um ficheiro de `public/` com a base do Vite.
 * Sem isto, um caminho absoluto como "/logo.png" aponta para a raiz do domínio
 * e parte quando o site é servido em subcaminho (ex.: GitHub Pages).
 */
export function asset(caminho: string): string {
  return `${import.meta.env.BASE_URL}${caminho.replace(/^\/+/, "")}`;
}