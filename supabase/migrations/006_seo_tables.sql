-- SEO tables for the Paperclip SEO Strategist agent
-- Used by: seo-strategist agent (writes), grayyachts.media blog (reads via content client)

-- Keyword tracking
CREATE TABLE IF NOT EXISTS public.seo_keywords (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword text UNIQUE NOT NULL,
  cluster text CHECK (cluster IN ('yacht_media', 'listing_media', 'pnw_lifestyle', 'buying_selling', 'industry_howto')),
  search_volume_estimate text CHECK (search_volume_estimate IN ('high', 'medium', 'low')),
  difficulty_estimate text CHECK (difficulty_estimate IN ('high', 'medium', 'low')),
  intent text CHECK (intent IN ('booking', 'authority', 'lead_capture', 'geo')),
  status text DEFAULT 'backlog' CHECK (status IN ('backlog', 'assigned', 'published', 'retired')),
  assigned_post_id uuid REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  current_position integer,
  geo_cited boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Search/AI performance tracking per post per keyword
CREATE TABLE IF NOT EXISTS public.seo_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  keyword_id uuid REFERENCES public.seo_keywords(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('google_organic', 'chatgpt', 'perplexity', 'google_ai_overview')),
  position integer,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  ctr numeric(5,4) DEFAULT 0,
  cited boolean DEFAULT false,
  citation_snippet text,
  checked_at timestamptz DEFAULT now()
);

-- Strategy decision log
CREATE TABLE IF NOT EXISTS public.seo_strategy_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_type text NOT NULL CHECK (entry_type IN ('strategy_shift', 'content_win', 'content_rewrite', 'keyword_discovery', 'geo_win')),
  summary text NOT NULL,
  data_points jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS policies
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_strategy_log ENABLE ROW LEVEL SECURITY;

-- Service role (Paperclip agents) gets full access
CREATE POLICY "Service role full access on seo_keywords"
  ON public.seo_keywords FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on seo_performance"
  ON public.seo_performance FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on seo_strategy_log"
  ON public.seo_strategy_log FOR ALL
  USING (auth.role() = 'service_role');

-- Public read access for performance dashboards
CREATE POLICY "Public can read seo_keywords"
  ON public.seo_keywords FOR SELECT
  USING (true);

CREATE POLICY "Public can read seo_performance"
  ON public.seo_performance FOR SELECT
  USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_seo_keywords_cluster ON public.seo_keywords(cluster);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_status ON public.seo_keywords(status);
CREATE INDEX IF NOT EXISTS idx_seo_performance_post_id ON public.seo_performance(post_id);
CREATE INDEX IF NOT EXISTS idx_seo_performance_checked_at ON public.seo_performance(checked_at);
CREATE INDEX IF NOT EXISTS idx_seo_strategy_log_type ON public.seo_strategy_log(entry_type);
