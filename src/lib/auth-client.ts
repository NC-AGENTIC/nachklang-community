"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/client";
import { emailOTPClient } from "better-auth/client/plugins";

const baseURL =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost"
    : window.location.origin;

export const authClient = createAuthClient({
  baseURL,
  plugins: [passkeyClient(), emailOTPClient()],
});

export const { useSession, signOut } = authClient;
