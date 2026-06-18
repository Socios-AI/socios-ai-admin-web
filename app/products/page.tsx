import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { EntryFeePriceDialog } from "@/components/EntryFeePriceDialog";
import { getCallerJwt } from "@/lib/auth";
import { listEntryFeePrices, type EntryFeePrice } from "@/lib/data";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<EntryFeePrice["role"], string> = {
  licenciado: "Licença (Licenciado)",
  representante: "Taxa de Representante",
};

function fmtMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(amount);
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

export default async function ProductsPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const prices = await listEntryFeePrices({ callerJwt: jwt });
  const active = prices.filter((p) => p.effective_to == null);
  const history = prices.filter((p) => p.effective_to != null);

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">Produtos & Taxas</h1>
        <p className="text-muted-foreground text-sm">
          Taxas de entrada com preço versionado. Produtos de assinatura ficam em{" "}
          <Link href="/plans" className="text-primary hover:underline">Planos</Link>.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Taxas de entrada (preço atual)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["licenciado", "representante"] as const).map((role) => {
            const cur = active.find((p) => p.role === role);
            return (
              <div key={role} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{ROLE_LABEL[role]}</p>
                    <p className="text-2xl font-display font-semibold tabular-nums mt-1">
                      {cur ? fmtMoney(cur.amount, cur.currency) : "não definido"}
                    </p>
                    {cur ? (
                      <p className="text-xs text-muted-foreground mt-1">vigente desde {fmtDate(cur.effective_from)}</p>
                    ) : null}
                  </div>
                  <EntryFeePriceDialog
                    role={role}
                    roleLabel={ROLE_LABEL[role]}
                    currentAmount={cur?.amount ?? 0}
                    currentCurrency={(cur?.currency as "usd" | "brl") ?? (role === "licenciado" ? "usd" : "brl")}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Histórico de preços
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem versões anteriores.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Taxa</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">De</th>
                  <th className="px-4 py-3">Até</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3">{ROLE_LABEL[p.role]}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(p.amount, p.currency)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.effective_from)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.effective_to)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
