"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OCCASIONS } from "@/lib/evs";

const PROMPTS = [
  "my grandmother's garden in late autumn",
  "the morning we brought the baby home",
  "fifty years, and he still reaches for my hand",
];

export default function MemoryIntake() {
  const router = useRouter();
  const [memory, setMemory] = useState("");
  const [occasion, setOccasion] = useState("");
  const [noBow, setNoBow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    const text = memory.trim();
    if (!text) {
      setError("Please share a memory first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const constraintParts: string[] = [];
      if (occasion) constraintParts.push(`occasion: ${occasion}`);
      if (noBow) constraintParts.push("no bow");

      const evsRes = await fetch("/api/evs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memory: text, constraints: constraintParts.join("; ") }),
      });
      const evsJson = await evsRes.json();
      if (!evsJson.success) throw new Error(evsJson.error || "Could not read your memory.");

      const matchRes = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evs: evsJson.evs,
          memory: text,
          constraints: {
            occasion: occasion || null,
            bow: noBow ? "none" : null,
          },
        }),
      });
      const matchJson = await matchRes.json();
      if (!matchJson.success) throw new Error(matchJson.error || "Matching failed.");

      sessionStorage.setItem(
        "moodoor:matches",
        JSON.stringify({ memory: text, matchQueryId: matchJson.matchQueryId, matches: matchJson.matches })
      );
      router.push("/matches");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <textarea
        className="field"
        rows={5}
        placeholder="Tell us about the memory…"
        value={memory}
        onChange={(e) => setMemory(e.target.value)}
        disabled={loading}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "10px 0 4px" }}>
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            className="tag"
            style={{ cursor: "pointer", background: "#fff" }}
            onClick={() => setMemory(p)}
            disabled={loading}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", margin: "16px 0 22px" }}>
        <label className="note">
          Occasion (optional){" "}
          <select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            disabled={loading}
            style={{ fontFamily: "var(--sans)", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: 3 }}
          >
            <option value="">Any</option>
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <label className="note" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={noBow} onChange={(e) => setNoBow(e.target.checked)} disabled={loading} />
          No bow
        </label>
      </div>

      <button className="btn" onClick={onSubmit} disabled={loading}>
        {loading ? "Finding your matches…" : "Find my wreath"}
      </button>

      {error && (
        <p className="note" style={{ color: "#a3403a", marginTop: 14 }}>
          {error}
        </p>
      )}
    </div>
  );
}
