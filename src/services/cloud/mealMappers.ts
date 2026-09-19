import type { MealAnalysis } from "../../navigation/types";
import type { AnalysisSource } from "../../types/analysis";
import type { SavedMealEntry } from "../../types/mealLog";
import { ANALYSIS_SOURCES, type MealFoodJson, type MealRow } from "./types";

function toInt(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function parseFoodsJson(raw: unknown): MealAnalysis["foods"] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const calories = row.calories ?? row.kcal;
      return {
        name: String(row.name ?? "Продукт").trim() || "Продукт",
        grams: toInt(row.grams),
        kcal: toInt(calories)
      };
    })
    .filter((item) => item.grams > 0 || item.kcal > 0);
}

export function foodsToJson(foods: MealAnalysis["foods"]): MealFoodJson[] {
  return foods.map((item) => ({
    name: item.name,
    grams: toInt(item.grams),
    calories: toInt(item.kcal)
  }));
}

export function parseAnalysisSource(value: string | null | undefined): AnalysisSource {
  if (value && (ANALYSIS_SOURCES as string[]).includes(value)) {
    return value as AnalysisSource;
  }
  return "fallback";
}

export function mealRowToEntry(row: MealRow, photoUri: string): SavedMealEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    photoUri,
    title: row.title?.trim() || "Приём пищи",
    kcalTotal: toInt(row.calories),
    macros: {
      proteinG: toInt(row.protein),
      fatG: toInt(row.fats),
      carbsG: toInt(row.carbs)
    },
    foods: parseFoodsJson(row.foods_json),
    source: parseAnalysisSource(row.source),
    confidence: row.confidence ?? undefined
  };
}

export function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function isLocalFileUri(value: string): boolean {
  return (
    value.startsWith("file://") ||
    value.startsWith("content://") ||
    value.startsWith("ph://") ||
    value.startsWith("assets-library://")
  );
}

/** Путь объекта в bucket, если photo_url не локальный и не http(s). */
export function toStorageObjectPath(photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  if (isHttpUrl(photoUrl) || isLocalFileUri(photoUrl)) return null;
  return photoUrl.replace(/^storage:\/\//, "").replace(/^meal-photos\//, "");
}
