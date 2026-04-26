import Link from "next/link";
import { LayoutDashboard, Users, AppWindow, Tag, Activity, FileText, LogOut } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/users", label: "Usuários", Icon: Users },
  { href: "/apps", label: "Apps", Icon: AppWindow },
  { href: "/plans", label: "Planos", Icon: Tag },
  { href: "/sessions", label: "Sessões (em breve)", Icon: Activity, disabled: true },
  { href: "/audit", label: "Auditoria", Icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-border h-screen sticky top-0 p-4 flex flex-col gap-1 bg-card">
      <div className="flex items-center gap-2 px-2 py-3 mb-4">
        <img src="/brand/logo-socios.png" alt="" className="h-7 w-7 object-contain" />
        <span className="font-display font-semibold">Admin</span>
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
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted transition"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ),
        )}
      </nav>
      <form action="/signout" method="POST">
        <button
          type="submit"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </button>
      </form>
    </aside>
  );
}
