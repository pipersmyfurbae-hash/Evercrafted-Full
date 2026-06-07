import Link from "next/link";

export default async function CheckoutCancel({ searchParams }: { searchParams: Promise<{ wreath?: string }> }) {
  const { wreath } = await searchParams;
  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80, textAlign: "center", maxWidth: 620 }}>
      <h1 style={{ fontSize: 34 }}>No charge made</h1>
      <p className="note" style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 26 }}>
        Your checkout was cancelled and nothing was charged. The wreath is still here when you&rsquo;re ready.
      </p>
      <Link href={wreath ? `/wreath/${wreath}` : "/"} className="btn">
        {wreath ? "Back to the wreath" : "Back to Moodoor"}
      </Link>
    </div>
  );
}
