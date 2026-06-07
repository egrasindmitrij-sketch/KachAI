/**
 * KachAI AI Proxy
 * Скрывает API-ключи (Claude / Grok / OpenAI) от мобильного клиента.
 * Клиент шлёт сюда запрос БЕЗ ключа — сервер добавляет ключ и форвардит провайдеру.
 *
 * Запуск:
 *   cd server
 *   npm install
 *   cp .env.example .env   (впиши ключи)
 *   npm start
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" })); // base64-фото

const PORT = process.env.PORT || 8787;
const PROXY_TOKEN = process.env.PROXY_TOKEN || ""; // опциональная защита

const KEYS = {
  claude: process.env.CLAUDE_API_KEY || "",
  grok: process.env.XAI_API_KEY || "",
  openai: process.env.OPENAI_API_KEY || ""
};

const ENDPOINTS = {
  claude: "https://api.anthropic.com/v1/messages",
  grok: "https://api.x.ai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions"
};

function log(...args) {
  console.log("[proxy]", new Date().toISOString(), ...args);
}

/** Простая проверка опционального токена доступа. */
function checkToken(req, res) {
  if (!PROXY_TOKEN) return true;
  const provided = req.header("x-proxy-token");
  if (provided !== PROXY_TOKEN) {
    res.status(401).json({ error: { message: "Неверный proxy token" } });
    return false;
  }
  return true;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    providers: {
      claude: Boolean(KEYS.claude),
      grok: Boolean(KEYS.grok),
      openai: Boolean(KEYS.openai)
    }
  });
});

/** Универсальный прокси: POST /api/:provider/analyze, тело = готовый payload провайдера. */
app.post("/api/:provider/analyze", async (req, res) => {
  if (!checkToken(req, res)) return;

  const provider = String(req.params.provider || "").toLowerCase();
  const endpoint = ENDPOINTS[provider];
  const apiKey = KEYS[provider];

  if (!endpoint) {
    return res.status(400).json({ error: { message: `Неизвестный провайдер: ${provider}` } });
  }
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: { message: `Ключ для ${provider} не настроен на сервере (.env)` } });
  }

  const headers = { "Content-Type": "application/json" };
  if (provider === "claude") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const startedAt = Date.now();
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(req.body)
    });

    const text = await upstream.text();
    log(provider, upstream.status, `${Date.now() - startedAt}ms`);
    res.status(upstream.status).type("application/json").send(text);
  } catch (err) {
    log(provider, "ERROR", err?.message);
    res.status(502).json({ error: { message: `Прокси не смог связаться с ${provider}` } });
  }
});

app.listen(PORT, () => {
  log(`KachAI AI proxy слушает порт ${PORT}`);
  log("Провайдеры с ключами:", Object.entries(KEYS)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ") || "нет");
});
