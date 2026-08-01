
ALTER TABLE public.content_brain_plans ADD COLUMN IF NOT EXISTS quantitative_recommendations jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.content_brain_plans ADD COLUMN IF NOT EXISTS deep_scan jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.content_brain_items ADD COLUMN IF NOT EXISTS asset_urls jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.content_brain_items ADD COLUMN IF NOT EXISTS asset_ready boolean DEFAULT false;
