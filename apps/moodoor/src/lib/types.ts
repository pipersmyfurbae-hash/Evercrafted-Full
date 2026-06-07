/** Public-facing match result returned by /api/match and rendered in the reveal. */
import type { Blueprint } from "./composition";

export interface MatchResult {
  id: string;
  slug: string;
  title: string;
  story_copy: string | null;
  hero_image_url: string;
  thumb_image_url: string | null;
  blueprint: Blueprint;
  formula: string;
  bow: string;
  occasion: string | null;
  botanical_leads: string[];
  price_finished_cents: number | null;
  price_blueprint_cents: number | null;
  score: number;
}

export interface MatchSession {
  memory: string;
  matchQueryId: string | null;
  matches: MatchResult[];
}

export function formatPrice(cents: number | null | undefined): string {
  if (!cents || cents <= 0) return "";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
