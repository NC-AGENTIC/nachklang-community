import { describe, expect, it, vi, beforeEach } from "vitest";
const { findUnique, create, del, count } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  del: vi.fn(),
  count: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({ prisma: {
  vault: { findUnique },
  vaultPasskeyKey: { create, delete: del, count },
} }));
vi.mock("@/server/auth/session", () => ({ requireFullyAuthenticated: vi.fn(async () => ({ user: { id: "u1" } })) }));
import { POST, DELETE } from "@/app/api/vault/passkey-keys/route";

const wrapped = { version:2, algorithm:"aes-256-gcm", ivBase64:"i", ciphertextBase64:"c", associatedData:{ type:"vault-root-key-prf", vaultId:"v1", credentialID:"c2", version:2 } };

beforeEach(() => { [findUnique,create,del,count].forEach(m=>m.mockReset()); findUnique.mockResolvedValue({ vaultId: "v1" }); });

describe("passkey-keys api", () => {
  it("adds a wrapped key for a new credential", async () => {
    create.mockResolvedValue({});
    const res = await POST(new Request("http://localhost/api/vault/passkey-keys", { method:"POST", body: JSON.stringify({ credentialID:"c2", wrapped }) }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ vaultId:"v1", credentialID:"c2" }) }));
  });

  it("refuses to delete the last passkey key", async () => {
    count.mockResolvedValue(1);
    const res = await DELETE(new Request("http://localhost/api/vault/passkey-keys?credentialID=c1", { method:"DELETE" }));
    expect(res.status).toBe(409);
    expect(del).not.toHaveBeenCalled();
  });
});
