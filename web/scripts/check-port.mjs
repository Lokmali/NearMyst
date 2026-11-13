/**
 * Warn if port 3000 is already in use. Does not kill any process.
 */
import net from "node:net";

const port = Number(process.env.PORT || 3000);

const server = net.createServer();

server.once("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.warn(
      `\n[nearmyst] Port ${port} is already in use.\n` +
        `  Another Next/dev process may be serving a stale or broken build.\n` +
        `  Close it, or run from web/:  npm run dev:clean\n` +
        `  Tip: only kill Next.js node processes, not all node.exe (Cursor uses node too).\n`,
    );
  } else {
    console.warn(`[nearmyst] Could not check port ${port}:`, err?.message || err);
  }
  process.exit(0);
});

server.once("listening", () => {
  server.close(() => process.exit(0));
});

server.listen(port, "127.0.0.1");
