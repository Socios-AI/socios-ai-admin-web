import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { PartnerInvitationForm } from "@/components/PartnerInvitationForm";

export const dynamic = "force-dynamic";

export default function NewPartnerPage() {
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
      <PartnerInvitationForm />
    </AdminShell>
  );
}
