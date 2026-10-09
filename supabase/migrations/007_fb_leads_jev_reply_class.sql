-- Jev (TypeSafe) reply triage: record the model's judgment on every seller
-- reply next to the stage the code chose from it. Raw probabilities stay so
-- thresholds can be retuned in code without re-running inference.
alter table public.fb_leads
  add column if not exists reply_class            text,
  add column if not exists reply_class_confidence numeric,
  add column if not exists reply_hot_p            numeric,
  add column if not exists reply_needs_reply_p    numeric,
  add column if not exists reply_classified_at    timestamptz;

comment on column public.fb_leads.reply_class is
  'Jev choice: broker_listed | broker_but_open | private_seller | interested | not_interested | sold_or_unavailable | question | unclear';
