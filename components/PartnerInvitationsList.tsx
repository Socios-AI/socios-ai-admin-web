import type { PartnerInvitationRow } from "@/lib/data";

function fmtDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("pt-BR");
}

function fmtUsd(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function PartnerInvitationsList({ invitations }: { invitations: PartnerInvitationRow[] }) {
  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum convite pendente.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Licença</th>
            <th className="px-4 py-3">Expira</th>
          </tr>
        </thead>
        <tbody>
          {invitations.map((i) => (
            <tr key={i.id} className="border-t border-border">
              <td className="px-4 py-3">{i.email}</td>
              <td className="px-4 py-3">{i.full_name}</td>
              <td className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">{i.status}</td>
              <td className="px-4 py-3">{fmtUsd(i.license_amount_usd)} ({i.installments}x)</td>
              <td className="px-4 py-3">{fmtDate(i.expires_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
