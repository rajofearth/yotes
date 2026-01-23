/// <reference types="vite/client" />
import type { PropsWithChildren } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "./auth-client";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL in env");
}

export const convex = new ConvexReactClient(convexUrl, {
  expectAuth: true,
});

export function ConvexProviderWrapper({ children }: PropsWithChildren) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      {children}
    </ConvexBetterAuthProvider>
  );
}


