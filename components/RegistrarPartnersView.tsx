import Link from "next/link";
import { listPartnersForRegistrar, listInvitesForRegistrar } from "@/lib/data-registrar";
import { RegistrarInviteCancelButton } from "./RegistrarInviteCancelButton";

const ROLE_LABEL: Record<string, string> = {
  licenciado: "Licenciado",
  representante: "Representante",
  embaixador: "Embaixador",
  afiliado: "Afiliado",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  pending_contract: "Contrato pendente",
  pending_payment: "Pagamento pendente",
  pending_kyc: "KYC pendente",
  suspended: "Suspenso",
  terminated: "Encerrado",
  sent: "Enviado",
};

// View curada do cadastrador · SEM dados financeiros (ver lib/data-registrar).
export async function RegistrarPartnersView() {
  const [partners, invites] = await Promise.all([
    listPartnersForRegistrar(),
    listInvitesForRegistrar(),
  ]);

  return (
    <>
      <header className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-semibold text-2xl">Parceiros</h1>
          <p className="text-muted-foreground text-sm">
            {partners.length} cadastrados · {invites.length} convites pendentes
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/partners/invite?role=licenciado"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Novo licenciado
          </Link>
          <Link
            href="/partners/invite?role=representante"
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
          >
            Novo revendedor
          </Link>
          <Link
            href="/partners/invite?role=embaixador"
            className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
          >
            Novo embaixador
          </Link>
        </div>
      </header>

      {invites.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Convites pendentes
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Nome</th>
                  <th className="px-3 py-2 text-left font-medium">E-mail</th>
                  <th className="px-3 py-2 text-left font-medium">Papel</th>
                  <th className="px-3 py-2 text-left font-medium">Expira</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="px-3 py-2">{i.fullName}</td>
                    <td className="px-3 py-2 text-muted-foreground">{i.email}</td>
                    <td className="px-3 py-2">{i.targetRole ? ROLE_LABEL[i.targetRole] ?? i.targetRole : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(i.expiresAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <RegistrarInviteCancelButton invitationId={i.id} email={i.email} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Nome</th>
                <th className="px-3 py-2 text-left font-medium">E-mail</th>
                <th className="px-3 py-2 text-left font-medium">Papel</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhum parceiro cadastrado ainda.
                  </td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="px-3 py-2">{p.role ? ROLE_LABEL[p.role] ?? p.role : "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{STATUS_LABEL[p.status] ?? p.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
