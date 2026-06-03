// Renders /listings/<slug>/brochure to public/listings/<slug>.pdf via Playwright.
// Spawns its own `next dev` server, prints, then tears it down.
// Usage: tsx scripts/generate-brochure.ts <slug> [<slug> ...]
//        tsx scripts/generate-brochure.ts --all
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 4399;
const BASE = `http://localhost:${PORT}`;

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404) return;
    } catch {}
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`Server did not start at ${url}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) throw new Error("Pass <slug> ... or --all");

  const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    stdio: "inherit",
    env: process.env,
  });
  const shutdown = () => server.kill("SIGTERM");
  process.on("exit", shutdown);

  try {
    await waitForServer(`${BASE}/listings/brochure-manifest`);

    let slugs = args;
    if (args.includes("--all")) {
      const r = await fetch(`${BASE}/listings/brochure-manifest`);
      slugs = (await r.json()).slugs as string[];
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const slug of slugs) {
      const url = `${BASE}/listings/${slug}/brochure`;
      const resp = await page.goto(url, { waitUntil: "networkidle" });
      if (!resp || resp.status() !== 200) throw new Error(`${slug}: route returned ${resp?.status()}`);
      await page.evaluate(() => (document as any).fonts.ready);
      await page.pdf({
        path: `public/listings/${slug}.pdf`,
        format: "Letter",
        printBackground: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
      });
      console.log(`✓ public/listings/${slug}.pdf`);
    }
    await browser.close();
  } finally {
    shutdown();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
