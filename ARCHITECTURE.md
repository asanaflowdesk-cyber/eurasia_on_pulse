# Architecture

## Frontend

`index.html` содержит только shell приложения. Логика разнесена по ES modules:

- `src/main.js` — точка входа;
- `src/app.js` — orchestration / controller;
- `src/config/*` — таблицы, словари, базовые константы;
- `src/state/store.js` — единое состояние приложения;
- `src/utils/*` — DOM, форматирование, даты, пароли;
- `src/services/*` — Supabase client, логи, admin Auth calls.

## Backend

- `supabase/schema.sql` — таблицы, индексы, RLS, seed-справочники, UI logs, DB audit triggers;
- `supabase/functions/pulse-admin-create-user` — создание Auth-пользователя админом;
- `supabase/functions/pulse-admin-reset-password` — сброс пароля админом.

## Logging

1. UI actions → `pulse_logs`.
2. DB writes → `pulse_audit_events` через triggers.

Пароли не пишутся в логи.

## Security

Frontend использует только anon key. Все операции с Auth Admin API идут через Edge Functions с service role key, хранящимся в Supabase secrets.
