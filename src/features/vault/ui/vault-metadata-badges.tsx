"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

import {
  INITIAL_LAST_VAULT_UPDATED_ISO,
  LAST_VAULT_UPDATED_STORAGE_KEY,
  NACHKLANG_RELEASE_VERSION,
  VAULT_UPDATED_EVENT,
  formatVaultUpdatedLabel,
} from "../domain/vault-metadata";

type VaultUpdatedEvent = CustomEvent<{ updatedAt: string }>;

export function VaultMetadataBadges() {
  const [updatedAt, setUpdatedAt] = useState(INITIAL_LAST_VAULT_UPDATED_ISO);

  useEffect(() => {
    setUpdatedAt(window.localStorage.getItem(LAST_VAULT_UPDATED_STORAGE_KEY) ?? INITIAL_LAST_VAULT_UPDATED_ISO);

    function handleVaultUpdated(event: Event) {
      const detail = (event as VaultUpdatedEvent).detail;
      if (detail?.updatedAt) {
        setUpdatedAt(detail.updatedAt);
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === LAST_VAULT_UPDATED_STORAGE_KEY && event.newValue) {
        setUpdatedAt(event.newValue);
      }
    }

    window.addEventListener(VAULT_UPDATED_EVENT, handleVaultUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(VAULT_UPDATED_EVENT, handleVaultUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <div className="rail-meta" aria-label="Vault-Metadaten">
      <div className="rail-activity">
        <span className="rail-activity__icon" aria-hidden="true">
          <Clock />
        </span>
        <span className="rail-activity__body">
          <span className="rail-activity__label">Ihr Vault · zuletzt gespeichert</span>
          <time className="rail-activity__time" dateTime={updatedAt}>
            {formatVaultUpdatedLabel(updatedAt)}
          </time>
        </span>
      </div>
      <p className="rail-version">
        NachKlang <span aria-hidden="true">·</span> <span>{NACHKLANG_RELEASE_VERSION}</span>
      </p>
    </div>
  );
}
