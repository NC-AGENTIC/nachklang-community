"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/features/i18n/ui/language-switcher";
import { 
  Lock, 
  Key, 
  Database, 
  ArrowLeft, 
  ArrowRight, 
  Play, 
  Pause, 
  ShieldCheck, 
  Code,
  Laptop,
  HelpCircle,
  RotateCcw
} from "lucide-react";

type Scenario = "bootstrap" | "entry";

const CODE_SNIPPETS = {
  bootstrap: [
    {
      title: "1. Root Key Generation (WebCrypto)",
      code: `// Generate a cryptographically strong, non-extractable AES-GCM Root Key
const rootKey = await window.crypto.subtle.generateKey(
  {
    name: "AES-GCM",
    length: 256
  },
  false, // CRITICAL: false makes the key non-extractable in RAM!
  ["encrypt", "decrypt"]
);`
    },
    {
      title: "2. WebAuthn PRF Extension (Passkey KEK)",
      code: `// Request biometric evaluation via WebAuthn PRF extension
const credential = await navigator.credentials.create({
  publicKey: {
    challenge: new Uint8Array(32),
    extensions: {
      prf: { eval: { first: new Uint8Array(32) } }
    }
  }
});

// Stretched via HKDF-SHA-256 to create a 256-bit KEK
const prfOutput = credential.getClientExtensionResults().prf.results.first;
const passkeyKek = await deriveKeyFromPrf(prfOutput);`
    },
    {
      title: "3. Argon2id KDF stretching (Recovery KEK)",
      code: `// Stretch a 120-bit Crockford-Base32 Recovery Code
// Requires high-memory, multi-threaded password hashing (libsodium)
const recoveryKek = libsodium.crypto_pwhash(
  32, // 256-bit key output
  recoveryCodeString,
  saltBytes,
  3, // iterations
  64 * 1024 * 1024, // 64 MiB memory limit
  libsodium.crypto_pwhash_ALG_ARGON2ID13
);`
    },
    {
      title: "4. Root Key Wrapping (AES-GCM)",
      code: `// Wrap the Root Key twice, creating independent cryptographic envelopes
const wrappedByPasskey = await window.crypto.subtle.wrapKey(
  "raw",
  rootKey,
  passkeyKek,
  {
    name: "AES-GCM",
    iv: passkeyIv,
    additionalData: new TextEncoder().encode("passkey-wrap")
  }
);

const wrappedByRecovery = await window.crypto.subtle.wrapKey(
  "raw",
  rootKey,
  recoveryKek,
  {
    name: "AES-GCM",
    iv: recoveryIv,
    additionalData: new TextEncoder().encode("recovery-wrap")
  }
);`
    },
    {
      title: "5. Zeroing Memory & Server Sync",
      code: `// Forcefully overwrite transient private keys in JS engine memory
libsodium.memzero(rootKeyRawBytes);
libsodium.memzero(recoveryCodeBytes);

// Sync only wrapped envelopes to the server (Zero-Knowledge)
await fetch("/api/vault/bootstrap", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    wrappedByPasskey: arrayBufferToBase64(wrappedByPasskey),
    wrappedByRecovery: arrayBufferToBase64(wrappedByRecovery)
  })
});`
    }
  ],
  entry: [
    {
      title: "1. Client Schema Check",
      code: `// Client validation intercepts and rejects raw secrets
function assertNoSecretFields(payload: Record<string, unknown>) {
  const secretPattern = /(password|passwort|pin|secret|key|token)/i;
  for (const [key, value] of Object.entries(payload)) {
    if (secretPattern.test(key) && looksLikePlaintextSecret(value)) {
      throw new Error(
        "Plaintext secret detected! NachKlang vaults only store references."
      );
    }
  }
}`
    },
    {
      title: "2. AAD (Additional Authenticated Data) Binding",
      code: `// Bind structural metadata as authenticated parameters to prevent:
// 1. Vault-shifting attacks (moving entries between vaults)
// 2. Replay/Revision tampering
const AAD = new TextEncoder().encode(
  JSON.stringify({
    vaultId: "vlt_7b8a2e...",
    itemId: "itm_3f2b1d...",
    ownerId: "usr_9a1e8c...",
    revision: 1
  })
);`
    },
    {
      title: "3. AES-256-GCM Client Encryption",
      code: `// Encrypt the payload using the client's non-extractable Root Key
const iv = window.crypto.getRandomValues(new Uint8Array(12));
const plaintextBytes = new TextEncoder().encode(JSON.stringify(itemContent));

const ciphertext = await window.crypto.subtle.encrypt(
  {
    name: "AES-GCM",
    iv: iv,
    additionalData: AAD // Cryptographically binds metadata to cipher
  },
  rootKey,
  plaintextBytes
);`
    },
    {
      title: "4. Server Sync & Zero-Knowledge Storage",
      code: `// Send only ciphertext, IV, and the AAD metadata to the database
// The server cannot read the payload as it lacks the client-side Root Key
await fetch("/api/vault/entry", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
    aad: JSON.parse(new TextDecoder().decode(AAD))
  })
});`
    }
  ]
};

export function SecurityPage() {
  const t = useTranslations("security");
  const tCommon = useTranslations("common");

  const [isNerd, setIsNerd] = useState<boolean>(false);
  const [scenario, setScenario] = useState<Scenario>("bootstrap");
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stepsCount = scenario === "bootstrap" ? 5 : 4;

  // Handle auto-playing timeline
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % stepsCount);
      }, 5500);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, stepsCount, scenario]);

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => (prev + 1) % stepsCount);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => (prev - 1 + stepsCount) % stepsCount);
  };

  const handleStepClick = (idx: number) => {
    setIsPlaying(false);
    setCurrentStep(idx);
  };

  const handleScenarioChange = (scen: Scenario) => {
    setIsPlaying(false);
    setScenario(scen);
    setCurrentStep(0);
    // Give it a tiny delay then play if desired, or keep paused
    setIsPlaying(true);
  };

  const getStepText = (scen: Scenario, idx: number, nerdMode: boolean) => {
    const key = `${nerdMode ? "nerd" : "average"}.${scen}.step${idx + 1}`;
    // Fallback in case of missing keys
    try {
      return t(key);
    } catch {
      return `Step ${idx + 1} translation missing.`;
    }
  };

  return (
    <div className="security-page">
      {/* Branding and Navigation Header */}
      <header className="landing__top">
        <Link href="/" className="landing__wordmark" aria-label="NachKlang">
          <span aria-hidden="true" className="landing__wordmark-mark" />
          <span className="landing__wordmark-text">
            Nach<em>Klang</em>
          </span>
        </Link>
        <div className="landing__top-actions">
          <LanguageSwitcher ariaLabel={tCommon("languageSwitcherAria")} />
          <Link href="/" className="landing__topcta landing__topcta--guide">
            {t("backTop")}
          </Link>
        </div>
      </header>

      {/* Hero Headline */}
      <section className="security-hero">
        <p className="landing__eyebrow">
          <span aria-hidden="true" className="landing__eyebrow-rule" />
          {t("metaTitle").split("·")[0].toUpperCase()}
        </p>
        <h1 className="security-headline">
          {t("title")}
        </h1>
        <p className="security-subtitle">
          {t("subtitle")}
        </p>
      </section>

      {/* Main Mode Controllers & Visual Grid */}
      <div className="security-layout">
        
        {/* Left Side: Explanations and Steps */}
        <div className="security-controls">
          {/* View Toggle (Simple vs. Tech) */}
          <div className="toggle-group-container">
            <span className="toggle-group-label">{t("audienceLabel")}:</span>
            <div className="toggle-group">
              <button 
                type="button"
                className={`toggle-btn ${!isNerd ? "active" : ""}`}
                onClick={() => setIsNerd(false)}
              >
                <HelpCircle size={16} />
                {t("tabSimple")}
              </button>
              <button 
                type="button"
                className={`toggle-btn ${isNerd ? "active" : ""}`}
                onClick={() => setIsNerd(true)}
              >
                <Code size={16} />
                {t("tabNerd")}
              </button>
            </div>
          </div>

          {/* Scenario Toggle */}
          <div className="scenario-tabs">
            <button
              type="button"
              className={`scenario-tab ${scenario === "bootstrap" ? "active" : ""}`}
              onClick={() => handleScenarioChange("bootstrap")}
            >
              <Key size={18} />
              <span>{t("toggleBootstrap")}</span>
            </button>
            <button
              type="button"
              className={`scenario-tab ${scenario === "entry" ? "active" : ""}`}
              onClick={() => handleScenarioChange("entry")}
            >
              <Lock size={18} />
              <span>{t("toggleEntry")}</span>
            </button>
          </div>

          {/* Current Step Description Card */}
          <div className="step-card">
            <div className="step-card__header">
              <span className="step-badge">
                {t("stepLabel")} {currentStep + 1} / {stepsCount}
              </span>
              {isPlaying && (
                <span className="playing-pulse">
                  <span className="pulse-dot" />
                  {t("autoLabel")}
                </span>
              )}
            </div>
            
            <p className="step-card__text">
              {getStepText(scenario, currentStep, isNerd)}
            </p>

            {/* Timeline navigation */}
            <div className="step-nav">
              <button 
                type="button"
                className="step-nav-btn" 
                onClick={handlePrev} 
                aria-label="Previous step"
              >
                <ArrowLeft size={16} />
              </button>
              
              <div className="step-dots">
                {Array.from({ length: stepsCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`step-dot ${currentStep === i ? "active" : ""}`}
                    onClick={() => handleStepClick(i)}
                    aria-label={`Go to step ${i + 1}`}
                  />
                ))}
              </div>

              <button 
                type="button"
                className="step-nav-btn" 
                onClick={handleNext} 
                aria-label="Next step"
              >
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="step-play-btn"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pause auto-play" : "Start auto-play"}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
            </div>
          </div>

          {/* Quick Architecture Note */}
          <div className="arch-note">
            <ShieldCheck className="arch-note__icon" size={20} />
            <div>
              <strong>{t("assuranceTitle")}</strong>
              <p>
                {scenario === "bootstrap"
                  ? t("assuranceBootstrap")
                  : t("assuranceEntry")}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Animated SVG Visualizer & Code Snip Tabs */}
        <div className="security-visuals">
          
          {/* Animated SVG Container */}
          <div className="visualizer-canvas">
            <div className="canvas-labels">
              <span className="canvas-label client-label">
                <Laptop size={14} />
                {t("client")}
              </span>
              <span className="canvas-label server-label">
                <Database size={14} />
                {t("server")}
              </span>
            </div>

            <svg viewBox="0 0 800 420" className="security-svg" xmlns="http://www.w3.org/2000/svg">
              {/* Definitions for gradients and shadows */}
              <defs>
                <linearGradient id="glow-teal" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#11766d" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#11766d" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="glow-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8a5b16" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#8a5b16" stopOpacity="0" />
                </linearGradient>
                <filter id="shadow-filter" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#062535" floodOpacity="0.08" />
                </filter>
                <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Zero-Knowledge Security Boundary (Center Divider) */}
              <line 
                x1="400" 
                y1="30" 
                x2="400" 
                y2="390" 
                stroke="var(--navy)" 
                strokeWidth="1.5" 
                strokeDasharray="6 6" 
                opacity="0.3"
              />
              <rect 
                x="320" 
                y="195" 
                width="160" 
                height="30" 
                rx="15" 
                fill="#f4ede0" 
                stroke="var(--navy)" 
                strokeWidth="1"
              />
              <text 
                x="400" 
                y="214" 
                textAnchor="middle" 
                fill="var(--navy)" 
                fontSize="10" 
                fontWeight="600" 
                letterSpacing="1"
              >
                ZERO KNOWLEDGE
              </text>

              {/* ==================== CLIENT SIDE (0px to 380px) ==================== */}
              {/* Browser / Client Box */}
              <rect 
                x="30" 
                y="40" 
                width="320" 
                height="340" 
                rx="16" 
                fill="var(--surface)" 
                stroke="var(--line-strong)" 
                strokeWidth="1.5" 
                filter="url(#shadow-filter)" 
              />
              {/* Browser Header Bar */}
              <path 
                d="M 30 56 A 16 16 0 0 1 46 40 L 334 40 A 16 16 0 0 1 350 56 L 350 72 L 30 72 Z" 
                fill="var(--surface-subtle)" 
                stroke="var(--line)"
              />
              {/* Browser Dots */}
              <circle cx="50" cy="56" r="4" fill="var(--danger)" opacity="0.6" />
              <circle cx="62" cy="56" r="4" fill="var(--amber)" opacity="0.6" />
              <circle cx="74" cy="56" r="4" fill="var(--teal)" opacity="0.6" />
              <text x="95" y="60" fontSize="10" fill="var(--ink-muted)" fontWeight="500">localhost:3000</text>

              {/* Scenario: BOOTSTRAP - Client Side */}
              {scenario === "bootstrap" && (
                <g>
                  {/* Step 1: Root Key Generator */}
                  <g opacity={currentStep >= 0 ? 1 : 0.25} style={{ transition: "opacity 0.5s" }}>
                    <rect 
                      x="60" 
                      y="100" 
                      width="110" 
                      height="80" 
                      rx="8" 
                      fill={currentStep === 0 ? "var(--amber-soft)" : "var(--surface-subtle)"} 
                      stroke={currentStep === 0 ? "var(--amber)" : "var(--line)"} 
                      strokeWidth="1.5" 
                    />
                    <text x="115" y="125" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--navy)">WebCrypto Engine</text>
                    
                    {/* Golden Root Key Icon inside engine */}
                    <g transform="translate(100, 135) scale(0.9)">
                      <path 
                        d="M10 20a10 10 0 1 1-10-10 10 10 0 0 1 10 10zm-1.8 1.8L13 17v-3h-3v3L8.2 21.8z" 
                        fill={currentStep >= 0 && currentStep < 4 ? "var(--amber)" : "var(--ink-muted)"}
                        opacity={currentStep === 4 ? 0.25 : 1}
                        className={currentStep === 0 ? "animate-pulse" : ""}
                        style={{ transformOrigin: "10px 20px" }}
                      />
                    </g>
                    {currentStep === 4 && (
                      <text x="115" y="165" textAnchor="middle" fontSize="9" fill="var(--danger)" fontWeight="600">WIPED (memzero)</text>
                    )}
                  </g>

                  {/* Step 2: Passkey PRF Lockbox */}
                  <g opacity={currentStep >= 1 ? 1 : 0.25} style={{ transition: "opacity 0.5s" }}>
                    <rect 
                      x="210" 
                      y="100" 
                      width="110" 
                      height="80" 
                      rx="8" 
                      fill={currentStep === 1 ? "var(--teal-soft)" : "var(--surface-subtle)"} 
                      stroke={currentStep === 1 ? "var(--teal)" : "var(--line)"} 
                      strokeWidth="1.5" 
                    />
                    <text x="265" y="125" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--navy)">Passkey PRF KEK</text>
                    <g transform="translate(253, 135) scale(0.9)">
                      <path d="M12 11c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.4 1.2-4.5 3-5.8" stroke="var(--teal)" strokeWidth="1.5" fill="none" />
                      <circle cx="5" cy="11" r="2" fill="var(--teal)" />
                      <path d="M5 2v4M2 5h6" stroke="var(--teal)" strokeWidth="1.5" />
                    </g>
                  </g>

                  {/* Step 3: Argon2id stretching */}
                  <g opacity={currentStep >= 2 ? 1 : 0.25} style={{ transition: "opacity 0.5s" }}>
                    <rect 
                      x="60" 
                      y="210" 
                      width="110" 
                      height="80" 
                      rx="8" 
                      fill={currentStep === 2 ? "var(--amber-soft)" : "var(--surface-subtle)"} 
                      stroke={currentStep === 2 ? "var(--amber)" : "var(--line)"} 
                      strokeWidth="1.5" 
                    />
                    <text x="115" y="235" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--navy)">Argon2id Stretch</text>
                    <text x="115" y="265" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--amber)" fontFamily="monospace">
                      64 MiB RAM
                    </text>
                  </g>

                  {/* Step 4: Wrapping envelopes */}
                  <g opacity={currentStep >= 3 ? 1 : 0.25} style={{ transition: "opacity 0.5s" }}>
                    {/* Envelope 1: Wrapped by Passkey */}
                    <g transform="translate(200, 210)">
                      <rect 
                        width="60" 
                        height="40" 
                        rx="4" 
                        fill="var(--surface)" 
                        stroke={currentStep === 3 ? "var(--teal)" : "var(--line)"} 
                        strokeWidth="1.5" 
                      />
                      <path d="M 0 0 L 30 20 L 60 0" fill="none" stroke={currentStep === 3 ? "var(--teal)" : "var(--line)"} strokeWidth="1.5" />
                      <rect x="23" y="12" width="14" height="18" rx="2" fill="var(--teal-soft)" stroke="var(--teal)" strokeWidth="1"/>
                      <text x="30" y="24" textAnchor="middle" fontSize="7" fill="var(--teal)" fontWeight="600">PK</text>
                    </g>
                    
                    {/* Envelope 2: Wrapped by Recovery */}
                    <g transform="translate(270, 210)">
                      <rect 
                        width="60" 
                        height="40" 
                        rx="4" 
                        fill="var(--surface)" 
                        stroke={currentStep === 3 ? "var(--amber)" : "var(--line)"} 
                        strokeWidth="1.5" 
                      />
                      <path d="M 0 0 L 30 20 L 60 0" fill="none" stroke={currentStep === 3 ? "var(--amber)" : "var(--line)"} strokeWidth="1.5" />
                      <rect x="23" y="12" width="14" height="18" rx="2" fill="var(--amber-soft)" stroke="var(--amber)" strokeWidth="1"/>
                      <text x="30" y="24" textAnchor="middle" fontSize="7" fill="var(--amber)" fontWeight="600">REC</text>
                    </g>

                    <text x="265" y="275" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--navy)">Wrapped Envelopes</text>
                  </g>

                  {/* Flow line animation to server */}
                  {currentStep === 4 && (
                    <g>
                      {/* Flow Path 1 */}
                      <path 
                        d="M 260 210 C 350 210, 350 150, 480 150" 
                        fill="none" 
                        stroke="var(--teal)" 
                        strokeWidth="2" 
                        strokeDasharray="5 5" 
                        className="animate-flow"
                      />
                      {/* Flow Path 2 */}
                      <path 
                        d="M 330 230 C 370 230, 400 250, 480 250" 
                        fill="none" 
                        stroke="var(--amber)" 
                        strokeWidth="2" 
                        strokeDasharray="5 5" 
                        className="animate-flow"
                      />
                    </g>
                  )}
                </g>
              )}

              {/* Scenario: ENTRY - Client Side */}
              {scenario === "entry" && (
                <g>
                  {/* Step 1: Input Check */}
                  <g opacity={currentStep >= 0 ? 1 : 0.25} style={{ transition: "opacity 0.5s" }}>
                    <rect 
                      x="60" 
                      y="100" 
                      width="120" 
                      height="80" 
                      rx="8" 
                      fill={currentStep === 0 ? "var(--teal-soft)" : "var(--surface-subtle)"} 
                      stroke={currentStep === 0 ? "var(--teal)" : "var(--line)"} 
                      strokeWidth="1.5" 
                    />
                    <text x="120" y="120" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--navy)">Schema Check</text>
                    
                    <g transform="translate(80, 130)">
                      <rect width="80" height="8" rx="2" fill="var(--line-strong)" />
                      <rect y="14" width="50" height="8" rx="2" fill="var(--line-strong)" />
                      <circle cx="65" cy="18" r="4" fill="var(--teal)" />
                      <path d="M 63 18 L 65 20 L 68 16" fill="none" stroke="white" strokeWidth="1" />
                    </g>
                    <text x="120" y="168" textAnchor="middle" fontSize="8" fill="var(--ink-muted)">no_secrets_asserted</text>
                  </g>

                  {/* Step 2: AAD Stamp */}
                  <g opacity={currentStep >= 1 ? 1 : 0.25} style={{ transition: "opacity 0.5s" }}>
                    <rect 
                      x="210" 
                      y="100" 
                      width="120" 
                      height="80" 
                      rx="8" 
                      fill={currentStep === 1 ? "var(--amber-soft)" : "var(--surface-subtle)"} 
                      stroke={currentStep === 1 ? "var(--amber)" : "var(--line)"} 
                      strokeWidth="1.5" 
                    />
                    <text x="270" y="120" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--navy)">AAD Metadata</text>
                    
                    <rect x="230" y="132" width="80" height="24" rx="4" fill="var(--surface)" stroke="var(--amber)" strokeWidth="1.5" />
                    <text x="270" y="147" textAnchor="middle" fontSize="8" fill="var(--amber)" fontWeight="700">TAG: VAULT + OWNER</text>
                    
                    <text x="270" y="170" textAnchor="middle" fontSize="8" fill="var(--ink-muted)">Cryptographic Binding</text>
                  </g>

                  {/* Step 3: Local AES-256-GCM Encryption */}
                  <g opacity={currentStep >= 2 ? 1 : 0.25} style={{ transition: "opacity 0.5s" }}>
                    <rect 
                      x="130" 
                      y="210" 
                      width="140" 
                      height="90" 
                      rx="8" 
                      fill={currentStep === 2 ? "var(--teal-soft)" : "var(--surface-subtle)"} 
                      stroke={currentStep === 2 ? "var(--teal)" : "var(--line)"} 
                      strokeWidth="1.5" 
                    />
                    <text x="200" y="230" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--navy)">AES-256-GCM Engine</text>

                    {/* Lock Icon */}
                    <g transform="translate(192, 242)">
                      <rect x="0" y="8" width="16" height="12" rx="2" fill="var(--teal)" />
                      <path d="M3 8 V5 A 5 5 0 0 1 13 8 V8" fill="none" stroke="var(--teal)" strokeWidth="2" />
                    </g>
                    <text x="200" y="285" textAnchor="middle" fontSize="8" fill="var(--teal)" fontWeight="600">CLIENT CIPHERTEXT</text>
                  </g>

                  {/* Flow line animation to server */}
                  {currentStep === 3 && (
                    <g>
                      <path 
                        d="M 270 255 C 330 255, 360 210, 480 210" 
                        fill="none" 
                        stroke="var(--teal)" 
                        strokeWidth="2" 
                        strokeDasharray="5 5" 
                        className="animate-flow"
                      />
                    </g>
                  )}
                </g>
              )}


              {/* ==================== SERVER SIDE (420px to 800px) ==================== */}
              {/* Server cabinet */}
              <rect 
                x="450" 
                y="40" 
                width="320" 
                height="340" 
                rx="16" 
                fill="var(--navy)" 
                stroke="var(--navy-soft)" 
                strokeWidth="1.5" 
                filter="url(#shadow-filter)" 
              />
              {/* Server Racks */}
              {/* Rack 1 */}
              <rect x="470" y="70" width="280" height="70" rx="8" fill="#0d3348" />
              <circle cx="490" cy="105" r="4" fill="#11766d" className="animate-pulse" />
              <circle cx="505" cy="105" r="4" fill="#8a5b16" />
              <line x1="530" y1="105" x2="710" y2="105" stroke="#1c4d68" strokeWidth="3" strokeDasharray="3 8" />
              
              {/* Rack 2 */}
              <rect x="470" y="160" width="280" height="70" rx="8" fill="#0d3348" />
              <circle cx="490" cy="195" r="4" fill="#11766d" />
              <circle cx="505" cy="195" r="4" fill="#8a5b16" className="animate-pulse" />
              <line x1="530" y1="195" x2="710" y2="195" stroke="#1c4d68" strokeWidth="3" strokeDasharray="5 4" />

              {/* Rack 3 */}
              <rect x="470" y="250" width="280" height="70" rx="8" fill="#0d3348" />
              <circle cx="490" cy="285" r="4" fill="#11766d" className="animate-pulse" />
              <circle cx="505" cy="285" r="4" fill="#8a5b16" />
              <line x1="530" y1="285" x2="710" y2="285" stroke="#1c4d68" strokeWidth="3" strokeDasharray="2 6" />

              {/* Scenario: BOOTSTRAP - Server Storage */}
              {scenario === "bootstrap" && currentStep === 4 && (
                <g>
                  {/* Encrypted Envelope storing on Server */}
                  <g transform="translate(560, 90) scale(0.8)">
                    <rect width="60" height="40" rx="4" fill="#11766d" stroke="white" strokeWidth="1.5" />
                    <path d="M 0 0 L 30 20 L 60 0" fill="none" stroke="white" strokeWidth="1.5" />
                    <rect x="23" y="12" width="14" height="18" rx="2" fill="#fff2cf" />
                    <text x="30" y="24" textAnchor="middle" fontSize="8" fill="var(--amber)" fontWeight="700">PK</text>
                  </g>

                  <g transform="translate(630, 180) scale(0.8)">
                    <rect width="60" height="40" rx="4" fill="#8a5b16" stroke="white" strokeWidth="1.5" />
                    <path d="M 0 0 L 30 20 L 60 0" fill="none" stroke="white" strokeWidth="1.5" />
                    <rect x="23" y="12" width="14" height="18" rx="2" fill="#dcefeb" />
                    <text x="30" y="24" textAnchor="middle" fontSize="8" fill="var(--teal)" fontWeight="700">REC</text>
                  </g>

                  <rect x="520" y="335" width="180" height="25" rx="4" fill="#11766d" opacity="0.9" />
                  <text x="610" y="351" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" letterSpacing="0.5">
                    STORED WRAPPED ENVELOPES ONLY
                  </text>
                </g>
              )}

              {/* Scenario: ENTRY - Server Storage */}
              {scenario === "entry" && currentStep === 3 && (
                <g>
                  {/* Stored encrypted entry block on Server */}
                  <g transform="translate(580, 175)">
                    <rect width="100" height="50" rx="6" fill="#11766d" stroke="white" strokeWidth="1.5" />
                    {/* Scrambled Ciphertext lines */}
                    <line x1="15" y1="15" x2="85" y2="15" stroke="white" strokeWidth="2" opacity="0.7" />
                    <line x1="15" y1="25" x2="70" y2="25" stroke="white" strokeWidth="2" opacity="0.7" />
                    <line x1="15" y1="35" x2="60" y2="35" stroke="white" strokeWidth="2" opacity="0.7" />
                    {/* Padlock */}
                    <g transform="translate(74, 25) scale(0.8)">
                      <rect x="0" y="6" width="12" height="9" rx="1.5" fill="#8a5b16" />
                      <path d="M2 6 V4 A 3 3 0 0 1 10 6 V6" fill="none" stroke="#8a5b16" strokeWidth="1.5" />
                    </g>
                  </g>

                  <rect x="520" y="335" width="180" height="25" rx="4" fill="#11766d" opacity="0.9" />
                  <text x="610" y="351" textAnchor="middle" fill="white" fontSize="9" fontWeight="600" letterSpacing="0.5">
                    CIPHERTEXT stored. Decrypt key missing.
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Nerd-View Code Snippet Board */}
          {isNerd && (
            <div className="code-editor-board">
              <div className="code-editor-board__header">
                <span className="code-editor-board__dot" style={{ backgroundColor: "#ff5f56" }} />
                <span className="code-editor-board__dot" style={{ backgroundColor: "#ffbd2e" }} />
                <span className="code-editor-board__dot" style={{ backgroundColor: "#27c93f" }} />
                <span className="code-editor-board__title">
                  {CODE_SNIPPETS[scenario][currentStep]?.title || "Client Cryptography Code"}
                </span>
              </div>
              <pre className="code-editor-board__pre">
                <code className="code-editor-board__code">
                  {CODE_SNIPPETS[scenario][currentStep]?.code || ""}
                </code>
              </pre>
            </div>
          )}

        </div>

      </div>

      {/* Trust & Back Strips */}
      <section className="security-footer-links">
        <Link href="/" className="security-back-btn">
          <RotateCcw size={16} />
          <span>{t("backHome")}</span>
        </Link>
      </section>
    </div>
  );
}
