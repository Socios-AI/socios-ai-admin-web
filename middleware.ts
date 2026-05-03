import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { extractAccessToken, readSessionCookie } from "./lib/session-cookie";

const ID_LOGIN_URL = "https://id.sociosai.com/login";

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks(): ReturnType<typeof createRemoteJWKSet> | null {
  const url = process.env.SUPABASE_JWKS_URL ??
    (process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`
      : null);
  if (!url) return null;
  if (!cachedJwks) cachedJwks = createRemoteJWKSet(new URL(url));
  return cachedJwks;
}

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

export async function middleware(req: NextRequest) {
  if (STATIC_RE.test(req.nextUrl.pathname)) return NextResponse.next();

  const cookieName = getCookieName();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!cookieName || !url || !anonKey) return NextResponse.next();

  // @supabase/ssr handles transparent access_token refresh when expired.
  // Cookies are mutated on `req.cookies` AND mirrored on the response so the
  // browser persists the new tokens. Without this, server actions hit the
  // middleware with a stale JWT, fail jwtVerify, and bounce to login mid-flow.
  let response = NextResponse.next();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        response = NextResponse.next();
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser() validates the JWT against GoTrue (not just decodes it) and
  // triggers a refresh if the access_token is expired. After this returns,
  // req.cookies and response.cookies hold the fresh tokens (if a refresh
  // happened). If the refresh_token is also dead, user is null.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return buildRedirect(req, ID_LOGIN_URL);
  }

  // After the potential refresh, re-read the cookie to extract the fresh
  // access_token for the claim checks below (super_admin, mfa_enrolled, aal).
  const cookieValue = readSessionCookie(req.cookies, cookieName);
  if (!cookieValue) {
    return buildRedirect(req, ID_LOGIN_URL);
  }
  const token = extractAccessToken(cookieValue);

  const jwks = getJwks();
  if (!jwks) return response;

  try {
    const { payload } = await jwtVerify(token, jwks);

    // Non-admins always get /forbidden, regardless of MFA status.
    if (payload["super_admin"] !== true) {
      const rewriteUrl = req.nextUrl.clone();
      rewriteUrl.pathname = "/forbidden";
      return NextResponse.rewrite(rewriteUrl, { headers: response.headers });
    }

    // Admin without MFA enrollment -> bounce to enroll on id.sociosai.com.
    if (payload["mfa_enrolled"] !== true) {
      return buildRedirect(req, "https://id.sociosai.com/mfa-enroll");
    }

    // Admin enrolled but session is aal1 -> bounce to challenge for AAL2.
    if (payload["aal"] !== "aal2") {
      return buildRedirect(req, "https://id.sociosai.com/mfa-challenge");
    }

    return response;
  } catch {
    return buildRedirect(req, ID_LOGIN_URL);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand|forbidden|api/webhooks|.*\\.svg$|.*\\.png$).*)",
  ],
};
