import { randomBytes } from "node:crypto";

// How long a trustee invite link stays valid.
export const INVITE_TTL_DAYS = 14;

// 32 random bytes rendered base64url — the secret capability that lets a trustee accept.
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function inviteExpiry(now: Date = new Date(), days: number = INVITE_TTL_DAYS): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

// An invite link stays usable for the member for its full TTL. "invited" (not yet accepted) and
// "accepted" (re-opened by a member who already accepted) are both acceptable while unexpired —
// re-acceptance is idempotent and seal-preserving (see acceptInvite). Only a revoked invite or
// one past its expiry is rejected.
export function isInviteAcceptable(
  invite: { status: string; expiresAt: Date },
  now: Date = new Date(),
): boolean {
  if (invite.expiresAt.getTime() <= now.getTime()) return false;
  return invite.status === "invited" || invite.status === "accepted";
}
