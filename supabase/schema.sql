-- EduGuide Zimbabwe Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- ENUMS
-- ============================================

-- Education levels
CREATE TYPE public.education_level AS ENUM ('o_level', 'a_level');

-- Subject categories
CREATE TYPE public.subject_category AS ENUM ('sciences', 'commercials', 'arts_humanities', 'technical_vocational', 'agriculture');

-- University types
CREATE TYPE public.university_type AS ENUM ('public', 'private');

-- User roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Grade levels
CREATE TYPE public.grade_level AS ENUM ('A', 'B', 'C', 'D', 'E', 'U');

-- ============================================
-- TABLES
-- ============================================

-- Universities table
CREATE TABLE public.universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type university_type NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    website TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subjects table (O-Level and A-Level)
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    level education_level NOT NULL,
    category subject_category NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Careers table
CREATE TABLE public.careers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    industry TEXT NOT NULL,
    salary_range_min INTEGER,
    salary_range_max INTEGER,
    growth_outlook TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Programs (Degree programs) table
CREATE TABLE public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    faculty TEXT NOT NULL,
    description TEXT,
    duration_years INTEGER DEFAULT 4,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Program subject requirements (many-to-many with requirements)
CREATE TABLE public.program_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    minimum_grade grade_level NOT NULL DEFAULT 'C',
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(program_id, subject_id)
);

-- Program career outcomes (many-to-many)
CREATE TABLE public.program_careers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
    career_id UUID REFERENCES public.careers(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(program_id, career_id)
);

-- Subject to A-Level mapping (which O-Level subjects lead to which A-Level)
CREATE TABLE public.subject_progressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    o_level_subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    a_level_subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    is_recommended BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(o_level_subject_id, a_level_subject_id)
);

-- User profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    education_level education_level,
    is_premium BOOLEAN DEFAULT false,
    premium_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles (separate table for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Student subject selections
CREATE TABLE public.student_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    grade grade_level,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, subject_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_careers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_progressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECKING
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Universities: Everyone can read active, admins can manage all
CREATE POLICY "Anyone can view active universities"
ON public.universities FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage universities"
ON public.universities FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subjects: Everyone can read
CREATE POLICY "Anyone can view subjects"
ON public.subjects FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage subjects"
ON public.subjects FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Careers: Everyone can read
CREATE POLICY "Anyone can view careers"
ON public.careers FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage careers"
ON public.careers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Programs: Everyone can read active from active universities
CREATE POLICY "Anyone can view active programs"
ON public.programs FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage programs"
ON public.programs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Program subjects: Everyone can read
CREATE POLICY "Anyone can view program subjects"
ON public.program_subjects FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage program subjects"
ON public.program_subjects FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Program careers: Everyone can read
CREATE POLICY "Anyone can view program careers"
ON public.program_careers FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage program careers"
ON public.program_careers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Subject progressions: Everyone can read
CREATE POLICY "Anyone can view subject progressions"
ON public.subject_progressions FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage subject progressions"
ON public.subject_progressions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Profiles: Users can read/update their own
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- User roles: Only viewable by admins or self
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Student subjects: Users can manage their own
CREATE POLICY "Users can view own subjects"
ON public.student_subjects FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own subjects"
ON public.student_subjects FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
    
    -- Also create default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_universities_updated_at
    BEFORE UPDATE ON public.universities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_programs_updated_at
    BEFORE UPDATE ON public.programs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_programs_university ON public.programs(university_id);
CREATE INDEX idx_program_subjects_program ON public.program_subjects(program_id);
CREATE INDEX idx_program_subjects_subject ON public.program_subjects(subject_id);
CREATE INDEX idx_program_careers_program ON public.program_careers(program_id);
CREATE INDEX idx_program_careers_career ON public.program_careers(career_id);
CREATE INDEX idx_subjects_level ON public.subjects(level);
CREATE INDEX idx_subjects_category ON public.subjects(category);
CREATE INDEX idx_student_subjects_user ON public.student_subjects(user_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
