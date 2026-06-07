import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

type SubscriptionPaywallProps = {
  title?: string;
  subtitle?: string;
  onSubscribe: () => void;
};

export function SubscriptionPaywall({
  title = "Доступ закрыт",
  subtitle = "Триал закончился. Оформи подписку, чтобы снова сканировать тарелки и получать AI-анализ.",
  onSubscribe
}: SubscriptionPaywallProps) {
  return (
    <View className="flex-1 items-center justify-center bg-black px-6">
      <View className="mb-6 h-20 w-20 items-center justify-center rounded-full border-2 border-gym-red bg-gym-red/15">
        <Ionicons name="lock-closed" size={36} color="#D00000" />
      </View>
      <Text className="text-center text-2xl font-extrabold text-white">{title}</Text>
      <Text className="mt-3 text-center text-base font-semibold text-gym-muted">{subtitle}</Text>
      <Pressable
        className="mt-8 h-14 w-full items-center justify-center rounded-2xl border-2 border-gym-red bg-gym-red active:opacity-85"
        onPress={onSubscribe}
      >
        <Text className="text-base font-extrabold uppercase tracking-wide text-white">
          Оформить подписку
        </Text>
      </Pressable>
    </View>
  );
}
