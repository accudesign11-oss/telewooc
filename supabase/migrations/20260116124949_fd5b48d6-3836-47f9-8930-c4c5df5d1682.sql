-- Step 1: Make sure all existing tokens are encrypted before clearing plaintext
-- First, encrypt any remaining plaintext tokens
DO $$
DECLARE
  v_encryption_key text;
  v_source record;
BEGIN
  -- Get encryption key from vault
  SELECT decrypted_secret INTO v_encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'ENCRYPTION_KEY'
  LIMIT 1;
  
  IF v_encryption_key IS NOT NULL THEN
    -- Encrypt any plaintext tokens that don't have encrypted version
    FOR v_source IN 
      SELECT id, bot_token 
      FROM public.telegram_sources 
      WHERE bot_token IS NOT NULL 
        AND bot_token != '' 
        AND bot_token != '[encrypted]'
        AND (bot_token_encrypted IS NULL OR bot_token_encrypted = '')
    LOOP
      UPDATE public.telegram_sources
      SET 
        bot_token_encrypted = public.encrypt_secret(v_source.bot_token, v_encryption_key),
        is_token_encrypted = true
      WHERE id = v_source.id;
    END LOOP;
  END IF;
END $$;

-- Step 2: Clear all plaintext bot_token values and set placeholder
UPDATE public.telegram_sources
SET bot_token = '[encrypted]'
WHERE bot_token IS NOT NULL 
  AND bot_token != '[encrypted]'
  AND bot_token_encrypted IS NOT NULL 
  AND bot_token_encrypted != '';

-- Step 3: Create a trigger to automatically encrypt and clear plaintext on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.encrypt_bot_token_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_encryption_key text;
BEGIN
  -- Only process if bot_token has a real value (not placeholder)
  IF NEW.bot_token IS NOT NULL AND NEW.bot_token != '' AND NEW.bot_token != '[encrypted]' THEN
    -- Get encryption key from vault
    SELECT decrypted_secret INTO v_encryption_key
    FROM vault.decrypted_secrets
    WHERE name = 'ENCRYPTION_KEY'
    LIMIT 1;
    
    IF v_encryption_key IS NOT NULL THEN
      -- Encrypt the token
      NEW.bot_token_encrypted := public.encrypt_secret(NEW.bot_token, v_encryption_key);
      NEW.is_token_encrypted := true;
    END IF;
    
    -- Always clear the plaintext
    NEW.bot_token := '[encrypted]';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS encrypt_telegram_bot_token ON public.telegram_sources;

-- Create the trigger
CREATE TRIGGER encrypt_telegram_bot_token
BEFORE INSERT OR UPDATE ON public.telegram_sources
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_bot_token_trigger();

-- Step 4: Create a secure view that never exposes the token
CREATE OR REPLACE VIEW public.telegram_sources_secure AS
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
  -- Only show if token exists, never the actual value
  CASE WHEN bot_token_encrypted IS NOT NULL AND bot_token_encrypted != '' THEN true ELSE false END as has_token
FROM public.telegram_sources;

-- Grant access to the view
GRANT SELECT ON public.telegram_sources_secure TO authenticated;