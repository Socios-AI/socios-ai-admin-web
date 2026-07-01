import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { OrgListTable } from "@/components/OrgListTable";
import { RegistrarOrgsView } from "@/components/RegistrarOrgsView";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClasses } from "@/components/ui/button";
import { getCallerJwt, getEffectiveRegistrar } from "@/lib/auth";
import { listOrgs, listApps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OrgsPage() {
  // Cadastrador (registrar real OU super_admin em modo "ver como Cadastrador"):
  // view curada sem financeiro.
  const { isRegistrar } = await getEffectiveRegistrar();
  if (isRegistrar) {
    return (
      <AdminShell>
        <RegistrarOrgsView />
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

  const [orgs, apps] = await Promise.all([
    listOrgs({ callerJwt: jwt }),
    listApps({ callerJwt: jwt }),
  ]);

  return (
    <AdminShell>
      <PageHeader
        title="Organizações"
        subtitle={`${orgs.length} no total`}
        actions={
          <Link href="/orgs/new" className={buttonClasses({ variant: "primary" })}>
            Novo cliente
          </Link>
        }
      />
      <OrgListTable orgs={orgs} apps={apps.map((a) => ({ slug: a.slug, name: a.name }))} />
    </AdminShell>
  );
}
