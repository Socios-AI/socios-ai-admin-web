export type AuditEventGroup =
  | "Apps"
  | "Planos"
  | "Subscriptions"
  | "Memberships"
  | "Usuários"
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
  // Note: identity RPCs grant_membership / revoke_membership emit the
  // underscore form; we keep the dotted form as a label-only alias in
  // case any future server action emits it.
  { value: "membership.granted",             label: "Acesso concedido",       group: "Memberships" },
  { value: "membership.revoked",             label: "Acesso revogado",        group: "Memberships" },
  { value: "membership_granted",             label: "Acesso concedido",       group: "Memberships" },
  { value: "membership_revoked",             label: "Acesso revogado",        group: "Memberships" },
  // Usuários (RPCs in identity emit underscore-naming events)
  { value: "user_created",                   label: "Usuário criado",         group: "Usuários" },
  { value: "user_deleted",                   label: "Usuário removido",       group: "Usuários" },
  { value: "force_logout",                   label: "Logout forçado",         group: "Usuários" },
  { value: "super_admin_promoted",           label: "Promovido a super-admin", group: "Usuários" },
  { value: "super_admin_demoted",            label: "Rebaixado de super-admin", group: "Usuários" },
  { value: "mfa_factors_reset",              label: "MFA resetado",           group: "Usuários" },
  { value: "impersonation_started",          label: "Impersonação iniciada",  group: "Usuários" },
  { value: "impersonation_ended",            label: "Impersonação encerrada", group: "Usuários" },
  // Licenciados (Plan K.3 · referral attribution)
  { value: "referral.created",               label: "Indicação criada",       group: "Licenciados" },
  { value: "referral.revoked",               label: "Indicação revogada",     group: "Licenciados" },
  { value: "referral.transferred",           label: "Indicação transferida",  group: "Licenciados" },
  // Licenciados (Plan K.1 · partner lifecycle)
  { value: "partner.suspended",              label: "Licenciado suspenso",    group: "Licenciados" },
  { value: "partner.terminated",             label: "Licenciado encerrado",   group: "Licenciados" },
  { value: "partner.commission_updated",     label: "Comissão atualizada",    group: "Licenciados" },
  { value: "partner_invitation.created",     label: "Convite criado",         group: "Licenciados" },
  { value: "partner_invitation.revoked",     label: "Convite cancelado",      group: "Licenciados" },
];

export function groupedAuditEvents(): Record<AuditEventGroup, AuditEventCatalogEntry[]> {
  const out: Record<AuditEventGroup, AuditEventCatalogEntry[]> = {
    Apps: [], Planos: [], Subscriptions: [], Memberships: [], Usuários: [], Sistema: [], Licenciados: [],
  };
  for (const e of AUDIT_EVENTS) out[e.group].push(e);
  return out;
}
