import { ReactNode } from "react";
import { Text, View } from "react-native";

type ScreenStubProps = {
  title: string;
  subtitle: string;
  actions?: ReactNode;
};

export function ScreenStub({ title, subtitle, actions }: ScreenStubProps) {
  return (
    <View className="flex-1 bg-gym-bg px-6 py-10">
      <View className="rounded-2xl border border-zinc-800 bg-gym-card p-6">
        <Text className="text-3xl font-extrabold text-white">{title}</Text>
        <Text className="mt-3 text-base text-gym-muted">{subtitle}</Text>
        {actions ? <View className="mt-8">{actions}</View> : null}
      </View>
    </View>
  );
}
