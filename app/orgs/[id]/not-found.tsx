import { AdminShell } from "@/components/AdminShell";
import Link from "next/link";

export default function OrgNotFound() {
  return (
    <AdminShell>
      <header className="mb-6">
        <h1 className="font-display font-semibold text-2xl">Organização não encontrada</h1>
      </header>
      <p className="text-sm text-muted-foreground">
        Pode ser que essa organização não tenha membros ativos no app indicado, ou
        o parâmetro <code>?app=</code> está faltando ou incorreto. Se você acabou
        de revogar o último membership, isso é esperado.
      </p>
      <Link href="/orgs" className="mt-4 inline-block text-primary hover:underline">
        Voltar para Organizações
      </Link>
    </AdminShell>
  );
}
