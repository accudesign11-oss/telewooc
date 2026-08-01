
ALTER TABLE public.content_brain_plans
  ADD COLUMN IF NOT EXISTS wp_site_url text,
  ADD COLUMN IF NOT EXISTS wp_username text,
  ADD COLUMN IF NOT EXISTS wp_app_password text,
  ADD COLUMN IF NOT EXISTS use_woocommerce boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS use_social_scan boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS scanned_context jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.content_brain_items
  ADD COLUMN IF NOT EXISTS uploaded_media jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS asset_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS external_tool_used text,
  ADD COLUMN IF NOT EXISTS notes text;
