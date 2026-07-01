import type { PartnerStatus } from "@/lib/partners";
import { partnerStatusBadgeVariant } from "@/lib/partners";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

const LABELS: Record<PartnerStatus, string> = {
  pending_contract: "Aguardando contrato",
  pending_payment:  "Aguardando pagamento",
  pending_kyc:      "Aguardando KYC",
  active:           "Ativo",
  suspended:        "Suspenso",
  terminated:       "Encerrado",
};

// partnerStatusBadgeVariant() já devolve success/warning/muted/destructive/default,
// que mapeiam 1:1 nas variantes do Badge primitivo (tokens do design system).
const VARIANT_MAP: Record<string, BadgeVariant> = {
  success: "success",
  warning: "warning",
  muted: "muted",
  destructive: "destructive",
  default: "default",
};

export function PartnerStatusBadge({ status }: { status: PartnerStatus }) {
  const variant = partnerStatusBadgeVariant(status);
  return (
    <Badge variant={VARIANT_MAP[variant] ?? "default"} data-variant={variant}>
      {LABELS[status]}
    </Badge>
  );
}
