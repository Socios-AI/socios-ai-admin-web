import { AdminShell } from "@/components/AdminShell";
import { DownlineTree } from "@/components/DownlineTree";
import { RegistrarTreeView } from "@/components/RegistrarTreeView";
import { PageHeader } from "@/components/ui/page-header";
import { getCallerJwt, getEffectiveRegistrar } from "@/lib/auth";
import { listPartnerSubtree, resolveProfilesByIds } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TreePage() {
  // Cadastrador (registrar real OU super_admin em modo "ver como Cadastrador").
  const { isRegistrar } = await getEffectiveRegistrar();
  if (isRegistrar) {
    return (
      <AdminShell>
        <RegistrarTreeView />
      </AdminShell>
    );
  }

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-sm text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  // root null = floresta inteira a partir das raízes (licenciados de topo).
  const nodes = await listPartnerSubtree({ callerJwt: jwt, rootPartnerId: null });
  const profiles = await resolveProfilesByIds({
    callerJwt: jwt,
    ids: nodes.flatMap((n) => (n.user_id ? [n.user_id] : [])),
  });

  const licenciados = nodes.filter((n) => n.role === "licenciado").length;

  return (
    <AdminShell>
      <PageHeader
        title="Árvore da rede"
        subtitle={`${nodes.length} parceiros · ${licenciados} licenciados · raiz = Sócios AI`}
      />
      <DownlineTree nodes={nodes} profiles={profiles} />
    </AdminShell>
  );
}
