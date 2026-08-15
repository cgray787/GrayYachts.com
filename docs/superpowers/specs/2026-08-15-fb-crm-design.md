# FB CRM — design

**Date:** 2026-08-15
**Status:** approved, ready for implementation plan
**Surface:** `/portal/leads` in grayyachts.com, renamed **FB CRM**

## Purpose

Connor chases FSBO yacht sellers on Facebook Marketplace. Leads die because
nobody remembers to follow up, not because there are too few of them. This CRM
exists to answer one question every morning: **who do I contact today, and what
do I say?**

Everything else is secondary. A feature earns its place only if it makes him
contact the right seller sooner.

Scope is **Facebook Marketplace only**. The data model is source-agnostic from
day one (`source` column, a lead-intake boundary) so website valuations and Quo
inbound can be added later without a rewrite — but none of that is built now.

## Competitive basis

Five CRMs were reviewed. What was taken, and what was deliberately left:

| Product | Taken | Left |
|---|---|---|
| Follow Up Boss | Action Plans (a stage change schedules the next touch); always-on long-tail follow-up | Team distribution, dialler, lead routing |
| GoHighLevel | Time-in-stage as a trigger — a lead going quiet surfaces itself | Funnels, campaigns, the whole agency layer |
| Close | Home screen is a work queue, not a database | Activity-volume reporting |
| Pipedrive | One screen, minimal chrome | Pipeline board as the primary view |
| folk | Near-zero learning curve; no tutorial needed | Enrichment, shared views |

The finding that shaped the design: the winners are not better databases, they
are better to-do lists.

## Architecture

Three surfaces. Nothing else.

```
/portal/leads          Today's queue          (home)
/portal/leads/new      Add lead (paste URL)
/portal/leads/[id]     Lead profile
/portal/leads/all      Full list              (one click away, rarely used)
```

**The one structural change:** urgency moves from the browser into the database.
Today `needsYou()` computes "is this overdue" in React. A 7am digest has no
browser open, so the answer must already exist in Postgres. Every lead carries a
stored `next_touch_at`, maintained by a trigger. The queue becomes
`where next_touch_at <= now()`, and the digest reads exactly the rows the UI
shows — one source of truth, no drift between what Connor sees and what the
email says.

## Data model

Additive columns on `public.fb_leads`:

| Column | Type | Purpose |
|---|---|---|
| `next_touch_at` | timestamptz | When this lead next needs attention. The field the system turns on |
| `touch_reason` | text | Why it surfaced — "No reply in 3 days", "Still available? check" |
| `touch_count` | int | Touches so far; drives active → long-tail transition |
| `source` | text default 'facebook' | Future multi-source support |
| `closed_reason` | text | broker / not_interested / sold_elsewhere / won |
| `seller_phone` | text | Profile field |
| `thread_id` | text | Messenger thread, for sync |
| `wants_timeframe` | date | "needs it gone by spring" — actionable, so structured |
| `wants_flexibility` | text | firm / open / motivated |
| `wants_motivation` | text | upgrading / downsizing / relocating / estate / other |
| `wants_notes` | text | Everything else, free prose |

`fb_lead_messages` is unchanged and already holds the conversation timeline.

Three structured fields, one prose field. Structured only where the queue can
act on it — `wants_timeframe` lets a seller who said "by spring" resurface as
spring approaches. Everything else is prose because forms nobody fills in are
worse than no data.

## Cadence engine

Encoded once, in a Postgres trigger, so it stays correct whether the change came
from the UI, the sync script, or an agent.

**Active phase:**

| Trigger | Next touch |
|---|---|
| Opener sent | +3 days |
| Seller confirms private sale | immediately (top of queue) |
| Pitch sent | +5 days |
| Nudge sent | +5 days |
| Terms sent | +4 days |

**Long-tail:** once the active cadence is exhausted, the lead does not die. It
drops to a "still available?" check **every 60 days**, indefinitely.

This is the single most valuable behaviour in the system. A seller who brushes
Connor off in week one is a different person in week ten, when the boat still
has not sold. Boats sit for months — the Grand Banks and the Leopard 44 both
have. A CRM that forgets a lead after three weeks throws away the best
inventory.

**Closing states** set `next_touch_at = null` and never resurface:
`broker` (they said it is brokered), `not_interested` (explicit stop),
`sold_elsewhere`, `won`.

## The queue (home)

One list. Cards ordered by priority, each showing the boat, how overdue it is,
**why** it surfaced, and the exact message ready to send with a copy button.

Two actions per card: **Sent** (logs the message, advances the stage,
reschedules) and **Snooze**. Plus one-click **Not interested** so a dead lead can
be killed without thinking about it.

Priority = overdue-ness × ask value × stage weight. A $750K seller who replied
outranks a $170K one that has gone quiet.

Empty state reads "Nothing due today" — it must not fall back to showing all 97
leads, which is a picture of work rather than work.

## Add lead

One input: **the Marketplace listing URL.**

The listing is fetched from Facebook's public GraphQL endpoint — the same
mechanism that found the original 97 leads — giving title, asking price,
location, description, seller name and photos. Connor confirms and saves.

The conversation is **not pasted**. The extension searches the Messenger inbox
for the thread matching that listing, imports the history into
`fb_lead_messages`, and sets the stage from what it finds. A lead with four
existing exchanges lands at "pitch sent", not "new".

## Messenger sync

Extends the existing `tools/gy-marketplace-extension`, which already has
Facebook host permissions, a portal↔extension bridge and a working send path.

A new content script on `facebook.com/messages/*` enumerates threads and reads
them. Two techniques from `anhln-embedded/fb-mcp-server`:

- **Parse `aria-label`, not CSS classes.** Facebook rotates obfuscated class
  names constantly, which is why DOM scrapers rot in weeks. Accessibility labels
  carry sender, timestamp and text, and are stable because screen readers depend
  on them.
- **Inject text via a synthetic `ClipboardEvent`.** The composer is Lexical,
  which ignores direct DOM value writes — the reason naive automation fails
  silently.

**On the encryption PIN:** it is never stored, transmitted or written to a repo.
Non-E2EE threads already read fine — Michael Franz's Coastal Craft thread was
read directly at `/messages/t/1681544286253634/` without any PIN. The real
blocker was thread-ID *discovery*, which the extension solves by enumerating the
DOM. For E2EE threads, Connor unlocks once per device by hand; it persists for
that browser afterwards.

**Risk, stated plainly:** this is contrary to Facebook's automation terms, and
that account is the pipeline. Reading one's own rendered session is far lower
risk than headless login, but sync stays read-mostly and human-paced.

## Morning digest

A **Cloudflare Cron Trigger** on the Worker that already serves the site,
sending through the `RESEND_API_KEY` secret already present.

Deliberately *not* the existing launchd monitor: that only runs when the Mac is
awake, and a reminder system that silently skips days is worse than none.

The email is plain — count, top five boats, why each surfaced, one link into the
queue.

## Lead profile

The file Connor refers back to.

Full-bleed boat photo, asking price in Cormorant at display size, status carried
by colour and weight rather than badges. Then: **Seller** (name, phone,
Messenger link, times reached out, first and last contact) · **What they want**
(the four fields above) · **Market position** (comps, pitch angle, the 5%/5%
maths) · **Conversation** (dated timeline) · **Next step** (what is due, when,
why, plus notes).

It should read like a brokerage document, not a database row, and survive being
looked at fifty times a week — restraint over decoration.

## Not building

Custom fields, tags, reporting dashboards, multi-user assignment, buyer records,
a mobile app, a pipeline board. Each is a real feature in one of the five
products reviewed, and each fails the test. Any of them is easy to add after a
fortnight of real use; removing them later is not.

## Verification

- Cadence trigger tested **in both directions** on throwaway rows — the check
  that caught the reply-classifier bug, where a "yes it is." reply was landing
  in `replied` and would have told Connor to pitch a broker.
- Digest tested by forcing a lead's `next_touch_at` into the past and confirming
  the email actually arrives — not merely that the cron fired.
- Queue tested against the 97 real leads.
- URL intake tested against a known listing and against a dead one.
- Messenger import tested against Michael Franz's thread, whose contents are
  already known, so the parse can be checked rather than assumed.
- Deploy from `worktree-neverland-brochure` lineage only, via `npm run deploy`,
  then confirm all 14 vessel pages still return 200.
