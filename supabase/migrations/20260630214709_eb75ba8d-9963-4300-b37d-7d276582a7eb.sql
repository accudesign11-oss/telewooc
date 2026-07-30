
-- Storage RLS for branding-assets bucket (per-user prefix)
CREATE POLICY "branding_assets_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'branding-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "branding_assets_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "branding_assets_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "branding_assets_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
