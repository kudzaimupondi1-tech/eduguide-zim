
INSERT INTO programs (name, university_id, entry_type, condition_logic, faculty, degree_type, is_active, structured_requirements)
VALUES (
  'TEST - BSc Health Informatics (Diploma Entry)',
  '11111111-1111-1111-1111-111111111111',
  'special',
  'AND',
  'Faculty of Health Sciences',
  'BSc',
  true,
  '[
    {
      "qualification_type": "A-Level",
      "min_passes": 2,
      "min_grade": "C",
      "compulsory_subjects": ["Mathematics"],
      "subject_groups": []
    },
    {
      "qualification_type": "Diploma",
      "min_passes": 0,
      "min_grade": "Pass",
      "compulsory_subjects": [],
      "subject_groups": []
    }
  ]'::jsonb
);
