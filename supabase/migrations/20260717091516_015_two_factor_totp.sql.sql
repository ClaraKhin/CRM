-- 2FA (TOTP) support: stores encrypted secret, enabled flag, and backup codes on profiles.
-- Rate limiting tracked in a separate table.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS two_factor_enabled     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_factor_secret      text,          -- base32 secret, encrypted at rest
  ADD COLUMN IF NOT EXISTS two_factor_secret_iv   text,          -- IV used for encryption
  ADD COLUMN IF NOT EXISTS two_factor_backup_codes text[],       -- bcrypt-hashed backup codes
  ADD COLUMN IF NOT EXISTS two_factor_setup_token  text;         -- short-lived token during setup

-- Track 2FA verification attempts for rate limiting (5 per 5 min window).
CREATE TABLE IF NOT EXISTS two_factor_attempts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL,
  attempt_type text       NOT NULL CHECK (attempt_type IN ('login','setup','disable')),
  success     boolean     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_2fa_attempts_user_time
  ON two_factor_attempts (user_id, created_at DESC);

ALTER TABLE two_factor_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_2fa_attempts" ON two_factor_attempts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_2fa_attempts" ON two_factor_attempts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_2fa_attempts" ON two_factor_attempts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_2fa_attempts" ON two_factor_attempts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
