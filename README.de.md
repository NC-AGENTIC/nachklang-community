[English](README.md) · [Deutsch](README.de.md)

# NachKlang

[![Lizenz: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue)](LICENSE)
[![CI](https://github.com/NC-AGENTIC/nachklang-community/actions/workflows/ci.yml/badge.svg)](https://github.com/NC-AGENTIC/nachklang-community/actions/workflows/ci.yml)
[![Sicherheitsrichtlinie](https://img.shields.io/badge/security-policy-brightgreen)](SECURITY.md)

**NachKlang** ist eine Zero-Knowledge-Webapp zur Verwaltung der *Metadaten* Ihrer
Online-Zugänge — damit Angehörige diese im Rahmen des digitalen Nachlasses finden und
auflösen können, ohne jemals Ihre Passwörter zu erhalten. Gespeichert werden nur
verschlüsselte Verwaltungsdaten: die Login-URL, die genutzte E-Mail/Benutzername und ein
Hinweis darauf, *wo* das eigentliche Passwort liegt — **niemals die externen Passwörter
selbst**, auch nicht verschlüsselt.

## Hauptmerkmale

- **Zero-Knowledge by Design.** Alle Tresordaten werden im Browser ver- und entschlüsselt. Der
  Server sieht ausschließlich Chiffretext und undurchsichtige, verpackte Schlüssel.
- **Passwortlose Anmeldung.** Anmeldung per **Passkey** (WebAuthn); E-Mail-Einmalcodes prüfen
  die Identität bei der Registrierung und dienen als Fallback-Login.
- **Starke clientseitige Kryptografie.** Argon2id-Schlüsselableitung, AES-256-GCM-
  Verschlüsselung und nicht-extrahierbare WebCrypto-Schlüssel. Der Root Key verlässt nie den
  Browser-Speicher.
- **Konto-Lebenszyklus.** Jeder Eintrag führt einen Status — *aktiv*, *stillgelegt*,
  *anbieter-informiert*, *gelöscht* — um Konten über die Zeit aufzulösen.
- **Lesender Vertrauenspersonen-Zugriff.** Geben Sie einer vertrauten Person Ende-zu-Ende-
  verschlüsselten, **nur lesenden** Zugriff auf Ihren Tresor (libsodium Sealed Boxes auf deren
  X25519-Schlüssel). Vor der Freigabe vergleichen Sie einen kurzen Bestätigungscode
  außerhalb der App, sehen ein Zugriffsprotokoll und können den Zugriff jederzeit widerrufen.
- **Automatische Sperre bei Inaktivität.** Der Tresor sperrt sich nach Inaktivität und beim
  Schließen des Tabs.
- **Portabler Export & vollständige Löschung.** Exportieren Sie Ihren Tresor in eine
  passwortgeschützte **AES-256-ZIP** — eine einfache CSV, die jede Tabellenkalkulation öffnet und
  die auch ohne NachKlang nutzbar ist — und löschen Sie Ihr gesamtes Konto jederzeit
  unwiderruflich (DSGVO-Datenportabilität & Löschung).
- **Mehrsprachige Oberfläche** (Deutsch als Standard, dazu Englisch, Französisch und Spanisch)
  mit sprachpräfigierten Routen via next-intl, auf Basis von Next.js 16, React 19, Prisma 7,
  PostgreSQL, libsodium und Better Auth.

## Dokumentation

- **[INSTALLATION.de.md](INSTALLATION.de.md)** — lokal betreiben, E-Mail (Microsoft Graph oder
  SMTP) konfigurieren und einen Testbenutzer anlegen. *(Auch auf [English](INSTALLATION.md).)*
- **[SECURITY.md](SECURITY.md)** — das Sicherheitsmodell, das Bedrohungsmodell und wie man
  eine Schwachstelle meldet (auf Englisch).
- **[docs/arc42/](docs/arc42/)** — die Architekturdokumentation (arc42, auf Englisch).

## Schnellstart

```bash
cp .env.example .env.local      # konfigurieren (siehe INSTALLATION.de.md)
npm install
DATABASE_URL="postgresql://nachklang:nachklang-dev-password@localhost:5432/nachklang?schema=public" \
  npm run db:generate
docker compose --profile migrate run --rm migrate
docker compose up --build
```

Die App läuft hinter Caddy unter **http://localhost**. Die vollständige Einrichtung —
einschließlich der **erforderlichen** E-Mail-Konfiguration — finden Sie in
**[INSTALLATION.de.md](INSTALLATION.de.md)**.

## Routen

Alle App-Routen sind sprachpräfigiert (`/de`, `/en`, `/fr`, `/es`); Pfade ohne Präfix leiten auf
die erkannte Sprache des Besuchers um (Cookie → `Accept-Language` → Deutsch als Standard). Die
Pfade unten sind ohne Präfix angegeben.

- `/` — Landingpage (verifizierte Nutzer werden zu `/vault` weitergeleitet); eine Sprachauswahl
  befindet sich oben rechts neben dem Anmelde-Link.
- `/signup` — Konto anlegen, per E-Mail-Einmalcode verifiziert.
- `/signin` — Passkey-Anmeldung, mit E-Mail-Code als Fallback, falls kein Passkey verfügbar ist.
- `/verify-email` — den E-Mail-Einmalcode der Registrierung bestätigen.
- `/onboarding` — Passkey-Einrichtung + Wiederherstellungscode für neue Konten.
- `/unlock` — Tresor entsperren (Passkey oder Wiederherstellungscode als Fallback).
- `/vault` — die Tresor-Arbeitsoberfläche.
- `/vault/settings` — Passkeys, Vertrauenspersonen, verschlüsselter Export und Kontolöschung.
- `/account` — Einstellungen für Vertrauenspersonen ohne eigenen Tresor.
- `/shared` und `/shared/[vaultId]` — nur lesender Zugriff auf mit Ihnen geteilte Tresore.
- `/shares/accept/[token]` — eine Einladung als Vertrauensperson annehmen.
- `/audit` — Ihr Transparenz-/Zugriffsprotokoll.
- `/impressum`, `/datenschutz`, `/copyright` — rechtliche Seiten.
- `/api/auth/*` — Better-Auth-Handler.

## Tests

```bash
npm test          # Vitest Unit- und Komponententests
npm run test:e2e  # Playwright End-to-End
```

## Lizenz

NachKlang steht unter der **PolyForm Noncommercial License 1.0.0** (siehe
**[LICENSE](LICENSE)**). **Nicht-kommerzielle Nutzung ist kostenlos.** **Jede kommerzielle
Nutzung** — einschließlich beliebiger Teile des Codes oder des Namens/der Logos/Markenelemente
von NachKlang — erfordert die vorherige schriftliche Genehmigung der **NC AGENTIC GmbH**. Siehe
**[NOTICE](NOTICE)** für Marken-/Logo-Bestimmungen.

Anfragen zur kommerziellen Lizenzierung: **info@nc-agentic.de**
