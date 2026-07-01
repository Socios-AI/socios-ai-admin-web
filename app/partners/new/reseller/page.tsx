import { AdminShell } from "@/components/AdminShell";
import { ResellerForm } from "@/components/ResellerForm";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function NewResellerPage() {
  return (
    <AdminShell>
      <PageHeader
        breadcrumbs={[{ label: "Parceiros", href: "/partners" }, { label: "Novo revendedor" }]}
        title="Novo revendedor"
        subtitle="Cria a conta diretamente (sem licença, sem KYC). O usuário recebe email de set-password pra entrar pela primeira vez."
      />
      <Card>
        <CardContent className="pt-6">
          <ResellerForm />
        </CardContent>
      </Card>
    </AdminShell>
  );
}
