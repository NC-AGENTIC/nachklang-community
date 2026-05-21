"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";

import { useToast, type Toast } from "@/features/vault/state/toast-store";

function defaultTimeoutMs(toast: Toast): number {
  if (typeof toast.timeoutMs === "number") return toast.timeoutMs;
  return toast.undo ? 5000 : 4000;
}

function ToastCard({ toast }: { toast: Toast }): ReactElement {
  const { dismiss } = useToast();
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(defaultTimeoutMs(toast));
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (paused) return;
    startedAtRef.current = Date.now();
    const timer = setTimeout(() => dismiss(toast.id), remainingRef.current);
    return () => {
      clearTimeout(timer);
      if (startedAtRef.current !== null) {
        remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
      }
    };
  }, [dismiss, toast.id, paused]);

  return (
    <div
      className={`toast toast--${toast.variant}`}
      role={toast.variant === "error" ? "alert" : "status"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <span className="toast__message">{toast.message}</span>
      {toast.undo ? (
        <button
          type="button"
          className="toast__undo"
          onClick={() => {
            toast.undo!.onUndo();
            dismiss(toast.id);
          }}
        >
          {toast.undo.label}
        </button>
      ) : null}
    </div>
  );
}

export function ToastViewport(): ReactElement | null {
  const { toasts } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className="toast__viewport" aria-live="polite" aria-relevant="additions">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
}
