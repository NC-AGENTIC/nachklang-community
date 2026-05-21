import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const vu = vi.hoisted(() => ({ unlockWithPrf: vi.fn() }));
const pp = vi.hoisted(() => ({ assertPrf: vi.fn() }));

vi.mock("@/features/vault/crypto/vault-unlock", () => vu);
vi.mock("@/features/vault/crypto/passkey-port", () => pp);

import {
  generateTrusteeKeypair,
  openSealed,
  publicKeyToBase64,
  sealedFromBase64,
} from "@/features/trustee/crypto/trustee-keypair";
import { encryptVaultEntryV2 } from "@/features/vault/crypto/vault-crypto";
import { readSharedVault, revokeShare, sealShare } from "@/features/trustee/data/share-client";

async function importRaw(raw: Uint8Array, extractable: boolean): Promise<CryptoKey> {
  const copy = new Uint8Array(raw.byteLength);
  copy.set(raw);
  return crypto.subtle.importKey("raw", copy, { name: "AES-GCM", length: 256 }, extractable, [
    "encrypt",
    "decrypt",
  ]);
}

beforeEach(() => {
  vu.unlockWithPrf.mockReset();
  pp.assertPrf.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("sealShare", () => {
  it("seals the owner's Root Key to the trustee key so the trustee can open it", async () => {
    const trustee = await generateTrusteeKeypair();
    const rootKeyBytes = crypto.getRandomValues(new Uint8Array(32));

    // Owner derives an extractable copy of the Root Key (mocked unlock) + a passkey assertion.
    pp.assertPrf.mockResolvedValue({ credentialID: "c1", prfOutput: new ArrayBuffer(8) });
    vu.unlockWithPrf.mockResolvedValue(await importRaw(rootKeyBytes, true));

    let postedBody: { sealedRootKey: string } | null = null;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/vault") {
        return new Response(JSON.stringify({ prfWrappedRootKeys: [{ credentialID: "c1", wrapped: {} }] }), {
          status: 200,
        });
      }
      if (url.endsWith("/seal")) {
        postedBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      throw new Error(`unexpected fetch ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await sealShare("share1", publicKeyToBase64(trustee.publicKey));

    expect(postedBody).not.toBeNull();
    const sealed = sealedFromBase64(postedBody!.sealedRootKey);
    const opened = await openSealed(sealed, trustee);
    expect(Array.from(opened)).toEqual(Array.from(rootKeyBytes));
    expect(vu.unlockWithPrf).toHaveBeenCalledWith(expect.anything(), expect.anything(), true);
  });

  it("throws when the seal POST fails", async () => {
    const trustee = await generateTrusteeKeypair();
    pp.assertPrf.mockResolvedValue({ credentialID: "c1", prfOutput: new ArrayBuffer(8) });
    vu.unlockWithPrf.mockResolvedValue(await importRaw(crypto.getRandomValues(new Uint8Array(32)), true));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/vault"
          ? new Response(JSON.stringify({ prfWrappedRootKeys: [] }), { status: 200 })
          : new Response("{}", { status: 404 }),
      ),
    );
    await expect(sealShare("share1", publicKeyToBase64(trustee.publicKey))).rejects.toThrow();
  });
});

describe("readSharedVault", () => {
  it("unseals the Root Key and decrypts the owner's entries", async () => {
    const trustee = await generateTrusteeKeypair();
    const rootKeyBytes = crypto.getRandomValues(new Uint8Array(32));

    // Owner-side: seal the Root Key to the trustee and encrypt an entry under it.
    const { sealRootKeyToTrustee, sealedToBase64, publicKeyFromBase64 } = await import(
      "@/features/trustee/crypto/trustee-keypair"
    );
    const sealed = await sealRootKeyToTrustee(
      await importRaw(rootKeyBytes, true),
      publicKeyFromBase64(publicKeyToBase64(trustee.publicKey)),
    );
    const encRootKey = await importRaw(rootKeyBytes, false);
    const encrypted = await encryptVaultEntryV2(encRootKey, {
      vaultId: "v1",
      itemId: "i1",
      ownerId: "owner1",
      revision: 1,
      plaintext: { providerId: "google", displayName: "Google Konto", loginUrl: "https://accounts.google.com" },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            vaultId: "v1",
            ownerId: "owner1",
            sealedRootKey: sealedToBase64(sealed),
            items: [
              {
                itemId: "i1",
                ownerId: "owner1",
                revision: 1,
                algorithm: "aes-256-gcm",
                nonceBase64: encrypted.nonceBase64,
                ciphertextBase64: encrypted.ciphertextBase64,
                associatedData: encrypted.associatedData,
                createdAt: "2026-05-21T10:00:00.000Z",
                updatedAt: "2026-05-21T10:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await readSharedVault("v1", trustee);
    expect(result.ownerId).toBe("owner1");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].entry.displayName).toBe("Google Konto");
  });

  it("throws forbidden when the trustee is not (or no longer) active", async () => {
    const trustee = await generateTrusteeKeypair();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 403 })));
    await expect(readSharedVault("v1", trustee)).rejects.toThrow("forbidden");
  });
});

describe("revokeShare", () => {
  it("DELETEs the share", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await revokeShare("share1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/shares/share1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
