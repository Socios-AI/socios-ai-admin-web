import Link from "next/link";
import { listReferralsForPartner, type ReferralRow } from "@/lib/data";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RevokeReferralDialog } from "./RevokeReferralDialog";
import { TransferReferralDialog } from "./TransferReferralDialog";

type Props = { partnerId: string; callerJwt: string };

export async function PartnerReferralsTab({ partnerId, callerJwt }: Props) {
  const referrals: ReferralRow[] = await listReferralsForPartner({ partnerId, callerJwt });

  if (referrals.length === 0) {
    return (
      <EmptyState
        title="Nenhum cliente indicado"
        description="Este licenciado ainda não trouxe clientes."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Cliente</TH>
          <TH>Origem</TH>
          <TH>Atribuído em</TH>
          <TH>Plano atual</TH>
          <TH className="text-right">Ações</TH>
        </TR>
      </THead>
      <TBody>
        {referrals.map((r) => (
          <TR key={r.referralId}>
            <TD>
              <Link
                href={`/users/${r.customerUserId}`}
                className="text-primary hover:underline"
              >
                {r.customerEmail ?? r.customerUserId.slice(0, 8) + "..."}
              </Link>
            </TD>
            <TD>{r.attributionSource}</TD>
            <TD>{new Date(r.attributedAt).toLocaleDateString("pt-BR")}</TD>
            <TD>
              {r.currentSub ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-xs">
                    {r.currentSub.planId.slice(0, 8)}...
                  </span>
                  <Badge variant="muted">{r.currentSub.status}</Badge>
                </span>
              ) : (
                <span className="text-muted-foreground">sem plano</span>
              )}
            </TD>
            <TD className="text-right">
              <div className="inline-flex items-center gap-2">
                <TransferReferralDialog
                  referralId={r.referralId}
                  fromPartnerId={partnerId}
                />
                <RevokeReferralDialog referralId={r.referralId} />
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
