import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUi } from "../context/UiContext";

export function GlobalUiOverlay() {
  const insets = useSafeAreaInsets();
  const { isGlobalLoading, loadingMessage, toast, hideToast } = useUi();

  const toastBorder =
    toast?.type === "success"
      ? "border-emerald-600"
      : toast?.type === "error"
        ? "border-gym-red"
        : "border-zinc-700";

  const toastBg =
    toast?.type === "success"
      ? "bg-emerald-600/20"
      : toast?.type === "error"
        ? "bg-gym-red/20"
        : "bg-gym-card";

  const toastIcon =
    toast?.type === "success" ? "checkmark-circle" : toast?.type === "error" ? "alert-circle" : "information-circle";

  const toastIconColor =
    toast?.type === "success" ? "#10B981" : toast?.type === "error" ? "#D00000" : "#FFFFFF";

  return (
    <>
      {toast ? (
        <View
          pointerEvents="box-none"
          className="absolute left-0 right-0 z-50 px-4"
          style={{ top: insets.top + 8 }}
        >
          <Pressable
            onPress={hideToast}
            className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${toastBorder} ${toastBg}`}
          >
            <Ionicons name={toastIcon} size={22} color={toastIconColor} />
            <Text className="flex-1 text-sm font-extrabold text-white">{toast.message}</Text>
          </Pressable>
        </View>
      ) : null}

      {isGlobalLoading ? (
        <View className="absolute inset-0 z-[60] items-center justify-center bg-black/75">
          <View className="items-center rounded-2xl border border-zinc-800 bg-gym-card px-8 py-7">
            <ActivityIndicator size="large" color="#D00000" />
            <Text className="mt-4 text-base font-extrabold uppercase tracking-wide text-white">
              {loadingMessage}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}
