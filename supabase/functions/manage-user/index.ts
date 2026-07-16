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

    const body = await req.json();
    const { action } = body;

    // === CREATE USER ===
    if (action === "create") {
      const { password, role, avatarColor } = body;
      const email = body.email?.trim().toLowerCase();
      const fullName = body.fullName?.trim();
      if (!email || !password || !fullName) {
        return new Response(
          JSON.stringify({ error: "email, password, and fullName are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: existing } = await admin.auth.admin.listUsers();
      const found = existing.users.find((u) => u.email?.toLowerCase() === email);
      if (found) {
        return new Response(
          JSON.stringify({ error: "A user with this email already exists" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, avatar_color: avatarColor ?? "#ffdccb" }
      });
      if (createErr) {
        return new Response(
          JSON.stringify({ error: createErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = created.user.id;
      await admin.from("profiles").upsert({
        id: userId,
        email,
        full_name: fullName,
        role: role ?? "sales_executive",
        avatar_color: avatarColor ?? "#ffdccb"
      }, { onConflict: "id" });

      await admin.from("audit_logs").insert({
        user_id: userId,
        action: "user_created",
        action_type: "create",
        entity_type: "profile",
        entity_id: userId,
        metadata: { email, full_name: fullName, role: role ?? "sales_executive" }
      });

      return new Response(
        JSON.stringify({ ok: true, userId, email }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === DELETE USER ===
    if (action === "delete") {
      const { userId } = body;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) {
        return new Response(
          JSON.stringify({ error: delErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await admin.from("profiles").delete().eq("id", userId);
      await admin.from("audit_logs").insert({
        user_id: userId,
        action: "user_deleted",
        action_type: "delete",
        entity_type: "profile",
        entity_id: userId,
        metadata: { deleted_by: body.requestedBy }
      });

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === UPDATE USER ROLE ===
    if (action === "update_role") {
      const { userId, role, fullName, avatarColor } = body;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "userId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, string> = {};
      if (role) updateData.role = role;
      if (fullName) updateData.full_name = fullName;
      if (avatarColor) updateData.avatar_color = avatarColor;

      const { error: profErr } = await admin.from("profiles").update(updateData).eq("id", userId);
      if (profErr) {
        return new Response(
          JSON.stringify({ error: profErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
