-- Fix the SECURITY DEFINER view warning by using SECURITY INVOKER
DROP VIEW IF EXISTS public.telegram_sources_secure;

CREATE VIEW public.telegram_sources_secure
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  name,
  chat_id,
  is_active,
  auto_sync,
  sync_interval_minutes,
  include_images_default,
  last_synced_at,
  mode,
  webhook_url,
  created_at,
  updated_at,
  is_token_encrypted,
  CASE WHEN bot_token_encrypted IS NOT NULL AND bot_token_encrypted != '' THEN true ELSE false END as has_token
FROM public.telegram_sources;

-- Grant access to authenticated users
GRANT SELECT ON public.telegram_sources_secure TO authenticated;