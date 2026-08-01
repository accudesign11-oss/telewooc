
ALTER TABLE public.branding_assets
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS consistency_score numeric,
  ADD COLUMN IF NOT EXISTS consistency_report jsonb,
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS source_asset_id uuid REFERENCES public.branding_assets(id) ON DELETE SET NULL;
