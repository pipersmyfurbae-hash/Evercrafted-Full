"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MatchCard from "@/components/MatchCard";
import type { MatchSession } from "@/lib/types";

export default function MatchesPage() {
  const [session, setSession] = useState<MatchSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState<null | boolean>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("moodoor:matches");
      if (raw) setSession(JSON.parse(raw) as MatchSession);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  async function sendFeedback(feltRight: boolean) {
    setFeedback(feltRight);
    if (!session?.matchQueryId) return;
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchQueryId: session.matchQueryId, feltRight }),
      });
    } catch {
      /* best-effort */
    }
  }

  if (!loaded) return null;

  if (!session || session.matches.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80, textAlign: "center" }}>
        <h1>No matches yet</h1>
        <p className="note" style={{ marginBottom: 22 }}>
          {session ? "We couldn't find a resonant match for that memory. Try another." : "Start by sharing a memory."}
        </p>
        <Link href="/" className="btn">
          Tell us a memory
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 80 }}>
      <p className="script" style={{ fontSize: 22 }}>For the memory you shared</p>
      <h1 style={{ fontSize: 34, marginBottom: 6 }}>The wreaths that hold it</h1>
      <p className="note" style={{ maxWidth: 620, marginBottom: 28, fontStyle: "italic" }}>
        &ldquo;{session.memory}&rdquo;
      </p>

      <div className="grid">
        {session.matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 48 }}>
        {feedback === null ? (
          <>
            <p className="note" style={{ marginBottom: 12 }}>
              Did this feel like your memory?
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn ghost" onClick={() => sendFeedback(true)}>
                Yes, exactly
              </button>
              <button className="btn ghost" onClick={() => sendFeedback(false)}>
                Not quite
              </button>
            </div>
          </>
        ) : (
          <p className="note">Thank you &mdash; that helps us curate.</p>
        )}
        <div style={{ marginTop: 26 }}>
          <Link href="/" className="note" style={{ textDecoration: "underline" }}>
            Try another memory
          </Link>
        </div>
      </div>
    </div>
  );
}
