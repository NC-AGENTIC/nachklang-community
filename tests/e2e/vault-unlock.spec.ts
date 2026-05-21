import { expect, test } from "@playwright/test";

import { onboardWithPasskey } from "./helpers/onboard-passkey";

test.describe("vault unlock", () => {
  test("returning user unlocks with the passkey after reload", async ({ page, context }) => {
    await onboardWithPasskey(page, context);

    // Reload drops the in-memory Root Key; the client gate routes /vault -> /unlock.
    await page.reload();
    await page.waitForURL(/\/de\/unlock\/?$/);

    // One-tap passkey unlock (virtual authenticator + stubbed PRF).
    await page.getByRole("button", { name: /Mit Passkey entsperren/ }).click();
    await page.waitForURL(/\/de\/vault\/?$/);
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible({ timeout: 20_000 });
  });

  test("recovery-code fallback unlocks when expanded; wrong code stays on /unlock", async ({
    page,
    context,
  }) => {
    const { recoveryCode } = await onboardWithPasskey(page, context);

    await page.reload();
    await page.waitForURL(/\/de\/unlock\/?$/);

    // Expand the recovery accordion.
    await page.getByText(/Recovery-Code verwenden/).click();

    // Wrong code shows the inline error and stays on /unlock.
    await page.getByLabel("Recovery-Code").fill("ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ");
    await page.getByRole("button", { name: /Tresor mit Recovery-Code/ }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: /ungültig|fehlgeschlagen|Recovery/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/de\/unlock\/?$/);

    // Correct recovery code unlocks the vault.
    await page.getByLabel("Recovery-Code").fill(recoveryCode);
    await page.getByRole("button", { name: /Tresor mit Recovery-Code/ }).click();
    await page.waitForURL(/\/de\/vault\/?$/);
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible({ timeout: 20_000 });
  });
});
