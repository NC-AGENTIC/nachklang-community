// tests/e2e/howto.spec.ts
import { expect, test } from "@playwright/test";

import { onboardWithPasskey } from "./helpers/onboard-passkey";

test.describe("howto guide", () => {
  test("renders the German guide with key section headings", async ({ page }) => {
    await page.goto("/de/howto");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Konto erstellen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mit Vertrauenspersonen teilen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sicherheit & Risiken" })).toBeVisible();
  });

  test("renders the English guide", async ({ page }) => {
    await page.goto("/en/howto");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Security & risks" })).toBeVisible();
  });

  test("landing exposes the HowTo link and the 4-step strip", async ({ page }) => {
    await page.goto("/de");
    await expect(page.getByRole("link", { name: "HowTo" })).toHaveAttribute("href", "/de/howto");
    await expect(page.getByRole("link", { name: /Tresor/ })).toHaveAttribute("href", "/de/howto#eintraege");
    await page.getByRole("link", { name: /So funktioniert's/ }).click();
    await page.waitForURL(/\/de\/howto/);
  });

  test("the in-app help link points at the guide in a new tab", async ({ page, context }) => {
    await onboardWithPasskey(page, context);
    const help = page.getByRole("link", { name: "Hilfe" }).first();
    await expect(help).toHaveAttribute("href", "/de/howto");
    await expect(help).toHaveAttribute("target", "_blank");
  });
});
