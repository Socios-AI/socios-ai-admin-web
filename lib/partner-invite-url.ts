export function partnerOnboardingUrl(token: string): string {
  const base = process.env.PARTNERS_WEB_BASE_URL ?? "https://partners.sociosai.com";
  return `${base.replace(/\/$/, "")}/onboarding/${token}`;
}
