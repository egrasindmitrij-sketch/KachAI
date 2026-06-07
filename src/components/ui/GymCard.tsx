import { ReactNode } from "react";
import { Text, View } from "react-native";

type GymCardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function GymCard({ title, children, className }: GymCardProps) {
  return (
    <View className={`rounded-2xl border border-zinc-800 bg-gym-card p-5 ${className ?? ""}`}>
      {title ? <Text className="mb-3 text-xs font-extrabold uppercase tracking-widest text-gym-muted">{title}</Text> : null}
      {children}
    </View>
  );
}
