-- Eurasia on Pulse v50 — strict read/edit permissions
-- Читать = видеть. Редактировать = создавать/сохранять/удалять.
-- Edit is allowed only when the matching read permission is also true.

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
  is_idea := row_date is null;
  if is_idea and not (p.can_read_ideas and p.can_edit_ideas) then return false; end if;
  if not is_idea and not (p.can_read_posts and p.can_edit_posts) then return false; end if;
  if p.data_scope='own' and row_owner <> auth.uid() then return false; end if;
  if not public.pulse_tag_allowed(p.allowed_hashtags, tag) then return false; end if;
  return true;
end;
$$;

-- Hashtags: read and edit are separate.
drop policy if exists "pulse_hashtags_select_access" on public.pulse_hashtags;
drop policy if exists "pulse_hashtags_insert_access" on public.pulse_hashtags;
drop policy if exists "pulse_hashtags_update_access" on public.pulse_hashtags;
drop policy if exists "pulse_hashtags_delete_access" on public.pulse_hashtags;

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
with check (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_hashtags=true
      and p.can_edit_hashtags=true
  )
);

create policy "pulse_hashtags_update_access" on public.pulse_hashtags for update to authenticated
using (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_hashtags=true
      and p.can_edit_hashtags=true
  )
)
with check (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_hashtags=true
      and p.can_edit_hashtags=true
  )
);

create policy "pulse_hashtags_delete_access" on public.pulse_hashtags for delete to authenticated
using (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_hashtags=true
      and p.can_edit_hashtags=true
  )
);

-- Dictionary items: read and edit are separate.
drop policy if exists "pulse_dict_select_access" on public.pulse_dictionary_items;
drop policy if exists "pulse_dict_insert_access" on public.pulse_dictionary_items;
drop policy if exists "pulse_dict_update_access" on public.pulse_dictionary_items;
drop policy if exists "pulse_dict_delete_access" on public.pulse_dictionary_items;

create policy "pulse_dict_select_access" on public.pulse_dictionary_items for select to authenticated
using (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_dictionaries=true
  )
);

create policy "pulse_dict_insert_access" on public.pulse_dictionary_items for insert to authenticated
with check (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_dictionaries=true
      and p.can_edit_dictionaries=true
  )
);

create policy "pulse_dict_update_access" on public.pulse_dictionary_items for update to authenticated
using (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_dictionaries=true
      and p.can_edit_dictionaries=true
  )
)
with check (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_dictionaries=true
      and p.can_edit_dictionaries=true
  )
);

create policy "pulse_dict_delete_access" on public.pulse_dictionary_items for delete to authenticated
using (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_dictionaries=true
      and p.can_edit_dictionaries=true
  )
);

-- Materials: read and edit are separate.
drop policy if exists "pulse_materials_insert_access" on public.pulse_materials;
drop policy if exists "pulse_materials_update_access" on public.pulse_materials;
drop policy if exists "pulse_materials_delete_access" on public.pulse_materials;

create policy "pulse_materials_insert_access" on public.pulse_materials for insert to authenticated
with check (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_materials=true
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
      and p.can_read_materials=true
      and p.can_edit_materials=true
      and (p.data_scope='all' or public.pulse_materials.user_id=auth.uid())
  )
)
with check (
  public.pulse_is_admin() or exists (
    select 1 from public.pulse_profiles p
    where lower(p.email)=public.pulse_current_email()
      and p.is_active=true
      and p.can_read_materials=true
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
      and p.can_read_materials=true
      and p.can_edit_materials=true
      and (p.data_scope='all' or public.pulse_materials.user_id=auth.uid())
  )
);

-- Optional cleanup: if read is false, edit must be false too.
update public.pulse_profiles
set
  can_edit_posts = case when can_read_posts then can_edit_posts else false end,
  can_edit_ideas = case when can_read_ideas then can_edit_ideas else false end,
  can_edit_hashtags = case when can_read_hashtags then can_edit_hashtags else false end,
  can_edit_materials = case when can_read_materials then can_edit_materials else false end,
  can_edit_dictionaries = case when can_read_dictionaries then can_edit_dictionaries else false end,
  updated_at = now();
