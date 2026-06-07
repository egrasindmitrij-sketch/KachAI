const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Стабильнее для @supabase/supabase-js и других ESM-пакетов в Expo Go
config.resolver.unstable_enablePackageExports = false;

// Node-only SDK — не должен попадать в бандл Expo Go
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  /node_modules\/@anthropic-ai\/sdk\/.*/
];

module.exports = withNativeWind(config, { input: "./global.css" });
