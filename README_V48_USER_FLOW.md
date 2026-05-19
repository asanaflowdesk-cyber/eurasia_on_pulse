# Eurasia on Pulse v48 user flow patch

Что исправлено:

1. Edge Functions больше не используют шаблон `Hello name`.
2. `pulse-admin-create-user` создаёт/синхронизирует пользователя сразу в Supabase Auth и `pulse_profiles`.
3. `pulse-admin-reset-password` сбрасывает пароль в Supabase Auth.
4. Frontend-модалка явно передаёт реальные значения: email, password, role, data_scope, flags, allowed_hashtags.
5. Secrets читаются из `PULSE_SERVICE_ROLE_KEY`, также есть fallback на `SERVICE_ROLE_KEY` и `SUPABASE_SERVICE_ROLE_KEY`.
6. Логи пишутся в `pulse_logs`, но если таблицы нет, создание пользователя не падает.

## Supabase Secrets

В Edge Function Secrets создать:

```text
PULSE_SERVICE_ROLE_KEY = service_role key из Project Settings → API
```

`SUPABASE_URL` руками создавать не нужно, он есть в Default secrets.

## Edge Functions

В Supabase Dashboard → Edge Functions:

- `pulse-admin-create-user` → заменить `index.ts` содержимым из `supabase/functions/pulse-admin-create-user/index.ts`
- `pulse-admin-reset-password` → заменить `index.ts` содержимым из `supabase/functions/pulse-admin-reset-password/index.ts`

После вставки нажать Save/Deploy.

## Frontend

Вариант для модульного Vite:

1. Положить файл `src/features/pulse-admin-user-flow.js`.
2. В точке входа приложения импортировать его один раз:

```js
import './features/pulse-admin-user-flow.js';
```

3. Кнопка `+ пользователь` должна вызывать:

```js
openCreateUserModal()
```

4. Старую функцию `createUserFromModal` удалить или не импортировать, чтобы не было конфликта имён.

## SQL

Если таблицы логов нет — выполнить `sql/pulse_logs.sql` в Supabase SQL Editor.
