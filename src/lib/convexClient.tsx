/// <reference types="vite/client" />
import type { PropsWithChildren } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { supabase } from "@/utils/supabaseClient";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  throw new Error("Missing VITE_CONVEX_URL in env");
}

export const convex = new ConvexReactClient(convexUrl);

// Bridge Supabase auth to Convex
convex.setAuth(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

// Also refresh Convex auth when Supabase auth state changes
try {
  supabase.auth.onAuthStateChange(async () => {
    convex.setAuth(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });
  });
} catch {}

export function ConvexProviderWrapper({ children }: PropsWithChildren) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}


