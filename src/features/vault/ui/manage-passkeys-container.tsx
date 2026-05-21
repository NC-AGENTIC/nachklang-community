"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import {
  assertPrf,
  buildPrfWrappedRootKey,
  registerWithPrf,
} from "@/features/vault/crypto/passkey-port";
import { addPasskeyKey, removePasskeyKey } from "@/features/vault/data/vault-keys-client";
import { unlockWithPrf, type PrfWrapEntry } from "@/features/vault/crypto/vault-unlock";

import { ManagePasskeys, type ManagedPasskey } from "./manage-passkeys";
import { detectPasskeyDeviceName } from "./passkey-device-name";

type Props = { vaultId: string };

async function loadExistingEntries(loadErrorMsg: string): Promise<PrfWrapEntry[]> {
  const res = await fetch("/api/vault", { method: "GET", credentials: "same-origin" });
  if (!res.ok) throw new Error(loadErrorMsg);
  const body = await res.json();
  return (body.prfWrappedRootKeys ?? []) as PrfWrapEntry[];
}

function mapPrfCode(
  code: string,
  tErrors: ReturnType<typeof useTranslations<"vault.errors">>,
): string {
  switch (code) {
    case "PRF_NOT_SUPPORTED": return tErrors("prfNotSupported");
    case "PRF_SIGNIN_FAILED": return tErrors("prfSigninFailed");
    case "PRF_UNLOCK_FAILED": return tErrors("prfUnlockFailed");
    case "PRF_KEY_NOT_FOUND": return tErrors("prfKeyNotFound");
    default: return code || tErrors("generic");
  }
}

export function ManagePasskeysContainer({ vaultId }: Props) {
  const t = useTranslations("vault.managePasskeys");
  const tErrors = useTranslations("vault.errors");
  const [passkeys, setPasskeys] = useState<ManagedPasskey[]>([]);

  const refresh = useCallback(async () => {
    const { data } = await authClient.passkey.listUserPasskeys();
    const list = (data ?? []) as Array<{ id: string; name?: string | null; credentialID?: string }>;
    setPasskeys(list.map((p) => ({ id: p.id, name: p.name, credentialID: p.credentialID })));
  }, []);

  useEffect(() => {
    void refresh().catch(() => {});
  }, [refresh]);

  async function handleAddThisDevice() {
    // Register the new platform credential, then transiently unwrap an EXTRACTABLE
    // copy of the root key (via a fresh assertion on an existing passkey) so we can
    // re-wrap it for the new credential. The extractable key is discarded after.
    try {
      const newReg = await registerWithPrf(detectPasskeyDeviceName(t("deviceFallback")));
      const existing = await loadExistingEntries(t("loadError"));
      const assertion = await assertPrf();
      const extractableRootKey = await unlockWithPrf(existing, assertion, true);
      const wrapped = await buildPrfWrappedRootKey(extractableRootKey, newReg, vaultId);
      await addPasskeyKey({ credentialID: newReg.credentialID, wrapped });
      await refresh();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      throw new Error(mapPrfCode(code, tErrors));
    }
  }

  async function handleRemove(credentialID: string) {
    await removePasskeyKey(credentialID);
    const target = passkeys.find((p) => (p.credentialID ?? p.id) === credentialID);
    if (target) {
      await authClient.passkey.deletePasskey({ id: target.id });
    }
    await refresh();
  }

  async function handleRename(id: string, name: string) {
    await authClient.passkey.updatePasskey({ id, name });
    await refresh();
  }

  return (
    <ManagePasskeys
      passkeys={passkeys}
      onAddThisDevice={handleAddThisDevice}
      onRemove={handleRemove}
      onRename={handleRename}
    />
  );
}
