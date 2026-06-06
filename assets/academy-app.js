const {
  useState
} = React;

/* ───────────────────────── EC BRAND TOKENS ───────────────────────── */
const EC = {
  white: "#FFFFFF",
  offWhite: "#F9F7F4",
  paper: "#F2EFE9",
  warm: "#EDE8E0",
  black: "#1A1A1A",
  charcoal: "#2E2E2E",
  ink: "#4A4A4A",
  muted: "#787878",
  faint: "#A8A8A8",
  green: "#4A6741",
  greenLight: "#6B8F67",
  greenPale: "#EEF2ED",
  greenDim: "rgba(74,103,65,0.12)",
  gold: "#9A7A40",
  goldLight: "#C4A06A",
  goldPale: "#F5EFE4",
  dust: "#7A5A80",
  dustPale: "#F5EEF4",
  border: "#E4DFD8",
  borderDark: "#CCC7BE"
};
const SERIF = "'Italiana', Georgia, serif";
const SANS = "'Jost', system-ui, sans-serif";
const SCRIPT = "'Dancing Script', cursive";
const TIER_RANK = {
  bloom: 1,
  craft: 2,
  studio: 3,
  atelier: 4
};

/* ───────────────────────── BOTANICAL ACCENTS ───────────────────────── */
const LeafSprig = ({
  size = 26,
  color = EC.green
}) => /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 32 32",
  fill: "none",
  style: {
    color,
    flexShrink: 0
  }
}, /*#__PURE__*/React.createElement("path", {
  d: "M16 28 C16 28 8 20 8 12 C8 7.6 11.6 4 16 4 C20.4 4 24 7.6 24 12 C24 20 16 28 16 28Z",
  stroke: "currentColor",
  strokeWidth: "1.5",
  fill: "none"
}), /*#__PURE__*/React.createElement("path", {
  d: "M16 28 L16 10",
  stroke: "currentColor",
  strokeWidth: "1",
  strokeDasharray: "2 2"
}), /*#__PURE__*/React.createElement("path", {
  d: "M16 18 C16 18 12 16 10 13",
  stroke: "currentColor",
  strokeWidth: "1",
  fill: "none"
}), /*#__PURE__*/React.createElement("path", {
  d: "M16 14 C16 14 20 12 22 9",
  stroke: "currentColor",
  strokeWidth: "1",
  fill: "none"
}));
const Divider = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    margin: "26px 0"
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    height: 1,
    background: EC.border
  }
}), /*#__PURE__*/React.createElement("span", {
  style: {
    color: EC.green,
    fontSize: 13,
    opacity: 0.7
  }
}, "\u2726"), /*#__PURE__*/React.createElement("div", {
  style: {
    flex: 1,
    height: 1,
    background: EC.border
  }
}));
const Spinner = () => /*#__PURE__*/React.createElement("span", {
  style: {
    display: "inline-block",
    width: 15,
    height: 15,
    borderRadius: "50%",
    border: `2px solid ${EC.greenDim}`,
    borderTopColor: EC.green,
    animation: "ecspin .65s linear infinite",
    verticalAlign: "-3px"
  }
});

/* ───────────────────────── CLAUDE API ───────────────────────── */
const callClaude = async (userContent, systemPrompt) => {
  const res = await fetch("/api/ai-generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      system: systemPrompt,
      content: userContent,
      max_tokens: 1500
    })
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "generation failed");
  return JSON.parse((data.text || "").replace(/```json|```/g, "").trim());
};

/* ───────────────────────── SYSTEM PROMPTS ───────────────────────── */
const FORMAT_SPECS = {
  "Mini course": {
    lessons: 3,
    modules: 1
  },
  "Full course": {
    lessons: 6,
    modules: 2
  },
  "Masterclass": {
    lessons: 9,
    modules: 3
  }
};
const outlinePrompt = fmt => `You are the Wreath Academy Builder — Evercrafted's course architecture engine for faux botanical wreath makers who want to sell their knowledge.
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
  page: {
    fontFamily: SANS,
    background: EC.offWhite,
    minHeight: "100vh",
    color: EC.black,
    fontSize: 14,
    lineHeight: 1.6
  },
  shell: {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "0 20px 80px"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    padding: "16px 0",
    borderBottom: `1px solid ${EC.border}`,
    marginBottom: 28
  },
  wordmark: {
    fontFamily: SCRIPT,
    fontSize: 26,
    color: EC.green,
    fontWeight: 600,
    lineHeight: 1
  },
  appName: {
    fontFamily: SERIF,
    fontSize: 19,
    color: EC.black,
    letterSpacing: ".01em"
  },
  tierBadge: atelier => ({
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    padding: "4px 12px",
    borderRadius: 20,
    background: atelier ? EC.black : EC.dustPale,
    color: atelier ? EC.goldLight : EC.dust
  }),
  card: {
    background: EC.white,
    border: `1px solid ${EC.border}`,
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,.05)"
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: ".15em",
    textTransform: "uppercase",
    color: EC.green,
    marginBottom: 8
  },
  h2: {
    fontFamily: SERIF,
    fontSize: 28,
    fontWeight: 500,
    lineHeight: 1.15,
    marginBottom: 6
  },
  sub: {
    fontSize: 13,
    color: EC.muted,
    fontWeight: 300,
    marginBottom: 18
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    background: EC.paper,
    border: `1px solid ${EC.border}`,
    borderRadius: 10,
    fontFamily: SERIF,
    fontStyle: "italic",
    fontSize: 15,
    color: EC.charcoal,
    padding: "12px 14px",
    minHeight: 110,
    resize: "vertical",
    outline: "none",
    lineHeight: 1.65
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: EC.paper,
    border: `1px solid ${EC.border}`,
    borderRadius: 10,
    fontFamily: SANS,
    fontSize: 14,
    color: EC.charcoal,
    padding: "10px 14px",
    outline: "none"
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  chip: on => ({
    padding: "8px 16px",
    borderRadius: 100,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: SANS,
    border: `1.5px solid ${on ? EC.green : EC.border}`,
    background: on ? EC.greenPale : EC.paper,
    color: on ? EC.green : EC.muted,
    fontWeight: on ? 500 : 400,
    transition: "all .18s ease"
  }),
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: EC.faint,
    margin: "18px 0 8px"
  },
  btn: (variant = "primary") => ({
    padding: "11px 26px",
    borderRadius: 100,
    border: "none",
    cursor: "pointer",
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: ".04em",
    transition: "all .18s ease",
    background: variant === "primary" ? EC.green : variant === "dark" ? EC.black : "transparent",
    color: variant === "ghost" ? EC.ink : EC.white,
    ...(variant === "ghost" ? {
      border: `1.5px solid ${EC.borderDark}`
    } : {})
  }),
  lessonRow: active => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    border: `1px solid ${active ? EC.green : EC.border}`,
    background: active ? EC.greenPale : EC.paper,
    marginBottom: 8,
    transition: "all .15s ease"
  }),
  lockWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden"
  },
  lockBlur: {
    filter: "blur(4px)",
    userSelect: "none",
    pointerEvents: "none",
    opacity: 0.55
  },
  lockOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    background: "rgba(249,247,244,.78)",
    backdropFilter: "blur(1px)",
    padding: 24,
    textAlign: "center"
  },
  err: {
    background: "#F9EDEB",
    border: "1px solid #E0C4BE",
    color: "#8A3A30",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    marginTop: 12
  },
  stepCard: {
    background: EC.paper,
    border: `1px solid ${EC.border}`,
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 10
  },
  proTip: {
    marginTop: 8,
    padding: "8px 12px",
    background: EC.goldPale,
    border: `1px solid rgba(154,122,64,.25)`,
    borderRadius: 8,
    fontSize: 12.5,
    color: EC.gold
  }
};

/* ───────────────────────── APP ───────────────────────── */
function WreathAcademyBuilder() {
  const [tier, setTier] = useState("studio"); // demo toggle — auth-driven in production
  const [view, setView] = useState("intake");
  const [designSource, setDesignSource] = useState("");
  const [audience, setAudience] = useState("Beginner");
  const [format, setFormat] = useState("Full course");
  const [voice, setVoice] = useState("");
  const [outline, setOutline] = useState(null);
  const [lessons, setLessons] = useState({}); // key: "m-l" → lesson content
  const [scripts, setScripts] = useState({}); // key: "m-l" → video script
  const [listing, setListing] = useState(null);
  const [selected, setSelected] = useState(null); // {m, l}
  const [busy, setBusy] = useState(null); // which action is loading
  const [error, setError] = useState(null);
  const canAccess = req => TIER_RANK[tier] >= TIER_RANK[req];
  const key = selected ? `${selected.m}-${selected.l}` : null;
  const briefContext = () => `WREATH DESIGN SOURCE:\n${designSource}\n\nAUDIENCE LEVEL: ${audience}\nCOURSE FORMAT: ${format} (${FORMAT_SPECS[format].lessons} lessons)\nTEACHING VOICE: ${voice || "warm, encouraging, precise"}`;
  const run = async (id, fn) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError("Generation hit a snag — try once more. (" + (e.message || "parse error") + ")");
    }
    setBusy(null);
  };
  const genOutline = () => run("outline", async () => {
    const r = await callClaude(briefContext(), outlinePrompt(format));
    setOutline(r);
    setLessons({});
    setScripts({});
    setListing(null);
    setSelected({
      m: 0,
      l: 0
    });
    setView("workspace");
  });
  const genLesson = () => run("lesson", async () => {
    const ls = outline.modules[selected.m].lessons[selected.l];
    const r = await callClaude(`${briefContext()}\n\nCOURSE: ${outline.course_title}\nMODULE: ${outline.modules[selected.m].module_title}\nWRITE THIS LESSON: "${ls.lesson_title}" — ${ls.summary}`, lessonPrompt);
    setLessons(p => ({
      ...p,
      [key]: r
    }));
  });
  const genScript = () => run("script", async () => {
    const ls = outline.modules[selected.m].lessons[selected.l];
    const body = lessons[key] ? `\nLESSON CONTENT:\n${JSON.stringify(lessons[key])}` : "";
    const r = await callClaude(`${briefContext()}\n\nCOURSE: ${outline.course_title}\nVIDEO FOR LESSON: "${ls.lesson_title}" — ${ls.summary}${body}`, videoPrompt);
    setScripts(p => ({
      ...p,
      [key]: r
    }));
  });
  const genListing = () => run("listing", async () => {
    const r = await callClaude(`${briefContext()}\n\nCOURSE OUTLINE:\n${JSON.stringify({
      title: outline.course_title,
      tagline: outline.tagline,
      transformation: outline.transformation,
      modules: outline.modules.map(m => ({
        module: m.module_title,
        lessons: m.lessons.map(l => l.lesson_title)
      }))
    })}`, listingPrompt);
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
          (V.sections || []).forEach(sec => {
            md += `\n**${sec.title}**\n${sec.script}\n*B-roll: ${sec.broll}*\n`;
          });
          md += `\n**Outro:** ${V.outro_cta}\n`;
        }
      });
    });
    if (listing && canAccess("atelier")) {
      md += `\n---\n\n# Sales listing\n\n**${listing.listing_title}**\n\n${listing.description}\n\n**Tags:** ${(listing.tags || []).join(", ")}\n\n**Price:** ${listing.price} — ${listing.price_reason}\n`;
    }
    const blob = new Blob([md], {
      type: "text/markdown"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = (outline.course_title || "wreath-course").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".md";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const lessonsWritten = Object.keys(lessons).length;
  const totalLessons = outline ? outline.modules.reduce((a, m) => a + m.lessons.length, 0) : 0;

  /* ── Render ── */
  return /*#__PURE__*/React.createElement("div", {
    style: S.page
  }, /*#__PURE__*/React.createElement("style", null, `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Dancing+Script:wght@600&family=Jost:wght@300;400;500;600&display=swap');
        @keyframes ecspin { to { transform: rotate(360deg); } }
        button:hover { filter: brightness(1.05); }
        textarea:focus, input:focus { border-color: ${EC.green} !important; }
      `), /*#__PURE__*/React.createElement("div", {
    style: S.shell
  }, /*#__PURE__*/React.createElement("div", {
    style: S.header
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(LeafSprig, null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: S.wordmark
  }, "Evercrafted"), /*#__PURE__*/React.createElement("div", {
    style: S.appName
  }, "Wreath Academy Builder"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: EC.faint
    }
  }, "Demo tier:"), ["studio", "atelier"].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    onClick: () => setTier(t),
    style: {
      ...S.tierBadge(t === "atelier"),
      border: "none",
      cursor: "pointer",
      opacity: tier === t ? 1 : 0.4
    }
  }, t)))), view === "intake" && /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 640,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 26
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.eyebrow
  }, "Turn your craft into a course"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...S.h2,
      fontSize: 36
    }
  }, "You already know how to build it.", /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("em", {
    style: {
      color: EC.green
    }
  }, "Now teach it.")), /*#__PURE__*/React.createElement("p", {
    style: S.sub
  }, "Paste a blueprint or describe a wreath you've made. Academy Builder structures the curriculum, writes the lessons, scripts the videos, and writes the listing that sells it.")), /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement("div", {
    style: S.label
  }, "The wreath you'll teach"), /*#__PURE__*/React.createElement("textarea", {
    style: S.textarea,
    value: designSource,
    onChange: e => setDesignSource(e.target.value),
    placeholder: 'Paste an Evercrafted blueprint JSON, or describe the design:\n"22-inch grapevine crescent — weeping silver eucalyptus anchored 7:00–9:00, dusty mauve peonies clustered at 9:00, ivory garden roses above, lavender bundles scattered through the sweep, silence zone from 12:00 to 4:00…"'
  }), /*#__PURE__*/React.createElement("div", {
    style: S.label
  }, "Who is this course for?"), /*#__PURE__*/React.createElement("div", {
    style: S.chipRow
  }, ["Beginner", "Intermediate", "Advanced"].map(a => /*#__PURE__*/React.createElement("button", {
    key: a,
    style: S.chip(audience === a),
    onClick: () => setAudience(a)
  }, a))), /*#__PURE__*/React.createElement("div", {
    style: S.label
  }, "Course format"), /*#__PURE__*/React.createElement("div", {
    style: S.chipRow
  }, Object.keys(FORMAT_SPECS).map(f => /*#__PURE__*/React.createElement("button", {
    key: f,
    style: S.chip(format === f),
    onClick: () => setFormat(f)
  }, f, " \xB7 ", FORMAT_SPECS[f].lessons, " lessons"))), /*#__PURE__*/React.createElement("div", {
    style: S.label
  }, "Your teaching voice ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      textTransform: "none",
      letterSpacing: 0
    }
  }, "(optional)")), /*#__PURE__*/React.createElement("input", {
    style: S.input,
    value: voice,
    onChange: e => setVoice(e.target.value),
    placeholder: "e.g. \"Patient and unfussy \u2014 like teaching a friend at my kitchen table\""
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      display: "flex",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      ...S.btn("primary"),
      opacity: designSource.trim() ? 1 : 0.4
    },
    disabled: !designSource.trim() || busy === "outline",
    onClick: genOutline
  }, busy === "outline" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Structuring the curriculum\xA0", /*#__PURE__*/React.createElement(Spinner, null)) : "Build the course outline →")), error && /*#__PURE__*/React.createElement("div", {
    style: S.err
  }, error))), view === "workspace" && outline && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      marginBottom: 18,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.eyebrow
  }, format, " \xB7 ", audience, " \xB7 ", totalLessons, " lessons"), /*#__PURE__*/React.createElement("h2", {
    style: {
      ...S.h2,
      fontSize: 32
    }
  }, outline.course_title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: SERIF,
      fontStyle: "italic",
      fontSize: 16,
      color: EC.ink,
      marginBottom: 4
    }
  }, outline.tagline), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12.5,
      color: EC.muted
    }
  }, "After this course: ", outline.transformation), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: "flex",
      gap: 10,
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: S.btn("ghost"),
    onClick: () => setView("intake")
  }, "\u2190 Edit brief"), /*#__PURE__*/React.createElement("button", {
    style: S.btn("dark"),
    onClick: exportCourse
  }, "Export course (", lessonsWritten, "/", totalLessons, " lessons written)"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "320px 1fr",
      gap: 18,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(LeafSprig, {
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      ...S.eyebrow,
      marginBottom: 0
    }
  }, "Curriculum")), outline.modules.map((mod, mi) => /*#__PURE__*/React.createElement("div", {
    key: mi,
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: SERIF,
      fontSize: 16,
      fontWeight: 600,
      color: EC.charcoal,
      margin: "6px 0 8px"
    }
  }, outline.modules.length > 1 ? `Module ${mi + 1} — ` : "", mod.module_title), mod.lessons.map((ls, li) => {
    const k = `${mi}-${li}`;
    const active = selected && selected.m === mi && selected.l === li;
    return /*#__PURE__*/React.createElement("div", {
      key: li,
      style: S.lessonRow(active),
      onClick: () => setSelected({
        m: mi,
        l: li
      })
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        background: lessons[k] ? EC.green : EC.white,
        color: lessons[k] ? EC.white : EC.faint,
        border: `1.5px solid ${lessons[k] ? EC.green : EC.borderDark}`
      }
    }, lessons[k] ? "✓" : li + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: active ? EC.green : EC.ink,
        fontWeight: active ? 500 : 400,
        lineHeight: 1.35
      }
    }, ls.lesson_title));
  }))), /*#__PURE__*/React.createElement(Divider, null), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: ".1em",
      textTransform: "uppercase",
      color: EC.faint,
      marginBottom: 8
    }
  }, "Materials list"), (outline.materials || []).map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 12.5,
      color: EC.ink,
      padding: "3px 0",
      borderBottom: i < outline.materials.length - 1 ? `1px solid ${EC.paper}` : "none"
    }
  }, m)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: "8px 12px",
      background: EC.goldPale,
      borderRadius: 8,
      fontSize: 12.5,
      color: EC.gold,
      fontWeight: 500
    }
  }, "Suggested course price: ", outline.suggested_price)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.card
  }, selected && (() => {
    const ls = outline.modules[selected.m].lessons[selected.l];
    const L = lessons[key];
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: S.eyebrow
    }, "Lesson ", selected.l + 1, " \xB7 ~", ls.duration_min, " min"), /*#__PURE__*/React.createElement("h3", {
      style: {
        fontFamily: SERIF,
        fontSize: 23,
        fontWeight: 500,
        marginBottom: 4
      }
    }, ls.lesson_title), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        color: EC.muted,
        marginBottom: 16,
        fontStyle: "italic",
        fontFamily: SERIF
      }
    }, ls.summary), !L ? /*#__PURE__*/React.createElement("button", {
      style: S.btn("primary"),
      disabled: busy === "lesson",
      onClick: genLesson
    }, busy === "lesson" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Writing the lesson\xA0", /*#__PURE__*/React.createElement(Spinner, null)) : "✦ Write this lesson") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "8px 12px",
        background: EC.greenPale,
        borderRadius: 8,
        fontSize: 13,
        color: EC.green,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("strong", null, "Objective:"), " ", L.objective), (L.steps || []).map((s, si) => /*#__PURE__*/React.createElement("div", {
      key: si,
      style: S.stepCard
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: SERIF,
        fontSize: 16,
        fontWeight: 600,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: EC.green
      }
    }, si + 1, "."), " ", s.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13.5,
        color: EC.ink
      }
    }, s.instruction), s.pro_tip && /*#__PURE__*/React.createElement("div", {
      style: S.proTip
    }, "\u2726 Pro tip \u2014 ", s.pro_tip))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.stepCard,
        marginBottom: 0,
        background: "#F9EDEB",
        borderColor: "#E0C4BE"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "#8A3A30",
        marginBottom: 4
      }
    }, "Common mistake"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: EC.ink
      }
    }, L.common_mistake)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...S.stepCard,
        marginBottom: 0,
        background: EC.greenPale,
        borderColor: "rgba(74,103,65,.25)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: EC.green,
        marginBottom: 4
      }
    }, "Checkpoint"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: EC.ink
      }
    }, L.checkpoint))), /*#__PURE__*/React.createElement("button", {
      style: {
        ...S.btn("ghost"),
        marginTop: 14
      },
      disabled: busy === "lesson",
      onClick: genLesson
    }, busy === "lesson" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Rewriting\xA0", /*#__PURE__*/React.createElement(Spinner, null)) : "↻ Rewrite lesson")));
  })(), error && /*#__PURE__*/React.createElement("div", {
    style: S.err
  }, error)), /*#__PURE__*/React.createElement("div", {
    style: canAccess("atelier") ? {} : S.lockWrap
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      ...(canAccess("atelier") ? {} : S.lockBlur)
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.eyebrow
  }, "\uD83C\uDFAC Video script \u2014 this lesson"), /*#__PURE__*/React.createElement("span", {
    style: S.tierBadge(true)
  }, "Atelier")), !scripts[key] ? /*#__PURE__*/React.createElement("button", {
    style: S.btn("primary"),
    disabled: !canAccess("atelier") || busy === "script",
    onClick: genScript
  }, busy === "script" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Scripting\xA0", /*#__PURE__*/React.createElement(Spinner, null)) : "Write the video script") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.stepCard,
      background: EC.dustPale,
      borderColor: "rgba(122,90,128,.25)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: EC.dust,
      marginBottom: 4
    }
  }, "The hook \u2014 first 15 seconds"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: SERIF,
      fontStyle: "italic",
      fontSize: 14.5
    }
  }, scripts[key].hook)), (scripts[key].sections || []).map((sec, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: S.stepCard
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: SERIF,
      fontSize: 15.5,
      fontWeight: 600,
      marginBottom: 4
    }
  }, sec.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13.5,
      color: EC.ink
    }
  }, sec.script), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: EC.faint,
      marginTop: 6
    }
  }, "\uD83D\uDCF7 B-roll: ", sec.broll))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: EC.ink,
      fontStyle: "italic",
      fontFamily: SERIF
    }
  }, "Outro: ", scripts[key].outro_cta))), !canAccess("atelier") && /*#__PURE__*/React.createElement("div", {
    style: S.lockOverlay
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20
    }
  }, "\u2726"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: SERIF,
      fontSize: 19,
      fontWeight: 500
    }
  }, "Video scripts are an Atelier feature"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: EC.muted,
      maxWidth: 340
    }
  }, "Filmable scripts with hooks, spoken sections, and b-roll direction \u2014 for every lesson in your course."), /*#__PURE__*/React.createElement("button", {
    style: S.btn("dark"),
    onClick: () => setTier("atelier")
  }, "Unlock with Atelier"))), /*#__PURE__*/React.createElement("div", {
    style: canAccess("atelier") ? {} : S.lockWrap
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.card,
      ...(canAccess("atelier") ? {} : S.lockBlur)
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: S.eyebrow
  }, "Sell-ready listing \u2014 whole course"), /*#__PURE__*/React.createElement("span", {
    style: S.tierBadge(true)
  }, "Atelier")), !listing ? /*#__PURE__*/React.createElement("button", {
    style: S.btn("primary"),
    disabled: !canAccess("atelier") || busy === "listing",
    onClick: genListing
  }, busy === "listing" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Writing the listing\xA0", /*#__PURE__*/React.createElement(Spinner, null)) : "Write the sales listing") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: SERIF,
      fontSize: 17,
      fontWeight: 600,
      marginBottom: 8
    }
  }, listing.listing_title), /*#__PURE__*/React.createElement("div", {
    style: {
      ...S.stepCard,
      fontSize: 13.5,
      lineHeight: 1.7
    }
  }, listing.description), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 10
    }
  }, (listing.tags || []).map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontSize: 11,
      padding: "2px 10px",
      borderRadius: 20,
      background: EC.greenPale,
      color: EC.green,
      border: "1px solid rgba(74,103,65,.2)"
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "8px 12px",
      background: EC.goldPale,
      borderRadius: 8,
      fontSize: 13,
      color: EC.gold
    }
  }, /*#__PURE__*/React.createElement("strong", null, listing.price), " \u2014 ", listing.price_reason))), !canAccess("atelier") && /*#__PURE__*/React.createElement("div", {
    style: S.lockOverlay
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20
    }
  }, "\u2726"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: SERIF,
      fontSize: 19,
      fontWeight: 500
    }
  }, "The sales listing ships with Atelier"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12.5,
      color: EC.muted,
      maxWidth: 340
    }
  }, "Etsy/Gumroad-ready title, description, 13 tags, and pricing strategy for your finished course."), /*#__PURE__*/React.createElement("button", {
    style: S.btn("dark"),
    onClick: () => setTier("atelier")
  }, "Unlock with Atelier"))))))));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(WreathAcademyBuilder));
