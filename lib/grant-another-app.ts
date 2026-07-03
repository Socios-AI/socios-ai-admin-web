// "Dar acesso a outro app" · deixa o fluxo de conceder acesso (que hoje é o
// "Novo cliente" / create_org_for_app) discoverable a partir da pessoa. Como
// acesso é por-app (cada app/nicho = uma conta/org separada), dar +1 app é
// criar um tenant novo pra essa pessoa · aqui só pré-preenchemos o formulário
// com o nome+email dela.

// Link pro "Novo cliente" já com o cliente + responsável preenchidos. A presença
// de adminEmail sinaliza pro form o modo "adicionar app a cliente existente"
// (campos de identidade travados).
export function newOrgHrefForPerson(opts: {
  clientName?: string | null;
  adminName?: string | null;
  adminEmail?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.clientName) params.set("clientName", opts.clientName);
  if (opts.adminName) params.set("adminName", opts.adminName);
  if (opts.adminEmail) params.set("adminEmail", opts.adminEmail);
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
