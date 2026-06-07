import { MealHistoryFilter } from "../types/mealLog";
import { SavedMealEntry } from "../types/mealLog";

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isWithinLastDays(date: Date, days: number): boolean {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return date.getTime() >= from.getTime();
}

export function filterMealsByPeriod(
  meals: SavedMealEntry[],
  filter: MealHistoryFilter
): SavedMealEntry[] {
  const now = new Date();

  if (filter === "all") return meals;

  if (filter === "today") {
    return meals.filter((m) => isSameDay(new Date(m.createdAt), now));
  }

  return meals.filter((m) => isWithinLastDays(new Date(m.createdAt), 7));
}

export function formatMealTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  if (isSameDay(date, now)) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  if (isWithinLastDays(date, 2) && !isSameDay(date, now)) {
    return "Вчера";
  }

  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function formatMealDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  });
}
