-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student', 'counselor');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create universities table
CREATE TABLE public.universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subjects table (O-Level and A-Level subjects)
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  level TEXT NOT NULL CHECK (level IN ('O-Level', 'A-Level', 'Both')),
  category TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create programs table (degree programs)
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  faculty TEXT,
  duration_years INTEGER DEFAULT 4,
  degree_type TEXT,
  description TEXT,
  entry_requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create careers table
CREATE TABLE public.careers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  field TEXT,
  description TEXT,
  salary_range TEXT,
  job_outlook TEXT,
  skills_required TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create program_subjects junction table (required subjects for programs)
CREATE TABLE public.program_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  is_required BOOLEAN DEFAULT true,
  minimum_grade TEXT,
  UNIQUE (program_id, subject_id)
);

-- Create program_careers junction table
CREATE TABLE public.program_careers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  career_id UUID REFERENCES public.careers(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (program_id, career_id)
);

-- Create student_subjects table (student's subject selections and grades)
CREATE TABLE public.student_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  grade TEXT,
  level TEXT NOT NULL CHECK (level IN ('O-Level', 'A-Level')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id, level)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_careers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_universities_updated_at
  BEFORE UPDATE ON public.universities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for universities (public read, admin write)
CREATE POLICY "Anyone can view universities" ON public.universities
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage universities" ON public.universities
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subjects (public read, admin write)
CREATE POLICY "Anyone can view subjects" ON public.subjects
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage subjects" ON public.subjects
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for programs (public read, admin write)
CREATE POLICY "Anyone can view programs" ON public.programs
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage programs" ON public.programs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for careers (public read, admin write)
CREATE POLICY "Anyone can view careers" ON public.careers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage careers" ON public.careers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for program_subjects (public read, admin write)
CREATE POLICY "Anyone can view program subjects" ON public.program_subjects
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage program subjects" ON public.program_subjects
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for program_careers (public read, admin write)
CREATE POLICY "Anyone can view program careers" ON public.program_careers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage program careers" ON public.program_careers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for student_subjects (own data only)
CREATE POLICY "Students can view own subjects" ON public.student_subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can insert own subjects" ON public.student_subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own subjects" ON public.student_subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Students can delete own subjects" ON public.student_subjects
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all student subjects" ON public.student_subjects
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_programs_university ON public.programs(university_id);
CREATE INDEX idx_program_subjects_program ON public.program_subjects(program_id);
CREATE INDEX idx_program_subjects_subject ON public.program_subjects(subject_id);
CREATE INDEX idx_program_careers_program ON public.program_careers(program_id);
CREATE INDEX idx_program_careers_career ON public.program_careers(career_id);
CREATE INDEX idx_student_subjects_user ON public.student_subjects(user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);