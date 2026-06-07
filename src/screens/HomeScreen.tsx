import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { NavigationProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GymButton } from "../components/ui/GymButton";
import { GymCard } from "../components/ui/GymCard";
import { MacroBar } from "../components/ui/MacroBar";
import { StatTile } from "../components/ui/StatTile";
import { DAILY_GOALS } from "../constants/goals";
import { useSubscription } from "../context/SubscriptionContext";
import { MainTabParamList, RootStackParamList } from "../navigation/types";
import { getStatusLabel } from "../services/subscriptionStorage";
import { formatCountdown } from "../utils/formatCountdown";
import { getTodayMeals, getTodayTotals } from "../services/storage";
import { DailyTotals, SavedMealEntry } from "../types/mealLog";
import { formatMealTime } from "../utils/dateFilters";
import { getMotivationMessage } from "../utils/motivation";

export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const rootNavigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { state, hasAccess, timeLeftMs } = useSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [totals, setTotals] = useState<DailyTotals>({
    kcalTotal: 0,
    proteinG: 0,
    fatG: 0,
    carbsG: 0,
    mealsCount: 0
  });
  const [recentMeals, setRecentMeals] = useState<SavedMealEntry[]>([]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [todayTotals, todayMeals] = await Promise.all([getTodayTotals(), getTodayMeals(5)]);
      setTotals(todayTotals);
      setRecentMeals(todayMeals);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const caloriesCurrent = totals.kcalTotal;
  const caloriesGoal = DAILY_GOALS.kcal;
  const caloriesLeft = Math.max(caloriesGoal - caloriesCurrent, 0);
  const caloriesProgress = Math.min(caloriesCurrent / caloriesGoal, 1);

  const motivation = useMemo(
    () => getMotivationMessage(caloriesCurrent, caloriesGoal, totals.mealsCount),
    [caloriesCurrent, caloriesGoal, totals.mealsCount]
  );

  return (
    <SafeAreaView className="flex-1 bg-gym-bg" edges={["left", "right"]}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-8 pt-2">
        <View className="mb-4">
          <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">Сегодня</Text>
          <Text className="mt-1 text-3xl font-extrabold text-white">Привет, Бро</Text>
          <Text className="mt-1 text-sm font-semibold text-gym-muted">
            Цель: набор массы · {caloriesGoal} ккал · {totals.mealsCount} приём(ов)
          </Text>
        </View>

        <View className="mb-4 rounded-2xl border border-gym-red/50 bg-gym-red/10 px-4 py-4">
          <Text className="text-lg font-extrabold text-white">{motivation.title}</Text>
          <Text className="mt-1 text-sm font-semibold text-gym-muted">{motivation.subtitle}</Text>
        </View>

        {state?.status === "trial" ? (
          <Pressable
            className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3"
            onPress={() => rootNavigation.navigate("Subscription")}
          >
            <Text className="text-xs font-extrabold uppercase text-amber-400">
              Триал · {getStatusLabel(state.status)}
            </Text>
            <Text className="mt-1 text-sm font-bold text-white">Осталось {formatCountdown(timeLeftMs)}</Text>
          </Pressable>
        ) : null}

        {!hasAccess ? (
          <Pressable
            className="mb-4 rounded-xl border border-gym-red bg-gym-red/10 px-4 py-3"
            onPress={() => rootNavigation.navigate("Subscription")}
          >
            <Text className="text-sm font-extrabold text-gym-red">Подписка просрочена</Text>
            <Text className="mt-1 text-xs font-semibold text-gym-muted">
              Оформи тариф, чтобы снова сканировать еду
            </Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <View className="mb-6 items-center py-10">
            <ActivityIndicator size="large" color="#D00000" />
          </View>
        ) : (
          <>
            <GymCard className="mb-4">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">Калории</Text>
              <View className="mt-3 flex-row items-end justify-between">
                <View>
                  <Text className="text-5xl font-extrabold text-gym-red">{caloriesCurrent}</Text>
                  <Text className="text-sm font-bold text-gym-muted">из {caloriesGoal} ккал</Text>
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-extrabold text-white">{caloriesLeft}</Text>
                  <Text className="text-xs font-bold uppercase text-gym-muted">осталось</Text>
                </View>
              </View>
              <View className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-900">
                <View
                  className="h-full rounded-full bg-gym-red"
                  style={{ width: `${caloriesProgress * 100}%` }}
                />
              </View>
            </GymCard>

            <View className="mb-4 flex-row gap-3">
              <StatTile value={`${totals.proteinG}г`} label="Белки" highlight />
              <StatTile value={`${totals.fatG}г`} label="Жиры" />
              <StatTile value={`${totals.carbsG}г`} label="Углев." />
            </View>

            <GymCard title="Макросы дня" className="mb-4 gap-4">
              <MacroBar
                label="Белки"
                current={totals.proteinG}
                goal={DAILY_GOALS.proteinG}
                accentClassName="bg-red-500"
              />
              <MacroBar
                label="Жиры"
                current={totals.fatG}
                goal={DAILY_GOALS.fatG}
                accentClassName="bg-amber-500"
              />
              <MacroBar
                label="Углеводы"
                current={totals.carbsG}
                goal={DAILY_GOALS.carbsG}
                accentClassName="bg-emerald-500"
              />
            </GymCard>
          </>
        )}

        <GymButton label="Сканировать тарелку" onPress={() => navigation.navigate("Camera")} />

        <View className="mt-8">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-white">Недавние приёмы</Text>
            <Pressable onPress={() => navigation.navigate("History")}>
              <Text className="text-sm font-extrabold uppercase text-gym-red">Все</Text>
            </Pressable>
          </View>

          {recentMeals.length === 0 ? (
            <View className="rounded-xl border border-zinc-800 bg-gym-card px-4 py-5">
              <Text className="font-extrabold text-white">Сегодня ещё пусто</Text>
              <Text className="mt-1 text-sm font-semibold text-gym-muted">
                Сфотографируй тарелку и сохрани анализ в дневник.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {recentMeals.map((meal) => (
                <View
                  key={meal.id}
                  className="flex-row items-center justify-between rounded-xl border border-zinc-800 bg-gym-card px-4 py-4"
                >
                  <View className="flex-1 pr-3">
                    <Text className="font-extrabold text-white">{meal.title}</Text>
                    <Text className="mt-1 text-xs font-bold text-gym-muted">{formatMealTime(meal.createdAt)}</Text>
                  </View>
                  <Text className="text-lg font-extrabold text-gym-red">{meal.kcalTotal}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
