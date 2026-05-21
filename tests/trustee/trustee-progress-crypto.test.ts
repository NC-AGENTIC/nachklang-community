import { describe, expect, it } from "vitest";

import {
  decryptItemStatus,
  encryptItemStatus,
} from "@/features/trustee/crypto/trustee-progress-crypto";
import { importRootKey } from "@/features/vault/crypto/vault-crypto";

const KEY_BYTES = new Uint8Array(32).fill(7);
const binding = { vaultId: "v1", itemId: "i1" };

describe("trustee progress crypto", () => {
  it("round-trips a status under the root key", async () => {
    const key = await importRootKey(KEY_BYTES);
    const blob = await encryptItemStatus(key, { ...binding, status: "anbieter-informiert" });
    expect(blob.nonceBase64).toBeTruthy();
    expect(blob.ciphertextBase64).toBeTruthy();
    const status = await decryptItemStatus(key, { ...binding, ...blob });
    expect(status).toBe("anbieter-informiert");
  });

  it("rejects an invalid status value", async () => {
    const key = await importRootKey(KEY_BYTES);
    await expect(
      // @ts-expect-error deliberately invalid status
      encryptItemStatus(key, { ...binding, status: "not-a-status" }),
    ).rejects.toThrow();
  });

  it("fails to decrypt when the item binding (AAD) is tampered", async () => {
    const key = await importRootKey(KEY_BYTES);
    const blob = await encryptItemStatus(key, { ...binding, status: "aktiv" });
    await expect(
      decryptItemStatus(key, { ...binding, itemId: "DIFFERENT", ...blob }),
    ).rejects.toThrow();
  });
});
