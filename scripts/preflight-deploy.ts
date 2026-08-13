/**
 * Deploy guard — refuses to publish a build that would REMOVE pages that are
 * currently live.
 *
 * Why this exists: on 2026-08-10 grayyachts.com was overwritten by a deploy
 * from a checkout ~26 commits behind. Every /fleet/<slug> listing page began
 * 404ing, and the enquiry form, payment calculator and price sort vanished
 * from production. Nothing failed loudly — the deploy "succeeded".
 *
 * This compares what the LIVE site is serving against what the working tree
 * would publish, and aborts on any regression. It deliberately checks the
 * deployed site rather than git, so it protects regardless of which branch,
 * worktree or machine the deploy is run from.
 *
 * Run automatically via the `predeploy` npm script.
 * Bypass (only when intentionally removing a listing): DEPLOY_ALLOW_REMOVALS=1
 */
import { existsSync as existsSyncTop } from "node:fs";
import { vessels } from "../src/lib/fleet";

const SITE = process.env.PREFLIGHT_SITE ?? "https://grayyachts.com";
const ALLOW_REMOVALS = process.env.DEPLOY_ALLOW_REMOVALS === "1";

const ok = (s: string) => console.log(`  [32m✓[0m ${s}`);
const bad = (s: string) => console.log(`  [31m✗[0m ${s}`);

async function status(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "manual" });
    return res.status;
  } catch {
    return 0;
  }
}

async function main() {
  console.log(`\nPreflight — comparing working tree against ${SITE}\n`);

  const slugs = vessels.filter((v) => v.slug).map((v) => v.slug as string);
  console.log(`This build publishes ${slugs.length} vessel(s).`);

  if (slugs.length === 0) {
    bad("fleet.ts has no vessels with a slug — refusing to deploy.");
    process.exit(1);
  }

  // 1. Any listing page live right now must still exist in this build.
  //    Live slugs are discovered FROM THE LIVE SITE, not from this build —
  //    otherwise a stale checkout simply never looks for what it dropped.
  //    (First version of this script had exactly that bug and passed the
  //    Aug-10 scenario it was written to catch.)
  //    Scraping /fleet for hrefs does NOT work: FleetBrowser is a client
  //    component, so the cards and their links never appear in the server HTML.
  //    That made this check silently report "0 live listing pages", meaning the
  //    guard's core protection could never fire — the same blind spot, one
  //    level down. Build the candidate set from every slug that has ever
  //    existed in fleet.ts across all refs (a superset of anything that could
  //    be live) and probe each against the live site.
  const discovered = new Set<string>(slugs);

  const fleetHtml = await fetch(`${SITE}/fleet`)
    .then((r) => (r.ok ? r.text() : ""))
    .catch(() => "");
  for (const m of fleetHtml.matchAll(/\/fleet\/([a-z0-9][a-z0-9-]*)/g)) {
    discovered.add(m[1]);
  }

  try {
    const { execFileSync } = await import("node:child_process");
    const revs = execFileSync(
      "git",
      ["log", "--all", "--format=%H", "-n", "60", "--", "src/lib/fleet.ts"],
      { encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);

    for (const rev of revs) {
      try {
        const src = execFileSync("git", ["show", `${rev}:src/lib/fleet.ts`], {
          encoding: "utf8",
          maxBuffer: 1024 * 1024 * 8,
        });
        for (const m of src.matchAll(/slug:\s*"([a-z0-9][a-z0-9-]*)"/g)) discovered.add(m[1]);
      } catch {
        // revision predates the file — nothing to learn from it
      }
    }
  } catch {
    console.log("  (git history unavailable — probing build + live HTML slugs only)");
  }
  // Confirm each really serves a page before treating it as a regression.
  const liveSlugs: string[] = [];
  await Promise.all(
    [...discovered].map(async (s) => {
      if ((await status(`${SITE}/fleet/${s}`)) === 200) liveSlugs.push(s);
    }),
  );
  console.log(`Live site is currently serving ${liveSlugs.length} listing page(s).`);

  const removed = liveSlugs.filter((s) => !slugs.includes(s));
  if (removed.length > 0) {
    bad(`${removed.length} listing page(s) live now would 404 after this deploy:`);
    removed.forEach((s) => console.log(`      ${SITE}/fleet/${s}`));
    if (!ALLOW_REMOVALS) {
      console.log(
        "\n  Refusing to deploy. If a listing was genuinely withdrawn, re-run with\n" +
          "  DEPLOY_ALLOW_REMOVALS=1 npm run deploy\n",
      );
      process.exit(1);
    }
    console.log("  DEPLOY_ALLOW_REMOVALS=1 set — continuing anyway.\n");
  } else {
    ok("no live listing page would be removed");
  }

  // 2. Regression canary: shipping fewer vessels than are live usually means
  //    this checkout is stale, even if every individual slug happens to match.
  if (liveSlugs.length > slugs.length) {
    bad(`live site serves ${liveSlugs.length} listings, this build has only ${slugs.length}`);
    if (!ALLOW_REMOVALS) {
      console.log("\n  Refusing to deploy — this checkout looks stale.\n");
      process.exit(1);
    }
  } else if (liveSlugs.length > 0) {
    ok(`vessel count consistent (live ${liveSlugs.length}, build ${slugs.length})`);
  } else {
    ok("live site unreachable or empty — skipping count check (first deploy?)");
  }

  // 3. Key standalone pages that live outside fleet.ts. These have been lost
  //    before: /sell shipped on `main` while the fleet work shipped on a
  //    feature branch, so each branch's deploy deleted the other's pages.
  //    Listed explicitly because nothing in this repo enumerates them.
  const CRITICAL_PAGES = ["/", "/fleet", "/sell", "/login"];
  const pageMisses: string[] = [];
  for (const p of CRITICAL_PAGES) {
    const live = await status(`${SITE}${p}`);
    if (live !== 200) continue; // not live today, nothing to protect
    // Static assets are the usual way these ship; check the build output.
    const asStatic =
      existsSyncTop(`public${p}.html`) ||
      existsSyncTop(`public${p}/index.html`) ||
      existsSyncTop(`src/app${p}/page.tsx`) ||
      existsSyncTop(`src/app/(marketing)${p}/page.tsx`) ||
      existsSyncTop(`src/app/(auth)${p}/page.tsx`) ||
      p === "/" ||
      p === "/fleet";
    if (!asStatic) pageMisses.push(p);
  }
  if (pageMisses.length > 0) {
    bad(`${pageMisses.length} page(s) live now have no source in this build:`);
    pageMisses.forEach((p) => console.log(`      ${SITE}${p}`));
    if (!ALLOW_REMOVALS) {
      console.log("\n  Refusing to deploy — this build would remove them.\n");
      process.exit(1);
    }
  } else {
    ok(`critical pages present (${CRITICAL_PAGES.join(", ")})`);
  }

  // 4. Every vessel whose href is a PDF must have that PDF in this build.
  const existsSync = existsSyncTop;
  const missing = vessels
    .filter((v) => v.href?.endsWith(".pdf"))
    .map((v) => v.href as string)
    .filter((h) => !existsSync(`public${h}`));
  if (missing.length > 0) {
    bad(`${missing.length} brochure PDF(s) missing from public/:`);
    missing.forEach((h) => console.log(`      ${h}`));
    process.exit(1);
  }
  ok("every PDF-linked vessel has its brochure on disk");

  console.log("\nPreflight passed — safe to deploy.\n");
}

main().catch((e) => {
  console.error("preflight failed:", e);
  process.exit(1);
});
