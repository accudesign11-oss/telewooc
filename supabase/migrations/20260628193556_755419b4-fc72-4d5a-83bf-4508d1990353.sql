REVOKE EXECUTE ON FUNCTION public.get_social_connection_token(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_social_connection_token(uuid) TO service_role;