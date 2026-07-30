
-- =============================================================================
-- BRANDING STUDIO - Phase 1 Migration
-- =============================================================================

-- 1. branding_clients
CREATE TABLE public.branding_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_type TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_clients TO authenticated;
GRANT ALL ON public.branding_clients TO service_role;
ALTER TABLE public.branding_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own branding_clients" ON public.branding_clients
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. brand_kits
CREATE TABLE public.brand_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.branding_clients(id) ON DELETE SET NULL,
  brand_name_ar TEXT,
  brand_name_en TEXT,
  slogan TEXT,
  description TEXT,
  website_url TEXT,
  industry TEXT,
  contact_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  social_links_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  personality_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_audience_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  colors_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  typography_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  logo_assets_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_assets_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_assets_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  template_assets_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  brand_dna_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kits TO authenticated;
GRANT ALL ON public.brand_kits TO service_role;
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own brand_kits" ON public.brand_kits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. branding_assets
CREATE TABLE public.branding_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.branding_clients(id) ON DELETE SET NULL,
  brand_kit_id UUID REFERENCES public.brand_kits(id) ON DELETE SET NULL,
  asset_type TEXT NOT NULL,
  platform TEXT,
  size_width INT,
  size_height INT,
  title TEXT,
  prompt TEXT,
  negative_prompt TEXT,
  provider TEXT,
  provider_model TEXT,
  image_url TEXT,
  editable_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_assets TO authenticated;
GRANT ALL ON public.branding_assets TO service_role;
ALTER TABLE public.branding_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own branding_assets" ON public.branding_assets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. branding_templates
CREATE TABLE public.branding_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.branding_clients(id) ON DELETE SET NULL,
  brand_kit_id UUID REFERENCES public.brand_kits(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  platform TEXT,
  width INT,
  height INT,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  editable_fields_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url TEXT,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_templates TO authenticated;
GRANT ALL ON public.branding_templates TO service_role;
ALTER TABLE public.branding_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own branding_templates" ON public.branding_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. generation_providers
CREATE TABLE public.generation_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  api_key_encrypted TEXT,
  api_key_last4 TEXT,
  base_url TEXT,
  model_name TEXT,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'inactive',
  last_tested_at TIMESTAMPTZ,
  last_test_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_providers TO authenticated;
GRANT ALL ON public.generation_providers TO service_role;
ALTER TABLE public.generation_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own generation_providers" ON public.generation_providers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. social_size_presets (mix global defaults + user customs)
CREATE TABLE public.social_size_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,
  safe_area_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_size_presets TO authenticated;
GRANT ALL ON public.social_size_presets TO service_role;
ALTER TABLE public.social_size_presets ENABLE ROW LEVEL SECURITY;
-- Global presets (user_id IS NULL) readable by all authenticated; user customs scoped per-user
CREATE POLICY "read global or own social_size_presets" ON public.social_size_presets
  FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "users insert own social_size_presets" ON public.social_size_presets
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own social_size_presets" ON public.social_size_presets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own social_size_presets" ON public.social_size_presets
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 7. branding_generation_logs
CREATE TABLE public.branding_generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.branding_clients(id) ON DELETE SET NULL,
  brand_kit_id UUID REFERENCES public.brand_kits(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES public.branding_assets(id) ON DELETE SET NULL,
  provider TEXT,
  request_summary TEXT,
  response_summary TEXT,
  cost_estimate NUMERIC(10,4),
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branding_generation_logs TO authenticated;
GRANT ALL ON public.branding_generation_logs TO service_role;
ALTER TABLE public.branding_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own branding_generation_logs" ON public.branding_generation_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER trg_branding_clients_updated_at BEFORE UPDATE ON public.branding_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brand_kits_updated_at BEFORE UPDATE ON public.brand_kits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_branding_assets_updated_at BEFORE UPDATE ON public.branding_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_branding_templates_updated_at BEFORE UPDATE ON public.branding_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_generation_providers_updated_at BEFORE UPDATE ON public.generation_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_social_size_presets_updated_at BEFORE UPDATE ON public.social_size_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX idx_brand_kits_user ON public.brand_kits(user_id);
CREATE INDEX idx_brand_kits_client ON public.brand_kits(client_id);
CREATE INDEX idx_branding_assets_user ON public.branding_assets(user_id);
CREATE INDEX idx_branding_assets_kit ON public.branding_assets(brand_kit_id);
CREATE INDEX idx_branding_assets_type ON public.branding_assets(asset_type);
CREATE INDEX idx_branding_templates_user ON public.branding_templates(user_id);
CREATE INDEX idx_generation_providers_user ON public.generation_providers(user_id);

-- Seed global social_size_presets (user_id NULL = available to all)
INSERT INTO public.social_size_presets (user_id, platform, asset_type, width, height, notes) VALUES
-- Facebook
(NULL,'facebook','profile_picture',1080,1080,'Facebook profile'),
(NULL,'facebook','page_cover',1640,924,'Facebook page cover'),
(NULL,'facebook','group_cover',1640,856,'Facebook group cover'),
(NULL,'facebook','event_cover',1920,1005,'Facebook event cover'),
(NULL,'facebook','story',1080,1920,'Facebook story'),
(NULL,'facebook','post_square',1080,1080,'Facebook square post'),
(NULL,'facebook','post_landscape',1200,630,'Facebook landscape post'),
-- Instagram
(NULL,'instagram','profile_picture',1080,1080,'Instagram profile'),
(NULL,'instagram','post_square',1080,1080,'Instagram square'),
(NULL,'instagram','post_portrait',1080,1350,'Instagram portrait'),
(NULL,'instagram','story_reel',1080,1920,'Instagram story/reel'),
-- TikTok
(NULL,'tiktok','profile_picture',1080,1080,'TikTok profile'),
(NULL,'tiktok','video_cover',1080,1920,'TikTok video cover'),
-- X / Twitter
(NULL,'x','profile_picture',1080,1080,'X profile'),
(NULL,'x','header',1500,500,'X header'),
(NULL,'x','post_image',1600,900,'X post image'),
-- LinkedIn
(NULL,'linkedin','personal_profile',1080,1080,'LinkedIn personal'),
(NULL,'linkedin','personal_background',1584,396,'LinkedIn personal bg'),
(NULL,'linkedin','company_logo',1080,1080,'LinkedIn company logo'),
(NULL,'linkedin','company_cover',1128,191,'LinkedIn company cover'),
(NULL,'linkedin','post_image',1200,627,'LinkedIn post'),
-- YouTube
(NULL,'youtube','channel_icon',1080,1080,'YouTube channel icon'),
(NULL,'youtube','channel_banner',2560,1440,'YouTube banner'),
(NULL,'youtube','thumbnail',1280,720,'YouTube thumbnail'),
-- Pinterest
(NULL,'pinterest','profile_picture',1080,1080,'Pinterest profile'),
(NULL,'pinterest','pin',1000,1500,'Pinterest pin'),
(NULL,'pinterest','board_cover',1000,1000,'Pinterest board cover'),
-- WhatsApp Business
(NULL,'whatsapp','profile_picture',1080,1080,'WhatsApp profile'),
(NULL,'whatsapp','catalog_image',1080,1080,'WhatsApp catalog'),
(NULL,'whatsapp','status',1080,1920,'WhatsApp status'),
-- Google Business Profile
(NULL,'google_business','logo',1080,1080,'GBP logo'),
(NULL,'google_business','cover',2120,1192,'GBP cover'),
(NULL,'google_business','post_image',1200,900,'GBP post'),
-- Website
(NULL,'website','hero_banner',1920,700,'Website hero'),
(NULL,'website','wide_banner',1920,500,'Website wide'),
(NULL,'website','square_ad',1080,1080,'Square ad'),
(NULL,'website','product_promo',1200,1200,'Product promo');
