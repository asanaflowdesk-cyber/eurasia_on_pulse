import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function assertAdmin(admin: ReturnType<typeof createClient>, token: string) {
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user?.email) throw new Error('Unauthorized');
  const email = userData.user.email.toLowerCase();
  const { data: profile, error } = await admin.from('pulse_profiles').select('id,email,role,is_active,can_manage_users').eq('email', email).single();
  if (error || !profile?.is_active || profile.role !== 'admin' || profile.can_manage_users !== true) throw new Error('Forbidden: admin with can_manage_users required');
  return userData.user;
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find(u => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const caller = await assertAdmin(admin, token);
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !email.includes('@')) throw new Error('Valid email is required');
    if (password.length < 10) throw new Error('Password must contain at least 10 characters');
    const user = await findUserByEmail(admin, email);
    if (!user) throw new Error('Auth user not found for this email');
    const { data, error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw error;
    await admin.from('pulse_logs').insert({ user_id: caller.id, email: caller.email, action: 'edge_admin_reset_password', entity: 'auth_user', entity_id: user.id, details: { target_email: email }, path: 'edge:pulse-admin-reset-password' });
    return json({ ok: true, auth_user_id: data.user.id, email });
  } catch (e) {
    return json({ error: e?.message || String(e) }, /Unauthorized|Forbidden/.test(String(e?.message)) ? 403 : 400);
  }
});
