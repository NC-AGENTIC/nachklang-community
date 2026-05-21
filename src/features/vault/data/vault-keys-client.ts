import type { AddPasskeyKeyPayload, CreateVaultPayload } from "@/features/vault/domain/vault-setup-schemas";

export async function createVault(payload: CreateVaultPayload): Promise<void> {
  const response = await fetch("/api/vault", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (response.status === 409) {
    // Vault already exists for this user — treat as a no-op success.
    return;
  }
  if (!response.ok) {
    throw new Error(`create_vault_failed_${response.status}`);
  }
}

export async function addPasskeyKey(payload: AddPasskeyKeyPayload): Promise<void> {
  const response = await fetch("/api/vault/passkey-keys", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`add_passkey_key_failed_${response.status}`);
  }
}

export async function removePasskeyKey(credentialID: string): Promise<void> {
  const response = await fetch(
    `/api/vault/passkey-keys?credentialID=${encodeURIComponent(credentialID)}`,
    { method: "DELETE", credentials: "same-origin" },
  );
  if (!response.ok) {
    throw new Error(`remove_passkey_key_failed_${response.status}`);
  }
}
