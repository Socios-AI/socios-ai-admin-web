import { cookies } from "next/headers";
import { decodeJwtPayload } from "./jwt";

export type SuperAdminClaims = {
  sub: string;
  email?: string;
  super_admin: boolean;
  memberships?: Array<{ app_slug: string; org_id: string | null; role_slug: string }>;
};

export async function getCallerJwt(): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const projectRef = url.replace(/^https?:\/\//, "").split(".")[0];
  if (!projectRef) return null;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(`sb-${projectRef}-auth-token`)?.value;
  if (!cookieValue) return null;

  // Cookie format: array stringified, base64-prefixed JSON, or raw token
  let token = cookieValue;
  if (cookieValue.startsWith("[") || cookieValue.startsWith("base64-")) {
    try {
      const raw = cookieValue.startsWith("base64-")
        ? Buffer.from(cookieValue.slice("base64-".length), "base64").toString("utf-8")
        : cookieValue;
      const parsed = JSON.parse(raw) as [string, ...unknown[]];
      token = parsed[0] ?? cookieValue;
    } catch {
      // fall through with raw
    }
  }
  return token;
}

export async function getCallerClaims(): Promise<SuperAdminClaims | null> {
  const token = await getCallerJwt();
  if (!token) return null;
  const claims = decodeJwtPayload<SuperAdminClaims>(token);
  return claims;
}
