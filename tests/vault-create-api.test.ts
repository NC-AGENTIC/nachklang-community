import { describe, expect, it, vi, beforeEach } from "vitest";

const { create, findUnique, passkeyKeyCreateMany } = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  passkeyKeyCreateMany: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  vault: { create, findUnique },
  vaultPasskeyKey: { createMany: passkeyKeyCreateMany },
} }));
vi.mock("@/server/auth/session", () => ({ requireFullyAuthenticated: vi.fn(async () => ({ user: { id: "u1" } })) }));

import { POST } from "@/app/api/vault/route";

const body = {
  vaultId: "v1",
  kdfPolicy: { algorithm: "argon2id", version: 1, operationsLimit: 3, memoryLimitBytes: 67108864, saltBase64: "s" },
  prfWrappedRootKeys: [{ credentialID: "c1", wrapped: { version:2, algorithm:"aes-256-gcm", ivBase64:"i", ciphertextBase64:"c", associatedData:{ type:"vault-root-key-prf", vaultId:"v1", credentialID:"c1", version:2 } } }],
  recoveryWrappedRootKey: { version:2, algorithm:"aes-256-gcm", ivBase64:"i", ciphertextBase64:"c", associatedData:{ type:"vault-root-key-recovery", vaultId:"v1", version:2 } },
};

beforeEach(() => { create.mockReset(); findUnique.mockReset(); passkeyKeyCreateMany.mockReset(); findUnique.mockResolvedValue(null); });

describe("POST /api/vault", () => {
  it("creates the vault + passkey key rows and never stores plaintext key material", async () => {
    create.mockResolvedValue({ vaultId: "v1" });
    const res = await POST(new Request("http://localhost/api/vault", { method: "POST", body: JSON.stringify(body) }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ vaultId: "v1", userId: "u1" }) }));
    const serialized = JSON.stringify(create.mock.calls[0][0]);
    expect(serialized).not.toMatch(/rootKey"\s*:/);
  });

  it("rejects a malformed payload", async () => {
    const res = await POST(new Request("http://localhost/api/vault", { method: "POST", body: JSON.stringify({ vaultId: "v1" }) }));
    expect(res.status).toBe(400);
  });
});
