import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, extractionType } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";
    let toolDef: any = {};

    if (extractionType === "programs") {
      systemPrompt = `You are an expert at extracting degree programme information from Zimbabwean university documents/images. 
Extract ALL degree programmes visible in the image with their faculty, programme name, and entry requirements exactly as shown.
Return structured data for each programme found.`;
      userPrompt = `Analyze this university document image and extract ALL degree programmes. For each programme found, extract:
- faculty: The faculty/school name (e.g., "Business & Economic Sciences", "Communication and Information Science")
- name: The full degree programme name (e.g., "Bachelor of Commerce Honours Degree in Accounting")
- entry_requirements: The full entry requirements text exactly as shown
- degree_type: The degree type (Bachelor, Honours, Diploma, Certificate)

Return ALL programmes found in the image as an array.`;
      toolDef = {
        type: "function",
        function: {
          name: "extract_programs",
          description: "Extract degree programmes from university document image",
          parameters: {
            type: "object",
            properties: {
              university_name: { type: "string", description: "Name of the university if visible" },
              programs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    faculty: { type: "string", description: "Faculty or school name" },
                    name: { type: "string", description: "Full degree programme name" },
                    entry_requirements: { type: "string", description: "Full entry requirements text" },
                    degree_type: { type: "string", description: "Degree type (Bachelor, Honours, Diploma, Certificate)" },
                    duration_years: { type: "integer", description: "Duration in years if mentioned" }
                  },
                  required: ["name"]
                }
              }
            },
            required: ["programs"]
          }
        }
      };
    } else if (extractionType === "careers") {
      systemPrompt = `You are an expert at extracting career information from documents/images related to Zimbabwean education and employment.
Extract all career paths, job roles, or professional fields visible in the image.`;
      userPrompt = `Analyze this image and extract all career/job information. For each career found, extract:
- name: Career/job title
- field: The sector or field (e.g., Healthcare, Engineering, Finance)
- description: Brief description if available
- skills_required: Required skills as a list
- salary_range: Salary information if available
- job_outlook: Job market outlook if mentioned`;
      toolDef = {
        type: "function",
        function: {
          name: "extract_careers",
          description: "Extract career information from image",
          parameters: {
            type: "object",
            properties: {
              careers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    field: { type: "string" },
                    description: { type: "string" },
                    skills_required: { type: "array", items: { type: "string" } },
                    salary_range: { type: "string" },
                    job_outlook: { type: "string" }
                  },
                  required: ["name"]
                }
              }
            },
            required: ["careers"]
          }
        }
      };
    } else if (extractionType === "combinations") {
      systemPrompt = `You are an expert at extracting A-Level subject combination information from Zimbabwean education documents.
Extract all subject combinations visible in the image.`;
      userPrompt = `Analyze this image and extract all A-Level subject combinations. For each combination found, extract:
- name: Combination name (e.g., "Sciences", "Commercials")
- subjects: List of subjects in this combination
- career_paths: Related career paths if mentioned
- description: Any description provided`;
      toolDef = {
        type: "function",
        function: {
          name: "extract_combinations",
          description: "Extract subject combinations from image",
          parameters: {
            type: "object",
            properties: {
              combinations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    subjects: { type: "array", items: { type: "string" } },
                    career_paths: { type: "array", items: { type: "string" } },
                    description: { type: "string" }
                  },
                  required: ["name", "subjects"]
                }
              }
            },
            required: ["combinations"]
          }
        }
      };
    } else {
      // Default: university info extraction (original behavior)
      systemPrompt = `You are an expert at extracting structured information from university-related images. 
Analyze the image and extract relevant information about the university.`;
      userPrompt = `Please analyze this university image and extract all relevant information. Return a JSON object with the following structure: { name, shortName, location, description, faculties (array), programs (array), admissionRequirements (object), contactInfo (object with phone, email, address), fees (object), accreditation, establishedYear, importantDates (array), otherInfo }. Only include fields where you can extract actual information from the image.`;
      toolDef = {
        type: "function",
        function: {
          name: "extract_university_info",
          description: "Extract structured university information from the image",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              shortName: { type: "string" },
              location: { type: "string" },
              description: { type: "string" },
              faculties: { type: "array", items: { type: "string" } },
              programs: { type: "array", items: { type: "object", properties: { name: { type: "string" }, faculty: { type: "string" }, degreeType: { type: "string" }, duration: { type: "string" } } } },
              admissionRequirements: { type: "object", properties: { general: { type: "string" }, minimumPoints: { type: "string" }, requiredSubjects: { type: "array", items: { type: "string" } } } },
              contactInfo: { type: "object", properties: { phone: { type: "string" }, email: { type: "string" }, address: { type: "string" }, website: { type: "string" } } },
              accreditation: { type: "string" },
              establishedYear: { type: "integer" },
              otherInfo: { type: "string" }
            }
          }
        }
      };
    }

    const toolName = toolDef.function.name;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: toolName } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to analyze image");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let extractedInfo = {};
    
    if (toolCall?.function?.arguments) {
      try {
        extractedInfo = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(
      JSON.stringify({ extractedInfo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting image info:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
