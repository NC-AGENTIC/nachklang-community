import { expect, test } from "@playwright/test";

test("anonymous / renders the landing page with both CTAs", async ({ page }) => {
  await page.goto("/de");
  await expect(page.getByRole("link", { name: /Konto erstellen/i })).toHaveAttribute("href", "/de/signup");
  await expect(page.getByRole("link", { name: /^Anmelden$/i })).toHaveAttribute("href", "/de/signin");
  await expect(page.getByRole("link", { name: "Impressum" })).toBeVisible();
});

test("unauthenticated protected routes redirect to /de/signin", async ({ page }) => {
  for (const path of ["/de/vault", "/de/onboarding", "/de/unlock"]) {
    const response = await page.goto(path);
    expect(response?.url(), `expected ${path} to redirect to /de/signin`).toMatch(/\/de\/signin\/?$/);
  }
});

test("renders the passkey signin form", async ({ page }) => {
  await page.goto("/de/signin");
  await expect(page.getByRole("heading", { name: "Willkommen zurück" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mit Passkey anmelden/ })).toBeVisible();
});

test("renders the email-otp signup form", async ({ page }) => {
  await page.goto("/de/signup");
  await expect(page.getByRole("heading", { name: "Konto erstellen" })).toBeVisible();
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("E-Mail")).toBeVisible();
  await expect(page.getByRole("button", { name: /Code anfordern/ })).toBeVisible();
});

test("renders the verify-email page (no token)", async ({ page }) => {
  await page.goto("/de/verify-email");
  await expect(page.getByRole("heading", { name: "E-Mail bestätigen" })).toBeVisible();
});
