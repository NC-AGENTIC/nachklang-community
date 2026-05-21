// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StubPage } from "../../src/features/auth/ui/stub-page";

describe("StubPage", () => {
  it("renders the title, subtitle, and a back link to /vault", () => {
    render(<StubPage title="Anmelden" subtitle="Folgt im naechsten Schritt." />);
    expect(screen.getByRole("heading", { name: "Anmelden" })).toBeInTheDocument();
    expect(screen.getByText("Folgt im naechsten Schritt.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Zum Vault/ })).toHaveAttribute("href", "/vault");
  });
});
