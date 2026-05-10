import { cookies } from "next/headers";
import type { MembershipClaim } from "@socios-ai/auth";
import { decodeJwtPayload } from "./jwt";
import { readSessionCookie, extractAccessToken } from "./session-cookie";

export type SuperAdminClaims = {
  sub: string;
  email?: string;
  super_admin: boolean;
  aal?: string;
  exp?: number;
  memberships?: MembershipClaim[];
};

export async function getCallerJwt(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const projectRef = url.replace(/^https?:\/\//, "").split(".")[0];
  if (!projectRef) return null;
  const cookieStore = await cookies();
  const cookieValue = readSessionCookie(cookieStore, `sb-${projectRef}-auth-token`);
  if (!cookieValue) return null;
  return extractAccessToken(cookieValue);
}

export async function getCallerClaims(): Promise<SuperAdminClaims | null> {
  const token = await getCallerJwt();
  if (!token) return null;
  const claims = decodeJwtPayload<SuperAdminClaims>(token);
  return claims;
}

/**
 * Defense-in-depth gate for Server Actions that mutate via service_role.
 *
 * Beyond the middleware (which is Edge-runtime and decode-only by design),
 * Server Actions can also be invoked via direct fetch without crossing the
 * middleware, and historically the per-action check was only
 * `if (!claims?.super_admin) return FORBIDDEN`. That ignores AAL2 and JWT
 * expiry, so a stolen cookie from a super_admin who never enrolled MFA, or
 * an expired session in a long-running tab, would slip past.
 *
 * Returns the claims + raw JWT on success, or `null` if the caller does
 * NOT satisfy all of:
 *   - JWT cookie present and decodable
 *   - `exp` in the future
 *   - `super_admin === true`
 *   - `aal === "aal2"`
 *
 * Note: signature is NOT verified here. The middleware already documents
 * why decode-only is safe (cookie only exists because GoTrue signed it).
 * This helper adds the SEMANTIC checks middleware does NOT cover at the
 * Server Action layer.
 */
export async function requireSuperAdminAAL2(): Promise<
  { claims: SuperAdminClaims; jwt: string } | null
> {
  const jwt = await getCallerJwt();
  if (!jwt) return null;

  const claims = decodeJwtPayload<SuperAdminClaims>(jwt);
  if (!claims) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp <= nowSec) return null;
  if (claims.super_admin !== true) return null;
  if (claims.aal !== "aal2") return null;

  return { claims, jwt };
}
