/*
# Create documents storage bucket

1. Storage
- Create a public storage bucket named `documents` for file uploads.
- This bucket is used by the Documents page to store uploaded files.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to the documents bucket
DROP POLICY IF EXISTS "authenticated_upload_documents" ON storage.objects;
CREATE POLICY "authenticated_upload_documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read from the documents bucket
DROP POLICY IF EXISTS "authenticated_read_documents" ON storage.objects;
CREATE POLICY "authenticated_read_documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete from the documents bucket
DROP POLICY IF EXISTS "authenticated_delete_documents" ON storage.objects;
CREATE POLICY "authenticated_delete_documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to update files in the documents bucket
DROP POLICY IF EXISTS "authenticated_update_documents" ON storage.objects;
CREATE POLICY "authenticated_update_documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');
