import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // This app lives in a subdir of a repo that has its own root lockfile (legacy
  // Express app). Pin tracing root to silence the multi-lockfile warning.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    // Allow remote hero renders (e.g. Supabase Storage, placeholder hosts).
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
