import { Text, TextInput, TextInputProps, View } from "react-native";

type GymInputProps = TextInputProps & {
  label: string;
};

export function GymInput({ label, className, ...props }: GymInputProps) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">{label}</Text>
      <TextInput
        placeholderTextColor="#5C5C5C"
        className={`rounded-xl border border-zinc-800 bg-black px-4 py-4 text-base font-semibold text-white ${className ?? ""}`}
        {...props}
      />
    </View>
  );
}
