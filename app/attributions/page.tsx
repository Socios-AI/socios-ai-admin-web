import { AdminShell } from "@/components/AdminShell";
import { AttributionsTable } from "@/components/AttributionsTable";
import { PageHeader } from "@/components/ui/page-header";
import { getCallerJwt } from "@/lib/auth";
import {
  listSubscriptionsForAttribution,
  listPartnerSubtree,
  resolveProfilesByIds,
} from "@/lib/data";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};

export default async function AttributionsPage() {
  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const [subs, nodes] = await Promise.all([
    listSubscriptionsForAttribution({ callerJwt: jwt }),
    listPartnerSubtree({ callerJwt: jwt, rootPartnerId: null }),
  ]);
  const profiles = await resolveProfilesByIds({
    callerJwt: jwt,
    ids: nodes.flatMap((n) => (n.user_id ? [n.user_id] : [])),
  });
  const partners = nodes
    .filter((n) => n.status === "active")
    .map((n) => {
      const p = n.user_id ? profiles.get(n.user_id) : undefined;
      const name = p?.full_name || p?.email || "(sem usuário)";
      const indent = "— ".repeat(n.depth);
      return { id: n.partner_id, label: `${indent}${name} · ${ROLE_LABEL[n.role] ?? n.role}` };
    });

  return (
    <AdminShell>
      <PageHeader
        title="Atribuição de vendas"
        subtitle="Atribua cada assinatura ativa ao parceiro que fez a venda. A comissão das próximas faturas cascateia a partir dele. Sem atribuição, a receita fica 100% com a Sócios AI."
      />

      <AttributionsTable subs={subs} partners={partners} />
    </AdminShell>
  );
}
