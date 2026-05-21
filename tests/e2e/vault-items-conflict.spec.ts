import { expect, test } from "@playwright/test";

import {
  addVirtualAuthenticator,
  cloneCredentials,
  onboardWithPasskey,
} from "./helpers/onboard-passkey";

test.describe("vault items conflict", () => {
  // CDP virtual authenticators are scoped to a single page's CDP target, so the
  // second editor (a second PAGE in the SAME context) gets its own authenticator
  // with the first page's resident credential cloned in. Both pages share the
  // session cookie but each holds its own in-memory Root Key, which is enough to
  // reproduce the optimistic-concurrency (stale revision) race. The server PRF
  // stub is keyed on the credential ID, so the clone unlocks the same vault.
  test("second editor sees 409 reconcile notice", async ({ page, context }) => {
    test.setTimeout(120_000);

    // Onboard + add a single item on the first page.
    const { authenticator: authA } = await onboardWithPasskey(page, context);

    // Force a clean reload -> /unlock -> passkey, matching the other vault specs.
    await page.reload();
    await page.waitForURL(/\/de\/unlock\/?$/);
    await page.getByRole("button", { name: /Mit Passkey entsperren/ }).click();
    await page.waitForURL(/\/de\/vault\/?$/);
    await expect(page.getByTestId("vault-empty")).toBeVisible({ timeout: 20_000 });

    await page.locator('a[href="#entry-form"]').first().click();
    const name = page.getByRole("combobox", { name: "Anbietername" });
    await name.click();
    await name.fill("BundID");
    const option = page.getByRole("option", { name: /BundID/ });
    if (await option.count()) {
      await option.first().click();
    }
    if (!(await page.getByLabel("Login-URL").inputValue())) {
      await page.getByLabel("Login-URL").fill("https://id.bund.de");
    }
    await page.getByRole("button", { name: /Eintrag speichern/ }).click();
    await expect(page.getByText(/hinzugefügt/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("BundID", { exact: true }).first()).toBeVisible();

    // Open a second page in the same context, give it its own virtual
    // authenticator, and clone page A's resident credential into it so it can
    // unlock the same vault.
    const pageA = page;
    const pageB = await context.newPage();
    const authB = await addVirtualAuthenticator(context, pageB);
    await cloneCredentials(authA, authB);

    await pageB.goto("/de/vault");
    await pageB.waitForURL(/\/de\/unlock\/?$/, { timeout: 20_000 });
    await pageB.getByRole("button", { name: /Mit Passkey entsperren/ }).click();
    await pageB.waitForURL(/\/de\/vault\/?$/, { timeout: 20_000 });
    await expect(pageB.getByText("BundID", { exact: true }).first()).toBeVisible({ timeout: 20_000 });

    // Page A edits + saves first.
    await pageA.getByRole("button", { name: /BundID bearbeiten/ }).click();
    await pageA.getByLabel("Notizen").fill("Notiz von A.");
    await pageA.getByRole("button", { name: /Änderung speichern/ }).click();
    await expect(pageA.getByText("Notiz von A.")).toBeVisible();

    // Page B (stale revision) edits + saves second — must see the reconcile notice.
    await pageB.getByRole("button", { name: /BundID bearbeiten/ }).click();
    await pageB.getByLabel("Notizen").fill("Notiz von B.");
    await pageB.getByRole("button", { name: /Änderung speichern/ }).click();
    await expect(pageB.getByTestId("vault-stale-notice")).toBeVisible({ timeout: 10_000 });

    // After reconcile, the server snapshot wins — open the edit form to verify
    // A's note ("Notiz von A.") is now in the snapshot that B holds.
    await pageB.getByRole("button", { name: /BundID bearbeiten/ }).click();
    await expect(pageB.getByLabel("Notizen")).toHaveValue("Notiz von A.");

    await pageB.close();
  });
});
