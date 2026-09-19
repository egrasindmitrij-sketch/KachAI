import { MealAnalysis } from "../../navigation/types";
import { AnalysisSource } from "../../types/analysis";
import { SavedMealEntry } from "../../types/mealLog";
import { buildMealTitle } from "../../utils/mealTitle";
import { getSupabaseClient } from "../supabase";
import { SessionUser } from "../session";
import { ensureCloudUser } from "./ensureUser";
import { foodsToJson, mealRowToEntry } from "./mealMappers";
import { removeMealPhoto, resolveMealPhotoUri, uploadMealPhoto } from "./photos";
import { MealRow } from "./types";

export async function fetchCloudMeals(user: SessionUser): Promise<SavedMealEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase не настроен");

  await ensureCloudUser(user);

  const { data, error } = await supabase
    .from("meals")
    .select(
      "id, user_id, photo_url, title, calories, protein, fats, carbs, foods_json, confidence, source, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MealRow[];
  return Promise.all(
    rows.map(async (row) => mealRowToEntry(row, await resolveMealPhotoUri(row.photo_url)))
  );
}

export async function fetchCloudMealById(
  user: SessionUser,
  id: string
): Promise<SavedMealEntry | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("meals")
    .select(
      "id, user_id, photo_url, title, calories, protein, fats, carbs, foods_json, confidence, source, created_at"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as MealRow;
  return mealRowToEntry(row, await resolveMealPhotoUri(row.photo_url));
}

export async function insertCloudMeal(
  user: SessionUser,
  input: {
    photoUri: string;
    analysis: MealAnalysis;
    source: AnalysisSource;
    confidence?: number;
  }
): Promise<SavedMealEntry> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase не настроен");

  await ensureCloudUser(user);

  const title = buildMealTitle(input.analysis.foods);
  const { data, error } = await supabase
    .from("meals")
    .insert({
      user_id: user.id,
      photo_url: input.photoUri,
      title,
      calories: input.analysis.kcalTotal,
      protein: input.analysis.macros.proteinG,
      fats: input.analysis.macros.fatG,
      carbs: input.analysis.macros.carbsG,
      foods_json: foodsToJson(input.analysis.foods),
      confidence: input.confidence ?? null,
      source: input.source
    })
    .select(
      "id, user_id, photo_url, title, calories, protein, fats, carbs, foods_json, confidence, source, created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Не удалось сохранить приём пищи в облако");
  }

  const row = data as MealRow;
  const uploadedPath = await uploadMealPhoto(user.id, row.id, input.photoUri);
  if (uploadedPath) {
    const { error: photoError } = await supabase
      .from("meals")
      .update({ photo_url: uploadedPath })
      .eq("id", row.id)
      .eq("user_id", user.id);
    if (!photoError) {
      row.photo_url = uploadedPath;
    }
  }

  return mealRowToEntry(row, await resolveMealPhotoUri(row.photo_url, input.photoUri));
}

export async function updateCloudMeal(
  user: SessionUser,
  id: string,
  patch: {
    title?: string;
    kcalTotal?: number;
    macros?: { proteinG: number; fatG: number; carbsG: number };
    foods?: SavedMealEntry["foods"];
  }
): Promise<SavedMealEntry | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.kcalTotal !== undefined) payload.calories = patch.kcalTotal;
  if (patch.macros) {
    payload.protein = patch.macros.proteinG;
    payload.fats = patch.macros.fatG;
    payload.carbs = patch.macros.carbsG;
  }
  if (patch.foods) payload.foods_json = foodsToJson(patch.foods);

  const { data, error } = await supabase
    .from("meals")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(
      "id, user_id, photo_url, title, calories, protein, fats, carbs, foods_json, confidence, source, created_at"
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as MealRow;
  return mealRowToEntry(row, await resolveMealPhotoUri(row.photo_url));
}

export async function deleteCloudMeal(user: SessionUser, id: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { data } = await supabase
    .from("meals")
    .select("photo_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("meals").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);

  await removeMealPhoto((data as { photo_url?: string | null } | null)?.photo_url ?? null);
}
