/*
Drop-in replacement for the user-create/reset frontend flow.
Expected globals from the app: sb, profiles, tagRows, currentUser, renderAccess, loadAccess, showToast, setInlineStatus.
If your app uses module imports instead of globals, import the functions and pass deps explicitly.
*/

export function generatePulsePassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function byId(id) { return document.getElementById(id); }
function val(id, fallback = "") { return (byId(id)?.value ?? fallback).toString().trim(); }
function checked(id, fallback = false) { const el = byId(id); return el ? !!el.checked : fallback; }
function safeEsc(s) { return String(s ?? "").replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }

function tagRowsSafe() { return Array.isArray(window.tagRows) ? window.tagRows : []; }

export function buildCreateUserModalHtml() {
  const password = generatePulsePassword();
  const tags = tagRowsSafe().map((t) => {
    const h = safeEsc(t.hashtag || t.title || t);
    return `<label class="check"><input type="checkbox" class="cu-tag" value="${h}">${h}</label>`;
  }).join("");

  return `<div id="create-user-modal" class="modal-wrap open" onclick="if(event.target===this)closeCreateUserModal()">
    <div class="modal user-create-modal" style="width:min(1040px,96vw)">
      <div class="modal-title" style="display:flex;justify-content:space-between;gap:12px;align-items:center">
        <span>Создать пользователя</span>
        <button class="btn" type="button" onclick="closeCreateUserModal()">×</button>
      </div>
      <form id="create-user-form" onsubmit="event.preventDefault(); createUserFromModal();">
        <div class="hint" style="margin-bottom:12px">Одна операция создаёт/синхронизирует пользователя в Supabase Auth и профиль доступа в pulse_profiles.</div>
        <div class="grid2">
          <div class="form-row"><label class="form-label">Email</label><input id="cu-email" name="email" type="email" class="input" autocomplete="off" required></div>
          <div class="form-row"><label class="form-label">Имя</label><input id="cu-display-name" name="display_name" class="input" autocomplete="off"></div>
        </div>
        <div class="grid3">
          <div class="form-row"><label class="form-label">Роль</label><select id="cu-role" name="role" class="select"><option value="viewer">viewer</option><option value="editor">editor</option><option value="admin">admin</option></select></div>
          <div class="form-row"><label class="form-label">Видимость</label><select id="cu-data-scope" name="data_scope" class="select"><option value="own">своё</option><option value="all">всё</option></select></div>
          <div class="form-row"><label class="form-label">Активен</label><select id="cu-is-active" name="is_active" class="select"><option value="true">да</option><option value="false">нет</option></select></div>
        </div>
        <div class="hr"></div>
        <label class="form-label">Права</label>
        <div class="perm-grid">
          <label class="check"><input id="cu-can-read-posts" type="checkbox" checked>Читать план</label>
          <label class="check"><input id="cu-can-edit-posts" type="checkbox">Редактировать план</label>
          <label class="check"><input id="cu-can-read-ideas" type="checkbox" checked>Читать идеи</label>
          <label class="check"><input id="cu-can-edit-ideas" type="checkbox">Редактировать идеи</label>
          <label class="check"><input id="cu-can-read-hashtags" type="checkbox" checked>Читать хэштеги</label>
          <label class="check"><input id="cu-can-edit-hashtags" type="checkbox">Редактировать хэштеги</label>
          <label class="check"><input id="cu-can-read-materials" type="checkbox" checked>Читать материалы</label>
          <label class="check"><input id="cu-can-edit-materials" type="checkbox">Редактировать материалы</label>
          <label class="check"><input id="cu-can-read-dictionaries" type="checkbox" checked>Читать справочники</label>
          <label class="check"><input id="cu-can-edit-dictionaries" type="checkbox">Редактировать справочники</label>
          <label class="check"><input id="cu-can-manage-users" type="checkbox">Управлять пользователями</label>
        </div>
        <div class="hr"></div>
        <label class="form-label">Доступные хэштеги</label>
        <div class="hint">Пусто = доступны все. Отмеченные значения ограничивают доступ.</div>
        <div class="tag-checks" style="max-height:none;overflow:visible">${tags}</div>
        <div class="hr"></div>
        <div class="grid2">
          <div class="form-row"><label class="form-label">Пароль</label><input id="cu-password" name="password" class="input" value="${password}"></div>
          <div class="form-row"><label class="form-label">Действия</label><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" onclick="setGeneratedCreatePassword()">Сгенерировать</button><button class="btn" type="button" onclick="copyCreatePassword()">Копировать</button></div></div>
        </div>
        <div class="save-line">
          <span id="cu-status" class="inline-status">Готово к созданию</span>
          <div style="display:flex;gap:8px"><button class="btn" type="button" onclick="closeCreateUserModal()">Отмена</button><button id="cu-submit" class="btn btn-primary" type="submit">Создать пользователя</button></div>
        </div>
      </form>
    </div>
  </div>`;
}

export function openCreateUserModal() {
  closeCreateUserModal();
  document.body.insertAdjacentHTML("beforeend", buildCreateUserModalHtml());
  byId("cu-email")?.focus();
}

export function closeCreateUserModal() { byId("create-user-modal")?.remove(); }
export function setGeneratedCreatePassword() { const p = generatePulsePassword(); if (byId("cu-password")) byId("cu-password").value = p; }
export async function copyCreatePassword() { const p = val("cu-password"); if (p) await navigator.clipboard.writeText(p); window.showToast?.("Пароль скопирован", "ok"); }

export function collectCreateUserPayload() {
  const email = val("cu-email").toLowerCase();
  const password = val("cu-password") || generatePulsePassword();
  const allowed_hashtags = [...document.querySelectorAll("#create-user-modal .cu-tag:checked")].map((x) => x.value);
  const payload = {
    email,
    password,
    display_name: val("cu-display-name") || email,
    role: val("cu-role", "viewer"),
    data_scope: val("cu-data-scope", "own"),
    is_active: val("cu-is-active", "true") === "true",
    can_read_posts: checked("cu-can-read-posts", true),
    can_edit_posts: checked("cu-can-edit-posts"),
    can_read_ideas: checked("cu-can-read-ideas", true),
    can_edit_ideas: checked("cu-can-edit-ideas"),
    can_read_hashtags: checked("cu-can-read-hashtags", true),
    can_edit_hashtags: checked("cu-can-edit-hashtags"),
    can_read_materials: checked("cu-can-read-materials", true),
    can_edit_materials: checked("cu-can-edit-materials"),
    can_read_dictionaries: checked("cu-can-read-dictionaries", true),
    can_edit_dictionaries: checked("cu-can-edit-dictionaries"),
    can_manage_users: checked("cu-can-manage-users"),
    allowed_hashtags,
  };
  if (!payload.email) throw new Error("Email обязателен.");
  if (!/^\S+@\S+\.\S+$/.test(payload.email)) throw new Error("Email выглядит некорректно.");
  if (!payload.password || payload.password.length < 6) throw new Error("Пароль должен быть не короче 6 символов.");
  return payload;
}

async function invokeAdminFunction(name, payload) {
  if (!window.sb?.functions?.invoke) throw new Error("Supabase client не инициализирован.");
  const redacted = { ...payload, password: payload?.password ? "***" : "" };
  console.info(`[Pulse admin] invoke ${name}`, redacted);
  const { data, error } = await window.sb.functions.invoke(name, { body: payload });
  if (error) throw new Error(error.message || String(error));
  if (!data?.ok) throw new Error(data?.error || `Edge Function ${name} вернула ошибку.`);
  return data;
}

export async function createUserFromModal() {
  try {
    const payload = collectCreateUserPayload();
    byId("cu-submit")?.setAttribute("disabled", "disabled");
    window.setInlineStatus?.("cu-status", "Создаю пользователя...", "saving");
    const data = await invokeAdminFunction("pulse-admin-create-user", payload);
    window.setInlineStatus?.("cu-status", "Пользователь создан / синхронизирован", "ok");
    await window.navigator.clipboard?.writeText(data.password || payload.password).catch(() => null);
    closeCreateUserModal();
    if (typeof window.loadAccess === "function") await window.loadAccess();
    if (typeof window.renderAccess === "function") window.renderAccess();
    window.showToast?.(`Пользователь ${payload.email} создан. Пароль скопирован.`, "ok");
  } catch (e) {
    console.error("createUserFromModal", e);
    window.setInlineStatus?.("cu-status", e.message || String(e), "error");
    window.showToast?.(e.message || String(e), "error");
  } finally {
    byId("cu-submit")?.removeAttribute("disabled");
  }
}

export async function resetPasswordViaEdge(email, password = generatePulsePassword()) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) throw new Error("Email обязателен для сброса пароля.");
  const data = await invokeAdminFunction("pulse-admin-reset-password", { email: cleanEmail, password });
  await window.navigator.clipboard?.writeText(data.password || password).catch(() => null);
  window.showToast?.(`Пароль для ${cleanEmail} сброшен и скопирован.`, "ok");
  return data;
}

// expose for old inline onclick handlers
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.createUserFromModal = createUserFromModal;
window.setGeneratedCreatePassword = setGeneratedCreatePassword;
window.copyCreatePassword = copyCreatePassword;
window.resetPasswordViaEdge = resetPasswordViaEdge;
