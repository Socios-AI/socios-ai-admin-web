import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { PlanForm } from "@/components/PlanForm";
import { PlanFlagToggle } from "@/components/PlanFlagToggle";
import { getCallerJwt } from "@/lib/auth";
import { getPlan, listApps, type PlanDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

const PERIOD_LABEL: Record<PlanDetail["billing_period"], string> = {
  monthly: "Mensal",
  yearly: "Anual",
  one_time: "Único",
  custom: "Custom",
};

const CURRENCY_FORMATTERS: Record<PlanDetail["currency"], Intl.NumberFormat> = {
  usd: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  brl: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
  eur: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }),
};

export default async function PlanDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida. Faça login novamente.</p>
      </AdminShell>
    );
  }

  const [plan, apps] = await Promise.all([
    getPlan({ callerJwt: jwt, id }),
    listApps({ callerJwt: jwt }),
  ]);
  if (!plan) notFound();

  return (
    <AdminShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/plans" className="text-sm text-muted-foreground hover:underline">
            &larr; Planos
          </Link>
          <h1 className="text-2xl font-semibold mt-1">{plan.name}</h1>
          <p className="text-xs text-muted-foreground font-mono">{plan.slug}</p>
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs">
          {PERIOD_LABEL[plan.billing_period]} · {CURRENCY_FORMATTERS[plan.currency].format(plan.price_amount)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold mb-4">Informações</h2>
          <PlanForm mode="edit" apps={apps} initial={plan} />
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold mb-2">Disponibilidade</h2>
            <div className="divide-y divide-border">
              <PlanFlagToggle
                id={plan.id}
                flag="is_active"
                current={plan.is_active}
                label="Ativo"
                description="Quando desligado, novos checkouts são bloqueados e o Stripe Product é arquivado. Subscribers atuais continuam até cancelar."
              />
              <PlanFlagToggle
                id={plan.id}
                flag="is_visible"
                current={plan.is_visible}
                label="Visível"
                description="Bloqueia listagem pública. O plano continua contratável via convite ou link direto."
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold mb-2">Stripe</h2>
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Product ID</dt>
                <dd className="font-mono break-all">{plan.stripe_product_id ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Price ID</dt>
                <dd className="font-mono break-all">{plan.stripe_price_id ?? "—"}</dd>
              </div>
              {plan.stripe_product_id?.startsWith("prod_mock_") && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-800">
                  IDs mockados (Stripe key não configurada). Plug a chave em STRIPE_SECRET_KEY e edite o plano para sincronizar.
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold mb-2">Metadados</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Criado em</dt>
                <dd>{new Date(plan.created_at).toLocaleString("pt-BR")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Atualizado em</dt>
                <dd>{new Date(plan.updated_at).toLocaleString("pt-BR")}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </AdminShell>
  );
}
