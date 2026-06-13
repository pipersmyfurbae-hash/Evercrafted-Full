import { useState } from "react";

/* ───────────────────────── EC BRAND TOKENS ───────────────────────── */
const EC = {
  white: "#FFFFFF", offWhite: "#F9F7F4", paper: "#F2EFE9", warm: "#EDE8E0",
  black: "#1A1A1A", charcoal: "#2E2E2E", ink: "#4A4A4A", muted: "#787878", faint: "#A8A8A8",
  green: "#4A6741", greenLight: "#6B8F67", greenPale: "#EEF2ED", greenDim: "rgba(74,103,65,0.12)",
  gold: "#9A7A40", goldLight: "#C4A06A", goldPale: "#F5EFE4",
  dust: "#7A5A80", dustPale: "#F5EEF4",
  border: "#E4DFD8", borderDark: "#CCC7BE",
};
const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS = "'Jost', system-ui, sans-serif";
const SCRIPT = "'Dancing Script', cursive";

const TIER_RANK = { bloom: 1, craft: 2, studio: 3, atelier: 4 };

/* ───────────────────────── BOTANICAL ACCENTS ───────────────────────── */
const LeafSprig = ({ size = 26, color = EC.green }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ color, flexShrink: 0 }}>
    <path d="M16 28 C16 28 8 20 8 12 C8 7.6 11.6 4 16 4 C20.4 4 24 7.6 24 12 C24 20 16 28 16 28Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M16 28 L16 10" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
    <path d="M16 18 C16 18 12 16 10 13" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M16 14 C16 14 20 12 22 9" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

const Divider = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "26px 0" }}>
    <div style={{ flex: 1, height: 1, background: EC.border }} />
    <span style={{ color: EC.green, fontSize: 13, opacity: 0.7 }}>✦</span>
    <div style={{ flex: 1, height: 1, background: EC.border }} />
  </div>
);

const Spinner = () => (
  <span style={{
    display: "inline-block", width: 15, height: 15, borderRadius: "50%",
    border: `2px solid ${EC.greenDim}`, borderTopColor: EC.green,
    animation: "ecspin .65s linear infinite", verticalAlign: "-3px",
  }} />
);

/* ───────────────────────── CLAUDE API ───────────────────────── */
const callClaude = async (userContent, systemPrompt) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};

/* ───────────────────────── SYSTEM PROMPTS ───────────────────────── */
const FORMAT_SPECS = {
  "Mini course": { lessons: 3, modules: 1 },
  "Full course": { lessons: 6, modules: 2 },
  "Masterclass": { lessons: 9, modules: 3 },
};

const outlinePrompt = (fmt) => `You are the Wreath Academy Builder — Evercrafted's course architecture engine for faux botanical wreath makers who want to sell their knowledge.
Given a wreath design (blueprint JSON or description), an audience level, and a teaching voice, produce a sellable course outline.
The course teaches students to BUILD this wreath (and the transferable technique behind it). Structure: exactly ${FORMAT_SPECS[fmt].modules} module(s), ${FORMAT_SPECS[fmt].lessons} lessons total, evenly distributed. Lessons must follow real construction order: base prep → structural layer → focal blooms → secondary/texture → finishing. Use premium silk/faux botanical language only — never "fresh flowers", "plastic", or "artificial".
Return ONLY valid JSON, no markdown, no preamble:
{"course_title":"evocative, sellable title, 5-9 words","tagline":"one sentence promise to the student","transformation":"what the student can do after the course, one sentence","modules":[{"module_title":"...","lessons":[{"lesson_title":"...","summary":"one sentence","duration_min":12}]}],"materials":["item with qty","..."],"suggested_price":"$XX"}`;

const lessonPrompt = `You are the Wreath Academy Builder lesson writer. Write one complete, teachable lesson for a faux botanical wreath course. Voice: warm, precise, master-florist-as-teacher. Use clock-position language for placement (e.g. "anchor at 8:00"). Concrete and physical — wire gauges, stem angles, how things should feel in the hand. Premium silk/faux botanical language only.
Return ONLY valid JSON, no markdown:
{"objective":"what the student accomplishes in this lesson, one sentence","steps":[{"title":"short step name","instruction":"2-3 sentences of precise teaching","pro_tip":"one insider tip from years of practice"}],"common_mistake":"the error most students make here and how to avoid it","checkpoint":"how the student knows this lesson is done right"}
Write 3-5 steps.`;

const videoPrompt = `You are the Wreath Academy Builder video script writer. Write a filmable YouTube/course video script for one wreath-building lesson. Conversational but expert. Include camera/b-roll directions. Premium faux botanical language only.
Return ONLY valid JSON, no markdown:
{"hook":"first 15 seconds, spoken word for word","sections":[{"title":"...","script":"40-70 spoken words","broll":"what the camera shows"}],"outro_cta":"closing line + call to action, spoken"}
Write 3-4 sections.`;

const listingPrompt = `You are the Wreath Academy Builder commercial engine. Write an Etsy/Gumroad sales listing for a digital wreath-making course. Open with the transformation, not the specs. Warm, premium, never craft-store generic.
Return ONLY valid JSON, no markdown:
{"listing_title":"60-80 chars, scroll-stopping","description":"120-150 words, ends with soft CTA","tags":["13 tags"],"price":"$XX","price_reason":"one sentence"}`;

/* ───────────────────────── STYLES ───────────────────────── */
const S = {
  page: { fontFamily: SANS, background: EC.offWhite, minHeight: "100vh", color: EC.black, fontSize: 14, lineHeight: 1.6 },
  shell: { maxWidth: 1080, margin: "0 auto", padding: "0 20px 80px" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
    padding: "16px 0", borderBottom: `1px solid ${EC.border}`, marginBottom: 28,
  },
  wordmark: { fontFamily: SCRIPT, fontSize: 26, color: EC.green, fontWeight: 600, lineHeight: 1 },
  appName: { fontFamily: SERIF, fontSize: 19, color: EC.black, letterSpacing: ".01em" },
  tierBadge: (atelier) => ({
    fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase",
    padding: "4px 12px", borderRadius: 20,
    background: atelier ? EC.black : EC.dustPale, color: atelier ? EC.goldLight : EC.dust,
  }),
  card: { background: EC.white, border: `1px solid ${EC.border}`, borderRadius: 16, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,.05)" },
  eyebrow: { fontSize: 10, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: EC.green, marginBottom: 8 },
  h2: { fontFamily: SERIF, fontSize: 28, fontWeight: 500, lineHeight: 1.15, marginBottom: 6 },
  sub: { fontSize: 13, color: EC.muted, fontWeight: 300, marginBottom: 18 },
  textarea: {
    width: "100%", boxSizing: "border-box", background: EC.paper, border: `1px solid ${EC.border}`, borderRadius: 10,
    fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: EC.charcoal, padding: "12px 14px",
    minHeight: 110, resize: "vertical", outline: "none", lineHeight: 1.65,
  },
  input: {
    width: "100%", boxSizing: "border-box", background: EC.paper, border: `1px solid ${EC.border}`, borderRadius: 10,
    fontFamily: SANS, fontSize: 14, color: EC.charcoal, padding: "10px 14px", outline: "none",
  },
  chipRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: (on) => ({
    padding: "8px 16px", borderRadius: 100, cursor: "pointer", fontSize: 13, fontFamily: SANS,
    border: `1.5px solid ${on ? EC.green : EC.border}`, background: on ? EC.greenPale : EC.paper,
    color: on ? EC.green : EC.muted, fontWeight: on ? 500 : 400, transition: "all .18s ease",
  }),
  label: { fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: EC.faint, margin: "18px 0 8px" },
  btn: (variant = "primary") => ({
    padding: "11px 26px", borderRadius: 100, border: "none", cursor: "pointer", fontFamily: SANS,
    fontSize: 13, fontWeight: 500, letterSpacing: ".04em", transition: "all .18s ease",
    background: variant === "primary" ? EC.green : variant === "dark" ? EC.black : "transparent",
    color: variant === "ghost" ? EC.ink : EC.white,
    ...(variant === "ghost" ? { border: `1.5px solid ${EC.borderDark}` } : {}),
  }),
  lessonRow: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, cursor: "pointer",
    border: `1px solid ${active ? EC.green : EC.border}`, background: active ? EC.greenPale : EC.paper,
    marginBottom: 8, transition: "all .15s ease",
  }),
  lockWrap: { position: "relative", borderRadius: 16, overflow: "hidden" },
  lockBlur: { filter: "blur(4px)", userSelect: "none", pointerEvents: "none", opacity: 0.55 },
  lockOverlay: {
    position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 12, background: "rgba(249,247,244,.78)", backdropFilter: "blur(1px)",
    padding: 24, textAlign: "center",
  },
  err: {
    background: "#F9EDEB", border: "1px solid #E0C4BE", color: "#8A3A30",
    borderRadius: 10, padding: "10px 14px", fontSize: 13, marginTop: 12,
  },
  stepCard: { background: EC.paper, border: `1px solid ${EC.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 },
  proTip: {
    marginTop: 8, padding: "8px 12px", background: EC.goldPale, border: `1px solid rgba(154,122,64,.25)`,
    borderRadius: 8, fontSize: 12.5, color: EC.gold,
  },
};

/* ───────────────────────── APP ───────────────────────── */
export default function WreathAcademyBuilder() {
  const [tier, setTier] = useState("studio"); // demo toggle — auth-driven in production
  const [view, setView] = useState("intake");
  const [designSource, setDesignSource] = useState("");
  const [audience, setAudience] = useState("Beginner");
  const [format, setFormat] = useState("Full course");
  const [voice, setVoice] = useState("");
  const [outline, setOutline] = useState(null);
  const [lessons, setLessons] = useState({});       // key: "m-l" → lesson content
  const [scripts, setScripts] = useState({});        // key: "m-l" → video script
  const [listing, setListing] = useState(null);
  const [selected, setSelected] = useState(null);    // {m, l}
  const [busy, setBusy] = useState(null);            // which action is loading
  const [error, setError] = useState(null);

  const canAccess = (req) => TIER_RANK[tier] >= TIER_RANK[req];
  const key = selected ? `${selected.m}-${selected.l}` : null;

  const briefContext = () =>
    `WREATH DESIGN SOURCE:\n${designSource}\n\nAUDIENCE LEVEL: ${audience}\nCOURSE FORMAT: ${format} (${FORMAT_SPECS[format].lessons} lessons)\nTEACHING VOICE: ${voice || "warm, encouraging, precise"}`;

  const run = async (id, fn) => {
    setBusy(id); setError(null);
    try { await fn(); }
    catch (e) { setError("Generation hit a snag — try once more. (" + (e.message || "parse error") + ")"); }
    setBusy(null);
  };

  const genOutline = () => run("outline", async () => {
    const r = await callClaude(briefContext(), outlinePrompt(format));
    setOutline(r); setLessons({}); setScripts({}); setListing(null); setSelected({ m: 0, l: 0 });
    setView("workspace");
  });

  const genLesson = () => run("lesson", async () => {
    const ls = outline.modules[selected.m].lessons[selected.l];
    const r = await callClaude(
      `${briefContext()}\n\nCOURSE: ${outline.course_title}\nMODULE: ${outline.modules[selected.m].module_title}\nWRITE THIS LESSON: "${ls.lesson_title}" — ${ls.summary}`,
      lessonPrompt
    );
    setLessons(p => ({ ...p, [key]: r }));
  });

  const genScript = () => run("script", async () => {
    const ls = outline.modules[selected.m].lessons[selected.l];
    const body = lessons[key] ? `\nLESSON CONTENT:\n${JSON.stringify(lessons[key])}` : "";
    const r = await callClaude(
      `${briefContext()}\n\nCOURSE: ${outline.course_title}\nVIDEO FOR LESSON: "${ls.lesson_title}" — ${ls.summary}${body}`,
      videoPrompt
    );
    setScripts(p => ({ ...p, [key]: r }));
  });

  const genListing = () => run("listing", async () => {
    const r = await callClaude(
      `${briefContext()}\n\nCOURSE OUTLINE:\n${JSON.stringify({ title: outline.course_title, tagline: outline.tagline, transformation: outline.transformation, modules: outline.modules.map(m => ({ module: m.module_title, lessons: m.lessons.map(l => l.lesson_title) })) })}`,
      listingPrompt
    );
    setListing(r);
  });

  const exportCourse = () => {
    let md = `# ${outline.course_title}\n\n*${outline.tagline}*\n\n**Transformation:** ${outline.transformation}\n\n**Audience:** ${audience} · **Format:** ${format} · **Suggested price:** ${outline.suggested_price}\n\n## Materials\n${(outline.materials || []).map(m => `- ${m}`).join("\n")}\n`;
    outline.modules.forEach((mod, mi) => {
      md += `\n---\n\n# Module ${mi + 1} — ${mod.module_title}\n`;
      mod.lessons.forEach((ls, li) => {
        const k = `${mi}-${li}`;
        md += `\n## Lesson ${li + 1}: ${ls.lesson_title}\n*${ls.summary}* · ~${ls.duration_min} min\n`;
        const L = lessons[k];
        if (L) {
          md += `\n**Objective:** ${L.objective}\n`;
          (L.steps || []).forEach((s, si) => {
            md += `\n### Step ${si + 1} — ${s.title}\n${s.instruction}\n`;
            if (s.pro_tip) md += `\n> ✦ Pro tip: ${s.pro_tip}\n`;
          });
          md += `\n**Common mistake:** ${L.common_mistake}\n\n**Checkpoint:** ${L.checkpoint}\n`;
        }
        const V = scripts[k];
        if (V && canAccess("atelier")) {
          md += `\n### 🎬 Video script\n**Hook:** ${V.hook}\n`;
          (V.sections || []).forEach(sec => { md += `\n**${sec.title}**\n${sec.script}\n*B-roll: ${sec.broll}*\n`; });
          md += `\n**Outro:** ${V.outro_cta}\n`;
        }
      });
    });
    if (listing && canAccess("atelier")) {
      md += `\n---\n\n# Sales listing\n\n**${listing.listing_title}**\n\n${listing.description}\n\n**Tags:** ${(listing.tags || []).join(", ")}\n\n**Price:** ${listing.price} — ${listing.price_reason}\n`;
    }
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (outline.course_title || "wreath-course").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".md";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const lessonsWritten = Object.keys(lessons).length;
  const totalLessons = outline ? outline.modules.reduce((a, m) => a + m.lessons.length, 0) : 0;

  /* ── Render ── */
  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Dancing+Script:wght@600&family=Jost:wght@300;400;500;600&display=swap');
        @keyframes ecspin { to { transform: rotate(360deg); } }
        button:hover { filter: brightness(1.05); }
        textarea:focus, input:focus { border-color: ${EC.green} !important; }
      `}</style>

      <div style={S.shell}>
        {/* HEADER */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LeafSprig />
            <div>
              <div style={S.wordmark}>Evercrafted</div>
              <div style={S.appName}>Wreath Academy Builder</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: EC.faint }}>Demo tier:</span>
            {["studio", "atelier"].map(t => (
              <button key={t} onClick={() => setTier(t)} style={{
                ...S.tierBadge(t === "atelier"), border: "none", cursor: "pointer",
                opacity: tier === t ? 1 : 0.4,
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* ═══ INTAKE ═══ */}
        {view === "intake" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 26 }}>
              <div style={S.eyebrow}>Turn your craft into a course</div>
              <h2 style={{ ...S.h2, fontSize: 36 }}>You already know how to build it.<br /><em style={{ color: EC.green }}>Now teach it.</em></h2>
              <p style={S.sub}>Paste a blueprint or describe a wreath you've made. Academy Builder structures the curriculum, writes the lessons, scripts the videos, and writes the listing that sells it.</p>
            </div>

            <div style={S.card}>
              <div style={S.label}>The wreath you'll teach</div>
              <textarea
                style={S.textarea}
                value={designSource}
                onChange={e => setDesignSource(e.target.value)}
                placeholder={'Paste an Evercrafted blueprint JSON, or describe the design:\n"22-inch grapevine crescent — weeping silver eucalyptus anchored 7:00–9:00, dusty mauve peonies clustered at 9:00, ivory garden roses above, lavender bundles scattered through the sweep, silence zone from 12:00 to 4:00…"'}
              />

              <div style={S.label}>Who is this course for?</div>
              <div style={S.chipRow}>
                {["Beginner", "Intermediate", "Advanced"].map(a => (
                  <button key={a} style={S.chip(audience === a)} onClick={() => setAudience(a)}>{a}</button>
                ))}
              </div>

              <div style={S.label}>Course format</div>
              <div style={S.chipRow}>
                {Object.keys(FORMAT_SPECS).map(f => (
                  <button key={f} style={S.chip(format === f)} onClick={() => setFormat(f)}>
                    {f} · {FORMAT_SPECS[f].lessons} lessons
                  </button>
                ))}
              </div>

              <div style={S.label}>Your teaching voice <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
              <input
                style={S.input}
                value={voice}
                onChange={e => setVoice(e.target.value)}
                placeholder='e.g. "Patient and unfussy — like teaching a friend at my kitchen table"'
              />

              <div style={{ marginTop: 22, display: "flex", justifyContent: "flex-end" }}>
                <button
                  style={{ ...S.btn("primary"), opacity: designSource.trim() ? 1 : 0.4 }}
                  disabled={!designSource.trim() || busy === "outline"}
                  onClick={genOutline}
                >
                  {busy === "outline" ? <>Structuring the curriculum&nbsp;<Spinner /></> : "Build the course outline →"}
                </button>
              </div>
              {error && <div style={S.err}>{error}</div>}
            </div>
          </div>
        )}

        {/* ═══ WORKSPACE ═══ */}
        {view === "workspace" && outline && (
          <div>
            {/* Course header */}
            <div style={{ ...S.card, marginBottom: 18, textAlign: "center" }}>
              <div style={S.eyebrow}>{format} · {audience} · {totalLessons} lessons</div>
              <h2 style={{ ...S.h2, fontSize: 32 }}>{outline.course_title}</h2>
              <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: EC.ink, marginBottom: 4 }}>{outline.tagline}</p>
              <p style={{ fontSize: 12.5, color: EC.muted }}>After this course: {outline.transformation}</p>
              <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button style={S.btn("ghost")} onClick={() => setView("intake")}>← Edit brief</button>
                <button style={S.btn("dark")} onClick={exportCourse}>
                  Export course ({lessonsWritten}/{totalLessons} lessons written)
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, alignItems: "start" }}>
              {/* LEFT — outline (the botanical moment) */}
              <div style={S.card}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <LeafSprig size={20} />
                  <span style={{ ...S.eyebrow, marginBottom: 0 }}>Curriculum</span>
                </div>
                {outline.modules.map((mod, mi) => (
                  <div key={mi} style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: EC.charcoal, margin: "6px 0 8px" }}>
                      {outline.modules.length > 1 ? `Module ${mi + 1} — ` : ""}{mod.module_title}
                    </div>
                    {mod.lessons.map((ls, li) => {
                      const k = `${mi}-${li}`;
                      const active = selected && selected.m === mi && selected.l === li;
                      return (
                        <div key={li} style={S.lessonRow(active)} onClick={() => setSelected({ m: mi, l: li })}>
                          <span style={{
                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700,
                            background: lessons[k] ? EC.green : EC.white,
                            color: lessons[k] ? EC.white : EC.faint,
                            border: `1.5px solid ${lessons[k] ? EC.green : EC.borderDark}`,
                          }}>{lessons[k] ? "✓" : li + 1}</span>
                          <span style={{ fontSize: 13, color: active ? EC.green : EC.ink, fontWeight: active ? 500 : 400, lineHeight: 1.35 }}>
                            {ls.lesson_title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <Divider />
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: EC.faint, marginBottom: 8 }}>Materials list</div>
                {(outline.materials || []).map((m, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: EC.ink, padding: "3px 0", borderBottom: i < outline.materials.length - 1 ? `1px solid ${EC.paper}` : "none" }}>{m}</div>
                ))}
                <div style={{ marginTop: 12, padding: "8px 12px", background: EC.goldPale, borderRadius: 8, fontSize: 12.5, color: EC.gold, fontWeight: 500 }}>
                  Suggested course price: {outline.suggested_price}
                </div>
              </div>

              {/* RIGHT — lesson editor + atelier features */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Lesson content */}
                <div style={S.card}>
                  {selected && (() => {
                    const ls = outline.modules[selected.m].lessons[selected.l];
                    const L = lessons[key];
                    return (
                      <>
                        <div style={S.eyebrow}>Lesson {selected.l + 1} · ~{ls.duration_min} min</div>
                        <h3 style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 500, marginBottom: 4 }}>{ls.lesson_title}</h3>
                        <p style={{ fontSize: 13, color: EC.muted, marginBottom: 16, fontStyle: "italic", fontFamily: SERIF }}>{ls.summary}</p>
                        {!L ? (
                          <button style={S.btn("primary")} disabled={busy === "lesson"} onClick={genLesson}>
                            {busy === "lesson" ? <>Writing the lesson&nbsp;<Spinner /></> : "✦ Write this lesson"}
                          </button>
                        ) : (
                          <>
                            <div style={{ padding: "8px 12px", background: EC.greenPale, borderRadius: 8, fontSize: 13, color: EC.green, marginBottom: 14 }}>
                              <strong>Objective:</strong> {L.objective}
                            </div>
                            {(L.steps || []).map((s, si) => (
                              <div key={si} style={S.stepCard}>
                                <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                                  <span style={{ color: EC.green }}>{si + 1}.</span> {s.title}
                                </div>
                                <div style={{ fontSize: 13.5, color: EC.ink }}>{s.instruction}</div>
                                {s.pro_tip && <div style={S.proTip}>✦ Pro tip — {s.pro_tip}</div>}
                              </div>
                            ))}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                              <div style={{ ...S.stepCard, marginBottom: 0, background: "#F9EDEB", borderColor: "#E0C4BE" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#8A3A30", marginBottom: 4 }}>Common mistake</div>
                                <div style={{ fontSize: 12.5, color: EC.ink }}>{L.common_mistake}</div>
                              </div>
                              <div style={{ ...S.stepCard, marginBottom: 0, background: EC.greenPale, borderColor: "rgba(74,103,65,.25)" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: EC.green, marginBottom: 4 }}>Checkpoint</div>
                                <div style={{ fontSize: 12.5, color: EC.ink }}>{L.checkpoint}</div>
                              </div>
                            </div>
                            <button style={{ ...S.btn("ghost"), marginTop: 14 }} disabled={busy === "lesson"} onClick={genLesson}>
                              {busy === "lesson" ? <>Rewriting&nbsp;<Spinner /></> : "↻ Rewrite lesson"}
                            </button>
                          </>
                        )}
                      </>
                    );
                  })()}
                  {error && <div style={S.err}>{error}</div>}
                </div>

                {/* VIDEO SCRIPT — Atelier */}
                <div style={canAccess("atelier") ? {} : S.lockWrap}>
                  <div style={{ ...S.card, ...(canAccess("atelier") ? {} : S.lockBlur) }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={S.eyebrow}>🎬 Video script — this lesson</div>
                      <span style={S.tierBadge(true)}>Atelier</span>
                    </div>
                    {!scripts[key] ? (
                      <button style={S.btn("primary")} disabled={!canAccess("atelier") || busy === "script"} onClick={genScript}>
                        {busy === "script" ? <>Scripting&nbsp;<Spinner /></> : "Write the video script"}
                      </button>
                    ) : (
                      <>
                        <div style={{ ...S.stepCard, background: EC.dustPale, borderColor: "rgba(122,90,128,.25)" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: EC.dust, marginBottom: 4 }}>The hook — first 15 seconds</div>
                          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14.5 }}>{scripts[key].hook}</div>
                        </div>
                        {(scripts[key].sections || []).map((sec, i) => (
                          <div key={i} style={S.stepCard}>
                            <div style={{ fontFamily: SERIF, fontSize: 15.5, fontWeight: 600, marginBottom: 4 }}>{sec.title}</div>
                            <div style={{ fontSize: 13.5, color: EC.ink }}>{sec.script}</div>
                            <div style={{ fontSize: 12, color: EC.faint, marginTop: 6 }}>📷 B-roll: {sec.broll}</div>
                          </div>
                        ))}
                        <div style={{ fontSize: 13, color: EC.ink, fontStyle: "italic", fontFamily: SERIF }}>Outro: {scripts[key].outro_cta}</div>
                      </>
                    )}
                  </div>
                  {!canAccess("atelier") && (
                    <div style={S.lockOverlay}>
                      <div style={{ fontSize: 20 }}>✦</div>
                      <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500 }}>Video scripts are an Atelier feature</div>
                      <div style={{ fontSize: 12.5, color: EC.muted, maxWidth: 340 }}>Filmable scripts with hooks, spoken sections, and b-roll direction — for every lesson in your course.</div>
                      <button style={S.btn("dark")} onClick={() => setTier("atelier")}>Unlock with Atelier</button>
                    </div>
                  )}
                </div>

                {/* SALES LISTING — Atelier */}
                <div style={canAccess("atelier") ? {} : S.lockWrap}>
                  <div style={{ ...S.card, ...(canAccess("atelier") ? {} : S.lockBlur) }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={S.eyebrow}>Sell-ready listing — whole course</div>
                      <span style={S.tierBadge(true)}>Atelier</span>
                    </div>
                    {!listing ? (
                      <button style={S.btn("primary")} disabled={!canAccess("atelier") || busy === "listing"} onClick={genListing}>
                        {busy === "listing" ? <>Writing the listing&nbsp;<Spinner /></> : "Write the sales listing"}
                      </button>
                    ) : (
                      <>
                        <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{listing.listing_title}</div>
                        <div style={{ ...S.stepCard, fontSize: 13.5, lineHeight: 1.7 }}>{listing.description}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                          {(listing.tags || []).map((t, i) => (
                            <span key={i} style={{ fontSize: 11, padding: "2px 10px", borderRadius: 20, background: EC.greenPale, color: EC.green, border: "1px solid rgba(74,103,65,.2)" }}>{t}</span>
                          ))}
                        </div>
                        <div style={{ padding: "8px 12px", background: EC.goldPale, borderRadius: 8, fontSize: 13, color: EC.gold }}>
                          <strong>{listing.price}</strong> — {listing.price_reason}
                        </div>
                      </>
                    )}
                  </div>
                  {!canAccess("atelier") && (
                    <div style={S.lockOverlay}>
                      <div style={{ fontSize: 20 }}>✦</div>
                      <div style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 500 }}>The sales listing ships with Atelier</div>
                      <div style={{ fontSize: 12.5, color: EC.muted, maxWidth: 340 }}>Etsy/Gumroad-ready title, description, 13 tags, and pricing strategy for your finished course.</div>
                      <button style={S.btn("dark")} onClick={() => setTier("atelier")}>Unlock with Atelier</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
