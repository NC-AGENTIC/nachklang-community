[English](INSTALLATION.md) · [Deutsch](INSTALLATION.de.md)

# Installation

So betreiben Sie NachKlang lokal und konfigurieren die wichtigsten Einstellungen. Kurz
gehalten: Die **erforderlichen** Einstellungen bringen die App zum Laufen; die
**E-Mail-Einstellungen** sind nötig, bevor sich überhaupt ein Benutzer anmelden kann (die
Identität wird per E-Mail-Einmalcode geprüft).

## Voraussetzungen

- **Docker** (Docker Desktop oder Engine) — der Stack läuft über Docker Compose.
- **Node.js 24 LTS** — zum Installieren der Abhängigkeiten und Erzeugen des Prisma-Clients.
- Ein **funktionierender E-Mail-Transport** — eine **Microsoft-Graph**-App-Registrierung
  (Azure AD) *oder* ein beliebiger **SMTP**-Server — für den Versand des Registrierungscodes.
  Siehe [E-Mail-Einrichtung](#e-mail-einrichtung-microsoft-graph). Ohne ihn kann sich kein
  Benutzer registrieren.

## Schnellstart

```bash
git clone https://github.com/NC-AGENTIC/nachklang-community.git
cd nachklang-community

cp .env.example .env.local          # danach .env.local bearbeiten (siehe unten)
npm install
DATABASE_URL="postgresql://nachklang:nachklang-dev-password@localhost:5432/nachklang?schema=public" \
  npm run db:generate               # Prisma-Client erzeugen

docker compose --profile migrate run --rm migrate   # DB-Schema anlegen/aktualisieren
docker compose up --build                            # postgres, valkey, web, caddy starten
```

Die App läuft hinter Caddy unter **http://localhost** (Port 80 → `web:3000`).

## Einstellungen

Bearbeiten Sie `.env.local` für die lokale Entwicklung. Produktion nutzt ausschließlich eine
`.env`-Datei auf dem Host.

### Erforderlich (App startet)

| Variable | Zweck |
| --- | --- |
| `BETTER_AUTH_SECRET` | Server-Geheimnis (64 zufällige Hex-/Base64-Zeichen). |
| `DATABASE_URL` | Postgres-Verbindungszeichenfolge. |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Zugangsdaten für den mitgelieferten Postgres-Container. |
| `NACHKLANG_APP_URL` / `BETTER_AUTH_URL` | Basis-URL der App (z. B. `http://localhost:3000`). |
| `WEBAUTHN_RP_ID` | Passkey-Relying-Party-ID (`localhost` lokal; Ihre Domain in Produktion). |

### Erforderlich für die Anmeldung (E-Mail-Einmalcodes)

NachKlang ist passwortlos: Registrierung und Anmeldung prüfen die Identität über einen
**E-Mail-Einmalcode**. Die App kann daher **ohne funktionierende E-Mail keinen Benutzer
anlegen oder anmelden**. Siehe [E-Mail-Einrichtung](#e-mail-einrichtung-microsoft-graph).

### Optional

| Variable | Zweck |
| --- | --- |
| `NACHKLANG_GRAPH_AUTH_MODE` | `certificate` (empfohlen) oder `client-secret`. Beide funktionieren in Produktion — siehe „Graph-Authentifizierungsmodi" unten. |
| `NACHKLANG_MAIL_CAPTURE_PATH` | Lokale/e2e-Hilfe: schreibt jede ausgehende OTP-/E-Mail in diese TSV-Datei, damit Sie den Code ohne Postfach lesen können. In Produktion leer lassen. |
| `CADDY_SITE_ADDRESS` | Produktions-Domain für Caddy (richtet automatisch Let's-Encrypt-TLS ein). Standard ist `:80` (reines HTTP) für die lokale Entwicklung. |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (Bot-Schutz). Wenn gesetzt, zeigt das Registrierungsformular das Widget und der OTP-Versand verlangt einen gültigen Token. Leer lassen zum Deaktivieren. Siehe [Bot-Schutz](#bot-schutz-cloudflare-turnstile). |

## Bot-Schutz (Cloudflare Turnstile)

Um zu verhindern, dass Bots über die E-Mail-OTP-Registrierung massenhaft Konten anlegen oder
Postfächer bombardieren, integriert NachKlang **Cloudflare Turnstile** (kostenloses CAPTCHA).
Es ist **optional und env-gesteuert**: Ist `TURNSTILE_SECRET_KEY` nicht gesetzt, wird das
CAPTCHA komplett übersprungen (praktisch für die lokale Entwicklung).

Aktivierung:
1. Kostenloses Cloudflare-Konto und eine Turnstile-Site anlegen unter
   `https://dash.cloudflare.com/?to=/:account/turnstile` (Ihre Domain muss **nicht** Cloudflare-
   DNS nutzen). Sie erhalten einen **Site Key** (öffentlich) und einen **Secret Key** (privat).
2. `TURNSTILE_SITE_KEY` und `TURNSTILE_SECRET_KEY` in Ihrer `.env` setzen.
3. App neu starten. Das Registrierungsformular zeigt nun das Widget; der Server prüft den Token
   vor dem OTP-Versand (Fehler, falls fehlend/ungültig).

Bei Aktivierung muss die Datenschutzerklärung Cloudflare als Auftragsverarbeiter nennen (auf der
Datenschutz-Seite bereits vermerkt).

## E-Mail-Einrichtung (Microsoft Graph)

NachKlang versendet E-Mails über die **Microsoft-Graph**-API. E-Mail wird verwendet für:

- den **Einmalcode bei Registrierung/Anmeldung** (die primäre Identitätsprüfung) und
- den **Wiederherstellungs-Login**-Code, wenn kein Passkey verfügbar ist.

Weitere Benachrichtigungs-E-Mails gibt es derzeit nicht.

### Variablen

| Variable | Zweck |
| --- | --- |
| `MICROSOFT_TENANT_ID` | Azure-AD-Tenant-ID. |
| `MICROSOFT_CLIENT_ID` | Client-ID der App-Registrierung. |
| `GRAPH_MAILBOX_UPN` | Postfach, aus dem die App sendet (z. B. `nachklang@ihredomain.de`). |
| `NACHKLANG_VISIBLE_EMAIL` | Den Empfängern angezeigte Antwortadresse. |
| `MICROSOFT_CLIENT_CERTIFICATE_PRIVATE_KEY_PATH` | Pfad zur RSA-Private-Key-PEM (Zertifikatsmodus). |
| `MICROSOFT_CLIENT_CERTIFICATE_THUMBPRINT` | SHA-1-Fingerabdruck dieses Zertifikats (Zertifikatsmodus). |
| `MICROSOFT_CLIENT_SECRET` | Client-Secret (Client-Secret-Modus). |

### Graph-Authentifizierungsmodi

`NACHKLANG_GRAPH_AUTH_MODE` legt fest, wie sich die App bei Microsoft Graph authentifiziert.
Beide Modi funktionieren in Produktion; wählen Sie einen:

- **`certificate` (empfohlen)** — eine signierte JWT-Client-Assertion. Setzen Sie
  `NACHKLANG_GRAPH_AUTH_MODE=certificate` und geben Sie Zertifikats-Private-Key-Pfad +
  Fingerabdruck an. Die PEM als Secret einbinden, niemals einchecken. Für Produktion
  bevorzugt, da kein gemeinsames Geheimnis geleakt oder bei Ablauf rotiert werden muss.
- **`client-secret`** — setzen Sie `NACHKLANG_GRAPH_AUTH_MODE=client-secret` und
  `MICROSOFT_CLIENT_SECRET`. Einfacher einzurichten; das Secret läuft ab und muss rotiert
  werden. Dies ist der Standardmodus und wird in der Referenz-Installation derzeit genutzt.

Die Azure-App-Registrierung benötigt die Anwendungsberechtigung **`Mail.Send`** (mit
Administratoreinwilligung) für das sendende Postfach.

### Alternative: beliebiger SMTP-Server

Microsoft Graph ist der Standard, aber Sie können stattdessen über jeden SMTP-Server senden —
setzen Sie `NACHKLANG_MAIL_TRANSPORT=smtp` und geben Sie an:

| Variable | Zweck |
| --- | --- |
| `SMTP_HOST` | SMTP-Server-Hostname (im SMTP-Modus erforderlich). |
| `SMTP_PORT` | Port (Standard `587`). |
| `SMTP_SECURE` | `true` für implizites TLS (Port 465); `false` für STARTTLS (587). |
| `SMTP_USER` / `SMTP_PASS` | Zugangsdaten (beide weglassen für ein nicht authentifiziertes Relay). |

Die From-/Reply-To-Identität nutzt `NACHKLANG_VISIBLE_EMAIL`. Im SMTP-Modus werden keine
Microsoft-Graph-Variablen benötigt.

## Testbenutzer anlegen (lokal)

Es gibt keinen Datenbank-Seed. Legen Sie einen Benutzer über den echten Ablauf an:

1. Microsoft Graph im Entwicklungsmodus konfigurieren (`NACHKLANG_GRAPH_AUTH_MODE=client-secret`
   + `MICROSOFT_CLIENT_SECRET`, dazu Tenant-/Client-ID und `GRAPH_MAILBOX_UPN` /
   `NACHKLANG_VISIBLE_EMAIL`).
2. (Optional) `NACHKLANG_MAIL_CAPTURE_PATH=/tmp/mail-capture.tsv` setzen, damit der OTP in
   diese Datei geschrieben wird — praktisch, um den Code lokal zu lesen.
3. Stack starten und http://localhost öffnen. Mit einer E-Mail-Adresse registrieren.
4. Einmalcode lesen (aus dem Postfach oder der Capture-Datei) und eingeben.
5. Onboarding abschließen: einen **Passkey** erstellen (Browser/OS fragt nach) und den
   angezeigten **Wiederherstellungscode** sichern. Damit ist das Konto einsatzbereit.

> Zum Abschluss des Onboardings ist ein passkey-fähiger Browser/Authenticator erforderlich.

## Vertrauenspersonen einladen (Trustee Sharing)

Das **nur lesende Teilen mit einer Vertrauensperson** *ist* Teil dieser Version: Ein
Tresor-Inhaber kann aus `/vault/settings` eine vertraute Person (den „digitalen Nachlass"-
Kontakt) einladen. Die Einladung wird **per E-Mail** zugestellt — daher erfordert der **Test
des Einladungsablaufs funktionierende E-Mail-Einstellungen** (dieselbe Microsoft-Graph- *oder*
SMTP-Konfiguration wie oben). Ohne funktionierende E-Mail erhält die eingeladene Person den
Bestätigungslink nicht.

So testen Sie es lokal von Anfang bis Ende:

1. Als Tresor-Inhaber `/vault/settings` → „Vertrauenspersonen" öffnen und eine E-Mail-Adresse
   einladen.
2. Mit konfigurierter E-Mail (oder über `NACHKLANG_MAIL_CAPTURE_PATH`) den Bestätigungslink
   öffnen und einen Passkey für die eingeladene Person anlegen — am einfachsten in einem
   zweiten Browser-Profil.
3. Zurück als Inhaber den Bestätigungscode außerhalb der App vergleichen und den Zugriff
   freigeben (versiegeln); die Vertrauensperson kann den Tresor dann unter `/shared` nur lesend
   einsehen.

> Lediglich die *inaktivitätsgesteuerte* Freigabe („Totmannschalter") ist auf eine spätere
> Version verschoben. Der manuelle Ablauf Einladen → Verifizieren → Versiegeln → Widerrufen ist
> vollständig umgesetzt.

## Produktions-Backups (optional, nur Produktion)

Der Stack enthält ein verschlüsseltes Datenbank-Backup-Profil (ein **age-verschlüsseltes
`pg_dump`** über einen täglichen systemd-Timer, mit GFS-Aufbewahrung). Für die lokale
Entwicklung wird es **nicht benötigt**. Konfigurieren Sie es auf dem Host über
`NACHKLANG_BACKUP_AGE_RECIPIENT` / `NACHKLANG_BACKUP_DIR` (siehe `.env.example`) und folgen Sie
**[docs/ops/backup-restore.md](docs/ops/backup-restore.md)**.

## Tests

```bash
npm test          # Vitest Unit- und Komponententests
npm run test:e2e  # Playwright End-to-End (startet die App intern)
```

Einige Tests greifen auf die Datenbank zu und erwarten, dass `DATABASE_URL` auf ein laufendes
Postgres zeigt (mit `docker compose up -d postgres` starten und zuerst das `migrate`-Profil
ausführen). CI stellt Postgres automatisch bereit.
