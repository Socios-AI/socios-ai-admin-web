import { test, expect } from "@playwright/test";

// test.fixme: This test exercises the /users/new flow which requires a
// super-admin session cookie. Local Playwright cannot mint that cookie
// because the cookie name depends on the Supabase project ref and the
// JWT must be signed by the prod ES256 key. Marked fixme until either
// (a) we add a fixture-based session injection helper or (b) we run
// this against a deployed admin.sociosai.com via authenticated API.
test.fixme("invite user happy path generates action link", async ({ page }) => {
  await page.goto("/users/new");

  await page.fill("#email", `e3b-smoke-${Date.now()}@example.com`);
  await page.fill("#fullName", "Smoke Test");
  await page.selectOption("#role", "end-user");

  await page.click("button[type=submit]");

  await expect(page.getByText("Link gerado")).toBeVisible({ timeout: 10_000 });
  const linkBox = page.locator("textarea[readonly]");
  await expect(linkBox).toContainText("https://id.sociosai.com/set-password");
});

test.fixme("invite user with partner-member role requires org_id", async ({ page }) => {
  await page.goto("/users/new");

  await page.fill("#email", `e3b-smoke-org-${Date.now()}@example.com`);
  await page.fill("#fullName", "Partner Smoke");
  await page.selectOption("#role", "partner-member");

  // Org ID field should appear conditionally
  await expect(page.locator("#orgId")).toBeVisible();
});
