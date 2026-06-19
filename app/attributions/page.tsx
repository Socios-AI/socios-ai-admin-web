import { AdminShell } from "@/components/AdminShell";
import { AttributeSubscriptionDialog } from "@/components/AttributeSubscriptionDialog";
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
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">Atribuição de vendas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Atribua cada assinatura ativa ao parceiro que fez a venda. A comissão das próximas faturas
          cascateia a partir dele. Sem atribuição, a receita fica 100% com a Sócios AI.
        </p>
      </header>

      {subs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa ou em trial.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">App</th>
                <th className="px-4 py-2 font-medium">Plano</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Atribuída a</th>
                <th className="px-4 py-2 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-2">{s.customer}</td>
                  <td className="px-4 py-2">{s.appSlug ?? "—"}</td>
                  <td className="px-4 py-2">{s.planName ?? "—"}</td>
                  <td className="px-4 py-2">{s.status}</td>
                  <td className="px-4 py-2">
                    {s.attributedLabel ? (
                      <span className="text-foreground">{s.attributedLabel}</span>
                    ) : (
                      <span className="text-muted-foreground">não atribuída</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <AttributeSubscriptionDialog
                      subscriptionId={s.id}
                      customer={s.customer}
                      currentLabel={s.attributedLabel}
                      partners={partners}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
