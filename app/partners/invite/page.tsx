import { AdminShell } from "@/components/AdminShell";
import { PartnerInviteForm } from "@/components/PartnerInviteForm";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["licenciado", "representante", "embaixador"] as const;
type Role = (typeof VALID_ROLES)[number];

export default async function InvitePartnerPage(props: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const { role: roleParam } = await props.searchParams;
  const raw = Array.isArray(roleParam) ? roleParam[0] : roleParam;
  const initialRole: Role = VALID_ROLES.includes(raw as Role) ? (raw as Role) : "representante";

  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">Convidar parceiro</h1>
        <p className="text-muted-foreground text-sm">
          Cria o convite de onboarding. Sem cobrança nem contrato por ora.
        </p>
      </header>
      <PartnerInviteForm initialRole={initialRole} />
    </AdminShell>
  );
}
