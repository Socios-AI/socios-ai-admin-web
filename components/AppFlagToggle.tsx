"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleAppFlagAction } from "@/app/_actions/toggle-app-flag";

export type AppFlagToggleProps = {
  slug: string;
  flag: "active" | "accepts_new_subscriptions";
  current: boolean;
  label: string;
  description: string;
};

export function AppFlagToggle({ slug, flag, current, label, description }: AppFlagToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    const reason = window.prompt(
      `Motivo para ${current ? "desligar" : "ligar"} "${label}":`,
      current ? "Desativando temporariamente" : "Reativando",
    );
    if (!reason || reason.trim().length < 5) {
      setError("Motivo precisa ter pelo menos 5 caracteres");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await toggleAppFlagAction({
        slug,
        flag,
        value: !current,
        reason: reason.trim(),
      });
      if (!result.ok) {
        setError(result.message ?? result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
        {error && <div className="text-xs text-destructive mt-1">{error}</div>}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
          current ? "bg-foreground" : "bg-muted-foreground/30"
        }`}
        role="switch"
        aria-checked={current}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
            current ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
