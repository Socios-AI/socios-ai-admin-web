import { AdminShell } from "@/components/AdminShell";
import { PartnerInvitationForm, type Recruiter } from "@/components/PartnerInvitationForm";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getCallerJwt } from "@/lib/auth";
import { listPartnerSubtree, resolveProfilesByIds } from "@/lib/data";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

export default async function NewPartnerPage() {
  const jwt = await getCallerJwt();

  let recruiters: Recruiter[] = [];
  if (jwt) {
    // Pré-ordenado por DFS: indentamos por depth pra mostrar a hierarquia atual.
    const nodes = await listPartnerSubtree({ callerJwt: jwt, rootPartnerId: null });
    const profiles = await resolveProfilesByIds({
      callerJwt: jwt,
      ids: nodes.flatMap((n) => (n.user_id ? [n.user_id] : [])),
    });
    recruiters = nodes
      .filter((n) => n.status === "active")
      .map((n) => {
        const p = n.user_id ? profiles.get(n.user_id) : undefined;
        const name = p?.full_name || p?.email || "(sem usuário)";
        const indent = "— ".repeat(n.depth);
        return { id: n.partner_id, label: `${indent}${name} · ${ROLE_LABEL[n.role] ?? n.role}` };
      });
  }

  return (
    <AdminShell>
      <PageHeader
        breadcrumbs={[{ label: "Parceiros", href: "/partners" }, { label: "Novo licenciado" }]}
        title="Novo convite de licenciado"
        subtitle="O convite gera contrato (Dropbox Sign) e link de pagamento (Stripe Connect). Em modo mock, ambos retornam URLs simuladas para desenvolvimento."
      />
      <Card>
        <CardContent className="pt-6">
          <PartnerInvitationForm recruiters={recruiters} />
        </CardContent>
      </Card>
    </AdminShell>
  );
}
