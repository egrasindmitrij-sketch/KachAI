import type { MealAnalysis } from "../navigation/types";

export function buildMealTitle(foods: MealAnalysis["foods"]): string {
  if (foods.length === 0) return "Приём пищи";
  if (foods.length === 1) return foods[0].name;
  return `${foods[0].name} + ${foods[1].name}`;
}
