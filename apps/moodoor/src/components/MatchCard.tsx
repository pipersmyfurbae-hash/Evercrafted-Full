"use client";

import Link from "next/link";
import BlueprintSVG from "@/components/BlueprintSVG";
import { formatPrice, type MatchResult } from "@/lib/types";

export default function MatchCard({ match }: { match: MatchResult }) {
  const price = formatPrice(match.price_finished_cents);
  return (
    <Link href={`/wreath/${match.slug}`} className="card" style={{ display: "block" }}>
      <div className="blueprint-wrap" style={{ aspectRatio: "1 / 1" }}>
        <BlueprintSVG blueprint={match.blueprint} />
        <span className="reveal-hint">Reveal the render →</span>
      </div>
      <div className="body">
        <div className="title">{match.title}</div>
        {match.story_copy && <p className="story">{match.story_copy}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          {price && <span style={{ fontFamily: "var(--serif)", fontSize: 19 }}>{price}</span>}
          <span className="note">{match.formula}</span>
        </div>
        <div className="tags">
          {match.occasion && <span className="tag">{match.occasion}</span>}
          {match.bow !== "none" && <span className="tag">{match.bow} bow</span>}
          {match.botanical_leads.slice(0, 2).map((b) => (
            <span key={b} className="tag">
              {b}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
