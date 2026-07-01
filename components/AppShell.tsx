"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "./SidebarNav";

export function AppShell({
  isRegistrar = false,
  isSuper = false,
  isPreview = false,
  children,
}: {
  isRegistrar?: boolean;
  isSuper?: boolean;
  isPreview?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const navProps = { isRegistrar, isSuper, isPreview };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground md:block">
        <SidebarNav {...navProps} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground shadow-lg">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <SidebarNav {...navProps} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar-background px-4 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src="/brand/logo-socios.png"
              alt=""
              className="h-6 w-6 object-contain"
            />
            <span className="font-display text-sm font-semibold">Admin</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-6 sm:p-10">
          {isPreview ? (
            <div className="mb-6 rounded-lg border border-warning/50 bg-warning/15 px-4 py-2.5 text-sm text-foreground">
              Você está vendo o painel <strong>como Cadastrador</strong>. Use o
              botão no menu lateral para voltar à visão completa.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
