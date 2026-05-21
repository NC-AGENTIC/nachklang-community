import { execSync } from "node:child_process";
import type { BrowserContext, CDPSession, Page } from "@playwright/test";

const CAPTURE_PATH = "/tmp/mail-capture.tsv";

export type OnboardedUser = {
  email: string;
  recoveryCode: string;
  authenticator: VirtualAuthenticator;
};

export type VirtualAuthenticator = { client: CDPSession; authenticatorId: string };

/** Read the latest captured OTP code for an email from the web container's mail-capture file. */
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

/**
 * Register a CDP virtual authenticator that supports resident keys + user verification,
 * so WebAuthn create/get ceremonies auto-complete. PRF itself is stubbed server-side via
 * NACHKLANG_E2E_PRF_STUB (virtual authenticators can't perform real WebAuthn PRF).
 */
export async function addVirtualAuthenticator(
  context: BrowserContext,
  page: Page,
): Promise<VirtualAuthenticator> {
  const client = await context.newCDPSession(page);
  await client.send("WebAuthn.enable");
  const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      automaticPresenceSimulation: true,
      isUserVerified: true,
    },
  });
  return { client, authenticatorId };
}

/**
 * Copy every resident credential from one virtual authenticator to another so a
 * second page (in the same browser context) can complete a WebAuthn get
 * ceremony against the same passkey. The server-side PRF stub derives its output
 * deterministically from the credential ID, so cloning the credential is enough
 * for the cloned page to unlock the same vault.
 */
export async function cloneCredentials(
  from: VirtualAuthenticator,
  to: VirtualAuthenticator,
): Promise<void> {
  const { credentials } = await from.client.send("WebAuthn.getCredentials", {
    authenticatorId: from.authenticatorId,
  });
  for (const credential of credentials) {
    await to.client.send("WebAuthn.addCredential", {
      authenticatorId: to.authenticatorId,
      credential,
    });
  }
}

/** Full passwordless onboarding: email-OTP sign-up → register passkey → save recovery code → /vault. */
export async function onboardWithPasskey(
  page: Page,
  context: BrowserContext,
  email = `pk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`,
): Promise<OnboardedUser> {
  const authenticator = await addVirtualAuthenticator(context, page);

  // Email-OTP sign-up.
  await page.goto("/de/signup");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByRole("button", { name: /Code anfordern/ }).click();

  await page.getByLabel("Code").waitFor({ state: "visible", timeout: 15_000 });
  // Give the server a moment to flush the capture file.
  await page.waitForTimeout(800);
  const otp = readLatestOtp(email);
  await page.getByLabel("Code").fill(otp);
  await page.getByRole("button", { name: /Bestätigen/ }).click();

  // Onboarding: register the passkey.
  await page.waitForURL(/\/de\/onboarding\/?$/, { timeout: 20_000 });
  await page.getByRole("button", { name: /Passkey erstellen/ }).click();

  // Recovery code is shown.
  const grid = page.locator("[data-recovery-code]");
  await grid.waitFor({ state: "attached", timeout: 20_000 });
  const recoveryCode = (await grid.getAttribute("data-recovery-code")) ?? "";
  if (!recoveryCode) throw new Error("recovery code not rendered");
  await page.getByRole("button", { name: /Weiter/ }).click();

  // Confirm + create.
  await page.getByLabel("Recovery-Code").fill(recoveryCode);
  await page.getByLabel(/sicher abgelegt/i).check();
  await page.getByRole("button", { name: /Vault (öffnen|erstellen)/ }).click();

  await page.waitForURL(/\/de\/vault\/?$/, { timeout: 20_000 });
  return { email, recoveryCode, authenticator };
}
