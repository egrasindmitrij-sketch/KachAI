import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GymButton } from "../components/ui/GymButton";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { useUi } from "../context/UiContext";
import { RootStackParamList } from "../navigation/types";
import { getAccessUntil, getStatusLabel } from "../services/subscriptionStorage";
import { getProfileStats, getUserProfile, saveUserProfile } from "../services/storage";
import { ProfileStats } from "../types/profile";
import { formatCountdown } from "../utils/formatCountdown";

function formatAccessUntil(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { state, hasAccess, timeLeftMs } = useSubscription();
  const { user, signOut } = useAuth();
  const { showToast } = useUi();
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Бро Качок");
  const [draftName, setDraftName] = useState("Бро Качок");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    totalMeals: 0,
    avgKcal: 0,
    totalKcal: 0,
    avgProteinG: 0
  });

  const status = state?.status ?? "expired";
  const statusLabel = getStatusLabel(status);
  const accessUntil = state ? getAccessUntil(state) : null;

  const statusColor =
    status === "active" ? "text-emerald-400" : status === "trial" ? "text-amber-400" : "text-gym-red";

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const [profile, profileStats] = await Promise.all([getUserProfile(), getProfileStats()]);
      setDisplayName(profile.displayName);
      setDraftName(profile.displayName);
      setStats(profileStats);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  return (
    <SafeAreaView className="flex-1 bg-gym-bg" edges={["left", "right"]}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10 pt-2">
        <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">Профиль</Text>
        <Text className="mt-1 text-3xl font-extrabold text-white">Твой прогресс</Text>

        <View className="mt-6 items-center rounded-2xl border border-zinc-800 bg-gym-card px-6 py-7">
          <View className="h-24 w-24 items-center justify-center rounded-full border-[3px] border-gym-red bg-black">
            <Ionicons name="barbell" size={42} color="#D00000" />
          </View>
          {isEditingName ? (
            <View className="mt-4 w-full">
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Имя в зале"
                placeholderTextColor="#5A5A5A"
                className="rounded-xl border border-zinc-700 bg-black px-4 py-3 text-center text-xl font-extrabold text-white"
              />
              <View className="mt-3 flex-row gap-2">
                <Pressable
                  className="h-11 flex-1 items-center justify-center rounded-xl border border-zinc-700 bg-gym-card"
                  onPress={() => {
                    setDraftName(displayName);
                    setIsEditingName(false);
                  }}
                >
                  <Text className="text-xs font-extrabold uppercase text-white">Отмена</Text>
                </Pressable>
                <Pressable
                  className="h-11 flex-1 items-center justify-center rounded-xl bg-gym-red"
                  disabled={isSavingName}
                  onPress={async () => {
                    const next = draftName.trim() || "Бро Качок";
                    setIsSavingName(true);
                    try {
                      await saveUserProfile({ displayName: next });
                      setDisplayName(next);
                      setDraftName(next);
                      setIsEditingName(false);
                      showToast("Имя сохранено", "success");
                    } catch {
                      showToast("Не удалось сохранить имя", "error");
                    } finally {
                      setIsSavingName(false);
                    }
                  }}
                >
                  <Text className="text-xs font-extrabold uppercase text-white">
                    {isSavingName ? "..." : "Сохранить"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable className="mt-4 items-center" onPress={() => setIsEditingName(true)}>
              <Text className="text-2xl font-extrabold text-white">{displayName}</Text>
              <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-gym-red">
                Изменить имя
              </Text>
            </Pressable>
          )}
          <Text className="mt-1 text-sm font-semibold text-gym-muted">
            {user?.email ?? "KachAI · Iron Fuel"}
          </Text>
          <View className="mt-3 rounded-md border border-gym-red/40 bg-gym-red/10 px-3 py-1">
            <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-red">Beast Mode</Text>
          </View>
        </View>

        {isLoading ? (
          <View className="my-8 items-center">
            <ActivityIndicator color="#D00000" />
          </View>
        ) : (
          <View className="mt-5 flex-row flex-wrap gap-3">
            <View className="min-w-[47%] flex-1 rounded-2xl border border-zinc-800 bg-black px-4 py-4">
              <Text className="text-xs font-extrabold uppercase text-gym-muted">Анализов</Text>
              <Text className="mt-2 text-3xl font-extrabold text-white">{stats.totalMeals}</Text>
            </View>
            <View className="min-w-[47%] flex-1 rounded-2xl border border-zinc-800 bg-black px-4 py-4">
              <Text className="text-xs font-extrabold uppercase text-gym-muted">Средний Ккал</Text>
              <Text className="mt-2 text-3xl font-extrabold text-gym-red">{stats.avgKcal}</Text>
            </View>
            <View className="min-w-[47%] flex-1 rounded-2xl border border-zinc-800 bg-black px-4 py-4">
              <Text className="text-xs font-extrabold uppercase text-gym-muted">Всего Ккал</Text>
              <Text className="mt-2 text-3xl font-extrabold text-white">{stats.totalKcal}</Text>
            </View>
            <View className="min-w-[47%] flex-1 rounded-2xl border border-zinc-800 bg-black px-4 py-4">
              <Text className="text-xs font-extrabold uppercase text-gym-muted">Ср. белки</Text>
              <Text className="mt-2 text-3xl font-extrabold text-white">{stats.avgProteinG}г</Text>
            </View>
          </View>
        )}

        <View className="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-gym-card">
          <View className="border-b border-zinc-800 bg-gym-red/10 px-5 py-3">
            <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-red">Подписка</Text>
          </View>
          <View className="px-5 py-5">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-extrabold text-white">Статус</Text>
              <Text className={`text-base font-extrabold ${statusColor}`}>{statusLabel}</Text>
            </View>

            <View className="mt-4 rounded-xl border border-zinc-800 bg-black px-4 py-3">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">Доступ до</Text>
              <Text className="mt-1 text-base font-bold text-white">{formatAccessUntil(accessUntil)}</Text>
              {hasAccess ? (
                <Text className="mt-2 text-sm font-semibold text-gym-muted">
                  Осталось: {formatCountdown(timeLeftMs)}
                </Text>
              ) : (
                <Text className="mt-2 text-sm font-semibold text-gym-red">
                  Подписка неактивна — оформи тариф
                </Text>
              )}
            </View>

            {state?.plan === "monthly" || state?.plan === "yearly" ? (
              <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-gym-muted">
                План: {state.plan === "yearly" ? "Годовой" : "Месячный"}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="mt-5 gap-3">
          <GymButton label="Управлять подпиской" onPress={() => navigation.navigate("Subscription")} />
          <Pressable
            className="h-14 flex-row items-center justify-center gap-2 rounded-2xl border-2 border-zinc-700 bg-gym-card active:opacity-85"
            onPress={async () => {
              await signOut();
              navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
            }}
          >
            <Ionicons name="log-out-outline" size={18} color="#D00000" />
            <Text className="text-sm font-extrabold uppercase text-white">Выйти из аккаунта</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
