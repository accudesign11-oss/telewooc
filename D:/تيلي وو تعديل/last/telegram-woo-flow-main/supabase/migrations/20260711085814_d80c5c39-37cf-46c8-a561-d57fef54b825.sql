
CREATE TABLE public.wp_plugins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  current_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wp_plugins TO authenticated;
GRANT ALL ON public.wp_plugins TO service_role;
ALTER TABLE public.wp_plugins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wp_plugins" ON public.wp_plugins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_wp_plugins_updated_at BEFORE UPDATE ON public.wp_plugins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_wp_plugins_user ON public.wp_plugins(user_id, updated_at DESC);

CREATE TABLE public.wp_plugin_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id UUID NOT NULL REFERENCES public.wp_plugins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  prompt TEXT NOT NULL,
  php_code TEXT NOT NULL DEFAULT '',
  css TEXT NOT NULL DEFAULT '',
  js TEXT NOT NULL DEFAULT '',
  explanation TEXT,
  changelog TEXT,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wp_plugin_versions TO authenticated;
GRANT ALL ON public.wp_plugin_versions TO service_role;
ALTER TABLE public.wp_plugin_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wp_plugin_versions" ON public.wp_plugin_versions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_wp_plugin_versions_plugin ON public.wp_plugin_versions(plugin_id, created_at DESC);
