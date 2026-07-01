import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { PartnerListTable } from "@/components/PartnerListTable";
import { PartnerInvitationsList } from "@/components/PartnerInvitationsList";
import { RegistrarPartnersView } from "@/components/RegistrarPartnersView";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { getCallerJwt, getEffectiveRegistrar } from "@/lib/auth";
import {
  listPartners,
  listPartnerInvitations,
  resolveProfilesByIds,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  // Cadastrador (registrar real OU super_admin em modo "ver como Cadastrador"):
  // view curada sem financeiro.
  const { isRegistrar } = await getEffectiveRegistrar();
  if (isRegistrar) {
    return (
      <AdminShell>
        <RegistrarPartnersView />
      </AdminShell>
    );
  }

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

  const profiles = await resolveProfilesByIds({
    callerJwt: jwt,
    ids: partners.flatMap((p) => (p.user_id ? [p.user_id] : [])),
  });

  const pending = allInvitations.filter((i) =>
    ["sent", "contract_signed", "paid", "kyc_completed"].includes(i.status),
  );

  return (
    <AdminShell>
      <PageHeader
        title="Parceiros"
        subtitle={`${partners.length} cadastrados · ${pending.length} convites pendentes`}
        actions={
          <Link href="/partners/invite" className={buttonClasses({ variant: "primary" })}>
            Convidar parceiro
          </Link>
        }
      />

      {pending.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
              Convites pendentes (licenciados) · {pending.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PartnerInvitationsList invitations={pending} />
          </CardContent>
        </Card>
      ) : null}

      <PartnerListTable partners={partners} profiles={profiles} />
    </AdminShell>
  );
}
