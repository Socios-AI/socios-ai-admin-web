import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AffiliateActivateButton } from "@/components/AffiliateActivateButton";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { getCallerJwt } from "@/lib/auth";
import { getUser } from "@/lib/data";
import {
  getAffiliateProfile,
  listAffiliateAttributions,
} from "@/lib/affiliates";

export const dynamic = "force-dynamic";

export default async function AffiliateDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const [profile, user, attributions] = await Promise.all([
    getAffiliateProfile({ callerJwt: jwt, userId }),
    getUser({ callerJwt: jwt, userId }),
    listAffiliateAttributions({ callerJwt: jwt, sourceUserId: userId }),
  ]);

  if (!profile || !user) notFound();

  const signupCount = attributions.filter((a) => a.kind === "signup_capture").length;
  const checkoutCount = attributions.filter((a) => a.kind === "checkout_snapshot").length;

  const affiliateLink = `https://id.sociosai.com/a/${profile.affiliate_code}`;

  return (
    <AdminShell>
      <PageHeader
        breadcrumbs={[
          { label: "Afiliados", href: "/affiliates" },
          { label: profile.affiliate_code },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {profile.display_name}
            {profile.is_active ? (
              <Badge variant="success">Ativo</Badge>
            ) : (
              <Badge variant="warning">Pendente · login bloqueado</Badge>
            )}
          </span>
        }
        subtitle={<span className="font-mono">{user.email}</span>}
      />

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatCard label="Signups capturados" value={signupCount} />
        <StatCard
          label="Checkouts"
          value={checkoutCount}
          hint="Pendente Plan J (Stripe billing)"
        />
        <StatCard label="Total atribuições" value={attributions.length} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Link de divulgação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <code className="block break-all font-mono text-xs">{affiliateLink}</code>
          <p className="text-xs text-muted-foreground">
            Código: <code className="font-mono">{profile.affiliate_code}</code> · fonte:{" "}
            {profile.source ?? "—"} · criado em{" "}
            {new Date(profile.created_at).toLocaleString("pt-BR")}
          </p>
        </CardContent>
      </Card>

      {!profile.is_active ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ativar conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Libera login do afiliado e dispara email de set-password (recovery
              link aponta pra /affiliate-activate).
            </p>
            <AffiliateActivateButton userId={profile.user_id} />
          </CardContent>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Atribuições ({attributions.length})
        </h2>
        {attributions.length === 0 ? (
          <EmptyState
            title="Nenhuma atribuição capturada ainda."
            description="Quando alguém clicar no link e fizer signup, aparece aqui."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Customer</TH>
                <TH>Tipo</TH>
                <TH>Método</TH>
                <TH>Capturado</TH>
              </TR>
            </THead>
            <TBody>
              {attributions.map((a) => (
                <TR key={a.id}>
                  <TD className="font-mono text-xs">
                    <Link
                      href={`/users/${a.customer_user_id}`}
                      className="text-primary hover:underline"
                    >
                      {a.customer_user_id.slice(0, 8)}...
                    </Link>
                  </TD>
                  <TD>{a.kind}</TD>
                  <TD className="text-xs text-muted-foreground">
                    {a.attribution_method ?? "—"}
                  </TD>
                  <TD className="text-xs text-muted-foreground">
                    {new Date(a.attributed_at).toLocaleString("pt-BR")}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </AdminShell>
  );
}
