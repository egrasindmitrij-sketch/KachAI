import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  foodsToJson,
  isHttpUrl,
  isLocalFileUri,
  mealRowToEntry,
  parseAnalysisSource,
  parseFoodsJson,
  toStorageObjectPath
} from "./mealMappers";

describe("meal cloud mappers", () => {
  it("accepts both calories and kcal in foods_json", () => {
    const foods = parseFoodsJson([
      { name: "Рис", grams: 180, calories: 210 },
      { name: "Курица", grams: 150, kcal: 240 }
    ]);
    assert.deepEqual(foods, [
      { name: "Рис", grams: 180, kcal: 210 },
      { name: "Курица", grams: 150, kcal: 240 }
    ]);
    assert.deepEqual(foodsToJson(foods), [
      { name: "Рис", grams: 180, calories: 210 },
      { name: "Курица", grams: 150, calories: 240 }
    ]);
  });

  it("maps a DB row into SavedMealEntry", () => {
    const entry = mealRowToEntry(
      {
        id: "11111111-1111-1111-1111-111111111111",
        user_id: "user-1",
        photo_url: "user-1/meal.jpg",
        title: "Гречка + курица",
        calories: 700,
        protein: 50,
        fats: 18,
        carbs: 70,
        foods_json: [{ name: "Гречка", grams: 200, calories: 220 }],
        confidence: 81,
        source: "claude",
        created_at: "2026-09-19T10:00:00.000Z"
      },
      "https://signed.example/meal.jpg"
    );

    assert.equal(entry.kcalTotal, 700);
    assert.equal(entry.macros.fatG, 18);
    assert.equal(entry.photoUri, "https://signed.example/meal.jpg");
    assert.equal(entry.confidence, 81);
    assert.equal(entry.source, "claude");
    assert.equal(parseAnalysisSource("unknown"), "fallback");
  });

  it("detects storage object paths vs local/http uris", () => {
    assert.equal(isHttpUrl("https://x.supabase.co/storage/v1/object/sign/x"), true);
    assert.equal(isLocalFileUri("file:///data/meals/a.jpg"), true);
    assert.equal(toStorageObjectPath("user-1/abc.jpg"), "user-1/abc.jpg");
    assert.equal(toStorageObjectPath("storage://user-1/abc.jpg"), "user-1/abc.jpg");
    assert.equal(toStorageObjectPath("https://cdn.example/a.jpg"), null);
  });
});
