-- Create table for subject combinations (valid A-Level sets)
CREATE TABLE public.subject_combinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL DEFAULT 'A-Level',
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  career_paths TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for grading structures
CREATE TABLE public.grading_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  grades JSONB NOT NULL DEFAULT '[]'::jsonb,
  pass_threshold TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for deadlines (exams and applications)
CREATE TABLE public.deadlines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  deadline_type TEXT NOT NULL DEFAULT 'exam',
  deadline_date TIMESTAMP WITH TIME ZONE NOT NULL,
  university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
  level TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for announcements
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  target_audience TEXT DEFAULT 'all',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI configuration
CREATE TABLE public.ai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for system settings
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  category TEXT DEFAULT 'general',
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for analytics logs
CREATE TABLE public.analytics_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB,
  user_id UUID,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for student notifications
CREATE TABLE public.student_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.subject_combinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subject_combinations
CREATE POLICY "Admins can manage subject combinations" ON public.subject_combinations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view subject combinations" ON public.subject_combinations FOR SELECT USING (true);

-- RLS Policies for grading_structures
CREATE POLICY "Admins can manage grading structures" ON public.grading_structures FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view grading structures" ON public.grading_structures FOR SELECT USING (true);

-- RLS Policies for deadlines
CREATE POLICY "Admins can manage deadlines" ON public.deadlines FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view deadlines" ON public.deadlines FOR SELECT USING (is_active = true);

-- RLS Policies for announcements
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view published announcements" ON public.announcements FOR SELECT USING (is_published = true AND (expires_at IS NULL OR expires_at > now()));

-- RLS Policies for ai_config
CREATE POLICY "Admins can manage AI config" ON public.ai_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view AI config" ON public.ai_config FOR SELECT USING (true);

-- RLS Policies for system_settings
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for analytics_logs
CREATE POLICY "Admins can view analytics" ON public.analytics_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert analytics" ON public.analytics_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for student_notifications
CREATE POLICY "Users can view own notifications" ON public.student_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.student_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all notifications" ON public.student_notifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_subject_combinations_updated_at BEFORE UPDATE ON public.subject_combinations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deadlines_updated_at BEFORE UPDATE ON public.deadlines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_config_updated_at BEFORE UPDATE ON public.ai_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default AI configuration
INSERT INTO public.ai_config (config_key, config_value, description) VALUES
('recommendation_weights', '{"grades": 0.4, "subject_match": 0.35, "interests": 0.25}', 'Weights for AI recommendation scoring'),
('combination_rules', '{"min_subjects": 3, "max_subjects": 4, "require_pass": true}', 'Rules for A-Level subject combinations'),
('matching_threshold', '{"minimum_match": 0.5, "high_match": 0.8}', 'Threshold percentages for program matching');

-- Insert default grading structures
INSERT INTO public.grading_structures (name, level, grades, pass_threshold) VALUES
('ZIMSEC O-Level', 'O-Level', '[{"grade": "A", "points": 1, "description": "Excellent"}, {"grade": "B", "points": 2, "description": "Very Good"}, {"grade": "C", "points": 3, "description": "Good"}, {"grade": "D", "points": 4, "description": "Satisfactory"}, {"grade": "E", "points": 5, "description": "Weak Pass"}, {"grade": "U", "points": 9, "description": "Ungraded"}]', 'E'),
('ZIMSEC A-Level', 'A-Level', '[{"grade": "A", "points": 1, "description": "Excellent"}, {"grade": "B", "points": 2, "description": "Very Good"}, {"grade": "C", "points": 3, "description": "Good"}, {"grade": "D", "points": 4, "description": "Satisfactory"}, {"grade": "E", "points": 5, "description": "Pass"}, {"grade": "O", "points": 6, "description": "Subsidiary Pass"}, {"grade": "F", "points": 9, "description": "Fail"}]', 'E');

-- Insert sample subject combinations
INSERT INTO public.subject_combinations (name, description, level, subjects, career_paths) VALUES
('Sciences', 'Core science combination for medical, engineering, and technology careers', 'A-Level', '["Mathematics", "Physics", "Chemistry"]', ARRAY['Medicine', 'Engineering', 'Pharmacy', 'Technology']),
('Commercial', 'Business-focused combination for commerce and finance careers', 'A-Level', '["Accounting", "Economics", "Business Studies"]', ARRAY['Accounting', 'Banking', 'Business Management', 'Economics']),
('Arts', 'Humanities combination for law, education, and social sciences', 'A-Level', '["English Literature", "History", "Divinity"]', ARRAY['Law', 'Teaching', 'Journalism', 'Social Work']),
('Bio-Sciences', 'Biology-focused combination for health and agricultural sciences', 'A-Level', '["Biology", "Chemistry", "Mathematics"]', ARRAY['Medicine', 'Nursing', 'Agriculture', 'Veterinary Science']);