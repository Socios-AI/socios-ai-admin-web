import { AdminShell } from "@/components/AdminShell";
import { DownlineTree } from "@/components/DownlineTree";
import { getCallerJwt } from "@/lib/auth";
import { listPartnerSubtree, resolveProfilesByIds } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TreePage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
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
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">Árvore da rede</h1>
        <p className="text-muted-foreground text-sm">
          {nodes.length} parceiros · {licenciados} licenciados · raiz = Sócios AI
        </p>
      </header>
      <DownlineTree nodes={nodes} profiles={profiles} />
    </AdminShell>
  );
}
