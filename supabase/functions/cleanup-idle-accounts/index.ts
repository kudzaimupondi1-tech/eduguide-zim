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

    // Get idle days setting from system_settings
    const { data: setting } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "idle_account_days")
      .single();

    const idleDays = setting?.setting_value?.days || 10;

    // Find student profiles that have been idle
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - idleDays);

    // Get idle student profiles
    const { data: idleProfiles } = await supabase
      .from("profiles")
      .select("user_id")
      .lt("last_active_at", cutoffDate.toISOString());

    if (!idleProfiles || idleProfiles.length === 0) {
      return new Response(JSON.stringify({ message: "No idle accounts found", removed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to only students (not admins/counselors)
    const userIds = idleProfiles.map((p) => p.user_id);
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("user_id", userIds)
      .in("role", ["admin", "counselor"]);

    const protectedUserIds = new Set((adminRoles || []).map((r) => r.user_id));
    const studentUserIds = userIds.filter((id) => !protectedUserIds.has(id));

    let removedCount = 0;
    for (const userId of studentUserIds) {
      // Clean up user data
      await supabase.from("student_subjects").delete().eq("user_id", userId);
      await supabase.from("student_notifications").delete().eq("user_id", userId);
      await supabase.from("system_ratings").delete().eq("user_id", userId);
      await supabase.from("user_roles").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("user_id", userId);
      
      // Delete auth user
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (!error) removedCount++;
    }

    return new Response(
      JSON.stringify({ message: `Removed ${removedCount} idle student accounts`, removed: removedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
