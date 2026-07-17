import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as OTPAuth from "npm:otpauth@9";
import QRCode from "npm:qrcode@1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ENCRYPTION_KEY = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "fallback-2fa-encryption-key-32b!";

// ─── AES-GCM helpers (Web Crypto) ───
async function deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("2fa-salt-v1"), iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function encryptSecret(plain: string): Promise<{ cipher: string; iv: string }> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  return {
    cipher: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function decryptSecret(cipher: string, iv: string): Promise<string> {
  const key = await deriveKey();
  const dec = new TextDecoder();
  const cipherBuf = Uint8Array.from(atob(cipher), (c) => c.charCodeAt(0));
  const ivBuf = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, key, cipherBuf);
  return dec.decode(plain);
}

// ─── Rate limiting (5 attempts / 5 min) ───
async function checkRateLimit(supabase: any, userId: string, type: string): Promise<boolean> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("two_factor_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("attempt_type", type)
    .eq("success", false)
    .gte("created_at", fiveMinAgo);
  return (count ?? 0) < 5;
}

async function logAttempt(supabase: any, userId: string, type: string, success: boolean) {
  await supabase.from("two_factor_attempts").insert({ user_id: userId, attempt_type: type, success });
}

// ─── TOTP helpers ───
function generateSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

function buildTOTP(secretBase32: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: "1CNG CRM",
    label: "1CNG-CRM",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

function verifyCode(secretBase32: string, code: string): boolean {
  const delta = buildTOTP(secretBase32).validate({ token: code, window: 1 });
  return delta !== null;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raw = crypto.getRandomValues(new Uint8Array(8));
    const hex = Array.from(raw).map((b) => b.toString(16).padStart(2, "0")).join("");
    codes.push(`${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`.toUpperCase());
  }
  return codes;
}

// ─── Main handler ───
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Create an admin client using the service role key for DB operations.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ─── SETUP: Generate secret + QR code ───
    if (action === "setup") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) {
        return jsonResponse({ error: "Not authenticated" }, 401);
      }
      const userId = userData.user.id;

      // Check if already enabled
      const { data: profile } = await supabase
        .from("profiles").select("two_factor_enabled").eq("id", userId).maybeSingle();
      if (profile?.two_factor_enabled) {
        return jsonResponse({ error: "2FA is already enabled. Disable it first to reconfigure." }, 400);
      }

      const secret = generateSecret();
      const totp = buildTOTP(secret);
      const otpauthUri = totp.toString();
      const qrDataUrl = await QRCode.toDataURL(otpauthUri, { width: 200, margin: 1 });

      // Store secret encrypted with enabled=false + a setup token for verification step
      const { cipher, iv } = await encryptSecret(secret);
      const setupToken = crypto.randomUUID() + "-" + Date.now();

      await supabase
        .from("profiles")
        .update({
          two_factor_secret: cipher,
          two_factor_secret_iv: iv,
          two_factor_enabled: false,
          two_factor_setup_token: setupToken,
        })
        .eq("id", userId);

      return jsonResponse({
        qrCode: qrDataUrl,
        secret,
        otpauthUri,
        setupToken,
      }, 200);
    }

    // ─── VERIFY: Confirm code and enable 2FA ───
    if (action === "verify") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) {
        return jsonResponse({ error: "Not authenticated" }, 401);
      }
      const userId = userData.user.id;
      const { code, setupToken } = body;

      if (!code || !setupToken) {
        return jsonResponse({ error: "Missing code or setup token" }, 400);
      }

      // Rate limit
      const allowed = await checkRateLimit(supabase, userId, "setup");
      if (!allowed) {
        return jsonResponse({ error: "Too many attempts. Please wait 5 minutes and try again." }, 429);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("two_factor_secret, two_factor_secret_iv, two_factor_setup_token, two_factor_enabled")
        .eq("id", userId).maybeSingle();

      if (!profile?.two_factor_secret || !profile.two_factor_secret_iv) {
        return jsonResponse({ error: "No 2FA setup in progress. Start setup again." }, 400);
      }
      if (profile.two_factor_setup_token !== setupToken) {
        return jsonResponse({ error: "Setup session expired. Start setup again." }, 400);
      }
      if (profile.two_factor_enabled) {
        return jsonResponse({ error: "2FA is already enabled." }, 400);
      }

      const secret = await decryptSecret(profile.two_factor_secret, profile.two_factor_secret_iv);
      const valid = verifyCode(secret, String(code).replace(/\s/g, ""));

      if (!valid) {
        await logAttempt(supabase, userId, "setup", false);
        return jsonResponse({ error: "Invalid verification code. Try again." }, 400);
      }

      // Generate backup codes (stored as-is — they're single-use, hashed comparison would need a separate table)
      const backupCodes = generateBackupCodes();

      await supabase
        .from("profiles")
        .update({
          two_factor_enabled: true,
          two_factor_backup_codes: backupCodes,
          two_factor_setup_token: null,
        })
        .eq("id", userId);

      await logAttempt(supabase, userId, "setup", true);

      return jsonResponse({ backupCodes }, 200);
    }

    // ─── LOGIN: Verify 2FA code during login flow ───
    if (action === "login") {
      const { code, email, password, useBackupCode, remember } = body;

      if (!email || !password) {
        return jsonResponse({ error: "Missing email or password" }, 400);
      }

      // Step 1: Verify credentials via Supabase Auth (non-persistent)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email, password,
      });
      if (authError || !authData.user) {
        return jsonResponse({ error: "Incorrect email or password." }, 401);
      }
      const userId = authData.user.id;

      // Step 2: Check if 2FA is enabled
      const { data: profile } = await supabase
        .from("profiles")
        .select("two_factor_enabled, two_factor_secret, two_factor_secret_iv, two_factor_backup_codes")
        .eq("id", userId).maybeSingle();

      if (!profile?.two_factor_enabled) {
        // No 2FA — sign out the ephemeral session and return success
        // The frontend will use the actual signIn which persists the session
        await supabase.auth.signOut();
        return jsonResponse({ twoFactorRequired: false }, 200);
      }

      // 2FA required — don't issue a persistent session
      // Sign out the ephemeral session we just created
      await supabase.auth.signOut();

      if (!code) {
        // First step: just tell frontend 2FA is required
        return jsonResponse({
          twoFactorRequired: true,
          tempToken: `2fa-${userId}-${Date.now()}`,
          message: "Enter your 2FA code to continue.",
        }, 200);
      }

      // Step 3: Verify the 2FA code
      const allowed = await checkRateLimit(supabase, userId, "login");
      if (!allowed) {
        return jsonResponse({ error: "Too many attempts. Please wait 5 minutes and try again." }, 429);
      }

      if (useBackupCode) {
        // Verify backup code
        const backupCodes: string[] = profile.two_factor_backup_codes ?? [];
        const codeUpper = String(code).toUpperCase().trim();
        const matchIdx = backupCodes.indexOf(codeUpper);
        if (matchIdx === -1) {
          await logAttempt(supabase, userId, "login", false);
          return jsonResponse({ error: "Invalid backup code." }, 400);
        }
        // Remove the used backup code
        backupCodes.splice(matchIdx, 1);
        await supabase.from("profiles").update({ two_factor_backup_codes: backupCodes }).eq("id", userId);
      } else {
        // Verify TOTP code
        const secret = await decryptSecret(profile.two_factor_secret, profile.two_factor_secret_iv);
        const valid = verifyCode(secret, String(code).replace(/\s/g, ""));
        if (!valid) {
          await logAttempt(supabase, userId, "login", false);
          return jsonResponse({ error: "Invalid 2FA code. Try again." }, 400);
        }
      }

      // Code valid — issue a real session via password sign-in
      const { data: finalAuth, error: finalErr } = await supabase.auth.signInWithPassword({ email, password });
      if (finalErr || !finalAuth.session) {
        return jsonResponse({ error: "Login failed after 2FA. Please try again." }, 500);
      }

      await logAttempt(supabase, userId, "login", true);

      return jsonResponse({
        twoFactorRequired: false,
        session: finalAuth.session,
        message: "Login successful.",
      }, 200);
    }

    // ─── DISABLE: Remove 2FA (requires password) ───
    if (action === "disable") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) {
        return jsonResponse({ error: "Not authenticated" }, 401);
      }
      const userId = userData.user.id;
      const { password, code } = body;

      if (!password && !code) {
        return jsonResponse({ error: "Enter your password or 2FA code to disable." }, 400);
      }

      // If using password, verify it
      if (password) {
        const { data: profile } = await supabase
          .from("profiles").select("email").eq("id", userId).maybeSingle();
        if (profile?.email) {
          const { error: pwdErr } = await supabase.auth.signInWithPassword({
            email: profile.email, password,
          });
          if (pwdErr) {
            return jsonResponse({ error: "Incorrect password." }, 400);
          }
          await supabase.auth.signOut(); // sign out the ephemeral session
        }
      } else if (code) {
        // Verify 2FA code
        const allowed = await checkRateLimit(supabase, userId, "disable");
        if (!allowed) {
          return jsonResponse({ error: "Too many attempts. Please wait 5 minutes." }, 429);
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("two_factor_secret, two_factor_secret_iv")
          .eq("id", userId).maybeSingle();
        if (profile?.two_factor_secret && profile.two_factor_secret_iv) {
          const secret = await decryptSecret(profile.two_factor_secret, profile.two_factor_secret_iv);
          const valid = verifyCode(secret, String(code).replace(/\s/g, ""));
          if (!valid) {
            await logAttempt(supabase, userId, "disable", false);
            return jsonResponse({ error: "Invalid 2FA code." }, 400);
          }
        }
      }

      // Clear all 2FA data
      await supabase
        .from("profiles")
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          two_factor_secret_iv: null,
          two_factor_backup_codes: null,
          two_factor_setup_token: null,
        })
        .eq("id", userId);

      await logAttempt(supabase, userId, "disable", true);

      return jsonResponse({ success: true, message: "2FA disabled successfully." }, 200);
    }

    // ─── STATUS: Check current 2FA status ───
    if (action === "status") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) {
        return jsonResponse({ error: "Not authenticated" }, 401);
      }
      const userId = userData.user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("two_factor_enabled")
        .eq("id", userId).maybeSingle();

      return jsonResponse({ enabled: !!profile?.two_factor_enabled }, 200);
    }

    return jsonResponse({ error: "Unknown action. Use: setup, verify, login, disable, status" }, 400);
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
});

function jsonResponse(data: any, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
