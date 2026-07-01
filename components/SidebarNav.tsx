"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  AppWindow,
  Tag,
  Package,
  FileText,
  Handshake,
  Megaphone,
  Network,
  Receipt,
  Target,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/ui/cn";
import { ThemeToggle } from "./ThemeToggle";
import { enableRegistrarPreview, disableRegistrarPreview } from "@/app/_actions/view-as";

type Item = {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  registrarVisible?: boolean;
};

type Group = { section: string; items: Item[] };

// `registrarVisible`: itens que o papel "cadastrador" (tier registrar) enxerga.
// Bate com a allowlist da middleware (/orgs, /partners, /tree).
const GROUPS: Group[] = [
  {
    section: "Visão geral",
    items: [{ href: "/", label: "Dashboard", Icon: LayoutDashboard }],
  },
  {
    section: "Pessoas & contas",
    items: [
      { href: "/users", label: "Usuários", Icon: Users },
      { href: "/orgs", label: "Organizações", Icon: Building2, registrarVisible: true },
      { href: "/affiliates", label: "Afiliados", Icon: Megaphone },
    ],
  },
  {
    section: "Rede de parceiros",
    items: [
      { href: "/partners", label: "Parceiros", Icon: Handshake, registrarVisible: true },
      { href: "/tree", label: "Árvore da rede", Icon: Network, registrarVisible: true },
      { href: "/attributions", label: "Atribuição de vendas", Icon: Target },
      { href: "/commissions", label: "Comissões", Icon: Receipt },
    ],
  },
  {
    section: "Catálogo",
    items: [
      { href: "/apps", label: "Apps", Icon: AppWindow },
      { href: "/plans", label: "Planos", Icon: Tag },
      { href: "/products", label: "Produtos & Taxas", Icon: Package },
    ],
  },
  {
    section: "Sistema",
    items: [{ href: "/audit", label: "Auditoria", Icon: FileText }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({
  isRegistrar = false,
  isSuper = false,
  isPreview = false,
  onNavigate,
}: {
  isRegistrar?: boolean;
  isSuper?: boolean;
  isPreview?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = isRegistrar
    ? GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.registrarVisible),
      })).filter((g) => g.items.length > 0)
    : GROUPS;

  return (
    <div className="flex h-full flex-col gap-1 p-4">
      {/* Brand lockup · skill socios-ai-design-system */}
      <div className="mb-4 flex items-center gap-2.5 px-2 py-3">
        <img
          src="/brand/logo-socios.png"
          alt=""
          className="h-8 w-8 shrink-0 object-contain"
        />
        <div className="flex min-w-0 flex-col leading-none">
          <span className="font-display text-[15px] font-semibold tracking-tight">
            Admin
          </span>
          <span className="mt-0.5 font-mono text-[9px] font-medium tracking-[0.08em] text-muted-foreground">
            by Sócios AI
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.section} className="space-y-1">
            <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {group.section}
            </p>
            {group.items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={isActive(pathname, href) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
                  isActive(pathname, href)
                    ? "border-primary bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "border-transparent hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Super_admin: alternar a visão do Cadastrador (testar/dar suporte). */}
      {isSuper ? (
        <form
          action={isPreview ? disableRegistrarPreview : enableRegistrarPreview}
          className="mt-3 border-t border-sidebar-border pt-3"
        >
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {isPreview ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {isPreview ? "Sair da visão de Cadastrador" : "Ver como Cadastrador"}
          </button>
        </form>
      ) : null}

      {/* Footer: signout + theme */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-sidebar-border pt-3">
        <form action="/signout" method="POST" className="flex-1">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </form>
        <ThemeToggle />
      </div>
    </div>
  );
}
