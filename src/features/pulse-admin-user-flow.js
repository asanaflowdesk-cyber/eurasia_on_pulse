/*
  Compatibility helpers for old inline user-admin calls.
  The active application flow lives in src/app.js. This file stays valid JS so Vite can build,
  and exposes safe fallbacks if an older template calls window.openCreateUserModal().
*/

export function generatePulsePassword(length = 14) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join("");
}

function notify(message, type = "info") {
  if (typeof window.showToast === "function") window.showToast(message, type);
  else console[type === "error" ? "error" : "log"](message);
}

export function openCreateUserModal() {
  notify("Создание пользователя открывается из вкладки «Доступы». Используй кнопку «+ пользователь» в таблице пользователей.", "info");
}

export function closeCreateUserModal() {
  document.getElementById("create-user-modal")?.remove();
}

export async function createUserFromModal() {
  notify("Старая createUserFromModal отключена. Актуальная логика находится в src/app.js.", "error");
}

export async function resetPasswordViaEdge() {
  notify("Сброс пароля выполняется из карточки доступа пользователя.", "info");
}

window.generatePulsePassword = generatePulsePassword;
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.createUserFromModal = createUserFromModal;
window.resetPasswordViaEdge = resetPasswordViaEdge;
