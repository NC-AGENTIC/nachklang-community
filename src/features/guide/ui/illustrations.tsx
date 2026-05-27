// src/features/guide/ui/illustrations.tsx
import type { ComponentType, ReactNode } from "react";

import type { IllustrationKey } from "../content/types";

const NAVY = "#062535";
const TEAL = "#11766d";
const AMBER = "#8a5b16";
const TEAL_SOFT = "#dcefeb";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 96 96" width="96" height="96" fill="none" role="img" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function Welcome() {
  return (
    <Svg>
      <circle cx="48" cy="48" r="34" fill={TEAL_SOFT} />
      <path d="M20 48h10l5-14 9 28 8-22 5 8h19" stroke={TEAL} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="48" cy="48" r="34" stroke={NAVY} strokeWidth="2" />
    </Svg>
  );
}

function AccountCreate() {
  return (
    <Svg>
      <rect x="16" y="26" width="52" height="38" rx="4" fill={TEAL_SOFT} stroke={NAVY} strokeWidth="2" />
      <path d="M18 30l24 18 24-18" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="72" cy="62" r="14" fill="#fff" stroke={AMBER} strokeWidth="2.5" />
      <path d="M72 56v12M66 62h12" stroke={AMBER} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function PasskeyOnboard() {
  return (
    <Svg>
      <circle cx="40" cy="42" r="22" fill={TEAL_SOFT} />
      <path d="M30 42a10 10 0 0120 0M34 48a12 12 0 0112-6M40 54c0-6 0-9 0-12" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M58 50l18 18M68 60l-4 4M74 66l-4 4" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
      <circle cx="58" cy="50" r="6" fill="#fff" stroke={NAVY} strokeWidth="2.5" />
    </Svg>
  );
}

function RecoveryCode() {
  return (
    <Svg>
      <rect x="18" y="24" width="60" height="40" rx="4" fill="#fff" stroke={NAVY} strokeWidth="2" />
      <rect x="18" y="64" width="60" height="10" rx="2" fill={TEAL_SOFT} stroke={NAVY} strokeWidth="2" />
      <path d="M26 36h20M26 44h32M26 52h26" stroke={TEAL} strokeWidth="3" strokeLinecap="round" strokeDasharray="6 5" />
      <circle cx="66" cy="40" r="7" fill="none" stroke={AMBER} strokeWidth="2.5" />
    </Svg>
  );
}

function MultiDevice() {
  return (
    <Svg>
      <rect x="14" y="26" width="44" height="30" rx="3" fill={TEAL_SOFT} stroke={NAVY} strokeWidth="2" />
      <path d="M10 60h52" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="58" y="40" width="24" height="36" rx="4" fill="#fff" stroke={NAVY} strokeWidth="2" />
      <circle cx="70" cy="70" r="2" fill={NAVY} />
      <path d="M64 50h12" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 41l6 6 10-12" stroke={AMBER} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function VaultEntry() {
  return (
    <Svg>
      <rect x="18" y="20" width="56" height="56" rx="6" fill={TEAL_SOFT} stroke={NAVY} strokeWidth="2" />
      <circle cx="46" cy="48" r="14" fill="#fff" stroke={NAVY} strokeWidth="2.5" />
      <circle cx="46" cy="48" r="4" fill={AMBER} />
      <path d="M46 48l8 8" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
      <path d="M64 40v16" stroke={TEAL} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function ShareTrustee() {
  return (
    <Svg>
      <circle cx="34" cy="38" r="10" fill={TEAL_SOFT} stroke={NAVY} strokeWidth="2" />
      <path d="M18 66c0-9 7-15 16-15s16 6 16 15" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="66" cy="42" r="8" fill="#fff" stroke={AMBER} strokeWidth="2.5" />
      <path d="M52 68c0-8 6-13 14-13s14 5 14 13" stroke={AMBER} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M44 34l10-4" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 4" />
    </Svg>
  );
}

function RevokeShare() {
  return (
    <Svg>
      <circle cx="40" cy="38" r="11" fill={TEAL_SOFT} stroke={NAVY} strokeWidth="2" />
      <path d="M22 66c0-10 8-16 18-16s18 6 18 16" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="66" cy="62" r="14" fill="#fff" stroke={AMBER} strokeWidth="2.5" />
      <path d="M57 53l18 18" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function DeleteAccount() {
  return (
    <Svg>
      <path d="M28 32h40l-4 40a4 4 0 01-4 4H36a4 4 0 01-4-4z" fill={TEAL_SOFT} stroke={NAVY} strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 32h52" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
      <path d="M40 26h16" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
      <path d="M42 44v22M54 44v22" stroke={AMBER} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

function ZeroKnowledgeLock() {
  return (
    <Svg>
      <rect x="24" y="44" width="48" height="34" rx="5" fill={TEAL_SOFT} stroke={NAVY} strokeWidth="2" />
      <path d="M34 44v-8a14 14 0 0128 0v8" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="48" cy="60" r="5" fill={AMBER} />
      <path d="M48 65v6" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
      <path d="M20 30c8 8 48 8 56 0" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 5" />
    </Svg>
  );
}

export const ILLUSTRATIONS: Record<IllustrationKey, ComponentType> = {
  welcome: Welcome,
  "account-create": AccountCreate,
  "passkey-onboard": PasskeyOnboard,
  "recovery-code": RecoveryCode,
  "multi-device": MultiDevice,
  "vault-entry": VaultEntry,
  "share-trustee": ShareTrustee,
  "revoke-share": RevokeShare,
  "delete-account": DeleteAccount,
  "zero-knowledge-lock": ZeroKnowledgeLock,
};
