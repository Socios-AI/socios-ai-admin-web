import { AdminShell } from "@/components/AdminShell";
import { AppForm } from "@/components/AppForm";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default function NewAppPage() {
  return (
    <AdminShell>
      <div className="max-w-xl">
        <PageHeader
          title="Novo app"
          subtitle="Cadastre um app do ecossistema. O slug é imutável depois de criado."
          breadcrumbs={[{ label: "Apps", href: "/apps" }, { label: "Novo app" }]}
        />
        <AppForm mode="create" />
      </div>
    </AdminShell>
  );
}
