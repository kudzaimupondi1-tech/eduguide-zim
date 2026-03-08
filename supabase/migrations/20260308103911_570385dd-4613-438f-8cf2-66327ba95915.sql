
CREATE TABLE public.student_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.student_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own queries" ON public.student_queries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Students can view own queries" ON public.student_queries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all queries" ON public.student_queries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update queries" ON public.student_queries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
