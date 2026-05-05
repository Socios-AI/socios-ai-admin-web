import { cookies } from "next/headers";
import type { MembershipClaim } from "@socios-ai/auth";
import { decodeJwtPayload } from "./jwt";
import { readSessionCookie, extractAccessToken } from "./session-cookie";

export type SuperAdminClaims = {
  sub: string;
  email?: string;
  super_admin: boolean;
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
