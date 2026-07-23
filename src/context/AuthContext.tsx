import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Profile, type UserRole } from '../lib/supabase';
import { writeAuditLog } from '../lib/audit';

type AuthError = { message: string };

type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
};

type SignInResult = {
  error: AuthError | null;
  twoFactorRequired?: boolean;
  pendingEmail?: string;
  pendingPassword?: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    remember: boolean
  ) => Promise<SignInResult>;
  complete2FALogin: (
    email: string,
    password: string,
    code: string,
    useBackupCode: boolean,
    remember: boolean
  ) => Promise<SignInResult>;
  signUp: (
    input: SignUpInput
  ) => Promise<{ error: AuthError | null; needsVerify: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (
    email: string
  ) => Promise<{ error: AuthError | null }>;
  updatePassword: (
    newPassword: string
  ) => Promise<{ error: AuthError | null }>;
  resendVerification: (
    email: string
  ) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AVATAR_COLORS = [
  '#ffdccb', '#d8e7ff', '#eadbff', '#c9f0e3',
  '#ffe0ee', '#f9dfbe', '#e0dcff', '#d5e3ff'
];

function pickAvatarColor(seed: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

async function writeAudit(
  userId: string | undefined,
  action: string,
  actionType: 'login' | 'logout' | 'signup' | 'password_reset' = 'login',
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await writeAuditLog({ userId, action, actionType, metadata });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('Failed to load profile:', error.message);
      setProfile(null);
      return;
    }
    if (data) {
      setProfile(data as Profile);
    } else {
      // Profile row may not exist yet if trigger lagged — retry briefly.
      const { data: retry } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setProfile((retry as Profile) ?? null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(
    async (
      email: string,
      password: string,
      remember: boolean
    ): Promise<SignInResult> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken: undefined }
      });
      if (error) return { error: { message: friendlyAuthError(error.message) } };

      // Check if 2FA is enabled — query profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('two_factor_enabled')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.two_factor_enabled) {
        // 2FA required — sign out the ephemeral session, don't persist
        await supabase.auth.signOut();
        return { error: null, twoFactorRequired: true, pendingEmail: email, pendingPassword: password };
      }

      // No 2FA — keep session
      if (!remember && data.session) {
        try {
          const raw = localStorage.getItem('sb-dxxgohdfmcoacdwiyvad-auth-token');
          if (raw) {
            sessionStorage.setItem('sb-dxxgohdfmcoacdwiyvad-auth-token', raw);
            localStorage.removeItem('sb-dxxgohdfmcoacdwiyvad-auth-token');
          }
        } catch { /* ignore */ }
      }

      await writeAudit(data.user?.id, 'login', 'login', { email });
      return { error: null };
    },
    []
  );

  const complete2FALogin = useCallback(
    async (
      email: string,
      password: string,
      code: string,
      useBackupCode: boolean,
      remember: boolean
    ): Promise<SignInResult> => {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/two-factor`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      };

      try {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'login',
            email,
            password,
            code,
            useBackupCode,
            remember,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          return { error: { message: data.error ?? '2FA verification failed.' } };
        }

        if (data.twoFactorRequired) {
          return { error: { message: '2FA code required.' }, twoFactorRequired: true };
        }

        // 2FA verified — the edge function issued a session. But we need to
        // set it in the client. We re-sign-in with password (credentials already verified).
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email, password,
        });
        if (authError) {
          return { error: { message: 'Login failed after 2FA verification.' } };
        }

        if (!remember && authData.session) {
          try {
            const raw = localStorage.getItem('sb-dxxgohdfmcoacdwiyvad-auth-token');
            if (raw) {
              sessionStorage.setItem('sb-dxxgohdfmcoacdwiyvad-auth-token', raw);
              localStorage.removeItem('sb-dxxgohdfmcoacdwiyvad-auth-token');
            }
          } catch { /* ignore */ }
        }

        await writeAudit(authData.user?.id, 'login_2fa', 'login', { email });
        return { error: null };
      } catch {
        return { error: { message: 'Network error during 2FA verification.' } };
      }
    },
    []
  );

  const signUp = useCallback(
    async (
      input: SignUpInput
    ): Promise<{ error: AuthError | null; needsVerify: boolean }> => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.fullName,
            avatar_color: pickAvatarColor(input.email)
          }
        }
      });
      if (error) return { error: { message: friendlyAuthError(error.message) }, needsVerify: false };

      const needsVerify = !data.session && !!data.user;
      await writeAudit(data.user?.id, 'signup', 'signup', { email: input.email });
      return { error: null, needsVerify };
    },
    []
  );

  const signOut = useCallback(async () => {
    const userId = session?.user?.id;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    await writeAudit(userId, 'logout', 'logout');
  }, [session]);

  const sendPasswordReset = useCallback(
    async (email: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) return { error: { message: friendlyAuthError(error.message) } };
      return { error: null };
    },
    []
  );

  const updatePassword = useCallback(
    async (newPassword: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { error: { message: friendlyAuthError(error.message) } };
      await writeAudit(session?.user?.id, 'password_reset', 'password_reset');
      return { error: null };
    },
    [session]
  );

  const resendVerification = useCallback(
    async (email: string): Promise<{ error: AuthError | null }> => {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/verify-email` }
      });
      if (error) return { error: { message: friendlyAuthError(error.message) } };
      return { error: null };
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    if (session?.user) await fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      loading,
      signIn,
      complete2FALogin,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      resendVerification,
      refreshProfile
    }),
    [
      session,
      profile,
      loading,
      signIn,
      complete2FALogin,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      resendVerification,
      refreshProfile
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (m.includes('user already registered')) return 'An account with this email already exists.';
  if (m.includes('password should be at least'))
    return 'Password must be at least 6 characters.';
  if (m.includes('email rate limit')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('email not confirmed'))
    return 'Please verify your email before signing in.';
  return msg;
}
