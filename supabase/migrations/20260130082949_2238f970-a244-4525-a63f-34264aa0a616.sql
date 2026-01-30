-- Add admin role to Kudzai's account
INSERT INTO public.user_roles (user_id, role)
VALUES ('76d637fc-1766-4d99-85ec-56cc90ad0f13', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add comprehensive careers data
INSERT INTO public.careers (name, field, description, salary_range, job_outlook, skills_required) VALUES
-- Healthcare
('Medical Doctor', 'Healthcare', 'Diagnose and treat patients, prescribe medications, and perform medical procedures. Requires extensive training and licensing.', '$800-$3000/month', 'High demand in Zimbabwe', ARRAY['Clinical skills', 'Communication', 'Problem-solving', 'Empathy', 'Attention to detail']),
('Nurse', 'Healthcare', 'Provide patient care, administer medications, and assist doctors in medical procedures.', '$400-$1200/month', 'Very high demand', ARRAY['Patient care', 'Medical knowledge', 'Communication', 'Compassion', 'Stress management']),
('Pharmacist', 'Healthcare', 'Dispense medications, provide drug information, and ensure safe medication use.', '$600-$1500/month', 'Stable demand', ARRAY['Pharmaceutical knowledge', 'Attention to detail', 'Customer service', 'Chemistry', 'Record keeping']),
('Dentist', 'Healthcare', 'Diagnose and treat dental issues, perform oral surgery, and promote oral health.', '$700-$2000/month', 'Growing demand', ARRAY['Dental procedures', 'Patient care', 'Manual dexterity', 'Communication', 'Diagnosis']),
('Physiotherapist', 'Healthcare', 'Help patients recover movement and manage pain through physical therapy.', '$500-$1200/month', 'Growing demand', ARRAY['Physical therapy', 'Anatomy knowledge', 'Patient assessment', 'Exercise prescription', 'Rehabilitation']),

-- Engineering
('Civil Engineer', 'Engineering', 'Design and oversee construction of infrastructure like roads, bridges, and buildings.', '$600-$2000/month', 'High demand for infrastructure', ARRAY['Structural analysis', 'AutoCAD', 'Project management', 'Mathematics', 'Problem-solving']),
('Electrical Engineer', 'Engineering', 'Design, develop, and maintain electrical systems and equipment.', '$600-$1800/month', 'Stable demand', ARRAY['Circuit design', 'Power systems', 'Electronics', 'Problem-solving', 'Technical drawing']),
('Mechanical Engineer', 'Engineering', 'Design and develop mechanical systems, machines, and tools.', '$600-$1800/month', 'Stable demand', ARRAY['Machine design', 'Thermodynamics', 'CAD software', 'Manufacturing', 'Problem-solving']),
('Mining Engineer', 'Engineering', 'Plan and manage mining operations, ensuring safety and efficiency.', '$800-$2500/month', 'High demand in Zimbabwe', ARRAY['Mining operations', 'Geology', 'Safety management', 'Equipment operation', 'Environmental awareness']),
('Chemical Engineer', 'Engineering', 'Design processes for chemical manufacturing and related industries.', '$600-$1800/month', 'Moderate demand', ARRAY['Chemical processes', 'Process design', 'Laboratory skills', 'Safety protocols', 'Quality control']),

-- Technology
('Software Developer', 'Technology', 'Design, code, and maintain software applications and systems.', '$500-$2000/month', 'Very high demand', ARRAY['Programming', 'Problem-solving', 'Software design', 'Testing', 'Version control']),
('Data Scientist', 'Technology', 'Analyze complex data to help organizations make informed decisions.', '$600-$2000/month', 'Growing rapidly', ARRAY['Python/R', 'Machine learning', 'Statistics', 'Data visualization', 'SQL']),
('Cybersecurity Analyst', 'Technology', 'Protect computer systems and networks from security threats.', '$600-$1800/month', 'High demand', ARRAY['Network security', 'Threat analysis', 'Ethical hacking', 'Risk assessment', 'Security tools']),
('Network Administrator', 'Technology', 'Manage and maintain computer networks and infrastructure.', '$400-$1200/month', 'Stable demand', ARRAY['Network configuration', 'Troubleshooting', 'Server management', 'Security', 'Documentation']),
('IT Support Specialist', 'Technology', 'Provide technical support and troubleshoot computer issues.', '$300-$800/month', 'Stable demand', ARRAY['Technical support', 'Hardware knowledge', 'Software troubleshooting', 'Customer service', 'Documentation']),

-- Business & Finance
('Accountant', 'Business & Finance', 'Prepare and examine financial records, ensure accuracy and compliance.', '$400-$1500/month', 'High demand', ARRAY['Financial accounting', 'Tax preparation', 'Auditing', 'Excel', 'Attention to detail']),
('Financial Analyst', 'Business & Finance', 'Analyze financial data to guide business investment decisions.', '$500-$1500/month', 'Growing demand', ARRAY['Financial modeling', 'Data analysis', 'Excel', 'Report writing', 'Market research']),
('Bank Manager', 'Business & Finance', 'Oversee bank operations, manage staff, and ensure customer satisfaction.', '$800-$2000/month', 'Stable demand', ARRAY['Banking operations', 'Leadership', 'Customer service', 'Risk management', 'Sales']),
('Marketing Manager', 'Business & Finance', 'Develop and implement marketing strategies to promote products or services.', '$500-$1500/month', 'Growing demand', ARRAY['Marketing strategy', 'Digital marketing', 'Brand management', 'Analytics', 'Communication']),
('Human Resources Manager', 'Business & Finance', 'Manage recruitment, employee relations, and organizational development.', '$500-$1500/month', 'Stable demand', ARRAY['Recruitment', 'Employee relations', 'Labor law', 'Training', 'Conflict resolution']),

-- Education
('Secondary School Teacher', 'Education', 'Teach students at O-Level and A-Level, prepare lesson plans, and assess student progress.', '$300-$800/month', 'High demand', ARRAY['Subject expertise', 'Lesson planning', 'Classroom management', 'Assessment', 'Communication']),
('University Lecturer', 'Education', 'Teach undergraduate and postgraduate students, conduct research.', '$600-$1500/month', 'Stable demand', ARRAY['Research skills', 'Teaching', 'Subject expertise', 'Publication', 'Mentoring']),
('Education Administrator', 'Education', 'Manage educational institutions, oversee curriculum and staff.', '$500-$1200/month', 'Stable demand', ARRAY['Leadership', 'Administration', 'Policy development', 'Budgeting', 'Communication']),

-- Law & Justice
('Lawyer', 'Law & Justice', 'Represent clients in legal matters, provide legal advice, and argue cases in court.', '$600-$2500/month', 'Stable demand', ARRAY['Legal research', 'Advocacy', 'Negotiation', 'Writing', 'Analysis']),
('Magistrate', 'Law & Justice', 'Preside over court proceedings and make legal decisions in lower courts.', '$800-$2000/month', 'Limited positions', ARRAY['Legal knowledge', 'Decision-making', 'Impartiality', 'Communication', 'Analysis']),
('Legal Secretary', 'Law & Justice', 'Provide administrative support to lawyers and legal professionals.', '$300-$700/month', 'Stable demand', ARRAY['Legal terminology', 'Document preparation', 'Organization', 'Communication', 'Confidentiality']),

-- Agriculture
('Agricultural Officer', 'Agriculture', 'Advise farmers on best practices, manage agricultural programs.', '$400-$1000/month', 'High demand in Zimbabwe', ARRAY['Crop science', 'Animal husbandry', 'Extension services', 'Research', 'Communication']),
('Veterinarian', 'Agriculture', 'Diagnose and treat animal diseases, ensure animal welfare.', '$500-$1500/month', 'Growing demand', ARRAY['Animal medicine', 'Surgery', 'Diagnosis', 'Farm management', 'Disease prevention']),
('Agricultural Economist', 'Agriculture', 'Analyze agricultural markets and advise on farming investments.', '$500-$1200/month', 'Moderate demand', ARRAY['Economics', 'Market analysis', 'Statistics', 'Policy analysis', 'Report writing']),

-- Media & Communication
('Journalist', 'Media & Communication', 'Research and report news stories for print, broadcast, or online media.', '$300-$1000/month', 'Competitive field', ARRAY['Writing', 'Research', 'Interviewing', 'Ethics', 'Multimedia skills']),
('Public Relations Officer', 'Media & Communication', 'Manage public image and communications for organizations.', '$400-$1200/month', 'Growing demand', ARRAY['Communication', 'Media relations', 'Writing', 'Crisis management', 'Social media']),
('Graphic Designer', 'Media & Communication', 'Create visual content for print and digital media.', '$300-$1000/month', 'Growing demand', ARRAY['Adobe Creative Suite', 'Typography', 'Branding', 'Creativity', 'Communication']),

-- Science & Research
('Research Scientist', 'Science & Research', 'Conduct scientific research to advance knowledge in various fields.', '$500-$1500/month', 'Limited but growing', ARRAY['Research methodology', 'Laboratory skills', 'Data analysis', 'Scientific writing', 'Critical thinking']),
('Environmental Scientist', 'Science & Research', 'Study environmental issues and develop solutions for sustainability.', '$500-$1200/month', 'Growing demand', ARRAY['Environmental assessment', 'Data collection', 'Policy analysis', 'GIS', 'Report writing']),
('Laboratory Technician', 'Science & Research', 'Perform laboratory tests and maintain lab equipment.', '$300-$800/month', 'Stable demand', ARRAY['Laboratory techniques', 'Sample analysis', 'Equipment maintenance', 'Safety protocols', 'Documentation']),

-- Construction & Trades
('Architect', 'Construction', 'Design buildings and oversee construction projects.', '$600-$2000/month', 'Growing demand', ARRAY['Architectural design', 'AutoCAD', 'Project management', 'Building codes', 'Creativity']),
('Quantity Surveyor', 'Construction', 'Estimate and manage construction costs for building projects.', '$500-$1500/month', 'High demand', ARRAY['Cost estimation', 'Contract management', 'Measurement', 'Negotiation', 'Project management']),
('Electrician', 'Construction', 'Install and maintain electrical systems in buildings.', '$300-$800/month', 'Stable demand', ARRAY['Electrical installation', 'Troubleshooting', 'Safety', 'Blueprint reading', 'Wiring']);
