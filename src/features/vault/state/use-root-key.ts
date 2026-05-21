"use client";

import { useSyncExternalStore } from "react";

import { getRootKey, subscribe, type RootKeyState } from "./root-key-store";

export function useRootKey(): RootKeyState {
  return useSyncExternalStore(subscribe, getRootKey, () => null);
}
