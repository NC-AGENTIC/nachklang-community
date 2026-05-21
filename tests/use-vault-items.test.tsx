/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useVaultItems } from "@/features/vault/state/use-vault-items";
import { VaultStaleRevisionError } from "@/features/vault/data/vault-stale-revision-error";

vi.mock("@/features/vault/data/vault-items-client", async () => {
  return {
    listItems: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  };
});

import * as client from "@/features/vault/data/vault-items-client";

const VAULT_ID = "11111111-1111-1111-1111-811111111111";
const OWNER_ID = "user-hook";

function entry(displayName: string) {
  return {
    providerId: "bund-id",
    displayName,
    loginUrl: "https://id.bund.de",
    emailUsed: "",
    username: "",
    passwordLocationHint: "",
    notes: "",
    tags: [],
    lifecycleStatus: "aktiv" as const,
  };
}

function decrypted(itemId: string, displayName: string, revision = 1) {
  return {
    itemId,
    ownerId: OWNER_ID,
    vaultId: VAULT_ID,
    revision,
    entry: entry(displayName),
    createdAt: "2026-05-19T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
  };
}

beforeEach(() => {
  vi.mocked(client.listItems).mockReset();
  vi.mocked(client.createItem).mockReset();
  vi.mocked(client.updateItem).mockReset();
  vi.mocked(client.deleteItem).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

// The vault-items client is mocked, so the key is never used for real crypto —
// it only needs to satisfy the CryptoKey type the hook now expects.
const rootKey = {} as unknown as CryptoKey;
const ctx = { rootKey, vaultId: VAULT_ID, ownerId: OWNER_ID } as const;

describe("useVaultItems", () => {
  it("loads items on mount and exposes them", async () => {
    vi.mocked(client.listItems).mockResolvedValueOnce([decrypted("a", "Alpha")]);
    const { result } = renderHook(() => useVaultItems(ctx));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.items?.[0].entry.displayName).toBe("Alpha");
  });

  it("optimistically prepends on create and commits on success", async () => {
    vi.mocked(client.listItems).mockResolvedValueOnce([]);
    vi.mocked(client.createItem).mockImplementationOnce(async (_k, draft) =>
      decrypted("b", draft.displayName),
    );
    const { result } = renderHook(() => useVaultItems(ctx));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => {
      await result.current.create(entry("Beta"));
    });
    expect(result.current.items?.[0].entry.displayName).toBe("Beta");
  });

  it("rolls back on create error", async () => {
    vi.mocked(client.listItems).mockResolvedValueOnce([]);
    vi.mocked(client.createItem).mockRejectedValueOnce(new Error("network_down"));
    const { result } = renderHook(() => useVaultItems(ctx));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => {
      try { await result.current.create(entry("Gamma")); } catch { /* surfaced via state */ }
    });
    expect(result.current.items).toEqual([]);
    expect(result.current.error?.kind).toBe("network");
  });

  it("on stale-revision update, replaces state with snapshot and surfaces a stale error", async () => {
    vi.mocked(client.listItems).mockResolvedValueOnce([decrypted("a", "Alpha", 1)]);
    const snapshot = [decrypted("a", "Alpha refreshed", 3)];
    vi.mocked(client.updateItem).mockRejectedValueOnce(new VaultStaleRevisionError(snapshot));
    const { result } = renderHook(() => useVaultItems(ctx));
    await waitFor(() => expect(result.current.status).toBe("ready"));
    await act(async () => {
      try {
        await result.current.update(result.current.items![0], entry("My patch"));
      } catch { /* surfaced via state */ }
    });
    expect(result.current.items?.[0].entry.displayName).toBe("Alpha refreshed");
    expect(result.current.items?.[0].revision).toBe(3);
    expect(result.current.error?.kind).toBe("stale");
  });
});
