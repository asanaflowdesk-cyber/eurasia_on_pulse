# Fix notes v38-runtime-public

Что исправлено в этом архиве:

1. Runtime config перенесён из `src/config/runtime-config.js` в `public/runtime-config.js`.
   Причина: Vite не обязан отдавать `src/config/runtime-config.js` как статический файл после сборки. Файлы, которые должны быть доступны напрямую в браузере, должны лежать в `public`.

2. `index.html` теперь подключает конфиг так:

```html
<script src="/runtime-config.js"></script>
<script type="module" src="/src/main.js"></script>
```

3. Старый `src/config/runtime-config.js` удалён, чтобы не было двух источников правды.

4. Сообщение об ошибке конфигурации теперь указывает на `public/runtime-config.js`.

5. Если у пользователя нет профиля доступа или ошибка при загрузке приложения, экран логина остаётся видимым, а ошибка выводится в `authMessage`.

6. Право управления пользователями теперь работает, если профиль имеет `role='admin'` **или** `can_manage_users=true`. То же изменение внесено в SQL и Edge Functions.

Проверка:

```bash
npm run check
```

JS-синтаксис проходит проверку.

После деплоя проверить в браузере:

```js
window.PULSE_CONFIG
```

Должен быть объект с `SUPABASE_URL` и `SUPABASE_ANON_KEY`.

В Network должен быть запрос `/runtime-config.js` со статусом `200`.
