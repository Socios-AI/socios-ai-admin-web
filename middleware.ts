import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

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

function buildRedirectToId(req: NextRequest): NextResponse {
  const target = new URL(ID_LOGIN_URL);
  // Reconstruct the public URL from forwarded headers (Nginx in front of the container).
  // req.nextUrl.host is the internal container hostname, not the public domain.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "admin.sociosai.com";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const publicUrl = `${proto}://${host}${req.nextUrl.pathname}${req.nextUrl.search}`;
  target.searchParams.set("from", publicUrl);
  return NextResponse.redirect(target, { status: 307 });
}

const STATIC_RE = /^\/_next\/static|^\/_next\/image|^\/favicon\.ico|^\/brand|^\/forbidden|\.svg$|\.png$/;

export async function middleware(req: NextRequest) {
  if (STATIC_RE.test(req.nextUrl.pathname)) return NextResponse.next();

  const cookieName = getCookieName();
  if (!cookieName) return NextResponse.next();

  const cookieValue = req.cookies.get(cookieName)?.value;
  if (!cookieValue) {
    return buildRedirectToId(req);
  }

  // Cookie value from @supabase/ssr is JSON-stringified array; access_token is at index 0.
  // For test simplicity, also accept a plain JWT string.
  let token = cookieValue;
  if (cookieValue.startsWith("[") || cookieValue.startsWith("base64-")) {
    try {
      const raw = cookieValue.startsWith("base64-")
        ? Buffer.from(cookieValue.slice("base64-".length), "base64").toString("utf-8")
        : cookieValue;
      const parsed = JSON.parse(raw) as [string, ...unknown[]];
      token = parsed[0] ?? cookieValue;
    } catch {
      // fall back to raw value
    }
  }

  const jwks = getJwks();
  if (!jwks) return NextResponse.next();

  try {
    const { payload } = await jwtVerify(token, jwks);
    if (payload["super_admin"] === true) {
      return NextResponse.next();
    }
    // Authenticated but not super-admin -> 403 page
    const url = req.nextUrl.clone();
    url.pathname = "/forbidden";
    return NextResponse.rewrite(url);
  } catch {
    return buildRedirectToId(req);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand|forbidden|.*\\.svg$|.*\\.png$).*)",
  ],
};
