
UPDATE subjects SET category = 'Sciences' WHERE category IN ('Sciences', 'Agriculture', 'Practical', 'Technical & Vocational');
UPDATE subjects SET category = 'Arts' WHERE category IN ('Arts', 'Arts & Humanities', 'Humanities', 'Languages');
UPDATE subjects SET category = 'Commercials' WHERE category IN ('Business', 'Commercials');
UPDATE subjects SET category = 'Sciences' WHERE category IS NULL OR category NOT IN ('Sciences', 'Arts', 'Commercials');
