export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  Subscription: undefined;
  Result: {
    photoUri: string;
    /** Быстрый тест: принудительно Claude API */
    testClaude?: boolean;
  };
  MealDetail: {
    mealId: string;
  };
};

export type MealAnalysis = {
  kcalTotal: number;
  macros: {
    proteinG: number;
    fatG: number;
    carbsG: number;
    proteinPct: number;
    fatPct: number;
    carbsPct: number;
  };
  foods: Array<{
    name: string;
    grams: number;
    kcal: number;
    proteinG?: number;
    fatG?: number;
    carbsG?: number;
  }>;
};

export type MainTabParamList = {
  Home: undefined;
  Camera: undefined;
  History: undefined;
  Profile: undefined;
};
