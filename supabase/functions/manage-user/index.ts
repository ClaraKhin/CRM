import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/*
  POST body for creating a user:
    { action: "create", email, full_name, role, avatar_color }

  POST body for updating role/name of an existing user:
    { action: "update", userId, full_name, role, avatar_color }

  POST body for deleting a user:
    { action: "delete", userId }
*/

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing server config" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { action } = body;

    // ── CREATE ──────────────────────────────────────────────
    if (action === "create") {
      const { email, full_name, role, avatar_color } = body;
      if (!email || !full_name || !role) {
        return new Response(JSON.stringify({ error: "email, full_name and role are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Generate a random initial password — user can reset via "Forgot password"
      const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 16) + "Aa1!";

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name, avatar_color: avatar_color ?? "#ffdccb" }
      });
      if (createErr) {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Upsert profile with the requested role
      const { error: profileErr } = await admin.from("profiles").upsert({
        id: created.user.id,
        email,
        full_name,
        role,
        avatar_color: avatar_color ?? "#ffdccb"
      }, { onConflict: "id" });
      if (profileErr) {
        return new Response(JSON.stringify({ error: profileErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ ok: true, userId: created.user.id, email, tempPassword }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── UPDATE ──────────────────────────────────────────────
    if (action === "update") {
      const { userId, full_name, role, avatar_color } = body;
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const updates: Record<string, string> = {};
      if (full_name) updates.full_name = full_name;
      if (role) updates.role = role;
      if (avatar_color) updates.avatar_color = avatar_color;

      const { error: profileErr } = await admin.from("profiles").update(updates).eq("id", userId);
      if (profileErr) {
        return new Response(JSON.stringify({ error: profileErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── DELETE ──────────────────────────────────────────────
    if (action === "delete") {
      const { userId } = body;
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
      if (deleteErr) {
        return new Response(JSON.stringify({ error: deleteErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("MANAGE USER ERROR:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
