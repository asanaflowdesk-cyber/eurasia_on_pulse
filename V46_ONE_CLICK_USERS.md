# v46 — One-click user creation

Изменение: создание пользователя из раздела «Доступы» теперь синхронизирует две сущности сразу:

1. Supabase Authentication user.
2. `public.pulse_profiles` profile/access row.

Администратору больше не нужно вручную идти в Authentication → Users.

## Как работает

- `+ пользователь` создаёт черновую карточку.
- Заполняется email, имя, роль, видимость, права.
- Пароль генерируется автоматически, если поле пустое.
- Кнопка «Создать пользователя» вызывает `pulse-admin-create-user`.
- Edge Function создаёт или обновляет Auth-пользователя, затем upsert-ит профиль доступа.

## Важно

Для работы нужен деплой Edge Function и secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

`SERVICE_ROLE_KEY` остаётся только в Supabase Secrets. Во frontend его класть нельзя.
