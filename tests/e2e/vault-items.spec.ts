import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import { onboardWithPasskey } from "./helpers/onboard-passkey";

test.describe("vault items end-to-end", () => {
  test("create, persist, edit, change status, delete", async ({ page, context }) => {
    await onboardWithPasskey(page, context);

    // Reload immediately — Root Key is lost, so /vault redirects to /unlock.
    // This gives us a clean unlock flow where the items API is called correctly.
    await page.reload();
    await page.waitForURL(/\/de\/unlock\/?$/);
    await page.getByRole("button", { name: /Mit Passkey entsperren/ }).click();
    await page.waitForURL(/\/de\/vault\/?$/);

    // Empty state.
    await expect(page.getByTestId("vault-empty")).toBeVisible({ timeout: 20_000 });

    // Add an entry via the provider combobox.
    await page.locator('a[href="#entry-form"]').first().click();
    await page.locator("#entry-form").scrollIntoViewIfNeeded();
    const nameField = page.getByRole("combobox", { name: "Anbietername" });
    await nameField.click();
    await nameField.fill("BundID");
    // BundID is a catalog seed, so a matching option should appear; picking it
    // fills the login URL. Fall back to manual entry if the catalog drifts.
    const bundOption = page.getByRole("option", { name: /BundID/ });
    if (await bundOption.count()) {
      await bundOption.first().click();
    }
    if (!(await page.getByLabel("Login-URL").inputValue())) {
      await page.getByLabel("Login-URL").fill("https://id.bund.de");
    }
    await page.getByLabel("Genutzte E-Mail").fill("privat@example.org");
    await page.getByRole("button", { name: /Eintrag speichern/ }).click();
    await expect(page.getByText("BundID", { exact: true })).toBeVisible();

    // Server stores only ciphertext: assert plaintext is absent in the DB row.
    const psql = execSync(
      `docker compose exec -T postgres psql -U nachklang -d nachklang -t -A -c 'SELECT "ciphertextBase64" FROM "VaultCiphertext" LIMIT 1;'`,
      { encoding: "utf8" },
    );
    expect(psql).not.toContain("BundID");
    expect(psql).not.toContain("id.bund.de");
    expect(psql.trim().length).toBeGreaterThan(20);

    // Reload — Root Key in browser memory is gone after reload, so /vault redirects to /unlock.
    await page.reload();
    await page.waitForURL(/\/de\/unlock\/?$/);
    await page.getByRole("button", { name: /Mit Passkey entsperren/ }).click();
    await page.waitForURL(/\/de\/vault/);
    await expect(page.getByText("BundID", { exact: true })).toBeVisible();

    // Edit (revision bump).
    await page.getByRole("button", { name: /BundID bearbeiten/ }).click();
    await page.locator("#entry-form").scrollIntoViewIfNeeded();
    await page.getByLabel("Notizen").fill("Recovery dokumentiert.");
    await page.getByRole("button", { name: /Änderung speichern/ }).click();
    // After edit, the success toast appears.
    await expect(page.getByText(/aktualisiert/)).toBeVisible();

    // Change lifecycle status — persists immediately (no undo timer).
    await page
      .getByRole("combobox", { name: /BundID Status ändern/ })
      .selectOption({ label: "Anbieter informiert" });
    // The status badge reflects the new lifecycle state.
    await expect(page.getByText("Anbieter informiert").first()).toBeVisible();
    // Let the server round-trip settle before the delete that follows.
    await page.waitForTimeout(1_500);

    // Delete — SP5c delays the server DELETE by 5s (undo window).
    await page.getByRole("button", { name: /BundID löschen/ }).click();
    await expect(page.getByTestId("vault-empty")).toBeVisible({ timeout: 15_000 });
  });
});
