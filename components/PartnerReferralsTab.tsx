import Link from "next/link";
import { listReferralsForPartner, type ReferralRow } from "@/lib/data";
import { RevokeReferralDialog } from "./RevokeReferralDialog";
import { TransferReferralDialog } from "./TransferReferralDialog";

type Props = { partnerId: string; callerJwt: string };

export async function PartnerReferralsTab({ partnerId, callerJwt }: Props) {
  const referrals: ReferralRow[] = await listReferralsForPartner({ partnerId, callerJwt });

  if (referrals.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-6">
        Nenhum cliente indicado por este licenciado.
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="py-2 pr-4">Cliente</th>
          <th className="py-2 pr-4">Origem</th>
          <th className="py-2 pr-4">Atribuído em</th>
          <th className="py-2 pr-4">Plano atual</th>
          <th className="py-2 text-right">Ações</th>
        </tr>
      </thead>
      <tbody>
        {referrals.map((r) => (
          <tr key={r.referralId} className="border-t">
            <td className="py-2 pr-4">
              <Link
                href={`/users/${r.customerUserId}`}
                className="text-primary hover:underline"
              >
                {r.customerEmail ?? r.customerUserId.slice(0, 8) + "..."}
              </Link>
            </td>
            <td className="py-2 pr-4">{r.attributionSource}</td>
            <td className="py-2 pr-4">
              {new Date(r.attributedAt).toLocaleDateString("pt-BR")}
            </td>
            <td className="py-2 pr-4">
              {r.currentSub ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-xs">
                    {r.currentSub.planId.slice(0, 8)}...
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    {r.currentSub.status}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">sem plano</span>
              )}
            </td>
            <td className="py-2 text-right">
              <TransferReferralDialog
                referralId={r.referralId}
                fromPartnerId={partnerId}
              />
              <RevokeReferralDialog referralId={r.referralId} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
