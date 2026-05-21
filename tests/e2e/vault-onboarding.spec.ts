import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";

import { addVirtualAuthenticator } from "./helpers/onboard-passkey";

const CAPTURE_PATH = "/tmp/mail-capture.tsv";

function readLatestOtp(forEmail: string): string {
  const raw = execSync(`docker compose exec -T web cat ${CAPTURE_PATH}`, { encoding: "utf8" });
  const lines = raw.trim().split("\n").reverse();
  for (const line of lines) {
    const [, to, subject, value] = line.split("\t");
    if (to === forEmail && /Code/i.test(subject ?? "") && /^[0-9]{4,8}$/.test(value ?? "")) {
      return value;
    }
  }
  throw new Error(`No OTP captured for ${forEmail}`);
}

// The onboarding happy path (passkey -> recovery -> /vault) is covered by
// passkey-onboarding.spec.ts. These cases cover the confirmation-step
// validation rules that the happy path does not exercise.
test.describe("vault onboarding (confirmation validation)", () => {
  test("cannot open the vault without matching code AND consent; persists both wraps", async ({
    page,
    context,
  }) => {
    test.setTimeout(90_000);
    const email = `onb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;

    await addVirtualAuthenticator(context, page);

    // Email-OTP sign-up.
    await page.goto("/de/signup");
    await page.getByLabel("Name").fill("E2E User");
    await page.getByLabel("E-Mail").fill(email);
    await page.getByRole("button", { name: /Code anfordern/ }).click();
    await page.getByLabel("Code").waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.getByLabel("Code").fill(readLatestOtp(email));
    await page.getByRole("button", { name: /Bestätigen/ }).click();

    // Step 1: create the passkey.
    await page.waitForURL(/\/de\/onboarding\/?$/, { timeout: 20_000 });
    await page.getByRole("button", { name: /Passkey erstellen/ }).click();

    // Step 2: capture the recovery code (validates the format, too).
    const grid = page.locator("[data-recovery-code]");
    await grid.waitFor({ state: "attached", timeout: 20_000 });
    const recoveryCode = (await grid.getAttribute("data-recovery-code")) ?? "";
    expect(recoveryCode).toMatch(/^[0-9A-HJ-KM-NP-TV-Z]{4}(-[0-9A-HJ-KM-NP-TV-Z]{4}){5}$/);
    await page.getByRole("button", { name: /Weiter/ }).click();

    // Step 3 validation: button stays disabled in every incomplete combination.
    const open = page.getByRole("button", { name: /Vault (öffnen|erstellen)/ });
    await expect(open).toBeDisabled();

    // Wrong code + consent -> still disabled, mismatch hint shown.
    await page.getByLabel("Recovery-Code").fill("ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ");
    await page.getByLabel(/sicher abgelegt/i).check();
    await expect(open).toBeDisabled();
    await expect(page.getByText(/stimmt nicht überein/)).toBeVisible();

    // Correct code but consent unchecked -> still disabled.
    await page.getByLabel("Recovery-Code").fill(recoveryCode.toLowerCase());
    await page.getByLabel(/sicher abgelegt/i).uncheck();
    await expect(open).toBeDisabled();

    // Correct code (lowercase exercises normalization) + consent -> enabled.
    await page.getByLabel(/sicher abgelegt/i).check();
    await expect(open).toBeEnabled();
    await open.click();

    await page.waitForURL(/\/de\/vault\/?$/);
    await expect(page.getByRole("heading", { name: /Mein Tresor/ })).toBeVisible();

    // Sanity-check the server persisted both the passkey (PRF) and recovery wraps.
    const res = await page.request.get("http://localhost/api/vault");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body.prfWrappedRootKeys)).toBe(true);
    expect(body.prfWrappedRootKeys.length).toBeGreaterThan(0);
    expect(body.recoveryWrappedRootKey).toBeTruthy();
  });
});
