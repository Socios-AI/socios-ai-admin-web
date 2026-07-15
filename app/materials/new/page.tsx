import { AdminShell } from "@/components/AdminShell";
import { SalesMaterialForm } from "@/components/SalesMaterialForm";
import { PageHeader } from "@/components/ui/page-header";
import { getCallerJwt } from "@/lib/auth";
import { listApps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function NewMaterialPage() {
  const jwt = await getCallerJwt();
  const apps = jwt ? await listApps({ callerJwt: jwt }) : [];

  return (
    <AdminShell>
      <div className="max-w-xl">
        <PageHeader
          title="Novo material"
          subtitle="Publique um material de marketing ou vendas para os parceiros."
          breadcrumbs={[{ label: "Materiais", href: "/materials" }, { label: "Novo material" }]}
        />
        <SalesMaterialForm
          mode="create"
          apps={apps.map((a) => ({ slug: a.slug, name: a.name }))}
        />
      </div>
    </AdminShell>
  );
}
