import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const USER_ID = "vault-items-route-user";
const VAULT_ID = "55555555-5555-5555-8555-555555555555";
const ITEM_ID = "66666666-6666-6666-8666-666666666666";

vi.mock("@/server/auth/session", () => ({
  requireFullyAuthenticated: vi.fn(async () => ({ user: { id: USER_ID, email: "route@example.test", emailVerified: true, twoFactorEnabled: true } })),
}));

import { GET as collectionGet, POST as collectionPost } from "@/app/api/vault/items/route";
import { DELETE as itemDelete, PUT as itemPut } from "@/app/api/vault/items/[itemId]/route";
import { prisma } from "@/server/db/prisma";

function body(rev: number) {
  return {
    itemId: ITEM_ID,
    revision: rev,
    algorithm: "xchacha20poly1305-ietf" as const,
    nonceBase64: "n".repeat(32),
    ciphertextBase64: "c".repeat(64),
    associatedData: {
      type: "vault-entry" as const,
      version: 1 as const,
      vaultId: VAULT_ID,
      itemId: ITEM_ID,
      ownerId: USER_ID,
      revision: rev,
    },
  };
}

beforeAll(async () => {
  await prisma.vaultCiphertext.deleteMany({ where: { vaultId: VAULT_ID } });
  await prisma.vault.deleteMany({ where: { vaultId: VAULT_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({ data: { id: USER_ID, name: "Route Test", email: `${USER_ID}@example.test`, emailVerified: true } });
  await prisma.vault.create({
    data: {
      userId: USER_ID,
      vaultId: VAULT_ID,
      kdfPolicy: { algorithm: "argon2id", version: 1, operationsLimit: 3, memoryLimitBytes: 64 * 1024 * 1024, saltBase64: "AAAA" },
      recoveryWrappedRootKey: { version: 1, algorithm: "xchacha20poly1305-ietf", nonceBase64: "n".repeat(24), ciphertextBase64: "c".repeat(32), associatedData: { type: "vault-root-key-recovery", vaultId: VAULT_ID, version: 1 } },
    },
  });
});

afterAll(async () => {
  await prisma.vaultCiphertext.deleteMany({ where: { vaultId: VAULT_ID } });
  await prisma.vault.deleteMany({ where: { vaultId: VAULT_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

function jsonRequest(method: "POST" | "PUT", payload: unknown): Request {
  return new Request("http://localhost/api/vault/items", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
}

describe("/api/vault/items routes", () => {
  it("POST creates an item then GET lists it", async () => {
    const post = await collectionPost(jsonRequest("POST", body(1)));
    expect(post.status).toBe(201);
    const get = await collectionGet();
    expect(get.status).toBe(200);
    const payload = await get.json();
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].itemId).toBe(ITEM_ID);
    expect(payload.items[0].revision).toBe(1);
  });

  it("POST again with the same itemId returns 409 vault_item_exists", async () => {
    const dup = await collectionPost(jsonRequest("POST", body(1)));
    expect(dup.status).toBe(409);
    expect(await dup.json()).toEqual({ error: "vault_item_exists" });
  });

  it("PUT with correct next revision succeeds and bumps revision", async () => {
    const put = await itemPut(jsonRequest("PUT", body(2)), { params: Promise.resolve({ itemId: ITEM_ID }) });
    expect(put.status).toBe(200);
    const payload = await put.json();
    expect(payload.revision).toBe(2);
  });

  it("PUT with stale revision returns 409 vault_item_stale", async () => {
    const stale = await itemPut(jsonRequest("PUT", body(2)), { params: Promise.resolve({ itemId: ITEM_ID }) });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({ error: "vault_item_stale" });
  });

  it("DELETE with wrong revision returns 409", async () => {
    const wrong = await itemDelete(new Request("http://localhost/api/vault/items/" + ITEM_ID + "?revision=1", { method: "DELETE" }), { params: Promise.resolve({ itemId: ITEM_ID }) });
    expect(wrong.status).toBe(409);
  });

  it("DELETE with correct revision returns 204 and the list becomes empty", async () => {
    const ok = await itemDelete(new Request("http://localhost/api/vault/items/" + ITEM_ID + "?revision=2", { method: "DELETE" }), { params: Promise.resolve({ itemId: ITEM_ID }) });
    expect(ok.status).toBe(204);
    const get = await collectionGet();
    const payload = await get.json();
    expect(payload.items).toHaveLength(0);
  });
});
