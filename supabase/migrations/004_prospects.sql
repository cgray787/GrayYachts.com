-- 004_prospects.sql
-- Lead prospects found by the Paperclip Lead Researcher agent

create table public.prospects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text,
  phone text,
  yacht_name text,
  yacht_length integer,
  source_url text not null,
  source text not null,
  location text,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'archived')),
  hot_lead boolean not null default false,
  notes text,
  found_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint prospects_source_url_unique unique (source_url)
);

create index idx_prospects_email on public.prospects (email) where email is not null;
create index idx_prospects_status on public.prospects (status);
create index idx_prospects_hot_lead on public.prospects (hot_lead) where hot_lead = true;

-- Note: Agents connect via service role key (bypasses RLS).
-- These policies protect against unauthorized access from the client app only.
alter table public.prospects enable row level security;

create policy "Admin full access to prospects"
  on public.prospects for all
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

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger prospects_updated_at
  before update on public.prospects
  for each row execute function public.update_updated_at();
