// Opções do modal "Conceder membership", derivadas do app selecionado.
// A fonte da verdade é o próprio app em public.apps: role_catalog (papéis) e
// metadata.niche_catalog (nichos). Nada de lista fixa · cada app dita o seu.

export type RoleOption = { slug: string; label: string };
export type NicheOption = { key: string; label: string };

// Papéis do app, ordenados por rótulo. Catálogo vazio/ausente → sem papéis.
// Quando devolve 1 só (ex. beauty = org_admin), o modal não mostra dropdown.
export function roleOptionsFromCatalog(
  catalog: Record<string, string> | null | undefined,
): RoleOption[] {
  if (!catalog) return [];
  return Object.entries(catalog)
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Nichos do app (só apps multi-nicho, como beauty). Sem catálogo → sem nichos,
// e o modal cai no campo Org ID livre.
export function nicheOptionsFromCatalog(
  catalog: Record<string, string> | null | undefined,
): NicheOption[] {
  if (!catalog) return [];
  return Object.entries(catalog)
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Filtra as orgs (tenants) pelo nicho escolhido · o nicho vive na org, não na
// membership, então a org selecionada é o que amarra o acesso ao nicho certo.
export function filterOrgsByNiche<T extends { niche: string | null }>(
  orgs: T[],
  niche: string,
): T[] {
  if (!niche) return [];
  return orgs.filter((o) => o.niche === niche);
}
