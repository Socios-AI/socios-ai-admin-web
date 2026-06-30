import Link from "next/link";
import type { PartnerRole, UserRow } from "@/lib/data";

const MAX_ORG_CHIPS = 3;

const PARTNER_LABEL: Record<PartnerRole, string> = {
  licenciado: "Licenciado",
  representante: "Revendedor",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

const STAFF_LABEL: Record<NonNullable<UserRow["staff_tier"]>, string> = {
  owner: "Owner",
  admin: "Admin",
  registrar: "Cadastrador",
};

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function UserListTable({ rows }: { rows: UserRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-10 bg-card text-center">
        <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Pessoa</th>
            <th className="px-4 py-3 font-medium">Orgs / Papel</th>
            <th className="px-4 py-3 font-medium">Criado em</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const name = row.full_name?.trim();
            const shown = row.orgs.slice(0, MAX_ORG_CHIPS);
            const extra = row.orgs.length - shown.length;
            const hasAnything = row.partner_role || row.staff_tier || row.orgs.length > 0;
            return (
              <tr key={row.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                <td className="px-4 py-3">
                  <Link href={`/users/${row.id}`} className="group block">
                    <span className="font-medium group-hover:underline">{name || row.email}</span>
                    {name ? (
                      <span className="block text-muted-foreground text-xs">{row.email}</span>
                    ) : null}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap items-center gap-1">
                    {/* Papel de parceiro · destacado (violeta) quando ativo */}
                    {row.partner_role ? (
                      <Badge
                        className={
                          row.partner_status === "active"
                            ? "bg-violet-100 text-violet-800 border-violet-200"
                            : "bg-muted text-muted-foreground border-border"
                        }
                      >
                        {PARTNER_LABEL[row.partner_role]}
                        {row.partner_status && row.partner_status !== "active"
                          ? ` · ${row.partner_status}`
                          : ""}
                      </Badge>
                    ) : null}

                    {/* Staff */}
                    {row.staff_tier ? (
                      <Badge className="bg-sky-100 text-sky-800 border-sky-200">
                        {STAFF_LABEL[row.staff_tier]}
                      </Badge>
                    ) : null}

                    {/* Orgs (chips) */}
                    {shown.map((o) => (
                      <span key={o.id} className="rounded-md bg-muted px-2 py-0.5 text-xs" title={o.name}>
                        {o.name}
                      </span>
                    ))}
                    {extra > 0 ? (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        +{extra}
                      </span>
                    ) : null}

                    {!hasAnything ? <span className="text-muted-foreground">(sem vínculo)</span> : null}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(row.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
