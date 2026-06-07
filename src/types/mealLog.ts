import { MealAnalysis } from "../navigation/types";
import { AnalysisSource } from "./analysis";

export type SavedMealEntry = {
  id: string;
  createdAt: string;
  photoUri: string;
  title: string;
  kcalTotal: number;
  macros: {
    proteinG: number;
    fatG: number;
    carbsG: number;
  };
  foods: MealAnalysis["foods"];
  source: AnalysisSource;
};

export type MealHistoryFilter = "today" | "week" | "all";

export type DailyTotals = {
  kcalTotal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  mealsCount: number;
};
