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
import { MarkEntryFeePaidButton } from "@/components/MarkEntryFeePaidButton";
import { PartnerEditDialog } from "@/components/PartnerEditDialog";
import { EdgeRateDialog } from "@/components/EdgeRateDialog";
import { LedgerTable } from "@/components/LedgerTable";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCallerJwt } from "@/lib/auth";
import {
  getPartner,
  getPartnerProfile,
  listPartners,
  listPartnerSubtree,
  listCommissionLedger,
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
  { key: "taxas", label: "Taxas" },
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

  // Taxas: subárvore depth 1 = este parceiro (depth 0, taxa de entrada que recebe) + filhos diretos.
  const subtree = await listPartnerSubtree({ callerJwt: jwt, rootPartnerId: id, maxDepth: 1 });
  const selfNode = subtree.find((n) => n.partner_id === partner.id);
  const childRateById = new Map(
    subtree.filter((n) => n.partner_id !== partner.id).map((n) => [n.partner_id, n.rate_to_parent]),
  );

  // Extrato deste parceiro (comissões em que ele é beneficiário)
  const partnerLedger = await listCommissionLedger({ callerJwt: jwt, beneficiaryPartnerId: id });

  const profiles = await resolveProfilesByIds({
    callerJwt: jwt,
    ids: [partner, introducedBy, ...downstream].flatMap((p) =>
      p?.user_id ? [p.user_id] : [],
    ),
  });
  const partnerProfile = partner.user_id ? profiles.get(partner.user_id) : null;
  const partnerLedgerLabels = new Map<string, string>([[partner.id, partnerLabel(partner, profiles)]]);

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

  const partnerName = partner.user_id
    ? partnerLabel(partner, profiles)
    : "Parceiro órfão (user removido)";
  const showTerminationReason =
    (partner.status === "suspended" || partner.status === "terminated") &&
    Boolean(partner.termination_reason);

  return (
    <AdminShell>
      <PageHeader
        breadcrumbs={[{ label: "Parceiros", href: "/partners" }, { label: partnerName }]}
        title={partnerName}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {partnerProfile?.email ? <span>{partnerProfile.email}</span> : null}
            <PartnerStatusBadge status={partner.status} />
          </span>
        }
        actions={
          <>
            <PartnerCommissionDialog
              partnerId={partner.id}
              currentPct={partner.custom_commission_pct}
            />
            <PartnerActionsMenu partnerId={partner.id} status={partner.status} />
          </>
        }
      />

      {showTerminationReason ? (
        <div className="mb-6 rounded-lg border border-warning/50 bg-warning/15 p-4 text-sm text-foreground">
          <p className="font-medium">
            {partner.status === "terminated" ? "Motivo do encerramento" : "Motivo da suspensão"}
          </p>
          <p className="mt-1 text-muted-foreground">{partner.termination_reason}</p>
        </div>
      ) : null}

      <TabNav items={TABS} active={activeTab} />

      {activeTab === "identidade" && (
        <div className="space-y-6">
          {/* Ações: editar cadastro · pedir complemento */}
          <div className="flex flex-wrap items-center gap-2">
            <PartnerEditDialog
              partnerId={partner.id}
              initialFullName={partnerProfile?.full_name ?? ""}
              initialEmail={partnerProfile?.email ?? ""}
              initialProfile={registrationData?.profile ?? null}
            />
            <RequestCompletionButton partnerId={partner.id} />
            {partner.role === "representante" &&
            partner.entry_fee_amount != null &&
            partner.entry_fee_paid_at == null ? (
              <MarkEntryFeePaidButton partnerId={partner.id} />
            ) : null}
          </div>

          {/* Dados da plataforma */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Dados da plataforma</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
            </CardContent>
          </Card>

          {/* Cadastro (registration profile) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cadastro</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
                        registrationData.profile?.address_line1,
                        registrationData.profile?.address_number,
                        registrationData.profile?.address_complement,
                        registrationData.profile?.address_district,
                        registrationData.profile?.address_city,
                        registrationData.profile?.address_state,
                        registrationData.profile?.address_postal_code,
                        registrationData.profile?.country,
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
            </CardContent>
          </Card>
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

      {activeTab === "taxas" && (
        <div className="space-y-6 text-sm">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-muted-foreground">Comissão deste parceiro sobre o net</p>
                <p className="text-lg font-medium tabular-nums mt-1">
                  {selfNode?.rate_to_parent == null
                    ? "não definida (0% até cadastrar)"
                    : `${(selfNode.rate_to_parent * 100).toFixed(1)}% do net`}
                </p>
              </div>
              <EdgeRateDialog
                childPartnerId={partner.id}
                childLabel={partnerName}
                currentRate={selfNode?.rate_to_parent ?? null}
              />
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-3">Comissão dos diretos ({downstream.length})</h2>
            {downstream.length === 0 ? (
              <p className="text-muted-foreground">Nenhum parceiro direto.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Parceiro</th>
                      <th className="px-4 py-3">Comissão</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {downstream.map((d) => {
                      const rate = childRateById.get(d.id) ?? null;
                      return (
                        <tr key={d.id} className="border-t border-border">
                          <td className="px-4 py-3">{partnerLabel(d, profiles)}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {rate == null ? (
                              <span className="text-muted-foreground">não def. (0%)</span>
                            ) : (
                              `${(rate * 100).toFixed(1)}%`
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <EdgeRateDialog
                              childPartnerId={d.id}
                              childLabel={partnerLabel(d, profiles)}
                              currentRate={rate}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "comissoes" && (
        <LedgerTable entries={partnerLedger} labels={partnerLedgerLabels} />
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
