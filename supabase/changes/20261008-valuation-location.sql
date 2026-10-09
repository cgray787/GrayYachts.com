ALTER TABLE public.valuation_leads
 ADD COLUMN IF NOT EXISTS location text,
 ADD COLUMN IF NOT EXISTS existing_listing_url text;
NOTIFY pgrst, 'reload schema';
