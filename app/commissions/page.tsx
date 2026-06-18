import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { LedgerTable } from "@/components/LedgerTable";
import { getCallerJwt } from "@/lib/auth";
import { listCommissionLedger, listPartners, resolveProfilesByIds } from "@/lib/data";

export const dynamic = "force-dynamic";

const STATUSES = ["all", "earned", "pending", "paid", "reversed"] as const;
const STATUS_LABEL: Record<string, string> = {
  all: "Todos",
  earned: "Apurado",
  pending: "Pendente",
  paid: "Pago",
  reversed: "Revertido",
};

export default async function CommissionsPage(props: {
  searchParams: Promise<{ status?: string; currency?: string }>;
}) {
  const { status: statusParam, currency: currencyParam } = await props.searchParams;
  const status = STATUSES.includes((statusParam ?? "all") as (typeof STATUSES)[number])
    ? statusParam ?? "all"
    : "all";
  const currency = currencyParam === "brl" || currencyParam === "usd" ? currencyParam : "all";

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const entries = await listCommissionLedger({ callerJwt: jwt, status, currency });

  // Rótulos dos beneficiários (partner_id -> email/nome)
  const partners = await listPartners({ callerJwt: jwt });
  const partnerToUser = new Map(partners.map((p) => [p.id, p.user_id]));
  const profiles = await resolveProfilesByIds({
    callerJwt: jwt,
    ids: partners.flatMap((p) => (p.user_id ? [p.user_id] : [])),
  });
  const labels = new Map<string, string>();
  for (const p of partners) {
    const prof = p.user_id ? profiles.get(p.user_id) : null;
    labels.set(p.id, prof?.full_name || prof?.email || `${p.id.slice(0, 8)}`);
  }
  void partnerToUser;

  const FilterLink = ({ kind, value, label, active }: { kind: "status" | "currency"; value: string; label: string; active: boolean }) => {
    const params = new URLSearchParams();
    if (kind === "status") {
      if (value !== "all") params.set("status", value);
      if (currency !== "all") params.set("currency", currency);
    } else {
      if (status !== "all") params.set("status", status);
      if (value !== "all") params.set("currency", value);
    }
    const qs = params.toString();
    return (
      <Link
        href={qs ? `/commissions?${qs}` : "/commissions"}
        className={
          "rounded-md border px-3 py-1.5 text-sm transition " +
          (active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">Comissões (extrato)</h1>
        <p className="text-muted-foreground text-sm">
          Lançamentos apurados por pagamento real · {entries.length} no filtro
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <FilterLink key={s} kind="status" value={s} label={STATUS_LABEL[s]} active={status === s} />
        ))}
        <span className="mx-2 text-muted-foreground">|</span>
        {(["all", "brl", "usd"] as const).map((c) => (
          <FilterLink
            key={c}
            kind="currency"
            value={c}
            label={c === "all" ? "Todas moedas" : c.toUpperCase()}
            active={currency === c}
          />
        ))}
      </div>

      <LedgerTable entries={entries} labels={labels} />
    </AdminShell>
  );
}
