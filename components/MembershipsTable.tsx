import type { Membership } from "@/lib/data";

export function MembershipsTable({ memberships }: { memberships: Membership[] }) {
  if (memberships.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem memberships.</p>;
  }
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left">
          <tr>
            <th className="px-4 py-2 font-medium">App</th>
            <th className="px-4 py-2 font-medium">Role</th>
            <th className="px-4 py-2 font-medium">Org</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {memberships.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-2 font-mono text-xs">{m.app_slug}</td>
              <td className="px-4 py-2">{m.role_slug}</td>
              <td className="px-4 py-2 text-muted-foreground">{m.org_id ?? "sem org"}</td>
              <td className="px-4 py-2">{m.revoked_at ? <span className="text-destructive">Revogada</span> : <span className="text-primary">Ativa</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
