import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function pickProfile(input: Record<string, unknown>) {
  const bool = (v: unknown, fallback = false) => typeof v === 'boolean' ? v : fallback;
  const text = (v: unknown, fallback = '') => typeof v === 'string' ? v : fallback;
  const allowed = Array.isArray(input.allowed_hashtags) ? input.allowed_hashtags.filter(x => typeof x === 'string') : [];
  return {
    email: text(input.email).trim().toLowerCase(),
    display_name: text(input.display_name),
    role: ['admin', 'editor', 'viewer'].includes(text(input.role)) ? text(input.role) : 'viewer',
    data_scope: ['own', 'all'].includes(text(input.data_scope)) ? text(input.data_scope) : 'own',
    is_active: bool(input.is_active, true),
    can_manage_users: bool(input.can_manage_users),
    can_read_posts: bool(input.can_read_posts, true),
    can_edit_posts: bool(input.can_edit_posts),
    can_read_ideas: bool(input.can_read_ideas, true),
    can_edit_ideas: bool(input.can_edit_ideas),
    can_read_hashtags: bool(input.can_read_hashtags, true),
    can_edit_hashtags: bool(input.can_edit_hashtags),
    can_read_materials: bool(input.can_read_materials, true),
    can_edit_materials: bool(input.can_edit_materials),
    can_read_dictionaries: bool(input.can_read_dictionaries, true),
    can_edit_dictionaries: bool(input.can_edit_dictionaries),
    allowed_hashtags: allowed,
    updated_at: new Date().toISOString(),
  };
}

async function assertAdmin(admin: ReturnType<typeof createClient>, token: string) {
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError) {
    const msg = String(userError.message || userError);
    if (msg.toLowerCase().includes('invalid credentials')) {
      throw new Error('Invalid credentials: проверь SUPABASE_SERVICE_ROLE_KEY в Edge Function Secrets и что функция создана в том же Supabase-проекте, что frontend.');
    }
    throw new Error(`Unauthorized: ${msg}`);
  }
  if (!userData.user?.email) throw new Error('Unauthorized: active user session was not found');
  const email = userData.user.email.toLowerCase();
  const { data: profile, error } = await admin.from('pulse_profiles').select('id,email,role,is_active,can_manage_users').eq('email', email).single();
  if (error || !profile?.is_active || (profile.role !== 'admin' && profile.can_manage_users !== true)) throw new Error('Forbidden: admin role or can_manage_users required');
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
    const profile = pickProfile(body.profile || {});
    const password = String(body.password || '');
    if (!profile.email || !profile.email.includes('@')) throw new Error('Valid email is required');
    if (password.length < 10) throw new Error('Password must contain at least 10 characters');

    const existing = await findUserByEmail(admin, profile.email);
    let mode = 'created_auth_user';
    let authUserId = '';
    if (existing) {
      const { data, error } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true, user_metadata: { display_name: profile.display_name } });
      if (error) throw error;
      authUserId = data.user.id;
      mode = 'updated_existing_auth_user';
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email: profile.email, password, email_confirm: true, user_metadata: { display_name: profile.display_name } });
      if (error) throw error;
      authUserId = data.user.id;
    }

    const { data: savedProfile, error: profileError } = await admin.from('pulse_profiles').upsert(profile, { onConflict: 'email' }).select('*').single();
    if (profileError) throw profileError;

    await admin.from('pulse_logs').insert({ user_id: caller.id, email: caller.email, action: 'edge_admin_create_user', entity: 'profile', entity_id: savedProfile.id, details: { target_email: profile.email, auth_user_id: authUserId, mode }, path: 'edge:pulse-admin-create-user' });
    return json({ ok: true, mode, auth_user_id: authUserId, profile: savedProfile });
  } catch (e) {
    return json({ error: e?.message || String(e) }, /Unauthorized|Forbidden/.test(String(e?.message)) ? 403 : 400);
  }
});
