# KachAI AI Proxy

Backend-прокси, который прячет API-ключи (Claude / Grok / OpenAI) от мобильного клиента.
Клиент отправляет запрос **без ключа** — сервер добавляет ключ и форвардит провайдеру.

## Запуск локально

```bash
cd server
npm install
cp .env.example .env   # впиши CLAUDE_API_KEY
npm start
```

Сервер поднимется на `http://localhost:8787`. Проверка: `GET /health`.

## Подключение приложения

В `kachai/.env`:

```env
EXPO_PUBLIC_AI_PROVIDER=claude
# Адрес прокси. Для телефона по LAN — IP компьютера, НЕ localhost!
EXPO_PUBLIC_AI_PROXY_URL=http://192.168.1.41:8787
# Если на сервере задан PROXY_TOKEN — продублируй его:
# EXPO_PUBLIC_AI_PROXY_TOKEN=...
```

Когда `EXPO_PUBLIC_AI_PROXY_URL` задан, приложению **ключ Claude не нужен** —
запрос идёт на прокси, а ключ берётся из `server/.env`.

## Эндпоинты

- `GET /health` — статус и какие провайдеры имеют ключи
- `POST /api/:provider/analyze` — форвард тела запроса провайдеру (`claude` | `grok` | `openai`)

## Деплой

Подойдёт любой Node-хостинг (Render, Railway, Fly.io, VPS). Задай переменные окружения
из `.env.example`, открой порт. В приложении укажи публичный URL в `EXPO_PUBLIC_AI_PROXY_URL`.
