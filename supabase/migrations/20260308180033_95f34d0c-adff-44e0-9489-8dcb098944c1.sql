
-- Create diplomas table to store all Zimbabwean diplomas
CREATE TABLE public.diplomas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  institution TEXT NULL,
  field TEXT NULL,
  level TEXT NOT NULL DEFAULT 'Diploma',
  duration_years INTEGER NULL DEFAULT 2,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diplomas ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view diplomas" ON public.diplomas FOR SELECT USING (true);
CREATE POLICY "Admins can manage diplomas" ON public.diplomas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Create program_diplomas junction table for linking required diplomas to programs
CREATE TABLE public.program_diplomas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  diploma_id UUID NOT NULL REFERENCES public.diplomas(id) ON DELETE CASCADE,
  is_required BOOLEAN NOT NULL DEFAULT true,
  minimum_classification TEXT NULL,
  UNIQUE(program_id, diploma_id)
);

ALTER TABLE public.program_diplomas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view program diplomas" ON public.program_diplomas FOR SELECT USING (true);
CREATE POLICY "Admins can manage program diplomas" ON public.program_diplomas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with comprehensive Zimbabwean diplomas
INSERT INTO public.diplomas (name, institution, field, level, duration_years, description) VALUES
-- Polytechnic/Technical College Diplomas
('National Diploma in Accounting', 'Polytechnics/Technical Colleges', 'Commerce', 'Diploma', 3, 'HEXCO accredited diploma in accounting and finance'),
('National Diploma in Marketing', 'Polytechnics/Technical Colleges', 'Commerce', 'Diploma', 3, 'HEXCO accredited diploma in marketing management'),
('National Diploma in Business Management', 'Polytechnics/Technical Colleges', 'Commerce', 'Diploma', 3, 'HEXCO accredited diploma in business management'),
('National Diploma in Human Resources Management', 'Polytechnics/Technical Colleges', 'Commerce', 'Diploma', 3, 'HEXCO accredited diploma in HR management'),
('National Diploma in Public Administration', 'Polytechnics/Technical Colleges', 'Commerce', 'Diploma', 3, 'HEXCO accredited diploma in public administration'),
('National Diploma in Secretarial Studies', 'Polytechnics/Technical Colleges', 'Commerce', 'Diploma', 3, 'HEXCO accredited diploma in secretarial and office management'),
('National Diploma in Information Technology', 'Polytechnics/Technical Colleges', 'Technology', 'Diploma', 3, 'HEXCO accredited diploma in IT'),
('National Diploma in Computer Science', 'Polytechnics/Technical Colleges', 'Technology', 'Diploma', 3, 'HEXCO accredited diploma in computer science'),
('National Diploma in Electronics', 'Polytechnics/Technical Colleges', 'Engineering', 'Diploma', 3, 'HEXCO accredited diploma in electronics engineering'),
('National Diploma in Electrical Engineering', 'Polytechnics/Technical Colleges', 'Engineering', 'Diploma', 3, 'HEXCO accredited diploma in electrical power engineering'),
('National Diploma in Mechanical Engineering', 'Polytechnics/Technical Colleges', 'Engineering', 'Diploma', 3, 'HEXCO accredited diploma in mechanical engineering'),
('National Diploma in Civil Engineering', 'Polytechnics/Technical Colleges', 'Engineering', 'Diploma', 3, 'HEXCO accredited diploma in civil engineering'),
('National Diploma in Chemical Technology', 'Polytechnics/Technical Colleges', 'Science', 'Diploma', 3, 'HEXCO accredited diploma in chemical technology'),
('National Diploma in Laboratory Technology', 'Polytechnics/Technical Colleges', 'Science', 'Diploma', 3, 'HEXCO accredited diploma in laboratory sciences'),
('National Diploma in Agriculture', 'Polytechnics/Technical Colleges', 'Agriculture', 'Diploma', 3, 'HEXCO accredited diploma in agriculture'),
('National Diploma in Automotive Engineering', 'Polytechnics/Technical Colleges', 'Engineering', 'Diploma', 3, 'HEXCO accredited diploma in automotive engineering'),
('National Diploma in Mining Engineering', 'Polytechnics/Technical Colleges', 'Engineering', 'Diploma', 3, 'HEXCO accredited diploma in mining'),
('National Diploma in Surveying', 'Polytechnics/Technical Colleges', 'Engineering', 'Diploma', 3, 'HEXCO accredited diploma in land surveying'),
('National Diploma in Mass Communication', 'Polytechnics/Technical Colleges', 'Arts', 'Diploma', 3, 'HEXCO accredited diploma in journalism and media'),
('National Diploma in Library and Information Science', 'Polytechnics/Technical Colleges', 'Arts', 'Diploma', 3, 'HEXCO accredited diploma in library science'),
('National Diploma in Tourism and Hospitality', 'Polytechnics/Technical Colleges', 'Commerce', 'Diploma', 3, 'HEXCO accredited diploma in tourism and hospitality management'),

-- Health-related Diplomas
('Diploma in General Nursing', 'Health Training Institutions', 'Health', 'Diploma', 3, 'Zimbabwe nursing council accredited diploma'),
('Diploma in Midwifery', 'Health Training Institutions', 'Health', 'Diploma', 1, 'Post-basic midwifery qualification'),
('Diploma in Pharmacy', 'Health Training Institutions', 'Health', 'Diploma', 3, 'Pharmacy technician diploma'),
('Diploma in Medical Laboratory Technology', 'Health Training Institutions', 'Health', 'Diploma', 3, 'Medical lab technology qualification'),
('Diploma in Environmental Health', 'Health Training Institutions', 'Health', 'Diploma', 3, 'Environmental health technician diploma'),
('Diploma in Radiography', 'Health Training Institutions', 'Health', 'Diploma', 3, 'Diagnostic radiography diploma'),
('Diploma in Dental Technology', 'Health Training Institutions', 'Health', 'Diploma', 3, 'Dental technology qualification'),
('Diploma in Rehabilitation Technology', 'Health Training Institutions', 'Health', 'Diploma', 3, 'Rehabilitation/physiotherapy technician diploma'),
('Diploma in Health Information', 'Health Training Institutions', 'Health', 'Diploma', 2, 'Health records and information management'),

-- Teachers College Diplomas
('Diploma in Education (Primary)', 'Teachers Colleges', 'Education', 'Diploma', 3, 'Primary school teacher training diploma'),
('Diploma in Education (Secondary)', 'Teachers Colleges', 'Education', 'Diploma', 3, 'Secondary school teacher training diploma'),
('Diploma in Education (Early Childhood)', 'Teachers Colleges', 'Education', 'Diploma', 3, 'ECD teacher training diploma'),
('Diploma in Special Needs Education', 'Teachers Colleges', 'Education', 'Diploma', 3, 'Special education teacher training diploma'),
('Diploma in Technical Education', 'Teachers Colleges', 'Education', 'Diploma', 3, 'Technical subject teacher training diploma'),

-- University Diplomas
('Diploma in Social Work', 'Universities', 'Social Sciences', 'Diploma', 2, 'University diploma in social work'),
('Diploma in Law', 'Universities', 'Law', 'Diploma', 2, 'University diploma in law/legal studies'),
('Diploma in Theology', 'Universities', 'Theology', 'Diploma', 2, 'University diploma in theological studies'),
('Diploma in Development Studies', 'Universities', 'Social Sciences', 'Diploma', 2, 'University diploma in development studies'),
('Diploma in Project Management', 'Universities', 'Commerce', 'Diploma', 2, 'University diploma in project management'),

-- Agriculture College Diplomas
('Diploma in Crop Production', 'Agricultural Colleges', 'Agriculture', 'Diploma', 3, 'Specialized diploma in crop science'),
('Diploma in Animal Production', 'Agricultural Colleges', 'Agriculture', 'Diploma', 3, 'Specialized diploma in animal husbandry'),
('Diploma in Agricultural Engineering', 'Agricultural Colleges', 'Agriculture', 'Diploma', 3, 'Agricultural mechanization and engineering'),
('Diploma in Forestry', 'Agricultural Colleges', 'Agriculture', 'Diploma', 3, 'Forestry management diploma'),
('Diploma in Wildlife Management', 'Agricultural Colleges', 'Agriculture', 'Diploma', 3, 'Wildlife and conservation management'),

-- National Certificate equivalents (higher level)
('Higher National Diploma in Accounting', 'Polytechnics', 'Commerce', 'Higher Diploma', 1, 'Post-diploma higher qualification in accounting'),
('Higher National Diploma in Marketing', 'Polytechnics', 'Commerce', 'Higher Diploma', 1, 'Post-diploma higher qualification in marketing'),
('Higher National Diploma in Electrical Engineering', 'Polytechnics', 'Engineering', 'Higher Diploma', 1, 'Post-diploma higher qualification in electrical engineering'),
('Higher National Diploma in Mechanical Engineering', 'Polytechnics', 'Engineering', 'Higher Diploma', 1, 'Post-diploma higher qualification in mechanical engineering'),
('Higher National Diploma in Civil Engineering', 'Polytechnics', 'Engineering', 'Higher Diploma', 1, 'Post-diploma higher qualification in civil engineering');
