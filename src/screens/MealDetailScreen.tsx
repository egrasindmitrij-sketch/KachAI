import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useUi } from "../context/UiContext";
import { RootStackParamList } from "../navigation/types";
import { deleteMealEntry, getMealById, updateMealEntry } from "../services/storage";
import { getSourceLabel } from "../services/aiAnalysis";
import { SavedMealEntry } from "../types/mealLog";
import { formatMealDate, formatMealTime } from "../utils/dateFilters";

type Props = NativeStackScreenProps<RootStackParamList, "MealDetail">;

type EditableFood = {
  name: string;
  grams: string;
  kcal: string;
};

function toInt(value: string): number {
  const n = Math.round(Number(value.replace(",", ".")));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const FOOTER_HEIGHT = 72;

export function MealDetailScreen({ navigation, route }: Props) {
  const { mealId } = route.params;
  const insets = useSafeAreaInsets();
  const { showToast, showLoading, hideLoading } = useUi();
  const footerPad = Math.max(insets.bottom, 12);

  const [meal, setMeal] = useState<SavedMealEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState("");
  const [proteinG, setProteinG] = useState("0");
  const [fatG, setFatG] = useState("0");
  const [carbsG, setCarbsG] = useState("0");
  const [foods, setFoods] = useState<EditableFood[]>([]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getMealById(mealId);
      setMeal(data);
      if (data) {
        setTitle(data.title);
        setProteinG(String(data.macros.proteinG));
        setFatG(String(data.macros.fatG));
        setCarbsG(String(data.macros.carbsG));
        setFoods(
          data.foods.map((f) => ({
            name: f.name,
            grams: String(f.grams),
            kcal: String(f.kcal)
          }))
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [mealId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const kcalFromFoods = foods.reduce((s, f) => s + toInt(f.kcal), 0);

  function updateFood(index: number, key: keyof EditableFood, value: string) {
    setFoods((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  }

  function removeFood(index: number) {
    setFoods((prev) => prev.filter((_, i) => i !== index));
  }

  function addFood() {
    setFoods((prev) => [...prev, { name: "Продукт", grams: "100", kcal: "150" }]);
  }

  async function handleSave() {
    if (!meal) return;

    const cleanFoods = foods
      .map((f) => ({ name: f.name.trim() || "Продукт", grams: toInt(f.grams), kcal: toInt(f.kcal) }))
      .filter((f) => f.grams > 0 || f.kcal > 0);

    const kcalTotal = cleanFoods.reduce((s, f) => s + f.kcal, 0) || toInt(String(meal.kcalTotal));

    showLoading("Сохраняем изменения...");
    try {
      const updated = await updateMealEntry(meal.id, {
        title: title.trim() || meal.title,
        kcalTotal,
        macros: {
          proteinG: toInt(proteinG),
          fatG: toInt(fatG),
          carbsG: toInt(carbsG)
        },
        foods: cleanFoods
      });
      if (updated) {
        setMeal(updated);
        setIsEditing(false);
        showToast("Изменения сохранены", "success");
      } else {
        showToast("Запись не найдена", "error");
      }
    } catch {
      showToast("Не удалось сохранить", "error");
    } finally {
      hideLoading();
    }
  }

  function confirmDelete() {
    if (!meal) return;
    Alert.alert("Удалить запись?", "Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          showLoading("Удаляем...");
          try {
            await deleteMealEntry(meal.id);
            showToast("Запись удалена", "success");
            navigation.goBack();
          } catch {
            showToast("Не удалось удалить", "error");
          } finally {
            hideLoading();
          }
        }
      }
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gym-bg">
        <ActivityIndicator size="large" color="#D00000" />
      </SafeAreaView>
    );
  }

  if (!meal) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gym-bg px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#D00000" />
        <Text className="mt-4 text-center text-lg font-extrabold text-white">Запись не найдена</Text>
        <Pressable
          className="mt-6 h-12 items-center justify-center rounded-xl bg-gym-red px-6"
          onPress={() => navigation.goBack()}
        >
          <Text className="font-extrabold uppercase text-white">Назад</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gym-bg" edges={["left", "right"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-4"
        contentContainerStyle={{ paddingBottom: FOOTER_HEIGHT + footerPad + 16 }}
      >
        <View className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          <Image source={{ uri: meal.photoUri }} className="h-60 w-full" resizeMode="cover" />
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-xs font-bold text-gym-muted">{formatMealDate(meal.createdAt)}</Text>
          <View className="rounded-md border border-zinc-700 bg-black px-2 py-1">
            <Text className="text-[10px] font-extrabold uppercase tracking-widest text-gym-red">
              {getSourceLabel(meal.source)}
            </Text>
          </View>
        </View>

        {isEditing ? (
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Название приёма"
            placeholderTextColor="#5A5A5A"
            className="mt-2 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-xl font-extrabold text-white"
          />
        ) : (
          <Text className="mt-2 text-2xl font-extrabold text-white">{meal.title}</Text>
        )}

        <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-gym-red">
          {formatMealTime(meal.createdAt)}
        </Text>

        <View className="mt-5 flex-row items-end gap-3">
          <Text className="text-6xl font-extrabold text-white">
            {isEditing ? kcalFromFoods || meal.kcalTotal : meal.kcalTotal}
          </Text>
          <Text className="mb-2 text-lg font-extrabold text-gym-red">Ккал</Text>
        </View>

        <View className="mt-5 flex-row gap-3">
          <MacroEdit
            label="Белки"
            color="text-gym-red"
            border="border-gym-red"
            value={proteinG}
            editing={isEditing}
            onChange={setProteinG}
          />
          <MacroEdit
            label="Жиры"
            color="text-amber-500"
            border="border-amber-500"
            value={fatG}
            editing={isEditing}
            onChange={setFatG}
          />
          <MacroEdit
            label="Углеводы"
            color="text-emerald-500"
            border="border-emerald-500"
            value={carbsG}
            editing={isEditing}
            onChange={setCarbsG}
          />
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">
            Продукты
          </Text>
          {isEditing ? (
            <Pressable onPress={addFood} className="flex-row items-center gap-1">
              <Ionicons name="add-circle" size={18} color="#D00000" />
              <Text className="text-xs font-extrabold uppercase text-gym-red">Добавить</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="mt-3 gap-3">
          {(isEditing ? foods : meal.foods).map((f, index) =>
            isEditing ? (
              <View
                key={`edit-${index}`}
                className="rounded-xl border border-zinc-800 bg-black p-3"
              >
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={(f as EditableFood).name}
                    onChangeText={(v) => updateFood(index, "name", v)}
                    placeholder="Название"
                    placeholderTextColor="#5A5A5A"
                    className="flex-1 rounded-lg border border-zinc-700 bg-gym-card px-3 py-2 text-sm font-extrabold text-white"
                  />
                  <Pressable onPress={() => removeFood(index)} className="p-1">
                    <Ionicons name="trash-outline" size={20} color="#D00000" />
                  </Pressable>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <View className="flex-1">
                    <Text className="mb-1 text-[10px] font-bold uppercase text-gym-muted">Граммы</Text>
                    <TextInput
                      value={(f as EditableFood).grams}
                      onChangeText={(v) => updateFood(index, "grams", v)}
                      keyboardType="numeric"
                      className="rounded-lg border border-zinc-700 bg-gym-card px-3 py-2 text-sm font-extrabold text-white"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-[10px] font-bold uppercase text-gym-muted">Ккал</Text>
                    <TextInput
                      value={(f as EditableFood).kcal}
                      onChangeText={(v) => updateFood(index, "kcal", v)}
                      keyboardType="numeric"
                      className="rounded-lg border border-zinc-700 bg-gym-card px-3 py-2 text-sm font-extrabold text-gym-red"
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View
                key={`view-${index}`}
                className="flex-row items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-4"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-base font-extrabold text-white">{f.name}</Text>
                  <Text className="mt-1 text-xs font-bold text-gym-muted">{f.grams} г</Text>
                </View>
                <View className="items-end">
                  <Text className="text-lg font-extrabold text-gym-red">
                    {(f as SavedMealEntry["foods"][number]).kcal}
                  </Text>
                  <Text className="text-[11px] font-bold uppercase tracking-widest text-gym-muted">
                    ккал
                  </Text>
                </View>
              </View>
            )
          )}
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 bg-gym-bg px-6 pt-3"
        style={{ paddingBottom: footerPad }}
      >
        {isEditing ? (
          <View className="flex-row gap-3">
            <Pressable
              className="h-14 flex-1 items-center justify-center rounded-2xl border-2 border-zinc-700 bg-gym-card"
              onPress={() => {
                setIsEditing(false);
                load();
              }}
            >
              <Text className="text-sm font-extrabold uppercase text-white">Отмена</Text>
            </Pressable>
            <Pressable
              className="h-14 flex-1 items-center justify-center rounded-2xl border-2 border-emerald-600 bg-emerald-600 active:opacity-85"
              onPress={handleSave}
            >
              <Text className="text-sm font-extrabold uppercase text-white">Сохранить</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row gap-3">
            <Pressable
              className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-zinc-700 bg-gym-card active:opacity-85"
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={18} color="#D00000" />
              <Text className="text-sm font-extrabold uppercase text-white">Удалить</Text>
            </Pressable>
            <Pressable
              className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-gym-red bg-gym-red active:opacity-85"
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text className="text-sm font-extrabold uppercase text-white">Изменить</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function MacroEdit({
  label,
  color,
  border,
  value,
  editing,
  onChange
}: {
  label: string;
  color: string;
  border: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <View className={`flex-1 rounded-2xl border ${border} bg-black/70 px-3 py-4`}>
      <Text className="text-center text-xs font-extrabold uppercase tracking-widest text-gym-muted">
        {label}
      </Text>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          className={`mt-2 text-center text-2xl font-extrabold ${color}`}
        />
      ) : (
        <Text className={`mt-2 text-center text-2xl font-extrabold ${color}`}>{value}г</Text>
      )}
    </View>
  );
}
