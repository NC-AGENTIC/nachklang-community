import sodium from "libsodium-wrappers-sumo";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createItem,
  deleteItem,
  listItems,
  migrateLegacyEntries,
  updateItem,
} from "@/features/vault/data/vault-items-client";
import { VaultStaleRevisionError } from "@/features/vault/data/vault-stale-revision-error";
import { encryptVaultEntry, encryptVaultEntryV2, importRootKey } from "@/features/vault/crypto/vault-crypto";
import type { VaultEntry } from "@/features/vault/domain/vault-entry";

const VAULT_ID = "33333333-3333-3333-3333-333333333333";
const OWNER_ID = "user-client-test";

const entry: VaultEntry = {
  providerId: "bund-id",
  displayName: "BundID",
  loginUrl: "https://id.bund.de",
  emailUsed: "",
  username: "",
  passwordLocationHint: "",
  notes: "",
  tags: ["behoerde"],
  lifecycleStatus: "aktiv",
};

async function rootKey(): Promise<CryptoKey> {
  return importRootKey(new Uint8Array(32).fill(7));
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

beforeAll(async () => {
  await sodium.ready;
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  const nativeCrypto = globalThis.crypto;
  vi.stubGlobal("crypto", {
    ...nativeCrypto,
    getRandomValues: nativeCrypto.getRandomValues.bind(nativeCrypto),
    subtle: nativeCrypto.subtle,
    randomUUID: () => "44444444-4444-4444-4444-444444444444",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("vault-items-client.listItems", () => {
  it("decrypts a server item and projects to DecryptedVaultItem", async () => {
    const key = await rootKey();
    const enc = await encryptVaultEntryV2(key, {
      vaultId: VAULT_ID,
      itemId: "item-1",
      ownerId: OWNER_ID,
      revision: 1,
      plaintext: entry,
    });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, {
        vaultId: VAULT_ID,
        items: [{
          itemId: "item-1",
          ownerId: OWNER_ID,
          revision: 1,
          algorithm: enc.algorithm,
          nonceBase64: enc.nonceBase64,
          ciphertextBase64: enc.ciphertextBase64,
          associatedData: enc.associatedData,
          createdAt: "2026-05-19T10:00:00.000Z",
          updatedAt: "2026-05-19T10:00:00.000Z",
        }],
      }),
    );

    const items = await listItems(key, { vaultId: VAULT_ID, ownerId: OWNER_ID });
    expect(items).toHaveLength(1);
    expect(items[0].itemId).toBe("item-1");
    expect(items[0].revision).toBe(1);
    expect(items[0].entry.displayName).toBe("BundID");
  });
});

describe("vault-items-client.createItem", () => {
  it("posts an encrypted body with revision 1 and returns the decrypted item", async () => {
    const key = await rootKey();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(201, { itemId: "44444444-4444-4444-4444-444444444444", revision: 1, createdAt: "2026-05-19T10:01:00.000Z", updatedAt: "2026-05-19T10:01:00.000Z" }),
    );

    const created = await createItem(key, entry, { vaultId: VAULT_ID, ownerId: OWNER_ID });
    expect(created.itemId).toBe("44444444-4444-4444-4444-444444444444");
    expect(created.revision).toBe(1);
    expect(created.entry.displayName).toBe("BundID");

    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/vault/items");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.revision).toBe(1);
    expect(body.associatedData.vaultId).toBe(VAULT_ID);
    expect(body.associatedData.ownerId).toBe(OWNER_ID);
    expect(body.associatedData.itemId).toBe(body.itemId);
    // Ensure plaintext does not leak in the request body
    expect(init.body as string).not.toContain("BundID");
  });

  it("throws on 422", async () => {
    const key = await rootKey();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(422, { error: "invalid_body" }));
    await expect(createItem(key, entry, { vaultId: VAULT_ID, ownerId: OWNER_ID })).rejects.toThrow(/invalid_body/);
  });
});

describe("vault-items-client.updateItem (409 conflict)", () => {
  it("on 409 stale, refetches the list and throws VaultStaleRevisionError", async () => {
    const key = await rootKey();
    const enc = await encryptVaultEntryV2(key, {
      vaultId: VAULT_ID,
      itemId: "item-1",
      ownerId: OWNER_ID,
      revision: 3, // server has moved on
      plaintext: entry,
    });
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: "vault_item_stale" }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {
      vaultId: VAULT_ID,
      items: [{
        itemId: "item-1",
        ownerId: OWNER_ID,
        revision: 3,
        algorithm: enc.algorithm,
        nonceBase64: enc.nonceBase64,
        ciphertextBase64: enc.ciphertextBase64,
        associatedData: enc.associatedData,
        createdAt: "2026-05-19T10:00:00.000Z",
        updatedAt: "2026-05-19T10:05:00.000Z",
      }],
    }));

    const existing = {
      itemId: "item-1",
      ownerId: OWNER_ID,
      vaultId: VAULT_ID,
      revision: 1,
      entry,
      createdAt: "2026-05-19T10:00:00.000Z",
      updatedAt: "2026-05-19T10:00:00.000Z",
    };

    await expect(updateItem(key, existing, entry)).rejects.toBeInstanceOf(VaultStaleRevisionError);
  });
});

describe("vault-items-client.migrateLegacyEntries (SP6c v1→v2)", () => {
  it("re-encrypts v1 entries as v2 and skips v2 entries", async () => {
    const rawBytes = new Uint8Array(32).fill(7);
    const cryptoKey = await importRootKey(rawBytes);

    // One legacy v1 (XChaCha20) entry...
    const v1 = await encryptVaultEntry(rawBytes, {
      vaultId: VAULT_ID,
      itemId: "item-old",
      ownerId: OWNER_ID,
      revision: 1,
      plaintext: entry,
    });
    // ...and one already-migrated v2 (AES-GCM) entry.
    const v2 = await encryptVaultEntryV2(cryptoKey, {
      vaultId: VAULT_ID,
      itemId: "item-new",
      ownerId: OWNER_ID,
      revision: 1,
      plaintext: entry,
    });

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        vaultId: VAULT_ID,
        items: [
          { itemId: "item-old", ownerId: OWNER_ID, revision: 1, algorithm: v1.algorithm, nonceBase64: v1.nonceBase64, ciphertextBase64: v1.ciphertextBase64, associatedData: v1.associatedData, createdAt: "t", updatedAt: "t" },
          { itemId: "item-new", ownerId: OWNER_ID, revision: 1, algorithm: v2.algorithm, nonceBase64: v2.nonceBase64, ciphertextBase64: v2.ciphertextBase64, associatedData: v2.associatedData, createdAt: "t", updatedAt: "t" },
        ],
      }),
    );
    // The PUT for the migrated v1 entry.
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { itemId: "item-old", revision: 2, updatedAt: "t2" }));

    await migrateLegacyEntries(rawBytes, cryptoKey);

    // Exactly one PUT (only the v1 entry was migrated).
    const puts = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(puts).toHaveLength(1);
    const [putUrl, putInit] = puts[0];
    expect(putUrl).toBe("/api/vault/items/item-old");
    const body = JSON.parse(putInit.body as string);
    expect(body.algorithm).toBe("aes-256-gcm");
    expect(body.revision).toBe(2);
    expect(putInit.body as string).not.toContain("BundID");
  });

  it("does nothing when all entries are already v2", async () => {
    const rawBytes = new Uint8Array(32).fill(9);
    const cryptoKey = await importRootKey(rawBytes);
    const v2 = await encryptVaultEntryV2(cryptoKey, { vaultId: VAULT_ID, itemId: "i", ownerId: OWNER_ID, revision: 1, plaintext: entry });
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        vaultId: VAULT_ID,
        items: [{ itemId: "i", ownerId: OWNER_ID, revision: 1, algorithm: v2.algorithm, nonceBase64: v2.nonceBase64, ciphertextBase64: v2.ciphertextBase64, associatedData: v2.associatedData, createdAt: "t", updatedAt: "t" }],
      }),
    );
    await migrateLegacyEntries(rawBytes, cryptoKey);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(0);
  });
});

describe("vault-items-client.deleteItem", () => {
  it("sends DELETE with ?revision=N and resolves on 204", async () => {
    const key = await rootKey();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteItem(key, {
      itemId: "item-1",
      ownerId: OWNER_ID,
      vaultId: VAULT_ID,
      revision: 4,
      entry,
      createdAt: "2026-05-19T10:00:00.000Z",
      updatedAt: "2026-05-19T10:00:00.000Z",
    });
    const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/vault/items/item-1?revision=4");
    expect(init.method).toBe("DELETE");
  });
});
