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

// Allowlist de rotas pro papel "cadastrador" (tier `registrar`): só cadastro de
// parceiros e tenants + leitura de lista/árvore (sem financeiro/config). Tudo
// que não casar aqui vira /forbidden. As Server Actions fazem POST na própria
// rota da página, então allowlistar as páginas cobre as actions (ex.: o convite
// e a busca de indicante na /partners/invite, a criação de tenant na /orgs/new).
// Bloqueados de propósito: /partners/<id> e /users/<id> (dados financeiros/admin).
// /orgs/<id> (segmento único) é liberado; a página renderiza view curada sem
// financeiro pro registrar e as sub-rotas (mais de um segmento) ficam bloqueadas.
export function isRegistrarAllowed(pathname: string): boolean {
  if (pathname === "/partners" || pathname === "/orgs" || pathname === "/tree") return true;
  if (pathname === "/partners/invite" || pathname.startsWith("/partners/invite/")) return true;
  if (pathname === "/orgs/new" || pathname.startsWith("/orgs/new/")) return true;
  // Detalhe de org (cadastro do cliente). A página renderiza uma view curada
  // sem financeiro pro registrar; segmento único só (não casa sub-rotas).
  if (/^\/orgs\/[^/]+$/.test(pathname)) return true;
  return false;
}

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
    tier?: string;
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

  const isSuper = payload.super_admin === true;
  const isRegistrar = payload.tier === "registrar";

  // Quem não é super_admin nem cadastrador → /forbidden, independente de MFA.
  if (!isSuper && !isRegistrar) {
    const rewriteUrl = req.nextUrl.clone();
    rewriteUrl.pathname = "/forbidden";
    return NextResponse.rewrite(rewriteUrl);
  }

  // MFA é obrigatório pra qualquer ator do admin (super_admin OU cadastrador).
  if (payload.mfa_enrolled !== true) {
    return buildRedirect(req, "https://id.sociosai.com/mfa-enroll");
  }

  // Enrolled mas sessão aal1 → bounce pro challenge (AAL2).
  if (payload.aal !== "aal2") {
    return buildRedirect(req, "https://id.sociosai.com/mfa-challenge");
  }

  // Cadastrador (sem ser super_admin): default-deny com allowlist de rotas.
  if (isRegistrar && !isSuper) {
    if (req.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/partners", req.url), { status: 307 });
    }
    if (!isRegistrarAllowed(req.nextUrl.pathname)) {
      const rewriteUrl = req.nextUrl.clone();
      rewriteUrl.pathname = "/forbidden";
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // /login is not a real route on this app (login lives on id.sociosai.com).
  // If a fully authenticated user lands here (typed URL, stale bookmark,
  // back-button after MFA), avoid Next.js 404 by sending them to /.
  if (req.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url), { status: 307 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand|forbidden|api/webhooks|.*\\.svg$|.*\\.png$).*)",
  ],
};
