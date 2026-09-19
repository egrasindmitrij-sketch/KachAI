/**
 * Диагностика локального запуска KachAI.
 * Запуск: npm run doctor
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function hasValue(env, key) {
  return Boolean(env?.[key]);
}

function print(ok, message) {
  console.log(`${ok ? "✅" : "⚠️ "} ${message}`);
}

function main() {
  console.log("KachAI doctor\n");

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  print(nodeMajor >= 20, `Node ${process.versions.node} (нужен >= 20.19.4)`);

  const hasNodeModules = fs.existsSync(path.join(root, "node_modules", "expo"));
  print(hasNodeModules, hasNodeModules ? "Зависимости приложения установлены" : "Нет node_modules — выполни npm install");

  const appEnvPath = path.join(root, ".env");
  const appEnv = loadEnvFile(appEnvPath);
  print(Boolean(appEnv), appEnv ? "Найден .env" : "Нет .env — скопируй из .env.example");

  const supabaseReady =
    hasValue(appEnv, "EXPO_PUBLIC_SUPABASE_URL") && hasValue(appEnv, "EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const proxyReady = hasValue(appEnv, "EXPO_PUBLIC_AI_PROXY_URL");
  const provider = (appEnv?.EXPO_PUBLIC_AI_PROVIDER || "claude").toLowerCase();

  console.log("");
  console.log(`AI provider: ${provider}`);
  print(supabaseReady, supabaseReady ? "Supabase URL + anon key заданы (Edge Function путь)" : "Supabase не задан — demo-вход и локальный дневник");
  print(proxyReady, proxyReady ? `Proxy: ${appEnv.EXPO_PUBLIC_AI_PROXY_URL}` : "EXPO_PUBLIC_AI_PROXY_URL не задан");

  if (supabaseReady && proxyReady) {
    print(true, "Оба бэкенда заданы: сначала Edge Function, при ошибке — proxy");
  }

  const serverEnv = loadEnvFile(path.join(root, "server", ".env"));
  const serverDeps = fs.existsSync(path.join(root, "server", "node_modules", "express"));
  if (proxyReady) {
    print(Boolean(serverEnv), serverEnv ? "Найден server/.env" : "Нет server/.env — скопируй из server/.env.example");
    print(serverDeps, serverDeps ? "Зависимости server/ установлены" : "В server/ нет node_modules — cd server && npm install");
    print(hasValue(serverEnv, "CLAUDE_API_KEY"), hasValue(serverEnv, "CLAUDE_API_KEY") ? "server/.env содержит CLAUDE_API_KEY" : "В server/.env нет CLAUDE_API_KEY");
  }

  console.log("");
  if (supabaseReady) {
    console.log("Дальше для облака:");
    console.log("  1. Примени SQL из supabase/migrations/ (включая 20260919… meal-photos)");
    console.log("  2. supabase secrets set CLAUDE_API_KEY=...");
    console.log("  3. supabase functions deploy analyze-food");
    console.log("  4. Войди реальным аккаунтом (не demo)");
  } else if (proxyReady) {
    console.log("Дальше для локального Claude:");
    console.log("  1. cd server && npm start");
    console.log("  2. В .env укажи LAN IP, не localhost, если тестируешь с телефона");
    console.log("  3. npm run start:lan  и demo-вход");
  } else {
    console.log("UI можно открыть без ключей (локальная оценка еды).");
    console.log("Для реального AI выбери путь A (Supabase) или B (server/). См. README.md");
  }

  console.log("\nПосле смены .env всегда: npm run start:clear");
}

main();
