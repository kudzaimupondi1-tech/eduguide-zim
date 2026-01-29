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
    const { messages } = await req.json();
    console.log("Received chatbot request with", messages?.length, "messages");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get Supabase client to fetch context data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch universities for context
    const { data: universities } = await supabase
      .from('universities')
      .select('name, short_name, location, type, description')
      .eq('is_active', true)
      .limit(20);

    // Fetch subjects for context
    const { data: subjects } = await supabase
      .from('subjects')
      .select('name, level, category')
      .eq('is_active', true)
      .limit(50);

    // Fetch careers for context
    const { data: careers } = await supabase
      .from('careers')
      .select('name, field, description')
      .eq('is_active', true)
      .limit(30);

    const universityList = universities?.map(u => `${u.name} (${u.short_name || u.type}) - ${u.location || 'Zimbabwe'}`).join('\n') || 'Various universities available';
    const subjectList = subjects?.map(s => `${s.name} (${s.level})`).join(', ') || 'Various subjects';
    const careerList = careers?.map(c => `${c.name} - ${c.field || 'General'}`).join('\n') || 'Various careers';

    const systemPrompt = `You are EduGuide Assistant, a friendly and knowledgeable academic guidance chatbot for Zimbabwean students. You help students with:

1. **Subject Selection**: Guide O-Level and A-Level subject choices based on ZIMSEC curriculum
2. **University Information**: Provide details about Zimbabwean universities, programs, and entry requirements
3. **Career Guidance**: Help students understand career paths and requirements
4. **Study Tips**: Offer study strategies and exam preparation advice
5. **Application Process**: Explain university application procedures in Zimbabwe

**Available Universities in our system:**
${universityList}

**Available Subjects:**
${subjectList}

**Available Career Paths:**
${careerList}

**Guidelines:**
- Be warm, encouraging, and supportive
- Use simple, student-friendly English
- Only recommend Zimbabwean universities and ZIMSEC subjects
- Provide accurate, realistic information
- If you don't know something specific, suggest they check with their school or the university directly
- Keep responses concise but helpful
- Use bullet points and formatting for clarity

Remember: You are here to guide and support students in their academic journey in Zimbabwe!`;

    console.log("Calling AI Gateway for chatbot response...");

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
          ...messages
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 1000
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
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Failed to get AI response");
    }

    console.log("Streaming chatbot response...");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to get response" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
