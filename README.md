# Eurasia on Pulse — production modular app v37

Полноценная модульная версия приложения для контент-плана Eurasia on Pulse.

## Что внутри

- чистый логин: только email + пароль;
- управление постами, календарём, банком идей;
- материалы и ссылки;
- справочники и хэштеги;
- доступы, роли и ограничения по хэштегам;
- создание Auth-пользователя администратором через Edge Function;
- генерация пароля и сброс пароля через Edge Function;
- Excel-выгрузка с фильтрами и preview 20 строк;
- UI-логи в `pulse_logs`;
- DB-аудит всех INSERT/UPDATE/DELETE по ключевым таблицам в `pulse_audit_events`;
- RLS-политики в Supabase.

## Настройка

1. Выполнить SQL:

```sql
supabase/schema.sql
```

2. Заполнить `public/runtime-config.js`:

```js
window.PULSE_CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
};
```

3. Убедиться, что пользователь создан в Supabase Auth и есть в `pulse_profiles` с ролью `admin`.

4. Задеплоить Edge Functions:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
supabase functions deploy pulse-admin-create-user
supabase functions deploy pulse-admin-reset-password
```

`SERVICE_ROLE_KEY` нельзя класть во frontend, GitHub или `runtime-config.js`.

## Локальный запуск

Статически:

```bash
python -m http.server 5173
```

Или через Vite:

```bash
npm install
npm run dev
```

## Деплой на Vercel

```bash
npm install
npm run build
```

`vercel.json` настроен на Vite: output `dist`.

## Контроль версии

В шапке приложения должна быть метка:

```text
v38-runtime-public
```

Если её нет — открыт старый файл или старый деплой.


## v46: создание пользователя одной кнопкой

В разделе «Доступы» кнопка «Создать пользователя» вызывает Edge Function `pulse-admin-create-user`.
Она за один раз создаёт/обновляет пользователя в Supabase Auth и сохраняет профиль прав в `pulse_profiles`.
Если это новый пользователь, отдельное создание в Authentication больше не требуется.

Условия работы:
- Edge Function `pulse-admin-create-user` должна быть задеплоена.
- В Supabase Edge Function Secrets должны быть `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`.
- Администратор должен иметь `role = admin` или `can_manage_users = true`.

Кнопка «Сохранить доступ» для новой карточки теперь тоже создаёт пользователя полностью, а не только строку профиля.
Для существующего пользователя она меняет только права доступа.
