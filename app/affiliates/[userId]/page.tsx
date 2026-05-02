import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AffiliateActivateButton } from "@/components/AffiliateActivateButton";
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
      <header className="mb-6">
        <div className="text-xs text-muted-foreground mb-1">
          <Link href="/affiliates" className="hover:underline">
            Afiliados
          </Link>{" "}
          ·{" "}
          <span className="font-mono">{profile.affiliate_code}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display font-semibold text-2xl">
            {profile.display_name}
          </h1>
          {profile.is_active ? (
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs">
              Ativo
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-xs">
              Pendente · login bloqueado
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1 font-mono">{user.email}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Signups capturados
          </p>
          <p className="text-2xl font-display font-semibold">{signupCount}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Checkouts
          </p>
          <p className="text-2xl font-display font-semibold">{checkoutCount}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Pendente Plan J (Stripe billing)
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Total atribuições
          </p>
          <p className="text-2xl font-display font-semibold">{attributions.length}</p>
        </div>
      </div>

      <section className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Link de divulgação
        </h2>
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
          <code className="flex-1 font-mono text-xs break-all">{affiliateLink}</code>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Código:{" "}
          <code className="font-mono">{profile.affiliate_code}</code> · fonte:{" "}
          {profile.source ?? "—"} · criado em{" "}
          {new Date(profile.created_at).toLocaleString("pt-BR")}
        </p>
      </section>

      {!profile.is_active ? (
        <section className="mb-6 bg-card rounded-2xl border border-border p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Ativar conta
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Libera login do afiliado e dispara email de set-password (recovery
            link aponta pra /affiliate-activate).
          </p>
          <AffiliateActivateButton userId={profile.user_id} />
        </section>
      ) : null}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Atribuições ({attributions.length})
        </h2>
        {attributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma atribuição capturada ainda. Quando alguém clicar no link e
            fizer signup, aparece aqui.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Método</th>
                  <th className="px-4 py-2 text-left">Capturado</th>
                </tr>
              </thead>
              <tbody>
                {attributions.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link
                        href={`/users/${a.customer_user_id}`}
                        className="text-primary hover:underline"
                      >
                        {a.customer_user_id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-2">{a.kind}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {a.attribution_method ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(a.attributed_at).toLocaleString("pt-BR")}
                    </td>
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
