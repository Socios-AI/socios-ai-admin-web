import Link from "next/link";
import { LayoutDashboard, Users, Building2, AppWindow, Tag, Activity, FileText, Handshake, Megaphone, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const ITEMS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/users", label: "Usuários", Icon: Users },
  { href: "/orgs", label: "Organizações", Icon: Building2 },
  { href: "/apps", label: "Apps", Icon: AppWindow },
  { href: "/plans", label: "Planos", Icon: Tag },
  { href: "/partners", label: "Parceiros", Icon: Handshake },
  { href: "/affiliates", label: "Afiliados", Icon: Megaphone },
  { href: "/sessions", label: "Sessões (em breve)", Icon: Activity, disabled: true },
  { href: "/audit", label: "Auditoria", Icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-sidebar-border h-screen sticky top-0 p-4 flex flex-col gap-1 bg-sidebar-background text-sidebar-foreground">
      {/* Brand lockup · skill socios-ai-design-system */}
      <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
        <img src="/brand/logo-socios.png" alt="" className="h-8 w-8 object-contain shrink-0" />
        <div className="flex flex-col leading-none min-w-0">
          <span className="font-display font-semibold text-[15px] tracking-tight">
            Admin
          </span>
          <span className="font-mono text-[9px] font-medium text-muted-foreground mt-0.5 tracking-[0.08em]">
            by Sócios AI
          </span>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {ITEMS.map(({ href, label, Icon, disabled }) =>
          disabled ? (
            <div
              key={href}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground cursor-not-allowed"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </div>
          ) : (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ),
        )}
      </nav>
      {/* Footer: theme toggle + signout */}
      <div className="border-t border-sidebar-border pt-3 mt-3 flex items-center justify-between gap-2">
        <form action="/signout" method="POST" className="flex-1">
          <button
            type="submit"
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </form>
        <ThemeToggle />
      </div>
    </aside>
  );
}
