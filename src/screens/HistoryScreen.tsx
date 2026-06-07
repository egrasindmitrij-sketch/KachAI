import { NavigationProp, useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getMealsByFilter } from "../services/storage";
import { RootStackParamList } from "../navigation/types";
import { MealHistoryFilter, SavedMealEntry } from "../types/mealLog";
import { formatMealDate, formatMealTime } from "../utils/dateFilters";

const FILTERS: Array<{ id: MealHistoryFilter; label: string }> = [
  { id: "today", label: "Сегодня" },
  { id: "week", label: "Неделя" },
  { id: "all", label: "Все" }
];

export function HistoryScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [filter, setFilter] = useState<MealHistoryFilter>("today");
  const [meals, setMeals] = useState<SavedMealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMeals = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMealsByFilter(filter);
      setMeals(data);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadMeals();
    }, [loadMeals])
  );

  return (
    <SafeAreaView className="flex-1 bg-gym-bg" edges={["left", "right"]}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10 pt-2">
        <View className="mb-5">
          <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">Дневник</Text>
          <Text className="mt-1 text-3xl font-extrabold text-white">История приёмов</Text>
          <Text className="mt-1 text-sm font-semibold text-gym-muted">
            Все сохранённые анализы тарелок
          </Text>
        </View>

        <View className="mb-5 flex-row gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                className={`flex-1 items-center rounded-xl border px-3 py-3 ${
                  active ? "border-gym-red bg-gym-red" : "border-zinc-800 bg-gym-card"
                }`}
              >
                <Text
                  className={`text-xs font-extrabold uppercase tracking-wide ${
                    active ? "text-white" : "text-gym-muted"
                  }`}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#D00000" />
          </View>
        ) : meals.length === 0 ? (
          <View className="items-center rounded-2xl border border-dashed border-zinc-700 bg-gym-card px-6 py-12">
            <Text className="text-lg font-extrabold text-white">Пока пусто</Text>
            <Text className="mt-2 text-center text-sm font-semibold text-gym-muted">
              Сохрани анализ из экрана результата — и он появится здесь.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {meals.map((meal) => (
              <Pressable
                key={meal.id}
                onPress={() => navigation.navigate("MealDetail", { mealId: meal.id })}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-gym-card active:opacity-90"
              >
                <Image source={{ uri: meal.photoUri }} className="h-40 w-full" resizeMode="cover" />
                <View className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Text className="text-lg font-extrabold text-white">{meal.title}</Text>
                      <Text className="mt-1 text-xs font-bold text-gym-muted">
                        {formatMealDate(meal.createdAt)}
                      </Text>
                      <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-gym-red">
                        {formatMealTime(meal.createdAt)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-3xl font-extrabold text-gym-red">{meal.kcalTotal}</Text>
                      <Text className="text-xs font-extrabold uppercase text-gym-muted">ккал</Text>
                    </View>
                  </View>

                  <View className="mt-4 flex-row gap-2">
                    <View className="flex-1 rounded-lg border border-gym-red/40 bg-black px-3 py-2">
                      <Text className="text-center text-xs font-extrabold text-gym-muted">Б</Text>
                      <Text className="text-center text-base font-extrabold text-gym-red">
                        {meal.macros.proteinG}г
                      </Text>
                    </View>
                    <View className="flex-1 rounded-lg border border-amber-500/40 bg-black px-3 py-2">
                      <Text className="text-center text-xs font-extrabold text-gym-muted">Ж</Text>
                      <Text className="text-center text-base font-extrabold text-amber-500">
                        {meal.macros.fatG}г
                      </Text>
                    </View>
                    <View className="flex-1 rounded-lg border border-emerald-500/40 bg-black px-3 py-2">
                      <Text className="text-center text-xs font-extrabold text-gym-muted">У</Text>
                      <Text className="text-center text-base font-extrabold text-emerald-500">
                        {meal.macros.carbsG}г
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
