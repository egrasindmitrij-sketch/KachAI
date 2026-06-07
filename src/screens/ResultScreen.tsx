import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SubscriptionPaywall } from "../components/SubscriptionPaywall";
import { useSubscription } from "../context/SubscriptionContext";
import { useUi } from "../context/UiContext";
import {
  buildFallbackResult,
  getActiveProvider,
  getFallbackToastMessage,
  getSourceLabel,
  runAnalysisWithLoading
} from "../services/aiAnalysis";
import { getProviderLabel } from "../constants/aiConfig";
import { saveMealEntry } from "../services/storage";
import { MealAnalysis, RootStackParamList } from "../navigation/types";
import { AnalysisResult } from "../types/analysis";
import { toMealAnalysis } from "../utils/analysisMappers";

type Props = NativeStackScreenProps<RootStackParamList, "Result">;

function pctLabel(p: number) {
  return `${p}%`;
}

export function ResultScreen({ navigation, route }: Props) {
  const { photoUri, testClaude } = route.params;
  const { hasAccess, isLoading: isSubscriptionLoading } = useSubscription();
  const { showToast, showLoading, hideLoading } = useUi();
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<AnalysisResult | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [runId, setRunId] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const providerLabel = testClaude ? "Claude" : getProviderLabel(getActiveProvider());
  const progressMessages = testClaude
    ? [
        "Тест Claude: отправляем фото...",
        "Распознаём российские продукты...",
        "Считаем Ккал и БЖУ..."
      ]
    : [
        `Отправляем фото в ${providerLabel}...`,
        "Распознаём российские продукты...",
        "Считаем Ккал и БЖУ..."
      ];

  const startAnalysis = useCallback(async () => {
    if (!hasAccess) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalysisMeta(null);
    setProgressStep(0);

    const stepTimers = [
      setTimeout(() => setProgressStep(1), 1200),
      setTimeout(() => setProgressStep(2), 2400)
    ];

    try {
      const result = await runAnalysisWithLoading(photoUri, {
        forceProvider: testClaude ? "claude" : undefined
      });
      const meal = toMealAnalysis(result);

      setAnalysisMeta(result);
      setAnalysis(meal);

      if (result.source === "fallback") {
        showToast(getFallbackToastMessage(result), "error");
      } else if (__DEV__ && result.meta) {
        console.log("[KachAI Result]", {
          durationMs: result.meta.durationMs,
          apiDurationMs: result.meta.apiDurationMs,
          costUsd: result.meta.costUsdEstimate,
          tokens: {
            in: result.meta.inputTokens,
            out: result.meta.outputTokens
          }
        });
      }
    } catch (error) {
      console.error("[KachAI] Критическая ошибка ResultScreen", error);
      const fallback = buildFallbackResult(
        photoUri,
        "Сбой приложения при анализе."
      );
      setAnalysisMeta(fallback);
      setAnalysis(toMealAnalysis(fallback));
      showToast(getFallbackToastMessage(fallback), "error");
    } finally {
      stepTimers.forEach(clearTimeout);
      setIsAnalyzing(false);
    }
  }, [photoUri, hasAccess, testClaude, showToast]);

  useEffect(() => {
    if (isSubscriptionLoading || !hasAccess) return;
    startAnalysis();
  }, [startAnalysis, runId, hasAccess, isSubscriptionLoading]);

  function handleRetry() {
    setRunId((id) => id + 1);
    setSaveSuccess(false);
  }

  async function handleSaveToDiary() {
    if (!analysis || !analysisMeta || isSaving || saveSuccess) return;

    setIsSaving(true);
    showLoading("Сохраняем в дневник...");

    try {
      await saveMealEntry({
        photoUri,
        analysis,
        source: analysisMeta.source
      });
      setSaveSuccess(true);
      showToast("Сохранено в дневник", "success");
      setTimeout(() => navigation.navigate("MainTabs"), 1200);
    } catch {
      showToast("Не удалось сохранить. Попробуй ещё раз.", "error");
    } finally {
      hideLoading();
      setIsSaving(false);
    }
  }

  const showResults = !isAnalyzing && analysis && analysisMeta;

  if (isSubscriptionLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gym-bg">
        <ActivityIndicator size="large" color="#D00000" />
      </SafeAreaView>
    );
  }

  if (!hasAccess) {
    return (
      <SafeAreaView className="flex-1 bg-gym-bg">
        <SubscriptionPaywall
          title="AI-анализ недоступен"
          subtitle="Оформи подписку, чтобы анализировать фото и сохранять результаты в дневник."
          onSubscribe={() => navigation.replace("Subscription")}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gym-bg" edges={["left", "right", "bottom"]}>
      <View className="flex-1">
        <ScrollView className="flex-1" contentContainerClassName="px-6 pt-4 pb-24">
          <View className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            <Image source={{ uri: photoUri }} className="h-64 w-full" resizeMode="cover" />
          </View>

          {isAnalyzing ? (
            <View className="mt-8 items-center rounded-2xl border border-zinc-800 bg-gym-card px-6 py-10">
              <ActivityIndicator size="large" color="#D00000" />
              <Text className="mt-5 text-xl font-extrabold text-white">{providerLabel} анализирует тарелку</Text>
              <Text className="mt-2 text-center text-sm font-semibold text-gym-muted">
                {progressMessages[progressStep]}
              </Text>
              <Text className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-gym-muted">
                Обычно 3–6 секунд
              </Text>
              <View className="mt-6 h-2 w-full overflow-hidden rounded-full bg-zinc-900">
                <View
                  className="h-full rounded-full bg-gym-red"
                  style={{ width: `${((progressStep + 1) / progressMessages.length) * 100}%` }}
                />
              </View>
            </View>
          ) : null}

          {showResults ? (
            <>
              {analysisMeta.source === "fallback" && analysisMeta.message ? (
                <View className="mt-5 rounded-2xl border border-amber-600/60 bg-amber-600/10 px-4 py-4">
                  <Text className="text-sm font-extrabold text-amber-500">Резервный режим</Text>
                  <Text className="mt-1 text-sm font-semibold text-gym-muted">{analysisMeta.message}</Text>
                  <Pressable className="mt-3 self-start rounded-lg border border-gym-red px-3 py-2" onPress={handleRetry}>
                    <Text className="text-xs font-extrabold uppercase text-gym-red">Повторить AI-анализ</Text>
                  </Pressable>
                </View>
              ) : null}

              <View className="mt-5 flex-row items-center justify-between">
                <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">
                  Анализ приёма пищи
                </Text>
                <View className="flex-row items-center gap-2">
                  {analysisMeta.confidence != null ? (
                    <View className="rounded-md border border-zinc-700 bg-black px-2 py-1">
                      <Text className="text-[10px] font-extrabold uppercase tracking-widest text-gym-muted">
                        {analysisMeta.confidence}% уверен.
                      </Text>
                    </View>
                  ) : null}
                  <View className="rounded-md border border-zinc-700 bg-black px-2 py-1">
                    <Text className="text-[10px] font-extrabold uppercase tracking-widest text-gym-red">
                      {getSourceLabel(analysisMeta.source)}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-2 flex-row items-end gap-3">
                <Text className="text-6xl font-extrabold text-white">{analysis.kcalTotal}</Text>
                <Text className="mb-2 text-lg font-extrabold text-gym-red">Ккал</Text>
              </View>

              <View className="mt-5 flex-row gap-3">
                <View className="flex-1 rounded-2xl border border-gym-red bg-black/70 px-3 py-5">
                  <Text className="text-center text-xs font-extrabold uppercase tracking-widest text-gym-muted">
                    Белки
                  </Text>
                  <Text className="mt-3 text-center text-3xl font-extrabold text-gym-red">
                    {analysis.macros.proteinG}г
                  </Text>
                  <Text className="mt-1 text-center text-sm font-extrabold text-gym-muted">
                    {pctLabel(analysis.macros.proteinPct)}
                  </Text>
                </View>

                <View className="flex-1 rounded-2xl border border-amber-500 bg-black/70 px-3 py-5">
                  <Text className="text-center text-xs font-extrabold uppercase tracking-widest text-gym-muted">
                    Жиры
                  </Text>
                  <Text className="mt-3 text-center text-3xl font-extrabold text-amber-500">
                    {analysis.macros.fatG}г
                  </Text>
                  <Text className="mt-1 text-center text-sm font-extrabold text-gym-muted">
                    {pctLabel(analysis.macros.fatPct)}
                  </Text>
                </View>

                <View className="flex-1 rounded-2xl border border-emerald-500 bg-black/70 px-3 py-5">
                  <Text className="text-center text-xs font-extrabold uppercase tracking-widest text-gym-muted">
                    Углеводы
                  </Text>
                  <Text className="mt-3 text-center text-3xl font-extrabold text-emerald-500">
                    {analysis.macros.carbsG}г
                  </Text>
                  <Text className="mt-1 text-center text-sm font-extrabold text-gym-muted">
                    {pctLabel(analysis.macros.carbsPct)}
                  </Text>
                </View>
              </View>

              <View className="mt-5 rounded-2xl border border-zinc-800 bg-black/40 p-4">
                <Text className="text-xs font-extrabold uppercase tracking-widest text-gym-muted">
                  Распознанные продукты
                </Text>
                <View className="mt-3 gap-3">
                  {analysis.foods.map((f) => (
                    <View
                      key={`${f.name}-${f.grams}`}
                      className="flex-row items-center justify-between rounded-xl border border-zinc-800 bg-black px-4 py-4"
                    >
                      <View className="flex-1 pr-3">
                        <Text className="text-base font-extrabold text-white">{f.name}</Text>
                        <Text className="mt-1 text-xs font-bold text-gym-muted">{f.grams} г</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-lg font-extrabold text-gym-red">{f.kcal}</Text>
                        <Text className="text-[11px] font-bold uppercase tracking-widest text-gym-muted">ккал</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : null}

          {!isAnalyzing && !analysis ? (
            <View className="mt-8 rounded-2xl border border-gym-red bg-gym-red/10 px-4 py-5">
              <Text className="text-base font-extrabold text-white">Не удалось получить результат</Text>
              <Pressable className="mt-4 h-12 items-center justify-center rounded-xl bg-gym-red" onPress={handleRetry}>
                <Text className="font-extrabold uppercase text-white">Повторить</Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>

        {showResults ? (
          <View className="px-6 pb-6">
            <View className="flex-row gap-3">
              <Pressable
                className={`h-14 flex-1 items-center justify-center rounded-2xl border-2 border-emerald-600 bg-emerald-600 ${
                  isSaving || saveSuccess ? "opacity-80" : "active:opacity-85"
                }`}
                onPress={handleSaveToDiary}
                disabled={isSaving || saveSuccess}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-sm font-extrabold uppercase tracking-wide text-white">
                    {saveSuccess ? "Сохранено" : "Сохранить в дневник"}
                  </Text>
                )}
              </Pressable>

              <Pressable
                className="h-14 flex-1 items-center justify-center rounded-2xl border-2 border-gym-red bg-gym-red active:opacity-85"
                onPress={() => navigation.goBack()}
              >
                <Text className="text-sm font-extrabold uppercase tracking-wide text-white">Новый анализ</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
