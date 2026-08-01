-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to encrypt text using AES-256
CREATE OR REPLACE FUNCTION public.encrypt_secret(plain_text text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(
    pgp_sym_encrypt(plain_text, encryption_key),
    'base64'
  );
END;
$$;

-- Create a function to decrypt text using AES-256
CREATE OR REPLACE FUNCTION public.decrypt_secret(encrypted_text text, encryption_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN pgp_sym_decrypt(
    decode(encrypted_text, 'base64'),
    encryption_key
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Add a column to store encrypted bot_token
ALTER TABLE public.telegram_sources 
ADD COLUMN IF NOT EXISTS bot_token_encrypted text;

-- Add column to track if token is encrypted
ALTER TABLE public.telegram_sources 
ADD COLUMN IF NOT EXISTS is_token_encrypted boolean DEFAULT false;