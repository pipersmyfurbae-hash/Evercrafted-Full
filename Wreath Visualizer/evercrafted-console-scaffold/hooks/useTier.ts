"use client";
// hooks/useTier.ts
// Reads the authenticated user's tier from Supabase.
// Used by TierGate and any component that needs tier-conditional rendering.

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Tier } from "@/lib/tier";

interface UseTierReturn {
  tier: Tier;
  loading: boolean;
  userId: string | null;
  email: string | null;
  refetch: () => Promise<void>;
}

export function useTier(): UseTierReturn {
  const supabase = createClientComponentClient();
  const [tier, setTier] = useState<Tier>("bloom");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const fetchTier = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setTier("bloom");
        setUserId(null);
        setEmail(null);
        return;
      }

      setUserId(session.user.id);
      setEmail(session.user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", session.user.id)
        .single();

      if (profile?.tier) {
        setTier(profile.tier as Tier);
      }
    } catch (err) {
      console.error("[useTier] Failed to fetch tier:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTier();

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchTier();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { tier, loading, userId, email, refetch: fetchTier };
}
