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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: corsHeaders });
    }

    const { payment_id, refund_notes } = await req.json();
    if (!payment_id) {
      return new Response(JSON.stringify({ error: "Missing payment_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get payment details
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("*")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (payment.status !== "completed") {
      return new Response(JSON.stringify({ error: "Only completed payments can be refunded" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!payment.ecocash_reference || payment.ecocash_reference === "ADMIN_BYPASS") {
      // Admin bypass payments - just update status
      await adminClient.from("payments").update({
        refund_status: "approved",
        refund_notes: refund_notes || "Admin bypass refund",
        refunded_at: new Date().toISOString(),
        refunded_by: userId,
        status: "refunded",
      }).eq("id", payment_id);

      return new Response(JSON.stringify({ success: true, message: "Refund processed (admin bypass)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call EcoCash Refund API
    const ecocashRefundUrl = Deno.env.get("ECOCASH_API_URL")!.replace("/transactions/amount", "/transactions/refund");
    const username = Deno.env.get("ECOCASH_USERNAME")!;
    const password = Deno.env.get("ECOCASH_PASSWORD")!;
    const merchantCode = Deno.env.get("ECOCASH_MERCHANT_CODE")!;
    const merchantPin = Deno.env.get("ECOCASH_MERCHANT_PIN")!;
    const merchantNumber = Deno.env.get("ECOCASH_MERCHANT_NUMBER")!;
    const superMerchantName = Deno.env.get("ECOCASH_SUPER_MERCHANT_NAME")!;
    const merchantName = Deno.env.get("ECOCASH_MERCHANT_NAME")!;

    const refundClientCorrelator = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const notifyUrl = `${supabaseUrl}/functions/v1/ecocash-notify`;

    const refundBody = {
      clientCorrelator: refundClientCorrelator,
      endUserId: payment.phone_number,
      notifyUrl,
      originalEcocashReference: payment.ecocash_reference,
      referenceCode: payment.reference_code,
      tranType: "MER",
      remarks: `Refund for ${payment.reference_code}`,
      transactionOperationStatus: "Charged",
      paymentAmount: {
        charginginformation: {
          amount: parseFloat(String(payment.amount)),
          currency: payment.currency,
          description: "EduGuide Refund",
        },
        chargeMetaData: {
          channel: "WEB",
          purchaseCategoryCode: "Online Payment",
          onBeHalfOf: superMerchantName,
        },
      },
      merchantCode,
      merchantPin,
      merchantNumber,
      currencyCode: payment.currency,
      countryCode: "ZW",
      terminalID: "EDUGUIDE001",
      location: "ONLINE",
      superMerchantName,
      merchantName,
    };

    const basicAuth = btoa(`${username}:${password}`);
    const ecocashResponse = await fetch(ecocashRefundUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(refundBody),
    });

    const ecocashData = await ecocashResponse.json();
    console.log("EcoCash refund response:", JSON.stringify(ecocashData));

    const refundStatus = ecocashData.transactionOperationStatus === "COMPLETED" ? "approved" : "pending";

    await adminClient.from("payments").update({
      refund_status: refundStatus,
      refund_notes: refund_notes || "",
      refunded_at: new Date().toISOString(),
      refunded_by: userId,
      status: refundStatus === "approved" ? "refunded" : payment.status,
      transaction_data: { ...((payment.transaction_data as Record<string, unknown>) || {}), refund_response: ecocashData },
    }).eq("id", payment_id);

    return new Response(JSON.stringify({
      success: true,
      refund_status: refundStatus,
      ecocash_response: ecocashData,
      message: refundStatus === "approved" ? "Refund completed" : "Refund initiated, awaiting confirmation",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("EcoCash refund error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Refund failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
