# KachAI + Supabase (Вариант А — безопасная архитектура)

Claude API ключ хранится **только** в секретах Edge Function. Клиент вызывает `analyze-food` через Supabase с JWT пользователя.

## 1. Создай проект Supabase

1. [supabase.com](https://supabase.com) → New Project
2. Скопируй **Project URL** и **anon public key** → в `kachai/.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   EXPO_PUBLIC_AI_PROVIDER=claude
   ```
3. **Удали** `EXPO_PUBLIC_CLAUDE_API_KEY` из `.env` приложения — ключ больше не нужен на клиенте.

## 2. Примени SQL (таблицы + RLS + фото)

Supabase Dashboard → **SQL Editor** → выполни **оба** файла по порядку:

1. `supabase/migrations/20250606000000_initial_schema.sql`
2. `supabase/migrations/20260919000000_users_insert_and_meal_photos.sql`

Создастся:
- `public.users` — профиль (расширение `auth.users`)
- `public.subscriptions` — подписка, trial, plan
- `public.meals` — история приёмов пищи
- `public.analysis_logs` — логи AI-запросов
- RLS: пользователь видит только свои данные
- Триггер: при регистрации создаётся профиль + trial 3 дня
- Policy `users_insert_own` — клиент может создать профиль, если триггер не сработал
- Storage bucket `meal-photos` (private) — фото приёмов пищи

Клиент с JWT-сессией **читает и пишет** `users` / `subscriptions` / `meals`. Без сессии (demo) всё остаётся в AsyncStorage.

## 3. Установи Supabase CLI

```bash
npm install -g supabase
```

Войди и привяжи проект:

```bash
supabase login
cd kachai
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` — из URL проекта (`https://abcdefgh.supabase.co` → `abcdefgh`).

## 4. Задай секреты Edge Function

```bash
supabase secrets set CLAUDE_API_KEY=sk-ant-...
supabase secrets set CLAUDE_MODEL=claude-sonnet-4-6
```

Опционально проверь секреты:

```bash
supabase secrets list
```

## 5. Задеплой Edge Function

```bash
cd kachai
supabase functions deploy analyze-food
```

Проверка (нужен JWT пользователя — проще через приложение после входа):

```bash
supabase functions serve analyze-food --env-file supabase/.env.local
```

## 6. Перезапусти приложение

```bash
npm run start:lan
```

Войди в аккаунт (реальная регистрация Supabase, не demo) → Сканер → анализ фото.

В логах Metro: `[KachAI AI] Запрос analyze-food (Supabase Edge)`.

## Локальные секреты для `functions serve` (опционально)

Создай `supabase/.env.local` (не коммить):

```env
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6
```

Добавь в `.gitignore`:

```
supabase/.env.local
```

## Troubleshooting

| Ошибка | Решение |
|--------|---------|
| `Требуется авторизация` | Войди в аккаунт в приложении |
| `CLAUDE_API_KEY не задан` | `supabase secrets set CLAUDE_API_KEY=...` и redeploy |
| `Неверная сессия` | Перелогинься, проверь `EXPO_PUBLIC_SUPABASE_*` |
| 404 на function | `supabase functions deploy analyze-food` |
| RLS error на meals | Убедись, что SQL миграция применена |
| Фото не открывается в истории | Примени `20260919000000_users_insert_and_meal_photos.sql` (bucket `meal-photos`) |
| Дневник пустой после входа | Записи demo-режима локальные и не переносятся в облако автоматически |
