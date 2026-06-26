import { notFound } from "next/navigation";
import { OrgEditDialog } from "@/components/OrgEditDialog";
import { loadOrgForRegistrar } from "@/lib/data-registrar";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Detalhe curado do cadastrador: nome (editável) + membros read-only.
// Sem seção Planos, sem cifras, sem link "Gerenciar via usuário" (/users/<id>
// é bloqueado pro registrar).
export async function RegistrarOrgDetailView({ orgId }: { orgId: string }) {
  const org = await loadOrgForRegistrar(orgId);
  if (!org) notFound();

  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl">{org.name}</h1>
          <p className="text-muted-foreground text-sm font-mono">
            {org.slug} · {org.id.slice(0, 8)}
          </p>
          <p className="text-muted-foreground text-sm">
            Nicho: {org.niche ?? "—"} · criado em {formatDate(org.createdAt)}
          </p>
        </div>
        <OrgEditDialog orgId={org.id} initialName={org.name} />
      </header>

      <section>
        <h2 className="font-display font-semibold text-lg mb-3">Membros</h2>
        {org.members.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum membro ativo.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2">App</th>
                <th className="py-2">Papel</th>
                <th className="py-2">E-mail</th>
                <th className="py-2">Concedido em</th>
              </tr>
            </thead>
            <tbody>
              {org.members.map((m, i) => (
                <tr key={`${m.appSlug}-${i}`} className="border-t border-border">
                  <td className="py-2">{m.appSlug}</td>
                  <td className="py-2">{m.roleSlug}</td>
                  <td className="py-2">
                    {m.email ?? <span className="text-muted-foreground">sem email</span>}
                  </td>
                  <td className="py-2">{formatDate(m.grantedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
