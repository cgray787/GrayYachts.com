# Content Review access after the 2026-11-11 grant lockdown

## Context

On 2026-11-11 (06:27 AM PST) anon/authenticated grants on the Supabase
project (`eorkwxzhtidstznpzlyg`) were locked down. This note records what
was checked on the portal's Content Review pages
(`src/app/(portal)/portal/content-review/{page,outreach/page,blog/page,blog/[id]/page,actions}.tsx`)
in response, and what — if anything — should change.

## Findings

- Every Content Review page authenticates with the session client
  (`createClient()`) only to call `auth.getUser()`, then checks
  `isAdmin(user.email)` from `src/lib/admin.ts` — a hardcoded list
  containing only `connorgray41@gmail.com`. All actual reads and writes of
  `outreach_sequences` and `blog_posts` (plus the `prospects` join and
  `qa_reviews`) go through `createAdminClient()`, i.e. the
  `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS entirely.
- The 2026-11-11 lockdown only touched anon/authenticated grants. It did
  not touch `service_role` grants or policies on any of these tables, so
  it has no effect on how these pages read or write data.
- Live grants/RLS as of 2026-11-11 (read-only inspection, no writes made):
  - `blog_posts`: RLS enabled, one policy `"Public can read published
    posts"` (`SELECT USING (published = true)`, role `public`). Grants:
    `anon` SELECT, `authenticated` SELECT, `service_role` all.
  - `outreach_sequences`: RLS enabled, one policy `"Service role full
    access on outreach_sequences"`. Grants: `service_role` only — no
    `anon`/`authenticated` grants at all.
  - `qa_reviews`: `authenticated` SELECT, policy
    `qa_reviews_authenticated_select` (`USING (true)`), plus
    `service_role`.
  - `prospects`: `authenticated` SELECT/INSERT/UPDATE/DELETE, policy
    `"Admin full access to prospects"`
    (`EXISTS (... profiles.id = auth.uid() AND role = 'admin')`).
  - `profiles`: columns `id uuid`, `email text`, `role text CHECK IN
    ('client','admin')`. `authenticated` SELECT grant, plus own-row
    select/update policies. **0 rows** — the `prospects` admin policy
    above, and any profile-role-based policy, currently matches nobody.
  - `auth.users` has exactly 1 row — the hardcoded admin email.
  - There is no `on_auth_user_created` trigger, so no profile row gets
    created automatically when someone signs in.

## Why the pages most likely still work

Because every read/write on these pages goes through the service-role
client, none of it is subject to RLS or to the anon/authenticated grants
that were locked down. As long as the Cloudflare Worker has
`SUPABASE_SERVICE_ROLE_KEY` configured as a secret, the pages should
behave exactly as before the lockdown.

**Partly verified.** On Nov 11, 2026 (~9:00 AM PST) the Cloudflare API's secret
list for the `grayyachts-com` Worker (names only, no values read) showed
`SUPABASE_SERVICE_ROLE_KEY` is set, and the live grants still give
`service_role` full access to `outreach_sequences`, `blog_posts`, `prospects`
and `qa_reviews`. Still UNVERIFIED: that the stored key value is current and
valid, and the pages end-to-end (nobody has signed in and clicked through
`/portal/content-review` since the lockdown). If the key were stale,
`createAdminClient()` calls would fail regardless of any RLS or grant state.

## The isAdmin() vs profiles.role mismatch

`isAdmin()` is a hardcoded email list checked only in application code —
it has no relationship to `profiles.role`. `profiles` has 0 rows, so even
though `role = 'admin'` is a valid value, no row claims it today. Any
Postgres-level admin check written against `profiles.role` (like the
existing `prospects` policy, or the proposed migration below) is inert
until a profile row with `role = 'admin'` exists for the admin's
`auth.users` row.

## Recommendation

**Do not apply anything now.** The service-role path works independently
of RLS/grants and there's no indication it's broken. A proposed,
not-applied migration exists at
`supabase/changes/20261111-content-review-admin-access.sql` (with a
matching `.rollback.sql`) as a defense-in-depth option: it would let these
pages move off the service-role key and onto the signed-in session client,
scoped by real Postgres grants/RLS gated on `profiles.role = 'admin'`
instead of only the application-layer `isAdmin()` check.

It does nothing by itself — it's inert until an admin `profiles` row
exists (0 today) — and is not required for the current code to keep
working.

If Connor wants to move forward with this:

1. Review and apply `supabase/changes/20261111-content-review-admin-access.sql`
   (Supabase SQL editor, or the Supabase MCP `apply_migration` tool).
2. With his yes, also run the commented, separate `insert into
   public.profiles ...` step at the bottom of that file — it's the only
   part of this change that writes data (creates the first admin profile
   row). Skipping it leaves the new policies matching nobody.
3. Only then, in a follow-up PR, switch
   `src/app/(portal)/portal/content-review/**` from
   `createAdminClient()` to the session `createClient()` for the specific
   reads/writes the new grants/policies cover, and remove the now-redundant
   `isAdmin()` gate once the database is enforcing it.

To roll back, run
`supabase/changes/20261111-content-review-admin-access.rollback.sql`. It
drops exactly the 4 policies, revokes exactly the grants, and drops the
`is_portal_admin()` function added by the forward migration — restoring
the exact state described above. It does not touch or delete the admin
`profiles` row created by the optional step; remove that separately if
desired.

Tested in `scripts/test-content-review-access.mjs` (`npm run
test:content-review-access`) against an isolated PGlite Postgres replaying
the forward and rollback SQL verbatim.
