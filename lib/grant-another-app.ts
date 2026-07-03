// "Dar acesso a outro app" · deixa o fluxo de conceder acesso (que hoje é o
// "Novo cliente" / create_org_for_app) discoverable a partir da pessoa. Como
// acesso é por-app (cada app/nicho = uma conta/org separada), dar +1 app é
// criar um tenant novo pra essa pessoa · aqui só pré-preenchemos o formulário
// com o nome+email dela.

// Link pro "Novo cliente" já com o responsável preenchido.
export function newOrgHrefForPerson(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const params = new URLSearchParams();
  if (name) params.set("adminName", name);
  if (email) params.set("adminEmail", email);
  const qs = params.toString();
  return qs ? `/orgs/new?${qs}` : "/orgs/new";
}

// A "pessoa" da org = o admin (com email); se o admin não tem email, o primeiro
// membro que tenha. Sem nenhum email → null (nada pra pré-preencher).
export function pickPrimaryPerson<
  T extends { isAdmin: boolean; name: string | null; email: string | null },
>(members: T[]): { name: string | null; email: string } | null {
  const admin = members.find((m) => m.isAdmin && m.email);
  const chosen = admin ?? members.find((m) => m.email);
  if (!chosen || !chosen.email) return null;
  return { name: chosen.name, email: chosen.email };
}
