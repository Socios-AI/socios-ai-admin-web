import { AdminShell } from "@/components/AdminShell";
import { AppForm } from "@/components/AppForm";

export const dynamic = "force-dynamic";

export default function NewAppPage() {
  return (
    <AdminShell>
      <div className="max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Novo app</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre um app do ecossistema. O slug é imutável depois de criado.
          </p>
        </div>
        <AppForm mode="create" />
      </div>
    </AdminShell>
  );
}
