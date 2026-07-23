import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Encryption key ───
const ENC_KEY_RAW = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "fallback-2fa-encryption-key-32b!";

async function deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(ENC_KEY_RAW.padEnd(32, "0").slice(0, 32)),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("2fa-salt-v1"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
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

// ─── Rate limiting ───
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

// ─── TOTP (pure Web Crypto, no npm deps) ───
function base32Encode(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(b32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = b32.replace(/=/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

async function totpCounter(counter: number): Promise<Uint8Array> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // counter is a 64-bit integer — for realistic time values the high 32 bits are 0
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter & 0xffffffff);
  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(/* secret passed in */ (globalThis as any).__tfa_secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, buf);
  return new Uint8Array(sig);
}

async function generateTotpCode(secretBase32: string, forTime: number = Date.now()): Promise<string> {
  const counter = Math.floor(forTime / 1000 / 30);
  (globalThis as any).__tfa_secret = secretBase32;
  const hmac = await totpCounter(counter);
  delete (globalThis as any).__tfa_secret;
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, "0");
}

async function verifyCode(secretBase32: string, code: string): Promise<boolean> {
  const now = Date.now();
  // Check current, -1, and +1 windows
  for (let offset = -1; offset <= 1; offset++) {
    const testCode = await generateTotpCode(secretBase32, now + offset * 30000);
    if (testCode === String(code).replace(/\s/g, "")) return true;
  }
  return false;
}

function buildOtpauthUri(secretBase32: string, email: string): string {
  const issuer = "1CNG%20CRM";
  const account = encodeURIComponent(email || "user");
  return `otpauth://totp/${issuer}:${account}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const raw = crypto.getRandomValues(new Uint8Array(6));
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── SETUP ───
    if (action === "setup") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await supabase.auth.getUser(token);
      if (userErr || !userData.user) {
        return jsonResponse({ error: "Not authenticated" }, 401);
      }
      const userId = userData.user.id;
      const email = userData.user.email ?? "";

      const { data: profile } = await supabase
        .from("profiles")
        .select("two_factor_enabled")
        .eq("id", userId)
        .maybeSingle();
      if (profile?.two_factor_enabled) {
        return jsonResponse({ error: "2FA is already enabled. Disable it first to reconfigure." }, 400);
      }

      const secret = generateSecret();
      const otpauthUri = buildOtpauthUri(secret, email);

      const { cipher, iv } = await encryptSecret(secret);
      const setupToken = crypto.randomUUID() + "-" + Date.now();

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          two_factor_secret: cipher,
          two_factor_secret_iv: iv,
          two_factor_enabled: false,
          two_factor_setup_token: setupToken,
        })
        .eq("id", userId);

      if (updateErr) {
        return jsonResponse({ error: "Failed to save 2FA setup: " + updateErr.message }, 500);
      }

      return jsonResponse({ secret, otpauthUri, setupToken }, 200);
    }

    // ─── VERIFY ───
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

      const allowed = await checkRateLimit(supabase, userId, "setup");
      if (!allowed) {
        return jsonResponse({ error: "Too many attempts. Please wait 5 minutes and try again." }, 429);
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("two_factor_secret, two_factor_secret_iv, two_factor_setup_token, two_factor_enabled")
        .eq("id", userId)
        .maybeSingle();

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
      const valid = await verifyCode(secret, String(code));

      if (!valid) {
        await logAttempt(supabase, userId, "setup", false);
        return jsonResponse({ error: "Invalid verification code. Try again." }, 400);
      }

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

    // ─── LOGIN ───
    if (action === "login") {
      const { code, email, password, useBackupCode } = body;

      if (!email || !password) {
        return jsonResponse({ error: "Missing email or password" }, 400);
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError || !authData.user) {
        return jsonResponse({ error: "Incorrect email or password." }, 401);
      }
      const userId = authData.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("two_factor_enabled, two_factor_secret, two_factor_secret_iv, two_factor_backup_codes")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.two_factor_enabled) {
        await supabase.auth.signOut();
        return jsonResponse({ twoFactorRequired: false }, 200);
      }

      // 2FA required — sign out the ephemeral session
      await supabase.auth.signOut();

      if (!code) {
        return jsonResponse({
          twoFactorRequired: true,
          message: "Enter your 2FA code to continue.",
        }, 200);
      }

      const allowed = await checkRateLimit(supabase, userId, "login");
      if (!allowed) {
        return jsonResponse({ error: "Too many attempts. Please wait 5 minutes and try again." }, 429);
      }

      if (useBackupCode) {
        const backupCodes: string[] = profile.two_factor_backup_codes ?? [];
        const codeUpper = String(code).toUpperCase().trim();
        const matchIdx = backupCodes.indexOf(codeUpper);
        if (matchIdx === -1) {
          await logAttempt(supabase, userId, "login", false);
          return jsonResponse({ error: "Invalid backup code." }, 400);
        }
        backupCodes.splice(matchIdx, 1);
        await supabase.from("profiles").update({ two_factor_backup_codes: backupCodes }).eq("id", userId);
      } else {
        const secret = await decryptSecret(profile.two_factor_secret, profile.two_factor_secret_iv);
        const valid = await verifyCode(secret, String(code));
        if (!valid) {
          await logAttempt(supabase, userId, "login", false);
          return jsonResponse({ error: "Invalid 2FA code. Try again." }, 400);
        }
      }

      // Code valid — issue a real session
      const { data: finalAuth, error: finalErr } = await supabase.auth.signInWithPassword({ email, password });
      if (finalErr || !finalAuth.session) {
        return jsonResponse({ error: "Login failed after 2FA. Please try again." }, 500);
      }

      await logAttempt(supabase, userId, "login", true);

      return jsonResponse({ twoFactorRequired: false, message: "Login successful." }, 200);
    }

    // ─── DISABLE ───
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

      if (password) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .maybeSingle();
        if (profile?.email) {
          const { error: pwdErr } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password,
          });
          if (pwdErr) {
            return jsonResponse({ error: "Incorrect password." }, 400);
          }
          await supabase.auth.signOut();
        }
      } else if (code) {
        const allowed = await checkRateLimit(supabase, userId, "disable");
        if (!allowed) {
          return jsonResponse({ error: "Too many attempts. Please wait 5 minutes." }, 429);
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("two_factor_secret, two_factor_secret_iv")
          .eq("id", userId)
          .maybeSingle();
        if (profile?.two_factor_secret && profile.two_factor_secret_iv) {
          const secret = await decryptSecret(profile.two_factor_secret, profile.two_factor_secret_iv);
          const valid = await verifyCode(secret, String(code));
          if (!valid) {
            await logAttempt(supabase, userId, "disable", false);
            return jsonResponse({ error: "Invalid 2FA code." }, 400);
          }
        }
      }

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

    // ─── STATUS ───
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
        .eq("id", userId)
        .maybeSingle();

      return jsonResponse({ enabled: !!profile?.two_factor_enabled }, 200);
    }

    return jsonResponse({ error: "Unknown action. Use: setup, verify, login, disable, status" }, 400);
  } catch (err: any) {
    return jsonResponse({ error: "Server error: " + (err?.message ?? String(err)) }, 500);
  }
});

function jsonResponse(data: any, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
