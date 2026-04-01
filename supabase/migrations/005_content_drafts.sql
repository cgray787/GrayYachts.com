-- 005_content_drafts.sql
-- Depends on: 004_prospects.sql (defines update_updated_at function)
-- Content drafts created by the Paperclip Content Writer agent

create table public.content_drafts (
  id uuid default gen_random_uuid() primary key,
  platform text not null check (platform in ('instagram', 'linkedin', 'youtube', 'facebook', 'email')),
  title text,
  content text not null,
  hashtags text,
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'posted')),
  scheduled_for date,
  approved_at timestamptz,
  posted_at timestamptz,
  rejection_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_content_drafts_status on public.content_drafts (status);
create index idx_content_drafts_platform on public.content_drafts (platform);

alter table public.content_drafts enable row level security;

create policy "Admin full access to content_drafts"
  on public.content_drafts for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create trigger content_drafts_updated_at
  before update on public.content_drafts
  for each row execute function public.update_updated_at();
