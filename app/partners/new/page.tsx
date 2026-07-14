import { redirect } from "next/navigation";

// Rota legada aposentada (2026-07-14, trava F3): criava convite por
// createPartnerInvitationAction sem target_role (o aceite convertia pra
// licenciado SEM dados de contrato), contornando a exigência de contrato
// completo. O fluxo canônico é o convite unificado.
export default function NewPartnerPage() {
  redirect("/partners/invite");
}
