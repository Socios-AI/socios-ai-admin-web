import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { AffiliateInvitationForm } from "@/components/AffiliateInvitationForm";
import { AffiliateActivateButton } from "@/components/AffiliateActivateButton";
import { AffiliateRevokeButton } from "@/components/AffiliateRevokeButton";
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
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">Afiliados</h1>
        <p className="text-muted-foreground text-sm">
          {profiles.length} afiliados · {pending.length} convites pendentes
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
              Novo convite
            </h2>
            <AffiliateInvitationForm />
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          {pending.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Convites pendentes
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Nome</th>
                      <th className="px-4 py-2 text-left">Expira</th>
                      <th className="px-4 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((i) => (
                      <tr key={i.id} className="border-t border-border">
                        <td className="px-4 py-2 font-mono text-xs">{i.email}</td>
                        <td className="px-4 py-2">{i.display_name}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {new Date(i.expires_at).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <AffiliateRevokeButton invitationId={i.id} email={i.email} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Afiliados ({profiles.length})
            </h2>
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum afiliado cadastrado ainda.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Nome</th>
                      <th className="px-4 py-2 text-left">Code</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Criado</th>
                      <th className="px-4 py-2 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.user_id} className="border-t border-border">
                        <td className="px-4 py-2">
                          <Link
                            href={`/affiliates/${p.user_id}`}
                            className="text-primary hover:underline"
                          >
                            {p.display_name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">{p.affiliate_code}</td>
                        <td className="px-4 py-2">
                          {p.is_active ? (
                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-xs">
                              Ativo
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-xs">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-2 text-right">
                          {p.is_active ? null : (
                            <AffiliateActivateButton userId={p.user_id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
