import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRootKey,
  getRootKey,
  setRootKey,
  subscribe,
} from "@/features/vault/state/root-key-store";

async function makeKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new Uint8Array(32), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

beforeEach(() => {
  clearRootKey();
});

describe("root-key-store", () => {
  it("starts empty", () => {
    expect(getRootKey()).toBeNull();
  });

  it("set/get/clear cycle holds a non-extractable CryptoKey", async () => {
    const key = await makeKey();
    setRootKey({ vaultId: "v-1", rootKey: key, unlockedVia: "passkey" });
    const state = getRootKey();
    expect(state?.vaultId).toBe("v-1");
    expect(state?.rootKey.extractable).toBe(false);
    expect(state?.unlockedVia).toBe("passkey");
    clearRootKey();
    expect(getRootKey()).toBeNull();
  });

  it("accepts the recovery unlock source", async () => {
    setRootKey({ vaultId: "v-1", rootKey: await makeKey(), unlockedVia: "recovery" });
    expect(getRootKey()?.unlockedVia).toBe("recovery");
  });

  it("notifies subscribers on change", async () => {
    const fn = vi.fn();
    const unsub = subscribe(fn);
    setRootKey({ vaultId: "v-1", rootKey: await makeKey(), unlockedVia: "passkey" });
    clearRootKey();
    expect(fn).toHaveBeenCalledTimes(2);
    unsub();
  });

  it("does not notify after unsubscribe", async () => {
    const fn = vi.fn();
    const unsub = subscribe(fn);
    unsub();
    setRootKey({ vaultId: "v-1", rootKey: await makeKey(), unlockedVia: "passkey" });
    expect(fn).not.toHaveBeenCalled();
  });
});
