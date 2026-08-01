ALTER TABLE public.draft_products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.content_brain_items ADD COLUMN IF NOT EXISTS reference_media jsonb NOT NULL DEFAULT '[]'::jsonb;