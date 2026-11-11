-- PROPOSED — NOT APPLIED. Needs Connor's yes before running against the
-- live project (eorkwxzhtidstznpzlyg). Written 2026-11-11 while reviewing
-- portal Content Review access after the 06:27 AM PST anon/authenticated
-- grant lockdown.
--
-- NOT required for the current code. Every Content Review page
-- (src/app/(portal)/portal/content-review/{page,actions}.tsx and children)
-- already checks isAdmin(user.email) via the session client and then reads
-- and writes outreach_sequences / blog_posts through createAdminClient(),
-- i.e. the SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely. Today's
-- lockdown only changed anon/authenticated grants, so it does not affect
-- these pages as long as the Worker has the service-role secret configured.
--
-- Purpose: a defense-in-depth option that would let the Content Review
-- pages move off the service-role key and onto the signed-in session client
-- (createClient()) in a later PR, scoped by real Postgres grants/RLS
-- instead of only an application-layer isAdmin() check. This migration is
-- inert on its own: it grants/is-admin-gated only to rows matched by
-- public.profiles.role = 'admin', and profiles has 0 rows today (0 admins),
-- so nothing changes for any session user until an admin profile row
-- exists. See the commented, separate OPTIONAL step at the bottom — do
-- not run it without Connor's yes, since it writes data.

begin;

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
$$;

revoke execute on function public.is_portal_admin() from public, anon;
grant execute on function public.is_portal_admin() to authenticated;

-- outreach_sequences: currently service_role only. Add read + a narrow
-- column-level update for admin review, gated by is_portal_admin() so
-- grants alone do not expose rows.
grant select on table public.outreach_sequences to authenticated;
grant update (status, rejection_note, updated_at) on table public.outreach_sequences to authenticated;

create policy "Admins can read outreach drafts"
on public.outreach_sequences
for select
to authenticated
using ((select public.is_portal_admin()));

create policy "Admins can approve or reject pending outreach"
on public.outreach_sequences
for update
to authenticated
using ((select public.is_portal_admin()) and status = 'pending_approval')
with check ((select public.is_portal_admin()) and status in ('approved', 'rejected'));

-- blog_posts: currently anon/authenticated SELECT only sees published=true
-- rows via the existing public policy. Add an admin-only SELECT for drafts
-- and a narrow column-level update for the review workflow.
grant update (published, published_at, qa_status, qa_last_feedback, qa_attempt, approved_at, rejection_note, updated_at)
  on table public.blog_posts to authenticated;

create policy "Admins can read all posts"
on public.blog_posts
for select
to authenticated
using ((select public.is_portal_admin()));

create policy "Admins can review posts"
on public.blog_posts
for update
to authenticated
using ((select public.is_portal_admin()))
with check ((select public.is_portal_admin()));

-- No anon changes. No changes to service_role grants or policies.

notify pgrst, 'reload schema';

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- OPTIONAL, SEPARATE STEP — DO NOT RUN as part of this migration, and only
-- with Connor's explicit yes: it writes data (creates the first admin
-- profile row), unlike everything above which is schema/grants/policy only.
-- Without this, the policies above match nobody and the pages behave
-- exactly as they do today even if switched to the session client.
--
-- insert into public.profiles (id, email, role)
-- select id, email, 'admin'
-- from auth.users
-- where lower(email) = 'connorgray41@gmail.com'
-- on conflict (id) do update set role = 'admin';
