
-- ====== social_platform_connections ======
CREATE TABLE public.social_platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  account_name text,
  account_id text,
  page_id text,
  page_name text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'disconnected',
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_platform_connections TO authenticated;
GRANT ALL ON public.social_platform_connections TO service_role;
ALTER TABLE public.social_platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own connections" ON public.social_platform_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_spc_upd BEFORE UPDATE ON public.social_platform_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== social_product_analyses ======
CREATE TABLE public.social_product_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url text NOT NULL,
  source_type text NOT NULL DEFAULT 'auto',
  extracted_data jsonb DEFAULT '{}'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  analysis jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_product_analyses TO authenticated;
GRANT ALL ON public.social_product_analyses TO service_role;
ALTER TABLE public.social_product_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analyses" ON public.social_product_analyses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_spa_upd BEFORE UPDATE ON public.social_product_analyses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== social_posts ======
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  source_type text,
  source_url text,
  product_data jsonb DEFAULT '{}'::jsonb,
  generated_content jsonb DEFAULT '{}'::jsonb,
  media jsonb DEFAULT '[]'::jsonb,
  selected_platforms jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  approval_status text NOT NULL DEFAULT 'pending',
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own posts" ON public.social_posts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_sp_upd BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== social_post_platforms ======
CREATE TABLE public.social_post_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  platform_account_id text,
  content text,
  media jsonb DEFAULT '[]'::jsonb,
  schedule_time timestamptz,
  timezone text DEFAULT 'Africa/Cairo',
  recurring_rule jsonb,
  status text NOT NULL DEFAULT 'pending',
  publish_attempts int NOT NULL DEFAULT 0,
  published_url text,
  platform_post_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_post_platforms TO authenticated;
GRANT ALL ON public.social_post_platforms TO service_role;
ALTER TABLE public.social_post_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own post platforms" ON public.social_post_platforms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_spp_upd BEFORE UPDATE ON public.social_post_platforms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== social_schedules ======
CREATE TABLE public.social_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  schedule_type text NOT NULL DEFAULT 'once',
  publish_at timestamptz,
  timezone text DEFAULT 'Africa/Cairo',
  recurrence_type text,
  recurrence_days jsonb,
  recurrence_interval int,
  recurrence_ends_at timestamptz,
  max_occurrences int,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_schedules TO authenticated;
GRANT ALL ON public.social_schedules TO service_role;
ALTER TABLE public.social_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own schedules" ON public.social_schedules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_ssch_upd BEFORE UPDATE ON public.social_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== content_plans ======
CREATE TABLE public.content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  goal text,
  duration text,
  platforms jsonb DEFAULT '[]'::jsonb,
  sources jsonb DEFAULT '{}'::jsonb,
  settings jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_plans TO authenticated;
GRANT ALL ON public.content_plans TO service_role;
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.content_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cp_upd BEFORE UPDATE ON public.content_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== content_plan_items ======
CREATE TABLE public.content_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  date date,
  time time,
  platform text,
  content_type text,
  idea text,
  goal text,
  product_url text,
  product_id text,
  draft_content text,
  media_requirements jsonb,
  image_prompt text,
  video_prompt text,
  hashtags text,
  cta text,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  scheduled_post_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_plan_items TO authenticated;
GRANT ALL ON public.content_plan_items TO service_role;
ALTER TABLE public.content_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plan items" ON public.content_plan_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cpi_upd BEFORE UPDATE ON public.content_plan_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== social_publish_logs ======
CREATE TABLE public.social_publish_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
  platform text NOT NULL,
  action text NOT NULL,
  status text NOT NULL,
  request_summary jsonb,
  response_summary jsonb,
  platform_post_id text,
  published_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.social_publish_logs TO authenticated;
GRANT ALL ON public.social_publish_logs TO service_role;
ALTER TABLE public.social_publish_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs select" ON public.social_publish_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own logs insert" ON public.social_publish_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ====== secure token RPC ======
CREATE OR REPLACE FUNCTION public.get_social_connection_token(p_connection_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
  v_encrypted text;
  v_owner uuid;
BEGIN
  SELECT access_token_encrypted, user_id INTO v_encrypted, v_owner
  FROM public.social_platform_connections WHERE id = p_connection_id;
  IF v_owner IS NULL OR v_encrypted IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'ENCRYPTION_KEY' LIMIT 1;
  IF v_key IS NULL THEN RETURN NULL; END IF;
  RETURN public.decrypt_secret(v_encrypted, v_key);
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END;
$$;
