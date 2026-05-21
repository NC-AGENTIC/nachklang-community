"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";

export type ToastVariant = "success" | "info" | "error";

export type Toast = {
  id: string;
  variant: ToastVariant;
  message: string;
  undo?: { label: string; onUndo: () => void };
  timeoutMs?: number;
};

export type ToastInput = Omit<Toast, "id">;

export type ToastApi = {
  toasts: readonly Toast[];
  show(toast: ToastInput): string;
  dismiss(id: string): void;
};

const MAX_QUEUE = 5;

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }): ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((input: ToastInput): string => {
    counterRef.current += 1;
    const id = `toast-${counterRef.current}-${Math.random().toString(36).slice(2, 8)}`;
    const next: Toast = { id, ...input };
    setToasts((prev) => {
      const merged = [...prev, next];
      return merged.length > MAX_QUEUE ? merged.slice(merged.length - MAX_QUEUE) : merged;
    });
    return id;
  }, []);

  const api = useMemo<ToastApi>(() => ({ toasts, show, dismiss }), [toasts, show, dismiss]);

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
