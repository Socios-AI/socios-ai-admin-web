import Link from "next/link";
import type { PartnerRow } from "@/lib/data";
import { PartnerStatusBadge } from "./PartnerStatusBadge";

function fmtPct(pct: number | null): string {
  if (pct == null) return "padrão";
  return `${(pct * 100).toFixed(1)}%`;
}

function fmtDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("pt-BR");
}

function TierBadge({ tier }: { tier: PartnerRow["tier"] }) {
  if (tier === "reseller") {
    return (
      <span className="rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-xs">
        Revendedor
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-xs">
      Licenciado
    </span>
  );
}

export function PartnerListTable({ partners }: { partners: PartnerRow[] }) {
  if (partners.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nenhum parceiro cadastrado nesse filtro.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Tier</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">User ID</th>
            <th className="px-4 py-3">Comissão</th>
            <th className="px-4 py-3">Ativado em</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {partners.map((p) => (
            <tr key={p.id} className="border-t border-border">
              <td className="px-4 py-3"><TierBadge tier={p.tier} /></td>
              <td className="px-4 py-3"><PartnerStatusBadge status={p.status} /></td>
              <td className="px-4 py-3 font-mono text-xs">{p.user_id.slice(0, 8)}...</td>
              <td className="px-4 py-3">{fmtPct(p.custom_commission_pct)}</td>
              <td className="px-4 py-3">{fmtDate(p.activated_at)}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/partners/${p.id}`} className="text-primary hover:underline">
                  Detalhes
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
