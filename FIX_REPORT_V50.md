# Eurasia on Pulse v50 — inspection and repair report

## Fixed build blockers
- Removed accidental Python text from `src/features/pulse-admin-user-flow.js`.
- Replaced broken `async async function` declarations in `src/app.js`.
- Verified `npm run check` passes.
- Verified `npm run build` passes.

## Fixed user creation/login flow
- `src/app.js` now sends the generated password both inside `profile` and as top-level `password` to the Edge Function.
- `supabase/functions/pulse-admin-create-user/index.ts` now reads password from either `profile.password` or top-level `body.password`.
- This fixes the case where Auth user was created with a different/random password while the UI showed another one.

## Fixed permissions model
- Frontend now treats rights literally:
  - `can_read_*` = user can see the section/data.
  - `can_edit_*` = user can create/save/delete, only if matching `can_read_*` is true.
- Materials, hashtags and dictionaries are rendered readonly when user only has read rights.
- Save/delete/create handlers guard actions, not only buttons.
- User access payload forcibly clears `edit` when corresponding `read` is false.

## Fixed database protection
- Added `sql/pulse_strict_permissions_rls.sql`.
- Appended the same strict RLS patch into `supabase/schema.sql`.
- Policies now enforce: edit requires read + edit.

## Edge Function secrets
Use one of these custom secrets in Supabase Edge Functions:
- `PULSE_SERVICE_ROLE_KEY` preferred.
- `SERVICE_ROLE_KEY` fallback.

Do not use a custom secret name starting with `SUPABASE_`; Supabase Dashboard rejects that prefix.
