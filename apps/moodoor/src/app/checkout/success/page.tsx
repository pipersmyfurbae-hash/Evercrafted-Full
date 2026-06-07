import Link from "next/link";

export default function CheckoutSuccess() {
  return (
    <div className="container" style={{ paddingTop: 60, paddingBottom: 80, textAlign: "center", maxWidth: 620 }}>
      <p className="script" style={{ fontSize: 26 }}>Thank you.</p>
      <h1 style={{ fontSize: 36 }}>Your wreath is on its way to being made</h1>
      <p className="note" style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 26 }}>
        We&rsquo;ve received your order. Each piece is handcrafted to its blueprint &mdash; you&rsquo;ll
        receive a confirmation by email shortly.
      </p>
      <Link href="/" className="btn">
        Back to Moodoor
      </Link>
    </div>
  );
}
