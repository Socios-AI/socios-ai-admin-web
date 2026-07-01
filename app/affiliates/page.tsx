import { AdminShell } from "@/components/AdminShell";
import { AffiliateInvitationForm } from "@/components/AffiliateInvitationForm";
import { AffiliatesTables } from "@/components/AffiliatesTables";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCallerJwt } from "@/lib/auth";
import {
  listAffiliateInvitations,
  listAffiliateProfiles,
} from "@/lib/affiliates";

export const dynamic = "force-dynamic";

export default async function AffiliatesPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const [profiles, invitations] = await Promise.all([
    listAffiliateProfiles({ callerJwt: jwt }),
    listAffiliateInvitations({ callerJwt: jwt }),
  ]);

  const pending = invitations.filter((i) => i.status === "sent");

  return (
    <AdminShell>
      <PageHeader
        title="Afiliados"
        subtitle={`${profiles.length} afiliados · ${pending.length} convites pendentes`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Novo convite
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AffiliateInvitationForm />
            </CardContent>
          </Card>
        </section>

        <section className="lg:col-span-2">
          <AffiliatesTables profiles={profiles} pending={pending} />
        </section>
      </div>
    </AdminShell>
  );
}
