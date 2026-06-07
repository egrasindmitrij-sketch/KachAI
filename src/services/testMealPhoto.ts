import * as FileSystem from "expo-file-system/legacy";

/** Стабильное тестовое фото тарелки (кэшируется локально). */
const TEST_MEAL_IMAGE_URL =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80";

const CACHED_TEST_PHOTO = `${FileSystem.cacheDirectory}kachai_test_meal.jpg`;

export async function getTestMealPhotoUri(): Promise<string> {
  const info = await FileSystem.getInfoAsync(CACHED_TEST_PHOTO);
  if (info.exists) {
    return CACHED_TEST_PHOTO;
  }

  const downloaded = await FileSystem.downloadAsync(TEST_MEAL_IMAGE_URL, CACHED_TEST_PHOTO);
  return downloaded.uri;
}
