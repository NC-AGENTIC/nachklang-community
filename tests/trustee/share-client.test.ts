import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const kc = vi.hoisted(() => ({ fetchMyKeypair: vi.fn(), createMyKeypair: vi.fn() }));
const pp = vi.hoisted(() => ({ assertPrf: vi.fn(), registerWithPrf: vi.fn() }));
const bs = vi.hoisted(() => ({ bootstrapUserKeypairPrfOnly: vi.fn() }));

vi.mock("@/features/trustee/data/keypair-client", () => kc);
vi.mock("@/features/vault/crypto/passkey-port", () => pp);
vi.mock("@/features/trustee/crypto/user-keypair-bootstrap", () => bs);

import {
  acceptInvite,
  ensureMyKeypair,
  provisionTrusteeKeypair,
} from "@/features/trustee/data/share-client";

beforeEach(() => {
  kc.fetchMyKeypair.mockReset();
  kc.createMyKeypair.mockReset();
  pp.assertPrf.mockReset();
  pp.registerWithPrf.mockReset();
  bs.bootstrapUserKeypairPrfOnly.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("provisionTrusteeKeypair", () => {
  it("registers a passkey FIRST without pre-fetching /api/keypair (which needs a passkey)", async () => {
    pp.registerWithPrf.mockResolvedValue({ credentialID: "cred-new", prfOutput: new ArrayBuffer(8) });
    bs.bootstrapUserKeypairPrfOnly.mockResolvedValue({
      keypairId: "k9",
      keypair: {},
      payload: { keypairId: "k9", publicKey: "new-pub", prfWrappedPrivateKeys: [] },
    });

    const pub = await provisionTrusteeKeypair();

    expect(pub).toBe("new-pub");
    // Must NOT pre-check the keypair endpoint before the passkey exists.
    expect(kc.fetchMyKeypair).not.toHaveBeenCalled();
    expect(pp.registerWithPrf).toHaveBeenCalledTimes(1);
    expect(kc.createMyKeypair).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: "new-pub" }),
    );
  });
});

describe("ensureMyKeypair", () => {
  it("returns the existing public key without prompting for a passkey", async () => {
    kc.fetchMyKeypair.mockResolvedValue({ keypairId: "k1", publicKey: "existing-pub" });
    expect(await ensureMyKeypair()).toBe("existing-pub");
    expect(pp.assertPrf).not.toHaveBeenCalled();
    expect(kc.createMyKeypair).not.toHaveBeenCalled();
  });

  it("provisions a PRF-only keypair when none exists and returns its public key", async () => {
    kc.fetchMyKeypair.mockResolvedValue(null);
    pp.assertPrf.mockResolvedValue({ credentialID: "cred-A", prfOutput: new ArrayBuffer(8) });
    bs.bootstrapUserKeypairPrfOnly.mockResolvedValue({
      keypairId: "k2",
      keypair: {},
      payload: { keypairId: "k2", publicKey: "new-pub", prfWrappedPrivateKeys: [] },
    });

    expect(await ensureMyKeypair()).toBe("new-pub");
    expect(pp.assertPrf).toHaveBeenCalledTimes(1);
    expect(bs.bootstrapUserKeypairPrfOnly).toHaveBeenCalledWith({
      credentialID: "cred-A",
      prfOutput: expect.any(ArrayBuffer),
    });
    expect(kc.createMyKeypair).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: "new-pub" }),
    );
  });
});

describe("acceptInvite", () => {
  it("ensures a keypair, then POSTs accept and returns the fingerprint", async () => {
    kc.fetchMyKeypair.mockResolvedValue({ keypairId: "k1", publicKey: "existing-pub" });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ shareId: "s1", status: "pending_verify", fingerprint: "0421-9837-1056" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await acceptInvite("TOK");
    expect(res).toEqual({ shareId: "s1", status: "pending_verify", fingerprint: "0421-9837-1056" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/shares/invite/TOK/accept",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws when the accept call fails", async () => {
    kc.fetchMyKeypair.mockResolvedValue({ keypairId: "k1", publicKey: "existing-pub" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 409 })));
    await expect(acceptInvite("TOK")).rejects.toThrow();
  });
});
