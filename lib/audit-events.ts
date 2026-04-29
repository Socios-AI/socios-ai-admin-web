export type AuditEventGroup =
  | "Apps"
  | "Planos"
  | "Subscriptions"
  | "Memberships"
  | "Sistema"
  | "Licenciados";

export type AuditEventCatalogEntry = {
  value: string;
  label: string;
  group: AuditEventGroup;
};

export const AUDIT_EVENTS: readonly AuditEventCatalogEntry[] = [
  // Apps
  { value: "app.created",                    label: "App criado",             group: "Apps" },
  { value: "app.updated",                    label: "App editado",            group: "Apps" },
  { value: "app.activated",                  label: "App ativado",            group: "Apps" },
  { value: "app.deactivated",                label: "App desativado",         group: "Apps" },
  { value: "app.subscriptions_opened",       label: "Subs abertas",           group: "Apps" },
  { value: "app.subscriptions_closed",       label: "Subs fechadas",          group: "Apps" },
  // Planos
  { value: "plan.created",                   label: "Plano criado",           group: "Planos" },
  { value: "plan.updated",                   label: "Plano editado",          group: "Planos" },
  { value: "plan.deactivated",               label: "Plano desativado",       group: "Planos" },
  { value: "plan.stripe_synced",             label: "Plano sync Stripe",      group: "Planos" },
  // Subscriptions
  // metadata: {
  //   subscription_id: uuid,
  //   plan_id: uuid, plan_slug, plan_name,
  //   subject_type: "user" | "org", subject_id: uuid,
  //   user_id?: uuid    (when subject_type=user, kept for back-compat),
  //   org_id?: uuid     (when subject_type=org),
  //   app_slug?: string (when subject_type=org),
  //   current_period_end?, notes?
  // }
  { value: "subscription.assigned_manually", label: "Subscription manual",    group: "Subscriptions" },
  // metadata: {
  //   subscription_id: uuid,
  //   plan_id: uuid, plan_slug, plan_name,
  //   subject_type: "user" | "org", subject_id: uuid,
  //   user_id?: uuid    (when subject_type=user, kept for back-compat),
  //   org_id?: uuid     (when subject_type=org),
  //   app_slug?: string (when subject_type=org),
  //   reason
  // }
  { value: "subscription.canceled",          label: "Subscription cancelada", group: "Subscriptions" },
  // Memberships
  { value: "membership.granted",             label: "Acesso concedido",       group: "Memberships" },
  { value: "membership.revoked",             label: "Acesso revogado",        group: "Memberships" },
  // Licenciados (Plan K.3 · referral attribution)
  { value: "referral.created",               label: "Indicação criada",       group: "Licenciados" },
  { value: "referral.revoked",               label: "Indicação revogada",     group: "Licenciados" },
  { value: "referral.transferred",           label: "Indicação transferida",  group: "Licenciados" },
];

export function groupedAuditEvents(): Record<AuditEventGroup, AuditEventCatalogEntry[]> {
  const out: Record<AuditEventGroup, AuditEventCatalogEntry[]> = {
    Apps: [], Planos: [], Subscriptions: [], Memberships: [], Sistema: [], Licenciados: [],
  };
  for (const e of AUDIT_EVENTS) out[e.group].push(e);
  return out;
}
