from pathlib import Path

code = r'''/*
  Eurasia on Pulse — user create/reset frontend flow
  Replace the whole file:
    src/features/pulse-admin-user-flow.js

  What this file does:
  - Opens a separate modal for creating a user.
  - Collects real values from explicit fields.
  - Sends email/password/display_name/rights/hashtags to Edge Function.
  - Creates/syncs Supabase Auth user + pulse_profiles through pulse-admin-create-user.
  - Resets password through pulse-admin-reset-password.
  - Exposes functions to window for old inline onclick handlers.
*/

export function generatePulsePassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

function byId(id) {
  return document.getElementById(id);
}

function val(id, fallback = "") {
  return (byId(id)?.value ?? fallback).toString().trim();
}

function checked(id, fallback = false) {
  const el = byId(id);
  return el ? Boolean(el.checked) : fallback;
}

function safeEsc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char]));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getTagRows() {
  if (Array.isArray(window.tagRows)) return window.tagRows;
  if (Array.isArray(window.__PULSE_TAG_ROWS__)) return window.__PULSE_TAG_ROWS__;
  if (Array.isArray(window.pulseState?.tagRows)) return window.pulseState.tagRows;
  return [];
}

function getSupabaseClient() {
  const client =
    window.sb ||
    window.supabaseClient ||
    window.pulseSupabase ||
    window.pulseState?.sb;

  if (!client?.functions?.invoke) {
    throw new Error("Supabase client не найден в window.sb. Проверь, что приложение экспортирует клиент в window.sb до открытия модалки.");
  }

  return client;
}

function setStatus(id, text, type = "") {
  if (typeof window.setInlineStatus === "function") {
    window.setInlineStatus(id, text, type);
    return;
  }

  const el = byId(id);
  if (el) {
    el.textContent = text;
    el.className = `inline-status ${type}`.trim();
  }
}

function toast(text, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(text, type);
    return;
  }

  console[type === "error" ? "error" : "log"](text);
}

function getAuthHeadersHint() {
  return "Если ошибка повторяется: проверь PULSE_SERVICE_ROLE_KEY в Edge Function Secrets и что функция создана в том же Supabase-проекте.";
}

function tagCheckboxesHtml() {
  return getTagRows().map((tagRow) => {
    const hashtag = safeEsc(tagRow.hashtag || tagRow.title || tagRow);
    return `<label class="check">
      <input type="checkbox" class="cu-tag" value="${hashtag}">
      ${hashtag}
    </label>`;
  }).join("");
}

export function buildCreateUserModalHtml() {
  const password = generatePulsePassword();

  return `
    <div id="create-user-modal" class="modal-wrap open" onclick="if(event.target===this) closeCreateUserModal()">
      <div class="modal user-create-modal" style="width:min(1040px,96vw)">
        <div class="modal-title" style="display:flex;justify-content:space-between;gap:12px;align-items:center">
          <span>Создать пользователя</span>
          <button class="btn" type="button" onclick="closeCreateUserModal()">×</button>
        </div>

        <form id="create-user-form" onsubmit="event.preventDefault(); createUserFromModal();">
          <div class="hint" style="margin-bottom:12px">
            Одна операция создаёт или синхронизирует пользователя в Supabase Auth и профиль доступа в pulse_profiles.
          </div>

          <div class="grid2">
            <div class="form-row">
              <label class="form-label">Email</label>
              <input id="cu-email" name="email" type="email" class="input" autocomplete="off" required>
            </div>

            <div class="form-row">
              <label class="form-label">Имя</label>
              <input id="cu-display-name" name="display_name" type="text" class="input" autocomplete="off" placeholder="Например: Alena Sacheva">
            </div>
          </div>

          <div class="grid3">
            <div class="form-row">
              <label class="form-label">Роль</label>
              <select id="cu-role" name="role" class="select">
                <option value="viewer">viewer</option>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div class="form-row">
              <label class="form-label">Видимость</label>
              <select id="cu-data-scope" name="data_scope" class="select">
                <option value="own">своё</option>
                <option value="all">всё</option>
              </select>
            </div>

            <div class="form-row">
              <label class="form-label">Активен</label>
              <select id="cu-is-active" name="is_active" class="select">
                <option value="true">да</option>
                <option value="false">нет</option>
              </select>
            </div>
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
          <div class="hint">Пустой список = доступны все. Отмеченные значения ограничивают доступ.</div>
          <div class="tag-checks" style="max-height:none;overflow:visible">
            ${tagCheckboxesHtml()}
          </div>

          <div class="hr"></div>

          <div class="grid2">
            <div class="form-row">
              <label class="form-label">Пароль</label>
              <input id="cu-password" name="password" type="text" class="input" value="${safeEsc(password)}" autocomplete="off">
            </div>

            <div class="form-row">
              <label class="form-label">Действия</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn" type="button" onclick="setGeneratedCreatePassword()">Сгенерировать</button>
                <button class="btn" type="button" onclick="copyCreatePassword()">Копировать</button>
              </div>
            </div>
          </div>

          <div class="save-line">
            <span id="cu-status" class="inline-status">Готово к созданию</span>
            <div style="display:flex;gap:8px">
              <button class="btn" type="button" onclick="closeCreateUserModal()">Отмена</button>
              <button id="cu-submit" class="btn btn-primary" type="submit">Создать пользователя</button>
            </div>
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

export function closeCreateUserModal() {
  byId("create-user-modal")?.remove();
}

export function setGeneratedCreatePassword() {
  const password = generatePulsePassword();
  const input = byId("cu-password");
  if (input) input.value = password;
}

export async function copyCreatePassword() {
  const password = val("cu-password");
  if (!password) {
    toast("Пароль пустой", "error");
    return;
  }

  await navigator.clipboard?.writeText(password);
  toast("Пароль скопирован", "ok");
}

export function collectCreateUserPayload() {
  const email = normalizeEmail(val("cu-email"));
  const displayName = val("cu-display-name");
  const password = val("cu-password") || generatePulsePassword();

  const allowedHashtags = [
    ...document.querySelectorAll("#create-user-modal .cu-tag:checked"),
  ].map((item) => item.value);

  const payload = {
    email,
    password,
    display_name: displayName || email,

    role: val("cu-role", "viewer"),
    data_scope: val("cu-data-scope", "own"),
    is_active: val("cu-is-active", "true") === "true",

    can_read_posts: checked("cu-can-read-posts", true),
    can_edit_posts: checked("cu-can-edit-posts", false),

    can_read_ideas: checked("cu-can-read-ideas", true),
    can_edit_ideas: checked("cu-can-edit-ideas", false),

    can_read_hashtags: checked("cu-can-read-hashtags", true),
    can_edit_hashtags: checked("cu-can-edit-hashtags", false),

    can_read_materials: checked("cu-can-read-materials", true),
    can_edit_materials: checked("cu-can-edit-materials", false),

    can_read_dictionaries: checked("cu-can-read-dictionaries", true),
    can_edit_dictionaries: checked("cu-can-edit-dictionaries", false),

    can_manage_users: checked("cu-can-manage-users", false),

    allowed_hashtags: allowedHashtags,
  };

  if (!payload.email) {
    throw new Error("Email обязателен.");
  }

  if (!/^\S+@\S+\.\S+$/.test(payload.email)) {
    throw new Error("Email выглядит некорректно.");
  }

  if (!payload.password || payload.password.length < 6) {
    throw new Error("Пароль должен быть не короче 6 символов.");
  }

  if (payload.display_name === payload.password) {
    throw new Error("Имя пользователя совпало с паролем. Проверь поля формы: display_name не должен быть паролем.");
  }

  return payload;
}

async function invokeAdminFunction(functionName, payload) {
  const client = getSupabaseClient();

  const redacted = {
    ...payload,
    password: payload?.password ? "***" : "",
  };

  console.info(`[Pulse admin] invoke ${functionName}`, redacted);

  const { data, error } = await client.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || String(error));
  }

  if (!data?.ok) {
    throw new Error(data?.error || `Edge Function ${functionName} вернула ошибку.`);
  }

  return data;
}

export async function createUserFromModal() {
  const submitButton = byId("cu-submit");

  try {
    const payload = collectCreateUserPayload();

    submitButton?.setAttribute("disabled", "disabled");
    setStatus("cu-status", "Создаю пользователя...", "saving");

    const data = await invokeAdminFunction("pulse-admin-create-user", payload);

    const passwordToCopy = data.password || payload.password;
    await navigator.clipboard?.writeText(passwordToCopy).catch(() => null);

    setStatus("cu-status", "Пользователь создан / синхронизирован", "ok");
    closeCreateUserModal();

    if (typeof window.loadAccess === "function") {
      await window.loadAccess();
    }

    if (typeof window.renderAccess === "function") {
      window.renderAccess();
    }

    window.dispatchEvent(new CustomEvent("pulse:user-created", {
      detail: {
        email: payload.email,
        profile: data.profile,
      },
    }));

    toast(`Пользователь ${payload.email} создан. Пароль скопирован.`, "ok");
  } catch (error) {
    console.error("createUserFromModal", error);
    const message = error?.message || String(error);
    setStatus("cu-status", `${message} ${message.includes("Edge Function") ? getAuthHeadersHint() : ""}`.trim(), "error");
    toast(message, "error");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
}

export async function resetPasswordViaEdge(email, password = generatePulsePassword()) {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    throw new Error("Email обязателен для сброса пароля.");
  }

  if (!password || password.length < 6) {
    throw new Error("Пароль должен быть не короче 6 символов.");
  }

  const data = await invokeAdminFunction("pulse-admin-reset-password", {
    email: cleanEmail,
    password,
  });

  const passwordToCopy = data.password || password;
  await navigator.clipboard?.writeText(passwordToCopy).catch(() => null);

  toast(`Пароль для ${cleanEmail} сброшен и скопирован.`, "ok");

  return data;
}

// Explicit globals for existing inline onclick handlers.
window.generatePulsePassword = generatePulsePassword;
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.createUserFromModal = createUserFromModal;
window.collectCreateUserPayload = collectCreateUserPayload;
window.setGeneratedCreatePassword = setGeneratedCreatePassword;
window.copyCreatePassword = copyCreatePassword;
window.resetPasswordViaEdge = resetPasswordViaEdge;
'''
path = Path('/mnt/data/pulse-admin-user-flow.js')
path.write_text(code, encoding='utf-8')
print(f'Created {path} ({path.stat().st_size} bytes)')
