import { expect, test } from "@playwright/test";

import { onboardWithPasskey } from "./helpers/onboard-passkey";

test.describe("vault session persistence", () => {
  test("nav between /vault and /vault/settings stays unlocked", async ({ page, context }) => {
    test.setTimeout(90_000);

    // Onboarding → ends on /vault with the Root Key in memory.
    await onboardWithPasskey(page, context);
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible({ timeout: 20_000 });

    // Soft-navigate via the desktop rail nav — must NOT bounce to /unlock.
    const rail = page.locator(".desktop-rail");
    await rail.getByRole("link", { name: "Einstellungen" }).click();
    await page.waitForURL(/\/de\/vault\/settings\/?$/);
    await expect(page).not.toHaveURL(/\/de\/unlock/);

    // Soft-navigate back to the vault — still unlocked.
    await rail.getByRole("link", { name: "Vault" }).click();
    await page.waitForURL(/\/de\/vault\/?$/);
    await expect(page).not.toHaveURL(/\/de\/unlock/);
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible({ timeout: 20_000 });
  });
});
