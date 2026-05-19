-- Eurasia on Pulse v5 — доступы, справочники, материалы, исправление календаря на уровне приложения
-- Выполнять в Supabase SQL Editor в том же проекте, URL которого подключён в приложении.
-- Скрипт идемпотентный: можно запускать поверх v4.

create extension if not exists pgcrypto;

create table if not exists public.pulse_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_no integer default 1,
  post_date date,
  day_name text,
  slot text default 'morning',
  slot_order integer default 1,
  block text default 'help',
  hashtag text,
  topic text not null,
  goal text,
  format text,
  cta text,
  audience text,
  status text default 'idea',
  owner text,
  content_text text default '',
  notes text default '',
  is_deleted boolean default false,
  sort_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulse_profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text default '',
  role text not null default 'viewer' check (role in ('admin','editor','viewer')),
  data_scope text not null default 'own' check (data_scope in ('own','all')),
  is_active boolean not null default true,
  can_manage_users boolean not null default false,
  can_read_posts boolean not null default true,
  can_edit_posts boolean not null default false,
  can_read_ideas boolean not null default true,
  can_edit_ideas boolean not null default false,
  can_read_hashtags boolean not null default true,
  can_edit_hashtags boolean not null default false,
  allowed_hashtags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pulse_profiles add column if not exists can_read_materials boolean not null default true;
alter table public.pulse_profiles add column if not exists can_edit_materials boolean not null default false;
alter table public.pulse_profiles add column if not exists can_read_dictionaries boolean not null default true;
alter table public.pulse_profiles add column if not exists can_edit_dictionaries boolean not null default false;

create table if not exists public.pulse_hashtags (
  id uuid primary key default gen_random_uuid(),
  block text not null,
  hashtag text unique not null,
  title text default '',
  description text default '',
  color_hex text default '#1f5f5b',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulse_dictionary_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  item_key text not null,
  label text not null,
  description text default '',
  color_hex text default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category, item_key)
);


alter table public.pulse_hashtags add column if not exists color_hex text default '#1f5f5b';
alter table public.pulse_dictionary_items add column if not exists color_hex text default '';

create table if not exists public.pulse_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.pulse_posts(id) on delete set null,
  material_type text not null default 'link',
  title text default '',
  url text default '',
  description text default '',
  owner text default '',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pulse_posts_user_date_idx on public.pulse_posts(user_id, post_date, slot_order);
create index if not exists pulse_posts_user_status_idx on public.pulse_posts(user_id, status);
create index if not exists pulse_posts_user_block_idx on public.pulse_posts(user_id, block);
create index if not exists pulse_posts_hashtag_idx on public.pulse_posts(hashtag);
create index if not exists pulse_profiles_email_idx on public.pulse_profiles(lower(email));
create index if not exists pulse_hashtags_block_idx on public.pulse_hashtags(block, sort_order);
create index if not exists pulse_dict_cat_idx on public.pulse_dictionary_items(category, sort_order);
create index if not exists pulse_materials_user_idx on public.pulse_materials(user_id, created_at desc);
create index if not exists pulse_materials_post_idx on public.pulse_materials(post_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pulse_posts_set_updated_at on public.pulse_posts;
create trigger pulse_posts_set_updated_at before update on public.pulse_posts for each row execute function public.set_updated_at();
drop trigger if exists pulse_profiles_set_updated_at on public.pulse_profiles;
create trigger pulse_profiles_set_updated_at before update on public.pulse_profiles for each row execute function public.set_updated_at();
drop trigger if exists pulse_hashtags_set_updated_at on public.pulse_hashtags;
create trigger pulse_hashtags_set_updated_at before update on public.pulse_hashtags for each row execute function public.set_updated_at();
drop trigger if exists pulse_dictionary_items_set_updated_at on public.pulse_dictionary_items;
create trigger pulse_dictionary_items_set_updated_at before update on public.pulse_dictionary_items for each row execute function public.set_updated_at();
drop trigger if exists pulse_materials_set_updated_at on public.pulse_materials;
create trigger pulse_materials_set_updated_at before update on public.pulse_materials for each row execute function public.set_updated_at();

insert into public.pulse_hashtags(block, hashtag, title, sort_order) values
('help','#лайфхак','#лайфхак',10),('help','#FAQ','#FAQ',20),('help','#разбор','#разбор',30),
('situations','#рабочая_ситуация','#рабочая_ситуация',40),('situations','#кейс','#кейс',50),('situations','#как_решили','#как_решили',60),
('results','#результаты','#результаты',70),('results','#доска_почёта','#доска_почёта',80),
('people','#интервью','#интервью',90),('people','#день_открытых_дверей','#день_открытых_дверей',100),('people','#пульс_филиала','#пульс_филиала',110),
('engage','#вопрос_недели','#вопрос_недели',120),('engage','#конкурс','#конкурс',130),('engage','#голосование','#голосование',140),('engage','#битва_филиалов','#битва_филиалов',150),
('news','#анонс','#анонс',160),('news','#новость','#новость',170),('news','#обновление','#обновление',180),
('humor','#шутка_дня','#шутка_дня',190),('humor','#будни_куратора','#будни_куратора',200),('humor','#менеджер_поймет','#менеджер_поймет',210)
on conflict (hashtag) do update set block=excluded.block, title=excluded.title, sort_order=excluded.sort_order;

insert into public.pulse_dictionary_items(category, item_key, label, sort_order) values
('block','help','Общее / помощь',10),('block','situations','Рабочие ситуации',20),('block','results','Результаты',30),('block','people','Люди и филиалы',40),('block','engage','Вовлечение',50),('block','news','Новости',60),('block','humor','Лёгкий юмор',70),
('slot','morning','Утро',10),('slot','day','День',20),('slot','evening','Вечер',30),('slot','extra1','Доп. 1',40),('slot','extra2','Доп. 2',50),('slot','extra3','Доп. 3',60),('slot','extra4','Доп. 4',70),
('status','idea','Идея',10),('status','draft','Черновик',20),('status','ready','Готово',30),('status','published','Опубликовано',40),('status','review','На разбор',50),
('format','текст','Текст',10),('format','карточка','Карточка',20),('format','опрос','Опрос',30),('format','мем','Мем',40),('format','видео','Видео',50),('format','интервью','Интервью',60),('format','чеклист','Чеклист',70),('format','разбор','Разбор',80),('format','мини-кейс','Мини-кейс',90),
('audience','менеджеры','Менеджеры',10),('audience','кураторы','Кураторы',20),('audience','директора филиалов','Директора филиалов',30),('audience','все участники канала','Все участники канала',40),('audience','шеф / руководство','Шеф / руководство',50),
('material_type','link','Ссылка',10),('material_type','image','Картинка',20),('material_type','document','Документ',30),('material_type','video','Видео',40),('material_type','presentation','Презентация',50),('material_type','spreadsheet','Таблица',60)
on conflict (category, item_key) do update set label=excluded.label, sort_order=excluded.sort_order;

create or replace function public.pulse_current_email()
returns text
language sql stable
as $$ select lower(coalesce(auth.jwt() ->> 'email','')) $$;

create or replace function public.pulse_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active = true
      and p.role = 'admin'
  );
$$;

create or replace function public.pulse_can_manage_users()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active = true
      and (p.role = 'admin' or p.can_manage_users = true)
  );
$$;

create or replace function public.pulse_tag_allowed(arr text[], tag text)
returns boolean
language sql immutable
as $$
  select coalesce(array_length(arr,1),0)=0 or tag is null or tag = any(arr);
$$;

create or replace function public.pulse_can_read_post(row_owner uuid, tag text, row_date date, row_status text, row_week integer)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare p public.pulse_profiles%rowtype; is_idea boolean;
begin
  select * into p from public.pulse_profiles where lower(email)=public.pulse_current_email() limit 1;
  if not found or not p.is_active then return false; end if;
  if p.role='admin' then return true; end if;
  is_idea := row_date is null or (row_status='idea' and coalesce(row_week,0)>3);
  if is_idea and not p.can_read_ideas then return false; end if;
  if not is_idea and not p.can_read_posts then return false; end if;
  if p.data_scope='own' and row_owner <> auth.uid() then return false; end if;
  if not public.pulse_tag_allowed(p.allowed_hashtags, tag) then return false; end if;
  return true;
end;
$$;

create or replace function public.pulse_can_edit_post(row_owner uuid, tag text, row_date date, row_status text, row_week integer)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare p public.pulse_profiles%rowtype; is_idea boolean;
begin
  select * into p from public.pulse_profiles where lower(email)=public.pulse_current_email() limit 1;
  if not found or not p.is_active then return false; end if;
  if p.role='admin' then return true; end if;
  is_idea := row_date is null or (row_status='idea' and coalesce(row_week,0)>3);
  if is_idea and not p.can_edit_ideas then return false; end if;
  if not is_idea and not p.can_edit_posts then return false; end if;
  if p.data_scope='own' and row_owner <> auth.uid() then return false; end if;
  if not public.pulse_tag_allowed(p.allowed_hashtags, tag) then return false; end if;
  return true;
end;
$$;

create or replace function public.pulse_bootstrap_admin()
returns void
language plpgsql security definer
set search_path = public
as $$
declare email text;
begin
  email := public.pulse_current_email();
  if email is null or email='' then raise exception 'No authenticated email'; end if;
  if exists(select 1 from public.pulse_profiles) then raise exception 'Bootstrap is allowed only while pulse_profiles is empty'; end if;
  insert into public.pulse_profiles(
    email, display_name, role, data_scope, is_active, can_manage_users,
    can_read_posts, can_edit_posts, can_read_ideas, can_edit_ideas, can_read_hashtags, can_edit_hashtags,
    can_read_materials, can_edit_materials, can_read_dictionaries, can_edit_dictionaries, allowed_hashtags
  ) values (email, email, 'admin', 'all', true, true, true, true, true, true, true, true, true, true, true, true, '{}');
end;
$$;

grant execute on function public.pulse_bootstrap_admin() to authenticated;
grant select, insert, update, delete on public.pulse_posts to authenticated;
grant select, insert, update, delete on public.pulse_profiles to authenticated;

update public.pulse_dictionary_items set color_hex = case item_key
  when 'help' then '#1a4d8f'
  when 'situations' then '#8a5a16'
  when 'results' then '#1a6b3a'
  when 'people' then '#4a1a7a'
  when 'engage' then '#8f1a1a'
  when 'news' then '#34495e'
  when 'humor' then '#7a1a65'
  when 'idea' then '#8a5a16'
  when 'draft' then '#1a4d8f'
  when 'ready' then '#1a6b3a'
  when 'published' then '#1a6b3a'
  when 'review' then '#8f1a1a'
  else coalesce(nullif(color_hex,''),'#1f5f5b') end
where color_hex is null or color_hex = '';
update public.pulse_hashtags set color_hex = coalesce(nullif(color_hex,''), case block
  when 'help' then '#1a4d8f'
  when 'situations' then '#8a5a16'
  when 'results' then '#1a6b3a'
  when 'people' then '#4a1a7a'
  when 'engage' then '#8f1a1a'
  when 'news' then '#34495e'
  when 'humor' then '#7a1a65'
  else '#1f5f5b' end);

grant select, insert, update, delete on public.pulse_hashtags to authenticated;
grant select, insert, update, delete on public.pulse_dictionary_items to authenticated;
grant select, insert, update, delete on public.pulse_materials to authenticated;

alter table public.pulse_posts enable row level security;
alter table public.pulse_profiles enable row level security;
alter table public.pulse_hashtags enable row level security;
alter table public.pulse_dictionary_items enable row level security;
alter table public.pulse_materials enable row level security;

-- posts policies
DROP POLICY IF EXISTS "pulse_posts_select_own" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_insert_own" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_update_own" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_delete_own" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_select_access" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_insert_access" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_update_access" ON public.pulse_posts;
DROP POLICY IF EXISTS "pulse_posts_delete_access" ON public.pulse_posts;

create policy "pulse_posts_select_access" on public.pulse_posts for select to authenticated
using (public.pulse_can_read_post(user_id, hashtag, post_date, status, week_no));
create policy "pulse_posts_insert_access" on public.pulse_posts for insert to authenticated
with check (public.pulse_can_edit_post(user_id, hashtag, post_date, status, week_no));
create policy "pulse_posts_update_access" on public.pulse_posts for update to authenticated
using (public.pulse_can_read_post(user_id, hashtag, post_date, status, week_no))
with check (public.pulse_can_edit_post(user_id, hashtag, post_date, status, week_no));
create policy "pulse_posts_delete_access" on public.pulse_posts for delete to authenticated
using (public.pulse_can_edit_post(user_id, hashtag, post_date, status, week_no));

-- profiles policies
DROP POLICY IF EXISTS "pulse_profiles_select_access" ON public.pulse_profiles;
DROP POLICY IF EXISTS "pulse_profiles_insert_admin" ON public.pulse_profiles;
DROP POLICY IF EXISTS "pulse_profiles_update_admin" ON public.pulse_profiles;
DROP POLICY IF EXISTS "pulse_profiles_delete_admin" ON public.pulse_profiles;

create policy "pulse_profiles_select_access" on public.pulse_profiles for select to authenticated
using (public.pulse_can_manage_users() or lower(email)=public.pulse_current_email());
create policy "pulse_profiles_insert_admin" on public.pulse_profiles for insert to authenticated
with check (public.pulse_can_manage_users());
create policy "pulse_profiles_update_admin" on public.pulse_profiles for update to authenticated
using (public.pulse_can_manage_users()) with check (public.pulse_can_manage_users());
create policy "pulse_profiles_delete_admin" on public.pulse_profiles for delete to authenticated
using (public.pulse_can_manage_users());

-- hashtags policies
DROP POLICY IF EXISTS "pulse_hashtags_select_access" ON public.pulse_hashtags;
DROP POLICY IF EXISTS "pulse_hashtags_insert_access" ON public.pulse_hashtags;
DROP POLICY IF EXISTS "pulse_hashtags_update_access" ON public.pulse_hashtags;
DROP POLICY IF EXISTS "pulse_hashtags_delete_access" ON public.pulse_hashtags;

create policy "pulse_hashtags_select_access" on public.pulse_hashtags for select to authenticated
using (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_hashtags=true
      and public.pulse_tag_allowed(p.allowed_hashtags, hashtag)
  )
);
create policy "pulse_hashtags_insert_access" on public.pulse_hashtags for insert to authenticated
with check (public.pulse_is_admin() or exists (select 1 from public.pulse_profiles p where lower(p.email)=public.pulse_current_email() and p.is_active=true and p.can_edit_hashtags=true));
create policy "pulse_hashtags_update_access" on public.pulse_hashtags for update to authenticated
using (public.pulse_is_admin() or exists (select 1 from public.pulse_profiles p where lower(p.email)=public.pulse_current_email() and p.is_active=true and p.can_edit_hashtags=true))
with check (public.pulse_is_admin() or exists (select 1 from public.pulse_profiles p where lower(p.email)=public.pulse_current_email() and p.is_active=true and p.can_edit_hashtags=true));
create policy "pulse_hashtags_delete_access" on public.pulse_hashtags for delete to authenticated
using (public.pulse_is_admin() or exists (select 1 from public.pulse_profiles p where lower(p.email)=public.pulse_current_email() and p.is_active=true and p.can_edit_hashtags=true));

-- dictionary policies
DROP POLICY IF EXISTS "pulse_dict_select_access" ON public.pulse_dictionary_items;
DROP POLICY IF EXISTS "pulse_dict_insert_access" ON public.pulse_dictionary_items;
DROP POLICY IF EXISTS "pulse_dict_update_access" ON public.pulse_dictionary_items;
DROP POLICY IF EXISTS "pulse_dict_delete_access" ON public.pulse_dictionary_items;

create policy "pulse_dict_select_access" on public.pulse_dictionary_items for select to authenticated
using (public.pulse_is_admin() or exists (select 1 from public.pulse_profiles p where lower(p.email)=public.pulse_current_email() and p.is_active=true and p.can_read_dictionaries=true));
create policy "pulse_dict_insert_access" on public.pulse_dictionary_items for insert to authenticated
with check (public.pulse_is_admin() or exists (select 1 from public.pulse_profiles p where lower(p.email)=public.pulse_current_email() and p.is_active=true and p.can_edit_dictionaries=true));
create policy "pulse_dict_update_access" on public.pulse_dictionary_items for update to authenticated
using (public.pulse_is_admin() or exists (select 1 from public.pulse_profiles p where lower(p.email)=public.pulse_current_email() and p.is_active=true and p.can_edit_dictionaries=true))
with check (public.pulse_is_admin() or exists (select 1 from public.pulse_profiles p where lower(p.email)=public.pulse_current_email() and p.is_active=true and p.can_edit_dictionaries=true));
create policy "pulse_dict_delete_access" on public.pulse_dictionary_items for delete to authenticated
using (public.pulse_is_admin() or exists (select 1 from public.pulse_profiles p where lower(p.email)=public.pulse_current_email() and p.is_active=true and p.can_edit_dictionaries=true));

-- materials policies
DROP POLICY IF EXISTS "pulse_materials_select_access" ON public.pulse_materials;
DROP POLICY IF EXISTS "pulse_materials_insert_access" ON public.pulse_materials;
DROP POLICY IF EXISTS "pulse_materials_update_access" ON public.pulse_materials;
DROP POLICY IF EXISTS "pulse_materials_delete_access" ON public.pulse_materials;

create policy "pulse_materials_select_access" on public.pulse_materials for select to authenticated
using (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_materials=true
      and (p.data_scope='all' or public.pulse_materials.user_id=auth.uid())
  )
);
create policy "pulse_materials_insert_access" on public.pulse_materials for insert to authenticated
with check (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_edit_materials=true
      and (p.data_scope='all' or public.pulse_materials.user_id=auth.uid())
  )
);
create policy "pulse_materials_update_access" on public.pulse_materials for update to authenticated
using (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_edit_materials=true
      and (p.data_scope='all' or public.pulse_materials.user_id=auth.uid())
  )
)
with check (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_edit_materials=true
      and (p.data_scope='all' or public.pulse_materials.user_id=auth.uid())
  )
);
create policy "pulse_materials_delete_access" on public.pulse_materials for delete to authenticated
using (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_edit_materials=true
      and (p.data_scope='all' or public.pulse_materials.user_id=auth.uid())
  )
);

-- v35-clean-app: журналирование действий интерфейса
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

grant select, insert on public.pulse_logs to authenticated;
alter table public.pulse_logs enable row level security;

drop policy if exists "pulse_logs_insert_own" on public.pulse_logs;
drop policy if exists "pulse_logs_select_admin" on public.pulse_logs;

create policy "pulse_logs_insert_own" on public.pulse_logs
for insert to authenticated
with check (auth.uid() = user_id);

create policy "pulse_logs_select_admin" on public.pulse_logs
for select to authenticated
using (public.pulse_can_manage_users());

-- v37-production: DB-level audit log for every write in core tables.
create table if not exists public.pulse_audit_events (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid references auth.users(id) on delete set null,
  changed_email text default public.pulse_current_email(),
  table_name text not null,
  action text not null,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pulse_audit_events_created_idx on public.pulse_audit_events(created_at desc);
create index if not exists pulse_audit_events_table_idx on public.pulse_audit_events(table_name, created_at desc);
create index if not exists pulse_audit_events_user_idx on public.pulse_audit_events(changed_by, created_at desc);

create or replace function public.pulse_audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare rid text;
begin
  rid := coalesce((case when tg_op = 'DELETE' then old.id else new.id end)::text, null);
  insert into public.pulse_audit_events(changed_by, changed_email, table_name, action, row_id, old_data, new_data)
  values (
    auth.uid(),
    public.pulse_current_email(),
    tg_table_name,
    tg_op,
    rid,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['pulse_posts','pulse_materials','pulse_profiles','pulse_hashtags','pulse_dictionary_items'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit_trigger', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.pulse_audit_row_change()', t || '_audit_trigger', t);
  end loop;
end $$;

grant select on public.pulse_audit_events to authenticated;
alter table public.pulse_audit_events enable row level security;
drop policy if exists "pulse_audit_select_admin" on public.pulse_audit_events;
create policy "pulse_audit_select_admin" on public.pulse_audit_events
for select to authenticated
using (public.pulse_can_manage_users());
