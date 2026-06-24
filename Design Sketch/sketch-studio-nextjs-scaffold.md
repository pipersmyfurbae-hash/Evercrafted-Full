# Design Sketch Studio — Next.js Scaffold Files

Paste each section into its respective path in your Next.js project.

---

## `app/api/claude/route.ts`
```typescript
// app/api/claude/route.ts
// Server-side Claude proxy. Verifies Supabase auth + tier before calling Anthropic.
// ANTHROPIC_API_KEY is NEVER exposed client-side.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { TIER_RANK } from "@/lib/tier";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // 1. Verify auth token from Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // 2. Fetch user's tier from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const userTier = (profile?.tier ?? "bloom") as keyof typeof TIER_RANK;

  // 3. Parse request body
  const { messages, systemPrompt, requiredTier = "atelier", maxTokens = 1024 } = await req.json();

  // 4. Enforce tier gate
  if (TIER_RANK[userTier] < TIER_RANK[requiredTier as keyof typeof TIER_RANK]) {
    return NextResponse.json(
      { error: "tier_insufficient", requiredTier, userTier },
      { status: 403 }
    );
  }

  // 5. Call Claude
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    return NextResponse.json({ text });
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json({ error: "Claude request failed" }, { status: 500 });
  }
}
```

## `lib/tier.ts`
```typescript
// lib/tier.ts
// Evercrafted tier system — single source of truth.

export const TIER_RANK = {
  bloom:   1,
  craft:   2,
  studio:  3,
  atelier: 4,
} as const;

export type Tier = keyof typeof TIER_RANK;

export function canAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export const TIER_LABELS: Record<Tier, string> = {
  bloom:   "Bloom",
  craft:   "Craft",
  studio:  "Studio",
  atelier: "Atelier",
};

export const TIER_COLORS: Record<Tier, { bg: string; color: string }> = {
  bloom:   { bg: "#EEF2ED", color: "#4A6741" },
  craft:   { bg: "#EEF4F9", color: "#4A6785" },
  studio:  { bg: "#F5EEF4", color: "#7A4A85" },
  atelier: { bg: "#1A1A1A", color: "#F2EFE9" },
};

export const TIER_PRICES: Record<Tier, string> = {
  bloom:   process.env.STRIPE_PRICE_BLOOM   ?? "",
  craft:   process.env.STRIPE_PRICE_CRAFT   ?? "",
  studio:  process.env.STRIPE_PRICE_STUDIO  ?? "",
  atelier: process.env.STRIPE_PRICE_ATELIER ?? "",
};
```

## `lib/claude.ts`
```typescript
// lib/claude.ts
// Typed Claude client for Design Sketch Studio.
// Calls the internal /api/claude proxy — never calls Anthropic directly from the client.

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  text: string;
  error?: string;
}

// Base fetch wrapper — sends auth token to /api/claude
async function callClaude(
  messages: ClaudeMessage[],
  systemPrompt: string,
  requiredTier: string = "atelier",
  maxTokens: number = 1024
): Promise<ClaudeResponse> {
  const token = localStorage.getItem("sb-access-token") ?? "";
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, systemPrompt, requiredTier, maxTokens }),
  });

  if (!res.ok) {
    const err = await res.json();
    return { text: "", error: err.error ?? "Request failed" };
  }
  return res.json();
}

// ── SKILL-SPECIFIC CALLS ──────────────────────────────────────────────────────

/**
 * generateDesignNote
 * Given a style name + element list, produce an editorial design note.
 * Required tier: atelier
 */
export async function generateDesignNote(
  styleName: string,
  elements: { type: string; count: number }[]
): Promise<ClaudeResponse> {
  const elementSummary = elements
    .map((e) => `${e.count}× ${e.type}`)
    .join(", ");

  return callClaude(
    [
      {
        role: "user",
        content: `Write a 2–3 sentence editorial design note for a "${styleName}" wreath with these elements: ${elementSummary}. Voice: warm, knowledgeable florist. No bullet points. Evocative but precise.`,
      },
    ],
    `You are the Evercrafted design voice — a master florist who writes about wreath design with editorial precision and warmth. 
    Never use generic phrasing. Speak about the botanical elements as if you hand-selected them. 
    Output plain text only — no markdown, no headers.`,
    "atelier",
    256
  );
}

/**
 * generateCustomLayout
 * Given a style intent + element preferences, return a JSON element placement array.
 * Required tier: atelier
 */
export async function generateCustomLayout(
  styleIntent: string,
  preferences: { primaryFloral?: string; season?: string; mood?: string }
): Promise<ClaudeResponse> {
  return callClaude(
    [
      {
        role: "user",
        content: `Generate a wreath element placement for: "${styleIntent}". 
        Preferences: ${JSON.stringify(preferences)}.
        
        Return ONLY a JSON array in this exact format:
        [
          { "type": "pine|berry|floral|filler|bow", "size": number, "positions": [
            { "x": number, "y": number, "count": number, "arrow": "clockwise|inward|outward" }
          ]}
        ]
        
        Rules:
        - x and y are percentages (13–88)
        - All positions must fall in the wreath band (not center circle: 23–77% range)
        - Use 3–5 element groups, 3–9 elements total
        - No cherry blossoms, pussy willow, or twig-based blossom florals`,
      },
    ],
    `You are a wreath blueprint engine for Evercrafted. 
    You output valid JSON placement arrays for the Design Sketch Studio canvas.
    Follow FFLGA classification and polar coordinate principles.
    Output JSON only — no prose, no markdown fences.`,
    "atelier",
    512
  );
}
```

## `components/ui/TierGate.tsx`
```typescript
// components/ui/TierGate.tsx
// Wraps any feature that requires a minimum tier.
// Renders children normally if user's tier qualifies.
// Shows a frosted-glass lock overlay + upgrade CTA if not.

"use client";

import { useTier } from "@/hooks/useTier";
import { canAccess, TIER_LABELS, TIER_COLORS, Tier } from "@/lib/tier";

interface TierGateProps {
  requiredTier: Tier;
  children: React.ReactNode;
  /** Optional custom message shown in the lock overlay */
  lockedMessage?: string;
}

export function TierGate({ requiredTier, children, lockedMessage }: TierGateProps) {
  const { tier, loading } = useTier();

  if (loading) {
    return (
      <div style={{ position: "relative", minHeight: 120 }}>
        {children}
        <div style={overlayStyle}>
          <div style={spinnerStyle} />
        </div>
      </div>
    );
  }

  const userTier = (tier ?? "bloom") as Tier;
  const hasAccess = canAccess(userTier, requiredTier);

  if (hasAccess) return <>{children}</>;

  const badge = TIER_COLORS[requiredTier];
  const message = lockedMessage ?? `This feature requires the ${TIER_LABELS[requiredTier]} plan.`;

  return (
    <div style={{ position: "relative" }}>
      {/* Show content but make non-interactive */}
      <div style={{ pointerEvents: "none", userSelect: "none", filter: "blur(3px)", opacity: 0.4 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div style={overlayStyle}>
        <div style={lockCardStyle}>
          {/* Lock icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" stroke="#4A4A4A" strokeWidth="1.5"/>
            <path d="M7 11V7a5 5 0 0110 0v4" stroke="#4A4A4A" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>

          {/* Tier badge */}
          <span style={{
            ...tierBadgeStyle,
            background: badge.bg,
            color: badge.color,
            marginBottom: 10,
          }}>
            {TIER_LABELS[requiredTier]}
          </span>

          <p style={lockMessageStyle}>{message}</p>

          <a
            href="/pricing"
            style={upgradeBtnStyle}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Upgrade to unlock →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Styles (inline so component is self-contained) ────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(249,247,244,0.80)",
  backdropFilter: "blur(4px)",
  borderRadius: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
};

const lockCardStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1.5px solid #D0D0D0",
  borderRadius: 14,
  padding: "28px 32px",
  textAlign: "center",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  maxWidth: 280,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const tierBadgeStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "3px 10px",
  borderRadius: 9999,
  display: "inline-block",
};

const lockMessageStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  color: "#4A4A4A",
  lineHeight: 1.55,
  marginBottom: 16,
};

const upgradeBtnStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#1A1A1A",
  color: "#FFFFFF",
  fontFamily: "'Inter', sans-serif",
  fontSize: 13,
  fontWeight: 500,
  padding: "9px 20px",
  borderRadius: 8,
  textDecoration: "none",
  transition: "opacity 200ms ease",
};

const spinnerStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: "2px solid #E8E8E8",
  borderTopColor: "#4A6741",
  borderRadius: "50%",
  animation: "spin 0.7s linear infinite",
};
```

## `hooks/useTier.ts`
```typescript
// hooks/useTier.ts
// Reads the authenticated user's subscription tier from Supabase.
// Returns tier string, loading state, and a refresh helper.

"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Tier } from "@/lib/tier";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UseTierResult {
  tier: Tier | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTier(): UseTierResult {
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTier = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setTier(null);
      setLoading(false);
      return;
    }

    // Store token for API calls
    localStorage.setItem("sb-access-token", session.access_token);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      setError(profileError.message);
      setTier("bloom"); // safe default
    } else {
      setTier((profile?.tier ?? "bloom") as Tier);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTier();

    // Re-fetch when auth state changes (sign in / sign out / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchTier();
    });

    return () => subscription.unsubscribe();
  }, [fetchTier]);

  return { tier, loading, error, refresh: fetchTier };
}
```

## `.env.local.example`
```typescript
# .env.local.example
# Copy to .env.local and fill in all values before running locally or deploying.
# Never commit .env.local to version control.

# ── SUPABASE ──────────────────────────────────────────────────────────────────
# Found in: Supabase Dashboard → Project Settings → API

# Public anon key — safe to expose client-side
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Service role key — SERVER-SIDE ONLY. Has full DB access. Never use NEXT_PUBLIC_.
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ── ANTHROPIC ─────────────────────────────────────────────────────────────────
# Found in: https://console.anthropic.com/account/keys
# SERVER-SIDE ONLY — NEVER prefix with NEXT_PUBLIC_

ANTHROPIC_API_KEY=sk-ant-your_key_here

# ── STRIPE ────────────────────────────────────────────────────────────────────
# Found in: https://dashboard.stripe.com/apikeys

# Server-side secret key — never expose client-side
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key

# Webhook signing secret — from Stripe Dashboard → Webhooks → your endpoint
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Stripe Price IDs for each tier (recurring monthly prices)
# Create these in: Stripe Dashboard → Products
STRIPE_PRICE_BLOOM=price_bloom_monthly_id
STRIPE_PRICE_CRAFT=price_craft_monthly_id
STRIPE_PRICE_STUDIO=price_studio_monthly_id
STRIPE_PRICE_ATELIER=price_atelier_monthly_id

# ── APP ───────────────────────────────────────────────────────────────────────
# Used for Stripe redirect URLs and email links
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

