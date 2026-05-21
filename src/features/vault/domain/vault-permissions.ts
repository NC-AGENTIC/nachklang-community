export type VaultMemberRole = "admin";
export type VaultMemberStatus = "active" | "pending" | "removed";

export type VaultMember = {
  userId: string;
  email: string;
  displayName: string;
  role: VaultMemberRole;
  status: VaultMemberStatus;
};

export function assertVaultWriteAllowed(actor: VaultMember): void {
  if (actor.role !== "admin" || actor.status !== "active") {
    throw new Error("Only the active vault admin can edit vault entries.");
  }
}
