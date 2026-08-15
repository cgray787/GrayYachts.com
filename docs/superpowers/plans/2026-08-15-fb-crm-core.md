# FB CRM — Core Implementation Plan (Plan 1 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/portal/leads` into a queue-first CRM ("FB CRM") that tells Connor who to contact today and why, backed by a server-side follow-up scheduler.

**Architecture:** Urgency is stored in Postgres (`next_touch_at`) and maintained by a trigger, so the UI and a future 7am digest read identical rows. The home screen is a work queue; the full list and per-lead profile sit one click away.

**Tech Stack:** Next.js 16 (App Router, RSC), Supabase Postgres, Tailwind v4, TypeScript, vitest (added in Task 1), `tsx` for scripts.

**Related plans:** Plan 2 = Messenger sync extension. Plan 3 = morning digest cron. Neither is required for this plan to ship.

**Spec:** `docs/superpowers/specs/2026-08-15-fb-crm-design.md`

**Deploy warning:** production is served from the `worktree-neverland-brochure` lineage. Deploying from a `main`-based branch 404s every `/fleet/<slug>`. Verify with `git branch --contains f68d6c2` before any deploy, and always use `npm run deploy`.

**Database access:** DDL goes through `~/Desktop/Claude OS/fb-yacht-leads/db.mjs` (Supabase Management API; the MCP server is read-only for this project). Run `node db.mjs path/to.sql`.

---

## File Structure

| File | Responsibility |
|---|---|
| `sql/003_crm_columns.sql` *(in fb-yacht-leads)* | Adds CRM columns to `fb_leads` |
| `sql/004_cadence.sql` *(in fb-yacht-leads)* | `fb_leads_schedule_touch()` + trigger |
| `sql/004_cadence_test.sql` *(in fb-yacht-leads)* | Cadence tests, both directions, rolled back |
| `src/lib/fb-leads.ts` | Types + pure helpers. Add `LeadPriority`, `queuePriority()` |
| `src/lib/fb-leads.test.ts` | Unit tests for the pure helpers |
| `src/app/(portal)/portal/leads/page.tsx` | Queue (home) — server component |
| `src/app/(portal)/portal/leads/queue-client.tsx` | Queue interactions |
| `src/app/(portal)/portal/leads/all/page.tsx` | Full list |
| `src/app/(portal)/portal/leads/[id]/page.tsx` | Lead profile |
| `src/app/(portal)/portal/leads/actions.ts` | Server actions — add `snooze`, `closeLead`, `saveWants` |
| `src/components/portal/sidebar.tsx:80` | Rename nav label to "FB CRM" |

---

### Task 1: Add a test runner

The repo has no unit-test runner (only Playwright as a devDep). TDD needs one.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest**

```bash
cd "/Users/connorgray/Desktop/Claude OS/grayyachts.com"
npm install -D vitest@^3
```

- [ ] **Step 2: Create the config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 3: Add the script**

In `package.json` `scripts`, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verify it runs with no tests**

Run: `npm test`
Expected: exits 0 with "No test files found" (or similar).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for unit tests"
```

---

### Task 2: Add CRM columns

**Files:**
- Create: `~/Desktop/Claude OS/fb-yacht-leads/sql/003_crm_columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- CRM fields. next_touch_at is the field the whole queue turns on: urgency is
-- stored, not computed in the browser, so a cron with no browser open reads the
-- same rows the UI shows.
alter table public.fb_leads
  add column if not exists next_touch_at   timestamptz,
  add column if not exists touch_reason    text,
  add column if not exists touch_count     int not null default 0,
  add column if not exists source          text not null default 'facebook',
  add column if not exists closed_reason   text,
  add column if not exists seller_phone    text,
  add column if not exists thread_id       text,
  add column if not exists wants_timeframe date,
  add column if not exists wants_flexibility text,
  add column if not exists wants_motivation  text,
  add column if not exists wants_notes     text;

alter table public.fb_leads
  drop constraint if exists fb_leads_closed_reason_check;
alter table public.fb_leads
  add constraint fb_leads_closed_reason_check
  check (closed_reason is null or closed_reason in
         ('broker','not_interested','sold_elsewhere','won'));

alter table public.fb_leads
  drop constraint if exists fb_leads_flexibility_check;
alter table public.fb_leads
  add constraint fb_leads_flexibility_check
  check (wants_flexibility is null or wants_flexibility in
         ('firm','open','motivated'));

-- Partial index: the queue only ever asks for rows with a due date.
create index if not exists fb_leads_next_touch_idx
  on public.fb_leads (next_touch_at)
  where next_touch_at is not null;
```

- [ ] **Step 2: Apply it**

```bash
cd "/Users/connorgray/Desktop/Claude OS/fb-yacht-leads"
node db.mjs sql/003_crm_columns.sql
```
Expected: `[]`

- [ ] **Step 3: Verify the columns exist**

```bash
node db.mjs -e "select count(*) as n from information_schema.columns where table_name='fb_leads' and column_name in ('next_touch_at','touch_reason','touch_count','source','closed_reason','seller_phone','thread_id','wants_timeframe','wants_flexibility','wants_motivation','wants_notes');"
```
Expected: `n` = 11

- [ ] **Step 4: Commit**

```bash
cd "/Users/connorgray/Desktop/Claude OS/fb-yacht-leads"
git add sql/003_crm_columns.sql
git commit -m "feat(db): CRM columns on fb_leads"
```

---

### Task 3: Cadence engine

**Files:**
- Create: `~/Desktop/Claude OS/fb-yacht-leads/sql/004_cadence.sql`
- Create: `~/Desktop/Claude OS/fb-yacht-leads/sql/004_cadence_test.sql`

- [ ] **Step 1: Write the failing test first**

Create `sql/004_cadence_test.sql`. It asserts both directions — a stage that should schedule, and a closed lead that must not.

```sql
begin;

insert into public.fb_leads (listing_id, title, url, stage, ask)
values ('__c1','cadence opener','https://e.com','new',500000),
       ('__c2','cadence pitch','https://e.com','new',500000),
       ('__c3','cadence dead','https://e.com','new',500000),
       ('__c4','cadence longtail','https://e.com','new',500000);

update public.fb_leads set stage='opener_sent' where listing_id='__c1';
update public.fb_leads set stage='pitch_sent'  where listing_id='__c2';
update public.fb_leads set stage='broker_dead' where listing_id='__c3';
update public.fb_leads set stage='opener_sent', touch_count=6 where listing_id='__c4';

select listing_id,
       stage,
       (next_touch_at::date - now()::date) as days_out,
       touch_reason,
       case listing_id
         when '__c1' then (next_touch_at::date - now()::date) = 3
         when '__c2' then (next_touch_at::date - now()::date) = 5
         when '__c3' then next_touch_at is null          -- dead never resurfaces
         when '__c4' then (next_touch_at::date - now()::date) = 60  -- long tail
       end as passed
  from public.fb_leads
 where listing_id like '\_\_c_'
 order by listing_id;

rollback;
```

- [ ] **Step 2: Run it and watch it fail**

```bash
cd "/Users/connorgray/Desktop/Claude OS/fb-yacht-leads"
node db.mjs sql/004_cadence_test.sql
```
Expected: every `passed` is `false` or `null` — no trigger exists yet, so `next_touch_at` stays null.

- [ ] **Step 3: Write the cadence function and trigger**

Create `sql/004_cadence.sql`:

```sql
-- Follow-up schedule, encoded once. Runs with search_path='' so every
-- reference must be schema-qualified — an unqualified call compiles fine and
-- then fails at runtime.
--
-- ACTIVE: opener +3d, pitch +5d, nudge +5d, terms +4d, replied = now.
-- LONG TAIL: after 5 touches, a "still available?" check every 60 days,
-- indefinitely. Boats sit for months; a lead dropped at 3 weeks is the best
-- inventory thrown away.
-- CLOSED: never resurfaces.

create or replace function public.fb_leads_schedule_touch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  days int;
  reason text;
begin
  -- Closed leads are done, whatever else changed.
  if new.stage in ('broker_dead','dead','won') or new.closed_reason is not null then
    new.next_touch_at := null;
    new.touch_reason  := null;
    return new;
  end if;

  -- Long tail once the active cadence is spent.
  if new.touch_count >= 5 then
    new.next_touch_at := now() + interval '60 days';
    new.touch_reason  := 'Still available? check';
    return new;
  end if;

  if new.stage = 'replied' then
    new.next_touch_at := now();
    new.touch_reason  := 'Seller replied — your move';
    return new;
  end if;

  select d, r into days, reason from (values
      ('new',         0, 'Send the opener'),
      ('opener_sent', 3, 'No reply in 3 days — nudge'),
      ('pitch_sent',  5, 'Pitch went quiet — send "Thoughts?"'),
      ('nudged',      5, 'Nudge went unanswered'),
      ('terms_sent',  4, 'Terms sent — chase the answer')
    ) as t(s, d, r)
   where t.s = new.stage;

  if days is null then
    return new;   -- unknown stage: leave the schedule alone
  end if;

  new.next_touch_at := now() + (days || ' days')::interval;
  new.touch_reason  := reason;
  return new;
end;
$$;

drop trigger if exists fb_leads_schedule_touch_trg on public.fb_leads;
create trigger fb_leads_schedule_touch_trg
  before insert or update of stage, touch_count, closed_reason
  on public.fb_leads
  for each row execute function public.fb_leads_schedule_touch();
```

- [ ] **Step 4: Apply and re-run the test**

```bash
node db.mjs sql/004_cadence.sql
node db.mjs sql/004_cadence_test.sql
```
Expected: `passed` is `true` for all four rows.

- [ ] **Step 5: Backfill the existing 97 leads**

```bash
node db.mjs -e "update public.fb_leads set touch_count = touch_count where true;"
node db.mjs -e "select stage, count(*) n, count(next_touch_at) scheduled from public.fb_leads group by stage order by n desc;"
```
Expected: `new`, `opener_sent`, `replied` rows all have `scheduled` = `n`; `broker_dead` has `scheduled` = 0.

- [ ] **Step 6: Commit**

```bash
git add sql/004_cadence.sql sql/004_cadence_test.sql
git commit -m "feat(db): follow-up cadence engine with always-on long tail"
```

---

### Task 4: Queue priority helper

**Files:**
- Modify: `src/lib/fb-leads.ts`
- Create: `src/lib/fb-leads.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/fb-leads.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { queuePriority, type FbLead } from "./fb-leads";

const lead = (over: Partial<FbLead>): FbLead =>
  ({
    listing_id: "x", title: "t", ask: 100000, ask_label: null, location: null,
    photo: null, photo_count: 0, url: "u", fsbo: null, verdict: null,
    delta_pct: null, comp_note: null, pitch_angle: null, confidence: null,
    comp_source: null, disqualify_reason: null, stage: "opener_sent",
    seller_name: null, rank: null, note: null, opener_sent_at: null,
    reply_at: null, reply_text: null, pitch_sent_at: null, nudge_sent_at: null,
    terms_sent_at: null, updated_at: "2026-01-01T00:00:00Z",
    next_touch_at: null, touch_reason: null, touch_count: 0,
    ...over,
  }) as FbLead;

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

describe("queuePriority", () => {
  it("ranks a replying seller above a silent one of equal value", () => {
    const replied = lead({ stage: "replied", next_touch_at: daysAgo(1) });
    const silent = lead({ stage: "opener_sent", next_touch_at: daysAgo(1) });
    expect(queuePriority(replied)).toBeGreaterThan(queuePriority(silent));
  });

  it("ranks a more valuable boat above a cheaper one at the same stage", () => {
    const big = lead({ ask: 750000, next_touch_at: daysAgo(1) });
    const small = lead({ ask: 170000, next_touch_at: daysAgo(1) });
    expect(queuePriority(big)).toBeGreaterThan(queuePriority(small));
  });

  it("ranks a longer-overdue lead above a just-due one", () => {
    const old = lead({ next_touch_at: daysAgo(10) });
    const fresh = lead({ next_touch_at: daysAgo(0) });
    expect(queuePriority(old)).toBeGreaterThan(queuePriority(fresh));
  });

  it("gives an unscheduled lead zero priority", () => {
    expect(queuePriority(lead({ next_touch_at: null }))).toBe(0);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test`
Expected: FAIL — `queuePriority` is not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/fb-leads.ts` (and add the new fields to the `FbLead` type: `next_touch_at: string | null; touch_reason: string | null; touch_count: number;`):

```ts
const STAGE_WEIGHT: Partial<Record<LeadStage, number>> = {
  replied: 3,
  negotiating: 3,
  terms_sent: 2,
  pitch_sent: 1.5,
  nudged: 1.2,
  opener_sent: 1,
  new: 1,
};

/**
 * Queue ordering: how overdue x how much the boat is worth x how engaged the
 * seller is. A $750K seller who replied must outrank a $170K one that has gone
 * quiet — the queue is a priority list, not a date sort.
 * Returns 0 for anything not scheduled, so unscheduled leads never surface.
 */
export function queuePriority(lead: FbLead, now: number = Date.now()): number {
  if (!lead.next_touch_at) return 0;
  const overdueDays = Math.max(0, (now - new Date(lead.next_touch_at).getTime()) / 86_400_000);
  const value = Math.log10(Math.max(lead.ask ?? 1, 1));   // compress: 750k is not 4x 170k
  const weight = STAGE_WEIGHT[lead.stage] ?? 1;
  return (1 + overdueDays) * value * weight;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fb-leads.ts src/lib/fb-leads.test.ts
git commit -m "feat(crm): queue priority scoring"
```

---

### Task 5: Server actions — snooze, close, save wants

**Files:**
- Modify: `src/app/(portal)/portal/leads/actions.ts`

- [ ] **Step 1: Add the actions**

Append to `actions.ts` (it already has `requireAdmin`, `setStage`, `logSent`, `logReply`, `saveNote`):

```ts
export async function snooze(listingId: string, days: number) {
  await requireAdmin();
  if (!Number.isFinite(days) || days < 1 || days > 365) throw new Error("bad snooze");
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  const db = createAdminClient();
  const { error } = await db
    .from("fb_leads")
    .update({ next_touch_at: until, touch_reason: `Snoozed ${days}d` })
    .eq("listing_id", listingId);
  if (error) throw new Error(error.message);
  revalidatePath("/portal/leads");
}

const CLOSE_REASONS = ["broker", "not_interested", "sold_elsewhere", "won"] as const;

export async function closeLead(listingId: string, reason: string) {
  await requireAdmin();
  if (!CLOSE_REASONS.includes(reason as (typeof CLOSE_REASONS)[number])) {
    throw new Error(`bad close reason: ${reason}`);
  }
  const db = createAdminClient();
  // The cadence trigger nulls next_touch_at when closed_reason is set, so this
  // does not set it here — one rule, one place.
  const { error } = await db
    .from("fb_leads")
    .update({ closed_reason: reason, stage: reason === "won" ? "won" : "dead" })
    .eq("listing_id", listingId);
  if (error) throw new Error(error.message);
  revalidatePath("/portal/leads");
}

export async function saveWants(
  listingId: string,
  wants: {
    wants_timeframe?: string | null;
    wants_flexibility?: string | null;
    wants_motivation?: string | null;
    wants_notes?: string | null;
    seller_phone?: string | null;
  },
) {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("fb_leads").update(wants).eq("listing_id", listingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/portal/leads/${listingId}`);
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(portal)/portal/leads/actions.ts"
git commit -m "feat(crm): snooze, close and wants server actions"
```

---

### Task 6: Queue page (home)

**Files:**
- Modify: `src/app/(portal)/portal/leads/page.tsx`
- Create: `src/app/(portal)/portal/leads/queue-client.tsx`

- [ ] **Step 1: Rewrite the server page to fetch only due leads**

Replace the data fetch in `page.tsx` with:

```tsx
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const [{ data: due }, { count: total }] = await Promise.all([
    db.from("fb_leads").select("*").not("next_touch_at", "is", null)
      .lte("next_touch_at", nowIso).order("next_touch_at", { ascending: true }),
    db.from("fb_leads").select("listing_id", { count: "exact", head: true }),
  ]);

  return <QueueClient due={(due ?? []) as FbLead[]} totalLeads={total ?? 0} />;
```

Import `QueueClient` from `./queue-client` and drop the old `LeadsClient` import.

- [ ] **Step 2: Create the queue client**

Create `queue-client.tsx` with a `"use client"` component that:
- sorts `due` with `queuePriority` (descending)
- renders one card per lead: photo, ask, title, location, `touch_reason` as the "why", the live script step from `messageScript(lead)[liveStep(lead)]` with a copy button
- gives each card **Sent** (`logSent`), **Snooze 7d** (`snooze(id, 7)`) and **Not interested** (`closeLead(id, "not_interested")`)
- shows `Nothing due today.` when `due.length === 0` — it must NOT fall back to listing all leads
- links to `/portal/leads/all` and `/portal/leads/[id]`

Follow the existing card styling in `leads-client.tsx`: `rounded-xl border border-border bg-bg-card p-5`, Cormorant for the price (`font-[family-name:var(--font-cormorant)] text-2xl font-semibold`), gold accents for the primary action.

- [ ] **Step 3: Typecheck and run**

Run: `npx tsc --noEmit && npm run dev`
Visit `http://localhost:3000/portal/leads`.
Expected: only leads whose `next_touch_at` has passed; empty state reads "Nothing due today."

- [ ] **Step 4: Commit**

```bash
git add "src/app/(portal)/portal/leads/page.tsx" "src/app/(portal)/portal/leads/queue-client.tsx"
git commit -m "feat(crm): queue-first home screen"
```

---

### Task 7: Full list page

**Files:**
- Create: `src/app/(portal)/portal/leads/all/page.tsx`

- [ ] **Step 1: Create it**

Server component, same admin gate as `page.tsx` (`if (!user) redirect(...); if (!isAdmin(user.email)) redirect("/portal/dashboard");`), fetching all leads ordered by `rank`. Render the existing `LeadsClient` — it already handles tabs, stages and filtering, so this is where the old view lives on rather than being deleted.

- [ ] **Step 2: Verify**

Visit `/portal/leads/all`. Expected: all 97 leads with the existing tabs.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(portal)/portal/leads/all/page.tsx"
git commit -m "feat(crm): full lead list at /portal/leads/all"
```

---

### Task 8: Lead profile

**Files:**
- Create: `src/app/(portal)/portal/leads/[id]/page.tsx`
- Create: `src/app/(portal)/portal/leads/[id]/wants-form.tsx`

- [ ] **Step 1: Create the profile page**

Server component. Admin gate. Fetch one lead by `listing_id` plus its `fb_lead_messages` ordered by `sent_at`. `notFound()` if missing.

Layout per the spec: full-bleed photo header with the ask in Cormorant at display size; then four sections — **Seller** (name, `seller_phone`, Messenger link, `touch_count` as "times reached out", first/last contact from the message timeline), **What they want** (`wants-form.tsx`), **Market position** (`comp_note`, `pitch_angle`, `dealTerms(lead.ask)`), **Conversation** (dated in/out timeline), **Next step** (`touch_reason` + `next_touch_at` + notes).

- [ ] **Step 2: Create the wants form**

`"use client"`, calling `saveWants`. Three structured inputs — `wants_timeframe` (date), `wants_flexibility` (select: firm / open / motivated), `wants_motivation` (select: upgrading / downsizing / relocating / estate / other) — plus a `wants_notes` textarea and `seller_phone` text input. Save on blur or an explicit Save button.

- [ ] **Step 3: Verify**

Visit `/portal/leads/974056925135720` (Michael Franz, Coastal Craft — has a real reply in the timeline).
Expected: photo, comps, his "yes it is." reply, and the wants form saving without error.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(portal)/portal/leads/[id]"
git commit -m "feat(crm): lead profile page"
```

---

### Task 9: Rename the tab to FB CRM

**Files:**
- Modify: `src/components/portal/sidebar.tsx:80`

- [ ] **Step 1: Change the label**

```bash
cd "/Users/connorgray/Desktop/Claude OS/grayyachts.com"
sed -i '' 's/label: "FB Marketplace Leads"/label: "FB CRM"/' src/components/portal/sidebar.tsx
grep -n '"FB CRM"' src/components/portal/sidebar.tsx
```
Expected: one match, at the nav entry.

- [ ] **Step 2: Confirm there is exactly one nav entry**

```bash
grep -c 'href: "/portal/leads"' src/components/portal/sidebar.tsx
```
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/sidebar.tsx
git commit -m "feat(crm): rename portal tab to FB CRM"
```

---

### Task 10: Deploy and verify

- [ ] **Step 1: Confirm the branch can safely deploy**

```bash
git branch --contains f68d6c2 | grep "$(git branch --show-current)"
```
Expected: the current branch is listed. If not, STOP — deploying will 404 every vessel page.

- [ ] **Step 2: Run the full test suite and typecheck**

```bash
npm test && npx tsc --noEmit
```
Expected: all pass, no type errors.

- [ ] **Step 3: Deploy through the guard**

```bash
npm run deploy
```
Expected: preflight reports 14 live listing pages and passes.

- [ ] **Step 4: Verify production**

```bash
node scripts/verify-deploy.mjs
curl -s -o /dev/null -w "seawulff %{http_code}\n" https://grayyachts.com/fleet/seawulff
```
Expected: all checks pass; seawulff 200.

- [ ] **Step 5: Verify the CRM in a browser**

Sign in, open **FB CRM**. Confirm the queue shows only due leads, a card's Sent button advances the stage, and Snooze pushes it out of the queue.

- [ ] **Step 6: Commit and push**

```bash
git push -u origin "$(git branch --show-current)"
```

---

## Self-Review

**Spec coverage:** Purpose → Tasks 6, 8. Data model → Task 2. Cadence → Task 3. Queue → Tasks 4, 6. Lead profile → Task 8. Rename → Task 9. Not-building list → respected (no board, tags, dashboards). Verification → Task 10.

**Deferred to later plans, by design:** Add-lead URL intake and Messenger sync (Plan 2); morning digest (Plan 3). Until Plan 2 lands, leads still arrive through the existing `sync.mjs` sweep, so the CRM is fully usable.

**Type consistency:** `queuePriority`, `messageScript`, `liveStep`, `dealTerms` all from `@/lib/fb-leads`; `FbLead` extended in Task 4 with the three fields the queue reads. Server actions use `listing_id` (the real PK) throughout, not `id`.

**Known gap:** `touch_count` is never incremented in this plan — `logSent` should bump it so the long-tail transition fires. Add to Task 5 Step 1 as part of `logSent`, or as a one-line follow-up before Plan 3.
