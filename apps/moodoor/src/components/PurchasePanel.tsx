"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/types";

type Path = "finished" | "blueprint" | "kit";

export default function PurchasePanel({
  slug,
  priceFinished,
  priceBlueprint,
  priceKit,
  purchasableFinished,
  purchasableBlueprint,
  purchasableKit,
}: {
  slug: string;
  priceFinished: number | null;
  priceBlueprint: number | null;
  priceKit: number | null;
  purchasableFinished: boolean;
  purchasableBlueprint: boolean;
  purchasableKit: boolean;
}) {
  const [loading, setLoading] = useState<Path | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(path: Path) {
    setLoading(path);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, path }),
      });
      const json = await res.json();
      if (!json.success || !json.url) throw new Error(json.error || "Checkout unavailable.");
      window.location.href = json.url as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed.");
      setLoading(null);
    }
  }

  const options: { path: Path; label: string; price: number | null; show: boolean; primary?: boolean }[] = [
    { path: "finished", label: "Order the finished wreath", price: priceFinished, show: purchasableFinished, primary: true },
    { path: "blueprint", label: "Buy the digital blueprint", price: priceBlueprint, show: purchasableBlueprint },
    { path: "kit", label: "Order the DIY kit", price: priceKit, show: purchasableKit },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {options
        .filter((o) => o.show && o.price)
        .map((o) => (
          <button
            key={o.path}
            className={`btn${o.primary ? "" : " ghost"}`}
            onClick={() => buy(o.path)}
            disabled={loading !== null}
            style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between" }}
          >
            <span>{loading === o.path ? "Redirecting…" : o.label}</span>
            <span>{formatPrice(o.price)}</span>
          </button>
        ))}
      <p className="note">Matched from our curated collection of handcrafted designs. No two memories alike.</p>
      {error && (
        <p className="note" style={{ color: "#a3403a" }}>
          {error}
        </p>
      )}
    </div>
  );
}
