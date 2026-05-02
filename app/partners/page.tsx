import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { PartnerListTable } from "@/components/PartnerListTable";
import { PartnerInvitationsList } from "@/components/PartnerInvitationsList";
import { getCallerJwt } from "@/lib/auth";
import { listPartners, listPartnerInvitations, type PartnerRow } from "@/lib/data";

export const dynamic = "force-dynamic";

type TierFilter = "all" | PartnerRow["tier"];

function isTierFilter(v: unknown): v is TierFilter {
  return v === "all" || v === "licensee" || v === "reseller";
}

export default async function PartnersPage(props: {
  searchParams: Promise<{ tier?: string | string[] }>;
}) {
  const { tier: tierParam } = await props.searchParams;
  const rawTier = Array.isArray(tierParam) ? tierParam[0] : tierParam;
  const tierFilter: TierFilter = isTierFilter(rawTier) ? rawTier : "all";

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const [allPartners, allInvitations] = await Promise.all([
    listPartners({ callerJwt: jwt }),
    listPartnerInvitations({ callerJwt: jwt }),
  ]);

  const partners =
    tierFilter === "all"
      ? allPartners
      : allPartners.filter((p) => p.tier === tierFilter);

  const counts = {
    all: allPartners.length,
    licensee: allPartners.filter((p) => p.tier === "licensee").length,
    reseller: allPartners.filter((p) => p.tier === "reseller").length,
  };

  const pending = allInvitations.filter((i) =>
    ["sent", "contract_signed", "paid", "kyc_completed"].includes(i.status),
  );

  const FilterLink = ({ value, label }: { value: TierFilter; label: string }) => {
    const active = tierFilter === value;
    return (
      <Link
        href={value === "all" ? "/partners" : `/partners?tier=${value}`}
        className={
          "rounded-md border px-3 py-1.5 text-sm transition " +
          (active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card hover:bg-muted")
        }
      >
        {label} ({counts[value]})
      </Link>
    );
  };

  return (
    <AdminShell>
      <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-semibold text-2xl">Parceiros</h1>
          <p className="text-muted-foreground text-sm">
            {counts.all} cadastrados · {pending.length} convites pendentes
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/partners/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Novo licenciado
          </Link>
          <Link
            href="/partners/new/reseller"
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
          >
            Novo revendedor
          </Link>
        </div>
      </header>

      {pending.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Convites pendentes (licenciados)
          </h2>
          <PartnerInvitationsList invitations={pending} />
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <FilterLink value="all" label="Todos" />
          <FilterLink value="licensee" label="Licenciados" />
          <FilterLink value="reseller" label="Revendedores" />
        </div>
        <PartnerListTable partners={partners} />
      </section>
    </AdminShell>
  );
}
