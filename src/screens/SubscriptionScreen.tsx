import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscription } from "../context/SubscriptionContext";
import { useUi } from "../context/UiContext";
import { PRICING, TRIAL_DAYS } from "../constants/subscription";
import { RootStackParamList } from "../navigation/types";
import { getStatusLabel } from "../services/subscriptionStorage";
import { formatCountdown } from "../utils/formatCountdown";

type Props = NativeStackScreenProps<RootStackParamList, "Subscription">;

const FEATURES = [
  "AI-анализ тарелки без лимитов",
  "Точные Ккал и БЖУ",
  "История приёмов пищи",
  "Дневник и прогресс за день"
];

export function SubscriptionScreen({ navigation }: Props) {
  const {
    state,
    hasAccess,
    isLoading,
    isPurchasing,
    purchaseError,
    timeLeftMs,
    purchaseMonthlyPlan,
    purchaseYearlyPlan
  } = useSubscription();
  const { showToast, showLoading, hideLoading } = useUi();

  async function handleMonthly() {
    showLoading("Оплата через ЮKassa...");
    const ok = await purchaseMonthlyPlan();
    hideLoading();

    if (ok) {
      showToast("Подписка активирована на месяц", "success");
      navigation.goBack();
      return;
    }

    showToast("Оплата не прошла. Попробуй снова.", "error");
  }

  async function handleYearly() {
    showLoading("Оплата через ЮKassa...");
    const ok = await purchaseYearlyPlan();
    hideLoading();

    if (ok) {
      showToast("Годовая подписка активирована", "success");
      navigation.goBack();
      return;
    }

    showToast("Оплата не прошла. Попробуй снова.", "error");
  }

  const status = state?.status ?? "expired";
  const statusLabel = getStatusLabel(status);
  const statusColor =
    status === "active" ? "text-emerald-400" : status === "trial" ? "text-amber-400" : "text-gym-red";

  const yearlyMonthlyEquivalent = Math.round(PRICING.yearlyRub / 12);

  return (
    <SafeAreaView className="flex-1 bg-gym-bg" edges={["top", "left", "right", "bottom"]}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-10 pt-4">
        <Pressable className="mb-4 self-start" onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>

        <View className="mb-6">
          <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">KachAI Pro</Text>
          <Text className="mt-2 text-3xl font-extrabold text-white">Качай без лимитов</Text>
          <Text className="mt-2 text-base font-semibold text-gym-muted">
            Полный доступ к AI-сканеру и дневнику питания
          </Text>
        </View>

        <View className="mb-5 rounded-2xl border border-zinc-800 bg-gym-card p-5">
          <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">Статус</Text>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className={`text-2xl font-extrabold ${statusColor}`}>{statusLabel}</Text>
            {hasAccess ? (
              <View className="rounded-md border border-emerald-600/50 bg-emerald-600/10 px-2 py-1">
                <Text className="text-[10px] font-extrabold uppercase text-emerald-400">Доступ открыт</Text>
              </View>
            ) : (
              <View className="rounded-md border border-gym-red/50 bg-gym-red/10 px-2 py-1">
                <Text className="text-[10px] font-extrabold uppercase text-gym-red">Нужна оплата</Text>
              </View>
            )}
          </View>

          {status === "trial" ? (
            <View className="mt-4 rounded-xl border border-amber-500/40 bg-black px-4 py-4">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">
                Триал · {TRIAL_DAYS} дня
              </Text>
              <Text className="mt-2 text-3xl font-extrabold text-amber-400">
                {isLoading ? "—" : formatCountdown(timeLeftMs)}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-gym-muted">до конца полного доступа</Text>
            </View>
          ) : null}

          {status === "active" ? (
            <Text className="mt-3 text-sm font-semibold text-gym-muted">
              Подписка активна · осталось {formatCountdown(timeLeftMs)}
            </Text>
          ) : null}

          {status === "expired" ? (
            <Text className="mt-3 text-sm font-semibold text-gym-muted">
              Триал завершён. Выбери тариф, чтобы продолжить.
            </Text>
          ) : null}
        </View>

        <View className="mb-5 gap-2">
          {FEATURES.map((feature) => (
            <View
              key={feature}
              className="flex-row items-center gap-3 rounded-xl border border-zinc-800 bg-black/50 px-4 py-3"
            >
              <Ionicons name="checkmark-circle" size={18} color="#D00000" />
              <Text className="flex-1 text-sm font-bold text-white">{feature}</Text>
            </View>
          ))}
        </View>

        {purchaseError ? (
          <View className="mb-4 rounded-xl border border-gym-red bg-gym-red/10 px-4 py-3">
            <Text className="text-sm font-semibold text-gym-red">{purchaseError}</Text>
          </View>
        ) : null}

        <View className="gap-4">
          <Pressable
            className="overflow-hidden rounded-2xl border-2 border-gym-red bg-gym-card active:opacity-90"
            onPress={handleMonthly}
            disabled={isPurchasing}
          >
            <View className="border-b border-zinc-800 bg-gym-red/15 px-5 py-2">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-red">Базовый</Text>
            </View>
            <View className="px-5 py-5">
              <Text className="text-4xl font-extrabold text-white">{PRICING.monthlyRub} ₽</Text>
              <Text className="mt-1 text-sm font-bold text-gym-muted">в месяц</Text>
              {isPurchasing ? (
                <ActivityIndicator className="mt-4" color="#D00000" />
              ) : (
                <View className="mt-4 h-12 items-center justify-center rounded-xl bg-gym-red">
                  <Text className="font-extrabold uppercase text-white">Оплатить месяц</Text>
                </View>
              )}
            </View>
          </Pressable>

          <Pressable
            className="overflow-hidden rounded-2xl border-2 border-emerald-600 bg-gym-card active:opacity-90"
            onPress={handleYearly}
            disabled={isPurchasing}
          >
            <View className="flex-row items-center justify-between border-b border-zinc-800 bg-emerald-600/15 px-5 py-2">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
                Выгодно
              </Text>
              <Text className="text-xs font-extrabold uppercase text-emerald-400">
                −{PRICING.yearlySavingsPercent}%
              </Text>
            </View>
            <View className="px-5 py-5">
              <Text className="text-4xl font-extrabold text-white">{PRICING.yearlyRub} ₽</Text>
              <Text className="mt-1 text-sm font-bold text-gym-muted">
                в год · ~{yearlyMonthlyEquivalent} ₽/мес
              </Text>
              <Text className="mt-2 text-xs font-semibold text-emerald-400">
                Сэкономь 25% против помесячной оплаты
              </Text>
              {isPurchasing ? (
                <ActivityIndicator className="mt-4" color="#10B981" />
              ) : (
                <View className="mt-4 h-12 items-center justify-center rounded-xl bg-emerald-600">
                  <Text className="font-extrabold uppercase text-white">Оплатить год</Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        <Text className="mt-6 text-center text-xs leading-5 text-gym-muted">
          Оплата через ЮKassa (заглушка). После успешной оплаты открывается полный доступ ко всем
          функциям KachAI.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
