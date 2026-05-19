create table if not exists public.pulse_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  path text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists pulse_logs_created_idx on public.pulse_logs(created_at desc);
create index if not exists pulse_logs_user_idx on public.pulse_logs(user_id, created_at desc);
create index if not exists pulse_logs_action_idx on public.pulse_logs(action, created_at desc);

alter table public.pulse_logs enable row level security;
grant select, insert on public.pulse_logs to authenticated;

drop policy if exists pulse_logs_insert_own on public.pulse_logs;
create policy pulse_logs_insert_own
on public.pulse_logs
for insert
to authenticated
with check (auth.uid() = user_id or user_id is null);

drop policy if exists pulse_logs_select_admin on public.pulse_logs;
create policy pulse_logs_select_admin
on public.pulse_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.pulse_profiles p
    where lower(p.email) = lower(auth.jwt() ->> 'email')
      and p.is_active = true
      and (p.role = 'admin' or p.can_manage_users = true)
  )
);
