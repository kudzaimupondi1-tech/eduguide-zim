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

    // Verify user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    // Check if admin (admins don't pay)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    
    const { phone_number, amount, university_count } = await req.json();

    if (!phone_number || !amount || !university_count) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clientCorrelator = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const referenceCode = `EDUGUIDE_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // If admin, skip payment and mark as completed
    if (isAdmin) {
      const { data: payment, error: insertError } = await adminClient
        .from("payments")
        .insert({
          user_id: userId,
          amount: 0,
          currency: "USD",
          university_count,
          phone_number: "admin-bypass",
          status: "completed",
          client_correlator: clientCorrelator,
          reference_code: referenceCode,
          ecocash_reference: "ADMIN_BYPASS",
          transaction_data: { admin_bypass: true },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ payment_id: payment.id, status: "completed", admin_bypass: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone number (ensure 263 prefix)
    let formattedPhone = phone_number.replace(/\s+/g, "").replace(/^\+/, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "263" + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith("263")) {
      formattedPhone = "263" + formattedPhone;
    }

    // Create payment record
    const { data: payment, error: insertError } = await adminClient
      .from("payments")
      .insert({
        user_id: userId,
        amount,
        currency: "USD",
        university_count,
        phone_number: formattedPhone,
        status: "pending",
        client_correlator: clientCorrelator,
        reference_code: referenceCode,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Call EcoCash API
    const ecocashUrl = Deno.env.get("ECOCASH_API_URL")!;
    const username = Deno.env.get("ECOCASH_USERNAME")!;
    const password = Deno.env.get("ECOCASH_PASSWORD")!;
    const merchantCode = Deno.env.get("ECOCASH_MERCHANT_CODE")!;
    const merchantPin = Deno.env.get("ECOCASH_MERCHANT_PIN")!;
    const merchantNumber = Deno.env.get("ECOCASH_MERCHANT_NUMBER")!;
    const superMerchantName = Deno.env.get("ECOCASH_SUPER_MERCHANT_NAME")!;
    const merchantName = Deno.env.get("ECOCASH_MERCHANT_NAME")!;

    const notifyUrl = `${supabaseUrl}/functions/v1/ecocash-notify`;

    const chargeBody = {
      clientCorrelator,
      notifyUrl,
      referenceCode,
      tranType: "MER",
      endUserId: formattedPhone,
      remarks: `EduGuide Recommendation - ${university_count} universities`,
      transactionOperationStatus: "Charged",
      paymentAmount: {
        charginginformation: {
          amount: parseFloat(amount),
          currency: "USD",
          description: "EduGuide University Recommendation",
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
      currencyCode: "USD",
      countryCode: "ZW",
      terminalID: "EDUGUIDE001",
      location: "ONLINE",
      superMerchantName,
      merchantName,
    };

    const basicAuth = btoa(`${username}:${password}`);
    const ecocashResponse = await fetch(ecocashUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(chargeBody),
    });

    const ecocashData = await ecocashResponse.json();

    // Update payment with EcoCash response
    await adminClient
      .from("payments")
      .update({
        transaction_data: ecocashData,
        ecocash_reference: ecocashData.ecocashReference || null,
        status: ecocashData.transactionOperationStatus === "COMPLETED" ? "completed" : "pending",
      })
      .eq("id", payment.id);

    return new Response(JSON.stringify({
      payment_id: payment.id,
      status: ecocashData.transactionOperationStatus || "pending",
      message: "Payment initiated. Please approve on your phone.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("EcoCash charge error:", error);
    return new Response(JSON.stringify({ error: error.message || "Payment failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
