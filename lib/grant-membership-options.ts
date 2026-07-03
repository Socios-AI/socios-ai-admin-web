// Opções de papel do modal "Conceder membership", derivadas do app selecionado.
// A fonte da verdade é o role_catalog do app em public.apps · nada de lista fixa.
// (Onboarding de cliente novo é o fluxo "Novo cliente" / create_org_for_app;
// este modal só anexa um usuário a um app + papel + conta que JÁ existe.)

export type RoleOption = { slug: string; label: string };

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
