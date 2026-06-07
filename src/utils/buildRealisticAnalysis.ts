import { MealAnalysis } from "../navigation/types";

type FoodItem = MealAnalysis["foods"][number];

const MEAL_TEMPLATES: FoodItem[][] = [
  [
    { name: "Куриная грудка", grams: 165, kcal: 272, proteinG: 52, fatG: 6, carbsG: 0 },
    { name: "Рис басмати", grams: 200, kcal: 260, proteinG: 5, fatG: 1, carbsG: 57 },
    { name: "Овощной микс", grams: 90, kcal: 38, proteinG: 2, fatG: 0, carbsG: 8 }
  ],
  [
    { name: "Говядина на гриле", grams: 140, kcal: 310, proteinG: 38, fatG: 18, carbsG: 0 },
    { name: "Картофель", grams: 180, kcal: 156, proteinG: 4, fatG: 0, carbsG: 36 },
    { name: "Салат", grams: 110, kcal: 45, proteinG: 2, fatG: 3, carbsG: 5 }
  ],
  [
    { name: "Лосось", grams: 150, kcal: 312, proteinG: 34, fatG: 19, carbsG: 0 },
    { name: "Киноа", grams: 160, kcal: 192, proteinG: 7, fatG: 3, carbsG: 32 },
    { name: "Авокадо", grams: 70, kcal: 112, proteinG: 1, fatG: 10, carbsG: 6 }
  ],
  [
    { name: "Яичница (3 яйца)", grams: 150, kcal: 234, proteinG: 18, fatG: 17, carbsG: 2 },
    { name: "Тост цельнозерновой", grams: 80, kcal: 198, proteinG: 8, fatG: 3, carbsG: 32 },
    { name: "Сыр", grams: 40, kcal: 142, proteinG: 9, fatG: 11, carbsG: 1 }
  ],
  [
    { name: "Творог 5%", grams: 200, kcal: 240, proteinG: 34, fatG: 10, carbsG: 8 },
    { name: "Банан", grams: 120, kcal: 107, proteinG: 1, fatG: 0, carbsG: 27 },
    { name: "Мёд", grams: 15, kcal: 46, proteinG: 0, fatG: 0, carbsG: 12 }
  ]
];

function hashUri(uri: string): number {
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    hash = (hash << 5) - hash + uri.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildFromFoods(foods: FoodItem[]): MealAnalysis {
  const proteinG = foods.reduce((s, f) => s + (f.proteinG ?? 0), 0);
  const fatG = foods.reduce((s, f) => s + (f.fatG ?? 0), 0);
  const carbsG = foods.reduce((s, f) => s + (f.carbsG ?? 0), 0);
  const kcalTotal = foods.reduce((s, f) => s + f.kcal, 0);

  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbsKcal = carbsG * 4;
  const macroKcal = Math.max(proteinKcal + fatKcal + carbsKcal, 1);

  const toPct = (k: number) => Math.round((k / macroKcal) * 100);

  return {
    kcalTotal,
    macros: {
      proteinG,
      fatG,
      carbsG,
      proteinPct: toPct(proteinKcal),
      fatPct: toPct(fatKcal),
      carbsPct: toPct(carbsKcal)
    },
    foods
  };
}

/** Правдоподобный fake-анализ на основе URI фото (детерминированно для одного снимка). */
export function buildRealisticAnalysis(photoUri: string): MealAnalysis {
  const index = hashUri(photoUri) % MEAL_TEMPLATES.length;
  const base = MEAL_TEMPLATES[index];
  const variance = (hashUri(photoUri + "v") % 11) - 5;

  const foods = base.map((item, i) => {
    const factor = 1 + (variance + i) / 100;
    const grams = Math.round(item.grams * factor);
    const kcal = Math.round(item.kcal * factor);
    const proteinG = item.proteinG != null ? Math.round(item.proteinG * factor) : undefined;
    const fatG = item.fatG != null ? Math.round(item.fatG * factor) : undefined;
    const carbsG = item.carbsG != null ? Math.round(item.carbsG * factor) : undefined;
    return { ...item, grams, kcal, proteinG, fatG, carbsG };
  });

  return buildFromFoods(foods);
}
