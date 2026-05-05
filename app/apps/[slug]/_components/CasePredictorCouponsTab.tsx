import { listCasePredictorCouponBatches } from "@/app/_actions/case-predictor/list-coupon-batches";

export async function CasePredictorCouponsTab() {
  const result = await listCasePredictorCouponBatches({ limit: 50 });
  if (!result.ok) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="text-destructive">Erro carregando batches: {result.message}</div>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Coupon Batches ({result.total})</h2>
      {result.rows.length === 0 ? (
        <p className="text-muted-foreground">Nenhum batch ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left py-2 font-medium">Data</th>
                <th className="text-left py-2 font-medium">Partner ID</th>
                <th className="text-right py-2 font-medium">Cupons</th>
                <th className="text-right py-2 font-medium">Desconto %</th>
                <th className="text-left py-2 font-medium">Validade</th>
                <th className="text-left py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((b) => (
                <tr key={b.id} className="border-b border-border">
                  <td className="py-2">{new Date(b.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{b.partner_id.slice(0, 8)}…</td>
                  <td className="text-right py-2">{b.total_count}</td>
                  <td className="text-right py-2">{b.discount_pct}%</td>
                  <td className="py-2 text-muted-foreground">
                    {b.valid_until ? new Date(b.valid_until).toLocaleDateString("pt-BR") : "-"}
                  </td>
                  <td className="py-2">
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                      {b.payment_status}
                    </span>
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
