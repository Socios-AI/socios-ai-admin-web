import type { PartnerStatus } from "@/lib/partners";
import { partnerStatusBadgeVariant } from "@/lib/partners";

const LABELS: Record<PartnerStatus, string> = {
  pending_contract: "Aguardando contrato",
  pending_payment:  "Aguardando pagamento",
  pending_kyc:      "Aguardando KYC",
  active:           "Ativo",
  suspended:        "Suspenso",
  terminated:       "Encerrado",
};

const VARIANT_CLASS: Record<string, string> = {
  success:     "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning:     "bg-amber-100  text-amber-800  border-amber-200",
  muted:       "bg-muted      text-muted-foreground border-border",
  destructive: "bg-red-100    text-red-800    border-red-200",
  default:     "bg-card       text-foreground border-border",
};

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  const variant = partnerStatusBadgeVariant(status);
  return (
    <span
      data-variant={variant}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${VARIANT_CLASS[variant]}`}
    >
      {LABELS[status]}
    </span>
  );
}
