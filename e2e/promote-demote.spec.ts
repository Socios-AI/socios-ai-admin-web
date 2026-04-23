import { test, expect } from "@playwright/test";

// test.fixme: requires real super-admin session + a target user fixture.
// Local Playwright can't construct either (see invite-user.spec.ts comment).
test.fixme("promote opens dialog with required reason", async ({ page }) => {
  // Replace with a real fixture user when fixture infra exists.
  await page.goto("/users/00000000-0000-0000-0000-000000000000");

  await page.getByRole("button", { name: /promover a super-admin/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const reason = dialog.getByLabel(/motivo/i);
  await reason.fill("ops handover");

  await dialog.getByRole("button", { name: /promover/i }).click();
  await expect(page.getByText(/promovido com sucesso/i)).toBeVisible({ timeout: 10_000 });
});

test.fixme("demote dialog shows destructive styling", async ({ page }) => {
  await page.goto("/users/00000000-0000-0000-0000-000000000000");

  await page.getByRole("button", { name: /rebaixar/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel(/motivo/i)).toBeVisible();
});
