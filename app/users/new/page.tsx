import { AdminShell } from "@/components/AdminShell";
import { InviteUserForm } from "@/components/InviteUserForm";
import { getCallerJwt } from "@/lib/auth";
import { listApps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const jwt = await getCallerJwt();
  const apps = jwt ? await listApps({ callerJwt: jwt }) : [];

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">Convidar usuário</h1>
        <p className="text-muted-foreground text-sm">
          Cria a conta e a primeira membership. Um link de boas-vindas será gerado.
        </p>
      </header>
      <InviteUserForm apps={apps} />
    </AdminShell>
  );
}
