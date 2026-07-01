"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/ui/cn";

export type TabItem = { key: string; label: string };

const listClass = "flex gap-1 border-b border-border overflow-x-auto";

function tabClass(isActive: boolean) {
  return cn(
    "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
    isActive
      ? "border-primary text-foreground"
      : "border-transparent text-muted-foreground hover:text-foreground",
  );
}

// URL-driven tabs (writes ?tab=<key>). Keeps parity with the legacy TabNav.
export function TabNav({
  items,
  active,
  className,
}: {
  items: TabItem[];
  active: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div role="tablist" className={cn(listClass, "mb-6", className)}>
      {items.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() =>
              router.replace(`${pathname}?tab=${t.key}`, { scroll: false })
            }
            className={tabClass(isActive)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// Controlled tabs (in-page state, no URL change).
export function Tabs({
  items,
  value,
  onValueChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onValueChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn(listClass, "mb-6", className)}>
      {items.map((t) => {
        const isActive = t.key === value;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(t.key)}
            className={tabClass(isActive)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
