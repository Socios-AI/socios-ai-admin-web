import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const COOKIE_DOMAIN = ".sociosai.com";
const FROM = "https://admin.sociosai.com/";

export async function POST() {
  const cookieStore = await cookies();
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.replace(/^https?:\/\//, "")
    .split(".")[0];

  const target = new URL("https://id.sociosai.com/login");
  target.searchParams.set("msg", "logged_out");
  target.searchParams.set("from", FROM);

  // CRÍTICO: anexar as deleções NO response que será retornado. No App Router,
  // mutar o store de cookies() e retornar um NextResponse próprio faz o
  // Set-Cookie se perder (cookie nunca era apagado · bug do logout cross-subdomain).
  const res = NextResponse.redirect(target, { status: 303 });

  if (projectRef) {
    const baseName = `sb-${projectRef}-auth-token`;
    // Limpa o cookie base + QUALQUER número de chunks (o leitor é unbounded;
    // limitar a 5 deixava chunks órfãos). Junta os que o browser mandou + um
    // range fixo defensivo. Domínio .sociosai.com = como o login setou.
    const present = cookieStore
      .getAll()
      .map((c) => c.name)
      .filter((n) => n === baseName || n.startsWith(`${baseName}.`));
    const fallback = [baseName, ...Array.from({ length: 12 }, (_, i) => `${baseName}.${i}`)];
    for (const name of Array.from(new Set([...present, ...fallback]))) {
      res.cookies.set({
        name,
        value: "",
        domain: COOKIE_DOMAIN,
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        secure: true,
      });
    }
  }

  return res;
}
