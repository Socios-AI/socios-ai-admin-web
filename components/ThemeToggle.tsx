"use client";

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
  const Icon = ICONS[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={LABELS[theme]}
      title={LABELS[theme]}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
