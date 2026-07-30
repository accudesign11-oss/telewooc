CREATE POLICY "Users can read own social media files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own social media files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own social media files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own social media files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'social-media' AND (storage.foldername(name))[1] = auth.uid()::text);