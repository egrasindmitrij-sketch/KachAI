import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { CLAUDE_SYSTEM_PROMPT, USER_JSON_INSTRUCTION } from "../_shared/claudePrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

type AnalyzeRequest = {
  base64?: string;
  mediaType?: string;
};

type FoodItem = { name: string; grams: number; calories: number };

type AnalyzeResponse = {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  confidence?: number;
  foods: FoodItem[];
  usage?: { input_tokens: number; output_tokens: number };
};

type ClaudeApiResponse = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-4-6";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("ИИ вернул невалидный JSON");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function toInt(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function normalizeFoods(raw: unknown): FoodItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [{ name: "Блюдо", grams: 250, calories: 400 }];
  }
  return raw
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        name: String(row.name ?? "Продукт").trim() || "Продукт",
        grams: toInt(row.grams),
        calories: toInt(row.calories)
      };
    })
    .filter((f) => f.grams > 0 || f.calories > 0)
    .slice(0, 8);
}

function normalizePayload(payload: Record<string, unknown>): AnalyzeResponse {
  const foods = normalizeFoods(payload.foods);
  const calories = toInt(payload.calories) || foods.reduce((s, f) => s + f.calories, 0);
  const confidenceRaw = Number(payload.confidence);
  const confidence =
    Number.isFinite(confidenceRaw) ? Math.max(0, Math.min(100, Math.round(confidenceRaw))) : undefined;

  return {
    calories: Math.max(calories, 1),
    protein: toInt(payload.protein),
    fats: toInt(payload.fats),
    carbs: toInt(payload.carbs),
    foods,
    ...(confidence !== undefined ? { confidence } : {})
  };
}

function describeClaudeError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    const msg = parsed.error?.message ?? body.slice(0, 160);
    if (status === 401) return "Claude: неверный API-ключ на сервере";
    if (status === 429) return "Claude: превышен лимит запросов";
    if (status === 404) return `Claude: модель ${CLAUDE_MODEL} недоступна`;
    return `Claude API ${status}: ${msg}`.slice(0, 180);
  } catch {
    return `Claude API ${status}`;
  }
}

async function logAnalysis(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  entry: {
    status: "success" | "error";
    input_tokens?: number;
    output_tokens?: number;
    duration_ms?: number;
    error_message?: string;
  }
) {
  try {
    await supabase.from("analysis_logs").insert({
      user_id: userId,
      ...entry
    });
  } catch {
    // логирование не критично
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const startedAt = Date.now();
  const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!claudeApiKey) {
    return jsonResponse({ error: "CLAUDE_API_KEY не задан в секретах Edge Function" }, 500);
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Supabase env не настроен" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Требуется авторизация" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Неверная или просроченная сессия" }, 401);
  }

  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return jsonResponse({ error: "Невалидное тело запроса" }, 400);
  }

  const base64 = body.base64?.trim();
  const mediaType = body.mediaType ?? "image/jpeg";

  if (!base64 || base64.length < 100) {
    return jsonResponse({ error: "base64 фото обязателен" }, 400);
  }

  const allowedMedia = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const claudeMediaType = allowedMedia.includes(mediaType) ? mediaType : "image/jpeg";

  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
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
    });

    const apiDurationMs = Date.now() - startedAt;

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      const friendly = describeClaudeError(claudeRes.status, errText);
      await logAnalysis(supabase, user.id, {
        status: "error",
        duration_ms: apiDurationMs,
        error_message: friendly
      });
      return jsonResponse({ error: friendly }, 502);
    }

    const claudeData = (await claudeRes.json()) as ClaudeApiResponse;
    const text = claudeData.content?.find((b) => b.type === "text")?.text;
    if (!text?.trim()) {
      await logAnalysis(supabase, user.id, {
        status: "error",
        duration_ms: apiDurationMs,
        error_message: "Пустой ответ Claude"
      });
      return jsonResponse({ error: "Пустой ответ Claude API" }, 502);
    }

    const parsed = normalizePayload(extractJsonObject(text));
    const usage =
      claudeData.usage?.input_tokens != null && claudeData.usage?.output_tokens != null
        ? {
            input_tokens: claudeData.usage.input_tokens,
            output_tokens: claudeData.usage.output_tokens
          }
        : undefined;

    await logAnalysis(supabase, user.id, {
      status: "success",
      input_tokens: usage?.input_tokens,
      output_tokens: usage?.output_tokens,
      duration_ms: apiDurationMs
    });

    const response: AnalyzeResponse = { ...parsed, usage };
    return jsonResponse(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    await logAnalysis(supabase, user.id, {
      status: "error",
      duration_ms: Date.now() - startedAt,
      error_message: message
    });
    return jsonResponse({ error: message }, 500);
  }
});
