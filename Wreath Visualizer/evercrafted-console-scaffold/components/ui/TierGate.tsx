"use client";
// components/ui/TierGate.tsx
// Wraps any console module or feature.
// If user's tier is insufficient, renders a blur overlay with upgrade CTA.
// NEVER uses display:none — locked features are always visible beneath the overlay.

import React from "react";
import { canAccess, upgradeMessage, TIER_LABELS, TIER_COLORS, Tier } from "@/lib/tier";
import { useTier } from "@/hooks/useTier";

interface TierGateProps {
  requires: Tier;
  children: React.ReactNode;
  /** Optional: override the upgrade CTA label */
  upgradeLabel?: string;
  /** Optional: compact mode for inline feature locks (smaller overlay) */
  compact?: boolean;
}

export function TierGate({
  requires,
  children,
  upgradeLabel,
  compact = false,
}: TierGateProps) {
  const { tier, loading } = useTier();

  // While loading, render children normally (no flash of locked state)
  if (loading) return <>{children}</>;

  const hasAccess = canAccess(tier, requires);

  if (hasAccess) return <>{children}</>;

  // Locked — show children with blur overlay
  const colors = TIER_COLORS[requires];
  const label = upgradeLabel ?? `Upgrade to ${TIER_LABELS[requires]}`;
  const message = upgradeMessage(requires);

  return (
    <div style={{ position: "relative" }}>
      {/* Children still render — just blurred */}
      <div
        style={{
          filter: "blur(4px)",
          pointerEvents: "none",
          userSelect: "none",
          opacity: 0.6,
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Upgrade overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(249,247,244,0.7)",
          backdropFilter: "blur(2px)",
          borderRadius: "14px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1.5px solid #D0D0D0",
            borderRadius: compact ? "10px" : "16px",
            padding: compact ? "16px 20px" : "28px 36px",
            textAlign: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
            maxWidth: compact ? "260px" : "360px",
          }}
        >
          {/* Tier badge */}
          <div style={{ marginBottom: compact ? "10px" : "16px" }}>
            <span
              style={{
                display: "inline-block",
                background: colors.bg,
                color: colors.text,
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "4px 12px",
                borderRadius: "9999px",
              }}
            >
              {TIER_LABELS[requires]}
            </span>
          </div>

          {!compact && (
            <div
              style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: "1.25rem",
                fontWeight: 400,
                color: "#1A1A1A",
                marginBottom: "8px",
              }}
            >
              {label}
            </div>
          )}

          <p
            style={{
              fontSize: compact ? "0.75rem" : "0.8125rem",
              color: "#787878",
              lineHeight: 1.6,
              marginBottom: compact ? "12px" : "20px",
            }}
          >
            {message}
          </p>

          <a
            href="/settings/subscription"
            style={{
              display: "inline-block",
              background: "#1A1A1A",
              color: "#FFFFFF",
              fontSize: "0.8rem",
              fontWeight: 500,
              padding: compact ? "8px 16px" : "10px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              letterSpacing: "0.02em",
              transition: "background 200ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#2E2E2E";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#1A1A1A";
            }}
          >
            Upgrade Plan →
          </a>
        </div>
      </div>
    </div>
  );
}

export default TierGate;
