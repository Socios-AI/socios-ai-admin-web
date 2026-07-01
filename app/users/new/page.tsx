import { AdminShell } from "@/components/AdminShell";
import { InviteUserForm } from "@/components/InviteUserForm";
import { PageHeader } from "@/components/ui/page-header";
import { getCallerJwt } from "@/lib/auth";
import { listApps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const jwt = await getCallerJwt();
  const apps = jwt ? await listApps({ callerJwt: jwt }) : [];

  return (
    <AdminShell>
      <PageHeader
        title="Convidar usuário"
        subtitle="Cria a conta e a primeira membership. Um link de boas-vindas será gerado."
        breadcrumbs={[{ label: "Usuários", href: "/users" }, { label: "Convidar" }]}
      />
      <InviteUserForm apps={apps} />
    </AdminShell>
  );
}
