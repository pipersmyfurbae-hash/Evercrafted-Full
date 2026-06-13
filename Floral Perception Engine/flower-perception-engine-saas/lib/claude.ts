// lib/claude.ts
// Typed Claude API wrapper for the Flower Perception Engine.
// ANTHROPIC_API_KEY is loaded server-side only via process.env — never exposed to the client.

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // server-side only
});

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ColorProfile {
  dominant_hsl: { h: number; s: number; l: number };
  palette_hex: string[];
  color_family: string;
  warm_cool_balance: "warm" | "cool" | "neutral";
}

export interface VisualFeatures {
  color_profile: ColorProfile;
  shape_attributes: {
    classification: string;
    petal_density: "sparse" | "moderate" | "full" | "lush";
    symmetry: "radial" | "bilateral" | "irregular";
  };
  texture_features: {
    surface: string;
    visual_weight: "light" | "medium" | "heavy";
  };
  structural_analysis: {
    bloom_size: "small" | "medium" | "large" | "oversized";
    stem_attachment: "single" | "clustered" | "trailing";
    density: "low" | "medium" | "high";
  };
}

export interface EmotionScore {
  name: string;
  score: number; // 0–1
}

export interface EmotionalProfile {
  primary_emotions: EmotionScore[];
  secondary_emotions: EmotionScore[];
  overall_intensity: number;
  modifiers: { shape_influence: number; texture_influence: number };
}

export interface PerceptionTags {
  emotion_tags: string[];
  color_tags: string[];
  style_tags: string[];
}

export interface PerceptionObject {
  visual_features: VisualFeatures;
  emotional_profile: EmotionalProfile;
  tags: PerceptionTags;
  spatial_injection: {
    density: "low" | "medium" | "high";
    curve_type: string;
    negative_space: "minimal" | "moderate" | "expanded";
  };
  confidence_score: number;
  botanical_name: string;
  common_name: string;
}

export interface BlueprintCluster {
  id: string;
  role: "focal" | "supporting" | "accent";
  placement_degrees: number;
  radius_ratio: number;
  florals: Array<{ type: string; count: number; color: string }>;
}

export interface BlueprintObject {
  blueprint_id: string;
  origin: "image_perception";
  source_perception_id: string;
  form: { diameter_inches: number; form_type: string };
  emotional_intent: string;
  clusters: BlueprintCluster[];
  greenery: { type: string; coverage: string; flow: string };
  render_hint: { lighting: string; depth: string; realism: string };
  midjourney_style_note: string;
}

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const PERCEPTION_SYSTEM_PROMPT = `You are the Evercrafted Flower Perception Engine — a specialist AI that analyzes floral images and returns structured emotional + botanical intelligence.

Respond ONLY with valid JSON. No markdown, no backticks, no explanation.

Return this exact schema:
{
  "visual_features": {
    "color_profile": {
      "dominant_hsl": {"h": number, "s": number, "l": number},
      "palette_hex": ["#hex1","#hex2","#hex3","#hex4"],
      "color_family": "string",
      "warm_cool_balance": "warm | cool | neutral"
    },
    "shape_attributes": {
      "classification": "string",
      "petal_density": "sparse | moderate | full | lush",
      "symmetry": "radial | bilateral | irregular"
    },
    "texture_features": {
      "surface": "string",
      "visual_weight": "light | medium | heavy"
    },
    "structural_analysis": {
      "bloom_size": "small | medium | large | oversized",
      "stem_attachment": "single | clustered | trailing",
      "density": "low | medium | high"
    }
  },
  "emotional_profile": {
    "primary_emotions": [{"name": "string", "score": number}],
    "secondary_emotions": [{"name": "string", "score": number}],
    "overall_intensity": number,
    "modifiers": {"shape_influence": number, "texture_influence": number}
  },
  "tags": {
    "emotion_tags": ["string"],
    "color_tags": ["string"],
    "style_tags": ["string"]
  },
  "spatial_injection": {
    "density": "low | medium | high",
    "curve_type": "string",
    "negative_space": "minimal | moderate | expanded"
  },
  "confidence_score": number,
  "botanical_name": "string",
  "common_name": "string"
}`;

const BLUEPRINT_SYSTEM_PROMPT = `You are the Evercrafted Blueprint Generator. Convert a flower perception object into a structured wreath blueprint.
Respond ONLY with valid JSON. No markdown, no backticks.

Schema:
{
  "blueprint_id": "bp_XXXXXXXX",
  "origin": "image_perception",
  "source_perception_id": "string",
  "form": {"diameter_inches": 24, "form_type": "asymmetrical"},
  "emotional_intent": "string",
  "clusters": [
    {"id":"C1","role":"focal","placement_degrees":number,"radius_ratio":number,"florals":[{"type":"string","count":number,"color":"string"}]},
    {"id":"C2","role":"supporting","placement_degrees":number,"radius_ratio":number,"florals":[{"type":"string","count":number,"color":"string"}]},
    {"id":"C3","role":"supporting","placement_degrees":number,"radius_ratio":number,"florals":[{"type":"string","count":number,"color":"string"}]}
  ],
  "greenery": {"type":"string","coverage":"60-70%","flow":"cascading"},
  "render_hint": {"lighting":"soft directional","depth":"multi-plane","realism":"photo-real"},
  "midjourney_style_note": "string"
}`;

// ─── FUNCTIONS ────────────────────────────────────────────────────────────────

export async function analyzeFlowerImage(
  base64: string,
  mediaType: string
): Promise<PerceptionObject> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1200,
    system: PERCEPTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType as any, data: base64 },
          },
          { type: "text", text: "Analyze this floral image and return the perception object." },
        ],
      },
    ],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("");

  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as PerceptionObject;
}

export async function generateBlueprintFromPerception(
  perception: PerceptionObject,
  perceptionId: string
): Promise<BlueprintObject> {
  const topEmotions = perception.emotional_profile.primary_emotions.map((e) => e.name).join(", ");
  const colorFamily = perception.visual_features.color_profile.color_family;
  const shape = perception.visual_features.shape_attributes.classification;
  const density = perception.visual_features.structural_analysis.density;
  const spatial = perception.spatial_injection;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: BLUEPRINT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Perception data:
- Lead emotions: ${topEmotions}
- Color family: ${colorFamily}
- Shape: ${shape}
- Density: ${density}
- Spatial curve: ${spatial.curve_type}
- Negative space: ${spatial.negative_space}
- Source perception ID: ${perceptionId}

Generate the blueprint.`,
      },
    ],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("");

  const clean = raw.replace(/```json|```/g, "").trim();
  const blueprint = JSON.parse(clean) as BlueprintObject;
  blueprint.source_perception_id = perceptionId;
  return blueprint;
}
