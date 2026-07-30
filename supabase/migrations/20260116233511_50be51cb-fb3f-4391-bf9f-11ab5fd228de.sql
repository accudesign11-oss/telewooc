-- Drop the old view first
DROP VIEW IF EXISTS public.telegram_sources_secure;

-- Create a secure view that NEVER exposes any token data
CREATE VIEW public.telegram_sources_secure
WITH (security_invoker = true)
AS SELECT 
    id,
    user_id,
    name,
    chat_id,
    auto_sync,
    is_active,
    mode,
    sync_interval_minutes,
    include_images_default,
    webhook_url,
    last_synced_at,
    created_at,
    updated_at,
    is_token_encrypted,
    -- Only show if token exists, never the actual token
    (bot_token_encrypted IS NOT NULL AND bot_token_encrypted != '') AS has_token
FROM public.telegram_sources;

-- Add comment explaining the security model
COMMENT ON VIEW public.telegram_sources_secure IS 'Secure view of telegram_sources that never exposes bot tokens. Uses security_invoker to inherit RLS from base table.';

-- Update bot_token column to always be placeholder (never store actual token)
UPDATE public.telegram_sources 
SET bot_token = '[encrypted]'
WHERE bot_token != '[encrypted]' AND bot_token_encrypted IS NOT NULL;

-- Make bot_token column always default to placeholder
ALTER TABLE public.telegram_sources 
ALTER COLUMN bot_token SET DEFAULT '[encrypted]';