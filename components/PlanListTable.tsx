import Link from "next/link";
import type { PlanCatalogRow } from "@/lib/data";

const PERIOD_LABEL: Record<PlanCatalogRow["billing_period"], string> = {
  monthly: "Mensal",
  yearly: "Anual",
  one_time: "Único",
  custom: "Custom",
};

const PERIOD_TONE: Record<PlanCatalogRow["billing_period"], string> = {
  monthly: "bg-sky-100 text-sky-800 border-sky-200",
  yearly: "bg-violet-100 text-violet-800 border-violet-200",
  one_time: "bg-emerald-100 text-emerald-800 border-emerald-200",
  custom: "bg-amber-100 text-amber-800 border-amber-200",
};

const CURRENCY_FORMATTERS: Record<PlanCatalogRow["currency"], Intl.NumberFormat> = {
  usd: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  brl: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
  eur: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }),
};

function formatPrice(amount: number, currency: PlanCatalogRow["currency"]): string {
  return CURRENCY_FORMATTERS[currency].format(amount);
}

export function PlanListTable({ rows }: { rows: PlanCatalogRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-10 bg-card text-center">
        <p className="text-muted-foreground">Nenhum plano cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Plano</th>
            <th className="px-4 py-3 font-medium">Periodicidade</th>
            <th className="px-4 py-3 font-medium">Preço</th>
            <th className="px-4 py-3 font-medium">Apps liberados</th>
            <th className="px-4 py-3 font-medium">Subscribers</th>
            <th className="px-4 py-3 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              <td className="px-4 py-3">
                <Link href={`/plans/${row.id}`} className="hover:underline font-medium">
                  {row.name}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground font-mono">{row.slug}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-xs ${PERIOD_TONE[row.billing_period]}`}
                >
                  {PERIOD_LABEL[row.billing_period]}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs">
                {formatPrice(row.price_amount, row.currency)}
              </td>
              <td className="px-4 py-3">
                {row.app_slugs.length === 0 ? (
                  <span className="text-xs text-muted-foreground">nenhum</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {row.app_slugs.map((slug) => (
                      <span
                        key={slug}
                        className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-mono"
                      >
                        {slug}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">{row.subscriber_count}</td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5 text-xs">
                  <span className={row.is_active ? "text-emerald-700" : "text-zinc-500"}>
                    {row.is_active ? "Ativo" : "Inativo"}
                  </span>
                  <span className={row.is_visible ? "text-foreground" : "text-amber-600"}>
                    {row.is_visible ? "Visível" : "Oculto"}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
