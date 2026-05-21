import { expect, test } from "@playwright/test";

import { onboardWithPasskey } from "./helpers/onboard-passkey";

test.describe("landing", () => {
  test("anonymous / renders the hero with both CTAs and trust strip", async ({ page }) => {
    await page.goto("/de");
    await expect(page.getByRole("link", { name: "NachKlang" })).toBeVisible();
    const signupCta = page.getByRole("link", { name: /Konto erstellen/i });
    const signinCta = page.getByRole("link", { name: /^Anmelden$/i });
    await expect(signupCta).toHaveAttribute("href", "/de/signup");
    await expect(signinCta).toHaveAttribute("href", "/de/signin");
    await expect(page.getByRole("link", { name: "Impressum" })).toHaveAttribute("href", "/de/impressum");
    await expect(page.getByRole("link", { name: "Copyright" })).toHaveAttribute("href", "/de/copyright");
  });

  test("Konto erstellen navigates to /de/signup", async ({ page }) => {
    await page.goto("/de");
    await page.getByRole("link", { name: /Konto erstellen/i }).click();
    await page.waitForURL(/\/de\/signup\/?$/);
    await expect(page.getByRole("heading", { name: "Konto erstellen" })).toBeVisible();
  });

  // An onboarded user (vault row exists) is never shown the anonymous landing hero.
  // Navigating to / server-redirects to /vault; after a reload the in-memory Root Key
  // is gone, so the client gate bounces /vault -> /unlock.
  test("a fully authenticated user is redirected from / into the app", async ({ page, context }) => {
    await onboardWithPasskey(page, context);
    await page.goto("/de");
    // page.reload() forces a server-side re-fetch and drops the in-memory Root Key,
    // so the authed user lands on the unlock screen rather than the landing page.
    await page.reload();
    await page.waitForURL(/\/de\/unlock\/?$/);
    await expect(page.getByRole("button", { name: /Mit Passkey entsperren/ })).toBeVisible();
  });
});
