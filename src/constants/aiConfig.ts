import { isSupabaseConfigured } from "./supabaseEnv";

export type AiProvider = "claude" | "grok" | "openai";

function parseProvider(raw: string | undefined): AiProvider {
  const value = (raw ?? "claude").toLowerCase();
  if (value === "grok" || value === "openai") return value;
  return "claude";
}

/** Ключ Claude: CLAUDE_API_KEY (приоритет) или EXPO_PUBLIC_* для Expo-клиента. */
function resolveClaudeApiKey(): string {
  return (
    process.env.CLAUDE_API_KEY ??
    process.env.EXPO_PUBLIC_CLAUDE_API_KEY ??
    process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ??
    ""
  ).trim();
}

/** URL backend-прокси. Если задан — ключи в приложении НЕ нужны. */
const AI_PROXY_URL = (process.env.EXPO_PUBLIC_AI_PROXY_URL ?? "").trim().replace(/\/+$/, "");

export const AI_CONFIG = {
  provider: parseProvider(process.env.EXPO_PUBLIC_AI_PROVIDER),

  /** Прокси: запросы идут на сервер, ключи скрыты. Пусто = прямой вызов провайдера. */
  proxyUrl: AI_PROXY_URL,
  proxyToken: (process.env.EXPO_PUBLIC_AI_PROXY_TOKEN ?? "").trim(),
  useProxy: AI_PROXY_URL.length > 0,

  claudeApiKey: resolveClaudeApiKey(),
  claudeModel: process.env.EXPO_PUBLIC_CLAUDE_MODEL ?? "claude-sonnet-4-6",
  claudeEndpoint: "https://api.anthropic.com/v1/messages",

  xaiApiKey: process.env.EXPO_PUBLIC_XAI_API_KEY ?? "",
  grokModel: process.env.EXPO_PUBLIC_GROK_MODEL ?? "grok-2-vision-1212",
  grokEndpoint: "https://api.x.ai/v1/chat/completions",

  openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
  openaiModel: process.env.EXPO_PUBLIC_OPENAI_MODEL ?? "gpt-4o-mini",
  openaiEndpoint: "https://api.openai.com/v1/chat/completions",

  requestTimeoutMs: 28_000,
  retryDelayMs: 900,
  minLoadingMs: 3_000,
  maxLoadingMs: 6_000
} as const;

/** Эндпоинт для провайдера: прокси (если задан) или прямой URL. */
export function getProviderEndpoint(provider: AiProvider = AI_CONFIG.provider): string {
  if (AI_CONFIG.useProxy) {
    return `${AI_CONFIG.proxyUrl}/api/${provider}/analyze`;
  }
  if (provider === "grok") return AI_CONFIG.grokEndpoint;
  if (provider === "openai") return AI_CONFIG.openaiEndpoint;
  return AI_CONFIG.claudeEndpoint;
}

const PROVIDER_KEY_HINT: Record<AiProvider, string> = {
  claude: "EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY (Edge Function analyze-food)",
  grok: "EXPO_PUBLIC_XAI_API_KEY",
  openai: "EXPO_PUBLIC_OPENAI_API_KEY"
};

export function getProviderApiKey(provider: AiProvider = AI_CONFIG.provider): string {
  if (provider === "grok") return AI_CONFIG.xaiApiKey.trim();
  if (provider === "openai") return AI_CONFIG.openaiApiKey.trim();
  return AI_CONFIG.claudeApiKey;
}

export function hasConfiguredApiKey(provider: AiProvider = AI_CONFIG.provider): boolean {
  // Claude: только Supabase Edge Function или legacy Express-прокси (не клиентский ключ).
  if (provider === "claude") {
    return isSupabaseConfigured || AI_CONFIG.useProxy;
  }
  return getProviderApiKey(provider).length > 0;
}

export function getMissingKeyMessage(provider: AiProvider = AI_CONFIG.provider): string {
  if (provider === "claude" && !isSupabaseConfigured) {
    return "Настрой Supabase (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY) и задеплой Edge Function analyze-food";
  }
  return `API ключ не настроен. Добавь ${PROVIDER_KEY_HINT[provider]} в .env`;
}

export function getProviderLabel(provider: AiProvider = AI_CONFIG.provider): string {
  if (provider === "claude") return "Claude";
  if (provider === "grok") return "Grok";
  return "OpenAI";
}

/** Краткий статус AI-конфига для логов (без полного ключа). */
export function getAiSetupSummary(): Record<string, string | boolean> {
  return {
    provider: AI_CONFIG.provider,
    model: AI_CONFIG.claudeModel,
    useEdgeFunction: isSupabaseConfigured,
    useProxy: AI_CONFIG.useProxy,
    proxyUrl: AI_CONFIG.proxyUrl || "(нет)",
    claudeReady: hasConfiguredApiKey("claude")
  };
}
