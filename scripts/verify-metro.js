/* Проверка Metro после npm install */
try {
  const { version } = require("metro/package.json");
  console.log(`[kachai] metro ${version} (Expo SDK 54 / RN 0.81)`);
} catch {
  console.error("[kachai] metro не установлен. Сначала выполни: npm install");
  process.exitCode = 1;
}
