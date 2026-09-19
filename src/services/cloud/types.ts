import type { AnalysisSource } from "../../types/analysis";

export type MealRow = {
  id: string;
  user_id: string;
  photo_url: string | null;
  title: string | null;
  calories: number;
  protein: number;
  fats: number;
  carbs: number;
  foods_json: unknown;
  confidence: number | null;
  source: string;
  created_at: string;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  plan: string | null;
  trial_end: string | null;
  access_until: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
};

export type MealFoodJson = {
  name: string;
  grams: number;
  calories: number;
};

export const MEAL_PHOTOS_BUCKET = "meal-photos";

export const ANALYSIS_SOURCES: AnalysisSource[] = ["claude", "grok", "openai", "fallback"];
