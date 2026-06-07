import { Text, View } from "react-native";

type StatTileProps = {
  value: string;
  label: string;
  highlight?: boolean;
};

export function StatTile({ value, label, highlight }: StatTileProps) {
  return (
    <View className={`flex-1 rounded-xl border p-4 ${highlight ? "border-gym-red bg-gym-red/10" : "border-zinc-800 bg-black"}`}>
      <Text className={`text-2xl font-extrabold ${highlight ? "text-gym-red" : "text-white"}`}>{value}</Text>
      <Text className="mt-1 text-xs font-bold uppercase tracking-wider text-gym-muted">{label}</Text>
    </View>
  );
}
