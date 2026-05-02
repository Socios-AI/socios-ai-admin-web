// Cookie consent helpers for the LGPD-compliant CMP banner.
// Mirror of socios-ai-identity-web/lib/cookie-consent.ts so the
// consent banner shows once per browser across .sociosai.com.
// If we extract a shared package later, both can import from there.

export const CONSENT_COOKIE_NAME = "sai_consent";

export type ConsentValue = "granted" | "denied";

export const CONSENT_COOKIE_OPTIONS = {
  domain: ".sociosai.com",
  maxAge: 60 * 60 * 24 * 180,
  sameSite: "lax" as const,
  secure: true,
  httpOnly: false,
  path: "/",
} as const;

export function parseConsent(value: unknown): ConsentValue | null {
  if (value === "granted" || value === "denied") return value;
  return null;
}

export function readConsentFromCookie(cookieHeader: string | null | undefined): ConsentValue | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/);
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq);
    if (name !== CONSENT_COOKIE_NAME) continue;
    return parseConsent(decodeURIComponent(part.slice(eq + 1)));
  }
  return null;
}
