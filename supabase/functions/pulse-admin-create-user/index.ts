import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeEmail(v: unknown): string {
  return str(v).toLowerCase();
}

function bool(v: unknown, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const x = v.toLowerCase().trim();
    if (["true", "1", "yes", "да", "on"].includes(x)) return true;
    if (["false", "0", "no", "нет", "off"].includes(x)) return false;
  }
  if (typeof v === "number") return v !== 0;
  return fallback;
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === "string") {
    if (!v.trim()) return [];
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    } catch (_) {
      return v.split(/[;,\n]/).map((x) => x.trim()).filter(Boolean);
    }
  }
  return [];
}

function pick(source: Record<string, unknown>, keys: string[], fallback?: unknown): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null && source[key] !== "") return source[key];
  }
  return fallback;
}

function randomPassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function getServiceRoleKey(): string {
  return str(
    Deno.env.get("PULSE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );
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
  if (!(profile.role === "admin" || profile.can_manage_users === true)) {
    throw new Error("Нет права управлять пользователями.");
  }
  return { user: userData.user, profile };
}

async function safeLog(admin: any, payload: Record<string, unknown>) {
  try {
    await admin.from("pulse_logs").insert({
      action: payload.action || "admin_user_create",
      entity: "pulse_profiles",
      entity_id: payload.entity_id ? String(payload.entity_id) : null,
      email: payload.email ? String(payload.email) : null,
      user_id: payload.user_id || null,
      details: payload.details || {},
      path: "edge:pulse-admin-create-user",
      created_at: new Date().toISOString(),
    });
  } catch (_) {
    // logs are desirable, but user management must not fail because pulse_logs is missing
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = str(Deno.env.get("SUPABASE_URL"));
    const serviceRoleKey = getServiceRoleKey();
    if (!supabaseUrl) throw new Error("Не найден SUPABASE_URL в Edge Function env.");
    if (!serviceRoleKey) throw new Error("Не найден PULSE_SERVICE_ROLE_KEY / SERVICE_ROLE_KEY в Edge Function Secrets.");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const requester = await requireAdmin(admin, req.headers.get("Authorization"));
    const body = await req.json().catch(() => ({}));
    const raw = (body?.profile || body?.user || body?.payload || body) as Record<string, unknown>;

    const email = normalizeEmail(pick(raw, ["email", "user_email", "userEmail", "login"]));
    const displayName = str(pick(raw, ["display_name", "displayName", "name", "full_name", "fullName"], email));
    const password = str(pick(raw, ["password", "new_password", "newPassword"])) || randomPassword();

    if (!email) throw new Error("Email обязателен. Frontend прислал пустой email в payload.");
    if (password.length < 6) throw new Error("Пароль должен быть не короче 6 символов.");

    let authUser = await findAuthUserByEmail(admin, email);
    if (!authUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (error) throw error;
      authUser = data.user;
    } else {
      const { data, error } = await admin.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName || authUser.user_metadata?.display_name || "" },
      });
      if (error) throw error;
      authUser = data.user;
    }

    const profilePayload = {
      email,
      display_name: displayName || email,
      role: str(pick(raw, ["role"], "viewer")) || "viewer",
      data_scope: str(pick(raw, ["data_scope", "dataScope", "scope"], "own")) || "own",
      is_active: bool(pick(raw, ["is_active", "isActive", "active"], true), true),
      can_manage_users: bool(pick(raw, ["can_manage_users", "canManageUsers", "manage_users"], false)),
      can_read_posts: bool(pick(raw, ["can_read_posts", "canReadPosts", "read_posts"], true), true),
      can_edit_posts: bool(pick(raw, ["can_edit_posts", "canEditPosts", "edit_posts"], false)),
      can_read_ideas: bool(pick(raw, ["can_read_ideas", "canReadIdeas", "read_ideas"], true), true),
      can_edit_ideas: bool(pick(raw, ["can_edit_ideas", "canEditIdeas", "edit_ideas"], false)),
      can_read_hashtags: bool(pick(raw, ["can_read_hashtags", "canReadHashtags", "read_hashtags"], true), true),
      can_edit_hashtags: bool(pick(raw, ["can_edit_hashtags", "canEditHashtags", "edit_hashtags"], false)),
      can_read_materials: bool(pick(raw, ["can_read_materials", "canReadMaterials", "read_materials"], true), true),
      can_edit_materials: bool(pick(raw, ["can_edit_materials", "canEditMaterials", "edit_materials"], false)),
      can_read_dictionaries: bool(pick(raw, ["can_read_dictionaries", "canReadDictionaries", "read_dictionaries"], true), true),
      can_edit_dictionaries: bool(pick(raw, ["can_edit_dictionaries", "canEditDictionaries", "edit_dictionaries"], false)),
      allowed_hashtags: arr(pick(raw, ["allowed_hashtags", "allowedHashtags", "hashtags", "tags"], [])),
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: upsertError } = await admin
      .from("pulse_profiles")
      .upsert(profilePayload, { onConflict: "email" })
      .select("*")
      .single();
    if (upsertError) throw upsertError;

    await safeLog(admin, {
      action: "admin_user_create_or_sync",
      email,
      entity_id: profile?.id,
      user_id: requester.user.id,
      details: { auth_user_id: authUser.id, role: profilePayload.role, data_scope: profilePayload.data_scope },
    });

    return json({ ok: true, user: { id: authUser.id, email: authUser.email }, profile, password });
  } catch (error) {
    return json({ ok: false, error: error?.message || String(error) }, 400);
  }
});
