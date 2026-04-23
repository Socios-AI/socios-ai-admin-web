import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54421";

// test.fixme: Cookie injection fails locally because the local Supabase URL
// (127.0.0.1:54421) produces a non-standard project ref that doesn't match the
// cookie name the app reads. The JWT verifies OK in CI against the real project.
// Fix: either run against a named local project or stub the cookie in middleware tests.
test.fixme("non-super-admin sees 403 page", async ({ page }) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  test.skip(!serviceKey, "SUPABASE_SERVICE_ROLE_KEY not set");

  const admin = createClient(SUPABASE_URL, serviceKey!, { auth: { persistSession: false } });
  const email = `e2e-non-admin-${Date.now()}@example.com`;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password: "ProbePass1!",
    email_confirm: true,
  });

  try {
    // Sign in as this user via REST and inject the cookie into the browser context
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(SUPABASE_URL, anonKey, { auth: { persistSession: false } });
    const { data: { session } } = await userClient.auth.signInWithPassword({ email, password: "ProbePass1!" });
    const token = session!.access_token;

    // Inject the cookie. Cookie name = sb-<project_ref>-auth-token. Locally the ref differs; read from URL.
    const projectRef = SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0];
    await page.context().addCookies([{
      name: `sb-${projectRef}-auth-token`,
      value: JSON.stringify([token, session!.refresh_token]),
      url: "http://localhost:3001",
    }]);

    await page.goto("/users");
    await expect(page.getByText(/Acesso negado/i)).toBeVisible({ timeout: 5000 });
  } finally {
    await admin.auth.admin.deleteUser(created.user!.id);
  }
});
