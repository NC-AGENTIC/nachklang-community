// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

import { VaultEntryCard } from "../../src/features/vault/ui/vault-entry-card";
import type { VaultWorklistEntry } from "../../src/features/vault/domain/vault-worklist";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const sample: VaultWorklistEntry = {
  itemId: "entry-test",
  revision: 1,
  providerId: "test",
  displayName: "Testanbieter",
  loginUrl: "https://test.example.org",
  emailUsed: "user@example.org",
  username: "user1",
  passwordLocationHint: "Im lokalen Passwortmanager",
  notes: "",
  tags: ["t"],
  lifecycleStatus: "aktiv",
  status: "aktiv",
  createdAt: "2026-05-18T12:00:00.000Z",
  updatedAt: "2026-05-18T12:00:00.000Z",
};

describe("VaultEntryCard", () => {
  it("renders the entry display name and revision", () => {
    renderWithIntl(<VaultEntryCard entry={sample} onEdit={vi.fn()} onStatusChange={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Testanbieter")).toBeInTheDocument();
    expect(screen.getByText(/Rev\. 1/)).toBeInTheDocument();
  });

  it("renders a status select reflecting the current lifecycle status", () => {
    renderWithIntl(<VaultEntryCard entry={sample} onEdit={vi.fn()} onStatusChange={vi.fn()} onDelete={vi.fn()} />);
    const select = screen.getByRole("combobox", { name: /Testanbieter Status ändern/ }) as HTMLSelectElement;
    expect(select.value).toBe("aktiv");
  });

  it("fires onStatusChange with the chosen slug", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    renderWithIntl(<VaultEntryCard entry={sample} onEdit={vi.fn()} onStatusChange={onStatusChange} onDelete={vi.fn()} />);
    await user.selectOptions(screen.getByRole("combobox", { name: /Status ändern/ }), "anbieter-informiert");
    expect(onStatusChange).toHaveBeenCalledWith(sample, "anbieter-informiert");
  });

  it("strikes through the name when the account is geloescht", () => {
    const { container } = renderWithIntl(
      <VaultEntryCard
        entry={{ ...sample, status: "geloescht", lifecycleStatus: "geloescht" }}
        onEdit={vi.fn()}
        onStatusChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(container.querySelector(".entry-card-title--deleted")).not.toBeNull();
  });

  it("exposes data-item-id on the article element", () => {
    const { container } = renderWithIntl(
      <VaultEntryCard entry={sample} onEdit={vi.fn()} onStatusChange={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(container.querySelector('[data-item-id="entry-test"]')).not.toBeNull();
  });
});
