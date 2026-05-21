import { describe, expect, it } from "vitest";

import {
  fingerprintPublicKey,
  generateTrusteeKeypair,
  openSealed,
  openSealedRootKey,
  publicKeyFromBase64,
  publicKeyToBase64,
  sealRootKeyToTrustee,
  sealToPublicKey,
  sealedFromBase64,
  sealedToBase64,
} from "@/features/trustee/crypto/trustee-keypair";

describe("trustee keypair crypto", () => {
  it("generates a 32-byte X25519 keypair", async () => {
    const kp = await generateTrusteeKeypair();
    expect(kp.publicKey).toHaveLength(32);
    expect(kp.privateKey).toHaveLength(32);
  });

  it("seals a message to a public key and the holder can open it", async () => {
    const kp = await generateTrusteeKeypair();
    const message = new TextEncoder().encode("vault root key bytes");
    const sealed = await sealToPublicKey(message, kp.publicKey);
    const opened = await openSealed(sealed, kp);
    expect(new TextDecoder().decode(opened)).toBe("vault root key bytes");
  });

  it("cannot be opened by a different keypair", async () => {
    const owner = await generateTrusteeKeypair();
    const stranger = await generateTrusteeKeypair();
    const sealed = await sealToPublicKey(new Uint8Array([1, 2, 3, 4]), owner.publicKey);
    await expect(openSealed(sealed, stranger)).rejects.toBeTruthy();
  });

  it("round-trips public key + sealed blob through base64", async () => {
    const kp = await generateTrusteeKeypair();
    const pubB64 = publicKeyToBase64(kp.publicKey);
    expect(publicKeyFromBase64(pubB64)).toEqual(kp.publicKey);

    const sealed = await sealToPublicKey(new Uint8Array([9, 8, 7]), kp.publicKey);
    const sealedB64 = sealedToBase64(sealed);
    const opened = await openSealed(sealedFromBase64(sealedB64), kp);
    expect(opened).toEqual(new Uint8Array([9, 8, 7]));
  });

  it("produces a deterministic, stable fingerprint distinct per key", async () => {
    const a = await generateTrusteeKeypair();
    const b = await generateTrusteeKeypair();
    const fa1 = await fingerprintPublicKey(a.publicKey);
    const fa2 = await fingerprintPublicKey(a.publicKey);
    const fb = await fingerprintPublicKey(b.publicKey);
    expect(fa1).toBe(fa2);
    expect(fa1).toMatch(/^\d{4}-\d{4}-\d{4}$/);
    expect(fa1).not.toBe(fb);
  });

  it("seals an extractable Root Key and the trustee unseals an equivalent AES key", async () => {
    const trustee = await generateTrusteeKeypair();
    const ownerRootKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
      "encrypt",
      "decrypt",
    ]);

    const sealed = await sealRootKeyToTrustee(ownerRootKey, trustee.publicKey);
    const trusteeRootKey = await openSealedRootKey(sealed, trustee);

    // The unsealed key must decrypt what the owner's key encrypted.
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode("entry ciphertext");
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, ownerRootKey, plaintext);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, trusteeRootKey, ct);
    expect(new Uint8Array(pt)).toEqual(plaintext);
  });
});
