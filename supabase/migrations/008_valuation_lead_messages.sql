-- 008_valuation_lead_messages.sql
-- Every message sent or received about a /sell valuation lead: the valuation
-- reply, funnel emails, seller replies, owner alerts and manual notes. One row
-- per message so the lead's full thread can be read back in order.
--
-- public.valuation_leads itself was created outside this directory (Dashboard,
-- 2026-10; see src/lib/valuation-store.ts). This migration only references it.
--
-- Writers upsert with PostgREST "Prefer: resolution=ignore-duplicates" on
-- (provider, provider_message_id) so re-runs never duplicate a message.
-- Idempotent: safe to paste into the SQL editor more than once.

create table if not exists public.valuation_lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.valuation_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  channel text not null check (channel in ('email', 'sms', 'call', 'note')),
  direction text not null check (direction in ('out', 'in')),
  kind text not null,
  subject text,
  body text,
  sender text,
  recipient text,
  provider text,
  provider_message_id text,
  status text not null default 'sent',
  metadata jsonb not null default '{}'::jsonb,
  unique (provider, provider_message_id)
);

create index if not exists idx_valuation_lead_messages_lead_created
  on public.valuation_lead_messages (lead_id, created_at desc);

-- Service-role only, same as valuation_leads: RLS on with no policies.
alter table public.valuation_lead_messages enable row level security;

comment on table public.valuation_lead_messages is
  'Messages sent/received per valuation lead. kind: valuation_reply | funnel_intro | funnel_day1 | funnel_day3 | funnel_day7 | seller_reply | owner_alert | manual. provider: gmail | quo | resend | manual. status: sent | failed | received. body is plain text (HTML stripped). Service-role only.';
comment on column public.valuation_lead_messages.created_at is
  'When the message was sent or received, not when the row was written.';

-- Explicit API privileges: service role only; anon/authenticated get nothing.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.valuation_lead_messages TO service_role;

NOTIFY pgrst, 'reload schema';

-- Rollback (run manually only if this table must be removed; deletes all rows):
-- drop table if exists public.valuation_lead_messages;
-- NOTIFY pgrst, 'reload schema';
