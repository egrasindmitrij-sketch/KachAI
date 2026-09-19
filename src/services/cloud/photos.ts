import { getSupabaseClient } from "../supabase";
import { isHttpUrl, isLocalFileUri, toStorageObjectPath } from "./mealMappers";
import { MEAL_PHOTOS_BUCKET } from "./types";

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

function guessContentType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function extensionForContentType(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export function mealPhotoObjectPath(userId: string, mealId: string, photoUri: string): string {
  return `${userId}/${mealId}.${extensionForContentType(guessContentType(photoUri))}`;
}

/** Загрузка фото в private bucket. При ошибке (нет bucket) возвращает null. */
export async function uploadMealPhoto(
  userId: string,
  mealId: string,
  photoUri: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const response = await fetch(photoUri);
    if (!response.ok) return null;
    const body = await response.arrayBuffer();
    const contentType = guessContentType(photoUri);
    const path = mealPhotoObjectPath(userId, mealId, photoUri);

    const { error } = await supabase.storage.from(MEAL_PHOTOS_BUCKET).upload(path, body, {
      contentType,
      upsert: true
    });

    if (error) {
      if (__DEV__) {
        console.warn("[KachAI] upload meal photo", error.message);
      }
      return null;
    }

    return path;
  } catch (error) {
    if (__DEV__) {
      console.warn("[KachAI] upload meal photo failed", error);
    }
    return null;
  }
}

export async function removeMealPhoto(photoUrl: string | null): Promise<void> {
  const supabase = getSupabaseClient();
  const path = toStorageObjectPath(photoUrl);
  if (!supabase || !path) return;

  try {
    await supabase.storage.from(MEAL_PHOTOS_BUCKET).remove([path]);
  } catch {
    // не критично
  }
}

export async function resolveMealPhotoUri(
  photoUrl: string | null,
  fallbackLocalUri?: string
): Promise<string> {
  if (photoUrl && (isHttpUrl(photoUrl) || isLocalFileUri(photoUrl))) {
    return photoUrl;
  }

  const supabase = getSupabaseClient();
  const path = toStorageObjectPath(photoUrl);
  if (supabase && path) {
    const { data, error } = await supabase.storage
      .from(MEAL_PHOTOS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SEC);
    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return fallbackLocalUri || photoUrl || "";
}
