// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

import { VaultProviderCombobox } from "../../src/features/vault/ui/vault-provider-combobox";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function setup(value = "") {
  const onValueChange = vi.fn();
  const onSelect = vi.fn();
  const utils = renderWithIntl(
    <VaultProviderCombobox
      id="displayName"
      label="Anbietername"
      value={value}
      onValueChange={onValueChange}
      onSelect={onSelect}
      required
    />,
  );
  const input = screen.getByRole("combobox", { name: "Anbietername" });
  return { ...utils, input, onValueChange, onSelect };
}

describe("VaultProviderCombobox", () => {
  it("shows no listbox when the value is empty", () => {
    const { input } = setup("");
    input.focus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens a filtered listbox for a matching value when focused", async () => {
    const user = userEvent.setup();
    const { input } = setup("Google");
    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: /Google/ }).length).toBeGreaterThan(0);
  });

  it("emits typed text via onValueChange", async () => {
    const user = userEvent.setup();
    const { input, onValueChange } = setup("");
    await user.type(input, "Google");
    expect(onValueChange).toHaveBeenCalled();
  });

  it("selects an option on click and emits the provider", async () => {
    const user = userEvent.setup();
    const { input, onSelect } = setup("Google");
    await user.click(input);
    const option = screen.getAllByRole("option", { name: /Google/ })[0];
    await user.click(option);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.stringMatching(/Google/), loginUrl: expect.any(String) }),
    );
  });

  it("selects the active option with ArrowDown + Enter", async () => {
    const user = userEvent.setup();
    const { input, onSelect } = setup("Google");
    await user.click(input);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalled();
  });

  it("closes the listbox on Escape", async () => {
    const user = userEvent.setup();
    const { input } = setup("Google");
    await user.click(input);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows no listbox when nothing matches", async () => {
    const user = userEvent.setup();
    const { input } = setup("zzzzzznotaprovider");
    await user.click(input);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
