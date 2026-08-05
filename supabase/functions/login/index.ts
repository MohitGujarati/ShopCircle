// =============================================================================
// login — sign in with a username, without leaking anyone's email
//
// THE PROBLEM THIS SOLVES
//   supabase.auth.signInWithPassword() only understands emails. To let people
//   log in with a handle, something has to turn "mohit" into their email
//   address. Doing that lookup from the app meant exposing a database function
//   to logged-out callers — and since public.profiles is world-readable, anyone
//   could list every username and then resolve every email. A full address-book
//   dump from an anonymous client.
//
//   An Edge Function is a small piece of server code running next to the
//   database. The lookup happens HERE, and the email is never part of any
//   response. The caller sends a handle and a password, and gets back a session
//   or a generic failure. Nothing else.
//
// DEPLOY (see the notes at the bottom of this file):
//   npx supabase functions deploy login --no-verify-jwt
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// The web build calls this from a browser, which sends a preflight OPTIONS
// request first. Without these headers that preflight fails and the real
// request never happens.
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

// ONE failure message for every possible cause: unknown handle, unknown email,
// wrong password. Anything more specific tells an attacker which half they got
// right, which is exactly how account enumeration works.
const invalid = () => json({ error: 'Invalid login credentials' });

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    try {
        const { identifier, password } = await req.json();

        if (typeof identifier !== 'string' || typeof password !== 'string') {
            return json({ error: 'identifier and password are required' }, 400);
        }

        const url = Deno.env.get('SUPABASE_URL')!;
        let email = identifier.trim();

        // --- The part that has to be server-side --------------------------
        // No "@" means it's a handle. The SERVICE ROLE key bypasses RLS and can
        // read auth.users — which is exactly why it must never ship inside the
        // app. Here it stays on the server; Supabase injects it as an env var.
        if (!email.includes('@')) {
            const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
                auth: { persistSession: false },
            });

            const { data: profile } = await admin
                .from('profiles')
                .select('id')
                .eq('username', email.toLowerCase())
                .maybeSingle();

            if (!profile) return invalid();

            const { data: found } = await admin.auth.admin.getUserById(profile.id);
            if (!found?.user?.email) return invalid();

            email = found.user.email;
        }

        // --- The sign-in itself -------------------------------------------
        // Deliberately the ANON key, not the service role: we want Supabase to
        // actually verify the password. The service role could mint a session
        // without one, which would be a spectacular own goal.
        const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
            auth: { persistSession: false },
        });

        const { data, error } = await anon.auth.signInWithPassword({ email, password });
        if (error || !data.session) return invalid();

        // Only the tokens go back. No email, no user metadata, nothing the
        // caller didn't already earn by knowing the password.
        return json({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
        });
    } catch (e) {
        console.error('login failed:', e);
        return json({ error: 'Something went wrong' }, 500);
    }
});

// =============================================================================
// NOTES
//
// WHY --no-verify-jwt:
//   Edge Functions require a valid user token by default. The whole point of
//   this one is that the caller is logged OUT, so that check has to be off.
//   Being publicly callable is the reason the generic error message and the
//   "only return tokens" rule above matter.
//
// DEPLOYING WITHOUT THE CLI:
//   Supabase dashboard -> Edge Functions -> Deploy a new function -> paste this
//   file -> turn OFF "Verify JWT". SUPABASE_URL, SUPABASE_ANON_KEY and
//   SUPABASE_SERVICE_ROLE_KEY are provided automatically; you don't set them.
//
// STILL NOT PERFECT:
//   This endpoint can be hammered to guess passwords. Supabase's built-in auth
//   rate limits apply to the signInWithPassword call underneath, and enabling
//   CAPTCHA in Auth settings covers the app's own screens. A per-IP limit here
//   would be the next step if this were real.
// =============================================================================
