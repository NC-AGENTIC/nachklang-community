// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import deMessages from "../../messages/de.json";

import { ManagePasskeys } from "../../src/features/vault/ui/manage-passkeys";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={deMessages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ManagePasskeys", () => {
  it("adds the current device as a new passkey key", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(
      <ManagePasskeys
        passkeys={[{ id: "c1", name: "iPhone" }]}
        onAddThisDevice={onAdd}
        onRemove={vi.fn()}
        onRename={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Dieses Gerät hinzufügen/ }));
    expect(onAdd).toHaveBeenCalled();
  });

  it("shows the unnamed fallback and renames a passkey", async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    renderWithIntl(
      <ManagePasskeys
        passkeys={[{ id: "c1", name: null }]}
        onAddThisDevice={vi.fn()}
        onRemove={vi.fn()}
        onRename={onRename}
      />,
    );

    expect(screen.getByText("Unbenanntes Gerät")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Umbenennen/ }));
    const input = screen.getByLabelText("Gerätename");
    await userEvent.type(input, "Mac · Touch ID");
    await userEvent.click(screen.getByRole("button", { name: /Speichern/ }));

    expect(onRename).toHaveBeenCalledWith("c1", "Mac · Touch ID");
  });
});
