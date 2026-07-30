CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_product_id uuid REFERENCES public.draft_products(id) ON DELETE CASCADE,
  wc_product_id bigint,
  reviewer_name text NOT NULL,
  reviewer_email text,
  rating numeric(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  dialect text NOT NULL DEFAULT 'مصرية',
  status text NOT NULL DEFAULT 'pending',
  wc_review_id bigint,
  verified boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_reviews_target_check CHECK (draft_product_id IS NOT NULL OR wc_product_id IS NOT NULL)
);

CREATE INDEX idx_product_reviews_user ON public.product_reviews(user_id);
CREATE INDEX idx_product_reviews_draft ON public.product_reviews(draft_product_id);
CREATE INDEX idx_product_reviews_wc ON public.product_reviews(wc_product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reviews" ON public.product_reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own reviews" ON public.product_reviews
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reviews" ON public.product_reviews
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reviews" ON public.product_reviews
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();