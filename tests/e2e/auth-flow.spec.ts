import { expect, test } from "@playwright/test";

import { onboardWithPasskey } from "./helpers/onboard-passkey";

test.describe("auth flow", () => {
  test("returning user: sign out then sign in with the passkey", async ({ page, context }) => {
    test.setTimeout(90_000);
    await onboardWithPasskey(page, context);
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible({ timeout: 20_000 });

    // Sign out via the badge in the layout. handleSignOut hard-navigates to /signin.
    await page.getByRole("button", { name: /Abmelden/ }).first().click();
    await page.waitForURL(/\/de\/signin\/?$/);
    await expect(page.getByRole("heading", { name: /Willkommen zurück/ })).toBeVisible();

    // The resident passkey lives in the same virtual authenticator (same context),
    // so a one-tap passkey sign-in re-establishes the session and the Root Key.
    await page.getByRole("button", { name: /Mit Passkey anmelden/ }).click();
    await page.waitForURL(/\/de\/vault\/?$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible({ timeout: 20_000 });
  });
});
