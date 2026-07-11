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

type AuthError = { message: string };

type SignUpInput = {
  email: string;
  password: string;
  fullName: string;
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
  ) => Promise<{ error: AuthError | null }>;
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
  metadata: Record<string, unknown> = {}
): Promise<void> {
  if (!userId) return;
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    metadata
  });
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
    ): Promise<{ error: AuthError | null }> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken: undefined
        }
      });
      if (error) return { error: { message: friendlyAuthError(error.message) } };

      // Remember-me: Supabase persists sessions regardless, but we respect the
      // toggle by clearing storage when the user opts out of persistence.
      if (!remember && data.session) {
        // Force a non-persistent session by signing out then back in without storage.
        // Simpler + safe: just note preference and let refresh keep it ephemeral.
        // We keep the session but mark it ephemeral via sessionStorage only.
        try {
          const raw = localStorage.getItem('sb-dxxgohdfmcoacdwiyvad-auth-token');
          if (raw) {
            sessionStorage.setItem('sb-dxxgohdfmcoacdwiyvad-auth-token', raw);
            localStorage.removeItem('sb-dxxgohdfmcoacdwiyvad-auth-token');
          }
        } catch {
          // ignore storage errors
        }
      }

      await writeAudit(data.user?.id, 'login', { email });
      return { error: null };
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
      await writeAudit(data.user?.id, 'signup', { email: input.email });
      return { error: null, needsVerify };
    },
    []
  );

  const signOut = useCallback(async () => {
    const userId = session?.user?.id;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    await writeAudit(userId, 'logout');
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
      await writeAudit(session?.user?.id, 'password_reset');
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
