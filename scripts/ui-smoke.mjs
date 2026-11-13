/**
 * Headless UI smoke against local Next dev (http://localhost:3000).
 * Run from a folder with playwright installed, e.g.:
 *   node scripts/ui-smoke.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "docs", "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const base = process.env.UI_BASE || "http://localhost:3000";
const routes = [
  { path: "/", name: "home" },
  { path: "/explore", name: "explore" },
  { path: "/machine/1", name: "machine" },
  { path: "/create", name: "create" },
  { path: "/inventory", name: "inventory" },
  { path: "/result/1", name: "result" },
];

const failures = [];
const browser = await chromium.launch({ headless: true });

for (const width of [1440, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 844 : 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  for (const r of routes) {
    errors.length = 0;
    await page.goto(base + r.path, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => ({
      body: document.body.innerText,
      scrollX:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    }));
    if (info.scrollX) failures.push(`${r.name}@${width}: horizontal scroll`);
    if (errors.length)
      failures.push(`${r.name}@${width}: ${errors.slice(0, 2).join(" | ")}`);

    if (width === 1440) {
      await page.screenshot({
        path: path.join(outDir, `${r.name}.png`),
        fullPage: true,
      });
    }
    if (width === 390 && r.name === "home") {
      await page.screenshot({
        path: path.join(outDir, "mobile-home.png"),
        fullPage: true,
      });
    }

    if (r.path === "/" && !info.body.includes("app.nearmyst.testnet")) {
      failures.push(`${r.name}@${width}: missing contract id`);
    }
    if (
      r.path === "/machine/1" &&
      width === 1440 &&
      !/Up to 50 packs per purchase/i.test(info.body)
    ) {
      failures.push(`${r.name}: missing 50-pack helper`);
    }
  }
  await context.close();
}

await browser.close();
if (failures.length) {
  console.error("FAILURES");
  for (const f of failures) console.error("-", f);
  process.exit(1);
}
console.log("UI_SMOKE_OK", outDir);
