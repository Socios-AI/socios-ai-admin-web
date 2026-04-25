import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.replace(/^https?:\/\//, "")
    .split(".")[0];
  if (projectRef) {
    const baseName = `sb-${projectRef}-auth-token`;
    // Clear the base cookie + the first 5 potential chunks defensively.
    const names = [baseName, ...Array.from({ length: 5 }, (_, i) => `${baseName}.${i}`)];
    for (const name of names) {
      cookieStore.set({
        name,
        value: "",
        domain: ".sociosai.com",
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        secure: true,
      });
    }
  }
  const target = new URL("https://id.sociosai.com/login");
  target.searchParams.set("msg", "logged_out");
  target.searchParams.set("from", "https://admin.sociosai.com/");
  return NextResponse.redirect(target, { status: 303 });
}
