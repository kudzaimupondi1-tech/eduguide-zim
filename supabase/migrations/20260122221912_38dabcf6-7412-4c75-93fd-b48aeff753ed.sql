-- Create table for storing multiple university images and their extracted information
CREATE TABLE public.university_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  extracted_info JSONB,
  image_type TEXT DEFAULT 'general',
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add columns to universities table for extracted/additional info
ALTER TABLE public.universities 
ADD COLUMN IF NOT EXISTS short_name TEXT,
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS programs_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS faculties JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS admission_requirements JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS accreditation TEXT,
ADD COLUMN IF NOT EXISTS established_year INTEGER;

-- Enable RLS on university_images
ALTER TABLE public.university_images ENABLE ROW LEVEL SECURITY;

-- Public can view images
CREATE POLICY "Anyone can view university images"
  ON public.university_images FOR SELECT
  USING (true);

-- Admins can manage images
CREATE POLICY "Admins can insert university images"
  ON public.university_images FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update university images"
  ON public.university_images FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete university images"
  ON public.university_images FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at using the correct function name
CREATE TRIGGER update_university_images_updated_at
  BEFORE UPDATE ON public.university_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_university_images_university_id ON public.university_images(university_id);