
CREATE OR REPLACE FUNCTION public.get_telegram_bot_token(p_source_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
  v_encrypted text;
BEGIN
  SELECT bot_token_encrypted INTO v_encrypted
  FROM public.telegram_sources WHERE id = p_source_id;

  IF v_encrypted IS NULL OR v_encrypted = '' THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets WHERE name = 'ENCRYPTION_KEY' LIMIT 1;

  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN public.decrypt_secret(v_encrypted, v_key);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_telegram_bot_token(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_telegram_bot_token(uuid) TO service_role;
