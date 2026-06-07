/**
 * Проверка Claude API (ключ + модель) без запуска приложения.
 * Запуск: node scripts/test-claude.js
 */
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Нет файла .env — скопируй из .env.example");
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const apiKey = env.EXPO_PUBLIC_CLAUDE_API_KEY || env.CLAUDE_API_KEY || "";
  const model = env.EXPO_PUBLIC_CLAUDE_MODEL || "claude-sonnet-4-6";

  if (!apiKey) {
    console.error("❌ Ключ не найден. Добавь EXPO_PUBLIC_CLAUDE_API_KEY в .env");
    process.exit(1);
  }

  console.log("Проверяем Claude API...");
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
      console.error("\nПодсказка: модель снята с API. Поставь EXPO_PUBLIC_CLAUDE_MODEL=claude-sonnet-4-6");
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

main().catch((err) => {
  console.error("❌ Сеть:", err.message);
  process.exit(1);
});
