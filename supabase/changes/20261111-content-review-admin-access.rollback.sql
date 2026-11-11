-- Rollback for 20261111-content-review-admin-access.sql. PROPOSED — NOT
-- APPLIED. Only run this after the forward migration has actually been
-- applied, and only to restore the exact pre-migration state described in
-- docs/content-review-access.md.

begin;

drop policy if exists "Admins can review posts" on public.blog_posts;
drop policy if exists "Admins can read all posts" on public.blog_posts;

revoke update (published, published_at, qa_status, qa_last_feedback, qa_attempt, approved_at, rejection_note, updated_at)
  on table public.blog_posts from authenticated;

drop policy if exists "Admins can approve or reject pending outreach" on public.outreach_sequences;
drop policy if exists "Admins can read outreach drafts" on public.outreach_sequences;

revoke update (status, rejection_note, updated_at) on table public.outreach_sequences from authenticated;
revoke select on table public.outreach_sequences from authenticated;

revoke execute on function public.is_portal_admin() from authenticated;
drop function if exists public.is_portal_admin();

notify pgrst, 'reload schema';

commit;
