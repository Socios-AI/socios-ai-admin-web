"use client";

import { useRouter, usePathname } from "next/navigation";

export type TabItem = { key: string; label: string };

type Props = {
  items: TabItem[];
  active: string;
};

export function TabNav({ items, active }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      role="tablist"
      className="flex gap-1 border-b border-border mb-6 overflow-x-auto"
    >
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
            className={[
              "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
