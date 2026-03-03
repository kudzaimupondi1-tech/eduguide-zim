import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { access_code, user_id } = await req.json();

    if (!access_code || !user_id) {
      return new Response(JSON.stringify({ error: "access_code and user_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the admin access code from system_settings
    const { data: setting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "admin_access_code")
      .single();

    const storedCode = setting?.setting_value?.code;

    if (!storedCode) {
      return new Response(JSON.stringify({ error: "Admin registration is not configured. Contact an administrator." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (access_code !== storedCode) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid access code" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Code is valid - assign admin role
    // First remove any existing student role
    await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", "student");
    
    // Add admin role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id,
      role: "admin",
    });

    if (roleError) {
      // Role might already exist
      if (!roleError.message.includes("duplicate")) {
        throw roleError;
      }
    }

    return new Response(
      JSON.stringify({ valid: true, message: "Admin role assigned successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
