import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { SalesMaterialForm } from "@/components/SalesMaterialForm";
import { PageHeader } from "@/components/ui/page-header";
import { getCallerJwt } from "@/lib/auth";
import { getSalesMaterial, listApps } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-sm text-destructive">
          Sessão inválida. Faça login novamente.
        </p>
      </AdminShell>
    );
  }

  const [material, apps] = await Promise.all([
    getSalesMaterial({ callerJwt: jwt, id }),
    listApps({ callerJwt: jwt }),
  ]);

  if (!material) notFound();

  return (
    <AdminShell>
      <div className="max-w-xl">
        <PageHeader
          title="Editar material"
          subtitle="Atualize os dados ou oculte o material dos parceiros."
          breadcrumbs={[
            { label: "Materiais", href: "/materials" },
            { label: material.title },
          ]}
        />
        <SalesMaterialForm
          mode="edit"
          initial={material}
          apps={apps.map((a) => ({ slug: a.slug, name: a.name }))}
        />
      </div>
    </AdminShell>
  );
}
