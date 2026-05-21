import { execSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

import { addVirtualAuthenticator, onboardWithPasskey } from "./helpers/onboard-passkey";

const CAPTURE_PATH = "/tmp/mail-capture.tsv";

function readLatestInviteLink(forEmail: string): string {
  const raw = execSync(`docker compose exec -T web cat ${CAPTURE_PATH}`, { encoding: "utf8" });
  const lines = raw.trim().split("\n").reverse();
  for (const line of lines) {
    const [, to, , value] = line.split("\t");
    if (to === forEmail && /\/shares\/accept\//.test(value ?? "")) return value;
  }
  throw new Error(`No invite link captured for ${forEmail}`);
}

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

const FP = /^\d{4}-\d{4}-\d{4}$/;

async function addBundIdEntry(page: Page) {
  await page.locator('a[href="#entry-form"]').first().click();
  await page.locator("#entry-form").scrollIntoViewIfNeeded();
  const nameField = page.getByRole("combobox", { name: "Anbietername" });
  await nameField.click();
  await nameField.fill("BundID");
  const option = page.getByRole("option", { name: /BundID/ });
  if (await option.count()) await option.first().click();
  if (!(await page.getByLabel("Login-URL").inputValue())) {
    await page.getByLabel("Login-URL").fill("https://id.bund.de");
  }
  await page.getByRole("button", { name: /Eintrag speichern/ }).click();
  await expect(page.getByText("BundID", { exact: true })).toBeVisible();
}

// SP3 full lifecycle: owner stores an entry, invites a trustee, the trustee accepts (SAS match),
// the owner seals (grants), the trustee reads the entry, the owner sees the access in the audit
// log, then revokes — after which the trustee can no longer read.
test("trustee sharing full lifecycle: invite → seal → read → audit → revoke", async ({ browser }) => {
  test.setTimeout(240_000);

  const trusteeEmail = `trustee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;

  // --- Owner onboards, stores an entry, and invites a trustee. ---
  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await onboardWithPasskey(ownerPage, ownerCtx);
  await addBundIdEntry(ownerPage);

  const ownerRail = ownerPage.locator(".desktop-rail");
  await ownerRail.getByRole("link", { name: "Einstellungen" }).click();
  await ownerPage.waitForURL(/\/de\/vault\/settings\/?$/);
  await ownerPage.getByLabel(/E-Mail der Vertrauensperson/).fill(trusteeEmail);
  await ownerPage.getByLabel(/Bezeichnung/).fill("Meine Schwester");
  await ownerPage.getByRole("button", { name: /^Einladen$/ }).click();
  await ownerPage.locator(".trustees-link-url").waitFor({ state: "visible", timeout: 20_000 });
  await ownerPage.waitForTimeout(800);
  const acceptPath = new URL(readLatestInviteLink(trusteeEmail)).pathname;

  // --- Trustee onboards and accepts. ---
  const trusteeCtx = await browser.newContext();
  const trusteePage = await trusteeCtx.newPage();
  await onboardWithPasskey(trusteePage, trusteeCtx, trusteeEmail);
  await trusteePage.goto(acceptPath);
  await trusteePage.getByRole("button", { name: /Einladung annehmen/ }).click();
  const trusteeFp = trusteePage.locator(".trustee-accept-fingerprint code");
  await trusteeFp.waitFor({ state: "visible", timeout: 20_000 });
  const trusteeFingerprint = (await trusteeFp.textContent())?.trim() ?? "";
  expect(trusteeFingerprint).toMatch(FP);

  // --- Owner verifies the SAS match and seals (grants access). ---
  async function ownerReopenSettings() {
    await ownerPage.getByRole("link", { name: /Zurück zum Tresor/ }).click();
    await ownerPage.waitForURL(/\/de\/vault\/?$/);
    await ownerRail.getByRole("link", { name: "Einstellungen" }).click();
    await ownerPage.waitForURL(/\/de\/vault\/settings\/?$/);
  }
  await ownerReopenSettings();
  const ownerFp = ownerPage.locator(".trustees-item .trustees-fingerprint code").first();
  await ownerFp.waitFor({ state: "visible", timeout: 20_000 });
  expect((await ownerFp.textContent())?.trim()).toBe(trusteeFingerprint);

  await ownerPage.getByRole("button", { name: /Bestätigen & freigeben/ }).click();
  await expect(ownerPage.getByText("Aktiv")).toBeVisible({ timeout: 20_000 });

  // --- Trustee reads the shared vault (decrypts the owner's entry). ---
  await trusteePage.goto("/de/shared");
  await trusteePage.getByRole("link", { name: /Öffnen/ }).first().click();
  await trusteePage.waitForURL(/\/de\/shared\/.+/);
  const sharedVaultUrl = trusteePage.url();
  await trusteePage.getByRole("button", { name: /Mit Passkey entsperren/ }).click();
  await expect(trusteePage.getByText("BundID")).toBeVisible({ timeout: 20_000 });

  // --- Owner sees the access in the audit log. ---
  await ownerReopenSettings();
  await expect(ownerPage.getByText(/1× abgerufen/)).toBeVisible({ timeout: 20_000 });
  await ownerPage.getByRole("button", { name: /Zugriffsverlauf anzeigen/ }).click();
  await expect(ownerPage.locator(".trustees-access-log li").first()).toBeVisible({ timeout: 20_000 });

  // --- Owner revokes; the trustee can no longer read. ---
  await ownerPage.getByRole("button", { name: /Zugriff widerrufen/ }).click();
  await expect(ownerPage.getByText("Widerrufen")).toBeVisible({ timeout: 20_000 });

  await trusteePage.goto(sharedVaultUrl);
  await trusteePage.getByRole("button", { name: /Mit Passkey entsperren/ }).click();
  await expect(trusteePage.getByText(/keinen aktiven Zugriff/)).toBeVisible({ timeout: 20_000 });

  await ownerCtx.close();
  await trusteeCtx.close();
});

// Trustee-only account: a brand-new invitee signs up FROM the invite link and onboards a
// passkey + sharing key WITHOUT a personal vault, the invite auto-links, and after the owner
// grants they read the owner's entry under "Shared with me".
test("trustee-only invitee: signup via invite → no personal vault → linked read", async ({ browser }) => {
  test.setTimeout(240_000);
  const trusteeEmail = `tonly-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;

  // Owner onboards, stores an entry, invites.
  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await onboardWithPasskey(ownerPage, ownerCtx);
  await addBundIdEntry(ownerPage);
  const ownerRail = ownerPage.locator(".desktop-rail");
  await ownerRail.getByRole("link", { name: "Einstellungen" }).click();
  await ownerPage.waitForURL(/\/de\/vault\/settings\/?$/);
  await ownerPage.getByLabel(/E-Mail der Vertrauensperson/).fill(trusteeEmail);
  await ownerPage.getByLabel(/Bezeichnung/).fill("Tante");
  await ownerPage.getByRole("button", { name: /^Einladen$/ }).click();
  await ownerPage.locator(".trustees-link-url").waitFor({ state: "visible", timeout: 20_000 });
  await ownerPage.waitForTimeout(800);
  const acceptPath = new URL(readLatestInviteLink(trusteeEmail)).pathname;

  // Brand-new invitee: open invite (anonymous) → create account → return to invite → register
  // passkey & accept, all WITHOUT creating a personal vault.
  const trCtx = await browser.newContext();
  const trPage = await trCtx.newPage();
  await addVirtualAuthenticator(trCtx, trPage);
  await trPage.goto(acceptPath);
  await trPage.getByRole("link", { name: /Konto erstellen/ }).click();
  await trPage.waitForURL(/\/de\/signup/);
  await trPage.getByLabel("Name").fill("Tante E2E");
  await trPage.getByLabel("E-Mail").fill(trusteeEmail);
  await trPage.getByRole("button", { name: /Code anfordern/ }).click();
  await trPage.getByLabel("Code").waitFor({ state: "visible", timeout: 15_000 });
  await trPage.waitForTimeout(800);
  await trPage.getByLabel("Code").fill(readLatestOtp(trusteeEmail));
  await trPage.getByRole("button", { name: /Bestätigen/ }).click();

  // Returned to the accept page in "register" phase.
  await trPage.waitForURL(/\/de\/shares\/accept\//, { timeout: 20_000 });
  await trPage.getByRole("button", { name: /Passkey erstellen & annehmen/ }).click();
  const trFp = trPage.locator(".trustee-accept-fingerprint code");
  await trFp.waitFor({ state: "visible", timeout: 20_000 });
  const trusteeFingerprint = (await trFp.textContent())?.trim() ?? "";
  expect(trusteeFingerprint).toMatch(FP);

  // No personal vault was created for the trustee-only account.
  const vaultRes = await trPage.request.get("http://localhost/api/vault");
  expect(vaultRes.status()).toBe(404);

  // Owner verifies the matching code and grants (seals).
  await ownerPage.getByRole("link", { name: /Zurück zum Tresor/ }).click();
  await ownerPage.waitForURL(/\/de\/vault\/?$/);
  await ownerRail.getByRole("link", { name: "Einstellungen" }).click();
  await ownerPage.waitForURL(/\/de\/vault\/settings\/?$/);
  const ownerFp = ownerPage.locator(".trustees-item .trustees-fingerprint code").first();
  await ownerFp.waitFor({ state: "visible", timeout: 20_000 });
  expect((await ownerFp.textContent())?.trim()).toBe(trusteeFingerprint);
  await ownerPage.getByRole("button", { name: /Bestätigen & freigeben/ }).click();
  await expect(ownerPage.getByText("Aktiv")).toBeVisible({ timeout: 20_000 });

  // Trustee-only account reads the owner's entry under "Shared with me".
  await trPage.goto("/de/shared");
  await trPage.getByRole("link", { name: /Öffnen/ }).first().click();
  await trPage.waitForURL(/\/de\/shared\/.+/);
  await trPage.getByRole("button", { name: /Mit Passkey entsperren/ }).click();
  await expect(trPage.getByText("BundID")).toBeVisible({ timeout: 20_000 });

  await ownerCtx.close();
  await trCtx.close();
});
