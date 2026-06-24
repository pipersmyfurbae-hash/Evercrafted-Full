// components/ui/TierGate.tsx
// Renders children if user meets tier requirement.
// If not: blurs children and shows an upgrade overlay.
// NEVER uses display:none — locked features remain visible.

"use client";

import { useTier } from "@/hooks/useTier";
import { canAccess, TIER_LABELS, Tier } from "@/lib/tier";

interface TierGateProps {
  required: Tier;
  children: React.ReactNode;
  label?: string;
  description?: string;
}

export function TierGate({ required, children, label, description }: TierGateProps) {
  const { tier, loading } = useTier();

  if (loading) return <div style={{ opacity: 0.4 }}>{children}</div>;

  const hasAccess = canAccess(tier, required);

  if (hasAccess) return <>{children}</>;

  return (
    <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
      {/* Blurred content — always visible, never hidden */}
      <div style={{ filter: "blur(4px)", pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>

      {/* Upgrade overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(249,247,244,0.88)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          border: "1.5px solid #E8E8E8",
          borderRadius: 10,
        }}
      >
        <span style={{ fontSize: 22 }}>🔒</span>
        <span
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 17,
            fontWeight: 500,
            color: "#2E2E2E",
          }}
        >
          {label ?? `${TIER_LABELS[required]} Required`}
        </span>
        {description && (
          <span style={{ fontSize: 12, color: "#4A4A4A", textAlign: "center", maxWidth: 220 }}>
            {description}
          </span>
        )}
        <a
          href="/upgrade"
          style={{
            fontSize: 11,
            color: "#7A4A85",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Upgrade to {TIER_LABELS[required]}
        </a>
      </div>
    </div>
  );
}
