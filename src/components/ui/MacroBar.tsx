import { Text, View } from "react-native";

type MacroBarProps = {
  label: string;
  current: number;
  goal: number;
  unit?: string;
  accentClassName?: string;
};

export function MacroBar({ label, current, goal, unit = "г", accentClassName = "bg-gym-red" }: MacroBarProps) {
  const progress = Math.min(current / goal, 1);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-white">{label}</Text>
        <Text className="text-sm font-extrabold text-gym-muted">
          {current}
          {unit} / {goal}
          {unit}
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-zinc-900">
        <View className={`h-full rounded-full ${accentClassName}`} style={{ width: `${progress * 100}%` }} />
      </View>
    </View>
  );
}
