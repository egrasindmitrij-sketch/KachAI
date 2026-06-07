-- KachAI: users, subscriptions, meals + RLS
-- Выполни в Supabase Dashboard → SQL Editor или: supabase db push

-- ─── Расширение auth.users ───────────────────────────────────────────────────

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default 'Бро Качок',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.users is 'Профиль пользователя KachAI (расширение auth.users)';

-- ─── Подписки ────────────────────────────────────────────────────────────────

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  status text not null default 'trial'
    check (status in ('trial', 'active', 'expired', 'cancelled')),
  plan text check (plan in ('monthly', 'yearly')),
  trial_end timestamptz,
  access_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

-- ─── История приёмов пищи ────────────────────────────────────────────────────

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  photo_url text,
  title text,
  calories integer not null default 0 check (calories >= 0),
  protein integer not null default 0 check (protein >= 0),
  fats integer not null default 0 check (fats >= 0),
  carbs integer not null default 0 check (carbs >= 0),
  foods_json jsonb not null default '[]'::jsonb,
  confidence smallint check (confidence is null or (confidence >= 0 and confidence <= 100)),
  source text not null default 'claude',
  created_at timestamptz not null default now()
);

create index if not exists meals_user_id_created_at_idx
  on public.meals (user_id, created_at desc);

-- ─── Логи AI-анализа (опционально) ───────────────────────────────────────────

create table if not exists public.analysis_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  status text not null check (status in ('success', 'error')),
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists analysis_logs_user_id_idx on public.analysis_logs (user_id, created_at desc);

-- ─── Авто-создание профиля и trial при регистрации ───────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Бро Качок')
  );

  insert into public.subscriptions (user_id, status, trial_end, access_until)
  values (
    new.id,
    'trial',
    now() + interval '3 days',
    now() + interval '3 days'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── updated_at ──────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.meals enable row level security;
alter table public.analysis_logs enable row level security;

-- users: только свой профиль
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- subscriptions: только своя подписка
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id);

create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

-- meals: полный CRUD только своих записей
create policy "meals_select_own" on public.meals
  for select using (auth.uid() = user_id);

create policy "meals_insert_own" on public.meals
  for insert with check (auth.uid() = user_id);

create policy "meals_update_own" on public.meals
  for update using (auth.uid() = user_id);

create policy "meals_delete_own" on public.meals
  for delete using (auth.uid() = user_id);

-- analysis_logs: читать и писать только свои
create policy "analysis_logs_select_own" on public.analysis_logs
  for select using (auth.uid() = user_id);

create policy "analysis_logs_insert_own" on public.analysis_logs
  for insert with check (auth.uid() = user_id);
