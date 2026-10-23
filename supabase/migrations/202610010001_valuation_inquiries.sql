-- Apply before deploying the new /api/valuation handler.
-- Private CRM ledger; all access is through authenticated server code.
create table if not exists public.valuation_inquiries (
  id uuid primary key,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  request_hash text not null,
  contact jsonb not null,
  answers jsonb not null,
  attribution jsonb not null default '{}'::jsonb,
  photo_count integer not null default 0,
  notification_id text,
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed')),
  stage text not null default 'new' check (stage in ('new','qualified','appointment','listing_signed','not_qualified')),
  stage_updated_at timestamptz not null default now()
);
alter table public.valuation_inquiries enable row level security;
revoke all on public.valuation_inquiries from anon, authenticated;
grant all on public.valuation_inquiries to service_role;
create index if not exists valuation_inquiries_created_idx on public.valuation_inquiries(created_at desc);
-- PII-free aggregate, accessible only to the service role. Lead counts are NOT sessions.
create or replace view public.valuation_campaign_outcomes with (security_invoker=true) as
select (created_at at time zone 'America/Los_Angeles')::date as day,
  coalesce(nullif(attribution->>'utm_source',''),'direct_or_unknown') as source,
  coalesce(nullif(attribution->>'utm_medium',''),'unknown') as medium,
  coalesce(nullif(attribution->>'utm_campaign',''),'unassigned') as campaign,
  coalesce(nullif(attribution->>'utm_content',''),'unassigned') as creative,
  count(*) as stored_inquiries,
  count(*) filter (where accepted_at is not null) as accepted_inquiries,
  count(*) filter (where notification_status='failed') as notification_failures,
  count(*) filter (where stage in ('qualified','appointment','listing_signed')) as qualified_inquiries,
  count(*) filter (where stage in ('appointment','listing_signed')) as appointments,
  count(*) filter (where stage='listing_signed') as signed_listings
from public.valuation_inquiries group by 1,2,3,4,5;
revoke all on public.valuation_campaign_outcomes from anon, authenticated;
grant select on public.valuation_campaign_outcomes to service_role;
