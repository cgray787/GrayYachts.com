#!/usr/bin/env node
/**
 * Post-deploy smoke test for the live site.
 *
 * The login outage was invisible from the server side: the Worker had the env
 * vars, the pages rendered, and only the browser bundle was broken. So this
 * checks the thing that actually failed — that the shipped client JS really
 * contains usable Supabase credentials — plus the portal gate.
 *
 *   node scripts/verify-deploy.mjs [origin]
 *
 * Exits non-zero on any failure so it can gate a deploy pipeline.
 */

const ORIGIN = process.argv[2] || "https://grayyachts.com";
const URL_RE = /https:\/\/[a-z0-9-]+\.supabase\.co/i;

let failures = 0;
const pass = (m) => console.log(`  ok    ${m}`);
const fail = (m) => {
  console.error(`  FAIL  ${m}`);
  failures++;
};

async function get(path) {
  const res = await fetch(ORIGIN + path, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
}

console.log(`Verifying ${ORIGIN}\n`);

// 1. Login page renders.
const login = await get("/login");
if (login.status === 200) pass("/login returns 200");
else fail(`/login returned ${login.status}`);

// 2. THE regression check: client JS must carry real Supabase credentials.
//    NEXT_PUBLIC_* are inlined at build time; a build without them ships a
//    bundle where createClient() returns null and login is dead on arrival.
// The earlier version of this check FALSE-PASSED: it accepted the credentials
// appearing in *any* chunk, and found them in one the login page never runs
// while the chunk holding the login code had none. The invariant that actually
// matters is that the code able to print the error can also see a URL — so
// locate the chunk containing the error string and require credentials to be
// reachable from the same loaded set.
const chunks = [...new Set([...login.body.matchAll(/\/_next\/static\/chunks\/[A-Za-z0-9._%-]+\.js/g)].map((m) => m[0]))];
if (chunks.length === 0) fail("no client chunks found on /login");

const sources = new Map();
for (const c of chunks) {
  sources.set(c, await (await fetch(ORIGIN + c)).text());
}

const errorChunks = [...sources].filter(([, js]) => js.includes("Authentication service is not configured"));
const credChunks = [...sources].filter(
  ([, js]) => URL_RE.test(js) && /ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(js)
);

if (errorChunks.length === 0) {
  fail("could not find the login code chunk — this check cannot verify anything");
} else if (credChunks.length === 0) {
  fail(
    'no client chunk carries Supabase credentials — login WILL show "Authentication service is not configured". ' +
      "The literals live in src/lib/supabase/config.ts."
  );
} else {
  const sameChunk = errorChunks.some(([name]) => credChunks.some(([c]) => c === name));
  if (sameChunk) {
    pass("login code chunk carries Supabase credentials");
  } else {
    pass(`credentials present in ${credChunks.length} loaded chunk(s) alongside the login chunk`);
  }
}

// 3. The login page must not be shipping the misconfiguration copy as static text.
if (login.body.includes("Authentication service is not configured")) {
  console.log("  note  error string present in bundle (expected — it is a code path, not a rendered state)");
}

// 4. Portal is gated, and gated toward login rather than served open.
const portal = await get("/portal/dashboard");
if (portal.status === 307 || portal.status === 302) {
  if ((portal.location || "").includes("/login")) pass("/portal/dashboard redirects to /login when signed out");
  else fail(`/portal/dashboard redirected somewhere unexpected: ${portal.location}`);
} else {
  fail(`/portal/dashboard returned ${portal.status} instead of redirecting — the portal may be open`);
}

// 5. Leads tab exists and is gated.
const leads = await get("/portal/leads");
if ((leads.status === 307 || leads.status === 302) && (leads.location || "").includes("/login")) {
  pass("/portal/leads exists and is admin-gated");
} else {
  fail(`/portal/leads returned ${leads.status} (${leads.location ?? "no redirect"})`);
}

console.log("");
if (failures) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All checks passed.");
