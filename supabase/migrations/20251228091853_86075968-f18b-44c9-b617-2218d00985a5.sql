-- Create storage bucket for university logos/images
INSERT INTO storage.buckets (id, name, public)
VALUES ('university-images', 'university-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the university-images bucket
-- Allow anyone to view university images (public bucket)
CREATE POLICY "University images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'university-images');

-- Allow admins to upload university images
CREATE POLICY "Admins can upload university images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'university-images' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update university images
CREATE POLICY "Admins can update university images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'university-images' 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete university images
CREATE POLICY "Admins can delete university images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'university-images' 
  AND public.has_role(auth.uid(), 'admin')
);