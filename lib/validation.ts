import { z } from "zod";
import { ROLES } from "./roles";

const roleSlugs = ROLES.map((r) => r.slug) as [string, ...string[]];

export const reasonSchema = z
  .string({ required_error: "Motivo é obrigatório" })
  .trim()
  .min(5, "Motivo precisa ter pelo menos 5 caracteres");

export const inviteUserSchema = z
  .object({
    email: z.string().trim().email("Email inválido"),
    fullName: z.string().trim().min(2, "Nome muito curto"),
    appSlug: z.string().trim().min(1, "App é obrigatório"),
    roleSlug: z.enum(roleSlugs, { required_error: "Role é obrigatória" }),
    orgId: z.string().uuid("Org ID inválido").optional(),
  })
  .superRefine((val, ctx) => {
    const def = ROLES.find((r) => r.slug === val.roleSlug);
    if (def?.requiresOrg && !val.orgId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["orgId"],
        message: "Esta role exige org_id",
      });
    }
    if (def && !def.requiresOrg && val.orgId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["orgId"],
        message: "Esta role não aceita org_id",
      });
    }
  });

export const userIdSchema = z.string().uuid("userId inválido");
export const membershipIdSchema = z.string().uuid("membershipId inválido");

export const promoteUserSchema = z.object({ userId: userIdSchema, reason: reasonSchema });
export const demoteUserSchema = z.object({ userId: userIdSchema, reason: reasonSchema });
export const forceLogoutSchema = z.object({ userId: userIdSchema, reason: reasonSchema });

export const grantMembershipSchema = z
  .object({
    userId: userIdSchema,
    appSlug: z.string().trim().min(1),
    roleSlug: z.enum(roleSlugs),
    orgId: z.string().uuid().optional(),
  })
  .superRefine((val, ctx) => {
    const def = ROLES.find((r) => r.slug === val.roleSlug);
    if (def?.requiresOrg && !val.orgId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["orgId"], message: "Esta role exige org_id" });
    }
  });

export const revokeMembershipSchema = z.object({
  membershipId: membershipIdSchema,
  reason: reasonSchema,
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type PromoteUserInput = z.infer<typeof promoteUserSchema>;
export type DemoteUserInput = z.infer<typeof demoteUserSchema>;
export type ForceLogoutInput = z.infer<typeof forceLogoutSchema>;
export type GrantMembershipInput = z.infer<typeof grantMembershipSchema>;
export type RevokeMembershipInput = z.infer<typeof revokeMembershipSchema>;

// =============================================================
// Plan G.2: app catalog management
// =============================================================

export const appSlugSchema = z
  .string()
  .trim()
  .min(2, "Slug muito curto")
  .max(40, "Slug muito longo")
  .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen");

const httpsUrlSchema = z
  .string()
  .trim()
  .url("URL inválida")
  .refine((u) => u.startsWith("https://"), "URL deve começar com https://");

const appStatusSchema = z.enum(["active", "beta", "sunset", "archived"]);

export const createAppSchema = z.object({
  slug: appSlugSchema,
  name: z.string().trim().min(2, "Nome muito curto").max(80, "Nome muito longo"),
  description: z.string().trim().max(500, "Descrição muito longa").optional().nullable(),
  public_url: httpsUrlSchema.optional().nullable(),
  icon_url: httpsUrlSchema.optional().nullable(),
  status: appStatusSchema.default("active"),
  responsible_user_id: z.string().uuid("ID inválido").optional().nullable(),
  role_catalog: z
    .record(z.string())
    .default({ "tenant-admin": "Tenant Admin", member: "Member" }),
});

export const updateAppSchema = z.object({
  slug: appSlugSchema,
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional().nullable(),
  public_url: httpsUrlSchema.optional().nullable(),
  icon_url: httpsUrlSchema.optional().nullable(),
  status: appStatusSchema,
  responsible_user_id: z.string().uuid().optional().nullable(),
});

export const toggleAppFlagSchema = z.object({
  slug: appSlugSchema,
  flag: z.enum(["active", "accepts_new_subscriptions"]),
  value: z.boolean(),
  reason: z.string().trim().min(5, "Motivo precisa ter pelo menos 5 caracteres"),
});

export type CreateAppInput = z.infer<typeof createAppSchema>;
export type UpdateAppInput = z.infer<typeof updateAppSchema>;
export type ToggleAppFlagInput = z.infer<typeof toggleAppFlagSchema>;

// =============================================================
// Plan G.3: plan catalog management
// =============================================================

export const planSlugSchema = z
  .string()
  .trim()
  .min(2, "Slug muito curto")
  .max(60, "Slug muito longo")
  .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen");

const billingPeriodSchema = z.enum(["monthly", "yearly", "one_time", "custom"]);
const planCurrencySchema = z.enum(["usd", "brl", "eur"]);

export const featureEntrySchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Chave obrigatória")
    .max(60, "Chave muito longa")
    .regex(/^[a-z][a-z0-9_]*$/, "Use snake_case (letras minúsculas, números, underscore)"),
  value: z.union([
    z.string().trim().max(200),
    z.number().finite(),
    z.boolean(),
  ]),
});

export const featureListSchema = z.array(featureEntrySchema).superRefine((entries, ctx) => {
  const seen = new Set<string>();
  entries.forEach((entry, index) => {
    if (seen.has(entry.key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, "key"],
        message: `Chave duplicada: ${entry.key}`,
      });
    }
    seen.add(entry.key);
  });
});

const appSlugListSchema = z
  .array(z.string().trim().min(1))
  .min(1, "Selecione pelo menos um app");

export const createPlanSchema = z
  .object({
    slug: planSlugSchema,
    name: z.string().trim().min(2, "Nome muito curto").max(120, "Nome muito longo"),
    description: z.string().trim().max(500, "Descrição muito longa").optional().nullable(),
    billing_period: billingPeriodSchema,
    price_amount: z
      .number({ required_error: "Preço obrigatório", invalid_type_error: "Preço inválido" })
      .nonnegative("Preço não pode ser negativo")
      .max(1_000_000, "Preço fora da faixa"),
    currency: planCurrencySchema.default("usd"),
    features: featureListSchema.default([]),
    is_visible: z.boolean().default(true),
    app_slugs: appSlugListSchema,
  })
  .superRefine((val, ctx) => {
    const unique = new Set(val.app_slugs);
    if (unique.size !== val.app_slugs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["app_slugs"],
        message: "Apps duplicados na seleção",
      });
    }
  });

export const updatePlanSchema = z
  .object({
    id: z.string().uuid("Plan ID inválido"),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional().nullable(),
    billing_period: billingPeriodSchema,
    price_amount: z.number().nonnegative().max(1_000_000),
    currency: planCurrencySchema,
    features: featureListSchema,
    is_visible: z.boolean(),
    app_slugs: appSlugListSchema,
  })
  .superRefine((val, ctx) => {
    const unique = new Set(val.app_slugs);
    if (unique.size !== val.app_slugs.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["app_slugs"],
        message: "Apps duplicados na seleção",
      });
    }
  });

export const togglePlanFlagSchema = z.object({
  id: z.string().uuid("Plan ID inválido"),
  flag: z.enum(["is_active", "is_visible"]),
  value: z.boolean(),
  reason: z.string().trim().min(5, "Motivo precisa ter pelo menos 5 caracteres"),
});

export type FeatureEntry = z.infer<typeof featureEntrySchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type TogglePlanFlagInput = z.infer<typeof togglePlanFlagSchema>;

export function featuresArrayToObject(entries: FeatureEntry[]): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const entry of entries) {
    out[entry.key] = entry.value;
  }
  return out;
}

export function featuresObjectToArray(obj: Record<string, unknown> | null | undefined): FeatureEntry[] {
  if (!obj) return [];
  return Object.entries(obj)
    .filter((entry): entry is [string, string | number | boolean] => {
      const v = entry[1];
      return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
    })
    .map(([key, value]) => ({ key, value }));
}

// =============================================================
// Plan G.4: subscriptions (manual assignment + cancel)
// =============================================================

export const subscriptionIdSchema = z.string().uuid("subscriptionId inválido");
export const planIdSchema = z.string().uuid("planId inválido");

export const assignManualSubscriptionSchema = z
  .object({
    userId: userIdSchema.optional(),
    orgId: z.string().uuid("orgId inválido").optional(),
    appSlug: z.string().trim().min(1, "appSlug obrigatório").optional(),
    planId: planIdSchema,
    startedAt: z.string().datetime().optional(),
    currentPeriodEnd: z.string().datetime().nullable(),
    notes: z.string().trim().max(500, "Observação muito longa").optional(),
  })
  .refine((d) => !!d.userId !== !!d.orgId, {
    message: "Exatamente um de userId ou orgId é obrigatório",
    path: ["userId"],
  })
  .refine((d) => !d.orgId || !!d.appSlug, {
    message: "appSlug é obrigatório quando orgId está presente",
    path: ["appSlug"],
  });

export const cancelSubscriptionSchema = z.object({
  subscriptionId: subscriptionIdSchema,
  reason: reasonSchema,
});

export type AssignManualSubscriptionInput = z.infer<typeof assignManualSubscriptionSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

// =============================================================
// Plan K.1 · Partner schemas
// =============================================================

export const createPartnerInvitationSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  fullName: z.string().trim().min(2, "Nome muito curto"),
  introducedByPartnerId: z.string().uuid("Indicador inválido").optional(),
  licenseAmountUsd: z
    .number({ invalid_type_error: "Valor inválido" })
    .positive("Valor deve ser positivo")
    .max(1_000_000, "Valor excessivo"),
  installments: z.number().int().min(1).max(12).default(1),
  customCommissionPct: z
    .number()
    .min(0)
    .max(1, "Use formato decimal (0.5 = 50%)")
    .optional(),
  expiresInDays: z.number().int().min(1).max(60).default(30),
});

export const cancelPartnerInvitationSchema = z.object({
  invitationId: z.string().uuid("invitationId inválido"),
  reason: reasonSchema,
});

export const partnerIdSchema = z.string().uuid("partnerId inválido");

export const suspendPartnerSchema = z.object({
  partnerId: partnerIdSchema,
  reason: reasonSchema,
});

export const terminatePartnerSchema = z.object({
  partnerId: partnerIdSchema,
  reason: reasonSchema,
});

export const updatePartnerCommissionSchema = z.object({
  partnerId: partnerIdSchema,
  customCommissionPct: z
    .number()
    .min(0)
    .max(1, "Use formato decimal (0.5 = 50%)")
    .nullable(),
  reason: reasonSchema,
});

export type CreatePartnerInvitationInput = z.infer<typeof createPartnerInvitationSchema>;
export type CancelPartnerInvitationInput = z.infer<typeof cancelPartnerInvitationSchema>;
export type SuspendPartnerInput = z.infer<typeof suspendPartnerSchema>;
export type TerminatePartnerInput = z.infer<typeof terminatePartnerSchema>;
export type UpdatePartnerCommissionInput = z.infer<typeof updatePartnerCommissionSchema>;
