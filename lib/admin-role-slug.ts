// Each registered app in public.apps carries its own role_catalog. The "admin"
// role naming convention differs by app:
//   - beauty-protocol → tenant-admin
//   - platform        → org_admin
//   - case-predictor  → case-predictor-admin
// This resolver picks the right slug from whichever vocabulary the app uses.
// Lives outside the server-action module because pure functions cannot be
// exported alongside async actions in a "use server" file.
export function deriveAdminRoleSlug(
  roleCatalog: Record<string, string>,
  appSlug: string,
): string | null {
  const keys = Object.keys(roleCatalog);
  if (keys.includes("tenant-admin")) return "tenant-admin";
  if (keys.includes(`${appSlug}-admin`)) return `${appSlug}-admin`;
  if (keys.includes("org_admin")) return "org_admin";
  const adminKey = keys.find((k) => k.endsWith("-admin") || k === "admin");
  return adminKey ?? null;
}
