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
    const { imageUrl } = await req.json();
    
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting structured information from university-related images. 
Analyze the image and extract relevant information about the university such as:
- University name and short name
- Location/address
- Contact information (phone, email, website)
- Faculties and departments
- Programs offered
- Admission requirements
- Fees and tuition
- Accreditation status
- Important dates
- Any other relevant educational information

Return the extracted information in a structured JSON format.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this university image and extract all relevant information. Return a JSON object with the following structure: { name, shortName, location, description, faculties (array), programs (array), admissionRequirements (object), contactInfo (object with phone, email, address), fees (object), accreditation, establishedYear, importantDates (array), otherInfo (any additional relevant information) }. Only include fields where you can extract actual information from the image."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_university_info",
              description: "Extract structured university information from the image",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Full university name" },
                  shortName: { type: "string", description: "Abbreviated name (e.g., UZ, NUST)" },
                  location: { type: "string", description: "City or region" },
                  description: { type: "string", description: "Brief description of the university" },
                  faculties: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "List of faculties or schools"
                  },
                  programs: { 
                    type: "array", 
                    items: { 
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        faculty: { type: "string" },
                        degreeType: { type: "string" },
                        duration: { type: "string" }
                      }
                    },
                    description: "List of programs offered"
                  },
                  admissionRequirements: {
                    type: "object",
                    properties: {
                      general: { type: "string" },
                      minimumPoints: { type: "string" },
                      requiredSubjects: { type: "array", items: { type: "string" } }
                    },
                    description: "Admission requirements"
                  },
                  contactInfo: {
                    type: "object",
                    properties: {
                      phone: { type: "string" },
                      email: { type: "string" },
                      address: { type: "string" },
                      website: { type: "string" }
                    },
                    description: "Contact information"
                  },
                  fees: {
                    type: "object",
                    properties: {
                      tuition: { type: "string" },
                      registration: { type: "string" },
                      other: { type: "string" }
                    },
                    description: "Fee information"
                  },
                  accreditation: { type: "string", description: "Accreditation status" },
                  establishedYear: { type: "integer", description: "Year established" },
                  importantDates: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        event: { type: "string" },
                        date: { type: "string" }
                      }
                    },
                    description: "Important dates"
                  },
                  otherInfo: { type: "string", description: "Any other relevant information" }
                },
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_university_info" } }
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
    
    // Extract the tool call result
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
