import { prisma } from "@/server/db/prisma";

import { generateInviteToken, inviteExpiry, isInviteAcceptable } from "./invite-token";

export type CreatedInvite = { id: string; token: string; expiresAt: Date };

export async function createInvite(args: {
  vaultId: string;
  inviteeEmail: string;
  label: string;
}): Promise<CreatedInvite> {
  const token = generateInviteToken();
  const expiresAt = inviteExpiry();
  const row = await prisma.shareInvite.create({
    data: {
      token,
      vaultId: args.vaultId,
      inviteeEmail: args.inviteeEmail,
      label: args.label,
      status: "invited",
      expiresAt,
    },
  });
  return { id: row.id, token, expiresAt };
}

export async function getInviteByToken(token: string) {
  return prisma.shareInvite.findUnique({ where: { token } });
}

export type AcceptInviteResult =
  | { shareId: string; status: string }
  | { error: "not_found" | "not_acceptable" };

export async function acceptInvite(args: {
  token: string;
  trusteeUserId: string;
  trusteePublicKey: string;
  trusteeFingerprint: string;
}): Promise<AcceptInviteResult> {
  const invite = await prisma.shareInvite.findUnique({ where: { token: args.token } });
  if (!invite) return { error: "not_found" };
  if (!isInviteAcceptable(invite, new Date())) return { error: "not_acceptable" };

  const existing = await prisma.vaultShare.findUnique({
    where: { vaultId_trusteeUserId: { vaultId: invite.vaultId, trusteeUserId: args.trusteeUserId } },
    select: { id: true, status: true, trusteePublicKey: true },
  });

  // Re-opening the still-valid link with the SAME key is a no-op: the member already accepted, so
  // preserve their current share state (incl. an active seal). Without this, a returning trustee
  // would silently wipe their own active grant just by clicking the link again.
  if (existing && existing.trusteePublicKey === args.trusteePublicKey) {
    if (invite.status !== "accepted") {
      await prisma.shareInvite.update({ where: { id: invite.id }, data: { status: "accepted" } });
    }
    return { shareId: existing.id, status: existing.status };
  }

  // First accept (no share yet) or genuine key rotation (different public key): (re)bind and clear
  // any prior seal, forcing re-verification — a swapped/rotated key cannot inherit an old grant.
  const share = await prisma.vaultShare.upsert({
    where: { vaultId_trusteeUserId: { vaultId: invite.vaultId, trusteeUserId: args.trusteeUserId } },
    create: {
      vaultId: invite.vaultId,
      trusteeUserId: args.trusteeUserId,
      label: invite.label,
      status: "pending_verify",
      trusteePublicKey: args.trusteePublicKey,
      trusteeFingerprint: args.trusteeFingerprint,
    },
    update: {
      status: "pending_verify",
      trusteePublicKey: args.trusteePublicKey,
      trusteeFingerprint: args.trusteeFingerprint,
      sealedRootKey: null,
    },
    select: { id: true, status: true },
  });

  await prisma.shareInvite.update({ where: { id: invite.id }, data: { status: "accepted" } });
  return { shareId: share.id, status: share.status };
}

export async function listSharesForVault(vaultId: string) {
  return prisma.vaultShare.findMany({
    where: { vaultId },
    orderBy: { createdAt: "desc" },
    include: {
      accessLogs: { orderBy: { accessedAt: "desc" }, take: 1, select: { accessedAt: true } },
      _count: { select: { accessLogs: true } },
    },
  });
}

export type SealResult = { ok: true } | { error: "not_found" };

// Activate a pending share by storing the owner-computed sealed Root Key. Scoped to the owner's
// own vault so a caller can only seal shares of a vault they own.
export async function sealShare(args: {
  shareId: string;
  ownerVaultId: string;
  sealedRootKey: string;
}): Promise<SealResult> {
  const res = await prisma.vaultShare.updateMany({
    where: { id: args.shareId, vaultId: args.ownerVaultId, status: "pending_verify" },
    data: { status: "active", sealedRootKey: args.sealedRootKey },
  });
  return res.count === 1 ? { ok: true } : { error: "not_found" };
}

// Revoke a share: blocks future reads and wipes the sealed blob. Already-read data cannot be
// un-seen (documented). Scoped to the owner's vault.
export async function revokeShare(args: {
  shareId: string;
  ownerVaultId: string;
}): Promise<SealResult> {
  const res = await prisma.vaultShare.updateMany({
    where: { id: args.shareId, vaultId: args.ownerVaultId },
    data: { status: "revoked", sealedRootKey: null },
  });
  return res.count >= 1 ? { ok: true } : { error: "not_found" };
}

export type PurgeResult = { ok: true; trusteeUserId: string } | { error: "not_found" };

// Permanently delete a share record (owner-scoped). Only meaningful for an already-revoked share;
// also removes the originating invite(s) for that trustee so the "Datensatz" is fully gone.
// ShareAccessLog rows cascade from the VaultShare delete; the DB audit trigger records the deletion.
export async function purgeShare(args: {
  shareId: string;
  ownerVaultId: string;
}): Promise<PurgeResult> {
  const share = await prisma.vaultShare.findFirst({
    where: { id: args.shareId, vaultId: args.ownerVaultId },
    select: { id: true, trusteeUserId: true },
  });
  if (!share) return { error: "not_found" };

  const trustee = await prisma.user.findUnique({
    where: { id: share.trusteeUserId },
    select: { email: true },
  });
  if (trustee?.email) {
    await prisma.shareInvite.deleteMany({
      where: { vaultId: args.ownerVaultId, inviteeEmail: trustee.email },
    });
  }
  await prisma.vaultShare.delete({ where: { id: share.id } });
  return { ok: true, trusteeUserId: share.trusteeUserId };
}

export async function getActiveShareForTrustee(
  vaultId: string,
  trusteeUserId: string,
): Promise<{ id: string; sealedRootKey: string | null } | null> {
  const row = await prisma.vaultShare.findFirst({
    where: { vaultId, trusteeUserId, status: "active" },
    select: { id: true, sealedRootKey: true },
  });
  return row ?? null;
}

export async function logShareAccess(args: {
  shareId: string;
  trusteeUserId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.shareAccessLog.create({
    data: {
      shareId: args.shareId,
      trusteeUserId: args.trusteeUserId,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    },
  });
}

export async function listSharesForTrustee(trusteeUserId: string) {
  return prisma.vaultShare.findMany({
    where: { trusteeUserId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: { vault: { include: { user: { select: { name: true, email: true } } } } },
  });
}

export async function getVaultOwnerId(vaultId: string): Promise<string | null> {
  const row = await prisma.vault.findUnique({ where: { vaultId }, select: { userId: true } });
  return row?.userId ?? null;
}

// Distinct contact emails for everyone the owner has shared with / invited on this vault — used to
// notify them during account-deletion offboarding.
export async function listTrusteeEmailsForOwnerVault(vaultId: string): Promise<string[]> {
  const [shares, invites] = await Promise.all([
    prisma.vaultShare.findMany({ where: { vaultId }, select: { trustee: { select: { email: true } } } }),
    prisma.shareInvite.findMany({ where: { vaultId }, select: { inviteeEmail: true } }),
  ]);
  const set = new Set<string>();
  for (const s of shares) if (s.trustee?.email) set.add(s.trustee.email);
  for (const i of invites) set.add(i.inviteeEmail);
  return [...set];
}

export async function getVaultOwnerName(vaultId: string): Promise<string | null> {
  const row = await prisma.vault.findUnique({
    where: { vaultId },
    select: { user: { select: { name: true } } },
  });
  return row?.user.name ?? null;
}

export async function listAccessLog(shareId: string, ownerVaultId: string) {
  const owned = await prisma.vaultShare.findFirst({
    where: { id: shareId, vaultId: ownerVaultId },
    select: { id: true },
  });
  if (!owned) return null;
  return prisma.shareAccessLog.findMany({
    where: { shareId },
    orderBy: { accessedAt: "desc" },
    select: { accessedAt: true, ipAddress: true, userAgent: true },
  });
}

export async function getOwnerVaultId(userId: string): Promise<string | null> {
  const row = await prisma.vault.findUnique({ where: { userId }, select: { vaultId: true } });
  return row?.vaultId ?? null;
}

export async function getUserPublicKey(userId: string): Promise<string | null> {
  const row = await prisma.userKeypair.findUnique({ where: { userId }, select: { publicKey: true } });
  return row?.publicKey ?? null;
}

// A trustee's per-item handling status (encrypted overlay). Upsert keyed on (vault,item,trustee)
// so each trustee maintains their own worklist without ever touching the owner's encrypted entry.
export async function upsertItemProgress(args: {
  vaultId: string;
  itemId: string;
  trusteeUserId: string;
  nonceBase64: string;
  ciphertextBase64: string;
}): Promise<void> {
  await prisma.shareItemProgress.upsert({
    where: {
      vaultId_itemId_trusteeUserId: {
        vaultId: args.vaultId,
        itemId: args.itemId,
        trusteeUserId: args.trusteeUserId,
      },
    },
    create: {
      vaultId: args.vaultId,
      itemId: args.itemId,
      trusteeUserId: args.trusteeUserId,
      nonceBase64: args.nonceBase64,
      ciphertextBase64: args.ciphertextBase64,
    },
    update: { nonceBase64: args.nonceBase64, ciphertextBase64: args.ciphertextBase64 },
  });
}

export async function listItemProgressForTrustee(vaultId: string, trusteeUserId: string) {
  return prisma.shareItemProgress.findMany({
    where: { vaultId, trusteeUserId },
    select: { itemId: true, nonceBase64: true, ciphertextBase64: true, updatedAt: true },
  });
}

export type InvitePreview = {
  inviteeEmail: string;
  status: string;
  acceptable: boolean;
  ownerName: string;
};

// Trustee-facing preview shown on the accept page — deliberately omits vaultId and other
// internal identifiers; the token itself is the only secret needed to accept.
export async function getInvitePreview(token: string): Promise<InvitePreview | null> {
  const invite = await prisma.shareInvite.findUnique({
    where: { token },
    include: { vault: { include: { user: { select: { name: true, email: true } } } } },
  });
  if (!invite) return null;
  return {
    inviteeEmail: invite.inviteeEmail,
    status: invite.status,
    acceptable: isInviteAcceptable(invite, new Date()),
    ownerName: invite.vault.user.name,
  };
}
