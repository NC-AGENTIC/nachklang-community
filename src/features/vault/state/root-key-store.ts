export type UnlockedVia = "passkey" | "recovery";

// SP6c: the in-memory key is a NON-EXTRACTABLE WebCrypto CryptoKey (AES-256-GCM),
// so raw key bytes are never reachable from JS during a normal unlocked session.
// The raw bytes only exist transiently at unlock (to unwrap + import) and inside
// the crypto layer; a CryptoKey is opaque and GC-collected on clear. The store
// therefore holds only the opaque key — no raw bytes are ever parked here.
export type RootKeyState = {
  vaultId: string;
  rootKey: CryptoKey;
  unlockedVia: UnlockedVia;
} | null;

let state: RootKeyState = null;
const listeners = new Set<() => void>();

export function getRootKey(): RootKeyState {
  return state;
}

export function setRootKey(next: NonNullable<RootKeyState>): void {
  state = next;
  notify();
}

export function clearRootKey(): void {
  state = null;
  notify();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}
