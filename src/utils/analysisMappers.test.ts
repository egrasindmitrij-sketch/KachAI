import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mealAnalysisToAnalysisResult, toMealAnalysis } from "./analysisMappers";
import { buildMealTitle } from "./mealTitle";

describe("analysisMappers", () => {
  it("converts AI result to meal analysis with macro percents", () => {
    const meal = toMealAnalysis({
      calories: 620,
      protein: 45,
      fats: 20,
      carbs: 50,
      foods: [{ name: "Гречка", grams: 200, calories: 220 }],
      source: "claude"
    });

    assert.equal(meal.kcalTotal, 620);
    assert.equal(meal.macros.proteinG, 45);
    assert.equal(meal.macros.fatG, 20);
    assert.equal(meal.macros.carbsG, 50);
    assert.equal(meal.macros.proteinPct + meal.macros.fatPct + meal.macros.carbsPct, 100);
    assert.equal(meal.foods[0]?.kcal, 220);
  });

  it("round-trips meal analysis back to AI result", () => {
    const meal = toMealAnalysis({
      calories: 400,
      protein: 30,
      fats: 10,
      carbs: 40,
      foods: [{ name: "Творог", grams: 200, calories: 200 }],
      source: "fallback"
    });
    const back = mealAnalysisToAnalysisResult(meal, "fallback", "локально");
    assert.equal(back.calories, 400);
    assert.equal(back.fats, 10);
    assert.equal(back.foods[0]?.calories, 200);
    assert.equal(back.message, "локально");
  });
});

describe("buildMealTitle", () => {
  it("uses first two food names", () => {
    assert.equal(buildMealTitle([]), "Приём пищи");
    assert.equal(buildMealTitle([{ name: "Гречка", grams: 150, kcal: 160 }]), "Гречка");
    assert.equal(
      buildMealTitle([
        { name: "Гречка", grams: 150, kcal: 160 },
        { name: "Курица", grams: 180, kcal: 250 }
      ]),
      "Гречка + Курица"
    );
  });
});
