import { listCasePredictorOrders } from "@/app/_actions/case-predictor/list-orders";
import { GrantComplimentaryButton } from "./GrantComplimentaryButton";

const fmtUsdCents = (n: number) =>
  `$${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function CasePredictorOrdersTab() {
  const result = await listCasePredictorOrders({ limit: 50 });
  if (!result.ok) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="text-destructive">Erro carregando orders: {result.message}</div>
      </section>
    );
  }
  const rows = result.rows;
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Orders ({result.total})</h2>
        <GrantComplimentaryButton />
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nenhum order ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left py-2 font-medium">Data</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Método</th>
                <th className="text-right py-2 font-medium">Preço</th>
                <th className="text-right py-2 font-medium">Desconto</th>
                <th className="text-right py-2 font-medium">Líquido</th>
                <th className="text-left py-2 font-medium">Lead ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-border">
                  <td className="py-2">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="py-2">
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2 text-muted-foreground">{o.payment_method ?? "-"}</td>
                  <td className="text-right py-2 font-mono">{fmtUsdCents(o.price_amount_cents)}</td>
                  <td className="text-right py-2 font-mono text-muted-foreground">{fmtUsdCents(o.discount_amount_cents)}</td>
                  <td className="text-right py-2 font-mono">{fmtUsdCents(o.net_amount_cents)}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">
                    {o.case_predictor_lead_id ? `${o.case_predictor_lead_id.slice(0, 8)}…` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
