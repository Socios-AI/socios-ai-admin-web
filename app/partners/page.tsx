import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { PartnerListTable } from "@/components/PartnerListTable";
import { PartnerInvitationsList } from "@/components/PartnerInvitationsList";
import { getCallerJwt } from "@/lib/auth";
import { listPartners, listPartnerInvitations } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const [partners, allInvitations] = await Promise.all([
    listPartners({ callerJwt: jwt }),
    listPartnerInvitations({ callerJwt: jwt }),
  ]);

  const pending = allInvitations.filter((i) =>
    ["sent", "contract_signed", "paid", "kyc_completed"].includes(i.status),
  );

  return (
    <AdminShell>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl">Licenciados</h1>
          <p className="text-muted-foreground text-sm">
            {partners.length} ativos · {pending.length} convites pendentes
          </p>
        </div>
        <Link
          href="/partners/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Novo convite
        </Link>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Convites pendentes
        </h2>
        <PartnerInvitationsList invitations={pending} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Licenciados
        </h2>
        <PartnerListTable partners={partners} />
      </section>
    </AdminShell>
  );
}
