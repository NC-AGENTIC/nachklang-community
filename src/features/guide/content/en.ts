// src/features/guide/content/en.ts
import type { GuideContent } from "./types";

export const guideEn: GuideContent = {
  eyebrow: "Guide · Step by step",
  title: "How NachKlang works",
  lede: "From signing up to passing everything on to your loved ones — explained in simple steps, no technical knowledge required.",
  sections: [
    {
      id: "willkommen",
      navLabel: "Welcome",
      title: "Welcome to NachKlang",
      intro:
        "NachKlang is a digital vault for your online accounts — and a way to one day leave them to the right people. The key point: we never get to see your passwords.",
      illustration: "zero-knowledge-lock",
      steps: [
        {
          title: "What you'll do here",
          body: "This guide walks you step by step through setting up your account, securing it, adding entries, and deciding who may receive them later.",
        },
        {
          title: "No prior knowledge needed",
          body: "Just follow the sections top to bottom — or jump straight to a topic using the menu on the left.",
          securityNote: {
            risk: "How can a provider read my stored data?",
            mitigation:
              "With NachKlang it can't: your entries are encrypted on your device before they reach us. All we hold is unreadable ciphertext.",
          },
        },
      ],
    },
    {
      id: "konto",
      navLabel: "Create account",
      title: "Create your account",
      intro: "You start with your email address — no password required.",
      illustration: "account-create",
      steps: [
        { title: "Enter your email", body: "Click “Create account” and enter your email address and your name." },
        {
          title: "Confirm the one-time code",
          body: "We email you a six-digit code. Enter it to confirm your address.",
          securityNote: {
            risk: "Passwords can be stolen, guessed or reused.",
            mitigation: "That's why there is no password at sign-in. The one-time code is valid for only a few minutes and works exactly once.",
          },
        },
      ],
    },
    {
      id: "passkey",
      navLabel: "Set up a passkey",
      title: "Set up a passkey",
      intro: "A passkey is your modern key — it replaces both password and SMS code at once.",
      illustration: "passkey-onboard",
      steps: [
        {
          title: "Create a passkey",
          body: "Your device asks for Face ID, your fingerprint or your security key. This creates a key that never leaves the device.",
        },
        {
          title: "What is a passkey?",
          body: "Instead of a password you type (and could give away), your device itself proves it's you. That's more convenient and far safer.",
          securityNote: {
            risk: "Fake websites (“phishing”) try to capture your password.",
            mitigation: "A passkey only works on the real NachKlang address. On a fake page it simply cannot be used.",
          },
        },
      ],
    },
    {
      id: "recovery",
      navLabel: "Recovery code",
      title: "Save your recovery code",
      intro: "The recovery code is your spare key in case a device is ever lost.",
      illustration: "recovery-code",
      steps: [
        { title: "Write the code down", body: "You receive a one-time recovery code. Print it or copy it down and keep it somewhere safe." },
        {
          title: "Confirm the code",
          body: "For safety you enter the code once more — that confirms you really saved it.",
          securityNote: {
            risk: "If you lose both your device and the recovery code, no one — not even we — can reopen your vault.",
            mitigation: "That's exactly what “zero-knowledge” means. Keep the code separate from your device, e.g. in a folder at home or a safe-deposit box.",
          },
        },
      ],
    },
    {
      id: "geraete",
      navLabel: "More devices",
      title: "Add more devices",
      intro: "You can use your vault on several devices — each gets its own passkey.",
      illustration: "multi-device",
      steps: [
        { title: "Sign in on the new device", body: "Open NachKlang on the second device and sign in — with your email or your recovery code." },
        {
          title: "Add the device",
          body: "Go to settings and choose “Add this device”. Now you can open the vault here too with Face ID or your fingerprint.",
        },
        {
          title: "Manage devices",
          body: "Your list of passkeys shows every device. You can remove lost devices at any time.",
          securityNote: {
            risk: "A lost or stolen device could fall into the wrong hands.",
            mitigation:
              "Remove that device's passkey in settings — it can no longer open your vault. The last remaining passkey can't be deleted, so you never lock yourself out completely.",
          },
        },
      ],
    },
    {
      id: "eintraege",
      navLabel: "Add entries",
      title: "Add vault entries",
      intro: "Now fill your vault with your online accounts.",
      illustration: "vault-entry",
      steps: [
        { title: "Create a new entry", body: "Click “Add new access” and fill in the name, website address, username and, if you like, notes." },
        {
          title: "Save",
          body: "“Save entry” adds it to your list. You can edit or delete it any time.",
          securityNote: {
            risk: "Data could be intercepted on its way across the internet.",
            mitigation: "Every entry is encrypted on your device first. Only unreadable ciphertext reaches us — and that's how it's stored.",
          },
        },
      ],
    },
    {
      id: "teilen",
      navLabel: "Share",
      title: "Share with trusted people",
      intro: "You decide who may one day view your vault — for example family or close friends.",
      illustration: "share-trustee",
      steps: [
        { title: "Invite a person", body: "Enter your trusted person's email address. They receive an invitation by link." },
        {
          title: "Accept the invitation",
          body: "They open the link and confirm. After that they can read your entries — but not change them.",
          securityNote: {
            risk: "Anyone you grant access to can see your entries.",
            mitigation:
              "Only share with people you truly trust. Sharing is end-to-end encrypted — only the invited person and you can read the contents, not us.",
          },
        },
      ],
    },
    {
      id: "widerrufen",
      navLabel: "Revoke",
      title: "Revoke access",
      intro: "Sharing isn't final — you can take it back at any time.",
      illustration: "revoke-share",
      steps: [
        { title: "Open your shares", body: "The “Shared” overview lists everyone who has access." },
        {
          title: "Withdraw access",
          body: "Click “Revoke” next to the person. From now on they have no further access.",
          securityNote: {
            risk: "What someone has already seen or exported cannot be taken back.",
            mitigation: "Revoking blocks any further access. So review a share calmly beforehand — and revoke early if in doubt.",
          },
        },
      ],
    },
    {
      id: "loeschen",
      navLabel: "Delete account",
      title: "Delete account & data",
      intro: "If you wish, you can remove all data completely and irreversibly.",
      illustration: "delete-account",
      steps: [
        { title: "Export first", body: "If needed, back up your entries via the export function first — afterwards they're no longer retrievable." },
        {
          title: "Delete the account",
          body: "Confirm your email address in settings and delete the account. Vault, shares and credentials disappear for good.",
          securityNote: {
            risk: "Deleted data is gone — with no recovery.",
            mitigation: "This is intentional and matches your right to erasure (GDPR). Export anything you want to keep beforehand.",
          },
        },
      ],
    },
    {
      id: "sicherheit",
      navLabel: "Security & risks",
      title: "Security & risks",
      intro: "Finally, the essentials in plain words: how NachKlang protects you — and where your own care matters.",
      illustration: "zero-knowledge-lock",
      steps: [],
      securityNotes: [
        {
          risk: "“Zero-knowledge” — what does it mean?",
          mitigation: "All content is encrypted and decrypted on your device. We only store unreadable ciphertext and hold no key to it.",
        },
        {
          risk: "Losing both device and recovery code",
          mitigation: "Then the vault can't be restored. Keep two ways open: a second device and the printed recovery code.",
        },
        {
          risk: "Malware on your own device",
          mitigation: "Encryption protects transfer and storage — not a device that's already infected. Keep your device and browser up to date.",
        },
        {
          risk: "Trust in the people you share with",
          mitigation: "Anyone with access can read. Choose trusted people carefully and revoke if in doubt.",
        },
        {
          risk: "Where is my data kept?",
          mitigation:
            "In Germany, under EU data protection. Backups are encrypted, and the key to them is kept separate and offline. The source code is open to inspect.",
        },
      ],
    },
  ],
};
