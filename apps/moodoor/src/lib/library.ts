/** Shape of a `public.library` row (curated, pre-rendered wreath). */
import type { Blueprint } from "./composition";
import type { EvsVector } from "./evs";

export interface LibraryRow extends EvsVector {
  id: string;
  slug: string;
  title: string;
  story_copy: string | null;
  hero_image_url: string;
  thumb_image_url: string | null;
  blueprint: Blueprint;
  genome: string | null;
  bsre_score: number | null;

  occasion: string | null;
  palette_family: string | null;
  formula: string;
  bow: string;
  botanical_leads: string[];
  collection_id: string | null;

  purchasable_finished: boolean;
  purchasable_blueprint: boolean;
  purchasable_kit: boolean;
  price_finished_cents: number | null;
  price_blueprint_cents: number | null;
  price_kit_cents: number | null;
  stripe_price_finished: string | null;
  stripe_price_blueprint: string | null;
  stripe_price_kit: string | null;

  published: boolean;
  in_stock: boolean;
  created_at: string;
}

/** Comma-separated column list for selecting a full library row (public-safe). */
export const LIBRARY_SELECT = "*";
