import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import sodium from "libsodium-wrappers-sumo";
import { afterEach } from "vitest";

// libsodium initializes its WASM asynchronously; sync helpers like
// randombytes_buf only exist after sodium.ready resolves. Initialize once
// here so test modules can call them without each guarding readiness.
await sodium.ready;

afterEach(() => {
  cleanup();
});

