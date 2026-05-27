// src/features/guide/content/de.ts
import type { GuideContent } from "./types";

export const guideDe: GuideContent = {
  eyebrow: "Anleitung · Schritt für Schritt",
  title: "So funktioniert NachKlang",
  lede: "Von der Anmeldung bis zur Weitergabe an Ihre Liebsten — in einfachen Schritten erklärt, ganz ohne Technik-Wissen.",
  sections: [
    {
      id: "willkommen",
      navLabel: "Willkommen",
      title: "Willkommen bei NachKlang",
      intro:
        "NachKlang ist ein digitaler Tresor für Ihre Online-Zugänge — und ein Weg, sie eines Tages den richtigen Menschen zu hinterlassen. Das Besondere: Wir bekommen Ihre Passwörter nie zu sehen.",
      illustration: "zero-knowledge-lock",
      steps: [
        {
          title: "Was Sie hier tun",
          body:
            "In dieser Anleitung richten Sie Schritt für Schritt Ihr Konto ein, sichern es, legen Einträge an und entscheiden, wer sie später erhalten darf.",
        },
        {
          title: "Ganz ohne Vorkenntnisse",
          body:
            "Folgen Sie den Abschnitten einfach von oben nach unten — oder springen Sie über das Menü links direkt zum gewünschten Thema.",
          securityNote: {
            risk: "Wie kann ein Anbieter meine gespeicherten Daten lesen?",
            mitigation:
              "Bei NachKlang gar nicht: Ihre Einträge werden auf Ihrem Gerät verschlüsselt, bevor sie uns erreichen. Bei uns liegt nur unleserlicher Code.",
          },
        },
      ],
    },
    {
      id: "konto",
      navLabel: "Konto erstellen",
      title: "Konto erstellen",
      intro: "Sie starten mit Ihrer E-Mail-Adresse — ein Passwort brauchen Sie nicht.",
      illustration: "account-create",
      steps: [
        {
          title: "E-Mail eingeben",
          body: "Klicken Sie auf „Konto erstellen“ und geben Sie Ihre E-Mail-Adresse und Ihren Namen ein.",
        },
        {
          title: "Einmal-Code bestätigen",
          body:
            "Wir senden Ihnen einen sechsstelligen Code per E-Mail. Geben Sie ihn ein, um Ihre Adresse zu bestätigen.",
          securityNote: {
            risk: "Passwörter können gestohlen, erraten oder mehrfach verwendet werden.",
            mitigation:
              "Deshalb gibt es bei der Anmeldung gar kein Passwort. Der Einmal-Code ist nur wenige Minuten gültig und funktioniert genau einmal.",
          },
        },
      ],
    },
    {
      id: "passkey",
      navLabel: "Passkey einrichten",
      title: "Passkey einrichten",
      intro: "Ein Passkey ist Ihr moderner Schlüssel — er ersetzt Passwort und SMS-Code zugleich.",
      illustration: "passkey-onboard",
      steps: [
        {
          title: "Passkey anlegen",
          body:
            "Ihr Gerät fragt nach Face ID, Fingerabdruck oder Ihrem Sicherheitsschlüssel. Damit entsteht ein Schlüssel, der dieses Gerät nie verlässt.",
        },
        {
          title: "Was ist ein Passkey?",
          body:
            "Statt eines Passworts, das man eintippen (und verraten) kann, beweist Ihr Gerät selbst, dass Sie es sind. Das ist bequemer und deutlich sicherer.",
          securityNote: {
            risk: "Gefälschte Webseiten („Phishing“) versuchen, Ihr Passwort abzugreifen.",
            mitigation:
              "Ein Passkey funktioniert nur auf der echten NachKlang-Adresse. Auf einer gefälschten Seite lässt er sich technisch nicht verwenden.",
          },
        },
      ],
    },
    {
      id: "recovery",
      navLabel: "Recovery-Code",
      title: "Recovery-Code sichern",
      intro: "Der Recovery-Code ist Ihr Ersatzschlüssel, falls ein Gerät einmal verloren geht.",
      illustration: "recovery-code",
      steps: [
        {
          title: "Code notieren",
          body:
            "Sie erhalten einen einmaligen Recovery-Code. Drucken Sie ihn aus oder schreiben Sie ihn ab und bewahren Sie ihn sicher auf.",
        },
        {
          title: "Code bestätigen",
          body: "Zur Sicherheit geben Sie den Code noch einmal ein — so ist sichergestellt, dass Sie ihn wirklich gespeichert haben.",
          securityNote: {
            risk: "Verlieren Sie sowohl Ihr Gerät als auch den Recovery-Code, kann niemand — auch wir nicht — Ihren Tresor wieder öffnen.",
            mitigation:
              "Genau das macht „Zero-Knowledge“ aus. Bewahren Sie den Code getrennt vom Gerät auf, etwa in einem Ordner zu Hause oder einem Bankschließfach.",
          },
        },
      ],
    },
    {
      id: "geraete",
      navLabel: "Weitere Geräte",
      title: "Weitere Geräte hinzufügen",
      intro: "Sie können Ihren Tresor auf mehreren Geräten nutzen — jedes bekommt seinen eigenen Passkey.",
      illustration: "multi-device",
      steps: [
        {
          title: "Auf dem neuen Gerät anmelden",
          body: "Öffnen Sie NachKlang auf dem zweiten Gerät und melden Sie sich an — mit Ihrer E-Mail oder Ihrem Recovery-Code.",
        },
        {
          title: "Gerät hinzufügen",
          body:
            "Gehen Sie in die Einstellungen und wählen Sie „Dieses Gerät hinzufügen“. Nun öffnen Sie den Tresor auch hier per Face ID oder Fingerabdruck.",
        },
        {
          title: "Geräte verwalten",
          body: "In der Liste Ihrer Passkeys sehen Sie alle Geräte. Verlorene Geräte können Sie jederzeit entfernen.",
          securityNote: {
            risk: "Ein verlorenes oder gestohlenes Gerät könnte in falsche Hände geraten.",
            mitigation:
              "Entfernen Sie den Passkey des Geräts in den Einstellungen — danach öffnet es Ihren Tresor nicht mehr. Der letzte verbliebene Passkey lässt sich nicht löschen, damit Sie sich nie ganz aussperren.",
          },
        },
      ],
    },
    {
      id: "eintraege",
      navLabel: "Einträge anlegen",
      title: "Tresor-Einträge anlegen",
      intro: "Jetzt füllen Sie Ihren Tresor mit Ihren Online-Zugängen.",
      illustration: "vault-entry",
      steps: [
        {
          title: "Neuen Eintrag erfassen",
          body:
            "Klicken Sie auf „Neuen Zugang erfassen“ und tragen Sie Name, Webadresse, Benutzername und bei Bedarf Notizen ein.",
        },
        {
          title: "Speichern",
          body: "Mit „Eintrag speichern“ erscheint der Zugang in Ihrer Liste. Sie können ihn jederzeit bearbeiten oder löschen.",
          securityNote: {
            risk: "Auf dem Weg ins Internet könnten Daten mitgelesen werden.",
            mitigation:
              "Jeder Eintrag wird schon auf Ihrem Gerät verschlüsselt. Bei uns kommt nur unleserlicher Code an — und so wird er auch gespeichert.",
          },
        },
      ],
    },
    {
      id: "teilen",
      navLabel: "Teilen",
      title: "Mit Vertrauenspersonen teilen",
      intro: "Sie entscheiden, wer Ihren Tresor eines Tages einsehen darf — etwa Familie oder enge Freunde.",
      illustration: "share-trustee",
      steps: [
        {
          title: "Person einladen",
          body: "Geben Sie die E-Mail-Adresse Ihrer Vertrauensperson ein. Sie erhält eine Einladung per Link.",
        },
        {
          title: "Einladung annehmen",
          body: "Die Person öffnet den Link und bestätigt. Danach kann sie Ihre Einträge lesen — aber nicht verändern.",
          securityNote: {
            risk: "Wem Sie Zugriff geben, der kann Ihre Einträge sehen.",
            mitigation:
              "Teilen Sie nur mit Menschen, denen Sie wirklich vertrauen. Die Freigabe ist Ende-zu-Ende verschlüsselt — nur die eingeladene Person und Sie können die Inhalte lesen, wir nicht.",
          },
        },
      ],
    },
    {
      id: "widerrufen",
      navLabel: "Widerrufen",
      title: "Zugriff widerrufen",
      intro: "Eine Freigabe ist nicht endgültig — Sie können sie jederzeit zurücknehmen.",
      illustration: "revoke-share",
      steps: [
        {
          title: "Freigaben öffnen",
          body: "In der Übersicht „Geteilt“ sehen Sie alle Personen, die Zugriff haben.",
        },
        {
          title: "Zugriff entziehen",
          body: "Klicken Sie bei der gewünschten Person auf „Widerrufen“. Ab sofort hat sie keinen Zugriff mehr.",
          securityNote: {
            risk: "Was jemand bereits gesehen oder exportiert hat, lässt sich nicht zurückholen.",
            mitigation:
              "Der Widerruf verhindert jeden weiteren Zugriff. Prüfen Sie eine Freigabe daher vorher in Ruhe — und widerrufen Sie im Zweifel früh.",
          },
        },
      ],
    },
    {
      id: "loeschen",
      navLabel: "Konto löschen",
      title: "Konto & Daten löschen",
      intro: "Wenn Sie möchten, entfernen Sie alle Daten vollständig und unwiderruflich.",
      illustration: "delete-account",
      steps: [
        {
          title: "Vorher exportieren",
          body: "Sichern Sie bei Bedarf zuerst Ihre Einträge über die Export-Funktion — danach sind sie nicht mehr abrufbar.",
        },
        {
          title: "Konto löschen",
          body:
            "Bestätigen Sie in den Einstellungen Ihre E-Mail-Adresse und löschen Sie das Konto. Damit verschwinden Tresor, Freigaben und Zugangsdaten endgültig.",
          securityNote: {
            risk: "Gelöschte Daten sind weg — ohne Wiederherstellung.",
            mitigation: "Das ist gewollt und entspricht Ihrem Recht auf Löschung (DSGVO). Exportieren Sie vorher alles, was Sie behalten möchten.",
          },
        },
      ],
    },
    {
      id: "sicherheit",
      navLabel: "Sicherheit & Risiken",
      title: "Sicherheit & Risiken",
      intro: "Zum Abschluss das Wichtigste in einfachen Worten: Wie NachKlang Sie schützt — und wo Ihre eigene Sorgfalt zählt.",
      illustration: "zero-knowledge-lock",
      steps: [],
      securityNotes: [
        {
          risk: "„Zero-Knowledge“ — was heißt das?",
          mitigation: "Alle Inhalte werden auf Ihrem Gerät ver- und entschlüsselt. Wir speichern nur unleserlichen Code und haben keinen Schlüssel dazu.",
        },
        {
          risk: "Verlust von Gerät und Recovery-Code",
          mitigation: "Dann ist der Tresor nicht wiederherstellbar. Halten Sie zwei Wege offen: ein zweites Gerät und den ausgedruckten Recovery-Code.",
        },
        {
          risk: "Schadsoftware auf Ihrem eigenen Gerät",
          mitigation: "Verschlüsselung schützt Übertragung und Speicherung — nicht ein bereits infiziertes Gerät. Halten Sie Gerät und Browser aktuell.",
        },
        {
          risk: "Vertrauen in geteilte Personen",
          mitigation: "Wer Zugriff erhält, kann lesen. Wählen Sie Vertrauenspersonen mit Bedacht und widerrufen Sie im Zweifel.",
        },
        {
          risk: "Wo liegen meine Daten?",
          mitigation:
            "In Deutschland, nach EU-Datenschutz. Backups sind verschlüsselt, der Schlüssel dazu wird getrennt und offline aufbewahrt. Der Quellcode ist offen einsehbar.",
        },
      ],
    },
  ],
};
