// src/features/guide/content/types.ts

// Single source of truth for illustration keys. The `as const` tuple gives us
// both a runtime list (for tests / iteration) and a compile-time union.
export const ILLUSTRATION_KEYS = [
  "welcome",
  "account-create",
  "passkey-onboard",
  "recovery-code",
  "multi-device",
  "vault-entry",
  "share-trustee",
  "revoke-share",
  "delete-account",
  "zero-knowledge-lock",
] as const;

export type IllustrationKey = (typeof ILLUSTRATION_KEYS)[number];

export type Callout = { kind: "tip" | "info"; text: string };

export type SecurityNote = { risk: string; mitigation: string };

export type GuideStep = {
  title: string;
  body: string;
  callout?: Callout;
  securityNote?: SecurityNote;
};

export type GuideSection = {
  /** Stable anchor slug — identical across locales (used in the URL hash). */
  id: string;
  /** Short label for the TOC. */
  navLabel: string;
  title: string;
  intro?: string;
  illustration: IllustrationKey;
  steps: GuideStep[];
  /** Used by the dedicated "Security & risks" section (which has no steps). */
  securityNotes?: SecurityNote[];
};

export type GuideContent = {
  eyebrow: string;
  title: string;
  lede: string;
  sections: GuideSection[];
};
