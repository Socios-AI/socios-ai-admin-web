import { AdminShell } from "@/components/AdminShell";
import { CreateOrgForm } from "@/components/CreateOrgForm";
import { PageHeader } from "@/components/ui/page-header";
import { getCallerClient } from "@socios-ai/auth/admin";
import { getCallerJwt } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewOrgPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessao invalida.</p>
      </AdminShell>
    );
  }

  const sb = getCallerClient({ callerJwt: jwt });
  const { data } = await sb
    .from("apps")
    .select("slug, name, metadata, status, accepts_new_subscriptions")
    .eq("status", "active")
    .eq("accepts_new_subscriptions", true)
    .order("name");

  const apps = (data ?? []).map((a: Record<string, unknown>) => {
    const meta = a.metadata && typeof a.metadata === "object" ? (a.metadata as Record<string, unknown>) : {};
    const nc = meta.niche_catalog && typeof meta.niche_catalog === "object"
      ? (meta.niche_catalog as Record<string, string>)
      : null;
    return { slug: String(a.slug), name: String(a.name), nicheCatalog: nc };
  });

  return (
    <AdminShell>
      <PageHeader
        title="Novo cliente"
        subtitle="Cadastra um tenant e, se for o caso, registra o parceiro que indicou."
        breadcrumbs={[{ label: "Organizações", href: "/orgs" }, { label: "Novo cliente" }]}
      />
      <CreateOrgForm apps={apps} />
    </AdminShell>
  );
}
