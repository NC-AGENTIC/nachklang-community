// src/features/vault/crypto/passkey-port.ts
import { authClient } from "@/lib/auth-client";
import { kekFromPrfOutput, prfEvalSalt } from "./passkey-prf";
import { wrapRootKey, type WebCryptoWrappedRootKey } from "./webcrypto-rootkey";

export type PrfRegistration = { credentialID: string; prfOutput: ArrayBuffer };
export type PrfAssertion = { credentialID: string; prfOutput: ArrayBuffer };

export type PasskeyPort = {
  // Registers a platform passkey with the PRF extension; returns credentialID + PRF output
  // (doing a follow-up assertion if create didn't return results). Optional name labels the device.
  registerWithPrf(name?: string): Promise<PrfRegistration>;
  // Authenticates with a passkey carrying the PRF extension; establishes a session and returns credentialID + PRF output.
  signInWithPrf(): Promise<PrfAssertion>;
  // PRF assertion only (session already exists), e.g. re-unlock after idle.
  assertPrf(): Promise<PrfAssertion>;
};

// Pure: build the per-credential wrapped root key envelope.
export async function buildPrfWrappedRootKey(
  rootKey: CryptoKey,
  reg: PrfRegistration,
  vaultId: string,
): Promise<WebCryptoWrappedRootKey> {
  const kek = await kekFromPrfOutput(reg.prfOutput.slice(0));
  return wrapRootKey(rootKey, kek, {
    type: "vault-root-key-prf",
    vaultId,
    credentialID: reg.credentialID,
    version: 2,
  });
}

// ---------------------------------------------------------------------------
// WebAuthn / Better-Auth seam.
//
// Better-Auth's `addPasskey`/`signIn.passkey` return a discriminated union; the
// PRF results live in the `webauthn` branch:
//   addPasskey  → { webauthn: { response: RegistrationResponseJSON;   clientExtensionResults }, data: Passkey, error: null }
//   signIn      → { webauthn: { response: AuthenticationResponseJSON; clientExtensionResults }, data, error }
// The WebAuthn credential id is `webauthn.response.id` (a Base64URLString) on
// both branches; this is what the server persists as `credentialID`. The PRF
// output is `webauthn.clientExtensionResults.prf.results.first`.
//
// The exact runtime shape is version-specific and can only be fully confirmed
// against a real authenticator at e2e time; the accessors below match the
// installed @better-auth/passkey types and cast defensively where the union
// does not statically expose `webauthn`.
// ---------------------------------------------------------------------------

type WebAuthnResultEnvelope = {
  webauthn?: {
    response?: { id?: string };
    clientExtensionResults?: AuthenticationExtensionsClientOutputs;
  };
};

function extractPrf(
  clientExtensionResults: AuthenticationExtensionsClientOutputs | undefined,
): ArrayBuffer | null {
  const prf = (clientExtensionResults as { prf?: { results?: { first?: ArrayBuffer } } } | undefined)?.prf;
  return prf?.results?.first ?? null;
}

function extractCredentialID(res: unknown): string | null {
  const env = res as WebAuthnResultEnvelope & { data?: { credentialID?: string } };
  return env.webauthn?.response?.id ?? env.data?.credentialID ?? null;
}

// E2E seam: when the server sets data-e2e-prf-stub="1" on <html> (driven by the
// runtime env NACHKLANG_E2E_PRF_STUB), we still run the real Better-Auth ceremony
// (so a credentialID + session exist), but derive deterministic PRF bytes from
// the credentialID. The crypto path is otherwise identical. Off by default, so
// the real biometric PRF path is exercised in normal use.
async function stubbedPrfOutput(credentialID: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode("e2e-prf:" + credentialID));
}

function isE2ePrfStub(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.e2ePrfStub === "1";
}

export async function registerWithPrf(name?: string): Promise<PrfRegistration> {
  const salt = await prfEvalSalt();
  // No authenticatorAttachment constraint: allow platform passkeys (Touch ID / Windows Hello),
  // roaming USB-NFC FIDO2 security keys, and phone passkeys via hybrid/QR. All must support the
  // WebAuthn PRF extension — non-PRF authenticators are rejected below (PRF_NOT_SUPPORTED).
  const res = await authClient.passkey.addPasskey({
    extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    returnWebAuthnResponse: true,
    ...(name ? { name } : {}),
  });
  const credentialID = extractCredentialID(res);
  if (!credentialID) throw new Error("PRF_NOT_SUPPORTED");
  if (isE2ePrfStub()) {
    return { credentialID, prfOutput: await stubbedPrfOutput(credentialID) };
  }
  const env = res as WebAuthnResultEnvelope;
  let prfOutput = extractPrf(env.webauthn?.clientExtensionResults);
  if (!prfOutput) prfOutput = (await assertPrf()).prfOutput; // follow-up assertion if not returned at create
  if (!prfOutput) throw new Error("PRF_NOT_SUPPORTED");
  return { credentialID, prfOutput };
}

export async function signInWithPrf(): Promise<PrfAssertion> {
  const salt = await prfEvalSalt();
  // Choosing a passkey that isn't registered for this account can make Better Auth's verify call
  // fail and even throw a raw JSON-parse error. Normalize ANY failure to PRF_SIGNIN_FAILED so the
  // UI can show a clear "wrong passkey" message instead of a cryptic error.
  let res: Awaited<ReturnType<typeof authClient.signIn.passkey>>;
  try {
    res = await authClient.signIn.passkey({
      extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
      returnWebAuthnResponse: true,
    });
  } catch {
    throw new Error("PRF_SIGNIN_FAILED");
  }
  if (res && typeof res === "object" && "error" in res && (res as { error?: unknown }).error) {
    throw new Error("PRF_SIGNIN_FAILED");
  }
  const credentialID = extractCredentialID(res);
  if (!credentialID) throw new Error("PRF_SIGNIN_FAILED");
  if (isE2ePrfStub()) {
    return { credentialID, prfOutput: await stubbedPrfOutput(credentialID) };
  }
  const prfOutput = extractPrf((res as WebAuthnResultEnvelope).webauthn?.clientExtensionResults);
  if (!prfOutput) throw new Error("PRF_SIGNIN_FAILED");
  return { credentialID, prfOutput };
}

export async function assertPrf(): Promise<PrfAssertion> {
  const salt = await prfEvalSalt();
  const res = await authClient.signIn.passkey({
    extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
    returnWebAuthnResponse: true,
  });
  const credentialID = extractCredentialID(res);
  if (!credentialID) throw new Error("PRF_UNLOCK_FAILED");
  if (isE2ePrfStub()) {
    return { credentialID, prfOutput: await stubbedPrfOutput(credentialID) };
  }
  const prfOutput = extractPrf((res as WebAuthnResultEnvelope).webauthn?.clientExtensionResults);
  if (!prfOutput) throw new Error("PRF_UNLOCK_FAILED");
  return { credentialID, prfOutput };
}
