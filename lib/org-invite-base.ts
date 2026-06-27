// Um app só pode ser base de um convite de ORG quando tem onboarding próprio.
// Nunca o "platform" (painel interno, sem onboarding público) e precisa de
// public_url. Sem isso, resolveNicheHost cairia no fallback do partners, cujo
// /onboarding resolve partner_invitations (não org_invitations) e o link quebra.
export function appCanReceiveOrgInvite(
  appSlug: string,
  publicUrl: string | null | undefined,
): boolean {
  return appSlug !== "platform" && !!publicUrl;
}
