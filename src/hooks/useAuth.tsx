// useAuth — the app's single source of truth for "who is logged in?".
//
// A React Context so any screen (the gate, Login, a future Sign-out button)
// can read the session without passing props down through every component.
// It wraps Supabase so screens call signIn/signUp/signOut instead of poking
// at supabase.auth.* themselves.

import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

// Supabase sends the result of an email link back as URL parameters — in the
// fragment (#access_token=…) for the implicit flow, or the query (?code=…) for
// PKCE. Reading both means we don't care which one the project is configured
// for. URLSearchParams works because react-native-url-polyfill is loaded in
// lib/supabase.ts before anything else.
function paramsFromUrl(url: string) {
  const [beforeHash, afterHash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.split('?')[1] : '';
  return new URLSearchParams(`${query}&${afterHash}`);
}

/**
 * Turn a redirect URL into a session. Shared by the two things that come back
 * to the app through a URL: email links (confirm signup, password reset) and
 * the Google OAuth callback. Both hand back the same parameters, so both are
 * handled by the same twenty lines.
 */
async function sessionFromUrl(url: string): Promise<{ error: string | null }> {
  const params = paramsFromUrl(url);

  const errorDescription = params.get('error_description');
  if (errorDescription) {
    // Usually otp_expired: the link is single-use and already spent (a second
    // click, or a mail scanner that followed it), or it simply timed out.
    return { error: decodeURIComponent(errorDescription.replace(/\+/g, ' ')) };
  }

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: error?.message ?? null };
  }

  // PKCE flow returns a one-time code instead of tokens.
  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return { error: error?.message ?? null };
  }

  // A perfectly ordinary deep link with nothing auth-related in it.
  return { error: null };
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  // These return { error } — a string message on failure, or null on success —
  // so the screen can decide what to show. They don't navigate; the session
  // change does that via the gate.
  // `identifier` is an email OR a username — see signIn below.
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  // Set when an email link fails (expired, already used). The Login screen
  // shows it, because that's where the app dumps you when the link doesn't
  // produce a session.
  linkError: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // Start true: on launch we don't yet know if there's a saved session.
  const [loading, setLoading] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Handle a link the user opened from their email (confirm signup, and later
  // password reset). Supabase redirects to shopcircle://… with either the
  // session tokens or an error attached.
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const { error } = await sessionFromUrl(url);
      setLinkError(error);
    };

    // Two cases: the app was closed and the link launched it (getInitialURL),
    // or it was already open in the background (the listener).
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, []);

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

  // Accepts an email or a username.
  //
  // Email → straight to Supabase, nothing to resolve.
  // Username → the `login` Edge Function (supabase/functions/login/index.ts).
  // signInWithPassword only understands emails, and the handle→email lookup has
  // to happen on the server: doing it from here meant any anonymous caller
  // could list every username and harvest every email address.
  const signIn = async (identifier: string, password: string) => {
    const value = identifier.trim();

    // Crude on purpose: an email always has an "@", and the CHECK constraint in
    // username.sql means a username never can.
    if (value.includes('@')) {
      const { error } = await supabase.auth.signInWithPassword({
        email: value,
        password,
      });
      return { error: error?.message ?? null };
    }

    const { data, error } = await supabase.functions.invoke('login', {
      body: { identifier: value, password },
    });

    // A transport/network failure, not a rejected password.
    if (error) return { error: 'Could not reach the server. Please try again.' };
    if (data?.error) return { error: data.error };

    // The function verified the password and handed back tokens; setSession
    // stores them and fires onAuthStateChange, so the rest of the app reacts
    // exactly as it would after a normal sign-in.
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    return { error: sessionError?.message ?? null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    // options.data lands in raw_user_meta_data, which the on_auth_user_created
    // trigger reads to build the profiles row. The app never inserts that row
    // itself — there's no session yet to satisfy RLS.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: username.toLowerCase() },
        // Where the confirmation link sends them BACK to. Without this Supabase
        // uses the project's Site URL, which defaults to http://localhost:3000
        // — a web address with nothing behind it on a phone. createURL builds
        // the right thing for where the app is running: shopcircle:// in a
        // build, exp://…  in Expo Go.
        emailRedirectTo: Linking.createURL('/'),
      },
    });

    // With "Confirm email" ON, signUp returns a user but NO session — the
    // account exists but can't be used until the link is clicked. The screen
    // needs to know the difference so it doesn't try to enter the app.
    return {
      error: error?.message ?? null,
      needsConfirmation: !error && !data.session,
    };
  };

  // Google sign-in, the browser way.
  //
  // There is no password to send, so the flow is: open Google's consent page in
  // a browser, let the user approve, and Google sends them back to us with the
  // session attached to the return URL.
  //
  // We use the browser rather than the native Google SDK because that SDK needs
  // a custom development build and per-platform client ids. This works in Expo
  // Go, on device, and on web, with one code path.
  const signInWithGoogle = async () => {
    const redirectTo = Linking.createURL('/');

    // skipBrowserRedirect: don't navigate anywhere — just give us the URL, and
    // WE decide how to open it. On native there's no page to navigate.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
    });

    if (error) return { error: error.message };

    // On web, signInWithOAuth navigates the whole page to Google. Nothing left
    // to do here — the session is picked up on the way back by
    // detectSessionInUrl (see lib/supabase.ts).
    if (Platform.OS === 'web' || !data?.url) return { error: null };

    // openAuthSessionAsync opens an in-app browser tab and, crucially, WAITS —
    // resolving once the browser is redirected to `redirectTo`. It's what makes
    // this feel like part of the app instead of bouncing out to Chrome.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    // The user backed out. Not an error — say nothing.
    if (result.type !== 'success') return { error: null };

    return sessionFromUrl(result.url);
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
        signInWithGoogle,
        signOut,
        linkError,
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