/**
 * Проверка AI-контура без запуска приложения.
 * Предпочитает безопасные пути: proxy / server/.env, а не ключ в клиенте.
 *
 * Запуск: npm run test:claude
 */
const fs = require("fs");
const path = require("path");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function mergeEnv() {
  const root = path.join(__dirname, "..");
  return {
    app: loadEnv(path.join(root, ".env")),
    server: loadEnv(path.join(root, "server", ".env"))
  };
}

async function checkProxy(proxyUrl, token) {
  const healthUrl = `${proxyUrl.replace(/\/+$/, "")}/health`;
  console.log("Проверяем AI proxy:", healthUrl);
  const headers = {};
  if (token) headers["x-proxy-token"] = token;
  const res = await fetch(healthUrl, { headers });
  const body = await res.text();
  if (!res.ok) {
    console.error("❌ Proxy /health", res.status, body.slice(0, 300));
    process.exit(1);
  }
  console.log("✅ Proxy отвечает:", body);
}

async function checkClaudeKey(apiKey, model) {
  console.log("Проверяем Claude API напрямую...");
  console.log("  Модель:", model);
  console.log("  Ключ:", apiKey.slice(0, 12) + "..." + apiKey.slice(-4));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model,
      max_tokens: 32,
      messages: [{ role: "user", content: "Ответь одним словом: ок" }]
    })
  });

  const body = await res.text();
  if (!res.ok) {
    console.error("\n❌ Ошибка API", res.status);
    console.error(body.slice(0, 600));
    if (res.status === 404) {
      console.error("\nПодсказка: модель снята с API. Поставь CLAUDE_MODEL=claude-sonnet-4-6");
    }
    if (res.status === 401) {
      console.error("\nПодсказка: неверный ключ. Проверь console.anthropic.com → API Keys");
    }
    process.exit(1);
  }

  const data = JSON.parse(body);
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  console.log("\n✅ Claude API работает!");
  console.log("  Ответ:", text.trim());
  console.log("  Токены:", data.usage?.input_tokens, "in /", data.usage?.output_tokens, "out");
}

async function main() {
  const { app, server } = mergeEnv();
  const proxyUrl = app.EXPO_PUBLIC_AI_PROXY_URL || "";
  const proxyToken = app.EXPO_PUBLIC_AI_PROXY_TOKEN || "";
  const supabaseReady = Boolean(app.EXPO_PUBLIC_SUPABASE_URL && app.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const model = server.CLAUDE_MODEL || app.EXPO_PUBLIC_CLAUDE_MODEL || "claude-sonnet-4-6";
  const serverKey = server.CLAUDE_API_KEY || "";
  const clientKey =
    app.CLAUDE_API_KEY || app.EXPO_PUBLIC_CLAUDE_API_KEY || app.EXPO_PUBLIC_ANTHROPIC_API_KEY || "";

  if (proxyUrl) {
    await checkProxy(proxyUrl, proxyToken);
    if (serverKey) {
      await checkClaudeKey(serverKey, model);
    } else {
      console.log("ℹ️  Ключ Claude на proxy не проверяли: нет server/.env CLAUDE_API_KEY");
    }
    return;
  }

  if (serverKey) {
    console.log("ℹ️  EXPO_PUBLIC_AI_PROXY_URL не задан — проверяем ключ из server/.env");
    await checkClaudeKey(serverKey, model);
    return;
  }

  if (supabaseReady) {
    console.log("✅ Supabase задан в .env. Клиентский ключ Claude не нужен.");
    console.log("   Проверь Edge Function из приложения после входа, либо:");
    console.log("   supabase functions deploy analyze-food");
    console.log("   Для локальной проверки ключа положи CLAUDE_API_KEY в server/.env");
    return;
  }

  if (clientKey) {
    console.warn("⚠️  Найден клиентский ключ Claude. Для продакшена так делать нельзя.");
    await checkClaudeKey(clientKey, model);
    return;
  }

  console.error("❌ Нечего проверять.");
  console.error("   Вариант A: EXPO_PUBLIC_SUPABASE_URL + ANON_KEY и задеплоенный analyze-food");
  console.error("   Вариант B: server/.env CLAUDE_API_KEY и EXPO_PUBLIC_AI_PROXY_URL");
  process.exit(1);
}

main().catch((err) => {
  console.error("❌ Сеть:", err.message);
  process.exit(1);
});
