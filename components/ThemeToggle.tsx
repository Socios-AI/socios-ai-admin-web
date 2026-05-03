"use client";

import { useEffect, useState } from "react";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";

const ORDER: Theme[] = ["light", "dark", "system"];

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<Theme, string> = {
  light: "Tema claro (clique para escuro)",
  dark: "Tema escuro (clique para automático)",
  system: "Tema automático (clique para claro)",
};

// Inline variant pra usar no Sidebar footer (sem fixed positioning).
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // Server renderiza "system" (default), client lê localStorage.
  // Renderizar o ícone direto causa hydration mismatch (React #418).
  // Mounted-flag: até o useEffect rodar, render placeholder genérico.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const Icon = mounted ? ICONS[theme] : Monitor;
  const label = mounted ? LABELS[theme] : "Carregando tema";
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => mounted && setTheme(next)}
      aria-label={label}
      title={label}
      suppressHydrationWarning
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
