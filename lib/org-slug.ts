// Slug interno da org. O campo deixou de ser preenchido pelo admin em
// /orgs/new; é derivado do nome do cliente + um sufixo curto aleatório que
// garante unicidade (orgs.slug é UNIQUE no banco) sem precisar de query/loop.
// O resultado sempre satisfaz a check do banco: ^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$

export function slugifyOrgName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (combining marks)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

export function generateOrgSlug(name: string): string {
  const base = slugifyOrgName(name) || "org";
  // 5 chars base36, sempre termina em alfanumérico (padEnd com '0').
  const suffix = Math.random().toString(36).slice(2, 7).padEnd(5, "0");
  return `${base}-${suffix}`;
}
