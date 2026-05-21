import { expect, test } from "@playwright/test";

import { onboardWithPasskey } from "./helpers/onboard-passkey";

test.describe("passkey onboarding & unlock", () => {
  test("onboards passwordless, then re-unlocks with the passkey", async ({ page, context }) => {
    await onboardWithPasskey(page, context);

    // Vault workspace is reachable after onboarding.
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible({ timeout: 20_000 });

    // Reload drops the in-memory Root Key; the app routes to unlock.
    await page.reload();
    await page.waitForURL(/\/de\/unlock\/?$/, { timeout: 20_000 });

    // One-tap passkey unlock (virtual authenticator + stubbed PRF).
    await page.getByRole("button", { name: /Mit Passkey entsperren/ }).click();
    await page.waitForURL(/\/de\/vault\/?$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible();
  });
});
