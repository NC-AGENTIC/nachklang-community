import { Search } from "lucide-react";
import { type KeyboardEvent, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { searchProviderCatalog, type ProviderCatalogItem, type ProviderCategory } from "../domain/vault-entry";

export type VaultProviderComboboxProps = {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (provider: ProviderCatalogItem) => void;
  required?: boolean;
};

export function VaultProviderCombobox({
  id,
  label,
  value,
  onValueChange,
  onSelect,
  required,
}: VaultProviderComboboxProps) {
  const t = useTranslations("vault.providerCombobox");
  const listboxId = useId();
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const categoryLabels: Record<ProviderCategory, string> = {
    cloud: t("categoryCloud"),
    commerce: t("categoryCommerce"),
    communication: t("categoryCommunication"),
    education: t("categoryEducation"),
    finance: t("categoryFinance"),
    health: t("categoryHealth"),
    identity: t("categoryIdentity"),
    insurance: t("categoryInsurance"),
    media: t("categoryMedia"),
    mobility: t("categoryMobility"),
    productivity: t("categoryProductivity"),
    public: t("categoryPublic"),
    social: t("categorySocial"),
    travel: t("categoryTravel"),
    utilities: t("categoryUtilities"),
  };

  const matches = useMemo(() => (value.trim() ? searchProviderCatalog(value, 8) : []), [value]);
  const open = focused && matches.length > 0;

  function commitSelection(provider: ProviderCatalogItem) {
    onSelect(provider);
    setActiveIndex(-1);
    setFocused(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < matches.length) {
        event.preventDefault();
        commitSelection(matches[activeIndex]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setActiveIndex(-1);
      setFocused(false);
    }
  }

  const activeId = activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div className="field entry-combobox">
      <label htmlFor={id}>{label}</label>
      <div className="entry-combobox__control">
        <Search aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          name={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          required={required}
          value={value}
          onChange={(event) => {
            setActiveIndex(-1);
            onValueChange(event.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {open ? (
        <ul className="entry-combobox__listbox" id={listboxId} role="listbox" aria-label={label}>
          {matches.map((provider, index) => (
            <li
              key={provider.id}
              id={`${listboxId}-opt-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className="entry-combobox__option"
              onMouseDown={(event) => {
                event.preventDefault();
                commitSelection(provider);
              }}
            >
              <strong>{provider.name}</strong>
              <small>
                {categoryLabels[provider.category]}
                {provider.countryHint ? ` · ${provider.countryHint}` : ""}
              </small>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
