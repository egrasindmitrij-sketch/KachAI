import { Pressable, PressableProps, Text } from "react-native";

type GymButtonVariant = "primary" | "secondary" | "ghost";

type GymButtonProps = PressableProps & {
  label: string;
  variant?: GymButtonVariant;
};

const variantStyles: Record<GymButtonVariant, { container: string; text: string }> = {
  primary: {
    container: "bg-gym-red border-gym-red",
    text: "text-white"
  },
  secondary: {
    container: "bg-gym-card border-zinc-700",
    text: "text-white"
  },
  ghost: {
    container: "bg-transparent border-transparent",
    text: "text-gym-muted"
  }
};

export function GymButton({ label, variant = "primary", className, ...props }: GymButtonProps) {
  const styles = variantStyles[variant];

  return (
    <Pressable
      className={`items-center justify-center rounded-xl border px-4 py-4 active:opacity-80 ${styles.container} ${className ?? ""}`}
      {...props}
    >
      <Text className={`text-base font-extrabold uppercase tracking-wide ${styles.text}`}>{label}</Text>
    </Pressable>
  );
}
