import { boot } from './app.js';
import { $ } from './utils/dom.js';
import { logError } from './services/logs.js';

boot().catch(async error => {
  await logError(error, 'boot');
  const app = $('#appView');
  const auth = $('#authView');
  if (app) app.classList.add('hidden');
  if (auth) auth.classList.remove('hidden');
  const msg = $('#authMessage');
  if (msg) msg.textContent = error.message || String(error);
  const sync = $('#syncStatus');
  if (sync) { sync.textContent = 'ошибка'; sync.className = 'sync error'; }
});
