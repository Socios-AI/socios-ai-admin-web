import type { LedgerEntry } from "@/lib/data";

const STATUS_LABEL: Record<string, string> = {
  earned: "Apurado",
  pending: "Pendente",
  paid: "Pago",
  reversed: "Revertido",
  void: "Anulado",
};

const STATUS_CLASS: Record<string, string> = {
  earned: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300",
  pending: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
  paid: "bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300",
  reversed: "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300",
  void: "bg-muted text-muted-foreground",
};

function fmtMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

function fmtDate(s: string | null): string {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("pt-BR");
}

export function LedgerTable({
  entries,
  labels,
}: {
  entries: LedgerEntry[];
  labels: Map<string, string>;
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Nenhum lançamento de comissão.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Data</th>
            <th className="px-4 py-3">Beneficiário</th>
            <th className="px-4 py-3">Origem</th>
            <th className="px-4 py-3">Nível</th>
            <th className="px-4 py-3">Valor</th>
            <th className="px-4 py-3">Paga</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const who = e.is_platform_root
              ? "Sócios AI (raiz)"
              : (e.beneficiary_partner_id ? labels.get(e.beneficiary_partner_id) : null) ?? "—";
            return (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(e.occurred_at ?? e.created_at)}</td>
                <td className="px-4 py-3">{who}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.revenue_kind === "entry_fee" ? "Taxa de entrada" : "Assinatura"}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{e.depth}</td>
                <td className="px-4 py-3 tabular-nums font-medium">{fmtMoney(e.amount, e.currency)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.owed_by === "platform" ? "Plataforma" : "Licenciado"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[e.status] ?? "bg-muted"}`}>
                    {STATUS_LABEL[e.status] ?? e.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
