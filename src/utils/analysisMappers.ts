import { MealAnalysis } from "../navigation/types";
import { AnalysisResult } from "../types/analysis";

export function toMealAnalysis(result: AnalysisResult): MealAnalysis {
  const proteinG = Math.round(result.protein);
  const fatG = Math.round(result.fats);
  const carbsG = Math.round(result.carbs);
  const kcalTotal = Math.round(result.calories);

  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsKcal = carbsG * 4;
  const macroKcal = Math.max(proteinKcal + fatKcal + carbsKcal, 1);

  const toPct = (k: number) => Math.round((k / macroKcal) * 100);

  return {
    kcalTotal,
    macros: {
      proteinG,
      fatG,
      carbsG,
      proteinPct: toPct(proteinKcal),
      fatPct: toPct(fatKcal),
      carbsPct: toPct(carbsKcal)
    },
    foods: result.foods.map((f) => ({
      name: f.name,
      grams: Math.round(f.grams),
      kcal: Math.round(f.calories)
    }))
  };
}

export function mealAnalysisToAnalysisResult(
  meal: MealAnalysis,
  source: AnalysisResult["source"],
  message?: string
): AnalysisResult {
  return {
    calories: meal.kcalTotal,
    protein: meal.macros.proteinG,
    fats: meal.macros.fatG,
    carbs: meal.macros.carbsG,
    foods: meal.foods.map((f) => ({
      name: f.name,
      grams: f.grams,
      calories: f.kcal
    })),
    source,
    message
  };
}
