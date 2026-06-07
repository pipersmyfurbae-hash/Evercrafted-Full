import Link from "next/link";
import { notFound } from "next/navigation";
import BlueprintSVG from "@/components/BlueprintSVG";
import PurchasePanel from "@/components/PurchasePanel";
import { supabaseServer } from "@/lib/supabase-server";
import type { LibraryRow } from "@/lib/library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getWreath(slug: string): Promise<LibraryRow | null> {
  let supabase;
  try {
    supabase = supabaseServer();
  } catch {
    return null;
  }
  const { data, error } = await supabase
    .from("library")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  if (error || !data) return null;
  return data as unknown as LibraryRow;
}

export default async function WreathPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wreath = await getWreath(id);
  if (!wreath) notFound();

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 80 }}>
      <Link href="/matches" className="note" style={{ textDecoration: "underline" }}>
        ← Back to your matches
      </Link>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, marginTop: 18 }} className="wreath-grid">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wreath.hero_image_url}
            alt={wreath.title}
            style={{ width: "100%", borderRadius: 4, border: "1px solid var(--line)", display: "block" }}
          />
          <div
            className="blueprint-wrap"
            style={{ marginTop: 16, borderRadius: 4, border: "1px solid var(--line)", aspectRatio: "16 / 9" }}
          >
            <BlueprintSVG blueprint={wreath.blueprint} />
            <span className="reveal-hint">{wreath.blueprint.totalStems} stems · {wreath.formula}</span>
          </div>
        </div>

        <div>
          <p className="script" style={{ fontSize: 22 }}>{wreath.occasion ?? "Evercrafted"}</p>
          <h1 style={{ fontSize: 38 }}>{wreath.title}</h1>
          {wreath.story_copy && (
            <p style={{ fontFamily: "var(--serif)", fontSize: 19, lineHeight: 1.6, color: "var(--ink)" }}>
              {wreath.story_copy}
            </p>
          )}
          <div className="tags" style={{ margin: "16px 0 24px" }}>
            <span className="tag">{wreath.formula}</span>
            {wreath.bow !== "none" && <span className="tag">{wreath.bow} bow</span>}
            {wreath.palette_family && <span className="tag">{wreath.palette_family}</span>}
            {wreath.botanical_leads.map((b) => (
              <span key={b} className="tag">
                {b}
              </span>
            ))}
          </div>

          <PurchasePanel
            slug={wreath.slug}
            priceFinished={wreath.price_finished_cents}
            priceBlueprint={wreath.price_blueprint_cents}
            priceKit={wreath.price_kit_cents}
            purchasableFinished={wreath.purchasable_finished}
            purchasableBlueprint={wreath.purchasable_blueprint}
            purchasableKit={wreath.purchasable_kit}
          />
        </div>
      </div>
    </div>
  );
}
