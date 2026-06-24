# Wreath Academy Builder — Next.js Production Scaffold
### Evercrafted Studio · Supabase + Stripe + Vercel

Annotated file tree followed by complete code for every file. Hand this to a developer (or Claude Code) and it builds.

```
wreath-academy-builder/
├── app/
│   ├── layout.tsx                  — EC font load + global token CSS
│   ├── page.tsx                    — Landing shell (embeds marketing content or redirects to /app)
│   ├── app/
│   │   └── page.tsx                — Authenticated app page (renders AcademyBuilderApp)
│   └── api/
│       ├── claude/route.ts         — Server-side Claude proxy with auth + tier check
│       └── stripe/webhook/route.ts — Tier sync on subscription events
├── components/
│   ├── ui/
│   │   ├── TierGate.tsx            — Blur overlay + upgrade CTA
│   │   ├── BotanicalDivider.tsx    — ✦ divider with leaf sprig
│   │   └── AppHeader.tsx           — EC wordmark + app name + tier badge
│   └── AcademyBuilderApp.tsx       — Main app (port of the artifact, state → Supabase)
├── lib/
│   ├── tier.ts                     — TIER_RANK, canAccess(), labels, colors
│   ├── claude.ts                   — Typed Claude wrapper + the four system prompts
│   ├── ec-tokens.ts                — EC tokens as TS constants
│   └── supabase.ts                 — Browser + server clients
├── hooks/
│   └── useTier.ts                  — Reads tier from Supabase session
├── styles/
│   └── ec-tokens.css               — --ec-* CSS custom property system
├── supabase/
│   └── migrations/
│       └── 001_init.sql            — profiles, courses, lessons + RLS
└── .env.local.example
```

---

## `.env.local.example`

```bash
NEXT_PUBLIC_SUPABASE_URL=            # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Supabase anon (public) key
SUPABASE_SERVICE_ROLE_KEY=           # Service role — server only, used by webhook
STRIPE_SECRET_KEY=                   # Stripe secret key
STRIPE_WEBHOOK_SECRET=               # From `stripe listen` or dashboard webhook
STRIPE_PRICE_BLOOM=                  # price_xxx — free tier placeholder (optional)
STRIPE_PRICE_CRAFT=                  # price_xxx
STRIPE_PRICE_STUDIO=                 # price_xxx
STRIPE_PRICE_ATELIER=                # price_xxx
STRIPE_PRICE_ACADEMY_LIFETIME=       # price_xxx — $99 one-time license
ANTHROPIC_API_KEY=                   # SERVER-SIDE ONLY. Never NEXT_PUBLIC_.
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## `styles/ec-tokens.css`

```css
:root {
  --ec-white:#FFFFFF; --ec-off-white:#F9F7F4; --ec-paper:#F2EFE9; --ec-warm:#EDE8E0;
  --ec-black:#1A1A1A; --ec-charcoal:#2E2E2E; --ec-ink:#4A4A4A; --ec-muted:#787878; --ec-faint:#A8A8A8;
  --ec-green:#4A6741; --ec-green-light:#6B8F67; --ec-green-pale:#EEF2ED; --ec-green-dim:rgba(74,103,65,.12);
  --ec-gold:#9A7A40; --ec-gold-light:#C4A06A; --ec-gold-pale:#F5EFE4;
  --ec-dust:#7A5A80; --ec-dust-pale:#F5EEF4;
  --ec-border:#E4DFD8; --ec-border-dark:#CCC7BE;
  --ec-serif:'Cormorant Garamond', Georgia, serif;
  --ec-sans:'Jost', system-ui, sans-serif;
  --ec-script:'Dancing Script', cursive;
  --ec-shadow-sm:0 1px 4px rgba(0,0,0,.06);
  --ec-shadow-md:0 4px 20px rgba(0,0,0,.08);
  --ec-shadow-lg:0 12px 48px rgba(0,0,0,.10);
}
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--ec-sans); background: var(--ec-off-white); color: var(--ec-black); }
@keyframes ec-spin { to { transform: rotate(360deg); } }
.ec-spinner {
  display: inline-block; width: 15px; height: 15px; border-radius: 50%;
  border: 2px solid var(--ec-green-dim); border-top-color: var(--ec-green);
  animation: ec-spin .65s linear infinite;
}
```

---

## `lib/ec-tokens.ts`

```typescript
export const EC = {
  white: "#FFFFFF", offWhite: "#F9F7F4", paper: "#F2EFE9", warm: "#EDE8E0",
  black: "#1A1A1A", charcoal: "#2E2E2E", ink: "#4A4A4A", muted: "#787878", faint: "#A8A8A8",
  green: "#4A6741", greenLight: "#6B8F67", greenPale: "#EEF2ED", greenDim: "rgba(74,103,65,0.12)",
  gold: "#9A7A40", goldLight: "#C4A06A", goldPale: "#F5EFE4",
  dust: "#7A5A80", dustPale: "#F5EEF4",
  border: "#E4DFD8", borderDark: "#CCC7BE",
} as const;

export const FONTS = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Jost', system-ui, sans-serif",
  script: "'Dancing Script', cursive",
} as const;
```

---

## `lib/tier.ts`

```typescript
export type Tier = "bloom" | "craft" | "studio" | "atelier";

export const TIER_RANK: Record<Tier, number> = { bloom: 1, craft: 2, studio: 3, atelier: 4 };

export const TIER_LABELS: Record<Tier, string> = {
  bloom: "Bloom", craft: "Craft", studio: "Studio", atelier: "Atelier",
};

export const TIER_COLORS: Record<Tier, { bg: string; fg: string }> = {
  bloom:   { bg: "#EEF2ED", fg: "#4A6741" },
  craft:   { bg: "#EEF4F9", fg: "#4A6785" },
  studio:  { bg: "#F5EEF4", fg: "#7A5A80" },
  atelier: { bg: "#1A1A1A", fg: "#C4A06A" },
};

export const canAccess = (userTier: Tier, required: Tier): boolean =>
  TIER_RANK[userTier] >= TIER_RANK[required];

// Academy Builder feature gates.
// Lifetime license holders are treated as atelier for THIS app only
// (profiles.academy_lifetime = true).
export const ACADEMY_GATES = {
  outline: "studio" as Tier,
  lessons: "studio" as Tier,
  videoScripts: "atelier" as Tier,
  salesListing: "atelier" as Tier,
  whiteLabelExport: "atelier" as Tier,
};
```

---

## `lib/supabase.ts`

```typescript
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

export const supabaseServer = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
};
```

---

## `lib/claude.ts`

```typescript
// Typed wrapper + the four Academy Builder system prompts.
// Used ONLY by app/api/claude/route.ts — never imported client-side.
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export type AcademyTask = "outline" | "lesson" | "video" | "listing";

const FORMAT_SPECS: Record<string, { lessons: number; modules: number }> = {
  "Mini course": { lessons: 3, modules: 1 },
  "Full course": { lessons: 6, modules: 2 },
  "Masterclass": { lessons: 9, modules: 3 },
};

export const SYSTEM_PROMPTS: Record<AcademyTask, (ctx?: { format?: string }) => string> = {
  outline: (ctx) => {
    const f = FORMAT_SPECS[ctx?.format ?? "Full course"];
    return `You are the Wreath Academy Builder — Evercrafted's course architecture engine for faux botanical wreath makers who want to sell their knowledge.
Given a wreath design (blueprint JSON or description), an audience level, and a teaching voice, produce a sellable course outline.
The course teaches students to BUILD this wreath (and the transferable technique behind it). Structure: exactly ${f.modules} module(s), ${f.lessons} lessons total, evenly distributed. Lessons must follow real construction order: base prep → structural layer → focal blooms → secondary/texture → finishing. Use premium silk/faux botanical language only — never "fresh flowers", "plastic", or "artificial".
Return ONLY valid JSON, no markdown:
{"course_title":"...","tagline":"...","transformation":"...","modules":[{"module_title":"...","lessons":[{"lesson_title":"...","summary":"...","duration_min":12}]}],"materials":["..."],"suggested_price":"$XX"}`;
  },
  lesson: () => `You are the Wreath Academy Builder lesson writer. Write one complete, teachable lesson for a faux botanical wreath course. Voice: warm, precise, master-florist-as-teacher. Use clock-position language for placement. Concrete and physical — wire gauges, stem angles, how things should feel in the hand. Premium silk/faux botanical language only.
Return ONLY valid JSON, no markdown:
{"objective":"...","steps":[{"title":"...","instruction":"...","pro_tip":"..."}],"common_mistake":"...","checkpoint":"..."}
Write 3-5 steps.`,
  video: () => `You are the Wreath Academy Builder video script writer. Write a filmable YouTube/course video script for one wreath-building lesson. Conversational but expert. Include camera/b-roll directions. Premium faux botanical language only.
Return ONLY valid JSON, no markdown:
{"hook":"...","sections":[{"title":"...","script":"...","broll":"..."}],"outro_cta":"..."}
Write 3-4 sections.`,
  listing: () => `You are the Wreath Academy Builder commercial engine. Write an Etsy/Gumroad sales listing for a digital wreath-making course. Open with the transformation, not the specs. Warm, premium, never craft-store generic.
Return ONLY valid JSON, no markdown:
{"listing_title":"...","description":"...","tags":["13 tags"],"price":"$XX","price_reason":"..."}`,
};

export async function runAcademyTask(
  task: AcademyTask,
  userContent: string,
  ctx?: { format?: string }
): Promise<unknown> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    system: SYSTEM_PROMPTS[task](ctx),
    messages: [{ role: "user", content: userContent }],
  });
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(text);
}
```

---

## `app/api/claude/route.ts`

```typescript
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { runAcademyTask, type AcademyTask } from "@/lib/claude";
import { canAccess, ACADEMY_GATES, type Tier } from "@/lib/tier";

const TASK_GATE: Record<AcademyTask, Tier> = {
  outline: ACADEMY_GATES.outline,
  lesson: ACADEMY_GATES.lessons,
  video: ACADEMY_GATES.videoScripts,
  listing: ACADEMY_GATES.salesListing,
};

export async function POST(req: Request) {
  // 1. Verify session
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // 2. Check tier (lifetime license counts as atelier for this app)
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, academy_lifetime")
    .eq("id", user.id)
    .single();

  const effectiveTier: Tier = profile?.academy_lifetime ? "atelier" : (profile?.tier ?? "bloom");

  const body = await req.json();
  const task = body.task as AcademyTask;
  if (!TASK_GATE[task]) return NextResponse.json({ error: "Unknown task" }, { status: 400 });

  if (!canAccess(effectiveTier, TASK_GATE[task])) {
    return NextResponse.json(
      { error: "tier_required", required: TASK_GATE[task] },
      { status: 403 }
    );
  }

  // 3. Call Claude
  try {
    const data = await runAcademyTask(task, String(body.content ?? ""), { format: body.format });
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
```

---

## `app/api/stripe/webhook/route.ts`

```typescript
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_PRICE_CRAFT!]: "craft",
  [process.env.STRIPE_PRICE_STUDIO!]: "studio",
  [process.env.STRIPE_PRICE_ATELIER!]: "atelier",
};

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    if (!userId) return NextResponse.json({ received: true });

    const items = await stripe.checkout.sessions.listLineItems(session.id);
    for (const item of items.data) {
      const priceId = item.price?.id ?? "";
      if (priceId === process.env.STRIPE_PRICE_ACADEMY_LIFETIME) {
        await admin.from("profiles").update({ academy_lifetime: true }).eq("id", userId);
      } else if (PRICE_TO_TIER[priceId]) {
        await admin.from("profiles").update({ tier: PRICE_TO_TIER[priceId] }).eq("id", userId);
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.user_id;
    if (userId) await admin.from("profiles").update({ tier: "bloom" }).eq("id", userId);
  }

  return NextResponse.json({ received: true });
}
```

---

## `supabase/migrations/001_init.sql`

```sql
-- Profiles: one row per auth user, tier + lifetime license flag
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'bloom' check (tier in ('bloom','craft','studio','atelier')),
  academy_lifetime boolean not null default false,
  created_at timestamptz not null default now()
);

-- Courses: one row per generated course
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_title text not null,
  design_source text not null,
  audience text not null,
  format text not null,
  voice text,
  outline jsonb not null,          -- full outline JSON from Claude
  listing jsonb,                   -- sales listing JSON (atelier)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_user_idx on public.courses(user_id);

-- Lessons: generated lesson + optional video script per outline slot
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  module_index int not null,
  lesson_index int not null,
  content jsonb,                   -- lesson JSON
  video_script jsonb,              -- video script JSON (atelier)
  updated_at timestamptz not null default now(),
  unique (course_id, module_index, lesson_index)
);
create index lessons_course_idx on public.lessons(course_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.courses  enable row level security;
alter table public.lessons  enable row level security;

create policy "own profile read"  on public.profiles for select using (auth.uid() = id);
create policy "own profile write" on public.profiles for update using (auth.uid() = id);

create policy "own courses" on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own lessons" on public.lessons
  for all using (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.courses c where c.id = course_id and c.user_id = auth.uid()));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end; $$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## `hooks/useTier.ts`

```typescript
"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import type { Tier } from "@/lib/tier";

export function useTier() {
  const [tier, setTier] = useState<Tier>("bloom");
  const [lifetime, setLifetime] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = supabaseBrowser();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles").select("tier, academy_lifetime").eq("id", user.id).single();
      if (data) { setTier(data.tier as Tier); setLifetime(!!data.academy_lifetime); }
      setLoading(false);
    });
  }, []);

  // Lifetime license = atelier access within Academy Builder
  const effectiveTier: Tier = lifetime ? "atelier" : tier;
  return { tier: effectiveTier, baseTier: tier, lifetime, loading };
}
```

---

## `components/ui/AppHeader.tsx`

```tsx
import { TIER_LABELS, TIER_COLORS, type Tier } from "@/lib/tier";
import { FONTS, EC } from "@/lib/ec-tokens";

export function AppHeader({ appName, tier }: { appName: string; tier: Tier }) {
  const tc = TIER_COLORS[tier];
  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 0", borderBottom: `1px solid ${EC.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" style={{ color: EC.green }}>
          <path d="M16 28 C16 28 8 20 8 12 C8 7.6 11.6 4 16 4 C20.4 4 24 7.6 24 12 C24 20 16 28 16 28Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M16 28 L16 10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        </svg>
        <div>
          <div style={{ fontFamily: FONTS.script, fontSize: 26, color: EC.green, fontWeight: 600, lineHeight: 1 }}>Evercrafted</div>
          <div style={{ fontFamily: FONTS.serif, fontSize: 19 }}>{appName}</div>
        </div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
        padding: "4px 12px", borderRadius: 20, background: tc.bg, color: tc.fg,
      }}>{TIER_LABELS[tier]}</span>
    </header>
  );
}
```

---

## `components/ui/TierGate.tsx`

```tsx
"use client";
import type { ReactNode } from "react";
import { canAccess, TIER_LABELS, type Tier } from "@/lib/tier";
import { FONTS, EC } from "@/lib/ec-tokens";

export function TierGate({
  userTier, required, title, description, children,
}: {
  userTier: Tier; required: Tier; title: string; description: string; children: ReactNode;
}) {
  if (canAccess(userTier, required)) return <>{children}</>;
  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ filter: "blur(4px)", userSelect: "none", pointerEvents: "none", opacity: 0.55 }}>
        {children}
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12, padding: 24, textAlign: "center",
        background: "rgba(249,247,244,.78)", backdropFilter: "blur(1px)",
      }}>
        <span style={{ fontSize: 20, color: EC.green }}>✦</span>
        <div style={{ fontFamily: FONTS.serif, fontSize: 19, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: EC.muted, maxWidth: 340 }}>{description}</div>
        <a href="/pricing" style={{
          padding: "11px 26px", borderRadius: 100, background: EC.black, color: EC.white,
          fontSize: 13, fontWeight: 500, textDecoration: "none",
        }}>Unlock with {TIER_LABELS[required]}</a>
      </div>
    </div>
  );
}
```

---

## `components/ui/BotanicalDivider.tsx`

```tsx
import { EC } from "@/lib/ec-tokens";

export function BotanicalDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "26px 0" }}>
      <div style={{ flex: 1, height: 1, background: EC.border }} />
      <span style={{ color: EC.green, fontSize: 13, opacity: 0.7 }}>✦</span>
      <div style={{ flex: 1, height: 1, background: EC.border }} />
    </div>
  );
}
```

---

## `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import "../styles/ec-tokens.css";

export const metadata: Metadata = {
  title: "Wreath Academy Builder — Evercrafted",
  description: "Turn the wreaths you already make into courses people pay for.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Dancing+Script:wght@600&family=Jost:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## `app/app/page.tsx`

```tsx
"use client";
import { AcademyBuilderApp } from "@/components/AcademyBuilderApp";
import { AppHeader } from "@/components/ui/AppHeader";
import { useTier } from "@/hooks/useTier";

export default function AppPage() {
  const { tier, loading } = useTier();
  if (loading) return <div style={{ padding: 80, textAlign: "center" }}><span className="ec-spinner" /></div>;
  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "0 20px 80px" }}>
      <AppHeader appName="Wreath Academy Builder" tier={tier} />
      <AcademyBuilderApp tier={tier} />
    </main>
  );
}
```

---

## `components/AcademyBuilderApp.tsx`

Port the artifact (`wreath-academy-builder.jsx`) with three substitutions:

1. **API calls** go to the proxy, never to Anthropic directly:

```typescript
const callAcademy = async (task: "outline" | "lesson" | "video" | "listing", content: string, format?: string) => {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, content, format }),
  });
  const json = await res.json();
  if (res.status === 403) throw new Error(`Requires ${json.required} tier`);
  if (!json.success) throw new Error(json.error || "Generation failed");
  return json.data;
};
```

2. **Persistence**: after `genOutline` succeeds, insert into `courses`; after each `genLesson`/`genScript`, upsert into `lessons`; after `genListing`, update `courses.listing`. On mount, list the user's saved courses and allow resume.

3. **Tier**: replace the demo toggle with the `tier` prop from `useTier()`; wrap the video-script and listing panels in `<TierGate required="atelier" …>`.

---

## `app/page.tsx`

```tsx
// Landing page shell — serve the marketing page content here
// (port wreath-academy-marketing.html into JSX, or statically host it
// and make this a redirect to /app for authenticated users).
import { redirect } from "next/navigation";
export default function Home() { redirect("/app"); }
```

---

## Deploy sequence

1. `npx create-next-app@latest wreath-academy-builder --ts --app` then drop these files in
2. `npm i @supabase/ssr @supabase/supabase-js @anthropic-ai/sdk stripe`
3. Supabase: create project → run `001_init.sql` → enable email auth
4. Stripe: create the four subscription prices + the $99 lifetime one-time price → add webhook → copy secrets
5. Vercel: import repo → set all env vars → deploy
6. Smoke test: signup → bloom profile auto-created → upgrade via Stripe test card → outline gated correctly → lifetime license flips `academy_lifetime`
