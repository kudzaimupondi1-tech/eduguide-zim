
-- Create favourite_programs table for star system
CREATE TABLE public.favourite_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  university_name text,
  program_name text,
  match_percentage integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, program_id)
);

ALTER TABLE public.favourite_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favourites" ON public.favourite_programs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favourites" ON public.favourite_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favourites" ON public.favourite_programs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all favourites" ON public.favourite_programs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add level and refund columns to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS student_level text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_status text DEFAULT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refund_notes text DEFAULT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refunded_at timestamptz DEFAULT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS refunded_by uuid DEFAULT NULL;
