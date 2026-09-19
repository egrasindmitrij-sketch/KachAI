# KachAI

Expo / React Native приложение: фото тарелки → Ккал и БЖУ. Стек: Expo 54, NativeWind, Supabase Auth, Claude (Edge Function или локальный proxy).

## Быстрый старт (только UI)

Этого достаточно, чтобы открыть приложение, походить по экранам и сохранить локальный дневник. AI вернёт локальную оценку, не Claude.

```bash
npm install
cp .env.example .env          # можно оставить пустые Supabase-поля
npm run doctor
npm run start:lan
```

Дальше: Expo Go на телефоне или `npm run android` / `npm run ios` / `npm run web`.

На экране входа будет **demo-режим** (без сервера). Триал 3 дня пишется локально.

После любой правки `.env` перезапускай с очисткой: `npm run start:clear`.

## Путь A — продакшен: Supabase + Edge Function

Реальный аккаунт, JWT-вызов `analyze-food`, облачный дневник и подписка.

1. Создай проект на [supabase.com](https://supabase.com).
2. В корневой `.env`:

   ```env
   EXPO_PUBLIC_AI_PROVIDER=claude
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # anon public, не service_role
   ```

3. Примени SQL (оба файла, по порядку):
   - `supabase/migrations/20250606000000_initial_schema.sql`
   - `supabase/migrations/20260919000000_users_insert_and_meal_photos.sql`
4. В Auth → URL Configuration добавь redirect `kachai://auth/callback` (точный URI пишет Metro при старте).
5. Для разработки удобно выключить Confirm email.
6. Секреты и деплой функции — в [supabase/README.md](supabase/README.md):

   ```bash
   supabase secrets set CLAUDE_API_KEY=sk-ant-...
   supabase functions deploy analyze-food
   ```

7. `npm run start:lan` → регистрация / вход (не demo) → Сканер.

Клиент теперь читает и пишет `public.meals`, `public.subscriptions`, `public.users`. Фото уходят в private bucket `meal-photos`, если миграция применена.

## Путь B — локальный Claude без облака

Если Edge Function ещё не задеплоена, ключ Claude держи только в `server/.env`.

```bash
cd server
npm install
cp .env.example .env          # впиши CLAUDE_API_KEY
npm start                     # http://localhost:8787/health
```

В корневом `.env` **не обязательны** Supabase-переменные:

```env
EXPO_PUBLIC_AI_PROVIDER=claude
EXPO_PUBLIC_AI_PROXY_URL=http://192.168.1.41:8787
```

На физическом телефоне `localhost` не работает — нужен LAN IP компьютера. Подробности: [server/README.md](server/README.md).

Можно задать **и Supabase, и proxy**: Claude сначала идёт в Edge Function, при ошибке — в proxy. Это удобно, пока функция не задеплоена.

## Проверки

```bash
npm run doctor        # что настроено в .env
npm run typecheck
npm test
npm run verify        # версия Metro после install
npm run test:claude   # proxy /health или ключ из server/.env
```

## Что уже работает / что ещё нет

| Есть | Ещё нет |
|------|---------|
| Auth: email/password, Google, demo | Apple Sign In |
| Сканер, результат, история, профиль | Реальная ЮKassa (сейчас заглушка) |
| Claude через Edge Function или proxy | Серверное подтверждение оплаты |
| Облачный дневник и подписка при сессии Supabase | Редактируемые дневные цели (пока 2800 ккал) |
| Локальный fallback, если AI недоступен | |

## Полезные скрипты

| Команда | Назначение |
|---------|------------|
| `npm start` / `start:lan` / `start:tunnel` | Expo |
| `npm run doctor` | Диагностика env |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Юнит-тесты мапперов |

Node.js `>= 20.19.4`.
