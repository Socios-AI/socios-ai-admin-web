import Link from "next/link";
import { listOrgsForRegistrar } from "@/lib/data-registrar";

// View curada do cadastrador · orgs sem nenhum dado de assinatura/financeiro.
export async function RegistrarOrgsView() {
  const orgs = await listOrgsForRegistrar();

  return (
    <>
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-2xl">Organizações</h1>
          <p className="text-muted-foreground text-sm">{orgs.length} no total</p>
        </div>
        <Link
          href="/orgs/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Novo cliente
        </Link>
      </header>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Nome</th>
              <th className="px-3 py-2 text-left font-medium">Slug</th>
              <th className="px-3 py-2 text-left font-medium">Nicho</th>
              <th className="px-3 py-2 text-left font-medium">Criado</th>
            </tr>
          </thead>
          <tbody>
            {orgs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhuma organização cadastrada ainda.
                </td>
              </tr>
            ) : (
              orgs.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/orgs/${o.id}`} className="text-primary hover:underline">
                      {o.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{o.slug}</td>
                  <td className="px-3 py-2 text-muted-foreground">{o.niche ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
