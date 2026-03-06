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
    const body = await req.json();
    console.log("EcoCash notification received:", JSON.stringify(body));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const clientCorrelator = body.clientCorrelator;
    const status = body.transactionOperationStatus;
    const ecocashReference = body.ecocashReference;

    if (!clientCorrelator) {
      return new Response(JSON.stringify({ error: "Missing clientCorrelator" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map EcoCash status to our status
    let paymentStatus = "pending";
    if (status === "COMPLETED") paymentStatus = "completed";
    else if (status === "FAILED") paymentStatus = "failed";

    // Update payment record
    const { error } = await adminClient
      .from("payments")
      .update({
        status: paymentStatus,
        ecocash_reference: ecocashReference || null,
        transaction_data: body,
        updated_at: new Date().toISOString(),
      })
      .eq("client_correlator", clientCorrelator);

    if (error) {
      console.error("Error updating payment:", error);
      throw error;
    }

    console.log(`Payment ${clientCorrelator} updated to ${paymentStatus}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("EcoCash notify error:", error);
    return new Response(JSON.stringify({ error: error.message || "Notification processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
