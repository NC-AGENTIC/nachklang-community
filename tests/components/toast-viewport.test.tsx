// @vitest-environment jsdom
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "@/features/vault/state/toast-store";
import { ToastViewport } from "@/features/vault/ui/toast-viewport";

function Harness({ onReady }: { onReady: (api: ReturnType<typeof useToast>) => void }) {
  const api = useToast();
  onReady(api);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("ToastViewport", () => {
  it("renders nothing when the queue is empty", () => {
    const { container } = render(
      <ToastProvider>
        <ToastViewport />
      </ToastProvider>,
    );
    expect(container.querySelectorAll(".toast")).toHaveLength(0);
  });

  it("shows a toast when show() is called and dismisses it on demand", () => {
    let api!: ReturnType<typeof useToast>;
    render(
      <ToastProvider>
        <Harness onReady={(a) => (api = a)} />
        <ToastViewport />
      </ToastProvider>,
    );
    act(() => {
      api.show({ variant: "success", message: "Hallo Welt" });
    });
    expect(screen.getByText("Hallo Welt")).toBeInTheDocument();
    const id = api.toasts[0].id;
    act(() => {
      api.dismiss(id);
    });
    expect(screen.queryByText("Hallo Welt")).not.toBeInTheDocument();
  });

  it("auto-dismisses after timeoutMs", () => {
    let api!: ReturnType<typeof useToast>;
    render(
      <ToastProvider>
        <Harness onReady={(a) => (api = a)} />
        <ToastViewport />
      </ToastProvider>,
    );
    act(() => {
      api.show({ variant: "info", message: "Vergänglich", timeoutMs: 1000 });
    });
    expect(screen.getByText("Vergänglich")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText("Vergänglich")).not.toBeInTheDocument();
  });

  it("uses 5000 ms default when undo is attached, 4000 ms otherwise", () => {
    let api!: ReturnType<typeof useToast>;
    render(
      <ToastProvider>
        <Harness onReady={(a) => (api = a)} />
        <ToastViewport />
      </ToastProvider>,
    );
    act(() => {
      api.show({ variant: "info", message: "Mit undo", undo: { label: "Rückgängig", onUndo: vi.fn() } });
    });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByText("Mit undo")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByText("Mit undo")).not.toBeInTheDocument();

    act(() => {
      api.show({ variant: "success", message: "Ohne undo" });
    });
    act(() => { vi.advanceTimersByTime(3999); });
    expect(screen.getByText("Ohne undo")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText("Ohne undo")).not.toBeInTheDocument();
  });

  it("invokes onUndo when the undo button is clicked, and dismisses the toast", async () => {
    const onUndo = vi.fn();
    let api!: ReturnType<typeof useToast>;
    vi.useRealTimers();
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Harness onReady={(a) => (api = a)} />
        <ToastViewport />
      </ToastProvider>,
    );
    act(() => {
      api.show({ variant: "info", message: "Klick mich", undo: { label: "Rückgängig", onUndo } });
    });
    await user.click(screen.getByRole("button", { name: /Rückgängig/ }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Klick mich")).not.toBeInTheDocument();
  });

  it("trims the queue to 5 toasts (oldest dropped)", () => {
    let api!: ReturnType<typeof useToast>;
    render(
      <ToastProvider>
        <Harness onReady={(a) => (api = a)} />
        <ToastViewport />
      </ToastProvider>,
    );
    act(() => {
      for (let i = 0; i < 7; i++) {
        api.show({ variant: "info", message: `Nachricht ${i}` });
      }
    });
    expect(screen.queryByText("Nachricht 0")).not.toBeInTheDocument();
    expect(screen.queryByText("Nachricht 1")).not.toBeInTheDocument();
    expect(screen.getByText("Nachricht 2")).toBeInTheDocument();
    expect(screen.getByText("Nachricht 6")).toBeInTheDocument();
  });
});
