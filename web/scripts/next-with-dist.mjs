/**
 * Run next build/start with distDir=.next-build so they never clobber `next dev`'s .next.
 * Vercel/local `next build` without this wrapper still uses default .next (NEXT_DIST_DIR unset).
 */
import { spawnSync } from "node:child_process";

const cmd = process.argv[2];
if (!cmd || !["build", "start"].includes(cmd)) {
  console.error("Usage: node scripts/next-with-dist.mjs <build|start> [...args]");
  process.exit(1);
}

process.env.NEXT_DIST_DIR = process.env.NEXT_DIST_DIR || ".next-build";

const result = spawnSync(
  "npx",
  ["next", cmd, ...process.argv.slice(3)],
  {
    stdio: "inherit",
    shell: true,
    env: process.env,
  },
);

process.exit(result.status === null ? 1 : result.status);
