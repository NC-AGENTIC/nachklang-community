import { expect, test } from "@playwright/test";

import { onboardWithPasskey } from "./helpers/onboard-passkey";

// The old passphrase-reset / vault-rekey flow was removed with the SP-C
// re-architecture. The recovery code is now a one-tap fallback that simply
// unwraps the Root Key — there is no /unlock/reset step anymore.
test.describe("vault recovery", () => {
  test("recovery code unlocks the vault as a passkey fallback", async ({ page, context }) => {
    test.setTimeout(90_000);
    const { recoveryCode } = await onboardWithPasskey(page, context);

    // Reload drops the in-memory Root Key; the client gate routes /vault -> /unlock.
    await page.reload();
    await page.waitForURL(/\/de\/unlock\/?$/);

    // Use the recovery code instead of the passkey.
    await page.getByText(/Recovery-Code verwenden/).click();
    await page.getByLabel("Recovery-Code").fill(recoveryCode);
    await page.getByRole("button", { name: /Tresor mit Recovery-Code/ }).click();

    await page.waitForURL(/\/de\/vault\/?$/);
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible({ timeout: 20_000 });
  });
});
