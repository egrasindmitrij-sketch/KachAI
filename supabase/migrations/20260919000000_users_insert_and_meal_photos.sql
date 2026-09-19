-- KachAI: клиент может создать профиль, если триггер не сработал,
-- и хранить фото приёмов в private bucket meal-photos.

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_insert_own'
  ) then
    create policy "users_insert_own" on public.users
      for insert with check (auth.uid() = id);
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  false,
  10485760,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'meal_photos_select_own'
  ) then
    create policy "meal_photos_select_own"
      on storage.objects for select
      using (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'meal_photos_insert_own'
  ) then
    create policy "meal_photos_insert_own"
      on storage.objects for insert
      with check (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'meal_photos_update_own'
  ) then
    create policy "meal_photos_update_own"
      on storage.objects for update
      using (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'meal_photos_delete_own'
  ) then
    create policy "meal_photos_delete_own"
      on storage.objects for delete
      using (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end
$$;
