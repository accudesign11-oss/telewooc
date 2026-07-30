
CREATE TABLE public.wp_customizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_css TEXT NOT NULL DEFAULT '',
  generated_js TEXT NOT NULL DEFAULT '',
  explanation TEXT,
  applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wp_customizations TO authenticated;
GRANT ALL ON public.wp_customizations TO service_role;

ALTER TABLE public.wp_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wp_customizations"
  ON public.wp_customizations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_wp_customizations_updated_at
  BEFORE UPDATE ON public.wp_customizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_wp_customizations_user_created ON public.wp_customizations(user_id, created_at DESC);
