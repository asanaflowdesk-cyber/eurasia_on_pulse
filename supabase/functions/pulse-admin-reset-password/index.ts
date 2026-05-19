import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function str(v: unknown): string { return String(v ?? "").trim(); }
function normalizeEmail(v: unknown): string { return str(v).toLowerCase(); }
function randomPassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}
function getServiceRoleKey(): string {
  return str(Deno.env.get("PULSE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
}
async function findAuthUserByEmail(admin: any, email: string) {
  let page = 1;
  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const user = data.users.find((u: any) => normalizeEmail(u.email) === email);
    if (user) return user;
    if (!data.users.length || data.users.length < 1000) return null;
    page += 1;
  }
  return null;
}
async function requireAdmin(admin: any, authHeader: string | null) {
  if (!authHeader) throw new Error("Нет Authorization header. Войдите в приложение заново.");
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData?.user?.email) throw new Error("Не удалось проверить текущего пользователя.");
  const requesterEmail = normalizeEmail(userData.user.email);
  const { data: profile, error } = await admin
    .from("pulse_profiles")
    .select("id,email,role,is_active,can_manage_users")
    .ilike("email", requesterEmail)
    .maybeSingle();
  if (error) throw error;
  if (!profile?.is_active) throw new Error("Текущий пользователь неактивен в pulse_profiles.");
  if (!(profile.role === "admin" || profile.can_manage_users === true)) throw new Error("Нет права управлять пользователями.");
  return { user: userData.user, profile };
}
async function safeLog(admin: any, payload: Record<string, unknown>) {
  try {
    await admin.from("pulse_logs").insert({
      action: payload.action || "admin_password_reset",
      entity: "auth.users",
      entity_id: payload.entity_id ? String(payload.entity_id) : null,
      email: payload.email ? String(payload.email) : null,
      user_id: payload.user_id || null,
      details: payload.details || {},
      path: "edge:pulse-admin-reset-password",
      created_at: new Date().toISOString(),
    });
  } catch (_) {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = str(Deno.env.get("SUPABASE_URL"));
    const serviceRoleKey = getServiceRoleKey();
    if (!supabaseUrl) throw new Error("Не найден SUPABASE_URL в Edge Function env.");
    if (!serviceRoleKey) throw new Error("Не найден PULSE_SERVICE_ROLE_KEY / SERVICE_ROLE_KEY в Edge Function Secrets.");
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const requester = await requireAdmin(admin, req.headers.get("Authorization"));

    const body = await req.json().catch(() => ({}));
    const raw = body?.profile || body?.user || body?.payload || body;
    const email = normalizeEmail(raw.email || raw.user_email || raw.userEmail || raw.login);
    const password = str(raw.password || raw.new_password || raw.newPassword) || randomPassword();
    if (!email) throw new Error("Email обязателен. Frontend прислал пустой email в payload.");
    if (password.length < 6) throw new Error("Пароль должен быть не короче 6 символов.");

    const authUser = await findAuthUserByEmail(admin, email);
    if (!authUser) throw new Error(`Пользователь ${email} не найден в Supabase Auth.`);

    const { data, error } = await admin.auth.admin.updateUserById(authUser.id, { password });
    if (error) throw error;

    await admin.from("pulse_profiles").update({ updated_at: new Date().toISOString() }).ilike("email", email);
    await safeLog(admin, { action: "admin_password_reset", email, entity_id: data.user.id, user_id: requester.user.id, details: {} });

    return json({ ok: true, user: { id: data.user.id, email: data.user.email }, password });
  } catch (error) {
    return json({ ok: false, error: error?.message || String(error) }, 400);
  }
});
