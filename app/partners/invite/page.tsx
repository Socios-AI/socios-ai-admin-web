import { AdminShell } from "@/components/AdminShell";
import { PartnerInviteForm } from "@/components/PartnerInviteForm";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

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
      <PageHeader
        breadcrumbs={[{ label: "Parceiros", href: "/partners" }, { label: "Convidar parceiro" }]}
        title="Convidar parceiro"
        subtitle="Cria o convite de onboarding. Sem cobrança nem contrato por ora."
      />
      <Card>
        <CardContent className="pt-6">
          <PartnerInviteForm initialRole={initialRole} />
        </CardContent>
      </Card>
    </AdminShell>
  );
}
