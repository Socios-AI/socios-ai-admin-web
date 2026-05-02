import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { ResellerForm } from "@/components/ResellerForm";

export const dynamic = "force-dynamic";

export default function NewResellerPage() {
  return (
    <AdminShell>
      <header className="mb-6">
        <Link href="/partners" className="text-sm text-muted-foreground hover:underline">← Voltar</Link>
        <h1 className="font-display font-semibold text-2xl mt-2">Novo revendedor</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Cria a conta diretamente (sem licença, sem KYC). O usuário recebe
          email de set-password pra entrar pela primeira vez.
        </p>
      </header>
      <ResellerForm />
    </AdminShell>
  );
}
