import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (entries: { name: string; value: string; options: CookieOptions }[]) =>
          entries.forEach((c) => cookieStore.set(c.name, c.value, c.options)),
      },
    },
  );
  await supabase.auth.signOut({ scope: "global" });
  return NextResponse.redirect("https://id.sociosai.com/login?msg=logged_out", { status: 303 });
}
