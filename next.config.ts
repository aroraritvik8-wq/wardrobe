import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Pin Turbopack's root to THIS project folder. Without this, Next.js can infer
// the wrong root and end up watching a huge directory tree, which spawned
// thousands of leftover PostCSS worker processes and froze the machine.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
