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
