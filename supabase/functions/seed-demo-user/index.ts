import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing server config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const email = "demo@1cngcrm.com";
    const password = "Demo1234!";
    const fullName = "Renee Walker";

    // Check if user already exists
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing.users.find((u) => u.email === email);

    let userId: string;

    if (found) {
      // Update password to ensure it's correct
      await admin.auth.admin.updateUserById(found.id, {
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, avatar_color: "#ffdccb" }
      });
      userId = found.id;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, avatar_color: "#ffdccb" }
      });
      if (createErr) {
        return new Response(
          JSON.stringify({ error: createErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userId = created.user.id;
    }

    // Ensure profile row with sales_manager role
    await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName,
      role: "sales_manager",
      avatar_color: "#ffdccb"
    }, { onConflict: "id" });

    return new Response(
      JSON.stringify({ ok: true, email, userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
