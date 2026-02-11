
-- Ratings table for student likes/dislikes
CREATE TABLE public.system_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  rating_type text NOT NULL CHECK (rating_type IN ('like', 'dislike')),
  feedback text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own ratings" ON public.system_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can view own ratings" ON public.system_ratings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can update own ratings" ON public.system_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings" ON public.system_ratings
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Add entry_type column to programs for Normal/Special/Diploma entry
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'normal';

-- Add structured entry requirements as JSONB
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS structured_requirements jsonb DEFAULT '[]'::jsonb;

-- Add condition_logic to programs (AND/OR)
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS condition_logic text DEFAULT 'AND';

-- Track last activity for idle account removal
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now();

-- Unique constraint on ratings per user (one rating per user)
CREATE UNIQUE INDEX idx_system_ratings_user ON public.system_ratings (user_id);
