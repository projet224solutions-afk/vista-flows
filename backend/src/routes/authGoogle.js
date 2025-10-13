const express = require('express');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Env vars
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function buildGoogleAuthURL(state = '') {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

router.get('/google', (req, res) => {
  const { redirect = '/dashboard' } = req.query;
  const authUrl = buildGoogleAuthURL(encodeURIComponent(String(redirect)));
  return res.redirect(authUrl);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) return res.status(400).json({ error: 'Token exchange failed', details: tokenJson });

    const { id_token, access_token } = tokenJson;
    // Verify id_token
    const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const userInfo = await userInfoRes.json();
    if (!userInfoRes.ok) return res.status(400).json({ error: 'Userinfo failed', details: userInfo });

    const email = userInfo.email;
    const name = userInfo.name || '';
    const picture = userInfo.picture || '';

    // Upsert into Supabase public.profiles (fallback to profiles/users table names you use)
    // Try profiles by id=email hash or store by email unique
    let userRow;
    {
      const { data: exists, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;

      if (!exists) {
        const { data: created, error: insertErr } = await supabase
          .from('profiles')
          .insert({ email, first_name: name, avatar_url: picture, status: 'active' })
          .select()
          .maybeSingle();
        if (insertErr) throw insertErr;
        userRow = created;
      } else {
        const { data: updated, error: updateErr } = await supabase
          .from('profiles')
          .update({ first_name: name, avatar_url: picture })
          .eq('email', email)
          .select()
          .maybeSingle();
        if (updateErr) throw updateErr;
        userRow = updated;
      }
    }

    // Issue JWT for frontend session
    const token = jwt.sign({ sub: userRow?.id || email, email }, JWT_SECRET, { expiresIn: '7d' });
    const redirectUrl = state ? decodeURIComponent(String(state)) : '/dashboard';
    // Redirect back with token (in query for simplicity; better: set httpOnly cookie)
    return res.redirect(`${redirectUrl}?token=${encodeURIComponent(token)}`);
  } catch (e) {
    console.error('Google OAuth callback error:', e);
    return res.status(500).json({ error: 'OAuth error', details: String(e?.message || e) });
  }
});

module.exports = router;


