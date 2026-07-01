import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { EntryFeePriceDialog } from "@/components/EntryFeePriceDialog";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
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
        <p className="text-sm text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const prices = await listEntryFeePrices({ callerJwt: jwt });
  const active = prices.filter((p) => p.effective_to == null);
  const history = prices.filter((p) => p.effective_to != null);

  return (
    <AdminShell>
      <PageHeader
        title="Produtos & Taxas"
        subtitle={
          <>
            Taxas de entrada com preço versionado. Produtos de assinatura ficam em{" "}
            <Link href="/plans" className="text-primary hover:underline">
              Planos
            </Link>
            .
          </>
        }
      />

      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Taxas de entrada (preço atual)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["licenciado", "representante"] as const).map((role) => {
              const cur = active.find((p) => p.role === role);
              return (
                <div key={role} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                        {ROLE_LABEL[role]}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tabular-nums">
                        {cur ? fmtMoney(cur.amount, cur.currency) : "não definido"}
                      </p>
                      {cur ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          vigente desde {fmtDate(cur.effective_from)}
                        </p>
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

        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico de preços
          </h2>
          {history.length === 0 ? (
            <EmptyState title="Sem versões anteriores." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Taxa</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>De</TH>
                  <TH>Até</TH>
                </TR>
              </THead>
              <TBody>
                {history.map((p) => (
                  <TR key={p.id}>
                    <TD>{ROLE_LABEL[p.role]}</TD>
                    <TD className="text-right tabular-nums">{fmtMoney(p.amount, p.currency)}</TD>
                    <TD className="text-muted-foreground">{fmtDate(p.effective_from)}</TD>
                    <TD className="text-muted-foreground">{fmtDate(p.effective_to)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
