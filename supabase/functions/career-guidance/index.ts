import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { subjects, grades, studentLevel, interests } = await req.json();
    console.log("Received request:", { subjects, grades, studentLevel, interests });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch careers, subjects, universities, and programs
    const [careersRes, allSubjectsRes, universitiesRes, programsRes] = await Promise.all([
      supabase.from('careers').select('*').eq('is_active', true),
      supabase.from('subjects').select('*').eq('is_active', true),
      supabase.from('universities').select('*').eq('is_active', true),
      supabase.from('programs').select(`
        *,
        universities (name, short_name, location),
        program_subjects (
          subject_id,
          minimum_grade,
          is_required,
          subjects (name, level)
        )
      `).eq('is_active', true)
    ]);

    const careers = careersRes.data || [];
    const allSubjects = allSubjectsRes.data || [];
    const universities = universitiesRes.data || [];
    const programs = programsRes.data || [];

    // Determine student level from their subjects
    const hasOLevel = subjects.some((s: any) => s.level?.toLowerCase().includes('o-level'));
    const hasALevel = subjects.some((s: any) => s.level?.toLowerCase().includes('a-level'));
    const effectiveLevel = studentLevel || (hasALevel ? 'A-Level' : 'O-Level');

    console.log(`Student level: ${effectiveLevel}, O-Level: ${hasOLevel}, A-Level: ${hasALevel}`);

    // Format subjects and grades
    const subjectList = subjects.map((s: any, i: number) => 
      `${s.name} (${s.level}): ${grades[i] || 'No grade'}`
    ).join('\n');

    // Get A-Level subjects for O-Level students
    const aLevelSubjects = allSubjects.filter(s => s.level === 'A-Level');
    const aLevelSubjectsList = aLevelSubjects.map(s => 
      `- ${s.name} (${s.category || 'General'})`
    ).join('\n');

    // Format programs with their requirements for A-Level students
    const programsList = programs.map((p: any) => {
      const reqSubjects = p.program_subjects?.filter((ps: any) => ps.is_required)
        .map((ps: any) => `${ps.subjects?.name} (min: ${ps.minimum_grade || 'C'})`).join(', ') || 'Various';
      return `- ${p.name} at ${p.universities?.name || 'Unknown'} (${p.degree_type || 'Degree'}): Requires ${reqSubjects}`;
    }).join('\n');

    const careersList = careers.map((c: any) => 
      `- ${c.name}: ${c.description || 'No description'}. Field: ${c.field || 'General'}`
    ).join('\n');

    const universitiesList = universities.map((u: any) => 
      `- ${u.name} (${u.short_name || ''}) - ${u.location || 'Zimbabwe'}, ${u.type || 'University'}`
    ).join('\n');

    let systemPrompt: string;
    let userPrompt: string;

    if (effectiveLevel === 'O-Level') {
      // O-Level student: Recommend A-Level subject combinations
      systemPrompt = `You are an expert Zimbabwean academic counselor specializing in ZIMSEC curriculum. Your role is to recommend the BEST A-Level subject combinations (3 subjects) based on the student's O-Level results and interests.

CRITICAL RULES:
1. ONLY recommend A-Level subjects that exist in Zimbabwe's ZIMSEC curriculum
2. Recommend EXACTLY 3 subjects per combination (standard A-Level requirement)
3. Ensure subjects are compatible and lead to clear career paths
4. Consider the student's O-Level grades when recommending

Available A-Level Subjects in Zimbabwe:
${aLevelSubjectsList}

Available Careers in Zimbabwe:
${careersList}

Standard A-Level Combinations in Zimbabwe:
- Sciences: Mathematics, Physics, Chemistry (for Engineering, Medicine)
- Commercial: Accounting, Economics, Business Studies (for Commerce, Finance)
- Arts: Literature, History, Divinity (for Law, Teaching)
- Applied Sciences: Biology, Chemistry, Mathematics (for Medicine, Pharmacy)`;

      userPrompt = `Based on this O-Level student's results and interests, recommend the BEST A-Level subject combinations:

Student's O-Level Subjects and Grades:
${subjectList}

${interests ? `Student's Interests: ${interests}` : ''}

Please provide:
1. TOP 3-5 RECOMMENDED A-LEVEL COMBINATIONS (exactly 3 subjects each)
   For each combination:
   - The 3 subjects
   - Why this combination suits their O-Level performance
   - Careers this combination leads to
   - Universities offering programs for this path

2. ANALYSIS of their O-Level performance:
   - Strengths based on grades
   - Areas that need improvement
   - Which A-Level paths they're best suited for

3. SUBJECT-SPECIFIC ADVICE:
   - Which subjects they should definitely include based on grades
   - Subjects to avoid if certain O-Level grades are weak

Format clearly with headers and bullet points.`;

    } else {
      // A-Level student: Match to universities and programs
      systemPrompt = `You are an expert Zimbabwean university admissions counselor. Your role is to match A-Level students to ALL universities and programs they qualify for based on their subjects and grades.

CRITICAL RULES:
1. ONLY recommend Zimbabwean universities
2. Match programs based on subject requirements
3. Consider minimum grade requirements
4. List ALL qualifying programs at EACH university

Universities in Zimbabwe:
${universitiesList}

Available Programs with Requirements:
${programsList}

Available Careers:
${careersList}`;

      userPrompt = `Based on this A-Level student's results, identify ALL universities and programs they qualify for:

Student's A-Level Subjects and Grades:
${subjectList}

Please provide a COMPREHENSIVE analysis:

1. UNIVERSITY MATCHING - For EACH Zimbabwean university:
   List the university name, then ALL programs the student qualifies for at that university based on their subjects.
   Format:
   ### [University Name]
   - Program 1: [Entry requirements match analysis]
   - Program 2: [Entry requirements match analysis]
   
2. TOP RECOMMENDED PROGRAMS (ranked by match quality):
   - Program name and university
   - Why it's a good match
   - Career outcomes
   - Estimated admission chances (High/Medium/Low)

3. CAREER PATHWAYS:
   Based on qualifying programs, list potential careers with:
   - Expected salary range in Zimbabwe
   - Job market outlook
   - Required additional qualifications

4. IMPROVEMENT SUGGESTIONS:
   - If grades could be better, what to focus on
   - Alternative pathways if preferred programs are competitive

Be thorough - list EVERY program at EVERY university the student can potentially apply to.`;
    }

    console.log(`Calling AI for ${effectiveLevel} guidance...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    const guidance = data.choices?.[0]?.message?.content;

    // Calculate program matches for A-Level students
    let matchedPrograms: any[] = [];
    if (effectiveLevel === 'A-Level' && subjects.length > 0) {
      const studentSubjectNames = subjects.map((s: any) => s.name.toLowerCase());
      
      matchedPrograms = programs.map((program: any) => {
        const reqSubjects = program.program_subjects?.filter((ps: any) => ps.is_required) || [];
        const matchedReqs = reqSubjects.filter((ps: any) => 
          studentSubjectNames.includes(ps.subjects?.name?.toLowerCase())
        );
        
        const matchPercentage = reqSubjects.length > 0 
          ? Math.round((matchedReqs.length / reqSubjects.length) * 100)
          : 50; // Default if no specific requirements
        
        return {
          ...program,
          matchPercentage,
          matchedSubjects: matchedReqs.length,
          totalRequired: reqSubjects.length
        };
      }).filter((p: any) => p.matchPercentage >= 50)
        .sort((a: any, b: any) => b.matchPercentage - a.matchPercentage);
    }

    // Get recommended A-Level combinations for O-Level students
    let recommendedCombinations: any[] = [];
    if (effectiveLevel === 'O-Level') {
      // Pre-defined common combinations
      const commonCombinations = [
        { subjects: ['Mathematics', 'Physics', 'Chemistry'], path: 'Sciences', careers: ['Engineering', 'Medicine', 'Architecture'] },
        { subjects: ['Mathematics', 'Accounting', 'Economics'], path: 'Commercial', careers: ['Accounting', 'Banking', 'Business Management'] },
        { subjects: ['Biology', 'Chemistry', 'Mathematics'], path: 'Applied Sciences', careers: ['Medicine', 'Pharmacy', 'Nursing'] },
        { subjects: ['Literature', 'History', 'Divinity'], path: 'Arts', careers: ['Law', 'Teaching', 'Journalism'] },
        { subjects: ['Computer Science', 'Mathematics', 'Physics'], path: 'Technology', careers: ['Software Development', 'IT', 'Data Science'] },
      ];
      
      recommendedCombinations = commonCombinations.map((combo, idx) => ({
        id: `combo-${idx}`,
        ...combo,
        aLevelSubjects: combo.subjects.map(name => 
          aLevelSubjects.find(s => s.name.toLowerCase().includes(name.toLowerCase()))
        ).filter(Boolean)
      }));
    }

    console.log(`Guidance generated for ${effectiveLevel} student`);

    return new Response(JSON.stringify({ 
      guidance, 
      careers: careers.slice(0, 5),
      programs: matchedPrograms.slice(0, 20),
      universities,
      combinations: recommendedCombinations,
      studentLevel: effectiveLevel
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Career guidance error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to generate career guidance" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
