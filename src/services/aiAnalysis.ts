import * as FileSystem from "expo-file-system/legacy";
import {
  AI_CONFIG,
  AiProvider,
  getMissingKeyMessage,
  getProviderEndpoint,
  getProviderLabel,
  hasConfiguredApiKey
} from "../constants/aiConfig";
import {
  AnalysisFoodItem,
  AnalysisMeta,
  AnalysisResult,
  AnalysisSource
} from "../types/analysis";
import { isSupabaseConfigured } from "../constants/supabaseEnv";
import { getSupabaseClient } from "./supabase";
import { buildRealisticAnalysis } from "../utils/buildRealisticAnalysis";
import { mealAnalysisToAnalysisResult } from "../utils/analysisMappers";

const LOG_PREFIX = "[KachAI AI]";

/** Ориентир тарифов Sonnet (USD / 1M токенов), для оценки в логах. */
const CLAUDE_SONNET_USD_PER_MTOK = { input: 3, output: 15 } as const;

const CLAUDE_SYSTEM_PROMPT = `Ты — ведущий спортивный диетолог приложения KachAI (Iron Fuel AI) с 15+ годами работы с российскими бодибилдерами, пауэрлифтерами и фитнес-атлетами.
Задача: по ОДНОМУ фото еды дать максимально точную оценку приёма пищи для трекинга калорий и БЖУ (белки/жиры/углеводы в граммах).

═══ ФОРМАТ ОТВЕТА (КРИТИЧНО) ═══
• Отвечай ТОЛЬКО валидным JSON — без markdown, без \`\`\`, без пояснений до или после JSON.
• Все числа — целые (округляй математически).
• Поле confidence — целое 0–100: насколько ты уверен в общей оценке по фото.

═══ РОССИЙСКИЕ ПРОДУКТЫ (называй по-русски, указывай жирность/тип) ═══

БЕЛОК (приоритет, всегда указывай способ готовки):
• Птица: куриные бёдра (с кожей/без), куриная грудка, индейка (филе/бедро), утка
• Мясо: говядина (стейк/тушёная/фарш), свинина постная, котлеты домашние, тефтели, гуляш
• Рыба/морепродукты: лосось, форель, треска, минтай, горбуша, тунец (консерва), креветки
• Яйца: варёные (1–4 шт), омлет, яичница, яйца всмятку
• Молочное: творог 0%/2%/5%/9%, творожная масса, сырники, творог с бананом/мёдом, кефир, ряженка, йогурт греческий, творожный сыр, сметана
• Спортпит: сывороточный/казеиновый протеин (коктейль в шейкере), протеиновый батончик (Bombbar, Rex, FitnesShock и т.п. — только если видна упаковка)

УГЛЕВОДЫ:
• Крупы: гречка (ядрица), рис белый/бурый/дикий, овсянка (каша/хлопья), перловка, пшено, булгур, макароны/паста
• Картофель: отварной, пюре, запечённый, драники
• Хлебобулочное: хлеб ржаной/белый/бородинский, лаваш, блины, оладьи, гречневые блины
• Фрукты/ягоды: банан, яблоко, груша, черника, клубника, малина — относи к carbs, НЕ к protein
• Бобовые: фасоль, чечевица, нут, горох

ЖИРЫ И СКРЫТЫЕ ККАЛ (не занижай):
• Орехи (грецкий, миндаль, кешью), семечки, арахисовая паста, авокадо
• Масло сливочное/оливковое/подсолнечное, сметана 10–20%, майонез, соусы, заправки
• Сало, колбаса, сосиски, сыр (твёрдый/плавленый) — если видно
• Жарка на масле: +15–25% к жирам vs отварное/запечённое/на пару

═══ СМЕШАННЫЕ БЛЮДА — РАЗБИВАЙ НА КОМПОНЕНТЫ ═══
Никогда не пиши одним словом «еда», «боул», «салат», «готовое блюдо».
• Плов → рис + мясо (баранина/курица) + морковь + масло
• Борщ/щи/суп → бульон/овощи + мясо отдельно + сметана + хлец (если виден)
• Салаты: Оливье, Цезарь, греческий, винегрет → овощи + белок + соус/майонез отдельно
• WOK/доставка → рис/лапша + белок + овощи + соус
• Типичные тарелки качка: «гречка + куриные бёдра», «бурый рис + говядина», «творог 250 г + банан», «овсянка + протеин»

═══ ОЦЕНКА ПОРЦИИ ПО ФОТО (критично) ═══
Используй визуальные ориентиры (стандартная тарелка Ø 24–26 см, вилка/ложка как масштаб):

МЯСО/РЫБА (готовый вес):
• Куриная грудка: 1 ладонь ≈ 120–150 г; 2 куска ≈ 200–280 г
• Куриные бёдра без кости: 1 шт ≈ 80–120 г; 2–3 шт ≈ 180–300 г
• Говядина/свинина стейк: толщина 1,5–2 см, размер ладони ≈ 150–200 г
• Рыбное филе: 1 кусок ≈ 120–180 г
• Яйцо варёное: 1 шт ≈ 50–55 г (без скорлупы)

ГАРНИРЫ (готовый вес):
• Гречка/рис/овсянка: 2–3 ст. л. ≈ 80–120 г; половина тарелки ≈ 150–200 г; горка ≈ 250–350 г
• Макароны: порция ≈ 180–250 г готовых
• Картофель: 1 средняя клубня ≈ 150–200 г; пюре порция ≈ 150–250 г

МОЛОЧНОЕ И ПЕРЕКУСЫ:
• Творог: пиала/контейнер ≈ 150–200 г; большая порция качка ≈ 250–300 г
• Протеиновый батончик: 1 шт ≈ 40–60 г
• Банан: 1 шт ≈ 100–130 г; горсть ягод ≈ 80–120 г

ПРАВИЛА ГРАММОВКИ:
1) Считай ТОЛЬКО видимое на фото. Не придумывай скрытые ингредиенты.
2) Если масштаб неясен — бери середину диапазона, не максимум.
3) grams в foods — реалистичные целые числа.
4) calories каждой позиции ≈ 4×белок + 9×жир + 4×углевод (по типичному составу позиции).
5) Итоговые calories ≈ сумма calories в foods (допуск ±8%).
6) protein/fats/carbs согласованы с продуктами (допуск ±10%).
7) 2–7 позиций в foods; названия бытовые («куриные бёдра запечённые», не chicken thigh).
8) Не выдумывай бренды без визуальных признаков.

═══ СПРАВОЧНИК БЖУ (на 100 г, для сверки) ═══
• Куриная грудка варёная: ~24 г белка, ~2 г жира
• Куриные бёдра запечённые: ~22 г белка, ~10–12 г жира
• Гречка варёная: ~4 г белка, ~20 г углеводов
• Бурый рис варёный: ~3 г белка, ~23 г углеводов
• Творог 5%: ~17 г белка, ~5 г жира; творог 9%: ~16 г белка, ~9 г жира
• Яйцо: ~6–7 г белка, ~5 г жира на 1 шт
• Овсянка на воде: ~3 г белка, ~14 г углеводов

═══ УВЕРЕННОСТЬ (confidence 0–100) ═══
• 85–100: чёткое фото, продукты и порции очевидны
• 65–84: продукты узнаваемы, граммовка приблизительная
• 45–64: частично закрыто, плохой свет, соус скрывает состав
• 25–44: сильное размытие, необычное блюдо, масштаб неясен
• 0–24: почти невозможно определить — всё равно дай лучшую оценку, но честно снизь confidence

Честно снижай confidence при: размытии, тёмном фото, виде сверху без масштаба, однородных супах/соусах, где состав не виден.`;

const USER_JSON_INSTRUCTION = `Проанализируй фото еды и верни ТОЛЬКО валидный JSON (без markdown, без текста вне JSON):
{
  "calories": number,
  "protein": number,
  "fats": number,
  "carbs": number,
  "confidence": number,
  "foods": [
    { "name": "string", "grams": number, "calories": number }
  ]
}

confidence — целое 0–100: твоя уверенность в оценке по этому фото.`;

const SYSTEM_PROMPT = CLAUDE_SYSTEM_PROMPT;

type ClaudeImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

type RawAiPayload = {
  calories?: unknown;
  protein?: unknown;
  fats?: unknown;
  carbs?: unknown;
  confidence?: unknown;
  foods?: Array<{
    name?: unknown;
    grams?: unknown;
    calories?: unknown;
  }>;
};

type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
};

type ProviderCallResult = {
  result: AnalysisResult;
  usage?: TokenUsage;
};

export type AnalyzeFoodPhotoOptions = {
  /** Принудительный провайдер (например, тест Claude с камеры) */
  forceProvider?: AiProvider;
};

class AiAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_KEY" | "TIMEOUT" | "NETWORK" | "PARSE" | "API"
  ) {
    super(message);
    this.name = "AiAnalysisError";
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logInfo(message: string, payload?: unknown) {
  if (payload !== undefined) {
    console.log(`${LOG_PREFIX} ${message}`, payload);
    return;
  }
  console.log(`${LOG_PREFIX} ${message}`);
}

function logError(message: string, error?: unknown) {
  console.error(`${LOG_PREFIX} ${message}`, error);
}

function estimateClaudeCostUsd(usage: TokenUsage): number {
  const inputCost = (usage.input_tokens * CLAUDE_SONNET_USD_PER_MTOK.input) / 1_000_000;
  const outputCost = (usage.output_tokens * CLAUDE_SONNET_USD_PER_MTOK.output) / 1_000_000;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

function buildResultSample(result: AnalysisResult) {
  return {
    calories: result.calories,
    protein: result.protein,
    fats: result.fats,
    carbs: result.carbs,
    confidence: result.confidence,
    foods: result.foods.slice(0, 4).map((f) => `${f.name} ${f.grams}г ${f.calories}ккал`)
  };
}

function normalizeConfidence(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function logAnalysisReport(params: {
  status: "success" | "fallback" | "no_key";
  provider: AiProvider | AnalysisSource;
  durationMs: number;
  apiDurationMs?: number;
  result: AnalysisResult;
  usage?: TokenUsage;
  errorMessage?: string;
  apiAttempts?: number;
}) {
  const costUsdEstimate = params.usage ? estimateClaudeCostUsd(params.usage) : null;

  logInfo("═══ Отчёт анализа ═══", {
    status: params.status,
    provider: params.provider,
    durationMs: params.durationMs,
    apiDurationMs: params.apiDurationMs,
    apiAttempts: params.apiAttempts,
    tokens: params.usage
      ? { input: params.usage.input_tokens, output: params.usage.output_tokens }
      : undefined,
    costUsdEstimate,
    costUsdFormatted:
      costUsdEstimate != null ? `~$${costUsdEstimate.toFixed(6)}` : "н/д (не Claude или нет usage)",
    sample: buildResultSample(params.result),
    errorMessage: params.errorMessage
  });
}

function withMeta(result: AnalysisResult, meta: AnalysisMeta): AnalysisResult {
  return { ...result, meta: { ...result.meta, ...meta } };
}

export function toUserFriendlyErrorMessage(
  error: unknown,
  provider: AiProvider = AI_CONFIG.provider
): string {
  const label = getProviderLabel(provider);

  if (error instanceof AiAnalysisError) {
    switch (error.code) {
      case "NO_KEY":
        return `Нет ключа ${label}. Проверь .env и перезапусти Expo.`;
      case "TIMEOUT":
        return `${label} не ответил вовремя. Проверь интернет.`;
      case "NETWORK":
        return `Нет связи с ${label}. Проверь сеть.`;
      case "PARSE":
        return `${label} вернул некорректный ответ.`;
      case "API":
        return error.message;
      default:
        return `${label} недоступен.`;
    }
  }

  if (error instanceof Error && error.message) {
    return `${label}: ${error.message.slice(0, 100)}`;
  }

  return `${label} недоступен. Показана локальная оценка.`;
}

/** Короткое сообщение для toast при fallback. */
export function getFallbackToastMessage(result: AnalysisResult): string {
  if (result.message) {
    const short = result.message.replace(/\.\s*Показана локальная оценка\.?$/i, "").trim();
    return short.length > 0 ? `${short}. Локальная оценка.` : "Локальная оценка вместо AI.";
  }
  return "AI недоступен. Показана локальная оценка.";
}

function toNumber(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function detectMediaType(uri: string): ClaudeImageMediaType {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function toClaudeMediaType(mediaType: string): ClaudeImageMediaType {
  if (
    mediaType === "image/png" ||
    mediaType === "image/webp" ||
    mediaType === "image/gif"
  ) {
    return mediaType;
  }
  return "image/jpeg";
}

async function readPhotoAsBase64(photoUri: string): Promise<{ base64: string; mediaType: string }> {
  const mediaType = detectMediaType(photoUri);
  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64
  });

  if (!base64) {
    throw new AiAnalysisError("Не удалось прочитать фото", "NETWORK");
  }

  return { base64, mediaType };
}

function extractJsonObject(text: string): RawAiPayload {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as RawAiPayload;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new AiAnalysisError("ИИ вернул невалидный JSON", "PARSE");
    }
    return JSON.parse(match[0]) as RawAiPayload;
  }
}

function normalizeFoods(foods: RawAiPayload["foods"]): AnalysisFoodItem[] {
  if (!Array.isArray(foods) || foods.length === 0) {
    return [{ name: "Блюдо", grams: 250, calories: 400 }];
  }

  return foods
    .map((item) => ({
      name: String(item?.name ?? "Продукт").trim() || "Продукт",
      grams: toNumber(item?.grams),
      calories: toNumber(item?.calories)
    }))
    .filter((item) => item.grams > 0 || item.calories > 0)
    .slice(0, 8);
}

function normalizePayload(payload: RawAiPayload, source: AnalysisSource): AnalysisResult {
  const foods = normalizeFoods(payload.foods);
  const calories = toNumber(payload.calories) || foods.reduce((s, f) => s + f.calories, 0);
  const protein = toNumber(payload.protein);
  const fats = toNumber(payload.fats);
  const carbs = toNumber(payload.carbs);
  const confidence = normalizeConfidence(payload.confidence);

  return {
    calories: Math.max(calories, 1),
    protein,
    fats,
    carbs,
    foods,
    source,
    ...(confidence !== undefined ? { confidence } : {})
  };
}

type ClaudeApiResponse = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

function extractTextFromClaudeResponse(data: ClaudeApiResponse): string {
  const text = data.content?.find((block) => block.type === "text")?.text;
  if (!text?.trim()) {
    throw new AiAnalysisError("Пустой ответ Claude API", "API");
  }
  return text;
}

function applyUsageMeta(
  result: AnalysisResult,
  usage: TokenUsage | undefined,
  provider: AnalysisSource,
  apiDurationMs: number,
  apiAttempts: number
): AnalysisResult {
  const costUsdEstimate = usage ? estimateClaudeCostUsd(usage) : null;
  return withMeta(result, {
    durationMs: apiDurationMs,
    apiDurationMs,
    provider,
    inputTokens: usage?.input_tokens,
    outputTokens: usage?.output_tokens,
    costUsdEstimate,
    apiAttempts
  });
}

// ─── Claude через Supabase Edge Function (безопасный путь) ────────────────────

type EdgeAnalyzeResponse = {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  confidence?: number;
  foods: AnalysisFoodItem[];
  usage?: TokenUsage;
  error?: string;
};

function describeEdgeFunctionError(error: { message?: string; context?: unknown }): string {
  const msg = error.message ?? "Ошибка Edge Function";
  if (msg.includes("Failed to fetch") || msg.includes("Network")) {
    return "Нет связи с Supabase Edge Function. Проверь интернет.";
  }
  if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
    return "Войди в аккаунт для AI-анализа.";
  }
  return `AI-сервер: ${msg}`.slice(0, 180);
}

/** Вызов Supabase Edge Function `analyze-food` (ключ Claude только на сервере). */
async function analyzeWithClaudeEdgeFunction(
  base64: string,
  mediaType: string
): Promise<ProviderCallResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new AiAnalysisError(getMissingKeyMessage("claude"), "NO_KEY");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new AiAnalysisError(
      "Нет сессии Supabase. Выйди из приложения (Профиль → Выйти) и войди через «Создать аккаунт» или «Войти в зал».",
      "API"
    );
  }

  const claudeMediaType = toClaudeMediaType(mediaType);
  const apiStartedAt = Date.now();

  logInfo("Запрос analyze-food (Supabase Edge)", {
    mediaType: claudeMediaType,
    base64Length: base64.length
  });

  const { data, error } = await supabase.functions.invoke<EdgeAnalyzeResponse>("analyze-food", {
    body: { base64, mediaType: claudeMediaType }
  });

  const apiDurationMs = Date.now() - apiStartedAt;

  if (error) {
    logError("Ошибка invoke analyze-food", error);
    throw new AiAnalysisError(describeEdgeFunctionError(error), "API");
  }

  if (!data) {
    throw new AiAnalysisError("Пустой ответ Edge Function analyze-food", "API");
  }

  if (data.error) {
    throw new AiAnalysisError(data.error, "API");
  }

  const result = normalizePayload(data as RawAiPayload, "claude");
  const usage = data.usage;

  logInfo("Ответ analyze-food получен", {
    apiDurationMs,
    confidence: result.confidence,
    usage,
    costUsdEstimate: usage ? estimateClaudeCostUsd(usage) : null,
    sample: buildResultSample(result)
  });

  return {
    result: applyUsageMeta(result, usage, "claude", apiDurationMs, 1),
    usage
  };
}

/** Legacy: Express-прокси server/ (если Supabase не настроен, но задан AI_PROXY_URL). */
async function analyzeWithClaudeProxy(
  base64: string,
  mediaType: string
): Promise<ProviderCallResult> {
  const claudeMediaType = toClaudeMediaType(mediaType);
  const apiStartedAt = Date.now();
  const endpoint = getProviderEndpoint("claude");

  logInfo("Запрос Claude (legacy proxy)", { endpoint, mediaType: claudeMediaType });

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (AI_CONFIG.proxyToken) headers["x-proxy-token"] = AI_CONFIG.proxyToken;

  const httpResponse = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: AI_CONFIG.claudeModel,
        max_tokens: 1400,
        temperature: 0.08,
        system: CLAUDE_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: claudeMediaType, data: base64 }
              },
              { type: "text", text: USER_JSON_INSTRUCTION }
            ]
          }
        ]
      })
    },
    "Claude"
  );

  if (!httpResponse.ok) {
    const errText = await httpResponse.text();
    logError("Ошибка Claude proxy", { status: httpResponse.status, body: errText.slice(0, 400) });
    throw new AiAnalysisError(`Claude proxy ${httpResponse.status}`, "API");
  }

  const data = (await httpResponse.json()) as ClaudeApiResponse;
  const text = extractTextFromClaudeResponse(data);
  const usage: TokenUsage | undefined =
    data.usage?.input_tokens != null && data.usage?.output_tokens != null
      ? { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens }
      : undefined;

  const apiDurationMs = Date.now() - apiStartedAt;
  const result = normalizePayload(extractJsonObject(text), "claude");

  return {
    result: applyUsageMeta(result, usage, "claude", apiDurationMs, 1),
    usage
  };
}

export async function analyzeWithClaude(
  base64: string,
  mediaType: string = "image/jpeg"
): Promise<ProviderCallResult> {
  if (isSupabaseConfigured) {
    return analyzeWithClaudeEdgeFunction(base64, mediaType);
  }
  if (AI_CONFIG.useProxy) {
    return analyzeWithClaudeProxy(base64, mediaType);
  }
  throw new AiAnalysisError(getMissingKeyMessage("claude"), "NO_KEY");
}

// ─── Grok (xAI) ───────────────────────────────────────────────────────────────

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  providerLabel: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.requestTimeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiAnalysisError(`Превышено время ожидания ${providerLabel} API`, "TIMEOUT");
    }
    throw new AiAnalysisError(`Ошибка сети при запросе к ${providerLabel} API`, "NETWORK");
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Заголовки для OpenAI-совместимых провайдеров (Grok/OpenAI) с учётом прокси. */
function buildBearerHeaders(apiKey: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (AI_CONFIG.useProxy) {
    if (AI_CONFIG.proxyToken) headers["x-proxy-token"] = AI_CONFIG.proxyToken;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

async function callGrokApi(base64: string, mediaType: string): Promise<ProviderCallResult> {
  const dataUrl = `data:${mediaType};base64,${base64}`;
  const apiStartedAt = Date.now();
  const endpoint = getProviderEndpoint("grok");

  logInfo("Запрос Grok", {
    via: AI_CONFIG.useProxy ? "proxy" : "direct",
    endpoint,
    model: AI_CONFIG.grokModel
  });

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: buildBearerHeaders(AI_CONFIG.xaiApiKey),
      body: JSON.stringify({
        model: AI_CONFIG.grokModel,
        temperature: 0.15,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              { type: "text", text: USER_JSON_INSTRUCTION }
            ]
          }
        ]
      })
    },
    "Grok"
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new AiAnalysisError(`Grok API ${response.status}: ${errText.slice(0, 220)}`, "API");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new AiAnalysisError("Пустой ответ Grok API", "API");
  }

  const apiDurationMs = Date.now() - apiStartedAt;
  const usage =
    data.usage?.prompt_tokens != null && data.usage?.completion_tokens != null
      ? {
          input_tokens: data.usage.prompt_tokens,
          output_tokens: data.usage.completion_tokens
        }
      : undefined;

  const result = normalizePayload(extractJsonObject(text), "grok");
  logInfo("Ответ Grok получен", { apiDurationMs, sample: buildResultSample(result) });

  return {
    result: applyUsageMeta(result, undefined, "grok", apiDurationMs, 1),
    usage
  };
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function callOpenAiApi(base64: string, mediaType: string): Promise<ProviderCallResult> {
  const dataUrl = `data:${mediaType};base64,${base64}`;
  const apiStartedAt = Date.now();
  const endpoint = getProviderEndpoint("openai");

  logInfo("Запрос OpenAI", {
    via: AI_CONFIG.useProxy ? "proxy" : "direct",
    endpoint,
    model: AI_CONFIG.openaiModel
  });

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers: buildBearerHeaders(AI_CONFIG.openaiApiKey),
      body: JSON.stringify({
        model: AI_CONFIG.openaiModel,
        temperature: 0.15,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              { type: "text", text: USER_JSON_INSTRUCTION }
            ]
          }
        ]
      })
    },
    "OpenAI"
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new AiAnalysisError(`OpenAI API ${response.status}: ${errText.slice(0, 220)}`, "API");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new AiAnalysisError("Пустой ответ OpenAI API", "API");
  }

  const apiDurationMs = Date.now() - apiStartedAt;
  const usage =
    data.usage?.prompt_tokens != null && data.usage?.completion_tokens != null
      ? {
          input_tokens: data.usage.prompt_tokens,
          output_tokens: data.usage.completion_tokens
        }
      : undefined;

  const result = normalizePayload(extractJsonObject(text), "openai");
  logInfo("Ответ OpenAI получен", { apiDurationMs, sample: buildResultSample(result) });

  return {
    result: applyUsageMeta(result, undefined, "openai", apiDurationMs, 1),
    usage
  };
}

// ─── Provider router ──────────────────────────────────────────────────────────

type ProviderHandler = (base64: string, mediaType: string) => Promise<ProviderCallResult>;

const PROVIDER_HANDLERS: Record<AiProvider, ProviderHandler> = {
  claude: analyzeWithClaude,
  grok: callGrokApi,
  openai: callOpenAiApi
};

async function analyzeWithProviderRetry(
  provider: AiProvider,
  base64: string,
  mediaType: string
): Promise<{ result: AnalysisResult; usage?: TokenUsage; apiAttempts: number }> {
  const handler = PROVIDER_HANDLERS[provider];
  const label = getProviderLabel(provider);

  try {
    const first = await handler(base64, mediaType);
    return { ...first, apiAttempts: 1 };
  } catch (firstError) {
    logError(`Первая попытка ${label} не удалась, повторяем`, firstError);
    await delay(AI_CONFIG.retryDelayMs);
    const second = await handler(base64, mediaType);
    return { ...second, apiAttempts: 2 };
  }
}

export function getActiveProvider(): AiProvider {
  return AI_CONFIG.provider;
}

export function buildFallbackResult(
  photoUri: string,
  message: string,
  meta?: Partial<AnalysisMeta>
): AnalysisResult {
  logInfo("Используем fallback-анализ", { photoUri, message });
  const meal = buildRealisticAnalysis(photoUri);
  const result = mealAnalysisToAnalysisResult(meal, "fallback", message);
  return withMeta(result, {
    durationMs: meta?.durationMs ?? 0,
    apiDurationMs: meta?.apiDurationMs,
    provider: "fallback",
    costUsdEstimate: null,
    apiAttempts: meta?.apiAttempts,
    ...meta
  });
}

/**
 * Анализ фото еды через выбранного провайдера (Claude / Grok / OpenAI).
 * Переключение: EXPO_PUBLIC_AI_PROVIDER=claude|grok|openai
 */
export async function analyzeFoodPhoto(
  photoUri: string,
  options?: AnalyzeFoodPhotoOptions
): Promise<AnalysisResult> {
  const provider = options?.forceProvider ?? AI_CONFIG.provider;
  const startedAt = Date.now();

  logInfo("Старт анализа", { photoUri, provider, forceProvider: options?.forceProvider });

  if (!hasConfiguredApiKey(provider)) {
    const friendly = toUserFriendlyErrorMessage(
      new AiAnalysisError(getMissingKeyMessage(provider), "NO_KEY"),
      provider
    );
    const result = buildFallbackResult(photoUri, friendly, {
      durationMs: Date.now() - startedAt,
      provider: "fallback",
      apiAttempts: 0
    });
    logAnalysisReport({
      status: "no_key",
      provider,
      durationMs: Date.now() - startedAt,
      result,
      errorMessage: friendly
    });
    return result;
  }

  try {
    const readStartedAt = Date.now();
    const { base64, mediaType } = await readPhotoAsBase64(photoUri);
    const readMs = Date.now() - readStartedAt;

    const apiStartedAt = Date.now();
    const { result, usage, apiAttempts } = await analyzeWithProviderRetry(
      provider,
      base64,
      mediaType
    );
    const apiDurationMs = Date.now() - apiStartedAt;
    const totalMs = Date.now() - startedAt;

    const enriched = withMeta(result, {
      ...result.meta,
      durationMs: totalMs,
      apiDurationMs,
      provider: result.source,
      inputTokens: usage?.input_tokens ?? result.meta?.inputTokens,
      outputTokens: usage?.output_tokens ?? result.meta?.outputTokens,
      costUsdEstimate: usage ? estimateClaudeCostUsd(usage) : (result.meta?.costUsdEstimate ?? null),
      apiAttempts
    });

    logAnalysisReport({
      status: "success",
      provider,
      durationMs: totalMs,
      apiDurationMs,
      result: enriched,
      usage,
      apiAttempts
    });
    logInfo("Тайминг чтения фото", { readMs, apiDurationMs, totalMs });

    return enriched;
  } catch (error) {
    const friendly = toUserFriendlyErrorMessage(error, provider);
    const totalMs = Date.now() - startedAt;

    logError("Анализ завершён с ошибкой", {
      durationMs: totalMs,
      provider,
      friendly,
      error
    });

    const result = buildFallbackResult(photoUri, friendly, {
      durationMs: totalMs,
      provider: "fallback",
      costUsdEstimate: null
    });

    logAnalysisReport({
      status: "fallback",
      provider,
      durationMs: totalMs,
      result,
      errorMessage: friendly
    });

    return result;
  }
}

/** Минимальная длительность loading для UX (3–6 сек). */
export async function runAnalysisWithLoading(
  photoUri: string,
  options?: AnalyzeFoodPhotoOptions
): Promise<AnalysisResult> {
  const minMs =
    AI_CONFIG.minLoadingMs +
    Math.floor(Math.random() * (AI_CONFIG.maxLoadingMs - AI_CONFIG.minLoadingMs + 1));

  const startedAt = Date.now();
  const result = await analyzeFoodPhoto(photoUri, options);
  const elapsed = Date.now() - startedAt;

  if (elapsed < minMs) {
    await delay(minMs - elapsed);
  }

  const totalMs = Date.now() - startedAt;
  const withTotalMeta = withMeta(result, {
    durationMs: totalMs,
    apiDurationMs: result.meta?.apiDurationMs,
    provider: result.source,
    inputTokens: result.meta?.inputTokens,
    outputTokens: result.meta?.outputTokens,
    costUsdEstimate: result.meta?.costUsdEstimate,
    apiAttempts: result.meta?.apiAttempts
  });

  logInfo("runAnalysisWithLoading завершён", {
    photoUri,
    provider: options?.forceProvider ?? AI_CONFIG.provider,
    totalMs,
    source: withTotalMeta.source,
    meta: withTotalMeta.meta,
    sample: buildResultSample(withTotalMeta)
  });

  return withTotalMeta;
}

export function getSourceLabel(source: AnalysisResult["source"]): string {
  if (source === "claude") return "AI · Claude";
  if (source === "grok") return "AI · Grok";
  if (source === "openai") return "AI · OpenAI";
  return "Локальная оценка";
}
