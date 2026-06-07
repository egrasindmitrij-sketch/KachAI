import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GymButton } from "../components/ui/GymButton";
import { GymInput } from "../components/ui/GymInput";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Auth">;

export function AuthScreen({ navigation }: Props) {
  const { signIn, signUp, signInWithGoogle, isConfigured, hasSupabaseSession, user } = useAuth();
  const { showToast, showLoading, hideLoading } = useUi();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (hasSupabaseSession && user) {
      navigation.replace("MainTabs");
    }
  }, [hasSupabaseSession, user, navigation]);

  async function runAuth(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    loadingMessage: string,
    successMessage: string
  ) {
    if (isBusy) return;
    setFormError(null);
    setIsBusy(true);
    showLoading(loadingMessage);
    try {
      const result = await action();
      hideLoading();
      if (result.ok) {
        showToast(successMessage, "success");
      } else {
        setFormError(result.error);
        showToast(result.error, "error");
      }
    } catch (error) {
      hideLoading();
      const message = error instanceof Error ? error.message : "Неизвестная ошибка входа";
      setFormError(message);
      showToast(message, "error");
      if (__DEV__) console.error("[KachAI] auth exception", error);
    } finally {
      setIsBusy(false);
    }
  }

  function handleSignIn() {
    return runAuth(() => signIn(email, password), "Входим...", "С возвращением, бро!");
  }

  function handleSignUp() {
    return runAuth(() => signUp(email, password), "Создаём аккаунт...", "Аккаунт создан!");
  }

  function handleGoogle() {
    return runAuth(() => signInWithGoogle(), "Открываем Google...", "Добро пожаловать!");
  }

  return (
    <SafeAreaView className="flex-1 bg-gym-bg">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="grow px-6 pb-10 pt-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-10">
            <View className="mb-4 self-start rounded-md border border-gym-red bg-gym-red/15 px-3 py-1">
              <Text className="text-xs font-extrabold uppercase tracking-[3px] text-gym-red">Iron Fuel AI</Text>
            </View>
            <Text className="text-5xl font-extrabold uppercase leading-tight text-white">KachAI</Text>
            <Text className="mt-3 text-base font-semibold text-gym-muted">
              Сфоткай тарелку — получи Ккал, БЖУ и макросы без воды.
            </Text>
          </View>

          <View className="gap-5">
            <GymInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="beast@kachai.app"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <GymInput
              label="Пароль"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          {formError ? (
            <View className="mt-6 rounded-xl border border-gym-red bg-gym-red/15 px-4 py-3">
              <Text className="text-sm font-bold leading-5 text-gym-red">{formError}</Text>
            </View>
          ) : null}

          <View className="mt-8 gap-3">
            <GymButton
              label={isBusy ? "Подожди..." : "Войти в зал"}
              onPress={handleSignIn}
              disabled={isBusy}
            />
            <GymButton
              label="Создать аккаунт"
              variant="secondary"
              onPress={handleSignUp}
              disabled={isBusy}
            />
          </View>

          {!isConfigured ? (
            <View className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <Text className="text-xs font-bold leading-5 text-amber-400">
                Demo-режим: вход без сервера. Для AI-анализа настрой Supabase в .env
              </Text>
            </View>
          ) : (
            <View className="mt-5 rounded-xl border border-zinc-700 bg-gym-card px-4 py-3">
              <Text className="text-xs font-bold leading-5 text-gym-muted">
                Вход через email — сразу после регистрации. Для AI-анализа нужен аккаунт Supabase.
              </Text>
            </View>
          )}

          <View className="my-8 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-zinc-800" />
            <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">или</Text>
            <View className="h-px flex-1 bg-zinc-800" />
          </View>

          <View className="flex-row gap-3">
            <Pressable
              className="flex-1 items-center rounded-xl border border-zinc-800 bg-gym-card py-4 active:opacity-80"
              onPress={handleGoogle}
              disabled={isBusy || !isConfigured}
            >
              <Text className={`font-extrabold ${isConfigured ? "text-white" : "text-gym-muted"}`}>
                Google
              </Text>
            </Pressable>
            {Platform.OS === "ios" ? (
              <Pressable
                className="flex-1 items-center rounded-xl border border-zinc-800 bg-gym-card py-4 active:opacity-80"
                onPress={() => showToast("Apple Sign In — скоро", "info")}
                disabled={isBusy}
              >
                <Text className="font-extrabold text-gym-muted">Apple</Text>
              </Pressable>
            ) : null}
          </View>

          <Text className="mt-8 text-center text-xs leading-5 text-gym-muted">
            Продолжая, ты соглашаешься с правилами KachAI и политикой обработки данных.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
