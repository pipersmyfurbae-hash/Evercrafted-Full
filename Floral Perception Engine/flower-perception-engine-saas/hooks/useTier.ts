// hooks/useTier.ts
// Reads the authenticated user's tier from Supabase profiles table.

"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Tier } from "@/lib/tier";

export function useTier() {
  const [tier, setTier] = useState<Tier>("bloom");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    async function fetchTier() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", session.user.id)
        .single();

      if (data?.tier) setTier(data.tier as Tier);
      setLoading(false);
    }

    fetchTier();

    // Re-fetch on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchTier();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { tier, loading };
}
