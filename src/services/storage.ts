import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { MealAnalysis } from "../navigation/types";
import { AnalysisSource } from "../types/analysis";
import { ProfileStats, UserProfile } from "../types/profile";
import { DailyTotals, MealHistoryFilter, SavedMealEntry } from "../types/mealLog";
import { filterMealsByPeriod, startOfDay } from "../utils/dateFilters";
import { buildMealTitle } from "../utils/mealTitle";
import {
  deleteCloudMeal,
  fetchCloudMealById,
  fetchCloudMeals,
  insertCloudMeal,
  updateCloudMeal
} from "./cloud/meals";
import { loadCloudProfile, saveCloudProfile } from "./cloud/profile";
import { getSessionUser } from "./session";

const STORAGE_KEY = "@kachai/meal_history";
const PROFILE_KEY = "@kachai/user_profile";

const DEFAULT_PROFILE: UserProfile = {
  displayName: "Бро Качок"
};

function createMealId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function persistPhoto(photoUri: string): Promise<string> {
  if (photoUri.startsWith(FileSystem.documentDirectory ?? "")) {
    return photoUri;
  }

  const dir = `${FileSystem.documentDirectory}meals/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const dest = `${dir}meal_${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: photoUri, to: dest });
  return dest;
}

async function readLocalMeals(): Promise<SavedMealEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as SavedMealEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

async function writeLocalMeals(meals: SavedMealEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meals));
}

async function upsertLocalMeal(entry: SavedMealEntry): Promise<void> {
  const meals = await readLocalMeals();
  const idx = meals.findIndex((m) => m.id === entry.id);
  if (idx === -1) {
    meals.unshift(entry);
  } else {
    meals[idx] = entry;
  }
  await writeLocalMeals(meals);
}

async function removeLocalMeal(id: string): Promise<SavedMealEntry | null> {
  const meals = await readLocalMeals();
  const target = meals.find((m) => m.id === id) ?? null;
  await writeLocalMeals(meals.filter((m) => m.id !== id));
  return target;
}

async function cleanupLocalPhoto(photoUri: string | undefined): Promise<void> {
  if (!photoUri?.startsWith(FileSystem.documentDirectory ?? "")) return;
  const remaining = await readLocalMeals();
  if (remaining.some((m) => m.photoUri === photoUri)) return;
  try {
    await FileSystem.deleteAsync(photoUri, { idempotent: true });
  } catch {
    // не критично
  }
}

export async function getAllMeals(): Promise<SavedMealEntry[]> {
  const user = await getSessionUser();
  if (user) {
    try {
      return await fetchCloudMeals(user);
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud meals fallback to local", error);
    }
  }
  return readLocalMeals();
}

export async function getMealsByFilter(filter: MealHistoryFilter): Promise<SavedMealEntry[]> {
  const all = await getAllMeals();
  return filterMealsByPeriod(all, filter);
}

export async function saveMealEntry(input: {
  photoUri: string;
  analysis: MealAnalysis;
  source: AnalysisSource;
  confidence?: number;
}): Promise<SavedMealEntry> {
  const persistedPhotoUri = await persistPhoto(input.photoUri);
  const user = await getSessionUser();

  if (user) {
    try {
      const cloud = await insertCloudMeal(user, {
        ...input,
        photoUri: persistedPhotoUri
      });
      await upsertLocalMeal({ ...cloud, photoUri: cloud.photoUri || persistedPhotoUri });
      return cloud;
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud meal insert failed, saving locally", error);
    }
  }

  const entry: SavedMealEntry = {
    id: createMealId(),
    createdAt: new Date().toISOString(),
    photoUri: persistedPhotoUri,
    title: buildMealTitle(input.analysis.foods),
    kcalTotal: input.analysis.kcalTotal,
    macros: {
      proteinG: input.analysis.macros.proteinG,
      fatG: input.analysis.macros.fatG,
      carbsG: input.analysis.macros.carbsG
    },
    foods: input.analysis.foods,
    source: input.source,
    confidence: input.confidence
  };

  const meals = await readLocalMeals();
  meals.unshift(entry);
  await writeLocalMeals(meals);
  return entry;
}

export async function getTodayTotals(): Promise<DailyTotals> {
  const todayMeals = await getMealsByFilter("today");

  return todayMeals.reduce<DailyTotals>(
    (acc, meal) => ({
      kcalTotal: acc.kcalTotal + meal.kcalTotal,
      proteinG: acc.proteinG + meal.macros.proteinG,
      fatG: acc.fatG + meal.macros.fatG,
      carbsG: acc.carbsG + meal.macros.carbsG,
      mealsCount: acc.mealsCount + 1
    }),
    { kcalTotal: 0, proteinG: 0, fatG: 0, carbsG: 0, mealsCount: 0 }
  );
}

export async function getTodayMeals(limit = 5): Promise<SavedMealEntry[]> {
  const today = await getMealsByFilter("today");
  return today.slice(0, limit);
}

export async function clearAllMeals(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function getMealById(id: string): Promise<SavedMealEntry | null> {
  const user = await getSessionUser();
  if (user) {
    try {
      const cloud = await fetchCloudMealById(user, id);
      if (cloud) return cloud;
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud meal by id fallback", error);
    }
  }

  const meals = await readLocalMeals();
  return meals.find((m) => m.id === id) ?? null;
}

export async function deleteMealEntry(id: string): Promise<void> {
  const user = await getSessionUser();
  if (user) {
    try {
      await deleteCloudMeal(user, id);
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud meal delete failed", error);
    }
  }

  const removed = await removeLocalMeal(id);
  await cleanupLocalPhoto(removed?.photoUri);
}

/** Обновление записи (для ручного редактирования результата). */
export async function updateMealEntry(
  id: string,
  patch: {
    title?: string;
    kcalTotal?: number;
    macros?: { proteinG: number; fatG: number; carbsG: number };
    foods?: SavedMealEntry["foods"];
  }
): Promise<SavedMealEntry | null> {
  const user = await getSessionUser();
  if (user) {
    try {
      const cloud = await updateCloudMeal(user, id, patch);
      if (cloud) {
        await upsertLocalMeal(cloud);
        return cloud;
      }
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud meal update failed", error);
    }
  }

  const meals = await readLocalMeals();
  const idx = meals.findIndex((m) => m.id === id);
  if (idx === -1) return null;

  const updated: SavedMealEntry = {
    ...meals[idx],
    ...patch,
    macros: patch.macros ?? meals[idx].macros,
    foods: patch.foods ?? meals[idx].foods
  };
  meals[idx] = updated;
  await writeLocalMeals(meals);
  return updated;
}

/** Для отладки: сколько записей за сегодня по локальной дате */
export function isToday(iso: string): boolean {
  return startOfDay(new Date(iso)).getTime() === startOfDay(new Date()).getTime();
}

export async function getProfileStats(): Promise<ProfileStats> {
  const meals = await getAllMeals();
  if (meals.length === 0) {
    return { totalMeals: 0, avgKcal: 0, totalKcal: 0, avgProteinG: 0 };
  }

  const totalKcal = meals.reduce((s, m) => s + m.kcalTotal, 0);
  const totalProtein = meals.reduce((s, m) => s + m.macros.proteinG, 0);

  return {
    totalMeals: meals.length,
    avgKcal: Math.round(totalKcal / meals.length),
    totalKcal,
    avgProteinG: Math.round(totalProtein / meals.length)
  };
}

export async function getUserProfile(): Promise<UserProfile> {
  const user = await getSessionUser();
  if (user) {
    try {
      return await loadCloudProfile(user);
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud profile fallback", error);
    }
  }

  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return DEFAULT_PROFILE;

  try {
    const parsed = JSON.parse(raw) as UserProfile;
    return {
      displayName: parsed.displayName?.trim() || DEFAULT_PROFILE.displayName
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const next: UserProfile = {
    displayName: profile.displayName.trim() || DEFAULT_PROFILE.displayName
  };

  const user = await getSessionUser();
  if (user) {
    try {
      await saveCloudProfile(user, next);
    } catch (error) {
      if (__DEV__) console.warn("[KachAI] cloud profile save failed", error);
    }
  }

  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
}
