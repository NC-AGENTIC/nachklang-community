import type { CreateKeypairPayload } from "@/features/trustee/crypto/user-keypair-bootstrap";
import type { KeypairPrfWrapEntry } from "@/features/trustee/crypto/user-keypair-unlock";
import type { WrappedTrusteePrivateKey } from "@/features/trustee/crypto/trustee-keypair-wrap";

export type MyKeypairMaterial = {
  keypairId: string;
  publicKey: string;
  prfWrappedPrivateKeys: KeypairPrfWrapEntry[];
  recoveryWrappedPrivateKey: WrappedTrusteePrivateKey | null;
};

export async function fetchMyKeypair(): Promise<MyKeypairMaterial | null> {
  const res = await fetch("/api/keypair", { method: "GET", credentials: "same-origin" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`fetch_keypair_failed_${res.status}`);
  return (await res.json()) as MyKeypairMaterial;
}

export async function createMyKeypair(payload: CreateKeypairPayload): Promise<void> {
  const res = await fetch("/api/keypair", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) return; // already exists — treat as success
  if (!res.ok) throw new Error(`create_keypair_failed_${res.status}`);
}
