CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.social_page_posts_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.social_platform_connections(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_post_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connection_id, platform, external_post_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_page_posts_cache TO authenticated;
GRANT ALL ON public.social_page_posts_cache TO service_role;
ALTER TABLE public.social_page_posts_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their cached page posts"
ON public.social_page_posts_cache
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS update_social_page_posts_cache_updated_at ON public.social_page_posts_cache;
CREATE TRIGGER update_social_page_posts_cache_updated_at
BEFORE UPDATE ON public.social_page_posts_cache
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_social_page_posts_cache_user_platform ON public.social_page_posts_cache(user_id, platform, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_page_posts_cache_connection ON public.social_page_posts_cache(connection_id, fetched_at DESC);

ALTER TABLE public.social_posts
  ADD COLUMN IF NOT EXISTS source_post_id text,
  ADD COLUMN IF NOT EXISTS original_external_post_id text,
  ADD COLUMN IF NOT EXISTS source_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.content_brain_plans
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'content_plan',
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ads_strategy jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_content_brain_plans_user_type ON public.content_brain_plans(user_id, plan_type, created_at DESC);

ALTER TABLE public.content_brain_items
  ADD COLUMN IF NOT EXISTS ads_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;