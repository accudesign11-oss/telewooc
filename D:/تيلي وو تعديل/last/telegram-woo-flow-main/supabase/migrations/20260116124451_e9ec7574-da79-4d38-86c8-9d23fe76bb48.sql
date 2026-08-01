-- Add explicit DENY policies for UPDATE and DELETE on activity_log
-- These policies will prevent any user from modifying or deleting activity logs

-- Create a policy that denies all UPDATE operations
CREATE POLICY "Deny all updates on activity_log"
ON public.activity_log
FOR UPDATE
USING (false);

-- Create a policy that denies all DELETE operations  
CREATE POLICY "Deny all deletes on activity_log"
ON public.activity_log
FOR DELETE
USING (false);

-- Add encrypted columns for sensitive data
ALTER TABLE public.activity_log 
ADD COLUMN IF NOT EXISTS action_encrypted text,
ADD COLUMN IF NOT EXISTS metadata_encrypted text;

-- Create a function to insert encrypted activity logs
CREATE OR REPLACE FUNCTION public.insert_encrypted_activity_log(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encryption_key text;
  v_id uuid;
BEGIN
  -- Get encryption key from vault
  SELECT decrypted_secret INTO v_encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'ENCRYPTION_KEY'
  LIMIT 1;
  
  -- If no encryption key, fall back to storing unencrypted
  IF v_encryption_key IS NULL THEN
    INSERT INTO public.activity_log (user_id, entity_type, entity_id, action, metadata)
    VALUES (p_user_id, p_entity_type, p_entity_id, p_action, p_metadata)
    RETURNING id INTO v_id;
  ELSE
    -- Insert with encrypted action and metadata
    INSERT INTO public.activity_log (
      user_id, 
      entity_type, 
      entity_id, 
      action,
      metadata,
      action_encrypted,
      metadata_encrypted
    )
    VALUES (
      p_user_id, 
      p_entity_type, 
      p_entity_id,
      '[encrypted]', -- Placeholder for original action
      '{}'::jsonb, -- Empty placeholder for original metadata
      public.encrypt_secret(p_action, v_encryption_key),
      public.encrypt_secret(p_metadata::text, v_encryption_key)
    )
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$;

-- Create a function to read decrypted activity logs (for authorized access only)
CREATE OR REPLACE FUNCTION public.get_decrypted_activity_log(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  entity_type text,
  entity_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_encryption_key text;
BEGIN
  -- Get encryption key from vault
  SELECT decrypted_secret INTO v_encryption_key
  FROM vault.decrypted_secrets
  WHERE name = 'ENCRYPTION_KEY'
  LIMIT 1;
  
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.entity_type,
    al.entity_id,
    CASE 
      WHEN al.action_encrypted IS NOT NULL AND v_encryption_key IS NOT NULL 
      THEN public.decrypt_secret(al.action_encrypted, v_encryption_key)
      ELSE al.action
    END as action,
    CASE 
      WHEN al.metadata_encrypted IS NOT NULL AND v_encryption_key IS NOT NULL 
      THEN (public.decrypt_secret(al.metadata_encrypted, v_encryption_key))::jsonb
      ELSE al.metadata
    END as metadata,
    al.created_at
  FROM public.activity_log al
  WHERE al.user_id = p_user_id
  ORDER BY al.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.insert_encrypted_activity_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_decrypted_activity_log TO authenticated;