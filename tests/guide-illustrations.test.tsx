// tests/guide-illustrations.test.tsx
// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ILLUSTRATIONS } from "@/features/guide/ui/illustrations";
import { ILLUSTRATION_KEYS } from "@/features/guide/content/types";

describe("illustration registry", () => {
  it("has a component for every illustration key", () => {
    for (const key of ILLUSTRATION_KEYS) {
      expect(typeof ILLUSTRATIONS[key]).toBe("function");
    }
  });

  it("renders each illustration as an svg", () => {
    for (const key of ILLUSTRATION_KEYS) {
      const Comp = ILLUSTRATIONS[key];
      const { container, unmount } = render(<Comp />);
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });
});
