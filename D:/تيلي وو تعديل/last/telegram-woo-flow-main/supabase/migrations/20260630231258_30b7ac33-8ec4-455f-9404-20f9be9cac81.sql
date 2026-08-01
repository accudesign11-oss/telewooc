
-- Content Brain Plans
CREATE TABLE public.content_brain_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.branding_clients(id) ON DELETE SET NULL,
  brand_kit_id uuid REFERENCES public.brand_kits(id) ON DELETE SET NULL,
  name text NOT NULL,
  business_description text,
  website_url text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  goal text,
  duration_days integer DEFAULT 30,
  start_date date,
  end_date date,
  selected_platforms jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_preferences jsonb NOT NULL DEFAULT '[]'::jsonb,
  posting_frequency text,
  notes text,
  analysis jsonb DEFAULT '{}'::jsonb,
  strategy jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_brain_plans TO authenticated;
GRANT ALL ON public.content_brain_plans TO service_role;
ALTER TABLE public.content_brain_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.content_brain_plans FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER upd_cbp BEFORE UPDATE ON public.content_brain_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Content Brain Items
CREATE TABLE public.content_brain_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.content_brain_plans(id) ON DELETE CASCADE,
  item_index integer NOT NULL DEFAULT 0,
  scheduled_date date,
  day_name text,
  scheduled_time text,
  platform text,
  content_type text,
  objective text,
  idea text,
  product_or_service text,
  hook text,
  draft_content text,
  cta text,
  hashtags text,
  media_type text,
  needs_image boolean DEFAULT false,
  needs_video boolean DEFAULT false,
  needs_carousel boolean DEFAULT false,
  needs_story boolean DEFAULT false,
  image_prompt text,
  video_prompt text,
  design_notes text,
  priority text DEFAULT 'medium',
  approval_status text NOT NULL DEFAULT 'suggested',
  schedule_status text DEFAULT 'pending',
  linked_post_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
  pinned boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_brain_items TO authenticated;
GRANT ALL ON public.content_brain_items TO service_role;
ALTER TABLE public.content_brain_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own items" ON public.content_brain_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER upd_cbi BEFORE UPDATE ON public.content_brain_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_cbi_plan ON public.content_brain_items(plan_id);
CREATE INDEX idx_cbi_user ON public.content_brain_items(user_id);

-- Executions
CREATE TABLE public.content_brain_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.content_brain_plans(id) ON DELETE CASCADE,
  execution_type text NOT NULL DEFAULT 'draft',
  items_count integer DEFAULT 0,
  approved_count integer DEFAULT 0,
  converted_count integer DEFAULT 0,
  scheduled_count integer DEFAULT 0,
  skipped_count integer DEFAULT 0,
  status text DEFAULT 'completed',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_brain_executions TO authenticated;
GRANT ALL ON public.content_brain_executions TO service_role;
ALTER TABLE public.content_brain_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exec" ON public.content_brain_executions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Item versions
CREATE TABLE public.content_brain_item_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.content_brain_items(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  old_data jsonb,
  new_data jsonb,
  change_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_brain_item_versions TO authenticated;
GRANT ALL ON public.content_brain_item_versions TO service_role;
ALTER TABLE public.content_brain_item_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own versions" ON public.content_brain_item_versions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
