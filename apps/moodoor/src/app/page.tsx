import MemoryIntake from "@/components/MemoryIntake";

export default function HomePage() {
  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: 36, paddingBottom: 80 }}>
      <p className="script" style={{ fontSize: 26, marginBottom: 4 }}>Tell us the memory.</p>
      <h1 style={{ fontSize: 44, lineHeight: 1.1 }}>We&rsquo;ll show you the wreath that holds it.</h1>
      <p className="note" style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 28 }}>
        Every wreath in our collection is handcrafted and curated before it ever meets you. Share a
        memory or a feeling, and we&rsquo;ll match you to the few that truly resonate &mdash; each one
        flawless, blueprint-backed, and ready.
      </p>
      <MemoryIntake />
    </div>
  );
}
