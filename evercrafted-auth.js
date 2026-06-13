/* Evercrafted Auth — the shared client-side Supabase session layer.
   One <script src="/assets/supabase.js"> + one <script src="/evercrafted-auth.js">
   gives every page `window.ECAuth`: a single Supabase client whose session the
   tier-gate already reads (sb-*-auth-token), plus magic-link sign-in helpers.

   NOTE: the only thing kept client-side is the Supabase *session token* (the auth
   credential itself — the cookie equivalent). All app/business data persists in
   Supabase tables server-side, never localStorage. */
(function (w) {
  var URL = 'https://qybnmlqesnbmgxayhllf.supabase.co';
  var KEY = 'sb_publishable_ujWoFN8yhSJtAuSm2t4TiA_vcVtzKJF';
  var sb = null;
  function client() {
    if (sb) return sb;
    if (!w.supabase || !w.supabase.createClient) return null;
    sb = w.supabase.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    return sb;
  }

  w.ECAuth = {
    client: client,
    // Send a magic link. `redirect` is where Supabase returns the user after they click.
    signIn: function (email, redirect) {
      var c = client(); if (!c) return Promise.reject(new Error('auth unavailable'));
      return c.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: redirect || (w.location.origin + '/evercrafted-account.html') },
      });
    },
    // Current user (or null). Resolves the session Supabase already restored.
    user: function () {
      var c = client(); if (!c) return Promise.resolve(null);
      return c.auth.getUser().then(function (r) { return (r && r.data && r.data.user) || null; }).catch(function () { return null; });
    },
    // The access token — same one the tier-gate reads, exposed for API calls.
    token: function () {
      var c = client(); if (!c) return Promise.resolve('');
      return c.auth.getSession().then(function (r) { return (r && r.data && r.data.session && r.data.session.access_token) || ''; }).catch(function () { return ''; });
    },
    signOut: function () {
      var c = client(); if (!c) return Promise.resolve();
      return c.auth.signOut();
    },
    // React to sign-in / sign-out without polling.
    onChange: function (cb) {
      var c = client(); if (!c) return;
      c.auth.onAuthStateChange(function (_e, session) { cb(session ? session.user : null, session); });
    },
  };
})(window);
