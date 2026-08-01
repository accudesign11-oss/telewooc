
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS old_values jsonb,
  ADD COLUMN IF NOT EXISTS new_values jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'success',
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS resource_url text,
  ADD COLUMN IF NOT EXISTS is_reverted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reverted_at timestamptz;

-- Replace deny-all update policy with a scoped one that only allows toggling is_reverted / reverted_at
DROP POLICY IF EXISTS "Deny all updates on activity_log" ON public.activity_log;

CREATE POLICY "Users can mark their own activity as reverted"
  ON public.activity_log
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger to guarantee only is_reverted / reverted_at can change
CREATE OR REPLACE FUNCTION public.activity_log_immutable_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id
     OR NEW.user_id <> OLD.user_id
     OR NEW.action IS DISTINCT FROM OLD.action
     OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
     OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.old_values IS DISTINCT FROM OLD.old_values
     OR NEW.new_values IS DISTINCT FROM OLD.new_values
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.error_message IS DISTINCT FROM OLD.error_message
     OR NEW.resource_url IS DISTINCT FROM OLD.resource_url
     OR NEW.created_at <> OLD.created_at
     OR NEW.action_encrypted IS DISTINCT FROM OLD.action_encrypted
     OR NEW.metadata_encrypted IS DISTINCT FROM OLD.metadata_encrypted
  THEN
    RAISE EXCEPTION 'activity_log is append-only; only is_reverted/reverted_at may change';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_log_immutable_guard ON public.activity_log;
CREATE TRIGGER activity_log_immutable_guard
  BEFORE UPDATE ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION public.activity_log_immutable_guard();
