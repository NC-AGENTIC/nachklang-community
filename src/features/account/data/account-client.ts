// Permanently deletes the signed-in user's account and all data. The server notifies any invited
// trustees first, then hard-deletes (cascade). Irreversible.
export async function deleteAccount(): Promise<void> {
  const res = await fetch("/api/account", { method: "DELETE", credentials: "same-origin" });
  if (res.status !== 204) throw new Error(`account_delete_failed_${res.status}`);
}
