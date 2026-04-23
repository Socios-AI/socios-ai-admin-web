// Role taxonomy for admin-web v1. Mirrors the spec; promote in line with
// any future `roles` table in Plan A backend.
export type RoleSlug =
  | "end-user"
  | "partner-member"
  | "partner-admin"
  | "affiliate"
  | "tenant-admin";

export type RoleDefinition = {
  slug: RoleSlug;
  label: string;
  requiresOrg: boolean;
};

export const ROLES: RoleDefinition[] = [
  { slug: "end-user", label: "Usuário final", requiresOrg: false },
  { slug: "partner-member", label: "Membro parceiro", requiresOrg: true },
  { slug: "partner-admin", label: "Admin parceiro", requiresOrg: true },
  { slug: "affiliate", label: "Afiliado", requiresOrg: true },
  { slug: "tenant-admin", label: "Admin tenant", requiresOrg: false },
];

export function roleRequiresOrg(slug: string): boolean {
  return ROLES.find((r) => r.slug === slug)?.requiresOrg ?? false;
}

export function isValidRole(slug: string): slug is RoleSlug {
  return ROLES.some((r) => r.slug === slug);
}
