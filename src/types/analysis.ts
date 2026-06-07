export type AnalysisFoodItem = {
  name: string;
  grams: number;
  calories: number;
};

export type AnalysisSource = "claude" | "grok" | "openai" | "fallback";

export type AnalysisMeta = {
  durationMs: number;
  apiDurationMs?: number;
  provider: AnalysisSource;
  inputTokens?: number;
  outputTokens?: number;
  /** Оценка в USD по тарифам Anthropic (Claude) */
  costUsdEstimate?: number | null;
  apiAttempts?: number;
};

export type AnalysisResult = {
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  foods: AnalysisFoodItem[];
  source: AnalysisSource;
  /** Уверенность модели в оценке, 0–100 */
  confidence?: number;
  /** Сообщение для UI (ошибка, fallback, подсказка) */
  message?: string;
  meta?: AnalysisMeta;
};
