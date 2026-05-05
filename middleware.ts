import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractAccessToken, readSessionCookie } from "./lib/session-cookie";
import { decodeJwtPayload } from "./lib/jwt";

const ID_LOGIN_URL = "https://id.sociosai.com/login";

function getProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  return url.replace(/^https?:\/\//, "").split(".")[0] ?? null;
}

function getCookieName(): string | null {
  const ref = getProjectRef();
  return ref ? `sb-${ref}-auth-token` : null;
}

function publicUrlFor(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "admin.sociosai.com";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
}

function buildRedirect(req: NextRequest, target: string): NextResponse {
  const url = new URL(target);
  url.searchParams.set("from", publicUrlFor(req));
  return NextResponse.redirect(url, { status: 307 });
}

const STATIC_RE = /^\/_next\/static|^\/_next\/image|^\/favicon\.ico|^\/brand|^\/forbidden|\.svg$|\.png$/;

// Default-deny middleware. Decode-only on access_token (no Edge-incompatible
// supabase/ssr or remote JWKS fetch). Token freshness is enforced via the
// `exp` claim; if the JWT is expired, user is bounced to login. Server
// actions handle silent refresh server-side via cookies() in their own
// runtime.
export async function middleware(req: NextRequest) {
  if (STATIC_RE.test(req.nextUrl.pathname)) return NextResponse.next();

  const cookieName = getCookieName();
  if (!cookieName) {
    // Without project ref, cannot identify cookie. Default-deny: redirect to login.
    return buildRedirect(req, ID_LOGIN_URL);
  }

  const cookieValue = readSessionCookie(req.cookies, cookieName);
  if (!cookieValue) {
    return buildRedirect(req, ID_LOGIN_URL);
  }
  const token = extractAccessToken(cookieValue);
  if (!token) {
    return buildRedirect(req, ID_LOGIN_URL);
  }

  const payload = decodeJwtPayload<{
    super_admin?: boolean;
    mfa_enrolled?: boolean;
    aal?: string;
    exp?: number;
  }>(token);
  if (!payload) {
    return buildRedirect(req, ID_LOGIN_URL);
  }

  // Expiry check (decode-only · no signature check, signature already checked
  // when JWT was first issued via the identity hook · attacker cannot forge
  // a valid signature without the project secret).
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSec) {
    return buildRedirect(req, ID_LOGIN_URL);
  }

  // Non-admins always get /forbidden, regardless of MFA status.
  if (payload.super_admin !== true) {
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = "/forbidden";
    return NextResponse.rewrite(rewriteUrl);
  }

  // Admin without MFA enrollment → bounce to enroll on id.sociosai.com.
  if (payload.mfa_enrolled !== true) {
    return buildRedirect(req, "https://id.sociosai.com/mfa-enroll");
  }

  // Admin enrolled but session is aal1 → bounce to challenge for AAL2.
  if (payload.aal !== "aal2") {
    return buildRedirect(req, "https://id.sociosai.com/mfa-challenge");
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand|forbidden|api/webhooks|.*\\.svg$|.*\\.png$).*)",
  ],
};
