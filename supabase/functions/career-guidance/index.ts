import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { subjects, grades } = await req.json();
    console.log("Received request for career guidance:", { subjects, grades });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get Supabase client to fetch careers data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch available careers from database
    const { data: careers, error: careersError } = await supabase
      .from('careers')
      .select('*')
      .eq('is_active', true);

    if (careersError) {
      console.error("Error fetching careers:", careersError);
      throw new Error("Failed to fetch careers data");
    }

    console.log(`Found ${careers?.length || 0} careers in database`);

    // Format subjects and grades for the prompt
    const subjectList = subjects.map((s: any, i: number) => 
      `${s.name} (${s.level}): ${grades[i] || 'No grade'}`
    ).join('\n');

    const careersList = careers?.map((c: any) => 
      `- ${c.name}: ${c.description || 'No description'}. Field: ${c.field || 'General'}. Skills: ${c.skills_required?.join(', ') || 'Various'}`
    ).join('\n') || 'No careers available';

    const systemPrompt = `You are an expert Zimbabwean academic career counselor. Your role is to provide personalized career guidance to students based on their ZIMSEC subjects and grades. 

You MUST only recommend careers that exist in Zimbabwe and are realistic for the student's academic profile. Be encouraging but realistic.

Available careers in our database:
${careersList}

Guidelines:
1. Match student subjects to relevant careers
2. Consider grade performance when making recommendations
3. Explain why each career is suitable
4. Suggest required university programs in Zimbabwe
5. Provide practical steps to pursue each career
6. Be culturally relevant to Zimbabwe`;

    const userPrompt = `Based on the following student's subjects and grades, provide personalized career recommendations:

Student's Subjects and Grades:
${subjectList}

Please provide:
1. Top 3-5 recommended careers that match their subjects
2. For each career:
   - Why it's a good fit based on their subjects
   - Required university degree/program
   - Zimbabwean universities offering this program
   - Expected salary range in Zimbabwe
   - Key skills they should develop
3. Additional subjects they might consider for better career prospects
4. General advice for their academic journey

Format your response in a clear, structured way that's easy to read.`;

    console.log("Calling AI Gateway for career guidance...");

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
        max_tokens: 2000
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

    console.log("Career guidance generated successfully");

    return new Response(JSON.stringify({ guidance, careers: careers?.slice(0, 5) }), {
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
