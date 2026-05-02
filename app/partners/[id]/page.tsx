import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { TabNav } from "@/components/Tabs";
import { PartnerStatusBadge } from "@/components/PartnerStatusBadge";
import { PartnerActionsMenu } from "@/components/PartnerActionsMenu";
import { PartnerCommissionDialog } from "@/components/PartnerCommissionDialog";
import { PartnerReferralsTab } from "@/components/PartnerReferralsTab";
import { AttributeUserDialog } from "@/components/AttributeUserDialog";
import { AuditList } from "@/components/AuditList";
import { getCallerJwt } from "@/lib/auth";
import {
  getPartner,
  listPartners,
  listAuditEvents,
  type AuditEvent,
  type AuditLogEntry,
} from "@/lib/data";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "identidade", label: "Identidade" },
  { key: "indicacoes", label: "Indicações" },
  { key: "comissoes", label: "Comissões" },
  { key: "payouts", label: "Payouts" },
  { key: "auditoria", label: "Auditoria" },
];

function toAuditEvent(row: AuditLogEntry): AuditEvent {
  return {
    id: String(row.id),
    event_type: row.event_type,
    actor_user_id: row.actor_user_id,
    target_user_id: row.target_user_id,
    metadata: row.metadata,
    created_at: row.created_at,
  };
}

export default async function PartnerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab && TABS.some((t) => t.key === tab) ? tab : "identidade";

  const jwt = await getCallerJwt();
  if (!jwt) {
    return (
      <AdminShell>
        <p className="text-destructive">Sessão inválida.</p>
      </AdminShell>
    );
  }

  const partner = await getPartner({ callerJwt: jwt, partnerId: id });
  if (!partner) return notFound();

  const introducedBy = partner.introduced_by_partner_id
    ? await getPartner({ callerJwt: jwt, partnerId: partner.introduced_by_partner_id })
    : null;
  const allPartners = await listPartners({ callerJwt: jwt });
  const downstream = allPartners.filter((p) => p.introduced_by_partner_id === partner.id);

  const auditResult = await listAuditEvents({
    callerJwt: jwt,
    filters: {},
  });
  const partnerAuditEvents: AuditEvent[] = auditResult.rows
    .filter((r) => {
      const md = r.metadata ?? {};
      return md.partner_id === partner.id || md.user_id === partner.user_id;
    })
    .map(toAuditEvent);

  return (
    <AdminShell>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/partners"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Licenciados
          </Link>
          <h1 className="font-display font-semibold text-2xl mt-2">
            {partner.user_id ? `${partner.user_id.slice(0, 8)}...` : "Parceiro órfão (user removido)"}
          </h1>
          <p className="text-sm mt-1">
            <PartnerStatusBadge status={partner.status} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PartnerCommissionDialog
            partnerId={partner.id}
            currentPct={partner.custom_commission_pct}
          />
          <PartnerActionsMenu partnerId={partner.id} status={partner.status} />
        </div>
      </header>

      <TabNav items={TABS} active={activeTab} />

      {activeTab === "identidade" && (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="font-mono">
              {partner.user_id ?? <span className="italic text-muted-foreground">removido</span>}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <PartnerStatusBadge status={partner.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Comissão custom</dt>
            <dd>{partner.custom_commission_pct ?? "padrão (config global)"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stripe Connect</dt>
            <dd className="font-mono">{partner.stripe_connect_account_id ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contrato assinado em</dt>
            <dd>{partner.contract_signed_at ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Licença paga em</dt>
            <dd>{partner.license_paid_at ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">KYC concluído em</dt>
            <dd>{partner.kyc_completed_at ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Ativado em</dt>
            <dd>{partner.activated_at ?? "-"}</dd>
          </div>
        </dl>
      )}

      {activeTab === "indicacoes" && (
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Indicado por</p>
            <p>
              {introducedBy ? (
                <Link
                  href={`/partners/${introducedBy.id}`}
                  className="text-primary hover:underline"
                >
                  {introducedBy.user_id ? `${introducedBy.user_id.slice(0, 8)}...` : `(removido) ${introducedBy.id.slice(0, 8)}`}
                </Link>
              ) : (
                "-"
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-2">
              Licenciados trazidos por este ({downstream.length})
            </p>
            {downstream.length === 0 ? (
              <p className="text-muted-foreground">Nenhum.</p>
            ) : (
              <ul className="space-y-1">
                {downstream.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/partners/${d.id}`}
                      className="text-primary hover:underline"
                    >
                      {d.user_id ? `${d.user_id.slice(0, 8)}...` : `(removido) ${d.id.slice(0, 8)}`}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <section className="pt-6 border-t">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Clientes indicados</h2>
              <AttributeUserDialog partnerId={partner.id} />
            </div>
            <PartnerReferralsTab partnerId={partner.id} callerJwt={jwt} />
          </section>
        </div>
      )}

      {activeTab === "comissoes" && (
        <p className="text-sm text-muted-foreground">
          Disponível a partir do K.4 (cálculo de comissão real).
        </p>
      )}

      {activeTab === "payouts" && (
        <p className="text-sm text-muted-foreground">
          Disponível a partir do K.4 (cálculo de comissão real).
        </p>
      )}

      {activeTab === "auditoria" && <AuditList events={partnerAuditEvents} />}
    </AdminShell>
  );
}
