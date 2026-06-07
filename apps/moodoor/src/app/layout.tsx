import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moodoor — Tell us the memory",
  description:
    "Tell us the memory. We'll show you the wreath that holds it. Curated luxury faux botanical wreaths, matched to your feeling.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-head">
          <div className="container">
            <Link href="/" className="brand">
              Moodoor
            </Link>
            <div className="tagline">by Evercrafted</div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
