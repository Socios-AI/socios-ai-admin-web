import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { PartnerInvitationForm, type Recruiter } from "@/components/PartnerInvitationForm";
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
      <header className="mb-6">
        <Link href="/partners" className="text-sm text-muted-foreground hover:underline">← Voltar</Link>
        <h1 className="font-display font-semibold text-2xl mt-2">Novo convite de licenciado</h1>
        <p className="text-muted-foreground text-sm mt-1">
          O convite gera contrato (Dropbox Sign) e link de pagamento (Stripe Connect).
          Em modo mock, ambos retornam URLs simuladas para desenvolvimento.
        </p>
      </header>
      <PartnerInvitationForm recruiters={recruiters} />
    </AdminShell>
  );
}
