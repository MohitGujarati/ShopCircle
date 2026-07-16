// useAuth — the app's single source of truth for "who is logged in?".
//
// A React Context so any screen (the gate, Login, a future Sign-out button)
// can read the session without passing props down through every component.
// It wraps Supabase so screens call signIn/signUp/signOut instead of poking
// at supabase.auth.* themselves.

import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  // These return { error } — a string message on failure, or null on success —
  // so the screen can decide what to show. They don't navigate; the session
  // change does that via the gate.
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Start true: on launch we don't yet know if there's a saved session.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Load any session saved on the device from a previous run.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // 2) React to every future auth event (sign in, sign out, token refresh).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Clean up the listener when the provider unmounts.
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, name: string) => {
    // `name` goes into user_metadata now; we copy it into a profiles row later.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Small helper so screens do `const { signIn } = useAuth();`. Throws if used
// outside the provider — a clear error beats a silent undefined.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}