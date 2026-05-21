import { z } from "zod";

import { assertVaultWriteAllowed, type VaultMember } from "./vault-permissions";
import {
  LIFECYCLE_STATUSES,
  type LifecycleStatus,
  assertNoSecretFields,
  type VaultEntry,
  type VaultEntryInput,
  vaultEntrySchema,
} from "./vault-entry";
import type { DecryptedVaultItem } from "../data/vault-items-client";

// SP7: the displayed status is the account's lifecycle status.
export type VaultEntryStatus = LifecycleStatus;

export type VaultWorklistEntry = VaultEntry & {
  itemId: string;
  revision: number;
  status: VaultEntryStatus;
  createdAt: string;
  updatedAt: string;
};

export type VaultWorklistCreateOptions = {
  idFactory?: () => string;
  now?: Date;
};

export const vaultWorklistEntrySchema = z
  .object({
    itemId: z.string().min(1).max(160),
    revision: z.number().int().positive(),
    providerId: z.string().min(1).max(120),
    displayName: z.string().min(1).max(160),
    loginUrl: z.url().refine((value) => value.startsWith("https://"), "Only HTTPS login URLs are allowed."),
    emailUsed: z.email().max(254).optional().or(z.literal("")),
    username: z.string().max(160).optional().or(z.literal("")),
    passwordLocationHint: z.string().max(240).optional().or(z.literal("")),
    notes: z.string().max(2_000).optional().or(z.literal("")),
    tags: z.array(z.string().min(1).max(40)).max(12).default([]),
    lifecycleStatus: z.enum(LIFECYCLE_STATUSES).default("aktiv"),
    lastReviewedAt: z.iso.date().optional(),
    status: z.enum(LIFECYCLE_STATUSES),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((value, context) => {
    try {
      assertNoSecretFields(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Secret fields are not allowed.",
      });
    }
  });

export function createVaultWorklistEntry(
  actor: VaultMember,
  input: VaultEntryInput,
  options: VaultWorklistCreateOptions = {},
): VaultWorklistEntry {
  assertVaultWriteAllowed(actor);
  const now = options.now ?? new Date();
  const isoNow = now.toISOString();
  const plaintext = vaultEntrySchema.parse(input);

  return vaultWorklistEntrySchema.parse({
    ...plaintext,
    itemId: options.idFactory?.() ?? crypto.randomUUID(),
    revision: 1,
    status: plaintext.lifecycleStatus,
    createdAt: isoNow,
    updatedAt: isoNow,
  });
}

export function updateVaultWorklistEntry(
  actor: VaultMember,
  entry: VaultWorklistEntry,
  patch: Partial<VaultEntry>,
  now = new Date(),
): VaultWorklistEntry {
  assertVaultWriteAllowed(actor);
  const current = vaultWorklistEntrySchema.parse(entry);
  const plaintext = vaultEntrySchema.parse({
    providerId: patch.providerId ?? current.providerId,
    displayName: patch.displayName ?? current.displayName,
    loginUrl: patch.loginUrl ?? current.loginUrl,
    emailUsed: patch.emailUsed ?? current.emailUsed ?? "",
    username: patch.username ?? current.username ?? "",
    passwordLocationHint: patch.passwordLocationHint ?? current.passwordLocationHint ?? "",
    notes: patch.notes ?? current.notes ?? "",
    tags: patch.tags ?? current.tags,
    lifecycleStatus: patch.lifecycleStatus ?? current.lifecycleStatus,
  });

  return vaultWorklistEntrySchema.parse({
    ...current,
    ...plaintext,
    revision: current.revision + 1,
    status: plaintext.lifecycleStatus,
    updatedAt: now.toISOString(),
  });
}

export function deleteVaultWorklistEntry(
  actor: VaultMember,
  entries: readonly VaultWorklistEntry[],
  itemId: string,
): VaultWorklistEntry[] {
  assertVaultWriteAllowed(actor);
  return entries.filter((entry) => entry.itemId !== itemId);
}

export function toVaultWorklistEntry(
  item: Omit<DecryptedVaultItem, "entry"> & { entry: VaultEntryInput },
): VaultWorklistEntry {
  const lifecycleStatus = item.entry.lifecycleStatus ?? "aktiv";
  return vaultWorklistEntrySchema.parse({
    ...item.entry,
    itemId: item.itemId,
    revision: item.revision,
    lifecycleStatus,
    status: lifecycleStatus,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    tags: item.entry.tags ?? [],
    emailUsed: item.entry.emailUsed ?? "",
    username: item.entry.username ?? "",
    passwordLocationHint: item.entry.passwordLocationHint ?? "",
    notes: item.entry.notes ?? "",
  });
}
