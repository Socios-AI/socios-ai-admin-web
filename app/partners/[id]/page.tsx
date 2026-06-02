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
import { RequestCompletionButton } from "@/components/RequestCompletionButton";
import { getCallerJwt } from "@/lib/auth";
import {
  getPartner,
  getPartnerProfile,
  listPartners,
  listAuditEvents,
  resolveProfilesByIds,
  type AuditEvent,
  type AuditLogEntry,
  type PartnerRow,
} from "@/lib/data";

type ProfileMap = Map<string, { email: string; full_name: string | null }>;

// Rótulo legível pra um parceiro: nome > email > "(removido)" se user_id null.
function partnerLabel(p: PartnerRow, profiles: ProfileMap): string {
  if (!p.user_id) return `(removido) ${p.id.slice(0, 8)}`;
  const profile = profiles.get(p.user_id);
  return profile?.full_name || profile?.email || `(sem perfil) ${p.user_id.slice(0, 8)}`;
}

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

  const profiles = await resolveProfilesByIds({
    callerJwt: jwt,
    ids: [partner, introducedBy, ...downstream].flatMap((p) =>
      p?.user_id ? [p.user_id] : [],
    ),
  });
  const partnerProfile = partner.user_id ? profiles.get(partner.user_id) : null;

  type RegistrationData = { profile: Record<string, unknown> | null; payout_methods: Array<Record<string, unknown>> };
  let registrationData: RegistrationData | null = null;
  try {
    const raw = await getPartnerProfile({ callerJwt: jwt, partnerId: id });
    if (raw && typeof raw === "object") {
      registrationData = raw as RegistrationData;
    }
  } catch {
    // proceed without registration data
  }

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
            {partner.user_id ? partnerLabel(partner, profiles) : "Parceiro órfão (user removido)"}
          </h1>
          {partnerProfile?.full_name && partnerProfile.email ? (
            <p className="text-sm text-muted-foreground mt-1">{partnerProfile.email}</p>
          ) : null}
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
        <div className="space-y-8">
          {/* Ação: pedir complemento de cadastro */}
          <RequestCompletionButton partnerId={partner.id} />

          {/* Dados da plataforma */}
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd>
                {!partner.user_id ? (
                  <span className="italic text-muted-foreground">user removido</span>
                ) : (
                  partnerProfile?.full_name || <span className="text-muted-foreground">-</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{partnerProfile?.email ?? <span className="text-muted-foreground">-</span>}</dd>
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

          {/* Cadastro (registration profile) */}
          <section className="border-t pt-6">
            <h2 className="font-semibold text-sm mb-4">Cadastro</h2>
            {registrationData ? (
              <>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm mb-6">
                  <div>
                    <dt className="text-muted-foreground">País</dt>
                    <dd>{(registrationData.profile?.country as string) ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tipo de pessoa</dt>
                    <dd>{(registrationData.profile?.person_type as string) ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">CPF/CNPJ (últimos 4)</dt>
                    <dd className="font-mono">
                      {registrationData.profile?.tax_id_last4
                        ? `***${registrationData.profile.tax_id_last4 as string}`
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status CPF/CNPJ</dt>
                    <dd>{(registrationData.profile?.cnpj_status as string) ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Razão social</dt>
                    <dd>{(registrationData.profile?.company_legal_name as string) ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Nome fantasia</dt>
                    <dd>{(registrationData.profile?.company_trade_name as string) ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Telefone</dt>
                    <dd>{(registrationData.profile?.phone as string) ?? "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status do cadastro</dt>
                    <dd>{(registrationData.profile?.profile_status as string) ?? "-"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Endereço</dt>
                    <dd>
                      {[
                        registrationData.profile?.address_street,
                        registrationData.profile?.address_number,
                        registrationData.profile?.address_complement,
                        registrationData.profile?.address_neighborhood,
                        registrationData.profile?.address_city,
                        registrationData.profile?.address_state,
                        registrationData.profile?.address_zip,
                        registrationData.profile?.address_country,
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </dd>
                  </div>
                </dl>

                {/* Métodos de pagamento */}
                {registrationData.payout_methods && registrationData.payout_methods.length > 0 && (
                  <div>
                    <h3 className="text-sm text-muted-foreground mb-2">Formas de recebimento</h3>
                    <ul className="space-y-2 text-sm">
                      {registrationData.payout_methods.map((pm: Record<string, unknown>, i: number) => (
                        <li key={i} className="flex gap-4 border rounded px-3 py-2">
                          <span className="font-medium">{String(pm.method ?? "-")}</span>
                          {pm.last4 ? (
                            <span className="text-muted-foreground font-mono">***{String(pm.last4)}</span>
                          ) : null}
                          {pm.pix_key ? (
                            <span className="text-muted-foreground font-mono">{String(pm.pix_key)}</span>
                          ) : null}
                          {pm.zelle_identifier ? (
                            <span className="text-muted-foreground font-mono">{String(pm.zelle_identifier)}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Cadastro não preenchido.</p>
            )}
          </section>
        </div>
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
                  {partnerLabel(introducedBy, profiles)}
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
                      {partnerLabel(d, profiles)}
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
