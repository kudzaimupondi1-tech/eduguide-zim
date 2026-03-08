ALTER TABLE public.system_ratings ADD COLUMN IF NOT EXISTS star_rating integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS recommendation_viewed_at timestamp with time zone;