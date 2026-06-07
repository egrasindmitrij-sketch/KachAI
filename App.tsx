import "react-native-gesture-handler";
import "react-native-reanimated";
import "./global.css";

import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, LogBox, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { GlobalUiOverlay } from "./src/components/GlobalUiOverlay";
import { getAiSetupSummary } from "./src/constants/aiConfig";
import { getAuthRedirectUri } from "./src/services/authSession";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { SubscriptionProvider } from "./src/context/SubscriptionContext";
import { UiProvider } from "./src/context/UiContext";
import { MainTabs } from "./src/navigation/MainTabs";
import { RootStackParamList } from "./src/navigation/types";
import { AuthScreen } from "./src/screens/AuthScreen";
import { MealDetailScreen } from "./src/screens/MealDetailScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { SubscriptionScreen } from "./src/screens/SubscriptionScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

const kachaiTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#0B0B0B",
    card: "#151515",
    border: "#222222",
    primary: "#D00000",
    text: "#FFFFFF"
  }
};

if (__DEV__) {
  const globalErrorUtils = (globalThis as { ErrorUtils?: {
    getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
    setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
  } }).ErrorUtils;

  if (globalErrorUtils) {
    const prev = globalErrorUtils.getGlobalHandler();
    globalErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error("[KachAI] Global error", {
        isFatal,
        message: (error as Error)?.message,
        error
      });
      prev?.(error, isFatal);
    });
  }

  LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);
  console.log("[KachAI] AI config", getAiSetupSummary());
  console.log("[KachAI] Auth redirect (Supabase → Redirect URLs):", getAuthRedirectUri());
}

function ScreenLoader() {
  return (
    <View className="flex-1 items-center justify-center bg-gym-bg">
      <ActivityIndicator size="large" color="#D00000" />
    </View>
  );
}

function RootNavigator() {
  const { user, isLoading, isConfigured, hasSupabaseSession } = useAuth();

  if (isLoading) {
    return <ScreenLoader />;
  }

  const canEnterApp = isConfigured ? hasSupabaseSession && user !== null : user !== null;

  return (
    <Stack.Navigator
      key={canEnterApp ? "main" : "auth"}
      initialRouteName={canEnterApp ? "MainTabs" : "Auth"}
      screenOptions={{
        headerStyle: { backgroundColor: "#0B0B0B" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "800" }
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: "Подписка", headerShown: false }}
      />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: "Анализ" }} />
      <Stack.Screen name="MealDetail" component={MealDetailScreen} options={{ title: "Приём пищи" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <UiProvider>
            <SubscriptionProvider>
              <NavigationContainer theme={kachaiTheme}>
                <StatusBar style="light" />
                <RootNavigator />
              </NavigationContainer>
              <GlobalUiOverlay />
            </SubscriptionProvider>
          </UiProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
